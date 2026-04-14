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
  }
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
