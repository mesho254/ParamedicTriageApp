// ============================================================
// Redux Store — Triage Slice
// ============================================================
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import NetInfo from '@react-native-community/netinfo';
import { TriageRecord, Priority, Status, SyncStatus } from '../types';
import { insertRecord, getAllRecords } from '../services/database';
import { submitTriageRecord } from '../services/mockApi';
import { updateSyncStatus } from '../services/database';

/** Generates a simple cryptographically sufficient unique ID for records */
const generateUniqueId = (): string => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
};


// ─── State ────────────────────────────────────────────────
interface TriageState {
  records: TriageRecord[];
  isSubmitting: boolean;
  isLoading: boolean;
  pendingCount: number;
  error: string | null;
  lastSubmitResult: 'idle' | 'saved_offline' | 'synced' | 'failed' | 'queued_retry';
  isOfflineSimulated: boolean;
}

const initialState: TriageState = {
  records: [],
  isSubmitting: false,
  isLoading: false,
  pendingCount: 0,
  error: null,
  lastSubmitResult: 'idle',
  isOfflineSimulated: false,
};

// ─── Thunks ───────────────────────────────────────────────

/**
 * Submits a new triage record.
 *
 * Offline-first flow:
 *  1. Always insert into SQLite immediately (data is never lost)
 *  2. Check network state
 *  3a. Offline → return savedOffline=true (background sync will pick it up)
 *  3b. Online  → attempt API call
 *       → Success: mark synced
 *       → Failure: keep queued, return queuedRetry=true (background sync retries)
 */
export const submitTriage = createAsyncThunk(
  'triage/submit',
  async (
    payload: { patientName: string; conditionDescription: string; priorityLevel: Priority; status: Status },
    { getState, rejectWithValue }
  ) => {
    const record: TriageRecord = {
      id: generateUniqueId(),
      ...payload,
      syncStatus: 'queued',
      createdAt: Date.now(),
      retryCount: 0,
    };

    // ── Step 1: Always save locally first ────────────────
    try {
      await insertRecord(record);
    } catch (dbErr) {
      console.error('[Triage] Failed to insert record into SQLite:', dbErr);
      return rejectWithValue('Failed to save record locally.');
    }

    // ── Step 2: Check connectivity ────────────────────────
    let isConnected = false;
    const state = getState() as { triage: TriageState };
    if (state.triage.isOfflineSimulated) {
      isConnected = false;
    } else {
      try {
        const netState = await NetInfo.fetch();
        // isInternetReachable can be null on some emulators — treat null as connected
        isConnected = !!(
          netState.isConnected &&
          netState.isInternetReachable !== false
        );
      } catch {
        // If NetInfo itself fails, assume offline and rely on background sync
        isConnected = false;
      }
    }

    if (!isConnected) {
      console.log('[Triage] Offline — record queued locally, will sync on reconnect.');
      return { record, savedOffline: true, queuedRetry: false };
    }

    // ── Step 3: Attempt immediate API sync ───────────────
    try {
      await updateSyncStatus(record.id, 'syncing');
      await submitTriageRecord(record);
      const now = Date.now();
      await updateSyncStatus(record.id, 'synced', now);
      console.log('[Triage] ✅ Submitted and synced record', record.id);
      return {
        record: { ...record, syncStatus: 'synced' as SyncStatus, syncedAt: now },
        savedOffline: false,
        queuedRetry: false,
      };
    } catch (err) {
      // API failed while online — keep as queued, background sync will retry
      await updateSyncStatus(record.id, 'queued');
      console.warn('[Triage] Online submit failed, queued for background retry:', err);
      return { record, savedOffline: false, queuedRetry: true };
    }
  }
);

/**
 * Loads all records from SQLite into Redux.
 * Called once on app startup.
 * IMPORTANT: Only overwrites Redux state if SQLite returns records.
 * This prevents a race condition where an empty DB read wipes in-memory records.
 */
export const loadRecords = createAsyncThunk('triage/loadAll', async () => {
  const records = await getAllRecords();
  return records;
});

// ─── Slice ────────────────────────────────────────────────
const triageSlice = createSlice({
  name: 'triage',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    resetSubmitResult(state) {
      state.lastSubmitResult = 'idle';
    },
    syncStatusChanged(
      state,
      action: PayloadAction<{ id: string; syncStatus: SyncStatus; syncedAt?: number }>
    ) {
      const record = state.records.find((r) => r.id === action.payload.id);
      if (record) {
        record.syncStatus = action.payload.syncStatus;
        if (action.payload.syncedAt) record.syncedAt = action.payload.syncedAt;
      }
      state.pendingCount = state.records.filter(
        (r) => r.syncStatus === 'queued' || r.syncStatus === 'failed'
      ).length;
    },
    toggleOfflineSimulation(state) {
      state.isOfflineSimulated = !state.isOfflineSimulated;
    },
  },
  extraReducers: (builder) => {
    // ── submitTriage ──────────────────────────────────────
    builder
      .addCase(submitTriage.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
        state.lastSubmitResult = 'idle';
      })
      .addCase(submitTriage.fulfilled, (state, action) => {
        state.isSubmitting = false;
        // Add record to top of list
        state.records.unshift(action.payload.record);
        // Determine result type for UI feedback
        if (action.payload.savedOffline) {
          state.lastSubmitResult = 'saved_offline';
        } else if (action.payload.queuedRetry) {
          state.lastSubmitResult = 'queued_retry';
        } else {
          state.lastSubmitResult = 'synced';
        }
        state.pendingCount = state.records.filter(
          (r) => r.syncStatus === 'queued' || r.syncStatus === 'failed'
        ).length;
      })
      .addCase(submitTriage.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = (action.payload as string) ?? action.error.message ?? 'Submission failed';
        state.lastSubmitResult = 'failed';
        console.error('[Triage Slice] submitTriage rejected:', state.error, action.error);
      });


    // ── loadRecords ───────────────────────────────────────
    builder
      .addCase(loadRecords.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadRecords.fulfilled, (state, action) => {
        state.isLoading = false;
        // Only replace records if SQLite actually returned data.
        // This prevents an empty DB read from wiping in-memory records.
        if (action.payload.length > 0 || state.records.length === 0) {
          state.records = action.payload;
        }
        state.pendingCount = state.records.filter(
          (r) => r.syncStatus === 'queued' || r.syncStatus === 'failed'
        ).length;
      })
      .addCase(loadRecords.rejected, (state) => {
        state.isLoading = false;
      });
  },
});

export const { clearError, resetSubmitResult, syncStatusChanged, toggleOfflineSimulation } = triageSlice.actions;
export default triageSlice.reducer;

// ─── Selectors ────────────────────────────────────────────
export const selectAllRecords = (state: { triage: TriageState }) => state.triage.records;
export const selectPendingCount = (state: { triage: TriageState }) => state.triage.pendingCount;
export const selectIsSubmitting = (state: { triage: TriageState }) => state.triage.isSubmitting;
export const selectLastSubmitResult = (state: { triage: TriageState }) => state.triage.lastSubmitResult;
export const selectError = (state: { triage: TriageState }) => state.triage.error;
export const selectIsLoading = (state: { triage: TriageState }) => state.triage.isLoading;
export const selectIsOfflineSimulated = (state: { triage: TriageState }) => state.triage.isOfflineSimulated;
export const selectCriticalRecords = (state: { triage: TriageState }) =>
  state.triage.records.filter((r) => r.priorityLevel <= 2);
