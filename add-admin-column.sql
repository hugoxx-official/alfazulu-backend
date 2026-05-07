-- Ejecutar en: https://app.supabase.com/project/_/sql/editor

-- Añadir columna is_admin si no existe
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Añadir columna password_hash si no existe
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
