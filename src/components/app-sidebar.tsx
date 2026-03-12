
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
  User as UserIcon,
  Settings,
  SearchCheck
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useUser, useDoc, useFirestore, useMemoFirebase, useAuth } from "@/firebase"
import { doc } from "firebase/firestore"
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
  const [mounted, setMounted] = React.useState(false)

  // Gunakan useEffect untuk memastikan rendering konten dinamis hanya terjadi setelah hidrasi selesai
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const adminRef = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return doc(firestore, 'roles_admin', user.uid)
  }, [user, firestore])

  const { data: adminRole } = useDoc(adminRef)
  
  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id')

  // Definisi navigasi dasar
  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, show: !!user },
    { name: "Input Data", href: "/input", icon: UserPlus, show: !!user },
    { name: "Cek Data", href: "/check-data", icon: SearchCheck, show: !!user },
    { name: "Verifikasi Admin", href: "/verify-actor", icon: ShieldCheck, show: isAdmin },
    { name: "Data Pelaku", href: "/actor-data", icon: Users, show: !!user },
    { name: "Verifikasi Data", href: "/verify-bank", icon: CreditCard, show: !!user },
    { name: "Finish", href: "/finish", icon: CheckCircle2, show: !!user },
    { name: "Manajemen User", href: "/users", icon: UserCog, show: isAdmin },
    { name: "Pengaturan", href: "/settings", icon: Settings, show: !!user },
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
    <Sidebar collapsible="icon" className="border-r-0 shadow-2xl bg-sidebar">
      <SidebarHeader className="py-8 flex flex-col items-center justify-center border-b border-white/5">
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="bg-accent rounded-xl p-2.5 shadow-lg shadow-accent/20 flex items-center justify-center transition-transform duration-300 hover:scale-105">
            <Building2 className="w-8 h-8 text-accent-foreground" />
          </div>
          <div className="flex flex-col items-center group-data-[collapsible=icon]:hidden">
            <span className="font-black text-xl tracking-tight text-white leading-none">
              UMKM DATABASE
            </span>
            <span className="text-[10px] font-bold text-accent/80 tracking-widest uppercase mt-2">
              Sistem Terpadu
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 mb-4 group-data-[collapsible=icon]:hidden text-white/30 font-bold text-[10px] uppercase tracking-[0.2em] text-center">
            Menu Utama
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {/* Render item navigasi hanya jika sudah mounted untuk menghindari mismatch SSR */}
              {mounted && navigation.filter(i => i.show).map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.name}
                    className={cn(
                      "h-12 px-4 rounded-xl transition-all duration-200 hover:bg-white/5 text-white/70",
                      "data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:shadow-lg data-[active=true]:shadow-accent/10",
                      "group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                    )}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span className="font-semibold text-sm truncate group-data-[collapsible=icon]:hidden">
                        {item.name}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 bg-black/10 mt-auto">
        <div className="flex flex-col gap-4">
          {mounted && user && (
            <div className="group-data-[collapsible=icon]:hidden flex flex-col gap-3">
              <div className="bg-white/5 rounded-xl border border-white/5 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-white truncate">
                      {user.email?.split('@')[0].toUpperCase()}
                    </span>
                    <span className="text-[9px] text-accent font-black uppercase tracking-tighter">
                      {isAdmin ? "🛡️ Admin" : "📝 Petugas"}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between bg-black/20 p-2 rounded-lg gap-2">
                  <span className="text-[9px] text-white/40 font-mono truncate select-all">
                    {user.uid}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-white/30 hover:text-white hover:bg-white/10" 
                    onClick={copyUid}
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={handleLogout}
                className="h-11 rounded-xl hover:bg-destructive/20 hover:text-white text-white/60 transition-colors group-data-[collapsible=icon]:justify-center"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span className="text-sm font-bold group-data-[collapsible=icon]:hidden">
                  Keluar Sistem
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
