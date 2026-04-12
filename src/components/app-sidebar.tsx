
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
  ShieldAlert
} from "lucide-react"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
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
      name: "Data Pelaku", 
      href: "/actor-data", 
      icon: Users, 
      show: !!user && !isDinas
    },
    { 
      name: "Ditolak / Cancell", 
      href: "/rejected", 
      icon: Ban, 
      show: !!user && !isDinas
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
      show: (isAdmin || isPetugas) && !isDinas
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
      name: "Finish", 
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
      show: !!user && !isKoordinator
    },
    { 
      name: "Kuota Koordinator", 
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
      <Sidebar collapsible="icon" className="border-r-0 shadow-2xl bg-primary">
        <SidebarHeader className="py-6 flex flex-col items-center justify-center border-b border-white/5">
          <div className="bg-accent rounded-xl p-2 w-10 h-10 shadow-inner" />
        </SidebarHeader>
        <SidebarContent />
        <SidebarFooter className="p-4 bg-black/10 mt-auto" />
      </Sidebar>
    )
  }

  return (
    <Sidebar collapsible="icon" className="border-r-0 text-white">
      <SidebarHeader className="py-6 flex flex-col items-center justify-center border-b border-white/10">
        <div className="flex flex-col items-center justify-center w-full">
          <InfoDialog>
            <button className="flex flex-col items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95 outline-none">
              <div className="relative group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 w-24 h-24 flex items-center justify-center overflow-hidden rounded-full border-2 border-white/20 shadow-2xl bg-white">
                <img 
                  src="/logo.png" 
                  alt="SIMPU Logo" 
                  className="w-full h-full object-contain p-2"
                />
              </div>
            </button>
          </InfoDialog>
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
                  {item.items ? (
                    <Collapsible defaultOpen className="group/collapsible">
                      <SidebarMenuButton
                        asChild
                        tooltip={item.name}
                        className={cn(
                          "h-10 px-3 rounded-xl transition-all duration-300 hover:bg-white/10 text-white/80",
                          item.items.some((sub: any) => pathname === sub.href) && "bg-white/5",
                          "group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center",
                          "active:scale-95 animate-in fade-in-up"
                        )}
                      >
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center gap-3 w-full cursor-pointer">
                            <item.icon className="w-4.5 h-4.5 shrink-0" />
                            <span className="font-bold text-xs truncate group-data-[collapsible=icon]:hidden">
                              {item.name}
                            </span>
                            <ChevronRight className="ml-auto w-3 h-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden opacity-40" />
                          </div>
                        </CollapsibleTrigger>
                      </SidebarMenuButton>
                      <CollapsibleContent className="animate-in slide-in-from-top-1 duration-200">
                        <SidebarMenuSub className="border-white/10 ml-6 mr-2 mt-1 gap-1">
                          {item.items.map((subItem: any) => (
                            <SidebarMenuSubItem key={subItem.name}>
                              <SidebarMenuSubButton 
                                asChild 
                                isActive={pathname === subItem.href}
                                className={cn(
                                  "rounded-lg transition-all text-white/60 hover:text-white hover:bg-white/5 h-8",
                                  "data-[active=true]:bg-white data-[active=true]:text-primary font-bold shadow-sm"
                                )}
                              >
                                <Link href={subItem.href} className="flex items-center gap-2 w-full">
                                  <div className="w-1 h-1 rounded-full bg-current opacity-40" />
                                  <span className="text-[11px] uppercase tracking-wider">{subItem.name}</span>
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
                      className={cn(
                        "h-10 px-3 rounded-xl transition-all duration-300 hover:bg-white/10 text-white/80",
                        "data-[active=true]:bg-white data-[active=true]:text-primary data-[active=true]:shadow-lg",
                        "group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center",
                        "active:scale-95 animate-in fade-in-up"
                      )}
                    >
                      <Link 
                        href={item.href} 
                        className="flex items-center gap-3 w-full"
                      >
                        <item.icon className="w-4.5 h-4.5 shrink-0" />
                        <span className="font-bold text-xs truncate group-data-[collapsible=icon]:hidden">
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

      <SidebarFooter className="p-3 bg-black/10 mt-auto">
        <div className="flex flex-col gap-3">
          {user && (
            <div className="group-data-[collapsible=icon]:hidden flex flex-col gap-2">
              <div className="bg-white/10 rounded-xl border border-white/10 p-2.5 space-y-2">
                <Link 
                  href="/profile"
                  className="flex items-center gap-2 hover:bg-white/5 p-1 rounded-lg transition-colors cursor-pointer w-full group/profile"
                >
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center group-hover/profile:bg-white/30 transition-colors overflow-hidden border border-white/10">
                    {userProfile?.photoURL ? (
                      <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black text-white truncate group-hover/profile:text-accent transition-colors">
                      {userProfile?.fullName?.toUpperCase() || user.email?.split('@')[0].toUpperCase()}
                    </span>
                    <span className="text-[8px] text-white/60 font-black uppercase tracking-tighter">
                      {isAdmin ? "🛡️ Admin" : isMonitoring ? "👁️ Monitoring" : isKoordinator ? "🤝 Koordinator" : isPetugas ? "📝 Petugas" : isDinas ? "🏢 Dinas" : "👤 User"}
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
