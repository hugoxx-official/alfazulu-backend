# Backend

Servidor Node.js + Express para AlfaZulu.

## Estructura

- `/src/routes` - Endpoints API
- `/src/middleware` - Auth, CORS, rate limiting
- `/src/services` - Lógica de negocio (Drive, DB, Telegram)
- `/src/db` - Conexión Supabase

## Comandos

```bash
npm install
npm run dev    # Desarrollo
npm run start  # Producción
```
