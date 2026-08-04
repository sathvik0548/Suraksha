import React, { useState, useRef } from 'react';
import { useVideoAnalysis } from '../../hooks/useVideoAnalysis';
import { CameraData } from '../../types';

interface Props {
  onClose: () => void;
  onAnalysisComplete?: (incidentId: string) => void;
}

export const AnalyzeVideoModal: React.FC<Props> = ({ onClose, onAnalysisComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cameraName, setCameraName] = useState('Custom Surveillance Feed');
  const [location, setLocation] = useState('Sector 4 - Uploaded Video');
  const [lat, setLat] = useState(40.7128);
  const [lng, setLng] = useState(-74.0060);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAnalyzing, progress, error: analysisError, analyzeVideo, reset } = useVideoAnalysis();

  const handleFileChange = (file: File | null) => {
    setValidationError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const allowedExtensions = ['.mp4', '.avi', '.mov', '.mkv'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      setValidationError(`Invalid video format. Supported formats: ${allowedExtensions.join(', ')}`);
      setSelectedFile(null);
      return;
    }

    const maxBytes = 500 * 1024 * 1024; // 500MB
    if (file.size > maxBytes) {
      setValidationError(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 500MB limit.`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setValidationError('Please select a video file to analyze.');
      return;
    }

    const mockCamera: CameraData = {
      id: `CAM-UPL-${Date.now().toString().slice(-4)}`,
      name: cameraName,
      location: location,
      status: 'REC',
      fps: '30.0 FPS',
      resolution: '1080p FHD',
      aiStatus: 'ANALYZING',
      aiStatusType: 'info',
      severity: 1.0,
      lat: lat,
      lng: lng,
      videoUrl: '',
      detections: [],
      aiMetrics: {
        weapon: false,
        weaponConfidence: 0,
        fight: false,
        fightConfidence: 0,
        people: 0,
        blood: false,
        severity: 1.0,
        trackingIDs: [],
      },
    };

    try {
      const incidentId = await analyzeVideo(mockCamera, selectedFile);
      if (incidentId && onAnalysisComplete) {
        onAnalysisComplete(incidentId);
      }
    } catch (err) {
      console.error('Analysis submission failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-cloud-arrow-up text-blue-500"></i>
              Analyze Custom Video Feed
            </h2>
            <p className="text-sm text-slate-400">Upload any CCTV or surveillance video file for YOLO11 AI processing</p>
          </div>
          <button
            onClick={onClose}
            disabled={isAnalyzing}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* File Drag and Drop Dropzone */}
          <div>
            <label className="block text-xs text-slate-400 font-mono uppercase mb-2">Video File</label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !isAnalyzing && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-500/10'
                  : selectedFile
                  ? 'border-emerald-500/50 bg-emerald-950/20'
                  : 'border-white/20 bg-slate-800/50 hover:border-blue-400 hover:bg-slate-800'
              } ${isAnalyzing ? 'pointer-events-none opacity-60' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.avi,.mov,.mkv"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <i className="fa-solid fa-file-video text-emerald-400 text-3xl"></i>
                  <p className="font-bold text-white text-sm truncate">{selectedFile.name}</p>
                  <p className="text-xs text-emerald-400 font-mono">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for analysis
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Change video
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <i className="fa-solid fa-video text-slate-400 text-3xl"></i>
                  <p className="text-sm font-medium text-slate-200">
                    Drag and drop your video file here, or <span className="text-blue-400 underline">browse</span>
                  </p>
                  <p className="text-xs text-slate-500">Supports .mp4, .avi, .mov, .mkv (Max 500MB)</p>
                </div>
              )}
            </div>
          </div>

          {/* Validation or Analysis Errors */}
          {(validationError || analysisError) && (
            <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-lg text-xs text-red-300 flex items-center gap-2 font-mono">
              <i className="fa-solid fa-triangle-exclamation text-red-400"></i>
              <span>{validationError || analysisError}</span>
            </div>
          )}

          {/* Metadata Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Camera / Feed Name</label>
              <input
                type="text"
                value={cameraName}
                onChange={(e) => setCameraName(e.target.value)}
                disabled={isAnalyzing}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Location Description</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isAnalyzing}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value))}
                  disabled={isAnalyzing}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lng}
                  onChange={(e) => setLng(parseFloat(e.target.value))}
                  disabled={isAnalyzing}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none text-sm"
                  required
                />
              </div>
            </div>
          </div>

          {/* Processing Progress Indicator */}
          {isAnalyzing && progress && (
            <div className="p-4 bg-slate-800/80 border border-blue-500/30 rounded-lg space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-blue-400 font-bold uppercase">{progress.message}</span>
                <span className="text-slate-300 font-bold">{progress.progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={isAnalyzing || !selectedFile}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-900/30"
            >
              {isAnalyzing ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Running YOLO11 Pipeline...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-play"></i>
                  Start Analysis
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isAnalyzing}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 text-white font-bold rounded-lg transition-colors text-sm border border-white/10"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
