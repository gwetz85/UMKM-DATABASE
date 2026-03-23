"use client"

import { useState, useEffect, useRef, useMemo, Suspense } from "react"
import { useUser, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where, doc, limit, Timestamp, addDoc, serverTimestamp, getDocs } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  MessageSquare, 
  Send, 
  User, 
  Search, 
  Loader2, 
  ArrowLeft,
  Clock,
  Circle,
  MoreVertical,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSearchParams, useRouter } from "next/navigation"

// --- UTILS ---
const formatTime = (timestamp: any) => {
  if (!timestamp) return ""
  try {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    return ""
  }
}

const formatTimeFull = (timestamp: any) => {
  if (!timestamp) return ""
  try {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + " " + 
           date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    return ""
  }
}

function PesanContent() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetUserId = searchParams.get('to')

  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState("")
  const [userSearchText, setUserSearchText] = useState("")
  const [isMobileListOpen, setIsMobileListOpen] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // --- DATA FETCHING ---

  // 1. All Users (for starting new chat)
  const allUsersQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'system_users'), limit(50))
  }, [firestore])
  const { data: allUsers } = useCollection<any>(allUsersQuery)

  // 2. My Conversations
  const myConversationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    // We can't use 'orderBy' without an index, so we'll sort on client side
    return query(
      collection(firestore, 'conversations'), 
      where('participants', 'array-contains', user.uid)
    )
  }, [firestore, user])
  const { data: rawConversations, isLoading: isConversationsLoading } = useCollection<any>(myConversationsQuery)

  // 3. Active Chat Messages
  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !activeChatId) return null
    return query(
      collection(firestore, 'messages'),
      where('chatId', '==', activeChatId),
      limit(100)
    )
  }, [firestore, activeChatId])
  const { data: rawMessages } = useCollection<any>(messagesQuery)

  // --- COMPUTED DATA ---

  // Client-side sort conversations by updatedAt
  const conversations = useMemo(() => {
    if (!rawConversations) return []
    return [...rawConversations].sort((a, b) => {
      const timeA = a.updatedAt instanceof Timestamp ? a.updatedAt.toMillis() : new Date(a.updatedAt).getTime()
      const timeB = b.updatedAt instanceof Timestamp ? b.updatedAt.toMillis() : new Date(b.updatedAt).getTime()
      return (timeB || 0) - (timeA || 0)
    })
  }, [rawConversations])

  // Client-side sort messages by createdAt
  const activeMessages = useMemo(() => {
    if (!rawMessages) return []
    return [...rawMessages].sort((a, b) => {
      const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()
      const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()
      return (timeA || 0) - (timeB || 0)
    })
  }, [rawMessages])

  const filteredUsers = useMemo(() => {
    if (!allUsers || !user) return []
    return allUsers.filter((u: any) => 
      u.uid !== user.uid && 
      (u.fullName || "User").toLowerCase().includes(userSearchText.toLowerCase())
    )
  }, [allUsers, user, userSearchText])

  const activeChat = useMemo(() => 
    conversations.find(c => c.id === activeChatId), 
  [conversations, activeChatId])

  const otherParticipantName = useMemo(() => {
    if (!activeChat || !user) return "Percakapan"
    const otherId = activeChat.participants?.find((p: string) => p !== user.uid)
    return activeChat.participantNames?.[otherId] || "User"
  }, [activeChat, user])

  // --- ACTIONS ---

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeMessages])

  // Handle direct 'to' parameter
  useEffect(() => {
    if (targetUserId && allUsers && user) {
        startChat(targetUserId)
    }
  }, [targetUserId, allUsers, user])

  const startChat = async (otherUserId: string) => {
    if (!user || !firestore) return
    
    // Check if conversation already exists
    const existingChat = conversations.find(c => 
        c.participants.includes(user.uid) && c.participants.includes(otherUserId)
    )

    if (existingChat) {
        setActiveChatId(existingChat.id)
        setIsMobileListOpen(false)
        router.push('/pesan', { scroll: false })
        return
    }

    // Create new conversation
    const otherUser = allUsers?.find((u: any) => u.uid === otherUserId)
    const chatData = {
        participants: [user.uid, otherUserId],
        participantNames: {
            [user.uid]: user.displayName || "Saya",
            [otherUserId]: otherUser?.fullName || "User"
        },
        lastMessage: "Mulai percakapan...",
        updatedAt: serverTimestamp()
    }

    try {
        const docRef = await addDoc(collection(firestore, 'conversations'), chatData)
        setActiveChatId(docRef.id)
        setIsMobileListOpen(false)
        router.push('/pesan', { scroll: false })
    } catch (e) {
        toast({ variant: "destructive", title: "Gagal membuat percakapan" })
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || !activeChatId || !user || !firestore) return

    const text = messageText.trim()
    setMessageText("")

    try {
        await addDocumentNonBlocking(collection(firestore, 'messages'), {
            chatId: activeChatId,
            senderId: user.uid,
            senderName: user.displayName || "User",
            text,
            createdAt: serverTimestamp()
        })

        // Update conversation summary
        updateDocumentNonBlocking(doc(firestore, 'conversations', activeChatId), {
            lastMessage: text,
            updatedAt: serverTimestamp()
        })
    } catch (e) {
        toast({ variant: "destructive", title: "Gagal mengirim pesan" })
    }
  }

  return (
    <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] p-2 md:p-6 overflow-hidden">
      <div className="h-full bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl flex overflow-hidden">
        
        {/* SIDEBAR: Daftar Chat & User */}
        <div className={cn(
            "w-full md:w-80 border-r border-slate-100 flex flex-col transition-all duration-300",
            !isMobileListOpen && "hidden md:flex"
        )}>
            <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                <h1 className="text-xl font-black text-primary uppercase tracking-tight mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" /> Pesan
                </h1>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                        placeholder="Cari pengguna..." 
                        className="pl-10 rounded-2xl bg-white border-none shadow-sm h-10 text-xs font-bold"
                        value={userSearchText}
                        onChange={(e) => setUserSearchText(e.target.value)}
                    />
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                    {/* Hasil Pencarian User */}
                    {userSearchText && (
                        <div className="space-y-1">
                            <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Temukan Pengguna</p>
                            {filteredUsers.length > 0 ? filteredUsers.map((u: any) => (
                                <button 
                                    key={u.uid}
                                    onClick={() => startChat(u.uid)}
                                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-primary/5 transition-all text-left group"
                                >
                                    <Avatar className="w-10 h-10 border-2 border-white shadow-sm group-hover:scale-110 transition-transform">
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-black">
                                            {(u.fullName || "U")[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-700 uppercase truncate">{u.fullName || "User"}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{u.role || "Member"}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                                </button>
                            )) : (
                                <p className="px-3 py-4 text-center text-[10px] font-bold text-slate-400 uppercase italic">Pengguna tidak ditemukan</p>
                            )}
                        </div>
                    )}

                    {/* Daftar Percakapan Terkini */}
                    <div className="space-y-1">
                        <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Percakapan Terkini</p>
                        {isConversationsLoading ? (
                             <div className="py-10 flex flex-col items-center gap-2 opacity-20">
                                <Loader2 className="w-6 h-6 animate-spin" />
                             </div>
                        ) : conversations.length > 0 ? conversations.map((chat: any) => {
                            const otherId = chat.participants.find((p: string) => p !== user?.uid)
                            const name = chat.participantNames?.[otherId] || "User"
                            const isActive = activeChatId === chat.id

                            return (
                                <button 
                                    key={chat.id}
                                    onClick={() => {
                                        setActiveChatId(chat.id)
                                        setIsMobileListOpen(false)
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left",
                                        isActive ? "bg-primary shadow-lg shadow-primary/20 scale-[1.02]" : "hover:bg-slate-100/50"
                                    )}
                                >
                                    <Avatar className="w-10 h-10 border-2 border-white/50">
                                        <AvatarFallback className={cn(
                                            "text-xs font-black",
                                            isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                                        )}>
                                            {name[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className={cn("text-xs font-black uppercase truncate", isActive ? "text-white" : "text-slate-700")}>
                                                {name}
                                            </p>
                                            <span className={cn("text-[8px] font-bold uppercase", isActive ? "text-white/60" : "text-slate-400")}>
                                                {formatTime(chat.updatedAt)}
                                            </span>
                                        </div>
                                        <p className={cn("text-[10px] font-bold truncate mt-0.5", isActive ? "text-white/80" : "text-slate-400")}>
                                            {chat.lastMessage}
                                        </p>
                                    </div>
                                </button>
                            )
                        }) : (
                            <div className="py-20 flex flex-col items-center gap-3 opacity-30 text-center">
                                <MessageSquare className="w-8 h-8" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Belum ada percakapan</p>
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>
        </div>

        {/* AREA CHAT: Pesan Aktif */}
        <div className={cn(
            "flex-1 flex flex-col bg-slate-50/30 transition-all",
            isMobileListOpen && "hidden md:flex"
        )}>
            {activeChatId ? (
                <>
                    {/* Header Chat */}
                    <div className="p-4 md:p-6 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm relative z-10">
                        <div className="flex items-center gap-3">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="md:hidden -ml-2 rounded-full h-8 w-8 p-0"
                                onClick={() => setIsMobileListOpen(true)}
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                            <Avatar className="w-10 h-10 border-2 border-primary/10">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-black uppercase">
                                    {otherParticipantName[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none mb-1">
                                    {otherParticipantName}
                                </h2>
                                <div className="flex items-center gap-1.5">
                                    <Circle className="w-1.5 h-1.5 fill-emerald-500 text-emerald-500" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Terhubung</span>
                                </div>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-slate-400">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Area Pesan */}
                    <ScrollArea className="flex-1 p-4 md:p-6 bg-slate-50/50">
                        <div className="space-y-4 max-w-4xl mx-auto">
                            <div className="flex justify-center my-8">
                                <Badge variant="outline" className="bg-white/80 border-slate-100 text-slate-400 font-bold text-[9px] px-4 py-1 rounded-full uppercase tracking-widest">
                                    Awal Percakapan Dimulai
                                </Badge>
                            </div>
                            
                            {activeMessages.map((msg: any) => {
                                const isMe = msg.senderId === user?.uid
                                return (
                                    <div 
                                        key={msg.id}
                                        className={cn(
                                            "flex flex-col max-w-[85%] md:max-w-[70%]",
                                            isMe ? "ml-auto items-end" : "mr-auto items-start"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-3 md:p-4 rounded-3xl text-sm font-medium shadow-sm break-words",
                                            isMe 
                                                ? "bg-primary text-white rounded-tr-none shadow-primary/10" 
                                                : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                                        )}>
                                            {msg.text}
                                        </div>
                                        <span className="text-[9px] font-black text-slate-400 mt-1 uppercase mx-2">
                                            {formatTime(msg.createdAt)}
                                        </span>
                                    </div>
                                )
                            })}
                            <div ref={scrollRef} />
                        </div>
                    </ScrollArea>

                    {/* Input Pesan */}
                    <div className="p-4 md:p-6 bg-white border-t border-slate-100 relative z-10">
                        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-2 md:gap-3">
                            <div className="flex-1 relative">
                                <Input 
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    placeholder="Tulis pesan..." 
                                    className="pr-12 h-12 rounded-2xl bg-slate-50 border-none focus:ring-primary shadow-inner text-sm font-bold"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-pulse" />
                                </div>
                            </div>
                            <Button 
                                type="submit" 
                                className="h-12 w-12 md:w-auto md:px-6 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 shrink-0"
                            >
                                <Send className="w-4 h-4 md:mr-2" />
                                <span className="hidden md:inline font-black uppercase text-xs">Kirim</span>
                            </Button>
                        </form>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/40">
                    <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6">
                        <MessageSquare className="w-10 h-10 text-primary opacity-20" />
                    </div>
                    <h2 className="text-xl font-black text-slate-700 uppercase tracking-tight mb-2">Pusat Pesan</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest max-w-xs leading-relaxed">
                        Pilih teman bicara atau cari pengguna lain untuk memulai percakapan baru.
                    </p>
                </div>
            )}
        </div>
      </div>
    </div>
  )
}

export default function PesanPage() {
    return (
        <Suspense fallback={
            <div className="h-screen flex flex-col items-center justify-center gap-4 text-primary">
                <Loader2 className="w-10 h-10 animate-spin" />
                <p className="font-black uppercase text-xs tracking-widest animate-pulse">Menghubungkan...</p>
            </div>
        }>
            <PesanContent />
        </Suspense>
    )
}
