// ============================================================
// Core Domain Types — Paramedic Triage Intake App
// ============================================================

/** Priority 1 = Absolute critical / life-threatening. Priority 5 = Non-urgent. */
export type Priority = 1 | 2 | 3 | 4 | 5;

export type Status = 'Pending' | 'In-Transit';

export type SyncStatus = 'queued' | 'syncing' | 'synced' | 'failed';

export interface TriageRecord {
  id: string;                   // UUID v4
  patientName: string;
  conditionDescription: string;
  priorityLevel: Priority;
  status: Status;
  syncStatus: SyncStatus;
  createdAt: number;            // Unix timestamp ms
  syncedAt?: number;            // Unix timestamp ms, set on successful sync
  retryCount?: number;          // Number of sync retry attempts
}

/** Priority metadata for UI rendering */
export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; shortLabel: string; color: string; textColor: string; bgLight: string }
> = {
  1: {
    label: 'IMMEDIATE',
    shortLabel: 'P1',
    color: '#CC0000',
    textColor: '#FFFFFF',
    bgLight: '#FFE5E5',
  },
  2: {
    label: 'EMERGENT',
    shortLabel: 'P2',
    color: '#E84118',
    textColor: '#FFFFFF',
    bgLight: '#FDECEA',
  },
  3: {
    label: 'URGENT',
    shortLabel: 'P3',
    color: '#E67E22',
    textColor: '#FFFFFF',
    bgLight: '#FEF3E2',
  },
  4: {
    label: 'SEMI-URGENT',
    shortLabel: 'P4',
    color: '#D4AC0D',
    textColor: '#1A1A1A',
    bgLight: '#FFFDE7',
  },
  5: {
    label: 'NON-URGENT',
    shortLabel: 'P5',
    color: '#27AE60',
    textColor: '#FFFFFF',
    bgLight: '#E8F8EE',
  },
};
