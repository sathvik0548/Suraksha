import React, { useState, useEffect } from 'react';
import { ViewType } from '../../types';

interface Props {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  onQuickDispatch: () => void;
}

export const Navbar: React.FC<Props> = ({ currentView, onNavigate, onQuickDispatch }) => {
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
      const timeStr = now.toISOString().split('T')[1].slice(0, 8);
      setUtcTime(`${dateStr} | ${timeStr} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-white/10 bg-black/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 z-50 shrink-0 select-none">
      {/* Left: Brand & Telemetry Status */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center border border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.6)] group-hover:scale-105 transition-transform">
            <i className="fa-solid fa-shield-halved text-white text-lg"></i>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider text-white leading-none">
              SURAKSHA <span className="text-blue-400 font-mono text-xs font-bold px-1.5 py-0.5 bg-blue-950 border border-blue-500/40 rounded ml-1">AI</span>
            </h1>
            <span className="text-[9px] uppercase tracking-widest text-slate-400 font-mono block mt-1">
              Smart City Command Center
            </span>
          </div>
        </button>

        <div className="h-6 w-px bg-white/15 hidden md:block mx-1"></div>

        <div className="hidden md:flex gap-4 text-[10px] uppercase tracking-widest text-slate-400 font-mono">
          <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            <span className="text-emerald-400 font-bold">SYSTEM ONLINE</span>
          </div>
          <div className="flex items-center gap-2 bg-blue-950/40 border border-blue-500/30 px-2.5 py-1 rounded">
            <i className="fa-solid fa-tower-cell text-blue-400 text-xs"></i>
            <span className="text-blue-300 font-bold">12 CCTV STREAMS</span>
          </div>
        </div>
      </div>

      {/* Middle: Fast Navigation Tabs */}
      <nav className="hidden xl:flex items-center gap-1.5 bg-white/5 p-1.5 rounded-lg border border-white/10 text-[11px] uppercase tracking-wider font-semibold">
        <button
          onClick={() => onNavigate('command_center')}
          className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-2 ${
            currentView === 'command_center'
              ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] font-bold'
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
        >
          <i className="fa-solid fa-gauge-high text-xs"></i> Command Center
        </button>

        <button
          onClick={() => onNavigate('live_cameras')}
          className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-2 ${
            currentView === 'live_cameras'
              ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] font-bold'
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
        >
          <i className="fa-solid fa-video text-xs"></i> Live 6-CCTV Grid
        </button>

        <button
          onClick={() => onNavigate('investigation')}
          className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-2 ${
            currentView === 'investigation'
              ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] font-bold'
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
        >
          <i className="fa-solid fa-fingerprint text-xs"></i> Forensics
        </button>

        <button
          onClick={() => onNavigate('analytics')}
          className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-2 ${
            currentView === 'analytics'
              ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] font-bold'
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
        >
          <i className="fa-solid fa-chart-pie text-xs"></i> Analytics
        </button>

        <button
          onClick={() => onNavigate('fleet_units')}
          className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-2 ${
            currentView === 'fleet_units'
              ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] font-bold'
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
        >
          <i className="fa-solid fa-truck-medical text-xs"></i> Patrol Fleet
        </button>
      </nav>

      {/* Right: Clock & Dispatch CTA */}
      <div className="flex items-center gap-3 lg:gap-5">
        {/* UTC Clock */}
        <div className="text-right hidden sm:block">
          <div className="text-[9px] text-slate-400 font-mono uppercase tracking-widest flex items-center gap-1 justify-end">
            <i className="fa-solid fa-clock text-[9px] text-blue-400"></i> Global Telemetry
          </div>
          <div className="text-xs lg:text-sm font-mono font-bold text-white tracking-wide">{utcTime || '2026-08-03 | 11:25:04 UTC'}</div>
        </div>

        {/* Quick Dispatch Emergency Button */}
        <button
          onClick={onQuickDispatch}
          className="px-3.5 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-[11px] font-mono font-bold uppercase tracking-wider rounded-lg flex items-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all active:scale-95 border border-red-500/50"
        >
          <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
          <i className="fa-solid fa-bullhorn text-xs"></i>
          <span>Quick Dispatch</span>
        </button>

        {/* Operator Profile Badge */}
        <div className="flex items-center gap-2 border-l border-white/10 pl-3">
          <div className="w-9 h-9 rounded-lg border border-blue-500/50 bg-slate-900 flex items-center justify-center text-xs font-mono font-bold text-blue-400 shadow-inner">
            <i className="fa-solid fa-user-shield text-xs"></i>
          </div>
        </div>
      </div>
    </header>
  );
};
