import { Router, Request, Response } from 'express';
import { supabaseAdmin, supabase } from '../config/supabase';
import { verifyToken, verifyTelegramWebApp } from '../middleware/auth';
import { trackEvent } from '../services/analytics';
import { sendOrderNotification } from '../bot';
import { z } from 'zod';
import { OrderStatus } from '../types';

const router = Router();

// Validation schemas
const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive()
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

// GET /api/orders - List orders (admin only)
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    let query = supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
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

// GET /api/orders/:id - Get single order (admin only)
router.get('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
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
      
      total += product.price * item.quantity;
      orderItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price: product.price
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
    
    // Send notification to owner
    try {
      await sendOrderNotification(order, orderItems);
    } catch (notifyError) {
      console.error('Failed to send order notification:', notifyError);
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

// PUT /api/orders/:id/status - Update order status (admin only)
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

export default router;
