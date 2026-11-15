'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useUser, useDatabase, useMemoFirebase, useObject } from '@/firebase';
import { ref, get } from 'firebase/database';
import { BacksoundConfig, BacksoundSong } from '@/types/music-backsound';
import { chunksToBlobUrl, audioBlobUrlCache } from '@/lib/music-service';
import { Disc3, Volume2, VolumeX, Play, Pause, ChevronUp, ChevronDown, Music2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

export function BackgroundMusicPlayer() {
  const pathname = usePathname();
  const { user } = useUser();
  const database = useDatabase();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [localVolume, setLocalVolume] = useState<number | null>(null);
  const [isLoadingSong, setIsLoadingSong] = useState(false);
  const [currentSong, setCurrentSong] = useState<BacksoundSong | null>(null);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [showVolumePopup, setShowVolumePopup] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

  const isLoginPage = pathname === '/login';
  const isCekDataPage = pathname === '/cek-data' || pathname?.startsWith('/cek-data');
  const isCekDaftarHadirPage = pathname === '/cek-daftar-hadir' || pathname?.startsWith('/cek-daftar-hadir') || pathname === '/daftar-hadir/cek' || pathname?.startsWith('/daftar-hadir/cek');
  const isLayarInformasiPage = pathname === '/layar-informasi' || pathname?.startsWith('/layar-informasi');
  const isSpecialFullscreenPage = isLayarInformasiPage || isCekDaftarHadirPage;

  // Listen to Music Backsound Config
  const configRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'settings/music_backsound/config');
  }, [database]);
  const { data: configData } = useObject(configRef);
  const config = configData as BacksoundConfig | null;

  // Listen to Songs List
  const songsRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'settings/music_backsound/songs');
  }, [database]);
  const { data: songsData } = useObject(songsRef);

  // Initialize Audio element once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.loop = true;

      audio.onplay = () => {
        setIsPlaying(true);
        isPlayingRef.current = true;
        setIsAutoplayBlocked(false);
      };

      audio.onpause = () => {
        setIsPlaying(false);
        isPlayingRef.current = false;
      };

      audio.onerror = (e) => {
        console.warn('Background audio error:', e);
        setIsPlaying(false);
        isPlayingRef.current = false;
      };

      audioRef.current = audio;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Update volume in real-time whenever config volume changes
  useEffect(() => {
    if (!audioRef.current) return;
    const targetVolume = localVolume !== null ? localVolume : (config?.volume ?? 50);
    const normalizedVol = Math.max(0, Math.min(1, targetVolume / 100));
    audioRef.current.volume = isMuted ? 0 : normalizedVol;
  }, [config?.volume, localVolume, isMuted]);

  // Determine active song from Firebase songs list
  const activeSong = React.useMemo(() => {
    if (!songsData || typeof songsData !== 'object') return null;
    const songList: BacksoundSong[] = [];
    if (Array.isArray(songsData)) {
      songsData.forEach((s, idx) => {
        if (s && typeof s === 'object') {
          songList.push({ ...s, id: s.id || `song_${idx}` });
        }
      });
    } else {
      Object.entries(songsData).forEach(([key, val]: [string, any]) => {
        if (key !== 'id' && val && typeof val === 'object') {
          songList.push({ ...val, id: val.id || key });
        }
      });
    }

    if (songList.length === 0) return null;

    if (config?.activeSongId) {
      const found = songList.find((s) => s.id === config.activeSongId);
      if (found) return found;
    }

    const explicitActive = songList.find((s) => s.isActive);
    if (explicitActive) return explicitActive;

    return songList[0] || null;
  }, [songsData, config?.activeSongId]);

  // Load and play active song when user is logged in
  useEffect(() => {
    if (!user || isLoginPage || isSpecialFullscreenPage || !database) {
      if (audioRef.current && isPlayingRef.current) {
        audioRef.current.pause();
      }
      return;
    }

    // If disabled globally by admin
    if (config && config.enabled === false) {
      if (audioRef.current && isPlayingRef.current) {
        audioRef.current.pause();
      }
      return;
    }

    if (!activeSong) {
      if (audioRef.current && isPlayingRef.current) {
        audioRef.current.pause();
      }
      setCurrentSong(null);
      return;
    }

    let isCancelled = false;

    const prepareAndPlay = async () => {
      try {
        setIsLoadingSong(true);
        setCurrentSong(activeSong);

        let blobUrl = audioBlobUrlCache[activeSong.id];
        if (!blobUrl) {
          const chunksSnap = await get(ref(database, `settings/music_backsound/song_chunks/${activeSong.id}`));
          if (isCancelled) return;

          if (chunksSnap.exists()) {
            const rawChunks = chunksSnap.val();
            const chunkArr: string[] = Array.isArray(rawChunks)
              ? rawChunks
              : Object.keys(rawChunks)
                  .sort((a, b) => Number(a) - Number(b))
                  .map((k) => rawChunks[k]);

            blobUrl = chunksToBlobUrl(chunkArr, activeSong.mimeType || 'audio/mpeg');
            if (blobUrl) {
              audioBlobUrlCache[activeSong.id] = blobUrl;
            }
          }
        }

        if (isCancelled || !blobUrl || !audioRef.current) {
          setIsLoadingSong(false);
          return;
        }

        if (audioRef.current.src !== blobUrl) {
          audioRef.current.src = blobUrl;
        }

        const vol = localVolume !== null ? localVolume : (config?.volume ?? 50);
        audioRef.current.volume = isMuted ? 0 : Math.max(0, Math.min(1, vol / 100));
        audioRef.current.loop = config?.loop !== false;

        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsAutoplayBlocked(false);
            })
            .catch((err) => {
              // Browser blocked autoplay due to user gesture requirement
              if (err.name === 'NotAllowedError') {
                setIsAutoplayBlocked(true);

                // Start playback on the very first user interaction anywhere on screen
                const handleFirstInteraction = () => {
                  if (audioRef.current && (!config || config.enabled !== false)) {
                    audioRef.current.play().catch(() => {});
                  }
                  window.removeEventListener('click', handleFirstInteraction);
                  window.removeEventListener('keydown', handleFirstInteraction);
                  window.removeEventListener('touchstart', handleFirstInteraction);
                };

                window.addEventListener('click', handleFirstInteraction, { once: true });
                window.addEventListener('keydown', handleFirstInteraction, { once: true });
                window.addEventListener('touchstart', handleFirstInteraction, { once: true });
              }
            });
        }
      } catch (err) {
        console.error('Failed to load background music song:', err);
      } finally {
        if (!isCancelled) setIsLoadingSong(false);
      }
    };

    prepareAndPlay();

    return () => {
      isCancelled = true;
    };
  }, [user, isLoginPage, isSpecialFullscreenPage, database, activeSong, config?.enabled, config?.loop]);

  // Listen for login event or explicit play triggers
  useEffect(() => {
    const handleLoginPlay = () => {
      if (audioRef.current && (!config || config.enabled !== false)) {
        audioRef.current.play().catch(() => {});
      }
    };

    window.addEventListener('simpu:play-music', handleLoginPlay);
    return () => {
      window.removeEventListener('simpu:play-music', handleLoginPlay);
    };
  }, [config?.enabled]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (nextMute) {
      audioRef.current.volume = 0;
    } else {
      const vol = localVolume !== null ? localVolume : (config?.volume ?? 50);
      audioRef.current.volume = Math.max(0, Math.min(1, vol / 100));
    }
  }, [isMuted, localVolume, config?.volume]);

  // Hide widget completely if not logged in or on special pages
  if (!user || isLoginPage || isSpecialFullscreenPage) {
    return null;
  }

  // If no active song exists or music is completely disabled and not playing, show minimal or hide
  if (!activeSong && !isPlaying) {
    return null;
  }

  const effectiveVolume = localVolume !== null ? localVolume : (config?.volume ?? 50);

  return (
    <div
      className={cn(
        'fixed z-50 transition-all duration-300 print:hidden select-none',
        'bottom-20 md:bottom-5 right-3 md:right-5'
      )}
    >
      {/* Minimized Pill */}
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className={cn(
            'group flex items-center gap-2 px-3 py-2 rounded-full border shadow-xl backdrop-blur-xl transition-all active:scale-95 duration-200',
            isPlaying
              ? 'bg-[#0b5a48]/90 dark:bg-[#16382e]/90 text-white border-emerald-400/40 shadow-emerald-500/20'
              : 'bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-800'
          )}
          title={`Backsound: ${currentSong?.title || 'Musik Aplikasi'} (Klik untuk buka kontrol)`}
          aria-label="Kontrol Musik Backsound"
        >
          <Disc3
            className={cn(
              'w-4 h-4 shrink-0 transition-transform',
              isPlaying ? 'animate-spin text-emerald-300' : 'text-slate-400 group-hover:rotate-45'
            )}
            style={{ animationDuration: '3.5s' }}
          />

          {isPlaying && (
            <div className="flex items-center gap-0.5 h-3 shrink-0">
              <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s] h-2.5" />
              <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s] h-3.5" />
              <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.45s] h-2" />
            </div>
          )}

          <span className="text-[11px] font-bold max-w-[110px] sm:max-w-[140px] truncate">
            {currentSong?.title || 'Music Backsound'}
          </span>

          <ChevronUp className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>
      ) : (
        /* Expanded Floating Card */
        <div className="flex flex-col bg-white/95 dark:bg-[#0f1d24]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-[#1d3540] rounded-2xl p-3 shadow-2xl w-[260px] sm:w-[280px] animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-xs',
                  isPlaying
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                )}
              >
                <Music2 className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block leading-none">
                  Music Backsound
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block mt-0.5">
                  {currentSong?.title || 'Memuat lagu...'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsMinimized(true)}
              className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
              title="Kecilkan"
              aria-label="Kecilkan widget musik"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Autoplay blocked banner */}
          {isAutoplayBlocked && (
            <div className="mb-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[10px] leading-tight flex items-center justify-between gap-1.5">
              <span>Klik untuk mulai putar musik:</span>
              <button
                onClick={() => {
                  if (audioRef.current) audioRef.current.play().catch(() => {});
                }}
                className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] shrink-0"
              >
                Putar
              </button>
            </div>
          )}

          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-2 pt-1">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              disabled={isLoadingSong}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-xs',
                isPlaying
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90'
              )}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Jeda</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  <span>Putar</span>
                </>
              )}
            </button>

            {/* Volume Controls */}
            <div className="flex items-center gap-1.5 flex-1 justify-end">
              <button
                onClick={toggleMute}
                className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center transition-colors',
                  isMuted
                    ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
                title={isMuted ? 'Bunyikan' : 'Bisukan'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <div className="w-20 sm:w-24">
                <Slider
                  value={[isMuted ? 0 : effectiveVolume]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(vals) => {
                    const newVol = vals[0] ?? 50;
                    setLocalVolume(newVol);
                    if (isMuted) setIsMuted(false);
                    if (audioRef.current) {
                      audioRef.current.volume = newVol / 100;
                    }
                  }}
                  className="cursor-pointer"
                />
              </div>

              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 w-7 text-right">
                {isMuted ? '0%' : `${effectiveVolume}%`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
