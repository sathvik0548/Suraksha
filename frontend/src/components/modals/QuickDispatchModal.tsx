import React, { useState } from 'react';
import { Incident, PatrolUnit } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  incidents: Incident[];
  units: PatrolUnit[];
  onConfirmDispatch: (unitId: string, incidentId: string) => void;
}

export const QuickDispatchModal: React.FC<Props> = ({
  isOpen,
  onClose,
  incidents,
  units,
  onConfirmDispatch,
}) => {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(incidents[0]?.id || 'INC-8812');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('UNIT-402');
  const [sirenOverride, setSirenOverride] = useState(true);
  const [dispatchedSuccess, setDispatchedSuccess] = useState(false);

  if (!isOpen) return null;

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || incidents[0];
  const selectedUnit = units.find((u) => u.id === selectedUnitId) || units[0];

  const handleDispatch = () => {
    setDispatchedSuccess(true);
    setTimeout(() => {
      onConfirmDispatch(selectedUnitId, selectedIncidentId);
      setDispatchedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-red-500/40 rounded-xl w-full max-w-lg overflow-hidden shadow-[0_0_40px_rgba(220,38,38,0.3)] animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-red-950/60 border-b border-red-500/30 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-sm shadow-[0_0_15px_rgba(220,38,38,0.8)] animate-pulse">
              <i className="fa-solid fa-truck-fast"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Emergency Quick Dispatch
              </h3>
              <p className="text-[10px] text-red-300 font-mono">
                Direct Radio Override Protocol Active
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {dispatchedSuccess ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-400 text-2xl animate-bounce">
                <i className="fa-solid fa-check"></i>
              </div>
              <h4 className="text-base font-bold text-white uppercase font-mono">
                DISPATCH SIREN TRANSMITTED
              </h4>
              <p className="text-xs text-emerald-400 font-mono">
                Unit {selectedUnit?.name} redirected to {selectedIncident?.location}
              </p>
            </div>
          ) : (
            <>
              {/* Select Incident */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 font-mono">
                  Target Emergency Incident
                </label>
                <select
                  value={selectedIncidentId}
                  onChange={(e) => setSelectedIncidentId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white font-mono focus:border-red-500 focus:outline-none"
                >
                  {incidents.map((inc) => (
                    <option key={inc.id} value={inc.id}>
                      [{inc.id}] {inc.title} - SEV: {inc.severity} ({inc.location})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Incident Summary Card */}
              {selectedIncident && (
                <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-lg space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-white">
                    <span>{selectedIncident.title}</span>
                    <span className="px-2 py-0.5 bg-red-600 text-white font-mono text-[9px] rounded">
                      SEV {selectedIncident.severity}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Location: {selectedIncident.location}
                  </div>
                </div>
              )}

              {/* Select Unit */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 font-mono">
                  Select Dispatch Unit
                </label>
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                >
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} - Dist: {unit.distance} (ETA: {unit.eta})
                    </option>
                  ))}
                </select>
              </div>

              {/* Siren and Radio Options */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="siren"
                    checked={sirenOverride}
                    onChange={(e) => setSirenOverride(e.target.checked)}
                    className="rounded bg-slate-900 border-white/20 text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="siren" className="text-slate-300">
                    Siren & Emergency Lights Priority Override
                  </label>
                </div>
                <span className="text-blue-400 text-[10px]">{selectedUnit?.radioChannel}</span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!dispatchedSuccess && (
          <div className="p-4 bg-slate-900/80 border-t border-white/10 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono font-bold uppercase rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleDispatch}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-bold uppercase rounded shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-bullhorn"></i> Transmit Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
