import React from 'react';
import { ViewType } from '../../types';

interface Props {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  activeCriticalAlertsCount?: number;
}

export const Sidebar: React.FC<Props> = ({ currentView, onNavigate, activeCriticalAlertsCount = 3 }) => {
  const navItems: Array<{ id: ViewType; label: string; icon: string; badge?: number }> = [
    { id: 'command_center', label: 'Command Center', icon: 'fa-gauge-high' },
    { id: 'live_cameras', label: 'Live CCTV Catalog', icon: 'fa-video' },
    { id: 'investigation', label: 'Incident Investigation', icon: 'fa-fingerprint', badge: activeCriticalAlertsCount },
    { id: 'analytics', label: 'Threat Analytics', icon: 'fa-chart-area' },
    { id: 'fleet_units', label: 'Patrol & Unit Dispatch', icon: 'fa-truck-medical' },
    { id: 'landing', label: 'Public Portal / Landing', icon: 'fa-house-laptop' },
  ];

  return (
    <aside className="w-16 lg:w-64 border-r border-white/10 bg-black/40 backdrop-blur-md flex flex-col shrink-0 select-none z-30 transition-all duration-300">
      {/* Top Sidebar Title */}
      <div className="p-3 lg:p-4 border-b border-white/5 bg-white/5 hidden lg:block">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-blue-400 font-mono flex items-center gap-1.5">
            <i className="fa-solid fa-bars-staggered text-blue-400 text-[10px]"></i> SURAKSHA NAV
          </h2>
          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">V1.0</span>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 py-3 px-2 space-y-1.5 custom-scrollbar overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full p-2.5 lg:px-3 lg:py-3 rounded-lg flex items-center justify-center lg:justify-between text-left transition-all ${
                isActive
                  ? 'bg-blue-600/20 border border-blue-500/50 text-white shadow-[0_0_15px_rgba(37,99,235,0.25)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <i className={`fa-solid ${item.icon} text-sm ${isActive ? 'text-blue-400' : 'text-slate-400'}`}></i>
                <span className="text-xs font-semibold tracking-wide hidden lg:inline truncate">
                  {item.label}
                </span>
              </div>

              {item.badge && item.badge > 0 && (
                <span className="hidden lg:inline-flex px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-mono font-bold rounded-full animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
};
