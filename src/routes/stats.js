import express from 'express';

const router = express.Router();

// GET /api/stats - Estadísticas detalladas
router.get('/', async (req, res) => {
  try {
    // Total descargas por recurso
    const { data: downloadsByResource } = await req.supabase
      .from('downloads')
      .select('resource_id, resources(name, category)')
      .not('resource_id', 'is', null);

    const resourceStats = {};
    downloadsByResource?.forEach(d => {
      const key = d.resource_id;
      if (!resourceStats[key]) {
        resourceStats[key] = {
          name: d.resources?.name,
          category: d.resources?.category,
          downloads: 0
        };
      }
      resourceStats[key].downloads++;
    });

    // Total usuarios
    const { count: totalUsers } = await req.supabase.from('users').count();

    // Descargas hoy
    const today = new Date().toISOString().split('T')[0];
    const { count: todayDownloads } = await req.supabase
      .from('downloads')
      .count()
      .gte('downloaded_at', today);

    res.json({
      stats: {
        totalUsers: totalUsers || 0,
        todayDownloads: todayDownloads || 0,
        resources: Object.values(resourceStats)
      }
    });
  } catch (error) {
    req.logger.error('Error getting detailed stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
