import React, { useState, useEffect, useRef } from 'react';
import { ViewType } from '../../types';

interface Props {
  onLaunchCommandCenter: () => void;
  onNavigate: (view: ViewType) => void;
}

export const LandingPage: React.FC<Props> = ({ onLaunchCommandCenter, onNavigate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [demoActive, setDemoActive] = useState(false);
  const [demoConfidence, setDemoConfidence] = useState(96.4);

  // Background Interactive Cyber Radar Sweep Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const centerX = w / 2;
      const centerY = h / 2;
      const radius = Math.max(w, h) * 0.45;

      ctx.fillStyle = '#050608';
      ctx.fillRect(0, 0, w, h);

      // Cyber Grid
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Radar Concentric Circles
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.lineWidth = 1;
      for (let r = 100; r < radius; r += 120) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Rotating Radar Beam
      angle += 0.015;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + 0.35);
      ctx.closePath();

      const beamGradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, radius);
      beamGradient.addColorStop(0, 'rgba(0, 240, 255, 0.3)');
      beamGradient.addColorStop(1, 'rgba(37, 99, 235, 0.02)');
      ctx.fillStyle = beamGradient;
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const faqs = [
    {
      q: "How does Suraksha AI integrate with existing CCTV hardware?",
      a: "Suraksha AI connects via standard RTSP / ONVIF streams or WebRTC edge gateways. It requires zero hardware replacements and runs computer vision neural inference directly on edge GPUs or secure cloud instances."
    },
    {
      q: "Can Suraksha AI work with offline / air-gapped police control rooms?",
      a: "Yes. Suraksha AI can be deployed fully on-premise inside local precinct servers without needing internet access, adhering to military and government security protocols."
    },
    {
      q: "How are Python AI models connected to the frontend command center?",
      a: "The architecture provides a low-latency WebSocket & REST event bridge. Python vision servers send detection bounding boxes, confidence metrics, and tracking IDs directly into detectionOverlay[] objects."
    },
    {
      q: "What emergency threat categories can the AI detect automatically?",
      a: "Suraksha AI detects firearms, knives, physical violence, crowd formation anomalies, perimeter intrusions, unattended objects, license plates (ALPR), traffic collisions, and officer distress signals."
    }
  ];

  return (
    <div className="min-h-screen bg-[#050608] text-white overflow-x-hidden relative font-sans">
      {/* Background Interactive Cyber Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      {/* Main Content Area */}
      <div className="relative z-10">
        {/* Navigation Bar Header */}
        <header className="px-6 lg:px-12 py-5 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center border border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.6)]">
              <i className="fa-solid fa-shield-halved text-xl text-white"></i>
            </div>
            <div>
              <span className="text-xl font-bold tracking-wider font-sans text-white">
                SURAKSHA <span className="text-blue-400 font-mono text-xs px-1.5 py-0.5 bg-blue-950 border border-blue-500/40 rounded">AI</span>
              </span>
              <span className="text-[9px] text-slate-400 font-mono tracking-widest block uppercase mt-0.5">
                Enterprise Command Platform
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
            <a href="#features" className="hover:text-blue-400 transition-colors">Capabilities</a>
            <a href="#how-it-works" className="hover:text-blue-400 transition-colors">Architecture</a>
            <a href="#demo" className="hover:text-blue-400 transition-colors">Live AI Demo</a>
            <a href="#use-cases" className="hover:text-blue-400 transition-colors">Deployments</a>
            <a href="#faq" className="hover:text-blue-400 transition-colors">FAQ</a>
          </div>

          <button
            onClick={onLaunchCommandCenter}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold uppercase rounded-lg shadow-[0_0_20px_rgba(37,99,235,0.6)] transition-all flex items-center gap-2 active:scale-95"
          >
            <i className="fa-solid fa-gauge-high"></i> Launch Command Center
          </button>
        </header>

        {/* Hero Section */}
        <section className="px-6 lg:px-12 pt-16 pb-24 max-w-7xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-950/60 border border-blue-500/40 rounded-full text-blue-400 text-xs font-mono uppercase tracking-widest backdrop-blur-md shadow-[0_0_15px_rgba(37,99,235,0.3)]">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
            SURAKSHA SMART CITY EMERGENCY AI PLATFORM
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight max-w-5xl mx-auto leading-tight">
            Autonomous Threat Intelligence & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600">Police Emergency Control</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-3xl mx-auto font-sans leading-relaxed">
            Suraksha AI transforms thousands of static CCTV streams into proactive, sub-second emergency response nodes. Powered by high-speed neural vision, automated dispatch triggers, and forensic case synthesis.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={onLaunchCommandCenter}
              className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-sm uppercase rounded-xl shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all flex items-center gap-3 active:scale-95"
            >
              <i className="fa-solid fa-tower-broadcast text-lg"></i> Access Live Command Center
            </button>

            <button
              onClick={() => onNavigate('live_cameras')}
              className="px-8 py-4 bg-slate-900 hover:bg-slate-800 border border-white/10 text-white font-mono font-bold text-sm uppercase rounded-xl transition-all flex items-center gap-3"
            >
              <i className="fa-solid fa-video text-blue-400 text-lg"></i> Monitor 6 CCTV Matrix
            </button>
          </div>

          {/* Statistics Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-12 max-w-5xl mx-auto">
            <div className="bg-black/50 border border-white/10 p-5 rounded-xl backdrop-blur-md text-center space-y-1">
              <div className="text-3xl font-bold font-mono text-blue-400">99.8%</div>
              <div className="text-xs text-slate-400 font-mono uppercase">AI Threat Precision</div>
            </div>
            <div className="bg-black/50 border border-white/10 p-5 rounded-xl backdrop-blur-md text-center space-y-1">
              <div className="text-3xl font-bold font-mono text-red-500">&lt; 3.8m</div>
              <div className="text-xs text-slate-400 font-mono uppercase">Avg Dispatch Speed</div>
            </div>
            <div className="bg-black/50 border border-white/10 p-5 rounded-xl backdrop-blur-md text-center space-y-1">
              <div className="text-3xl font-bold font-mono text-cyan-400">12,450+</div>
              <div className="text-xs text-slate-400 font-mono uppercase">CCTV Feeds Processed</div>
            </div>
            <div className="bg-black/50 border border-white/10 p-5 rounded-xl backdrop-blur-md text-center space-y-1">
              <div className="text-3xl font-bold font-mono text-emerald-400">18ms</div>
              <div className="text-xs text-slate-400 font-mono uppercase">Inference Latency</div>
            </div>
          </div>
        </section>

        {/* Features Capabilities Grid */}
        <section id="features" className="px-6 lg:px-12 py-20 max-w-7xl mx-auto space-y-12 border-t border-white/10">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-mono text-blue-400 uppercase tracking-widest font-bold">COMMERCIAL CONTROL ROOM CAPABILITIES</h2>
            <h3 className="text-3xl sm:text-4xl font-bold tracking-tight">Built for Mission-Critical Police Operations</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/60 border border-white/10 p-6 rounded-2xl space-y-4 hover:border-blue-500/50 transition-colors group">
              <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/40 text-blue-400 rounded-xl flex items-center justify-center text-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <i className="fa-solid fa-gun"></i>
              </div>
              <h4 className="text-lg font-bold">Weapon & Combat Detection</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Neural object recognition identifies firearms, bladed weapons, and aggressive physical assault patterns before human operators notice.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-white/10 p-6 rounded-2xl space-y-4 hover:border-blue-500/50 transition-colors group">
              <div className="w-12 h-12 bg-red-600/20 border border-red-500/40 text-red-400 rounded-xl flex items-center justify-center text-xl group-hover:bg-red-600 group-hover:text-white transition-colors">
                <i className="fa-solid fa-truck-medical"></i>
              </div>
              <h4 className="text-lg font-bold">Autonomous Dispatch Sinks</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Routes location telemetry, threat severity scores, and live video feeds directly to the nearest patrol unit with siren radio override.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-white/10 p-6 rounded-2xl space-y-4 hover:border-blue-500/50 transition-colors group">
              <div className="w-12 h-12 bg-cyan-600/20 border border-cyan-500/40 text-cyan-400 rounded-xl flex items-center justify-center text-xl group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                <i className="fa-solid fa-file-pdf"></i>
              </div>
              <h4 className="text-lg font-bold">Forensic Case Synthesis</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Generates exportable PDF legal reports with evidence snapshots, bounding box previews, witness logs, and verified timestamps.
              </p>
            </div>
          </div>
        </section>

        {/* Live Interactive AI Demonstration Widget */}
        <section id="demo" className="px-6 lg:px-12 py-20 max-w-7xl mx-auto space-y-8 border-t border-white/10">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-mono text-blue-400 uppercase tracking-widest font-bold">INTERACTIVE PROOF OF CONCEPT</h2>
            <h3 className="text-3xl font-bold">Test Suraksha Neural Vision Inference</h3>
          </div>

          <div className="bg-black/60 border border-blue-500/30 rounded-2xl p-6 lg:p-8 backdrop-blur-xl grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2 relative aspect-video bg-slate-950 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center">
              {/* Simulated Vision Canvas */}
              <div className="absolute inset-0 bg-cyber-grid opacity-30"></div>
              
              <div className="relative z-10 text-center space-y-4 p-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/30 border border-blue-400 rounded text-xs font-mono text-blue-300">
                  <i className="fa-solid fa-microchip"></i> MODEL: SURAKSHA-YOLO-V8
                </div>

                <div className="w-48 h-32 border-2 border-red-500 bg-red-950/30 mx-auto rounded relative flex flex-col justify-between p-2 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                  <span className="bg-red-600 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded self-start">
                    WEAPON DETECTED: {demoConfidence}%
                  </span>
                  <span className="text-[8px] font-mono text-slate-300 self-end">
                    TRK_ID: 1042
                  </span>
                </div>

                <div className="text-xs text-slate-300 font-mono">
                  {demoActive ? 'Neural Vision Stream Connected (30.1 FPS)' : 'Click to run AI Vision Inference test'}
                </div>
              </div>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 bg-slate-900 border border-white/10 rounded-xl space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Model Architecture:</span>
                  <span className="text-white font-bold">YOLOv8 + ResNet50</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Detection Latency:</span>
                  <span className="text-emerald-400 font-bold">18.2 ms</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Precision Score:</span>
                  <span className="text-blue-400 font-bold">{demoConfidence}%</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setDemoActive(true);
                  setDemoConfidence(+(95 + Math.random() * 4).toFixed(1));
                }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all"
              >
                Trigger Vision Test
              </button>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section id="use-cases" className="px-6 lg:px-12 py-20 max-w-7xl mx-auto space-y-12 border-t border-white/10">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-mono text-blue-400 uppercase tracking-widest font-bold">ENTERPRISE SECTOR DEPLOYMENTS</h2>
            <h3 className="text-3xl font-bold">Deployed Across Critical Infrastructure</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900/40 border border-white/10 rounded-xl text-center space-y-2">
              <i className="fa-solid fa-city text-2xl text-blue-400"></i>
              <h4 className="font-bold text-sm">Smart Cities</h4>
              <p className="text-[10px] text-slate-400">Municipal Police Command Hubs</p>
            </div>
            <div className="p-5 bg-slate-900/40 border border-white/10 rounded-xl text-center space-y-2">
              <i className="fa-solid fa-plane-departure text-2xl text-cyan-400"></i>
              <h4 className="font-bold text-sm">International Airports</h4>
              <p className="text-[10px] text-slate-400">Terminal Security & Perimeter Control</p>
            </div>
            <div className="p-5 bg-slate-900/40 border border-white/10 rounded-xl text-center space-y-2">
              <i className="fa-solid fa-train text-2xl text-emerald-400"></i>
              <h4 className="font-bold text-sm">Railways & Transit</h4>
              <p className="text-[10px] text-slate-400">Station Platforms & Depot Protection</p>
            </div>
            <div className="p-5 bg-slate-900/40 border border-white/10 rounded-xl text-center space-y-2">
              <i className="fa-solid fa-building-shield text-2xl text-amber-400"></i>
              <h4 className="font-bold text-sm">Gov Control Rooms</h4>
              <p className="text-[10px] text-slate-400">High-Security Defense Installation</p>
            </div>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section id="faq" className="px-6 lg:px-12 py-20 max-w-4xl mx-auto space-y-8 border-t border-white/10">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-mono text-blue-400 uppercase tracking-widest font-bold">FREQUENTLY ASKED QUESTIONS</h2>
            <h3 className="text-3xl font-bold">Architectural & System Queries</h3>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-slate-900/60 border border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-4 text-left font-bold text-sm flex justify-between items-center hover:text-blue-400 transition-colors"
                >
                  <span>{faq.q}</span>
                  <i className={`fa-solid fa-chevron-down text-xs transition-transform ${activeFaq === idx ? 'rotate-180 text-blue-400' : 'text-slate-500'}`}></i>
                </button>
                {activeFaq === idx && (
                  <div className="p-4 pt-0 text-xs text-slate-400 font-sans border-t border-white/5 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 lg:px-12 py-10 border-t border-white/10 bg-black text-xs font-mono text-slate-500 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <span className="font-bold text-white">SURAKSHA AI</span>
            <span>- Smart City Emergency Command Center</span>
          </div>

          <div>
            &copy; {new Date().getFullYear()} Suraksha AI Emergency Security Systems. All Rights Reserved.
          </div>
        </footer>
      </div>
    </div>
  );
};
