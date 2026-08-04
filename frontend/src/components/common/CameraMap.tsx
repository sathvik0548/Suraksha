import React, { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Camera {
  camera_id: string;
  camera_name: string;
  latitude: number;
  longitude: number;
  status: string;
  risk_level: string;
}

interface MapProps {
  cameras: Camera[];
  onCameraClick?: (camera: Camera) => void;
  onAnalyze?: (camera: Camera) => void;
}

export const CameraMap: React.FC<MapProps> = ({ cameras, onCameraClick, onAnalyze }) => {
  const mapRef = React.useRef<L.Map | null>(null);
  const mapContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Leaflet map centered on Madanapalle, AP, India
    const madanapalleCenter: [number, number] = [13.6288, 78.4746];
    mapRef.current = L.map(mapContainerRef.current).setView(madanapalleCenter, 14);

    // Dark high-tech tile layer for surveillance dashboard look
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors | Madanapalle Command Sector'
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapRef.current?.removeLayer(layer);
      }
    });

    const validCameras = cameras.filter((c) => c.latitude && c.longitude);

    // Add markers for each camera
    validCameras.forEach((camera) => {
      const markerColor = getMarkerColor(camera.status, camera.risk_level);

      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          background-color: ${markerColor};
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 0 15px ${markerColor};
        "></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([camera.latitude, camera.longitude], { icon: customIcon })
        .addTo(mapRef.current!)
        .bindPopup(`
          <div style="min-width: 220px; font-family: monospace;">
            <h3 style="margin: 0 0 6px 0; font-weight: bold; color: #0f172a;">${camera.camera_name}</h3>
            <p style="margin: 3px 0; font-size: 11px; color: #475569;">GPS: ${camera.latitude.toFixed(4)} N, ${camera.longitude.toFixed(4)} E</p>
            <p style="margin: 3px 0; font-size: 11px; color: #475569;">Status: <b>${camera.status}</b> | Risk: <b style="color: ${markerColor}">${camera.risk_level}</b></p>
            <div style="margin-top: 10px; display: flex; gap: 6px;">
              <button onclick="window.viewCamera('${camera.camera_id}')" 
                style="padding: 5px 10px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;">
                View CCTV Stream
              </button>
            </div>
          </div>
        `);

      marker.on('click', () => {
        onCameraClick?.(camera);
      });
    });

    // Fit map to markers bounds if valid
    if (validCameras.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(validCameras.map((c) => [c.latitude, c.longitude]));
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [cameras, onCameraClick]);

  // Expose functions to window for popup buttons
  useEffect(() => {
    (window as any).viewCamera = (cameraId: string) => {
      const camera = cameras.find((c) => c.camera_id === cameraId);
      if (camera) onCameraClick?.(camera);
    };

    (window as any).analyzeCamera = (cameraId: string) => {
      const camera = cameras.find((c) => c.camera_id === cameraId);
      if (camera) onAnalyze?.(camera);
    };
  }, [cameras, onCameraClick, onAnalyze]);

  const getMarkerColor = (status: string, riskLevel: string): string => {
    if (status !== 'ONLINE' && status !== 'REC') return '#64748b'; // Gray for offline
    if (riskLevel === 'CRITICAL') return '#ef4444'; // Red
    if (riskLevel === 'HIGH') return '#f97316'; // Orange
    if (riskLevel === 'MEDIUM') return '#eab308'; // Yellow
    return '#10b981'; // Green for low
  };

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full rounded-lg"
      style={{ minHeight: '400px' }}
    />
  );
};
