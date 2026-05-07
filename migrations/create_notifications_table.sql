-- ============================================
-- TABLA DE NOTIFICACIONES
-- Ejecutar en: https://app.supabase.com/project/_/sql/editor
-- ============================================

-- 1. Crear tabla
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

-- 3. Función para notificación de nuevo recurso
CREATE OR REPLACE FUNCTION notify_new_resource()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type)
  SELECT
    u.id,
    '📄 Nuevo Recurso Disponible',
    'Se ha añadido: ' || COALESCE(NEW.title, NEW.name) || ' (' || COALESCE(NEW.category, 'General') || ')',
    'upload'
  FROM users u;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Función para notificación premium adquirido
CREATE OR REPLACE FUNCTION notify_premium_acquired()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_premium = true AND (OLD.is_premium = false OR OLD.is_premium IS NULL) THEN
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      NEW.id,
      '💎 ¡Ahora eres PREMIUM!',
      'Plan: ' || COALESCE(NEW.premium_plan, 'Premium') || ' hasta ' || TO_CHAR(NEW.subscription_end, 'DD/MM/YYYY'),
      'premium'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Función para notificación premium caducado
CREATE OR REPLACE FUNCTION notify_premium_expired()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_premium = true AND NEW.is_premium = false THEN
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      NEW.id,
      '⏰ Premium Caducado',
      'Tu suscripción ha finalizado. ¡Renueva para acceder a contenido exclusivo!',
      'premium'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Crear triggers
DROP TRIGGER IF EXISTS trigger_notify_new_resource ON resources;
CREATE TRIGGER trigger_notify_new_resource
  AFTER INSERT ON resources
  FOR EACH ROW EXECUTE FUNCTION notify_new_resource();

DROP TRIGGER IF EXISTS trigger_notify_premium_acquired ON users;
CREATE TRIGGER trigger_notify_premium_acquired
  AFTER UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION notify_premium_acquired();

DROP TRIGGER IF EXISTS trigger_notify_premium_expired ON users;
CREATE TRIGGER trigger_notify_premium_expired
  AFTER UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION notify_premium_expired();
