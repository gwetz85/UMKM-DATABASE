"use client"

import React, { useEffect, useRef } from "react"
import { useUser, useDatabase, useList, useMemoFirebase } from "@/firebase"
import { ref } from "firebase/database"
import { useToast } from "@/hooks/use-toast"
import { useSoundEffect } from "@/hooks/use-sound-effect"
import { usePathname } from "next/navigation"

export function MessageNotification() {
  const { user } = useUser()
  const database = useDatabase()
  const { toast } = useToast()
  const { playSound } = useSoundEffect()
  const pathname = usePathname()
  const prevUnreadRef = useRef<Record<string, boolean>>({})
  const activeToastsRef = useRef<Record<string, { dismiss: () => void }>>({})

  const chatsRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `chats/${user.uid}`)
  }, [user, database])

  const { data: userChats } = useList(chatsRef)

  useEffect(() => {
    if (!userChats || pathname === "/messages") {
      // Update ref so we don't notify when leaving /messages
      if (userChats) {
        const currentStates: Record<string, boolean> = {}
        userChats.forEach((chat: any) => {
          currentStates[chat.uid] = !!chat.unread
        })
        prevUnreadRef.current = currentStates
      }
      return
    }

    userChats.forEach((chat: any) => {
      const friendId = chat.uid || chat.id
      const isUnread = !!chat.unread
      const wasUnread = !!prevUnreadRef.current[friendId]

      if (isUnread && !wasUnread) {
        // Skip notification if the message is "Obrolan dihapus"
        if (chat.lastMessage === "Obrolan dihapus") return

        // New unread message detected
        playSound("notification")
        const newToast = toast({
          title: `Pesan Baru dari ${chat.friendName || "Pengguna"}`,
          description: chat.lastMessage || "Anda menerima pesan baru.",
          duration: 5000,
        })
        
        activeToastsRef.current[friendId] = newToast
      } else if (!isUnread && wasUnread) {
        // Message was read or deleted, dismiss existing toast if any
        if (activeToastsRef.current[friendId]) {
          activeToastsRef.current[friendId].dismiss()
          delete activeToastsRef.current[friendId]
        }
      }
    })

    // Update the ref
    const nextStates: Record<string, boolean> = {}
    userChats.forEach((chat: any) => {
      const friendId = chat.uid || chat.id
      nextStates[friendId] = !!chat.unread
    })
    prevUnreadRef.current = nextStates
  }, [userChats, pathname, playSound, toast])

  return null
}
