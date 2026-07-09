// ============================================================
// QueueScreen — Sync Queue / History View
// ============================================================
// Reads directly from Redux state (populated by submitTriage thunk).
// Pull-to-refresh re-queries SQLite to catch any sync engine updates.
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Animated,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store';
import { loadRecords, selectAllRecords } from '../store/triageSlice';
import { TriageRecord, PRIORITY_CONFIG } from '../types';
import SyncStatusBadge from '../components/SyncStatusBadge';

interface Props {
  onBack: () => void;
}

const QueueScreen: React.FC<Props> = ({ onBack }) => {
  const dispatch = useAppDispatch();
  const records = useAppSelector(selectAllRecords);
  const [refreshing, setRefreshing] = useState(false);

  // On mount: sync Redux with SQLite only if Redux has no records yet.
  // This handles the case where the user restarts the app — records
  // live in SQLite and need to be re-loaded into Redux.
  // We do NOT call loadRecords unconditionally to avoid wiping in-memory records.
  useEffect(() => {
    if (records.length === 0) {
      dispatch(loadRecords());
    }
  }, []);

  // Pull-to-refresh always re-queries SQLite (catches background sync updates)
  const handleRefresh = async () => {
    setRefreshing(true);
    await dispatch(loadRecords());
    setRefreshing(false);
  };

  const renderRecord = ({ item, index }: { item: TriageRecord; index: number }) => {
    const priorityConfig = PRIORITY_CONFIG[item.priorityLevel];
    const isCritical = item.priorityLevel <= 2;

    return (
      <View
        style={[
          styles.card,
          isCritical && { borderLeftColor: priorityConfig.color, borderLeftWidth: 4 },
          index === 0 && styles.cardFirst,
        ]}
        accessibilityLabel={`Patient ${item.patientName}, Priority ${item.priorityLevel}`}
      >
        {/* Top row */}
        <View style={styles.cardTop}>
          <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.color }]}>
            <Text style={styles.priorityBadgeText}>P{item.priorityLevel}</Text>
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.patientName} numberOfLines={1}>
              {item.patientName}
            </Text>
            <Text style={styles.priorityLabel}>{priorityConfig.label}</Text>
          </View>
          <SyncStatusBadge syncStatus={item.syncStatus} syncedAt={item.syncedAt} />
        </View>

        {/* Condition */}
        <Text style={styles.condition} numberOfLines={2}>
          {item.conditionDescription}
        </Text>

        {/* Bottom row */}
        <View style={styles.cardBottom}>
          <View
            style={[
              styles.statusChip,
              item.status === 'In-Transit' ? styles.statusInTransit : styles.statusPending,
            ]}
          >
            <Text style={styles.statusChipText}>
              {item.status === 'In-Transit' ? '🚑 ' : '⏳ '}
              {item.status}
            </Text>
          </View>
          <Text style={styles.timestamp}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {' · '}
            {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </Text>
          {item.retryCount && item.retryCount > 0 ? (
            <Text style={styles.retryText}>Retries: {item.retryCount}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  const pendingCount = records.filter(
    (r) => r.syncStatus === 'queued' || r.syncStatus === 'failed'
  ).length;
  const syncedCount = records.filter((r) => r.syncStatus === 'synced').length;
  const syncingCount = records.filter((r) => r.syncStatus === 'syncing').length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Sync Queue</Text>
          <Text style={styles.headerSubtitle}>
            {records.length} record{records.length !== 1 ? 's' : ''} total
          </Text>
        </View>
        <Text style={styles.pullHint}>↓ Pull to refresh</Text>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{records.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#E67E22' }]}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#3498DB' }]}>{syncingCount}</Text>
          <Text style={styles.statLabel}>Syncing</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#27AE60' }]}>{syncedCount}</Text>
          <Text style={styles.statLabel}>Synced</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={records}
        renderItem={renderRecord}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { flexGrow: 1 }]}
        alwaysBounceVertical={true}
        overScrollMode="always"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No records yet</Text>
            <Text style={styles.emptySubtitle}>
              Submitted triage records will appear here.{"\n"}
              Pull down to refresh if you just submitted.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#1D6EF5"
            colors={['#1D6EF5']}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  backIcon: { color: '#0F172A', fontSize: 20, fontWeight: '700' },
  headerText: { flex: 1 },
  headerTitle: { color: '#0F172A', fontSize: 22, fontWeight: '800' },
  headerSubtitle: { color: '#64748B', fontSize: 12, marginTop: 2 },
  pullHint: { color: '#94A3B8', fontSize: 11 },

  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#0F172A', fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#64748B', fontSize: 10, fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#E2E8F0' },

  list: { padding: 20, paddingTop: 14, gap: 12 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardFirst: {
    borderColor: '#CBD5E1',
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priorityBadge: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  nameContainer: { flex: 1 },
  patientName: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
  priorityLabel: { color: '#64748B', fontSize: 10, fontWeight: '600', marginTop: 1 },

  condition: { color: '#334155', fontSize: 13, lineHeight: 18 },

  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPending: { backgroundColor: '#F1F5F9' },
  statusInTransit: { backgroundColor: '#DCFCE7' },
  statusChipText: { fontSize: 11, fontWeight: '700' },
  timestamp: { flex: 1, color: '#64748B', fontSize: 11 },
  retryText: { color: '#E67E22', fontSize: 11, fontWeight: '600' },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { color: '#0F172A', fontSize: 20, fontWeight: '700' },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default QueueScreen;
