import express from 'express';

const router = express.Router();

// GET /api/admin/stats - Estadísticas generales
router.get('/stats', async (req, res) => {
  try {
    const { count: usersCount } = await req.supabase.from('users').count();
    const { count: resourcesCount } = await req.supabase.from('resources').count();
    const { count: downloadsCount } = await req.supabase.from('downloads').count();
    const { count: mapsCount } = await req.supabase.from('maps').count();

    res.json({
      stats: {
        users: usersCount || 0,
        resources: resourcesCount || 0,
        downloads: downloadsCount || 0,
        maps: mapsCount || 0
      }
    });
  } catch (error) {
    req.logger.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/categories - Listar categorías
router.get('/categories', async (req, res) => {
  try {
    const { data } = await req.supabase
      .from('resources')
      .select('category');

    const categories = [...new Set(data?.map(r => r.category))].filter(Boolean);
    res.json({ categories });
  } catch (error) {
    req.logger.error('Error getting categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/sync/force - Forzar sync de Drive
router.post('/sync/force', async (req, res) => {
  try {
    const forceSync = req.app.get('forceDriveSync');
    if (forceSync) {
      await forceSync();
      res.json({ success: true, message: 'Sync completed' });
    } else {
      res.status(500).json({ error: 'Sync function not available' });
    }
  } catch (error) {
    req.logger.error('Error forcing sync:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/notify - Enviar notificación
router.post('/notify', async (req, res) => {
  try {
    const { message } = req.body;
    const bot = req.app.get('telegramBot');

    if (bot) {
      const chatId = process.env.TELEGRAM_CHAT_ID;
      await bot.sendMessage(chatId, message);
      res.json({ success: true, message: 'Notification sent' });
    } else {
      res.status(500).json({ error: 'Bot not initialized' });
    }
  } catch (error) {
    req.logger.error('Error sending notification:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
