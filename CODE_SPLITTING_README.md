# Dynamic Code-Splitting & Instant First-Load Optimization (README)

This document details the architectural plan to optimize the **First Load** performance of the Everest School Management Portal using native **React 19 + Vite 8 dynamic code-splitting**, without requiring Next.js or external server dependencies.

---

## 1. Executive Summary & Objective

### The Problem: Monolithic Client-Side Bundle
Currently, the entire application is bundled into a single JavaScript file:
- **Current Bundle Size:** `~1.8 MB` raw (`~398.9 KB` gzipped).
- **Vite Build Warning:** `(!) Some chunks are larger than 500 kB after minification`.
- **First Load Issue:** When any user visits the portal for the first time (e.g. a Parent on a mobile phone checking their child's grades), the browser is forced to download all 25 page components upfront—including heavy Admin Rollover engines, Audit Log viewers, Master Broadsheets, and Excel export libraries—before rendering the Login Gate.

### The Objective
- Reduce initial first-load download size from **~399 KB to under ~80 KB** (an **80% reduction**).
- Achieve a Time-To-Interactive (TTI) of **under 200 milliseconds** on first visit.
- Split the monolithic bundle into role-based, on-demand chunks that only download when authorized users navigate to those specific modules.
- **Zero Next.js Requirement:** Leverage native Vite Rollup chunking and React `Suspense` without needing a Node.js server.

---

## 2. Architecture Comparison

```
CURRENT (Monolithic Bundle)
┌─────────────────────────────────────────────────────────────────────────────┐
│ index.js (~399 KB gzip / 1.8 MB raw)                                        │
│ ├── LoginGate + App Shell                                                   │
│ ├── All 7 Admin Views (UserMgmt, Rollover, Settings, Classes, Sessions...)  │
│ ├── All 4 Student Views (Directory, Admissions Wizard, Attendance...)       │
│ ├── All 4 Grading Views (Score Entry Grid, Master Broadsheet, Report Cards) │
│ ├── All 8 Executive Dashboards (Principal, VP, Exam Officer, Teacher...)    │
│ └── Heavy Libraries (SheetJS / XLSX, Lucide icons, etc.)                    │
└─────────────────────────────────────────────────────────────────────────────┘
  ↳ Problem: Every visitor downloads everything on day 1.

PROPOSED (Dynamic Code-Splitting with React.lazy)
┌──────────────────────────────────────┐
│ Initial Bundle (Core Shell & Login)  │ ──► Initial load: ~75 KB (<200ms)
│ ├── LoginGate                        │
│ ├── AuthContext & SchoolDataContext  │
│ └── AppHeader & AppSidebar Shell     │
└──────────────────┬───────────────────┘
                   │ User logs in & selects view:
    ┌──────────────┼──────────────┬──────────────┬──────────────┐
    ▼              ▼              ▼              ▼              ▼
┌─────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
│ Admin   │  │ Teacher   │  │ Grading   │  │ Parent    │  │ Vendor    │
│ Chunk   │  │ Chunk     │  │ Chunk     │  │ Chunk     │  │ XLSX      │
│ (~80 KB)│  │ (~40 KB)  │  │ (~90 KB)  │  │ (~30 KB)  │  │ (~120 KB) │
└─────────┘  └───────────┘  └───────────┘  └───────────┘  └───────────┘
(Only loaded  (Only loaded  (Only loaded   (Only loaded   (Only loaded
 by Admin)    by Teacher)   by Grader)     by Parent)     when exporting)
```

---

## 3. Files to Modify & Exact Changes Planned

### 1. `src/App.tsx` (Convert Static Imports to `React.lazy`)
Replace 25 static top-level imports with lazy-loaded dynamic imports:

```tsx
// BEFORE (All bundled together upfront):
import { UserManagementView } from './features/admin/UserManagementView';
import { ScoreEntryGridView } from './features/grading/ScoreEntryGridView';
import { BroadsheetView } from './features/grading/BroadsheetView';
import { ParentDashboard } from './features/portal/ParentDashboard';
...

// AFTER (Dynamically loaded on-demand):
const UserManagementView = React.lazy(() => import('./features/admin/UserManagementView').then(m => ({ default: m.UserManagementView })));
const ScoreEntryGridView = React.lazy(() => import('./features/grading/ScoreEntryGridView').then(m => ({ default: m.ScoreEntryGridView })));
const BroadsheetView = React.lazy(() => import('./features/grading/BroadsheetView').then(m => ({ default: m.BroadsheetView })));
const ParentDashboard = React.lazy(() => import('./features/portal/ParentDashboard').then(m => ({ default: m.ParentDashboard })));
...
```

Wrap the active view renderer in `<React.Suspense>`:
```tsx
<React.Suspense fallback={<ViewLoadingSkeleton />}>
  {renderActiveView()}
</React.Suspense>
```

---

### 2. `src/components/common/ViewLoadingSkeleton.tsx` (NEW COMPONENT)
Create a lightweight, sleek placeholder component that displays during the microsecond chunk load so the UI never flickers or jumps:
- Renders an animated card skeleton matching the current cyber/academic theme.
- Shows an unobtrusive loading pulse in under 5ms while the chunk arrives from cache/network.

---

### 3. `vite.config.ts` (Vendor Chunk Optimization)
Configure Vite's Rollup build options to isolate third-party libraries (such as `xlsx` for Excel exports and `lucide-react` for icons) into distinct vendor chunks:

```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-xlsx': ['xlsx'],
          'vendor-icons': ['lucide-react'],
        }
      }
    }
  },
  // ... proxy settings
});
```
- **Result:** The `xlsx` spreadsheet engine (~120 KB) is only downloaded when a staff member actually exports a spreadsheet or broadsheet, not on initial portal load.

---

## 4. Expected Performance Metrics (Before vs. After)

| Metric | Current Monolithic Bundle | After Dynamic Code-Splitting | Improvement |
|---|---|---|---|
| **Initial Bundle Size (Gzip)** | ~398.9 KB | **~75–85 KB** | **79% smaller** |
| **Initial JS Parse / Exec Time** | ~180 ms | **~35 ms** | **80% faster** |
| **First Load on 4G Mobile** | ~750–900 ms | **~150–200 ms** | **Near-Instant** |
| **Parent/Student Download** | Entire system (~399 KB) | Only Parent Module (~95 KB total) | **76% data saved** |
| **Vite 500kB Chunk Warning** | ⚠️ Triggered | ✅ Completely Resolved (0 warnings) | Clean Build |
| **Tab Switch Speed** | 0–2 ms | 0–2 ms (cached on first visit) | Identical speed |

---

## 5. Why Next.js Is Not Needed

| Consideration | React 19 + Vite 8 (Recommended) | Next.js |
|---|---|---|
| **Server Requirement** | Pure static files served directly by Django / Nginx. Zero Node.js server. | Requires a dedicated Node.js server running 24/7 in production. |
| **Infrastructure Cost** | Single backend server (Python + SQLite/Postgres). | Dual servers (Node.js for Next.js + Python for Django). |
| **Dynamic Code Splitting** | Built-in natively via `React.lazy` and dynamic `import()`. | Supported, but with SSR complexity. |
| **Authentication Flow** | Direct Django session/cookie authentication. | Requires custom Next.js middleware and session forwarding. |
| **Maintenance** | Minimal: standard static build (`npm run build`). | Complex: Node runtime upgrades, server-side env vars, SSR caching bugs. |

---

## 6. Implementation & Safety Checklist

- [ ] Zero database changes (SQLite schema remains identical).
- [ ] Zero API changes (Django endpoints remain untouched).
- [ ] Zero feature losses (all 25 views, RBAC permissions, and state management work exactly as before).
- [ ] TypeScript verification: `npm run build` passes with 0 errors.
- [ ] Browser test: verify instant Login Gate render, smooth tab transitions, and role isolation.
