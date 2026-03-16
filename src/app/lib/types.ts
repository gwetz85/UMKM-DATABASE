
export type BusinessActorStatus = 'pending' | 'verified_actor' | 'bank_pending' | 'finish' | 'rejected';

export interface BusinessActor {
  id: string;
  fullName: string;
  nik: string;
  noKK: string;
  pobDob: string;
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
}
