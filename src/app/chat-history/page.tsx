"use client"

import { useState, useEffect } from "react"
import { useUser, useFirestore, useMemoFirebase, useCollection, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc, deleteDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { 
  Trash2, 
  Search, 
  MessageSquare, 
  History, 
  Loader2,
  ShieldCheck,
  Eye
} from "lucide-react"
import { useRouter } from "next/navigation"

export default function ChatHistoryPage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Get current user profile for role check
  const userProfileQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return query(collection(firestore, 'system_users'), where('uid', '==', user.uid))
  }, [user, firestore])
  const { data: userProfiles } = useCollection(userProfileQuery)
  const myProfile = userProfiles?.[0]
  const isAdminOrPetugas = myProfile?.role === 'admin' || myProfile?.role === 'petugas'

  // Admin and Petugas see ALL chats
  // Regular users only see THEIR chats (same as /chat but in history view)
  const allChatsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    if (isAdminOrPetugas) {
      return query(collection(firestore, 'chats'), orderBy('updatedAt', 'desc'))
    } else {
      return query(
        collection(firestore, 'chats'),
        where('participants', 'array_contains', user.uid),
        orderBy('updatedAt', 'desc')
      )
    }
  }, [firestore, user, isAdminOrPetugas])
  const { data: chats, isLoading: isChatsLoading } = useCollection<any>(allChatsQuery)

  const handleDeleteChat = async (id: string) => {
    if (!isAdminOrPetugas) return
    if (confirm("Hapus seluruh riwayat percakapan ini secara permanen?")) {
      await deleteDocumentNonBlocking(doc(firestore, 'chats', id))
      toast({ title: "Riwayat Dihapus", description: "Percakapan telah dihapus dari sistem." })
    }
  }

  const filteredChats = chats?.filter((chat: any) => {
    const names = Object.values(chat.participantNames || {}).join(' ').toLowerCase()
    return names.includes(searchTerm.toLowerCase()) || chat.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (!mounted || isUserLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    router.push("/login")
    return null
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight uppercase flex items-center gap-3">
            <History className="w-8 h-8" /> Riwayat Chat
          </h1>
          <p className="text-slate-500 font-medium">
            {isAdminOrPetugas 
                ? "Monitoring seluruh aktivitas komunikasi antar pengguna." 
                : "Akses riwayat percakapan yang telah Anda lakukan."}
          </p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Cari percakapan..." 
            className="pl-10 rounded-2xl bg-white shadow-sm border-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white overflow-hidden rounded-3xl">
        <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary/60" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Daftar Percakapan Tersimpan</span>
            </div>
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase">
                {filteredChats?.length || 0} Percakapan
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="divide-y divide-slate-50">
              {isChatsLoading ? (
                <div className="py-20 flex flex-col items-center gap-4 text-slate-300">
                    <Loader2 className="w-10 h-10 animate-spin" />
                    <p className="font-black uppercase text-[10px] tracking-widest">Memuat Log Chat...</p>
                </div>
              ) : filteredChats?.length === 0 ? (
                <div className="py-20 flex flex-col items-center gap-4 text-slate-300">
                    <MessageSquare className="w-16 h-16" />
                    <p className="font-black uppercase text-[10px] tracking-widest">Tidak ada riwayat ditemukan</p>
                </div>
              ) : filteredChats?.map((chat: any) => (
                <div key={chat.id} className="p-4 md:p-6 hover:bg-slate-50/50 transition-colors flex items-center gap-4 group">
                  <div className="flex -space-x-3 shrink-0">
                    {chat.participants.map((p: string, i: number) => (
                        <Avatar key={p} className="border-2 border-white w-10 h-10">
                            <AvatarFallback className={cn(
                                "text-[10px] font-black text-white",
                                i === 0 ? "bg-primary" : "bg-blue-400"
                            )}>
                                {(chat.participantNames[p] || "U")[0]}
                            </AvatarFallback>
                        </Avatar>
                    ))}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <h4 className="font-black text-slate-700 uppercase text-xs md:text-sm truncate">
                            {Object.values(chat.participantNames).join(' &bull; ')}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap ml-2">
                            {chat.updatedAt?.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                    <p className="text-[11px] md:text-xs text-slate-500 font-medium line-clamp-1 italic">
                        "{chat.lastMessage || "Pesan file atau lampiran..."}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" size="sm" className="rounded-xl font-bold text-[10px] gap-1 h-8" onClick={() => router.push(`/chat?id=${chat.id}`)}>
                        <Eye className="w-3.5 h-3.5" /> LIHAT
                    </Button>
                    {isAdminOrPetugas && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => handleDeleteChat(chat.id)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
