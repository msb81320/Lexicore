# Vocabulary JSON Export & Daily Review Reminder System

This plan introduces flexible JSON data exporting directly within the Statistics view—allowing learners to export either their vocabulary lexicon or a full database archive—alongside a synchronized Daily Review Reminder system that delivers browser notifications and an interactive in-app reminder banner when daily FSRS reviews are due.

### User Review & Critical Decisions

> [!IMPORTANT]
> All core product preferences have been confirmed during clarification and are reflected below.

- **Confirmed Decision 1 — Selectable JSON Export Mode in StatisticsView**: Learners can switch between exporting **Vocabulary Units Only** (lexical entries, chunks, variants, and FSRS state) or a **Full Backup Archive** (vocabulary units, decks, review logs, and streak history) and download the resulting `.json` file with a single click.
- **Confirmed Decision 2 — Dual-Channel Daily Review Reminders**: When the daily reminder time is reached and today's study session has not yet been completed, the app triggers both a native **Browser Notification** (when permission is granted) and a prominent **In-App Reminder Banner** with a direct one-tap action to launch the daily review session.
- **Confirmed Decision 3 — Synchronized Reminder Controls in Dashboard & Statistics**: Both the Home Dashboard and the Statistics view provide synchronized controls to toggle daily reminders on/off, adjust the preferred local reminder time (`HH:mm`), and manage browser notification permissions.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. **StatisticsView JSON Export**: Adds an interactive export panel and action button in the Statistics view where users can select their export scope (`Vocabulary Only` vs. `Full Backup`) and download a formatted, timestamped JSON file (`lexicore-vocabulary-YYYY-MM-DD.json` or `lexicore-backup-YYYY-MM-DD.json`).
  2. **Daily Review Reminder Engine**: Monitors the user's daily study status and scheduled local reminder time (`HH:mm`). If the user has not completed a study session today and the current local time reaches or passes the target reminder time, LexiCore surfaces an in-app reminder callout and dispatches a native browser notification summarizing the number of cards due.
- **Target Audience / Persona**: Self-directed language learners using spaced repetition who want effortless ownership of their lexical data and reliable daily habit cues to protect their study streak.
- **Key Value**: Prevents streak lapses through timely, actionable reminders while making vocabulary portability directly accessible from the analytics screen where users inspect their progress.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Exporting Vocabulary Data from StatisticsView**:
     - The learner navigates to the **Stats** tab (`StatisticsView`).
     - In the header and the dedicated **Vocabulary Data Export** section, the learner selects between **Vocabulary Only** (exports `units` count) or **Full Backup** (exports `units`, `decks`, `reviewLogs`, and `studyDays`).
     - Clicking **Export JSON** generates and downloads the `.json` file immediately and displays a confirmation state indicating the exact number of exported records.
  2. **Configuring Daily Review Reminders**:
     - From either the **Home Dashboard** (inside a compact collapsible/inline Reminder Bar beneath the Daily Streak Banner) or the **StatisticsView** (inside the Daily Review Reminder card), the learner toggles **Daily Reminder** on and chooses a time using the native time input (`HH:mm`, defaulting to `19:00` local time).
     - When enabling reminders, if browser notification permission is `default`, the app prompts for permission via the Web Notification API and displays the current permission status (`Notifications Active`, `In-App Only`, or `Permission Blocked`) along with a **Test Notification** action.
  3. **Receiving & Acting on a Daily Reminder**:
     - When the current local time is at or past the configured reminder time and `streak.completedToday` is `false`, an **In-App Daily Review Reminder Banner** appears at the top of the workspace showing how many FSRS cards are waiting, with a primary **Review Now** CTA button and a **Dismiss for Today** button.
     - Simultaneously (once per calendar day), if browser notifications are permitted, a system notification fires with the due card count; clicking the notification focuses the app window.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-craft dark-slate mobile-first utility matching LexiCore's existing FSRS analytics aesthetic.
  - *Color Palette & Mood*: Deep slate canvas (`bg-slate-950`), elevated structural cards (`bg-slate-900 border-slate-800`), indigo/sky primary accents (`from-indigo-600 to-sky-600`) for export actions, and warm amber/emerald highlights (`text-amber-400`, `text-emerald-400`) for reminder and streak cues.
  - *Typography & Hierarchy*: Clean sans-serif headings with `tabular-nums` for all card counts, percentages, and `HH:mm` time readouts.
  - *Component Styling & Layout*: Touch-friendly interactive controls ($\ge 44\text{px}$ tap targets), segmented export mode selector buttons, and single-elevation `rounded-2xl` cards separated by generous spacing.
- **Interactive Feedback & Motion**:
  - Immediate visual confirmation upon JSON export (button transitions to a temporary checkmark state with exported item count).
  - Smooth expand/collapse transitions for reminder settings and instant cross-tab state synchronization.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual-Scope JSON Export (`Vocabulary Only` vs. `Full Backup`)**
  - *Chosen Approach*: Provide a segmented selector right beside the Export button in `StatisticsView` so users can export a clean array/object of vocabulary learning units for external study tools or a full v2 database snapshot for complete backup/restore.
  - *Why*: Satisfies both lightweight vocabulary sharing/inspection and full FSRS + streak state preservation without cluttering the interface.
  - *Alternatives Considered*: Separate buttons for each format—passed over because a segmented mode toggle paired with a single primary **Export JSON** CTA is cleaner and prevents accidental clicks.
- **Decision 2: Client-Side Reminder Scheduler with Persistent Daily Deduplication**
  - *Chosen Approach*: Store reminder preferences (`enabled`, `time`, `browserNotificationsEnabled`, `lastNotifiedDate`, `dismissedDate`) in persistent storage and run a lightweight 30-second heartbeat scheduler in the root application state that checks local `HH:mm` against `streak.completedToday`.
  - *Why*: Works reliably in any standard browser or installed PWA without requiring external push servers or VAPID keys, while guaranteeing the user is never spammed with duplicate notifications on the same day.
  - *Alternatives Considered*: Server-side Web Push—passed over to preserve LexiCore's 100% local-first, zero-account architecture.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         Root Application State                            │
│  • Loads & syncs Decks, Vocabulary Units, StreakSummary                   │
│  • Manages DailyReminderSettings & 30s Heartbeat Check Timer              │
│  • Evaluates isReminderDueToday (enabled && !completedToday && timeReached)│
└───────────────┬───────────────────────────────────────────┬───────────────┘
                │                                           │
                ▼                                           ▼
┌───────────────────────────────────────┐   ┌───────────────────────────────┐
│             HomeDashboard             │   │         StatisticsView        │
│ ┌───────────────────────────────────┐ │   │ ┌───────────────────────────┐ │
│ │ In-App Daily Review Reminder Card │ │   │ │ Vocabulary JSON Exporter  │ │
│ │ • Shows due count & "Review Now"  │ │   │ │ • Scope: Vocab | Full DB  │ │
│ │ • "Dismiss for Today" handler     │ │   │ │ • Downloads dated .json   │ │
│ └───────────────────────────────────┘ │   │ └───────────────────────────┘ │
│ ┌───────────────────────────────────┐ │   │ ┌───────────────────────────┐ │
│ │ Quick Daily Reminder Bar          │ │   │ │ Daily Reminder Settings   │ │
│ │ • Toggle On/Off + HH:mm Picker    │ │   │ │ • Toggle On/Off + HH:mm   │ │
│ └───────────────────────────────────┘ │   │ │ • Browser Permission &    │ │
│                                       │   │ │   Test Notification CTA   │ │
└───────────────────────────────────────┘   │ └───────────────────────────┘ │
                                            └───────────────┬───────────────┘
                                                            │
                                                            ▼
                                            ┌───────────────────────────────┐
                                            │   Local Persistence Layer     │
                                            │ • IndexedDB (Decks, Units,    │
                                            │   ReviewLogs, StudyDays)      │
                                            │ • Reminder Settings Store     │
                                            │ • Web Notification API        │
                                            └───────────────────────────────┘
```

- **Data Model & State**:
  - `DailyReminderSettings`:
    - `enabled: boolean` — Whether the daily review reminder is active.
    - `reminderTime: string` — 24-hour local time string in `HH:mm` format (default `'19:00'`).
    - `lastNotifiedDate: string | null` — Local date `'YYYY-MM-DD'` when a browser notification was last dispatched, preventing duplicate notifications on the same day.
    - `dismissedDate: string | null` — Local date `'YYYY-MM-DD'` when the user dismissed the in-app reminder banner for the day.
  - `ExportScope`: `'vocabulary' | 'full'`
    - `'vocabulary'`: Serializes `{ version: 2, exportType: 'vocabulary', exportedAt, count, units }` as `lexicore-vocabulary-YYYY-MM-DD.json`.
    - `'full'`: Serializes `{ version: 2, exportType: 'full_backup', exportedAt, decks, units, reviewLogs, studyDays, reminderSettings }` as `lexicore-backup-YYYY-MM-DD.json`.
- **Interactive Component & State Mapping**:
  - **JSON Export Handler (`StatisticsView`)**: Reads the selected `ExportScope`, queries the database helper, constructs a `Blob` with `application/json`, triggers an anchor download, revokes the object URL, and sets a 3.5-second confirmation status banner.
  - **Reminder Time & Toggle Handlers (`HomeDashboard` & `StatisticsView`)**: Mutate the shared `DailyReminderSettings` state and persist immediately. If toggled on while `Notification.permission === 'default'`, requests browser notification permission gracefully.
  - **Daily Reminder Evaluation & Dismissal**: The root heartbeat compares `toLocalDateString()` and current local `HH:mm` against `reminderSettings.reminderTime`. If `streak.completedToday` becomes `true` after a study session finishes, any active reminder banner automatically clears.
