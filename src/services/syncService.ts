// ============================================================
// Background Sync Engine
// ============================================================
// Listens for connectivity changes via NetInfo and automatically
// uploads all queued triage records when network is restored.
// Runs without freezing the UI (fully async).
// ============================================================
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import {
  getQueuedRecords,
  updateSyncStatus,
  incrementRetryCount,
} from './database';
import { submitTriageRecord } from './mockApi';
import { TriageRecord } from '../types';
import { store } from '../store';

type SyncCallback = (records: TriageRecord[]) => void;

let isSyncing = false;
let unsubscribeNetInfo: (() => void) | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

/** Callback invoked when sync state changes (updates Redux/UI) */
let onSyncUpdate: SyncCallback = () => {};

export const setSyncUpdateCallback = (cb: SyncCallback): void => {
  onSyncUpdate = cb;
};

/**
 * Core sync loop — processes all queued records one-by-one.
 * Marks each as 'syncing' before upload, then 'synced' or 'failed'.
 */
export const runSyncQueue = async (): Promise<void> => {
  if (isSyncing) {
    console.log('[Sync] Already syncing, skipping.');
    return;
  }

  // Prevent background sync if the user is simulating offline mode
  try {
    const isOfflineSimulated = store.getState().triage.isOfflineSimulated;
    if (isOfflineSimulated) {
      console.log('[Sync] Offline simulation active — skipping background sync.');
      return;
    }
  } catch (err) {
    // Store might not be fully initialized on startup, proceed
  }

  const queued = await getQueuedRecords();
  if (queued.length === 0) {
    console.log('[Sync] No queued records to sync.');
    return;
  }


  isSyncing = true;
  console.log(`[Sync] Starting sync of ${queued.length} record(s)...`);

  for (const record of queued) {
    try {
      // Mark as syncing
      await updateSyncStatus(record.id, 'syncing');
      onSyncUpdate([{ ...record, syncStatus: 'syncing' }]);

      // Attempt to upload
      await submitTriageRecord(record);

      // Mark as synced
      const now = Date.now();
      await updateSyncStatus(record.id, 'synced', now);
      onSyncUpdate([{ ...record, syncStatus: 'synced', syncedAt: now }]);
      console.log(`[Sync] ✅ Synced record ${record.id}`);
    } catch (error) {
      // Mark back as failed (queued for next attempt)
      await incrementRetryCount(record.id);
      await updateSyncStatus(record.id, 'failed');
      onSyncUpdate([{ ...record, syncStatus: 'failed' }]);
      console.warn(`[Sync] ❌ Failed to sync record ${record.id}:`, error);
    }
  }

  isSyncing = false;
  console.log('[Sync] Sync cycle complete.');
};

/**
 * Starts the background sync engine.
 * - Subscribes to NetInfo to trigger sync on connection restore
 * - Subscribes to AppState to trigger sync when app comes to foreground
 * - Runs an initial sync attempt on start
 */
export const startSyncEngine = (): void => {
  console.log('[Sync] Starting sync engine...');

  // Subscribe to network changes
  unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
    const isConnected = state.isConnected && state.isInternetReachable !== false;
    if (isConnected) {
      console.log('[Sync] 🌐 Network restored — triggering sync...');
      runSyncQueue();
    }
  });

  // Subscribe to app state changes (foreground restore)
  appStateSubscription = AppState.addEventListener(
    'change',
    (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        console.log('[Sync] 📱 App foregrounded — checking for pending sync...');
        NetInfo.fetch().then((state) => {
          const isConnected = state.isConnected && state.isInternetReachable !== false;
          if (isConnected) {
            runSyncQueue();
          }
        });
      }
    }
  );

  // Run an initial sync attempt
  NetInfo.fetch().then((state) => {
    const isConnected = state.isConnected && state.isInternetReachable !== false;
    if (isConnected) {
      runSyncQueue();
    }
  });
};

/**
 * Stops the sync engine and cleans up subscriptions.
 * Call this on app unmount.
 */
export const stopSyncEngine = (): void => {
  unsubscribeNetInfo?.();
  appStateSubscription?.remove();
  console.log('[Sync] Sync engine stopped.');
};
