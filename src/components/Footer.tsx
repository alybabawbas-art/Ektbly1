import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer id="ektbly-footer" className="h-14 bg-white border-t border-[#CFE8F7] flex items-center justify-center flex-col shrink-0 px-4 text-center mt-auto">
      <p className="text-xs font-bold text-[#17324D]">
        EKTBLY — تحويل الصوت العربي إلى نص
      </p>
      <p className="text-[11px] text-[#64748B]">
        مشروع مقدم من طلاب برنامج سفراء الذكاء الاصطناعي
      </p>
    </footer>
  );
};
