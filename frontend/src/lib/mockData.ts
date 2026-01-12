import { Product, Category } from '../types';

// Brands
export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
}

export const mockBrands: Brand[] = [
  { id: 'all', name: 'Все', slug: 'all' },
  { id: 'apple', name: 'Apple', slug: 'apple' },
  { id: 'samsung', name: 'Samsung', slug: 'samsung' },
  { id: 'xiaomi', name: 'Xiaomi', slug: 'xiaomi' },
  { id: 'huawei', name: 'Huawei', slug: 'huawei' },
  { id: 'google', name: 'Google', slug: 'google' },
  { id: 'sony', name: 'Sony', slug: 'sony' },
];

export const mockCategories: Category[] = [
  { id: '1', name: 'Телефоны', name_en: 'Phones', slug: 'phones', parent_id: null, order_index: 1 },
  { id: '2', name: 'Планшеты', name_en: 'Tablets', slug: 'tablets', parent_id: null, order_index: 2 },
  { id: '3', name: 'Ноутбуки', name_en: 'Laptops', slug: 'laptops', parent_id: null, order_index: 3 },
  { id: '4', name: 'Наушники', name_en: 'Headphones', slug: 'headphones', parent_id: null, order_index: 4 },
  { id: '5', name: 'Часы', name_en: 'Watches', slug: 'watches', parent_id: null, order_index: 5 },
  { id: '6', name: 'Аксессуары', name_en: 'Accessories', slug: 'accessories', parent_id: null, order_index: 6 },
];

export const mockProducts: Product[] = [
  // Apple - iPhone 16 с локальным изображением
  {
    id: '1',
    article: 'IPHONE16-256',
    name: 'iPhone 16',
    name_en: 'iPhone 16',
    description: 'Новейший iPhone 16 во всех цветах',
    price: 124990,
    category_id: '1',
    brand: 'apple',
    category: mockCategories[0],
    image_url: '/iphone16.png',
    stock: 15,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    article: 'IPHONE15PRO-MAX-512',
    name: 'iPhone 15 Pro Max 512GB',
    name_en: 'iPhone 15 Pro Max 512GB',
    description: 'Максимальная версия iPhone 15',
    price: 159990,
    category_id: '1',
    brand: 'apple',
    category: mockCategories[0],
    image_url: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-max-finish-select-202309-6-7inch_GEO_US?wid=800&hei=800&fmt=jpeg&qlt=90',
    stock: 8,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    article: 'AIRPODS-PRO-2',
    name: 'AirPods Pro 2',
    name_en: 'AirPods Pro 2',
    description: 'Беспроводные наушники с шумоподавлением',
    price: 24990,
    category_id: '4',
    brand: 'apple',
    category: mockCategories[3],
    image_url: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MQD83?wid=800&hei=800&fmt=jpeg&qlt=90',
    stock: 30,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '4',
    article: 'WATCH-ULTRA-2',
    name: 'Apple Watch Ultra 2',
    name_en: 'Apple Watch Ultra 2',
    description: 'Премиальные смарт-часы для экстремалов',
    price: 79990,
    category_id: '5',
    brand: 'apple',
    category: mockCategories[4],
    image_url: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MREX3ref_VW_34FR+watch-case-49-titanium-702cell-702cell_VW_34FR+watch-face-49-702cell-702cell_VW_34FR?wid=800&hei=800&fmt=jpeg&qlt=90',
    stock: 5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  // Samsung
  {
    id: '5',
    article: 'S24-ULTRA-256',
    name: 'Samsung Galaxy S24 Ultra 256GB',
    name_en: 'Samsung Galaxy S24 Ultra 256GB',
    description: 'Флагман Samsung с AI функциями',
    price: 109990,
    category_id: '1',
    brand: 'samsung',
    category: mockCategories[0],
    image_url: 'https://images.samsung.com/is/image/samsung/p6pim/ru/2401/gallery/ru-galaxy-s24-s928-sm-s928bztqser-thumb-539573067?$344_344_PNG$',
    stock: 12,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '6',
    article: 'BUDS3-PRO',
    name: 'Samsung Galaxy Buds3 Pro',
    name_en: 'Samsung Galaxy Buds3 Pro',
    description: 'TWS наушники с ANC',
    price: 18990,
    category_id: '4',
    brand: 'samsung',
    category: mockCategories[3],
    image_url: 'https://images.samsung.com/is/image/samsung/p6pim/ru/sm-r630nzaaser/gallery/ru-galaxy-buds-fe-r630-sm-r630nzaaser-thumb-536266068?$344_344_PNG$',
    stock: 20,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '7',
    article: 'WATCH6-CLASSIC',
    name: 'Samsung Galaxy Watch6 Classic',
    name_en: 'Samsung Galaxy Watch6 Classic',
    description: 'Классические смарт-часы с вращающимся безелем',
    price: 34990,
    category_id: '5',
    brand: 'samsung',
    category: mockCategories[4],
    image_url: 'https://images.samsung.com/is/image/samsung/p6pim/ru/2307/gallery/ru-galaxy-watch6-classic-r960-sm-r960nzkaser-thumb-536209465?$344_344_PNG$',
    stock: 8,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  // Xiaomi
  {
    id: '8',
    article: 'XIAOMI14-ULTRA',
    name: 'Xiaomi 14 Ultra 512GB',
    name_en: 'Xiaomi 14 Ultra 512GB',
    description: 'Флагман с камерой Leica',
    price: 94990,
    category_id: '1',
    brand: 'xiaomi',
    category: mockCategories[0],
    image_url: 'https://i01.appmifile.com/v1/MI_18455B3E4DA706226CF7535A58E875F0267/pms_1708939467.07637873.png?width=800&height=800',
    stock: 10,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '9',
    article: 'BUDS4-PRO',
    name: 'Xiaomi Buds 4 Pro',
    name_en: 'Xiaomi Buds 4 Pro',
    description: 'Флагманские TWS с LDAC',
    price: 12990,
    category_id: '4',
    brand: 'xiaomi',
    category: mockCategories[3],
    image_url: 'https://i01.appmifile.com/webfile/globalimg/products/pc/xiaomi-buds-4-pro/specs-header.png',
    stock: 25,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  // Google
  {
    id: '10',
    article: 'PIXEL8-PRO-256',
    name: 'Google Pixel 8 Pro 256GB',
    name_en: 'Google Pixel 8 Pro 256GB',
    description: 'Лучшая камера на Android',
    price: 89990,
    category_id: '1',
    brand: 'google',
    category: mockCategories[0],
    image_url: 'https://lh3.googleusercontent.com/qKrC9wpYcL4M8c_xqDJTTcJQVt9T1hT1vYB8yT3fAO8j3H8jM9fVn2M3K5kX5j5K5j5K5j5K5j5=w800',
    stock: 6,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '11',
    article: 'PIXEL-BUDS-PRO',
    name: 'Google Pixel Buds Pro',
    name_en: 'Google Pixel Buds Pro',
    description: 'TWS наушники от Google',
    price: 16990,
    category_id: '4',
    brand: 'google',
    category: mockCategories[3],
    image_url: 'https://lh3.googleusercontent.com/ZkG5k2T5mOdR2J8vQ8nS8oR2J8vQ8nS8oR2J8vQ8nS8oR2J8vQ8nS8=w800',
    stock: 15,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  // Huawei
  {
    id: '12',
    article: 'MATE60-PRO',
    name: 'Huawei Mate 60 Pro',
    name_en: 'Huawei Mate 60 Pro',
    description: 'Флагман с собственным чипом',
    price: 84990,
    category_id: '1',
    brand: 'huawei',
    category: mockCategories[0],
    image_url: 'https://consumer.huawei.com/content/dam/huawei-cbg-site/common/mkt/pdp/phones/mate60-pro/img/mob/huawei-mate-60-pro-green-mob.png',
    stock: 4,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
];

export const isDemoMode = !import.meta.env.VITE_SUPABASE_URL;
