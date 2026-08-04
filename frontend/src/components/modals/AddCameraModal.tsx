import React, { useState } from 'react';
import { CameraData } from '../../types';
import { dataService } from '../../data/dataService';
import { safeFetch } from '../../utils/errorHandling';

interface Props {
  onCameraAdded: (camera: any) => void;
  onClose: () => void;
}

export const AddCameraModal: React.FC<Props> = ({ onCameraAdded, onClose }) => {
  const [formData, setFormData] = useState({
    camera_name: 'Custom City Camera',
    camera_type: 'FIXED' as 'FIXED' | 'PTZ' | 'DOME' | 'BULLET',
    latitude: 13.6298,
    longitude: 78.4785,
    city: 'Madanapalle',
    state: 'AP',
    country: 'India',
    zone: 'Sector 1',
    risk_level: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    status: 'ONLINE' as 'ONLINE' | 'OFFLINE' | 'MAINTENANCE',
    video_source: 'accident_003.mp4'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const camId = `CAM-${Date.now().toString().slice(-4)}`;
      let resolvedVideoUrl = formData.video_source || '/assets/videos/accident/accident_001.mp4';
      if (!resolvedVideoUrl.startsWith('http') && !resolvedVideoUrl.startsWith('/')) {
        resolvedVideoUrl = `/assets/videos/accident/${resolvedVideoUrl}`;
      }

      const newCameraData: CameraData = {
        id: camId,
        name: formData.camera_name || 'New Surveillance Camera',
        location: `${formData.zone} - ${formData.city}, ${formData.state}`,
        status: formData.status === 'ONLINE' ? 'REC' : 'OFFLINE',
        fps: '30.0 FPS',
        resolution: '1080p FHD',
        aiStatus: formData.risk_level === 'CRITICAL' ? 'CRITICAL AI ALERT' : formData.risk_level === 'HIGH' ? 'HIGH THREAT DETECTED' : 'MONITORING',
        aiStatusType: formData.risk_level === 'CRITICAL' ? 'danger' : formData.risk_level === 'HIGH' ? 'warning' : 'info',
        severity: formData.risk_level === 'CRITICAL' ? 9.0 : formData.risk_level === 'HIGH' ? 7.0 : 4.0,
        lat: formData.latitude,
        lng: formData.longitude,
        videoUrl: resolvedVideoUrl,
        detections: [],
        aiMetrics: {
          weapon: false,
          weaponConfidence: 0,
          fight: false,
          fightConfidence: 0,
          people: 1,
          blood: false,
          severity: 4.0,
          trackingIDs: []
        }
      };

      try {
        await safeFetch('/api/cameras', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      } catch (err) {
        console.warn('Backend API /api/cameras offline — registered camera locally', err);
      }

      dataService.addCamera(newCameraData);
      onCameraAdded(newCameraData);
      onClose();
    } catch (error) {
      console.error('Error creating camera:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 font-sans select-none">
      <div className="bg-slate-900 border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">Add New Camera Stream</h2>
            <p className="text-xs text-slate-400 font-mono">Configure CCTV stream parameters</p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">Basic Information</h3>
            
            <div>
              <label className="block text-xs text-slate-400 font-mono mb-1">Camera Name</label>
              <input
                type="text"
                value={formData.camera_name}
                onChange={(e) => setFormData({ ...formData, camera_name: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4 font-mono text-sm">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Camera Type</label>
                <select
                  value={formData.camera_type}
                  onChange={(e) => setFormData({ ...formData, camera_type: e.target.value as any })}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="FIXED">Fixed</option>
                  <option value="PTZ">PTZ</option>
                  <option value="DOME">Dome</option>
                  <option value="BULLET">Bullet</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="ONLINE">ONLINE</option>
                  <option value="OFFLINE">OFFLINE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">Location</h3>
            
            <div className="grid grid-cols-2 gap-4 font-mono text-sm">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 font-mono text-sm">
              <div>
                <label className="block text-xs text-slate-400 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-mono mb-1">Zone</label>
              <input
                type="text"
                value={formData.zone}
                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Risk & Video */}
          <div className="space-y-4 font-mono">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Risk & Video</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Risk Level</label>
                <select
                  value={formData.risk_level}
                  onChange={(e) => setFormData({ ...formData, risk_level: e.target.value as any })}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Status</label>
                <div className="h-10 bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white flex items-center">
                  {formData.status}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Video Source File</label>
              <input
                type="file"
                accept=".mp4,.avi,.mov,.mkv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFormData({ ...formData, video_source: file.name });
                  }
                }}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white text-xs focus:border-cyan-500 focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"
              />
              <p className="text-[10px] text-slate-500 mt-1">Or specify file name / URL:</p>
              <input
                type="text"
                value={formData.video_source}
                onChange={(e) => setFormData({ ...formData, video_source: e.target.value })}
                placeholder="accident_003.mp4"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none mt-1 text-sm font-mono"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/10 font-mono">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Creating Stream...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-plus"></i>
                  Add Camera Stream
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
