"use client"

import * as React from "react"
import { InfoDialog } from "./info-dialog"
import {
  LogOut,
  ChevronRight,
  ChevronLeft,
  ChevronsUpDown,
} from "lucide-react"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useUser, useAuth, useDatabase } from "@/firebase"
import { ref, update } from "firebase/database"
import { signOut } from "firebase/auth"
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
  const { isMobile, setOpenMobile, toggleSidebar } = useSidebar()
  const { user } = useUser()
  const auth = useAuth()
  const database = useDatabase()
  const [mounted, setMounted] = React.useState(false)
  const { playSound } = useSoundEffect()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const { navigation, isAdmin, isKoordinator, isMonitoring, isPetugas, isDinas, isStaff, userProfile } = useNavigation()

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
      <Sidebar collapsible="icon" className="border-r border-slate-800/80 bg-[#0B132B] text-slate-100">
        <SidebarHeader className="py-4 px-4 flex items-center justify-between border-b border-white/5">
          <div className="bg-sky-500/20 rounded-2xl p-2 w-10 h-10 animate-pulse" />
        </SidebarHeader>
        <SidebarContent />
        <SidebarFooter className="p-4" />
      </Sidebar>
    )
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-800/80 bg-[#0B132B] text-slate-100 shadow-2xl">
      {/* ─── BRAND HEADER ─── */}
      <SidebarHeader className="py-4 px-4 flex flex-row items-center justify-between border-b border-white/10 bg-[#0B132B]">
        <InfoDialog>
          <button className="flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 outline-none group text-left">
            <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-500 to-teal-400 p-[2px] shadow-md shadow-sky-500/20 shrink-0">
              <div className="w-full h-full rounded-[14px] bg-[#0B132B] flex items-center justify-center overflow-hidden">
                <img
                  src="/logo.png"
                  alt="SIMPU Logo"
                  className="w-full h-full object-contain p-1"
                />
              </div>
            </div>

            <div className="flex flex-col group-data-[collapsible=icon]:hidden min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base text-white tracking-tight uppercase">
                  SIMPU
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  2026
                </span>
              </div>
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider truncate">
                Kota Tanjungpinang
              </span>
            </div>
          </button>
        </InfoDialog>

        {/* Circular Collapse Toggle Button matching Growly LMS */}
        <button
          onClick={() => toggleSidebar()}
          className="group-data-[collapsible=icon]:hidden w-7 h-7 rounded-full bg-[#162238] hover:bg-[#1f2d47] border border-white/10 text-slate-200 hover:text-white flex items-center justify-center transition-all shadow-xs shrink-0 active:scale-90"
          title="Tutup/Buka Sidebar"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </SidebarHeader>

      {/* ─── NAVIGATION GROUPS ─── */}
      <SidebarContent className="px-2.5 py-3 space-y-4 custom-scrollbar bg-[#0B132B]">
        {categorizedNavigation.map((group) => (
          <SidebarGroup key={group.label} className="p-0">
            <SidebarGroupLabel className="px-3 mb-1.5 group-data-[collapsible=icon]:hidden text-slate-300/80 font-black text-[10.5px] uppercase tracking-[0.16em]">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {group.items.map((item: any) => {
                  const isActive = pathname === item.href || (item.href === "/dashboard" && pathname === "/")
                  const itemColor = item.color || '#38bdf8'

                  return (
                    <SidebarMenuItem key={item.name}>
                      {item.items ? (
                        <Collapsible defaultOpen={item.items.some((sub: any) => pathname === sub.href)} className="group/collapsible">
                          <SidebarMenuButton
                            asChild
                            tooltip={item.name}
                            className={cn(
                              "h-10 px-3 rounded-2xl transition-all duration-200 text-xs font-bold",
                              item.items.some((sub: any) => pathname === sub.href)
                                ? "bg-[#162238] text-white"
                                : "text-slate-100 hover:bg-white/10 hover:text-white",
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
                                  className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border border-white/10 shadow-2xs"
                                  style={{ 
                                    backgroundColor: `${itemColor}25`,
                                    color: itemColor 
                                  }}
                                >
                                  <item.icon className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-xs text-slate-100 tracking-tight truncate group-data-[collapsible=icon]:hidden">
                                  {item.name}
                                </span>
                                <ChevronRight className="ml-auto w-3.5 h-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden text-slate-300" />
                              </div>
                            </CollapsibleTrigger>
                          </SidebarMenuButton>
                          <CollapsibleContent className="animate-in slide-in-from-top-1 duration-200">
                            <SidebarMenuSub className="border-white/10 ml-6 mr-1 mt-1 gap-1">
                              {item.items.map((subItem: any) => {
                                const isSubActive = pathname === subItem.href
                                return (
                                  <SidebarMenuSubItem key={subItem.name}>
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={isSubActive}
                                      className={cn(
                                        "rounded-xl transition-all h-8.5 font-bold text-[11px]",
                                        isSubActive
                                          ? "bg-sky-600 text-white shadow-xs font-extrabold"
                                          : "text-slate-200 hover:bg-white/10 hover:text-white font-medium"
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
                                        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isSubActive ? "bg-white" : "bg-slate-500")} />
                                        <span className="uppercase tracking-wider truncate">{subItem.name}</span>
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
                            "h-10 px-3 rounded-2xl transition-all duration-200 text-xs font-bold",
                            isActive
                              ? "bg-[#162238] text-white hover:bg-[#1b2a47] hover:text-white shadow-md border border-white/15"
                              : "text-slate-100 hover:bg-white/10 hover:text-white",
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
                                  ? "bg-sky-500/30 text-sky-300 border border-sky-400/40" 
                                  : "border border-white/10"
                              )}
                              style={{ 
                                backgroundColor: isActive ? undefined : `${itemColor}20`,
                                color: isActive ? '#38bdf8' : itemColor 
                              }}
                            >
                              <item.icon className="w-4 h-4" />
                            </div>
                            <span className={cn(
                              "truncate group-data-[collapsible=icon]:hidden font-bold text-xs tracking-tight",
                              isActive ? "text-white font-extrabold" : "text-slate-100"
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

      {/* ─── BOTTOM PROFILE & LOGOUT FOOTER matching Growly LMS ─── */}
      <SidebarFooter className="p-3 border-t border-white/10 mt-auto bg-[#070D1D]/90">
        <div className="flex flex-col gap-2">
          {user && (
            <div className="group-data-[collapsible=icon]:hidden flex flex-col gap-1.5">
              <Link
                href="/profile"
                className="flex items-center gap-2.5 p-2 rounded-2xl bg-[#162238]/80 hover:bg-[#162238] border border-white/10 transition-all cursor-pointer w-full group/profile"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-sky-500 to-teal-400 p-[1.5px] shrink-0">
                  <div className="w-full h-full rounded-full bg-[#0B132B] flex items-center justify-center overflow-hidden">
                    {userProfile?.photoURL ? (
                      <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-black text-xs text-sky-400">
                        {userProfile?.fullName?.[0]?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-bold text-white truncate">
                    {userProfile?.fullName || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium truncate">
                    {isAdmin ? "Administrator" : isStaff ? "Staff Pelaksana" : isMonitoring ? "Monitoring" : isKoordinator ? "Koordinator Wilayah" : isPetugas ? "Petugas Survey" : isDinas ? "Verifikator Dinas" : "Pengguna"}
                  </span>
                </div>
                <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 group-hover/profile:text-white shrink-0 ml-auto" />
              </Link>
            </div>
          )}

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleAuthAction}
                className="h-8.5 rounded-xl hover:bg-rose-950/40 text-rose-400 font-bold transition-colors group-data-[collapsible=icon]:justify-center text-xs"
              >
                {user ? (
                  <>
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">
                      Keluar
                    </span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">
                      Masuk
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
