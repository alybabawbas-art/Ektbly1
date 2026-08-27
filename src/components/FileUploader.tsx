import React, { useState, useRef } from 'react';
import { UploadCloud, FileAudio, Trash2, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { AudioItem } from '../types';

interface FileUploaderProps {
  onFileReady: (audio: AudioItem) => void;
  onTranscribe: () => void;
  onClearAudio: () => void;
  currentAudio: AudioItem | null;
  isTranscribing: boolean;
}

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.flac', '.aac'];
const ACCEPTED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/opus',
  'audio/webm',
  'audio/flac',
  'audio/x-flac',
];

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileReady,
  onTranscribe,
  onClearAudio,
  currentAudio,
  isTranscribing,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Validate and process file
  const processFile = (file: File) => {
    setErrorMessage(null);

    // Validate size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(
        `حجم الملف الصوتي كبير جداً (${(file.size / (1024 * 1024)).toFixed(1)} ميجابايت). الحد الأقصى المسموح به هو ${MAX_FILE_SIZE_MB} ميجابايت لضمان سرعة ودقة التحويل.`
      );
      return;
    }

    if (file.size === 0) {
      setErrorMessage('الملف الصوتي المحدد فارغ. يرجى اختيار ملف صوتي صالح.');
      return;
    }

    // Validate type by MIME or extension
    const extension = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    const isMimeSupported = ACCEPTED_MIME_TYPES.includes(file.type);
    const isExtensionSupported = ACCEPTED_EXTENSIONS.includes(extension);

    if (!isMimeSupported && !isExtensionSupported) {
      setErrorMessage(
        'صيغة الملف غير مدعومة. الصيغ المدعومة هي: MP3, WAV, M4A, OGG, WebM, AAC, FLAC.'
      );
      return;
    }

    const audioUrl = URL.createObjectURL(file);

    onFileReady({
      blob: file,
      url: audioUrl,
      name: file.name,
      size: file.size,
      type: file.type || `audio/${extension.replace('.', '')}`,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemoveFile = () => {
    onClearAudio();
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} ك.ب`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} م.ب`;
  };

  return (
    <div id="file-uploader-panel" className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        id="audio-file-input"
        accept={ACCEPTED_EXTENSIONS.join(',') + ',audio/*'}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Error message */}
      {errorMessage && (
        <div
          id="file-upload-error"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3 text-right"
        >
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold mb-0.5">تنبيه في الملف الصوتي</p>
            <p className="text-xs text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {!currentAudio ? (
        /* Drag and Drop Zone */
        <div
          id="drop-zone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-[#F8FCFF] ${
            isDragOver
              ? 'border-[#4EA8DE] bg-[#EAF6FF]'
              : 'border-[#CFE8F7] hover:bg-[#EAF6FF]/50 hover:border-[#4EA8DE]'
          }`}
        >
          <div className="w-16 h-16 rounded-full bg-[#EAF6FF] border border-[#CFE8F7] flex items-center justify-center text-[#4EA8DE] mb-3 shadow-2xs">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-base font-bold text-[#17324D] mb-1">
            اسحب وأفلت الملف الصوتي هنا
          </h3>
          <p className="text-xs text-[#64748B] mb-3">
            أو اضغط لتصفح الملفات من جهازك
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-[#CFE8F7] text-[11px] text-[#64748B] font-medium">
            <span>MP3, WAV, M4A, OGG, WebM, AAC</span>
            <span>•</span>
            <span>الحد الأقصى {MAX_FILE_SIZE_MB} م.ب</span>
          </div>
        </div>
      ) : (
        /* Selected File Card & Preview */
        <div className="bg-[#F8FCFF] border-2 border-dashed border-[#CFE8F7] rounded-xl p-4 sm:p-5 flex flex-col items-center space-y-4">
          <div className="w-full bg-white rounded-xl p-3.5 border border-[#CFE8F7] flex items-center gap-3 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-[#4EA8DE]/10 text-[#4EA8DE] flex items-center justify-center shrink-0">
              <FileAudio className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0 text-right">
              <p className="text-sm font-bold text-[#17324D] truncate" title={currentAudio.name}>
                {currentAudio.name}
              </p>
              <p className="text-xs text-[#64748B] mt-0.5">
                الحجم: {formatFileSize(currentAudio.size)}
              </p>
            </div>
          </div>

          {/* Native Audio Preview */}
          <div className="w-full bg-white p-2.5 rounded-xl border border-[#CFE8F7] shadow-2xs">
            <audio
              id="uploaded-audio-preview"
              src={currentAudio.url}
              controls
              className="w-full h-9 outline-none"
              preload="metadata"
            />
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-2.5 pt-1">
            <button
              id="transcribe-file-btn"
              onClick={onTranscribe}
              disabled={isTranscribing}
              className="w-full bg-[#4EA8DE] hover:bg-[#3498C9] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-white font-bold py-3 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              <span>{isTranscribing ? 'جاري التحويل...' : 'تحويل إلى نص'}</span>
            </button>

            <div className="flex gap-2 w-full">
              <button
                id="replace-file-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isTranscribing}
                className="flex-1 border border-[#CFE8F7] text-[#64748B] hover:text-[#17324D] hover:bg-gray-50 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#4EA8DE]" />
                <span>استبدال الملف</span>
              </button>

              <button
                id="remove-file-btn"
                onClick={handleRemoveFile}
                disabled={isTranscribing}
                className="flex-1 border border-[#CFE8F7] text-[#DC5A5A] hover:bg-red-50 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#DC5A5A]" />
                <span>حذف</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
