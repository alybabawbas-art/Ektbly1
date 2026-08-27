import React from 'react';
import { Home } from 'lucide-react';
import { EktblyLogo } from './EktblyLogo';

interface AppHeaderProps {
  onGoHome: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onGoHome }) => {
  return (
    <header id="ektbly-app-header" className="h-20 bg-white border-b border-[#CFE8F7] flex items-center justify-between px-4 sm:px-8 md:px-10 shadow-xs sticky top-0 z-30 shrink-0">
      {/* Logo and App Title */}
      <div className="flex items-center gap-3 sm:gap-4">
        <EktblyLogo variant="header" />
        <div className="hidden sm:flex flex-col text-right">
          <span className="text-xl sm:text-2xl font-black text-[#17324D] tracking-tighter leading-none">EKTBLY</span>
          <span className="text-xs text-[#64748B] mt-1">حوّل صوتك العربي إلى نص مكتوب</span>
        </div>
      </div>

      {/* Home Navigation Button */}
      <div className="flex items-center gap-3">
        <button
          id="back-to-landing-btn"
          onClick={onGoHome}
          className="text-[#4EA8DE] hover:text-[#3498C9] hover:bg-[#EAF6FF] font-medium border border-[#4EA8DE] px-3.5 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
          aria-label="العودة إلى الصفحة الرئيسية"
        >
          <Home className="w-4 h-4" />
          <span>الصفحة الرئيسية</span>
        </button>
      </div>
    </header>
  );
};
