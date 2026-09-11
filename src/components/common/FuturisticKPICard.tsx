import React from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { MiniSparkline } from './ChartComponents';

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
  sparklineData,
  glowColor = 'indigo',
  badge,
  onClick,
  className
}) => {
  const getGlowStyles = () => {
    switch (glowColor) {
      case 'emerald':
        return {
          iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          sparkColor: '#10B981',
          accentText: 'text-emerald-600 dark:text-emerald-400'
        };
      case 'amber':
        return {
          iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
          sparkColor: '#F59E0B',
          accentText: 'text-amber-600 dark:text-amber-400'
        };
      case 'cyan':
        return {
          iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
          sparkColor: '#06B6D4',
          accentText: 'text-cyan-600 dark:text-cyan-400'
        };
      case 'rose':
        return {
          iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
          sparkColor: '#F43F5E',
          accentText: 'text-rose-600 dark:text-rose-400'
        };
      case 'indigo':
      default:
        return {
          iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
          sparkColor: '#6366F1',
          accentText: 'text-indigo-600 dark:text-indigo-400'
        };
    }
  };

  const { iconBg, sparkColor, accentText } = getGlowStyles();

  return (
    <div
      onClick={onClick}
      className={clsx(
        'group relative rounded-3xl p-1 bg-slate-900/[0.03] dark:bg-white/[0.03] border border-slate-900/5 dark:border-white/10 transition-all duration-300',
        'hover:-translate-y-1 hover:shadow-xl hover:border-slate-300 dark:hover:border-white/20',
        onClick ? 'cursor-pointer active:scale-98' : 'cursor-default',
        className
      )}
    >
      <div className="rounded-[calc(1.5rem-0.25rem)] bg-white dark:bg-[#0E1526] border border-slate-200/80 dark:border-white/5 p-4 sm:p-5 flex flex-col justify-between h-full transition-all duration-300 group-hover:border-slate-300/80 dark:group-hover:border-white/15">
        
        {/* Top Header Strip */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
            {title}
          </span>

          <div className="flex items-center gap-1.5">
            {badge && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {badge}
              </span>
            )}
            <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center border shadow-2xs shrink-0 transition-transform duration-300 group-hover:scale-110', iconBg)}>
              <Icon className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Main Number & Sparkline Row */}
        <div className="flex items-baseline justify-between gap-2 my-1">
          <div className="text-2xl sm:text-3xl font-bold font-mono-tabular text-slate-900 dark:text-white tracking-tight">
            {value}
          </div>

          {sparklineData && sparklineData.length > 1 && (
            <div className="hidden sm:block opacity-90 group-hover:opacity-100 transition-opacity">
              <MiniSparkline data={sparklineData} color={sparkColor} width={64} height={24} />
            </div>
          )}
        </div>

        {/* Bottom Subtitle / Trend Badge */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] mt-2">
          {subtitle && (
            <span className="text-slate-500 dark:text-slate-400 truncate">
              {subtitle}
            </span>
          )}

          {trend && (
            <div
              className={clsx(
                'inline-flex items-center gap-1 font-bold font-mono-tabular shrink-0',
                trend.isPositive !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {trend.isPositive !== false ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{trend.value}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
