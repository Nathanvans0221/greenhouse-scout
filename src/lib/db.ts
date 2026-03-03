import { supabase } from './supabase';
import type { Scan, Trap, ThresholdConfig, PestType, Greenhouse, SeedLot, GermScan, TraySize } from '../types';

// ========== Scans ==========

interface ScanRow {
  id: string;
  trap_id: string;
  timestamp: string;
  pests: unknown;
  total_count: number;
  pass_count: number;
  notes: string;
  analyzed: boolean;
}

function rowToScan(row: ScanRow): Scan {
  return {
    id: row.id,
    trapId: row.trap_id,
    timestamp: row.timestamp,
    pests: row.pests as Scan['pests'],
    totalCount: row.total_count,
    notes: row.notes,
    analyzed: row.analyzed,
    analyzing: false,
  };
}

export async function fetchScans(): Promise<Scan[]> {
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToScan);
}

export async function insertScan(scan: Scan): Promise<void> {
  const { error } = await supabase.from('scans').insert({
    id: scan.id,
    trap_id: scan.trapId,
    timestamp: scan.timestamp,
    pests: scan.pests,
    total_count: scan.totalCount,
    pass_count: 0,
    notes: scan.notes,
    analyzed: scan.analyzed,
  });
  if (error) throw error;
}

export async function deleteScanRow(id: string): Promise<void> {
  const { error } = await supabase.from('scans').delete().eq('id', id);
  if (error) throw error;
}

// ========== Traps ==========

interface TrapRow {
  id: string;
  name: string;
  zone: string;
  greenhouse: string;
  card_color: string;
  position_x: number | null;
  position_y: number | null;
  last_scanned: string | null;
  last_count: number | null;
  alert_level: string;
}

function rowToTrap(row: TrapRow): Trap {
  return {
    id: row.id,
    name: row.name,
    zone: row.zone,
    greenhouse: row.greenhouse,
    cardColor: row.card_color as 'yellow' | 'blue',
    position: row.position_x != null && row.position_y != null
      ? { x: row.position_x, y: row.position_y }
      : undefined,
    lastScanned: row.last_scanned ?? undefined,
    lastCount: row.last_count ?? undefined,
    alertLevel: row.alert_level as Trap['alertLevel'],
  };
}

export async function fetchTraps(): Promise<Trap[]> {
  const { data, error } = await supabase.from('traps').select('*').order('created_at');
  if (error) throw error;
  return (data ?? []).map(rowToTrap);
}

export async function upsertTrap(trap: Trap): Promise<void> {
  const { error } = await supabase.from('traps').upsert({
    id: trap.id,
    name: trap.name,
    zone: trap.zone,
    greenhouse: trap.greenhouse,
    card_color: trap.cardColor,
    position_x: trap.position?.x ?? null,
    position_y: trap.position?.y ?? null,
    last_scanned: trap.lastScanned ?? null,
    last_count: trap.lastCount ?? null,
    alert_level: trap.alertLevel,
  });
  if (error) throw error;
}

export async function deleteTrapRow(id: string): Promise<void> {
  await supabase.from('scans').delete().eq('trap_id', id);
  const { error } = await supabase.from('traps').delete().eq('id', id);
  if (error) throw error;
}

// ========== Greenhouses ==========

interface GreenhouseRow {
  id: string;
  name: string;
  zones: string[];
}

export async function fetchGreenhouses(): Promise<Greenhouse[]> {
  const { data, error } = await supabase.from('greenhouses').select('*');
  if (error) throw error;
  return (data ?? []).map((r: GreenhouseRow) => ({ id: r.id, name: r.name, zones: r.zones }));
}

export async function insertGreenhouse(gh: Greenhouse): Promise<void> {
  const { error } = await supabase.from('greenhouses').insert({
    id: gh.id,
    name: gh.name,
    zones: gh.zones,
  });
  if (error) throw error;
}

// ========== Thresholds ==========

interface ThresholdRow {
  pest_type: string;
  watch: number;
  action: number;
  critical: number;
}

export async function fetchThresholds(): Promise<ThresholdConfig[]> {
  const { data, error } = await supabase.from('thresholds').select('*');
  if (error) throw error;
  return (data ?? []).map((r: ThresholdRow) => ({
    pestType: r.pest_type as PestType,
    watch: r.watch,
    action: r.action,
    critical: r.critical,
  }));
}

export async function updateThresholdRow(pestType: PestType, updates: Partial<ThresholdConfig>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.watch !== undefined) row.watch = updates.watch;
  if (updates.action !== undefined) row.action = updates.action;
  if (updates.critical !== undefined) row.critical = updates.critical;
  const { error } = await supabase.from('thresholds').update(row).eq('pest_type', pestType);
  if (error) throw error;
}

// ========== Seed Lots ==========

interface SeedLotRow {
  id: string;
  name: string;
  crop: string;
  variety: string;
  supplier: string;
  seed_date: string;
  tray_size: string;
  custom_tray_size: number | null;
  tray_count: number;
  expected_germ_days: number;
  germ_target: number;
  notes: string;
  active: boolean;
}

function rowToSeedLot(row: SeedLotRow): SeedLot {
  return {
    id: row.id,
    name: row.name,
    crop: row.crop,
    variety: row.variety,
    supplier: row.supplier,
    seedDate: row.seed_date,
    traySize: row.tray_size as TraySize,
    customTraySize: row.custom_tray_size ?? undefined,
    trayCount: row.tray_count,
    expectedGermDays: row.expected_germ_days,
    germTarget: row.germ_target,
    notes: row.notes,
    active: row.active,
  };
}

export async function fetchSeedLots(): Promise<SeedLot[]> {
  const { data, error } = await supabase.from('seed_lots').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToSeedLot);
}

export async function upsertSeedLot(lot: SeedLot): Promise<void> {
  const { error } = await supabase.from('seed_lots').upsert({
    id: lot.id,
    name: lot.name,
    crop: lot.crop,
    variety: lot.variety,
    supplier: lot.supplier,
    seed_date: lot.seedDate,
    tray_size: lot.traySize,
    custom_tray_size: lot.customTraySize ?? null,
    tray_count: lot.trayCount,
    expected_germ_days: lot.expectedGermDays,
    germ_target: lot.germTarget,
    notes: lot.notes,
    active: lot.active,
  });
  if (error) throw error;
}

export async function deleteSeedLotRow(id: string): Promise<void> {
  await supabase.from('germ_scans').delete().eq('lot_id', id);
  const { error } = await supabase.from('seed_lots').delete().eq('id', id);
  if (error) throw error;
}

// ========== Germ Scans ==========

interface GermScanRow {
  id: string;
  lot_id: string;
  timestamp: string;
  total_cells: number;
  germinated_cells: number;
  empty_count: number;
  abnormal_count: number;
  germ_rate: number;
  notes: string;
  analyzed: boolean;
  days_after_seeding: number;
}

function rowToGermScan(row: GermScanRow): GermScan {
  return {
    id: row.id,
    lotId: row.lot_id,
    timestamp: row.timestamp,
    totalCells: row.total_cells,
    germinatedCells: row.germinated_cells,
    emptyCount: row.empty_count,
    abnormalCount: row.abnormal_count,
    germRate: Number(row.germ_rate),
    notes: row.notes,
    analyzed: row.analyzed,
    analyzing: false,
    daysAfterSeeding: row.days_after_seeding,
  };
}

export async function fetchGermScans(): Promise<GermScan[]> {
  const { data, error } = await supabase
    .from('germ_scans')
    .select('*')
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToGermScan);
}

export async function insertGermScan(scan: GermScan): Promise<void> {
  const { error } = await supabase.from('germ_scans').insert({
    id: scan.id,
    lot_id: scan.lotId,
    timestamp: scan.timestamp,
    total_cells: scan.totalCells,
    germinated_cells: scan.germinatedCells,
    empty_count: scan.emptyCount,
    abnormal_count: scan.abnormalCount,
    germ_rate: scan.germRate,
    notes: scan.notes,
    analyzed: scan.analyzed,
    days_after_seeding: scan.daysAfterSeeding,
  });
  if (error) throw error;
}

export async function deleteGermScanRow(id: string): Promise<void> {
  const { error } = await supabase.from('germ_scans').delete().eq('id', id);
  if (error) throw error;
}
