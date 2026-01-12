import { Router, Request, Response } from 'express';
import { supabaseAdmin, supabase } from '../config/supabase';
import { verifyToken, optionalTelegramAuth } from '../middleware/auth';
import { trackEvent } from '../services/analytics';
import { convertPrice } from '../services/currencyConverter';
import { Currency, ProductsFilter } from '../types';
import { z } from 'zod';

const router = Router();

// Validation schemas
const productSchema = z.object({
  article: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  name_en: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  description_en: z.string().max(5000).optional(),
  price: z.number().positive(),
  category_id: z.string().uuid(),
  image_url: z.string().url().optional().nullable(),
  stock: z.number().int().min(0).optional().nullable(),
  is_active: z.boolean().optional()
});

// GET /api/products - List products with filters
router.get('/', optionalTelegramAuth, async (req: Request, res: Response) => {
  try {
    const {
      category_id,
      search,
      min_price,
      max_price,
      in_stock,
      page = '1',
      limit = '20',
      currency = 'RUB'
    } = req.query;
    
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, name_en, slug)
      `, { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (category_id) {
      // Get all subcategories
      const { data: categories } = await supabase
        .from('categories')
        .select('id')
        .or(`id.eq.${category_id},parent_id.eq.${category_id}`);
      
      const categoryIds = categories?.map(c => c.id) || [category_id];
      query = query.in('category_id', categoryIds);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,article.ilike.%${search}%,description.ilike.%${search}%`);
      
      // Track search event
      if (req.telegramUser) {
        trackEvent('search', {
          telegramId: req.telegramUser.id.toString(),
          metadata: { query: search }
        });
      }
    }
    
    if (min_price) {
      query = query.gte('price', parseFloat(min_price as string));
    }
    
    if (max_price) {
      query = query.lte('price', parseFloat(max_price as string));
    }
    
    if (in_stock === 'true') {
      query = query.or('stock.is.null,stock.gt.0');
    }
    
    // Pagination
    query = query.range(offset, offset + limitNum - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    // Convert prices if needed
    let products = data || [];
    if (currency !== 'RUB') {
      products = await Promise.all(
        products.map(async (product) => ({
          ...product,
          price: await convertPrice(product.price, currency as Currency),
          original_price: product.price
        }))
      );
    }
    
    res.json({
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id - Get single product
router.get('/:id', optionalTelegramAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { currency = 'RUB' } = req.query;
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, name_en, slug, parent_id)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Track product view
    if (req.telegramUser) {
      trackEvent('product_view', {
        productId: id,
        telegramId: req.telegramUser.id.toString()
      });
    }
    
    // Convert price if needed
    let product = data;
    if (currency !== 'RUB') {
      product = {
        ...data,
        price: await convertPrice(data.price, currency as Currency),
        original_price: data.price
      };
    }
    
    // Get price history
    const { data: priceHistory } = await supabase
      .from('price_history')
      .select('price, created_at')
      .eq('product_id', id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    res.json({
      ...product,
      price_history: priceHistory || []
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products - Create product (admin only)
router.post('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const validatedData = productSchema.parse(req.body);
    
    // Check for duplicate article
    const { data: existing } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('article', validatedData.article)
      .single();
    
    if (existing) {
      return res.status(400).json({ error: 'Товар с таким артикулом уже существует' });
    }
    
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        ...validatedData,
        is_active: validatedData.is_active ?? true
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id - Update product (admin only)
router.put('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = productSchema.partial().parse(req.body);
    
    // Check if article already exists (if changing)
    if (validatedData.article) {
      const { data: existing } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('article', validatedData.article)
        .neq('id', id)
        .single();
      
      if (existing) {
        return res.status(400).json({ error: 'Товар с таким артикулом уже существует' });
      }
    }
    
    // Get current product to save price history
    if (validatedData.price !== undefined) {
      const { data: current } = await supabaseAdmin
        .from('products')
        .select('price')
        .eq('id', id)
        .single();
      
      if (current && current.price !== validatedData.price) {
        await supabaseAdmin
          .from('price_history')
          .insert({
            product_id: id,
            price: current.price
          });
      }
    }
    
    const { data, error } = await supabaseAdmin
      .from('products')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id - Delete product (admin only)
router.delete('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
