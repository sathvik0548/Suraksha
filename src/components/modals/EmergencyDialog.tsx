import React, { useEffect, useState } from 'react';
import { Incident } from '../../types';

interface Props {
  incident: Incident | null;
  onAccept: () => void;
  onViewEvidence: () => void;
  onClose: () => void;
}

export const EmergencyDialog: React.FC<Props> = ({ incident, onAccept, onViewEvidence, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    if (incident) {
      setVisible(true);
      setTimeLeft(10);
      
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setVisible(false);
    }
  }, [incident, onClose]);

  if (!visible || !incident) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-slate-900 border-4 border-red-600 rounded-2xl max-w-lg w-full animate-pulse shadow-2xl shadow-red-600/50">
        {/* Animated Siren Border */}
        <div className="absolute inset-0 border-4 border-red-600 rounded-2xl animate-ping opacity-50"></div>
        
        {/* Header */}
        <div className="bg-red-600 p-4 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center animate-pulse">
              <i className="fa-solid fa-siren text-red-600 text-2xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">EMERGENCY ALERT</h2>
              <p className="text-sm text-red-100">New Incident Detected</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Incident Info */}
          <div className="bg-slate-800/50 p-4 rounded-lg border border-red-600/30">
            <div className="flex items-center gap-2 mb-2">
              <i className="fa-solid fa-camera text-red-400"></i>
              <span className="text-sm font-bold text-white">{incident.camera}</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">{incident.title}</h3>
            <p className="text-sm text-slate-400">{incident.location}</p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 p-3 rounded-lg text-center">
              <p className="text-xs text-slate-400">Confidence</p>
              <p className="text-lg font-bold text-green-400">
                {incident.aiAnalysis.weaponConfidence.toFixed(0)}%
              </p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg text-center">
              <p className="text-xs text-slate-400">Severity</p>
              <p className="text-lg font-bold text-red-400">{incident.severity.toFixed(1)}</p>
            </div>
          </div>

          {/* Recommendation */}
          <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-600/30">
            <p className="text-xs text-blue-400 mb-1">AI Recommendation</p>
            <p className="text-sm text-white">{incident.description}</p>
          </div>

          {/* Auto-close timer */}
          <div className="text-center">
            <p className="text-xs text-slate-400">Auto-closing in <span className="text-red-400 font-bold">{timeLeft}s</span></p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onAccept}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-check"></i>
              Accept
            </button>
            <button
              onClick={onViewEvidence}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-image"></i>
              View Evidence
            </button>
            <button
              onClick={onClose}
              className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
