import React, { useState } from 'react';
import { Camera } from '../../types';

interface Props {
  onCameraAdded: (camera: Camera) => void;
  onClose: () => void;
}

export const AddCameraModal: React.FC<Props> = ({ onCameraAdded, onClose }) => {
  const [formData, setFormData] = useState({
    camera_name: '',
    camera_type: 'FIXED' as 'FIXED' | 'PTZ' | 'DOME' | 'BULLET',
    latitude: 40.7128,
    longitude: -74.0060,
    city: 'New York',
    state: 'NY',
    country: 'USA',
    zone: 'Sector 1',
    risk_level: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    status: 'ONLINE' as 'ONLINE' | 'OFFLINE' | 'MAINTENANCE',
    video_source: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useMapLocation, setUseMapLocation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/cameras', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create camera');
      }

      const newCamera = await response.json();
      onCameraAdded(newCamera);
      onClose();
    } catch (error) {
      console.error('Error creating camera:', error);
      alert('Failed to create camera');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocationPick = () => {
    // In a real implementation, this would open a map picker
    setUseMapLocation(true);
    // For now, we'll use default coordinates
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">Add New Camera</h2>
            <p className="text-sm text-slate-400">Configure surveillance camera</p>
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
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Basic Information</h3>
            
            <div>
              <label className="block text-xs text-slate-400 mb-1">Camera Name</label>
              <input
                type="text"
                value={formData.camera_name}
                onChange={(e) => setFormData({ ...formData, camera_name: e.target.value })}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Camera Type</label>
                <select
                  value={formData.camera_type}
                  onChange={(e) => setFormData({ ...formData, camera_type: e.target.value as any })}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
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
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="ONLINE">Online</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Location</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleLocationPick}
              className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-map-marker-alt"></i>
              Pick Location on Map
            </button>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Zone</label>
              <input
                type="text"
                value={formData.zone}
                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Risk & Video */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Risk & Video</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Risk Level</label>
                <select
                  value={formData.risk_level}
                  onChange={(e) => setFormData({ ...formData, risk_level: e.target.value as any })}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Status</label>
                <div className="h-10 bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white">
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
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white text-xs focus:border-cyan-500 focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"
              />
              <p className="text-[10px] text-slate-500 mt-1">Or specify path/URL below:</p>
              <input
                type="text"
                value={formData.video_source}
                onChange={(e) => setFormData({ ...formData, video_source: e.target.value })}
                placeholder="assets/videos/category/video.mp4 or URL"
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none mt-1 text-sm"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Creating...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-plus"></i>
                  Add Camera
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white font-bold rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
