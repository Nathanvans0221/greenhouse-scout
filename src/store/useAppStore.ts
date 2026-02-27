import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Scan, Trap, ThresholdConfig, AlertLevel, PestType, Greenhouse } from '../types';
import { DEFAULT_THRESHOLDS } from '../types';

interface AppState {
  // Data
  scans: Scan[];
  traps: Trap[];
  greenhouses: Greenhouse[];
  thresholds: ThresholdConfig[];

  // Actions - Scans
  addScan: (scan: Scan) => void;
  updateScan: (id: string, updates: Partial<Scan>) => void;
  deleteScan: (id: string) => void;

  // Actions - Traps
  addTrap: (trap: Trap) => void;
  updateTrap: (id: string, updates: Partial<Trap>) => void;
  deleteTrap: (id: string) => void;

  // Actions - Greenhouses
  addGreenhouse: (gh: Greenhouse) => void;

  // Actions - Settings
  updateThreshold: (pestType: PestType, updates: Partial<ThresholdConfig>) => void;

  // Computed helpers
  getAlertLevel: (pestType: PestType, count: number) => AlertLevel;
  getTrapScans: (trapId: string) => Scan[];
  getRecentScans: (limit: number) => Scan[];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      scans: [],
      traps: [],
      greenhouses: [
        { id: 'default', name: 'Main Greenhouse', zones: ['Zone A', 'Zone B', 'Zone C', 'Zone D'] },
      ],
      thresholds: DEFAULT_THRESHOLDS,

      addScan: (scan) =>
        set((state) => ({
          scans: [scan, ...state.scans],
          traps: state.traps.map((t) =>
            t.id === scan.trapId
              ? {
                  ...t,
                  lastScanned: scan.timestamp,
                  lastCount: scan.totalCount,
                  alertLevel: getHighestAlert(scan, state.thresholds),
                }
              : t,
          ),
        })),

      updateScan: (id, updates) =>
        set((state) => ({
          scans: state.scans.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),

      deleteScan: (id) =>
        set((state) => ({ scans: state.scans.filter((s) => s.id !== id) })),

      addTrap: (trap) =>
        set((state) => ({ traps: [...state.traps, trap] })),

      updateTrap: (id, updates) =>
        set((state) => ({
          traps: state.traps.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      deleteTrap: (id) =>
        set((state) => ({
          traps: state.traps.filter((t) => t.id !== id),
          scans: state.scans.filter((s) => s.trapId !== id),
        })),

      addGreenhouse: (gh) =>
        set((state) => ({ greenhouses: [...state.greenhouses, gh] })),

      updateThreshold: (pestType, updates) =>
        set((state) => ({
          thresholds: state.thresholds.map((t) =>
            t.pestType === pestType ? { ...t, ...updates } : t,
          ),
        })),

      getAlertLevel: (pestType, count) => {
        const threshold = get().thresholds.find((t) => t.pestType === pestType);
        if (!threshold) return 'safe';
        if (count >= threshold.critical) return 'critical';
        if (count >= threshold.action) return 'action';
        if (count >= threshold.watch) return 'watch';
        return 'safe';
      },

      getTrapScans: (trapId) => get().scans.filter((s) => s.trapId === trapId),

      getRecentScans: (limit) => get().scans.slice(0, limit),
    }),
    {
      name: 'scoutcard-storage',
      partialize: (state) => ({
        scans: state.scans.map((s) => ({ ...s, imageData: undefined })),
        traps: state.traps,
        greenhouses: state.greenhouses,
        thresholds: state.thresholds,
      }),
    },
  ),
);

function getHighestAlert(scan: Scan, thresholds: ThresholdConfig[]): AlertLevel {
  const levels: AlertLevel[] = ['safe', 'watch', 'action', 'critical'];
  let highest = 0;
  for (const pest of scan.pests) {
    const threshold = thresholds.find((t) => t.pestType === pest.type);
    if (!threshold) continue;
    let level = 0;
    if (pest.count >= threshold.critical) level = 3;
    else if (pest.count >= threshold.action) level = 2;
    else if (pest.count >= threshold.watch) level = 1;
    highest = Math.max(highest, level);
  }
  return levels[highest];
}
