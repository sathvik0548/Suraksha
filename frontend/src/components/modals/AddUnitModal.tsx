import React, { useState } from 'react';
import { PatrolUnit } from '../../types';
import { safeFetch } from '../../utils/errorHandling';

interface Props {
  onClose: () => void;
  onUnitAdded: (newUnit: PatrolUnit) => void;
}

export const AddUnitModal: React.FC<Props> = ({ onClose, onUnitAdded }) => {
  const [name, setName] = useState('');
  const [vehicle, setVehicle] = useState('Mahindra Police Interceptor');
  const [status, setStatus] = useState<'PATROLLING' | 'DISPATCHED' | 'AIRBORNE' | 'ON_SCENE'>('PATROLLING');
  const [location, setLocation] = useState('Sector 1 - Central Madanapalle');
  const [eta, setEta] = useState('3 mins');
  const [radioChannel, setRadioChannel] = useState('CH-1 (MADANAPALLE MAIN)');
  const [officerInput, setOfficerInput] = useState('Officer R. Kumar, Officer P. Singh');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const officers = officerInput
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    const newUnitPayload: Partial<PatrolUnit> = {
      id: `UNIT-MDP-${Math.floor(100 + Math.random() * 900)}`,
      name: name.trim() || 'MADANAPALLE PATROL UNIT',
      vehicle: vehicle.trim(),
      status,
      statusColor: status === 'DISPATCHED' ? 'danger' : (status === 'PATROLLING' ? 'success' : (status === 'AIRBORNE' ? 'info' : 'warning')),
      location: location.trim(),
      eta: eta.trim(),
      radioChannel: radioChannel.trim(),
      officers: officers.length > 0 ? officers : ['Officer Active'],
      badge: `AP-POL-${Math.floor(100 + Math.random() * 900)}`,
      lat: 13.6288 + (Math.random() - 0.5) * 0.02,
      lng: 78.4746 + (Math.random() - 0.5) * 0.02,
      distance: '1.0 km',
      equipment: ['First Aid Kit', 'BodyCam', 'Radio']
    };

    try {
      const res = await safeFetch('/api/v1/patrol-units', {
        method: 'POST',
        body: JSON.stringify(newUnitPayload)
      });
      const data = await res.json();
      if (data && data.unit) {
        onUnitAdded(data.unit);
      } else {
        onUnitAdded(newUnitPayload as PatrolUnit);
      }
    } catch (err) {
      console.warn('Failed to add patrol unit to backend:', err);
      onUnitAdded(newUnitPayload as PatrolUnit);
    }

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
      <div className="bg-slate-900 border border-white/20 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-truck-medical text-emerald-400 text-sm"></i>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              CREATE NEW PATROL UNIT
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
              Unit Name / Call Sign *
            </label>
            <input
              type="text"
              placeholder="e.g. HIGHWAY PATROL 309 (DELTA)"
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
                Initial Status
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

          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
              Initial Officers (Comma-separated)
            </label>
            <input
              type="text"
              value={officerInput}
              onChange={(e) => setOfficerInput(e.target.value)}
              placeholder="e.g. Officer K. Reddy, Officer S. Naidu"
              className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors shadow-lg flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin"></i> Creating...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-plus font-bold"></i> Add Unit
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
