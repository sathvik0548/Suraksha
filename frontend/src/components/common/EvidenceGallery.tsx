import React, { useState, useEffect } from 'react';
import { EvidenceItem } from '../../types';
import { getApiUrl } from '../../utils/errorHandling';

interface Props {
  evidence: EvidenceItem[];
  onDownload?: (evidence: EvidenceItem) => void;
}

export const EvidenceGallery: React.FC<Props> = ({ evidence, onDownload }) => {
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const handleImageClick = (evidence: EvidenceItem) => {
    setSelectedEvidence(evidence);
    setFullscreenImage(getApiUrl(`/api/v1/evidence/${evidence.id}/image`));
  };

  const handleCloseFullscreen = () => {
    setFullscreenImage(null);
  };

  return (
    <div className="space-y-4">
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {evidence.map((item, index) => (
          <div
            key={item.id}
            className="bg-slate-800/50 border border-white/10 rounded-lg overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer group"
            onClick={() => handleImageClick(item)}
          >
            {/* Thumbnail */}
            <div className="aspect-video bg-slate-900 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                <i className="fa-solid fa-image text-4xl"></i>
              </div>
              {/* Confidence Badge */}
              <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs font-bold text-white">
                {(item.confidence * 100).toFixed(0)}%
              </div>
              {/* Type Badge */}
              <div className="absolute bottom-2 left-2 bg-blue-600/80 px-2 py-1 rounded text-xs font-bold text-white">
                {item.type}
              </div>
            </div>

            {/* Info */}
            <div className="p-3">
              <p className="text-xs font-bold text-white mb-1 truncate">{item.title}</p>
              <p className="text-[10px] text-slate-400">{item.timestamp}</p>
            </div>

            {/* Hover Actions */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload?.(item);
                }}
                className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
              >
                <i className="fa-solid fa-download"></i>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageClick(item);
                }}
                className="p-2 bg-slate-600 hover:bg-slate-700 rounded-lg text-white transition-colors"
              >
                <i className="fa-solid fa-expand"></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={handleCloseFullscreen}>
          <div className="relative max-w-4xl w-full">
            <button
              onClick={handleCloseFullscreen}
              className="absolute -top-12 right-0 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <i className="fa-solid fa-xmark mr-2"></i>
              Close
            </button>
            <img
              src={fullscreenImage}
              alt="Evidence"
              className="w-full rounded-lg"
            />
            {selectedEvidence && (
              <div className="mt-4 bg-slate-900/80 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-2">{selectedEvidence.title}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">Timestamp</p>
                    <p className="text-white">{selectedEvidence.timestamp}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Confidence</p>
                    <p className="text-green-400 font-bold">{(selectedEvidence.confidence * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Type</p>
                    <p className="text-white">{selectedEvidence.type}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Bounding Box</p>
                    <p className="text-white font-mono text-xs">
                      [{selectedEvidence.bbox[0].toFixed(0)}, {selectedEvidence.bbox[1].toFixed(0)}, {selectedEvidence.bbox[2].toFixed(0)}, {selectedEvidence.bbox[3].toFixed(0)}]
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {evidence.length === 0 && (
        <div className="text-center py-12 bg-slate-800/30 rounded-lg border border-dashed border-white/10">
          <i className="fa-solid fa-images text-4xl text-slate-600 mb-3"></i>
          <p className="text-slate-400">No evidence available</p>
        </div>
      )}
    </div>
  );
};
