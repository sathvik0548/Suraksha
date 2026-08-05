import React, { useState, useEffect } from 'react';
import { CameraData } from '../../types';
import { CctvPlayer } from '../common/CctvPlayer';
import { CameraDetailsModal } from '../modals/CameraDetailsModal';
import { AddCameraModal } from '../modals/AddCameraModal';
import { EditCameraModal } from '../modals/EditCameraModal';
import { AnalyzeVideoModal } from '../modals/AnalyzeVideoModal';
import { useVideoAnalysis } from '../../hooks/useVideoAnalysis';
import { dataService } from '../../data/dataService';

interface Props {
  cameras: CameraData[];
  onExpandCamera: (camera: CameraData) => void;
}

export const LiveCamerasView: React.FC<Props> = ({ cameras, onExpandCamera }) => {
  const [showCameraDetails, setShowCameraDetails] = useState<CameraData | null>(null);
  const [showAddCamera, setShowAddCamera] = useState(false);
  const [showEditCamera, setShowEditCamera] = useState<CameraData | null>(null);
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { isAnalyzing, progress, incidentId, analyzeVideo } = useVideoAnalysis();

  // Load cameras on mount
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

  const handleCameraAdded = () => {
    dataService.refreshCameras();
    setShowAddCamera(false);
  };

  const handleCameraUpdated = () => {
    dataService.refreshCameras();
    setShowEditCamera(null);
  };

  const filteredCameras = [...cameras]
    .sort((a, b) => (b.severity || 0) - (a.severity || 0))
    .filter((cam) => {
      if (filterStatus === 'online') return cam.status === 'REC';
      if (filterStatus === 'offline') return cam.status === 'OFFLINE';
      return true;
    });

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-white overflow-hidden font-sans select-none">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-900 border-b border-white/10 flex items-center justify-between font-mono">
        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <i className="fa-solid fa-video text-blue-400"></i> Live CCTV Grid & Stream Network
          </h2>
          <p className="text-xs text-slate-400">Surveillance Network Catalog — {filteredCameras.length} Active Streams</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none"
          >
            <option value="all">All Cameras ({cameras.length})</option>
            <option value="online">Online Only</option>
            <option value="offline">Offline Only</option>
          </select>
          <button
            onClick={() => setShowAnalyzeModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase transition-colors flex items-center gap-1.5"
          >
            <i className="fa-solid fa-cloud-arrow-up"></i> Analyze Video
          </button>
          <button
            onClick={() => setShowAddCamera(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase transition-colors flex items-center gap-1.5"
          >
            <i className="fa-solid fa-plus"></i> Add Camera
          </button>
        </div>
      </div>

      {/* Camera Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        {filteredCameras.length === 0 ? (
          <div className="text-center py-12 font-mono">
            <p className="text-slate-400">No CCTV cameras configured in this sector.</p>
            <button
              onClick={() => setShowAddCamera(true)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold uppercase"
            >
              Add Camera Stream
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCameras.map((camera) => (
              <div
                key={camera.id}
                className="bg-slate-900/80 rounded-xl overflow-hidden border border-white/10 hover:border-blue-500/50 transition-all flex flex-col shadow-xl"
              >
                {/* Video Stream Box */}
                <div className="h-44 bg-black relative">
                  <CctvPlayer camera={camera} onExpand={onExpandCamera} onEdit={(cam) => setShowEditCamera(cam)} showAiOverlay={true} />
                </div>

                {/* Info & Actions */}
                <div className="p-3 bg-slate-900 flex-1 flex flex-col justify-between border-t border-white/5 font-mono">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-xs text-white truncate max-w-[170px]">{camera.name}</h3>
                      <button
                        onClick={() => setShowEditCamera(camera)}
                        className="text-slate-400 hover:text-cyan-400 p-1"
                        title="Edit Camera Metadata"
                      >
                        <i className="fa-solid fa-pen-to-square text-xs"></i>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mb-2">{camera.location}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCameraDetails(camera)}
                      className="flex-1 py-1.5 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white rounded text-[10px] font-bold uppercase transition-colors"
                    >
                      Quick Analysis
                    </button>
                    <button
                      onClick={() => setShowEditCamera(camera)}
                      className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold uppercase"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCameraDetails && (
        <CameraDetailsModal
          camera={showCameraDetails}
          onClose={() => setShowCameraDetails(null)}
          onAnalyze={handleAnalyze}
        />
      )}

      {showAddCamera && (
        <AddCameraModal
          onCameraAdded={handleCameraAdded}
          onClose={() => setShowAddCamera(false)}
        />
      )}

      {showEditCamera && (
        <EditCameraModal
          camera={showEditCamera}
          onCameraUpdated={handleCameraUpdated}
          onClose={() => setShowEditCamera(null)}
        />
      )}

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
