export interface BacksoundSong {
  id: string;
  title: string;
  artist?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration?: number;
  totalChunks: number;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

export interface BacksoundConfig {
  enabled: boolean;
  volume: number; // 0 - 100
  activeSongId?: string;
  loop?: boolean;
  autoplayOnLogin?: boolean;
  updatedAt?: number;
  updatedBy?: string;
}
