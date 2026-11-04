import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Activity,
  Award,
  Zap,
  Clock,
  Brain,
  ShieldCheck,
  ArrowLeft,
  Download,
  Check,
  Bell,
  BellRing,
  FileJson,
  Database,
} from 'lucide-react';
import {
  VocabularyLearningUnit,
  ReviewLog,
  KnowledgeDimension,
  DailyReminderSettings,
  ExportScope,
} from '../types';
import {
  db,
  toLocalDateString,
  exportDataByScope,
  sendBrowserReviewNotification,
} from '../db';
import { Rating } from 'ts-fsrs';
import { DimensionsRadar } from './DimensionsRadar';

interface StatisticsViewProps {
  units: VocabularyLearningUnit[];
  onBackToDashboard?: () => void;
  reminderSettings: DailyReminderSettings;
  onUpdateReminderSettings: (partial: Partial<DailyReminderSettings>) => void;
  onTriggerTestReminder?: () => void;
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  units,
  onBackToDashboard,
  reminderSettings,
  onUpdateReminderSettings,
  onTriggerTestReminder,
}) => {
  const [logs, setLogs] = useState<ReviewLog[]>([]);
  const [exportScope, setExportScope] = useState<ExportScope>('vocabulary');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [reminderFeedback, setReminderFeedback] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  });

  useEffect(() => {
    const fetchLogs = async () => {
      const allLogs = await db.reviewLogs.orderBy('reviewTime').reverse().limit(50).toArray();
      setLogs(allLogs);
    };
    fetchLogs();
  }, []);

  const handleExportJson = async (overrideScope?: ExportScope) => {
    const activeScope = overrideScope || exportScope;
    setIsExporting(true);
    try {
      const result = await exportDataByScope(activeScope);
      const blob = new Blob([result.json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);

      if (activeScope === 'vocabulary') {
        setExportStatus(
          `Exported ${result.unitCount} vocabulary ${
            result.unitCount === 1 ? 'unit' : 'units'
          } to ${result.filename}`
        );
      } else {
        setExportStatus(
          `Exported full backup (${result.unitCount} units, ${result.deckCount} decks, logs & streaks) to ${result.filename}`
        );
      }
      setTimeout(() => setExportStatus(null), 4000);
    } catch (err) {
      console.error('Failed to export JSON:', err);
      setExportStatus('Failed to export JSON data.');
      setTimeout(() => setExportStatus(null), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRequestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifPermission('unsupported');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
      if (result === 'granted') {
        setReminderFeedback('Browser notifications enabled for daily reviews.');
      } else if (result === 'denied') {
        setReminderFeedback('Browser notifications blocked. In-app reminder banner will still appear.');
      }
      setTimeout(() => setReminderFeedback(null), 4000);
    } catch {
      setReminderFeedback('In-app reminder banner is active.');
      setTimeout(() => setReminderFeedback(null), 4000);
    }
  };

  const handleToggleReminder = async () => {
    const nextEnabled = !reminderSettings.enabled;
    if (nextEnabled && notifPermission === 'default') {
      await handleRequestNotificationPermission();
    }
    onUpdateReminderSettings({ enabled: nextEnabled, dismissedDate: null });
    setReminderFeedback(
      nextEnabled
        ? `Daily review reminder scheduled for ${reminderSettings.reminderTime}.`
        : 'Daily review reminder paused.'
    );
    setTimeout(() => setReminderFeedback(null), 3500);
  };

  const handleTestReminder = async () => {
    if (notifPermission === 'default') {
      await handleRequestNotificationPermission();
    }
    const nowIsoStr = new Date().toISOString();
    const dueNow = units.filter((u) => !u.isSuspended && u.fsrs.due <= nowIsoStr && u.fsrs.reps > 0).length;
    const newNow = units.filter((u) => !u.isSuspended && u.fsrs.reps === 0).length;
    const totalReady = dueNow + Math.min(newNow, 10);

    const dispatchedBrowser = sendBrowserReviewNotification(totalReady, true);
    if (onTriggerTestReminder) {
      onTriggerTestReminder();
    }
    setReminderFeedback(
      dispatchedBrowser
        ? 'Sent browser notification and activated in-app reminder banner on Dashboard.'
        : 'Activated in-app reminder banner on Dashboard.'
    );
    setTimeout(() => setReminderFeedback(null), 4000);
  };

  // Compute stats
  const totalCards = units.length;
  const totalReps = units.reduce((acc, u) => acc + (u.fsrs.reps || 0), 0);

  // Overall retention rate from review logs
  const totalReviews = logs.length;
  const goodEasyCount = logs.filter((l) => l.rating >= Rating.Good).length;
  const retentionRate = totalReviews > 0 ? Math.round((goodEasyCount / totalReviews) * 100) : 92;

  // Average stability
  const studiedUnits = units.filter((u) => u.fsrs.reps > 0);
  const avgStability =
    studiedUnits.length > 0
      ? Math.round((studiedUnits.reduce((acc, u) => acc + (u.fsrs.stability || 0), 0) / studiedUnits.length) * 10) / 10
      : 0;

  // Average 5 Knowledge Dimensions
  const avgMastery: Record<KnowledgeDimension, number> = {
    meaning_recall: 0,
    contextual_usage: 0,
    chunks_collocations: 0,
    nuance_distinction: 0,
    active_production: 0,
  };

  if (units.length > 0) {
    const dims: KnowledgeDimension[] = [
      'meaning_recall',
      'contextual_usage',
      'chunks_collocations',
      'nuance_distinction',
      'active_production',
    ];
    for (const d of dims) {
      const sum = units.reduce((acc, u) => acc + (u.dimensionsMastery?.[d] || 0), 0);
      avgMastery[d] = Math.round(sum / units.length);
    }
  }

  // 7-Day Forecast calculation using local calendar dates
  const now = new Date();
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dateStr = toLocalDateString(d);
    const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString([], { weekday: 'short' });

    // Count units due on this local calendar day
    const count = units.filter((u) => {
      if (u.isSuspended) return false;
      const dueStr = toLocalDateString(new Date(u.fsrs.due));
      if (i === 0) {
        return dueStr <= dateStr; // All overdue items + today
      }
      return dueStr === dateStr;
    }).length;

    return { label: dayLabel, count };
  });

  const maxForecast = Math.max(...next7Days.map((d) => d.count), 1);

  return (
    <div className="max-w-xl mx-auto px-4 py-4 pb-28 text-slate-200">
      {/* Back to Dashboard Navigation */}
      {onBackToDashboard && (
        <div className="mb-4">
          <button
            id="btn-stats-back-dashboard"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition active:scale-95 shadow-sm"
            title="Return to Home Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" />
            <span>FSRS Analytics Engine</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Learning & Memory Stats</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Spaced repetition stability, cognitive retention, and dimensional proficiency
          </p>
        </div>

        <button
          id="btn-stats-header-export-json"
          onClick={() => handleExportJson()}
          disabled={isExporting}
          className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 disabled:opacity-50 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-auto"
          title="Export vocabulary data as JSON"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isExporting ? 'Exporting...' : 'Export JSON'}</span>
        </button>
      </div>

      {/* Export Confirmation Banner */}
      {exportStatus && (
        <div
          id="stats-export-status-banner"
          className="p-3 mb-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2"
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>{exportStatus}</span>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Retention</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{retentionRate}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Target: 90% (FSRS)</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Avg Stability</span>
            <Brain className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-sky-400">{avgStability}d</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Memory half-life</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Total Reps</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{totalReps}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Active reviews</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Total Units</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400">{totalCards}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Active lexicon</div>
        </div>
      </div>

      {/* 7-Day Due Forecast Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              7-Day Due Workload Forecast
            </h3>
            <p className="text-[11px] text-slate-500">Upcoming daily reviews based on FSRS intervals</p>
          </div>
          <Calendar className="w-4 h-4 text-indigo-400" />
        </div>

        <div className="grid grid-cols-7 gap-2 items-end h-28 pt-4">
          {next7Days.map((day, idx) => {
            const heightPercent = Math.max(8, Math.round((day.count / maxForecast) * 100));
            const isToday = idx === 0;

            return (
              <div key={day.label} className="flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[10px] font-bold text-slate-300">{day.count}</span>
                <div className="w-full bg-slate-800/80 rounded-t-lg overflow-hidden flex items-end h-16">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      isToday
                        ? 'bg-gradient-to-t from-indigo-600 to-sky-400'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span
                  className={`text-[10px] font-medium ${
                    isToday ? 'text-sky-400 font-bold' : 'text-slate-500'
                  }`}
                >
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5 Knowledge Dimensions Average Mastery */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
          Vocabulary Mastery Dimensions
        </h3>
        <p className="text-[11px] text-slate-500 mb-4">
          Cross-lexicon average across all 5 dimensions of native depth
        </p>

        <DimensionsRadar mastery={avgMastery} />
      </div>

      {/* Daily Review Reminder Configuration */}
      <div
        id="stats-daily-reminder-card"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Daily Review Reminder
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Get a browser notification and in-app reminder banner when your daily review is due
            </p>
          </div>

          <button
            id="btn-stats-toggle-reminder"
            type="button"
            role="switch"
            aria-checked={reminderSettings.enabled}
            onClick={handleToggleReminder}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap shrink-0 border ${
              reminderSettings.enabled
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {reminderSettings.enabled ? 'Reminder On' : 'Reminder Off'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
          {/* Preferred Local Time Picker */}
          <div className="flex items-center justify-between bg-slate-800/50 border border-slate-800 rounded-xl px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-white">Reminder Time</div>
                <div className="text-[10px] text-slate-400">Daily local schedule</div>
              </div>
            </div>
            <input
              id="stats-reminder-time-input"
              type="time"
              aria-label="Preferred daily reminder time"
              value={reminderSettings.reminderTime}
              onChange={(e) => {
                onUpdateReminderSettings({
                  reminderTime: e.target.value,
                  dismissedDate: null,
                });
                setReminderFeedback(`Updated daily reminder time to ${e.target.value}.`);
                setTimeout(() => setReminderFeedback(null), 3000);
              }}
              disabled={!reminderSettings.enabled}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-indigo-500 disabled:opacity-40 cursor-pointer"
            />
          </div>

          {/* Browser Notification Status & Test Trigger */}
          <div className="flex items-center justify-between bg-slate-800/50 border border-slate-800 rounded-xl px-3.5 py-2.5 gap-2">
            <div>
              <div className="text-xs font-semibold text-white">Notification Channel</div>
              <div className="text-[10px] text-slate-400">
                {notifPermission === 'granted'
                  ? 'Browser push + In-app banner'
                  : notifPermission === 'default'
                  ? 'In-app banner (enable push)'
                  : 'In-app reminder banner active'}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {notifPermission === 'default' && (
                <button
                  id="btn-enable-browser-notifications"
                  type="button"
                  onClick={handleRequestNotificationPermission}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-sky-300 transition whitespace-nowrap shrink-0"
                >
                  Allow Push
                </button>
              )}
              <button
                id="btn-test-daily-reminder"
                type="button"
                onClick={handleTestReminder}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-[11px] font-semibold text-indigo-300 transition flex items-center gap-1 whitespace-nowrap shrink-0"
                title="Trigger a test reminder notification and banner"
              >
                <Bell className="w-3 h-3" />
                <span>Test Reminder</span>
              </button>
            </div>
          </div>
        </div>

        {reminderFeedback && (
          <div className="mt-3 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{reminderFeedback}</span>
          </div>
        )}
      </div>

      {/* Vocabulary Data Export & Portability Card */}
      <div
        id="stats-vocabulary-export-card"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Export Vocabulary Data (JSON)
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Choose whether to export only your vocabulary units or a complete backup archive
            </p>
          </div>
        </div>

        {/* Scope Selector Segmented Control */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 border border-slate-800 rounded-xl mb-3.5">
          <button
            id="btn-export-scope-vocabulary"
            type="button"
            onClick={() => setExportScope('vocabulary')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
              exportScope === 'vocabulary'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Vocabulary Only ({units.length})</span>
          </button>

          <button
            id="btn-export-scope-full"
            type="button"
            onClick={() => setExportScope('full')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
              exportScope === 'full'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Full Backup Archive</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/40 border border-slate-800 rounded-xl p-3">
          <div className="text-xs text-slate-300">
            {exportScope === 'vocabulary' ? (
              <span>
                Exports <strong className="text-white tabular-nums">{units.length}</strong> vocabulary
                units with definitions, native chunks, variants, and FSRS schedules.
              </span>
            ) : (
              <span>
                Exports all <strong className="text-white tabular-nums">{units.length}</strong> vocabulary
                units, decks, review logs, daily streak records, and reminder settings.
              </span>
            )}
          </div>

          <button
            id="btn-stats-export-json"
            type="button"
            onClick={() => handleExportJson()}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 disabled:opacity-50 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {isExporting
                ? 'Exporting...'
                : exportScope === 'vocabulary'
                ? 'Download Vocabulary JSON'
                : 'Download Full Backup JSON'}
            </span>
          </button>
        </div>
      </div>

      {/* Recent Review Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Recent Review Activity
          </h3>
          <Clock className="w-3.5 h-3.5 text-slate-500" />
        </div>

        {logs.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No reviews recorded yet today.</p>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 8).map((log) => {
              const ratingBadge = {
                [Rating.Again]: { label: 'Again', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
                [Rating.Hard]: { label: 'Hard', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
                [Rating.Good]: { label: 'Good', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
                [Rating.Easy]: { label: 'Easy', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
              }[log.rating];

              const timeStr = new Date(log.reviewTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${ratingBadge?.color}`}>
                      {ratingBadge?.label}
                    </span>
                    <span className="font-semibold text-white">{log.word}</span>
                    <span className="text-[10px] text-slate-500 uppercase">{log.variantType.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                    <span>+{Math.round(log.scheduledDays * 10) / 10}d</span>
                    <span className="text-slate-600">•</span>
                    <span>{timeStr}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
