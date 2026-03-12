'use server';

import { revalidatePath } from 'next/cache';
import { BusinessActor } from '@/app/lib/types';
import { sheets, drive, SPREADSHEET_ID, DRIVE_FOLDER_ID } from '@/lib/google-api';
import { Readable } from 'stream';

const RANGE = 'Sheet1!A2:L'; // Asumsi data mulai dari baris 2

export async function getBusinesses(): Promise<BusinessActor[]> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values || [];
    return rows.map((row) => ({
      id: row[0],
      companyName: row[1],
      ownerName: row[2],
      email: row[3],
      phone: row[4],
      address: row[5],
      city: row[6],
      businessType: row[7],
      registrationNumber: row[8],
      createdAt: row[9],
      documentUrl: row[10] || undefined,
      documentName: row[11] || undefined,
    })).reverse(); // Terbaru di atas
  } catch (error) {
    console.error('Error fetching from Sheets:', error);
    return [];
  }
}

export async function getBusinessById(id: string) {
  const businesses = await getBusinesses();
  return businesses.find(b => b.id === id);
}

export async function saveBusiness(data: Omit<BusinessActor, 'id' | 'createdAt'>) {
  const id = Math.random().toString(36).substring(2, 9);
  const createdAt = new Date().toISOString();

  const values = [
    [
      id,
      data.companyName,
      data.ownerName,
      data.email,
      data.phone,
      data.address,
      data.city,
      data.businessType,
      data.registrationNumber,
      createdAt,
      data.documentUrl || '',
      data.documentName || '',
    ]
  ];

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:L',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    revalidatePath('/business');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error saving to Sheets:', error);
    throw new Error('Gagal menyimpan ke Google Sheets');
  }
}

export async function uploadDocument(formData: FormData) {
  const file = formData.get('file') as File;
  if (!file) throw new Error('No file provided');

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);

    const response = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: DRIVE_FOLDER_ID ? [DRIVE_FOLDER_ID] : [],
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: 'id, webViewLink',
    });

    // Berikan izin baca ke siapa saja yang memiliki link (opsional)
    if (response.data.id) {
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    }

    return {
      url: response.data.webViewLink || '',
      name: file.name
    };
  } catch (error) {
    console.error('Error uploading to Drive:', error);
    throw new Error('Gagal mengunggah ke Google Drive');
  }
}

export async function deleteBusiness(id: string) {
  // Catatan: Menghapus baris tertentu di Google Sheets secara API memerlukan index baris.
  // Untuk MVP ini, kita fokus pada penambahan data.
  // Dalam implementasi penuh, Anda harus mencari baris ID tersebut dan menggunakan spreadsheets.batchUpdate.
  return { success: false, error: 'Delete not implemented for Sheets yet' };
}
