import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { fetchHighlightLocations } from '../lib/highlight';
import type { HighlightLocation, HighlightMode } from '../types';

interface ImageOverlayProps {
  image: string;
  mode: HighlightMode;
  targetType: string;
  targetLabel: string;
  expectedCount: number;
  markerColor: string;
  onClose: () => void;
}

export default function ImageOverlay({
  image,
  mode,
  targetType,
  targetLabel,
  expectedCount,
  markerColor,
  onClose,
}: ImageOverlayProps) {
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<HighlightLocation[]>([]);
  const [count, setCount] = useState(0);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const result = await fetchHighlightLocations(image, mode, targetType, targetLabel, expectedCount);
      if (cancelled) return;

      if (result.error) {
        setError(result.error);
      } else {
        setLocations(result.locations);
        setCount(result.count);
        setDescription(result.description);
      }
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [image, mode, targetType, targetLabel, expectedCount]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center"
      >
        <X size={22} className="text-white" />
      </button>

      {/* Image container */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={40} className="text-white animate-spin" />
            <p className="text-white text-sm">Finding {targetLabel} locations...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 px-6">
            <p className="text-red-400 text-sm text-center">{error}</p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 bg-white/10 text-white text-sm rounded-xl"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="relative w-full max-w-lg">
            <img
              src={image}
              alt="Highlighted scan"
              className="w-full rounded-xl"
            />
            {/* Markers */}
            {locations.map((loc, i) => (
              <div
                key={i}
                className="absolute w-6 h-6 rounded-full border-2 border-white pointer-events-none"
                style={{
                  backgroundColor: markerColor,
                  opacity: 0.85,
                  left: `${loc.x * 100}%`,
                  top: `${loc.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Description bar */}
      {!loading && !error && (
        <div className="px-4 pb-6 pt-2">
          <div className="max-w-lg mx-auto bg-white/10 rounded-2xl p-3">
            <p className="text-white text-sm font-semibold">
              {count} {targetLabel} found
            </p>
            {description && (
              <p className="text-white/70 text-xs mt-1">{description}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
