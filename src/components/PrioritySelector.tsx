// ============================================================
// PrioritySelector Component
// ============================================================
import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Priority, PRIORITY_CONFIG } from '../types';

interface Props {
  selected: Priority | null;
  onSelect: (priority: Priority) => void;
}

const PrioritySelector: React.FC<Props> = ({ selected, onSelect }) => {
  const scaleAnims = useRef(
    ([1, 2, 3, 4, 5] as Priority[]).map(() => new Animated.Value(1))
  ).current;

  const handlePress = (priority: Priority, index: number) => {
    Animated.sequence([
      Animated.timing(scaleAnims[index], { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnims[index], { toValue: 1, useNativeDriver: true }),
    ]).start();
    onSelect(priority);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>PRIORITY LEVEL</Text>
      <View style={styles.grid}>
        {([1, 2, 3, 4, 5] as Priority[]).map((p, index) => {
          const config = PRIORITY_CONFIG[p];
          const isSelected = selected === p;
          return (
            <Animated.View
              key={p}
              style={[styles.tileWrapper, { transform: [{ scale: scaleAnims[index] }] }]}
            >
              <TouchableOpacity
                style={[
                  styles.tile,
                  { backgroundColor: isSelected ? config.color : '#F1F5F9' },
                  isSelected && styles.tileSelected,
                  isSelected && { borderColor: config.color },
                  !isSelected && { borderColor: '#E2E8F0' },
                ]}
                onPress={() => handlePress(p, index)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Priority ${p}: ${config.label}`}
              >
                <Text style={[styles.tileNumber, { color: isSelected ? config.textColor : '#475569' }]}>
                  P{p}
                </Text>
                <Text style={[styles.tileLabel, { color: isSelected ? config.textColor : '#64748B' }]}>
                  {config.label}
                </Text>
                {isSelected && (
                  <View style={[styles.selectedDot, { backgroundColor: config.textColor }]} />
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
      {selected && (
        <View style={[styles.selectedInfo, { backgroundColor: PRIORITY_CONFIG[selected].color + '15', borderColor: PRIORITY_CONFIG[selected].color }]}>
          <Text style={[styles.selectedInfoText, { color: PRIORITY_CONFIG[selected].color }]}>
            ⚡ P{selected} — {PRIORITY_CONFIG[selected].label}
          </Text>
        </View>
      )}
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
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  tileWrapper: {
    flex: 1,
  },
  tile: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 72,
    gap: 4,
  },
  tileSelected: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  tileNumber: {
    fontSize: 16,
    fontWeight: '800',
  },
  tileLabel: {
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  selectedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
  selectedInfo: {
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  selectedInfoText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default PrioritySelector;
