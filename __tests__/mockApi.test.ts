/**
 * @jest-environment node
 */
// ============================================================
// Unit Tests — mockApi.ts
// ============================================================
import { submitTriageRecord, setForceFailure, setFailureRate, FORCE_FAILURE } from '../src/services/mockApi';
import { TriageRecord } from '../src/types';

const mockRecord: TriageRecord = {
  id: 'test-uuid-001',
  patientName: 'John Doe',
  conditionDescription: 'Chest pain, difficulty breathing',
  priorityLevel: 1,
  status: 'Pending',
  syncStatus: 'queued',
  createdAt: Date.now(),
};

describe('mockApi — submitTriageRecord', () => {
  beforeEach(() => {
    setForceFailure(false);
    setFailureRate(0); // No random failures in tests
  });

  it('resolves with success response after a delay', async () => {
    const start = Date.now();
    const result = await submitTriageRecord(mockRecord);
    const elapsed = Date.now() - start;

    expect(result.success).toBe(true);
    expect(result.id).toBe(mockRecord.id);
    expect(result.message).toBeTruthy();
    expect(elapsed).toBeGreaterThanOrEqual(1400); // ~1.5s minimum delay
  }, 10000);

  it('throws an error when FORCE_FAILURE is enabled', async () => {
    setForceFailure(true);
    await expect(submitTriageRecord(mockRecord)).rejects.toThrow();
  }, 10000);

  it('returns a timestamp in the response', async () => {
    const result = await submitTriageRecord(mockRecord);
    expect(typeof result.timestamp).toBe('number');
    expect(result.timestamp).toBeGreaterThan(0);
  }, 10000);

  it('succeeds with failure rate set to 0', async () => {
    setFailureRate(0);
    const result = await submitTriageRecord(mockRecord);
    expect(result.success).toBe(true);
  }, 10000);

  it('always fails when failure rate is set to 1', async () => {
    setFailureRate(1);
    await expect(submitTriageRecord(mockRecord)).rejects.toThrow();
  }, 10000);
});
