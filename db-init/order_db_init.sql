-- order_db_init.sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Orders and items
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  full_name VARCHAR(200),
  phone VARCHAR(50),
  address_line TEXT,
  city VARCHAR(100),
  district VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TYPE order_status AS ENUM ('ordering','processing','delivering','done','cancelled','failed');

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  restaurant_id UUID,
  address_id UUID REFERENCES addresses(id),
  total_amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(8) DEFAULT 'USD',
  status order_status DEFAULT 'ordering',
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID,
  name VARCHAR(255),
  unit_price NUMERIC(12,2),
  quantity INTEGER DEFAULT 1,
  total_price NUMERIC(12,2)
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status order_status,
  changed_by VARCHAR(100),
  note TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) UNIQUE,
  courier_name VARCHAR(200),
  courier_phone VARCHAR(50),
  started_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders (restaurant_id);
