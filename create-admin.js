// Script para crear usuario admin en Supabase
// Ejecutar: node create-admin.js

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function createAdmin() {
  const username = 'admin';
  const password = 'admin123'; // Cambia esto por tu password seguro

  try {
    // Generar hash
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('Password hash generado:', passwordHash);

    // Verificar si existe
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (existing) {
      console.log('Usuario admin ya existe, actualizando...');
      const { data, error } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          is_admin: true,
          is_premium: true
        })
        .eq('username', username)
        .select();

      if (error) throw error;
      console.log('Admin actualizado:', data);
    } else {
      console.log('Creando usuario admin...');
      const { data, error } = await supabase
        .from('users')
        .insert([{
          username,
          password_hash: passwordHash,
          is_admin: true,
          is_premium: true
        }])
        .select();

      if (error) throw error;
      console.log('Admin creado:', data);
    }

    console.log('\n=== CREDENCIALES ADMIN ===');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('=========================\n');
    console.log('Cambia la password en producción!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createAdmin();
