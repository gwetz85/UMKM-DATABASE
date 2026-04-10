'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

/**
 * BackgroundMusic Component (YouTube Version)
 * Plays a specific YouTube video in the background hidden from view.
 * Handles interaction-based autoplay and provides a global mute toggle.
 */
export function BackgroundMusic() {
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const playerRef = useRef<any>(null);

  // Configuration: YouTube Playlist
  // Playlist ID: PLW77xtdIDKMuvscijYW1CQ8OCTdCrbLg7
  const playlistId = "PLW77xtdIDKMuvscijYW1CQ8OCTdCrbLg7";
  const useShuffle = false;

  useEffect(() => {
    // 1. Load the YouTube IFrame API script manually
    const loadYoutubeApi = () => {
      if (window.YT && window.YT.Player) {
        initPlayer();
        return;
      }

      // Check if script already exists to avoid duplication
      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      // The API will call this global function when ready
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    };

    const initPlayer = () => {
      if (playerRef.current) return;

      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

      playerRef.current = new window.YT.Player('youtube-player-container', {
        height: '0',
        width: '0',
        playerVars: {
          listType: 'playlist',
          list: playlistId,
          autoplay: 1, // Attempt autoplay (browser may still block until interaction)
          loop: 1,
          playlist: playlistId,
          controls: 0,
          showinfo: 0,
          modestbranding: 1,
          disablekb: 1,
          rel: 0,
          origin: currentOrigin,
        },
        events: {
          onReady: (event: any) => {
            setIsPlayerReady(true);
            // Specifically load the playlist once ready to ensure it's registered
            event.target.cuePlaylist({
              listType: 'playlist',
              list: playlistId,
            });
            
            if (isMuted) {
              event.target.mute();
            } else {
              event.target.unMute();
              event.target.setVolume(50);
            }
          },
          onStateChange: (event: any) => {
            // If the player starts playing, we consider it "interacted" or successful
            if (event.data === window.YT.PlayerState.PLAYING) {
              setHasInteracted(true);
            }
          },
          onError: (event: any) => {
            console.error("YouTube Player Error:", event.data);
          }
        },
      });
    };

    loadYoutubeApi();

    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [playlistId]);

  useEffect(() => {
    // 2. Start playback on interaction to satisfy browser policies
    const tryPlay = () => {
      if (playerRef.current && isPlayerReady && !hasInteracted) {
        // Use loadPlaylist if cuePlaylist was used to force start
        playerRef.current.playVideo();
        setHasInteracted(true);
      }
    };

    if (!hasInteracted && isPlayerReady) {
      const events = ['click', 'keydown', 'scroll', 'touchstart'];
      events.forEach(e => window.addEventListener(e, tryPlay, { once: true }));
      
      return () => {
        events.forEach(e => window.removeEventListener(e, tryPlay));
      };
    }
  }, [hasInteracted, isPlayerReady]);

  const toggleMute = () => {
    if (playerRef.current && isPlayerReady) {
      const nextMuteState = !isMuted;
      if (nextMuteState) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
        // If we haven't successfully started playing yet, try now
        if (!hasInteracted) {
          playerRef.current.playVideo();
          setHasInteracted(true);
        }
      }
      setIsMuted(nextMuteState);
    }
  };

  return (
    <div className="fixed bottom-[18px] right-[85px] md:bottom-[38px] md:right-[105px] z-[1000] print:hidden">
      {/* Invisible YouTube Player Container */}
      <div 
        id="youtube-player-container" 
        className="absolute w-0 h-0 opacity-0 pointer-events-none overflow-hidden"
      ></div>
      
      <button
        onClick={toggleMute}
        disabled={!isPlayerReady}
        className={`
          group relative flex items-center justify-center
          w-10 h-10 md:w-11 md:h-11 rounded-full 
          transition-all duration-500 ease-out
          ${!isPlayerReady 
            ? 'bg-slate-50 text-slate-200 cursor-not-allowed border border-slate-100' 
            : isMuted 
              ? 'bg-slate-100 text-slate-400 border border-slate-200 shadow-sm' 
              : 'bg-primary text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)]'
          }
          hover:scale-110 active:scale-95
        `}
        title={!isPlayerReady ? "Memuat..." : isMuted ? "Nyalakan Musik" : "Matikan Musik"}
      >
        {/* Pulsing ring effect when playing */}
        {!isMuted && isPlayerReady && (
          <span className="absolute inset-0 rounded-full animate-ping bg-primary opacity-20 pointer-events-none" />
        )}
        
        {isMuted || !isPlayerReady ? (
          <VolumeX size={18} />
        ) : (
          <Volume2 size={18} className={hasInteracted ? "animate-[pulse_2s_infinite]" : ""} />
        )}

        {/* Floating Tooltip */}
        <span className="absolute bottom-full right-0 mb-3 px-2 py-1 bg-slate-900/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap pointer-events-none shadow-xl border border-white/10 translate-y-2 group-hover:translate-y-0">
          {!isPlayerReady ? "Sedang Menyiapkan..." : isMuted ? "Musik Mati" : "Memutar Playlist YouTube"}
        </span>
      </button>
    </div>
  );
}
