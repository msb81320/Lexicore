import React from 'react';
import { WifiOff, Database } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-amber-300 text-xs flex items-center justify-center gap-2">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span className="font-medium">Offline Mode:</span>
      <span className="text-amber-200/90">FSRS spaced repetition & active recall run locally via IndexedDB.</span>
      <Database className="w-3.5 h-3.5 text-amber-400 shrink-0" />
    </div>
  );
};
