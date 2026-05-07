import express from 'express';

const router = express.Router();

// GET /api/maps - Listar mapas
router.get('/', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('maps')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ maps: data || [] });
  } catch (error) {
    req.logger.error('Error listing maps:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/maps - Crear mapa
router.post('/', async (req, res) => {
  try {
    const { name, description, file_url, thumbnail_url } = req.body;

    const { data, error } = await req.supabase
      .from('maps')
      .insert([{ name, description, file_url, thumbnail_url }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ map: data });
  } catch (error) {
    req.logger.error('Error creating map:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/maps/:id - Eliminar mapa
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await req.supabase
      .from('maps')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Error deleting map:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
