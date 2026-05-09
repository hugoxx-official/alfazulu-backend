// Script de auditoría: Compara código vs database Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditDatabase() {
  console.log('=== AUDITORÍA SUPABASE ===\n');

  const results = {
    tables: [],
    columns: {},
    foreignKeys: [],
    policies: [],
    buckets: [],
    issues: []
  };

  // 1. Obtener todas las tablas
  console.log('📋 TABLAS EXISTENTES:');
  const { data: tables } = await supabase.rpc('get_tables');
  console.log(tables?.map(t => `  - ${t.table_name}`).join('\n') || '  Error obteniendo tablas');

  // 2. Obtener columnas de cada tabla
  const expectedTables = ['users', 'resources', 'maps', 'downloads', 'notifications', 'premium_plans', 'categories'];

  for (const table of expectedTables) {
    console.log(`\n📊 COLUMNAS EN ${table.toUpperCase()}:`);
    const { data: columns } = await supabase.rpc('get_table_columns', { table_name: table });

    if (columns) {
      results.columns[table] = columns;
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable ? 'NULL' : 'NOT NULL'}`);
      });
    } else {
      results.issues.push(`❌ Tabla '${table}' no existe o no se pudo leer`);
      console.log('  ❌ No existe o error al leer');
    }
  }

  // 3. Verificar tablas específicas que usa el código
  console.log('\n🔍 VERIFICACIÓN ESPECÍFICA:');

  // users - columnas esperadas
  console.log('\n  users (esperado: id, username, is_admin, password_hash, is_premium, premium_plan, subscription_end, favorites, created_at, updated_at):');
  const { data: usersData } = await supabase.from('users').select('*').limit(1);
  if (usersData && usersData.length > 0) {
    console.log('    Columnas reales:', Object.keys(usersData[0]).join(', '));
  }

  // resources - columnas esperadas
  console.log('\n  resources (esperado: id, name, title, category, description, file_url, file_size, mime_type, file_type, thumbnail_url, download_url, is_premium, downloads, created_at):');
  const { data: resourcesData } = await supabase.from('resources').select('*').limit(1);
  if (resourcesData && resourcesData.length > 0) {
    console.log('    Columnas reales:', Object.keys(resourcesData[0]).join(', '));
  }

  // maps - columnas esperadas
  console.log('\n  maps (esperado: id, name, description, file_url, thumbnail_url, map_type, file_type, file_size, region, scale, created_at):');
  const { data: mapsData } = await supabase.from('maps').select('*').limit(1);
  if (mapsData && mapsData.length > 0) {
    console.log('    Columnas reales:', Object.keys(mapsData[0]).join(', '));
  }

  // downloads - columnas esperadas
  console.log('\n  downloads (esperado: id, user_id, resource_id, downloaded_at):');
  const { data: downloadsData } = await supabase.from('downloads').select('*').limit(1);
  if (downloadsData && downloadsData.length > 0) {
    console.log('    Columnas reales:', Object.keys(downloadsData[0]).join(', '));
  }

  // notifications - columnas esperadas
  console.log('\n  notifications (esperado: id, user_id, title, message, type, is_read, created_at):');
  const { data: notificationsData } = await supabase.from('notifications').select('*').limit(1);
  if (notificationsData && notificationsData.length > 0) {
    console.log('    Columnas reales:', Object.keys(notificationsData[0]).join(', '));
  } else {
    console.log('    ❌ NO EXISTE');
  }

  // premium_plans - columnas esperadas
  console.log('\n  premium_plans (esperado: id, plan_name, display_name, price_monthly, price_lifetime, color, features, limitations, is_active, sort_order, created_at, updated_at):');
  const { data: plansData } = await supabase.from('premium_plans').select('*').limit(1);
  if (plansData && plansData.length > 0) {
    console.log('    Columnas reales:', Object.keys(plansData[0]).join(', '));
  } else {
    console.log('    ❌ NO EXISTE');
  }

  // 4. Storage buckets
  console.log('\n🗂️ STORAGE BUCKETS:');
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets) {
    buckets.forEach(b => {
      console.log(`  - ${b.name} (${b.public ? 'público' : 'privado'})`);
    });
  }

  // 5. RLS Policies
  console.log('\n🔒 RLS POLICIES:');
  const { data: policies } = await supabase.rpc('get_policies');
  if (policies) {
    policies.forEach(p => {
      console.log(`  - ${p.tablename}.${p.policyname} (${p.cmd})`);
    });
  }

  console.log('\n=== FIN AUDITORÍA ===');
  return results;
}

auditDatabase().catch(console.error);
