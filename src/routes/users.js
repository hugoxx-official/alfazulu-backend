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
