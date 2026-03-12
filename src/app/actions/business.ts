'use server';

import { revalidatePath } from 'next/cache';
import { BusinessActor } from '@/app/lib/types';

// NOTE: In a real implementation, you would use the 'googleapis' library
// to communicate with Google Sheets and Google Drive APIs.
// This mock simulates that behavior using a local or persistent storage.

// Mock database for demonstration
let mockDb: BusinessActor[] = [
  {
    id: '1',
    companyName: 'PT Teknologi Digital',
    ownerName: 'Budi Santoso',
    email: 'budi@tekno.com',
    phone: '08123456789',
    address: 'Jl. Sudirman No. 10',
    city: 'Jakarta',
    businessType: 'Teknologi Informasi',
    registrationNumber: 'NIB-990182',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    companyName: 'Warung Makan Makmur',
    ownerName: 'Siti Aminah',
    email: 'makmur@food.com',
    phone: '08219876543',
    address: 'Jl. Merdeka No. 45',
    city: 'Bandung',
    businessType: 'Kuliner',
    registrationNumber: 'NIB-772110',
    createdAt: new Date().toISOString(),
  }
];

export async function getBusinesses() {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockDb;
}

export async function getBusinessById(id: string) {
  return mockDb.find(b => b.id === id);
}

export async function saveBusiness(data: Omit<BusinessActor, 'id' | 'createdAt'>) {
  const newBusiness: BusinessActor = {
    ...data,
    id: Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
  };

  mockDb.unshift(newBusiness);
  
  // Real Integration hint:
  // googleSheets.spreadsheets.values.append({ spreadsheetId, range, valueInputOption: 'RAW', resource: { values: [[...]] } });
  
  revalidatePath('/business');
  revalidatePath('/');
  return { success: true, data: newBusiness };
}

export async function updateBusiness(id: string, data: Partial<BusinessActor>) {
  const index = mockDb.findIndex(b => b.id === id);
  if (index !== -1) {
    mockDb[index] = { ...mockDb[index], ...data };
    revalidatePath('/business');
    revalidatePath('/');
    return { success: true };
  }
  return { success: false, error: 'Business not found' };
}

export async function deleteBusiness(id: string) {
  mockDb = mockDb.filter(b => b.id !== id);
  revalidatePath('/business');
  revalidatePath('/');
  return { success: true };
}

export async function uploadDocument(file: FormData) {
  // Simulate Google Drive upload
  const fileName = (file.get('file') as File).name;
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Real Integration hint:
  // drive.files.create({ requestBody: { name, parents: [folderId] }, media: { mimeType, body: fs.createReadStream(...) } });
  
  return { 
    url: `https://drive.google.com/file/d/mock-id-${Math.random()}/view`,
    name: fileName
  };
}