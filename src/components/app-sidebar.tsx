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
  Calendar,
  Sparkles
} from "lucide-react"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useUser, useAuth, useDatabase } from "@/firebase"
import { ref, update } from "firebase/database"
import { signOut } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useSoundEffect } from "@/hooks/use-sound-effect"
import { useNavigation } from "@/hooks/use-navigation"

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

  const { navigation, isAdmin, isKoordinator, isMonitoring, isPetugas, isDinas, isStaff, userProfile } = useNavigation()

  const copyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid)
      setCopied(true)
      toast({ title: "UID Disalin", description: "Berikan UID ini ke Admin untuk akses penuh." })
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleAuthAction = async () => {
    if (isMobile) setOpenMobile(false)
    if (user) {
      if (userProfile?.id && database) {
        try {
          await update(ref(database, `system_users/${userProfile.id}`), {
            isOnline: false,
            lastSeen: Date.now()
          })
        } catch (e) {
          // ignore
        }
      }
      await signOut(auth)
      router.push("/login")
    } else {
      router.push("/login")
    }
  }

  // Growly-style categorized navigation groups
  const categorizedNavigation = React.useMemo(() => {
    const visible = navigation.filter((i: any) => i.show)

    const groups: { label: string; items: any[] }[] = [
      {
        label: "OVERVIEW",
        items: visible.filter((i: any) => i.href === "/dashboard" || i.href === "/")
      },
      {
        label: "DATA & PENDAFTARAN",
        items: visible.filter((i: any) => {
          const h = (i.href || '').toLowerCase()
          return h.includes('input') || h.includes('actor') || h.includes('check-data') || h.includes('cek-usaha') || h.includes('rejected') || h.includes('verify-actor') || h.includes('daftar')
        }).sort((a: any, b: any) => {
          const priority = ['/input', '/pendaftaran', '/daftar', '/verify-actor', '/actor-data', '/check-data', '/check-data-collective', '/cek-usaha', '/rejected']
          const aIndex = priority.indexOf(a.href)
          const bIndex = priority.indexOf(b.href)
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
          if (aIndex !== -1) return -1
          if (bIndex !== -1) return 1
          return 0
        })
      },
      {
        label: "ALUR TAHAPAN DINAS",
        items: visible.filter((i: any) => {
          const h = (i.href || '').toLowerCase()
          return h.includes('verifikasi-dinas') || h.includes('hasil-verifikasi') || h.includes('finish') || h.includes('rekening') || h.includes('portal-survey')
        }).sort((a: any, b: any) => {
          const priority = ['/portal-survey', '/verifikasi-dinas', '/verifikasi-dinas-berkas', '/hasil-verifikasi', '/data-rekening', '/finish']
          const aIndex = priority.indexOf(a.href)
          const bIndex = priority.indexOf(b.href)
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
          if (aIndex !== -1) return -1
          if (bIndex !== -1) return 1
          return 0
        })
      },
      {
        label: "LAPORAN & DOKUMEN",
        items: visible.filter((i: any) => {
          const h = (i.href || '').toLowerCase()
          return h.includes('rekapan') || h.includes('gbas') || h.includes('cetak') || h.includes('lpj')
        })
      },
      {
        label: "KOMUNIKASI & SISTEM",
        items: visible.filter((i: any) => {
          const h = (i.href || '').toLowerCase()
          return h.includes('messages') || h.includes('settings') || h.includes('users') || h.includes('layar-informasi') || h.includes('compliance')
        })
      }
    ]

    const categorizedHrefs = new Set(groups.flatMap(g => g.items.map(i => i.href)))
    const others = visible.filter((i: any) => !categorizedHrefs.has(i.href))
    if (others.length > 0) {
      groups.push({ label: "MODUL LAINNYA", items: others })
    }

    return groups.filter(g => g.items.length > 0)
  }, [navigation])

  if (pathname === "/login") return null

  if (!mounted) {
    return (
      <Sidebar collapsible="icon" className="border-r border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl">
        <SidebarHeader className="py-5 flex flex-col items-center justify-center border-b border-slate-200/70 dark:border-white/10">
          <div className="bg-primary/10 rounded-2xl p-2 w-10 h-10 animate-pulse" />
        </SidebarHeader>
        <SidebarContent />
        <SidebarFooter className="p-4" />
      </Sidebar>
    )
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl text-slate-800 dark:text-slate-100 shadow-xl shadow-slate-200/40 dark:shadow-none">
      {/* ─── BRAND HEADER ─── */}
      <SidebarHeader className="py-4 px-4 flex flex-col border-b border-slate-200/70 dark:border-white/10">
        <div className="flex items-center gap-3 w-full">
          <InfoDialog>
            <button className="flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 outline-none group text-left">
              <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#005e61] to-[#00C48C] p-[2px] shadow-md shadow-teal-700/20 shrink-0">
                <div className="w-full h-full rounded-[14px] bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                  <img
                    src="/logo.png"
                    alt="SIMPU Logo"
                    className="w-full h-full object-contain p-1"
                  />
                </div>
              </div>

              <div className="flex flex-col group-data-[collapsible=icon]:hidden min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base text-slate-900 dark:text-white tracking-tight uppercase">
                    SIMPU
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    2026
                  </span>
                </div>
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
                  Kota Tanjungpinang
                </span>
              </div>
            </button>
          </InfoDialog>
        </div>
      </SidebarHeader>

      {/* ─── NAVIGATION GROUPS ─── */}
      <SidebarContent className="px-2.5 py-3 space-y-4 custom-scrollbar">
        {categorizedNavigation.map((group) => (
          <SidebarGroup key={group.label} className="p-0">
            <SidebarGroupLabel className="px-3 mb-1.5 group-data-[collapsible=icon]:hidden text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-[0.18em]">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {group.items.map((item: any) => {
                  const isActive = pathname === item.href || (item.href === "/dashboard" && pathname === "/")
                  const itemColor = item.color || '#005e61'

                  return (
                    <SidebarMenuItem key={item.name}>
                      {item.items ? (
                        <Collapsible defaultOpen={item.items.some((sub: any) => pathname === sub.href)} className="group/collapsible">
                          <SidebarMenuButton
                            asChild
                            tooltip={item.name}
                            className={cn(
                              "h-10.5 px-3 rounded-2xl transition-all duration-200 text-xs font-black",
                              item.items.some((sub: any) => pathname === sub.href)
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                                : "text-slate-900 dark:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-primary",
                              "group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center",
                              "active:scale-95"
                            )}
                          >
                            <CollapsibleTrigger asChild>
                              <div
                                className="flex items-center gap-3 w-full cursor-pointer"
                                onClick={() => playSound('click')}
                              >
                                <div 
                                  className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-white/10 shadow-2xs"
                                  style={{ 
                                    backgroundColor: `${itemColor}20`,
                                    color: itemColor 
                                  }}
                                >
                                  <item.icon className="w-4 h-4" />
                                </div>
                                <span className="font-black text-xs text-slate-900 dark:text-slate-100 tracking-tight truncate group-data-[collapsible=icon]:hidden">
                                  {item.name}
                                </span>
                                <ChevronRight className="ml-auto w-3.5 h-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden text-slate-500" />
                              </div>
                            </CollapsibleTrigger>
                          </SidebarMenuButton>
                          <CollapsibleContent className="animate-in slide-in-from-top-1 duration-200">
                            <SidebarMenuSub className="border-slate-200 dark:border-white/10 ml-6 mr-1 mt-1 gap-1">
                              {item.items.map((subItem: any) => {
                                const isSubActive = pathname === subItem.href
                                return (
                                  <SidebarMenuSubItem key={subItem.name}>
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={isSubActive}
                                      className={cn(
                                        "rounded-xl transition-all h-8.5 font-black text-[11px]",
                                        isSubActive
                                          ? "bg-[#005e61] text-white shadow-xs"
                                          : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white"
                                      )}
                                    >
                                      <Link
                                        href={subItem.href}
                                        className="flex items-center gap-2 w-full"
                                        onClick={() => {
                                          playSound('click')
                                          if (isMobile) setOpenMobile(false)
                                        }}
                                      >
                                        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isSubActive ? "bg-white" : "bg-slate-400")} />
                                        <span className="uppercase tracking-wider truncate font-black">{subItem.name}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                )
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </Collapsible>
                      ) : (
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.name}
                          onClick={() => {
                            playSound('click')
                            if (isMobile) setOpenMobile(false)
                          }}
                          className={cn(
                            "h-10.5 px-3 rounded-2xl transition-all duration-200 text-xs font-black",
                            isActive
                              ? "bg-[#005e61] text-white hover:bg-[#005e61] hover:text-white shadow-md shadow-[#005e61]/30 border border-[#005e61]"
                              : "text-slate-900 dark:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-primary",
                            "group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center",
                            "active:scale-95"
                          )}
                        >
                          <Link
                            href={item.href}
                            className="flex items-center gap-3 w-full"
                          >
                            <div 
                              className={cn(
                                "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-transform shadow-2xs",
                                isActive 
                                  ? "bg-white/20 text-white" 
                                  : "border border-slate-200/60 dark:border-white/10"
                              )}
                              style={{ 
                                backgroundColor: isActive ? undefined : `${itemColor}20`,
                                color: isActive ? '#ffffff' : itemColor 
                              }}
                            >
                              <item.icon className="w-4 h-4" />
                            </div>
                            <span className={cn(
                              "truncate group-data-[collapsible=icon]:hidden font-black text-xs tracking-tight",
                              isActive ? "text-white" : "text-slate-900 dark:text-slate-100"
                            )}>
                              {item.name}
                            </span>
                            {item.badge !== undefined && (
                              <div className="ml-auto flex items-center justify-center bg-rose-500 text-white text-[9.5px] font-black min-w-[18px] h-[18px] rounded-full px-1 shadow-xs group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-1 group-data-[collapsible=icon]:right-1 animate-pulse">
                                {item.badge}
                              </div>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* ─── BOTTOM PROFILE & LOGOUT FOOTER ─── */}
      <SidebarFooter className="p-3 border-t border-slate-200/70 dark:border-white/10 mt-auto bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex flex-col gap-2.5">
          {user && (
            <div className="group-data-[collapsible=icon]:hidden flex flex-col gap-2">
              <div className="bg-white/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200/70 dark:border-white/10 p-2.5 space-y-2 shadow-xs">
                <Link
                  href="/profile"
                  className="flex items-center gap-2.5 hover:opacity-85 transition-opacity cursor-pointer w-full group/profile"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#005e61] to-[#00C48C] p-[1.5px] shrink-0">
                    <div className="w-full h-full rounded-[10px] bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                      {userProfile?.photoURL ? (
                        <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-black text-xs text-primary">
                          {userProfile?.fullName?.[0]?.toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-black text-slate-900 dark:text-white truncate">
                      {userProfile?.fullName || user.email?.split('@')[0]}
                    </span>
                    <span className="text-[8.5px] text-teal-700 dark:text-teal-400 font-black uppercase tracking-wider">
                      {isAdmin ? "🛡️ Admin" : isStaff ? "📋 Staff" : isMonitoring ? "👁️ Monitoring" : isKoordinator ? "🤝 Koordinator" : isPetugas ? "📝 Petugas" : isDinas ? "🏢 Dinas" : "👤 User"}
                    </span>
                  </div>
                </Link>

                <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900/60 px-2 py-1 rounded-xl gap-2">
                  <span className="text-[8.5px] text-slate-500 font-mono truncate select-all">
                    {user.uid}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    onClick={copyUid}
                  >
                    {copied ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleAuthAction}
                className="h-9.5 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-extrabold transition-colors group-data-[collapsible=icon]:justify-center text-xs"
              >
                {user ? (
                  <>
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">
                      Keluar (Logout)
                    </span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">
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
