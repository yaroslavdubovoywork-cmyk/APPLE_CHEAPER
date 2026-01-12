import { supabase } from './supabase';

// Types
export interface Product {
  id: string;
  article: string;
  name: string;
  name_en?: string;
  description?: string;
  description_en?: string;
  price: number;
  category_id: string;
  brand?: string;
  image_url?: string;
  stock?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Category {
  id: string;
  name: string;
  name_en?: string;
  slug: string;
  parent_id?: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  children?: Category[];
}

export interface Order {
  id: string;
  telegram_id: string;
  telegram_username?: string;
  status: string;
  total: number;
  currency: string;
  contact_name: string;
  contact_phone: string;
  contact_address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  product?: Product;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    // Check if admin exists
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !admin) {
      // If no admin exists, create first one
      const { count } = await supabase
        .from('admin_users')
        .select('*', { count: 'exact', head: true });
      
      if (count === 0) {
        // Create first admin
        const { data: newAdmin, error: createError } = await supabase
          .from('admin_users')
          .insert({
            email,
            password_hash: password, // In production, hash this!
            role: 'admin'
          })
          .select()
          .single();
        
        if (createError) throw createError;
        
        return {
          token: 'admin-session-' + Date.now(),
          user: { id: newAdmin.id, email: newAdmin.email, role: newAdmin.role }
        };
      }
      
      throw new Error('Invalid credentials');
    }
    
    // Simple password check (in production use bcrypt!)
    if (admin.password_hash !== password) {
      throw new Error('Invalid credentials');
    }
    
    return {
      token: 'admin-session-' + Date.now(),
      user: { id: admin.id, email: admin.email, role: admin.role }
    };
  },
  
  setup: async (email: string, password: string) => {
    const { data: admin, error } = await supabase
      .from('admin_users')
      .insert({
        email,
        password_hash: password,
        role: 'admin'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      token: 'admin-session-' + Date.now(),
      user: { id: admin.id, email: admin.email, role: admin.role }
    };
  },
  
  me: async () => {
    // In a real app, validate the token
    return { id: 'admin', email: 'admin@example.com', role: 'admin' };
  }
};

// Products API
export const productsApi = {
  getAll: async (params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    category_id?: string 
  }) => {
    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, name_en, slug)
      `, { count: 'exact' });
    
    if (params?.search) {
      query = query.or(`name.ilike.%${params.search}%,article.ilike.%${params.search}%`);
    }
    
    if (params?.category_id) {
      query = query.eq('category_id', params.category_id);
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
  
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, name_en, slug)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  create: async (product: Partial<Product>) => {
    const insertData: Record<string, unknown> = {
      article: product.article,
      name: product.name,
      price: product.price,
      category_id: product.category_id,
      is_active: product.is_active ?? true
    };
    
    if (product.name_en) insertData.name_en = product.name_en;
    if (product.description) insertData.description = product.description;
    if (product.description_en) insertData.description_en = product.description_en;
    if (product.brand) insertData.brand = product.brand;
    if (product.image_url) insertData.image_url = product.image_url;
    if (product.stock !== undefined && product.stock !== null) insertData.stock = product.stock;
    
    const { data, error } = await supabase
      .from('products')
      .insert(insertData)
      .select();
    
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Failed to create product');
    return data[0];
  },
  
  update: async (id: string, product: Partial<Product>) => {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };
    
    if (product.article !== undefined) updateData.article = product.article;
    if (product.name !== undefined) updateData.name = product.name;
    if (product.name_en !== undefined) updateData.name_en = product.name_en || null;
    if (product.description !== undefined) updateData.description = product.description || null;
    if (product.description_en !== undefined) updateData.description_en = product.description_en || null;
    if (product.price !== undefined) updateData.price = product.price;
    if (product.category_id !== undefined) updateData.category_id = product.category_id;
    if (product.brand !== undefined) updateData.brand = product.brand || null;
    if (product.image_url !== undefined) updateData.image_url = product.image_url || null;
    if (product.stock !== undefined) updateData.stock = product.stock;
    if (product.is_active !== undefined) updateData.is_active = product.is_active;
    
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Product not found');
    return data[0];
  },
  
  delete: async (id: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  },
  
  bulkUpdate: async (products: Array<{ article: string; price: number; name?: string }>) => {
    const results = { updated: 0, errors: [] as string[] };
    
    for (const item of products) {
      const { error } = await supabase
        .from('products')
        .update({ price: item.price, updated_at: new Date().toISOString() })
        .eq('article', item.article);
      
      if (error) {
        results.errors.push(`${item.article}: ${error.message}`);
      } else {
        results.updated++;
      }
    }
    
    return results;
  }
};

// Categories API
export const categoriesApi = {
  getAll: async (flat?: boolean) => {
    const { data, error } = await supabase
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
  
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  create: async (category: Partial<Category>) => {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: category.name,
        name_en: category.name_en,
        slug: category.slug,
        parent_id: category.parent_id,
        order_index: category.order_index || 0
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  update: async (id: string, category: Partial<Category>) => {
    const { data, error } = await supabase
      .from('categories')
      .update({
        name: category.name,
        name_en: category.name_en,
        slug: category.slug,
        parent_id: category.parent_id,
        order_index: category.order_index,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  delete: async (id: string) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  }
};

// Orders API
export const ordersApi = {
  getAll: async (params?: { page?: number; limit?: number; status?: string }) => {
    let query = supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          *,
          product:products(id, name, name_en, article, image_url)
        )
      `, { count: 'exact' });
    
    if (params?.status) {
      query = query.eq('status', params.status);
    }
    
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const start = (page - 1) * limit;
    
    query = query.range(start, start + limit - 1).order('created_at', { ascending: false });
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return {
      orders: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  },
  
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          *,
          product:products(id, name, name_en, article, image_url, price)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  updateStatus: async (id: string, status: string) => {
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  getStats: async (days?: number) => {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (days || 30));
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('status, total, created_at')
      .gte('created_at', fromDate.toISOString());
    
    if (error) throw error;
    
    const stats = {
      total_orders: orders?.length || 0,
      total_revenue: orders?.reduce((sum, o) => sum + parseFloat(o.total), 0) || 0,
      pending: orders?.filter(o => o.status === 'pending').length || 0,
      confirmed: orders?.filter(o => o.status === 'confirmed').length || 0,
      delivered: orders?.filter(o => o.status === 'delivered').length || 0,
      cancelled: orders?.filter(o => o.status === 'cancelled').length || 0
    };
    
    return stats;
  }
};

// Analytics API
export const analyticsApi = {
  getDashboard: async (days?: number) => {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (days || 30));
    
    // Get products count
    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    // Get categories count
    const { count: categoriesCount } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true });
    
    // Get orders stats
    const orderStats = await ordersApi.getStats(days);
    
    return {
      products_count: productsCount || 0,
      categories_count: categoriesCount || 0,
      ...orderStats
    };
  },
  
  getPopular: async (limit?: number, _days?: number) => {
    // For now, return top products by views from analytics
    const { data } = await supabase
      .from('products')
      .select('id, name, article, price, image_url')
      .eq('is_active', true)
      .limit(limit || 10);
    
    return data || [];
  }
};

// Settings API
export const settingsApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value');
    
    if (error) throw error;
    
    return (data || []).reduce((acc: Record<string, string>, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {});
  },
  
  update: async (settings: Record<string, string>) => {
    for (const [key, value] of Object.entries(settings)) {
      await supabase
        .from('settings')
        .upsert({ key, value, updated_at: new Date().toISOString() });
    }
    return { success: true };
  }
};

// Upload API  
export const uploadApi = {
  uploadImage: async (file: File): Promise<{ url: string }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('products')
      .upload(fileName, file);
    
    if (error) throw error;
    
    const { data } = supabase.storage
      .from('products')
      .getPublicUrl(fileName);
    
    return { url: data.publicUrl };
  },
  
  // CSV Price Upload - supports Google Sheets format
  parsePrices: (csvContent: string) => {
    const lines = csvContent.trim().split('\n');
    const products: Array<{ 
      article: string; 
      name: string; 
      price: number;
      category?: string;
      brand?: string;
      description?: string;
    }> = [];
    
    // Detect delimiter (tab, semicolon, or comma)
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';')) delimiter = ';';
    
    // Check for header
    const hasHeader = firstLine.toLowerCase().includes('название') || 
                      firstLine.toLowerCase().includes('цена') ||
                      firstLine.toLowerCase().includes('name') ||
                      firstLine.toLowerCase().includes('price');
    
    const startIndex = hasHeader ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(delimiter).map(p => p.trim());
      
      // Google Sheets format: Название, Цена, Категория, Подкатегория, Описание, Фото, Доступность
      if (parts.length >= 2) {
        const name = parts[0];
        const priceStr = parts[1].replace(/[^\d]/g, '');
        const price = parseInt(priceStr, 10);
        
        if (name && price > 0) {
          // Generate article from name if not provided
          const article = name
            .toUpperCase()
            .replace(/[^A-ZА-Я0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
          
          products.push({ 
            article, 
            name, 
            price,
            category: parts[2] || undefined,
            brand: parts[3] || 'Apple',
            description: parts[4] || undefined
          });
        }
      }
    }
    
    return products;
  },
  
  previewPrices: async (content: string) => {
    const parsed = uploadApi.parsePrices(content);
    
    // Check which products exist by name (fuzzy match)
    const { data: allProducts } = await supabase
      .from('products')
      .select('id, article, name, price');
    
    const items = parsed.map(p => {
      // Try to find by exact article match first
      let found = allProducts?.find(prod => 
        prod.article.toLowerCase() === p.article.toLowerCase()
      );
      
      // Then try by name match
      if (!found) {
        found = allProducts?.find(prod => {
          const searchName = p.name.toLowerCase().replace(/\s+/g, ' ');
          const prodName = prod.name.toLowerCase().replace(/\s+/g, ' ');
          return prodName.includes(searchName) || searchName.includes(prodName);
        });
      }
      
      const currentPrice = found ? parseFloat(found.price) : null;
      const priceChange = currentPrice !== null ? p.price - currentPrice : null;
      
      return {
        ...p,
        found: !!found,
        product_id: found?.id,
        product_name: found?.name,
        current_price: currentPrice,
        price_change: priceChange
      };
    });
    
    const summary = {
      total: items.length,
      found: items.filter(i => i.found).length,
      not_found: items.filter(i => !i.found).length,
      price_increased: items.filter(i => i.price_change !== null && i.price_change > 0).length,
      price_decreased: items.filter(i => i.price_change !== null && i.price_change < 0).length,
      unchanged: items.filter(i => i.price_change === 0).length
    };
    
    return { items, summary };
  },
  
  uploadPrices: async (content: string) => {
    const preview = await uploadApi.previewPrices(content);
    const toUpdate = preview.items.filter(i => i.found && i.product_id);
    
    let success = 0;
    let failed = 0;
    const errors: Array<{ line: number; reason: string; name?: string }> = [];
    
    for (const item of toUpdate) {
      const { error } = await supabase
        .from('products')
        .update({ 
          price: item.price, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', item.product_id);
      
      if (error) {
        failed++;
        errors.push({ line: 0, reason: error.message, name: item.name });
      } else {
        success++;
      }
    }
    
    // Count not found as failed
    failed += preview.items.filter(i => !i.found).length;
    
    return { success, failed, errors };
  }
};
