-- Tabla premium_plans para configurar ventajas y limitaciones
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS premium_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT UNIQUE NOT NULL, -- 'free', 'premium', 'premium_plus'
  display_name TEXT NOT NULL, -- 'Free', 'Premium', 'Premium+'
  price_monthly TEXT, -- 'Gratis', '4.99', '9.99'
  price_lifetime TEXT, -- '0', '49.99', '99.99'
  color TEXT, -- '#666666', '#FFD700', '#FF6B6B'
  features JSONB DEFAULT '[]', -- Ventajas: ["Descargas ilimitadas", "Sin anuncios"]
  limitations JSONB DEFAULT '[]', -- Limitaciones: ["Max 3 descargas/día", "Calidad estándar"]
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar planes por defecto
INSERT INTO premium_plans (plan_name, display_name, price_monthly, price_lifetime, color, features, limitations, sort_order) VALUES
  ('free', 'Free', '0', '0', '#666666',
   '["Acceso básico", "Recursos gratuitos", "Mapas interactivos"]',
   '["Máximo 3 descargas/día", "Calidad estándar", "Con anuncios", "Sin soporte prioritario"]',
   1),
  ('premium', 'Premium', '4.99', '49.99', '#FFD700',
   '["Descargas ilimitadas", "Alta calidad", "Sin anuncios", "Soporte prioritario", "Recursos exclusivos"]',
   '["1 usuario", "Sin acceso a API"]',
   2),
  ('premium_plus', 'Premium+', '9.99', '99.99', '#FF6B6B',
   '["Todo lo de Premium", "Acceso a API", "Múltiples usuarios", "Contenido exclusivo Premium+", "Descargas offline", "Soporte 24/7"]',
   '["Máximo 5 usuarios"]',
   3)
ON CONFLICT (plan_name) DO NOTHING;
