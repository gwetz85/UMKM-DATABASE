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
    <div className="flex-1 min-h-0 flex flex-col pt-2 md:pt-4">
      <MenuLaunchpad className="flex-1 min-h-0" />
    </div>
  )
}
