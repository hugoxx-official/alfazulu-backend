import express from 'express';

const router = express.Router();

// POST /api/users - Crear/actualizar usuario
router.post('/', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    // Verificar si existe
    let { data: existing } = await req.supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (existing) {
      return res.json({ user: existing });
    }

    // Crear nuevo usuario
    const { data, error } = await req.supabase
      .from('users')
      .insert([{ username }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ user: data });
  } catch (error) {
    req.logger.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users - Listar usuarios
router.get('/', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ users: data || [] });
  } catch (error) {
    req.logger.error('Error listing users:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
