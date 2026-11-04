import React from 'react';
import { Flame, BookOpen, Sparkles, Layers, BarChart2 } from 'lucide-react';

export type NavTab = 'study' | 'browser' | 'add' | 'decks' | 'stats';

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  dueCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  dueCount = 0,
}) => {
  const tabs = [
    { id: 'study' as NavTab, label: 'Study', icon: Flame, badge: dueCount > 0 ? dueCount : undefined },
    { id: 'browser' as NavTab, label: 'Vocabulary', icon: BookOpen },
    { id: 'add' as NavTab, label: 'AI Add', icon: Sparkles, highlight: true },
    { id: 'decks' as NavTab, label: 'Decks', icon: Layers },
    { id: 'stats' as NavTab, label: 'Stats', icon: BarChart2 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 text-slate-400 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-md mx-auto grid grid-cols-5 h-16 items-center px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          if (tab.highlight) {
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center justify-center -mt-4 group relative"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                    isActive
                      ? 'bg-gradient-to-tr from-indigo-500 to-sky-400 text-white shadow-indigo-500/30 scale-105'
                      : 'bg-indigo-600 text-white shadow-indigo-600/20 group-hover:scale-105'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-[10px] font-semibold mt-1 tracking-tight ${
                    isActive ? 'text-indigo-400' : 'text-slate-400'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 transition-colors relative ${
                isActive ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-sm animate-pulse">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] mt-1 font-medium tracking-tight ${
                  isActive ? 'text-sky-400 font-semibold' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
