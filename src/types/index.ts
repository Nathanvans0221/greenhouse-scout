export type PestType =
  | 'whitefly'
  | 'thrips'
  | 'fungus_gnat'
  | 'shore_fly'
  | 'aphid'
  | 'leafminer'
  | 'other';

export type ConsistencyLevel = 'high' | 'medium' | 'low';

export interface PestCount {
  type: PestType;
  count: number;
  confidence: number;
  passResults?: number[];
  consistency?: ConsistencyLevel;
}

export interface Scan {
  id: string;
  trapId: string;
  timestamp: string;
  imageData?: string; // base64 thumbnail
  pests: PestCount[];
  totalCount: number;
  notes: string;
  analyzed: boolean;
  analyzing: boolean;
}

export interface Trap {
  id: string;
  name: string;
  zone: string;
  greenhouse: string;
  cardColor: 'yellow' | 'blue';
  position?: { x: number; y: number };
  lastScanned?: string;
  lastCount?: number;
  alertLevel: AlertLevel;
}

export type AlertLevel = 'safe' | 'watch' | 'action' | 'critical';

export interface Greenhouse {
  id: string;
  name: string;
  zones: string[];
}

export interface ThresholdConfig {
  pestType: PestType;
  watch: number;
  action: number;
  critical: number;
}

export type TimeRange = 'day' | 'week' | 'month' | 'year';

export interface TrendDataPoint {
  date: string;
  label: string;
  whitefly: number;
  thrips: number;
  fungus_gnat: number;
  shore_fly: number;
  aphid: number;
  leafminer: number;
  other: number;
  total: number;
}

export const PEST_LABELS: Record<PestType, string> = {
  whitefly: 'Whitefly',
  thrips: 'Thrips',
  fungus_gnat: 'Fungus Gnat',
  shore_fly: 'Shore Fly',
  aphid: 'Aphid',
  leafminer: 'Leafminer',
  other: 'Other',
};

export const PEST_COLORS: Record<PestType, string> = {
  whitefly: '#f97316',
  thrips: '#eab308',
  fungus_gnat: '#6b7280',
  shore_fly: '#8b5cf6',
  aphid: '#22c55e',
  leafminer: '#3b82f6',
  other: '#a3a3a3',
};

export const ALERT_COLORS: Record<AlertLevel, string> = {
  safe: '#22c55e',
  watch: '#eab308',
  action: '#f97316',
  critical: '#ef4444',
};

export const ALERT_LABELS: Record<AlertLevel, string> = {
  safe: 'Safe',
  watch: 'Watch',
  action: 'Action Needed',
  critical: 'Critical',
};

export const DEFAULT_THRESHOLDS: ThresholdConfig[] = [
  { pestType: 'whitefly', watch: 5, action: 15, critical: 30 },
  { pestType: 'thrips', watch: 10, action: 15, critical: 30 },
  { pestType: 'fungus_gnat', watch: 10, action: 25, critical: 50 },
  { pestType: 'shore_fly', watch: 20, action: 40, critical: 80 },
  { pestType: 'aphid', watch: 3, action: 8, critical: 15 },
  { pestType: 'leafminer', watch: 1, action: 3, critical: 8 },
  { pestType: 'other', watch: 10, action: 20, critical: 40 },
];

// ========== Germ Types ==========

export type TraySize = '128' | '200' | '288' | '512' | 'custom';

export const TRAY_SIZE_LABELS: Record<TraySize, string> = {
  '128': '128 cells',
  '200': '200 cells',
  '288': '288 cells',
  '512': '512 cells',
  'custom': 'Custom',
};

export interface SeedLot {
  id: string;
  name: string;
  crop: string;
  variety: string;
  supplier: string;
  seedDate: string; // ISO date
  traySize: TraySize;
  customTraySize?: number;
  trayCount: number;
  expectedGermDays: number; // typically 5-14
  germTarget: number; // target germ rate percentage, e.g. 90
  notes: string;
  active: boolean;
}

export interface GermScan {
  id: string;
  lotId: string;
  timestamp: string;
  imageData?: string; // base64 thumbnail
  totalCells: number;
  germinatedCells: number;
  emptyCount: number;
  abnormalCount: number;
  germRate: number; // 0-100 percentage
  notes: string;
  analyzed: boolean;
  analyzing: boolean;
  daysAfterSeeding: number;
}

export interface GermTrendDataPoint {
  date: string;
  label: string;
  germRate: number;
  lotId: string;
  lotName: string;
}

export const GERM_STATUS_COLORS = {
  excellent: '#22c55e', // >=90%
  good: '#84cc16',      // >=80%
  fair: '#eab308',      // >=70%
  poor: '#f97316',      // >=50%
  failing: '#ef4444',   // <50%
} as const;

export type GermStatus = keyof typeof GERM_STATUS_COLORS;

export function getGermStatus(rate: number): GermStatus {
  if (rate >= 90) return 'excellent';
  if (rate >= 80) return 'good';
  if (rate >= 70) return 'fair';
  if (rate >= 50) return 'poor';
  return 'failing';
}

export const GERM_STATUS_LABELS: Record<GermStatus, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  failing: 'Failing',
};

// ========== Highlight Overlay Types ==========

export type HighlightMode = 'scout' | 'germ';

export type GermCellCategory = 'germinated' | 'empty' | 'abnormal';

export interface HighlightLocation {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
}

export interface HighlightResult {
  locations: HighlightLocation[];
  count: number;
  description: string;
  error?: string;
}

export const GERM_HIGHLIGHT_COLORS: Record<GermCellCategory, string> = {
  germinated: '#22c55e',
  empty: '#9ca3af',
  abnormal: '#f97316',
};

export const GERM_HIGHLIGHT_LABELS: Record<GermCellCategory, string> = {
  germinated: 'Germinated',
  empty: 'Empty',
  abnormal: 'Abnormal',
};
