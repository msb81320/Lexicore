import React, { useMemo } from 'react';
import {
  Flame,
  Sparkles,
  BookOpen,
  ArrowRight,
  Volume2,
  Award,
  Check,
  CheckCircle2,
  Bell,
  BellRing,
  Clock,
  X,
} from 'lucide-react';
import { Deck, VocabularyLearningUnit, StreakSummary, DailyReminderSettings } from '../types';
import { useSpeech } from '../hooks/useSpeech';

interface HomeDashboardProps {
  decks: Deck[];
  units: VocabularyLearningUnit[];
  streak: StreakSummary;
  selectedDeckId: string;
  onSelectDeck: (id: string) => void;
  onStartSession: (deckId?: string) => void;
  onNavigateTab: (tab: 'browser' | 'add' | 'decks' | 'stats') => void;
  reminderSettings: DailyReminderSettings;
  isReminderDueNow: boolean;
  onUpdateReminderSettings: (partial: Partial<DailyReminderSettings>) => void;
  onDismissReminderToday: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  decks,
  units,
  streak,
  selectedDeckId,
  onSelectDeck,
  onStartSession,
  onNavigateTab,
  reminderSettings,
  isReminderDueNow,
  onUpdateReminderSettings,
  onDismissReminderToday,
}) => {
  const { speak } = useSpeech();
  const nowIso = new Date().toISOString();

  // Filter units by selected deck
  const activeDeckUnits = useMemo(() => {
    if (selectedDeckId === 'all') return units.filter((u) => !u.isSuspended);
    return units.filter((u) => !u.isSuspended && u.deckId === selectedDeckId);
  }, [units, selectedDeckId]);

  // Compute workload
  const dueUnits = useMemo(() => {
    return activeDeckUnits.filter((u) => u.fsrs.due <= nowIso && u.fsrs.reps > 0);
  }, [activeDeckUnits, nowIso]);

  const newUnits = useMemo(() => {
    return activeDeckUnits.filter((u) => u.fsrs.reps === 0);
  }, [activeDeckUnits]);

  // Daily featured chunk / collocation from our dataset
  const featuredChunk = useMemo(() => {
    for (const u of units) {
      if (u.chunks && u.chunks.length > 0) {
        return {
          word: u.word,
          chunk: u.chunks[0],
          partOfSpeech: u.partOfSpeech,
        };
      }
    }
    return null;
  }, [units]);

  const totalDueForSession = dueUnits.length + Math.min(newUnits.length, 10);
  const isStreakActive = streak.currentStreak > 0;

  const handleToggleReminder = async () => {
    const nextEnabled = !reminderSettings.enabled;
    if (
      nextEnabled &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      try {
        await Notification.requestPermission();
      } catch {
        // Ignore if permission request is blocked by browser context
      }
    }
    onUpdateReminderSettings({ enabled: nextEnabled, dismissedDate: null });
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-4 pb-28 text-slate-200">
      {/* In-App Daily Review Reminder Banner */}
      {isReminderDueNow && !streak.completedToday && (
        <div
          id="daily-review-reminder-banner"
          className="mb-4 rounded-2xl bg-gradient-to-r from-indigo-950/90 via-slate-900 to-sky-950/80 border border-indigo-500/40 p-4 shadow-lg shadow-indigo-500/10"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                <BellRing className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-300">
                    Daily Review Reminder
                  </span>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    · Scheduled {reminderSettings.reminderTime}
                  </span>
                </div>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                  {totalDueForSession > 0
                    ? `You have ${totalDueForSession} vocabulary ${
                        totalDueForSession === 1 ? 'card' : 'cards'
                      } ready for today's review. Complete a session now to protect your streak!`
                    : "You haven't completed a study session yet today. Review ahead to keep your daily streak active!"}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    id="btn-reminder-start-review"
                    onClick={() => onStartSession(selectedDeckId)}
                    disabled={activeDeckUnits.length === 0}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-300" />
                    <span>Review Now</span>
                  </button>
                  <button
                    id="btn-reminder-dismiss-today"
                    onClick={onDismissReminderToday}
                    className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 text-slate-300 hover:text-white text-xs font-medium transition whitespace-nowrap shrink-0"
                  >
                    Dismiss for Today
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={onDismissReminderToday}
              aria-label="Dismiss reminder"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Daily Study Streak Banner */}
      <div
        id="daily-streak-banner"
        className={`relative overflow-hidden rounded-2xl border p-4 mb-4 transition-all ${
          streak.completedToday
            ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border-amber-500/30 shadow-lg shadow-amber-500/5'
            : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left: Current & Best Streak */}
          <div className="flex items-center justify-between sm:justify-start gap-3.5">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform ${
                  streak.completedToday
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25'
                    : isStreakActive
                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                    : 'bg-slate-800 border border-slate-700/70 text-slate-400'
                }`}
              >
                <Flame
                  className={`w-5 h-5 ${
                    streak.completedToday ? 'fill-white text-white' : isStreakActive ? 'text-amber-400' : 'text-slate-400'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-baseline gap-1.5">
                  <span
                    id="streak-current-count"
                    className="text-2xl font-extrabold text-white tracking-tight tabular-nums"
                  >
                    {streak.currentStreak}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    {streak.currentStreak === 1 ? 'Day Streak' : 'Days Streak'}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                  {streak.completedToday ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Today&apos;s session completed</span>
                    </span>
                  ) : isStreakActive ? (
                    <span className="text-[11px] text-amber-300/90">
                      Complete a session today to extend your streak
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      Finish a study session to ignite your daily streak
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Best Streak Badge (Mobile right / Desktop inline) */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <div className="text-left">
                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold leading-none">
                  Best
                </div>
                <div
                  id="streak-best-count"
                  className="text-xs font-bold text-white tabular-nums leading-tight mt-0.5"
                >
                  {streak.longestStreak}d
                </div>
              </div>
            </div>
          </div>

          {/* Right: 7-Day Activity Dots */}
          {streak.last7Days.length > 0 && (
            <div className="flex items-center justify-between sm:justify-end gap-1.5 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
              {streak.last7Days.map((day) => (
                <div
                  key={day.date}
                  title={`${day.dayLabel} (${day.date}): ${
                    day.completed
                      ? `${day.sessionsCompleted} session(s), ${day.cardsReviewed} cards reviewed`
                      : 'No completed session'
                  }`}
                  className="flex flex-col items-center gap-1 min-w-[30px]"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                      day.completed
                        ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                        : day.isToday
                        ? 'bg-slate-800 text-slate-300 ring-1 ring-amber-400/60'
                        : 'bg-slate-800/70 text-slate-500 border border-slate-700/50'
                    }`}
                  >
                    {day.completed ? (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    ) : (
                      <span>{day.shortLabel}</span>
                    )}
                  </div>
                  <span
                    className={`text-[9px] font-semibold tracking-tight ${
                      day.isToday
                        ? 'text-amber-400 font-bold'
                        : day.completed
                        ? 'text-slate-300'
                        : 'text-slate-500'
                    }`}
                  >
                    {day.isToday ? 'Today' : day.dayLabel}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Synchronized Daily Review Reminder Control Bar */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Bell
              className={`w-3.5 h-3.5 ${
                reminderSettings.enabled ? 'text-indigo-400' : 'text-slate-500'
              }`}
            />
            <span className="text-xs font-medium text-slate-300">Daily Review Reminder</span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              · {reminderSettings.enabled ? `Active at ${reminderSettings.reminderTime}` : 'Off'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/70 rounded-xl px-2.5 py-1">
              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
              <input
                id="dashboard-reminder-time-input"
                type="time"
                aria-label="Daily reminder time"
                value={reminderSettings.reminderTime}
                onChange={(e) =>
                  onUpdateReminderSettings({
                    reminderTime: e.target.value,
                    dismissedDate: null,
                  })
                }
                disabled={!reminderSettings.enabled}
                className="bg-transparent text-xs font-semibold text-white tabular-nums focus:outline-none disabled:opacity-40 cursor-pointer"
              />
            </div>

            <button
              id="btn-dashboard-toggle-reminder"
              type="button"
              role="switch"
              aria-checked={reminderSettings.enabled}
              onClick={handleToggleReminder}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition whitespace-nowrap shrink-0 border ${
                reminderSettings.enabled
                  ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {reminderSettings.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>
      </div>

      {/* Deck Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        <button
          onClick={() => onSelectDeck('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            selectedDeckId === 'all'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          All Decks ({units.length})
        </button>

        {decks.map((deck) => {
          const count = units.filter((u) => u.deckId === deck.id).length;
          const isSelected = selectedDeckId === deck.id;

          return (
            <button
              key={deck.id}
              onClick={() => onSelectDeck(deck.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: deck.color || '#6366f1' }}
              />
              <span>{deck.name}</span>
              <span className="text-[10px] text-slate-500">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Hero Study Session Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 p-6 shadow-2xl mb-6">
        {/* Glow effect */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Today&apos;s Spaced Repetition</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
            FSRS-v4
          </span>
        </div>

        <div className="mb-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
            {totalDueForSession > 0 ? (
              <span>{totalDueForSession} Cards Ready</span>
            ) : (
              <span>All Caught Up!</span>
            )}
          </h2>
          <p className="text-xs text-slate-400 max-w-sm">
            {totalDueForSession > 0
              ? 'Adaptive active recall across definitions, native chunks, context clozes, and register nuances.'
              : 'Great work! No cards due right now. You can review ahead or generate new units.'}
          </p>
        </div>

        {/* Counter Pills */}
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-sm shrink-0">
              {dueUnits.length}
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Review Due</div>
              <div className="text-[10px] text-slate-400">Scheduled by FSRS</div>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm shrink-0">
              {newUnits.length}
            </div>
            <div>
              <div className="text-xs font-semibold text-white">New Units</div>
              <div className="text-[10px] text-slate-400">Ready to introduce</div>
            </div>
          </div>
        </div>

        {/* Start Review Button */}
        <button
          id="btn-start-study-session"
          onClick={() => onStartSession(selectedDeckId)}
          disabled={activeDeckUnits.length === 0}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-sky-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition active:scale-98 flex items-center justify-center gap-2 group"
        >
          <Flame className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
          <span>
            {totalDueForSession > 0
              ? `Start Daily Review (${totalDueForSession} items)`
              : 'Review Lexicon Ahead'}
          </span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Featured Native Chunk of the Day */}
      {featuredChunk && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-6 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-purple-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Native Collocation of the Day</span>
            </div>
            <button
              onClick={() => speak(featuredChunk.chunk.text)}
              className="text-purple-400 hover:text-purple-300 p-1 rounded-lg hover:bg-purple-950/40 transition"
              title="Pronounce chunk"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-lg font-bold text-white tracking-tight mb-1">
            &ldquo;{featuredChunk.chunk.text}&rdquo;
          </h3>
          <p className="text-xs text-slate-300 mb-2">{featuredChunk.chunk.meaning}</p>
          {featuredChunk.chunk.example && (
            <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 font-serif italic">
              &ldquo;{featuredChunk.chunk.example}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Quick Action Cards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigateTab('add')}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/60 transition text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-white">AI Vocabulary Generator</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Input any word to synthesize chunks & variants</p>
        </button>

        <button
          onClick={() => onNavigateTab('browser')}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-sky-500/60 transition text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-white">Browse Library</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Search definitions, chunks, and FSRS stats</p>
        </button>
      </div>
    </div>
  );
};
