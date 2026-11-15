'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/hooks/use-admin';
import { useDatabase, useMemoFirebase, useObject } from '@/firebase';
import { ref, get, set, update, remove } from 'firebase/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Music,
  Upload,
  Play,
  Pause,
  Trash2,
  Edit3,
  Volume2,
  VolumeX,
  Volume1,
  CheckCircle2,
  AlertCircle,
  Disc3,
  Loader2,
  Sparkles,
  Radio,
  Clock,
  HardDrive,
  FileAudio,
  ShieldCheck,
  Check,
  Plus
} from 'lucide-react';
import { BacksoundConfig, BacksoundSong } from '@/types/music-backsound';
import {
  fileToBase64,
  splitBase64IntoChunks,
  chunksToBlobUrl,
  getAudioDuration,
  formatDuration,
  formatFileSize,
  generateSampleAmbientTone,
  audioBlobUrlCache
} from '@/lib/music-service';
import { cn } from '@/lib/utils';

export default function SettingsMusicPage() {
  const router = useRouter();
  const { user, isAdmin, isAdminLoading } = useAdmin();
  const database = useDatabase();
  const { toast } = useToast();

  // Firebase Realtime Listeners
  const configRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'settings/music_backsound/config');
  }, [database]);
  const { data: configData } = useObject(configRef);
  const config = configData as BacksoundConfig | null;

  const songsRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'settings/music_backsound/songs');
  }, [database]);
  const { data: songsData, isLoading: isSongsLoading } = useObject(songsRef);

  // Local State
  const [songsList, setSongsList] = useState<BacksoundSong[]>([]);
  const [volume, setVolume] = useState<number>(50);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [autoplayOnLogin, setAutoplayOnLogin] = useState<boolean>(true);
  const [loopMode, setLoopMode] = useState<boolean>(true);

  // Preview Player State (Per-song audio preview in this admin menu)
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [previewProgress, setPreviewProgress] = useState<number>(0);
  const [previewCurrentTime, setPreviewCurrentTime] = useState<number>(0);
  const [previewDuration, setPreviewDuration] = useState<number>(0);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<BacksoundSong | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [isEditActive, setIsEditActive] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  // Delete Confirm Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingSong, setDeletingSong] = useState<BacksoundSong | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sample song generating state
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);

  // Volume debounce ref to avoid excessive database writes while dragging slider
  const volumeDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Role Gate: Only Administrator can access
  useEffect(() => {
    if (!isAdminLoading) {
      if (!user) {
        router.push('/login');
      } else if (!isAdmin) {
        toast({
          variant: 'destructive',
          title: 'Akses Ditolak',
          description: 'Menu ini hanya bisa diakses oleh pengguna dengan Role: Administrator.'
        });
        router.push('/');
      }
    }
  }, [isAdmin, isAdminLoading, user, router, toast]);

  // Sync config data from Firebase
  useEffect(() => {
    if (config) {
      if (typeof config.volume === 'number') setVolume(config.volume);
      if (typeof config.enabled === 'boolean') setIsEnabled(config.enabled);
      if (typeof config.autoplayOnLogin === 'boolean') setAutoplayOnLogin(config.autoplayOnLogin);
      if (typeof config.loop === 'boolean') setLoopMode(config.loop);
    }
  }, [config]);

  // Sync songs list from Firebase
  useEffect(() => {
    if (songsData && typeof songsData === 'object') {
      const parsed: BacksoundSong[] = [];
      if (Array.isArray(songsData)) {
        songsData.forEach((item, index) => {
          if (item && typeof item === 'object') {
            parsed.push({
              ...item,
              id: item.id || `song_${index}`
            });
          }
        });
      } else {
        Object.entries(songsData).forEach(([key, val]: [string, any]) => {
          // Ignore the injected 'id' property from useObject (where val is a string or key === 'id')
          if (key !== 'id' && val && typeof val === 'object') {
            parsed.push({
              ...val,
              id: val.id || key
            });
          }
        });
      }

      // Sort by createdAt ascending
      parsed.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setSongsList(parsed);
    } else {
      setSongsList([]);
    }
  }, [songsData]);

  // Preview Audio Instance Setup
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const audio = new Audio();
    audio.preload = 'auto';

    audio.ontimeupdate = () => {
      setPreviewCurrentTime(Math.round(audio.currentTime));
      if (audio.duration && audio.duration > 0) {
        setPreviewProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.onloadedmetadata = () => {
      setPreviewDuration(Math.round(audio.duration || 0));
    };

    audio.onended = () => {
      setPlayingSongId(null);
      setPreviewProgress(0);
      setPreviewCurrentTime(0);
    };

    previewAudioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Update preview audio volume whenever volume changes
  useEffect(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.volume = Math.max(0, Math.min(1, volume / 100));
    }
  }, [volume]);

  // Real-time Volume Change Handler (slider drag)
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);

    // 1. Immediately adjust preview audio volume
    if (previewAudioRef.current) {
      previewAudioRef.current.volume = Math.max(0, Math.min(1, newVol / 100));
    }

    // 2. Debounce writing to Firebase Realtime Database
    if (volumeDebounceTimer.current) {
      clearTimeout(volumeDebounceTimer.current);
    }

    volumeDebounceTimer.current = setTimeout(async () => {
      if (!database) return;
      try {
        await update(ref(database, 'settings/music_backsound/config'), {
          volume: newVol,
          updatedAt: Date.now(),
          updatedBy: user?.email || 'admin'
        });
      } catch (err) {
        console.error('Failed to update volume in database:', err);
      }
    }, 200);
  };

  // Toggle Master Backsound On/Off
  const handleToggleEnabled = async (checked: boolean) => {
    setIsEnabled(checked);
    if (!database) return;
    try {
      await update(ref(database, 'settings/music_backsound/config'), {
        enabled: checked,
        updatedAt: Date.now()
      });
      toast({
        title: checked ? 'Musik Backsound Diaktifkan' : 'Musik Backsound Dinonaktifkan',
        description: checked
          ? 'Musik akan otomatis berputar saat pengguna login.'
          : 'Musik backsound dimatikan untuk seluruh pengguna aplikasi.'
      });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: 'Terjadi kesalahan database.' });
    }
  };

  // Toggle Autoplay on Login
  const handleToggleAutoplay = async (checked: boolean) => {
    setAutoplayOnLogin(checked);
    if (!database) return;
    try {
      await update(ref(database, 'settings/music_backsound/config'), {
        autoplayOnLogin: checked,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Loop
  const handleToggleLoop = async (checked: boolean) => {
    setLoopMode(checked);
    if (!database) return;
    try {
      await update(ref(database, 'settings/music_backsound/config'), {
        loop: checked,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Play / Pause Song Preview
  const handleTogglePlayPreview = async (song: BacksoundSong) => {
    if (!previewAudioRef.current || !database) return;

    // If already playing this song, pause it
    if (playingSongId === song.id) {
      previewAudioRef.current.pause();
      setPlayingSongId(null);
      return;
    }

    try {
      setLoadingAudioId(song.id);

      // Check cache first
      let blobUrl = audioBlobUrlCache[song.id];
      if (!blobUrl) {
        const chunksSnap = await get(ref(database, `settings/music_backsound/song_chunks/${song.id}`));
        if (!chunksSnap.exists()) {
          toast({ variant: 'destructive', title: 'Berkas Tidak Ditemukan', description: 'Data audio lagu ini tidak ditemukan.' });
          setLoadingAudioId(null);
          return;
        }

        const rawChunks = chunksSnap.val();
        const chunkArr: string[] = Array.isArray(rawChunks)
          ? rawChunks
          : Object.keys(rawChunks)
              .sort((a, b) => Number(a) - Number(b))
              .map((k) => rawChunks[k]);

        blobUrl = chunksToBlobUrl(chunkArr, song.mimeType || 'audio/mpeg');
        if (blobUrl) {
          audioBlobUrlCache[song.id] = blobUrl;
        }
      }

      if (!blobUrl) {
        toast({ variant: 'destructive', title: 'Gagal Memuat Audio', description: 'Format berkas audio tidak dapat diuraikan.' });
        setLoadingAudioId(null);
        return;
      }

      previewAudioRef.current.src = blobUrl;
      previewAudioRef.current.volume = Math.max(0, Math.min(1, volume / 100));
      await previewAudioRef.current.play();

      setPlayingSongId(song.id);
      setPreviewDuration(song.duration || 0);
    } catch (err) {
      console.error('Play error:', err);
      toast({ variant: 'destructive', title: 'Gagal Memutar Audio', description: 'Browser membatasi pemutaran berkas audio ini.' });
    } finally {
      setLoadingAudioId(null);
    }
  };

  // Set Active Song
  const handleSetActiveSong = async (song: BacksoundSong) => {
    if (!database) return;
    try {
      const updates: Record<string, any> = {};
      updates['settings/music_backsound/config/activeSongId'] = song.id;

      // Update all songs isActive flag
      songsList.forEach((s) => {
        updates[`settings/music_backsound/songs/${s.id}/isActive`] = s.id === song.id;
      });

      await update(ref(database), updates);
      toast({
        title: 'Backsound Utama Diperbarui',
        description: `"${song.title}" kini menjadi musik backsound utama aplikasi.`
      });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Gagal Mengubah Lagu', description: 'Terjadi kesalahan saat memperbarui database.' });
    }
  };

  // Handle Upload New Song
  const handleStartUpload = () => {
    if (songsList.length >= 3) {
      toast({
        variant: 'destructive',
        title: 'Batas Maksimal 3 Lagu',
        description: 'Banyaknya music backsound yang bisa diunggah adalah maksimal 3 lagu. Silakan hapus lagu yang sudah ada terlebih dahulu.'
      });
      return;
    }
    setUploadTitle('');
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadStatusText('');
    setIsUploadModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (max 10MB)
    const MAX_SIZE_MB = 10;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Ukuran Terlalu Besar',
        description: `Ukuran file ${(file.size / (1024 * 1024)).toFixed(1)} MB melebihi batas maksimal ${MAX_SIZE_MB} MB.`
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    if (!uploadTitle.trim()) {
      // Auto-set title from file name without extension
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setUploadTitle(nameWithoutExt);
    }
  };

  const handleSaveUpload = async () => {
    if (!selectedFile) {
      toast({ variant: 'destructive', title: 'Pilih Berkas Audio', description: 'Silakan pilih file MP3, WAV, atau OGG terlebih dahulu.' });
      return;
    }
    if (!uploadTitle.trim()) {
      toast({ variant: 'destructive', title: 'Judul Lagu Kosong', description: 'Silakan isi judul lagu.' });
      return;
    }
    if (songsList.length >= 3) {
      toast({ variant: 'destructive', title: 'Batas Maksimal 3 Lagu', description: 'Tidak dapat mengunggah lebih dari 3 lagu.' });
      return;
    }
    if (!database) return;

    setIsUploading(true);
    setUploadProgress(10);
    setUploadStatusText('Membaca durasi dan berkas audio...');

    try {
      const duration = await getAudioDuration(selectedFile);
      setUploadProgress(25);
      setUploadStatusText('Mengonversi berkas audio...');

      const base64Data = await fileToBase64(selectedFile);
      setUploadProgress(40);
      setUploadStatusText('Membagi berkas audio menjadi bagian aman...');

      const chunks = splitBase64IntoChunks(base64Data);
      const songId = `song_${Date.now()}`;

      // Upload chunks sequentially
      setUploadStatusText(`Mengunggah 0/${chunks.length} bagian ke database...`);
      for (let i = 0; i < chunks.length; i++) {
        await set(ref(database, `settings/music_backsound/song_chunks/${songId}/${i}`), chunks[i]);
        const progress = Math.min(95, Math.round(40 + ((i + 1) / chunks.length) * 50));
        setUploadProgress(progress);
        setUploadStatusText(`Mengunggah bagian ${i + 1} dari ${chunks.length}...`);
      }

      // Check if this is the first song, auto-make it active
      const isFirstSong = songsList.length === 0;

      const newSong: BacksoundSong = {
        id: songId,
        title: uploadTitle.trim(),
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type || 'audio/mpeg',
        duration,
        totalChunks: chunks.length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: isFirstSong
      };

      const updates: Record<string, any> = {};
      updates[`settings/music_backsound/songs/${songId}`] = newSong;
      if (isFirstSong) {
        updates['settings/music_backsound/config/activeSongId'] = songId;
      }

      await update(ref(database), updates);

      // Cache blob url in memory
      const blobUrl = chunksToBlobUrl(chunks, newSong.mimeType);
      if (blobUrl) {
        audioBlobUrlCache[songId] = blobUrl;
      }

      setUploadProgress(100);
      setUploadStatusText('Selesai!');
      toast({ title: 'Lagu Berhasil Diunggah', description: `Lagu "${newSong.title}" berhasil ditambahkan ke daftar backsound.` });
      setIsUploadModalOpen(false);
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({ variant: 'destructive', title: 'Gagal Mengunggah', description: err.message || 'Terjadi kesalahan saat mengunggah lagu.' });
    } finally {
      setIsUploading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (song: BacksoundSong) => {
    setEditingSong(song);
    setEditTitle(song.title);
    setIsEditActive(song.isActive);
    setEditFile(null);
    setIsEditModalOpen(true);
  };

  // Save Edit Song
  const handleSaveEdit = async () => {
    if (!editingSong || !database) return;
    if (!editTitle.trim()) {
      toast({ variant: 'destructive', title: 'Judul Lagu Kosong', description: 'Silakan masukkan judul lagu.' });
      return;
    }

    setIsSavingEdit(true);
    try {
      const updates: Record<string, any> = {
        [`settings/music_backsound/songs/${editingSong.id}/title`]: editTitle.trim(),
        [`settings/music_backsound/songs/${editingSong.id}/updatedAt`]: Date.now()
      };

      // If user provided a new audio file to replace existing audio
      if (editFile) {
        const duration = await getAudioDuration(editFile);
        const base64Data = await fileToBase64(editFile);
        const chunks = splitBase64IntoChunks(base64Data);

        // Delete old chunks and write new chunks
        await remove(ref(database, `settings/music_backsound/song_chunks/${editingSong.id}`));
        for (let i = 0; i < chunks.length; i++) {
          await set(ref(database, `settings/music_backsound/song_chunks/${editingSong.id}/${i}`), chunks[i]);
        }

        updates[`settings/music_backsound/songs/${editingSong.id}/fileName`] = editFile.name;
        updates[`settings/music_backsound/songs/${editingSong.id}/fileSize`] = editFile.size;
        updates[`settings/music_backsound/songs/${editingSong.id}/mimeType`] = editFile.type || 'audio/mpeg';
        updates[`settings/music_backsound/songs/${editingSong.id}/duration`] = duration;
        updates[`settings/music_backsound/songs/${editingSong.id}/totalChunks`] = chunks.length;

        // Invalidate and update memory cache
        delete audioBlobUrlCache[editingSong.id];
        const newBlobUrl = chunksToBlobUrl(chunks, editFile.type || 'audio/mpeg');
        if (newBlobUrl) audioBlobUrlCache[editingSong.id] = newBlobUrl;
      }

      // If isActive status changed to true
      if (isEditActive && !editingSong.isActive) {
        updates['settings/music_backsound/config/activeSongId'] = editingSong.id;
        songsList.forEach((s) => {
          updates[`settings/music_backsound/songs/${s.id}/isActive`] = s.id === editingSong.id;
        });
      }

      await update(ref(database), updates);

      toast({ title: 'Lagu Berhasil Diperbarui', description: `Perubahan pada "${editTitle.trim()}" telah disimpan.` });
      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Gagal Memperbarui', description: err.message || 'Terjadi kesalahan.' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Open Delete Confirm
  const handleOpenDelete = (song: BacksoundSong) => {
    setDeletingSong(song);
    setIsDeleteDialogOpen(true);
  };

  // Confirm Delete Song
  const handleConfirmDelete = async () => {
    if (!deletingSong || !database) return;
    setIsDeleting(true);

    try {
      // 1. If currently previewing, stop preview audio
      if (playingSongId === deletingSong.id && previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = '';
        setPlayingSongId(null);
      }

      // 2. Remove song metadata and audio chunks from database
      await remove(ref(database, `settings/music_backsound/songs/${deletingSong.id}`));
      await remove(ref(database, `settings/music_backsound/song_chunks/${deletingSong.id}`));

      // 3. Clear memory cache
      delete audioBlobUrlCache[deletingSong.id];

      // 4. If this song was active, pick another song if available
      const remaining = songsList.filter((s) => s.id !== deletingSong.id);
      if (deletingSong.isActive || config?.activeSongId === deletingSong.id) {
        if (remaining.length > 0) {
          const nextActive = remaining[0];
          await update(ref(database), {
            'settings/music_backsound/config/activeSongId': nextActive.id,
            [`settings/music_backsound/songs/${nextActive.id}/isActive`]: true
          });
        } else {
          await update(ref(database), {
            'settings/music_backsound/config/activeSongId': null
          });
        }
      }

      toast({ title: 'Lagu Dihapus', description: `Lagu "${deletingSong.title}" berhasil dihapus dari daftar backsound.` });
      setIsDeleteDialogOpen(false);
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Gagal Menghapus', description: err.message || 'Terjadi kesalahan saat menghapus lagu.' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick Preset Sample Generator (For instant testing without user uploading MP3)
  const handleLoadSampleSong = async () => {
    if (songsList.length >= 3) {
      toast({ variant: 'destructive', title: 'Batas Maksimal 3 Lagu', description: 'Hapus salah satu lagu terlebih dahulu.' });
      return;
    }
    if (!database) return;

    setIsGeneratingSample(true);
    try {
      const sample = generateSampleAmbientTone();
      const chunks = splitBase64IntoChunks(sample.base64);
      const songId = `song_sample_${Date.now()}`;

      for (let i = 0; i < chunks.length; i++) {
        await set(ref(database, `settings/music_backsound/song_chunks/${songId}/${i}`), chunks[i]);
      }

      const isFirst = songsList.length === 0;
      const newSong: BacksoundSong = {
        id: songId,
        title: `Harmoni Ambient UMKM #${songsList.length + 1}`,
        fileName: 'harmoni-ambient-preset.wav',
        fileSize: Math.round(sample.base64.length * 0.75),
        mimeType: sample.mimeType,
        duration: sample.duration,
        totalChunks: chunks.length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: isFirst
      };

      const updates: Record<string, any> = {};
      updates[`settings/music_backsound/songs/${songId}`] = newSong;
      if (isFirst) {
        updates['settings/music_backsound/config/activeSongId'] = songId;
      }
      await update(ref(database), updates);

      toast({
        title: 'Contoh Lagu Berhasil Dimuat',
        description: `"${newSong.title}" kini siap digunakan dan dapat diputar.`
      });
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Gagal Memuat Contoh', description: err.message || 'Terjadi kesalahan.' });
    } finally {
      setIsGeneratingSample(false);
    }
  };

  if (isAdminLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-slate-500">Memverifikasi hak akses Administrator...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const isMaxSongs = songsList.length >= 3;

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b5a48] via-[#124236] to-[#082a22] text-white p-6 sm:p-8 shadow-xl border border-emerald-500/20">
        <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-400/20 text-emerald-200 border-emerald-400/40 text-xs font-bold px-3 py-1 flex items-center gap-1.5 backdrop-blur-md">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Role: Administrator</span>
              </Badge>
              <Badge
                className={cn(
                  'text-xs font-bold px-3 py-1 flex items-center gap-1.5',
                  isEnabled
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-700/80 text-slate-300'
                )}
              >
                <Radio className="w-3 h-3" />
                <span>{isEnabled ? 'Backsound Aktif' : 'Backsound Dinonaktifkan'}</span>
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Disc3 className="w-8 h-8 text-emerald-300 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Music Backsound</span>
            </h1>
            <p className="text-sm text-emerald-100/80 max-w-xl leading-relaxed">
              Upload musik backsound aplikasi, atur volume secara realtime, dan musik akan otomatis diputar saat pengguna login ke dalam aplikasi SIMPU.
            </p>
          </div>

          {/* Quick Counter Card */}
          <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/15 rounded-2xl p-4 shrink-0 flex sm:flex-col items-center justify-between sm:justify-center text-center gap-2">
            <div className="text-left sm:text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block">
                Slot Backsound
              </span>
              <span className="text-2xl font-black text-white">
                {songsList.length} <span className="text-sm font-semibold text-emerald-200">/ 3 Lagu</span>
              </span>
            </div>
            <span
              className={cn(
                'text-[11px] font-bold px-2.5 py-0.5 rounded-full',
                isMaxSongs ? 'bg-amber-400/30 text-amber-200' : 'bg-emerald-400/20 text-emerald-200'
              )}
            >
              {isMaxSongs ? 'Slot Penuh' : `${3 - songsList.length} Slot Tersedia`}
            </span>
          </div>
        </div>
      </div>

      {/* Realtime Volume & Global Controls Card */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Pengaturan Volume & Pemutaran Realtime</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Perubahan volume langsung diterapkan secara realtime ke audio yang sedang diputar di aplikasi.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="master-switch" className="text-xs font-bold text-slate-700 dark:text-slate-300 hidden sm:inline">
                {isEnabled ? 'Musik Aktif' : 'Musik Mati'}
              </Label>
              <Switch
                id="master-switch"
                checked={isEnabled}
                onCheckedChange={handleToggleEnabled}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Realtime Slider */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
                {volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-rose-500" />
                ) : volume < 50 ? (
                  <Volume1 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Volume2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>Volume Backsound Global</span>
              </div>
              <span className="text-base font-black px-3 py-1 rounded-xl bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 shadow-2xs font-mono">
                {volume}%
              </span>
            </div>

            <Slider
              value={[volume]}
              min={0}
              max={100}
              step={1}
              onValueChange={(vals) => handleVolumeChange(vals[0] ?? 50)}
              className="py-2 cursor-pointer"
            />

            {/* Volume Presets */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-400">Pilihan Cepat:</span>
              <div className="flex items-center gap-1.5">
                {[
                  { label: 'Mute (0%)', val: 0 },
                  { label: '25%', val: 25 },
                  { label: '50%', val: 50 },
                  { label: '75%', val: 75 },
                  { label: '100%', val: 100 }
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => handleVolumeChange(item.val)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95',
                      volume === item.val
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Autoplay on Login & Loop Mode Switches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="space-y-0.5 pr-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                  Putar Otomatis Saat Login
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">
                  Backsound langsung aktif saat pengguna berhasil login ke aplikasi.
                </span>
              </div>
              <Switch
                checked={autoplayOnLogin}
                onCheckedChange={handleToggleAutoplay}
                className="data-[state=checked]:bg-emerald-600 shrink-0"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="space-y-0.5 pr-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                  Ulangi Lagu (Looping)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">
                  Memutar lagu terus menerus tanpa henti secara otomatis.
                </span>
              </div>
              <Switch
                checked={loopMode}
                onCheckedChange={handleToggleLoop}
                className="data-[state=checked]:bg-emerald-600 shrink-0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Song List Section (Maksimal 3 Lagu) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Music className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Daftar Lagu Backsound (Maksimal 3 Lagu)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola hingga 3 lagu backsound lengkap dengan tombol putar preview, edit, dan hapus di setiap lagu.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {songsList.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadSampleSong}
                disabled={isGeneratingSample}
                className="rounded-xl font-bold text-xs gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                {isGeneratingSample ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Muat Contoh Lagu</span>
              </Button>
            )}

            <Button
              onClick={handleStartUpload}
              disabled={isMaxSongs}
              className={cn(
                'rounded-xl font-bold text-xs gap-1.5 shadow-sm active:scale-95 transition-all',
                isMaxSongs
                  ? 'opacity-60 cursor-not-allowed bg-slate-300 dark:bg-slate-800 text-slate-500'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              )}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isMaxSongs ? 'Batas 3 Lagu Penuh' : 'Upload Lagu Baru'}</span>
            </Button>
          </div>
        </div>

        {/* Empty State */}
        {songsList.length === 0 && (
          <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 text-center py-12 px-4 rounded-3xl">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <FileAudio className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  Belum Ada Lagu Backsound
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Silakan upload file musik backsound berformat MP3, WAV, atau OGG (maksimal 3 lagu). Anda juga dapat memuat contoh lagu bawaan langsung untuk mencoba.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button
                  onClick={handleLoadSampleSong}
                  disabled={isGeneratingSample}
                  variant="outline"
                  className="rounded-xl font-bold text-xs gap-1.5 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                >
                  {isGeneratingSample ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Gunakan Contoh Lagu Bawaan</span>
                </Button>

                <Button
                  onClick={handleStartUpload}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Berkas Audio</span>
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Songs Grid (Max 3 songs) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {songsList.map((song, idx) => {
            const isPlayingThis = playingSongId === song.id;
            const isLoadingThis = loadingAudioId === song.id;
            const isPrimaryActive = song.isActive || config?.activeSongId === song.id;

            return (
              <Card
                key={song.id}
                className={cn(
                  'relative overflow-hidden transition-all duration-200 border rounded-3xl flex flex-col justify-between shadow-sm',
                  isPrimaryActive
                    ? 'border-emerald-500/60 dark:border-emerald-500/40 bg-gradient-to-b from-emerald-50/40 to-white dark:from-emerald-950/20 dark:to-slate-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                )}
              >
                <div>
                  {/* Top Badge & Number */}
                  <div className="p-4 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Lagu #{idx + 1}
                    </span>

                    {isPrimaryActive ? (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 flex items-center gap-1 shadow-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Backsound Utama</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        Cadangan
                      </Badge>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4">
                    {/* Vinyl Cover & Title */}
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md transition-transform duration-300',
                          isPlayingThis
                            ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-emerald-500/30 rotate-12 scale-105'
                            : isPrimaryActive
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        )}
                      >
                        <Disc3
                          className={cn('w-6 h-6', isPlayingThis && 'animate-spin')}
                          style={{ animationDuration: '4s' }}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate" title={song.title}>
                          {song.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5" title={song.fileName}>
                          {song.fileName}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] font-semibold text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(song.duration)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3" />
                            {formatFileSize(song.fileSize)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Preview Playback Progress */}
                    {isPlayingThis && (
                      <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                          <span>{formatDuration(previewCurrentTime)}</span>
                          <span>{formatDuration(previewDuration || song.duration)}</span>
                        </div>
                        <Progress value={previewProgress} className="h-1.5 bg-emerald-100 dark:bg-emerald-950" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 space-y-2.5">
                  {/* Play Preview Button */}
                  <Button
                    type="button"
                    onClick={() => handleTogglePlayPreview(song)}
                    disabled={isLoadingThis}
                    className={cn(
                      'w-full rounded-xl font-bold text-xs gap-1.5 h-9 transition-all active:scale-95 shadow-xs',
                      isPlayingThis
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                    )}
                  >
                    {isLoadingThis ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isPlayingThis ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    )}
                    <span>{isPlayingThis ? 'Jeda Preview' : 'Putar Preview'}</span>
                  </Button>

                  {/* Secondary Action Row: Set Active + Edit + Hapus */}
                  <div className="flex items-center gap-1.5">
                    {!isPrimaryActive ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetActiveSong(song)}
                        className="flex-1 rounded-xl text-[11px] font-bold h-8 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        title="Jadikan backsound utama yang berputar di aplikasi"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        <span>Pilih Utama</span>
                      </Button>
                    ) : (
                      <div className="flex-1 text-center py-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Aktif Diputar
                        </span>
                      </div>
                    )}

                    {/* Tombol Edit */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(song)}
                      className="rounded-xl h-8 px-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700"
                      title="Edit Judul & Berkas Lagu"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold ml-1">Edit</span>
                    </Button>

                    {/* Tombol Hapus */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDelete(song)}
                      className="rounded-xl h-8 px-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/60"
                      title="Hapus Lagu Backsound"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold ml-1">Hapus</span>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Add Song Placeholder Card (when slot is available) */}
          {!isMaxSongs && (
            <button
              type="button"
              onClick={handleStartUpload}
              className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500/60 dark:hover:border-emerald-500/40 rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-3 transition-all hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 min-h-[220px] group active:scale-95 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950/60 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center justify-center transition-colors">
                <Plus className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200 block group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                  Tambah Lagu #{songsList.length + 1}
                </span>
                <span className="text-xs text-slate-400 mt-0.5 block">
                  Klik untuk upload file MP3 / WAV / OGG
                </span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Upload Song Dialog Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-[460px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Upload Musik Backsound Baru</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pilih berkas audio (MP3, WAV, atau OGG, maks. 10 MB). Berkas akan disimpan ke dalam database aplikasi SIMPU.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* File Input */}
            <div className="space-y-1.5">
              <Label htmlFor="audio-file" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Pilih Berkas Audio <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="audio-file"
                ref={fileInputRef}
                type="file"
                accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg,audio/aac,audio/m4a,.mp3,.wav,.ogg,.m4a"
                onChange={handleFileChange}
                disabled={isUploading}
                className="rounded-xl text-xs cursor-pointer file:cursor-pointer file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:font-bold dark:file:bg-emerald-950 dark:file:text-emerald-300"
              />
              {selectedFile && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{selectedFile.name} ({formatFileSize(selectedFile.size)})</span>
                </p>
              )}
            </div>

            {/* Song Title Input */}
            <div className="space-y-1.5">
              <Label htmlFor="song-title" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Judul Lagu <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="song-title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Contoh: Nada Inspiratif UMKM"
                disabled={isUploading}
                className="rounded-xl text-xs"
              />
            </div>

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <span>{uploadStatusText}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2 bg-emerald-200 dark:bg-emerald-900" />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsUploadModalOpen(false)}
              disabled={isUploading}
              className="rounded-xl text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveUpload}
              disabled={isUploading || !selectedFile || !uploadTitle.trim()}
              className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>Simpan & Upload</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Song Dialog Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-[460px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Edit Lagu Backsound</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ubah judul lagu, ganti file audio, atau jadikan lagu ini sebagai backsound utama.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Song Title Input */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-song-title" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Judul Lagu <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="edit-song-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Masukkan judul lagu..."
                disabled={isSavingEdit}
                className="rounded-xl text-xs"
              />
            </div>

            {/* Replace Audio File (Optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-audio-file" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Ganti Berkas Audio (Opsional)
              </Label>
              <Input
                id="edit-audio-file"
                ref={editFileInputRef}
                type="file"
                accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg,audio/aac,audio/m4a,.mp3,.wav,.ogg,.m4a"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setEditFile(f);
                }}
                disabled={isSavingEdit}
                className="rounded-xl text-xs cursor-pointer file:cursor-pointer file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:font-bold dark:file:bg-emerald-950 dark:file:text-emerald-300"
              />
              <p className="text-[11px] text-slate-400">
                {editFile
                  ? `Berkas baru dipilih: ${editFile.name} (${formatFileSize(editFile.size)})`
                  : `Berkas saat ini: ${editingSong?.fileName || '-'} (${formatFileSize(editingSong?.fileSize)})`}
              </p>
            </div>

            {/* Set as Primary Switch */}
            <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Jadikan Backsound Utama
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Lagu ini akan diputar otomatis saat pengguna login.
                </span>
              </div>
              <Switch
                checked={isEditActive}
                onCheckedChange={setIsEditActive}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSavingEdit}
              className="rounded-xl text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={isSavingEdit || !editTitle.trim()}
              className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Simpan Perubahan</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        icon={<Trash2 className="w-8 h-8 text-rose-500" />}
        title="Hapus Lagu Backsound?"
        description={`Apakah Anda yakin ingin menghapus lagu "${deletingSong?.title}"? Berkas audio dan data terkait akan dihapus secara permanen dari database.`}
        cancelText="Batal"
        confirmText="Hapus Lagu"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
