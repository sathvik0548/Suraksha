import React, { useState, useEffect } from 'react';

interface BrainStatus {
  status: 'ONLINE' | 'PROCESSING' | 'ERROR';
  currentCamera: string;
  objectsDetected: number;
  threatScore: number;
  reasoning: string;
  aiConfidence: number;
  currentFps: number;
  latestIncident: string | null;
}

export const BrainPanel: React.FC = () => {
  const [brainStatus, setBrainStatus] = useState<BrainStatus>({
    status: 'ONLINE',
    currentCamera: 'CAM-01',
    objectsDetected: 0,
    threatScore: 1.0,
    reasoning: 'Monitoring...',
    aiConfidence: 0.95,
    currentFps: 30.0,
    latestIncident: null
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [neuralAnimation, setNeuralAnimation] = useState(0);

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setBrainStatus(prev => ({
        ...prev,
        objectsDetected: Math.floor(Math.random() * 10),
        threatScore: 1.0 + Math.random() * 3,
        currentFps: 28 + Math.random() * 4,
        reasoning: generateReasoning()
      }));

      // Add log
      const newLog = generateLog();
      setLogs(prev => [...prev.slice(-9), newLog]);

      // Animate neural network
      setNeuralAnimation(prev => (prev + 1) % 360);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const generateReasoning = () => {
    const reasonings = [
      'Scanning perimeter...',
      'Analyzing movement patterns...',
      'Evaluating threat vectors...',
      'Processing detection data...',
      'Updating risk assessment...',
      'Monitoring crowd density...',
      'Tracking object trajectories...',
      'Calculating severity scores...'
    ];
    return reasonings[Math.floor(Math.random() * reasonings.length)];
  };

  const generateLog = () => {
    const actions = [
      'Detection completed',
      'Track updated',
      'Event logged',
      'Analysis refreshed',
      'Metrics updated',
      'Status checked'
    ];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const time = new Date().toLocaleTimeString();
    return `[${time}] ${action}`;
  };

  const getStatusColor = () => {
    switch (brainStatus.status) {
      case 'ONLINE': return 'text-green-400';
      case 'PROCESSING': return 'text-blue-400';
      case 'ERROR': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-4 relative overflow-hidden">
      {/* Neural Network Background Animation */}
      <div className="absolute inset-0 opacity-10">
        <svg
          className="w-full h-full"
          style={{
            animation: `spin 20s linear infinite`,
            transformOrigin: 'center'
          }}
        >
          <circle cx="50%" cy="50%" r="40%" fill="none" stroke="cyan" strokeWidth="1" />
          <circle cx="50%" cy="50%" r="30%" fill="none" stroke="cyan" strokeWidth="1" />
          <circle cx="50%" cy="50%" r="20%" fill="none" stroke="cyan" strokeWidth="1" />
        </svg>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <h3 className="text-sm font-bold text-cyan-400 font-mono">SENTINEL AI BRAIN</h3>
        </div>
        <div className={`text-xs font-mono ${getStatusColor()}`}>
          {brainStatus.status}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
        <div className="bg-slate-800/50 p-3 rounded border border-cyan-500/20">
          <p className="text-[10px] text-slate-400 mb-1">CURRENT CAMERA</p>
          <p className="text-sm font-bold text-white font-mono">{brainStatus.currentCamera}</p>
        </div>
        <div className="bg-slate-800/50 p-3 rounded border border-cyan-500/20">
          <p className="text-[10px] text-slate-400 mb-1">OBJECTS DETECTED</p>
          <p className="text-sm font-bold text-cyan-400 font-mono">{brainStatus.objectsDetected}</p>
        </div>
        <div className="bg-slate-800/50 p-3 rounded border border-cyan-500/20">
          <p className="text-[10px] text-slate-400 mb-1">THREAT SCORE</p>
          <p className="text-sm font-bold text-orange-400 font-mono">{brainStatus.threatScore.toFixed(1)}</p>
        </div>
        <div className="bg-slate-800/50 p-3 rounded border border-cyan-500/20">
          <p className="text-[10px] text-slate-400 mb-1">AI CONFIDENCE</p>
          <p className="text-sm font-bold text-green-400 font-mono">{(brainStatus.aiConfidence * 100).toFixed(0)}%</p>
        </div>
      </div>

      {/* Reasoning */}
      <div className="bg-slate-800/30 p-3 rounded mb-4 border border-cyan-500/10 relative z-10">
        <p className="text-[10px] text-slate-400 mb-1">REASONING</p>
        <p className="text-xs text-cyan-300 font-mono animate-pulse">{brainStatus.reasoning}</p>
      </div>

      {/* Current FPS */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <p className="text-[10px] text-slate-400">CURRENT FPS</p>
        <p className="text-sm font-bold text-white font-mono">{brainStatus.currentFps.toFixed(1)}</p>
      </div>

      {/* Latest Incident */}
      {brainStatus.latestIncident && (
        <div className="bg-red-900/30 p-3 rounded mb-4 border border-red-500/30 relative z-10">
          <p className="text-[10px] text-red-400 mb-1">LATEST INCIDENT</p>
          <p className="text-xs text-white font-mono">{brainStatus.latestIncident}</p>
        </div>
      )}

      {/* Live Logs */}
      <div className="bg-black/50 p-3 rounded border border-slate-700 relative z-10 h-32 overflow-hidden">
        <p className="text-[10px] text-slate-400 mb-2">LIVE LOGS</p>
        <div className="space-y-1 font-mono text-[10px]">
          {logs.map((log, index) => (
            <div key={index} className="text-green-400/80">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
