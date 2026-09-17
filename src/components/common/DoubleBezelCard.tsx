import React from 'react';
import { clsx } from 'clsx';

interface DoubleBezelCardProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  hoverEffect?: boolean;
}

export const DoubleBezelCard: React.FC<DoubleBezelCardProps> = ({
  children,
  className,
  innerClassName,
  hoverEffect = false
}) => {
  return (
    <div
      className={clsx(
        'rounded-3xl p-1 sm:p-1.5 bg-slate-900/[0.03] dark:bg-white/[0.03] border border-slate-900/5 dark:border-white/10 transition-all duration-300',
        hoverEffect && 'hover:-translate-y-0.5 hover:shadow-lg dark:hover:border-white/20',
        className
      )}
    >
      <div
        className={clsx(
          'rounded-[calc(1.5rem-0.25rem)] bg-white dark:bg-[#0E1526] border border-slate-200/80 dark:border-white/5 shadow-sm p-4 sm:p-6 transition-colors duration-300 overflow-hidden',
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
};

