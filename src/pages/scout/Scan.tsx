import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Camera, Zap, ArrowLeft, Save, Loader2, CheckCircle2, RotateCcw, X, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { captureImage } from '../../lib/camera';
import { analyzeImage } from '../../lib/analyze';
import ImageOverlay from '../../components/ImageOverlay';
import type { Scan as ScanType, PestCount, PestType, Trap, ConsistencyLevel } from '../../types';
import { PEST_LABELS, PEST_COLORS, ALERT_COLORS } from '../../types';

type ScanStep = 'select-trap' | 'capture' | 'analyzing' | 'results' | 'saved';

const CONSISTENCY_COLORS: Record<ConsistencyLevel, string> = {
  high: '#22c55e',
  medium: '#eab308',
  low: '#ef4444',
};

const CONSISTENCY_LABELS: Record<ConsistencyLevel, string> = {
  high: 'High consistency',
  medium: 'Medium consistency',
  low: 'Low consistency',
};


export default function Scan() {
  const traps = useAppStore((s) => s.traps);
  const addScan = useAppStore((s) => s.addScan);
  const getAlertLevel = useAppStore((s) => s.getAlertLevel);

  const [step, setStep] = useState<ScanStep>('select-trap');
  const [selectedTrap, setSelectedTrap] = useState<Trap | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [pests, setPests] = useState<PestCount[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [passCount, setPassCount] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('Running 3 parallel analyses...');
  const [elapsed, setElapsed] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [highlightPest, setHighlightPest] = useState<PestType | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step === 'analyzing') {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      const msgs = [
        { at: 2, msg: 'Sending to AI (pass 1 of 3)...' },
        { at: 5, msg: 'Running 3 parallel analyses...' },
        { at: 12, msg: 'Comparing results...' },
        { at: 18, msg: 'Finalizing counts...' },
        { at: 25, msg: 'Still working, large image...' },
      ];
      const timeouts = msgs.map((m) =>
        setTimeout(() => setStatusMsg(m.msg), m.at * 1000),
      );
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timeouts.forEach(clearTimeout);
      };
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [step]);

  const overallAlertLevel = pests.length > 0
    ? (() => {
        const levels = pests.map((p) => getAlertLevel(p.type, p.count));
        const priority = { safe: 0, watch: 1, action: 2, critical: 3 };
        return levels.reduce((max, l) => (priority[l] > priority[max] ? l : max), 'safe' as const);
      })()
    : 'safe';

  const handleSelectTrap = (trap: Trap) => {
    setSelectedTrap(trap);
    setStep('capture');
    setError(null);
  };

  const handleQuickScan = () => {
    setSelectedTrap(null);
    setStep('capture');
    setError(null);
  };

  const handleCapture = useCallback(async () => {
    setError(null);
    setStatusMsg('Running 3 parallel analyses...');
    try {
      const base64 = await captureImage();
      setImageData(base64);
      setStep('analyzing');

      const result = await analyzeImage(base64, (status) => setStatusMsg(status));
      if (result.error) {
        setError(result.error);
        setStep('capture');
        return;
      }
      setPests(result.pests);
      setTotalCount(result.totalCount);
      setPassCount(result.passCount);
      setStep('results');
    } catch (err) {
      if (err instanceof Error && err.message === 'Cancelled') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to capture image');
      setStep('capture');
    }
  }, []);

  const handleSave = useCallback(() => {
    const scan: ScanType = {
      id: uuidv4(),
      trapId: selectedTrap?.id ?? 'quick-scan',
      timestamp: new Date().toISOString(),
      imageData: imageData ?? undefined,
      pests,
      totalCount,
      notes,
      analyzed: true,
      analyzing: false,
    };
    addScan(scan);
    setStep('saved');
  }, [selectedTrap, imageData, pests, totalCount, notes, addScan]);

  const handleReset = () => {
    setStep('select-trap');
    setSelectedTrap(null);
    setImageData(null);
    setPests([]);
    setTotalCount(0);
    setPassCount(0);
    setNotes('');
    setError(null);
    setDetailsOpen(false);
    setHighlightPest(null);
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {step !== 'select-trap' && step !== 'saved' && (
          <button
            onClick={handleReset}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {step === 'select-trap' && 'Scan a Trap'}
            {step === 'capture' && (selectedTrap ? selectedTrap.name : 'Quick Scan')}
            {step === 'analyzing' && 'Analyzing...'}
            {step === 'results' && 'Scan Results'}
            {step === 'saved' && 'Saved!'}
          </h1>
          {step === 'select-trap' && (
            <p className="text-sm text-gray-500">Select a trap or do a quick scan</p>
          )}
        </div>
      </div>

      {/* Step: Select Trap */}
      {step === 'select-trap' && (
        <div>
          <button
            onClick={handleQuickScan}
            className="w-full h-14 mb-4 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Zap size={20} />
            Quick Scan
          </button>

          {traps.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-sm text-gray-500">No traps registered yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Add traps from the Traps tab, or use Quick Scan
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Select a Trap
              </p>
              {traps.map((trap) => (
                <button
                  key={trap.id}
                  onClick={() => handleSelectTrap(trap)}
                  className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 text-left transition-all active:scale-[0.98] hover:bg-gray-50"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      trap.cardColor === 'yellow'
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    <Camera size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{trap.name}</p>
                    <p className="text-xs text-gray-500">{trap.zone}</p>
                  </div>
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: ALERT_COLORS[trap.alertLevel] }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step: Capture */}
      {step === 'capture' && (
        <div className="flex flex-col items-center pt-8">
          {error && (
            <div className="w-full mb-6 p-4 bg-red-50 rounded-2xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="w-48 h-48 mb-8 rounded-3xl bg-white shadow-sm border-2 border-dashed border-gray-200 flex items-center justify-center">
            <Camera size={48} className="text-gray-300" />
          </div>

          <button
            onClick={handleCapture}
            className="w-full max-w-xs h-14 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Camera size={22} />
            Take Photo
          </button>

        </div>
      )}

      {/* Step: Analyzing */}
      {step === 'analyzing' && (
        <div className="flex flex-col items-center pt-8">
          {imageData && (
            <img
              src={imageData}
              alt="Captured"
              className="w-40 h-40 rounded-3xl object-cover mb-6 shadow-sm"
            />
          )}

          {/* Progress ring */}
          <div className="relative mb-5">
            <Loader2 size={48} className="text-green-600 animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-green-700">
              {elapsed}s
            </span>
          </div>

          <p className="text-base font-semibold text-gray-800 mb-1">{statusMsg}</p>
          <p className="text-xs text-gray-400">Multi-pass analysis takes 15-25 seconds</p>

          {/* Progress bar */}
          <div className="w-full max-w-xs mt-5 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min((elapsed / 25) * 100, 95)}%` }}
            />
          </div>

          <button
            onClick={handleReset}
            className="mt-6 h-10 px-5 text-sm text-gray-500 border border-gray-200 rounded-xl flex items-center gap-1.5 hover:bg-gray-50 active:bg-gray-100"
          >
            <X size={14} />
            Cancel
          </button>
        </div>
      )}

      {/* Step: Results */}
      {step === 'results' && (
        <div>
          {/* Image + Total Count */}
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 flex items-center gap-4">
            {imageData ? (
              <img
                src={imageData}
                alt="Scanned trap"
                className="w-20 h-20 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <Camera size={24} className="text-gray-400" />
              </div>
            )}
            <div>
              <p className="text-3xl font-bold text-gray-900">{totalCount}</p>
              <p className="text-sm text-gray-500">total pests found</p>
              {passCount > 1 && (
                <p className="text-[10px] text-green-600 font-medium mt-0.5">
                  Analyzed {passCount}x for accuracy
                </p>
              )}
              <span
                className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: ALERT_COLORS[overallAlertLevel] }}
              >
                {overallAlertLevel.charAt(0).toUpperCase() + overallAlertLevel.slice(1)}
              </span>
            </div>
          </div>

          {/* Pest Breakdown */}
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Pest Breakdown</h3>
            {pests.length === 0 ? (
              <p className="text-sm text-gray-500">No pests detected</p>
            ) : (
              <div className="space-y-3">
                {pests
                  .sort((a, b) => b.count - a.count)
                  .map((pest) => (
                    <button
                      key={pest.type}
                      onClick={() => imageData && setHighlightPest(pest.type)}
                      className="w-full text-left group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                          {PEST_LABELS[pest.type]}
                          {pest.consistency && (
                            <span
                              className="inline-block w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: CONSISTENCY_COLORS[pest.consistency] }}
                              title={CONSISTENCY_LABELS[pest.consistency]}
                            />
                          )}
                          {imageData && (
                            <Eye size={14} className="text-gray-300 group-hover:text-green-500 transition-colors" />
                          )}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {pest.count}
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min((pest.confidence * 100), 100)}%`,
                            backgroundColor: PEST_COLORS[pest.type],
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {Math.round(pest.confidence * 100)}% confidence
                        {pest.consistency && (
                          <span
                            className="ml-2"
                            style={{ color: CONSISTENCY_COLORS[pest.consistency] }}
                          >
                            {CONSISTENCY_LABELS[pest.consistency]}
                          </span>
                        )}
                        {imageData && (
                          <span className="ml-2 text-green-500">Tap to show on image</span>
                        )}
                      </p>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Analysis Details (Collapsible) */}
          {pests.some((p) => p.passResults && p.passResults.length > 1) && (
            <div className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
              <button
                onClick={() => setDetailsOpen(!detailsOpen)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-900">Analysis Details</span>
                {detailsOpen ? (
                  <ChevronDown size={16} className="text-gray-400" />
                ) : (
                  <ChevronRight size={16} className="text-gray-400" />
                )}
              </button>
              {detailsOpen && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <p className="text-[10px] text-gray-400 mt-3 mb-2">
                    Each pass is an independent AI analysis. The median count is used for accuracy.
                  </p>
                  <div className="space-y-2">
                    {pests
                      .sort((a, b) => b.count - a.count)
                      .map((pest) => (
                        <div key={`detail-${pest.type}`} className="text-xs">
                          <p className="font-medium text-gray-700 mb-0.5">
                            {PEST_LABELS[pest.type]}
                          </p>
                          <div className="flex gap-2 text-gray-500">
                            {pest.passResults?.map((count, i) => (
                              <span
                                key={i}
                                className={`px-2 py-0.5 rounded-md ${
                                  count === pest.count
                                    ? 'bg-green-50 text-green-700 font-semibold'
                                    : 'bg-gray-50 text-gray-500'
                                }`}
                              >
                                Pass {i + 1}: {count}
                              </span>
                            ))}
                            <span className="px-2 py-0.5 rounded-md bg-gray-800 text-white font-semibold">
                              Median: {pest.count}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <label className="text-sm font-semibold text-gray-900 block mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add observations, environmental conditions..."
              className="w-full h-24 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full h-14 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 mb-4"
          >
            <Save size={20} />
            Save Scan
          </button>
        </div>
      )}

      {/* Step: Saved */}
      {step === 'saved' && (
        <div className="flex flex-col items-center pt-12">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <CheckCircle2 size={40} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Scan Saved</h2>
          <p className="text-sm text-gray-500 mb-8 text-center">
            {selectedTrap
              ? `Recorded ${totalCount} pests on ${selectedTrap.name}`
              : `Recorded ${totalCount} pests (Quick Scan)`}
          </p>
          <button
            onClick={handleReset}
            className="h-14 px-8 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <RotateCcw size={20} />
            Scan Another
          </button>
        </div>
      )}

      {/* Highlight Overlay */}
      {highlightPest && imageData && (
        <ImageOverlay
          image={imageData}
          mode="scout"
          targetType={highlightPest}
          targetLabel={PEST_LABELS[highlightPest]}
          expectedCount={pests.find((p) => p.type === highlightPest)?.count ?? 0}
          markerColor={PEST_COLORS[highlightPest]}
          onClose={() => setHighlightPest(null)}
        />
      )}
    </div>
  );
}
