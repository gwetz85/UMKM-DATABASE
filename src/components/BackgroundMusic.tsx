'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, SkipBack, SkipForward, Play, Pause, Square } from 'lucide-react';
import { Slider } from '@/components/ui/slider';


declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

import { cn } from '@/lib/utils';

/**
 * BackgroundMusic Component (YouTube Version)
 * Plays a specific YouTube video in the background hidden from view.
 * Handles interaction-based autoplay and provides a global mute toggle.
 */
export function BackgroundMusic({ className, role }: { className?: string, role?: string }) {
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTitle, setCurrentTitle] = useState("");
  const [volume, setVolume] = useState(50);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const formatTime = (timeInSeconds: number) => {
    if (!timeInSeconds || isNaN(timeInSeconds)) return "0:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && isPlayerReady && !isSeeking) {
      interval = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          setCurrentTime(playerRef.current.getCurrentTime());
          setDuration(playerRef.current.getDuration() || 0);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isPlayerReady, isSeeking]);

  const [playerWidth, setPlayerWidth] = useState<number>(0);
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Refs to avoid stale closures in YouTube callbacks
  const hasInteractedRef = useRef(false);
  const isPlayingRef = useRef(false);
  const isPlayerReadyRef = useRef(false);
  const isMutedRef = useRef(false);
  const volumeRef = useRef(50);
  const currentTitleRef = useRef("");

  // Role check: Only Administrator can access
  const normalizedRole = role?.toLowerCase();
  const isAllowedRole = normalizedRole === 'admin';


  // Configuration: YouTube Playlist
  // Playlist ID: PLBDzcTxWPOhA
  const playlistId = "PLBDzcTxWPOhA";
  const useShuffle = false; // Disabled shuffle to follow playlist order

  useEffect(() => {
    if (!isAllowedRole) return;
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
        height: '200',
        width: '200',
        playerVars: {
          listType: 'playlist',
          list: playlistId,
          autoplay: 1, 
          loop: 1,
          controls: 0,
          showinfo: 0,
          modestbranding: 1,
          disablekb: 1,
          rel: 0,
          enablejsapi: 1,
          origin: currentOrigin,
          mute: isMuted ? 1 : 0, // Set initial mute state in playerVars
        },
        events: {
          onReady: (event: any) => {
            setIsPlayerReady(true);
            isPlayerReadyRef.current = true;
            
            // Set loop for the player
            event.target.setLoop(true);
            
            // Handle shuffle if enabled
            if (useShuffle) {
              event.target.setShuffle(true);
            }
            
            // Load or cue depending on interaction
            // Note: loading might fail autoplay, but we handle it via interaction below
            
            if (isMuted) {
              event.target.mute();
            } else {
              event.target.unMute();
              event.target.setVolume(50);
            }

            // Get initial title
            const videoData = event.target.getVideoData();
            if (videoData && videoData.title) {
              currentTitleRef.current = videoData.title;
              setCurrentTitle(videoData.title);
            }
          },
          onStateChange: (event: any) => {
            const playerState = event.data;
            
            // Try updating title on any state change
            const videoData = event.target.getVideoData();
            if (videoData && videoData.title) {
              currentTitleRef.current = videoData.title;
              setCurrentTitle(videoData.title);
            }

            if (playerState === window.YT.PlayerState.PLAYING) {
              hasInteractedRef.current = true;
              isPlayingRef.current = true;
              setHasInteracted(true);
              setIsPlaying(true);
            } else if (playerState === window.YT.PlayerState.PAUSED) {
              isPlayingRef.current = false;
              setIsPlaying(false);
            } else if (playerState === window.YT.PlayerState.ENDED) {
              // If it ended and didn't loop automatically, force it
              event.target.playVideoAt(0);
            } else if (playerState === window.YT.PlayerState.UNSTARTED) {
              // Sometimes playlists get stuck at unstarted when moving between videos
              // Use ref to avoid stale closure
              if (hasInteractedRef.current) {
                event.target.playVideo();
              }
            }
          },
          onError: (event: any) => {
            console.error("YouTube Player Error:", event.data);
            // On error, try to skip to next video after a short delay
            setTimeout(() => {
              if (playerRef.current && isPlayerReadyRef.current) {
                try {
                  playerRef.current.nextVideo();
                } catch (err) {
                  console.error("Failed to skip to next video:", err);
                }
              }
            }, 2000);
          }
        },
      });
    };

    loadYoutubeApi();

    // NOTE: Do NOT destroy the player on cleanup.
    // BackgroundMusic lives in the global layout and must persist across page navigations.
    // Destroying the player would stop music when navigating between pages.
    return () => {};
  }, [playlistId, isAllowedRole]);

  useEffect(() => {
    // 2. Monitor player width to sync marquee width
    if (!playerContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          // Add padding (p-1.5 = 6px on each side approximately, plus border)
          // Actually, just use offsetWidth for the whole container
          setPlayerWidth(playerContainerRef.current?.offsetWidth || 0);
        }
      }
    });

    resizeObserver.observe(playerContainerRef.current);
    
    // Initial measurement
    setPlayerWidth(playerContainerRef.current.offsetWidth);

    return () => resizeObserver.disconnect();
  }, [isPlayerReady]);

  // 3. Global Interaction Handler: Support autoplay by playing on first window click
  useEffect(() => {
    if (!isAllowedRole || !isPlayerReady || hasInteracted || isMuted) return;

    const handleWindowClick = () => {
      if (playerRef.current && !hasInteracted) {
        playerRef.current.playVideo();
        // The play event will setHasInteracted(true) in onStateChange
      }
    };

    window.addEventListener('click', handleWindowClick, { once: true });
    return () => window.removeEventListener('click', handleWindowClick);
  }, [isAllowedRole, isPlayerReady, hasInteracted, isMuted]);



  const toggleMute = () => {
    if (playerRef.current && isPlayerReadyRef.current) {
      const nextMuteState = !isMutedRef.current;
      if (nextMuteState) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
        playerRef.current.setVolume(volumeRef.current);
        if (!hasInteractedRef.current) {
          playerRef.current.playVideo();
          hasInteractedRef.current = true;
          setHasInteracted(true);
        }
      }
      isMutedRef.current = nextMuteState;
      setIsMuted(nextMuteState);
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('music-mute-change', { detail: { isMuted: nextMuteState } }));
    }
  };

  const handleManualPlayPause = (shouldPlay: boolean) => {
    if (playerRef.current && isPlayerReadyRef.current) {
      if (shouldPlay) {
        playerRef.current.playVideo();
        isPlayingRef.current = true;
        hasInteractedRef.current = true;
        setIsPlaying(true);
        setHasInteracted(true);
      } else {
        playerRef.current.pauseVideo();
        isPlayingRef.current = false;
        setIsPlaying(false);
      }
    }
  };

  // Listen for external controls (like from Dashboard)
  // Uses refs internally to avoid stale closures — no isPlaying in deps
  useEffect(() => {
    const handleRemoteControl = (e: any) => {
      const { action, value } = e.detail;
      if (!playerRef.current || !isPlayerReadyRef.current) return;

      switch(action) {
        case 'play': handleManualPlayPause(true); break;
        case 'pause': handleManualPlayPause(false); break;
        case 'stop': handleStop(); break;
        case 'next': handleNext(); break;
        case 'previous': handlePrevious(); break;
        case 'volume': handleVolumeChange([value]); break;
        case 'playAt': 
          playerRef.current.playVideoAt(value);
          isPlayingRef.current = true;
          hasInteractedRef.current = true;
          setIsPlaying(true);
          setHasInteracted(true);
          break;
        case 'get-playlist':
          if (playerRef.current && typeof playerRef.current.getPlaylist === 'function') {
            const playlistIds = playerRef.current.getPlaylist();
            window.dispatchEvent(new CustomEvent('music-playlist-ids-callback', { detail: { playlistIds } }));
          }
          break;
      }
    };

    // Listen for status requests from Dashboard card when it mounts.
    // IMPORTANT: Query actual YouTube player state, not cached refs.
    // Navigation may trigger a brief PAUSED event in YouTube then auto-resume,
    // leaving refs stale. getPlayerState() always returns the real current state.
    const handleStatusRequest = () => {
      let actualIsPlaying = isPlayingRef.current;
      let actualTitle = currentTitleRef.current;
      let actualIsReady = isPlayerReadyRef.current;

      if (playerRef.current && typeof playerRef.current.getPlayerState === 'function') {
        try {
          const ytState = playerRef.current.getPlayerState();
          // YT.PlayerState.PLAYING === 1
          actualIsPlaying = ytState === 1;
          actualIsReady = ytState !== undefined;

          const videoData = playerRef.current.getVideoData?.();
          if (videoData?.title) {
            actualTitle = videoData.title;
          }

          // Sync refs and React state to match actual player state
          if (actualIsPlaying !== isPlayingRef.current) {
            isPlayingRef.current = actualIsPlaying;
            setIsPlaying(actualIsPlaying);
          }
          if (actualTitle !== currentTitleRef.current) {
            currentTitleRef.current = actualTitle;
            setCurrentTitle(actualTitle);
          }
          if (actualIsReady !== isPlayerReadyRef.current) {
            isPlayerReadyRef.current = actualIsReady;
            setIsPlayerReady(actualIsReady);
          }
        } catch (e) {
          // Player not ready yet, fall back to refs
        }
      }

      window.dispatchEvent(new CustomEvent('music-status-update', {
        detail: {
          isPlaying: actualIsPlaying,
          currentTitle: actualTitle,
          isPlayerReady: actualIsReady,
          volume: volumeRef.current,
          isMuted: isMutedRef.current,
        }
      }));
    };

    window.addEventListener('music-remote-control', handleRemoteControl);
    window.addEventListener('music-request-status', handleStatusRequest);
    return () => {
      window.removeEventListener('music-remote-control', handleRemoteControl);
      window.removeEventListener('music-request-status', handleStatusRequest);
    };
  }, []);

  // Sync all refs whenever state changes
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isPlayerReadyRef.current = isPlayerReady; }, [isPlayerReady]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { currentTitleRef.current = currentTitle; }, [currentTitle]);

  // Dispatch state changes to listeners (like Dashboard)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('music-status-update', { 
      detail: { isPlaying, currentTitle, isPlayerReady, volume, isMuted } 
    }));
  }, [isPlaying, currentTitle, isPlayerReady, volume, isMuted]);

  const handleSeekChange = (value: number[]) => {
    setIsSeeking(true);
    setCurrentTime(value[0]);
  };

  const handleSeekCommit = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    if (playerRef.current && isPlayerReadyRef.current) {
      playerRef.current.seekTo(newTime, true);
    }
    setIsSeeking(false);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    volumeRef.current = newVolume;
    setVolume(newVolume);
    if (playerRef.current && isPlayerReadyRef.current) {
      playerRef.current.setVolume(newVolume);
      if (newVolume > 0 && isMutedRef.current) {
        playerRef.current.unMute();
        isMutedRef.current = false;
        setIsMuted(false);
      } else if (newVolume === 0 && !isMutedRef.current) {
        playerRef.current.mute();
        isMutedRef.current = true;
        setIsMuted(true);
      }
    }
  };


  const handleNext = () => {
    if (playerRef.current && isPlayerReadyRef.current) {
      playerRef.current.nextVideo();
      isPlayingRef.current = true;
      setIsPlaying(true);
    }
  };

  const handlePrevious = () => {
    if (playerRef.current && isPlayerReadyRef.current) {
      playerRef.current.previousVideo();
      isPlayingRef.current = true;
      setIsPlaying(true);
    }
  };
  
  const handleStop = () => {
    if (playerRef.current && isPlayerReadyRef.current) {
      playerRef.current.stopVideo();
      isPlayingRef.current = false;
      setIsPlaying(false);
    }
  };

  const togglePlayPause = () => {
    if (playerRef.current && isPlayerReadyRef.current) {
      if (isPlayingRef.current) {
        playerRef.current.pauseVideo();
        isPlayingRef.current = false;
        setIsPlaying(false);
      } else {
        playerRef.current.playVideo();
        isPlayingRef.current = true;
        hasInteractedRef.current = true;
        setIsPlaying(true);
        setHasInteracted(true);
      }
    }
  };

  // Role guard: render nothing if not admin/petugas (placed after all hooks)
  if (!isAllowedRole) return null;

  return (
    <div className={cn("fixed bottom-24 right-6 z-[1000] print:hidden grid justify-items-end gap-2", className)}>

      {/* Hidden YouTube Player Container with dimensions so browser allows media decoding */}
      <div 
        id="youtube-player-container" 
        className="fixed -left-[9999px] -top-[9999px] w-[200px] h-[200px] opacity-0 pointer-events-none"
      ></div>
      
      {/* Music Control Panel */}
      <div 
        ref={playerContainerRef}
        className={cn(
          "relative flex items-center justify-center overflow-hidden transition-all duration-500 ease-out",
          isPlayerReady 
            ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-2xl' 
            : 'bg-slate-100/50 dark:bg-slate-800/20 backdrop-blur-sm opacity-50',
          'w-[280px] h-[116px] rounded-2xl border border-white/20 dark:border-slate-800/50 p-4'
        )}
      >
        {/* Expanded View (Always Visible) */}
        <div className="flex flex-col w-full h-full justify-between">
          {/* Top: Controls */}
          <div className="flex items-center justify-between w-full mb-1">
             <div className="flex items-center gap-1">
               <button onClick={handlePrevious} disabled={!isPlayerReady} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
                 <SkipBack size={16} fill="currentColor" />
               </button>
               
               <button onClick={togglePlayPause} disabled={!isPlayerReady} className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors mx-0.5">
                  {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
               </button>
               
               <button onClick={handleNext} disabled={!isPlayerReady} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
                 <SkipForward size={16} fill="currentColor" />
               </button>

               <button onClick={handleStop} disabled={!isPlayerReady} className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                 <Square size={14} fill="currentColor" />
               </button>
             </div>

             {/* Volume */}
             <div className="flex items-center gap-1.5 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-full border border-slate-200/50 dark:border-slate-700/50">
               <button onClick={toggleMute} disabled={!isPlayerReady} className={cn(
                 "p-1.5 rounded-full transition-colors shrink-0",
                 isMuted ? "text-red-500 bg-red-100 dark:bg-red-900/40" : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
               )}>
                 {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
               </button>
               <div className="w-16 sm:w-20 mr-2 flex items-center cursor-pointer">
                 <Slider value={[volume]} max={100} step={1} onValueChange={handleVolumeChange} className="w-full" />
               </div>
             </div>
          </div>

          {/* Bottom: Info & Progress */}
          <div className="flex flex-col w-full gap-2">
            <div className="text-xs font-semibold truncate text-slate-800 dark:text-slate-100 px-1">
              {currentTitle || (isPlaying ? "Memutar musik..." : isPlayerReady ? "Musik Siap (Klik Putar)" : "Memuat musik...")}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 tabular-nums w-8 text-right shrink-0">{formatTime(currentTime)}</span>
              <div className="flex-1 flex items-center cursor-pointer">
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={1}
                  onValueChange={handleSeekChange}
                  onValueCommit={handleSeekCommit}
                  className="w-full"
                />
              </div>
              <span className="text-[10px] text-slate-500 tabular-nums w-8 shrink-0">{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>

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
