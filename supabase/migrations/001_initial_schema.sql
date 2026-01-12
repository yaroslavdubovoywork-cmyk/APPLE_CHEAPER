-- Apple Cheaper - Initial Database Schema
-- Run this SQL in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table (hierarchical)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  slug VARCHAR(100) NOT NULL UNIQUE,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  description TEXT,
  description_en TEXT,
  price DECIMAL(12, 2) NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  image_url TEXT,
  stock INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_article ON products(article);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id VARCHAR(50) NOT NULL,
  telegram_username VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  total DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
  contact_name VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  contact_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_telegram_id ON orders(telegram_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  price DECIMAL(12, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Price history table
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_created_at ON price_history(created_at DESC);

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(50) NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  user_id VARCHAR(100),
  telegram_id VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_product_id ON analytics_events(product_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_telegram_id ON analytics_events(telegram_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id VARCHAR(50) NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(telegram_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_telegram_id ON favorites(telegram_id);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  telegram_id VARCHAR(50),
  role VARCHAR(20) NOT NULL DEFAULT 'manager',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function to decrement stock
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock = GREATEST(0, COALESCE(stock, 0) - p_quantity)
  WHERE id = p_product_id AND stock IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to get popular products
CREATE OR REPLACE FUNCTION get_popular_products(from_date TIMESTAMPTZ, limit_count INTEGER)
RETURNS TABLE(product_id UUID, views BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ae.product_id,
    COUNT(*) as views
  FROM analytics_events ae
  WHERE ae.event_type = 'product_view'
    AND ae.product_id IS NOT NULL
    AND ae.created_at >= from_date
  GROUP BY ae.product_id
  ORDER BY views DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get daily analytics
CREATE OR REPLACE FUNCTION get_daily_analytics(from_date TIMESTAMPTZ)
RETURNS TABLE(
  date DATE,
  page_views BIGINT,
  product_views BIGINT,
  add_to_cart BIGINT,
  orders BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(ae.created_at) as date,
    COUNT(*) FILTER (WHERE ae.event_type = 'page_view') as page_views,
    COUNT(*) FILTER (WHERE ae.event_type = 'product_view') as product_views,
    COUNT(*) FILTER (WHERE ae.event_type = 'add_to_cart') as add_to_cart,
    COUNT(*) FILTER (WHERE ae.event_type = 'order_created') as orders
  FROM analytics_events ae
  WHERE ae.created_at >= from_date
  GROUP BY DATE(ae.created_at)
  ORDER BY date;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (Row Level Security)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Public read access for categories and products
CREATE POLICY "Public read access for categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read access for products" ON products FOR SELECT USING (is_active = true);

-- Service role has full access (backend)
CREATE POLICY "Service role full access categories" ON categories FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access products" ON products FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access orders" ON orders FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access order_items" ON order_items FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access price_history" ON price_history FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access analytics_events" ON analytics_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access favorites" ON favorites FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access admin_users" ON admin_users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access settings" ON settings FOR ALL USING (auth.role() = 'service_role');

-- Public read access for settings
CREATE POLICY "Public read access for settings" ON settings FOR SELECT USING (true);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('store_name', 'Apple Cheaper'),
  ('store_description', 'Лучшие цены на технику Apple'),
  ('store_description_en', 'Best prices for Apple products'),
  ('default_currency', 'RUB'),
  ('min_order_amount', '0')
ON CONFLICT (key) DO NOTHING;

-- Insert sample categories
INSERT INTO categories (name, name_en, slug, order_index) VALUES
  ('Телефоны', 'Phones', 'phones', 1),
  ('Планшеты', 'Tablets', 'tablets', 2),
  ('Ноутбуки', 'Laptops', 'laptops', 3),
  ('Аксессуары', 'Accessories', 'accessories', 4)
ON CONFLICT (slug) DO NOTHING;
