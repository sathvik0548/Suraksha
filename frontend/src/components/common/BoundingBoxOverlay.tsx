import React, { useEffect, useRef } from 'react';
import { DetectionBox } from '../../types';

interface Props {
  detections: DetectionBox[];
  containerRef?: React.RefObject<HTMLDivElement | null>;
  showTrackingId?: boolean;
  showConfidence?: boolean;
}

export const BoundingBoxOverlay: React.FC<Props> = ({
  detections,
  containerRef,
  showTrackingId = true,
  showConfidence = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let scanLineY = 0;

    const render = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const width = parent.clientWidth;
      const height = parent.clientHeight;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      // Draw subtle futuristic scan grid line
      scanLineY = (scanLineY + 1.5) % height;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.moveTo(0, scanLineY);
      ctx.lineTo(width, scanLineY);
      ctx.stroke();

      // Render combined impact area if multiple high-threat or collision objects exist
      if (detections.length >= 2) {
        let minX = width, minY = height, maxX = 0, maxY = 0;
        detections.forEach((b) => {
          const bx = (b.x / 100) * width;
          const by = (b.y / 100) * height;
          const bw = (b.w / 100) * width;
          const bh = (b.h / 100) * height;
          minX = Math.min(minX, bx);
          minY = Math.min(minY, by);
          maxX = Math.max(maxX, bx + bw);
          maxY = Math.max(maxY, by + bh);
        });

        // Add 8px padding around impact area
        minX = Math.max(0, minX - 8);
        minY = Math.max(0, minY - 8);
        maxX = Math.min(width, maxX + 8);
        maxY = Math.min(height, maxY + 8);

        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        ctx.setLineDash([]); // Reset dash

        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.fillRect(minX, minY - 14, 110, 14);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('IMPACT THREAT ZONE', minX + 4, minY - 3);
      }

      // Render detection bounding boxes
      detections.forEach((box) => {
        const bx = (box.x / 100) * width;
        const by = (box.y / 100) * height;
        const bw = (box.w / 100) * width;
        const bh = (box.h / 100) * height;

        const primaryColor = box.color || '#3b82f6';

        // Semi-transparent box fill
        ctx.fillStyle = primaryColor === '#ef4444' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.12)';
        ctx.fillRect(bx, by, bw, bh);

        // Bounding Box Hairline
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, by, bw, bh);

        // Corner Brackets (Tactical Vision HUD style)
        const bracketLength = Math.min(bw, bh, 12);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;

        // Top Left
        ctx.beginPath();
        ctx.moveTo(bx, by + bracketLength);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + bracketLength, by);
        ctx.stroke();

        // Top Right
        ctx.beginPath();
        ctx.moveTo(bx + bw - bracketLength, by);
        ctx.lineTo(bx + bw, by);
        ctx.lineTo(bx + bw, by + bracketLength);
        ctx.stroke();

        // Bottom Left
        ctx.beginPath();
        ctx.moveTo(bx, by + bh - bracketLength);
        ctx.lineTo(bx, by + bh);
        ctx.lineTo(bx + bracketLength, by + bh);
        ctx.stroke();

        // Bottom Right
        ctx.beginPath();
        ctx.moveTo(bx + bw - bracketLength, by + bh);
        ctx.lineTo(bx + bw, by + bh);
        ctx.lineTo(bx + bw, by + bh - bracketLength);
        ctx.stroke();

        // Label Badge Top
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        const labelText = showConfidence ? box.label : box.type.toUpperCase();
        const textMetrics = ctx.measureText(labelText);
        const badgeWidth = textMetrics.width + 10;
        const badgeHeight = 16;

        ctx.fillStyle = primaryColor;
        ctx.fillRect(bx - 1, by - badgeHeight, badgeWidth, badgeHeight);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, bx + 4, by - 4);

        // Tracking ID Badge Bottom Right
        if (showTrackingId && box.trackId) {
          ctx.font = '9px "JetBrains Mono", monospace';
          const trackText = box.trackId;
          const trkWidth = ctx.measureText(trackText).width + 8;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.fillRect(bx + bw - trkWidth, by + bh, trkWidth, 14);

          ctx.fillStyle = '#60a5fa';
          ctx.fillText(trackText, bx + bw - trkWidth + 4, by + bh + 10);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [detections, showTrackingId, showConfidence]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
    />
  );
};
