import React, { useState, useEffect } from 'react';
import { Incident, CameraData, PatrolUnit, ViewType } from '../../types';
import { CameraMap } from '../common/CameraMap';
import { BrainPanel } from '../common/BrainPanel';
import { CameraDetailsModal } from '../modals/CameraDetailsModal';
import { EmergencyDialog } from '../modals/EmergencyDialog';
import { useVideoAnalysis } from '../../hooks/useVideoAnalysis';
import { useDemoMode } from '../../hooks/useDemoMode';
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
  const [centerTab, setCenterTab] = useState<'map' | 'cctv_grid' | 'analytics'>('cctv_grid');
  const [selectedIncident, setSelectedIncident] = useState<Incident>(incidents[0] || {} as Incident);
  const [showCameraDetails, setShowCameraDetails] = useState<CameraData | null>(null);
  const [showEmergency, setShowEmergency] = useState<Incident | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  // Real-time data hooks
  const { data: backendCameras } = useRealTimeData<any>({ endpoint: '/api/cameras', interval: 5000 });
  const { data: backendIncidents } = useRealTimeData<any>({ endpoint: '/api/v1/incidents/cards', interval: 5000 });
  const { data: backendAlerts } = useRealTimeData<any>({ endpoint: '/api/v1/alerts/feed', interval: 5000 });
  const { data: backendStats } = useRealTimeData<any>({ endpoint: '/api/v1/statistics', interval: 5000 });

  // Video analysis hook
  const { isAnalyzing, progress, incidentId, analyzeVideo } = useVideoAnalysis();

  // Demo mode hook
  const { isRunning: demoRunning, start: startDemo, stop: stopDemo, toggle: toggleDemo } = useDemoMode({
    enabled: demoMode,
    interval: 20000,
    onIncidentGenerated: (cameraId) => {
      const camera = cameras.find(c => c.id === cameraId);
      if (camera) {
        handleAnalyze(camera);
      }
    }
  });

  // Load cameras from backend
  useEffect(() => {
    dataService.loadCameras();
  }, []);

  // Check for high severity incidents and show emergency dialog
  useEffect(() => {
    if (backendIncidents?.incidents && backendIncidents.incidents.length > 0) {
      const latestIncident = backendIncidents.incidents[0];
      if (latestIncident.severity >= 7.0 && !showEmergency) {
        setShowEmergency(latestIncident);
      }
    }
  }, [backendIncidents]);

  const handleAnalyze = async (camera: CameraData) => {
    try {
      await analyzeVideo(camera);
      await dataService.refreshCameras();
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  const handleCameraSelect = (camera: any) => {
    const frontendCamera = cameras.find(c => c.id === camera.camera_id);
    if (frontendCamera) {
      setShowCameraDetails(frontendCamera);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-white overflow-hidden font-sans">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Command Center</h2>
          <p className="text-sm text-slate-400">Monitor incidents and camera feeds</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCenterTab('cctv_grid')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              centerTab === 'cctv_grid' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Cameras
          </button>
          <button
            onClick={() => setCenterTab('map')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              centerTab === 'map' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setCenterTab('analytics')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              centerTab === 'analytics' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Analytics
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Incidents */}
        <aside className="w-80 border-r border-slate-700 bg-slate-800 overflow-y-auto">
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-md font-bold text-white">Recent Incidents</h3>
            <p className="text-sm text-slate-400">{incidents.length} total</p>
          </div>
          <div className="p-4 space-y-3">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => {
                  setSelectedIncident(inc);
                  onSelectIncident(inc);
                }}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedIncident.id === inc.id
                    ? 'bg-blue-600/20 border border-blue-500'
                    : 'bg-slate-700/50 border border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-bold text-white">{inc.title}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    inc.severity >= 7.0 ? 'bg-red-900/50 text-red-400' : 'bg-yellow-900/50 text-yellow-400'
                  }`}>
                    {inc.severity.toFixed(1)}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{inc.location}</p>
                <p className="text-xs text-slate-500 mt-1">{inc.timestamp}</p>
              </div>
            ))}
          </div>
        </aside>

        {/* Center Panel */}
        <main className="flex-1 overflow-hidden">
          {centerTab === 'cctv_grid' && (
            <div className="h-full p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cameras.slice(0, 6).map((camera) => (
                  <div
                    key={camera.id}
                    onClick={() => setShowCameraDetails(camera)}
                    className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-blue-500 cursor-pointer transition-colors"
                  >
                    <div className="aspect-video bg-slate-900 relative">
                      <video
                        src={camera.videoUrl}
                        className="w-full h-full object-cover"
                        muted
                      />
                      <div className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium bg-black/50 backdrop-blur">
                        {camera.status}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-white mb-1">{camera.name}</h3>
                      <p className="text-sm text-slate-400">{camera.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {centerTab === 'map' && (
            <div className="h-full">
              <CameraMap 
                cameras={cameras.map(c => ({
                  camera_id: c.id,
                  camera_name: c.name,
                  latitude: c.lat,
                  longitude: c.lng,
                  status: c.status,
                  risk_level: c.aiStatus === 'CRITICAL AI ALERT' ? 'CRITICAL' : 
                             c.aiStatus === 'HIGH THREAT DETECTED' ? 'HIGH' : 'MEDIUM'
                }))}
                onCameraClick={handleCameraSelect}
                onAnalyze={handleAnalyze}
              />
            </div>
          )}

          {centerTab === 'analytics' && (
            <div className="h-full p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-1">Total Incidents</p>
                  <p className="text-2xl font-bold text-white">{backendStats?.total_incidents?.reduce((a: number, b: number) => a + b, 0) || incidents.length}</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-1">Active Cameras</p>
                  <p className="text-2xl font-bold text-white">{backendStats?.health_metrics?.cameras || cameras.length}</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-1">Active Alerts</p>
                  <p className="text-2xl font-bold text-white">{backendStats?.health_metrics?.alerts || 0}</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-1">System Status</p>
                  <p className="text-2xl font-bold text-green-400">Healthy</p>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Right Panel: AI Brain */}
        <aside className="w-80 border-l border-slate-700 bg-slate-800 overflow-y-auto">
          <BrainPanel />
          
          {/* Demo Mode Controls */}
          <div className="p-4 border-t border-slate-700">
            <h3 className="text-md font-bold text-white mb-3">Demo Mode</h3>
            <button
              onClick={toggleDemo}
              className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                demoRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              } text-white`}
            >
              {demoRunning ? 'Pause Demo' : 'Start Demo'}
            </button>
            {isAnalyzing && progress && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{progress.stage}</span>
                  <span>{progress.progress}%</span>
                </div>
                <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
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

      {/* Emergency Dialog */}
      {showEmergency && (
        <EmergencyDialog
          incident={showEmergency}
          onAccept={() => {
            setShowEmergency(null);
            onSelectIncident(showEmergency);
          }}
          onViewEvidence={() => {
            setShowEmergency(null);
            onNavigate('investigation');
          }}
          onClose={() => setShowEmergency(null)}
        />
      )}
    </div>
  );
};
