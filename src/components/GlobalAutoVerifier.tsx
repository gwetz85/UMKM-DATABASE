"use client"

import { useEffect, useMemo } from "react"
import { useDatabase, useList, useUser, updateDocumentNonBlocking, useObject } from "@/firebase"
import { ref } from "firebase/database"

export function GlobalAutoVerifier() {
  const { user } = useUser()
  const database = useDatabase()

  // Only run for Admin/Staff who have permission to update data
  const userProfileRef = useMemo(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])
  
  const { data: allUsers } = useList(userProfileRef)
  const profile = useMemo(() => allUsers?.find((u: any) => u.uid === user?.uid), [allUsers, user])
  const isAdmin = profile?.role === 'admin' || profile?.role === 'petugas' || user?.email?.toLowerCase() === 'agus@umkm.id'

  const actorsRef = useMemo(() => {
    if (!database || !isAdmin) return null
    return ref(database, 'businessActors')
  }, [database, isAdmin])

  const { data: allActors } = useList<any>(actorsRef)
  const pendingActors = useMemo(() => allActors?.filter(a => a.status === 'pending') || [], [allActors])

  const masterDataRef = useMemo(() => {
    if (!database || !isAdmin) return null
    return ref(database, 'master_data')
  }, [database, isAdmin])

  const { data: allMasterData } = useList<any>(masterDataRef)

  useEffect(() => {
    if (!isAdmin || !database || !pendingActors.length || !allMasterData) return

    const checkAndProcess = () => {
      const now = Date.now()
      
      pendingActors.forEach(actor => {
        // Validation: Only if data is complete
        const isDataComplete = !!(
          actor.fullName && actor.nik && actor.noKK && actor.gender && 
          actor.pobDob && actor.phone && actor.address && actor.rtRw && 
          actor.kelurahan && actor.kecamatan && actor.businessCategory && 
          actor.businessName && actor.businessLocation && actor.coordinator
        );

        if (!isDataComplete) return

        // Calculate matches
        const nikMatches = allMasterData.filter((m: any) => m.nik && m.nik === actor.nik)
        const kkMatches = allMasterData.filter((m: any) => m.noKK && m.noKK === actor.noKK)
        const combinedMatches = [...nikMatches, ...kkMatches]
        const uniqueIds = new Set(combinedMatches.map(m => m.id || `${m.nik}-${m.nama}`))
        const matchCount = uniqueIds.size

        // Rule 4: Check for Cancell
        const hasCancell = combinedMatches.some(m => (m.status || "").toLowerCase().includes('cancell'))
        if (hasCancell) {
          console.log(`Auto-Rejecting actor ${actor.fullName} due to Cancell status in Master Data`)
          updateDocumentNonBlocking(ref(database, `businessActors/${actor.id}`), {
            status: 'rejected',
            rejectionReason: 'Ditolak Otomatis: Terdeteksi status Cancell pada Data Master Pembanding.'
          })
          return
        }

        // Rule 1 & 2: Countdown
        const targetMins = matchCount === 0 ? 10 : 60
        const isAutoEligible = matchCount < 2

        if (isAutoEligible) {
          const targetTime = new Date(actor.createdAt).getTime() + (targetMins * 60000)
          if (now >= targetTime) {
            console.log(`Auto-Verifying actor ${actor.fullName} (Match: ${matchCount}, Elapsed: ${Math.floor((now - targetTime)/1000)}s)`)
            updateDocumentNonBlocking(ref(database, `businessActors/${actor.id}`), {
              status: 'verified_actor'
            })
          }
        }
      })
    }

    // Run immediately then every 1 minute
    checkAndProcess()
    const interval = setInterval(checkAndProcess, 60000)
    return () => clearInterval(interval)

  }, [isAdmin, database, pendingActors, allMasterData])

  return null // This is a logic-only component
}
