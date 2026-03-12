
import { google } from 'googleapis';

/**
 * Pastikan Anda telah menambahkan variabel lingkungan berikut:
 * GOOGLE_SERVICE_ACCOUNT_KEY (seluruh isi file JSON kunci service account)
 * GOOGLE_SHEETS_ID (ID spreadsheet dari URL)
 * GOOGLE_DRIVE_FOLDER_ID (ID folder drive tempat menyimpan file)
 */

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'),
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
  ],
});

export const sheets = google.sheets({ version: 'v4', auth });
export const drive = google.drive({ version: 'v3', auth });

export const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
export const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
