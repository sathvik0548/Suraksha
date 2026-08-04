import React from 'react';
import { AiMetrics } from '../../types';

interface Props {
  metrics: AiMetrics;
  compact?: boolean;
}

export const AiMetricsPanel: React.FC<Props> = ({ metrics, compact = false }) => {
  const getSeverityColor = (sev: number) => {
    if (sev >= 8.0) return 'text-red-500 stroke-red-500 border-red-500 bg-red-950/20';
    if (sev >= 6.0) return 'text-amber-500 stroke-amber-500 border-amber-500 bg-amber-950/20';
    return 'text-blue-500 stroke-blue-500 border-blue-500 bg-blue-950/20';
  };

  // Radial SVG calculation for severity circle
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (metrics.severity / 10) * circumference;

  return (
    <div className="flex flex-col gap-3 font-sans">
      {/* Radial Severity Gauge */}
      <div className="flex items-center gap-4 bg-white/5 p-3 rounded-lg border border-white/10">
        <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="currentColor"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`transition-all duration-700 ${getSeverityColor(metrics.severity)}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold font-mono text-white tracking-tighter">
              {metrics.severity}
            </span>
            <span className="text-[8px] uppercase font-bold text-slate-400">SEVERITY</span>
          </div>
        </div>

        <div className="flex-1 space-y-1">
          <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Threat Assessment</div>
          <div className="text-sm font-bold text-white uppercase">
            {metrics.severity >= 8.0 ? (
              <span className="text-red-400 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span> CRITICAL THREAT
              </span>
            ) : metrics.severity >= 6.0 ? (
              <span className="text-amber-400">HIGH ALERT</span>
            ) : (
              <span className="text-blue-400">MODERATE THREAT</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {metrics.people} Subjects Tracked in Frame
          </div>
        </div>
      </div>

      {/* Detection Confidence Progress Bars */}
      <div className="space-y-2.5 bg-black/40 p-3 rounded-lg border border-white/5">
        {/* Weapon Bar */}
        <div>
          <div className="flex justify-between items-center text-[10px] font-mono mb-1">
            <span className="text-slate-400 uppercase flex items-center gap-1.5">
              <i className={`fa-solid fa-gun text-[9px] ${metrics.weapon ? 'text-red-500' : 'text-slate-600'}`}></i>
              Weapon Signature
            </span>
            <span className={metrics.weapon ? 'text-red-400 font-bold' : 'text-slate-500'}>
              {metrics.weapon ? `${metrics.weaponConfidence}% CONFIRMED` : 'CLEAR'}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${metrics.weapon ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-slate-700'}`}
              style={{ width: `${metrics.weaponConfidence}%` }}
            ></div>
          </div>
        </div>

        {/* Fight Bar */}
        <div>
          <div className="flex justify-between items-center text-[10px] font-mono mb-1">
            <span className="text-slate-400 uppercase flex items-center gap-1.5">
              <i className={`fa-solid fa-hand-fist text-[9px] ${metrics.fight ? 'text-amber-500' : 'text-slate-600'}`}></i>
              Combat / Fight Index
            </span>
            <span className={metrics.fight ? 'text-amber-400 font-bold' : 'text-slate-500'}>
              {metrics.fight ? `${metrics.fightConfidence}% ACTIVE` : 'LOW'}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${metrics.fight ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-slate-700'}`}
              style={{ width: `${metrics.fightConfidence}%` }}
            ></div>
          </div>
        </div>

        {/* Crowd Density / People Count */}
        <div className="flex justify-between items-center text-[10px] font-mono pt-1 border-t border-white/5">
          <span className="text-slate-400 uppercase flex items-center gap-1.5">
            <i className="fa-solid fa-users text-[9px] text-blue-400"></i> People Count
          </span>
          <span className="text-blue-400 font-bold">{metrics.people} Individuals</span>
        </div>

        {/* Blood Detection */}
        <div className="flex justify-between items-center text-[10px] font-mono">
          <span className="text-slate-400 uppercase flex items-center gap-1.5">
            <i className="fa-solid fa-droplet text-[9px] text-red-500"></i> Trauma / Blood Signature
          </span>
          <span className={metrics.blood ? 'text-red-400 font-bold' : 'text-slate-500'}>
            {metrics.blood ? 'DETECTED' : 'NEGATIVE'}
          </span>
        </div>
      </div>

      {/* Tracking IDs Layer Display */}
      <div className="bg-black/40 p-3 rounded-lg border border-white/5">
        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2 flex items-center justify-between">
          <span>Active Neural Trackers</span>
          <span className="text-[9px] text-blue-400 font-mono">{metrics.trackingIDs.length} LOCKED</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {metrics.trackingIDs.map((id) => (
            <span
              key={id}
              className="px-2 py-0.5 bg-blue-950/50 border border-blue-500/30 text-blue-300 font-mono text-[9px] font-bold rounded flex items-center gap-1"
            >
              <span className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></span>
              TRK_{id}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
