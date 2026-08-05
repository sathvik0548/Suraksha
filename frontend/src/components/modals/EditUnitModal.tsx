import React, { useState } from 'react';
import { PatrolUnit } from '../../types';
import { safeFetch } from '../../utils/errorHandling';

interface Props {
  unit: PatrolUnit;
  onClose: () => void;
  onUnitUpdated: (updatedUnit: PatrolUnit) => void;
}

export const EditUnitModal: React.FC<Props> = ({ unit, onClose, onUnitUpdated }) => {
  const [name, setName] = useState(unit.name);
  const [vehicle, setVehicle] = useState(unit.vehicle);
  const [status, setStatus] = useState(unit.status);
  const [location, setLocation] = useState(unit.location);
  const [eta, setEta] = useState(unit.eta);
  const [radioChannel, setRadioChannel] = useState(unit.radioChannel);
  const [officers, setOfficers] = useState<string[]>(unit.officers || []);
  const [newOfficer, setNewOfficer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddOfficer = () => {
    if (newOfficer.trim()) {
      setOfficers([...officers, newOfficer.trim()]);
      setNewOfficer('');
    }
  };

  const handleRemoveOfficer = (index: number) => {
    setOfficers(officers.filter((_, i) => i !== index));
  };

  const handleOfficerChange = (index: number, val: string) => {
    const updated = [...officers];
    updated[index] = val;
    setOfficers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const updatedUnit: PatrolUnit = {
      ...unit,
      name,
      vehicle,
      status: status as any,
      statusColor: status === 'DISPATCHED' ? 'danger' : (status === 'PATROLLING' ? 'success' : (status === 'AIRBORNE' ? 'info' : 'warning')),
      location,
      eta,
      radioChannel,
      officers: officers.filter((o) => o.trim().length > 0)
    };

    try {
      await safeFetch(`/api/v1/patrol-units/${unit.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedUnit)
      });
    } catch (err) {
      console.warn('Failed to save patrol unit edit to backend:', err);
    }

    onUnitUpdated(updatedUnit);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
      <div className="bg-slate-900 border border-white/20 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-pen-to-square text-blue-400 text-sm"></i>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              EDIT PATROL UNIT ({unit.id})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
              Unit Name / Call Sign
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                Vehicle Type
              </label>
              <input
                type="text"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="PATROLLING">PATROLLING</option>
                <option value="DISPATCHED">DISPATCHED</option>
                <option value="AIRBORNE">AIRBORNE</option>
                <option value="ON_SCENE">ON SCENE</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                Radio Channel
              </label>
              <input
                type="text"
                value={radioChannel}
                onChange={(e) => setRadioChannel(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                Response ETA
              </label>
              <input
                type="text"
                value={eta}
                onChange={(e) => setEta(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
              Sector / Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Officer Roster Management */}
          <div className="border-t border-white/10 pt-3">
            <label className="block text-[10px] text-blue-400 uppercase tracking-wider mb-2 font-bold flex items-center justify-between">
              <span>Assigned Officer Roster</span>
              <span>{officers.length} Personnel</span>
            </label>

            <div className="space-y-2 mb-3">
              {officers.map((officer, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={officer}
                    onChange={(e) => handleOfficerChange(idx, e.target.value)}
                    className="flex-1 bg-black/60 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOfficer(idx)}
                    className="w-8 h-8 bg-red-950/60 border border-red-500/40 text-red-400 hover:text-white rounded flex items-center justify-center text-xs transition-colors"
                    title="Remove Officer"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New Officer Name (e.g. Officer K. Varma)"
                value={newOfficer}
                onChange={(e) => setNewOfficer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddOfficer();
                  }
                }}
                className="flex-1 bg-black/60 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddOfficer}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-colors flex items-center gap-1"
              >
                <i className="fa-solid fa-plus text-[10px]"></i> Add
              </button>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 flex justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-colors shadow-lg flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin"></i> Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk"></i> Save Unit
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
