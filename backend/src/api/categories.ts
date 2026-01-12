import { Router, Request, Response } from 'express';
import { supabaseAdmin, supabase } from '../config/supabase';
import { verifyToken } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Validation schema
const categorySchema = z.object({
  name: z.string().min(1).max(100),
  name_en: z.string().max(100).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  parent_id: z.string().uuid().nullable().optional(),
  order_index: z.number().int().min(0).optional()
});

// Build category tree from flat list
function buildCategoryTree(categories: any[], parentId: string | null = null): any[] {
  return categories
    .filter(cat => cat.parent_id === parentId)
    .sort((a, b) => a.order_index - b.order_index)
    .map(cat => ({
      ...cat,
      children: buildCategoryTree(categories, cat.id)
    }));
}

// GET /api/categories - List all categories
router.get('/', async (req: Request, res: Response) => {
  try {
    const { flat } = req.query;
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('order_index', { ascending: true });
    
    if (error) throw error;
    
    if (flat === 'true') {
      return res.json(data);
    }
    
    // Return hierarchical structure
    const tree = buildCategoryTree(data || []);
    res.json(tree);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/categories/:id - Get single category
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('categories')
      .select(`
        *,
        parent:categories!parent_id(id, name, name_en, slug)
      `)
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Get subcategories
    const { data: children } = await supabase
      .from('categories')
      .select('id, name, name_en, slug, order_index')
      .eq('parent_id', id)
      .order('order_index', { ascending: true });
    
    // Get products count
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('is_active', true);
    
    res.json({
      ...data,
      children: children || [],
      products_count: count || 0
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// GET /api/categories/slug/:slug - Get category by slug
router.get('/slug/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const { data, error } = await supabase
      .from('categories')
      .select(`
        *,
        parent:categories!parent_id(id, name, name_en, slug)
      `)
      .eq('slug', slug)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Get subcategories
    const { data: children } = await supabase
      .from('categories')
      .select('id, name, name_en, slug, order_index')
      .eq('parent_id', data.id)
      .order('order_index', { ascending: true });
    
    res.json({
      ...data,
      children: children || []
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// POST /api/categories - Create category (admin only)
router.post('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const validatedData = categorySchema.parse(req.body);
    
    // Check for duplicate slug
    const { data: existing } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('slug', validatedData.slug)
      .single();
    
    if (existing) {
      return res.status(400).json({ error: 'Категория с таким slug уже существует' });
    }
    
    // Validate parent_id exists
    if (validatedData.parent_id) {
      const { data: parent } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('id', validatedData.parent_id)
        .single();
      
      if (!parent) {
        return res.status(400).json({ error: 'Родительская категория не найдена' });
      }
    }
    
    // Get max order_index
    const { data: maxOrder } = await supabaseAdmin
      .from('categories')
      .select('order_index')
      .eq('parent_id', validatedData.parent_id || null)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();
    
    const orderIndex = validatedData.order_index ?? ((maxOrder?.order_index || 0) + 1);
    
    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert({
        ...validatedData,
        parent_id: validatedData.parent_id || null,
        order_index: orderIndex
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /api/categories/:id - Update category (admin only)
router.put('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = categorySchema.partial().parse(req.body);
    
    // Check for duplicate slug
    if (validatedData.slug) {
      const { data: existing } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('slug', validatedData.slug)
        .neq('id', id)
        .single();
      
      if (existing) {
        return res.status(400).json({ error: 'Категория с таким slug уже существует' });
      }
    }
    
    // Prevent setting parent_id to self or descendant
    if (validatedData.parent_id) {
      if (validatedData.parent_id === id) {
        return res.status(400).json({ error: 'Категория не может быть родителем самой себя' });
      }
      
      // Check if parent_id is a descendant
      const { data: descendants } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('parent_id', id);
      
      if (descendants?.some(d => d.id === validatedData.parent_id)) {
        return res.status(400).json({ error: 'Нельзя установить дочернюю категорию как родительскую' });
      }
    }
    
    const { data, error } = await supabaseAdmin
      .from('categories')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// PUT /api/categories/reorder - Reorder categories (admin only)
router.put('/reorder', verifyToken, async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items must be an array' });
    }
    
    for (const item of items) {
      await supabaseAdmin
        .from('categories')
        .update({ order_index: item.order_index })
        .eq('id', item.id);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering categories:', error);
    res.status(500).json({ error: 'Failed to reorder categories' });
  }
});

// DELETE /api/categories/:id - Delete category (admin only)
router.delete('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check for subcategories
    const { data: children } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('parent_id', id);
    
    if (children && children.length > 0) {
      return res.status(400).json({ 
        error: 'Нельзя удалить категорию с подкатегориями. Сначала удалите или переместите подкатегории.' 
      });
    }
    
    // Check for products
    const { count } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id);
    
    if (count && count > 0) {
      return res.status(400).json({ 
        error: 'Нельзя удалить категорию с товарами. Сначала переместите товары в другую категорию.' 
      });
    }
    
    const { error } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
