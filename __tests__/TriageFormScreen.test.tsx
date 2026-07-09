// ============================================================
// Unit Tests — TriageFormScreen validation
// ============================================================
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import triageReducer from '../src/store/triageSlice';
import TriageFormScreen from '../src/screens/TriageFormScreen';

// ── Mocks ──────────────────────────────────────────────────
jest.mock('../src/services/database', () => ({
  initDatabase: jest.fn().mockResolvedValue(undefined),
  insertRecord: jest.fn().mockResolvedValue(undefined),
  getAllRecords: jest.fn().mockResolvedValue([]),
  updateSyncStatus: jest.fn().mockResolvedValue(undefined),
  incrementRetryCount: jest.fn().mockResolvedValue(undefined),
  getPendingCount: jest.fn().mockResolvedValue(0),
}));

jest.mock('../src/services/mockApi', () => ({
  submitTriageRecord: jest.fn().mockResolvedValue({ success: true, id: 'test', message: 'ok', timestamp: Date.now() }),
}));

jest.mock('../src/services/syncService', () => ({
  startSyncEngine: jest.fn(),
  stopSyncEngine: jest.fn(),
  setSyncUpdateCallback: jest.fn(),
  runSyncQueue: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true, type: 'wifi' }),
  addEventListener: jest.fn().mockReturnValue(() => {}),
}));

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
}));

// ── Test Helper ───────────────────────────────────────────
const makeStore = () => configureStore({ reducer: { triage: triageReducer } });

const renderForm = (onViewQueue = jest.fn()) => {
  const store = makeStore();
  return {
    store,
    ...render(
      <Provider store={store}>
        <TriageFormScreen onViewQueue={onViewQueue} />
      </Provider>
    ),
  };
};

// ── Tests ─────────────────────────────────────────────────
describe('TriageFormScreen', () => {
  it('renders the form fields correctly', () => {
    renderForm();
    expect(screen.getByTestId('patient-name-input')).toBeTruthy();
    expect(screen.getByTestId('condition-input')).toBeTruthy();
    expect(screen.getByTestId('submit-button')).toBeTruthy();
  });

  it('shows validation error when patient name is empty on submit', async () => {
    renderForm();
    fireEvent.press(screen.getByTestId('submit-button'));
    await waitFor(() => {
      expect(screen.getByText('Patient name is required')).toBeTruthy();
    });
  });

  it('shows validation error when condition description is empty', async () => {
    renderForm();
    fireEvent.changeText(screen.getByTestId('patient-name-input'), 'John Doe');
    fireEvent.press(screen.getByTestId('submit-button'));
    await waitFor(() => {
      expect(screen.getByText('Condition description is required')).toBeTruthy();
    });
  });

  it('shows validation error when priority is not selected', async () => {
    renderForm();
    fireEvent.changeText(screen.getByTestId('patient-name-input'), 'John Doe');
    fireEvent.changeText(screen.getByTestId('condition-input'), 'Chest pain');
    fireEvent.press(screen.getByTestId('submit-button'));
    await waitFor(() => {
      expect(screen.getByText('Priority level must be selected')).toBeTruthy();
    });
  });

  it('calls onViewQueue when queue button is pressed', () => {
    const mockOnViewQueue = jest.fn();
    renderForm(mockOnViewQueue);
    fireEvent.press(screen.getByAccessibilityLabel('View queue'));
    expect(mockOnViewQueue).toHaveBeenCalledTimes(1);
  });

  it('clears validation errors when user starts typing', async () => {
    renderForm();
    fireEvent.press(screen.getByTestId('submit-button'));
    await waitFor(() => {
      expect(screen.getByText('Patient name is required')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId('patient-name-input'), 'Jane');
    await waitFor(() => {
      expect(screen.queryByText('Patient name is required')).toBeNull();
    });
  });
});
