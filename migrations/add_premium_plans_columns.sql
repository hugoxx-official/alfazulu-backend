-- Agregar columnas faltantes a premium_plans
ALTER TABLE premium_plans ADD COLUMN IF NOT EXISTS price_monthly TEXT DEFAULT '0';
ALTER TABLE premium_plans ADD COLUMN IF NOT EXISTS price_lifetime TEXT DEFAULT '0';
ALTER TABLE premium_plans ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#FF003C';
ALTER TABLE premium_plans ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;
ALTER TABLE premium_plans ADD COLUMN IF NOT EXISTS limitations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE premium_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE premium_plans ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE premium_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Índices
CREATE INDEX IF NOT EXISTS idx_premium_plans_active ON premium_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_premium_plans_sort ON premium_plans(sort_order);
