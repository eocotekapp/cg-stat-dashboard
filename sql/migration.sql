CREATE TABLE IF NOT EXISTS order_items_snapshot (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT,
  order_code TEXT,
  menu_id TEXT,
  item_name TEXT NOT NULL,
  category TEXT,
  table_id TEXT,
  order_type TEXT,
  quantity NUMERIC DEFAULT 1,
  price_at_sale NUMERIC DEFAULT 0,
  original_price_at_sale NUMERIC DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  sold_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_snapshot_sold_at ON order_items_snapshot(sold_at);
CREATE INDEX IF NOT EXISTS idx_order_items_snapshot_item_name ON order_items_snapshot(item_name);
CREATE INDEX IF NOT EXISTS idx_order_items_snapshot_table_id ON order_items_snapshot(table_id);

CREATE TABLE IF NOT EXISTS daily_reports (
  report_date DATE PRIMARY KEY,
  revenue NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  items_count NUMERIC DEFAULT 0,
  avg_order_value NUMERIC DEFAULT 0,
  json_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monthly_reports (
  report_month TEXT PRIMARY KEY,
  revenue NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  items_count NUMERIC DEFAULT 0,
  avg_order_value NUMERIC DEFAULT 0,
  json_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGSERIAL PRIMARY KEY,
  inventory_id TEXT,
  item_name TEXT NOT NULL,
  movement_type TEXT NOT NULL,
  quantity NUMERIC DEFAULT 0,
  unit TEXT,
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  note TEXT,
  moved_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_cache (
  cache_key TEXT PRIMARY KEY,
  json_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS yearly_exports (
  id BIGSERIAL PRIMARY KEY,
  export_year INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT DEFAULT 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  file_base64 TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_yearly_exports_year ON yearly_exports(export_year);
CREATE INDEX IF NOT EXISTS idx_yearly_exports_expires_at ON yearly_exports(expires_at);
