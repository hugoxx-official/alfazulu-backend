# Despliegue en Railway - AlfaZulu Backend

## Pasos para desplegar

### 1. Conectar repositorio a Railway
1. Ve a https://railway.app
2. Click en "New Project"
3. Selecciona "Deploy from GitHub repo"
4. Conecta el repositorio `alfazulu-backend`

### 2. Configurar variables de entorno
En Railway, ve a la pestaña **Variables** y agrega:

```
NODE_ENV=production
SUPABASE_URL=tu-supabase-url
SUPABASE_ANON_KEY=tu-supabase-anon-key
GOOGLE_DRIVE_FOLDER_ID=tu-folder-id
GOOGLE_CLIENT_ID=tu-client-id
GOOGLE_CLIENT_SECRET=tu-client-secret
GOOGLE_REFRESH_TOKEN=tu-refresh-token
TELEGRAM_BOT_TOKEN=tu-bot-token
TELEGRAM_CHAT_ID=tu-chat-id
API_KEY=tu-api-key-secreta
CORS_ORIGIN=*
```

### 3. Deploy
1. Railway detectará automáticamente el `railway.json`
2. El build se ejecutará con Nixpacks
3. El servidor iniciará con `npm start`

### 4. Health Check
Una vez desplegado, verifica: `https://tu-proyecto.up.railway.app/health`

## Logs en Railway

- Ve a la pestaña **Deployments** en Railway
- Click en el deployment activo
- Los logs aparecen en tiempo real en **Logs**

## Notas importantes

1. **Sistema de archivos efímero**: Los archivos en `logs/` no persisten en Railway. Los logs se ven en la consola de Railway.

2. **Uploads**: Si necesitas guardar archivos, configura un servicio externo (Supabase Storage, S3, etc.)

3. **Telegram**: Los logs de nivel `warn` y `error` se envían automáticamente a Telegram.

4. **CORS**: Si el frontend está en otro dominio, configura `CORS_ORIGIN` con la URL específica.

## Troubleshooting

### Error: "Cannot find module"
Verifica que `node_modules` esté en `.gitignore` y Railway lo instale.

### Error de CORS en el frontend
Agrega `CORS_ORIGIN` con la URL de tu frontend en Railway.

### Telegram no envía mensajes
Verifica que `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` estén correctos.
