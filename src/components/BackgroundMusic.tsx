'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

/**
 * BackgroundMusic Component
 * Plays a looping ambient track automatically after user interaction.
 * Positioned in the bottom right, next to the chat bubble.
 */
export function BackgroundMusic() {
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Use a pleasant, royalty-free lofi track from Pixabay
  const audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"; 

  useEffect(() => {
    const handleFirstInteraction = () => {
      if (audioRef.current && !hasInteracted) {
        audioRef.current.play()
          .then(() => {
            setHasInteracted(true);
            console.log("Audio started successfully");
          })
          .catch(error => {
            console.warn("Audio playback failed:", error);
          });
      }
    };

    // Browsers block autoplay until interaction
    if (!hasInteracted) {
      window.addEventListener('click', handleFirstInteraction, { once: true });
      window.addEventListener('scroll', handleFirstInteraction, { once: true });
      window.addEventListener('keydown', handleFirstInteraction, { once: true });
    }

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('scroll', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [hasInteracted]);

  const toggleMute = () => {
    if (audioRef.current) {
      const newMutedState = !isMuted;
      audioRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
      
      // If we haven't played yet and user unmutes, try playing
      if (!hasInteracted && !newMutedState) {
        audioRef.current.play()
          .then(() => setHasInteracted(true))
          .catch(console.error);
      }
    }
  };

  return (
    <div className="fixed bottom-[18px] right-[85px] md:bottom-[38px] md:right-[105px] z-[1000] print:hidden flex items-center justify-center">
      <audio
        ref={audioRef}
        src={audioUrl}
        loop
        preload="auto"
      />
      
      <button
        onClick={toggleMute}
        className={`
          group relative flex items-center justify-center
          w-10 h-10 md:w-11 md:h-11 rounded-full 
          transition-all duration-500 ease-out
          ${isMuted 
            ? 'bg-slate-100 text-slate-400 border border-slate-200' 
            : 'bg-primary text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)]'
          }
          hover:scale-110 active:scale-95
        `}
        title={isMuted ? "Nyalakan Musik" : "Matikan Musik"}
      >
        {/* Subtle glow effect when playing */}
        {!isMuted && (
          <span className="absolute inset-0 rounded-full animate-ping bg-primary opacity-20 pointer-events-none" />
        )}
        
        {isMuted ? (
          <VolumeX size={18} />
        ) : (
          <Volume2 size={18} className={hasInteracted ? "animate-[pulse_2s_infinite]" : ""} />
        )}

        {/* Tooltip */}
        <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {isMuted ? "Musik Mati" : "Musik Sedang Diputar"}
        </span>
      </button>
    </div>
  );
}
