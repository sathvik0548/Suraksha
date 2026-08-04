import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="h-9 bg-black border-t border-white/10 px-4 lg:px-6 flex items-center justify-between text-[9px] font-mono text-slate-400 shrink-0 uppercase tracking-widest z-40 select-none">
      <div className="flex items-center gap-4 lg:gap-6">
        <span className="text-blue-400 font-bold">SURAKSHA_V8.4.1</span>
        <span className="text-emerald-400 hidden sm:inline flex items-center gap-1 font-bold">
          <i className="fa-solid fa-lock text-[8px]"></i> ENCRYPTION ACTIVE
        </span>
        <span className="hidden md:inline text-slate-400">DATA_LAYER: SECURE_HYBRID_CLOUD</span>
      </div>

      <div className="flex items-center gap-4 lg:gap-6">
        <span className="hidden sm:inline text-slate-300 font-bold">LAT: 13.6288 N</span>
        <span className="hidden sm:inline text-slate-300 font-bold">LON: 78.4746 E (MADANAPALLE, AP)</span>
        <span className="text-slate-200 font-bold bg-white/10 px-2 py-0.5 rounded">OPERATOR: COMMANDER.S</span>
      </div>
    </footer>
  );
};
