import React, { useState, useEffect, useRef } from 'react';
import { ViewType } from '../../types';

interface Props {
  onEnterSystem: () => void;
  onNavigate: (view: ViewType) => void;
}

export const LandingPage: React.FC<Props> = ({ onEnterSystem, onNavigate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

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
      a: "The architecture provides a low-latency WebSocket & REST event bridge. Python vision servers send detection bounding boxes, confidence metrics, and tracking IDs directly into the command workspace."
    },
    {
      q: "What emergency threat categories can the AI detect automatically?",
      a: "Suraksha AI detects firearms, bladed weapons, physical violence, crowd formation anomalies, perimeter intrusions, unattended objects, license plates (ALPR), traffic collisions, and emergency distress signals."
    }
  ];

  return (
    <div className="min-h-screen bg-[#050608] text-white overflow-x-hidden relative font-sans select-none">
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
                Smart City Emergency Command Center
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
            <a href="#features" className="hover:text-blue-400 transition-colors">Capabilities</a>
            <a href="#use-cases" className="hover:text-blue-400 transition-colors">Deployments</a>
            <a href="#faq" className="hover:text-blue-400 transition-colors">FAQ</a>
          </div>

          <button
            onClick={onEnterSystem}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold uppercase rounded-lg shadow-[0_0_20px_rgba(37,99,235,0.6)] transition-all flex items-center gap-2 active:scale-95"
          >
            <i className="fa-solid fa-right-to-bracket"></i> Login
          </button>
        </header>

        {/* Hero Section */}
        <section className="px-6 lg:px-12 pt-20 pb-24 max-w-7xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-blue-950/60 border border-blue-500/40 rounded-full text-blue-400 text-xs font-mono uppercase tracking-widest backdrop-blur-md shadow-[0_0_15px_rgba(37,99,235,0.3)]">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
            SURAKSHA SMART CITY EMERGENCY AI PLATFORM
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight max-w-5xl mx-auto leading-tight">
            Autonomous Threat Intelligence & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600">Police Emergency Control</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-3xl mx-auto font-sans leading-relaxed">
            Suraksha AI transforms static CCTV video streams into proactive, sub-second emergency response nodes powered by YOLO11 vision detection, automated dispatch triggers, and forensic case synthesis.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              onClick={onEnterSystem}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-sm uppercase rounded-xl shadow-[0_0_25px_rgba(37,99,235,0.6)] transition-all flex items-center gap-3 active:scale-95 border border-blue-400/40"
            >
              <i className="fa-solid fa-right-to-bracket text-lg"></i> Login to System
            </button>
          </div>
        </section>

        {/* Capabilities Grid */}
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
              <h4 className="text-lg font-bold">Autonomous Dispatch Matrix</h4>
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
                Generates exportable legal report summaries with evidence snapshots, bounding box previews, witness logs, and verified timestamps.
              </p>
            </div>
          </div>
        </section>

        {/* Deployments */}
        <section id="use-cases" className="px-6 lg:px-12 py-20 max-w-7xl mx-auto space-y-12 border-t border-white/10">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-mono text-blue-400 uppercase tracking-widest font-bold">ENTERPRISE SECTOR DEPLOYMENTS</h2>
            <h3 className="text-3xl font-bold">Architecture Designed for Critical Infrastructure</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900/40 border border-white/10 rounded-xl text-center space-y-2">
              <i className="fa-solid fa-city text-2xl text-blue-400"></i>
              <h4 className="font-bold text-sm">Smart Cities</h4>
              <p className="text-[10px] text-slate-400 font-mono">Municipal Police Command Hubs</p>
            </div>
            <div className="p-5 bg-slate-900/40 border border-white/10 rounded-xl text-center space-y-2">
              <i className="fa-solid fa-plane-departure text-2xl text-cyan-400"></i>
              <h4 className="font-bold text-sm">International Airports</h4>
              <p className="text-[10px] text-slate-400 font-mono">Terminal Security & Perimeter Control</p>
            </div>
            <div className="p-5 bg-slate-900/40 border border-white/10 rounded-xl text-center space-y-2">
              <i className="fa-solid fa-train text-2xl text-emerald-400"></i>
              <h4 className="font-bold text-sm">Railways & Transit</h4>
              <p className="text-[10px] text-slate-400 font-mono">Station Platforms & Depot Protection</p>
            </div>
            <div className="p-5 bg-slate-900/40 border border-white/10 rounded-xl text-center space-y-2">
              <i className="fa-solid fa-building-shield text-2xl text-amber-400"></i>
              <h4 className="font-bold text-sm">Gov Control Rooms</h4>
              <p className="text-[10px] text-slate-400 font-mono">High-Security Defense Installation</p>
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
