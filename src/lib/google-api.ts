import { google } from 'googleapis';

/**
 * Pastikan Anda telah menambahkan variabel lingkungan berikut:
 * GOOGLE_SERVICE_ACCOUNT_KEY (seluruh isi file JSON kunci service account sebagai string)
 * GOOGLE_SHEETS_ID (ID spreadsheet dari URL)
 * GOOGLE_DRIVE_FOLDER_ID (ID folder drive tempat menyimpan file)
 */

function getCredentials() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key || key.startsWith('YOUR_')) {
    console.warn('WARNING: GOOGLE_SERVICE_ACCOUNT_KEY belum diatur atau masih menggunakan placeholder.');
    return null;
  }

  try {
    return JSON.parse(key);
  } catch (error) {
    console.error('ERROR: Gagal mengurai GOOGLE_SERVICE_ACCOUNT_KEY. Pastikan formatnya adalah JSON yang valid.');
    return null;
  }
}

const credentials = getCredentials();

const auth = new google.auth.GoogleAuth({
  credentials: credentials || {},
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
  ],
});

export const sheets = google.sheets({ version: 'v4', auth });
export const drive = google.drive({ version: 'v3', auth });

export const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
export const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
