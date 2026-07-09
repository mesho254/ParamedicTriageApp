// jest.config.js — Multi-project configuration
// Runs pure-logic tests in Node, RN tests in react-native environment
module.exports = {
  projects: [
    // ── Project 1: Pure logic tests (Node env, no Expo native modules) ──
    {
      displayName: 'node-unit',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/__tests__/mockApi.test.ts',
        '<rootDir>/__tests__/syncService.test.ts',
        '<rootDir>/__tests__/triageSlice.test.ts',
      ],
      transform: {
        '^.+\\.[jt]sx?$': ['babel-jest', { configFile: './babel.config.js' }],
      },
      transformIgnorePatterns: [
        'node_modules/(?!(@reduxjs/toolkit|@react-native-community/netinfo|uuid)/)',
      ],
      moduleNameMapper: {
        '^uuid$': '<rootDir>/node_modules/uuid/dist/index.js',
        // Stub out all native/expo modules — not needed for pure logic
        '^expo-sqlite$': '<rootDir>/__mocks__/expo-sqlite.js',
        '^expo-modules-core$': '<rootDir>/__mocks__/expo-modules-core.js',
        '^react-native$': '<rootDir>/__mocks__/react-native.js',
      },
    },
    // ── Project 2: RN/UI tests (jest-expo preset) ──
    {
      displayName: 'react-native-ui',
      preset: 'jest-expo',
      testMatch: ['<rootDir>/__tests__/TriageFormScreen.test.tsx'],
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|uuid|react-redux|@reduxjs/toolkit|immer)',
      ],


      moduleNameMapper: {
        '^uuid$': '<rootDir>/node_modules/uuid/dist/index.js',
        '^test-renderer$': '<rootDir>/node_modules/react-test-renderer',
      },

    },
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};
