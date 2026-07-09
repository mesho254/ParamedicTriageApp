/**
 * @jest-environment node
 */
// ============================================================
// Unit Tests — syncService.ts
// ============================================================
import { runSyncQueue, setSyncUpdateCallback } from '../src/services/syncService';
import * as db from '../src/services/database';
import * as mockApi from '../src/services/mockApi';
import { TriageRecord } from '../src/types';

// ── Mocks ──────────────────────────────────────────────────
jest.mock('../src/services/database', () => ({
  getQueuedRecords: jest.fn(),
  updateSyncStatus: jest.fn().mockResolvedValue(undefined),
  incrementRetryCount: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/mockApi', () => ({
  submitTriageRecord: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  addEventListener: jest.fn().mockReturnValue(() => {}),
}));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    currentState: 'active',
  },
}));

const queuedRecord: TriageRecord = {
  id: 'sync-test-001',
  patientName: 'Critical Patient',
  conditionDescription: 'Cardiac arrest',
  priorityLevel: 1,
  status: 'In-Transit',
  syncStatus: 'queued',
  createdAt: Date.now(),
};

describe('syncService — runSyncQueue', () => {
  let syncCallbackResults: TriageRecord[];

  beforeEach(() => {
    jest.clearAllMocks();
    syncCallbackResults = [];
    setSyncUpdateCallback((records) => {
      syncCallbackResults.push(...records);
    });
  });

  it('does nothing when there are no queued records', async () => {
    (db.getQueuedRecords as jest.Mock).mockResolvedValue([]);
    await runSyncQueue();

    expect(mockApi.submitTriageRecord).not.toHaveBeenCalled();
    expect(db.updateSyncStatus).not.toHaveBeenCalled();
  });

  it('syncs a queued record successfully', async () => {
    (db.getQueuedRecords as jest.Mock).mockResolvedValue([queuedRecord]);
    (mockApi.submitTriageRecord as jest.Mock).mockResolvedValue({ success: true, id: queuedRecord.id, message: 'ok', timestamp: Date.now() });

    await runSyncQueue();

    // Should have marked as 'syncing' then 'synced'
    expect(db.updateSyncStatus).toHaveBeenCalledWith(queuedRecord.id, 'syncing');
    expect(db.updateSyncStatus).toHaveBeenCalledWith(queuedRecord.id, 'synced', expect.any(Number));

    // Callback should have received syncing then synced
    const statuses = syncCallbackResults.map((r) => r.syncStatus);
    expect(statuses).toContain('syncing');
    expect(statuses).toContain('synced');
  });

  it('marks record as failed when API throws', async () => {
    (db.getQueuedRecords as jest.Mock).mockResolvedValue([queuedRecord]);
    (mockApi.submitTriageRecord as jest.Mock).mockRejectedValue(new Error('Network error'));

    await runSyncQueue();

    expect(db.updateSyncStatus).toHaveBeenCalledWith(queuedRecord.id, 'syncing');
    expect(db.updateSyncStatus).toHaveBeenCalledWith(queuedRecord.id, 'failed');
    expect(db.incrementRetryCount).toHaveBeenCalledWith(queuedRecord.id);

    const statuses = syncCallbackResults.map((r) => r.syncStatus);
    expect(statuses).toContain('failed');
  });

  it('processes multiple queued records independently', async () => {
    const record2: TriageRecord = { ...queuedRecord, id: 'sync-test-002', patientName: 'Patient 2' };
    (db.getQueuedRecords as jest.Mock).mockResolvedValue([queuedRecord, record2]);
    (mockApi.submitTriageRecord as jest.Mock)
      .mockResolvedValueOnce({ success: true, id: queuedRecord.id, message: 'ok', timestamp: Date.now() })
      .mockRejectedValueOnce(new Error('Second record failed'));

    await runSyncQueue();

    // First record should be synced
    expect(db.updateSyncStatus).toHaveBeenCalledWith(queuedRecord.id, 'synced', expect.any(Number));
    // Second record should be failed
    expect(db.updateSyncStatus).toHaveBeenCalledWith(record2.id, 'failed');
    expect(db.incrementRetryCount).toHaveBeenCalledWith(record2.id);
    // First should NOT have increment called
    expect(db.incrementRetryCount).not.toHaveBeenCalledWith(queuedRecord.id);
  });

  it('invokes the sync update callback with correct data', async () => {
    (db.getQueuedRecords as jest.Mock).mockResolvedValue([queuedRecord]);
    (mockApi.submitTriageRecord as jest.Mock).mockResolvedValue({ success: true, id: queuedRecord.id, message: 'ok', timestamp: Date.now() });

    await runSyncQueue();

    expect(syncCallbackResults.length).toBeGreaterThan(0);
    const ids = syncCallbackResults.map((r) => r.id);
    expect(ids).toContain(queuedRecord.id);
  });
});
