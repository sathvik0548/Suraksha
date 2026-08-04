import React from 'react';
import { PatrolUnit } from '../../types';

interface Props {
  units: PatrolUnit[];
  onDispatchUnit: (unitId: string) => void;
}

export const FleetUnitsView: React.FC<Props> = ({ units, onDispatchUnit }) => {
  return (
    <div className="flex-1 p-6 bg-[#050608] text-white overflow-y-auto custom-scrollbar font-sans space-y-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-base font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
            <i className="fa-solid fa-truck-medical text-emerald-500"></i> Patrol Fleet & Tactical Dispatch Matrix
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Active Police Units, Air Support, and Radio Channel Monitor
          </p>
        </div>
        <span className="px-3 py-1 bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-mono text-xs rounded font-bold">
          12 UNITS ACTIVE
        </span>
      </div>

      {/* Units Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {units.map((unit) => (
          <div
            key={unit.id}
            className="bg-black/40 border border-white/10 p-5 rounded-xl space-y-4 hover:border-blue-500/40 transition-all"
          >
            <div className="flex justify-between items-start border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-sm text-white font-mono">{unit.name}</h3>
                <span className="text-[10px] text-slate-400 font-mono block">{unit.vehicle}</span>
              </div>
              <span
                className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded uppercase ${
                  unit.status === 'DISPATCHED'
                    ? 'bg-red-600 text-white animate-pulse'
                    : unit.status === 'ON_SCENE'
                    ? 'bg-amber-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {unit.status}
              </span>
            </div>

            {/* Officer Details */}
            <div className="space-y-1 text-xs font-mono">
              <div className="text-slate-400 text-[10px] uppercase">Assigned Officers</div>
              {unit.officers.map((officer, idx) => (
                <div key={idx} className="font-bold text-slate-200 flex items-center gap-2">
                  <i className="fa-solid fa-user-shield text-[10px] text-blue-400"></i>
                  {officer}
                </div>
              ))}
            </div>

            {/* Equipment & Radio */}
            <div className="p-3 bg-slate-900/60 rounded-lg space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>Radio Channel:</span>
                <span className="text-blue-400 font-bold">{unit.radioChannel}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>Location Sector:</span>
                <span className="text-white font-bold">{unit.location}</span>
              </div>
            </div>

            {/* Dispatch Action */}
            <button
              onClick={() => onDispatchUnit(unit.id)}
              className="w-full py-2 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white font-mono text-xs font-bold uppercase rounded transition-colors flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-bullhorn"></i> Transmit Order
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
