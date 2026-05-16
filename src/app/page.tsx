"use client"

import { MenuLaunchpad } from "@/components/menu-launchpad"
import { useUser } from "@/firebase"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { useNavigation } from "@/hooks/use-navigation"

export default function RootPage() {
  const { user, isUserLoading } = useUser()
  const { isDinas, isKoordinator } = useNavigation()
  const router = useRouter()

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
      return
    }

    if (isDinas) {
      router.push("/verifikasi-dinas")
    }

    if (isKoordinator) {
      router.push("/actor-data")
    }
  }, [user, isUserLoading, router, isDinas, isKoordinator])

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-full py-8 md:py-12">
      <MenuLaunchpad />
    </div>
  )
}
