// Minimal react-native mock for node-environment tests
// Only mocks what's actually used by syncService
const AppState = {
  addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  currentState: 'active',
  removeEventListener: jest.fn(),
};

module.exports = {
  AppState,
  Platform: { OS: 'android', select: (obj) => obj.android ?? obj.default },
  StyleSheet: { create: (styles) => styles },
  Animated: {
    Value: class {
      constructor(val) { this.val = val; }
    },
    timing: jest.fn(() => ({ start: jest.fn() })),
    sequence: jest.fn(() => ({ start: jest.fn() })),
    loop: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
    spring: jest.fn(() => ({ start: jest.fn() })),
    View: 'Animated.View',
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  ScrollView: 'ScrollView',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  ActivityIndicator: 'ActivityIndicator',
  FlatList: 'FlatList',
  RefreshControl: 'RefreshControl',
  StatusBar: { setBarStyle: jest.fn() },
  Alert: { alert: jest.fn() },
};
