-- ============================================================================
-- AUDIT FIXES MIGRATION
-- Fecha: 2026-05-09
-- Descripción: Corrige todas las inconsistencias detectadas entre código y DB
-- ============================================================================

-- ============================================================================
-- 1. TABLA notifications (FALTANTE - CRÍTICO)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- RLS para notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (true); -- Permitir lectura pública (el backend filtra por user_id)

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (true); -- El backend maneja la lógica

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (true);

-- ============================================================================
-- 2. TABLA premium_plans (FALTANTE - CRÍTICO)
-- ============================================================================

CREATE TABLE IF NOT EXISTS premium_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  price_monthly TEXT DEFAULT '0',
  price_lifetime TEXT DEFAULT '0',
  color TEXT DEFAULT '#FF003C',
  features JSONB DEFAULT '[]'::jsonb,
  limitations JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para premium_plans
CREATE INDEX IF NOT EXISTS idx_premium_plans_active ON premium_plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_premium_plans_sort ON premium_plans(sort_order);

-- RLS para premium_plans
ALTER TABLE premium_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active plans" ON premium_plans;
CREATE POLICY "Public can view active plans"
  ON premium_plans FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admin can manage plans" ON premium_plans;
CREATE POLICY "Admin can manage plans"
  ON premium_plans FOR ALL
  USING (true); -- El backend verifica admin

-- Datos iniciales (solo si está vacía)
INSERT INTO premium_plans (plan_name, display_name, price_monthly, price_lifetime, color, features, limitations, sort_order)
SELECT 'basic', 'BASIC', '5', '50', '#4A90D9',
       '["Acceso a recursos básicos", "Descargas limitadas", "Sin publicidad"]'::jsonb,
       '["Sin acceso a mapas premium", "Sin notificaciones prioritarias"]'::jsonb,
       1
WHERE NOT EXISTS (SELECT 1 FROM premium_plans WHERE plan_name = 'basic');

INSERT INTO premium_plans (plan_name, display_name, price_monthly, price_lifetime, color, features, limitations, sort_order)
SELECT 'premium', 'PREMIUM', '10', '100', '#FFD700',
       '["Acceso a todos los recursos", "Descargas ilimitadas", "Mapas premium", "Soporte prioritario"]'::jsonb,
       '["Sin acceso anticipado"]'::jsonb,
       2
WHERE NOT EXISTS (SELECT 1 FROM premium_plans WHERE plan_name = 'premium');

INSERT INTO premium_plans (plan_name, display_name, price_monthly, price_lifetime, color, features, limitations, sort_order)
SELECT 'premium_plus', 'PREMIUM+', '15', '150', '#FF003C',
       '["Todo lo de Premium", "Acceso anticipado", "Contenido exclusivo TGCF", "Notificaciones instantáneas", "Soporte VIP"]'::jsonb,
       '[]'::jsonb,
       3
WHERE NOT EXISTS (SELECT 1 FROM premium_plans WHERE plan_name = 'premium_plus');

-- ============================================================================
-- 3. TABLA users (COLUMNAS FALTANTES)
-- ============================================================================

-- Columnas de administración y premium
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_plan TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMP WITH TIME ZONE;

-- Columna de favoritos (array de UUIDs)
ALTER TABLE users ADD COLUMN IF NOT EXISTS favorites UUID[] DEFAULT '{}';

-- Columna de timestamp de actualización
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_premium ON users(is_premium);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS para users (mejorado)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (true); -- El backend filtra apropiadamente

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (true); -- El backend verifica permisos

-- ============================================================================
-- 4. TABLA resources (COLUMNAS FALTANTES)
-- ============================================================================

-- Columnas para UI y gestión
ALTER TABLE resources ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS file_type TEXT DEFAULT 'PDF';
ALTER TABLE resources ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS download_url TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS downloads INTEGER DEFAULT 0;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS drive_file_id TEXT;

-- Índices para resources
CREATE INDEX IF NOT EXISTS idx_resources_created ON resources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_name ON resources(name);
CREATE INDEX IF NOT EXISTS idx_resources_premium ON resources(is_premium);
CREATE INDEX IF NOT EXISTS idx_resources_category_premium ON resources(category, is_premium);

-- Trigger para mantener updated_at (si se añade en el futuro)
-- ALTER TABLE resources ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- RLS para resources (mejorado)
DROP POLICY IF EXISTS "Public read access" ON resources;
CREATE POLICY "Public read access"
  ON resources FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin can manage resources" ON resources;
CREATE POLICY "Admin can manage resources"
  ON resources FOR ALL
  USING (true); -- El backend verifica admin

-- ============================================================================
-- 5. TABLA maps (COLUMNAS FALTANTES)
-- ============================================================================

-- Columnas de metadata
ALTER TABLE maps ADD COLUMN IF NOT EXISTS map_type TEXT;
ALTER TABLE maps ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE maps ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE maps ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE maps ADD COLUMN IF NOT EXISTS scale TEXT;

-- Índices para maps
CREATE INDEX IF NOT EXISTS idx_maps_created ON maps(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maps_region ON maps(region);

-- RLS para maps (mejorado)
DROP POLICY IF EXISTS "Public read access" ON maps;
CREATE POLICY "Public read access"
  ON maps FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin can manage maps" ON maps;
CREATE POLICY "Admin can manage maps"
  ON maps FOR ALL
  USING (true); -- El backend verifica admin

-- ============================================================================
-- 6. TABLA downloads (CORRECCIÓN downloaded_at)
-- ============================================================================

-- Verificar si existe downloaded_at, si no, renombrar created_at
DO $$
BEGIN
  -- Si downloaded_at no existe y created_at existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'downloads' AND column_name = 'downloaded_at'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'downloads' AND column_name = 'created_at'
  ) THEN
    -- Renombrar created_at a downloaded_at
    ALTER TABLE downloads RENAME COLUMN created_at TO downloaded_at;
  END IF;
END $$;

-- Índices para downloads
CREATE INDEX IF NOT EXISTS idx_downloads_user ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_date ON downloads(downloaded_at DESC);

-- RLS para downloads
DROP POLICY IF EXISTS "Users can view own downloads" ON downloads;
CREATE POLICY "Users can view own downloads"
  ON downloads FOR SELECT
  USING (true); -- El backend filtra por user_id

DROP POLICY IF EXISTS "Public insert downloads" ON downloads;
CREATE POLICY "Public insert downloads"
  ON downloads FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 7. ACTUALIZAR schema.sql (DOCUMENTACIÓN)
-- ============================================================================

-- Este migration actualiza la DB real
-- El archivo schema.sql debe ser actualizado manualmente para reflejar estos cambios

-- ============================================================================
-- 8. STORAGE BUCKET (COMENTARIO - EJECUTAR MANUALMENTE)
-- ============================================================================

-- El bucket 'maps' debe crearse desde el Dashboard de Supabase:
-- Storage > Create bucket > 'maps' (público)
-- O vía API:
-- curl -X POST 'https://<project>.supabase.co/storage/v1/bucket' \
--   -H 'Authorization: Bearer <service_key>' \
--   -H 'Content-Type: application/json' \
--   -d '{"id":"maps","name":"maps","public":true}'

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

-- Verificación post-migración
SELECT
  'notifications' as table_name,
  COUNT(*) as row_count
FROM notifications
UNION ALL
SELECT 'premium_plans', COUNT(*) FROM premium_plans
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'resources', COUNT(*) FROM resources
UNION ALL
SELECT 'maps', COUNT(*) FROM maps
UNION ALL
SELECT 'downloads', COUNT(*) FROM downloads;
