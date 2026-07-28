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
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const showControls = isHovered || isExpanded;

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
        height: '0',
        width: '0',
        playerVars: {
          listType: 'playlist',
          list: playlistId,
          autoplay: 1, 
          loop: 1,
          playlist: playlistId, // Required for loop to work with playlists
          controls: 0,
          showinfo: 0,
          modestbranding: 1,
          disablekb: 1,
          rel: 0,
          origin: currentOrigin,
          mute: isMuted ? 1 : 0, // Set initial mute state in playerVars
        },
        events: {
          onReady: (event: any) => {
            setIsPlayerReady(true);
            
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
              setCurrentTitle(videoData.title);
            }
          },
          onStateChange: (event: any) => {
            const playerState = event.data;
            
            if (playerState === window.YT.PlayerState.PLAYING) {
              hasInteractedRef.current = true;
              isPlayingRef.current = true;
              setHasInteracted(true);
              setIsPlaying(true);
              
              const videoData = event.target.getVideoData();
              if (videoData && videoData.title) {
                currentTitleRef.current = videoData.title;
                setCurrentTitle(videoData.title);
              }
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
              if (playerRef.current && isPlayerReady) {
                playerRef.current.nextVideo();
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
    <div 
      className={cn("fixed bottom-24 right-6 z-[1000] print:hidden grid justify-items-end gap-2 transition-all duration-500", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsExpanded(false);
        setShowVolumeSlider(false);
      }}
      onClick={() => setIsExpanded(!isExpanded)}
    >

      {/* Invisible YouTube Player Container */}
      <div 
        id="youtube-player-container" 
        className="absolute w-0 h-0 opacity-0 pointer-events-none overflow-hidden"
      ></div>
      
      {/* Music Control Panel */}
      <div 
        ref={playerContainerRef}
        className={`
          flex items-center p-1 rounded-full 
          transition-all duration-500 ease-in-out
          ${isPlayerReady 
            ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-slate-800/50 shadow-2xl' 
            : 'bg-slate-100/50 dark:bg-slate-800/20 backdrop-blur-sm opacity-50'
          }
          ${showControls ? 'px-3 gap-2' : 'px-1 gap-0'}
        `}
        onClick={(e) => {
          // If they click the container (not the buttons directly), toggle expansion
          if (e.target === e.currentTarget) {
             setIsExpanded(!isExpanded);
          }
        }}
      >
        {/* Hidden Controls Area */}
        <div className={cn(
          "flex items-center gap-1 transition-all duration-500 overflow-hidden",
          showControls ? "max-w-md opacity-100 mr-2" : "max-w-0 opacity-0 mr-0"
        )}>
          {/* Previous Button */}
          <button
            onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
            disabled={!isPlayerReady}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Sebelumnya"
          >
            <SkipBack size={14} fill="currentColor" />
          </button>

          {/* Stop Button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleStop(); }}
            disabled={!isPlayerReady}
            className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Berhenti"
          >
            <Square size={14} fill="currentColor" />
          </button>

          {/* Next Button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            disabled={!isPlayerReady}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Selanjutnya"
          >
            <SkipForward size={14} fill="currentColor" />
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Mute Toggle & Volume Slider */}
          <div 
            className="relative flex items-center group/vol"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
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
              onClick={(e) => { e.stopPropagation(); toggleMute(); }}
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
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
        </div>

        {/* Play/Pause Button (Main Anchor) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlayPause();
            if (!showControls) {
              setIsExpanded(true);
            }
          }}
          disabled={!isPlayerReady}
          className={`
            relative flex items-center justify-center
            w-10 h-10 md:w-11 md:h-11 rounded-full 
            transition-all duration-500 ease-out shrink-0
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
