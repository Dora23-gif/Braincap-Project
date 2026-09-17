import React from 'react';
import { clsx } from 'clsx';

export interface SegmentedControlOption<T extends string = string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
  badge?: string;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
}

export const SegmentedControl = <T extends string = string>({
  options,
  activeId,
  onChange,
  className
}: SegmentedControlProps<T>) => {
  return (
    <div
      className={clsx(
        'relative flex items-center p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 overflow-x-auto no-scrollbar touch-pan-x',
        className
      )}
    >
      {options.map(option => {
        const isActive = option.id === activeId;
        const Icon = option.icon;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={clsx(
              'relative flex-1 min-w-max flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer select-none touch-target',
              isActive
                ? 'bg-white dark:bg-[#0E1526] text-slate-950 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10 dark:shadow-[0_0_12px_rgba(255,255,255,0.06)]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
            )}
          >
            {Icon && (
              <Icon
                className={clsx(
                  'w-4 h-4 shrink-0 transition-colors',
                  isActive ? 'text-amber-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'
                )}
              />
            )}
            <span className="truncate">{option.label}</span>

            {option.count !== undefined && (
              <span
                className={clsx(
                  'px-1.5 py-0.5 rounded-md text-[10px] font-mono-tabular font-bold ml-0.5',
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    : 'bg-slate-200/70 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400'
                )}
              >
                {option.count}
              </span>
            )}

            {option.badge && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
