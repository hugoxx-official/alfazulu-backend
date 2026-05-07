import cron from 'node-cron';

/**
 * Verifica y desactiva usuarios premium con suscripción vencida
 * Se ejecuta diariamente a las 3:00 AM
 */
export function startPremiumExpirationCheck(supabase, logger, telegramBot) {
  // Ejecutar todos los días a las 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    logger.info('Iniciando verificación de expiración premium...');

    try {
      const now = new Date().toISOString();

      // Obtener usuarios premium con suscripción vencida
      const { data: expiredUsers, error: fetchError } = await supabase
        .from('users')
        .select('id, username, premium_plan, subscription_end')
        .eq('is_premium', true)
        .lt('subscription_end', now);

      if (fetchError) {
        logger.error('Error fetching expired users:', fetchError);
        return;
      }

      if (!expiredUsers || expiredUsers.length === 0) {
        logger.info('No hay usuarios con suscripción vencida');
        return;
      }

      logger.info(`Encontrados ${expiredUsers.length} usuarios con suscripción vencida`);

      // Desactivar premium para cada usuario
      for (const user of expiredUsers) {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            is_premium: false,
            premium_plan: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          logger.error(`Error updating user ${user.id}:`, updateError);
          continue;
        }

        logger.info(`Premium desactivado para ${user.username} (${user.id})`);

        // Crear notificación para el usuario
        await supabase
          .from('notifications')
          .insert([{
            user_id: user.id,
            title: '⏰ Premium Caducado',
            message: 'Tu suscripción premium ha finalizado. ¡Renueva para seguir accediendo a contenido exclusivo!',
            type: 'premium'
          }]);

        // Notificar a Telegram
        if (telegramBot && process.env.TELEGRAM_CHAT_ID) {
          await telegramBot.sendMessage(
            process.env.TELEGRAM_CHAT_ID,
            `⏰ *PREMIUM CADUCADO*\n👤 Usuario: ${user.username}\n📦 Plan: ${user.premium_plan || 'N/A'}\n📅 Venció: ${new Date(user.subscription_end).toLocaleDateString('es-ES')}`,
            { parse_mode: 'Markdown' }
          ).catch(() => {});
        }
      }

      logger.info('Verificación de expiración premium completada');
    } catch (error) {
      logger.error('Error en verificación de expiración premium:', error);
    }
  });

  logger.info('Job de expiración premium programado (diario a las 3:00 AM)');
}

/**
 * Envía notificaciones semanales de resumen
 * Se ejecuta todos los lunes a las 9:00 AM
 */
export function startWeeklyNotifications(supabase, logger, telegramBot) {
  // Todos los lunes a las 9:00 AM
  cron.schedule('0 9 * * 1', async () => {
    logger.info('Enviando notificaciones semanales...');

    try {
      // Obtener nuevos recursos de la semana
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data: newResources } = await supabase
        .from('resources')
        .select('title, category, created_at')
        .gte('created_at', oneWeekAgo.toISOString())
        .order('created_at', { ascending: false });

      const { data: newMaps } = await supabase
        .from('maps')
        .select('name, region, created_at')
        .gte('created_at', oneWeekAgo.toISOString())
        .order('created_at', { ascending: false });

      if ((!newResources || newResources.length === 0) && (!newMaps || newMaps.length === 0)) {
        logger.info('No hay contenido nuevo para notificación semanal');
        return;
      }

      // Obtener todos los usuarios
      const { data: allUsers } = await supabase
        .from('users')
        .select('id');

      if (!allUsers || allUsers.length === 0) return;

      // Crear mensaje de resumen
      let message = '📋 *RESUMEN SEMANAL*\n\n';

      if (newResources && newResources.length > 0) {
        message += `📄 *${newResources.length} Nuevos Recursos:*\n`;
        newResources.slice(0, 5).forEach(r => {
          message += `  • ${r.title} (${r.category || 'General'})\n`;
        });
        if (newResources.length > 5) {
          message += `  ... y ${newResources.length - 5} más\n`;
        }
      }

      if (newMaps && newMaps.length > 0) {
        message += `\n🗺️ *${newMaps.length} Nuevos Mapas:*\n`;
        newMaps.slice(0, 5).forEach(m => {
          message += `  • ${m.name} (${m.region || 'Sin región'})\n`;
        });
        if (newMaps.length > 5) {
          message += `  ... y ${newMaps.length - 5} más\n`;
        }
      }

      message += '\n¡Visita AlfaZulu para explorar todo el contenido!';

      // Insertar notificación para cada usuario
      const notifications = allUsers.map(user => ({
        user_id: user.id,
        title: '📋 Resumen Semanal',
        message: `Esta semana: ${newResources?.length || 0} recursos nuevos y ${newMaps?.length || 0} mapas nuevos`,
        type: 'info'
      }));

      // Insertar en lotes de 100
      for (let i = 0; i < notifications.length; i += 100) {
        const batch = notifications.slice(i, i + 100);
        await supabase.from('notifications').insert(batch);
      }

      logger.info(`Notificaciones semanales enviadas a ${allUsers.length} usuarios`);

      // Notificar a Telegram
      if (telegramBot && process.env.TELEGRAM_CHAT_ID) {
        await telegramBot.sendMessage(
          process.env.TELEGRAM_CHAT_ID,
          message,
          { parse_mode: 'Markdown' }
        ).catch(() => {});
      }
    } catch (error) {
      logger.error('Error en notificaciones semanales:', error);
    }
  });

  logger.info('Job de notificaciones semanales programado (lunes 9:00 AM)');
}
