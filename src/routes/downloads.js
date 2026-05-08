import express from 'express';

const router = express.Router();

// POST /api/downloads - Registrar descarga
router.post('/', async (req, res) => {
  try {
    const { user_id, resource_id } = req.body;

    if (!resource_id) {
      return res.status(400).json({ error: 'Resource ID required' });
    }

    // Registrar descarga
    await req.supabase
      .from('downloads')
      .insert([{
        user_id: user_id || 'anonymous',
        resource_id
      }]);

    // Obtener info del recurso para devolver URL
    const { data: resource } = await req.supabase
      .from('resources')
      .select('file_url, file_name')
      .eq('id', resource_id)
      .single();

    res.json({
      download_url: resource?.file_url || '',
      file_name: resource?.file_name || 'download'
    });
  } catch (error) {
    req.logger.error('Error registering download:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/downloads - Listar descargas
router.get('/', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('downloads')
      .select('*, users(username), resources(name)')
      .order('downloaded_at', { ascending: false });

    if (error) throw error;
    res.json({ downloads: data || [] });
  } catch (error) {
    req.logger.error('Error listing downloads:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/downloads/:user_id - Listar descargas de un usuario
router.get('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data, error } = await req.supabase
      .from('downloads')
      .select('*, resources(name, category, file_type)')
      .eq('user_id', user_id)
      .order('downloaded_at', { ascending: false });

    if (error) throw error;
    res.json({ downloads: data || [] });
  } catch (error) {
    req.logger.error('Error getting user downloads:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
