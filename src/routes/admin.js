import express from 'express';
import bcrypt from 'bcrypt';

const router = express.Router();

// POST /api/admin/login - Login de administrador
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Buscar usuario
    const { data: user, error } = await req.supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verificar password (si existe hash) o comparar directo
    let isValid = false;
    if (user.password_hash) {
      isValid = await bcrypt.compare(password, user.password_hash);
    } else if (user.password) {
      isValid = password === user.password;
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verificar si es admin (campo is_admin o username específico)
    const isAdmin = user.is_admin === true || user.username === 'admin';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        is_admin: isAdmin
      }
    });
  } catch (error) {
    req.logger.error('Admin login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/stats - Estadísticas generales
router.get('/stats', async (req, res) => {
  try {
    const [usersRes, resourcesRes, downloadsRes, mapsRes] = await Promise.all([
      req.supabase.from('users').select('*', { count: 'exact', head: true }),
      req.supabase.from('resources').select('*', { count: 'exact', head: true }),
      req.supabase.from('downloads').select('*', { count: 'exact', head: true }),
      req.supabase.from('maps').select('*', { count: 'exact', head: true })
    ]);

    const { data: allUsers } = await req.supabase.from('users').select('is_premium');
    const premiumCount = allUsers?.filter(u => u.is_premium === true).length || 0;

    res.json({
      stats: {
        total_users: usersRes.count ?? 0,
        total_resources: resourcesRes.count ?? 0,
        total_downloads: downloadsRes.count ?? 0,
        total_maps: mapsRes.count ?? 0,
        premium_users: premiumCount,
        free_users: (usersRes.count ?? 0) - premiumCount
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

// POST /api/admin/categories - Añadir nueva categoría
router.post('/categories', async (req, res) => {
  try {
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({ error: 'Category name required' });
    }

    // Verificar si ya existe
    const { data: existing } = await req.supabase
      .from('resources')
      .select('category')
      .eq('category', category)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'Category already exists' });
    }

    // Insertar recurso dummy para registrar la categoría
    const { data, error } = await req.supabase
      .from('resources')
      .insert([{
        title: `[CATEGORY] ${category}`,
        category,
        file_type: 'category_marker',
        description: 'Category marker - not a real resource',
        is_premium: false
      }])
      .select()
      .single();

    if (error) throw error;

    // Log a Telegram
    const bot = req.app.get('telegramBot');
    if (bot) {
      await bot.sendMessage(
        process.env.TELEGRAM_CHAT_ID,
        `📁 *NUEVA CATEGORÍA*\n${category}\nPor: Admin`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});
    }

    res.json({ success: true, category });
  } catch (error) {
    req.logger.error('Error creating category:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/categories/:name - Eliminar categoría
router.delete('/categories/:name', async (req, res) => {
  try {
    const { name } = req.params;

    // Eliminar todos los recursos de esa categoría
    const { error } = await req.supabase
      .from('resources')
      .delete()
      .eq('category', name);

    if (error) throw error;

    // Log a Telegram
    const bot = req.app.get('telegramBot');
    if (bot) {
      await bot.sendMessage(
        process.env.TELEGRAM_CHAT_ID,
        `🗑️ *CATEGORÍA ELIMINADA*\n${name}\nPor: Admin`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});
    }

    res.json({ success: true });
  } catch (error) {
    req.logger.error('Error deleting category:', error);
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

// GET /api/admin/plans - Obtener todos los planes premium
router.get('/plans', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('premium_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;
    res.json({ plans: data || [] });
  } catch (error) {
    req.logger.error('Error getting plans:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/plans/:id - Actualizar un plan premium
router.put('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { display_name, price_monthly, price_lifetime, color, features, limitations, is_active, sort_order } = req.body;

    const updateData = { updated_at: new Date().toISOString() };
    if (display_name !== undefined) updateData.display_name = display_name;
    if (price_monthly !== undefined) updateData.price_monthly = price_monthly;
    if (price_lifetime !== undefined) updateData.price_lifetime = price_lifetime;
    if (color !== undefined) updateData.color = color;
    if (features !== undefined) updateData.features = features;
    if (limitations !== undefined) updateData.limitations = limitations;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (sort_order !== undefined) updateData.sort_order = sort_order;

    const { data, error } = await req.supabase
      .from('premium_plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log a Telegram
    const bot = req.app.get('telegramBot');
    if (bot) {
      await bot.sendMessage(
        process.env.TELEGRAM_CHAT_ID,
        `⚙️ *PLAN ACTUALIZADO*\nNombre: ${data.display_name}\nMensual: ${data.price_monthly}\nVitalicio: ${data.price_lifetime}\nPor: Admin`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});
    }

    res.json({ plan: data });
  } catch (error) {
    req.logger.error('Error updating plan:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/plans - Crear nuevo plan premium
router.post('/plans', async (req, res) => {
  try {
    const { plan_name, display_name, price_monthly, price_lifetime, color, features, limitations, sort_order } = req.body;

    const { data, error } = await req.supabase
      .from('premium_plans')
      .insert([{
        plan_name,
        display_name,
        price_monthly: price_monthly || '0',
        price_lifetime: price_lifetime || '0',
        color,
        features: features || [],
        limitations: limitations || [],
        sort_order: sort_order || 0,
        is_active: true
      }])
      .select()
      .single();

    if (error) throw error;

    // Log a Telegram
    const bot = req.app.get('telegramBot');
    if (bot) {
      await bot.sendMessage(
        process.env.TELEGRAM_CHAT_ID,
        `➕ *NUEVO PLAN CREADO*\n${data.display_name}\nMensual: ${data.price_monthly}\nVitalicio: ${data.price_lifetime}\nPor: Admin`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});
    }

    res.json({ plan: data });
  } catch (error) {
    req.logger.error('Error creating plan:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/plans/:id - Eliminar plan premium
router.delete('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await req.supabase
      .from('premium_plans')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Log a Telegram
    const bot = req.app.get('telegramBot');
    if (bot) {
      await bot.sendMessage(
        process.env.TELEGRAM_CHAT_ID,
        `🗑️ *PLAN ELIMINADO*\nID: ${id}\nPor: Admin`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});
    }

    res.json({ success: true });
  } catch (error) {
    req.logger.error('Error deleting plan:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/premium-request - Solicitar plan premium (envía a Telegram)
router.post('/premium-request', async (req, res) => {
  try {
    const { user_id, username, plan_name, payment_method } = req.body;

    if (!user_id || !username || !plan_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Enviar a Telegram
    const bot = req.app.get('telegramBot');
    if (bot) {
      const message = `💎 *SOLICITUD PREMIUM*\n\n👤 Usuario: ${username}\n📦 Plan: ${plan_name}\n💳 Método: ${payment_method || 'No especificado'}\n\n⚠️ Revisar y aprobar desde panel admin`;
      await bot.sendMessage(
        process.env.TELEGRAM_CHAT_ID,
        message,
        { parse_mode: 'Markdown' }
      );
    }

    res.json({ success: true, message: 'Solicitud enviada al administrador' });
  } catch (error) {
    req.logger.error('Error sending premium request:', error);
    res.status(500).json({ error: error.message });
  }
});


// GET /api/admin/users - Listar todos los usuarios
router.get('/users', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('users')
      .select('id, username, is_premium, premium_plan, subscription_end, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ users: data || [] });
  } catch (error) {
    req.logger.error('Error getting users:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/users/:id - Actualizar usuario (asignar premium)
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_premium, premium_plan, subscription_end, selected_plan_id } = req.body;

    const updateData = {};
    if (is_premium !== undefined) updateData.is_premium = is_premium;
    if (premium_plan !== undefined) updateData.premium_plan = premium_plan;
    if (subscription_end !== undefined) updateData.subscription_end = subscription_end;

    // If selected_plan_id is provided, get plan details from premium_plans table
    let planDetails = null;
    if (selected_plan_id) {
      const { data: planData } = await req.supabase
        .from('premium_plans')
        .select('plan_name, display_name, price_monthly, price_lifetime, color')
        .eq('id', selected_plan_id)
        .single();

      if (planData) {
        planDetails = planData;
        if (!updateData.premium_plan) {
          updateData.premium_plan = planData.plan_name;
        }
      }
    }

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
      const subEnd = subscription_end ? new Date(subscription_end).toLocaleDateString('es-ES') : 'N/A';
      const planName = planDetails?.display_name || premium_plan || 'N/A';
      await bot.sendMessage(
        process.env.TELEGRAM_CHAT_ID,
        `⭐ *USUARIO PREMIUM*\n👤 ID: ${id}\n📦 Plan: ${planName}\n📅 Hasta: ${subEnd}\n\n✅ Asignado por admin`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});
    }

    res.json({ user: data, plan: planDetails });
  } catch (error) {
    req.logger.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/users/:id/assign-plan - Asignar plan premium específico
router.post('/users/:id/assign-plan', async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_id, duration_months, custom_end_date } = req.body;

    if (!plan_id) {
      return res.status(400).json({ error: 'plan_id required' });
    }

    // Get plan details
    const { data: planData, error: planError } = await req.supabase
      .from('premium_plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !planData) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Calculate subscription end date
    let subscriptionEnd;
    if (custom_end_date) {
      subscriptionEnd = new Date(custom_end_date).toISOString();
    } else if (duration_months) {
      subscriptionEnd = new Date();
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + duration_months);
      subscriptionEnd = subscriptionEnd.toISOString();
    } else {
      // Default: 1 month for monthly plans, 1 year for lifetime
      const isLifetime = planData.plan_name?.toLowerCase().includes('lifetime') ||
                        planData.plan_name?.toLowerCase().includes('vitalicio');
      subscriptionEnd = new Date();
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + (isLifetime ? 12 : 1));
      subscriptionEnd = subscriptionEnd.toISOString();
    }

    // Update user
    const { data, error } = await req.supabase
      .from('users')
      .update({
        is_premium: true,
        premium_plan: planData.plan_name,
        subscription_end: subscriptionEnd
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Create notification for user
    await req.supabase.from('notifications').insert({
      user_id: id,
      title: '¡Plan Activado!',
      message: `Tu plan ${planData.display_name} ha sido activado. Disfruta de todas las características premium.`,
      type: 'premium'
    });

    // Log a Telegram
    const bot = req.app.get('telegramBot');
    if (bot) {
      await bot.sendMessage(
        process.env.TELEGRAM_CHAT_ID,
        `⭐ *PLAN ASIGNADO*\n👤 User ID: ${id}\n📦 Plan: ${planData.display_name}\n💰 Mensual: ${planData.price_monthly}€\n💎 Vitalicio: ${planData.price_lifetime}€\n📅 Hasta: ${new Date(subscriptionEnd).toLocaleDateString('es-ES')}\n\n✅ Asignado por admin`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});
    }

    res.json({
      success: true,
      user: data,
      plan: {
        name: planData.plan_name,
        displayName: planData.display_name,
        color: planData.color,
        subscriptionEnd
      }
    });
  } catch (error) {
    req.logger.error('Error assigning plan:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/maps - Listar mapas para admin
router.get('/maps', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('maps')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ maps: data || [] });
  } catch (error) {
    req.logger.error('Error getting maps:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/resources - Listar recursos para admin
router.get('/resources', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ resources: data || [] });
  } catch (error) {
    req.logger.error('Error getting resources:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/resources/:id - Eliminar recurso
router.delete('/resources/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await req.supabase
      .from('resources')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      req.logger.error('Supabase error deleting resource:', error);
      return res.status(500).json({ error: error.message, details: error });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Log a Telegram
    const bot = req.app.get('telegramBot');
    if (bot) {
      await bot.sendMessage(
        process.env.TELEGRAM_CHAT_ID,
        `🗑️ *RECURSO ELIMINADO*\nID: ${id}\nPor: Admin`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});
    }

    res.json({ success: true });
  } catch (error) {
    req.logger.error('Error deleting resource:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/resources - Crear nuevo recurso
router.post('/resources', async (req, res) => {
  try {
    const { title, description, category, file_type, file_size, download_url, thumbnail_url, is_premium } = req.body;

    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category required' });
    }

    const { data, error } = await req.supabase
      .from('resources')
      .insert([{
        name: title,
        title,
        description: description || null,
        category,
        file_type: file_type || 'PDF',
        file_size: file_size || 0,
        download_url: download_url || null,
        thumbnail_url: thumbnail_url || null,
        is_premium: is_premium ?? false
      }])
      .select()
      .single();

    if (error) throw error;

    // Log a Telegram
    const bot = req.app.get('telegramBot');
    if (bot) {
      await bot.sendMessage(
        process.env.TELEGRAM_CHAT_ID,
        `📄 *NUEVO RECURSO*\n${title}\nCategoría: ${category}\nPremium: ${is_premium ? 'Sí' : 'No'}\nPor: Admin`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});
    }

    res.json({ resource: data });
  } catch (error) {
    req.logger.error('Error creating resource:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/notify-all - Enviar notificación a todos los usuarios
router.post('/notify-all', async (req, res) => {
  try {
    const { title, message, type = 'admin' } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message required' });
    }

    // Obtener todos los usuarios
    const { data: allUsers } = await req.supabase
      .from('users')
      .select('id');

    if (!allUsers || allUsers.length === 0) {
      return res.json({ success: true, sent: 0 });
    }

    // Insertar notificación para cada usuario
    const notifications = allUsers.map(user => ({
      user_id: user.id,
      title,
      message,
      type
    }));

    // Insertar en lotes de 100
    for (let i = 0; i < notifications.length; i += 100) {
      const batch = notifications.slice(i, i + 100);
      await req.supabase.from('notifications').insert(batch);
    }

    // Notificar a Telegram
    const bot = req.app.get('telegramBot');
    if (bot) {
      await bot.sendMessage(
        process.env.TELEGRAM_CHAT_ID,
        `📢 *NOTIFICACIÓN ENVIADA*\n📦 A: ${allUsers.length} usuarios\n📝 Título: ${title}`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});
    }

    req.logger.info(`Notificación enviada a ${allUsers.length} usuarios`);
    res.json({ success: true, sent: allUsers.length });
  } catch (error) {
    req.logger.error('Error sending notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/resources/:id - Actualizar recurso
router.put('/resources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, file_type, file_size, download_url, thumbnail_url, is_premium } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.name = title;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (file_type !== undefined) updateData.file_type = file_type;
    if (file_size !== undefined) updateData.file_size = file_size;
    if (download_url !== undefined) updateData.download_url = download_url;
    if (thumbnail_url !== undefined) updateData.thumbnail_url = thumbnail_url;
    if (is_premium !== undefined) updateData.is_premium = is_premium;

    const { data, error } = await req.supabase
      .from('resources')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log a Telegram
    const bot = req.app.get('telegramBot');
    if (bot) {
      await bot.sendMessage(
        process.env.TELEGRAM_CHAT_ID,
        `✏️ *RECURSO ACTUALIZADO*\n${data.title || data.name}\nPor: Admin`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});
    }

    res.json({ resource: data });
  } catch (error) {
    req.logger.error('Error updating resource:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
