-- Añadir campo is_premium a la tabla resources
-- Ejecutar en: https://app.supabase.com/project/_/sql/editor

ALTER TABLE resources
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_resources_is_premium ON resources(is_premium);

-- Comentario: los recursos marcados como is_premium=true solo serán descargables por usuarios premium
