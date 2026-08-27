import React, { useState } from 'react';
import ektblyLogoImg from '../../assets/ektbly-background.jpg';

interface EktblyLogoProps {
  variant?: 'header' | 'prominent';
  className?: string;
}

export const EktblyLogo: React.FC<EktblyLogoProps> = ({
  variant = 'header',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);
  const altText = 'شعار أكتبلى EKTBLY الرسمي';

  return (
    <div id="ektbly-header-logo-container" className={`flex items-center gap-3 ${className}`}>
      <div className="relative overflow-hidden rounded-xl bg-white border border-[#CFE8F7] shadow-xs w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center p-0.5 shrink-0">
        {!imageError ? (
          <img
            id="ektbly-header-logo-img"
            src={ektblyLogoImg}
            alt={altText}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-left rounded-lg"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#EAF6FF] text-[#4EA8DE] font-bold text-xs">
            <span className="font-extrabold text-[#17324D] text-sm">أ</span>
          </div>
        )}
      </div>
    </div>
  );
};
