
export type BusinessActorStatus = 'pending' | 'hold' | 'lengkapi_data' | 'verified_actor' | 'verified_dinas' | 'bank_pending' | 'lpj_pending' | 'finish' | 'rejected' | 'blacklist' | 'verifikasi_manual';

export interface BusinessActor {
  id: string;
  fullName: string;
  nik: string;
  noKK: string;
  pobDob: string;
  pob?: string;
  dob?: string;
  gender: 'Laki-laki' | 'Perempuan';
  phone: string;
  address: string;
  rtRw: string;
  kelurahan: string;
  kecamatan: string;
  businessCategory: 'Kuliner' | 'Bukan Kuliner';
  businessName: string;
  businessLocation: string;
  coordinator: string;
  bankNumber?: string;
  bankOwner?: string;
  bankName?: string;
  ktpUri?: string;
  kkUri?: string;
  nibUri?: string;
  photoUsahaUri?: string;
  status: BusinessActorStatus;
  rejectionReason?: string;
  createdAt: string;
  ownerId: string;
  createdBy?: string; // Nama user yang menginput data
  lpjNominal?: number;
  lpjEntryDate?: string;
  hasilVerifikasiDinas?: string;
  keteranganDinas?: string;
  readyForLPJ?: boolean;
  registrationCode?: string;
}
