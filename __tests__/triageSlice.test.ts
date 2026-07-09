/**
 * @jest-environment node
 */
// ============================================================
// Unit Tests — Redux triageSlice
// ============================================================
import { configureStore } from '@reduxjs/toolkit';
import triageReducer, {
  submitTriage,
  loadRecords,
  syncStatusChanged,
  clearError,
  resetSubmitResult,
  selectAllRecords,
  selectPendingCount,
  selectIsSubmitting,
} from '../src/store/triageSlice';
import { TriageRecord } from '../src/types';

// ── Mocks ──────────────────────────────────────────────────
jest.mock('../src/services/database', () => ({
  insertRecord: jest.fn().mockResolvedValue(undefined),
  getAllRecords: jest.fn().mockResolvedValue([]),
  updateSyncStatus: jest.fn().mockResolvedValue(undefined),
  incrementRetryCount: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/mockApi', () => ({
  submitTriageRecord: jest.fn().mockResolvedValue({ success: true, id: 'test', message: 'ok', timestamp: Date.now() }),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true, type: 'wifi' }),
  addEventListener: jest.fn().mockReturnValue(() => {}),
}));

jest.mock('uuid', () => ({ v4: () => 'mocked-uuid' }));

// ── Test Store Factory ────────────────────────────────────
const makeStore = () =>
  configureStore({ reducer: { triage: triageReducer } });

describe('triageSlice', () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
    jest.clearAllMocks();
  });

  // ── Initial State ─────────────────────────────────────
  it('has correct initial state', () => {
    const state = store.getState().triage;
    expect(state.records).toEqual([]);
    expect(state.isSubmitting).toBe(false);
    expect(state.pendingCount).toBe(0);
    expect(state.error).toBeNull();
    expect(state.lastSubmitResult).toBe('idle');
  });

  // ── submitTriage — Online Path ────────────────────────
  it('submits a record online and marks it synced', async () => {
    await store.dispatch(
      submitTriage({
        patientName: 'Jane Smith',
        conditionDescription: 'Broken arm',
        priorityLevel: 3,
        status: 'Pending',
      })
    );

    const records = selectAllRecords(store.getState());
    expect(records).toHaveLength(1);
    expect(records[0].patientName).toBe('Jane Smith');
    expect(records[0].syncStatus).toBe('synced');

    const result = store.getState().triage.lastSubmitResult;
    expect(result).toBe('synced');
  });

  // ── submitTriage — Offline Path ───────────────────────
  it('queues a record locally when offline', async () => {
    const NetInfo = require('@react-native-community/netinfo');
    NetInfo.fetch.mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    });

    await store.dispatch(
      submitTriage({
        patientName: 'Bob Lee',
        conditionDescription: 'Head trauma',
        priorityLevel: 1,
        status: 'In-Transit',
      })
    );

    const records = selectAllRecords(store.getState());
    expect(records).toHaveLength(1);
    expect(records[0].syncStatus).toBe('queued');
    expect(store.getState().triage.lastSubmitResult).toBe('saved_offline');
    expect(selectPendingCount(store.getState())).toBe(1);
  });

  // ── isSubmitting during submit ────────────────────────
  it('sets isSubmitting to true during submission', () => {
    const promise = store.dispatch(
      submitTriage({
        patientName: 'Test',
        conditionDescription: 'Test condition',
        priorityLevel: 2,
        status: 'Pending',
      })
    );

    expect(selectIsSubmitting(store.getState())).toBe(true);
    return promise;
  });

  // ── syncStatusChanged reducer ─────────────────────────
  it('updates sync status of a record via syncStatusChanged', async () => {
    // First insert a record
    await store.dispatch(
      submitTriage({
        patientName: 'Alice',
        conditionDescription: 'Allergic reaction',
        priorityLevel: 2,
        status: 'Pending',
      })
    );

    const record = selectAllRecords(store.getState())[0];

    store.dispatch(
      syncStatusChanged({
        id: record.id,
        syncStatus: 'syncing',
      })
    );

    const updated = selectAllRecords(store.getState())[0];
    expect(updated.syncStatus).toBe('syncing');
  });

  // ── clearError ────────────────────────────────────────
  it('clears error via clearError action', () => {
    // Inject an error state
    store.dispatch({ type: 'triage/submit/rejected', error: { message: 'Test error' } });
    store.dispatch(clearError());
    expect(store.getState().triage.error).toBeNull();
  });

  // ── resetSubmitResult ─────────────────────────────────
  it('resets lastSubmitResult to idle', async () => {
    await store.dispatch(
      submitTriage({
        patientName: 'Test',
        conditionDescription: 'Test',
        priorityLevel: 5,
        status: 'Pending',
      })
    );
    expect(store.getState().triage.lastSubmitResult).not.toBe('idle');

    store.dispatch(resetSubmitResult());
    expect(store.getState().triage.lastSubmitResult).toBe('idle');
  });

  // ── loadRecords ───────────────────────────────────────
  it('loads records from database into state', async () => {
    const mockRecords: TriageRecord[] = [
      {
        id: 'db-record-1',
        patientName: 'Loaded Patient',
        conditionDescription: 'From DB',
        priorityLevel: 4,
        status: 'Pending',
        syncStatus: 'queued',
        createdAt: Date.now(),
        retryCount: 0,
      },
    ];

    const db = require('../src/services/database');
    db.getAllRecords.mockResolvedValueOnce(mockRecords);

    await store.dispatch(loadRecords());

    const records = selectAllRecords(store.getState());
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe('db-record-1');
    expect(selectPendingCount(store.getState())).toBe(1);
  });

  // ── pendingCount calculation ──────────────────────────
  it('correctly calculates pendingCount from records', async () => {
    const mockRecords: TriageRecord[] = [
      { id: '1', patientName: 'A', conditionDescription: 'x', priorityLevel: 1, status: 'Pending', syncStatus: 'queued', createdAt: Date.now() },
      { id: '2', patientName: 'B', conditionDescription: 'y', priorityLevel: 2, status: 'Pending', syncStatus: 'synced', createdAt: Date.now() },
      { id: '3', patientName: 'C', conditionDescription: 'z', priorityLevel: 3, status: 'Pending', syncStatus: 'failed', createdAt: Date.now() },
    ];

    const db = require('../src/services/database');
    db.getAllRecords.mockResolvedValueOnce(mockRecords);

    await store.dispatch(loadRecords());
    expect(selectPendingCount(store.getState())).toBe(2); // 'queued' + 'failed'
  });
});
