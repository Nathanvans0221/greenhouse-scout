import { useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { formatDistanceToNow } from 'date-fns';
import { Plus, MapPin, X, Trash2, ChevronRight, Clock, Camera } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { Trap, Scan } from '../types';
import { ALERT_COLORS, ALERT_LABELS } from '../types';

export default function Traps() {
  const traps = useAppStore((s) => s.traps);
  const greenhouses = useAppStore((s) => s.greenhouses);
  const addTrap = useAppStore((s) => s.addTrap);
  const deleteTrap = useAppStore((s) => s.deleteTrap);
  const getTrapScans = useAppStore((s) => s.getTrapScans);

  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formZone, setFormZone] = useState('');
  const [formColor, setFormColor] = useState<'yellow' | 'blue'>('yellow');

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const zones = greenhouses.length > 0 ? greenhouses[0].zones : ['Zone A', 'Zone B', 'Zone C', 'Zone D'];
  const greenhouseName = greenhouses.length > 0 ? greenhouses[0].name : 'Main Greenhouse';

  const handleAddTrap = () => {
    if (!formName.trim() || !formZone) return;

    const trap: Trap = {
      id: uuidv4(),
      name: formName.trim(),
      zone: formZone,
      greenhouse: greenhouseName,
      cardColor: formColor,
      alertLevel: 'safe',
    };

    addTrap(trap);
    setFormName('');
    setFormZone('');
    setFormColor('yellow');
    setShowForm(false);
  };

  const handleLongPressStart = useCallback((trapId: string) => {
    longPressTimer.current = setTimeout(() => {
      setDeleteConfirm(trapId);
    }, 600);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleDelete = (trapId: string) => {
    deleteTrap(trapId);
    setDeleteConfirm(null);
    setShowHistory(null);
  };

  const historyTrap = showHistory ? traps.find((t) => t.id === showHistory) : null;
  const historyScans: Scan[] = showHistory ? getTrapScans(showHistory) : [];

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Traps</h1>
          <p className="text-sm text-gray-500">{traps.length} registered</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="h-10 px-4 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-medium text-sm rounded-xl flex items-center gap-1.5 transition-all active:scale-95"
        >
          <Plus size={18} />
          Add Trap
        </button>
      </div>

      {/* Trap List */}
      {traps.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <MapPin size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No traps yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Add your first sticky trap to start monitoring
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {traps.map((trap) => (
            <div
              key={trap.id}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
              onTouchStart={() => handleLongPressStart(trap.id)}
              onTouchEnd={handleLongPressEnd}
              onTouchCancel={handleLongPressEnd}
              onMouseDown={() => handleLongPressStart(trap.id)}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
            >
              <button
                onClick={() => setShowHistory(trap.id)}
                className="w-full p-4 flex items-center gap-3 text-left active:bg-gray-50 transition-colors"
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    trap.cardColor === 'yellow'
                      ? 'bg-yellow-100'
                      : 'bg-blue-100'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg ${
                      trap.cardColor === 'yellow'
                        ? 'bg-yellow-400'
                        : 'bg-blue-400'
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {trap.name}
                    </p>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-white shrink-0"
                      style={{ backgroundColor: ALERT_COLORS[trap.alertLevel] }}
                    >
                      {ALERT_LABELS[trap.alertLevel]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{trap.zone}</span>
                    {trap.lastScanned && (
                      <>
                        <span className="text-xs text-gray-300">|</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={10} />
                          {formatDistanceToNow(new Date(trap.lastScanned), { addSuffix: true })}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {trap.lastCount !== undefined && (
                  <div className="text-right shrink-0 mr-1">
                    <p className="text-lg font-bold text-gray-900">{trap.lastCount}</p>
                    <p className="text-[10px] text-gray-400">last count</p>
                  </div>
                )}

                <ChevronRight size={18} className="text-gray-300 shrink-0" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mt-4">
        Long-press a trap to delete
      </p>

      {/* Add Trap Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Add Trap</h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Trap Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Bench 1 - North"
                  className="w-full h-12 px-4 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Zone
                </label>
                <select
                  value={formZone}
                  onChange={(e) => setFormZone(e.target.value)}
                  className="w-full h-12 px-4 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600 appearance-none"
                >
                  <option value="">Select a zone...</option>
                  {zones.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Card Color
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setFormColor('yellow')}
                    className={`flex-1 h-12 rounded-xl border-2 flex items-center justify-center gap-2 transition-colors ${
                      formColor === 'yellow'
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="w-5 h-5 rounded bg-yellow-400" />
                    <span className="text-sm font-medium text-gray-700">Yellow</span>
                  </button>
                  <button
                    onClick={() => setFormColor('blue')}
                    className={`flex-1 h-12 rounded-xl border-2 flex items-center justify-center gap-2 transition-colors ${
                      formColor === 'blue'
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="w-5 h-5 rounded bg-blue-400" />
                    <span className="text-sm font-medium text-gray-700">Blue</span>
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleAddTrap}
              disabled={!formName.trim() || !formZone}
              className="w-full h-14 mt-6 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-300 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:active:scale-100"
            >
              <Plus size={20} />
              Add Trap
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Trap?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently remove the trap and all its scan history.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 h-12 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan History Modal */}
      {showHistory && historyTrap && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{historyTrap.name}</h2>
                <p className="text-sm text-gray-500">{historyTrap.zone}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDeleteConfirm(historyTrap.id)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50"
                >
                  <Trash2 size={18} className="text-red-500" />
                </button>
                <button
                  onClick={() => setShowHistory(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            {historyScans.length === 0 ? (
              <div className="py-8 text-center">
                <Camera size={28} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No scans recorded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {historyScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="bg-gray-50 rounded-xl p-3 flex items-center gap-3"
                  >
                    {scan.imageData ? (
                      <img
                        src={scan.imageData}
                        alt="Scan"
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                        <Camera size={14} className="text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(scan.timestamp), {
                          addSuffix: true,
                        })}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {scan.pests.map((p) => (
                          <span
                            key={p.type}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600"
                          >
                            {p.type}: {p.count}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-lg font-bold text-gray-900 shrink-0">
                      {scan.totalCount}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
