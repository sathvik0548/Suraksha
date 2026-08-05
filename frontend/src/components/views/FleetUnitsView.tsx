import React, { useState, useEffect } from 'react';
import { PatrolUnit } from '../../types';
import { EditUnitModal } from '../modals/EditUnitModal';
import { AddUnitModal } from '../modals/AddUnitModal';
import { safeFetch } from '../../utils/errorHandling';

interface Props {
  units: PatrolUnit[];
  onDispatchUnit: (unitId: string) => void;
}

export const FleetUnitsView: React.FC<Props> = ({ units: initialUnits, onDispatchUnit }) => {
  const [unitsList, setUnitsList] = useState<PatrolUnit[]>(initialUnits);
  const [editingUnit, setEditingUnit] = useState<PatrolUnit | null>(null);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [dispatchLogs, setDispatchLogs] = useState<any[]>([]);

  // Load units from API on mount
  const fetchUnits = async () => {
    try {
      const res = await safeFetch('/api/v1/patrol-units');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setUnitsList(data);
      }
    } catch (err) {
      console.warn('Using local patrol units fallback:', err);
    }
  };

  // Load dispatch log from API on mount
  const fetchDispatchLogs = async () => {
    try {
      const res = await safeFetch('/api/v1/dispatch');
      const data = await res.json();
      if (Array.isArray(data)) {
        setDispatchLogs(data);
      }
    } catch (err) {
      console.warn('Failed to load dispatch logs:', err);
    }
  };

  useEffect(() => {
    fetchUnits();
    fetchDispatchLogs();
  }, []);

  const handleUnitUpdated = (updated: PatrolUnit) => {
    setUnitsList((prev) =>
      prev.map((u) => (u.id === updated.id ? updated : u))
    );
    fetchUnits();
  };

  const handleUnitAdded = (newUnit: PatrolUnit) => {
    setUnitsList((prev) => [newUnit, ...prev]);
    fetchUnits();
  };

  return (
    <div className="flex-1 p-6 bg-slate-950 text-white overflow-y-auto custom-scrollbar font-sans space-y-8 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
        <div>
          <h2 className="text-base font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
            <i className="fa-solid fa-truck-medical text-emerald-400"></i> Patrol Fleet & Tactical Dispatch Matrix
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Active Police Units, Officer Roster Management, and Emergency Radio Log
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddUnit(true)}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold rounded flex items-center gap-1.5 transition-colors shadow-lg"
          >
            <i className="fa-solid fa-plus text-xs"></i> ADD PATROL UNIT
          </button>

          <span className="px-3 py-1.5 bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-mono text-xs rounded font-bold">
            {unitsList.length} UNITS ACTIVE
          </span>
        </div>
      </div>

      {/* Units Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {unitsList.map((unit) => (
          <div
            key={unit.id}
            className="bg-slate-900/80 border border-white/10 p-5 rounded-xl space-y-4 hover:border-blue-500/40 transition-all shadow-xl flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b border-white/10 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-white font-mono">{unit.name}</h3>
                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{unit.vehicle}</span>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded uppercase ${
                      unit.status === 'DISPATCHED'
                        ? 'bg-red-600 text-white animate-pulse'
                        : unit.status === 'ON_SCENE'
                        ? 'bg-amber-600 text-white'
                        : unit.status === 'AIRBORNE'
                        ? 'bg-sky-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {unit.status}
                  </span>
                  <button
                    onClick={() => setEditingUnit(unit)}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 hover:underline"
                  >
                    <i className="fa-solid fa-pen-to-square text-[9px]"></i> Edit Roster
                  </button>
                </div>
              </div>

              {/* Officer Details */}
              <div className="space-y-1.5 text-xs font-mono">
                <div className="text-slate-400 text-[10px] uppercase font-bold flex justify-between">
                  <span>Assigned Officers</span>
                  <span className="text-blue-400">{unit.officers?.length || 0} Personnel</span>
                </div>
                {(unit.officers || []).length > 0 ? (
                  (unit.officers || []).map((officer, idx) => (
                    <div key={idx} className="font-bold text-slate-200 flex items-center gap-2 text-[11px]">
                      <i className="fa-solid fa-user-shield text-[10px] text-blue-400"></i>
                      {officer}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 text-[11px]">Officer In Charge Assigned</div>
                )}
              </div>

              {/* Equipment & Radio */}
              <div className="p-3 bg-slate-950/80 rounded-lg space-y-2 text-xs font-mono border border-white/5">
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>Radio Channel:</span>
                  <span className="text-blue-400 font-bold">{unit.radioChannel || 'CH-1 PRIMARY'}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>Location Sector:</span>
                  <span className="text-white font-bold truncate max-w-[150px]">{unit.location}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>Response ETA:</span>
                  <span className="text-emerald-400 font-bold">{unit.eta || '2 mins'}</span>
                </div>
              </div>
            </div>

            {/* Dispatch Action */}
            <button
              onClick={() => onDispatchUnit(unit.id)}
              className="w-full mt-2 py-2.5 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white font-mono text-xs font-bold uppercase rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-bullhorn"></i> Transmit Dispatch Order
            </button>
          </div>
        ))}
      </div>

      {/* Recent Dispatches Log Table */}
      <div className="bg-slate-900/80 border border-white/10 p-5 rounded-xl font-mono space-y-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-clock-rotate-left text-amber-400 text-sm"></i>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              RECENT TACTICAL DISPATCHES LOG
            </h3>
          </div>
          <span className="text-xs text-slate-400">{dispatchLogs.length} Records Persisted</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Dispatch ID</th>
                <th className="py-2.5 px-3">Assigned Unit</th>
                <th className="py-2.5 px-3">Incident Target</th>
                <th className="py-2.5 px-3">Sector Location</th>
                <th className="py-2.5 px-3">Timestamp (IST)</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {dispatchLogs.length > 0 ? (
                dispatchLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-blue-400">{log.id}</td>
                    <td className="py-2.5 px-3 text-white font-bold">{log.unitName || log.unitId}</td>
                    <td className="py-2.5 px-3 text-slate-300">{log.incidentTitle || log.incidentId}</td>
                    <td className="py-2.5 px-3 text-slate-400 truncate max-w-[200px]">{log.location}</td>
                    <td className="py-2.5 px-3 text-slate-400">{log.timestamp}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-500/30 rounded text-[9px] font-bold">
                        {log.status || 'DISPATCHED'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400 text-xs">
                    No dispatch orders logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Unit Modal */}
      {editingUnit && (
        <EditUnitModal
          unit={editingUnit}
          onClose={() => setEditingUnit(null)}
          onUnitUpdated={handleUnitUpdated}
        />
      )}

      {/* Add Unit Modal */}
      {showAddUnit && (
        <AddUnitModal
          onClose={() => setShowAddUnit(false)}
          onUnitAdded={handleUnitAdded}
        />
      )}
    </div>
  );
};
