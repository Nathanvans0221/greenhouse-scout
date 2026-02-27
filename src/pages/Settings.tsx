import { useState } from 'react';
import { Settings as SettingsIcon, Trash2, AlertTriangle, Bug, Pencil, Check, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { PestType } from '../types';
import { PEST_LABELS } from '../types';
import { APP_VERSION } from '../lib/constants';

export default function Settings() {
  const greenhouses = useAppStore((s) => s.greenhouses);
  const thresholds = useAppStore((s) => s.thresholds);
  const updateThreshold = useAppStore((s) => s.updateThreshold);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(
    greenhouses.length > 0 ? greenhouses[0].name : 'Main Greenhouse',
  );

  const greenhouse = greenhouses.length > 0 ? greenhouses[0] : null;

  const handleSaveName = () => {
    if (greenhouse && nameInput.trim()) {
      useAppStore.setState((state) => ({
        greenhouses: state.greenhouses.map((gh) =>
          gh.id === greenhouse.id ? { ...gh, name: nameInput.trim() } : gh,
        ),
      }));
    }
    setEditingName(false);
  };

  const handleClearData = () => {
    useAppStore.setState({
      scans: [],
      traps: [],
    });
    setShowClearConfirm(false);
  };

  const handleThresholdChange = (
    pestType: PestType,
    field: 'watch' | 'action' | 'critical',
    value: string,
  ) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) {
      updateThreshold(pestType, { [field]: num });
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon size={22} className="text-green-600" />
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Greenhouse Name */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Greenhouse</h3>
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="flex-1 h-12 px-4 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') {
                  setEditingName(false);
                  setNameInput(greenhouse?.name ?? 'Main Greenhouse');
                }
              }}
            />
            <button
              onClick={handleSaveName}
              className="w-12 h-12 flex items-center justify-center bg-green-600 rounded-xl text-white"
            >
              <Check size={18} />
            </button>
            <button
              onClick={() => {
                setEditingName(false);
                setNameInput(greenhouse?.name ?? 'Main Greenhouse');
              }}
              className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-xl text-gray-600"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm text-gray-700">
              {greenhouse?.name ?? 'Main Greenhouse'}
            </span>
            <Pencil size={14} className="text-gray-400" />
          </button>
        )}
      </div>

      {/* Threshold Configuration */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Bug size={16} className="text-green-600" />
          <h3 className="text-sm font-semibold text-gray-900">Alert Thresholds</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Set pest count thresholds for each alert level per trap scan.
        </p>

        {/* Header Row */}
        <div className="grid grid-cols-4 gap-2 mb-2 px-1">
          <div className="text-xs font-medium text-gray-500">Pest</div>
          <div className="text-xs font-medium text-yellow-600 text-center">Watch</div>
          <div className="text-xs font-medium text-orange-600 text-center">Action</div>
          <div className="text-xs font-medium text-red-600 text-center">Critical</div>
        </div>

        <div className="space-y-2">
          {thresholds.map((threshold) => (
            <div
              key={threshold.pestType}
              className="grid grid-cols-4 gap-2 items-center"
            >
              <span className="text-xs font-medium text-gray-700 truncate px-1">
                {PEST_LABELS[threshold.pestType]}
              </span>
              <input
                type="number"
                min="0"
                value={threshold.watch}
                onChange={(e) =>
                  handleThresholdChange(threshold.pestType, 'watch', e.target.value)
                }
                className="h-10 w-full text-center text-sm bg-yellow-50 border border-yellow-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400"
              />
              <input
                type="number"
                min="0"
                value={threshold.action}
                onChange={(e) =>
                  handleThresholdChange(threshold.pestType, 'action', e.target.value)
                }
                className="h-10 w-full text-center text-sm bg-orange-50 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
              />
              <input
                type="number"
                min="0"
                value={threshold.critical}
                onChange={(e) =>
                  handleThresholdChange(threshold.pestType, 'critical', e.target.value)
                }
                className="h-10 w-full text-center text-sm bg-red-50 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Clear Data */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Data</h3>
        <button
          onClick={() => setShowClearConfirm(true)}
          className="w-full h-12 bg-red-50 hover:bg-red-100 text-red-600 font-medium text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <Trash2 size={16} />
          Clear All Data
        </button>
      </div>

      {/* App Version */}
      <div className="text-center py-4 mb-4">
        <p className="text-xs text-gray-400">ScoutCard v{APP_VERSION}</p>
        <p className="text-[10px] text-gray-300 mt-1">
          AI-powered greenhouse pest monitoring
        </p>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
              Clear All Data?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will permanently delete all traps and scan history. Thresholds and
              greenhouse settings will be kept.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearData}
                className="flex-1 h-12 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Trash2 size={16} />
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
