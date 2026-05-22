"use client"

import { useCallback } from "react"

export const SOUND_URLS = {
  click: "https://www.soundjay.com/buttons/sounds/button-16.mp3",
  select: "https://www.soundjay.com/buttons/sounds/button-3.mp3",
  success: "https://www.soundjay.com/buttons/sounds/button-4.mp3",
  error: "https://www.soundjay.com/buttons/sounds/button-10.mp3",
  notification: "https://www.soundjay.com/communication/sounds/notification-sound-7062.mp3",
}

// Module-level cache for Audio objects to avoid dynamic instantiation overhead
const audioCache: Record<string, HTMLAudioElement> = {}

const getCachedAudio = (key: keyof typeof SOUND_URLS): HTMLAudioElement | null => {
  if (typeof window === 'undefined') return null;

  if (!audioCache[key]) {
    const audio = new Audio(SOUND_URLS[key]);
    audio.preload = "auto";
    audioCache[key] = audio;
  }
  return audioCache[key];
}

export function useSoundEffect() {
  const playSound = useCallback((key: keyof typeof SOUND_URLS, volume = 0.45) => {
    if (typeof window === 'undefined') return;

    try {
      const audio = getCachedAudio(key);
      if (audio) {
        audio.currentTime = 0; // Reset playback to start to allow rapid, successive playbacks
        audio.volume = volume;
        audio.play().catch((err) => {
          // console.warn("Audio playback failed:", err);
        });
      }
    } catch (error) {
      // console.error("Sound effect error:", error);
    }
  }, [])

  return { playSound }
}
