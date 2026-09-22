import React from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { Shield, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

interface FuturisticPageShellProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badgeText?: string;
  badgeVariant?: 'success' | 'warning' | 'info' | 'cyber';
  actions?: React.ReactNode;
  showTermPill?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const FuturisticPageShell: React.FC<FuturisticPageShellProps> = ({
  title,
  subtitle,
  icon: Icon = Shield,
  badgeText,
  badgeVariant = 'cyber',
  actions,
  showTermPill = true,
  children,
  className
}) => {
  const { activeTerm, activeSession } = useSchoolData();

  const getBadgeStyle = () => {
    switch (badgeVariant) {
      case 'success':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'warning':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'info':
        return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30';
      case 'cyber':
      default:
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
    }
  };

  return (
    <div className={clsx('w-full space-y-6 animate-fade-slide-up', className)}>
      {/* Universal Futuristic Header Shell */}
      <div className="relative rounded-3xl p-1 bg-slate-900/[0.03] dark:bg-white/[0.03] border border-slate-900/5 dark:border-white/10 shadow-xs transition-all duration-300">
        <div className="rounded-[calc(1.5rem-0.25rem)] bg-white/95 dark:bg-[#0E1526]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/5 p-4 sm:p-6 transition-colors duration-300">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 sm:gap-5">
            {/* Title & Brand Icon Group */}
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 via-indigo-500/10 to-cyan-500/20 dark:from-indigo-500/30 dark:to-cyan-500/30 border border-amber-500/30 dark:border-cyan-500/30 flex items-center justify-center text-amber-700 dark:text-cyan-300 shrink-0 shadow-xs mt-0.5">
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-950 dark:text-white tracking-tight font-sans">
                    {title}
                  </h1>

                  {badgeText && (
                    <span
                      className={clsx(
                        'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-2xs inline-flex items-center gap-1 shrink-0',
                        getBadgeStyle()
                      )}
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>{badgeText}</span>
                    </span>
                  )}
                </div>

                {subtitle && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl lg:max-w-5xl leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Actions & Session/Term Indicators */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full xl:w-auto min-w-0 justify-start xl:justify-end shrink-0">
              {showTermPill && (
                <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-glow" />
                  <span>{activeSession.name}</span>
                  <span className="text-slate-400 dark:text-slate-500">•</span>
                  <span>{activeTerm.name}</span>
                </div>
              )}

              {actions && (
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {actions}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Page Workspace Content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
};
