import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import winston from 'winston';
import Transport from 'winston-transport';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Routes
import resourcesRoutes from './routes/resources.js';
import mapsRoutes from './routes/maps.js';
import usersRoutes from './routes/users.js';
import downloadsRoutes from './routes/downloads.js';
import adminRoutes from './routes/admin.js';
import telegramRoutes from './routes/telegram.js';
import filesRoutes from './routes/files.js';
import statsRoutes from './routes/stats.js';
import notificationsRoutes from './routes/notifications.js';

// Services
import { startDriveSync, syncDriveFiles } from './services/driveSync.js';
import { initTelegramBot, getBot, sendTelegramMessage } from './services/telegramBot.js';
import { startPremiumExpirationCheck, startWeeklyNotifications } from './services/premiumExpiration.js';
import { initFirebasePush } from './services/firebasePush.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const RAILWAY_URL = process.env.RAILWAY_PUBLIC_DOMAIN || `http://localhost:${PORT}`;

// Custom transport para Telegram
class TelegramTransport extends Transport {
  constructor(opts = {}) {
    super(opts);
    this.level = opts.level || 'info';
    this.minLevel = opts.minLevel || 'warn';
    this.lastTelegramError = null;
    this.suppressUntil = null;
  }

  log(info, callback) {
    const levelPriority = { error: 0, warn: 1, info: 2, debug: 3 };
    const minPriority = levelPriority[this.minLevel] ?? 1;
    const msgPriority = levelPriority[info.level] ?? 2;

    if (msgPriority > minPriority) {
      setImmediate(() => callback(null, true));
      return;
    }

    if (this.suppressUntil && Date.now() < this.suppressUntil) {
      setImmediate(() => callback(null, true));
      return;
    }

    setImmediate(async () => {
      try {
        const emoji = info.level === 'error' ? '❌' : info.level === 'warn' ? '⚠️' : 'ℹ️';
        const message = `${emoji} *[${info.level.toUpperCase()}]* ${info.message?.substring?.(0, 200) || 'Log event'}`;
        await sendTelegramMessage(message);
        this.lastTelegramError = null;
      } catch (err) {
        this.lastTelegramError = err;
        this.suppressUntil = Date.now() + 5 * 60 * 1000;
      }
      callback(null, true);
    });
  }
}

// Logger
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_PUBLIC_DOMAIN;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    ...(isProduction ? [] : [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' })
    ]),
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new TelegramTransport({ level: 'info', minLevel: 'warn' })
  ]
});

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));
app.use(express.json());

// Servir archivos estáticos (Flutter web build)
app.use(express.static(path.join(__dirname, '../web')));

// Servir archivos subidos estáticamente
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Pasar supabase y logger a las rutas
app.use((req, res, next) => {
  req.supabase = supabase;
  req.logger = logger;
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per 15 minutes
});
app.use('/api', limiter);

// Higher limit for admin routes
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500 // 500 requests per 15 minutes for admin operations
});
app.use('/api/admin', adminLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Redirect /app to download landing
app.get('/app', (req, res) => {
  res.redirect('https://descargarapp-production.up.railway.app');
});

// SPA Fallback - servir index.html para cualquier ruta no API
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../web/index.html'));
});

// Routes
app.use('/api/resources', resourcesRoutes);
app.use('/api/maps', mapsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/downloads', downloadsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  logger.info(`Backend running on port ${PORT}`);
  const bot = initTelegramBot(logger);
  app.set('telegramBot', bot);

  // Initialize Firebase Push Notifications
  const firebaseMessaging = initFirebasePush();
  app.set('firebaseMessaging', firebaseMessaging);

  // Iniciar jobs programados
  startPremiumExpirationCheck(supabase, logger, bot);
  startWeeklyNotifications(supabase, logger, bot);
});

export { app, supabase, logger };
