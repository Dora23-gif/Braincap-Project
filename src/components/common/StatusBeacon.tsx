import React from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';

export const StatusBeacon: React.FC = () => {
  const { activeSession, activeTerm, isBackendLoaded } = useSchoolData();

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-xs">
      <span className="relative flex h-2 w-2">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
            isBackendLoaded ? 'bg-emerald-400' : 'bg-cyan-400'
          } opacity-75`}
        ></span>
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            isBackendLoaded ? 'bg-emerald-500' : 'bg-cyan-500'
          }`}
        ></span>
      </span>
      <span className="font-semibold text-slate-900 dark:text-slate-100">
        {activeSession?.name || '2025/2026'}
      </span>
      <span className="text-slate-300 dark:text-slate-600">|</span>
      <span className="text-amber-700 dark:text-amber-400 font-medium">
        {activeTerm?.name || '1st Term'}
      </span>
    </div>
  );
};
