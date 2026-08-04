import React, { useState, useEffect } from 'react';
import { Incident, CameraData, EvidenceItem } from '../../types';
import { useRealTimeData } from '../../hooks/useRealTimeData';

interface Props {
  incident: Incident;
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
  const [policeNotes, setPoliceNotes] = useState(incident.policeNotes || '');
  const [volunteerNotes, setVolunteerNotes] = useState(incident.volunteerNotes || '');
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
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(incident, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `EVIDENCE_FILE_${incident.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Default camera fallback if none passed
  const activeCamera: CameraData = camera || {
    id: incident.cameraId || 'CAM-01',
    name: incident.location,
    location: incident.location,
    status: 'REC',
    fps: '30.1 FPS',
    resolution: '4K UHD',
    aiStatus: 'INVESTIGATION MODE',
    aiStatusType: 'danger',
    severity: incident.severity,
    lat: incident.lat,
    lng: incident.lng,
    videoUrl: '/videos/road.mp4',
    detections: [],
    aiMetrics: incident.aiAnalysis,
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
          <h2 className="text-lg font-bold text-white">Investigation: {incident.id}</h2>
          <p className="text-sm text-slate-400">{incident.title}</p>
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
              <h3 className="text-md font-bold text-white mb-3">Original Video</h3>
              <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden">
                <video
                  src={activeCamera.videoUrl}
                  controls
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Annotated Video */}
            {annotatedVideoUrl && (
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-md font-bold text-white mb-3">Annotated Video</h3>
                <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden">
                  <video
                    src={annotatedVideoUrl}
                    controls
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
              <h3 className="text-md font-bold text-white mb-3">AI Analysis</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Severity</span>
                  <span className="text-2xl font-bold text-red-400">{incident.severity.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Weapon Detected</span>
                  <span className={incident.aiAnalysis.weapon ? 'text-red-400' : 'text-green-400'}>
                    {incident.aiAnalysis.weapon ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Weapon Confidence</span>
                  <span className="text-white">{incident.aiAnalysis.weaponConfidence.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">People Count</span>
                  <span className="text-white">{incident.aiAnalysis.people}</span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-md font-bold text-white mb-3">Timeline</h3>
              {timelineLoading ? (
                <p className="text-slate-400">Loading timeline...</p>
              ) : (
                <div className="space-y-3">
                  {timelineEvents.map((event: any, index: number) => (
                    <div key={index} className="flex gap-3">
                      <div className="w-24 text-sm text-blue-400 font-mono">{event.time}</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{event.event}</div>
                        <div className="text-xs text-slate-400">{event.details}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Reasoning */}
            {reasoningData && (
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-md font-bold text-white mb-3">AI Reasoning</h3>
                {reasoningLoading ? (
                  <p className="text-slate-400">Loading reasoning...</p>
                ) : (
                  <div className="text-sm text-slate-300 whitespace-pre-wrap">
                    {reasoningData.reasoning || 'Analysis pending...'}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-md font-bold text-white mb-3">Investigation Notes</h3>
              <textarea
                value={policeNotes}
                onChange={(e) => setPoliceNotes(e.target.value)}
                rows={4}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter investigation notes..."
              />
              <button
                onClick={handleSaveNotes}
                className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {savedSuccess ? 'Saved!' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
