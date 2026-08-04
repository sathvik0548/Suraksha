import React, { useState } from 'react';
import { CameraData } from '../../types';

interface Props {
  camera: CameraData | null;
  onClose: () => void;
  onAnalyze: (camera: CameraData) => void;
}

export const CameraDetailsModal: React.FC<Props> = ({ camera, onClose, onAnalyze }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!camera) return null;

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    try {
      await onAnalyze(camera);
      setProgress(100);
      setTimeout(() => {
        setIsAnalyzing(false);
        onClose();
      }, 500);
    } catch (error) {
      console.error('Analysis failed:', error);
      setIsAnalyzing(false);
      clearInterval(progressInterval);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">{camera.name}</h2>
            <p className="text-sm text-slate-400">{camera.location}</p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Camera Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">Status</p>
              <p className="text-sm font-bold text-white">{camera.status}</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">Risk Level</p>
              <p className="text-sm font-bold text-orange-400">{camera.aiStatus}</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">Coordinates</p>
              <p className="text-sm font-bold text-white">{camera.lat}, {camera.lng}</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">Zone</p>
              <p className="text-sm font-bold text-white">{camera.location.split(' - ')[0]}</p>
            </div>
          </div>

          {/* Video Preview */}
          <div className="bg-slate-800/50 p-4 rounded-lg">
            <p className="text-xs text-slate-400 mb-2">Video Source</p>
            <p className="text-sm text-white font-mono mb-3">{camera.videoUrl}</p>
            <video
              src={camera.videoUrl}
              controls
              className="w-full rounded-lg bg-black"
              style={{ maxHeight: '200px' }}
            />
          </div>

          {/* AI Metrics */}
          <div className="bg-slate-800/50 p-4 rounded-lg">
            <p className="text-xs text-slate-400 mb-3">Current AI Metrics</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Severity:</span>
                <span className="font-bold text-white">{camera.aiMetrics.severity.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">People:</span>
                <span className="font-bold text-white">{camera.aiMetrics.people}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Weapon:</span>
                <span className={`font-bold ${camera.aiMetrics.weapon ? 'text-red-400' : 'text-green-400'}`}>
                  {camera.aiMetrics.weapon ? 'DETECTED' : 'NONE'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fight:</span>
                <span className={`font-bold ${camera.aiMetrics.fight ? 'text-red-400' : 'text-green-400'}`}>
                  {camera.aiMetrics.fight ? 'DETECTED' : 'NONE'}
                </span>
              </div>
            </div>
          </div>

          {/* Analyze Button */}
          <div className="flex gap-3">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Analyzing...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-brain"></i>
                  Analyze Video
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isAnalyzing}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white font-bold rounded-lg transition-colors"
            >
              Close
            </button>
          </div>

          {/* Progress Bar */}
          {isAnalyzing && (
            <div className="bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
