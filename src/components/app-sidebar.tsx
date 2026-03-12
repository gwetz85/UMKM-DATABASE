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
  UserCheck
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
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 flex items-center px-6 border-b border-sidebar-border/50">
        <div className="flex items-center gap-2">
          <div className="bg-accent rounded-lg p-1.5">
            <UserCheck className="w-5 h-5 text-accent-foreground" />
          </div>
          <span className="font-bold text-xl tracking-tight group-data-[collapsible=icon]:hidden text-white">
            UMKM Database
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2 group-data-[collapsible=icon]:hidden text-sidebar-foreground/50">Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.filter(i => i.show).map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.name}
                    className="h-11"
                  >
                    <Link href={item.href}>
                      <item.icon className="w-5 h-5" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/50 p-2">
        <div className="px-4 py-2 text-[10px] text-white/50 uppercase font-bold group-data-[collapsible=icon]:hidden">
          User: {isAdmin ? "ADMIN" : (user?.isAnonymous ? "Petugas" : "User")}
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-11">
              <LogOut className="w-5 h-5" />
              <span className="group-data-[collapsible=icon]:hidden">Keluar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
