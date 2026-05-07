import { google } from 'googleapis';
import { Readable } from 'stream';

let isSyncing = false;

// Inicializar cliente de Google Drive
async function getDriveClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

// Sincronizar archivos de Drive a la base de datos
export async function syncDriveFiles(supabase, logger) {
  if (isSyncing) {
    logger.warn('Sync already in progress');
    return;
  }

  isSyncing = true;
  logger.info('Starting Drive sync...');

  try {
    const drive = await getDriveClient();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Listar archivos de la carpeta
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webContentLink)',
      spaces: 'drive'
    });

    const files = response.data.files || [];
    logger.info(`Found ${files.length} files in Drive`);

    // Sincronizar cada archivo
    for (const file of files) {
      // Determinar categoría basada en el nombre o tipo
      let category = 'DOCUMENTATION';
      if (file.name.toLowerCase().includes('map')) category = 'MAPS';
      else if (file.name.toLowerCase().includes('tccc')) category = 'TCCC';
      else if (file.name.toLowerCase().includes('transmission')) category = 'TRANSMISSIONS';
      else if (file.name.toLowerCase().includes('manual')) category = 'MANUALS';

      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('resources')
        .select('id')
        .eq('name', file.name)
        .single();

      if (existing) {
        // Actualizar
        await supabase
          .from('resources')
          .update({
            file_url: file.webContentLink,
            file_name: file.name,
            file_size: file.size ? parseInt(file.size) : 0,
            mime_type: file.mimeType,
            category
          })
          .eq('name', file.name);
      } else {
        // Insertar
        await supabase
          .from('resources')
          .insert([{
            name: file.name,
            file_url: file.webContentLink,
            file_name: file.name,
            file_size: file.size ? parseInt(file.size) : 0,
            mime_type: file.mimeType,
            category,
            description: 'Sincronizado desde Google Drive'
          }]);
      }
    }

    logger.info('Drive sync completed successfully');
  } catch (error) {
    logger.error('Drive sync error:', error);
  } finally {
    isSyncing = false;
  }
}

// Iniciar sync periódico (cada 1 hora)
export function startDriveSync(supabase, logger) {
  // Sync inicial
  syncDriveFiles(supabase, logger);

  // Sync cada hora
  setInterval(() => {
    syncDriveFiles(supabase, logger);
  }, 60 * 60 * 1000);
}
