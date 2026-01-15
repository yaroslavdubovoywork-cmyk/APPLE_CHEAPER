import { Router, Request, Response } from 'express';
import { supabaseAdmin, supabase } from '../config/supabase';
import { verifyTelegramWebApp } from '../middleware/auth';
import { trackEvent } from '../services/analytics';

const router = Router();

// GET /api/favorites - Get user's favorites
router.get('/', verifyTelegramWebApp, async (req: Request, res: Response) => {
  try {
    if (!req.telegramUser) {
      return res.status(401).json({ error: 'Telegram authentication required' });
    }
    
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        id,
        product_id,
        created_at,
        product:products(
          id, 
          article, 
          name, 
          name_en, 
          price, 
          image_url, 
          is_active,
          category:categories(id, name, name_en, slug)
        )
      `)
      .eq('telegram_id', req.telegramUser.id.toString())
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Filter out inactive products
    const activeFavorites = data?.filter(f => {
      const product = f.product as { is_active?: boolean } | null;
      return product?.is_active;
    }) || [];
    
    res.json(activeFavorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// POST /api/favorites/:productId - Add to favorites
router.post('/:productId', verifyTelegramWebApp, async (req: Request, res: Response) => {
  try {
    if (!req.telegramUser) {
      return res.status(401).json({ error: 'Telegram authentication required' });
    }
    
    const { productId } = req.params;
    
    // Check if product exists
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('is_active', true)
      .single();
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Check if already in favorites
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('telegram_id', req.telegramUser.id.toString())
      .eq('product_id', productId)
      .single();
    
    if (existing) {
      return res.json({ success: true, message: 'Already in favorites' });
    }
    
    // Add to favorites
    const { error } = await supabaseAdmin
      .from('favorites')
      .insert({
        telegram_id: req.telegramUser.id.toString(),
        product_id: productId
      });
    
    if (error) throw error;
    
    // Track event
    trackEvent('add_to_favorites', {
      productId,
      telegramId: req.telegramUser.id.toString()
    });
    
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
});

// DELETE /api/favorites/:productId - Remove from favorites
router.delete('/:productId', verifyTelegramWebApp, async (req: Request, res: Response) => {
  try {
    if (!req.telegramUser) {
      return res.status(401).json({ error: 'Telegram authentication required' });
    }
    
    const { productId } = req.params;
    
    const { error } = await supabaseAdmin
      .from('favorites')
      .delete()
      .eq('telegram_id', req.telegramUser.id.toString())
      .eq('product_id', productId);
    
    if (error) throw error;
    
    // Track event
    trackEvent('remove_from_favorites', {
      productId,
      telegramId: req.telegramUser.id.toString()
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({ error: 'Failed to remove from favorites' });
  }
});

// GET /api/favorites/check/:productId - Check if product is in favorites
router.get('/check/:productId', verifyTelegramWebApp, async (req: Request, res: Response) => {
  try {
    if (!req.telegramUser) {
      return res.json({ isFavorite: false });
    }
    
    const { productId } = req.params;
    
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('telegram_id', req.telegramUser.id.toString())
      .eq('product_id', productId)
      .single();
    
    res.json({ isFavorite: !!data });
  } catch (error) {
    console.error('Error checking favorite:', error);
    res.json({ isFavorite: false });
  }
});

export default router;
