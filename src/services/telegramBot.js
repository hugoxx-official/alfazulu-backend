import TelegramBot from 'node-telegram-bot-api';

let bot = null;

// Inicializar bot de Telegram
export function initTelegramBot(logger) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    logger.warn('Telegram bot token not configured');
    return null;
  }

  try {
    bot = new TelegramBot(token, { polling: true });

    // Handler para /start
    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      bot.sendMessage(chatId, '👋 Bienvenido a AlfaZulu Bot\\n\\nRecibirás notificaciones de la app aquí\\.', {
        parse_mode: 'Markdown'
      });
    });

    // Handler para /help
    bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      bot.sendMessage(chatId, '📋 *Comandos disponibles:*\\n\\n/start - Iniciar el bot\\n/help - Mostrar esta ayuda', {
        parse_mode: 'Markdown'
      });
    });

    logger.info('Telegram bot initialized');
    return bot;
  } catch (error) {
    logger.error('Error initializing Telegram bot:', error);
    return null;
  }
}

// Obtener instancia del bot
export function getBot() {
  return bot;
}

// Enviar mensaje
export async function sendTelegramMessage(message) {
  if (!bot) return;

  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) return;

  try {
    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown'
    });
  } catch (error) {
    throw error;
  }
}
