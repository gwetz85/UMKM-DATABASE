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
    id: "Kuota KORLAP / DEWAN AKTIF",
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
  coordinator: { id: "KORLAP / DEWAN AKTIF", en: "Coordinator", ms: "Penyelaras" },
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
  access_denied: { id: "Akses Ditolak", en: "Access Denied", ms: "Akses Ditolak" },
  access_denied_desc: {
    id: "Halaman ini hanya dapat diakses oleh Administrator Sistem.",
    en: "This page can only be accessed by System Administrators.",
    ms: "Halaman ini hanya boleh diakses oleh Pentadbir Sistem."
  },
  admin_access_only_desc: {
    id: "Hanya Administrator yang dapat mengakses menu ini.",
    en: "Only Administrators can access this menu.",
    ms: "Hanya Pentadbir yang boleh mengakses menu ini."
  },
  failed: { id: "Gagal", en: "Failed", ms: "Gagal" },
  deleted: { id: "Terhapus", en: "Deleted", ms: "Dihapus" },
  // User Management
  user_management_desc: {
    id: "Kelola akses dan peranan pengguna dalam sistem.",
    en: "Manage user access and roles in the system.",
    ms: "Urus akses dan peranan pengguna dalam sistem."
  },
  add_new_user_btn: { id: "Tambah User Baru", en: "Add New User", ms: "Tambah Pengguna Baru" },
  new_user_reg_title: { id: "Pendaftaran User Baru", en: "New User Registration", ms: "Pendaftaran Pengguna Baru" },
  new_user_reg_desc: { id: "Buat akun pengguna baru dengan peranan tertentu.", en: "Create a new user account with specific roles.", ms: "Cipta akaun pengguna baru dengan peranan tertentu." },
  full_name_username: { id: "Nama Lengkap (Username)", en: "Full Name (Username)", ms: "Nama Penuh (Username)" },
  example_name: { id: "Contoh: Budi Santoso", en: "Example: Budi Santoso", ms: "Contoh: Budi Santoso" },
  create_password: { id: "Buat Kata Sandi", en: "Create Password", ms: "Cipta Kata Laluan" },
  role_position: { id: "Peranan / Jabatan", en: "Role / Position", ms: "Peranan / Jawatan" },
  save_user_data_btn: { id: "Simpan Data User", en: "Save User Data", ms: "Simpan Data Pengguna" },
  user_name: { id: "Nama User", en: "User Name", ms: "Nama Pengguna" },
  status_role: { id: "Status / Role", en: "Status / Role", ms: "Status / Peranan" },
  device_security: { id: "Keamanan Perangkat", en: "Device Security", ms: "Keselamatan Peranti" },
  action: { id: "Aksi", en: "Action", ms: "Tindakan" },
  pending_activation: { id: "Menunggu Aktivasi", en: "Pending Activation", ms: "Menunggu Pengaktifan" },
  locked_to_device: { id: "Terkunci di Perangkat", en: "Locked to Device", ms: "Terkunci pada Peranti" },
  waiting_for_login: { id: "Menunggu Login Pertama", en: "Waiting for First Login", ms: "Menunggu Log Masuk Pertama" },
  change_role_btn: { id: "Ganti Role", en: "Change Role", ms: "Tukar Peranan" },
  update_user_access_title: { id: "Update Akses Pengguna", en: "Update User Access", ms: "Kemas Kini Akses Pengguna" },
  update_user_access_desc: { id: "Ubah peranan akses untuk {name}.", en: "Change access role for {name}.", ms: "Tukar peranan akses untuk {name}." },
  save_access_btn: { id: "Simpan Akses", en: "Save Access", ms: "Simpan Akses" },
  reset_uid_title: { id: "Reset Penguncian Perangkat", en: "Reset Device Locking", ms: "Set Semula Penguncian Peranti" },
  reset_device_btn: { id: "Reset Perangkat", en: "Reset Device", ms: "Set Semula Peranti" },
  no_user_data: { id: "Belum ada data pengguna.", en: "No user data yet.", ms: "Belum ada data pengguna." },
  user_registered: { id: "User Terdaftar", en: "User Registered", ms: "Pengguna Berdaftar" },
  user_created_success: { id: "Akun untuk {name} berhasil dibuat.", en: "Account for {name} created successfully.", ms: "Akaun untuk {name} berjaya dicipta." },
  role_updated: { id: "Akses Diperbarui", en: "Access Updated", ms: "Akses Dikemas kini" },
  access_changed_for: { id: "Hak akses {name} telah diubah.", en: "Access rights for {name} have been changed.", ms: "Hak akses untuk {name} telah ditukar." },
  confirm_reset_uid: { id: "Reset penguncian perangkat untuk {name}?", en: "Reset device locking for {name}?", ms: "Set semula penguncian peranti untuk {name}?" },
  device_reset: { id: "Perangkat Direset", en: "Device Reset", ms: "Peranti Diset Semula" },
  uid_removed_for: { id: "Penguncian perangkat {name} telah dihapus.", en: "Device locking for {name} has been removed.", ms: "Penguncian peranti untuk {name} telah dialih keluar." },
  cannot_delete_self: { id: "Anda tidak dapat menghapus akun sendiri.", en: "You cannot delete your own account.", ms: "Anda tidak boleh memadam akaun sendiri." },
  confirm_delete_access: { id: "Hapus akses sistem untuk {name} secara permanen?", en: "Permanently delete system access for {name}?", ms: "Padam akses sistem untuk {name} secara kekal?" },
  user_access_revoked: { id: "Akses pengguna telah dicabut.", en: "User access has been revoked.", ms: "Akses pengguna telah dibatalkan." },
  // Settings / Excel Import
  upload_sheet_success: { id: "Import Sheet {sheet} Berhasil", en: "Sheet {sheet} Imported Successfully", ms: "Import Helaian {sheet} Berjaya" },
  data_saved_to_desc: { id: "{count} data tersimpan ke {target}.", en: "{count} data saved to {target}.", ms: "{count} data disimpan ke {target}." },
  excel_import_failed: { id: "Gagal Mengimpor Excel", en: "Excel Import Failed", ms: "Gagal Mengimport Excel" },
  check_column_format: { id: "Pastikan format kolom sudah sesuai.", en: "Ensure the column format is correct.", ms: "Pastikan format lajur adalah betul." },
  confirm_reset_all_data_warning: { id: "HAPUS SELURUH DATA SISTEM? Tindakan ini tidak dapat dibatalkan!", en: "DELETE ALL SYSTEM DATA? This action cannot be undone!", ms: "PADAM SEMUA DATA SISTEM? Tindakan ini tidak boleh dibatalkan!" },
  master_data_sheet: { id: "Sheet 1 (Master)", en: "Sheet 1 (Master)", ms: "Helaian 1 (Induk)" },
  blacklist_data_sheet: { id: "Sheet 2 (Blacklist)", en: "Sheet 2 (Blacklist)", ms: "Helaian 2 (Senarai Hitam)" },
  officer: { id: "Petugas", en: "Officer", ms: "Pegawai" },
  monitoring: { id: "Monitoring", en: "Monitoring", ms: "Pemantauan" },
  dinas: { id: "Dinas", en: "Gov Office (Dinas)", ms: "Dinas" },
  admin: { id: "Administrator", en: "Administrator", ms: "Pentadbir" },
  password: { id: "Kata Sandi", en: "Password", ms: "Kata Laluan" },
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
  coordinator: { id: "KORLAP / DEWAN AKTIF", en: "Coordinator", ms: "Penyelaras" },
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
  // Login & Registration
  access_inactive: { id: "Akses Belum Aktif", en: "Access Not Active", ms: "Akses Belum Aktif" },
  access_inactive_desc: { id: "Akun Anda sudah terdaftar. Silakan hubungi Admin untuk pemberian akses (Role).", en: "Your account is registered. Please contact Admin for role assignment.", ms: "Akaun anda sudah didaftarkan. Sila hubungi Admin untuk pemberian akses (Role)." },
  device_locked: { id: "Perangkat Terkunci", en: "Device Locked", ms: "Peranti Terkunci" },
  device_locked_desc: { id: "Akun Anda sekarang terikat pada perangkat ini.", en: "Your account is now bound to this device.", ms: "Akaun anda kini terikat pada peranti ini." },
  device_mismatch_desc: { id: "Akun terikat pada perangkat lain. Hubungi Admin untuk reset.", en: "Account is bound to another device. Contact Admin for reset.", ms: "Akaun terikat pada peranti lain. Hubungi Admin untuk set semula." },
  login_success: { id: "Login Berhasil", en: "Login Successful", ms: "Log Masuk Berjaya" },
  welcome_back: { id: "Selamat datang kembali.", en: "Welcome back.", ms: "Selamat kembali." },
  account_not_ready: { id: "Akun Belum Siap", en: "Account Not Ready", ms: "Akaun Belum Sedia" },
  waiting_admin_role: { id: "Menunggu Administrator memberikan akses/role untuk akun ini.", en: "Waiting for Administrator to provide access/role for this account.", ms: "Menunggu Pentadbir memberikan akses/peranan untuk akaun ini." },
  access_granted: { id: "Akses Diberikan", en: "Access Granted", ms: "Akses Diberikan" },
  account_registered_locked: { id: "Akun berhasil didaftarkan dan dikunci ke perangkat ini.", en: "Account successfully registered and locked to this device.", ms: "Akaun berjaya didaftarkan dan dikunci pada peranti ini." },
  invalid_credentials: { id: "Username atau kata sandi salah.", en: "Invalid username or password.", ms: "Username atau kata laluan salah." },
  username_exists: { id: "Username Sudah Ada", en: "Username Already Exists", ms: "Username Sudah Ada" },
  use_another_name_desc: { id: "Silakan gunakan nama lain atau hubungi Admin.", en: "Please use another name or contact Admin.", ms: "Sila gunakan nama lain atau hubungi Admin." },
  registration_failed: { id: "Gagal Mendaftar", en: "Registration Failed", ms: "Gagal Mendaftar" },
  connection_error: { id: "Terjadi kesalahan koneksi.", en: "Connection error occurred.", ms: "Ralat sambungan berlaku." },
  upcoming_event: { id: "EVENT MENDATANG", en: "UPCOMING EVENT", ms: "ACARA AKAN DATANG" },
  check_actor_data_btn: { id: "CEK DATA PELAKU USAHA", en: "CHECK BUSINESS ACTOR DATA", ms: "SEMAK DATA PELAKU PERNIAGAAN" },
  login_to_simpu: { id: "Masuk ke SIMPU", en: "Login to SIMPU", ms: "Log Masuk ke SIMPU" },
  registration_success: { id: "Pendaftaran Berhasil", en: "Registration Successful", ms: "Pendaftaran Berjaya" },
  registration_success_desc: { 
    id: "DATA PENDAFTARAN AKUN BARU KAMU TELAH BERHASIL.\nSILAHKAN LOGIN SETELAH ADMIN MEMVERIFIKASI AKUN KAMU MAKSIMAL 1X24JAM.\nHUBUNGI ADMIN JIKA SAMPAI BATAS WAKTU AKUN BELUM TERVERIFIKASI.", 
    en: "YOUR NEW ACCOUNT REGISTRATION IS SUCCESSFUL.\nPLEASE LOGIN AFTER ADMIN VERIFIES YOUR ACCOUNT WITHIN 24 HOURS.\nCONTACT ADMIN IF YOUR ACCOUNT IS NOT VERIFIED BY THEN.", 
    ms: "PENDAFTARAN AKAUN BARU ANDA TELAH BERJAYA.\nSILA LOG MASUK SELEPAS ADMIN MENGESAHKAN AKAUN ANDA DALAM TEMPOH 24 JAM.\nHUBUNGI ADMIN JIKA AKAUN ANDA BELUM DISAHKAN SELEPAS TEMPOH TERSEBUT." 
  },
  back_to_login_btn: { id: "Kembali ke Login", en: "Back to Login", ms: "Kembali ke Log Masuk" },
  username: { id: "Username", en: "Username", ms: "Nama Pengguna" },
  full_name_placeholder: { id: "Nama Lengkap Anda", en: "Your Full Name", ms: "Nama Penuh Anda" },
  password_placeholder: { id: "Masukkan Kata Sandi", en: "Enter Password", ms: "Masukkan Kata Laluan" },
  save_registration_btn: { id: "Simpan Pendaftaran", en: "Save Registration", ms: "Simpan Pendaftaran" },
  cancel_back_login_btn: { id: "Batal & Kembali ke Login", en: "Cancel & Back to Login", ms: "Batal & Kembali ke Log Masuk" },
  login_btn: { id: "Masuk", en: "Login", ms: "Log Masuk" },
  register_btn: { id: "Daftar", en: "Register", ms: "Daftar" },
  device_policy_title: { id: "Kebijakan Perangkat", en: "Device Policy", ms: "Dasar Peranti" },
  device_policy_desc: { id: "Kebijakan 1 User 1 Perangkat Aktif", en: "1 User 1 Active Device Policy", ms: "Dasar 1 Pengguna 1 Peranti Aktif" },
  secretariat: { id: "Sekretariat", en: "Secretariat", ms: "Sekretariat" },
  secretariat_address: { id: "JALAN GATOT SUBROTO ( DEPAN RAWASARI ) DEKAT CUCIAN MOBIL STARWASH", en: "GATOT SUBROTO STREET (IN FRONT OF RAWASARI) NEAR STARWASH CAR WASH", ms: "JALAN GATOT SUBROTO (DEPAN RAWASARI) BERDEKATAN CUCIAN KERETA STARWASH" },
  office_contact: { id: "KONTAK OFFICE", en: "OFFICE CONTACT", ms: "HUBUNGI PEJABAT" },
  app_developer: { id: "Pengembang Aplikasi", en: "Application Developer", ms: "Pembangun Aplikasi" },
  developer_name: { id: "AGUS SURIYADI", en: "AGUS SURIYADI", ms: "AGUS SURIYADI" },
  developer_address: { id: "JL DAENG HAJI MEKAH NO 23 TANJUNGPINANG", en: "JL DAENG HAJI MEKAH NO 23 TANJUNGPINANG", ms: "JL DAENG HAJI MEKAH NO 23 TANJUNGPINANG" },
  contact: { id: "KONTAK", en: "CONTACT", ms: "HUBUNGI" },
  system_footer: { id: "Sistem Informasi Manajemen Pelaku Usaha © 2026", en: "Business Actor Management Information System © 2026", ms: "Sistem Maklumat Pengurusan Pelaku Perniagaan © 2026" },
  logout: { id: "Keluar", en: "Logout", ms: "Log Keluar" },
  update_profile: { id: "Update Profil", en: "Update Profile", ms: "Kemas Kini Profil" },
  update_profile_desc: { id: "Lengkapi data diri anda untuk keamanan akun.", en: "Complete your personal data for account security.", ms: "Lengkapkan data peribadi anda untuk keselamatan akaun." },
  account_info_personal: { id: "Informasi Akun & Pribadi", en: "Account & Personal Information", ms: "Maklumat Akaun & Peribadi" },
  readonly_profile_hint: { id: "Beberapa data hanya dapat diubah oleh Administrator.", en: "Some data can only be changed by Administrator.", ms: "Beberapa data hanya boleh diubah oleh Pentadbir." },
  save_profile_data_btn: { id: "Simpan Data Profil", en: "Save Profile Data", ms: "Simpan Data Profil" },
  login_first: { id: "Silakan Login Terlebih Dahulu", en: "Please Login First", ms: "Sila Log Masuk Terlebih Dahulu" },
  login_first_desc: { id: "Anda harus masuk ke sistem untuk mengakses halaman ini.", en: "You must enter the system to access this page.", ms: "Anda mesti masuk ke sistem untuk mengakses halaman ini." },
  login_system_btn: { id: "Masuk ke Sistem", en: "Login to System", ms: "Log Masuk ke Sistem" },
  unsynced_data: { id: "Data Belum Sinkron", en: "Data Not Synced", ms: "Data Belum Selaras" },
  unsynced_data_desc: { id: "Email {email} belum terhubung sempurna dengan database profil.", en: "Email {email} is not fully connected to the profile database.", ms: "E-mel {email} belum disambungkan sepenuhnya dengan pangkalan data profil." },
  reload_hint: { id: "Klik tombol di bawah untuk mencoba memuat ulang.", en: "Click the button below to try reloading.", ms: "Klik butang di bawah untuk cuba memuatkan semula." },
  reload_page_btn: { id: "Muat Ulang Halaman", en: "Reload Page", ms: "Muat Semula Halaman" },
  error_reading_image: { id: "Gagal membaca gambar.", en: "Failed to read image.", ms: "Gagal membaca imej." },
  error_reading_file: { id: "Gagal membaca file.", en: "Failed to read file.", ms: "Gagal membaca fail." },
  photo_updated_success: { id: "Foto Profil Diperbarui", en: "Profile Photo Updated", ms: "Foto Profil Dikemas Kini" },
  photo_saved_desc: { id: "Foto profil anda telah berhasil disimpan.", en: "Your profile photo has been successfully saved.", ms: "Foto profil anda telah berjaya disimpan." },
  upload_failed: { id: "Upload Gagal", en: "Upload Failed", ms: "Muat Naik Gagal" },
  error_label: { id: "Kesalahan", en: "Error", ms: "Ralat" },
  process_photo_error: { id: "Terjadi kesalahan saat memproses foto.", en: "Error occurred while processing photo.", ms: "Ralat berlaku semasa memproses foto." },
  profile_updated: { id: "Profil Diperbarui", en: "Profile Updated", ms: "Profil Dikemas Kini" },
  profile_saved_desc: { id: "Informasi profil anda telah berhasil disimpan.", en: "Your profile information has been successfully saved.", ms: "Maklumat profil anda telah berjaya disimpan." },
  save_failed: { id: "Simpan Gagal", en: "Save Failed", ms: "Simpan Gagal" },
  profile_update_error: { id: "Gagal menyimpan perubahan profil.", en: "Failed to save profile changes.", ms: "Gagal menyimpan perubahan profil." },
  // Bank keys
  bank: { id: "Bank", en: "Bank", ms: "Bank" },
  bank_rekening_desc: { id: "Daftar rekening bank pelaku usaha yang sudah siap proses.", en: "List of business actor bank accounts ready for processing.", ms: "Senarai akaun bank pelaku usaha yang sedia untuk diproses." },
  bank_rekening_desc_selected: { id: "Daftar rekening bank pelaku usaha khusus Bank {bank}.", en: "List of business actor bank accounts specifically for Bank {bank}.", ms: "Senarai akaun bank pelaku usaha khusus untuk Bank {bank}." },
  print_data_btn: { id: "Cetak Data", en: "Print Data", ms: "Cetak Data" },
  all_banks: { id: "Semua Bank", en: "All Banks", ms: "Semua Bank" },
  printed_at: { id: "Dicetak pada", en: "Printed at", ms: "Dicetak pada" },
  loading_bank_data: { id: "Memuat Data Perbankan...", en: "Loading Bank Data...", ms: "Memuatkan Data Perbankan..." },
  data_actor: { id: "Data Pelaku", en: "Actor Data", ms: "Data Pelaku" },
  forward_to_lpj_btn: { id: "Teruskan ke LPJ", en: "Forward to LPJ", ms: "Teruskan ke LPJ" },
  bank_account_number: { id: "Nomor Rekening", en: "Account Number", ms: "Nombor Akaun" },
  bank_name_label: { id: "Nama Bank", en: "Bank Name", ms: "Nama Bank" },
  nominal: { id: "Nominal", en: "Nominal", ms: "Nominal" },
  no_data: { id: "Tidak Ada Data", en: "No Data", ms: "Tiada Data" },
  no_bank_data_desc: { id: "Belum ada data rekening bank yang dapat ditampilkan.", en: "No bank account data available to display.", ms: "Tiada data akaun bank yang dapat dipaparkan." },
  information: { id: "Informasi", en: "Information", ms: "Maklumat" },
  all_data_forwarded_to_lpj: { id: "Semua data dalam grup ini sudah diteruskan ke LPJ.", en: "All data in this group has been forwarded to LPJ.", ms: "Semua data dalam kumpulan ini telah diteruskan ke LPJ." },
  confirm_forward_to_lpj: { id: "Teruskan {count} data dari bank {bank} ke antrean LPJ?", en: "Forward {count} data from bank {bank} to LPJ queue?", ms: "Teruskan {count} data dari bank {bank} ke giliran LPJ?" },
  successfully_forwarded: { id: "Berhasil Diteruskan", en: "Successfully Forwarded", ms: "Berjaya Diteruskan" },
  data_sent_to_lpj_queue: { id: "{count} data telah dikirim ke antrean LPJ.", en: "{count} data have been sent to the LPJ queue.", ms: "{count} data telah dihantar ke giliran LPJ." },
  data_saved: { id: "Data Berhasil Disimpan", en: "Data Saved Successfully", ms: "Data Berjaya Disimpan" },
  update_success: { id: "Berhasil Diperbarui", en: "Updated Successfully", ms: "Berjaya Dikemas Kini" },
  delete_success: { id: "Berhasil Dihapus", en: "Deleted Successfully", ms: "Berjaya Dihapus" },
  // Gov & Bank Verification
  verifikasi_validasi_dinas: { id: "Verifikasi & Validasi Dinas", en: "Gov Verification & Validation", ms: "Pengesahan & Pengesahan Dinas" },
  verifikasi_bank: { id: "Verifikasi Bank", en: "Bank Verification", ms: "Pengesahan Bank" },
  total_data_with_val: { id: "Total Data: {count}", en: "Total Data: {count}", ms: "Jumlah Data: {count}" },
  verifikasi_dinas_desc: { id: "Lakukan verifikasi tingkat dinas untuk data pelaku usaha yang telah diloloskan Admin.", en: "Perform gov-level verification for business actor data cleared by Admin.", ms: "Lakukan pengesahan tahap dinas untuk data pelaku perniagaan yang telah diluluskan oleh Admin." },
  verifikasi_bank_desc: { id: "Validasi data rekening bank pelaku usaha untuk proses pencairan.", en: "Validate business actor bank account data for disbursement process.", ms: "Sahkan data akaun bank pelaku perniagaan untuk proses pencairan." },
  search_placeholder_dinas: { id: "Cari Nama, NIK, atau Usaha...", en: "Search Name, NIK, or Business...", ms: "Cari Nama, NIK, atau Perniagaan..." },
  no_data_dinas: { id: "Tidak ada data untuk diverifikasi Dinas.", en: "No data for Gov verification.", ms: "Tiada data untuk pengesahan Dinas." },
  no_data_bank: { id: "Tidak ada data untuk verifikasi Bank.", en: "No data for Bank verification.", ms: "Tiada data untuk pengesahan Bank." },
  detail_pelaku_usaha: { id: "Detail Pelaku Usaha", en: "Business Actor Details", ms: "Butiran Pelaku Perniagaan" },
  informasi_pribadi: { id: "Informasi Pribadi", en: "Personal Information", ms: "Maklumat Peribadi" },
  alamat_domisili: { id: "Alamat & Domisili", en: "Address & Domicile", ms: "Alamat & Domisil" },
  informasi_usaha: { id: "Informasi Usaha", en: "Business Information", ms: "Maklumat Perniagaan" },
  informasi_perbankan: { id: "Informasi Perbankan", en: "Banking Information", ms: "Maklumat Perbankan" },
  audit_sistem: { id: "Audit Sistem", en: "System Audit", ms: "Audit Sistem" },
  hasil_verifikasi: { id: "Hasil Verifikasi", en: "Verification Result", ms: "Keputusan Pengesahan" },
  keterangan_alasan: { id: "Keterangan / Alasan", en: "Description / Reason", ms: "Keterangan / Alasan" },
  simpan_keputusan: { id: "Simpan Keputusan", en: "Save Decision", ms: "Simpan Keputusan" },
  berhasil_difinalisasi: { id: "Berhasil Difinalisasi", en: "Successfully Finalized", ms: "Berjaya Dimuktamadkan" },
  data_finalisasi_desc: { id: "Data pelaku usaha telah di-update dengan hasil: {result}.", en: "Business actor data has been updated with result: {result}.", ms: "Data pelaku perniagaan telah dikemas kini dengan keputusan: {result}." },
  verify_bank_btn: { id: "Verifikasi Bank", en: "Verify Bank", ms: "Sahkan Bank" },
  bank_verified_success: { id: "Bank Berhasil Diverifikasi", en: "Bank Successfully Verified", ms: "Bank Berjaya Disahkan" },
  bank_verified_desc: { id: "Status perbankan untuk {name} telah diperbarui.", en: "Banking status for {name} has been updated.", ms: "Status perbankan untuk {name} telah dikemas kini." },
  // General Status & UI
  total_data: { id: "Total Data", en: "Total Data", ms: "Jumlah Data" },
  search_placeholder: { id: "Cari...", en: "Search...", ms: "Cari..." },
  nama_lengkap: { id: "Nama Lengkap", en: "Full Name", ms: "Nama Penuh" },
  kategori: { id: "Kategori", en: "Category", ms: "Kategori" },
  usaha: { id: "Usaha", en: "Business", ms: "Perniagaan" },
  aksi: { id: "Aksi", en: "Action", ms: "Tindakan" },
  status: { id: "Status", en: "Status", ms: "Status" },
  input_by: { id: "Diinput Oleh", en: "Input By", ms: "Dimasukkan Oleh" },
  input_time: { id: "Waktu Input", en: "Input Time", ms: "Masa Input" },
  cancel: { id: "Batal", en: "Cancel", ms: "Batal" },
  save: { id: "Simpan", en: "Save", ms: "Simpan" },
  loading: { id: "Memuat...", en: "Loading...", ms: "Memuatkan..." },
  failed: { id: "Gagal", en: "Failed", ms: "Gagal" },
  success: { id: "Berhasil", en: "Success", ms: "Berjaya" },
  error: { id: "Kesalahan", en: "Error", ms: "Ralat" },
  // Remaining Roles/Labels
  korlap_dewan: { id: "KORLAP / DEWAN AKTIF", en: "COORDINATOR", ms: "KORDINATOR" },
  // Coordinator Quota
  coordinator_quota: { id: "Kuota KORLAP / DEWAN AKTIF", en: "Coordinator Quota", ms: "Kuota Kordinator" },
  manage_quotas_desc: { id: "Atur batas maksimal input data untuk setiap korlap / dewan aktif.", en: "Set maximum data input limits for each coordinator.", ms: "Tetapkan had input data maksimum untuk setiap kordinator." },
  add_coordinator: { id: "Tambah KORLAP / DEWAN AKTIF", en: "Add Coordinator", ms: "Tambah Kordinator" },
  edit_coordinator: { id: "Edit KORLAP / DEWAN AKTIF", en: "Edit Coordinator", ms: "Edit Kordinator" },
  quota_amount: { id: "Jumlah Kuota", en: "Quota Amount", ms: "Jumlah Kuota" },
  quota_updated: { id: "Kuota Diperbarui", en: "Quota Updated", ms: "Kuota Dikemas Kini" },
  quota_saved_desc: { id: "Batas kuota untuk {name} telah disimpan.", en: "Quota limit for {name} has been saved.", ms: "Had kuota untuk {name} telah disimpan." },
  confirm_delete_coordinator: { id: "Hapus koordinator {name}?", en: "Delete coordinator {name}?", ms: "Padam kordinator {name}?" },
  // Common Fields
  place_of_birth: { id: "Tempat Lahir", en: "Place of Birth", ms: "Tempat Lahir" },
  date_of_birth: { id: "Tanggal Lahir", en: "Date of Birth", ms: "Tarikh Lahir" },
  place_date_of_birth: { id: "Tempat/Tgl Lahir", en: "Place/Date of Birth", ms: "Tempat/Tarikh Lahir" },
  gender: { id: "Jenis Kelamin", en: "Gender", ms: "Jantina" },
  phone_number: { id: "Nomor HP", en: "Phone Number", ms: "Nombor HP" },
  family_card_number: { id: "Nomor KK", en: "Family Card No", ms: "Nombor KK" },
  address: { id: "Alamat", en: "Address", ms: "Alamat" },
  district: { id: "Kecamatan", en: "District", ms: "Kecamatan" },
  subdistrict: { id: "Kelurahan", en: "Subdistrict", ms: "Kelurahan" },
  rt_rw: { id: "RT/RW", en: "RT/RW", ms: "RT/RW" },
  business_location: { id: "Lokasi Usaha", en: "Business Location", ms: "Lokasi Perniagaan" },
  business_category: { id: "Kategori Usaha", en: "Business Category", ms: "Kategori Perniagaan" },
  re_enter_password: { id: "Masukkan Ulang Kata Sandi", en: "Re-enter Password", ms: "Masukkan Semula Kata Laluan" },
  password_mismatch: { id: "Kata sandi tidak cocok.", en: "Passwords do not match.", ms: "Kata laluan tidak sepadan." },
  office_hours_title: { id: "Waktu Operasional Kantor", en: "Office Operational Hours", ms: "Waktu Operasi Pejabat" },
  new_user_reg_title: { id: "Pendaftaran User Baru", en: "New User Registration", ms: "Pendaftaran Pengguna Baru" },
  // Finish & Rejected Pages
  finish_data_report: { id: "LAPORAN DATA PELAKU USAHA (SIMPU)", en: "BUSINESS ACTOR DATA REPORT (SIMPU)", ms: "LAPORAN DATA PELAKU PERNIAGAAN (SIMPU)" },
  finish_title: { id: "Selesai", en: "Finished", ms: "Selesai" },
  finish_desc: { id: "Arsip data yang telah dinyatakan SELESAI.", en: "Archive of data that has been completed.", ms: "Arkib data yang telah diselesaikan." },
  filter_coordinator_label: { id: "Filter KORLAP / DEWAN AKTIF: {name}", en: "Coordinator Filter: {name}", ms: "Penapis Kordinator: {name}" },
  no_finish_data_found: { id: "Tidak ada data selesai yang ditemukan.", en: "No finished data found.", ms: "Tiada data selesai ditemui." },
  edit_finish_data: { id: "Edit Data Selesai", en: "Edit Finished Data", ms: "Edit Data Selesai" },
  full_detail_final_data: { id: "Detail Lengkap Data Final", en: "Full Detail Final Data", ms: "Butiran Penuh Data Akhir" },
  cancel_edit: { id: "Batal Edit", en: "Cancel Edit", ms: "Batal Edit" },
  edit_all_data: { id: "Edit Semua Data", en: "Edit All Data", ms: "Edit Semua Data" },
  revert: { id: "Kembalikan", en: "Revert", ms: "Kembalikan" },
  nominal_reported_lpj: { id: "Nominal LPJ Terlaporkan", en: "Reported LPJ Amount", ms: "Jumlah LPJ Dilaporkan" },
  lpj_verification_status: { id: "Status Verifikasi LPJ", en: "LPJ Verification Status", ms: "Status Pengesahan LPJ" },
  verified_lpj: { id: "TELAH TERVERIFIKASI", en: "VERIFIED", ms: "TELAH DISAHKAN" },
  rejected_cancel_report: { id: "LAPORAN DATA DITOLAK / CANCEL (SIMPU)", en: "REJECTED / CANCEL DATA REPORT (SIMPU)", ms: "LAPORAN DATA DITOLAK / BATAL (SIMPU)" },
  rejected_data_title: { id: "Data Ditolak / Batal", en: "Rejected / Cancelled Data", ms: "Data Ditolak / Batal" },
  rejected_data_desc: { id: "Arsip data yang ditolak oleh Administrator.", en: "Archive of data rejected by Administrator.", ms: "Arkib data yang ditolak oleh Pentadbir." },
  no_rejected_data_found: { id: "Tidak ada data ditolak yang ditemukan.", en: "No rejected data found.", ms: "Tiada data ditolak ditemui." },
  edit_rejected_data: { id: "Edit Data Ditolak", en: "Edit Rejected Data", ms: "Edit Data Ditolak" },
  full_detail_rejected_data: { id: "Detail Lengkap Data Ditolak/Batal", en: "Full Detail Rejected/Cancelled Data", ms: "Butiran Penuh Data Ditolak/Batal" },
  rejection_reason_edit: { id: "Alasan Penolakan (Edit)", en: "Rejection Reason (Edit)", ms: "Sebab Penolakan (Edit)" },
  rejection_reason_placeholder: { id: "Masukkan alasan penolakan", en: "Enter rejection reason", ms: "Masukkan sebab penolakan" },
  rejection_reason_label: { id: "Alasan Penolakan:", en: "Rejection Reason:", ms: "Sebab Penolakan:" },
  no_rejection_reason_desc: { id: "Administrator tidak memberikan alasan spesifik.", en: "Administrator did not provide a specific reason.", ms: "Pentadbir tidak memberikan sebab khusus." },
  // Coordinator Quota
  kuota_korlap_dewan_aktif: { id: "Kuota KORLAP / DEWAN AKTIF", en: "COORDINATOR QUOTA", ms: "KUOTA KORDINATOR" },
  manage_quotas_desc_long: { id: "Pengelolaan target data pencapaian masing-masing KORLAP / DEWAN AKTIF.", en: "Management of achievement data targets for each coordinator.", ms: "Pengurusan sasaran data pencapaian bagi setiap kordinator." },
  add_new_quota_btn: { id: "Tambah Kuota Baru", en: "Add New Quota", ms: "Tambah Kuota Baru" },
  add_quota_data: { id: "Tambah Data Kuota", en: "Add Quota Data", ms: "Tambah Data Kuota" },
  add_quota_data_desc: { id: "Masukkan nama KORLAP / DEWAN AKTIF dan jumlah target kuotanya.", en: "Enter coordinator name and target quota amount.", ms: "Masukkan nama kordinator dan jumlah sasaran kuota." },
  coordinator_name: { id: "Nama KORLAP / DEWAN AKTIF", en: "Coordinator Name", ms: "Nama Kordinator" },
  save_data_btn: { id: "Simpan Data", en: "Save Data", ms: "Simpan Data" },
  no: { id: "No", en: "No", ms: "No" },
  achieved: { id: "Tercapai", en: "Achieved", ms: "Tercapai" },
  remaining: { id: "Sisa", en: "Remaining", ms: "Baki" },
  edit_btn: { id: "EDIT", en: "EDIT", ms: "EDIT" },
  edit_quota_data: { id: "Edit Data Kuota", en: "Edit Quota Data", ms: "Edit Data Kuota" },
  edit_quota_data_desc: { id: "Ubah target kuota untuk {name}.", en: "Change target quota for {name}.", ms: "Ubah sasaran kuota untuk {name}." },
  save_changes_btn: { id: "Simpan Perubahan", en: "Save Changes", ms: "Simpan Perubahan" },
  no_quota_data: { id: "Belum ada data target kuota yang didaftarkan.", en: "No target quota data registered yet.", ms: "Tiada data sasaran kuota didaftarkan lagi." },
  total_overall_quota: { id: "Total Keseluruhan Kuota Data", en: "Total Overall Data Quota", ms: "Jumlah Keseluruhan Kuota Data" },
  // Bank Account Status
  selesai: { id: "SELESAI", en: "FINISHED", ms: "SELESAI" },
  ditolak: { id: "DITOLAK", en: "REJECTED", ms: "DITOLAK" },
  // Toasts
  quota_added: { id: "Kuota Ditambahkan", en: "Quota Added", ms: "Kuota Ditambah" },
  quota_added_desc: { id: "Data untuk {name} berhasil disimpan.", en: "Data for {name} saved successfully.", ms: "Data untuk {name} berjaya disimpan." },
  fail_add_data: { id: "Gagal Menambah Data", en: "Failed to Add Data", ms: "Gagal Menambah Data" },
  fail_update_data: { id: "Gagal Update Data", en: "Failed to Update Data", ms: "Gagal Kemas Kini Data" },
  // Common Buttons
  print_btn: { id: "CETAK", en: "PRINT", ms: "CETAK" },
  approve_btn: { id: "SETUJU", en: "APPROVE", ms: "SETUJU" },
  revert_btn: { id: "BATAL", en: "REVERT", ms: "BATAL" },
  // Verification page additions
  verification_success: { id: "Verifikasi Berhasil", en: "Verification Successful", ms: "Pengesahan Berjaya" },
  final_verification_success_desc: { id: "Data telah lolos verifikasi final dan masuk tahap LPJ.", en: "Data has passed final verification and entered LPJ stage.", ms: "Data telah lulus pengesahan akhir dan masuk ke peringkat LPJ." },
  confirm_revert_to_pending: { id: "Kembalikan {name} ke antrean awal (Pending)?", en: "Return {name} to initial queue (Pending)?", ms: "Kembalikan {name} ke giliran awal (Pending)?" },
  verification_cancelled: { id: "Verifikasi Dibatalkan", en: "Verification Cancelled", ms: "Pengesahan Dibatalkan" },
  reverted_to_pending_desc: { id: "Data dikembalikan ke antrean verifikasi awal.", en: "Data returned to the initial verification queue.", ms: "Data dikembalikan ke giliran pengesahan awal." },
  confirm_delete_permanent: { id: "Hapus permanen {name}? Semua data terkait akan hilang.", en: "Permanently delete {name}? All related data will be lost.", ms: "Padam kekal {name}? Semua data berkaitan akan hilang." },
  data_deleted_desc: { id: "Data telah dihapus dari sistem.", en: "Data has been deleted from the system.", ms: "Data telah dipadamkan daripada sistem." },
  admin_permission_required_desc: { id: "Anda tidak memiliki izin Administrator untuk mengakses menu ini.", en: "You do not have Administrator permission to access this menu.", ms: "Anda tidak mempunyai kebenaran Pentadbir untuk mengakses menu ini." },
  final_verification_title: { id: "Verifikasi Data (Final)", en: "Data Verification (Final)", ms: "Pengesahan Data (Akhir)" },
  final_verification_desc: { id: "Persetujuan akhir sebelum data dinyatakan SELESAI.", en: "Final approval before data is declared FINISHED.", ms: "Kelulusan akhir sebelum data diisytiharkan SELESAI." },
  no_data_final_verification: { id: "Tidak ada data yang menunggu persetujuan final.", en: "No data waiting for final approval.", ms: "Tiada data menunggu kelulusan akhir." },
}

interface LanguageContextProps {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
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

  const t = (key: string, params?: Record<string, string | number>): string => {
    if (!translations[key]) return key
    let text = translations[key][language]
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v))
      })
    }
    return text
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
