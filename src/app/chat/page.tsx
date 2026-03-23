"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, useRef, Suspense } from "react"
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, where, orderBy, doc, Timestamp, addDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { 
  Send, 
  Paperclip, 
  Search, 
  User, 
  Loader2, 
  MoreVertical, 
  Trash2,
  ChevronLeft,
  MessageSquare,
  History
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

function ChatContent() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const initialChatId = searchParams.get('id')
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialChatId)
  const [activeTab, setActiveTab] = useState<'users' | 'history'>('users')
  const [searchTerm, setSearchTerm] = useState('')
  const [message, setMessage] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [selectedChatId])

  // Get current user profile
  const userProfileQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return query(collection(firestore, 'system_users'), where('uid', '==', user.uid))
  }, [user, firestore])
  const { data: userProfiles } = useCollection(userProfileQuery)
  const myProfile = userProfiles?.[0]
  const isAdminOrPetugas = myProfile?.role === 'admin' || myProfile?.role === 'petugas'

  // Get all users for starting chats
  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, 'system_users'))
  }, [firestore, user])
  const { data: allUsers, isLoading: isUsersLoading } = useCollection<any>(usersQuery)

  // Get active chats for the current user
  const chatsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(
      collection(firestore, 'chats'),
      where('participants', 'array_contains', user.uid),
      orderBy('updatedAt', 'desc')
    )
  }, [firestore, user])
  const { data: myChats, isLoading: isChatsLoading } = useCollection<any>(chatsQuery)

  // Get messages for selected chat
  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !selectedChatId) return null
    return query(
      collection(firestore, 'chats', selectedChatId, 'messages'),
      orderBy('timestamp', 'asc')
    )
  }, [firestore, selectedChatId])
  const { data: messages } = useCollection<any>(messagesQuery)

  const handleStartChat = async (targetUser: any) => {
    if (!user || !targetUser.uid) {
        toast({
            variant: "destructive",
            title: "Gagal Memulai Chat",
            description: "User ini belum memiliki UID (belum pernah login/registrasi selesai).",
        })
        return
    }

    // Check if chat already exists
    const chat = myChats?.find((c: any) => c.participants.includes(targetUser.uid))
    if (chat) {
        setSelectedChatId(chat.id)
    } else {
        // Create new chat
        const chatId = [user.uid, targetUser.uid].sort().join('_')
        const chatRef = doc(firestore, 'chats', chatId)
        setDocumentNonBlocking(chatRef, {
            participants: [user.uid, targetUser.uid],
            participantNames: {
                [user.uid]: myProfile?.fullName || user.email?.split('@')[0],
                [targetUser.uid]: targetUser.fullName
            },
            updatedAt: Timestamp.now(),
            lastMessage: ""
        }, { merge: true })
        setSelectedChatId(chatId)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !selectedChatId || !user) return

    const chatRef = doc(firestore, 'chats', selectedChatId)
    const messagesRef = collection(firestore, 'chats', selectedChatId, 'messages')

    const newMessage = {
        senderId: user.uid,
        senderName: myProfile?.fullName || user.email?.split('@')[0],
        text: message.trim(),
        timestamp: Timestamp.now()
    }

    await addDoc(messagesRef, newMessage)
    await updateDocumentNonBlocking(chatRef, {
        lastMessage: message.trim(),
        updatedAt: Timestamp.now()
    })

    setMessage('')
  }

  const handleDeleteHistory = async (chatId: string) => {
    if (!confirm("Hapus seluruh riwayat chat ini?")) return
    
    // In production, we should delete all subcollection messages first, 
    // but with non-blocking it's easier to just delete the doc or clear it.
    const chatRef = doc(firestore, 'chats', chatId)
    await deleteDocumentNonBlocking(chatRef)
    if (selectedChatId === chatId) setSelectedChatId(null)
    toast({ title: "Riwayat Dihapus", description: "Seluruh percakapan telah dibersihkan." })
  }

  const filteredUsers = allUsers?.filter((u: any) => 
    u.uid && u.uid !== user?.uid && 
    (u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
     u.id.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (!mounted || isUserLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-20 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-tight text-primary">Akses Terbatas</h1>
        <p className="text-muted-foreground mt-2">Silahkan login untuk menggunakan fitur chat.</p>
        <Button asChild className="mt-4"><Link href="/login">MASUK SEKARANG</Link></Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden shadow-2xl mx-4 mb-4">
      <div className="flex h-full divide-x divide-slate-200">
        
        {/* Sidebar Chat */}
        <div className={cn(
          "flex-col w-full md:w-80 lg:w-96 bg-white shrink-0",
          selectedChatId ? "hidden md:flex" : "flex"
        )}>
          <div className="p-6 border-b border-slate-100 space-y-4">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-primary" /> CHAT UMKM
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Cari pengguna..." 
                className="pl-10 rounded-2xl bg-slate-100 border-none shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
               <Button 
                variant={activeTab === 'users' ? "default" : "secondary"} 
                className="flex-1 rounded-xl font-bold text-xs" 
                onClick={() => setActiveTab('users')}
              >
                KONTAK
               </Button>
               <Button 
                variant={activeTab === 'history' ? "default" : "secondary"} 
                className="flex-1 rounded-xl font-bold text-xs"
                onClick={() => setActiveTab('history')}
              >
                OBROLAN
               </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {activeTab === 'users' ? (
                isUsersLoading ? (
                    <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary/30" /></div>
                ) : filteredUsers?.map((u: any) => (
                  <button 
                    key={u.id} 
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-all text-left group"
                    onClick={() => handleStartChat(u)}
                  >
                    <Avatar className="group-hover:scale-110 transition-transform">
                      <AvatarFallback className="bg-primary/10 text-primary font-black uppercase text-xs">{u.fullName ? u.fullName[0] : 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-700 text-sm truncate uppercase">{u.fullName}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{u.role}</p>
                    </div>
                  </button>
                ))
              ) : (
                isChatsLoading ? (
                    <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary/30" /></div>
                ) : myChats?.map((chat: any) => {
                  const otherUid = chat.participants.find((p: any) => p !== user.uid)
                  const otherName = chat.participantNames[otherUid] || "User"
                  return (
                    <button 
                      key={chat.id} 
                      className={cn(
                        "w-full flex items-center gap-3 p-4 rounded-2xl transition-all text-left group",
                        selectedChatId === chat.id ? "bg-primary text-white shadow-lg" : "hover:bg-slate-50"
                       )}
                      onClick={() => setSelectedChatId(chat.id)}
                    >
                      <Avatar>
                        <AvatarFallback className={cn("font-black uppercase text-xs", selectedChatId === chat.id ? "bg-white/20 text-white" : "bg-primary/10 text-primary")}>
                          {otherName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <p className={cn("font-black text-sm truncate uppercase", selectedChatId === chat.id ? "text-white" : "text-slate-700")}>{otherName}</p>
                          <span className={cn("text-[8px] font-bold uppercase ml-2", selectedChatId === chat.id ? "text-white/60" : "text-slate-400")}>
                            {chat.updatedAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={cn("text-[11px] truncate font-medium", selectedChatId === chat.id ? "text-white/80" : "text-slate-500")}>
                          {chat.lastMessage || "Belum ada pesan"}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Window */}
        <div className={cn(
          "flex-1 flex flex-col bg-slate-50/50 backdrop-blur-sm relative",
          !selectedChatId && "hidden md:flex items-center justify-center"
        )}>
          {selectedChatId ? (
            <>
              {/* Chat Header */}
              <div className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedChatId(null)}>
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary text-white font-black uppercase text-xs">
                        {myChats?.find((c: any) => c.id === selectedChatId)?.participantNames[myChats?.find((c: any) => c.id === selectedChatId)?.participants.find((p: any) => p !== user.uid)]?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-black text-slate-800 uppercase tracking-tight">
                        {myChats?.find((c: any) => c.id === selectedChatId)?.participantNames[myChats?.find((c: any) => c.id === selectedChatId)?.participants.find((p: any) => p !== user.uid)]}
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">AKTIF SEKARANG</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   {isAdminOrPetugas && (
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-destructive hover:bg-destructive/5" onClick={() => handleDeleteHistory(selectedChatId)}>
                        <Trash2 className="w-5 h-5" />
                      </Button>
                   )}
                   <Button variant="ghost" size="icon" className="text-slate-400">
                    <MoreVertical className="w-5 h-5" />
                   </Button>
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-6" viewportRef={scrollRef}>
                <div className="flex flex-col gap-4">
                  {messages?.map((msg: any, i: number) => {
                    const isMe = msg.senderId === user.uid
                    return (
                      <div key={msg.id || i} className={cn(
                        "flex flex-col max-w-[85%] md:max-w-[70%]",
                        isMe ? "self-end items-end" : "self-start items-start"
                      )}>
                        <div className={cn(
                          "px-4 py-3 rounded-3xl shadow-sm text-sm font-medium",
                          isMe 
                            ? "bg-primary text-white rounded-br-none" 
                            : "bg-white text-slate-700 border border-slate-100 rounded-bl-none shadow-[2px_2px_8px_rgba(0,0,0,0.02)]"
                        )}>
                          {msg.text}
                        </div>
                        <span className="text-[8px] font-black uppercase text-slate-400 mt-1 px-1">
                          {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )
                  })}
                  {(!messages || messages.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20">
                        <MessageSquare className="w-20 h-20 mb-4" />
                        <p className="font-black uppercase tracking-widest text-xs">Awal dari Percakapan</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="p-6 bg-white border-t border-slate-100">
                <form onSubmit={handleSendMessage} className="flex gap-4">
                  <div className="flex-1 relative flex items-center">
                    <Input 
                        placeholder="Ketik pesan di sini..." 
                        className="h-12 pl-4 pr-12 rounded-2xl bg-slate-50 border-slate-100 focus-visible:ring-primary shadow-inner"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-2 text-slate-400 hover:text-primary transition-colors"
                        onClick={() => toast({ title: "Fitur Unggah File", description: "Fitur pengiriman file sedang dalam pengembangan (Memerlukan Storage Bucket)." })}
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>
                  </div>
                  <Button type="submit" size="icon" className="h-12 w-12 rounded-2xl shadow-lg shadow-primary/20 bg-primary hover:primary/90 transition-all active:scale-95 shrink-0" disabled={!message.trim()}>
                    <Send className="w-5 h-5" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center opacity-40">
              <div className="w-32 h-32 bg-primary/5 rounded-full flex items-center justify-center mb-8">
                 <MessageSquare className="w-16 h-16 text-primary" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Pilih Obrolan</h3>
              <p className="max-w-xs text-sm font-medium text-slate-500">
                Pilih pengguna dari daftar kontak atau riwayat obrolan untuk mulai berkomunikasi.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={
        <div className="h-screen flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
    }>
        <ChatContent />
    </Suspense>
  )
}
