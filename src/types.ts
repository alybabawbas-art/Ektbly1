export type AppView = 'landing' | 'transcribe';

export type InputMode = 'record' | 'upload';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export interface AudioItem {
  blob: Blob;
  url: string;
  name: string;
  size: number;
  type: string;
  duration?: number;
}

export type TranscriptionStatus = 'idle' | 'loading' | 'success' | 'error';
