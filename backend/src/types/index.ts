// Database types
export interface Category {
  id: string;
  name: string;
  name_en: string;
  slug: string;
  parent_id: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  article: string;
  name: string;
  name_en: string;
  description: string | null;
  description_en: string | null;
  price: number;
  category_id: string;
  image_url: string | null;
  stock: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductWithCategory extends Product {
  category: Category;
}

export interface Order {
  id: string;
  telegram_id: string;
  telegram_username: string | null;
  status: OrderStatus;
  total: number;
  currency: Currency;
  contact_name: string;
  contact_phone: string;
  contact_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  product?: Product;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type Currency = 'RUB' | 'USD' | 'EUR';

export interface PriceHistory {
  id: string;
  product_id: string;
  price: number;
  created_at: string;
}

export interface AnalyticsEvent {
  id: string;
  event_type: EventType;
  product_id: string | null;
  user_id: string | null;
  telegram_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export type EventType = 
  | 'page_view'
  | 'product_view'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'add_to_favorites'
  | 'remove_from_favorites'
  | 'checkout_start'
  | 'order_created'
  | 'search';

export interface Favorite {
  id: string;
  telegram_id: string;
  product_id: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  telegram_id: string | null;
  role: 'admin' | 'manager';
  created_at: string;
  updated_at: string;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

// API types
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ProductsFilter extends PaginationParams {
  category_id?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
}

export interface PriceUpdateItem {
  article?: string;
  name?: string;
  price: number;
}

export interface PriceUpdateResult {
  success: number;
  failed: number;
  errors: Array<{
    line: number;
    article?: string;
    name?: string;
    reason: string;
  }>;
}

export interface CurrencyRates {
  RUB: number;
  USD: number;
  EUR: number;
  updated_at: string;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'manager';
}

// Telegram WebApp types
export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramWebAppInitData {
  query_id?: string;
  user?: TelegramWebAppUser;
  auth_date: number;
  hash: string;
}
