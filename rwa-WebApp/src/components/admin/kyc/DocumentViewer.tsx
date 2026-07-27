// src/app/admin/kyc/components/DocumentViewer.tsx
'use client';

import { useState } from 'react';
import { X, Download, ExternalLink, ZoomIn, ZoomOut, RotateCw, Loader2 } from 'lucide-react';

interface DocumentViewerProps {
  url: string;
  type: string;
  onClose: () => void;
}

export function DocumentViewer({ url, type, onClose }: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState(false);

  const isPDF = url.toLowerCase().endsWith('.pdf') || url.includes('application/pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url) || url.includes('image/');

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-sunken rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-ink">{type}</h3>
          
          <div className="flex items-center gap-2">
            {isImage && (
              <>
                <button
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                  className="p-2 hover:bg-surface-overlay rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-5 h-5 text-ink-muted" />
                </button>
                <span className="text-sm text-ink-muted min-w-[3rem] text-center">{zoom}%</span>
                <button
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                  className="p-2 hover:bg-surface-overlay rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom In"
                >
                  <ZoomIn className="w-5 h-5 text-ink-muted" />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-2 hover:bg-surface-overlay rounded-lg transition-colors"
                  title="Rotate"
                >
                  <RotateCw className="w-5 h-5 text-ink-muted" />
                </button>
                <div className="w-px h-6 bg-surface-overlay mx-2" />
              </>
            )}
            
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-surface-overlay rounded-lg transition-colors"
              title="Open in New Tab"
            >
              <ExternalLink className="w-5 h-5 text-ink-muted" />
            </a>
            
            <a
              href={url}
              download
              className="p-2 hover:bg-surface-overlay rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5 text-ink-muted" />
            </a>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-overlay rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5 text-ink-muted" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-surface-sunken">
          {isLoading && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-sunken">
              <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-center p-8">
              <p className="text-danger mb-4">Failed to load document</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gold-600 hover:bg-gold-700 text-ink rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </a>
            </div>
          )}

          {isPDF && !error && (
            <iframe
              src={`${url}#toolbar=1&navpanes=0`}
              className="w-full h-full min-h-[70vh] rounded-lg"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setError(true);
              }}
            />
          )}

          {isImage && !error && (
            <div 
              className="overflow-auto max-w-full max-h-full"
              style={{ 
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease'
              }}
            >
              <img
                src={url}
                alt={type}
                className="max-w-none"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setError(true);
                }}
              />
            </div>
          )}

          {!isPDF && !isImage && !error && (
            <div className="text-center p-8">
              <p className="text-ink-muted mb-4">Preview not available for this file type</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gold-600 hover:bg-gold-700 text-ink rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-surface-sunken/50">
          <p className="text-xs text-ink-faint truncate">{url}</p>
        </div>
      </div>
    </div>
  );
}
