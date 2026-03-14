
export type BusinessActorStatus = 'pending' | 'verified_actor' | 'bank_pending' | 'finish';

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
  status: BusinessActorStatus;
  createdAt: string;
  ownerId: string;
}
