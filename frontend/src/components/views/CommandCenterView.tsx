import React, { useState, useEffect } from 'react';
import { Incident, CameraData, PatrolUnit, ViewType } from '../../types';
import { CameraMap } from '../common/CameraMap';
import { BrainPanel } from '../common/BrainPanel';
import { CctvPlayer } from '../common/CctvPlayer';
import { CameraDetailsModal } from '../modals/CameraDetailsModal';
import { EmergencyDialog } from '../modals/EmergencyDialog';
import { AnalyzeVideoModal } from '../modals/AnalyzeVideoModal';
import { useVideoAnalysis } from '../../hooks/useVideoAnalysis';
import { useRealTimeData } from '../../hooks/useRealTimeData';
import { dataService } from '../../data/dataService';

interface Props {
  incidents: Incident[];
  cameras: CameraData[];
  units: PatrolUnit[];
  onSelectIncident: (incident: Incident) => void;
  onExpandCamera: (camera: CameraData) => void;
  onQuickDispatch: () => void;
  onNavigate: (view: ViewType) => void;
}

export const CommandCenterView: React.FC<Props> = ({
  incidents,
  cameras,
  units,
  onSelectIncident,
  onExpandCamera,
  onQuickDispatch,
  onNavigate,
}) => {
  const [centerTab, setCenterTab] = useState<'cctv_grid' | 'map'>('cctv_grid');
  const [selectedIncident, setSelectedIncident] = useState<Incident>(incidents[0] || ({} as Incident));
  const [showCameraDetails, setShowCameraDetails] = useState<CameraData | null>(null);
  const [showEmergency, setShowEmergency] = useState<Incident | null>(null);
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);

  // Real-time data hooks
  const { data: backendIncidents } = useRealTimeData<any>({ endpoint: '/api/v1/incidents/cards', interval: 5000 });

  // Video analysis hook
  const { isAnalyzing, progress, analyzeVideo } = useVideoAnalysis();

  // Load cameras from backend
  useEffect(() => {
    dataService.loadCameras();
  }, []);

  const handleAnalyze = async (camera: CameraData) => {
    try {
      await analyzeVideo(camera);
      await dataService.refreshCameras();
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  const activeAlertsCount = incidents.filter((i) => i.status === 'Active' || i.severity >= 7.0).length;

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-white overflow-hidden font-sans select-none">
      {/* KPI Metrics Row Header (Matching Screenshot) */}
      <div className="bg-slate-900/90 border-b border-white/10 px-4 py-2 flex items-center justify-between gap-3 text-xs font-mono shrink-0">
        {/* Metric 1: Critical Alerts */}
        <div className="flex items-center gap-2.5 bg-red-950/40 border border-red-500/40 px-3 py-1.5 rounded-lg shadow-sm">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></div>
          <div>
            <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">CRITICAL ALERTS</div>
            <div className="text-red-400 font-bold text-sm flex items-center gap-1">
              <i className="fa-solid fa-triangle-exclamation text-xs"></i>
              {String(activeAlertsCount || 3).padStart(2, '0')} ACTIVE
            </div>
          </div>
        </div>

        {/* Metric 2: Avg Response Time */}
        <div className="flex items-center gap-2.5 bg-slate-900 border border-blue-500/30 px-3 py-1.5 rounded-lg shadow-sm">
          <i className="fa-solid fa-stopwatch text-blue-400 text-base"></i>
          <div>
            <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">AVG RESPONSE</div>
            <div className="text-white font-bold text-sm">4.2 mins</div>
          </div>
        </div>

        {/* Metric 3: Threat Level */}
        <div className="flex items-center gap-2.5 bg-amber-950/40 border border-amber-500/40 px-3 py-1.5 rounded-lg shadow-sm">
          <i className="fa-solid fa-shield-cat text-amber-400 text-base"></i>
          <div>
            <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">THREAT LEVEL</div>
            <div className="text-amber-400 font-bold text-sm">HIGH DEFCON-3</div>
          </div>
        </div>

        {/* Metric 4: Active Units */}
        <div className="flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-500/40 px-3 py-1.5 rounded-lg shadow-sm">
          <i className="fa-solid fa-truck-medical text-emerald-400 text-base"></i>
          <div>
            <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">ACTIVE UNITS</div>
            <div className="text-emerald-400 font-bold text-sm">{units.length || 12} FLEET</div>
          </div>
        </div>

        {/* Metric 5: AI Vision Precision */}
        <div className="flex items-center gap-2.5 bg-cyan-950/40 border border-cyan-500/40 px-3 py-1.5 rounded-lg shadow-sm">
          <i className="fa-solid fa-bullseye text-cyan-400 text-base"></i>
          <div>
            <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">AI VISION PRECISION</div>
            <div className="text-cyan-400 font-bold text-sm">98.4%</div>
          </div>
        </div>

        {/* Action Button: Custom Video Upload */}
        <button
          onClick={() => setShowAnalyzeModal(true)}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/40 border border-indigo-400/40"
        >
          <i className="fa-solid fa-cloud-arrow-up text-sm"></i>
          <span>Analyze Custom Video</span>
        </button>
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden p-2 gap-2">
        {/* Left Column: Critical Alerts Feed (Width: 3 cols) */}
        <aside className="col-span-12 lg:col-span-3 flex flex-col bg-slate-900/80 border border-white/10 rounded-lg overflow-hidden shadow-xl">
          {/* Header */}
          <div className="p-3 bg-slate-900 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold font-mono text-slate-200">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              <span className="text-red-400 uppercase tracking-wider">CRITICAL ALERTS FEED</span>
            </div>
            <span className="text-[10px] font-mono text-blue-400 bg-blue-950 border border-blue-500/30 px-2 py-0.5 rounded">
              LIVE SYNC
            </span>
          </div>

          {/* Incident Feed List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => {
                  setSelectedIncident(inc);
                  onSelectIncident(inc);
                }}
                className={`p-3 rounded-lg border transition-all cursor-pointer relative group ${
                  selectedIncident.id === inc.id
                    ? 'bg-red-950/40 border-red-500 shadow-md shadow-red-900/30'
                    : 'bg-slate-950/60 border-white/5 hover:border-red-500/50 hover:bg-slate-900'
                }`}
              >
                {/* Incident Tag */}
                <div className="flex items-center justify-between mb-1 font-mono text-[10px]">
                  <span className="text-red-400 font-bold uppercase truncate max-w-[170px]">
                    #{inc.id} - {inc.title}
                  </span>
                  <span className="text-slate-500 text-[9px]">LIVE</span>
                </div>

                <div className="text-xs font-bold text-white mb-2 truncate">{inc.location}</div>

                <div className="flex items-center justify-between font-mono">
                  <span className="px-2 py-0.5 bg-red-600 text-white font-bold text-[10px] rounded shadow-red-900/50 shadow">
                    {inc.severity.toFixed(1)} SEVERITY
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectIncident(inc);
                      onNavigate('investigation');
                    }}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                  >
                    <i className="fa-solid fa-microscope text-[9px]"></i> Investigate
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Forensics Action Button */}
          <div className="p-2 border-t border-white/10 bg-slate-900">
            <button
              onClick={() => onNavigate('investigation')}
              className="w-full py-2 bg-blue-950 hover:bg-blue-900 text-blue-400 hover:text-white border border-blue-500/40 rounded-lg text-xs font-mono font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-fingerprint text-xs"></i>
              Open Forensics Workspace
            </button>
          </div>
        </aside>

        {/* Center Column: Live CCTV Grid / Map (Width: 6 cols) */}
        <main className="col-span-12 lg:col-span-6 flex flex-col bg-slate-950 border border-white/10 rounded-lg overflow-hidden shadow-xl">
          {/* Header Controls */}
          <div className="p-2 bg-slate-900 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCenterTab('cctv_grid')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold uppercase transition-all ${
                  centerTab === 'cctv_grid'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-grip text-[10px] mr-1"></i> Live CCTV Grid
              </button>
              <button
                onClick={() => setCenterTab('map')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold uppercase transition-all ${
                  centerTab === 'map'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-map-location-dot text-[10px] mr-1"></i> Tactical GPS Map
              </button>
            </div>

            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              SECTOR 7G - DOWNTOWN COMMAND ZONE
            </div>
          </div>

          {/* Grid / Map View */}
          <div className="flex-1 overflow-y-auto p-2 bg-black">
            {centerTab === 'cctv_grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 h-full">
                {cameras.slice(0, 6).map((camera) => (
                  <div key={camera.id} className="h-44 md:h-48">
                    <CctvPlayer
                      camera={camera}
                      onExpand={onExpandCamera}
                      showAiOverlay={true}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full rounded-lg overflow-hidden border border-white/10">
                <CameraMap
                  cameras={cameras.map((c) => ({
                    camera_id: c.id,
                    camera_name: c.name,
                    latitude: c.lat,
                    longitude: c.lng,
                    status: c.status,
                    risk_level:
                      c.aiStatus === 'CRITICAL AI ALERT'
                        ? 'CRITICAL'
                        : c.aiStatus === 'HIGH THREAT DETECTED'
                        ? 'HIGH'
                        : 'MEDIUM',
                  }))}
                  onCameraClick={(cam) => {
                    const found = cameras.find((c) => c.id === cam.camera_id);
                    if (found) onExpandCamera(found);
                  }}
                  onAnalyze={handleAnalyze}
                />
              </div>
            )}
          </div>

          {/* Live Alert Ticker Bar */}
          <div className="bg-slate-900 border-t border-white/10 px-3 py-1.5 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-red-400 font-bold uppercase">LIVE ALERT TICKER:</span>
              <span className="truncate text-slate-200">
                [AI THREAT] Sector 7G weapon confidence 95.2% ... [OPS] Unit 402 dispatched to Sector 3A ...
              </span>
            </div>
          </div>
        </main>

        {/* Right Column: Sentinel AI Brain Panel (Width: 3 cols) */}
        <aside className="col-span-12 lg:col-span-3 flex flex-col bg-slate-900/80 border border-white/10 rounded-lg overflow-hidden shadow-xl">
          <BrainPanel />
        </aside>
      </div>

      {/* Camera Details Modal */}
      {showCameraDetails && (
        <CameraDetailsModal
          camera={showCameraDetails}
          onClose={() => setShowCameraDetails(null)}
          onAnalyze={handleAnalyze}
        />
      )}

      {/* Analyze Custom Video Modal */}
      {showAnalyzeModal && (
        <AnalyzeVideoModal
          onClose={() => setShowAnalyzeModal(false)}
          onAnalysisComplete={() => {
            dataService.refreshCameras();
            setShowAnalyzeModal(false);
          }}
        />
      )}
    </div>
  );
};
