
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
  Building2,
  UserCog,
  Copy,
  Check
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

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

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const { toast } = useToast()
  const firestore = useFirestore()
  const [copied, setCopied] = React.useState(false)

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
    { name: "Manajemen User", href: "/users", icon: UserCog, show: isAdmin },
  ]

  const copyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid)
      setCopied(true)
      toast({ title: "UID Disalin", description: "Berikan UID ini ke Admin untuk akses penuh." })
      setTimeout(() => setCopied(false), 2000)
    }
  }

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
          <div className="px-2 py-2 bg-white/10 rounded-md border border-white/5 space-y-1">
            <span className="text-[9px] text-white/50 uppercase font-black block leading-none">ID Perangkat</span>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-accent font-mono truncate max-w-[140px]">
                {user?.uid || "Mencari..."}
              </span>
              <Button variant="ghost" size="icon" className="h-5 w-5 text-white/50 hover:text-white" onClick={copyUid}>
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <span className="text-[10px] text-white/70 font-bold truncate block">
              {isAdmin ? "Administrator" : "User Publik"}
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
