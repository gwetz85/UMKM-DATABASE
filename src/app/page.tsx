"use client"

import { MenuLaunchpad } from "@/components/menu-launchpad"
import { useUser } from "@/firebase"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { useNavigation } from "@/hooks/use-navigation"

export default function RootPage() {
  const { user, isUserLoading, isProfileLoading } = useUser()
  const { isDinas, isKoordinator, isVerifikatorDinas, isPetugas } = useNavigation()
  const router = useRouter()

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
      return
    }

    if (isProfileLoading) {
      return
    }

    if (isPetugas) {
      router.push("/portal-survey")
      return
    }

    if (isDinas) {
      router.push("/verifikasi-dinas")
      return
    }

    if (isVerifikatorDinas) {
      router.push("/verifikasi-dinas-berkas")
      return
    }

    if (isKoordinator) {
      router.push("/actor-data")
      return
    }
  }, [user, isUserLoading, isProfileLoading, router, isDinas, isKoordinator, isVerifikatorDinas, isPetugas])

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="w-full flex flex-col pt-1 md:pt-4">
      <MenuLaunchpad />
    </div>
  )
}
