import { create } from 'zustand';
import type { SeedLot, GermScan } from '../types';
import * as db from '../lib/db';

interface GermState {
  seedLots: SeedLot[];
  germScans: GermScan[];
  loaded: boolean;

  // Init
  loadFromDb: () => Promise<void>;

  // Lots
  addSeedLot: (lot: SeedLot) => void;
  updateSeedLot: (id: string, updates: Partial<SeedLot>) => void;
  deleteSeedLot: (id: string) => void;

  // Scans
  addGermScan: (scan: GermScan) => void;
  deleteGermScan: (id: string) => void;

  // Computed
  getActiveLots: () => SeedLot[];
  getLotScans: (lotId: string) => GermScan[];
  getRecentGermScans: (limit: number) => GermScan[];
  getLotGermRate: (lotId: string) => number | null;
  getTrayCountForLot: (lot: SeedLot) => number;
}

export const useGermStore = create<GermState>()((set, get) => ({
  seedLots: [],
  germScans: [],
  loaded: false,

  loadFromDb: async () => {
    try {
      const [seedLots, germScans] = await Promise.all([
        db.fetchSeedLots(),
        db.fetchGermScans(),
      ]);
      set({ seedLots, germScans, loaded: true });
    } catch (err) {
      console.error('Failed to load germ data from Supabase:', err);
      set({ loaded: true });
    }
  },

  // Lots
  addSeedLot: (lot) => {
    set((state) => ({ seedLots: [lot, ...state.seedLots] }));
    db.upsertSeedLot(lot).catch((e) => console.error('Failed to save seed lot:', e));
  },

  updateSeedLot: (id, updates) => {
    let updatedLot: SeedLot | undefined;
    set((state) => {
      const seedLots = state.seedLots.map((l) => {
        if (l.id === id) {
          updatedLot = { ...l, ...updates };
          return updatedLot;
        }
        return l;
      });
      return { seedLots };
    });
    if (updatedLot) {
      db.upsertSeedLot(updatedLot).catch((e) => console.error('Failed to update seed lot:', e));
    }
  },

  deleteSeedLot: (id) => {
    set((state) => ({
      seedLots: state.seedLots.filter((l) => l.id !== id),
      germScans: state.germScans.filter((s) => s.lotId !== id),
    }));
    db.deleteSeedLotRow(id).catch((e) => console.error('Failed to delete seed lot:', e));
  },

  // Scans
  addGermScan: (scan) => {
    set((state) => ({ germScans: [scan, ...state.germScans] }));
    db.insertGermScan(scan).catch((e) => console.error('Failed to save germ scan:', e));
  },

  deleteGermScan: (id) => {
    set((state) => ({ germScans: state.germScans.filter((s) => s.id !== id) }));
    db.deleteGermScanRow(id).catch((e) => console.error('Failed to delete germ scan:', e));
  },

  // Computed
  getActiveLots: () => get().seedLots.filter((l) => l.active),

  getLotScans: (lotId) =>
    get()
      .germScans.filter((s) => s.lotId === lotId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),

  getRecentGermScans: (limit) => get().germScans.slice(0, limit),

  getLotGermRate: (lotId) => {
    const scans = get()
      .germScans.filter((s) => s.lotId === lotId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return scans.length > 0 ? scans[0].germRate : null;
  },

  getTrayCountForLot: (lot) => {
    if (lot.traySize === 'custom') {
      return lot.customTraySize ?? 0;
    }
    return parseInt(lot.traySize);
  },
}));
