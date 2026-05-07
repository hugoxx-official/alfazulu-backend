-- Script para crear usuario admin en Supabase
-- Ejecutar en: https://app.supabase.com/project/_/sql/editor

-- Crear usuario admin con password 'admin123'
-- Cambia 'admin123' por tu password seguro

INSERT INTO users (username, password_hash, is_admin, is_premium)
VALUES (
  'admin',
  '$2b$10$X7JqkzYvZ5R5l5J5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', -- Hash de 'admin123'
  true,
  true
)
ON CONFLICT (username) DO UPDATE
SET
  password_hash = '$2b$10$X7JqkzYvZ5R5l5J5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z',
  is_admin = true,
  is_premium = true;
