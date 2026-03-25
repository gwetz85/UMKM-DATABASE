
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
  History,
  FileText
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useUser, useObject, useMemoFirebase, useAuth, useList, useDatabase } from "@/firebase"
import { ref, query, equalTo, limitToFirst } from "firebase/database"
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
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "./ui/button"

export const SimpuLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
)

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile, setOpenMobile } = useSidebar()
  const { user } = useUser()
  const auth = useAuth()
  const { toast } = useToast()
  const database = useDatabase()
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
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole } = useObject(adminRef)

  // System User / Role Check
  const usersRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])
  const { data: allUsersForProfile } = useList(usersRef)
  const userProfile = allUsersForProfile?.find((u: any) => u.uid === user?.uid)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin'
  const isMonitoring = userProfile?.role === 'monitoring'
  const isKoordinator = userProfile?.role === 'koordinator'
  const isPetugas = userProfile?.role === 'petugas'

  const navigation = React.useMemo(() => [
    { 
      name: "Dashboard", 
      href: "/", 
      icon: LayoutDashboard, 
      show: !!user && !isKoordinator
    },
    { 
      name: "Cek Data", 
      href: "/check-data", 
      icon: SearchCheck, 
      show: !isKoordinator
    },
    { 
      name: "Input Data", 
      href: "/input", 
      icon: UserPlus, 
      show: !!user && !isMonitoring && !isKoordinator
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
      name: "LPJ", 
      href: "/lpj", 
      icon: FileText, 
      show: (isAdmin || isPetugas) && !isKoordinator
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
      name: "Pengaturan", 
      href: "/settings", 
      icon: Settings, 
      show: !!user && !isKoordinator
    },
    { 
      name: "Monitoring Chat", 
      href: "/chat-monitoring", 
      icon: MessageSquare, 
      show: isAdmin 
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
    if (isMobile) setOpenMobile(false);
    if (user) {
      await signOut(auth)
      window.location.href = "/login"
    } else {
      window.location.href = "/login"
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
      <SidebarHeader className="py-6 flex flex-col items-center justify-center border-b border-white/10">
        <div className="flex flex-col items-center justify-center w-full">
          <Link href="/" className="flex flex-col items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95">
            <div className="relative group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 w-24 h-24 overflow-hidden rounded-full border-2 border-white/20 shadow-2xl">
              <img 
                src="/logo.png" 
                alt="SIMPU Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col items-center group-data-[collapsible=icon]:hidden mt-2">
              <span className="text-[11px] font-black text-white/50 tracking-[0.25em] uppercase leading-none italic">
                Sistem Informasi Manajemen
              </span>
            </div>
          </Link>
        </div>

        {/* Waktu Server */}
        <div className="w-full group-data-[collapsible=icon]:hidden px-2 mb-2">
          <div className="bg-black/40 rounded-2xl p-4 border border-white/5 flex flex-col items-center gap-1 relative overflow-hidden shadow-inner text-center">
            <div className="text-3xl font-black text-white tracking-tight leading-none mb-1 tabular-nums mt-1">
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
              {navigation.filter((i: any) => i.show).map((item: any) => (
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
                    <a 
                      href={item.href} 
                      className="flex items-center gap-3 w-full"
                      onClick={() => {
                        if (isMobile) {
                          setOpenMobile(false);
                        }
                      }}
                    >
                      <item.icon className="w-4.5 h-4.5 shrink-0" />
                      <span className="font-bold text-xs truncate group-data-[collapsible=icon]:hidden">
                        {item.name}
                      </span>
                    </a>
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
                <a 
                  href="/profile" 
                  className="flex items-center gap-2 hover:bg-white/5 p-1 rounded-lg transition-colors cursor-pointer w-full group/profile"
                  onClick={() => {
                    if (isMobile) setOpenMobile(false);
                  }}
                >
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center group-hover/profile:bg-white/30 transition-colors">
                    <UserIcon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black text-white truncate group-hover/profile:text-accent transition-colors">
                      {userProfile?.fullName?.toUpperCase() || user.email?.split('@')[0].toUpperCase()}
                    </span>
                    <span className="text-[8px] text-white/60 font-black uppercase tracking-tighter">
                      {isAdmin ? "🛡️ Admin" : isMonitoring ? "👁️ Monitoring" : isKoordinator ? "🤝 Koordinator" : isPetugas ? "📝 Petugas" : "👤 User"}
                    </span>
                  </div>
                </a>
                
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
