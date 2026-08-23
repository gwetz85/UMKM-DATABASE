
export type BusinessActorStatus = 'pending' | 'hold' | 'lengkapi_data' | 'verified_actor' | 'verified_dinas' | 'bank_pending' | 'lpj_pending' | 'finish' | 'rejected' | 'blacklist' | 'verifikasi_manual';

export interface SurveyDinasData {
  namaUsaha: string;
  namaPemilik: string;
  jenisKelamin: 'Laki-Laki' | 'Perempuan' | string;
  status: 'Janda' | 'Duda' | 'Lajang' | 'Kepala Keluarga' | string;
  alamatRumah: string;
  noHp: string;
  email: string;
  sosmed: string;
  dtks: {
    masuk: boolean;
    jenis?: 'PKH' | 'BPNT' | 'KIP' | 'LANSIA' | string;
  };
  bidangUsaha: string;
  peralatan: string;
  tahunBerdiri: string;
  izin: string[];
  modalUsaha: string;
  omset: string;
  hibah: {
    pernah: boolean;
    dariMana?: string;
    tahun?: string;
  };
  rencanaPenggunaan: string;
  hasilSurvey: string;
  fotoSurveyUrl?: string;
  tanggalSurvey?: string;
  pejabatData?: PejabatData;
}

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
  petugasSurvey?: string;
  bankNumber?: string;
  bankOwner?: string;
  bankName?: string;
  ktpUri?: string;
  kkUri?: string;
  nibUri?: string;
  photoUsahaUri?: string;
  comparisonPhotoUrl?: string;
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
  filingNote?: string;
  surveyData?: SurveyDinasData;
  surveyProgress?: number;
  verificationLocationDinas?: { lat: number; lon: number };
  googleDriveLink?: string;
  verifikatorDinas?: string;
  pejabatData?: PejabatData;
  lastDraftBy?: string;
  lastDraftAt?: string;
  dikembalikanKePetugasAt?: string;
  dikembalikanKePetugasBy?: string;
  dikembalikanKePetugasReason?: string;
  catatanPengembalian?: string;
  verifiedDinasAt?: string;
  verifiedDinasBy?: string;
  berkasDinasVerified?: boolean;
  berkasDinasVerifiedAt?: string;
  berkasDinasVerifiedBy?: string;
  alasanCancelDinas?: string;
  cancelDinasAt?: string;
  cancelDinasBy?: string;
  dihapusDinasAt?: string;
  dihapusDinasBy?: string;
}

export interface PejabatItem {
  nama: string;
  nipppk: string;
  pangkat: string;
  jabatan: string;
}

export interface PejabatData {
  verifikator: PejabatItem;
  petugas: PejabatItem;
  updatedAt?: string;
}
