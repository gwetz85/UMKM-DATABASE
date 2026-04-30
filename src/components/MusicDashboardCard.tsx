'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, SkipBack, SkipForward, Music2, ListMusic, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';


const PLAYLIST_ITEMS_INITIAL = [
  "REMIX HOREG VERSION - GEMOY DJ GEMOY - INGKAR JANJI - [ OFICIAL MUSIC VIDEO ]",
  "BAGAIKAN LANGIT DAN BUMI REMIX ELEKTRO KOPLO X DJ GEMOY AND CREATIVE TEAM",
  "JUDUL JUDULAN [ KAWIN KAWINAN ] COVER ELEKTRO KOPLO X DJ GEMOY",
  "MARDUA HOLONG - MANYASA DENAI - RUNTAH - RUNGKAD - CINDAI (VILOID edit) | BKB",
  "DJ JEDAG JEDUG GHOST (DJ IMUT REMIX)",
  "Yeni Inka - FINALLY I FOUND YOU | Live OJING (Official Music Yi Production)",
  "KOYO JOGJA ISTIMEWA - NDARBOY GENK | Cover by Nabila Maharani With NM Boys",
  "Niken Salindry - KISINAN ( Official Music Video ANEKA SAFARI)",
  "TABOLA BALE - NDARBOY GENK x WITA SOFI x ONCHO FLASH (Official Live Music) Silet Open Up",
  "PICA PICA - NDARBOY GENK x JUAN REZA x JACSON ZERAN x WITA SOFI (Official Live Music)",
  "UBUR UBUR IKAN LELE - NDARBOY GENK x JUAN REZA x JACSON ZERAN x WITA SOFI (Official Live Music)",
  "KOTAK - Haters (Official Music Video)",
  "KOTAK - Sendiri (Lirik)",
  "BAYANGAN - U'CAMP ( LIRIK )",
  "YANK - WALI | Cover by Nabila Maharani with NM Boys",
  "SEPARUH NAFAS - DEWA | Cover by Nabila Maharani with NM Boys",
  "One Piece Ending 1 - Memories - SLS Piano Cover",
  "DJ Mardua Holong Remix Viral TikTok Terbaru 2024 Full Bass"
];

export function MusicDashboardCard({ className }: { className?: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTitle, setCurrentTitle] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playlist, setPlaylist] = useState(PLAYLIST_ITEMS_INITIAL);
  const [isSyncing, setIsSyncing] = useState(false);
  const [volume, setVolume] = useState(50);

  const { toast } = useToast();

  // On mount, request current status from BackgroundMusic (persists across navigation).
  // Small delay (300ms) to allow YouTube to auto-resume after the brief navigation-triggered
  // PAUSED event before we query its actual state.
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('music-request-status'));
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleStatusUpdate = (e: any) => {
      const { isPlaying, currentTitle, isPlayerReady, isMuted, volume } = e.detail;
      setIsPlaying(isPlaying);
      setCurrentTitle(currentTitle);
      setIsReady(isPlayerReady);
      setIsMuted(isMuted);
      if (volume !== undefined) setVolume(volume);


      // Dynamic Sync: Refined duplicate detection
      if (currentTitle) {
        const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        const normalizedCurrent = normalize(currentTitle);
        
        const exists = playlist.some(item => {
          const normalizedItem = normalize(item);
          return normalizedItem.includes(normalizedCurrent) || normalizedCurrent.includes(normalizedItem);
        });

        if (!exists) {
          setPlaylist(prev => [...prev, currentTitle]);
        }
      }
    };

    window.addEventListener('music-status-update', handleStatusUpdate);

    const handlePlaylistCallback = async (e: any) => {
      const { playlistIds } = e.detail;
      if (!playlistIds || playlistIds.length === 0) {
        setIsSyncing(false);
        return;
      }

      setIsSyncing(true);
      const newTitles: string[] = [];
      
      try {
        // Fetch titles for each ID using noembed (CORS-friendly)
        // We limit to first 100 for better coverage while maintaining performance
        const idsToFetch = playlistIds.slice(0, 100);
        
        const fetchTitle = async (id: string, index: number) => {
          try {
            const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`);
            const data = await response.json();
            return data.title || `Track ${index + 1} (Unknown Title)`;
          } catch (err) {
            return `Track ${index + 1} (Fetch Error)`;
          }
        };

        const results = await Promise.all(idsToFetch.map((id: string, index: number) => fetchTitle(id, index)));
        newTitles.push(...results);

        if (newTitles.length > 0) {
          setPlaylist(newTitles);
          toast({
            title: "Playlist Ter-sinkron",
            description: `Berhasil memuat ${newTitles.length} lagu dari YouTube.`,
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Gagal Sinkron",
          description: "Terjadi kesalahan saat menghubungi YouTube.",
        });
      } finally {
        setIsSyncing(false);
      }
    };

    window.addEventListener('music-playlist-ids-callback', handlePlaylistCallback);
    
    return () => {
      window.removeEventListener('music-status-update', handleStatusUpdate);
      window.removeEventListener('music-playlist-ids-callback', handlePlaylistCallback);
    };
  }, [playlist, toast]);

  const sendControl = (action: string, value?: any) => {
    window.dispatchEvent(new CustomEvent('music-remote-control', { 
      detail: { action, value } 
    }));
  };

  const handleSyncPlaylist = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    sendControl('get-playlist');
  };

  return (
    <Card className={cn("glass overflow-hidden transition-all hover:shadow-xl border-none", className)}>
      <CardHeader className="bg-primary/10 pb-4">
        <CardTitle className="text-base md:text-lg font-bold flex items-center justify-between text-primary">
          <div className="flex items-center gap-2">
            <Music2 className="w-5 h-5" /> Music Player
          </div>
          {isPlaying && (
             <div className="flex items-end gap-[2px] h-4">
               {[...Array(5)].map((_, i) => (
                 <div 
                   key={i} 
                   className="w-[3px] bg-primary animate-equalizer" 
                   style={{ animationDelay: `${i * 0.1}s`, height: '100%' }}
                 />
               ))}
             </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="p-6 space-y-4 flex-1 flex flex-col">
          {/* Now Playing Area */}
          <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-2xl relative overflow-hidden group">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-700",
              isPlaying ? "bg-primary text-white rotate-[360deg]" : "bg-slate-100 text-slate-400"
            )}>
              <Music2 className={cn("w-6 h-6", isPlaying && "animate-pulse")} />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {isPlaying ? "Sedang Diputar" : "Berhenti"}
              </span>
              <span className="text-sm font-black text-primary truncate leading-tight mt-0.5">
                {currentTitle || "Klik Putar untuk memulai"}
              </span>
            </div>
            
            {/* Play/Pause Button in Main Row */}
            <Button 
              size="icon" 
              variant="default"
              className={cn(
                "rounded-full w-10 h-10 shadow-lg group-active:scale-90 transition-all",
                isPlaying ? "bg-primary hover:bg-primary/90" : "bg-primary hover:bg-primary/90"
              )}
              onClick={() => sendControl(isPlaying ? 'pause' : 'play')}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </Button>
          </div>

          {/* Simple Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => sendControl('previous')}>
              <SkipBack className="w-5 h-5" />
            </Button>
            <div className="w-px h-6 bg-slate-200" />
            <Button variant="ghost" size="icon" onClick={() => sendControl('next')}>
              <SkipForward className="w-5 h-5" />
            </Button>
            <div className="w-px h-6 bg-slate-200" />
            
            <div className="flex items-center gap-3 group/volume relative flex-1 max-w-[120px]">
              <Button 
                variant="ghost" 
                size="icon" 
                className="shrink-0"
                onClick={() => sendControl('volume', isMuted ? (volume > 0 ? volume : 50) : 0)}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-rose-500" /> : <Volume2 className="w-5 h-5" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={100}
                step={1}
                onValueChange={(val) => {
                  setVolume(val[0]);
                  sendControl('volume', val[0]);
                }}
                className="w-full"
              />
            </div>
          </div>


          <div className="space-y-3 flex-1 flex flex-col">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                <ListMusic className="w-3.5 h-3.5" /> Full Playlist
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={isSyncing || !isReady}
                onClick={handleSyncPlaylist}
                className="h-6 px-2 text-[9px] font-black uppercase hover:bg-primary/10 text-primary transition-all flex items-center gap-1.5"
              >
                {isSyncing ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-2.5 h-2.5" />
                )}
                {isSyncing ? "Syncing..." : "Update Playlist"}
              </Button>
            </div>
            <ScrollArea className="h-[350px] w-full rounded-xl border bg-slate-50/50 p-2">
              <div className="space-y-1">
                {playlist.map((song, index) => {
                  const isCurrent = currentTitle.toLowerCase().includes(song.toLowerCase()) || 
                                   (currentTitle === "" && index === 0);
                  
                  return (
                    <div 
                      key={index}
                      onClick={() => sendControl('playAt', index)}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all hover:bg-white border border-transparent",
                        isCurrent ? "bg-white border-primary/20 shadow-sm" : "hover:border-slate-200"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0",
                        isCurrent ? "bg-primary text-white" : "bg-slate-200 text-slate-500"
                      )}>
                        {index + 1}
                      </div>
                      <span className={cn(
                        "text-[11px] font-bold truncate flex-1",
                        isCurrent ? "text-primary" : "text-slate-600"
                      )}>
                        {song}
                      </span>
                      {isCurrent && isPlaying && (
                        <div className="flex items-end gap-[1px] h-2 mb-0.5 pr-1">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="w-[2px] bg-primary animate-equalizer h-full" style={{ animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
      
      {/* Visual Equalizer CSS */}
      <style jsx global>{`
        @keyframes equalizer {
          0%, 100% { height: 30%; }
          50% { height: 100%; }
        }
        .animate-equalizer {
          animation: equalizer 0.6s ease-in-out infinite;
        }
      `}</style>
    </Card>
  );
}
