// Product types
export interface Category {
  id: string;
  name: string;
  name_en: string;
  slug: string;
  parent_id: string | null;
  order_index: number;
  children?: Category[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  color_name: string;
  color_name_en?: string;
  color_hex: string;
  image_url: string | null;
  sort_order: number;
}

export interface Product {
  id: string;
  article: string;
  name: string;
  name_en?: string;
  description: string | null;
  description_en?: string | null;
  price: number;
  original_price?: number;
  category_id: string;
  category?: Category;
  brand?: string;
  image_url: string | null;
  stock: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  price_history?: PriceHistoryItem[];
  variants?: ProductVariant[];
}

export interface PriceHistoryItem {
  price: number;
  created_at: string;
}

// Cart types
export interface CartItem {
  product: Product;
  quantity: number;
}

// Order types
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

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
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  product?: Product;
}

// Currency types
export type Currency = 'RUB' | 'USD' | 'EUR';

export interface CurrencyInfo {
  code: Currency;
  name: string;
  symbol: string;
}

export interface CurrencyRates {
  RUB: number;
  USD: number;
  EUR: number;
  updated_at: string;
}

// Favorites
export interface Favorite {
  id: string;
  product_id: string;
  product: Product;
  created_at: string;
}

// Pagination
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  products?: T[];
  orders?: T[];
  pagination: PaginationInfo;
}

// Telegram WebApp types
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramUser;
    auth_date: number;
    hash: string;
  };
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText(text: string): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
    show(): void;
    hide(): void;
    enable(): void;
    disable(): void;
    showProgress(leaveActive?: boolean): void;
    hideProgress(): void;
  };
  BackButton: {
    isVisible: boolean;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
    show(): void;
    hide(): void;
  };
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
  close(): void;
  expand(): void;
  ready(): void;
  sendData(data: string): void;
  openLink(url: string, options?: { try_instant_view?: boolean }): void;
  openTelegramLink(url: string): void;
  showPopup(params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id?: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text?: string;
    }>;
  }, callback?: (buttonId: string) => void): void;
  showAlert(message: string, callback?: () => void): void;
  showConfirm(message: string, callback?: (confirmed: boolean) => void): void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

// Settings
export interface StoreSettings {
  store_name: string;
  store_description: string;
  store_description_en: string;
  contact_phone: string;
  contact_email: string;
  contact_telegram: string;
  default_currency: Currency;
  min_order_amount: string;
  delivery_info: string;
  delivery_info_en: string;
  working_hours: string;
}
