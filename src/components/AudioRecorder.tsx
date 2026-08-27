import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Pause, Play, Trash2, RotateCcw, Sparkles, AlertCircle } from 'lucide-react';
import { AudioItem, RecordingState } from '../types';

interface AudioRecorderProps {
  onAudioReady: (audio: AudioItem) => void;
  onTranscribe: () => void;
  onClearAudio: () => void;
  currentAudio: AudioItem | null;
  isTranscribing: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onAudioReady,
  onTranscribe,
  onClearAudio,
  currentAudio,
  isTranscribing,
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Stop all active microphone tracks cleanly
  const stopMicrophoneTracks = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      audioStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setVolumeLevel(0);
  }, []);

  // Stop timer cleanly
  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Clean up on unmount or tab switch
  useEffect(() => {
    return () => {
      stopTimer();
      stopMicrophoneTracks();
    };
  }, [stopMicrophoneTracks]);

  // Audio level visualizer loop
  const startVolumeAnalyser = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        setVolumeLevel(Math.min(100, Math.round((average / 128) * 100)));

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn('Audio visualizer could not be initialized:', e);
    }
  };

  // Start recording
  const startRecording = async () => {
    setMicPermissionError(null);
    audioChunksRef.current = [];
    setRecordingTime(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('NOT_SUPPORTED');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioStreamRef.current = stream;
      startVolumeAnalyser(stream);

      // Determine best supported mimeType
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        const now = new Date();
        const timeStr = `${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
        const fileName = `EKTBLY-recording-${timeStr}.${mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('wav') ? 'wav' : 'webm'}`;

        onAudioReady({
          blob: audioBlob,
          url: audioUrl,
          name: fileName,
          size: audioBlob.size,
          type: mimeType,
          duration: recordingTime,
        });

        stopMicrophoneTracks();
      };

      mediaRecorder.start(250); // Collect data every 250ms
      setRecordingState('recording');

      // Start recording timer
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      stopMicrophoneTracks();
      console.error('Microphone error:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicPermissionError(
          'تم رفض إذن الوصول إلى الميكروفون. يرجى الضغط على أيقونة القفل أو الكاميرا/الميكروفون في شريط عنوان المتصفح والسماح للتطبيق باستخدام الميكروفون ثم إعادة المحاولة.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setMicPermissionError('لم يتم العثور على ميكروفون متصل بجهازك. يرجى توصيل ميكروفون والمحاولة مرة أخرى.');
      } else {
        setMicPermissionError('تعذر بدء التسجيل الصوتي. يرجى التأكد من صلاحيات الميكروفون في متصفحك.');
      }
      setRecordingState('idle');
    }
  };

  // Pause recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      stopTimer();
    }
  };

  // Resume recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
  };

  // Stop recording
  const stopRecording = () => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setRecordingState('stopped');
    }
  };

  // Re-record
  const handleReRecord = () => {
    onClearAudio();
    setRecordingState('idle');
    setRecordingTime(0);
    startRecording();
  };

  // Delete recording
  const handleDeleteRecording = () => {
    stopTimer();
    stopMicrophoneTracks();
    onClearAudio();
    setRecordingState('idle');
    setRecordingTime(0);
  };

  // Format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div id="audio-recorder-panel" className="space-y-6">
      {/* Microphone Permission Error Notice */}
      {micPermissionError && (
        <div
          id="mic-permission-error-box"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3 text-right"
        >
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold mb-1">تعذر الوصول إلى الميكروفون</p>
            <p className="text-xs leading-relaxed text-red-700">{micPermissionError}</p>
          </div>
        </div>
      )}

      {/* Recording Visual Stage */}
      <div className="bg-[#F8FCFF] border-2 border-dashed border-[#CFE8F7] rounded-xl p-5 sm:p-6 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[210px]">
        {recordingState === 'idle' && !currentAudio && (
          <div className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-[#EAF6FF] border border-[#CFE8F7] flex items-center justify-center text-[#4EA8DE] shadow-2xs">
              <Mic className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#17324D]">تسجيل صوتي مباشر</h3>
              <p className="text-xs text-[#64748B] mt-1">
                اضغط على زر بدء التسجيل وتحدث بوضوح باللغة العربية
              </p>
              <p className="text-xs text-[#4EA8DE] font-medium mt-1">
                يرجى استخدام ميكروفون حساس بخاصية الغاء الضوضاء
              </p>
            </div>
          </div>
        )}

        {(recordingState === 'recording' || recordingState === 'paused') && (
          <div className="flex flex-col items-center space-y-3 w-full">
            {/* Circular pulsing red recording status */}
            <div className="w-16 h-16 rounded-full bg-[#EAF6FF] flex items-center justify-center mb-1">
              <div
                className={`w-5 h-5 rounded-full ${
                  recordingState === 'recording' ? 'bg-[#DC5A5A] animate-pulse' : 'bg-amber-400'
                }`}
              />
            </div>

            {/* Timer */}
            <div className="text-3xl sm:text-4xl font-mono font-bold text-[#17324D] tracking-wider">
              {formatTime(recordingTime)}
            </div>

            {/* Status text */}
            <span className="text-xs text-[#64748B]">
              {recordingState === 'recording' ? 'جاري التسجيل...' : 'التسجيل متوقف مؤقتاً'}
            </span>

            {/* Waveform / Visualizer bars */}
            <div className="flex items-center justify-center gap-1 h-8 w-full max-w-xs px-4">
              {Array.from({ length: 14 }).map((_, idx) => {
                const heightPercent =
                  recordingState === 'recording'
                    ? Math.max(15, Math.min(100, (volumeLevel * (0.5 + Math.sin(idx * 0.8 + volumeLevel) * 0.5))))
                    : 15;
                return (
                  <div
                    key={idx}
                    className="w-1 bg-[#4EA8DE] rounded-full transition-all duration-75"
                    style={{ height: `${heightPercent}%` }}
                  />
                );
              })}
            </div>

            {/* In-recording round controls */}
            <div className="flex items-center gap-3 pt-2">
              {recordingState === 'recording' ? (
                <button
                  id="pause-recording-btn"
                  onClick={pauseRecording}
                  title="إيقاف مؤقت"
                  className="w-10 h-10 rounded-full bg-[#EAF6FF] hover:bg-[#CFE8F7] text-[#17324D] flex items-center justify-center transition-colors cursor-pointer border border-[#CFE8F7]"
                >
                  <Pause className="w-4 h-4 text-[#17324D]" />
                </button>
              ) : (
                <button
                  id="resume-recording-btn"
                  onClick={resumeRecording}
                  title="استكمال التسجيل"
                  className="w-10 h-10 rounded-full bg-[#4EA8DE] hover:bg-[#3498C9] text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                </button>
              )}

              <button
                id="stop-recording-btn"
                onClick={stopRecording}
                title="إيقاف التسجيل"
                className="w-12 h-12 rounded-full bg-[#DC5A5A] hover:bg-red-600 active:scale-95 text-white flex items-center justify-center shadow-md transition-all cursor-pointer"
              >
                <Square className="w-5 h-5 fill-white" />
              </button>
            </div>
          </div>
        )}

        {/* Audio Preview after recording */}
        {currentAudio && recordingState !== 'recording' && recordingState !== 'paused' && (
          <div className="w-full flex flex-col items-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#2E8B68]/10 text-[#2E8B68] flex items-center justify-center">
              <Mic className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-[#17324D]">تم تسجيل الصوت بنجاح</p>
              <p className="text-xs text-[#64748B] mt-0.5">
                المدة: {formatTime(recordingTime || currentAudio.duration || 0)} • الحجم: {(currentAudio.size / 1024).toFixed(1)} ك.ب
              </p>
            </div>

            {/* Native audio player preview */}
            <div className="w-full bg-white p-2.5 rounded-xl border border-[#CFE8F7] shadow-2xs">
              <audio
                id="recorded-audio-preview"
                src={currentAudio.url}
                controls
                className="w-full h-9 outline-none"
                preload="metadata"
              />
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="w-full">
        {recordingState === 'idle' && !currentAudio && (
          <button
            id="start-recording-btn"
            onClick={startRecording}
            className="w-full bg-[#4EA8DE] hover:bg-[#3498C9] active:scale-[0.98] text-white font-bold py-3 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Mic className="w-5 h-5" />
            <span>بدء التسجيل</span>
          </button>
        )}

        {currentAudio && recordingState !== 'recording' && recordingState !== 'paused' && (
          <div className="flex flex-col gap-2.5 w-full">
            <button
              id="transcribe-recorded-btn"
              onClick={onTranscribe}
              disabled={isTranscribing}
              className="w-full bg-[#4EA8DE] hover:bg-[#3498C9] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-white font-bold py-3 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              <span>{isTranscribing ? 'جاري التحويل...' : 'تحويل إلى نص'}</span>
            </button>

            <div className="flex gap-2 w-full">
              <button
                id="re-record-btn"
                onClick={handleReRecord}
                disabled={isTranscribing}
                className="flex-1 border border-[#CFE8F7] text-[#64748B] hover:text-[#17324D] hover:bg-gray-50 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#4EA8DE]" />
                <span>إعادة التسجيل</span>
              </button>

              <button
                id="delete-recording-btn"
                onClick={handleDeleteRecording}
                disabled={isTranscribing}
                className="flex-1 border border-[#CFE8F7] text-[#DC5A5A] hover:bg-red-50 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#DC5A5A]" />
                <span>حذف</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
