import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { differenceInDays, parseISO } from 'date-fns';
import {
  Camera,
  Sprout,
  Zap,
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle2,
  RotateCcw,
  X,
  Eye,
} from 'lucide-react';
import { useGermStore } from '../../store/useGermStore';
import { captureImage } from '../../lib/camera';
import { analyzeGermImage } from '../../lib/analyze-germ';
import ImageOverlay from '../../components/ImageOverlay';
import type { SeedLot, GermScan, GermCellCategory } from '../../types';
import { TRAY_SIZE_LABELS, getGermStatus, GERM_STATUS_COLORS, GERM_STATUS_LABELS, GERM_HIGHLIGHT_COLORS, GERM_HIGHLIGHT_LABELS } from '../../types';

type ScanStep = 'select-lot' | 'capture' | 'analyzing' | 'results' | 'saved';

export default function GermScan() {
  const location = useLocation();
  const seedLots = useGermStore((s) => s.seedLots);
  const getActiveLots = useGermStore((s) => s.getActiveLots);
  const addGermScan = useGermStore((s) => s.addGermScan);
  const getLotScans = useGermStore((s) => s.getLotScans);
  const getTrayCountForLot = useGermStore((s) => s.getTrayCountForLot);

  const activeLots = getActiveLots();

  // Check if a lot was pre-selected via navigation state
  const preselectedLotId = (location.state as { lotId?: string } | null)?.lotId;

  const [step, setStep] = useState<ScanStep>('select-lot');
  const [selectedLot, setSelectedLot] = useState<SeedLot | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [totalCells, setTotalCells] = useState(0);
  const [germinatedCells, setGerminatedCells] = useState(0);
  const [emptyCount, setEmptyCount] = useState(0);
  const [abnormalCount, setAbnormalCount] = useState(0);
  const [germRate, setGermRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('Sending to AI...');
  const [elapsed, setElapsed] = useState(0);
  const [highlightCategory, setHighlightCategory] = useState<GermCellCategory | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initializedRef = useRef(false);

  // Handle preselected lot on mount
  useEffect(() => {
    if (preselectedLotId && !initializedRef.current) {
      initializedRef.current = true;
      const lot = seedLots.find((l) => l.id === preselectedLotId);
      if (lot) {
        setSelectedLot(lot);
        setStep('capture');
      }
    }
  }, [preselectedLotId, seedLots]);

  // Analyzing timer and progress messages
  useEffect(() => {
    if (step === 'analyzing') {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      const msgs = [
        { at: 2, msg: 'Sending to AI (pass 1 of 3)...' },
        { at: 5, msg: 'Running 3 parallel analyses...' },
        { at: 10, msg: 'Counting cells...' },
        { at: 15, msg: 'Calculating germ rate...' },
        { at: 20, msg: 'Finalizing...' },
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

  const handleSelectLot = (lot: SeedLot) => {
    setSelectedLot(lot);
    setStep('capture');
    setError(null);
  };

  const handleQuickScan = () => {
    setSelectedLot(null);
    setStep('capture');
    setError(null);
  };

  const handleCapture = useCallback(async () => {
    setError(null);
    setStatusMsg('Sending to AI...');
    try {
      const base64 = await captureImage();
      setImageData(base64);
      setStep('analyzing');

      const traySize = selectedLot ? getTrayCountForLot(selectedLot) : 288;
      const result = await analyzeGermImage(base64, traySize, (status) => setStatusMsg(status));

      if (result.error) {
        setError(result.error);
        setStep('capture');
        return;
      }

      setTotalCells(result.totalCells);
      setGerminatedCells(result.germinatedCells);
      setEmptyCount(result.emptyCount);
      setAbnormalCount(result.abnormalCount);
      setGermRate(result.germRate);
      setStep('results');
    } catch (err) {
      if (err instanceof Error && err.message === 'Cancelled') {
        setStep('capture');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to capture image');
      setStep('capture');
    }
  }, [selectedLot, getTrayCountForLot]);

  const handleSave = useCallback(() => {
    const daysAfterSeeding = selectedLot
      ? differenceInDays(new Date(), parseISO(selectedLot.seedDate))
      : 0;

    const scan: GermScan = {
      id: uuidv4(),
      lotId: selectedLot?.id ?? 'quick-scan',
      timestamp: new Date().toISOString(),
      imageData: imageData ?? undefined,
      totalCells,
      germinatedCells,
      emptyCount,
      abnormalCount,
      germRate,
      notes,
      analyzed: true,
      analyzing: false,
      daysAfterSeeding,
    };
    addGermScan(scan);
    setStep('saved');
  }, [selectedLot, imageData, totalCells, germinatedCells, emptyCount, abnormalCount, germRate, notes, addGermScan]);

  const handleReset = () => {
    setStep('select-lot');
    setSelectedLot(null);
    setImageData(null);
    setTotalCells(0);
    setGerminatedCells(0);
    setEmptyCount(0);
    setAbnormalCount(0);
    setGermRate(0);
    setNotes('');
    setError(null);
    setHighlightCategory(null);
  };

  // Previous scan delta
  const previousScanRate = (() => {
    if (!selectedLot) return null;
    const lotScans = getLotScans(selectedLot.id);
    // lotScans is sorted newest first; the current scan isn't saved yet,
    // so the first item is the most recent previous scan
    return lotScans.length > 0 ? lotScans[0].germRate : null;
  })();

  const status = getGermStatus(germRate);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {step !== 'select-lot' && step !== 'saved' && (
          <button
            onClick={handleReset}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {step === 'select-lot' && 'Scan Tray'}
            {step === 'capture' && (selectedLot ? selectedLot.name : 'Quick Scan')}
            {step === 'analyzing' && 'Analyzing...'}
            {step === 'results' && 'Scan Results'}
            {step === 'saved' && 'Saved!'}
          </h1>
          {step === 'select-lot' && (
            <p className="text-sm text-gray-500">Select a seed lot or do a quick scan</p>
          )}
          {step === 'capture' && selectedLot && (
            <p className="text-sm text-gray-500">
              {selectedLot.crop}{selectedLot.variety ? ` - ${selectedLot.variety}` : ''} | Day {differenceInDays(new Date(), parseISO(selectedLot.seedDate))}
            </p>
          )}
        </div>
      </div>

      {/* Step: Select Lot */}
      {step === 'select-lot' && (
        <div>
          <button
            onClick={handleQuickScan}
            className="w-full h-14 mb-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Zap size={20} />
            Quick Scan
          </button>

          {activeLots.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <Sprout size={32} className="text-amber-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No active seed lots</p>
              <p className="text-xs text-gray-400 mt-1">
                Add seed lots from the Lots tab, or use Quick Scan
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Select a Seed Lot
              </p>
              {activeLots.map((lot) => {
                const daysSince = differenceInDays(new Date(), parseISO(lot.seedDate));
                return (
                  <button
                    key={lot.id}
                    onClick={() => handleSelectLot(lot)}
                    className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 text-left transition-all active:scale-[0.98] hover:bg-gray-50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                      <Sprout size={18} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{lot.name}</p>
                      <p className="text-xs text-gray-500">
                        {lot.crop}{lot.variety ? ` - ${lot.variety}` : ''} | {TRAY_SIZE_LABELS[lot.traySize]}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-700">Day {daysSince}</p>
                    </div>
                  </button>
                );
              })}
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

          <div className="w-48 h-48 mb-8 rounded-3xl bg-white shadow-sm border-2 border-dashed border-amber-200 flex flex-col items-center justify-center gap-3">
            <Sprout size={48} className="text-amber-300" />
            <p className="text-xs text-gray-400">Photograph a plug tray</p>
          </div>

          <button
            onClick={handleCapture}
            className="w-full max-w-xs h-14 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
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
            <Loader2 size={48} className="text-amber-500 animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-amber-700">
              {elapsed}s
            </span>
          </div>

          <p className="text-base font-semibold text-gray-800 mb-1">{statusMsg}</p>
          <p className="text-xs text-gray-400">Multi-pass analysis takes 15-25 seconds</p>

          {/* Progress bar */}
          <div className="w-full max-w-xs mt-5 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-out"
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
          {/* Big Germ Rate Display */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 text-center">
            {imageData && (
              <img
                src={imageData}
                alt="Scanned tray"
                className="w-20 h-20 rounded-xl object-cover mx-auto mb-4 shadow-sm"
              />
            )}
            <p
              className="text-5xl font-bold"
              style={{ color: GERM_STATUS_COLORS[status] }}
            >
              {Math.round(germRate)}%
            </p>
            <p className="text-sm text-gray-500 mt-1">Germination Rate</p>
            <span
              className="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: GERM_STATUS_COLORS[status] }}
            >
              {GERM_STATUS_LABELS[status]}
            </span>

            {/* Target comparison */}
            {selectedLot && (
              <p className="text-xs text-gray-400 mt-2">
                vs {selectedLot.germTarget}% target
              </p>
            )}

            {/* Delta from last scan */}
            {previousScanRate !== null && (
              <p className="text-xs mt-1" style={{
                color: germRate >= previousScanRate ? '#22c55e' : '#ef4444',
              }}>
                {germRate >= previousScanRate ? '+' : ''}
                {(germRate - previousScanRate).toFixed(1)}% from last scan
              </p>
            )}
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{totalCells}</p>
              <p className="text-[10px] text-gray-500">Total</p>
            </div>
            {([
              { category: 'germinated' as GermCellCategory, value: germinatedCells, color: 'text-green-600' },
              { category: 'empty' as GermCellCategory, value: emptyCount, color: 'text-gray-400' },
              { category: 'abnormal' as GermCellCategory, value: abnormalCount, color: 'text-orange-500' },
            ] as const).map(({ category, value, color }) => (
              <button
                key={category}
                onClick={() => imageData && value > 0 && setHighlightCategory(category)}
                className={`bg-white rounded-2xl shadow-sm p-3 text-center transition-all ${
                  imageData && value > 0
                    ? 'hover:ring-2 hover:ring-amber-300 active:scale-95 cursor-pointer'
                    : 'cursor-default'
                }`}
              >
                <p className={`text-lg font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-gray-500 flex items-center justify-center gap-0.5">
                  {GERM_HIGHLIGHT_LABELS[category]}
                  {imageData && value > 0 && <Eye size={10} className="text-gray-300" />}
                </p>
              </button>
            ))}
          </div>

          {/* Visual Stacked Bar */}
          {totalCells > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Cell Breakdown</h3>
              <div className="h-4 rounded-full overflow-hidden flex">
                {germinatedCells > 0 && (
                  <div
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${(germinatedCells / totalCells) * 100}%` }}
                  />
                )}
                {emptyCount > 0 && (
                  <div
                    className="h-full bg-gray-300 transition-all duration-500"
                    style={{ width: `${(emptyCount / totalCells) * 100}%` }}
                  />
                )}
                {abnormalCount > 0 && (
                  <div
                    className="h-full bg-orange-400 transition-all duration-500"
                    style={{ width: `${(abnormalCount / totalCells) * 100}%` }}
                  />
                )}
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-[10px] text-gray-500">Germinated</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <span className="text-[10px] text-gray-500">Empty</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                  <span className="text-[10px] text-gray-500">Abnormal</span>
                </div>
              </div>
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
              placeholder="Add observations, conditions, issues..."
              className="w-full h-24 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full h-14 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 mb-4"
          >
            <Save size={20} />
            Save Scan
          </button>
        </div>
      )}

      {/* Step: Saved */}
      {step === 'saved' && (
        <div className="flex flex-col items-center pt-12">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-6">
            <CheckCircle2 size={40} className="text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Scan Saved</h2>
          <p className="text-sm text-gray-500 mb-8 text-center">
            {selectedLot
              ? `Recorded ${Math.round(germRate)}% germination for ${selectedLot.name}`
              : `Recorded ${Math.round(germRate)}% germination (Quick Scan)`}
          </p>
          <button
            onClick={handleReset}
            className="h-14 px-8 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <RotateCcw size={20} />
            Scan Another
          </button>
        </div>
      )}

      {/* Highlight Overlay */}
      {highlightCategory && imageData && (
        <ImageOverlay
          image={imageData}
          mode="germ"
          targetType={highlightCategory}
          targetLabel={GERM_HIGHLIGHT_LABELS[highlightCategory]}
          markerColor={GERM_HIGHLIGHT_COLORS[highlightCategory]}
          onClose={() => setHighlightCategory(null)}
        />
      )}
    </div>
  );
}
