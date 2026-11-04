import React from 'react';
import { X, Share, PlusSquare, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white relative">
        <button
          id="btn-close-install-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">Install LexiCore on iPhone</h3>
            <p className="text-xs text-slate-400">Add to Home Screen for native offline learning</p>
          </div>
        </div>

        <div className="space-y-3.5 my-5">
          <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
              <Share className="w-4 h-4" />
            </div>
            <div className="text-sm">
              <p className="font-semibold text-slate-200">1. Tap the Share button</p>
              <p className="text-xs text-slate-400 mt-0.5">
                In Safari&apos;s bottom navigation bar, tap the square icon with an arrow pointing up.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <PlusSquare className="w-4 h-4" />
            </div>
            <div className="text-sm">
              <p className="font-semibold text-slate-200">2. Select &ldquo;Add to Home Screen&rdquo;</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Scroll down through the share actions sheet and tap <span className="text-indigo-300 font-medium">&ldquo;Add to Home Screen&rdquo;</span>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-sm">
              <p className="font-semibold text-slate-200">3. Tap &ldquo;Add&rdquo; in Top Right</p>
              <p className="text-xs text-slate-400 mt-0.5">
                LexiCore will now launch as a standalone app with safe-area spacing and offline IndexedDB persistence.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/40 px-3.5 py-2.5 rounded-xl border border-slate-800 mb-5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>FSRS schedules and cards run 100% locally on your device even without internet!</span>
        </div>

        <button
          id="btn-got-it-install"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-sm font-semibold text-white shadow-lg transition"
        >
          Got It!
        </button>
      </div>
    </div>
  );
};
