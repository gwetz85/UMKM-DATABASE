"use client"

import { useCallback } from "react"

export const SOUND_URLS = {
  click: "https://www.soundjay.com/buttons/sounds/button-16.mp3",
  select: "https://www.soundjay.com/buttons/sounds/button-3.mp3",
  success: "https://www.soundjay.com/buttons/sounds/button-4.mp3",
  error: "https://www.soundjay.com/buttons/sounds/button-10.mp3",
}

export function useSoundEffect() {
  const playSound = useCallback((key: keyof typeof SOUND_URLS, volume = 0.45) => {
    if (typeof window === 'undefined') return;

    try {
      const audio = new Audio(SOUND_URLS[key]);
      audio.volume = volume;
      audio.play().catch((err) => {
        // console.warn("Audio playback failed:", err);
      });
    } catch (error) {
      // console.error("Sound effect error:", error);
    }
  }, [])

  return { playSound }
}
