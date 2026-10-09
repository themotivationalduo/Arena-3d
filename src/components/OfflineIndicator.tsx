import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500/90 backdrop-blur-md px-3.5 py-2 text-xs font-tactical font-bold text-slate-950 shadow-xl border border-amber-300/40 animate-pulse">
      <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-ping" />
      <span>OFFLINE MODE · LOCAL CACHE ACTIVE</span>
    </div>
  );
};
