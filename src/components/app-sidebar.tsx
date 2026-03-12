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
  Building2
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"

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

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const firestore = useFirestore()

  const adminRef = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return doc(firestore, 'roles_admin', user.uid)
  }, [user, firestore])

  const { data: adminRole } = useDoc(adminRef)
  const isAdmin = !!adminRole

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, show: true },
    { name: "Input Data", href: "/input", icon: UserPlus, show: true },
    { name: "Verifikasi Admin", href: "/verify-actor", icon: ShieldCheck, show: isAdmin },
    { name: "Data Pelaku", href: "/actor-data", icon: Users, show: true },
    { name: "Verifikasi Bank", href: "/verify-bank", icon: CreditCard, show: true },
    { name: "Finish", href: "/finish", icon: CheckCircle2, show: true },
  ]

  return (
    <Sidebar collapsible="icon" className="border-r-0 shadow-xl">
      <SidebarHeader className="h-20 flex items-center px-6 mb-2">
        <div className="flex items-center gap-3">
          <div className="bg-accent rounded-xl p-2 shadow-lg shadow-accent/20 flex items-center justify-center transform hover:scale-105 transition-transform">
            <Building2 className="w-6 h-6 text-accent-foreground" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-extrabold text-lg tracking-tight text-white leading-tight">
              UMKM
            </span>
            <span className="text-[10px] font-medium text-white/70 tracking-widest uppercase">
              Database
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 mb-2 group-data-[collapsible=icon]:hidden text-white/40 font-bold text-[10px] uppercase tracking-wider">
            Navigasi Utama
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.filter(i => i.show).map((item) => (
                <SidebarMenuItem key={item.name} className="px-2">
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.name}
                    className="h-11 rounded-lg transition-all duration-200 hover:bg-white/10 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:shadow-md"
                  >
                    <Link href={item.href}>
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium group-data-[collapsible=icon]:hidden">{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 bg-black/10">
        <div className="flex flex-col gap-4 group-data-[collapsible=icon]:hidden">
          <div className="px-2 py-1 bg-white/10 rounded-md border border-white/5">
            <span className="text-[9px] text-white/50 uppercase font-black block">Role Pengguna</span>
            <span className="text-xs text-accent font-bold truncate">
              {isAdmin ? "Administrator" : (user?.isAnonymous ? "Petugas Input" : "User Publik")}
            </span>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="h-10 rounded-lg hover:bg-destructive/10 hover:text-destructive-foreground text-white/70">
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Keluar Sistem</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
