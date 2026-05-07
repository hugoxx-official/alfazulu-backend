-- ============================================
-- ALFAZULU - ESQUEMA COMPLETO DE BASE DE DATOS
-- Ejecutar en: https://app.supabase.com/project/_/sql/editor
-- ============================================

-- 1. Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  password TEXT,
  is_admin BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  premium_plan TEXT,
  subscription_end TIMESTAMPTZ,
  favorites UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de recursos
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  file_type TEXT,
  file_size INTEGER,
  download_url TEXT,
  file_path TEXT,
  views INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de mapas
CREATE TABLE IF NOT EXISTS maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  map_type TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  thumbnail_url TEXT,
  bounds JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de descargas (tracking)
CREATE TABLE IF NOT EXISTS downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  resource_id UUID REFERENCES resources(id),
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- 5. Tabla de estadísticas
CREATE TABLE IF NOT EXISTS stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_name ON resources(name);
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_resource_id ON downloads(resource_id);
CREATE INDEX IF NOT EXISTS idx_downloads_downloaded_at ON downloads(downloaded_at);

-- Insertar estadísticas iniciales
INSERT INTO stats (metric_name, metric_value) VALUES
  ('total_users', 0),
  ('total_resources', 0),
  ('total_downloads', 0),
  ('total_maps', 0)
ON CONFLICT DO NOTHING;

-- ============================================
-- USUARIO ADMIN POR DEFECTO
-- ============================================
-- Ejecutar después el script create-admin.js para crear el admin con password hasheado
-- O usar este INSERT directo (password: admin123):

-- INSERT INTO users (username, password_hash, is_admin, is_premium)
-- VALUES (
--   'admin',
--   '$2b$10$7mVNg71BGNuTei62Ak49Oe2EKtVaZpRzGA5OcnzYeXaU32so1/CZW',
--   true,
--   true
-- );
