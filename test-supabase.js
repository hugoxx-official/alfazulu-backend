import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function test() {
  console.log('Probando Supabase...');

  // Test 1: SELECT
  console.log('\n1. Probando SELECT en users...');
  const { data: users, error: selectError } = await supabase.from('users').select('*');
  if (selectError) {
    console.error('Error SELECT:', selectError.message);
  } else {
    console.log('SELECT OK:', users.length, 'usuarios encontrados');
  }

  // Test 2: INSERT
  console.log('\n2. Probando INSERT en users...');
  const testUser = { username: `test_${Date.now()}` };
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert([testUser])
    .select()
    .single();

  if (insertError) {
    console.error('Error INSERT:', insertError.message);
    console.error('Details:', insertError.details);
    console.error('Hint:', insertError.hint);
  } else {
    console.log('INSERT OK:', newUser);
  }

  // Test 3: UPDATE
  if (newUser) {
    console.log('\n3. Probando UPDATE en users...');
    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update({ username: 'updated_test' })
      .eq('id', newUser.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error UPDATE:', updateError.message);
    } else {
      console.log('UPDATE OK:', updated);
    }
  }

  // Test 4: Verificar RLS
  console.log('\n4. Verificando políticas RLS...');
  const { data: policies } = await supabase
    .from('pg_policies')
    .select('policyname, tablename, cmd, roles')
    .eq('tablename', 'users');

  if (policies) {
    console.log('Políticas encontradas:', policies.length);
    policies.forEach(p => {
      console.log(`  - ${p.policyname}: ${p.cmd} for ${p.roles?.join(',')}`);
    });
  }
}

test();
