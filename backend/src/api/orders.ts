import { Router, Request, Response } from 'express';
import { supabaseAdmin, supabase } from '../config/supabase';
import { verifyToken, verifyTelegramWebApp } from '../middleware/auth';
import { trackEvent } from '../services/analytics';
import { sendOrderNotification, sendCustomerMessage, sendOrderStatusNotification } from '../bot';
import { z } from 'zod';
import { OrderStatus } from '../types';

const router = Router();

// Validation schemas
const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  variant_id: z.string().uuid().optional()
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  contact_name: z.string().min(1).max(100),
  contact_phone: z.string().min(10).max(20),
  contact_address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  currency: z.enum(['RUB', 'USD', 'EUR']).default('RUB')
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
});

const sendMessageSchema = z.object({
  text: z.string().min(1).max(4000)
});

const assignOrderSchema = z.object({
  manager_id: z.string().uuid()
});

// GET /api/orders - List orders (admin/manager)
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20', my_orders } = req.query;
    
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    let query = supabaseAdmin
      .from('orders')
      .select(`
        *,
        assigned_manager:admin_users!orders_assigned_manager_id_fkey(id, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    // Filter by assigned manager (my_orders=true)
    if (my_orders === 'true' && req.user?.userId) {
      query = query.eq('assigned_manager_id', req.user.userId);
    }
    
    query = query.range(offset, offset + limitNum - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    res.json({
      orders: data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id - Get single order (admin/manager)
router.get('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        assigned_manager:admin_users!orders_assigned_manager_id_fkey(id, email)
      `)
      .eq('id', id)
      .single();
    
    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get order items with products
    const { data: items } = await supabaseAdmin
      .from('order_items')
      .select(`
        *,
        product:products(id, article, name, name_en, image_url)
      `)
      .eq('order_id', id);
    
    res.json({
      ...order,
      items: items || []
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// GET /api/orders/my - Get user's orders (Telegram user)
router.get('/my/list', verifyTelegramWebApp, async (req: Request, res: Response) => {
  try {
    if (!req.telegramUser) {
      return res.status(401).json({ error: 'Telegram authentication required' });
    }
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('telegram_id', req.telegramUser.id.toString())
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST /api/orders - Create order (Telegram user)
router.post('/', verifyTelegramWebApp, async (req: Request, res: Response) => {
  try {
    const validatedData = createOrderSchema.parse(req.body);
    
    if (!req.telegramUser) {
      return res.status(401).json({ error: 'Telegram authentication required' });
    }
    
    // Track checkout start
    trackEvent('checkout_start', {
      telegramId: req.telegramUser.id.toString(),
      metadata: { items_count: validatedData.items.length }
    });
    
    // Validate products and calculate total
    let total = 0;
    const orderItems: Array<{
      product_id: string;
      quantity: number;
      price: number;
      variant_id?: string;
      variant_name?: string;
    }> = [];
    
    for (const item of validatedData.items) {
      const { data: product, error } = await supabase
        .from('products')
        .select('id, price, stock, is_active')
        .eq('id', item.product_id)
        .single();
      
      if (error || !product || !product.is_active) {
        return res.status(400).json({ 
          error: `Товар не найден или недоступен: ${item.product_id}` 
        });
      }
      
      if (product.stock !== null && product.stock < item.quantity) {
        return res.status(400).json({ 
          error: `Недостаточно товара на складе: ${item.product_id}` 
        });
      }
      
      let price = product.price;
      let variantName: string | undefined;
      
      // If variant is specified, get variant info
      if (item.variant_id) {
        const { data: variant } = await supabaseAdmin
          .from('product_variants')
          .select('color_name, price')
          .eq('id', item.variant_id)
          .single();
        
        if (variant) {
          variantName = variant.color_name;
          if (variant.price) {
            price = variant.price;
          }
        }
      }
      
      total += price * item.quantity;
      orderItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price,
        variant_id: item.variant_id,
        variant_name: variantName
      });
    }
    
    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        telegram_id: req.telegramUser.id.toString(),
        telegram_username: req.telegramUser.username || null,
        status: 'pending',
        total,
        currency: validatedData.currency,
        contact_name: validatedData.contact_name,
        contact_phone: validatedData.contact_phone,
        contact_address: validatedData.contact_address || null,
        notes: validatedData.notes || null
      })
      .select()
      .single();
    
    if (orderError) throw orderError;
    
    // Create order items
    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(
        orderItems.map(item => ({
          order_id: order.id,
          ...item
        }))
      );
    
    if (itemsError) throw itemsError;
    
    // Update stock
    for (const item of orderItems) {
      await supabaseAdmin
        .rpc('decrement_stock', { 
          p_product_id: item.product_id, 
          p_quantity: item.quantity 
        });
    }
    
    // Track order created
    trackEvent('order_created', {
      telegramId: req.telegramUser.id.toString(),
      metadata: { 
        order_id: order.id,
        total,
        items_count: orderItems.length
      }
    });
    
    // Send notification to owner (admin)
    try {
      await sendOrderNotification(order, orderItems);
    } catch (notifyError) {
      console.error('Failed to send order notification:', notifyError);
    }
    
    // Send "in processing" notification to customer
    try {
      await sendOrderStatusNotification(
        req.telegramUser.id.toString(),
        order.id,
        'pending'
      );
    } catch (notifyError) {
      console.error('Failed to send customer notification:', notifyError);
    }
    
    res.status(201).json(order);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PUT /api/orders/:id/status - Update order status (admin/manager)
router.put('/:id/status', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = updateOrderStatusSchema.parse(req.body);
    
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Notify customer about status change
    try {
      await sendOrderStatusNotification(data.telegram_id, id, status);
    } catch (notifyError) {
      console.error('Failed to send status notification:', notifyError);
    }
    
    res.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// GET /api/orders/stats - Get order statistics (admin only)
router.get('/stats/summary', verifyToken, async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string) || 30;
    
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysNum);
    
    // Get orders by status
    const { data: statusCounts } = await supabaseAdmin
      .from('orders')
      .select('status')
      .gte('created_at', fromDate.toISOString());
    
    const byStatus: Record<string, number> = {};
    statusCounts?.forEach(order => {
      byStatus[order.status] = (byStatus[order.status] || 0) + 1;
    });
    
    // Get total revenue
    const { data: revenueData } = await supabaseAdmin
      .from('orders')
      .select('total')
      .in('status', ['confirmed', 'processing', 'shipped', 'delivered'])
      .gte('created_at', fromDate.toISOString());
    
    const totalRevenue = revenueData?.reduce((sum, o) => sum + o.total, 0) || 0;
    
    // Get average order value
    const avgOrderValue = revenueData?.length 
      ? totalRevenue / revenueData.length 
      : 0;
    
    res.json({
      byStatus,
      totalOrders: statusCounts?.length || 0,
      totalRevenue,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({ error: 'Failed to fetch order statistics' });
  }
});

// ==================== CRM ENDPOINTS ====================

// POST /api/orders/:id/claim - Claim order (manager/admin)
router.post('/:id/claim', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Atomically claim order only if not already assigned
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({
        assigned_manager_id: userId,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .is('assigned_manager_id', null)
      .select(`
        *,
        assigned_manager:admin_users!orders_assigned_manager_id_fkey(id, email)
      `)
      .single();
    
    if (error) {
      // Check if order exists and is already assigned
      const { data: existingOrder } = await supabaseAdmin
        .from('orders')
        .select('assigned_manager_id')
        .eq('id', id)
        .single();
      
      if (existingOrder?.assigned_manager_id) {
        return res.status(409).json({ error: 'Заказ уже взят другим менеджером' });
      }
      throw error;
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Order not found or already claimed' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error claiming order:', error);
    res.status(500).json({ error: 'Failed to claim order' });
  }
});

// POST /api/orders/:id/release - Release order (manager-owner or admin)
router.post('/:id/release', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get current order
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('assigned_manager_id')
      .eq('id', id)
      .single();
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Check permission: admin can release any, manager can only release own
    if (userRole !== 'admin' && order.assigned_manager_id !== userId) {
      return res.status(403).json({ error: 'Вы можете снять только свои заказы' });
    }
    
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({
        assigned_manager_id: null,
        assigned_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error releasing order:', error);
    res.status(500).json({ error: 'Failed to release order' });
  }
});

// POST /api/orders/:id/assign - Assign order to manager (admin only)
router.post('/:id/assign', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Только администратор может назначать заказы' });
    }
    
    const { manager_id } = assignOrderSchema.parse(req.body);
    
    // Verify manager exists
    const { data: manager } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('id', manager_id)
      .single();
    
    if (!manager) {
      return res.status(400).json({ error: 'Менеджер не найден' });
    }
    
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({
        assigned_manager_id: manager_id,
        assigned_at: new Date().toISOString(),
        assigned_by_admin_id: req.user?.userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        assigned_manager:admin_users!orders_assigned_manager_id_fkey(id, email)
      `)
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error assigning order:', error);
    res.status(500).json({ error: 'Failed to assign order' });
  }
});

// GET /api/orders/:id/messages - Get chat messages for order
router.get('/:id/messages', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    
    // Get order to check permission
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('assigned_manager_id')
      .eq('id', id)
      .single();
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Admin can see all, manager can only see assigned orders
    if (userRole !== 'admin' && order.assigned_manager_id !== userId) {
      return res.status(403).json({ error: 'Нет доступа к сообщениям этого заказа' });
    }
    
    const { data: messages, error } = await supabaseAdmin
      .from('order_messages')
      .select(`
        *,
        admin:admin_users!order_messages_created_by_admin_id_fkey(id, email)
      `)
      .eq('order_id', id)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    res.json(messages || []);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/orders/:id/messages - Send message to customer
router.post('/:id/messages', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    
    const { text } = sendMessageSchema.parse(req.body);
    
    // Get order to check permission and get telegram_id
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('telegram_id, assigned_manager_id')
      .eq('id', id)
      .single();
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Admin can message any order, manager can only message assigned orders
    if (userRole !== 'admin' && order.assigned_manager_id !== userId) {
      return res.status(403).json({ error: 'Нет доступа к этому заказу' });
    }
    
    // Send message via Telegram bot
    let telegramMessageId: string | null = null;
    try {
      const result = await sendCustomerMessage(order.telegram_id, text);
      telegramMessageId = result?.message_id?.toString() || null;
    } catch (botError) {
      console.error('Failed to send Telegram message:', botError);
      return res.status(500).json({ error: 'Не удалось отправить сообщение в Telegram' });
    }
    
    // Save message to database
    const { data: message, error } = await supabaseAdmin
      .from('order_messages')
      .insert({
        order_id: id,
        direction: 'out',
        telegram_chat_id: order.telegram_id,
        telegram_message_id: telegramMessageId,
        text,
        created_by_admin_id: userId
      })
      .select(`
        *,
        admin:admin_users!order_messages_created_by_admin_id_fkey(id, email)
      `)
      .single();
    
    if (error) throw error;
    
    res.status(201).json(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/orders/managers/list - Get list of managers (admin only)
router.get('/managers/list', verifyToken, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, role')
      .in('role', ['admin', 'manager'])
      .order('email');
    
    if (error) throw error;
    
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({ error: 'Failed to fetch managers' });
  }
});

export default router;
