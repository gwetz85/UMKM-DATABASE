"use client"

import { useCallback, useRef } from "react"

export const SOUND_URLS = {
  click: "https://www.soundjay.com/buttons/sounds/button-16.mp3",
  select: "https://www.soundjay.com/buttons/sounds/button-3.mp3",
  success: "https://www.soundjay.com/buttons/sounds/button-4.mp3",
  error: "https://www.soundjay.com/buttons/sounds/button-10.mp3",
}

export function useSoundEffect() {
  const audioContext = useRef<Record<string, HTMLAudioElement>>({})

  const playSound = useCallback((key: keyof typeof SOUND_URLS, volume = 0.3) => {
    try {
      if (!audioContext.current[key]) {
        audioContext.current[key] = new Audio(SOUND_URLS[key])
      }
      
      const audio = audioContext.current[key]
      audio.volume = volume
      audio.currentTime = 0
      audio.play().catch((err) => {
        // Browser might block autoplay until interaction
        console.warn("Audio playback delayed until user interaction.")
      })
    } catch (error) {
      console.error("Failed to play sound:", error)
    }
  }, [])

  return { playSound }
}
