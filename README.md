# 🚑 Paramedic Triage Intake App

A high-performance, offline-first mobile triage application for field paramedics built with **React Native (TypeScript)** and **Expo**. Designed for high-stress, time-critical environments where network connectivity is unreliable or nonexistent.

---

## 📱 Demo

Here is a demonstration of the offline-first triage intake and automatic background sync flow:

### 🎥 [Click here to view the Demo Video (screenshots/Demo_Recording.webm)](screenshots/Demo_Recording.webm)

*(If you are viewing this on GitHub, you can also play the embedded video below):*

<video src="screenshots/Demo_Recording.webm" width="100%" height="auto" controls></video>

---

## ✨ Features

- **Offline-First**: Submit triage records with zero network connectivity — data is never lost
- **Auto Background Sync**: Instantly syncs all queued records the moment network is restored
- **Priority Color-Coding**: P1 (deep red/pulsing) → P5 (green) for instant visual triage
- **Real-Time Sync Status**: Per-record badges showing Queued / Syncing / Synced / Failed
- **Validation**: Immediate form validation with shake animation feedback
- **AppState Aware**: Sync triggers on foreground restore, not just network changes

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────┐
│                       UI Layer                       │
│   TriageFormScreen          QueueScreen              │
│   PrioritySelector          SyncStatusBadge          │
│   StatusToggle              OfflineBanner             │
└───────────────────┬─────────────────────────────────┘
                    │ dispatch / useSelector
┌───────────────────▼─────────────────────────────────┐
│                  Redux Store (RTK)                   │
│              triageSlice (state + thunks)            │
│  - submitTriage()     - loadRecords()                │
│  - syncStatusChanged  - resetSubmitResult()          │
└──────┬────────────────────────────────┬─────────────┘
       │                                │
┌──────▼──────────┐         ┌───────────▼──────────────┐
│  database.ts    │         │    syncService.ts         │
│  (expo-sqlite)  │         │  (background sync engine) │
│                 │         │  NetInfo + AppState        │
│  insertRecord() │         │  runSyncQueue()            │
│  getQueued()    │         │  startSyncEngine()         │
│  updateStatus() │         │  stopSyncEngine()          │
└─────────────────┘         └──────────┬───────────────┘
                                       │
                            ┌──────────▼───────────────┐
                            │      mockApi.ts           │
                            │  POST /api/v1/triage      │
                            │  2s delay + ~30% failure  │
                            └──────────────────────────┘
```

---

## 🔄 Sync Queue — How It Works

### 1. Submission (Offline-First Guarantee)
Every submission follows this flow:

```
User clicks Submit
      ↓
Validate form fields
      ↓
Generate UUID + timestamp
      ↓
INSERT into SQLite immediately (syncStatus = 'queued')
      ↓
Check network (NetInfo.fetch)
      ↓
  ┌─────────────────────────┬────────────────────────┐
  │ OFFLINE                 │ ONLINE                 │
  │                         │                        │
  │ Return → "Saved         │ Try immediate API call │
  │ Locally" toast          │        ↓               │
  │                         │  Success → 'synced'    │
  │                         │  Failure → 'queued'    │
  └─────────────────────────┴────────────────────────┘
```

### 2. Background Sync Engine
The sync engine starts on app launch (`startSyncEngine()`) and never blocks the UI:

```
Network restored (NetInfo event) OR App foregrounded (AppState event)
      ↓
getQueuedRecords() from SQLite (WHERE syncStatus IN 'queued', 'failed')
      ↓
For each record (sequential):
  → updateSyncStatus(id, 'syncing')   ← Redux UI updates instantly
  → submitTriageRecord(record)         ← Mock API (2s + random failure)
      ↓
  Success:                     Failure:
  updateStatus('synced')       incrementRetryCount()
  setSyncedAt(Date.now())      updateStatus('failed') → retry next cycle
      ↓
Redux callback → UI updates record badge in real-time
```

### 3. Retry Strategy
- Failed records are marked `'failed'` (not deleted)
- On next network restoration, they re-enter the sync queue
- `retryCount` is tracked and displayed in the Queue screen

---

## 🛠 Tech Stack

| Concern | Choice | Reason |
|---------|--------|--------|
| Framework | React Native (Expo) | Managed workflow, all native APIs available |
| Language | TypeScript | Type safety for medical-grade reliability |
| State | Redux Toolkit | Predictable state, devtools, async thunks |
| Local DB | expo-sqlite | Relational, queryable, ACID-compliant |
| Network | @react-native-community/netinfo | Real-time connectivity events |
| Navigation | Simple state-driven | Single main screen + queue modal |
| Testing | Jest + @testing-library/react-native | Industry standard for RN testing |

### Why Redux Toolkit over Context API?
- Predictable state updates with `createSlice` reducers
- `createAsyncThunk` cleanly handles async offline/online routing
- DevTools support for debugging sync state during development
- Better performance for frequent state updates (sync progress)

### Why expo-sqlite over AsyncStorage?
- Relational structure: can query by `syncStatus`, `priorityLevel`, `createdAt`
- ACID transactions prevent partial writes on crash
- WAL mode (Write-Ahead Logging) for better concurrent performance
- Scales to thousands of records without memory issues

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js v18+
- npm v9+
- Expo CLI: `npm install -g expo-cli`
- Android Studio with an AVD (Pixel_7_Pro or similar)
- Or: Expo Go app on a physical Android device

### Installation

```bash
# Clone the repository
git clone https://github.com/mesho254/ParamedicTriageApp.git
cd paramedic-triage-app

# Install dependencies
npm install

# Start the development server
npx expo start
```

### Running on Android

**Emulator:**
```bash
npx expo start --android
```

**Physical device:**
```bash
# Install Expo Go from Google Play, then scan the QR code
npx expo start
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- mockApi
```

---

## 🧪 Testing the Offline Sync

### On Android Emulator
1. Start the app: `npx expo start --android`
2. Open **Emulator Extended Controls** (… button or `Ctrl+Shift+E`)
3. Go to **Cellular** tab → Set **Network type** to **None** (or use **Virtual sensors → Airplane mode**)
4. Submit a triage record — you'll see "💾 SAVE LOCALLY" confirmation
5. Check the Queue screen (📋 button) — record shows `Queued` badge
6. Restore network in Extended Controls
7. Watch the record automatically update to `Syncing...` then `✓ Synced`

### On Physical Device
1. Enable **Airplane Mode** before submitting
2. Submit record — see offline confirmation
3. Turn off Airplane Mode — auto-sync triggers within seconds

---

## 📂 Project Structure

```
paramedic-triage-app/
├── App.tsx                        # Entry: DB init + sync engine startup
├── src/
│   ├── types/
│   │   └── index.ts              # TriageRecord, Priority, Status types + PRIORITY_CONFIG
│   ├── services/
│   │   ├── database.ts           # SQLite CRUD layer
│   │   ├── mockApi.ts            # Simulated POST /api/v1/triage
│   │   └── syncService.ts        # Background sync engine (NetInfo + AppState)
│   ├── store/
│   │   ├── index.ts              # Redux store configuration + typed hooks
│   │   └── triageSlice.ts        # Triage state + async thunks + selectors
│   ├── hooks/
│   │   └── useNetworkStatus.ts   # Real-time connectivity hook
│   ├── components/
│   │   ├── OfflineBanner.tsx     # Animated sliding offline indicator
│   │   ├── PrioritySelector.tsx  # 5-tile priority selector with color-coding
│   │   ├── StatusToggle.tsx      # Pending / In-Transit toggle
│   │   └── SyncStatusBadge.tsx   # Per-record sync status chip
│   └── screens/
│       ├── TriageFormScreen.tsx  # Main intake form
│       └── QueueScreen.tsx       # Record history + sync status
├── __tests__/
│   ├── mockApi.test.ts           # Mock API unit tests
│   ├── triageSlice.test.ts       # Redux slice unit tests
│   ├── syncService.test.ts       # Sync engine unit tests
│   └── TriageFormScreen.test.tsx # UI + validation unit tests
└── README.md
```

---

## 🎨 Priority Color System

| Priority | Code | Label | Color | Use Case |
|----------|------|-------|-------|----------|
| P1 | 1 | IMMEDIATE | 🔴 `#CC0000` | Life-threatening, cardiac/respiratory arrest |
| P2 | 2 | EMERGENT | 🟠 `#E84118` | Severe trauma, altered consciousness |
| P3 | 3 | URGENT | 🟡 `#E67E22` | Moderate injury, stable but needs prompt care |
| P4 | 4 | SEMI-URGENT | `#D4AC0D` | Minor injury, can wait |
| P5 | 5 | NON-URGENT | 🟢 `#27AE60` | Non-emergency, routine care |

P1 and P2 selections trigger a pulsing border animation on the form to alert the paramedic of critical case status.

---

## 📋 Assessment Deliverables

- [x] Public GitHub repository
- [x] Offline-first triage submission
- [x] SQLite local persistence
- [x] Background sync queue (NetInfo + AppState)
- [x] Redux Toolkit state management
- [x] Priority color-coding (P1=red pulsing → P5=green)
- [x] Form validation
- [x] Unit tests (mockApi, syncService, triageSlice, TriageFormScreen)
- [x] Comprehensive README
- [x] Demo video (showing offline → sync)

---

## 📄 License

MIT — Built as a technical assessment submission.
