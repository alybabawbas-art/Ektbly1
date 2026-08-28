import React, { useState } from 'react';
import ektblyBackgroundV2 from '../assets/ektbly-background-v2.jpg';
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

  // Safe server response parsing
  const parseServerResponse = async (response: Response) => {
    const rawBody = await response.text();

    if (!rawBody.trim()) {
      const error = new Error(
        response.ok
          ? 'EMPTY_SERVER_RESPONSE'
          : `EMPTY_ERROR_RESPONSE_${response.status}`
      );
      (error as any).status = response.status;
      throw error;
    }

    let data;
    try {
      data = JSON.parse(rawBody);
    } catch {
      const error = new Error(`INVALID_SERVER_RESPONSE_${response.status}`);
      (error as any).status = response.status;
      throw error;
    }

    if (!response.ok) {
      const error = new Error(data?.error || 'TRANSCRIPTION_FAILED');
      (error as any).status = response.status;
      throw error;
    }

    return data;
  };

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Automatic retry for temporary failures
  const transcribeWithRetry = async (
    request: () => Promise<Response>,
    maxAttempts = 3
  ) => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await request();

        if (
          [408, 429, 500, 502, 503, 504].includes(response.status) &&
          attempt < maxAttempts
        ) {
          await wait(1000 * Math.pow(2, attempt - 1));
          continue;
        }

        return await parseServerResponse(response);
      } catch (error: any) {
        lastError = error;

        // If the error was a transient status code, retry
        const status = error?.status;
        if (
          attempt < maxAttempts &&
          (!status || [408, 429, 500, 502, 503, 504].includes(status))
        ) {
          await wait(1000 * Math.pow(2, attempt - 1));
          continue;
        }

        if (attempt >= maxAttempts) {
          break;
        }
      }
    }

    throw lastError;
  };

  // Convert technical/server errors to clear user-facing messages
  const getUserFriendlyErrorMessage = (error: any): string => {
    const status = error?.status;
    const msg = error?.message || '';

    if (status === 429) {
      return 'تم الوصول إلى الحد المؤقت لاستخدام الخدمة. انتظر قليلًا ثم أعد المحاولة.';
    }

    if (status === 413) {
      return 'حجم الملف الصوتي أكبر من الحد المسموح.';
    }

    if (status === 408 || status === 504 || msg.includes('TIMEOUT') || msg.includes('Timeout')) {
      return 'استغرق التحويل وقتًا أطول من المتوقع. يرجى إعادة المحاولة.';
    }

    if (
      msg.includes('EMPTY_SERVER_RESPONSE') ||
      msg.includes('EMPTY_ERROR_RESPONSE') ||
      msg.includes('INVALID_SERVER_RESPONSE')
    ) {
      return 'لم يصل رد مكتمل من الخادم. يرجى إعادة المحاولة.';
    }

    // Check if the error is already a friendly Arabic string returned from server
    if (/[\u0600-\u06FF]/.test(msg)) {
      return msg;
    }

    return 'حدث خطأ مؤقت أثناء التحويل. يرجى إعادة المحاولة.';
  };

  // Perform transcription via backend
  const handleTranscribe = async () => {
    if (!currentAudio) return;

    setIsTranscribing(true);
    setTranscribeError(null);

    try {
      const base64Data = await fileToBase64(currentAudio.blob);
      const normalizedMimeType = normalizeAudioMimeType(currentAudio.type, currentAudio.name);

      const data = await transcribeWithRetry(
        () =>
          fetch('/api/transcribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              audioBase64: base64Data,
              mimeType: normalizedMimeType,
              fileName: currentAudio.name,
            }),
          }),
        3
      );

      if (data?.transcript) {
        setTranscript(data.transcript);
      } else {
        throw new Error('لم يصل رد مكتمل من الخادم. يرجى إعادة المحاولة.');
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      setTranscribeError(getUserFriendlyErrorMessage(err));
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
    return <IntroLandingPage onStart={() => setCurrentView('transcribe')} backgroundImage={ektblyBackgroundV2} />;
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
