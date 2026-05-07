// Script para obtener GOOGLE_REFRESH_TOKEN
// Ejecutar: node get-token.js

import { google } from 'googleapis';
import http from 'http';
import url from 'url';

// Reemplaza con tus credenciales de Google Cloud Console
const CLIENT_ID = 'TU_CLIENT_ID';
const CLIENT_SECRET = 'TU_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3001/oauth2callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const scopes = ['https://www.googleapis.com/auth/drive.readonly'];

console.log('\n=== OBTENER REFRESH TOKEN ===\n');

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent'
});

console.log('1. Abre esta URL:\n');
console.log(authUrl);
console.log('\n2. Inicia sesión y acepta permisos');
console.log('3. El servidor local capturará el código automáticamente\n');

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/oauth2callback')) {
    const query = url.parse(req.url, true).query;

    if (query.error) {
      console.log('\n❌ Error:', query.error);
      res.end('Error: ' + query.error);
      server.close();
      process.exit(1);
    }

    if (query.code) {
      console.log('\n✅ Código recibido! Obteniendo token...\n');
      try {
        const { tokens } = await oauth2Client.getToken(query.code);
        console.log('========================================');
        console.log('GOOGLE_REFRESH_TOKEN=');
        console.log(tokens.refresh_token);
        console.log('========================================');
        console.log('\nCopia este valor y agrégalo a tu .env\n');
        res.end('✅ Token obtenido! Puedes cerrar esta ventana.');
        server.close();
        process.exit(0);
      } catch (e) {
        console.log('❌ Error:', e.message);
        res.end('Error: ' + e.message);
        server.close();
        process.exit(1);
      }
    }
  }
});

server.listen(3001, () => {
  console.log('Servidor local iniciado en http://localhost:3001\n');
});
