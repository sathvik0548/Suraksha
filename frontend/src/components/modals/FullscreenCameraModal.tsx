import React from 'react';
import { CameraData } from '../../types';
import { CctvPlayer } from '../common/CctvPlayer';
import { AiMetricsPanel } from '../common/AiMetricsPanel';

interface Props {
  camera: CameraData | null;
  onClose: () => void;
}

export const FullscreenCameraModal: React.FC<Props> = ({ camera, onClose }) => {
  if (!camera) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col p-4 lg:p-6 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="px-2 py-1 bg-red-600 text-white font-mono font-bold text-xs rounded uppercase flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 bg-white rounded-full"></span> LIVE 4K MONITOR
          </div>
          <h2 className="text-base font-bold text-white font-mono">{camera.name}</h2>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">({camera.location})</span>
        </div>

        <button
          onClick={onClose}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold rounded flex items-center gap-1.5 transition-colors"
        >
          <i className="fa-solid fa-xmark"></i> Close Fullscreen
        </button>
      </div>

      {/* Main Grid: Video Stream + Live AI Panel */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
        {/* CCTV Video Monitor (3 Cols) */}
        <div className="lg:col-span-3 h-full min-h-[300px]">
          <CctvPlayer camera={camera} showAiOverlay={true} />
        </div>

        {/* AI Analytics Side Panel (1 Col) */}
        <div className="bg-black/40 border border-white/10 rounded-lg p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4">
          <h3 className="text-xs font-bold font-mono text-blue-400 uppercase tracking-widest border-b border-white/10 pb-2">
            AI Threat Core Matrix
          </h3>

          <AiMetricsPanel metrics={camera.aiMetrics} />

          {/* Camera Details */}
          <div className="bg-slate-900/60 p-3 rounded border border-white/5 space-y-1.5 text-[10px] font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Resolution:</span>
              <span className="text-white font-bold">{camera.resolution}</span>
            </div>
            <div className="flex justify-between">
              <span>FPS Stream Rate:</span>
              <span className="text-blue-400 font-bold">{camera.fps}</span>
            </div>
            <div className="flex justify-between">
              <span>GPS Coordinates:</span>
              <span className="text-white font-bold">{camera.lat}, {camera.lng}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
