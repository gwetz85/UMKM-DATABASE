"use client"

import * as React from "react"
import { InfoDialog } from "./info-dialog"
import {
  LogOut,
  LogIn,
  ChevronRight,
  ChevronLeft,
  ChevronsUpDown,
} from "lucide-react"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useUser, useAuth, useDatabase, useMemoFirebase, useObject } from "@/firebase"
import { ref, update } from "firebase/database"
import { signOut } from "firebase/auth"
import { cn } from "@/lib/utils"
import { useSoundEffect } from "@/hooks/use-sound-effect"
import { useNavigation } from "@/hooks/use-navigation"
import { useActiveEvent } from "@/hooks/use-active-event"

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

  const configRef = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'settings/system_config')
  }, [database])
  const { data: config } = useObject(configRef)

  const appVersion = React.useMemo(() => {
    if (!config?.version) return "Versi 10.5 VIP"
    const v = String(config.version).trim()
    if (/^v(ersi)?/i.test(v)) return v
    return `Versi ${v}`
  }, [config?.version])

  const eventRef = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'settings/event_info')
  }, [database])
  const { data: eventInfo } = useObject(eventRef)
  const activeEvent = useActiveEvent(eventInfo)

  const [timeLeft, setTimeLeft] = React.useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    isEnded: boolean
    isStarted: boolean
  } | null>(null)

  React.useEffect(() => {
    if (!activeEvent) {
      setTimeLeft(null)
      return
    }

    const calculate = () => {
      const now = Date.now()
      const start = activeEvent.startDate ? new Date(activeEvent.startDate).getTime() : 0
      const end = new Date(activeEvent.endDate || activeEvent.date).getTime()

      let targetTime = end
      let isStarted = true

      if (start && now < start) {
        isStarted = false
        targetTime = start
      }

      const diff = targetTime - now
      if (isNaN(diff) || (isStarted && diff <= 0)) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: now >= end, isStarted }
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        isEnded: false,
        isStarted
      }
    }

    setTimeLeft(calculate())
    const interval = setInterval(() => {
      setTimeLeft(calculate())
    }, 1000)

    return () => clearInterval(interval)
  }, [activeEvent])

  const countdownText = React.useMemo(() => {
    if (!timeLeft || timeLeft.isEnded) return null
    const pad = (n: number) => String(n).padStart(2, "0")
    if (timeLeft.days > 0) {
      return `${timeLeft.days} Hari ${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`
    }
    return `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`
  }, [timeLeft])

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

    const groupDefinitions: { label: string; hrefs: string[] }[] = [
      {
        label: "OVERVIEW",
        hrefs: ["/dashboard", "/messages"]
      },
      {
        label: "1. PENDAFTARAN",
        hrefs: [
          "/check-data",
          "/check-data-collective",
          "/cek-usaha",
          "/kuota-koordinator",
          "/input",
          "/data-hold",
          "/verify-actor",
          "/actor-data",
          "/rejected",
          "/rekapan-data"
        ]
      },
      {
        label: "2. ALUR DINAS",
        hrefs: [
          "/upload-petugas-survey",
          "/verifikasi-dinas",
          "/verifikasi-dinas-berkas",
          "/hasil-verifikasi",
          "/gbas"
        ]
      },
      {
        label: "3. PENCAIRAN DAN FINISH",
        hrefs: [
          "/rekening-bank",
          "/data-rekening",
          "/cetak-berkas",
          "/lpj-receipt",
          "/lpj",
          "/blacklist",
          "/finish"
        ]
      },
      {
        label: "4. PENGATURAN SYSTEM",
        hrefs: [
          "/users",
          "/settings",
          "/settings-running-text",
          "/settings-event",
          "/settings-info",
          "/settings-office-hours",
          "/settings-maintenance",
          "/app-logs",
          "/settings-slideshow"
        ]
      }
    ]

    const groups = groupDefinitions.map(g => {
      const items = g.hrefs
        .map(href => visible.find((item: any) => item.href === href))
        .filter(Boolean)
      return {
        label: g.label,
        items
      }
    })

    const categorizedHrefs = new Set(groups.flatMap(g => g.items.map((i: any) => i.href)))
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
          <button className="flex items-start gap-3 transition-transform hover:scale-[1.01] active:scale-95 outline-none group text-left w-full">
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-sky-400 via-cyan-400 to-teal-300 p-[2.5px] shadow-lg shadow-sky-500/25 shrink-0 transition-transform duration-200 group-hover:scale-105 mt-0.5">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden p-0.5">
                <img
                  src="/logo.png"
                  alt="SIMPU Logo"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
            </div>

            <div className="flex flex-col group-data-[collapsible=icon]:hidden min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg text-white tracking-tight uppercase leading-none">
                  SIMPU
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs leading-none">
                  2026
                </span>
              </div>
              <span className="text-[10px] font-black text-sky-400 uppercase tracking-wider truncate mt-1 leading-none">
                {appVersion}
              </span>

              {/* ─── EVENT COUNTDOWN ─── */}
              {activeEvent && countdownText && (
                <div
                  className="mt-1.5 flex flex-col gap-1 w-full"
                  title={activeEvent.description || "Agenda SIMPU"}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shadow-xs leading-none shrink-0",
                      timeLeft?.isStarted
                        ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40"
                        : "bg-amber-500/25 text-amber-300 border border-amber-500/40"
                    )}>
                      <span className="relative flex w-1.5 h-1.5">
                        <span className={cn(
                          "animate-ping absolute inline-flex h-full w-full rounded-full opacity-80",
                          timeLeft?.isStarted ? "bg-emerald-400" : "bg-amber-400"
                        )} />
                        <span className={cn(
                          "relative inline-flex rounded-full w-1.5 h-1.5",
                          timeLeft?.isStarted ? "bg-emerald-400" : "bg-amber-400"
                        )} />
                      </span>
                      {timeLeft?.isStarted ? "EVENT" : "NEXT"}
                    </span>
                    <span className="font-mono font-black text-[10.5px] tracking-tight tabular-nums text-amber-300 drop-shadow-xs whitespace-nowrap">
                      {countdownText}
                    </span>
                  </div>
                  {activeEvent.description && (
                    <span
                      className="text-[8.5px] font-bold text-slate-200/90 tracking-wide uppercase leading-tight whitespace-normal break-words"
                      title={activeEvent.description}
                    >
                      {activeEvent.description}
                    </span>
                  )}
                </div>
              )}
            </div>
          </button>
        </InfoDialog>
      </SidebarHeader>

      {/* ─── NAVIGATION GROUPS ─── */}
      <SidebarContent className="px-2.5 py-3 space-y-4 custom-scrollbar bg-white text-slate-900 border-r border-slate-200">
        {categorizedNavigation.map((group) => (
          <SidebarGroup key={group.label} className="p-0">
            <SidebarGroupLabel className="px-3 mb-1.5 group-data-[collapsible=icon]:hidden text-slate-600 font-black text-[10.5px] uppercase tracking-[0.16em]">
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
                                ? "bg-emerald-50 text-emerald-950 border border-emerald-200 shadow-xs"
                                : "text-slate-900 hover:bg-slate-100 hover:text-black",
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
                                  className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/90 shadow-2xs"
                                  style={{ 
                                    backgroundColor: `${itemColor}18`,
                                    color: itemColor 
                                  }}
                                >
                                  <item.icon className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-xs text-slate-900 uppercase tracking-tight truncate group-data-[collapsible=icon]:hidden">
                                  {item.name}
                                </span>
                                <ChevronRight className="ml-auto w-3.5 h-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden text-slate-500" />
                              </div>
                            </CollapsibleTrigger>
                          </SidebarMenuButton>
                          <CollapsibleContent className="animate-in slide-in-from-top-1 duration-200">
                            <SidebarMenuSub className="border-slate-200 ml-6 mr-1 mt-1 gap-1">
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
                                          ? "bg-emerald-600 text-white font-black shadow-xs"
                                          : "text-slate-800 hover:bg-slate-100 hover:text-black font-semibold"
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
                                        <span className={cn("uppercase tracking-wider truncate font-bold", isSubActive ? "text-white" : "text-slate-800")}>{subItem.name}</span>
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
                              ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white shadow-md shadow-emerald-900/20"
                              : "text-slate-900 hover:bg-slate-100 hover:text-black",
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
                                  ? "bg-white text-emerald-700 shadow-xs" 
                                  : "border border-slate-200/90"
                              )}
                              style={{ 
                                backgroundColor: isActive ? undefined : `${itemColor}18`,
                                color: isActive ? undefined : itemColor 
                              }}
                            >
                              <item.icon className="w-4 h-4" />
                            </div>
                            <span className={cn(
                              "truncate group-data-[collapsible=icon]:hidden font-bold text-xs tracking-tight uppercase",
                              isActive ? "text-white font-black" : "text-slate-900"
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
