import React from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface FuturisticKPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  sparklineData?: number[];
  glowColor?: 'indigo' | 'emerald' | 'amber' | 'cyan' | 'rose';
  badge?: string;
  onClick?: () => void;
  className?: string;
}

export const FuturisticKPICard: React.FC<FuturisticKPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  glowColor = 'indigo',
  badge,
  onClick,
  className
}) => {
  const getGlowStyles = () => {
    switch (glowColor) {
      case 'emerald':
        return {
          iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60',
          accentText: 'text-emerald-600 dark:text-emerald-400'
        };
      case 'amber':
        return {
          iconBg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/60',
          accentText: 'text-amber-600 dark:text-amber-400'
        };
      case 'cyan':
        return {
          iconBg: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 border-cyan-200/60 dark:border-cyan-800/60',
          accentText: 'text-cyan-600 dark:text-cyan-400'
        };
      case 'rose':
        return {
          iconBg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/60',
          accentText: 'text-rose-600 dark:text-rose-400'
        };
      case 'indigo':
      default:
        return {
          iconBg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/60',
          accentText: 'text-indigo-600 dark:text-indigo-400'
        };
    }
  };

  const { iconBg } = getGlowStyles();

  return (
    <div
      onClick={onClick}
      className={clsx(
        'group relative rounded-2xl p-4 sm:p-5 bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs transition-all duration-200',
        'hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md',
        onClick ? 'cursor-pointer active:scale-98' : 'cursor-default',
        className
      )}
    >
      {/* Top Row: Title + Icon */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs sm:text-[13px] font-semibold text-slate-500 dark:text-slate-400 truncate">
          {title}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {badge && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {badge}
            </span>
          )}
          <div className={clsx('w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border transition-transform duration-200 group-hover:scale-105 shrink-0', iconBg)}>
            <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
        </div>
      </div>

      {/* Main Number Row */}
      <div className="my-1.5">
        <div className="text-2xl sm:text-3xl font-extrabold font-mono-tabular text-slate-900 dark:text-white tracking-tight">
          {value}
        </div>
      </div>

      {/* Bottom Row: Subtitle + Trend Badge */}
      {(subtitle || trend) && (
        <div className="flex items-center justify-between gap-2 pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800/70 text-xs">
          {subtitle && (
            <span className="text-slate-500 dark:text-slate-400 truncate text-[11px] sm:text-xs">
              {subtitle}
            </span>
          )}

          {trend && (
            <div
              className={clsx(
                'inline-flex items-center gap-1 font-bold font-mono-tabular shrink-0 text-[11px] sm:text-xs ml-auto',
                trend.isPositive !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {trend.isPositive !== false ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
