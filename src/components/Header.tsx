import React from 'react';
import { Volume2, Download, Smartphone, Sparkles, LayoutDashboard } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface HeaderProps {
  onOpenInstallModal: () => void;
  voiceAccent: 'en-US' | 'en-GB';
  onToggleAccent: () => void;
  onBackToDashboard?: () => void;
  isDashboard?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenInstallModal,
  voiceAccent,
  onToggleAccent,
  onBackToDashboard,
  isDashboard = true,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();

  const handleInstallClick = () => {
    if (isInstallable) {
      install();
    } else {
      onOpenInstallModal();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white px-4 py-3 sm:px-6">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <button
          type="button"
          onClick={onBackToDashboard}
          className="flex items-center gap-3 text-left group transition cursor-pointer"
          title="Return to Home Dashboard"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent group-hover:text-white transition-colors">
                LexiCore
              </h1>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                FSRS
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400'
                }`}
              />
              <span>{isOnline ? 'Local-first & Cloud AI' : 'Offline Mode (Local DB)'}</span>
            </div>
          </div>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Back to Dashboard Button (shown when not already on main dashboard) */}
          {!isDashboard && onBackToDashboard && (
            <button
              id="btn-header-back-dashboard"
              onClick={onBackToDashboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition active:scale-95"
              title="Return to Dashboard"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          )}

          {/* Voice Accent Switcher */}
          <button
            id="btn-voice-accent"
            onClick={onToggleAccent}
            title="Toggle Pronunciation Accent"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700/60 transition"
          >
            <Volume2 className="w-3.5 h-3.5 text-sky-400" />
            <span>{voiceAccent === 'en-US' ? 'US' : 'UK'}</span>
          </button>

          {/* PWA Install Button (if not already standalone) */}
          {!isInstalled && (
            <button
              id="btn-pwa-install"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-xs font-semibold text-white shadow-sm transition active:scale-95"
            >
              {isIOS ? (
                <>
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Install App</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Install</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
