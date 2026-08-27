import React, { useState } from 'react';
import { Copy, Download, Trash2, Check, AlertTriangle } from 'lucide-react';

interface TranscriptOutputProps {
  transcript: string;
  onTranscriptChange: (newText: string) => void;
  onNewTranscription?: () => void;
  onClearTranscript: () => void;
  isTranscribing?: boolean;
}

export const TranscriptOutput: React.FC<TranscriptOutputProps> = ({
  transcript,
  onTranscriptChange,
  onClearTranscript,
  isTranscribing = false,
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Copy to clipboard
  const handleCopy = async () => {
    if (!transcript.trim()) return;
    try {
      await navigator.clipboard.writeText(transcript);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Download UTF-8 TXT with BOM
  const handleDownload = () => {
    if (!transcript.trim()) return;
    try {
      const blob = new Blob(['\uFEFF' + transcript], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'EKTBLY-transcript.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  // Clear confirmation
  const handleConfirmClear = () => {
    onClearTranscript();
    setShowClearConfirm(false);
  };

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const charCount = transcript.length;

  return (
    <div id="transcript-result-section" className="bg-white rounded-2xl shadow-xs border border-[#CFE8F7] flex flex-col h-full overflow-hidden">
      {/* Top Header */}
      <div className="px-5 sm:px-6 py-4 border-b border-[#CFE8F7] flex flex-wrap justify-between items-center gap-3 bg-[#F8FCFF]">
        <div className="flex items-center gap-2">
          <h2 id="transcript-section-title" className="text-base sm:text-lg font-bold text-[#17324D]">
            النص المكتوب
          </h2>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2">
          <button
            id="copy-transcript-btn"
            onClick={handleCopy}
            disabled={!transcript.trim()}
            className="text-xs bg-white border border-[#CFE8F7] px-3 py-1.5 rounded-lg text-[#4EA8DE] hover:bg-[#EAF6FF] font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 cursor-pointer shadow-2xs"
            aria-label="نسخ النص"
          >
            {copySuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#2E8B68]" />
                <span className="text-[#2E8B68]">تم النسخ!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ النص</span>
              </>
            )}
          </button>

          <button
            id="download-transcript-btn"
            onClick={handleDownload}
            disabled={!transcript.trim()}
            className="text-xs bg-white border border-[#CFE8F7] px-3 py-1.5 rounded-lg text-[#4EA8DE] hover:bg-[#EAF6FF] font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 cursor-pointer shadow-2xs"
            aria-label="تحميل ملف TXT"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#2E8B68]" />
                <span className="text-[#2E8B68]">تم التحميل!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>تحميل TXT</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Alert for Clearing */}
      {showClearConfirm && (
        <div className="p-3 mx-4 mt-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>هل أنت متأكد من رغبتك في مسح النص المكتوب؟</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleConfirmClear}
              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold cursor-pointer"
            >
              مسح
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-2.5 py-1 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 rounded text-xs font-semibold cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Main Textarea Area */}
      <div className="flex-1 p-4 sm:p-6 relative bg-white min-h-[300px] flex flex-col">
        <textarea
          id="transcript-textarea"
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          placeholder="سيظهر النص المحول هنا فور الانتهاء من المعالجة... يمكنك تحرير النص وتعديله بحرية."
          dir="rtl"
          className="w-full flex-1 min-h-[260px] resize-none border-none focus:ring-0 focus:outline-none text-[#17324D] leading-relaxed text-base sm:text-lg placeholder-[#94A3B8]"
        />

        {/* Clear Button at bottom corner */}
        {transcript.trim() && (
          <div className="flex justify-end pt-2">
            <button
              id="clear-transcript-btn"
              onClick={() => setShowClearConfirm(true)}
              title="مسح النص"
              className="p-2 rounded-lg bg-[#F8FCFF] text-[#64748B] hover:text-[#DC5A5A] hover:bg-red-50 border border-[#CFE8F7] transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="px-5 sm:px-6 py-3 bg-[#F8FCFF] border-t border-[#CFE8F7] flex justify-between items-center text-xs text-[#64748B]">
        <span>
          عدد الكلمات: {wordCount} {charCount > 0 ? `• الحروف: ${charCount}` : ''}
        </span>
        <span>
          {isTranscribing
            ? 'جاري التحويل...'
            : transcript.trim()
            ? 'الحالة: تم التحويل بنجاح'
            : 'الحالة: في انتظار الصوت'}
        </span>
      </div>
    </div>
  );
};
