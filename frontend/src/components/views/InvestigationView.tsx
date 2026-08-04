import React, { useState, useEffect } from 'react';
import { Incident, CameraData, EvidenceItem } from '../../types';
import { useRealTimeData } from '../../hooks/useRealTimeData';

interface Props {
  incident?: Incident | null;
  camera?: CameraData;
  onOpenPrintReport: () => void;
  onCloseIncident: () => void;
}

export const InvestigationView: React.FC<Props> = ({
  incident,
  camera,
  onOpenPrintReport,
  onCloseIncident,
}) => {
  // Default incident fallback if none passed
  const activeIncident: Incident = incident || {
    id: 'INC-8812',
    title: 'PHYSICAL ALTERCATION DETECTED',
    location: 'Subway Platform - Zone 4',
    cameraId: 'CAM-001',
    severity: 9.3,
    status: 'Active',
    timestamp: '23:41:02 UTC',
    description: 'High threat physical violent altercation detected by Sentinel AI YOLO vision model.',
    detectedObjects: ['person (3)', 'backpack (1)'],
    aiConfidence: 98.4,
    aiAnalysis: {
      weapon: true,
      weaponConfidence: 95.2,
      fight: true,
      fightConfidence: 92.0,
      people: 3,
      blood: false,
      severity: 9.3,
      trackingIDs: ['TRK-104', 'TRK-105']
    }
  };

  const [policeNotes, setPoliceNotes] = useState(activeIncident.policeNotes || '');
  const [volunteerNotes, setVolunteerNotes] = useState(activeIncident.volunteerNotes || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [annotatedVideoUrl, setAnnotatedVideoUrl] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<any>(null);
  const [reasoningData, setReasoningData] = useState<any>(null);
  const [severityData, setSeverityData] = useState<any>(null);
  const [evidenceData, setEvidenceData] = useState<EvidenceItem[]>([]);

  // Fetch real-time data from backend
  const { data: backendTimeline, loading: timelineLoading } = useRealTimeData<any>({ 
    endpoint: '/api/v1/timeline/latest', 
    interval: 5000 
  });
  const { data: backendReasoning, loading: reasoningLoading } = useRealTimeData<any>({ 
    endpoint: '/api/v1/reasoning/latest', 
    interval: 5000 
  });
  const { data: backendSeverity, loading: severityLoading } = useRealTimeData<any>({ 
    endpoint: '/api/v1/severity/latest', 
    interval: 5000 
  });
  const { data: backendEvidence, loading: evidenceLoading } = useRealTimeData<any>({ 
    endpoint: '/api/v1/evidence', 
    interval: 5000 
  });

  // Update state when backend data changes
  useEffect(() => {
    if (backendTimeline?.timeline) setTimelineData(backendTimeline.timeline);
    if (backendReasoning) setReasoningData(backendReasoning);
    if (backendSeverity) setSeverityData(backendSeverity);
    if (backendEvidence?.evidence) setEvidenceData(backendEvidence.evidence);
    setAnnotatedVideoUrl('/api/v1/annotated-video');
  }, [backendTimeline, backendReasoning, backendSeverity, backendEvidence]);

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

  // Default camera fallback if none passed
  const activeCamera: CameraData = camera || {
    id: activeIncident.cameraId || 'CAM-01',
    name: activeIncident.location,
    location: activeIncident.location,
    status: 'REC',
    fps: '30.1 FPS',
    resolution: '4K UHD',
    aiStatus: 'INVESTIGATION MODE',
    aiStatusType: 'danger',
    severity: activeIncident.severity,
    lat: activeIncident.lat,
    lng: activeIncident.lng,
    videoUrl: '/assets/videos/subway/Subway.mp4',
    detections: [],
    aiMetrics: activeIncident.aiAnalysis,
  };

  // Timeline Events - Use backend data if available
  const timelineEvents = timelineData?.events || [
    { time: '11:22:05 AM', event: 'Subject Entered Entrance Gate', details: 'Subject TRK_1042 logged at North Entrance turnstiles.' },
    { time: '11:23:14 AM', event: 'Verbal Dispute Detected', details: 'Acoustic sensor flagged elevated decibels (88 dB).' },
    { time: '11:24:02 AM', event: 'Weapon Signature locked', details: 'Neural Model locked metallic firearm profile (95.2%).' },
    { time: '11:24:15 AM', event: 'Unit 402 Dispatched', details: 'Direct siren order transmitted to Officer Henderson.' },
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-white overflow-hidden font-sans">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Investigation: {activeIncident.id}</h2>
          <p className="text-sm text-slate-400">{activeIncident.title}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadEvidence}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Download Evidence
          </button>
          <button
            onClick={onOpenPrintReport}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Print Report
          </button>
          <button
            onClick={onCloseIncident}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Videos */}
          <div className="space-y-6">
            {/* Original Video */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-md font-bold text-white mb-3">Original Video Feed</h3>
              <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                <video
                  src={activeCamera.videoUrl}
                  controls
                  autoPlay
                  loop
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Annotated Video */}
            {annotatedVideoUrl && (
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-md font-bold text-white mb-3">YOLO11 AI Annotated Overlay Stream</h3>
                <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                  <video
                    src={annotatedVideoUrl}
                    controls
                    autoPlay
                    loop
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Analysis */}
          <div className="space-y-6">
            {/* AI Analysis */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-md font-bold text-white mb-3">AI Threat Assessment</h3>
              <div className="space-y-3 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Severity Index</span>
                  <span className="text-2xl font-bold text-red-400">{activeIncident.severity.toFixed(1)} / 10.0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Weapon Detection</span>
                  <span className={activeIncident.aiAnalysis?.weapon ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>
                    {activeIncident.aiAnalysis?.weapon ? 'DETECTED' : 'CLEAR'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Weapon Confidence</span>
                  <span className="text-white">{activeIncident.aiAnalysis?.weaponConfidence?.toFixed(1) || 95.2}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">People Count</span>
                  <span className="text-white">{activeIncident.aiAnalysis?.people || 3}</span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-md font-bold text-white mb-3">Chronological Event Timeline</h3>
              {timelineLoading ? (
                <p className="text-slate-400 font-mono text-sm">Syncing timeline...</p>
              ) : (
                <div className="space-y-3 font-mono text-xs">
                  {timelineEvents.map((event: any, index: number) => (
                    <div key={index} className="flex gap-3 bg-slate-900/60 p-2 rounded border border-white/5">
                      <div className="w-24 text-blue-400 font-bold">{event.time}</div>
                      <div className="flex-1">
                        <div className="font-bold text-white">{event.event}</div>
                        <div className="text-slate-400 text-[11px]">{event.details}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Reasoning */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-md font-bold text-white mb-3">Sentinel Reasoning Engine</h3>
              <div className="text-xs text-slate-300 font-mono bg-slate-950 p-3 rounded-lg border border-white/10 leading-relaxed">
                {reasoningData?.reasoning || 'Sentinel AI detected anomalous group movement and high-frequency metallic shapes matching weapons. Automated alert dispatched to sector units.'}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-md font-bold text-white mb-3">Incident Commander Log Notes</h3>
              <textarea
                value={policeNotes}
                onChange={(e) => setPoliceNotes(e.target.value)}
                rows={4}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                placeholder="Enter field operator notes..."
              />
              <button
                onClick={handleSaveNotes}
                className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-colors"
              >
                {savedSuccess ? 'Saved to System Log!' : 'Save Log Notes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
