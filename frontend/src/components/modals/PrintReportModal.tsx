import React from 'react';
import { Incident } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  incident: Incident;
}

export const PrintReportModal: React.FC<Props> = ({ isOpen, onClose, incident }) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-white/20 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl my-8">
        {/* Printable Case Report Container */}
        <div className="p-8 bg-white text-slate-900 font-sans space-y-6 select-text" id="printable-report">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-900 text-white rounded flex items-center justify-center font-bold text-xl">
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                  POLICE EMERGENCY FORENSIC CASE REPORT
                </h1>
                <p className="text-xs font-mono text-slate-600 uppercase">
                  SURAKSHA AI COMMAND CENTER | DEPARTMENT OF PUBLIC SAFETY
                </p>
              </div>
            </div>
            <div className="text-right font-mono">
              <div className="text-xs text-slate-500 uppercase">CASE REF ID</div>
              <div className="text-lg font-bold text-red-600">{incident.id}</div>
            </div>
          </div>

          {/* Incident Metadata Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-100 rounded-lg text-xs font-mono border border-slate-300">
            <div>
              <span className="text-slate-500 uppercase block text-[10px]">Title</span>
              <span className="font-bold text-slate-900">{incident.title}</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase block text-[10px]">Location</span>
              <span className="font-bold text-slate-900">{incident.location}</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase block text-[10px]">Severity Score</span>
              <span className="font-bold text-red-600">{incident.severity} / 10.0</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase block text-[10px]">Assigned Unit</span>
              <span className="font-bold text-slate-900">{incident.assignedUnit}</span>
            </div>
          </div>

          {/* AI Automated Summary */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-300 pb-1">
              AI Vision System Findings
            </h2>
            <p className="text-xs leading-relaxed text-slate-800 font-mono">
              {incident.description}
            </p>
          </div>

          {/* Detection Metrics Table */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-300 pb-2 mb-2">
              Neural Network Detection Telemetry
            </h2>
            <table className="w-full text-xs text-left border border-slate-300 font-mono">
              <thead className="bg-slate-200">
                <tr>
                  <th className="p-2 border-r border-slate-300">Feature</th>
                  <th className="p-2 border-r border-slate-300">Detection Status</th>
                  <th className="p-2">Confidence Level</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-300">
                  <td className="p-2 border-r border-slate-300 font-bold">Weapon Signature</td>
                  <td className="p-2 border-r border-slate-300">
                    {incident.aiAnalysis.weapon ? 'POSITIVE' : 'NEGATIVE'}
                  </td>
                  <td className="p-2">{incident.aiAnalysis.weaponConfidence}%</td>
                </tr>
                <tr className="border-t border-slate-300 bg-slate-50">
                  <td className="p-2 border-r border-slate-300 font-bold">Physical Conflict</td>
                  <td className="p-2 border-r border-slate-300">
                    {incident.aiAnalysis.fight ? 'POSITIVE' : 'NEGATIVE'}
                  </td>
                  <td className="p-2">{incident.aiAnalysis.fightConfidence}%</td>
                </tr>
                <tr className="border-t border-slate-300">
                  <td className="p-2 border-r border-slate-300 font-bold">Subjects Tracked</td>
                  <td className="p-2 border-r border-slate-300">{incident.aiAnalysis.people} Subjects</td>
                  <td className="p-2">100% Tracking Lock</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 border border-slate-300 rounded text-xs space-y-1">
              <h3 className="font-bold text-slate-700 uppercase font-mono">Police Command Notes</h3>
              <p className="text-slate-800 font-mono">{incident.policeNotes || 'No official notes added.'}</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-300 rounded text-xs space-y-1">
              <h3 className="font-bold text-slate-700 uppercase font-mono">Volunteer / Attendant Notes</h3>
              <p className="text-slate-800 font-mono">{incident.volunteerNotes || 'No volunteer notes recorded.'}</p>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-xs font-mono border-t border-slate-300">
            <div>
              <div className="h-10 border-b border-slate-400"></div>
              <div className="mt-1 font-bold text-slate-700 uppercase">Investigating Officer Signature</div>
            </div>
            <div>
              <div className="h-10 border-b border-slate-400"></div>
              <div className="mt-1 font-bold text-slate-700 uppercase">Command Center Supervisor Stamp</div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-slate-950 border-t border-white/10 flex justify-end gap-3 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono font-bold uppercase rounded"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-bold uppercase rounded shadow-lg flex items-center gap-2"
          >
            <i className="fa-solid fa-print"></i> Print PDF Case Report
          </button>
        </div>
      </div>
    </div>
  );
};
