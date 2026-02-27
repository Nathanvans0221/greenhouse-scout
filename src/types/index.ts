export type PestType =
  | 'whitefly'
  | 'thrips'
  | 'fungus_gnat'
  | 'shore_fly'
  | 'aphid'
  | 'leafminer'
  | 'other';

export interface PestCount {
  type: PestType;
  count: number;
  confidence: number;
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
