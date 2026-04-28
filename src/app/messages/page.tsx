
"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  useUser,
  useDatabase,
  useList,
  useMemoFirebase,
} from "@/firebase"
import { ref, push, set, update, serverTimestamp } from "firebase/database"
import {
  Search,
  Send,
  User as UserIcon,
  MessageSquare,
  ArrowLeft,
  Loader2,
  CheckCheck,
  Building2,
  Shield,
  UserCheck,
  Eye,
  ShieldQuestion,
  MessageCircle,
  MoreVertical,
  Trash2
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format, isToday, isYesterday } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useObject } from "@/firebase"

// ─── Helper Components ────────────────────────────────────────────────────────

const RoleBadge = ({ role }: { role?: string }) => {
  switch (role) {
    case 'admin':
      return (
        <Badge className="bg-primary hover:bg-primary font-black uppercase text-[8px] gap-0.5 h-4 px-1.5 rounded-full">
          <Shield className="w-2 h-2" /> Admin
        </Badge>
      )
    case 'monitoring':
      return (
        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 font-black uppercase text-[8px] gap-0.5 h-4 px-1.5 rounded-full">
          <Eye className="w-2 h-2" /> Monitoring
        </Badge>
      )
    case 'koordinator':
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 font-black uppercase text-[8px] gap-0.5 h-4 px-1.5 rounded-full">
          <UserCheck className="w-2 h-2" /> Korlap
        </Badge>
      )
    case 'petugas':
      return (
        <Badge variant="secondary" className="text-slate-600 bg-slate-100 font-black uppercase text-[8px] gap-0.5 h-4 px-1.5 rounded-full">
          <UserCheck className="w-2 h-2" /> Petugas
        </Badge>
      )
    case 'dinas':
      return (
        <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50 font-black uppercase text-[8px] gap-0.5 h-4 px-1.5 rounded-full">
          <Building2 className="w-2 h-2" /> Dinas
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-slate-500 border-slate-200 font-black uppercase text-[8px] gap-0.5 h-4 px-1.5 rounded-full">
          <ShieldQuestion className="w-2 h-2" /> Pengguna
        </Badge>
      )
  }
}

function formatMessageTime(ts: number | null | undefined): string {
  if (!ts) return ""
  const d = new Date(ts)
  return format(d, "HH:mm")
}

function formatDateLabel(ts: number): string {
  const d = new Date(ts)
  if (isToday(d)) return "Hari Ini"
  if (isYesterday(d)) return "Kemarin"
  return format(d, "EEEE, d MMMM yyyy", { locale: localeId })
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PesanPage() {
  const { user } = useUser()
  const database = useDatabase()
  const { toast } = useToast()
  const [selectedContact, setSelectedContact] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [messageInput, setMessageInput] = useState("")
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // ─── Data ──────────────────────────────────────────────────────────────────

  const usersRef = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, "system_users")
  }, [database])
  const { data: allUsers, isLoading: usersLoading } = useList(usersRef)

  // Cari profil user yang sedang login
  const myProfile = (allUsers || []).find((u: any) => u.uid === user?.uid)

  const contacts = (allUsers || [])
    .filter((u: any) => u.uid && u.uid !== user?.uid)
    .filter((u: any) =>
      !searchQuery ||
      u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchQuery.toLowerCase())
    )

  const chatId = selectedContact
    ? [user?.uid, selectedContact.uid].sort().join("_")
    : null

  // Ambil metadata chat untuk melihat deletedAt
  const chatMetaRef = useMemoFirebase(() => {
    if (!database || !user || !selectedContact) return null
    return ref(database, `chats/${user.uid}/${selectedContact.uid}`)
  }, [database, user, selectedContact])
  const { data: chatMeta } = useObject(chatMetaRef)

  const messagesRef = useMemoFirebase(() => {
    if (!database || !chatId) return null
    return ref(database, `chat_messages/${chatId}`)
  }, [database, chatId])
  const { data: allMessages, isLoading: messagesLoading } = useList(messagesRef)

  // Filter pesan berdasarkan deletedAt
  const messages = allMessages?.filter((msg: any) => {
    if (!chatMeta?.deletedAt) return true
    return (msg.timestamp || 0) > chatMeta.deletedAt
  })

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus input when contact selected
  useEffect(() => {
    if (selectedContact) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [selectedContact])

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleDeleteChat = async () => {
    if (!user || !selectedContact || !database) return
    if (!confirm("Apakah Anda yakin ingin menghapus seluruh riwayat chat ini dari perangkat Anda? Lawan bicara Anda masih tetap dapat melihat pesan-pesan tersebut.")) return

    try {
      await update(ref(database, `chats/${user.uid}/${selectedContact.uid}`), {
        deletedAt: Date.now(),
        lastMessage: "Obrolan dihapus",
        lastTimestamp: serverTimestamp()
      })
      toast({ title: "Riwayat Dihapus", description: "Pesan-pesan lama telah disembunyikan dari perangkat ini." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal Menghapus", description: error.message })
    }
  }

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!messageInput.trim() || !chatId || !user || isSending) return

    const text = messageInput.trim()
    setMessageInput("") // Clear input segera agar UX responsif
    setIsSending(true)

    try {
      // Tulis pesan ke /chat_messages/{chatId}/{newId}
      const newMsgRef = push(ref(database, `chat_messages/${chatId}`))
      await set(newMsgRef, {
        text,
        senderId: user.uid,
        senderName: myProfile?.fullName || user.displayName || user.email?.split("@")[0] || "Pengguna",
        timestamp: serverTimestamp(),
      })

      // Update metadata chat untuk kedua belah pihak
      const myName = myProfile?.fullName || user.displayName || user.email?.split("@")[0] || "Pengguna"
      const myRole = myProfile?.role || "user"

      await Promise.all([
        update(ref(database, `chats/${user.uid}/${selectedContact.uid}`), {
          lastMessage: text,
          lastTimestamp: serverTimestamp(),
          unread: false,
          friendName: selectedContact.fullName,
          friendRole: selectedContact.role || "user",
        }),
        update(ref(database, `chats/${selectedContact.uid}/${user.uid}`), {
          lastMessage: text,
          lastTimestamp: serverTimestamp(),
          unread: true,
          friendName: myName,
          friendRole: myRole,
        }),
      ])
    } catch (error: any) {
      console.error("Gagal mengirim pesan:", error)
      setMessageInput(text) // Kembalikan teks jika gagal
      toast({
        variant: "destructive",
        title: "Gagal Mengirim Pesan",
        description: error?.message || "Terjadi kesalahan. Periksa koneksi internet Anda.",
      })
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!mounted) return null

  return (
    <div className="flex h-[calc(100vh-2rem)] p-2 md:p-4 gap-3 overflow-hidden">

      {/* ── Daftar Kontak ─────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "flex flex-col rounded-3xl bg-white border border-slate-200/80 shadow-xl overflow-hidden transition-all duration-300 shrink-0",
          isMobile
            ? selectedContact ? "hidden" : "w-full"
            : "w-[300px] lg:w-[340px]"
        )}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-4 space-y-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-slate-500 hover:text-primary" />
              <div>
                <h1 className="text-lg font-black text-slate-800 leading-none">Kotak Pesan</h1>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {contacts.length} anggota tersedia
                </p>
              </div>
            </div>
            <div className="p-2 bg-primary/10 rounded-xl">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Cari nama atau jabatan..."
              className="pl-10 bg-slate-50 border-slate-200 rounded-xl h-10 text-sm focus-visible:ring-primary/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Kontak List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {usersLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-primary/50" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Memuat daftar...</span>
              </div>
            ) : contacts.length > 0 ? (
              contacts.map((contact: any) => {
                const isActive = selectedContact?.uid === contact.uid
                return (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 text-left group",
                      isActive
                        ? "bg-primary shadow-lg shadow-primary/20"
                        : "hover:bg-slate-50 active:bg-slate-100"
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className={cn(
                        "w-11 h-11 border-2 shadow-sm",
                        isActive ? "border-white/30" : "border-slate-100"
                      )}>
                        <AvatarImage src={contact.photoURL} />
                        <AvatarFallback className={cn(
                          "font-bold text-sm",
                          isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                        )}>
                          {contact.fullName?.charAt(0)?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      {/* Status dot */}
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-bold truncate",
                        isActive ? "text-white" : "text-slate-800"
                      )}>
                        {contact.fullName ?? "Pengguna"}
                      </p>
                      <div className="mt-0.5">
                        <RoleBadge role={contact.role} />
                      </div>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <Search className="w-7 h-7 text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-500">Tidak Ditemukan</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {searchQuery ? `Tidak ada pengguna bernama "${searchQuery}"` : "Belum ada anggota tim lain yang tersedia."}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* ── Area Chat Utama ────────────────────────────────────────────────── */}
      <main
        className={cn(
          "flex-1 flex flex-col rounded-3xl bg-white border border-slate-200/80 shadow-xl overflow-hidden",
          isMobile && !selectedContact && "hidden"
        )}
      >
        {selectedContact ? (
          <>
            {/* Header Chat */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 bg-white/80 backdrop-blur-sm shrink-0">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedContact(null)}
                  className="shrink-0 -ml-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <Avatar className="w-10 h-10 border-2 border-primary/10 shrink-0">
                <AvatarImage src={selectedContact.photoURL} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {selectedContact.fullName?.charAt(0)?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="font-black text-slate-800 text-sm leading-none truncate">
                  {selectedContact.fullName}
                </h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <RoleBadge role={selectedContact.role} />
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block" />
                    Online
                  </span>
                </div>
              </div>

              {/* Menu Opsi Chat */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0 rounded-xl hover:bg-slate-100">
                    <MoreVertical className="w-5 h-5 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-2xl border-slate-100">
                  <DropdownMenuItem 
                    onClick={handleDeleteChat}
                    className="flex items-center gap-2.5 p-3 rounded-xl text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="font-bold text-xs uppercase tracking-tight">Hapus Riwayat Chat</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Pesan-pesan */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-6 space-y-2"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            >
              {messagesLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
                </div>
              ) : messages && messages.length > 0 ? (
                (() => {
                  let lastDateLabel = ""
                  return messages.map((msg: any) => {
                    const isMe = msg.senderId === user?.uid
                    const ts = msg.timestamp as number | null
                    const dateLabel = ts ? formatDateLabel(ts) : ""
                    const showDateSep = dateLabel && dateLabel !== lastDateLabel
                    if (showDateSep) lastDateLabel = dateLabel

                    return (
                      <React.Fragment key={msg.id}>
                        {showDateSep && (
                          <div className="flex justify-center my-4">
                            <span className="px-4 py-1 bg-slate-200/80 text-slate-500 text-[10px] font-black rounded-full uppercase tracking-widest backdrop-blur-sm">
                              {dateLabel}
                            </span>
                          </div>
                        )}
                        <div
                          className={cn(
                            "flex",
                            isMe ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[75%] md:max-w-[60%] flex flex-col",
                              isMe ? "items-end" : "items-start"
                            )}
                          >
                            <div
                              className={cn(
                                "px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                                isMe
                                  ? "bg-primary text-white rounded-2xl rounded-br-sm"
                                  : "bg-white text-slate-700 rounded-2xl rounded-bl-sm border border-slate-100"
                              )}
                            >
                              {msg.text}
                            </div>
                            <div
                              className={cn(
                                "flex items-center gap-1 mt-1 px-1",
                                isMe ? "flex-row-reverse" : "flex-row"
                              )}
                            >
                              <span className="text-[9px] text-slate-400 font-medium">
                                {formatMessageTime(ts)}
                              </span>
                              {isMe && (
                                <CheckCheck className="w-3 h-3 text-primary/60" />
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    )
                  })
                })()
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-50">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
                    <MessageSquare className="w-10 h-10 text-slate-300" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-600 text-sm">Belum Ada Pesan</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Mulai percakapan dengan {selectedContact.fullName}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Input Pesan */}
            <div className="px-4 py-4 bg-white border-t border-slate-100 shrink-0">
              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 focus-within:border-primary/40 focus-within:bg-white transition-all shadow-sm"
              >
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={`Kirim pesan ke ${selectedContact.fullName}...`}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!messageInput.trim() || isSending}
                  className="h-9 w-9 rounded-xl shadow-md shadow-primary/20 shrink-0 transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
              <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">
                Tekan <kbd className="px-1 py-0.5 bg-slate-200 rounded text-[9px] font-mono">Enter</kbd> untuk mengirim
              </p>
            </div>
          </>
        ) : (
          /* ── Placeholder Kosong ────────────────────────────────────────── */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-6">
            <div className="relative">
              <div className="w-28 h-28 bg-primary/5 rounded-full flex items-center justify-center border-2 border-dashed border-primary/20 relative">
                <MessageCircle className="w-14 h-14 text-primary/30" />
              </div>
              {/* Deco balls */}
              <span className="absolute -top-3 -right-3 w-8 h-8 bg-accent rounded-full shadow-lg flex items-center justify-center text-lg animate-bounce">
                💬
              </span>
              <span className="absolute -bottom-2 -left-2 w-6 h-6 bg-emerald-400 rounded-full shadow animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-700">Pilih Kontak</h2>
              <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
                Pilih salah satu anggota tim di sebelah kiri untuk memulai percakapan secara <span className="text-primary font-bold">real-time</span>.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-[11px] font-bold text-slate-500">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Pesan Langsung
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-[11px] font-bold text-slate-500">
                <Shield className="w-3 h-3 text-primary" />
                Aman &amp; Terlindungi
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-[11px] font-bold text-slate-500">
                <CheckCheck className="w-3 h-3 text-blue-500" />
                Sinkronisasi Otomatis
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
