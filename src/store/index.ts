// ============================================================
// Redux Store — Root Configuration
// ============================================================
import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import triageReducer from './triageSlice';

export const store = configureStore({
  reducer: {
    triage: triageReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Allow non-serializable values in action payloads if needed
        ignoredActions: [],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/** Typed dispatch hook — use this everywhere instead of plain useDispatch */
export const useAppDispatch = (): AppDispatch => useDispatch<AppDispatch>();

/** Typed selector hook — use this everywhere instead of plain useSelector */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
