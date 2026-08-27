import React from 'react';
import { Loader2, AlertCircle, RotateCcw } from 'lucide-react';

interface StatusAndErrorProps {
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
}

export const StatusAndError: React.FC<StatusAndErrorProps> = ({
  isLoading,
  error,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <div
        id="transcription-loading-state"
        className="my-6 p-6 rounded-2xl bg-white border border-[#CFE8F7] flex flex-col items-center justify-center text-center space-y-3 shadow-xs"
      >
        <div className="relative">
          <Loader2 className="w-10 h-10 text-[#4EA8DE] animate-spin" />
        </div>
        <p className="text-base font-bold text-[#17324D]">
          جاري تحويل الصوت إلى نص...
        </p>
        <p className="text-xs text-[#64748B] max-w-sm">
          نقوم الآن بالاستماع إلى الملف الصوتي وتفريغ الكلمات العربية بدقة. يُرجى الانتظار لحظات.
        </p>
        {/* Indeterminate progress bar */}
        <div className="w-48 h-1.5 bg-[#EAF6FF] rounded-full overflow-hidden mt-2">
          <div className="h-full bg-[#4EA8DE] rounded-full animate-pulse w-2/3 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        id="transcription-error-state"
        className="my-6 p-5 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-right shadow-xs"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-red-900">تعذر استكمال التحويل</p>
            <p className="text-xs text-red-700 leading-relaxed mt-0.5">{error}</p>
          </div>
        </div>

        {onRetry && (
          <button
            id="retry-transcription-btn"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shrink-0 shadow-2xs transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        )}
      </div>
    );
  }

  return null;
};
