'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useUser, useDatabase, useMemoFirebase, useObject } from '@/firebase';
import { ref, get } from 'firebase/database';
import { BacksoundConfig, BacksoundSong } from '@/types/music-backsound';
import { chunksToBlobUrl, audioBlobUrlCache } from '@/lib/music-service';
import {
  Disc3,
  Volume2,
  VolumeX,
  Volume1,
  Play,
  Pause,
  ChevronDown,
  Music2,
  Settings2,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

export function BackgroundMusicPlayer() {
  const pathname = usePathname();
  const { user, userProfile } = useUser();
  const database = useDatabase();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [localVolume, setLocalVolume] = useState<number | null>(null);
  const [isLoadingSong, setIsLoadingSong] = useState(false);
  const [currentSong, setCurrentSong] = useState<BacksoundSong | null>(null);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

  const isLoginPage = pathname === '/login';
  const isCekDataPage = pathname === '/cek-data' || pathname?.startsWith('/cek-data');
  const isCekDaftarHadirPage =
    pathname === '/cek-daftar-hadir' ||
    pathname?.startsWith('/cek-daftar-hadir') ||
    pathname === '/daftar-hadir/cek' ||
    pathname?.startsWith('/daftar-hadir/cek');
  const isLayarInformasiPage = pathname === '/layar-informasi' || pathname?.startsWith('/layar-informasi');
  const isSpecialFullscreenPage = isLayarInformasiPage || isCekDaftarHadirPage;

  const roleStr = String(userProfile?.role || '').toLowerCase().trim();
  const isAdmin =
    roleStr === 'admin' ||
    roleStr === 'administrator' ||
    roleStr === 'superadmin' ||
    user?.email?.toLowerCase() === 'agus@umkm.id';

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

  // Close popover when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsPopoverOpen(false);
      }
    };
    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isPopoverOpen]);

  // Initialize native HTML5 Audio element once
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

  // Update volume in real-time whenever config volume or local volume changes
  useEffect(() => {
    if (!audioRef.current) return;
    const targetVolume = localVolume !== null ? localVolume : (config?.volume ?? 50);
    const normalizedVol = Math.max(0, Math.min(1, targetVolume / 100));
    audioRef.current.volume = isMuted ? 0 : normalizedVol;
  }, [config?.volume, localVolume, isMuted]);

  // Determine active song from Firebase songs list safely
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
        // Exclude the injected 'id' property from useObject
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
              // Browser blocked autoplay due to user interaction requirement
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

  // If no active song exists or music is completely disabled and not playing, return null
  if (!activeSong && !isPlaying) {
    return null;
  }

  const effectiveVolume = localVolume !== null ? localVolume : (config?.volume ?? 50);

  return (
    <div ref={containerRef} className="relative inline-flex items-center shrink-0">
      {/* Top Bar Header Pill (Next to Countdown Jam Kantor) */}
      <button
        type="button"
        onClick={() => setIsPopoverOpen((prev) => !prev)}
        className={cn(
          'group relative flex items-center gap-1 sm:gap-2 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border transition-all duration-300 shadow-xs select-none shrink-0 active:scale-95',
          isPlaying
            ? 'bg-[#0b5a48] dark:bg-[#134e40] text-white border-emerald-400/40 shadow-emerald-500/20'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
        )}
        title={`Backsound: ${currentSong?.title || 'Musik Aplikasi'} (Klik untuk buka kontrol volume)`}
        aria-label="Kontrol Musik Backsound"
      >
        {/* Rotating Disc Icon */}
        <Disc3
          className={cn(
            'w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-transform',
            isPlaying
              ? 'animate-spin text-emerald-300'
              : 'text-slate-400 dark:text-slate-400 group-hover:rotate-45'
          )}
          style={{ animationDuration: '3.5s' }}
        />

        {/* Animated Equalizer Soundbars when Playing */}
        {isPlaying ? (
          <div className="flex items-center gap-0.5 h-3 shrink-0">
            <span className="w-0.5 bg-emerald-400 dark:bg-emerald-300 rounded-full animate-bounce [animation-delay:-0.3s] h-2.5" />
            <span className="w-0.5 bg-emerald-400 dark:bg-emerald-300 rounded-full animate-bounce [animation-delay:-0.15s] h-3.5" />
            <span className="w-0.5 bg-emerald-400 dark:bg-emerald-300 rounded-full animate-bounce [animation-delay:-0.45s] h-2" />
          </div>
        ) : (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400 dark:bg-slate-500" />
          </span>
        )}

        {/* Song Title Text */}
        <span className="text-[11px] sm:text-xs font-extrabold max-w-[85px] sm:max-w-[130px] md:max-w-[170px] truncate leading-tight">
          {currentSong?.title || 'Backsound Music'}
        </span>

        {/* Dropdown Chevron */}
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 shrink-0 opacity-70 transition-transform duration-200',
            isPopoverOpen && 'rotate-180 opacity-100'
          )}
        />
      </button>

      {/* Popover Dropdown Card Anchored Directly Under Top Bar Pill */}
      {isPopoverOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 flex flex-col bg-white dark:bg-[#0f1d24] border border-slate-200/90 dark:border-[#1d3540] rounded-2xl p-3.5 shadow-2xl w-[270px] sm:w-[290px] animate-in fade-in zoom-in-95 duration-150">
          {/* Header Inside Card */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5 mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs',
                  isPlaying
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                )}
              >
                <Music2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block leading-none">
                  Music Backsound
                </span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate block mt-0.5">
                  {currentSong?.title || 'Memuat lagu...'}
                </span>
              </div>
            </div>

            <span
              className={cn(
                'text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0',
                isPlaying
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {isPlaying ? 'Diputar' : 'Dijeda'}
            </span>
          </div>

          {/* Autoplay Blocked Banner */}
          {isAutoplayBlocked && (
            <div className="mb-2.5 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[10px] leading-tight flex items-center justify-between gap-1.5">
              <span>Browser membatasi suara:</span>
              <button
                type="button"
                onClick={() => {
                  if (audioRef.current) audioRef.current.play().catch(() => {});
                }}
                className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] shrink-0 active:scale-95"
              >
                Putar
              </button>
            </div>
          )}

          {/* Player Actions Row */}
          <div className="flex items-center justify-between gap-2 py-1">
            {/* Play/Pause Button */}
            <button
              type="button"
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

            {/* Mute Button */}
            <button
              type="button"
              onClick={toggleMute}
              className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center transition-colors active:scale-95',
                isMuted
                  ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
              title={isMuted ? 'Bunyikan' : 'Bisukan'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Real-time Volume Slider */}
          <div className="pt-2 pb-1 space-y-1.5 border-t border-slate-100 dark:border-slate-800/80 mt-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">
                {effectiveVolume === 0 || isMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                ) : effectiveVolume < 50 ? (
                  <Volume1 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>Volume</span>
              </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {isMuted ? '0%' : `${effectiveVolume}%`}
              </span>
            </div>

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

          {/* Admin Direct Shortcut to Settings Music */}
          {isAdmin && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-1">
              <Link
                href="/settings-music"
                onClick={() => setIsPopoverOpen(false)}
                className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors text-[11px] font-bold group"
              >
                <span className="flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Pengaturan Backsound</span>
                </span>
                <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
