
"use client"

import * as React from "react"
import {
  LayoutDashboard,
  UserPlus,
  ShieldCheck,
  Users,
  CreditCard,
  CheckCircle2,
  LogOut,
  UserCog,
  Copy,
  Check,
  User as UserIcon,
  Settings,
  SearchCheck,
  Clock,
  LogIn,
  Eye,
  Ban,
  MessageSquare,
  History
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useUser, useDoc, useMemoFirebase, useAuth, useCollection, useFirestore } from "@/firebase"
import { doc, collection, query, where, limit } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { Button } from "./ui/button"

// Custom UMKM Logo SVG
export const UmkmLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 21h18" />
    <path d="M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4" />
    <path d="M5 21V10.85" />
    <path d="M19 21V10.85" />
    <path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" />
  </svg>
)

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useUser()
  const auth = useAuth()
  const { toast } = useToast()
  const firestore = useFirestore()
  const [copied, setCopied] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState<string>("")
  const [currentDate, setCurrentDate] = React.useState<string>("")

  // Clock Update Effect
  React.useEffect(() => {
    setMounted(true)
    const updateTime = () => {
      const now = new Date()
      
      const time = now.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: false 
      })
      
      const date = now.toLocaleDateString('id-ID', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })
      
      setCurrentTime(time)
      setCurrentDate(date)
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // Admin Check
  const adminRef = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return doc(firestore, 'roles_admin', user.uid)
  }, [user, firestore])
  const { data: adminRole } = useDoc(adminRef)

  // System User / Role Check
  const userProfileQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return query(collection(firestore, 'system_users'), where('uid', '==', user.uid), limit(1))
  }, [user, firestore])
  const { data: userProfiles } = useCollection(userProfileQuery)
  const userProfile = userProfiles?.[0]

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin'
  const isMonitoring = userProfile?.role === 'monitoring'

  const navigation = React.useMemo(() => [
    { 
      name: "Dashboard", 
      href: "/", 
      icon: LayoutDashboard, 
      show: !!user 
    },
    { 
      name: "Cek Data", 
      href: "/check-data", 
      icon: SearchCheck, 
      show: true 
    },
    { 
      name: "Input Data", 
      href: "/input", 
      icon: UserPlus, 
      show: !!user && !isMonitoring 
    },
    { 
      name: "Verifikasi Admin", 
      href: "/verify-actor", 
      icon: ShieldCheck, 
      show: isAdmin 
    },
    { 
      name: "Data Pelaku", 
      href: "/actor-data", 
      icon: Users, 
      show: !!user 
    },
    { 
      name: "Ditolak / Cancell", 
      href: "/rejected", 
      icon: Ban, 
      show: !!user 
    },
    { 
      name: "Verifikasi Data", 
      href: "/verify-bank", 
      icon: CreditCard, 
      show: isAdmin 
    },
    { 
      name: "Finish", 
      href: "/finish", 
      icon: CheckCircle2, 
      show: !!user 
    },
    { 
      name: "Manajemen User", 
      href: "/users", 
      icon: UserCog, 
      show: isAdmin 
    },
    { 
      name: "Chat", 
      href: "/chat", 
      icon: MessageSquare, 
      show: !!user 
    },
    { 
      name: "Riwayat Chat", 
      href: "/chat-history", 
      icon: History, 
      show: isAdmin || userProfile?.role === 'petugas'
    },
    { 
      name: "Pengaturan", 
      href: "/settings", 
      icon: Settings, 
      show: !!user 
    },
  ], [user, isAdmin, isMonitoring, userProfile])

  const copyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid)
      setCopied(true)
      toast({ title: "UID Disalin", description: "Berikan UID ini ke Admin untuk akses penuh." })
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleAuthAction = async () => {
    if (user) {
      await signOut(auth)
      router.push("/login")
      toast({ title: "Keluar Sistem", description: "Anda telah berhasil keluar." })
    } else {
      router.push("/login")
    }
  }

  if (pathname === "/login") return null

  if (!mounted) {
    return (
      <Sidebar collapsible="icon" className="border-r-0 shadow-2xl bg-gradient-to-b from-primary to-blue-900">
        <SidebarHeader className="py-6 flex flex-col items-center justify-center border-b border-white/5">
          <div className="bg-accent rounded-xl p-2 w-10 h-10 shadow-inner" />
        </SidebarHeader>
        <SidebarContent />
        <SidebarFooter className="p-4 bg-black/10 mt-auto" />
      </Sidebar>
    )
  }

  return (
    <Sidebar collapsible="icon" className="border-r-0 shadow-[4px_0_24px_rgba(0,0,0,0.1)] bg-gradient-to-b from-primary to-blue-900 text-white">
      <SidebarHeader className="py-4 flex flex-col items-center justify-center border-b border-white/10 sticky top-0 bg-transparent backdrop-blur-md z-20">
        <div className="flex flex-col items-center gap-2 w-full mb-4">
          <div className="bg-white/20 rounded-xl p-2 shadow-lg flex items-center justify-center transition-transform duration-300 hover:scale-105">
            <UmkmLogo className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col items-center group-data-[collapsible=icon]:hidden">
            <span className="font-black text-lg tracking-tight text-white leading-none">
              UMKM DATABASE
            </span>
            <span className="text-[9px] font-bold text-white/60 tracking-widest uppercase mt-1">
              Sistem Terpadu
            </span>
          </div>
        </div>

        {/* Waktu Server */}
        <div className="w-full group-data-[collapsible=icon]:hidden px-2 mb-2">
          <div className="bg-black/40 rounded-2xl p-4 border border-white/5 flex flex-col items-center gap-1 relative overflow-hidden shadow-inner text-center">
            <div className="flex items-center justify-center gap-2 w-full mb-1">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] leading-none">SERVER REAL-TIME</span>
              <Clock className="w-3.5 h-3.5 text-white/20" />
            </div>
            <div className="text-2xl font-black text-white tracking-tight leading-none mb-1 tabular-nums">
              {currentTime}
            </div>
            <div className="text-[11px] font-medium text-white/60 whitespace-nowrap">
              {currentDate}
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 mb-2 group-data-[collapsible=icon]:hidden text-white/40 font-bold text-[10px] uppercase tracking-[0.2em]">
            Menu Utama
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navigation.filter(i => i.show).map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.name}
                    className={cn(
                      "h-10 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 text-white/80",
                      "data-[active=true]:bg-white data-[active=true]:text-primary data-[active=true]:shadow-lg",
                      "group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                    )}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="w-4.5 h-4.5 shrink-0" />
                      <span className="font-bold text-xs truncate group-data-[collapsible=icon]:hidden">
                        {item.name}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 bg-black/10 mt-auto">
        <div className="flex flex-col gap-3">
          {user && (
            <div className="group-data-[collapsible=icon]:hidden flex flex-col gap-2">
              <div className="bg-white/10 rounded-xl border border-white/10 p-2.5 space-y-2">
                <Link href="/profile" className="flex items-center gap-2 hover:bg-white/5 p-1 rounded-lg transition-colors cursor-pointer w-full group/profile">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center group-hover/profile:bg-white/30 transition-colors">
                    <UserIcon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black text-white truncate group-hover/profile:text-accent transition-colors">
                      {userProfile?.fullName?.toUpperCase() || user.email?.split('@')[0].toUpperCase()}
                    </span>
                    <span className="text-[8px] text-white/60 font-black uppercase tracking-tighter">
                      {isAdmin ? "🛡️ Admin" : isMonitoring ? "👁️ Monitoring" : userProfile?.role === 'petugas' ? "📝 Petugas" : "👤 User"}
                    </span>
                  </div>
                </Link>
                
                <div className="flex items-center justify-between bg-black/20 p-1.5 rounded-lg gap-2">
                  <span className="text-[8px] text-white/40 font-mono truncate select-all">
                    {user.uid}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5 text-white/30 hover:text-white hover:bg-white/10" 
                    onClick={copyUid}
                  >
                    {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={handleAuthAction}
                className="h-10 rounded-xl hover:bg-white/20 hover:text-white text-white/60 transition-colors group-data-[collapsible=icon]:justify-center"
              >
                {user ? (
                  <>
                    <LogOut className="w-4.5 h-4.5 shrink-0" />
                    <span className="text-xs font-bold group-data-[collapsible=icon]:hidden">
                      Keluar Sistem
                    </span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4.5 h-4.5 shrink-0" />
                    <span className="text-xs font-bold group-data-[collapsible=icon]:hidden">
                      Masuk (Login)
                    </span>
                  </>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
