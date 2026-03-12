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
  Check,
  User as UserIcon
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useUser, useDoc, useFirestore, useMemoFirebase, useAuth } from "@/firebase"
import { doc } from "firebase/firestore"
import { signOut } from "firebase/auth"
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
  const router = useRouter()
  const { user } = useUser()
  const auth = useAuth()
  const { toast } = useToast()
  const firestore = useFirestore()
  const [copied, setCopied] = React.useState(false)

  const adminRef = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return doc(firestore, 'roles_admin', user.uid)
  }, [user, firestore])

  const { data: adminRole } = useDoc(adminRef)
  
  // FAIL-SAFE: Agus selalu admin, baik dari DB maupun cek email
  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id')

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, show: !!user },
    { name: "Input Data", href: "/input", icon: UserPlus, show: !!user },
    { name: "Verifikasi Admin", href: "/verify-actor", icon: ShieldCheck, show: isAdmin },
    { name: "Data Pelaku", href: "/actor-data", icon: Users, show: !!user },
    { name: "Verifikasi Bank", href: "/verify-bank", icon: CreditCard, show: !!user },
    { name: "Finish", href: "/finish", icon: CheckCircle2, show: !!user },
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

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/login")
    toast({ title: "Keluar Sistem", description: "Anda telah berhasil keluar." })
  }

  if (pathname === "/login") return null

  return (
    <Sidebar collapsible="icon" className="border-r-0 shadow-xl">
      <SidebarHeader className="h-32 flex flex-col items-center justify-center px-4 border-b border-white/10 mb-2">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-accent rounded-2xl p-2.5 shadow-xl shadow-accent/20 flex items-center justify-center transform hover:rotate-6 transition-all duration-300">
            <Building2 className="w-8 h-8 text-accent-foreground" />
          </div>
          <div className="flex flex-col items-center group-data-[collapsible=icon]:hidden text-center">
            <span className="font-black text-xl tracking-tighter text-white leading-none">
              UMKM DATABASE
            </span>
            <span className="text-[8px] font-bold text-accent tracking-[0.4em] uppercase mt-1.5 opacity-80">
              Sistem Terpadu
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 mb-2 group-data-[collapsible=icon]:hidden text-white/40 font-bold text-[10px] uppercase tracking-wider text-center w-full">
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
          {user && (
            <div className="px-3 py-3 bg-white/10 rounded-xl border border-white/5 space-y-1.5">
              <div className="flex items-center gap-2 mb-1 justify-center">
                <UserIcon className="w-3 h-3 text-accent" />
                <span className="text-[9px] text-white/50 uppercase font-black block leading-none tracking-widest">Profil Aktif</span>
              </div>
              <span className="text-xs text-white font-bold block truncate text-center">
                {user.email?.split('@')[0].toUpperCase()}
              </span>
              <div className="flex items-center justify-center gap-2 bg-black/20 p-1.5 rounded-lg">
                <span className="text-[9px] text-accent font-mono truncate max-w-[120px]">
                  {user.uid}
                </span>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-white/50 hover:text-white" onClick={copyUid}>
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <span className="text-[10px] text-white/70 font-bold truncate block text-center uppercase tracking-tighter">
                {isAdmin ? "🛡️ Administrator" : "📝 Petugas Input"}
              </span>
            </div>
          )}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={handleLogout}
                className="h-10 rounded-lg hover:bg-destructive/20 hover:text-destructive-foreground text-white/70 justify-center group-data-[collapsible=icon]:p-0"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">Keluar Sistem</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
