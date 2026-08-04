import React, { useState, useEffect, useRef } from 'react';
import { CameraData } from '../../types';
import { BoundingBoxOverlay } from './BoundingBoxOverlay';

interface Props {
  camera: CameraData;
  onExpand?: (camera: CameraData) => void;
  showAiOverlay?: boolean;
}

export const CctvPlayer: React.FC<Props> = ({ camera, onExpand, showAiOverlay = true }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [timestamp, setTimestamp] = useState<string>('');

  // Generate smooth high-tech synthetic canvas CCTV feed if MP4 fails or is loading
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    const updateClock = () => {
      const now = new Date();
      setTimestamp(now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0').slice(0, 2));
    };
    updateClock();
    intervalId = setInterval(updateClock, 100);
    return () => clearInterval(intervalId);
  }, []);

  // Synthetic Canvas Video Generator fallback if video source is local
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let step = 0;

    const drawSyntheticFeed = () => {
      const w = canvas.width || 640;
      const h = canvas.height || 360;
      step += 0.05;

      // Dark surveillance background
      ctx.fillStyle = '#0a0d12';
      ctx.fillRect(0, 0, w, h);

      // Perspective grid lines representing surveillance area
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + Math.sin(step) * 10, h);
        ctx.stroke();
      }
      for (let j = 0; j < h; j += 30) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(w, j);
        ctx.stroke();
      }

      // Simulated surveillance movement objects (Silhouettes)
      ctx.fillStyle = 'rgba(51, 65, 85, 0.8)';
      ctx.beginPath();
      ctx.arc(w * 0.3 + Math.sin(step * 0.8) * 30, h * 0.4, 25, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(w * 0.6 + Math.cos(step * 0.5) * 40, h * 0.55, 30, 0, Math.PI * 2);
      ctx.fill();

      // Camera lens vignette effect
      const gradient = ctx.createRadialGradient(w / 2, h / 2, h / 3, w / 2, h / 2, w / 1.5);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      animId = requestAnimationFrame(drawSyntheticFeed);
    };

    drawSyntheticFeed();

    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative bg-slate-950 border border-white/10 rounded-lg overflow-hidden group shadow-lg flex flex-col h-full"
    >
      {/* Video Container Area */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center min-h-[180px]">
        {/* Synthetic Canvas Footage Stream */}
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* HTML5 Video Layer (Loops Muted Automatically) */}
        <video
          ref={videoRef}
          src={camera.videoUrl}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-80"
          onError={(e) => {
            // Silently fall back to canvas generator
            (e.target as HTMLVideoElement).style.display = 'none';
          }}
        />

        {/* Transparent Canvas Bounding Box Layer */}
        {showAiOverlay && (
          <BoundingBoxOverlay
            detections={camera.detections}
            containerRef={containerRef}
          />
        )}

        {/* Top Camera Header Controls */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-20 pointer-events-none">
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Status Indicator */}
            {camera.status === 'REC' ? (
              <span className="px-1.5 py-0.5 bg-red-600 text-white text-[8px] font-bold rounded flex items-center gap-1 uppercase tracking-wider animate-pulse shadow-red-900/50 shadow-md">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span> REC
              </span>
            ) : camera.status === 'WEAK_SIGNAL' ? (
              <span className="px-1.5 py-0.5 bg-amber-600 text-white text-[8px] font-bold rounded flex items-center gap-1 uppercase tracking-wider">
                <i className="fa-solid fa-triangle-exclamation text-[7px]"></i> WEAK SIGNAL
              </span>
            ) : (
              <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-bold rounded uppercase tracking-wider">
                AI ACTIVE
              </span>
            )}

            {/* Camera Tag */}
            <span className="px-1.5 py-0.5 bg-black/70 backdrop-blur-md border border-white/10 text-slate-200 text-[9px] font-mono font-bold rounded">
              {camera.id}
            </span>
          </div>

          <div className="flex items-center gap-1 pointer-events-auto">
            {/* Severity Tag */}
            <span
              className={`px-1.5 py-0.5 text-[8px] font-mono font-bold rounded border ${
                camera.severity >= 8.0
                  ? 'bg-red-950/80 border-red-500/50 text-red-400'
                  : camera.severity >= 6.0
                  ? 'bg-amber-950/80 border-amber-500/50 text-amber-400'
                  : 'bg-blue-950/80 border-blue-500/50 text-blue-400'
              }`}
            >
              SEV: {camera.severity}
            </span>

            {/* Expand Fullscreen Button */}
            {onExpand && (
              <button
                onClick={() => onExpand(camera)}
                className="w-6 h-6 bg-black/60 hover:bg-blue-600 text-slate-300 hover:text-white rounded flex items-center justify-center transition-colors border border-white/10"
                title="Expand Fullscreen"
              >
                <i className="fa-solid fa-expand text-[10px]"></i>
              </button>
            )}
          </div>
        </div>

        {/* Bottom CCTV Overlay Telemetry Bar */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-20 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-slate-300 font-bold bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm border border-white/5 truncate max-w-[160px]">
              {camera.name.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[9px]">
            <span className="text-blue-400 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm border border-white/5">
              {camera.fps}
            </span>
            <span className="text-slate-400 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm border border-white/5">
              {timestamp || '11:24:08.92'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Information Footer */}
      <div className="px-3 py-2 bg-slate-900/90 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-1.5 text-slate-400 truncate">
          <i className="fa-solid fa-location-dot text-blue-500 text-[9px]"></i>
          <span className="truncate">{camera.location}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-slate-500 uppercase">{camera.resolution}</span>
        </div>
      </div>
    </div>
  );
};
