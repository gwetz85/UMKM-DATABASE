"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useUser, useDatabase, useMemoFirebase, useList } from "@/firebase"
import { ref, push, set, update, remove } from "firebase/database"
import { useNavigation } from "@/hooks/use-navigation"
import { useToast } from "@/hooks/use-toast"
import { useSoundEffect } from "@/hooks/use-sound-effect"
import { extractDobFromNik, cn } from "@/lib/utils"
import { DataHold, DataHoldKelengkapanBerkas } from "@/app/lib/types"

import {
  PauseCircle,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  FileDown,
  Trash2,
  Edit3,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Store,
  MapPin,
  FileText,
  User,
  ShieldAlert,
  RotateCcw,
  Save,
  Check,
  X,
  Copy,
  FolderClock,
  AlertCircle
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ConfirmDialog } from "@/components/confirm-dialog"
import ExcelJS from "exceljs"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// Helper function to format date into Indonesian string
function formatDateTimeIndo(dateStr?: string): string {
  if (!dateStr) return "-"
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }) + " WIB"
  } catch {
    return dateStr
  }
}

function getWaLink(phoneStr: string) {
  if (!phoneStr) return "#"
  let clean = String(phoneStr).replace(/\D/g, "")
  if (clean.startsWith("0")) clean = "62" + clean.slice(1)
  else if (!clean.startsWith("62")) clean = "62" + clean
  return `https://wa.me/${clean}`
}

export default function DataHoldPage() {
  const router = useRouter()
  const { user, userProfile, isUserLoading } = useUser()
  const database = useDatabase()
  const { isAdmin, isPetugas, isStaff } = useNavigation()
  const { toast } = useToast()
  const { playSound } = useSoundEffect()

  // Data Hold realtime query from Firebase
  const holdRef = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, "data_hold")
  }, [database])
  const { data: rawHoldList, isLoading: isListLoading } = useList(holdRef)

  // Map raw Firebase objects into DataHold[]
  const holdList: DataHold[] = useMemo(() => {
    if (!rawHoldList) return []
    return rawHoldList.map((item: any) => ({
      id: item.id || item.key,
      fullName: item.fullName || "",
      nik: item.nik || "",
      pob: item.pob || "",
      dob: item.dob || "",
      pobDob: item.pobDob || (item.pob && item.dob ? `${item.pob}, ${item.dob}` : item.pob || item.dob || ""),
      address: item.address || "",
      noKK: item.noKK || "",
      phone: item.phone || "",
      businessName: item.businessName || "",
      businessAddress: item.businessAddress || "",
      kelengkapanBerkas: {
        ktp: Boolean(item.kelengkapanBerkas?.ktp),
        kk: Boolean(item.kelengkapanBerkas?.kk),
        nib: Boolean(item.kelengkapanBerkas?.nib),
        photoUsaha: Boolean(item.kelengkapanBerkas?.photoUsaha)
      },
      catatan: item.catatan || "",
      createdBy: item.createdBy || "Petugas",
      createdById: item.createdById || "",
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
      status: item.status || "hold"
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [rawHoldList])

  // State: Filter & Search (Admin View)
  const [searchTerm, setSearchTerm] = useState("")
  const [berkasFilter, setBerkasFilter] = useState<"all" | "lengkap" | "belum_lengkap">("all")

  // State: Modal Form (Add / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DataHold | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form Fields State
  const [formFullName, setFormFullName] = useState("")
  const [formNik, setFormNik] = useState("")
  const [formPob, setFormPob] = useState("")
  const [formDob, setFormDob] = useState("")
  const [formNoKk, setFormNoKk] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formAddress, setFormAddress] = useState("")
  const [formBusinessName, setFormBusinessName] = useState("")
  const [formBusinessAddress, setFormBusinessAddress] = useState("")
  const [formBerkas, setFormBerkas] = useState<DataHoldKelengkapanBerkas>({
    ktp: false,
    kk: false,
    nib: false,
    photoUsaha: false
  })
  const [formCatatan, setFormCatatan] = useState("")

  // State: Detail Modal
  const [viewingItem, setViewingItem] = useState<DataHold | null>(null)

  // State: Delete Confirm Modal
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Reset form fields
  const resetForm = () => {
    setFormFullName("")
    setFormNik("")
    setFormPob("")
    setFormDob("")
    setFormNoKk("")
    setFormPhone("")
    setFormAddress("")
    setFormBusinessName("")
    setFormBusinessAddress("")
    setFormBerkas({ ktp: false, kk: false, nib: false, photoUsaha: false })
    setFormCatatan("")
    setEditingItem(null)
  }

  // Open modal for new entry
  const handleOpenAddForm = () => {
    resetForm()
    setIsFormOpen(true)
  }

  // Open modal for editing
  const handleOpenEditForm = (item: DataHold) => {
    setEditingItem(item)
    setFormFullName(item.fullName)
    setFormNik(item.nik)
    setFormPob(item.pob || "")
    setFormDob(item.dob || "")
    setFormNoKk(item.noKK || "")
    setFormPhone(item.phone || "")
    setFormAddress(item.address || "")
    setFormBusinessName(item.businessName || "")
    setFormBusinessAddress(item.businessAddress || "")
    setFormBerkas(item.kelengkapanBerkas || { ktp: false, kk: false, nib: false, photoUsaha: false })
    setFormCatatan(item.catatan || "")
    setIsFormOpen(true)
  }

  // Handle NIK input with auto-DOB extraction
  const handleNikChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 16)
    setFormNik(clean)
    if (clean.length >= 12 && !formDob) {
      const extracted = extractDobFromNik(clean)
      if (extracted) {
        setFormDob(extracted)
      }
    }
  }

  // Submit Handler for Form (Save to Firebase `data_hold`)
  const handleSaveHoldData = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!database || !user) {
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: "Sesi login tidak valid." })
      return
    }

    if (!formFullName.trim() || !formNik.trim() || !formBusinessName.trim()) {
      toast({ variant: "destructive", title: "Form Belum Lengkap", description: "Nama Lengkap, NIK, dan Nama Usaha wajib diisi." })
      return
    }

    setIsSubmitting(true)
    try {
      const cleanNik = formNik.trim().replace(/\D/g, "")
      const cleanKk = formNoKk.trim().replace(/\D/g, "")
      const pobDobVal = formPob.trim() && formDob.trim()
        ? `${formPob.trim()}, ${formDob.trim()}`
        : formPob.trim() || formDob.trim() || ""

      const payload = {
        fullName: formFullName.trim().toUpperCase(),
        nik: cleanNik,
        pob: formPob.trim().toUpperCase(),
        dob: formDob.trim(),
        pobDob: pobDobVal,
        noKK: cleanKk,
        phone: formPhone.trim(),
        address: formAddress.trim(),
        businessName: formBusinessName.trim(),
        businessAddress: formBusinessAddress.trim(),
        kelengkapanBerkas: {
          ktp: Boolean(formBerkas.ktp),
          kk: Boolean(formBerkas.kk),
          nib: Boolean(formBerkas.nib),
          photoUsaha: Boolean(formBerkas.photoUsaha)
        },
        catatan: formCatatan.trim(),
        updatedAt: new Date().toISOString(),
        status: "hold"
      }

      if (editingItem) {
        // Update existing record
        await update(ref(database, `data_hold/${editingItem.id}`), payload)
        toast({ title: "✅ Data Hold Diperbarui", description: `Data pelaku usaha ${payload.fullName} berhasil diperbarui.` })
      } else {
        // Create new record
        const newRef = push(ref(database, "data_hold"))
        const officerName = userProfile?.fullName || user.displayName || user.email || "Petugas"
        await set(newRef, {
          ...payload,
          id: newRef.key,
          createdBy: officerName,
          createdById: user.uid,
          createdAt: new Date().toISOString()
        })
        toast({ title: "✅ Data Hold Berhasil Disimpan", description: `Data pelaku usaha ${payload.fullName} berhasil dicatat ke Data Hold.` })
      }

      playSound("success")
      resetForm()
      setIsFormOpen(false)
    } catch (err: any) {
      console.error("Save data hold error:", err)
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: err?.message || "Terjadi kesalahan saat menyimpan data hold." })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!database || !deletingId) return
    setIsDeleting(true)
    try {
      await remove(ref(database, `data_hold/${deletingId}`))
      toast({ title: "🗑️ Data Hold Dihapus", description: "Data berhasil dihapus dari database Data Hold." })
      playSound("click")
      setDeletingId(null)
    } catch (err: any) {
      console.error("Delete error:", err)
      toast({ variant: "destructive", title: "Gagal Menghapus", description: err?.message || "Terjadi kesalahan sistem." })
    } finally {
      setIsDeleting(false)
    }
  }

  // Filtered List for Table (Admin)
  const filteredList = useMemo(() => {
    return holdList.filter((item) => {
      // 1. Text Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim()
        const matchName = item.fullName.toLowerCase().includes(q)
        const matchNik = item.nik.includes(q)
        const matchKk = item.noKK.includes(q)
        const matchPhone = item.phone.includes(q)
        const matchBusiness = item.businessName.toLowerCase().includes(q)
        const matchAddress = item.address.toLowerCase().includes(q)
        const matchOfficer = item.createdBy?.toLowerCase().includes(q)
        if (!matchName && !matchNik && !matchKk && !matchPhone && !matchBusiness && !matchAddress && !matchOfficer) {
          return false
        }
      }

      // 2. Berkas Filter
      const isLengkap = item.kelengkapanBerkas.ktp && item.kelengkapanBerkas.kk && item.kelengkapanBerkas.nib && item.kelengkapanBerkas.photoUsaha
      if (berkasFilter === "lengkap" && !isLengkap) return false
      if (berkasFilter === "belum_lengkap" && isLengkap) return false

      return true
    })
  }, [holdList, searchTerm, berkasFilter])

  // Count Statistics
  const stats = useMemo(() => {
    const total = holdList.length
    const lengkap = holdList.filter(i => i.kelengkapanBerkas.ktp && i.kelengkapanBerkas.kk && i.kelengkapanBerkas.nib && i.kelengkapanBerkas.photoUsaha).length
    const belumLengkap = total - lengkap
    const todayStr = new Date().toISOString().split("T")[0]
    const today = holdList.filter(i => i.createdAt && i.createdAt.startsWith(todayStr)).length
    return { total, lengkap, belumLengkap, today }
  }, [holdList])

  // Helper count checklist documents
  const getBerkasScore = (b: DataHoldKelengkapanBerkas) => {
    let count = 0
    if (b.ktp) count++
    if (b.kk) count++
    if (b.nib) count++
    if (b.photoUsaha) count++
    return count
  }

  // =========================================================================
  // EXCEL EXPORT (EXCELJS)
  // =========================================================================
  const handleExportExcel = async () => {
    if (filteredList.length === 0) {
      toast({ variant: "destructive", title: "Tidak Ada Data", description: "Tidak ada data hold untuk di-ekspor." })
      return
    }

    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet("Data Hold UMKM")

      // Title & Header Block
      worksheet.mergeCells("A1:Q1")
      const title1 = worksheet.getCell("A1")
      title1.value = "PEMERINTAH PROVINSI KEPULAUAN RIAU"
      title1.font = { bold: true, size: 14, color: { argb: "FF0F172A" } }
      title1.alignment = { horizontal: "center", vertical: "middle" }

      worksheet.mergeCells("A2:Q2")
      const title2 = worksheet.getCell("A2")
      title2.value = "DINAS KOPERASI DAN USAHA KECIL MENENGAH — SISTEM SIMPU"
      title2.font = { bold: true, size: 12, color: { argb: "FF0F172A" } }
      title2.alignment = { horizontal: "center", vertical: "middle" }

      worksheet.mergeCells("A3:Q3")
      const title3 = worksheet.getCell("A3")
      title3.value = "DAFTAR DATA HOLD PELAKU USAHA (PENGAJUAN TERPENDING)"
      title3.font = { bold: true, size: 13, color: { argb: "FFD97706" } } // Amber
      title3.alignment = { horizontal: "center", vertical: "middle" }

      worksheet.mergeCells("A4:Q4")
      const title4 = worksheet.getCell("A4")
      title4.value = `Tanggal Ekspor: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })} | Total: ${filteredList.length} Pelaku Usaha`
      title4.font = { italic: true, size: 10, color: { argb: "FF475569" } }
      title4.alignment = { horizontal: "center", vertical: "middle" }

      worksheet.addRow([]) // Row 5 empty

      // Table Header Row 6
      const headers = [
        { header: "NO", key: "no", width: 6 },
        { header: "NAMA LENGKAP", key: "fullName", width: 28 },
        { header: "NIK", key: "nik", width: 20 },
        { header: "TEMPAT / TGL LAHIR", key: "pobDob", width: 25 },
        { header: "NOMOR KK", key: "noKK", width: 20 },
        { header: "NO. PONSEL / WA", key: "phone", width: 18 },
        { header: "ALAMAT TINGGAL", key: "address", width: 35 },
        { header: "NAMA USAHA", key: "businessName", width: 25 },
        { header: "ALAMAT USAHA", key: "businessAddress", width: 35 },
        { header: "KTP", key: "ktp", width: 10 },
        { header: "KK", key: "kk", width: 10 },
        { header: "NIB", key: "nib", width: 10 },
        { header: "FOTO USAHA", key: "photoUsaha", width: 14 },
        { header: "KELENGKAPAN", key: "statusBerkas", width: 18 },
        { header: "CATATAN PENDING", key: "catatan", width: 30 },
        { header: "PETUGAS PENGINPUT", key: "createdBy", width: 22 },
        { header: "TANGGAL INPUT", key: "createdAt", width: 22 }
      ]

      const headerRow = worksheet.getRow(6)
      headers.forEach((h, idx) => {
        const cell = headerRow.getCell(idx + 1)
        cell.value = h.header
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } } // Slate-800
        cell.alignment = { vertical: "middle", horizontal: "center" }
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "medium" },
          right: { style: "thin" }
        }
      })
      headerRow.height = 28

      // Add Data Rows
      filteredList.forEach((item, index) => {
        const score = getBerkasScore(item.kelengkapanBerkas)
        const isLengkap = score === 4

        const row = worksheet.addRow([
          index + 1,
          item.fullName || "-",
          item.nik || "-",
          item.pobDob || "-",
          item.noKK || "-",
          item.phone || "-",
          item.address || "-",
          item.businessName || "-",
          item.businessAddress || "-",
          item.kelengkapanBerkas.ktp ? "✓ ADA" : "✕ BELUM",
          item.kelengkapanBerkas.kk ? "✓ ADA" : "✕ BELUM",
          item.kelengkapanBerkas.nib ? "✓ ADA" : "✕ BELUM",
          item.kelengkapanBerkas.photoUsaha ? "✓ ADA" : "✕ BELUM",
          isLengkap ? "LENGKAP (4/4)" : `BELUM LENGKAP (${score}/4)`,
          item.catatan || "-",
          item.createdBy || "-",
          formatDateTimeIndo(item.createdAt)
        ])

        row.height = 22
        row.alignment = { vertical: "middle" }

        // Alignments & Styles
        row.getCell(1).alignment = { vertical: "middle", horizontal: "center" }
        row.getCell(3).alignment = { vertical: "middle", horizontal: "center" } // NIK
        row.getCell(5).alignment = { vertical: "middle", horizontal: "center" } // KK
        row.getCell(6).alignment = { vertical: "middle", horizontal: "center" } // Phone
        row.getCell(10).alignment = { vertical: "middle", horizontal: "center" }
        row.getCell(11).alignment = { vertical: "middle", horizontal: "center" }
        row.getCell(12).alignment = { vertical: "middle", horizontal: "center" }
        row.getCell(13).alignment = { vertical: "middle", horizontal: "center" }
        row.getCell(14).alignment = { vertical: "middle", horizontal: "center" }

        // Color status berkas
        if (isLengkap) {
          row.getCell(14).font = { bold: true, color: { argb: "FF059669" } }
        } else {
          row.getCell(14).font = { bold: true, color: { argb: "FFD97706" } }
        }

        // Zebra striping
        if (index % 2 === 1) {
          row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }
        }

        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } }
          }
        })
      })

      // Column widths
      headers.forEach((h, idx) => {
        worksheet.getColumn(idx + 1).width = h.width
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const nowStr = new Date().toISOString().split("T")[0]
      a.href = url
      a.download = `Data_Hold_Pelaku_Usaha_${nowStr}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 5000)

      toast({ title: "✅ Ekspor Excel Berhasil", description: `${filteredList.length} data hold berhasil diunduh.` })
    } catch (err: any) {
      console.error("Export Excel error:", err)
      toast({ variant: "destructive", title: "Gagal Ekspor Excel", description: err?.message || "Terjadi kesalahan sistem." })
    }
  }

  // =========================================================================
  // PDF EXPORT (JSPDF + JSPDF-AUTOTABLE)
  // =========================================================================
  const handleExportPDF = () => {
    if (filteredList.length === 0) {
      toast({ variant: "destructive", title: "Tidak Ada Data", description: "Tidak ada data hold untuk di-ekspor." })
      return
    }

    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 12

      // Header Kop
      doc.setFont("helvetica", "bold")
      doc.setFontSize(13)
      doc.setTextColor(15, 23, 42) // slate-900
      doc.text("PEMERINTAH PROVINSI KEPULAUAN RIAU", pageWidth / 2, 14, { align: "center" })

      doc.setFontSize(11)
      doc.setTextColor(30, 41, 59)
      doc.text("DINAS KOPERASI DAN USAHA KECIL MENENGAH", pageWidth / 2, 19, { align: "center" })

      doc.setFontSize(12)
      doc.setTextColor(217, 119, 6) // Amber-600
      doc.text("DAFTAR DATA HOLD PELAKU USAHA (PENGAJUAN TERPENDING)", pageWidth / 2, 25, { align: "center" })

      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(100)
      doc.text(
        `Waktu Cetak: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })} ${new Date().toLocaleTimeString("id-ID")} WIB  •  Total: ${filteredList.length} Data  •  Sistem SIMPU`,
        pageWidth / 2,
        30,
        { align: "center" }
      )

      doc.setDrawColor(217, 119, 6)
      doc.setLineWidth(0.6)
      doc.line(margin, 33, pageWidth - margin, 33)

      const tableData = filteredList.map((item, index) => {
        const b = item.kelengkapanBerkas
        const berkasStr = [
          b.ktp ? "[✓] KTP" : "[✕] KTP",
          b.kk ? "[✓] KK" : "[✕] KK",
          b.nib ? "[✓] NIB" : "[✕] NIB",
          b.photoUsaha ? "[✓] Foto" : "[✕] Foto"
        ].join("  ")

        const score = getBerkasScore(b)
        const statusLengkap = score === 4 ? "LENGKAP" : `${score}/4 BERKAS`

        return [
          index + 1,
          `${item.fullName}\nNIK: ${item.nik}`,
          item.pobDob || "-",
          `KK: ${item.noKK || "-"}\nHP: ${item.phone || "-"}`,
          `${item.businessName}\n${item.businessAddress || "-"}`,
          item.address || "-",
          `${berkasStr}\nStatus: ${statusLengkap}`,
          `${item.createdBy || "-"}\n${formatDateTimeIndo(item.createdAt)}`
        ]
      })

      autoTable(doc, {
        startY: 37,
        head: [
          [
            "NO",
            "NAMA LENGKAP & NIK",
            "TEMPAT / TGL LAHIR",
            "NO. KK & PONSEL",
            "USAHA & ALAMAT USAHA",
            "ALAMAT TINGGAL",
            "KELENGKAPAN BERKAS",
            "PENGINPUT / WAKTU"
          ]
        ],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [30, 41, 59], // Slate-800
          textColor: 255,
          fontStyle: "bold",
          fontSize: 8,
          halign: "center",
          valign: "middle"
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          valign: "middle",
          overflow: "linebreak"
        },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 42 },
          2: { cellWidth: 32 },
          3: { cellWidth: 32 },
          4: { cellWidth: 46 },
          5: { cellWidth: 44 },
          6: { cellWidth: 42, halign: "center" },
          7: { cellWidth: 27, halign: "center" }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        didDrawPage: (data) => {
          // Footer page numbering
          const str = `Halaman ${doc.getNumberOfPages()}`
          doc.setFontSize(7)
          doc.setTextColor(150)
          doc.text(str, pageWidth - margin, doc.internal.pageSize.getHeight() - 6, { align: "right" })
          doc.text("Dokumen Resmi SIMPU — Data Hold Khusus Administrator", margin, doc.internal.pageSize.getHeight() - 6)
        }
      })

      const nowStr = new Date().toISOString().split("T")[0]
      doc.save(`Data_Hold_Pelaku_Usaha_${nowStr}.pdf`)
      toast({ title: "✅ Ekspor PDF Berhasil", description: "Laporan PDF data hold berhasil diunduh." })
    } catch (err: any) {
      console.error("Export PDF error:", err)
      toast({ variant: "destructive", title: "Gagal Ekspor PDF", description: err?.message || "Terjadi kesalahan sistem." })
    }
  }

  // =========================================================================
  // VIEW RENDER: PETUGAS ONLY (DEDICATED FORM INPUT)
  // "disini petugas bisa menginput data pelaku usaha yang pengajuan nya terpending
  // data ini hanya bisa di lihat oleh Admin"
  // =========================================================================
  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        {/* Header Petugas */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/25 shrink-0">
              <PauseCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Input Data Hold
                </h1>
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                  Pengajuan Terpending
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Gunakan formulir ini untuk mencatat data pelaku usaha yang pengajuannya terpending. Form ini tersendiri dan data akan langsung diteruskan ke Administrator.
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-xl w-fit">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Pemberitahuan: Data Hold yang diinput hanya dapat dilihat dan dikelola oleh Administrator.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-8 shadow-sm">
          <form onSubmit={handleSaveHoldData} className="space-y-6">
            {/* Section 1: Data Identitas Pelaku Usaha */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <User className="w-4 h-4 text-amber-600" />
                <span>1. Data Identitas Pelaku Usaha</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    placeholder="Contoh: SITI NURHALIZA"
                    className="uppercase rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    NIK (Nomor Induk Kependudukan) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={formNik}
                    onChange={(e) => handleNikChange(e.target.value)}
                    placeholder="16 digit NIK"
                    maxLength={16}
                    className="font-mono rounded-xl"
                    required
                  />
                  {formNik && formNik.length !== 16 && (
                    <p className="text-[11px] text-amber-600 font-medium">{formNik.length}/16 digit NIK</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tempat Lahir
                  </Label>
                  <Input
                    value={formPob}
                    onChange={(e) => setFormPob(e.target.value)}
                    placeholder="Contoh: TANJUNGPINANG"
                    className="uppercase rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Tanggal Lahir
                    </Label>
                    {formDob && <span className="text-[10px] text-primary font-semibold">(Auto dari NIK)</span>}
                  </div>
                  <Input
                    value={formDob}
                    onChange={(e) => setFormDob(e.target.value)}
                    placeholder="DD-MM-YYYY (Contoh: 17-08-1990)"
                    className="font-mono rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nomor KK (Kartu Keluarga)
                  </Label>
                  <Input
                    value={formNoKk}
                    onChange={(e) => setFormNoKk(e.target.value.replace(/\D/g, "").slice(0, 16))}
                    placeholder="16 digit No. KK"
                    maxLength={16}
                    className="font-mono rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nomor Ponsel / WhatsApp
                  </Label>
                  <Input
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="font-mono rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Alamat Lengkap Tempat Tinggal
                  </Label>
                  <Textarea
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Jalan, RT/RW, Kelurahan, Kecamatan"
                    rows={2}
                    className="rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Data Usaha */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Store className="w-4 h-4 text-amber-600" />
                <span>2. Data Usaha Pelaku Usaha</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nama Usaha / Produk <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={formBusinessName}
                    onChange={(e) => setFormBusinessName(e.target.value)}
                    placeholder="Contoh: Kedai Kopi Makcik"
                    className="rounded-xl"
                    required
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Alamat Lokasi Tempat Usaha
                  </Label>
                  <Textarea
                    value={formBusinessAddress}
                    onChange={(e) => setFormBusinessAddress(e.target.value)}
                    placeholder="Alamat lengkap tempat usaha dijalankan"
                    rows={2}
                    className="rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Kelengkapan Berkas (Ceklist box) */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
                <span>3. Kelengkapan Berkas (Ceklist Box)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                Centang berkas / dokumen yang sudah tersedia atau telah diserahkan oleh pelaku usaha:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className={cn(
                  "flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer",
                  formBerkas.ktp
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                )}>
                  <Checkbox
                    checked={formBerkas.ktp}
                    onCheckedChange={(c) => setFormBerkas(prev => ({ ...prev, ktp: !!c }))}
                  />
                  <span className="font-bold text-xs uppercase tracking-wide">KTP</span>
                </label>

                <label className={cn(
                  "flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer",
                  formBerkas.kk
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                )}>
                  <Checkbox
                    checked={formBerkas.kk}
                    onCheckedChange={(c) => setFormBerkas(prev => ({ ...prev, kk: !!c }))}
                  />
                  <span className="font-bold text-xs uppercase tracking-wide">KK</span>
                </label>

                <label className={cn(
                  "flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer",
                  formBerkas.nib
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                )}>
                  <Checkbox
                    checked={formBerkas.nib}
                    onCheckedChange={(c) => setFormBerkas(prev => ({ ...prev, nib: !!c }))}
                  />
                  <span className="font-bold text-xs uppercase tracking-wide">NIB</span>
                </label>

                <label className={cn(
                  "flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer",
                  formBerkas.photoUsaha
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                )}>
                  <Checkbox
                    checked={formBerkas.photoUsaha}
                    onCheckedChange={(c) => setFormBerkas(prev => ({ ...prev, photoUsaha: !!c }))}
                  />
                  <span className="font-bold text-xs uppercase tracking-wide">Foto Usaha</span>
                </label>
              </div>
            </div>

            {/* Section 4: Catatan Tambahan / Alasan Pending */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>4. Catatan / Alasan Pending (Opsional)</span>
              </h3>
              <div className="mt-4 space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Catatan Petugas
                </Label>
                <Textarea
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  placeholder="Contoh: Menunggu upload surat domisili usaha atau berkas NIB sedang diurus..."
                  rows={3}
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="rounded-xl font-bold"
                disabled={isSubmitting}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Formulir
              </Button>

              <Button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md shadow-amber-600/20 px-6"
                disabled={isSubmitting}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? "Menyimpan Data..." : "Simpan Data Hold"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // =========================================================================
  // VIEW RENDER: ADMINISTRATOR VIEW (FULL MANAGEMENT & EXPORTS)
  // "data ini hanya bisa di lihat oleh Admin"
  // =========================================================================
  return (
    <div className="space-y-6 pb-20">
      {/* ── TOP HEADER & ACTIONS ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
            <PauseCircle className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Data Hold Pelaku Usaha
              </h1>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 font-bold">
                Khusus Admin
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Database khusus data pelaku usaha yang pengajuannya terpending dan diinput oleh Petugas Survey.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            onClick={handleExportExcel}
            variant="outline"
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50 rounded-xl text-xs font-bold"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />
            Ekspor Excel
          </Button>

          <Button
            onClick={handleExportPDF}
            variant="outline"
            className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/50 rounded-xl text-xs font-bold"
          >
            <FileDown className="w-4 h-4 mr-1.5 text-rose-600" />
            Ekspor PDF
          </Button>

          <Button
            onClick={handleOpenAddForm}
            className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Data Hold
          </Button>
        </div>
      </div>

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Data Hold</span>
            <FolderClock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {stats.total}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Pengajuan Terpending</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Berkas Lengkap</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.lengkap}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">4 dari 4 Dokumen</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Berkas Belum Lengkap</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {stats.belumLengkap}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Kurang dari 4 Dokumen</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Diinput Hari Ini</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
            {stats.today}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Data Masuk Hari Ini</p>
        </div>
      </div>

      {/* ── SEARCH & FILTER BAR ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari Nama, NIK, KK, Usaha, Petugas..."
            className="pl-9 rounded-xl text-xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-medium text-slate-500 hidden sm:inline">Filter Berkas:</span>
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setBerkasFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                berkasFilter === "all" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Semua ({holdList.length})
            </button>
            <button
              onClick={() => setBerkasFilter("lengkap")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                berkasFilter === "lengkap" ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Lengkap ({stats.lengkap})
            </button>
            <button
              onClick={() => setBerkasFilter("belum_lengkap")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                berkasFilter === "belum_lengkap" ? "bg-white dark:bg-slate-900 text-amber-600 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Belum Lengkap ({stats.belumLengkap})
            </button>
          </div>
        </div>
      </div>

      {/* ── DATA TABLE ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5 text-center w-12">No</th>
                <th className="py-3 px-4">Pelaku Usaha</th>
                <th className="py-3 px-4">Kontak & KK</th>
                <th className="py-3 px-4">Usaha & Alamat</th>
                <th className="py-3 px-4">Alamat Tinggal</th>
                <th className="py-3 px-4 text-center">Kelengkapan Berkas</th>
                <th className="py-3 px-4">Penginput</th>
                <th className="py-3 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isListLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Memuat data hold...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <PauseCircle className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    Belum ada data hold yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, index) => {
                  const b = item.kelengkapanBerkas
                  const score = getBerkasScore(b)
                  const isLengkap = score === 4

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-3.5 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white uppercase leading-snug">
                          {item.fullName}
                        </div>
                        <div className="font-mono text-slate-500 text-[11px]">
                          NIK: {item.nik}
                        </div>
                        {item.pobDob && (
                          <div className="text-[10.5px] text-slate-400 mt-0.5">
                            TTL: {item.pobDob}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {item.phone ? (
                          <a
                            href={getWaLink(item.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono font-medium text-emerald-600 hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{item.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                        {item.noKK && (
                          <div className="text-[10.5px] font-mono text-slate-500 mt-0.5">
                            KK: {item.noKK}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="font-bold text-slate-900 dark:text-white leading-snug">
                          {item.businessName}
                        </div>
                        {item.businessAddress && (
                          <div className="text-[10.5px] text-slate-500 truncate" title={item.businessAddress}>
                            {item.businessAddress}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 max-w-[180px]">
                        <div className="text-slate-600 dark:text-slate-300 truncate" title={item.address}>
                          {item.address || "-"}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap mb-1">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                            b.ktp ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-100 text-slate-400 line-through"
                          )}>
                            KTP
                          </span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                            b.kk ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-100 text-slate-400 line-through"
                          )}>
                            KK
                          </span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                            b.nib ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-100 text-slate-400 line-through"
                          )}>
                            NIB
                          </span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                            b.photoUsaha ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-100 text-slate-400 line-through"
                          )}>
                            Foto
                          </span>
                        </div>
                        <Badge variant="outline" className={cn(
                          "text-[9.5px] font-bold",
                          isLengkap ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40" : "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40"
                        )}>
                          {isLengkap ? "Lengkap (4/4)" : `${score}/4 Berkas`}
                        </Badge>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.createdBy}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatDateTimeIndo(item.createdAt)}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewingItem(item)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300 transition-colors"
                            title="Lihat Detail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEditForm(item)}
                            className="p-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-950/50 transition-colors"
                            title="Edit Data"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeletingId(item.id)}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/50 transition-colors"
                            title="Hapus Data"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DETAIL MODAL ── */}
      <Dialog open={!!viewingItem} onOpenChange={(open) => !open && setViewingItem(null)}>
        <DialogContent className="max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PauseCircle className="w-5 h-5 text-amber-500" />
              <span>Detail Data Hold Pelaku Usaha</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informasi lengkap data pelaku usaha yang pengajuannya terpending.
            </DialogDescription>
          </DialogHeader>

          {viewingItem && (
            <div className="space-y-4 text-xs py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Nama Lengkap</span>
                  <p className="font-black text-sm text-slate-900 dark:text-white uppercase">{viewingItem.fullName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">NIK</span>
                  <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">{viewingItem.nik}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Tempat / Tgl Lahir</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{viewingItem.pobDob || "-"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Nomor KK</span>
                  <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">{viewingItem.noKK || "-"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Nomor HP / WA</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{viewingItem.phone || "-"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Alamat Tinggal</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{viewingItem.address || "-"}</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Data Usaha</span>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{viewingItem.businessName}</p>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">{viewingItem.businessAddress || "Alamat usaha belum diisi"}</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Kelengkapan Berkas</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className={cn("p-2 rounded-lg border text-center font-bold text-xs", viewingItem.kelengkapanBerkas.ktp ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-slate-100 text-slate-400 border-slate-200")}>
                    KTP: {viewingItem.kelengkapanBerkas.ktp ? "✓ Ada" : "✕ Belum"}
                  </div>
                  <div className={cn("p-2 rounded-lg border text-center font-bold text-xs", viewingItem.kelengkapanBerkas.kk ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-slate-100 text-slate-400 border-slate-200")}>
                    KK: {viewingItem.kelengkapanBerkas.kk ? "✓ Ada" : "✕ Belum"}
                  </div>
                  <div className={cn("p-2 rounded-lg border text-center font-bold text-xs", viewingItem.kelengkapanBerkas.nib ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-slate-100 text-slate-400 border-slate-200")}>
                    NIB: {viewingItem.kelengkapanBerkas.nib ? "✓ Ada" : "✕ Belum"}
                  </div>
                  <div className={cn("p-2 rounded-lg border text-center font-bold text-xs", viewingItem.kelengkapanBerkas.photoUsaha ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-slate-100 text-slate-400 border-slate-200")}>
                    Foto: {viewingItem.kelengkapanBerkas.photoUsaha ? "✓ Ada" : "✕ Belum"}
                  </div>
                </div>
              </div>

              {viewingItem.catatan && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 space-y-1">
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold uppercase">Catatan / Alasan Pending</span>
                  <p className="text-slate-800 dark:text-slate-200 font-medium">{viewingItem.catatan}</p>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
                <span>Diinput oleh: <strong className="text-slate-600 dark:text-slate-300">{viewingItem.createdBy}</strong></span>
                <span>Waktu Input: {formatDateTimeIndo(viewingItem.createdAt)}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setViewingItem(null)}
              className="rounded-xl font-bold"
            >
              Tutup
            </Button>
            {viewingItem && (
              <Button
                onClick={() => {
                  const itm = viewingItem
                  setViewingItem(null)
                  handleOpenEditForm(itm)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
              >
                <Edit3 className="w-4 h-4 mr-1.5" />
                Edit Data
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ADD / EDIT MODAL (ADMIN) ── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PauseCircle className="w-5 h-5 text-amber-500" />
              <span>{editingItem ? "Edit Data Hold Pelaku Usaha" : "Tambah Data Hold Baru"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Formulir pencatatan data pelaku usaha yang pengajuannya terpending.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveHoldData} className="space-y-4 py-2">
            {/* 1. Identitas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nama Lengkap *</Label>
                <Input
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="Nama Pelaku Usaha"
                  className="uppercase rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">NIK (16 Digit) *</Label>
                <Input
                  value={formNik}
                  onChange={(e) => handleNikChange(e.target.value)}
                  placeholder="16 digit NIK"
                  maxLength={16}
                  className="font-mono rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tempat Lahir</Label>
                <Input
                  value={formPob}
                  onChange={(e) => setFormPob(e.target.value)}
                  placeholder="Tempat Lahir"
                  className="uppercase rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tanggal Lahir</Label>
                <Input
                  value={formDob}
                  onChange={(e) => setFormDob(e.target.value)}
                  placeholder="DD-MM-YYYY"
                  className="font-mono rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nomor KK</Label>
                <Input
                  value={formNoKk}
                  onChange={(e) => setFormNoKk(e.target.value.replace(/\D/g, "").slice(0, 16))}
                  placeholder="Nomor Kartu Keluarga"
                  maxLength={16}
                  className="font-mono rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nomor Ponsel / WhatsApp</Label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="font-mono rounded-xl"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold">Alamat Lengkap</Label>
                <Textarea
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Alamat tempat tinggal lengkap"
                  rows={2}
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* 2. Usaha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold">Nama Usaha / Produk *</Label>
                <Input
                  value={formBusinessName}
                  onChange={(e) => setFormBusinessName(e.target.value)}
                  placeholder="Nama usaha pelaku usaha"
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold">Alamat Lokasi Usaha</Label>
                <Textarea
                  value={formBusinessAddress}
                  onChange={(e) => setFormBusinessAddress(e.target.value)}
                  placeholder="Alamat tempat usaha"
                  rows={2}
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* 3. Kelengkapan Berkas */}
            <div className="pt-2 border-t space-y-2">
              <Label className="text-xs font-semibold">Kelengkapan Berkas (Ceklist box)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                  <Checkbox
                    checked={formBerkas.ktp}
                    onCheckedChange={(c) => setFormBerkas(prev => ({ ...prev, ktp: !!c }))}
                  />
                  <span className="font-bold text-xs uppercase">KTP</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                  <Checkbox
                    checked={formBerkas.kk}
                    onCheckedChange={(c) => setFormBerkas(prev => ({ ...prev, kk: !!c }))}
                  />
                  <span className="font-bold text-xs uppercase">KK</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                  <Checkbox
                    checked={formBerkas.nib}
                    onCheckedChange={(c) => setFormBerkas(prev => ({ ...prev, nib: !!c }))}
                  />
                  <span className="font-bold text-xs uppercase">NIB</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                  <Checkbox
                    checked={formBerkas.photoUsaha}
                    onCheckedChange={(c) => setFormBerkas(prev => ({ ...prev, photoUsaha: !!c }))}
                  />
                  <span className="font-bold text-xs uppercase">Foto Usaha</span>
                </label>
              </div>
            </div>

            {/* 4. Catatan */}
            <div className="pt-2 border-t space-y-1">
              <Label className="text-xs font-semibold">Catatan / Alasan Pending</Label>
              <Textarea
                value={formCatatan}
                onChange={(e) => setFormCatatan(e.target.value)}
                placeholder="Alasan pending atau instruksi lanjutan..."
                rows={2}
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                className="rounded-xl font-bold"
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold px-6"
                disabled={isSubmitting}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? "Menyimpan..." : "Simpan Data Hold"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM DIALOG ── */}
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        icon={<Trash2 className="w-8 h-8 text-rose-500" />}
        title="Hapus Data Hold?"
        description="Data pelaku usaha ini akan dihapus permanen dari database Data Hold. Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus Data"
        cancelText="Batal"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
