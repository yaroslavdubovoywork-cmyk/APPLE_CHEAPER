import { Router, Request, Response } from 'express';
import { verifyToken, optionalTelegramAuth } from '../middleware/auth';
import { 
  trackEvent, 
  getDashboardAnalytics, 
  getPopularProducts,
  getSearchAnalytics,
  getGeographicStats
} from '../services/analytics';
import { EventType } from '../types';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

// POST /api/analytics/event - Track event (from frontend)
router.post('/event', optionalTelegramAuth, async (req: Request, res: Response) => {
  try {
    const { event_type, product_id, metadata } = req.body;
    
    const validEventTypes: EventType[] = [
      'page_view',
      'product_view',
      'add_to_cart',
      'remove_from_cart',
      'add_to_favorites',
      'remove_from_favorites',
      'checkout_start',
      'search'
    ];
    
    if (!validEventTypes.includes(event_type)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }
    
    await trackEvent(event_type, {
      productId: product_id,
      telegramId: req.telegramUser?.id.toString(),
      metadata: {
        ...metadata,
        user_agent: req.headers['user-agent'],
        country: req.headers['cf-ipcountry'] || metadata?.country
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// GET /api/analytics/dashboard - Get dashboard analytics (admin only)
router.get('/dashboard', verifyToken, async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string) || 30;
    
    const analytics = await getDashboardAnalytics(daysNum);
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/analytics/popular - Get popular products (admin only)
router.get('/popular', verifyToken, async (req: Request, res: Response) => {
  try {
    const { limit = '10', days = '30' } = req.query;
    const limitNum = Math.min(50, parseInt(limit as string) || 10);
    const daysNum = parseInt(days as string) || 30;
    
    const popular = await getPopularProducts(limitNum, daysNum);
    
    // Get product details
    if (popular.length > 0) {
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, article, name, name_en, price, image_url')
        .in('id', popular.map(p => p.product_id));
      
      const productsMap = new Map(products?.map(p => [p.id, p]));
      
      const result = popular.map(p => ({
        ...productsMap.get(p.product_id),
        views: p.views
      }));
      
      return res.json(result);
    }
    
    res.json([]);
  } catch (error) {
    console.error('Error fetching popular products:', error);
    res.status(500).json({ error: 'Failed to fetch popular products' });
  }
});

// GET /api/analytics/searches - Get search analytics (admin only)
router.get('/searches', verifyToken, async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string) || 30;
    
    const searches = await getSearchAnalytics(daysNum);
    
    res.json(searches);
  } catch (error) {
    console.error('Error fetching search analytics:', error);
    res.status(500).json({ error: 'Failed to fetch search analytics' });
  }
});

// GET /api/analytics/geography - Get geographic stats (admin only)
router.get('/geography', verifyToken, async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string) || 30;
    
    const geoStats = await getGeographicStats(daysNum);
    
    res.json(geoStats);
  } catch (error) {
    console.error('Error fetching geographic stats:', error);
    res.status(500).json({ error: 'Failed to fetch geographic stats' });
  }
});

// GET /api/analytics/conversion-funnel - Get conversion funnel (admin only)
router.get('/conversion-funnel', verifyToken, async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string) || 30;
    
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysNum);
    const fromDateStr = fromDate.toISOString();
    
    // Get funnel steps
    const { count: pageViews } = await supabaseAdmin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'page_view')
      .gte('created_at', fromDateStr);
    
    const { count: productViews } = await supabaseAdmin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'product_view')
      .gte('created_at', fromDateStr);
    
    const { count: addToCart } = await supabaseAdmin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'add_to_cart')
      .gte('created_at', fromDateStr);
    
    const { count: checkoutStart } = await supabaseAdmin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'checkout_start')
      .gte('created_at', fromDateStr);
    
    const { count: orders } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fromDateStr);
    
    const funnel = [
      { step: 'Просмотры страниц', count: pageViews || 0, rate: 100 },
      { 
        step: 'Просмотры товаров', 
        count: productViews || 0, 
        rate: pageViews ? Math.round(((productViews || 0) / pageViews) * 100) : 0 
      },
      { 
        step: 'Добавление в корзину', 
        count: addToCart || 0, 
        rate: productViews ? Math.round(((addToCart || 0) / productViews) * 100) : 0 
      },
      { 
        step: 'Начало оформления', 
        count: checkoutStart || 0, 
        rate: addToCart ? Math.round(((checkoutStart || 0) / addToCart) * 100) : 0 
      },
      { 
        step: 'Заказы', 
        count: orders || 0, 
        rate: checkoutStart ? Math.round(((orders || 0) / checkoutStart) * 100) : 0 
      }
    ];
    
    res.json(funnel);
  } catch (error) {
    console.error('Error fetching conversion funnel:', error);
    res.status(500).json({ error: 'Failed to fetch conversion funnel' });
  }
});

export default router;
