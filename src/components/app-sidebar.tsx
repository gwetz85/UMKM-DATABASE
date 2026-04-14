
"use client"

import * as React from "react"
import { InfoDialog } from "./info-dialog"
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
  FileText,
  ChevronRight,
  BarChart3,
  ClipboardCheck,
  ListChecks,
  ShieldAlert,
  Calendar
} from "lucide-react"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useUser, useObject, useMemoFirebase, useAuth, useList, useDatabase } from "@/firebase"
import { ref, query } from "firebase/database"
import { signOut } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useSoundEffect } from "@/hooks/use-sound-effect"

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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import { Button } from "./ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"

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
  const { playSound } = useSoundEffect()

  React.useEffect(() => {
    setMounted(true)
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
  const isDinas = userProfile?.role === 'dinas'

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
      show: isAdmin
    },
    {
      name: "Input Data",
      href: "/input",
      icon: UserPlus,
      show: !!user && !isKoordinator
    },
    {
      name: "Verifikasi Admin",
      href: "/verify-actor",
      icon: ShieldCheck,
      show: isAdmin || isPetugas || isMonitoring
    },
    {
      name: "Data Pelaku Usaha",
      href: "/actor-data",
      icon: Users,
      show: !!user && !isDinas
    },
    {
      name: "Data Ditolak",
      href: "/rejected",
      icon: Ban,
      show: !!user && !isDinas && !isKoordinator
    },
    {
      name: "Verifikasi Data",
      href: "/verify-bank",
      icon: CreditCard,
      show: isAdmin || isMonitoring
    },
    {
      name: "Verifikasi & Validasi Dinas",
      href: "/verifikasi-dinas",
      icon: ClipboardCheck,
      show: isAdmin || isDinas
    },
    {
      name: "HASIL VERIFIKASI",
      href: "/hasil-verifikasi",
      icon: ListChecks,
      show: (isAdmin || isPetugas || isKoordinator) && !isDinas
    },
    {
      name: "Rekening Bank",
      icon: CreditCard,
      show: !!user && !isDinas,
      items: [
        { name: "BCA", href: "/rekening-bank?bank=BCA" },
        { name: "BNI", href: "/rekening-bank?bank=BNI" },
        { name: "BRI", href: "/rekening-bank?bank=BRI" },
        { name: "BRK", href: "/rekening-bank?bank=BRK" },
        { name: "MANDIRI", href: "/rekening-bank?bank=MANDIRI" },
        { name: "PANIN", href: "/rekening-bank?bank=PANIN" },
        { name: "OCBC", href: "/rekening-bank?bank=OCBC" },
        { name: "DANAMON", href: "/rekening-bank?bank=DANAMON" },
        { name: "BUKOPIN", href: "/rekening-bank?bank=BUKOPIN" },
        { name: "BTN", href: "/rekening-bank?bank=BTN" }
      ]
    },
    {
      name: "LPJ",
      href: "/lpj",
      icon: FileText,
      show: (isAdmin || isPetugas || isMonitoring) && !isKoordinator
    },
    {
      name: "Data Selesai",
      href: "/finish",
      icon: CheckCircle2,
      show: !!user && !isDinas
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
      show: !!user
    },
    {
      name: "Kuota KORLAP / DEWAN AKTIF",
      href: "/kuota-koordinator",
      icon: BarChart3,
      show: isAdmin
    },
    {
      name: "Monitoring Chat",
      href: "/chat-monitoring",
      icon: MessageSquare,
      show: isAdmin || isMonitoring
    },
    {
      name: "LOG APLIKASI",
      href: "/app-logs",
      icon: History,
      show: isAdmin
    },
    {
      name: "Pengaturan Event",
      href: "/settings-event",
      icon: Calendar,
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
      router.push("/login")
    } else {
      router.push("/login")
    }
  }

  if (pathname === "/login") return null

  if (!mounted) {
    return (
      <Sidebar collapsible="icon" variant="floating" className="border-none shadow-2xl glass bg-transparent h-[calc(100vh-2rem)] my-4 ml-4">
        <SidebarHeader className="py-8 flex flex-col items-center justify-center border-b border-primary/5">
          <div className="bg-primary/10 rounded-2xl p-2 w-12 h-12 shadow-inner animate-pulse" />
        </SidebarHeader>
        <SidebarContent />
        <SidebarFooter className="p-4 bg-primary/5 mt-auto" />
      </Sidebar>
    )
  }

  return (
    <Sidebar collapsible="icon" variant="floating" className="border-none shadow-none bg-transparent h-full md:h-[calc(100vh-2rem)] md:my-4 md:ml-4">
      <SidebarHeader className="py-10 flex flex-col items-center justify-center border-b border-black/5">
        <div className="flex flex-col items-center justify-center w-full">
          <InfoDialog>
            <button className="flex flex-col items-center gap-4 transition-all duration-500 hover:scale-110 active:scale-95 outline-none group">
              <div className="relative group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 w-28 h-28 flex items-center justify-center overflow-hidden rounded-[2.5rem] bg-white shadow-[0_15px_40px_rgba(0,0,0,0.1)] border border-black/5 transition-all group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.15)]">
                <img
                  src="/logo.png"
                  alt="SIMPU Logo"
                  className="w-full h-full object-contain p-3"
                />
              </div>
            </button>
          </InfoDialog>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 mb-3 group-data-[collapsible=icon]:hidden text-slate-500 font-black text-[10px] uppercase tracking-[0.25em]">
            Navigasi Utama
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {navigation.filter((i: any) => i.show).map((item: any) => (
                <SidebarMenuItem key={item.name}>
                  {item.items ? (
                    <Collapsible defaultOpen className="group/collapsible">
                      <SidebarMenuButton
                        asChild
                        className={cn(
                          "h-12 px-4 rounded-xl transition-all duration-200 hover:bg-black/5 text-slate-900 font-[700]",
                          item.items.some((sub: any) => pathname === sub.href) ? "bg-black/5" : "bg-transparent",
                          "group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center active:scale-95"
                        )}
                      >
                        <CollapsibleTrigger asChild>
                          <div
                            className="flex items-center gap-3.5 w-full cursor-pointer"
                            onClick={() => playSound('click')}
                          >
                            <div className="w-8 h-8 rounded-[10px] bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <item.icon className="w-4.5 h-4.5" />
                            </div>
                            <span className="text-[15px] group-data-[collapsible=icon]:hidden">
                              {item.name}
                            </span>
                            <ChevronRight className="ml-auto w-4 h-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden opacity-30" />
                          </div>
                        </CollapsibleTrigger>
                      </SidebarMenuButton>
                      <CollapsibleContent className="animate-in slide-in-from-top-1 duration-300">
                        <SidebarMenuSub className="border-primary/10 ml-6 mr-2 mt-1 gap-1.5">
                          {item.items.map((subItem: any) => (
                            <SidebarMenuSubItem key={subItem.name}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === subItem.href}
                                className={cn(
                                  "rounded-xl transition-all text-slate-700 hover:text-slate-900 hover:bg-black/5 h-9",
                                  "data-[active=true]:bg-white data-[active=true]:text-primary font-black shadow-sm"
                                )}
                              >
                                <Link
                                  href={subItem.href}
                                  className="flex items-center gap-2 w-full"
                                  onClick={() => playSound('click')}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40 group-data-[active=true]:opacity-100" />
                                  <span className="text-[11px] uppercase tracking-widest">{subItem.name}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.name}
                      onClick={() => playSound('click')}
                      className={cn(
                        "h-12 px-4 rounded-xl transition-all duration-300 hover:bg-black/5 text-slate-900 font-[700]",
                        "data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:shadow-lg data-[active=true]:shadow-primary/20",
                        "group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center active:scale-95"
                      )}
                    >
                      <Link
                        href={item.href}
                        className="flex items-center gap-3.5 w-full"
                      >
                         <div className={cn(
                            "w-8 h-8 rounded-[10px] flex items-center justify-center transition-all",
                            pathname === item.href ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                         )}>
                            <item.icon className="w-4.5 h-4.5" />
                         </div>
                        <span className="text-[15px] group-data-[collapsible=icon]:hidden">
                          {item.name}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 bg-primary/5 mt-auto border-t border-primary/10">
        <div className="flex flex-col gap-4">
          {user && (
            <div className="group-data-[collapsible=icon]:hidden flex flex-col gap-3">
              <div className="glass-panel p-3.5 space-y-3 rounded-2xl border-primary/10 shadow-lg">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 hover:bg-white/10 p-1.5 rounded-xl transition-all cursor-pointer w-full group/profile"
                >
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center group-hover/profile:scale-110 transition-all overflow-hidden border-2 border-white shadow-md">
                    {userProfile?.photoURL ? (
                      <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-black text-slate-900 truncate group-hover/profile:text-primary transition-colors uppercase tracking-tight">
                      {userProfile?.fullName?.toUpperCase() || user.email?.split('@')[0].toUpperCase()}
                    </span>
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1">
                       <ShieldCheck className="w-2.5 h-2.5" />
                       {isAdmin ? "Admin" : isMonitoring ? "Monitoring" : isKoordinator ? "KORLAP" : isPetugas ? "Petugas" : isDinas ? "Dinas" : "User"}
                    </span>
                  </div>
                </Link>

                <div className="flex items-center justify-between bg-black/5 p-2 rounded-xl gap-2 border border-black/5 shadow-inner">
                  <span className="text-[9px] text-slate-500 font-mono truncate select-all">
                    {user.uid}
                  </span>
                  <Copy 
                    className="w-3 h-3 text-slate-400 cursor-pointer hover:text-primary transition-colors" 
                    onClick={() => {
                      navigator.clipboard.writeText(user.uid);
                      toast({
                        title: "ID Disalin",
                        description: "UID akun Anda telah disalin ke clipboard",
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <SidebarMenu>
            <SidebarMenuItem>
               <SidebarMenuButton
                onClick={handleAuthAction}
                className="h-11 rounded-2xl hover:bg-white/10 hover:text-white text-white/60 transition-all group-data-[collapsible=icon]:justify-center active:scale-95 font-black uppercase tracking-[0.1em] text-[10px]"
              >
                {user ? (
                  <>
                    <LogOut className="w-5 h-5 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden ml-2">
                      Logout (Keluar)
                    </span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 shrink-0 text-primary" />
                    <span className="group-data-[collapsible=icon]:hidden ml-2">
                      Login (Masuk)
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
