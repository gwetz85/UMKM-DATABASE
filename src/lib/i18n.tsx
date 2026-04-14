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
