"use client"

import { useCallback } from "react"

export const SOUND_URLS = {
  click: "https://www.soundjay.com/buttons/sounds/button-16.mp3",
  select: "https://www.soundjay.com/buttons/sounds/button-3.mp3",
  success: "https://www.soundjay.com/buttons/sounds/button-4.mp3",
  error: "https://www.soundjay.com/buttons/sounds/button-10.mp3",
}

// Global cache outside the component to persist across renders/navigation
const audioCache: Record<string, HTMLAudioElement> = {}

export function useSoundEffect() {
  const playSound = useCallback((key: keyof typeof SOUND_URLS, volume = 0.3) => {
    if (typeof window === 'undefined') return;

    try {
      // Initialize the source audio if not cached
      if (!audioCache[key]) {
        audioCache[key] = new Audio(SOUND_URLS[key]);
        audioCache[key].preload = "auto";
      }
      
      const audio = audioCache[key];
      
      // Use cloneNode to allow overlapping sounds (important for rapid clicks)
      const soundClone = audio.cloneNode() as HTMLAudioElement;
      soundClone.volume = volume;
      
      const playPromise = soundClone.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn(`[SoundEffect] Playback blocked for ${key}:`, err);
        });
      }

      // Cleanup to prevent memory leaks
      soundClone.onended = () => {
        soundClone.remove();
      };
      
    } catch (error) {
      console.error("[SoundEffect] Error:", error);
    }
  }, [])

  return { playSound }
}
