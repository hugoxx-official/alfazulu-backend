-- ============================================================================
-- Schema de Supabase para AlfaZulu
-- Actualizado: 2026-05-09
-- Estado: COMPLETO - Alineado con el código actual
-- ============================================================================

-- ============================================================================
-- 1. TABLA DE USUARIOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  -- Admin y autenticación
  is_admin BOOLEAN DEFAULT false,
  password_hash TEXT,
  -- Premium
  is_premium BOOLEAN DEFAULT false,
  premium_plan TEXT,
  subscription_end TIMESTAMP WITH TIME ZONE,
  -- Favoritos (array de UUIDs de recursos)
  favorites UUID[] DEFAULT '{}',
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices users
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_premium ON users(is_premium);

-- ============================================================================
-- 2. TABLA DE RECURSOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Nombre del recurso (identificador interno)
  name TEXT NOT NULL,
  -- Título para mostrar en UI
  title TEXT,
  -- Categoría (ej: MAPAS, TCCC, TRANSMISIONES, MANUALES)
  category TEXT NOT NULL,
  -- Descripción
  description TEXT,
  -- Tipo de archivo (ej: PDF, JPG, KML, GPX)
  file_type TEXT DEFAULT 'PDF',
  -- URL de descarga (puede ser de Google Drive o Storage)
  file_url TEXT NOT NULL,
  -- Tamaño del archivo en bytes
  file_size BIGINT,
  -- MIME type
  mime_type TEXT,
  -- URL de thumbnail
  thumbnail_url TEXT,
  -- URL alternativa de descarga
  download_url TEXT,
  -- Premium flag
  is_premium BOOLEAN DEFAULT false,
  -- Contador de descargas
  downloads INTEGER DEFAULT 0,
  -- ID del archivo en Google Drive
  drive_file_id TEXT,
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices resources
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_created ON resources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_name ON resources(name);
CREATE INDEX IF NOT EXISTS idx_resources_premium ON resources(is_premium);
CREATE INDEX IF NOT EXISTS idx_resources_category_premium ON resources(category, is_premium);

-- ============================================================================
-- 3. TABLA DE MAPAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Nombre del mapa
  name TEXT NOT NULL,
  -- Descripción
  description TEXT,
  -- URL del archivo del mapa
  file_url TEXT NOT NULL,
  -- URL de thumbnail
  thumbnail_url TEXT,
  -- Tipo de mapa (ej: topografico, tactico, entrenamiento)
  map_type TEXT,
  -- Tipo de archivo (ej: KML, KMZ, GPX, PDF, GEOTIFF)
  file_type TEXT,
  -- Tamaño del archivo en bytes
  file_size BIGINT,
  -- Región geográfica (ej: España, Andalucía, Pirineos)
  region TEXT,
  -- Escala (ej: 1:25000, 1:50000)
  scale TEXT,
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices maps
CREATE INDEX IF NOT EXISTS idx_maps_created ON maps(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maps_region ON maps(region);

-- ============================================================================
-- 4. TABLA DE DESCARGAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Referencia al usuario (puede ser NULL para anónimos)
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Referencia al recurso
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  -- Fecha de descarga
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices downloads
CREATE INDEX IF NOT EXISTS idx_downloads_resource ON downloads(resource_id);
CREATE INDEX IF NOT EXISTS idx_downloads_user ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_date ON downloads(downloaded_at DESC);

-- ============================================================================
-- 5. TABLA DE NOTIFICACIONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Usuario destinatario
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  -- Título de la notificación
  title TEXT NOT NULL,
  -- Mensaje completo
  message TEXT NOT NULL,
  -- Tipo: 'premium', 'upload', 'admin', 'info'
  type TEXT NOT NULL DEFAULT 'info',
  -- Estado de lectura
  is_read BOOLEAN DEFAULT false,
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ============================================================================
-- 6. TABLA DE PLANES PREMIUM
-- ============================================================================

CREATE TABLE IF NOT EXISTS premium_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Nombre interno del plan (ej: basic, premium, premium_plus)
  plan_name TEXT UNIQUE NOT NULL,
  -- Nombre para mostrar en UI
  display_name TEXT NOT NULL,
  -- Precio mensual (ej: '5', '10', '15')
  price_monthly TEXT DEFAULT '0',
  -- Precio vitalicio (pago único)
  price_lifetime TEXT DEFAULT '0',
  -- Color hexadecimal para UI (ej: #FF003C)
  color TEXT DEFAULT '#FF003C',
  -- Lista de ventajas/características (JSONB)
  features JSONB DEFAULT '[]'::jsonb,
  -- Lista de limitaciones (JSONB)
  limitations JSONB DEFAULT '[]'::jsonb,
  -- Si el plan está activo y visible
  is_active BOOLEAN DEFAULT true,
  -- Orden de visualización (menor = primero)
  sort_order INTEGER DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices premium_plans
CREATE INDEX IF NOT EXISTS idx_premium_plans_active ON premium_plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_premium_plans_sort ON premium_plans(sort_order);

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_plans ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. POLÍTICAS RLS
-- ============================================================================

-- USERS
DROP POLICY IF EXISTS "Public read access" ON users;
CREATE POLICY "Public read access"
  ON users FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated insert" ON users;
CREATE POLICY "Authenticated insert"
  ON users FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "User update own" ON users;
CREATE POLICY "User update own"
  ON users FOR UPDATE
  USING (true);

-- RESOURCES
DROP POLICY IF EXISTS "Public read access" ON resources;
CREATE POLICY "Public read access"
  ON resources FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin manage resources" ON resources;
CREATE POLICY "Admin manage resources"
  ON resources FOR ALL
  USING (true);

-- MAPS
DROP POLICY IF EXISTS "Public read access" ON maps;
CREATE POLICY "Public read access"
  ON maps FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin manage maps" ON maps;
CREATE POLICY "Admin manage maps"
  ON maps FOR ALL
  USING (true);

-- DOWNLOADS
DROP POLICY IF EXISTS "Public read access" ON downloads;
CREATE POLICY "Public read access"
  ON downloads FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public insert" ON downloads;
CREATE POLICY "Public insert"
  ON downloads FOR INSERT
  WITH CHECK (true);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Public read access" ON notifications;
CREATE POLICY "Public read access"
  ON notifications FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "System insert" ON notifications;
CREATE POLICY "System insert"
  ON notifications FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "User update own" ON notifications;
CREATE POLICY "User update own"
  ON notifications FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "User delete own" ON notifications;
CREATE POLICY "User delete own"
  ON notifications FOR DELETE
  USING (true);

-- PREMIUM_PLANS
DROP POLICY IF EXISTS "Public read active" ON premium_plans;
CREATE POLICY "Public read active"
  ON premium_plans FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admin manage plans" ON premium_plans;
CREATE POLICY "Admin manage plans"
  ON premium_plans FOR ALL
  USING (true);

-- ============================================================================
-- 9. TRIGGER PARA updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger a premium_plans
DROP TRIGGER IF EXISTS update_premium_plans_updated_at ON premium_plans;
CREATE TRIGGER update_premium_plans_updated_at
  BEFORE UPDATE ON premium_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. DATOS INICIALES (SEED)
-- ============================================================================

-- Planes premium por defecto (solo si está vacía)
INSERT INTO premium_plans (plan_name, display_name, price_monthly, price_lifetime, color, features, limitations, sort_order)
SELECT 'basic', 'BASIC', '5', '50', '#4A90D9',
       '["Acceso a recursos básicos", "Descargas limitadas (5/día)", "Sin publicidad"]'::jsonb,
       '["Sin acceso a mapas premium", "Sin notificaciones prioritarias", "Soporte básico"]'::jsonb,
       1
WHERE NOT EXISTS (SELECT 1 FROM premium_plans WHERE plan_name = 'basic');

INSERT INTO premium_plans (plan_name, display_name, price_monthly, price_lifetime, color, features, limitations, sort_order)
SELECT 'premium', 'PREMIUM', '10', '100', '#FFD700',
       '["Acceso a todos los recursos", "Descargas ilimitadas", "Mapas premium", "Soporte prioritario"]'::jsonb,
       '["Sin acceso anticipado a contenido TGCF"]'::jsonb,
       2
WHERE NOT EXISTS (SELECT 1 FROM premium_plans WHERE plan_name = 'premium');

INSERT INTO premium_plans (plan_name, display_name, price_monthly, price_lifetime, color, features, limitations, sort_order)
SELECT 'premium_plus', 'PREMIUM+', '15', '150', '#FF003C',
       '["Todo lo de Premium", "Acceso anticipado a contenido TGCF", "Contenido exclusivo", "Notificaciones instantáneas", "Soporte VIP 24/7"]'::jsonb,
       '[]'::jsonb,
       3
WHERE NOT EXISTS (SELECT 1 FROM premium_plans WHERE plan_name = 'premium_plus');

-- ============================================================================
-- 11. STORAGE BUCKETS (NOTAS)
-- ============================================================================

-- El bucket 'maps' debe crearse manualmente desde Supabase Dashboard:
-- 1. Ir a Storage > Create bucket
-- 2. Nombre: 'maps'
-- 3. Público: SÍ
-- 4. Tamaño máximo: 50MB
-- 5. Allowed MIME types: application/vnd.google-earth.kml+xml, application/vnd.google-earth.kmz, application/gpx+xml, application/pdf, image/jpeg, image/png, image/tiff, application/x-geotiff

-- O vía API:
-- curl -X POST 'https://<project>.supabase.co/storage/v1/bucket' \
--   -H 'Authorization: Bearer <service_key>' \
--   -H 'Content-Type: application/json' \
--   -d '{"id":"maps","name":"maps","public":true,"fileSizeLimit":52428800,"allowedMimeTypes":["application/vnd.google-earth.kml+xml","application/vnd.google-earth.kmz","application/gpx+xml","application/pdf","image/jpeg","image/png","image/tiff","application/x-geotiff"]}'

-- ============================================================================
-- FIN DEL SCHEMA
-- ============================================================================
