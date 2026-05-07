-- Deshabilitar RLS para tablas que necesitan acceso público
-- Ejecutar en Supabase SQL Editor: https://tngdnwrqcxmucjshkcuh.supabase.co/project/_/sql

-- Tabla users - permitir todo acceso público
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Tabla resources - permitir lectura pública, escritura desde backend
ALTER TABLE resources DISABLE ROW LEVEL SECURITY;

-- Tabla maps - permitir lectura pública, escritura desde backend
ALTER TABLE maps DISABLE ROW LEVEL SECURITY;

-- Tabla downloads - permitir escritura pública
ALTER TABLE downloads DISABLE ROW LEVEL SECURITY;

-- Verificar estado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'resources', 'maps', 'downloads');
