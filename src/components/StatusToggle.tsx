// ============================================================
// StatusToggle Component
// ============================================================
import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Status } from '../types';

interface Props {
  selected: Status;
  onSelect: (status: Status) => void;
}

const OPTIONS: Status[] = ['Pending', 'In-Transit'];

const STATUS_CONFIG: Record<Status, { icon: string; color: string }> = {
  Pending: { icon: '⏳', color: '#3498DB' },
  'In-Transit': { icon: '🚑', color: '#2ECC71' },
};

const StatusToggle: React.FC<Props> = ({ selected, onSelect }) => {
  const scaleAnims = useRef(OPTIONS.map(() => new Animated.Value(1))).current;

  const handlePress = (status: Status, index: number) => {
    Animated.sequence([
      Animated.timing(scaleAnims[index], { toValue: 0.95, duration: 70, useNativeDriver: true }),
      Animated.spring(scaleAnims[index], { toValue: 1, useNativeDriver: true }),
    ]).start();
    onSelect(status);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>STATUS</Text>
      <View style={styles.row}>
        {OPTIONS.map((status, index) => {
          const config = STATUS_CONFIG[status];
          const isSelected = selected === status;
          return (
            <Animated.View
              key={status}
              style={[styles.buttonWrapper, { transform: [{ scale: scaleAnims[index] }] }]}
            >
              <TouchableOpacity
                style={[
                  styles.button,
                  isSelected
                    ? { backgroundColor: config.color, borderColor: config.color }
                    : { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
                ]}
                onPress={() => handlePress(status, index)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Status: ${status}`}
              >
                <Text style={styles.icon}>{config.icon}</Text>
                <Text style={[styles.buttonText, isSelected ? styles.buttonTextSelected : { color: '#64748B' }]}>
                  {status}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonWrapper: {
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  icon: {
    fontSize: 18,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  buttonTextSelected: {
    color: '#FFFFFF',
  },
});

export default StatusToggle;
