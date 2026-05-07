import express from 'express';

const router = express.Router();

// POST /api/telegram/send - Enviar mensaje
router.post('/send', async (req, res) => {
  try {
    const { message } = req.body;
    const bot = req.app.get('telegramBot');

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    if (bot) {
      const chatId = process.env.TELEGRAM_CHAT_ID;
      await bot.sendMessage(chatId, message);
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Bot not initialized' });
    }
  } catch (error) {
    req.logger.error('Error sending Telegram message:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
