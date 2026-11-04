import React, { useState, useEffect, useCallback } from 'react';
import {
  db,
  initializeDatabase,
  getDueUnits,
  getStreakSummary,
  getReminderSettings,
  saveReminderSettings,
  isReminderTimeReached,
  sendBrowserReviewNotification,
  toLocalDateString,
} from './db';
import {
  Deck,
  VocabularyLearningUnit,
  StreakSummary,
  DailyReminderSettings,
} from './types';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { OfflineBanner } from './components/OfflineBanner';
import { PWAInstallModal } from './components/PWAInstallModal';
import { HomeDashboard } from './components/HomeDashboard';
import { StudySession } from './components/StudySession';
import { VocabularyBrowser } from './components/VocabularyBrowser';
import { AddVocabulary } from './components/AddVocabulary';
import { DecksManager } from './components/DecksManager';
import { StatisticsView } from './components/StatisticsView';
import { useSpeech } from './hooks/useSpeech';

const EMPTY_STREAK: StreakSummary = {
  currentStreak: 0,
  longestStreak: 0,
  completedToday: false,
  totalStudyDays: 0,
  lastStudyDate: null,
  last7Days: [],
};

export default function App() {
  const { voiceAccent, toggleAccent } = useSpeech();

  const [isLoading, setIsLoading] = useState(true);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [units, setUnits] = useState<VocabularyLearningUnit[]>([]);
  const [streak, setStreak] = useState<StreakSummary>(EMPTY_STREAK);
  const [reminderSettings, setReminderSettings] = useState<DailyReminderSettings>(() =>
    getReminderSettings()
  );
  const [forceTestReminderBanner, setForceTestReminderBanner] = useState<boolean>(false);
  const [timeReachedTick, setTimeReachedTick] = useState<boolean>(() =>
    isReminderTimeReached(getReminderSettings().reminderTime)
  );
  const [currentTab, setCurrentTab] = useState<NavTab>('study');
  const [selectedDeckId, setSelectedDeckId] = useState<string>('all');
  const [isStudySessionActive, setIsStudySessionActive] = useState<boolean>(false);
  const [sessionUnits, setSessionUnits] = useState<VocabularyLearningUnit[]>([]);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);

  // Load database on start
  const reloadData = useCallback(async () => {
    try {
      const [allDecks, allUnits, streakSummary] = await Promise.all([
        db.decks.toArray(),
        db.units.toArray(),
        getStreakSummary(),
      ]);
      setDecks(allDecks);
      setUnits(allUnits);
      setStreak(streakSummary);
      setReminderSettings(getReminderSettings());
      setSelectedDeckId((prev) => {
        if (prev !== 'all' && !allDecks.some((d) => d.id === prev)) {
          return 'all';
        }
        return prev;
      });
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      await initializeDatabase();
      if (active) {
        await reloadData();
      }
    };
    init();
    return () => {
      active = false;
    };
  }, [reloadData]);

  const handleUpdateReminderSettings = useCallback(
    (partial: Partial<DailyReminderSettings>) => {
      const updated = saveReminderSettings(partial);
      setReminderSettings(updated);
      setTimeReachedTick(isReminderTimeReached(updated.reminderTime));
    },
    []
  );

  const handleDismissReminderToday = useCallback(() => {
    const todayStr = toLocalDateString();
    const updated = saveReminderSettings({ dismissedDate: todayStr });
    setReminderSettings(updated);
    setForceTestReminderBanner(false);
  }, []);

  // Compute due count for bottom nav badge and reminders
  const nowIso = new Date().toISOString();
  const dueCount = units.filter(
    (u) => !u.isSuspended && u.fsrs.due <= nowIso && u.fsrs.reps > 0
  ).length;
  const newCount = units.filter((u) => !u.isSuspended && u.fsrs.reps === 0).length;
  const totalReadyForDailyReview = dueCount + Math.min(newCount, 10);

  // 30-second heartbeat scheduler for Daily Review Reminder
  useEffect(() => {
    if (isLoading) return;

    const evaluateReminder = () => {
      const reached = isReminderTimeReached(reminderSettings.reminderTime);
      setTimeReachedTick(reached);

      if (!reminderSettings.enabled || streak.completedToday || !reached) {
        return;
      }

      const todayStr = toLocalDateString();
      if (reminderSettings.lastNotifiedDate !== todayStr) {
        const sent = sendBrowserReviewNotification(totalReadyForDailyReview, false);
        if (sent) {
          const updated = saveReminderSettings({ lastNotifiedDate: todayStr });
          setReminderSettings(updated);
        }
      }
    };

    evaluateReminder();
    const timerId = window.setInterval(evaluateReminder, 30000);
    return () => window.clearInterval(timerId);
  }, [
    isLoading,
    reminderSettings.enabled,
    reminderSettings.reminderTime,
    reminderSettings.lastNotifiedDate,
    streak.completedToday,
    totalReadyForDailyReview,
  ]);

  const todayStr = toLocalDateString();
  const isReminderDueNow =
    forceTestReminderBanner ||
    (reminderSettings.enabled &&
      !streak.completedToday &&
      timeReachedTick &&
      reminderSettings.dismissedDate !== todayStr);

  const handleBackToDashboard = useCallback(async () => {
    setIsStudySessionActive(false);
    setCurrentTab('study');
    await reloadData();
  }, [reloadData]);

  // Start study session
  const handleStartSession = async (deckId?: string) => {
    const targetDeck = deckId || selectedDeckId;
    let dueList = await getDueUnits(targetDeck, 25);

    // If no due items, let user review cards ahead of time
    if (dueList.length === 0) {
      let candidateUnits = units.filter((u) => !u.isSuspended);
      if (targetDeck && targetDeck !== 'all') {
        candidateUnits = candidateUnits.filter((u) => u.deckId === targetDeck);
      }
      dueList = candidateUnits.slice(0, 15);
    }

    if (dueList.length > 0) {
      setSessionUnits(dueList);
      setIsStudySessionActive(true);
      setCurrentTab('study');
    }
  };

  const handleFinishSession = async () => {
    setIsStudySessionActive(false);
    setForceTestReminderBanner(false);
    await reloadData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 animate-pulse flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4" />
        <h1 className="text-xl font-bold tracking-tight mb-1">LexiCore</h1>
        <p className="text-xs text-slate-400">Initializing offline FSRS database...</p>
      </div>
    );
  }

  const isDashboard = currentTab === 'study' && !isStudySessionActive;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Offline Connectivity Warning */}
      <OfflineBanner />

      {/* Top Header */}
      <Header
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        voiceAccent={voiceAccent}
        onToggleAccent={toggleAccent}
        onBackToDashboard={handleBackToDashboard}
        isDashboard={isDashboard}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-2xl mx-auto">
        {currentTab === 'study' && (
          isStudySessionActive ? (
            <StudySession
              initialUnits={sessionUnits}
              decks={decks}
              selectedDeckId={selectedDeckId}
              onSessionFinish={handleFinishSession}
              onBackToDashboard={handleBackToDashboard}
            />
          ) : (
            <HomeDashboard
              decks={decks}
              units={units}
              streak={streak}
              selectedDeckId={selectedDeckId}
              onSelectDeck={setSelectedDeckId}
              onStartSession={handleStartSession}
              onNavigateTab={(tab) => {
                setIsStudySessionActive(false);
                setCurrentTab(tab);
              }}
              reminderSettings={reminderSettings}
              isReminderDueNow={isReminderDueNow}
              onUpdateReminderSettings={handleUpdateReminderSettings}
              onDismissReminderToday={handleDismissReminderToday}
            />
          )
        )}

        {currentTab === 'browser' && (
          <VocabularyBrowser
            units={units}
            decks={decks}
            onUnitsUpdated={reloadData}
            onBackToDashboard={handleBackToDashboard}
          />
        )}

        {currentTab === 'add' && (
          <AddVocabulary
            decks={decks}
            onUnitsAdded={reloadData}
            onNavigateToBrowser={() => {
              reloadData();
              setCurrentTab('browser');
            }}
            onBackToDashboard={handleBackToDashboard}
          />
        )}

        {currentTab === 'decks' && (
          <DecksManager
            decks={decks}
            units={units}
            onDecksUpdated={reloadData}
            onStudyDeck={(deckId) => {
              setSelectedDeckId(deckId);
              handleStartSession(deckId);
            }}
            onBackToDashboard={handleBackToDashboard}
          />
        )}

        {currentTab === 'stats' && (
          <StatisticsView
            units={units}
            onBackToDashboard={handleBackToDashboard}
            reminderSettings={reminderSettings}
            onUpdateReminderSettings={handleUpdateReminderSettings}
            onTriggerTestReminder={() => {
              const updated = saveReminderSettings({ enabled: true, dismissedDate: null });
              setReminderSettings(updated);
              setForceTestReminderBanner(true);
            }}
          />
        )}
      </main>

      {/* PWA iOS Install Modal */}
      <PWAInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Mobile-first Bottom Navigation Bar (hidden during active study to avoid accidental taps) */}
      {!isStudySessionActive && (
        <BottomNav
          currentTab={currentTab}
          onTabChange={(tab) => {
            setIsStudySessionActive(false);
            setCurrentTab(tab);
          }}
          dueCount={dueCount}
        />
      )}
    </div>
  );
}
