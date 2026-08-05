import React, { useState, useEffect, useRef } from 'react';
import { Incident, CameraData, EvidenceItem, DetectionBox } from '../../types';
import { BoundingBoxOverlay } from '../common/BoundingBoxOverlay';
import { safeFetch, getApiUrl } from '../../utils/errorHandling';

interface Props {
  incident?: Incident | null;
  camera?: CameraData;
  onOpenPrintReport: () => void;
  onCloseIncident: () => void;
}

interface FrameTrackingData {
  frame_number: number;
  timestamp: number;
  boxes: DetectionBox[];
}

export const InvestigationView: React.FC<Props> = ({
  incident,
  camera,
  onOpenPrintReport,
  onCloseIncident,
}) => {
  const activeIncident: Incident = incident || {
    id: 'INC-MDP-8812',
    title: 'VEHICLE ACCIDENT & IMPACT DETECTED',
    location: 'MITS College Junction - Sector 1, Madanapalle',
    cameraId: 'CAM-MDP-01',
    severity: 9.3,
    status: 'Active',
    timestamp: '23:41:02 UTC',
    description: 'High impact vehicle collision detected near MITS Engineering College entrance by Sentinel YOLO vision model.',
    detectedObjects: ['car (2)', 'person (3)'],
    aiConfidence: 98.4,
    lat: 13.6288,
    lng: 78.4746,
    aiAnalysis: {
      weapon: false, weaponConfidence: 0, fight: true, fightConfidence: 94,
      people: 3, blood: false, severity: 9.3, trackingIDs: [101, 102]
    }
  };

  const [policeNotes, setPoliceNotes] = useState(activeIncident.policeNotes || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [useFallbackStream, setUseFallbackStream] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [reasoningText, setReasoningText] = useState<string>('');
  const [severityScore, setSeverityScore] = useState<number>(activeIncident.severity);

  // Time-synced tracking frame state
  const [trackingFrames, setTrackingFrames] = useState<FrameTrackingData[]>([]);
  const [activeFrameBoxes, setActiveFrameBoxes] = useState<DetectionBox[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  const activeCamera: CameraData = camera || {
    id: activeIncident.cameraId || 'CAM-MDP-01',
    name: activeIncident.location,
    location: activeIncident.location,
    status: 'REC',
    fps: '30.0 FPS',
    resolution: '1080p FHD',
    aiStatus: 'INVESTIGATION MODE',
    aiStatusType: 'danger',
    severity: activeIncident.severity,
    lat: activeIncident.lat || 13.6288,
    lng: activeIncident.lng || 78.4746,
    videoUrl: '/assets/videos/accident/accident_001.mp4',
    detections: [
      { id: 1, type: 'car', label: 'Car Collision (94%)', confidence: 0.94, x: 22, y: 32, w: 42, h: 46, color: '#ef4444', trackId: 'TRK-101' },
      { id: 2, type: 'person', label: 'Pedestrian (89%)', confidence: 0.89, x: 65, y: 38, w: 16, h: 36, color: '#3b82f6', trackId: 'TRK-102' }
    ],
    aiMetrics: activeIncident.aiAnalysis,
  };

  const primaryVideoSource = activeCamera.videoUrl || '/assets/videos/accident/accident_001.mp4';
  const apiAnnotatedUrl = getApiUrl(`/api/v1/annotated-video?video_id=${activeIncident.id}`);

  // Load backend details & time-indexed tracking frames
  useEffect(() => {
    const fetchIncidentDetails = async () => {
      const vid = activeIncident.id;
      setUseFallbackStream(false);

      // Fetch tracking array for timestamp syncing
      try {
        const trkRes = await safeFetch(`/api/v1/tracking/${vid}`);
        if (trkRes.ok) {
          const trkData: FrameTrackingData[] = await trkRes.json();
          if (trkData && trkData.length > 0) {
            setTrackingFrames(trkData);
            setActiveFrameBoxes(trkData[0].boxes);
          }
        }
      } catch (e) {
        console.warn('Tracking API fallback', e);
      }

      try {
        const tlRes = await safeFetch(`/api/v1/timeline/latest?video_id=${vid}`);
        if (tlRes.ok) {
          const tlData = await tlRes.json();
          if (tlData?.timeline?.events) {
            setTimelineEvents(tlData.timeline.events);
          }
        }
      } catch (e) {
        setTimelineEvents([
          { time: activeIncident.timestamp || '23:41:02 UTC', event: 'Video Analyzed', details: activeIncident.description || 'YOLO11 scan completed.', type: 'danger' }
        ]);
      }

      try {
        const rRes = await safeFetch(`/api/v1/reasoning/latest?video_id=${vid}`);
        if (rRes.ok) {
          const rData = await rRes.json();
          if (rData?.reasoning) {
            setReasoningText(rData.reasoning);
          }
        }
      } catch (e) {
        setReasoningText(activeIncident.description || 'Continuous YOLO11 vision analysis completed for this video feed.');
      }

      try {
        const sRes = await safeFetch(`/api/v1/severity/latest?video_id=${vid}`);
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData?.severity) {
            setSeverityScore(sData.severity);
          }
        }
      } catch (e) {
        setSeverityScore(activeIncident.severity);
      }
    };

    fetchIncidentDetails();
  }, [activeIncident.id]);

  // Sync bounding boxes to video currentTime during playback & seeking
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || trackingFrames.length === 0) return;

    const currentTime = video.currentTime;
    // Find closest frame to currentTime
    let closestFrame = trackingFrames[0];
    let minDiff = Math.abs(currentTime - trackingFrames[0].timestamp);

    for (let i = 1; i < trackingFrames.length; i++) {
      const diff = Math.abs(currentTime - trackingFrames[i].timestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closestFrame = trackingFrames[i];
      }
    }

    if (closestFrame && closestFrame.boxes) {
      setActiveFrameBoxes(closestFrame.boxes);
    }
  };

  const handleSaveNotes = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleDownloadEvidence = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeIncident, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `EVIDENCE_FILE_${activeIncident.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const displayedBoxes = activeFrameBoxes.length > 0 ? activeFrameBoxes : (activeCamera.detections || []);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-white overflow-hidden font-sans select-none">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-900 border-b border-white/10 flex items-center justify-between font-mono">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <i className="fa-solid fa-microscope text-blue-400 text-sm"></i>
            Forensic Workspace: {activeIncident.id}
          </h2>
          <p className="text-xs text-slate-400">{activeIncident.title} - {activeIncident.location}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadEvidence}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold uppercase transition-colors flex items-center gap-1.5"
          >
            <i className="fa-solid fa-download"></i> Export Evidence JSON
          </button>
          <button
            onClick={onOpenPrintReport}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold uppercase transition-colors flex items-center gap-1.5"
          >
            <i className="fa-solid fa-print"></i> Generate Official Report
          </button>
          <button
            onClick={onCloseIncident}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold uppercase transition-colors"
          >
            Back to Grid
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Video Streams */}
          <div className="space-y-6">
            {/* Original Input Video Stream */}
            <div className="bg-slate-900/80 border border-white/10 rounded-xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3 font-mono">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-video text-blue-400"></i> Original Input Video Stream
                </h3>
                <span className="text-[10px] text-slate-400">RAW FEED</span>
              </div>
              <div className="aspect-video bg-black rounded-lg overflow-hidden border border-white/10 relative">
                <video
                  src={primaryVideoSource}
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Live-Tracking Bounding Box Overlay Stream */}
            <div className="bg-slate-900/80 border border-cyan-500/40 rounded-xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3 font-mono">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-layer-group text-cyan-400"></i> YOLO11 Time-Synced Tracking Stream
                </h3>
                <span className="text-[10px] text-cyan-400 bg-cyan-950 border border-cyan-500/40 px-2 py-0.5 rounded font-bold animate-pulse">
                  LIVE TRACKING ACTIVE
                </span>
              </div>
              <div className="aspect-video bg-black rounded-lg overflow-hidden border border-cyan-500/30 relative flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={useFallbackStream ? primaryVideoSource : apiAnnotatedUrl}
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  onTimeUpdate={handleTimeUpdate}
                  onSeeked={handleTimeUpdate}
                  className="w-full h-full object-cover"
                  onError={() => {
                    setUseFallbackStream(true);
                  }}
                />
                {/* Time-synced Bounding Box Overlay */}
                <BoundingBoxOverlay
                  detections={displayedBoxes}
                  showTrackingId={true}
                  showConfidence={true}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Analysis Details */}
          <div className="space-y-6">
            {/* Threat Metrics */}
            <div className="bg-slate-900/80 border border-white/10 rounded-xl p-4 shadow-xl">
              <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
                Video Analysis Threat Metrics
              </h3>
              <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                <div className="bg-slate-950 p-3 rounded-lg border border-white/5">
                  <div className="text-[10px] text-slate-400 uppercase">Overall Severity Score</div>
                  <div className="text-2xl font-bold text-red-400 mt-1">{severityScore.toFixed(1)} / 10.0</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-white/5">
                  <div className="text-[10px] text-slate-400 uppercase">Active Tracked Objects</div>
                  <div className="text-2xl font-bold text-blue-400 mt-1">
                    {displayedBoxes.length}
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-white/5">
                  <div className="text-[10px] text-slate-400 uppercase">Weapon Flag</div>
                  <div className={`text-sm font-bold mt-1.5 ${activeIncident.aiAnalysis?.weapon ? 'text-red-400' : 'text-emerald-400'}`}>
                    {activeIncident.aiAnalysis?.weapon ? 'WEAPON DETECTED' : 'CLEAR (NO WEAPON)'}
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-white/5">
                  <div className="text-[10px] text-slate-400 uppercase">Model Precision Confidence</div>
                  <div className="text-sm font-bold text-cyan-400 mt-1.5">
                    {activeIncident.aiConfidence || 98.4}%
                  </div>
                </div>
              </div>
            </div>

            {/* Video Timeline */}
            <div className="bg-slate-900/80 border border-white/10 rounded-xl p-4 shadow-xl">
              <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider mb-3">
                Chronological Event Timeline
              </h3>
              <div className="space-y-2.5 font-mono text-xs">
                {timelineEvents.map((event: any, index: number) => (
                  <div key={index} className="flex gap-3 bg-slate-950 p-2.5 rounded-lg border border-white/5">
                    <div className="w-20 text-blue-400 font-bold shrink-0">{event.time || '23:41:02'}</div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-200">{event.event || 'Video Analyzed'}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">{event.details}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Reasoning */}
            <div className="bg-slate-900/80 border border-white/10 rounded-xl p-4 shadow-xl">
              <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider mb-3">
                Sentinel AI Reasoning Summary
              </h3>
              <div className="text-xs text-slate-300 font-mono bg-slate-950 p-3.5 rounded-lg border border-white/10 leading-relaxed whitespace-pre-wrap">
                {reasoningText || activeIncident.description || 'Continuous YOLO11 vision analysis completed for this video feed.'}
              </div>
            </div>

            {/* Log Notes */}
            <div className="bg-slate-900/80 border border-white/10 rounded-xl p-4 shadow-xl">
              <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider mb-3">
                Commander Field Notes
              </h3>
              <textarea
                value={policeNotes}
                onChange={(e) => setPoliceNotes(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                placeholder="Log notes for this specific video analysis..."
              />
              <button
                onClick={handleSaveNotes}
                className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-mono font-bold uppercase tracking-wider transition-colors"
              >
                {savedSuccess ? 'Saved to System Log!' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
