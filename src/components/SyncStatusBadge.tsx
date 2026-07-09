// ============================================================
// SyncStatusBadge Component
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SyncStatus } from '../types';

interface Props {
  syncStatus: SyncStatus;
  syncedAt?: number;
}

const BADGE_CONFIG: Record<SyncStatus, { label: string; color: string; bg: string; icon: string }> = {
  queued: { label: 'Queued', color: '#E67E22', bg: '#3D2A12', icon: '📋' },
  syncing: { label: 'Syncing...', color: '#3498DB', bg: '#12263A', icon: '⟳' },
  synced: { label: 'Synced', color: '#27AE60', bg: '#12321E', icon: '✓' },
  failed: { label: 'Retry', color: '#E84118', bg: '#3A1212', icon: '⚠' },
};

const SyncStatusBadge: React.FC<Props> = ({ syncStatus, syncedAt }) => {
  const config = BADGE_CONFIG[syncStatus];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.color }]}>
      <Text style={[styles.icon, { color: config.color }]}>{config.icon}</Text>
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
      {syncStatus === 'synced' && syncedAt && (
        <Text style={styles.time}>
          {new Date(syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  icon: {
    fontSize: 11,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  time: {
    fontSize: 10,
    color: '#6B7785',
    marginLeft: 2,
  },
});

export default SyncStatusBadge;
