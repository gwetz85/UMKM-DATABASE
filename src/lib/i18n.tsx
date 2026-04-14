"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

export type Language = "id" | "en" | "ms"

interface Translation {
  [key: string]: {
    id: string
    en: string
    ms: string
  }
}

export const translations: Translation = {
  // General UI
  dashboard: {
    id: "Dashboard",
    en: "Dashboard",
    ms: "Papan Pemuka"
  },
  main_menu: {
    id: "Menu Utama",
    en: "Main Menu",
    ms: "Menu Utama"
  },
  settings: {
    id: "Pengaturan",
    en: "Settings",
    ms: "Tetapan"
  },
  profile: {
    id: "Profil Saya",
    en: "My Profile",
    ms: "Profil Saya"
  },
  logout: {
    id: "Keluar",
    en: "Logout",
    ms: "Log Keluar"
  },
  system: {
    id: "Sistem",
    en: "System",
    ms: "Sistem"
  },
  language: {
    id: "Bahasa",
    en: "Language",
    ms: "Bahasa"
  },
  app_language: {
    id: "Bahasa Aplikasi",
    en: "App Language",
    ms: "Bahasa Aplikasi"
  },
  select_language: {
    id: "Pilih Bahasa",
    en: "Select Language",
    ms: "Pilih Bahasa"
  },
  save_changes: {
    id: "Simpan Perubahan",
    en: "Save Changes",
    ms: "Simpan Perubahan"
  },
  // Sidebar / Menu
  actor_data: {
    id: "Data Pelaku Usaha",
    en: "Business Actor Data",
    ms: "Data Pelaku Usaha"
  },
  finish_data: {
    id: "Data Selesai",
    en: "Finished Data",
    ms: "Data Selesai"
  },
  rejected_data: {
    id: "Data Ditolak",
    en: "Rejected Data",
    ms: "Data Ditolak"
  },
  verify_admin: {
    id: "Verifikasi Admin",
    en: "Admin Verification",
    ms: "Pengesahan Admin"
  },
  input_data: {
    id: "Input Data",
    en: "Input Data",
    ms: "Input Data"
  },
  check_data_public: {
    id: "Cek Data",
    en: "Check Data",
    ms: "Semak Data"
  },
  user_management: {
    id: "Manajemen User",
    en: "User Management",
    ms: "Pengurusan Pengguna"
  },
  chat_monitoring: {
    id: "Monitoring Chat",
    en: "Chat Monitoring",
    ms: "Pemantauan Sembang"
  },
  // Status Labels
  coming_soon: {
    id: "Segera Hadir",
    en: "Coming Soon",
    ms: "Akan Datang"
  },
  ongoing: {
    id: "Sedang Berlangsung",
    en: "Ongoing",
    ms: "Sedang Berlangsung"
  },
  office_hours_title: {
    id: "Waktu Operasional Kantor",
    en: "Office Operational Hours",
    ms: "Waktu Operasi Pejabat"
  },
  office_open: {
    id: "Kantor Buka",
    en: "Office Open",
    ms: "Pejabat Dibuka"
  },
  office_holiday: {
    id: "Kantor Libur",
    en: "Office Holiday",
    ms: "Pejabat Percuti"
  },
  office_closed: {
    id: "Kantor Tutup",
    en: "Office Closed",
    ms: "Pejabat Ditutup"
  },
  towards_closing: {
    id: "Menuju Tutup",
    en: "Towards Closing",
    ms: "Menghampiri Waktu Tutup"
  },
  towards_opening: {
    id: "Menuju Buka",
    en: "Towards Opening",
    ms: "Menghampiri Waktu Buka"
  },
  // Sidebar / Menu Advanced
  verify_bank: {
    id: "Verifikasi Data",
    en: "Data Verification",
    ms: "Pengesahan Data"
  },
  gov_verification: {
    id: "Verifikasi & Validasi Dinas",
    en: "Gov Verification & Validation",
    ms: "Pengesahan & Pengesahan Dinas"
  },
  verification_results: {
    id: "HASIL VERIFIKASI",
    en: "VERIFICATION RESULTS",
    ms: "KEPUTUSAN PENGESAHAN"
  },
  bank_accounts: {
    id: "Rekening Bank",
    en: "Bank Accounts",
    ms: "Akaun Bank"
  },
  lpj: {
    id: "LPJ",
    en: "Reports (LPJ)",
    ms: "Laporan (LPJ)"
  },
  quota_coordinator: {
    id: "Kuota Koordinator",
    en: "Coordinator Quota",
    ms: "Kuota Penyelaras"
  },
  app_logs: {
    id: "LOG APLIKASI",
    en: "APP LOGS",
    ms: "LOG APLIKASI"
  },
  event_settings: {
    id: "Pengaturan Event",
    en: "Event Settings",
    ms: "Tetapan Acara"
  },
  // Dashboard Specific
  total_actors: {
    id: "Total Pelaku Usaha",
    en: "Total Business Actors",
    ms: "Jumlah Pelaku Usaha"
  },
  male_actors: {
    id: "Pelaku Laki-laki",
    en: "Male Actors",
    ms: "Pelaku Lelaki"
  },
  female_actors: {
    id: "Pelaku Perempuan",
    en: "Female Actors",
    ms: "Pelaku Perempuan"
  },
  verified_data: {
    id: "Data Terverifikasi",
    en: "Verified Data",
    ms: "Data Disahkan"
  },
  rejected_data_dashboard: {
    id: "Data Ditolak",
    en: "Rejected Data",
    ms: "Data Ditolak"
  },
  latest_data: {
    id: "Data Terkini",
    en: "Latest Data",
    ms: "Data Terkini"
  },
  quota_all: {
    id: "Jumlah Kuota",
    en: "Total Quota",
    ms: "Jumlah Kuota"
  },
  no_village_data: {
    id: "Belum ada data wilayah terekam.",
    en: "No regional data recorded yet.",
    ms: "Belum ada data wilayah dirakam."
  },
  // Advanced Dashboard & Global
  dashboard_desc: {
    id: "Monitor dan kelola pendaftaran pelaku usaha secara real-time.",
    en: "Monitor and manage business actor registration in real-time.",
    ms: "Pantau dan urus pendaftaran pelaku usaha secara masa nyata."
  },
  system_active: {
    id: "SISTEM: AKTIF & SINKRON",
    en: "SYSTEM: ACTIVE & SYNCED",
    ms: "SISTEM: AKTIF & SEGERAK"
  },
  latest_data_label: {
    id: "DATA TERKINI",
    en: "LATEST DATA",
    ms: "DATA TERKINI"
  },
  coordinator_name: {
    id: "Nama Korlap / Dewan Aktif",
    en: "Coordinator Name",
    ms: "Nama Penyelaras"
  },
  quota_target: {
    id: "Jumlah Kuota",
    en: "Target Quota",
    ms: "Jumlah Kuota"
  },
  quota_achieved: {
    id: "Kuota Tercapai",
    en: "Quota Achieved",
    ms: "Kuota Tercapai"
  },
  quota_remaining: {
    id: "Sisa Kuota",
    en: "Remaining Quota",
    ms: "Baki Kuota"
  },
  regional_distribution: {
    id: "Sebaran per Kelurahan",
    en: "Sub-district Distribution",
    ms: "Agihan setiap Kelurahan"
  },
  music_start: {
    id: "Klik untuk Memulai Musik",
    en: "Click to Start Music",
    ms: "Klik untuk Mulakan Muzik"
  },
  now_playing: {
    id: "SEDANG DIPUTAR",
    en: "NOW PLAYING",
    ms: "SEDANG DIMAINKAN"
  },
  days: { id: "Hari", en: "Days", ms: "Hari" },
  hours: { id: "Jam", en: "Hours", ms: "Jam" },
  minutes: { id: "Menit", en: "Minutes", ms: "Minit" },
  seconds: { id: "Detik", en: "Seconds", ms: "Saat" },
  previous: { id: "Sebelumnya", en: "Previous", ms: "Sebelumnya" },
  next: { id: "Selanjutnya", en: "Next", ms: "Seterusnya" },
  play: { id: "Putar", en: "Play", ms: "Mainkan" },
  pause: { id: "Jeda", en: "Pause", ms: "Jeda" },
  mute: { id: "Senyap", en: "Mute", ms: "Senyap" },
  unmute: { id: "Aktifkan Musik", en: "Unmute", ms: "Aktifkan Muzik" },
  cloud_storage: {
    id: "Penyimpanan Cloud Online",
    en: "Online Cloud Storage",
    ms: "Storan Awan Dalam Talian"
  },
  server_status: {
    id: "Status Server",
    en: "Server Status",
    ms: "Status Pelayan"
  },
  online: { id: "ONLINE", en: "ONLINE", ms: "DALAM TALIAN" },
  availability: { id: "Ketersediaan", en: "Availability", ms: "Ketersediaan" },
  cloud_desc: {
    id: "Seluruh data tersimpan aman di infrastruktur Cloud Google.",
    en: "All data is stored securely in Google Cloud infrastructure.",
    ms: "Semua data disimpan dengan selamat di infrastruktur Cloud Google."
  },
  business_category_title: {
    id: "Kategori Usaha",
    en: "Business Categories",
    ms: "Kategori Perniagaan"
  },
  kuliner: { id: "Kuliner", en: "Culinary", ms: "Kulinari" },
  non_kuliner: { id: "Bukan Kuliner", en: "Non-Culinary", ms: "Bukan Kulinari" },
  other_empty: { id: "Lainnya / Kosong", en: "Others / Empty", ms: "Lain-lain / Kosong" },
  total_quota_data: {
    id: "Total Kuota Data",
    en: "Total Quota Data",
    ms: "Jumlah Data Kuota"
  },
  no_quota_data: {
    id: "Data kuota koordinator belum dimasukkan.",
    en: "Coordinator quota data has not been entered.",
    ms: "Data kuota penyelaras belum dimasukkan."
  },
  full_name: { id: "Nama Lengkap", en: "Full Name", ms: "Nama Penuh" },
  nik: { id: "NIK", en: "National ID (NIK)", ms: "ID Nasional (NIK)" },
  business_name: { id: "Nama Usaha", en: "Business Name", ms: "Nama Perniagaan" },
  coordinator: { id: "Koordinator", en: "Coordinator", ms: "Penyelaras" },
  status: { id: "Status", en: "Status", ms: "Status" },
  no_data_found: {
    id: "Tidak ada data yang ditemukan.",
    en: "No data found.",
    ms: "Tiada data dijumpai."
  },
  // Phase 3 - Global UI
  uid_copied: { id: "UID Disalin", en: "UID Copied", ms: "UID Disalin" },
  uid_copied_desc: {
    id: "Berikan UID ini ke Admin untuk akses penuh.",
    en: "Provide this UID to Admin for full access.",
    ms: "Berikan UID ini kepada Admin untuk akses penuh."
  },
  access_denied_desc: {
    id: "Halaman ini hanya dapat diakses oleh Administrator Sistem.",
    en: "This page can only be accessed by System Administrators.",
    ms: "Halaman ini hanya boleh diakses oleh Pentadbir Sistem."
  },
  // Check Data Page
  check_master_data: {
    id: "Cek Data Master",
    en: "Check Master Data",
    ms: "Semak Data Induk"
  },
  check_master_desc: {
    id: "Lakukan pengecekan data penduduk berdasarkan NIK individu atau seluruh anggota dalam satu Kartu Keluarga.",
    en: "Check resident data based on individual NIK or all members in one Family Card (KK).",
    ms: "Semak data penduduk berdasarkan NIK individu atau semua ahli dalam satu Kad Keluarga (KK)."
  },
  search_parameters: { id: "Parameter Pencarian", en: "Search Parameters", ms: "Parameter Carian" },
  select_search_method: { id: "Pilih salah satu metode pencarian.", en: "Select one search method.", ms: "Pilih satu kaedah carian." },
  search_type: { id: "Tipe Pencarian", en: "Search Type", ms: "Jenis Carian" },
  search_by_nik: { id: "Berdasarkan NIK", en: "Based on NIK", ms: "Berdasarkan NIK" },
  search_by_kk: { id: "Berdasarkan Nomor KK", en: "Based on Family Card No", ms: "Berdasarkan No Kad Keluarga" },
  search_by_name: { id: "Berdasarkan Nama", en: "Based on Name", ms: "Berdasarkan Nama" },
  input_nik_placeholder: { id: "Input NIK", en: "Input NIK", ms: "Masukkan NIK" },
  input_kk_placeholder: { id: "Input No KK", en: "Input Family Card No", ms: "Masukkan No Kad Keluarga" },
  input_name_placeholder: { id: "Input Nama", en: "Input Name", ms: "Masukkan Nama" },
  search_btn: { id: "Cari Data", en: "Search Data", ms: "Cari Data" },
  ready_to_check: { id: "Siap Melakukan Pengecekan", en: "Ready to Check", ms: "Sedia untuk Semak" },
  ready_to_check_desc: {
    id: "Silakan pilih metode pencarian dan masukkan nomor yang valid pada form di samping.",
    en: "Please select a search method and enter a valid number in the form.",
    ms: "Sila pilih kaedah carian dan masukkan nombor yang sah dalam borang."
  },
  connecting_db: { id: "Menghubungkan ke Database Master...", en: "Connecting to Master Database...", ms: "Menghubung ke Pangkalan Data Induk..." },
  data_found_label: { id: "DATA DITEMUKAN", en: "DATA FOUND", ms: "DATA DIJUMPAI" },
  data_found_desc: {
    id: "Klik kartu untuk melihat detail lengkap.",
    en: "Click card to view full details.",
    ms: "Klik kad untuk melihat butiran penuh."
  },
  data_not_found_label: { id: "DATA TIDAK TERDAFTAR", en: "DATA NOT REGISTERED", ms: "DATA TIDAK BERDAFTAR" },
  data_not_found_desc: {
    id: "Mohon maaf, data tidak ditemukan dalam database master.",
    en: "Sorry, data not found in the master database.",
    ms: "Maaf, data tidak dijumpai dalam pangkalan data induk."
  },
  repeat_search: { id: "Ulangi Pencarian", en: "Repeat Search", ms: "Ulangi Carian" },
  detail_info: { id: "Informasi Lengkap", en: "Full Information", ms: "Maklumat Lengkap" },
  close_detail: { id: "TUTUP DETAIL", en: "CLOSE DETAILS", ms: "TUTUP BUTIRAN" },
  // Input Data Page
  input_new_data: { id: "Input Data Baru", en: "Input New Data", ms: "Masukkan Data Baru" },
  input_new_desc: { id: "Lengkapi formulir untuk mendaftarkan pelaku usaha baru.", en: "Complete the form to register a new business actor.", ms: "Lengkapkan borang untuk mendaftar pelaku usaha baru." },
  monitoring_mode_desc: { id: "MODE MONITORING: Anda hanya dapat melihat formulir ini.", en: "MONITORING MODE: You can only view this form.", ms: "MOD PEMANTAUAN: Anda hanya boleh melihat borang ini." },
  personal_biodata: { id: "Biodata Pribadi", en: "Personal Biodata", ms: "Biodata Peribadi" },
  gender_label: { id: "Jenis Kelamin", en: "Gender", ms: "Jantina" },
  select_placeholder: { id: "Pilih", en: "Select", ms: "Pilih" },
  male: { id: "Laki-laki", en: "Male", ms: "Lelaki" },
  female: { id: "Perempuan", en: "Female", ms: "Perempuan" },
  pob_dob_label: { id: "Tempat / Tanggal Lahir", en: "Place / Date of Birth", ms: "Tempat / Tarikh Lahir" },
  phone_label: { id: "Nomor Ponsel", en: "Phone Number", ms: "No Telefon" },
  address_location: { id: "Alamat & Lokasi", en: "Address & Location", ms: "Alamat & Lokasi" },
  full_address: { id: "Alamat Lengkap", en: "Full Address", ms: "Alamat Penuh" },
  rt_rw: { id: "RT / RW", en: "RT / RW", ms: "RT / RW" },
  kelurahan: { id: "Kelurahan", en: "Sub-district", ms: "Kelurahan" },
  kecamatan_auto: { id: "Kecamatan (Otomatis)", en: "District (Auto)", ms: "Kecamatan (Auto)" },
  business_data: { id: "Data Usaha", en: "Business Data", ms: "Data Perniagaan" },
  business_type: { id: "Jenis Usaha", en: "Business Type", ms: "Jenis Perniagaan" },
  business_location: { id: "Lokasi Usaha", en: "Business Location", ms: "Lokasi Perniagaan" },
  coordinator: { id: "Koordinator", en: "Coordinator", ms: "Penyelaras" },
  save_input_btn: { id: "Simpan Data Input", en: "Save Input Data", ms: "Simpan Data Input" },
  limited_access: { id: "AKSES TERBATAS", en: "LIMITED ACCESS", ms: "AKSES TERHAD" },
  data_saved_success: { id: "DATA TELAH TERSIMPAN", en: "DATA SAVED successfully", ms: "DATA TELAH DISIMPAN" },
  wait_verification: { id: "Mohon menunggu ADMIN memverifikasi data anda.", en: "Please wait for ADMIN to verify your data.", ms: "Sila tunggu ADMIN mengesahkan data anda." },
  ok_understand: { id: "OKE, MENGERTI", en: "OK, UNDERSTAND", ms: "OK, FAHAM" },
  // Actor Data Page
  actor_data_title: { id: "Data Pelaku Usaha", en: "Business Actor Data", ms: "Data Pelaku Usaha" },
  actor_data_desc: { id: "Data lolos verifikasi siap diisi rekening.", en: "Verified data ready for account entry.", ms: "Data disahkan sedia untuk kemasukan akaun." },
  search_actor_placeholder: { id: "Cari Nama, NIK, Usaha...", en: "Search Name, NIK, Business...", ms: "Cari Nama, NIK, Perniagaan..." },
  export_excel_btn: { id: "EKSPOR EXCEL", en: "EXPORT EXCEL", ms: "EKSPORT EXCEL" },
  print_btn: { id: "CETAK", en: "PRINT", ms: "CETAK" },
  look_detail_btn: { id: "LIHAT DETAIL", en: "VIEW DETAILS", ms: "LIHAT BUTIRAN" },
  edit_all_data_btn: { id: "Edit Semua Data", en: "Edit All Data", ms: "Edit Semua Data" },
  cancel_edit_btn: { id: "Batal Edit", en: "Cancel Edit", ms: "Batal Edit" },
  input_bank_btn: { id: "Input Rekening", en: "Enter Account", ms: "Masukkan Akaun" },
  audit_info: { id: "Informasi Sistem & Audit", en: "System & Audit Info", ms: "Maklumat Sistem & Audit" },
  input_officer: { id: "Petugas Input", en: "Input Officer", ms: "Pegawai Input" },
  reg_time: { id: "Waktu Pendaftaran", en: "Registration Time", ms: "Masa Pendaftaran" },
  // LPJ & Bank
  bank_accounts: { id: "Rekening Bank", en: "Bank Accounts", ms: "Akaun Bank" },
  distribution: { id: "Penyaluran", en: "Distribution", ms: "Penyaluran" },
  lpj_reporting: { id: "Pelaporan LPJ", en: "LPJ Reporting", ms: "Pelaporan LPJ" },
  total_nominal: { id: "Total Nominal", en: "Total Nominal", ms: "Jumlah Nominal" },
  realization: { id: "Realisasi", en: "Realization", ms: "Realisasi" },
  lpj_status: { id: "Status LPJ", en: "LPJ Status", ms: "Status LPJ" },
  wait_lpj: { id: "Menunggu LPJ", en: "Waiting for LPJ", ms: "Menunggu LPJ" },
  // User & Profile
  user_management: { id: "Manajemen Pengguna", en: "User Management", ms: "Pengurusan Pengguna" },
  profile_settings: { id: "Pengaturan Profil", en: "Profile Settings", ms: "Tetapan Profil" },
  personal_info: { id: "Informasi Pribadi", en: "Personal Information", ms: "Maklumat Peribadi" },
  change_password: { id: "Ganti Kata Sandi", en: "Change Password", ms: "Tukar Kata Laluan" },
  logout: { id: "Keluar", en: "Logout", ms: "Log Keluar" }
}

interface LanguageContextProps {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("id")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const savedLang = localStorage.getItem("app-language") as Language
    if (savedLang && ["id", "en", "ms"].includes(savedLang)) {
      setLanguageState(savedLang)
    }
    setMounted(true)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("app-language", lang)
  }

  const t = (key: string): string => {
    if (!translations[key]) return key
    return translations[key][language]
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {mounted ? children : <div className="opacity-0">{children}</div>}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useTranslation must be used within a LanguageProvider")
  }
  return context
}
