import express from 'express';

const router = express.Router();

// GET /api/notifications - Obtener notificaciones del usuario
router.get('/', async (req, res) => {
  try {
    const { user_id, limit = 50, unread_only = false } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id required' });
    }

    let query = req.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user_id);

    if (unread_only === 'true') {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({ notifications: data || [] });
  } catch (error) {
    req.logger.error('Error getting notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/notifications/:id/read - Marcar notificación como leída
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await req.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ notification: data });
  } catch (error) {
    req.logger.error('Error marking notification as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/notifications/read-all - Marcar todas como leídas
router.put('/read-all', async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id required' });
    }

    const { data, error } = await req.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user_id);

    if (error) throw error;

    res.json({ success: true, updated: data?.length || 0 });
  } catch (error) {
    req.logger.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/notifications/:id - Eliminar notificación
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await req.supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    req.logger.error('Error deleting notification:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
