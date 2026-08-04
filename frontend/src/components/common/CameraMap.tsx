import React, { useState, useEffect } from 'react';
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

    // Initialize map
    mapRef.current = L.map(mapContainerRef.current).setView([40.7128, -74.0060], 13);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
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

    // Add markers for each camera
    cameras.forEach(camera => {
      const markerColor = getMarkerColor(camera.status, camera.risk_level);
      
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          background-color: ${markerColor};
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([camera.latitude, camera.longitude], { icon: customIcon })
        .addTo(mapRef.current!)
        .bindPopup(`
          <div style="min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold;">${camera.camera_name}</h3>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">Status: ${camera.status}</p>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">Risk: ${camera.risk_level}</p>
            <div style="margin-top: 12px; display: flex; gap: 8px;">
              <button onclick="window.viewCamera('${camera.camera_id}')" 
                style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                View
              </button>
              <button onclick="window.analyzeCamera('${camera.camera_id}')"
                style="padding: 6px 12px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Analyze
              </button>
            </div>
          </div>
        `);

      marker.on('click', () => {
        onCameraClick?.(camera);
      });
    });
  }, [cameras, onCameraClick]);

  // Expose functions to window for popup buttons
  useEffect(() => {
    (window as any).viewCamera = (cameraId: string) => {
      const camera = cameras.find(c => c.camera_id === cameraId);
      if (camera) onCameraClick?.(camera);
    };

    (window as any).analyzeCamera = (cameraId: string) => {
      const camera = cameras.find(c => c.camera_id === cameraId);
      if (camera) onAnalyze?.(camera);
    };
  }, [cameras, onCameraClick, onAnalyze]);

  const getMarkerColor = (status: string, riskLevel: string): string => {
    if (status !== 'ONLINE') return '#6b7280'; // Gray for offline
    if (riskLevel === 'CRITICAL') return '#ef4444'; // Red
    if (riskLevel === 'HIGH') return '#f97316'; // Orange
    if (riskLevel === 'MEDIUM') return '#eab308'; // Yellow
    return '#22c55e'; // Green for low
  };

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full rounded-lg"
      style={{ minHeight: '400px' }}
    />
  );
};
