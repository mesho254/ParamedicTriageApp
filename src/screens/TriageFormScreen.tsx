// ============================================================
// TriageFormScreen — Main Screen
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store';
import {
  submitTriage,
  resetSubmitResult,
  selectIsSubmitting,
  selectLastSubmitResult,
  selectPendingCount,
  selectError,
  selectIsOfflineSimulated,
  toggleOfflineSimulation,
} from '../store/triageSlice';
import { Priority, Status, PRIORITY_CONFIG } from '../types';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { runSyncQueue } from '../services/syncService';
import PrioritySelector from '../components/PrioritySelector';
import StatusToggle from '../components/StatusToggle';
import OfflineBanner from '../components/OfflineBanner';


interface Props {
  onViewQueue: () => void;
}

const TriageFormScreen: React.FC<Props> = ({ onViewQueue }) => {
  const dispatch = useAppDispatch();
  const isSubmitting = useAppSelector(selectIsSubmitting);
  const lastSubmitResult = useAppSelector(selectLastSubmitResult);
  const pendingCount = useAppSelector(selectPendingCount);
  const error = useAppSelector(selectError);
  const isOfflineSimulated = useAppSelector(selectIsOfflineSimulated);
  const { isConnected } = useNetworkStatus();

  const effectiveIsConnected = isConnected && !isOfflineSimulated;

  const handleToggleSimulation = () => {
    dispatch(toggleOfflineSimulation());
    // If turning simulation OFF and we are physically connected, run the sync queue!
    if (isOfflineSimulated && isConnected) {
      setTimeout(() => {
        runSyncQueue();
      }, 100);
    }
  };



  // Form state
  const [patientName, setPatientName] = useState('');
  const [conditionDescription, setConditionDescription] = useState('');
  const [priorityLevel, setPriorityLevel] = useState<Priority | null>(null);
  const [status, setStatus] = useState<Status>('Pending');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Animations
  const criticalPulse = useRef(new Animated.Value(1)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const formShake = useRef(new Animated.Value(0)).current;

  // Critical priority pulsing border
  useEffect(() => {
    if (priorityLevel !== null && priorityLevel <= 2) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(criticalPulse, { toValue: 1.02, duration: 600, useNativeDriver: true }),
          Animated.timing(criticalPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [priorityLevel]);

  // Success feedback
  useEffect(() => {
    if (lastSubmitResult !== 'idle') {
      Animated.spring(successScale, { toValue: 1, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        Animated.timing(successScale, { toValue: 0, duration: 200, useNativeDriver: true }).start(
          () => dispatch(resetSubmitResult())
        );
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [lastSubmitResult]);

  const shakeForm = () => {
    Animated.sequence([
      Animated.timing(formShake, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: -10, duration: 80, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: 6, duration: 80, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: -6, duration: 80, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!patientName.trim()) newErrors.patientName = 'Patient name is required';
    if (!conditionDescription.trim()) newErrors.conditionDescription = 'Condition description is required';
    if (priorityLevel === null) newErrors.priorityLevel = 'Priority level must be selected';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      shakeForm();
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await dispatch(
      submitTriage({
        patientName: patientName.trim(),
        conditionDescription: conditionDescription.trim(),
        priorityLevel: priorityLevel!,
        status,
      })
    );
    // Reset form
    setPatientName('');
    setConditionDescription('');
    setPriorityLevel(null);
    setStatus('Pending');
    setErrors({});
  };

  const isCritical = priorityLevel !== null && priorityLevel <= 2;
  const criticalColor = priorityLevel ? PRIORITY_CONFIG[priorityLevel].color : '#CC0000';

  const submitLabel = () => {
    if (isSubmitting) return '';
    if (!effectiveIsConnected) return '💾  SAVE LOCALLY';
    return '⬆  SUBMIT TRIAGE';
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <OfflineBanner />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.appTag}>PARAMEDIC TRIAGE SYSTEM</Text>
              <Text style={styles.headerTitle}>New Intake</Text>
            </View>
            <TouchableOpacity
              style={styles.queueButton}
              onPress={onViewQueue}
              accessibilityRole="button"
              accessibilityLabel="View queue"
            >
              <Text style={styles.queueButtonText}>📋</Text>
              {pendingCount > 0 && (
                <View style={styles.queueBadge}>
                  <Text style={styles.queueBadgeText}>{pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Network indicator and simulation toggle */}
          <View style={styles.networkContainer}>
            <View style={[styles.networkIndicator, { backgroundColor: effectiveIsConnected ? '#DCFCE7' : '#FEE2E2', flex: 1, marginBottom: 0 }]}>
              <View style={[styles.networkDot, { backgroundColor: effectiveIsConnected ? '#22C55E' : '#EF4444' }]} />
              <Text style={[styles.networkText, { color: effectiveIsConnected ? '#15803D' : '#991B1B' }]}>
                {isOfflineSimulated
                  ? 'Simulated Offline — Cache Active'
                  : effectiveIsConnected
                  ? 'Online — Direct Sync Active'
                  : 'Offline — Offline-First Mode Active'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.simulateButton,
                isOfflineSimulated ? styles.simulateButtonActive : styles.simulateButtonInactive
              ]}
              onPress={handleToggleSimulation}
              accessibilityRole="checkbox"
              accessibilityChecked={isOfflineSimulated}
              accessibilityLabel="Simulate offline mode"
              activeOpacity={0.8}
            >
              <Text style={[
                styles.simulateButtonText,
                { color: isOfflineSimulated ? '#1E40AF' : '#475569' }
              ]}>
                {isOfflineSimulated ? '📡 GO ONLINE' : '✈️ SIM OFFLINE'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Critical alert banner */}
          {isCritical && (
            <Animated.View
              style={[
                styles.criticalAlert,
                { borderColor: criticalColor, transform: [{ scale: criticalPulse }] },
              ]}
            >
              <Text style={styles.criticalAlertText}>
                🚨 CRITICAL PRIORITY — Immediate Attention Required
              </Text>
            </Animated.View>
          )}

          {/* Form Card */}
          <Animated.View
            style={[
              styles.formCard,
              isCritical && { borderColor: criticalColor + '60', borderWidth: 1.5 },
              { transform: [{ translateX: formShake }] },
            ]}
          >
            {/* Patient Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PATIENT NAME</Text>
              <TextInput
                testID="patient-name-input"
                style={[styles.input, errors.patientName ? styles.inputError : null]}
                value={patientName}
                onChangeText={(t) => {
                  setPatientName(t);
                  if (errors.patientName) setErrors((e) => ({ ...e, patientName: '' }));
                }}
                placeholder="Enter patient full name"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
                returnKeyType="next"
                accessibilityLabel="Patient name input"
              />
              {errors.patientName ? (
                <Text style={styles.errorText}>{errors.patientName}</Text>
              ) : null}
            </View>

            {/* Condition Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CONDITION DESCRIPTION</Text>
              <TextInput
                testID="condition-input"
                style={[styles.input, styles.textArea, errors.conditionDescription ? styles.inputError : null]}
                value={conditionDescription}
                onChangeText={(t) => {
                  setConditionDescription(t);
                  if (errors.conditionDescription)
                    setErrors((e) => ({ ...e, conditionDescription: '' }));
                }}
                placeholder="Describe patient condition, symptoms, and relevant history..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                returnKeyType="done"
                accessibilityLabel="Condition description input"
              />
              {errors.conditionDescription ? (
                <Text style={styles.errorText}>{errors.conditionDescription}</Text>
              ) : null}
            </View>

            {/* Priority Selector */}
            <PrioritySelector selected={priorityLevel} onSelect={setPriorityLevel} />
            {errors.priorityLevel ? (
              <Text style={[styles.errorText, { marginTop: -12, marginBottom: 16 }]}>
                {errors.priorityLevel}
              </Text>
            ) : null}

            {/* Status Toggle */}
            <StatusToggle selected={status} onSelect={setStatus} />
          </Animated.View>

          {/* Submit Button */}
          <TouchableOpacity
            testID="submit-button"
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
              !effectiveIsConnected && styles.submitButtonOffline,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Submit triage record"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>{submitLabel()}</Text>
            )}
          </TouchableOpacity>

          {/* Success/Feedback Toast */}
          {lastSubmitResult !== 'idle' && (
            <Animated.View
              style={[
                styles.toast,
                lastSubmitResult === 'synced'
                  ? styles.toastSuccess
                  : lastSubmitResult === 'queued_retry'
                  ? styles.toastQueuedRetry
                  : lastSubmitResult === 'failed'
                  ? styles.toastFailed
                  : styles.toastOffline,
                { transform: [{ scale: successScale }] },
              ]}
            >
              <Text style={styles.toastText}>
                {lastSubmitResult === 'synced'
                  ? '✅  Record submitted and synced!'
                  : lastSubmitResult === 'queued_retry'
                  ? '⟳  Saved — queued for auto-sync retry'
                  : lastSubmitResult === 'failed'
                  ? `❌  Error: ${error || 'Failed to save or sync'}`
                  : '💾  Saved locally — will sync when online'}
              </Text>
            </Animated.View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 60 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  appTag: {
    color: '#1D6EF5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  queueButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  queueButtonText: { fontSize: 22 },
  queueBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#CC0000',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },

  // Network indicator
  networkContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  networkIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  networkDot: { width: 8, height: 8, borderRadius: 4 },
  networkText: { fontSize: 11, fontWeight: '700' },

  // Simulation Button
  simulateButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 105,
  },
  simulateButtonActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  simulateButtonInactive: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  simulateButtonText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Critical alert
  criticalAlert: {
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    alignItems: 'center',
  },
  criticalAlertText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // Form Card
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 3,
  },
  fieldGroup: { marginBottom: 20 },
  fieldLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    color: '#0F172A',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontWeight: '500',
  },
  textArea: {
    minHeight: 110,
    paddingTop: 14,
    lineHeight: 22,
  },
  inputError: { borderColor: '#DC2626' },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },

  // Submit
  submitButton: {
    backgroundColor: '#1D6EF5',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1D6EF5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 58,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonOffline: { backgroundColor: '#D97706' },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Toast
  toast: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  toastSuccess: { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#22C55E' },
  toastOffline: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B' },
  toastQueuedRetry: { backgroundColor: '#DBEAFE', borderWidth: 1, borderColor: '#3B82F6' },
  toastFailed: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#EF4444' },

  toastText: { color: '#1E293B', fontSize: 14, fontWeight: '700', textAlign: 'center' },

  bottomSpacer: { height: 40 },
});

export default TriageFormScreen;

