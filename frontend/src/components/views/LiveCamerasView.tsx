import React, { useState, useEffect } from 'react';
import { CameraData } from '../../types';
import { CctvPlayer } from '../common/CctvPlayer';
import { CameraDetailsModal } from '../modals/CameraDetailsModal';
import { AddCameraModal } from '../modals/AddCameraModal';
import { AnalyzeVideoModal } from '../modals/AnalyzeVideoModal';
import { useVideoAnalysis } from '../../hooks/useVideoAnalysis';
import { dataService, authService } from '../../data/dataService';

interface Props {
  cameras: CameraData[];
  onExpandCamera: (camera: CameraData) => void;
}

export const LiveCamerasView: React.FC<Props> = ({ cameras, onExpandCamera }) => {
  const [showCameraDetails, setShowCameraDetails] = useState<CameraData | null>(null);
  const [showAddCamera, setShowAddCamera] = useState(false);
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const { isAnalyzing, progress, incidentId, analyzeVideo } = useVideoAnalysis();

  // Load cameras from backend on mount
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

  const handleCameraAdded = (newCamera: any) => {
    dataService.refreshCameras();
    setShowAddCamera(false);
  };

  const filteredCameras = cameras.filter((cam) => {
    if (filterStatus === 'online') return cam.status === 'REC';
    if (filterStatus === 'offline') return cam.status === 'OFFLINE';
    return true;
  });

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-white overflow-hidden font-sans">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Live Camera Feed</h2>
          <p className="text-sm text-slate-400">Monitor and analyze camera feeds</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Cameras</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
          <button
            onClick={() => setShowAnalyzeModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            <i className="fa-solid fa-file-video text-xs"></i>
            Analyze Custom Video
          </button>
          <button
            onClick={() => dataService.refreshCameras()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowAddCamera(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Add Camera
          </button>
        </div>
      </div>

      {/* Camera Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        {filteredCameras.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">No cameras found</p>
            <button
              onClick={() => setShowAddCamera(true)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              Add Your First Camera
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCameras.map((camera) => (
              <div
                key={camera.id}
                className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-blue-500 transition-colors"
              >
                {/* Video Preview */}
                <div className="aspect-video bg-slate-900 relative">
                  <CctvPlayer camera={camera} showAiOverlay={true} />
                  <div className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium bg-black/50 backdrop-blur">
                    {camera.status}
                  </div>
                </div>

                {/* Camera Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-white mb-1">{camera.name}</h3>
                  <p className="text-sm text-slate-400 mb-3">{camera.location}</p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs px-2 py-1 rounded ${
                      camera.aiStatusType === 'danger' ? 'bg-red-900/50 text-red-400' :
                      camera.aiStatusType === 'warning' ? 'bg-yellow-900/50 text-yellow-400' :
                      camera.aiStatusType === 'info' ? 'bg-blue-900/50 text-blue-400' :
                      'bg-green-900/50 text-green-400'
                    }`}>
                      {camera.aiStatus}
                    </span>
                    <span className="text-xs text-slate-400">{camera.fps}</span>
                  </div>

                  <button
                    onClick={() => setShowCameraDetails(camera)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Analyze
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Camera Details Modal */}
      {showCameraDetails && (
        <CameraDetailsModal
          camera={showCameraDetails}
          onClose={() => setShowCameraDetails(null)}
          onAnalyze={handleAnalyze}
        />
      )}

      {/* Add Camera Modal */}
      {showAddCamera && (
        <AddCameraModal
          onCameraAdded={handleCameraAdded}
          onClose={() => setShowAddCamera(false)}
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
