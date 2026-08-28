import React, { useState } from 'react';
import ektblyBackground from '../assets/ektbly-background.jpg';
import { AppView, InputMode, AudioItem } from './types';
import { IntroLandingPage } from './components/IntroLandingPage';
import { AppHeader } from './components/AppHeader';
import { AudioRecorder } from './components/AudioRecorder';
import { FileUploader } from './components/FileUploader';
import { TranscriptOutput } from './components/TranscriptOutput';
import { StatusAndError } from './components/StatusAndError';
import { Footer } from './components/Footer';
import { Mic, Upload } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [inputMode, setInputMode] = useState<InputMode>('record');
  const [currentAudio, setCurrentAudio] = useState<AudioItem | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  // Reliable conversion of complete audio Blob into Base64
  const fileToBase64 = async (file: Blob): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    let binary = '';
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }

    return btoa(binary);
  };

  // Normalize audio MIME types
  const normalizeAudioMimeType = (type: string, fileName = ''): string => {
    const cleanType = (type || '').toLowerCase().split(';')[0].trim();
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (cleanType === 'audio/x-m4a' || cleanType === 'audio/m4a' || extension === 'm4a') {
      return 'audio/mp4';
    }

    if (cleanType === 'audio/mpeg' || cleanType === 'audio/mp3' || extension === 'mp3') {
      return 'audio/mpeg';
    }

    if (cleanType === 'audio/wav' || cleanType === 'audio/x-wav' || extension === 'wav') {
      return 'audio/wav';
    }

    if (cleanType === 'audio/ogg' || cleanType === 'audio/opus' || extension === 'ogg' || extension === 'opus') {
      return 'audio/ogg';
    }

    if (cleanType === 'audio/webm' || extension === 'webm') {
      return 'audio/webm';
    }

    return cleanType || 'audio/webm';
  };

  // Perform transcription via backend
  const handleTranscribe = async () => {
    if (!currentAudio) return;

    setIsTranscribing(true);
    setTranscribeError(null);

    try {
      const base64Data = await fileToBase64(currentAudio.blob);
      const normalizedMimeType = normalizeAudioMimeType(currentAudio.type, currentAudio.name);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioBase64: base64Data,
          mimeType: normalizedMimeType,
          fileName: currentAudio.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'تعذر إتمام عملية التفريغ الصوتي. يرجى المحاولة مرة أخرى.');
      }

      if (data.transcript) {
        setTranscript(data.transcript);
      } else {
        throw new Error('لم يُرجع نموذج التحويل نصًا. يرجى إعادة المحاولة.');
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      setTranscribeError(
        err.message || 'تعذر إرسال بيانات الصوت بصورة صحيحة. يرجى المحاولة مجدداً.'
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  // Handle new transcription reset
  const handleNewTranscription = () => {
    if (currentAudio?.url) {
      URL.revokeObjectURL(currentAudio.url);
    }
    setCurrentAudio(null);
    setTranscribeError(null);
  };

  // Clear current audio
  const handleClearAudio = () => {
    if (currentAudio?.url) {
      URL.revokeObjectURL(currentAudio.url);
    }
    setCurrentAudio(null);
    setTranscribeError(null);
  };

  // Clear transcript text
  const handleClearTranscript = () => {
    setTranscript('');
  };

  // Render Introductory Landing Page (Hero section with background)
  if (currentView === 'landing') {
    return <IntroLandingPage onStart={() => setCurrentView('transcribe')} backgroundImage={ektblyBackground} />;
  }

  // Render Main Transcription Page (Page 2)
  return (
    <div id="ektbly-app-container" className="min-h-screen flex flex-col justify-between bg-[#EAF6FF] text-[#17324D] font-sans" dir="rtl">
      <div className="flex-1 flex flex-col">
        {/* Navigation Header */}
        <AppHeader onGoHome={() => setCurrentView('landing')} />

        {/* Main Content Area */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Column: Input Controller (Col 5) */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              {/* Audio Controls Card */}
              <div id="main-transcription-card" className="bg-white p-6 rounded-2xl shadow-xs border border-[#CFE8F7] flex flex-col justify-between">
                <div>
                  {/* Mode Switch Underline Tabs */}
                  <div className="flex border-b border-[#CFE8F7] mb-6">
                    <button
                      id="tab-record-audio"
                      role="tab"
                      aria-selected={inputMode === 'record'}
                      onClick={() => {
                        if (inputMode !== 'record') {
                          setInputMode('record');
                          handleClearAudio();
                        }
                      }}
                      className={`pb-3 px-4 font-bold text-sm transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
                        inputMode === 'record'
                          ? 'border-[#4EA8DE] text-[#4EA8DE]'
                          : 'border-transparent text-[#64748B] hover:text-[#17324D]'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                      <span>تسجيل صوت</span>
                    </button>

                    <button
                      id="tab-upload-audio"
                      role="tab"
                      aria-selected={inputMode === 'upload'}
                      onClick={() => {
                        if (inputMode !== 'upload') {
                          setInputMode('upload');
                          handleClearAudio();
                        }
                      }}
                      className={`pb-3 px-4 font-bold text-sm transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
                        inputMode === 'upload'
                          ? 'border-[#4EA8DE] text-[#4EA8DE]'
                          : 'border-transparent text-[#64748B] hover:text-[#17324D]'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      <span>رفع ملف صوتي</span>
                    </button>
                  </div>

                  {/* Input Method Content */}
                  <div className="min-h-[240px]">
                    {inputMode === 'record' ? (
                      <AudioRecorder
                        onAudioReady={(audio) => {
                          setCurrentAudio(audio);
                          setTranscribeError(null);
                        }}
                        onTranscribe={handleTranscribe}
                        onClearAudio={handleClearAudio}
                        currentAudio={currentAudio}
                        isTranscribing={isTranscribing}
                      />
                    ) : (
                      <FileUploader
                        onFileReady={(audio) => {
                          setCurrentAudio(audio);
                          setTranscribeError(null);
                        }}
                        onTranscribe={handleTranscribe}
                        onClearAudio={handleClearAudio}
                        currentAudio={currentAudio}
                        isTranscribing={isTranscribing}
                      />
                    )}
                  </div>
                </div>

                {/* Status & Error Display */}
                <StatusAndError
                  isLoading={isTranscribing}
                  error={transcribeError}
                  onRetry={currentAudio ? handleTranscribe : undefined}
                />
              </div>

              {/* Student Project Badge Card */}
              <div className="bg-white p-4 rounded-xl border border-[#CFE8F7] text-center shadow-2xs">
                <p className="text-xs text-[#64748B] font-medium">مشروع مقدم من طلاب برنامج سفراء الذكاء الاصطناعي</p>
              </div>
            </div>

            {/* Right Column: Transcript Output Panel (Col 7) */}
            <div className="lg:col-span-7 flex flex-col">
              <TranscriptOutput
                transcript={transcript}
                onTranscriptChange={setTranscript}
                onNewTranscription={handleNewTranscription}
                onClearTranscript={handleClearTranscript}
                isTranscribing={isTranscribing}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
