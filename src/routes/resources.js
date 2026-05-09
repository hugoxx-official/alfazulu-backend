import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar multer para uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// GET /api/resources - Listar recursos
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = req.supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (category && category !== 'Todos') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json({ resources: data || [] });
  } catch (error) {
    req.logger.error('Error listing resources:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/resources - Crear recurso
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { name, category, description } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'File required' });
    }

    const fileUrl = `/uploads/${file.filename}`;

    const { data, error } = await req.supabase
      .from('resources')
      .insert([{
        name,
        category,
        description,
        file_url: fileUrl,
        file_size: file.size,
        mime_type: file.mimetype
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ resource: data });
  } catch (error) {
    req.logger.error('Error creating resource:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/resources/:id - Obtener recurso por ID
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('resources')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json({ resource: data });
  } catch (error) {
    req.logger.error('Error getting resource:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/resources/:id - Eliminar recurso
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await req.supabase
      .from('resources')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Error deleting resource:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/resources/:id/favorite - Toggle favorito (por usuario)
router.post('/:id/favorite', async (req, res) => {
  try {
    const { id: resourceId } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id required' });
    }

    // Obtener usuario actual
    const { data: user, error: userError } = await req.supabase
      .from('users')
      .select('favorites')
      .eq('id', user_id)
      .single();

    if (userError) throw userError;

    let favorites = user?.favorites || [];
    const isFavorite = favorites.includes(resourceId);

    // Añadir o quitar de favoritos
    if (isFavorite) {
      favorites = favorites.filter(f => f !== resourceId);
    } else {
      favorites.push(resourceId);
    }

    // Actualizar usuario
    const { data: updatedUser, error: updateError } = await req.supabase
      .from('users')
      .update({ favorites })
      .eq('id', user_id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      is_favorite: !isFavorite,
      favorites: updatedUser.favorites
    });
  } catch (error) {
    req.logger.error('Error toggling favorite:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/resources/favorites/:user_id - Obtener favoritos de un usuario
router.get('/favorites/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data: user, error } = await req.supabase
      .from('users')
      .select('favorites')
      .eq('id', user_id)
      .single();

    if (error) throw error;

    const favoriteIds = user?.favorites || [];

    if (favoriteIds.length === 0) {
      return res.json({ resources: [] });
    }

    const { data: resources, error: resourcesError } = await req.supabase
      .from('resources')
      .select('*')
      .in('id', favoriteIds);

    if (resourcesError) throw resourcesError;

    res.json({ resources: resources || [] });
  } catch (error) {
    req.logger.error('Error getting favorites:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
