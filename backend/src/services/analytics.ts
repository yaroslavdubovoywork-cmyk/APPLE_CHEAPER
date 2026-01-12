import { supabaseAdmin } from '../config/supabase';
import { EventType, AnalyticsEvent } from '../types';

// Track analytics event
export async function trackEvent(
  eventType: EventType,
  data: {
    productId?: string;
    userId?: string;
    telegramId?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    await supabaseAdmin.from('analytics_events').insert({
      event_type: eventType,
      product_id: data.productId || null,
      user_id: data.userId || null,
      telegram_id: data.telegramId || null,
      metadata: data.metadata || null
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

// Get product views count
export async function getProductViews(productId: string, days: number = 30): Promise<number> {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  
  const { count } = await supabaseAdmin
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'product_view')
    .eq('product_id', productId)
    .gte('created_at', fromDate.toISOString());
  
  return count || 0;
}

// Get popular products
export async function getPopularProducts(limit: number = 10, days: number = 30): Promise<Array<{ product_id: string; views: number }>> {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  
  const { data } = await supabaseAdmin
    .rpc('get_popular_products', { 
      from_date: fromDate.toISOString(),
      limit_count: limit 
    });
  
  return data || [];
}

// Get dashboard analytics
export async function getDashboardAnalytics(days: number = 30) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const fromDateStr = fromDate.toISOString();
  
  // Get total views
  const { count: totalViews } = await supabaseAdmin
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'product_view')
    .gte('created_at', fromDateStr);
  
  // Get unique visitors (by telegram_id)
  const { data: uniqueVisitors } = await supabaseAdmin
    .from('analytics_events')
    .select('telegram_id')
    .not('telegram_id', 'is', null)
    .gte('created_at', fromDateStr);
  
  const uniqueVisitorCount = new Set(uniqueVisitors?.map(v => v.telegram_id)).size;
  
  // Get cart additions
  const { count: cartAdditions } = await supabaseAdmin
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'add_to_cart')
    .gte('created_at', fromDateStr);
  
  // Get orders count
  const { count: ordersCount } = await supabaseAdmin
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', fromDateStr);
  
  // Get total revenue
  const { data: revenueData } = await supabaseAdmin
    .from('orders')
    .select('total')
    .in('status', ['confirmed', 'processing', 'shipped', 'delivered'])
    .gte('created_at', fromDateStr);
  
  const totalRevenue = revenueData?.reduce((sum, order) => sum + order.total, 0) || 0;
  
  // Calculate conversion funnel
  const viewToCartRate = totalViews ? ((cartAdditions || 0) / totalViews) * 100 : 0;
  const cartToOrderRate = cartAdditions ? ((ordersCount || 0) / cartAdditions) * 100 : 0;
  const overallConversion = totalViews ? ((ordersCount || 0) / totalViews) * 100 : 0;
  
  // Get daily stats
  const { data: dailyStats } = await supabaseAdmin
    .rpc('get_daily_analytics', { from_date: fromDateStr });
  
  return {
    totalViews: totalViews || 0,
    uniqueVisitors: uniqueVisitorCount,
    cartAdditions: cartAdditions || 0,
    ordersCount: ordersCount || 0,
    totalRevenue,
    conversionFunnel: {
      viewToCartRate: Math.round(viewToCartRate * 100) / 100,
      cartToOrderRate: Math.round(cartToOrderRate * 100) / 100,
      overallConversion: Math.round(overallConversion * 100) / 100
    },
    dailyStats: dailyStats || []
  };
}

// Get search analytics
export async function getSearchAnalytics(days: number = 30): Promise<Array<{ query: string; count: number }>> {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  
  const { data } = await supabaseAdmin
    .from('analytics_events')
    .select('metadata')
    .eq('event_type', 'search')
    .gte('created_at', fromDate.toISOString());
  
  if (!data) return [];
  
  // Count search queries
  const queryCounts = new Map<string, number>();
  for (const event of data) {
    const query = event.metadata?.query?.toLowerCase();
    if (query) {
      queryCounts.set(query, (queryCounts.get(query) || 0) + 1);
    }
  }
  
  // Sort by count and return top 20
  return Array.from(queryCounts.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

// Get geographic distribution
export async function getGeographicStats(days: number = 30): Promise<Array<{ country: string; count: number }>> {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  
  const { data } = await supabaseAdmin
    .from('analytics_events')
    .select('metadata')
    .not('metadata->country', 'is', null)
    .gte('created_at', fromDate.toISOString());
  
  if (!data) return [];
  
  const countryCounts = new Map<string, number>();
  for (const event of data) {
    const country = event.metadata?.country;
    if (country) {
      countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
    }
  }
  
  return Array.from(countryCounts.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);
}
