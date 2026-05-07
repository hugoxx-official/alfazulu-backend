-- Tabla de notificaciones
-- Ejecutar en: https://app.supabase.com/project/_/sql/editor

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'premium', 'upload', 'admin'
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para notificaciones no leídas por usuario
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Trigger para notificación automática cuando se sube un recurso
CREATE OR REPLACE FUNCTION notify_new_resource()
RETURNS TRIGGER AS $$
BEGIN
  -- Notificar a todos los usuarios sobre nuevo recurso
  INSERT INTO notifications (user_id, title, message, type)
  SELECT
    u.id,
    '📄 Nuevo Recurso Disponible',
    'Se ha añadido un nuevo recurso: ' || NEW.title || ' en la categoría ' || COALESCE(NEW.category, 'General'),
    'upload'
  FROM users u
  WHERE u.id != NEW.id; -- Excluir al creador si fuera un usuario

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para notificación cuando usuario se hace premium
CREATE OR REPLACE FUNCTION notify_premium_acquired()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_premium = true AND (OLD.is_premium = false OR OLD.is_premium IS NULL) THEN
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      NEW.id,
      '💎 ¡Ahora eres PREMIUM!',
      'Tu plan ' || COALESCE(NEW.premium_plan, 'Premium') || ' ha sido activado. Disfruta de todo el contenido exclusivo hasta ' || TO_CHAR(NEW.subscription_end, 'DD/MM/YYYY'),
      'premium'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para notificación cuando premium caduca
CREATE OR REPLACE FUNCTION notify_premium_expired()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.is_premium = true AND NEW.is_premium = false) OR
     (OLD.subscription_end IS NOT NULL AND NEW.subscription_end IS NOT NULL AND OLD.subscription_end > NEW.subscription_end) THEN
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      NEW.id,
      '⏰ Premium Caducado',
      'Tu suscripción premium ha finalizado. ¡Renueva para seguir accediendo a contenido exclusivo!',
      'premium'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers
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
