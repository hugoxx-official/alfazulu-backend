// Middleware de autenticación por API Key

export function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.API_KEY;

  if (!expectedKey) {
    // Si no hay API_KEY configurada, permitir acceso
    return next();
  }

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  if (apiKey !== expectedKey) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
}
