import { create } from 'zustand';
import type { Scan, Trap, ThresholdConfig, AlertLevel, PestType, Greenhouse } from '../types';
import { DEFAULT_THRESHOLDS } from '../types';
import * as db from '../lib/db';

interface AppState {
  // Data
  scans: Scan[];
  traps: Trap[];
  greenhouses: Greenhouse[];
  thresholds: ThresholdConfig[];
  loaded: boolean;

  // Init
  loadFromDb: () => Promise<void>;

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

export const useAppStore = create<AppState>()((set, get) => ({
  scans: [],
  traps: [],
  greenhouses: [
    { id: 'default', name: 'Main Greenhouse', zones: ['Zone A', 'Zone B', 'Zone C', 'Zone D'] },
  ],
  thresholds: DEFAULT_THRESHOLDS,
  loaded: false,

  loadFromDb: async () => {
    try {
      const [scans, traps, greenhouses, thresholds] = await Promise.all([
        db.fetchScans(),
        db.fetchTraps(),
        db.fetchGreenhouses(),
        db.fetchThresholds(),
      ]);
      set({
        scans,
        traps,
        greenhouses: greenhouses.length > 0 ? greenhouses : get().greenhouses,
        thresholds: thresholds.length > 0 ? thresholds : get().thresholds,
        loaded: true,
      });
    } catch (err) {
      console.error('Failed to load from Supabase:', err);
      set({ loaded: true });
    }
  },

  addScan: (scan) => {
    const state = get();
    const updatedTraps = state.traps.map((t) =>
      t.id === scan.trapId
        ? {
            ...t,
            lastScanned: scan.timestamp,
            lastCount: scan.totalCount,
            alertLevel: getHighestAlert(scan, state.thresholds),
          }
        : t,
    );

    set({ scans: [scan, ...state.scans], traps: updatedTraps });

    // Write to DB (fire-and-forget)
    db.insertScan(scan).catch((e) => console.error('Failed to save scan:', e));
    // Update trap in DB if it was modified
    const updatedTrap = updatedTraps.find((t) => t.id === scan.trapId);
    if (updatedTrap) {
      db.upsertTrap(updatedTrap).catch((e) => console.error('Failed to update trap:', e));
    }
  },

  updateScan: (id, updates) =>
    set((state) => ({
      scans: state.scans.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),

  deleteScan: (id) => {
    set((state) => ({ scans: state.scans.filter((s) => s.id !== id) }));
    db.deleteScanRow(id).catch((e) => console.error('Failed to delete scan:', e));
  },

  addTrap: (trap) => {
    set((state) => ({ traps: [...state.traps, trap] }));
    db.upsertTrap(trap).catch((e) => console.error('Failed to save trap:', e));
  },

  updateTrap: (id, updates) => {
    let updatedTrap: Trap | undefined;
    set((state) => {
      const traps = state.traps.map((t) => {
        if (t.id === id) {
          updatedTrap = { ...t, ...updates };
          return updatedTrap;
        }
        return t;
      });
      return { traps };
    });
    if (updatedTrap) {
      db.upsertTrap(updatedTrap).catch((e) => console.error('Failed to update trap:', e));
    }
  },

  deleteTrap: (id) => {
    set((state) => ({
      traps: state.traps.filter((t) => t.id !== id),
      scans: state.scans.filter((s) => s.trapId !== id),
    }));
    db.deleteTrapRow(id).catch((e) => console.error('Failed to delete trap:', e));
  },

  addGreenhouse: (gh) => {
    set((state) => ({ greenhouses: [...state.greenhouses, gh] }));
    db.insertGreenhouse(gh).catch((e) => console.error('Failed to save greenhouse:', e));
  },

  updateThreshold: (pestType, updates) => {
    set((state) => ({
      thresholds: state.thresholds.map((t) =>
        t.pestType === pestType ? { ...t, ...updates } : t,
      ),
    }));
    db.updateThresholdRow(pestType, updates).catch((e) => console.error('Failed to update threshold:', e));
  },

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
}));

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
