// ============================================================
// Mock API — Simulates POST /api/v1/triage
// ============================================================
// Introduces an artificial 2-second network delay and a
// configurable random failure rate to prove the sync queue works.
// ============================================================
import { TriageRecord } from '../types';

/** Toggle to force all requests to fail (for testing) */
export let FORCE_FAILURE = false;

/**
 * Probability of a random failure (0.0 = never, 1.0 = always).
 * Set to 0 by default for reliable demo. Use setFailureRate(0.3) to
 * simulate ~30% failure rate and prove the background sync queue retries.
 */
export let FAILURE_RATE = 0;

export const setFailureRate = (rate: number): void => {
  FAILURE_RATE = Math.max(0, Math.min(1, rate));
};

export const setForceFailure = (force: boolean): void => {
  FORCE_FAILURE = force;
};

export interface ApiResponse {
  success: boolean;
  id: string;
  message: string;
  timestamp: number;
}

/**
 * Simulates a POST /api/v1/triage network call.
 * - Always waits ~2 seconds (realistic network latency)
 * - Has a FAILURE_RATE chance of throwing a network error
 * - Returns a structured ApiResponse on success
 */
export const submitTriageRecord = async (record: TriageRecord): Promise<ApiResponse> => {
  // Simulate network latency (1.5–2.5s)
  const delay = 1500 + Math.random() * 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Simulate random network failure
  if (FORCE_FAILURE || Math.random() < FAILURE_RATE) {
    const errors = [
      'Connection timed out',
      'Server unreachable',
      'Gateway timeout (503)',
      'Network request failed',
    ];
    throw new Error(errors[Math.floor(Math.random() * errors.length)]);
  }

  console.log(`[MockAPI] ✅ Successfully submitted record ${record.id}`);

  return {
    success: true,
    id: record.id,
    message: 'Triage record received and queued for processing',
    timestamp: Date.now(),
  };
};
