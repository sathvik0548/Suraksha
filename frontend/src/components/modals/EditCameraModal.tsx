import React, { useState } from 'react';
import { CameraData } from '../../types';
import { dataService } from '../../data/dataService';
import { safeFetch } from '../../utils/errorHandling';

interface Props {
  camera: CameraData;
  onClose: () => void;
  onCameraUpdated: (camera: CameraData) => void;
}

export const EditCameraModal: React.FC<Props> = ({ camera, onClose, onCameraUpdated }) => {
  const [formData, setFormData] = useState({
    camera_name: camera.name,
    location: camera.location,
    latitude: camera.lat,
    longitude: camera.lng,
    status: camera.status === 'REC' ? 'ONLINE' : 'OFFLINE',
    video_source: camera.videoUrl
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updatedCam: CameraData = {
        ...camera,
        name: formData.camera_name,
        location: formData.location,
        lat: formData.latitude,
        lng: formData.longitude,
        status: formData.status === 'ONLINE' ? 'REC' : 'OFFLINE',
        videoUrl: formData.video_source
      };

      try {
        await safeFetch(`/api/cameras/${camera.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } catch (err) {
        console.warn('Backend API /api/cameras offline — updated camera locally', err);
      }

      dataService.updateCamera(updatedCam);
      onCameraUpdated(updatedCam);
      onClose();
    } catch (error) {
      console.error('Error updating camera:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 font-sans select-none">
      <div className="bg-slate-900 border border-white/10 rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-pen-to-square text-cyan-400"></i> Edit Camera Metadata
            </h2>
            <p className="text-xs text-slate-400 font-mono">Modify parameters for {camera.id}</p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 font-mono text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Camera Name</label>
            <input
              type="text"
              value={formData.camera_name}
              onChange={(e) => setFormData({ ...formData, camera_name: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Location Description</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="ONLINE">ONLINE</option>
                <option value="OFFLINE">OFFLINE</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Video Source</label>
              <input
                type="text"
                value={formData.video_source}
                onChange={(e) => setFormData({ ...formData, video_source: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Updating...' : 'Save Camera Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
