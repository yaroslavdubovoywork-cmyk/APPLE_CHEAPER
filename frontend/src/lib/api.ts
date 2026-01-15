import { Product, Category, Order, Favorite, PaginatedResponse, CurrencyRates, Currency, StoreSettings } from '../types';
import { supabase, isSupabaseEnabled } from './supabase';
import { mockProducts, mockCategories } from './mockData';

// Use Supabase if configured, otherwise fallback to mock
const USE_MOCK = !isSupabaseEnabled;

// Products API
export const productsApi = {
  getAll: async (params?: {
    category_id?: string;
    search?: string;
    page?: number;
    limit?: number;
    currency?: Currency;
    in_stock?: boolean;
    brand?: string;
  }): Promise<PaginatedResponse<Product>> => {
    if (USE_MOCK) {
      let filtered = [...mockProducts];
      
      if (params?.brand && params.brand !== 'all') {
        filtered = filtered.filter(p => (p as any).brand?.toLowerCase() === params.brand?.toLowerCase());
      }
      
      if (params?.category_id) {
        filtered = filtered.filter(p => 
          p.category_id === params.category_id || 
          p.category?.parent_id === params.category_id
        );
      }
      
      if (params?.search) {
        const search = params.search.toLowerCase();
        filtered = filtered.filter(p => 
          p.name.toLowerCase().includes(search) || 
          p.article.toLowerCase().includes(search)
        );
      }
      
      const page = params?.page || 1;
      const limit = params?.limit || 20;
      const start = (page - 1) * limit;
      const paginated = filtered.slice(start, start + limit);
      
      return {
        products: paginated,
        pagination: {
          page,
          limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit)
        }
      };
    }
    
    // Supabase query
    let query = supabase!
      .from('products')
      .select(`
        *,
        category:categories(id, name, name_en, slug),
        variants:product_variants(id, color_name, color_hex, price, sort_order)
      `, { count: 'exact' })
      .eq('is_active', true);
    
    if (params?.brand && params.brand !== 'all') {
      query = query.ilike('brand', params.brand);
    }
    
    if (params?.category_id) {
      query = query.eq('category_id', params.category_id);
    }
    
    if (params?.search) {
      query = query.or(`name.ilike.%${params.search}%,article.ilike.%${params.search}%`);
    }
    
    if (params?.in_stock) {
      query = query.or('stock.is.null,stock.gt.0');
    }
    
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const start = (page - 1) * limit;
    
    query = query.range(start, start + limit - 1).order('created_at', { ascending: false });
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return {
      products: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  },
  
  getById: async (id: string, _currency?: Currency): Promise<Product> => {
    if (USE_MOCK) {
      const product = mockProducts.find(p => p.id === id);
      if (!product) throw new Error('Product not found');
      return product;
    }
    
    const { data, error } = await supabase!
      .from('products')
      .select(`
        *,
        category:categories(id, name, name_en, slug),
        variants:product_variants(id, color_name, color_name_en, color_hex, image_url, price, sort_order)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Sort variants by sort_order
    if (data.variants) {
      data.variants.sort((a: any, b: any) => a.sort_order - b.sort_order);
    }
    
    return data;
  }
};

// Categories API
export const categoriesApi = {
  getAll: async (flat?: boolean): Promise<Category[]> => {
    if (USE_MOCK) {
      if (flat) return mockCategories;
      
      const rootCategories = mockCategories.filter(c => !c.parent_id);
      return rootCategories.map(cat => ({
        ...cat,
        children: mockCategories.filter(c => c.parent_id === cat.id)
      }));
    }
    
    const { data, error } = await supabase!
      .from('categories')
      .select('*')
      .order('order_index');
    
    if (error) throw error;
    
    if (flat) return data || [];
    
    // Build tree
    const rootCategories = (data || []).filter(c => !c.parent_id);
    return rootCategories.map(cat => ({
      ...cat,
      children: (data || []).filter(c => c.parent_id === cat.id)
    }));
  },
  
  getById: async (id: string): Promise<Category & { children: Category[]; products_count: number }> => {
    if (USE_MOCK) {
      const category = mockCategories.find(c => c.id === id);
      if (!category) throw new Error('Category not found');
      return {
        ...category,
        children: mockCategories.filter(c => c.parent_id === id),
        products_count: mockProducts.filter(p => p.category_id === id).length
      };
    }
    
    const { data: category, error } = await supabase!
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    const { data: children } = await supabase!
      .from('categories')
      .select('*')
      .eq('parent_id', id);
    
    const { count } = await supabase!
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('is_active', true);
    
    return {
      ...category,
      children: children || [],
      products_count: count || 0
    };
  }
};

// Brands API
export const brandsApi = {
  getAll: async (): Promise<string[]> => {
    if (USE_MOCK) {
      const brands = [...new Set(mockProducts.map(p => (p as any).brand).filter(Boolean))];
      return brands.sort();
    }
    
    const { data, error } = await supabase!
      .from('products')
      .select('brand')
      .eq('is_active', true)
      .not('brand', 'is', null);
    
    if (error) throw error;
    
    const brands = [...new Set((data || []).map(p => p.brand).filter(Boolean))];
    return brands.sort();
  }
};

// Backend API URL for order creation (with notifications)
const API_URL = import.meta.env.VITE_API_URL || '';

// Helper: Create order via direct Supabase (fallback)
async function createOrderDirect(data: {
  items: Array<{ product_id: string; quantity: number; variant_id?: string }>;
  contact_name: string;
  contact_phone: string;
  contact_address?: string;
  notes?: string;
  currency?: Currency;
}): Promise<Order> {
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || 'anonymous';
  const telegramUsername = window.Telegram?.WebApp?.initDataUnsafe?.user?.username || null;
  
  // Calculate total
  const productIds = data.items.map(i => i.product_id);
  const { data: products } = await supabase!
    .from('products')
    .select('id, price')
    .in('id', productIds);
  
  const total = data.items.reduce((sum, item) => {
    const product = products?.find(p => p.id === item.product_id);
    return sum + (product?.price || 0) * item.quantity;
  }, 0);
  
  // Create order
  const { data: order, error } = await supabase!
    .from('orders')
    .insert({
      telegram_id: telegramId,
      telegram_username: telegramUsername,
      status: 'pending',
      total,
      currency: data.currency || 'RUB',
      contact_name: data.contact_name,
      contact_phone: data.contact_phone,
      contact_address: data.contact_address,
      notes: data.notes
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Create order items with variant info
  const orderItems = await Promise.all(data.items.map(async (item) => {
    let variantName = null;
    let price = products?.find(p => p.id === item.product_id)?.price || 0;
    
    if (item.variant_id) {
      const { data: variant } = await supabase!
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
    
    return {
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price,
      variant_id: item.variant_id || null,
      variant_name: variantName
    };
  }));
  
  await supabase!.from('order_items').insert(orderItems);
  
  return order;
}

// Orders API
export const ordersApi = {
  create: async (data: {
    items: Array<{ product_id: string; quantity: number; variant_id?: string }>;
    contact_name: string;
    contact_phone: string;
    contact_address?: string;
    notes?: string;
    currency?: Currency;
    telegram_id?: string;
    telegram_username?: string;
  }): Promise<Order> => {
    if (USE_MOCK) {
      return {
        id: 'demo-' + Date.now(),
        telegram_id: '12345',
        telegram_username: null,
        status: 'pending',
        total: data.items.reduce((sum, item) => {
          const product = mockProducts.find(p => p.id === item.product_id);
          return sum + (product?.price || 0) * item.quantity;
        }, 0),
        currency: data.currency || 'RUB',
        contact_name: data.contact_name,
        contact_phone: data.contact_phone,
        contact_address: data.contact_address || null,
        notes: data.notes || null,
        created_at: new Date().toISOString()
      };
    }
    
    // Try backend first (has notifications), fallback to direct Supabase
    if (API_URL) {
      try {
        const initData = window.Telegram?.WebApp?.initData || '';
        
        const response = await fetch(`${API_URL}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': initData
          },
          body: JSON.stringify({
            items: data.items.map(item => ({
              product_id: item.product_id,
              quantity: item.quantity,
              variant_id: item.variant_id
            })),
            contact_name: data.contact_name,
            contact_phone: data.contact_phone,
            contact_address: data.contact_address,
            notes: data.notes,
            currency: data.currency || 'RUB'
          })
        });
        
        if (response.ok) {
          return response.json();
        }
        
        // If backend fails, fall through to direct Supabase
        console.warn('Backend order creation failed, using direct Supabase');
      } catch (err) {
        console.warn('Backend unavailable, using direct Supabase:', err);
      }
    }
    
    // Fallback: direct Supabase (no notifications, but order is saved)
    return createOrderDirect(data);
  },
  
  getMy: async (): Promise<Order[]> => {
    if (USE_MOCK) return [];
    
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
    if (!telegramId) return [];
    
    const { data, error } = await supabase!
      .from('orders')
      .select(`
        *,
        items:order_items(
          *,
          product:products(id, name, name_en, image_url)
        )
      `)
      .eq('telegram_id', telegramId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
};

// Favorites API
export const favoritesApi = {
  getAll: async (): Promise<Favorite[]> => {
    if (USE_MOCK) return [];
    
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
    if (!telegramId) return [];
    
    const { data, error } = await supabase!
      .from('favorites')
      .select(`
        *,
        product:products(*)
      `)
      .eq('telegram_id', telegramId);
    
    if (error) throw error;
    return data || [];
  },
  
  add: async (productId: string): Promise<{ success: boolean }> => {
    if (USE_MOCK) return { success: true };
    
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
    if (!telegramId) return { success: false };
    
    const { error } = await supabase!
      .from('favorites')
      .upsert({ telegram_id: telegramId, product_id: productId });
    
    return { success: !error };
  },
  
  remove: async (productId: string): Promise<{ success: boolean }> => {
    if (USE_MOCK) return { success: true };
    
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
    if (!telegramId) return { success: false };
    
    const { error } = await supabase!
      .from('favorites')
      .delete()
      .eq('telegram_id', telegramId)
      .eq('product_id', productId);
    
    return { success: !error };
  }
};

// Analytics API
export const analyticsApi = {
  trackEvent: async (data: {
    event_type: string;
    product_id?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean }> => {
    if (USE_MOCK) return { success: true };
    
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
    
    const { error } = await supabase!
      .from('analytics_events')
      .insert({
        event_type: data.event_type,
        product_id: data.product_id,
        telegram_id: telegramId,
        metadata: data.metadata
      });
    
    return { success: !error };
  }
};

// Settings API
export const settingsApi = {
  getAll: async (): Promise<StoreSettings> => {
    if (USE_MOCK) {
      return {
        store_name: 'Cheaper',
        store_description: 'Лучшие цены на технику',
        store_description_en: 'Best prices on tech',
        contact_phone: '',
        contact_email: '',
        contact_telegram: '',
        default_currency: 'RUB',
        min_order_amount: '0',
        delivery_info: '',
        delivery_info_en: '',
        working_hours: ''
      };
    }
    
    const { data, error } = await supabase!
      .from('settings')
      .select('key, value');
    
    if (error) throw error;
    
    const result: Record<string, string> = {};
    (data || []).forEach(({ key, value }) => {
      result[key] = value;
    });
    return result as unknown as StoreSettings;
  },
  
  getCurrencyRates: async (): Promise<CurrencyRates> => {
    // For now, return static rates
    return {
      RUB: 1,
      USD: 0.011,
      EUR: 0.010,
      updated_at: new Date().toISOString()
    };
  },
  
  getCurrencies: async (): Promise<Array<{ code: Currency; name: string; symbol: string }>> => {
    return [
      { code: 'RUB', name: 'Рубль', symbol: '₽' },
      { code: 'USD', name: 'Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' }
    ];
  }
};
