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

// PATCH /api/users/:id/premium - Actualizar estado premium
router.patch('/:id/premium', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_premium, premium_plan, subscription_end } = req.body;

    const updateData = {
      is_premium: is_premium ?? false,
      premium_plan: premium_plan ?? null,
      subscription_end: subscription_end ?? null,
    };

    const { data, error } = await req.supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log a Telegram
    const bot = req.app.get('telegramBot');
    if (bot && is_premium === true) {
      const subEnd = subscription_end ? new Date(subscription_end).toLocaleDateString() : 'N/A';
      await bot.sendMessage(
        process.env.TELEGRAM_CHAT_ID,
        `⭐ *USUARIO PREMIUM*\n👤 ID: ${id}\n📦 Plan: ${premium_plan || 'N/A'}\n📅 Hasta: ${subEnd}\n\n✅ Asignado por admin`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});
    }

    res.json({ user: data });
  } catch (error) {
    req.logger.error('Error updating premium status:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/:id - Obtener usuario por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await req.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: data });
  } catch (error) {
    req.logger.error('Error getting user:', error);
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

// POST /api/users/register-device - Registrar device token para push notifications
router.post('/register-device', async (req, res) => {
  try {
    const { user_id, device_token, platform = 'android' } = req.body;

    if (!user_id || !device_token) {
      return res.status(400).json({ error: 'user_id and device_token required' });
    }

    // Check if token already exists
    const { data: existing } = await req.supabase
      .from('user_devices')
      .select('id')
      .eq('user_id', user_id)
      .eq('device_token', device_token)
      .single();

    if (existing) {
      // Update last_seen
      await req.supabase
        .from('user_devices')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', existing.id);
      return res.json({ success: true, message: 'Token updated' });
    }

    // Insert new device token
    const { data, error } = await req.supabase
      .from('user_devices')
      .insert([{
        user_id,
        device_token,
        platform,
        created_at: new Date().toISOString(),
        last_seen: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    req.logger.info(`Device token registered for user ${user_id}`);
    res.json({ success: true, device: data });
  } catch (error) {
    req.logger.error('Error registering device:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
