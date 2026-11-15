/**
 * Music Backsound Utility & Audio Services
 */

// In-memory cache for audio Object URLs to avoid unnecessary re-downloads and re-creations
export const audioBlobUrlCache: Record<string, string> = {};

/**
 * Convert a File object into a full Base64 Data URL string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Split Base64 Data URL into safe chunks for Firebase Realtime Database
 * Default 180KB chunks to stay well beneath Firebase's per-key limits
 */
export function splitBase64IntoChunks(base64: string, chunkSize: number = 180 * 1024): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < base64.length; i += chunkSize) {
    chunks.push(base64.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Convert reconstructed chunks array into a memory Blob Object URL for lightning-fast HTML5 Audio playback
 */
export function chunksToBlobUrl(chunks: string[], mimeType: string = 'audio/mpeg'): string {
  try {
    const fullBase64 = chunks.join('');
    const pureBase64 = fullBase64.includes(',') ? fullBase64.split(',')[1] : fullBase64;
    const binaryString = window.atob(pureBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Error creating audio blob URL from chunks:', err);
    return '';
  }
}

/**
 * Extract audio duration from File using temporary Audio element
 */
export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    try {
      const objectUrl = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.src = objectUrl;

      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
      };

      audio.onloadedmetadata = () => {
        const duration = Math.round(audio.duration || 0);
        cleanup();
        resolve(duration);
      };

      audio.onerror = () => {
        cleanup();
        resolve(0);
      };

      // Fallback timeout after 3 seconds
      setTimeout(() => {
        cleanup();
        resolve(0);
      }, 3000);
    } catch {
      resolve(0);
    }
  });
}

/**
 * Format seconds into mm:ss format
 */
export function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Format bytes into human-readable string (KB, MB)
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Generate a pleasant, gentle corporate ambient melody as a WAV Base64 Data URL
 * Useful for instant testing or demo preset if no custom MP3 is uploaded yet!
 */
export function generateSampleAmbientTone(): { base64: string; duration: number; mimeType: string } {
  const sampleRate = 22050;
  const duration = 12; // 12 seconds loop
  const totalSamples = sampleRate * duration;
  const numChannels = 2;

  // Simple WAV header generator
  const buffer = new ArrayBuffer(44 + totalSamples * numChannels * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * numChannels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, totalSamples * numChannels * 2, true);

  // Peaceful pentatonic chime notes (C4, E4, G4, A4, C5, D5, E5, G5)
  const notes = [261.63, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99];
  const tempo = 0.75; // note interval

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    // Background warm pad chord (C major 9)
    const pad1 = Math.sin(2 * Math.PI * 130.81 * t) * 0.08;
    const pad2 = Math.sin(2 * Math.PI * 196.0 * t) * 0.06;
    const pad3 = Math.sin(2 * Math.PI * 246.94 * t) * 0.05;
    const pad4 = Math.sin(2 * Math.PI * 293.66 * t) * 0.04;
    const pad = pad1 + pad2 + pad3 + pad4;

    // Chime melody triggered periodically
    let melody = 0;
    for (let n = 0; n < 16; n++) {
      const noteTime = n * tempo;
      if (t >= noteTime && t < noteTime + 2.5) {
        const dt = t - noteTime;
        const noteFreq = notes[n % notes.length];
        const envelope = Math.exp(-dt * 2.2); // smooth decaying chime
        const chime = (Math.sin(2 * Math.PI * noteFreq * dt) + 0.3 * Math.sin(2 * Math.PI * noteFreq * 2 * dt)) * envelope * 0.15;
        melody += chime;
      }
    }

    // Gentle fade in / fade out at edges for seamless looping
    let fade = 1.0;
    if (t < 0.8) fade = t / 0.8;
    if (t > duration - 0.8) fade = (duration - t) / 0.8;

    const sample = Math.max(-1, Math.min(1, (pad + melody) * fade * 0.7));
    const intSample = Math.floor(sample * 32767);

    // Stereo L and R
    view.setInt16(offset, intSample, true);
    view.setInt16(offset + 2, intSample, true);
    offset += 4;
  }

  // Convert buffer to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 8192) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, Math.min(i + 8192, len))));
  }
  const base64 = 'data:audio/wav;base64,' + window.btoa(binary);

  return {
    base64,
    duration,
    mimeType: 'audio/wav'
  };
}
