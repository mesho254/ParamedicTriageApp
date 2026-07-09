// ============================================================
// App Entry Point
// ============================================================
import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { store } from './src/store';
import { initDatabase } from './src/services/database';
import {
  startSyncEngine,
  stopSyncEngine,
  setSyncUpdateCallback,
} from './src/services/syncService';
import { loadRecords, syncStatusChanged } from './src/store/triageSlice';
import TriageFormScreen from './src/screens/TriageFormScreen';
import QueueScreen from './src/screens/QueueScreen';
import { TriageRecord } from './src/types';

type Screen = 'form' | 'queue';

function AppContent() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('form');

  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize SQLite database
        await initDatabase();
        // Load existing records into Redux
        await store.dispatch(loadRecords());

        // Set up sync engine callback to update Redux state
        setSyncUpdateCallback((records: TriageRecord[]) => {
          records.forEach((record) => {
            store.dispatch(
              syncStatusChanged({
                id: record.id,
                syncStatus: record.syncStatus,
                syncedAt: record.syncedAt,
              })
            );
          });
          // Reload all records to ensure queue screen stays fresh
          store.dispatch(loadRecords());
        });

        // Start the background sync engine
        startSyncEngine();
        setIsReady(true);
      } catch (error) {
        console.error('[App] Initialization error:', error);
        setInitError(String(error));
      }
    };

    initialize();

    return () => {
      stopSyncEngine();
    };
  }, []);

  if (initError) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.errorText}>⚠ Initialization Error</Text>
        <Text style={styles.errorDetail}>{initError}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#1D6EF5" size="large" />
        <Text style={styles.loadingText}>Initializing Triage System...</Text>
      </View>
    );
  }

  return (
    <>
      {screen === 'form' ? (
        <TriageFormScreen onViewQueue={() => setScreen('queue')} />
      ) : (
        <QueueScreen onBack={() => setScreen('form')} />
      )}
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <Provider store={store}>
        <AppContent />
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  loadingText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  errorText: {
    color: '#CC0000',
    fontSize: 18,
    fontWeight: '800',
  },
  errorDetail: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
  },
});
