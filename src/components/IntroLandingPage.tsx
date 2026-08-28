import React from 'react';
import { ArrowLeft } from 'lucide-react';
import defaultEktblyBackgroundV2 from '../assets/ektbly-background-v2.jpg';

interface IntroLandingPageProps {
  onStart: () => void;
  backgroundImage?: string;
}

export const IntroLandingPage: React.FC<IntroLandingPageProps> = ({ 
  onStart, 
  backgroundImage = defaultEktblyBackgroundV2 
}) => {
  return (
    <div id="ektbly-intro-page" className="w-full min-h-screen bg-white text-[#17324D] font-sans" dir="rtl">
      {/* 
        HERO SECTION:
        - Uses imported ektblyBackgroundV2 image
        - Fills the full browser width and 100vh height
        - Background covers smoothly without stretching
        - Embedded EKTBLY logo and text on the image remain visible
      */}
      <section
        id="ektbly-hero-section"
        className="landing-hero relative flex flex-col justify-end items-center transition-all overflow-hidden"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          width: '100%',
          minHeight: '100vh',
        }}
      >
        {/* 
          Subtle bottom gradient overlay to keep text & buttons easily readable
          without covering the visual elements above
        */}
        <div className="w-full bg-gradient-to-t from-white/95 via-white/80 to-transparent pt-24 pb-12 px-4 sm:px-6 flex flex-col items-center justify-center">
          <div className="max-w-md w-full mx-auto flex flex-col items-center text-center space-y-4">
            {/* Arabic Project Statement */}
            <div
              id="hero-project-statement"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-xs border border-[#CFE8F7] text-[#17324D] text-xs sm:text-sm font-semibold shadow-xs"
            >
              <span className="w-2 h-2 rounded-full bg-[#4EA8DE] animate-pulse shrink-0"></span>
              <span>مشروع مقدم من طلاب برنامج سفراء الذكاء الاصطناعي</span>
            </div>

            {/* Primary Action Button */}
            <button
              id="start-transcription-btn"
              onClick={onStart}
              className="w-full sm:w-auto min-w-[220px] py-4 px-8 rounded-xl bg-[#4EA8DE] hover:bg-[#3498C9] active:scale-[0.98] text-white font-bold text-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer group"
              aria-label="ابدأ التحويل"
            >
              <span>ابدأ التحويل</span>
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
