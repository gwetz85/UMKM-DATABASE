'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, SkipBack, SkipForward, Play, Pause } from 'lucide-react';
import { Slider } from '@/components/ui/slider';


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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTitle, setCurrentTitle] = useState("");
  const [volume, setVolume] = useState(50);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

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
            // Ensure the playlist is told to loop
            event.target.setLoop(true);
            
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

            // Get initial title if already playing or cued
            const videoData = event.target.getVideoData();
            if (videoData && videoData.title) {
              setCurrentTitle(videoData.title);
            }
          },
          onStateChange: (event: any) => {
            // If the player starts playing, we consider it "interacted" or successful
            if (event.data === window.YT.PlayerState.PLAYING) {
              setHasInteracted(true);
              setIsPlaying(true);
              
              // Update title when video changes/starts
              const videoData = event.target.getVideoData();
              if (videoData && videoData.title) {
                setCurrentTitle(videoData.title);
              }
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (event.data === window.YT.PlayerState.ENDED) {
              // Robust fallback: if reached the end, restart playlist
              event.target.playVideoAt(0);
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
        playerRef.current.setVolume(volume);
        // If we haven't successfully started playing yet, try now
        if (!hasInteracted) {
          playerRef.current.playVideo();
          setHasInteracted(true);
        }
      }
      setIsMuted(nextMuteState);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (playerRef.current && isPlayerReady) {
      playerRef.current.setVolume(newVolume);
      if (newVolume > 0 && isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      } else if (newVolume === 0 && !isMuted) {
        playerRef.current.mute();
        setIsMuted(true);
      }
    }
  };


  const handleNext = () => {
    if (playerRef.current && isPlayerReady) {
      playerRef.current.nextVideo();
      setIsPlaying(true);
    }
  };

  const handlePrevious = () => {
    if (playerRef.current && isPlayerReady) {
      playerRef.current.previousVideo();
      setIsPlaying(true);
    }
  };

  const togglePlayPause = () => {
    if (playerRef.current && isPlayerReady) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
        setHasInteracted(true);
      }
    }
  };

  return (
    <div className="fixed bottom-[18px] right-[20px] md:bottom-[38px] md:right-[30px] z-[1000] print:hidden flex flex-col items-end gap-2">
      {/* Invisible YouTube Player Container */}
      <div 
        id="youtube-player-container" 
        className="absolute w-0 h-0 opacity-0 pointer-events-none overflow-hidden"
      ></div>
      
      {/* Music Control Panel */}
      <div className={`
        flex items-center gap-1.5 p-1.5 rounded-full 
        transition-all duration-700 ease-in-out
        ${isPlayerReady 
          ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/20 dark:border-slate-800/50 shadow-2xl' 
          : 'bg-slate-100/50 dark:bg-slate-800/20 backdrop-blur-sm opacity-50'
        }
      `}>
        {/* Previous Button */}
        <button
          onClick={handlePrevious}
          disabled={!isPlayerReady}
          className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Sebelumnya"
        >
          <SkipBack size={16} fill="currentColor" />
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          disabled={!isPlayerReady}
          className={`
            relative flex items-center justify-center
            w-10 h-10 md:w-11 md:h-11 rounded-full 
            transition-all duration-500 ease-out
            ${!isPlayerReady 
              ? 'bg-slate-50 text-slate-200 cursor-not-allowed' 
              : isPlaying 
                ? 'bg-primary text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:scale-110 active:scale-95' 
                : 'bg-primary/90 text-white shadow-lg hover:scale-110 active:scale-95'
            }
          `}
          title={isPlaying ? "Jeda" : "Putar"}
        >
          {isPlaying && (
            <span className="absolute inset-0 rounded-full animate-ping bg-primary opacity-20" />
          )}
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
        </button>

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={!isPlayerReady}
          className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Selanjutnya"
        >
          <SkipForward size={16} fill="currentColor" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-0.5" />

        {/* Mute Toggle & Volume Slider */}
        <div 
          className="relative flex items-center group"
          onMouseEnter={() => setShowVolumeSlider(true)}
          onMouseLeave={() => setShowVolumeSlider(false)}
        >
          {/* Animated Volume Slider */}
          <div className={`
            overflow-hidden transition-all duration-300 ease-in-out flex items-center
            ${showVolumeSlider ? 'w-24 px-2 opacity-100' : 'w-0 opacity-0'}
          `}>
            <Slider
              value={[volume]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="w-20"
            />
          </div>

          <button
            onClick={toggleMute}
            disabled={!isPlayerReady}
            className={`
              p-2 rounded-full transition-all duration-300
              ${isMuted 
                ? 'text-red-500 bg-red-50 dark:bg-red-900/20' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }
              disabled:opacity-30 disabled:cursor-not-allowed
            `}
            title={isMuted ? "Aktifkan Musik" : "Senyap"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>


      {/* Song Title Marquee - Positioned below play menu */}
      {isPlaying && currentTitle && (
        <div className={`
          w-full overflow-hidden h-10 md:h-11 px-4 rounded-full
          flex items-center
          bg-white/80 dark:bg-slate-900/80 backdrop-blur-md 
          border border-white/20 dark:border-slate-800/50 shadow-2xl
          animate-in fade-in slide-in-from-bottom-2 duration-700
        `}>
          <div className="whitespace-nowrap animate-marquee text-[10px] md:text-[11px] font-black uppercase tracking-widest text-primary dark:text-primary-foreground/90 w-full text-center">
            SEDANG DIPUTAR: {currentTitle}
          </div>
        </div>
      )}


      {/* Status Tooltip (Optional, floating above) */}
      {!hasInteracted && isPlayerReady && (
        <div className="absolute bottom-full right-0 mb-4 animate-bounce">
          <div className="px-3 py-1.5 bg-primary text-white text-[11px] font-bold rounded-xl shadow-xl whitespace-nowrap">
            Klik untuk Memulai Musik 🎵
            <div className="absolute -bottom-1 right-5 w-2 h-2 bg-primary rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
}
