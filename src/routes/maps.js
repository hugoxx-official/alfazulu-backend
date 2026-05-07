import express from 'express';
import multer from 'multer';

const router = express.Router();

// Configurar multer para uploads en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.kml', '.kmz', '.gpx', '.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.geotiff', '.shp', '.geojson', '.mbtiles', '.gpkg'];
    const ext = file.originalname.toLowerCase().match(/\.[a-z]+$/);
    if (ext && allowedTypes.includes(ext[0])) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

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
    const { name, description, file_url, thumbnail_url, map_type, file_type, file_size, region, scale } = req.body;

    const { data, error } = await req.supabase
      .from('maps')
      .insert([{
        name,
        description,
        file_url,
        thumbnail_url,
        map_type,
        file_type,
        file_size,
        region,
        scale
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ map: data });
  } catch (error) {
    req.logger.error('Error creating map:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/maps/:id - Actualizar mapa
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, file_url, thumbnail_url, map_type, file_type, file_size, region, scale } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (file_url !== undefined) updateData.file_url = file_url;
    if (thumbnail_url !== undefined) updateData.thumbnail_url = thumbnail_url;
    if (map_type !== undefined) updateData.map_type = map_type;
    if (file_type !== undefined) updateData.file_type = file_type;
    if (file_size !== undefined) updateData.file_size = file_size;
    if (region !== undefined) updateData.region = region;
    if (scale !== undefined) updateData.scale = scale;

    const { data, error } = await req.supabase
      .from('maps')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ map: data });
  } catch (error) {
    req.logger.error('Error updating map:', error);
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

// POST /api/admin/maps/upload - Subir mapa con archivo (admin)
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { name, description, scale, region, file_type, file_size } = req.body;
    const fileExt = req.file.originalname.split('.').pop().toLowerCase();

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const fileName = `map_${timestamp}.${fileExt}`;

    // Subir a Supabase Storage
    const { data: bucketData, error: bucketError } = await req.supabase.storage
      .from('maps')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (bucketError) {
      req.logger.error('Error uploading to storage:', bucketError);
      // Si falla storage, usar URL directa como fallback
      const { data: mapData, error: mapError } = await req.supabase
        .from('maps')
        .insert([{
          name,
          description: description || null,
          scale: scale || null,
          region: region || null,
          file_type: file_type || fileExt.toUpperCase(),
          file_size: parseInt(file_size) || req.file.size,
          file_url: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
          thumbnail_url: null,
          map_type: 'uploaded'
        }])
        .select()
        .single();

      if (mapError) throw mapError;
      return res.json({ map: mapData });
    }

    // Obtener URL pública
    const { data: urlData } = req.supabase.storage
      .from('maps')
      .getPublicUrl(fileName);

    const fileUrl = urlData?.publicUrl || '';

    // Guardar metadata en la base de datos
    const { data: mapData, error: mapError } = await req.supabase
      .from('maps')
      .insert([{
        name,
        description: description || null,
        scale: scale || null,
        region: region || null,
        file_type: file_type || fileExt.toUpperCase(),
        file_size: parseInt(file_size) || req.file.size,
        file_url: fileUrl,
        thumbnail_url: null,
        map_type: 'uploaded'
      }])
      .select()
      .single();

    if (mapError) throw mapError;

    // Log a Telegram
    const bot = req.app.get('telegramBot');
    if (bot) {
      await bot.sendMessage(
        process.env.TELEGRAM_CHAT_ID,
        `🗺️ *NUEVO MAPA SUBIDO*\n${name}\nRegión: ${region || 'N/A'}\nEscala: ${scale || 'N/A'}\nPor: Admin`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});
    }

    res.json({ map: mapData });
  } catch (error) {
    req.logger.error('Error uploading map:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
