import React, { useState } from 'react';
import { clsx } from 'clsx';

// ==========================================
// 1. MINI SPARKLINE (Inline for KPI cards)
// ==========================================
interface MiniSparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data,
  color = '#6366F1',
  width = 80,
  height = 28
}) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0">
      <defs>
        <linearGradient id={`sparkline-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

// ==========================================
// 2. RADIAL GAUGE (HUD Circular Meter)
// ==========================================
interface RadialGaugeProps {
  percentage: number;
  label: string;
  sublabel?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  glowColor?: string;
}

export const RadialGauge: React.FC<RadialGaugeProps> = ({
  percentage,
  label,
  sublabel,
  size = 140,
  strokeWidth = 10,
  color = '#06B6D4',
  glowColor = 'rgba(6, 182, 212, 0.4)'
}) => {
  const clamped = Math.max(0, Math.min(100, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100 dark:text-slate-800"
          />
          {/* Active progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)',
              filter: `drop-shadow(0 0 6px ${glowColor})`
            }}
          />
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl sm:text-2xl font-bold font-mono-tabular text-slate-900 dark:text-white tracking-tight">
            {clamped}%
          </span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
            {label}
          </span>
        </div>
      </div>

      {sublabel && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
          {sublabel}
        </p>
      )}
    </div>
  );
};

// ==========================================
// 3. AREA TREND CHART (Interactive SVG)
// ==========================================
interface AreaTrendChartPoint {
  label: string;
  value: number;
}

interface AreaTrendChartProps {
  data: AreaTrendChartPoint[];
  title?: string;
  height?: number;
  color?: string;
  unit?: string;
  className?: string;
}

export const AreaTrendChart: React.FC<AreaTrendChartProps> = ({
  data,
  title,
  height = 180,
  color = '#6366F1',
  unit = '%',
  className
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const width = 600;
  const paddingX = 40;
  const paddingY = 30;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const values = data.map(d => d.value);
  const minVal = Math.min(...values) * 0.9;
  const maxVal = Math.max(...values) * 1.05 || 100;

  const getY = (val: number) => {
    const norm = (val - minVal) / (maxVal - minVal || 1);
    return paddingY + chartHeight - norm * chartHeight;
  };

  const getX = (idx: number) => {
    return paddingX + (idx / (data.length - 1 || 1)) * chartWidth;
  };

  // Build SVG path with smooth cubic bezier curve
  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.value) }));
  
  let linePath = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cp1x = curr.x + (next.x - curr.x) / 2;
    const cp1y = curr.y;
    const cp2x = curr.x + (next.x - curr.x) / 2;
    const cp2y = next.y;
    linePath += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
  }

  const areaPath = `${linePath} L ${points[points.length - 1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z`;

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;
  const activeData = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className={clsx('relative flex flex-col', className)}>
      {title && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            {title}
          </span>
          {activeData && (
            <span className="text-xs font-mono-tabular font-bold text-indigo-600 dark:text-cyan-400">
              {activeData.label}: {activeData.value}{unit}
            </span>
          )}
        </div>
      )}

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((p, idx) => (
            <line
              key={idx}
              x1={paddingX}
              y1={paddingY + chartHeight * p}
              x2={width - paddingX}
              y2={paddingY + chartHeight * p}
              stroke="currentColor"
              className="text-slate-100 dark:text-slate-800"
              strokeDasharray="4 4"
            />
          ))}

          {/* Gradient Under-Fill Area */}
          <path d={areaPath} fill="url(#area-grad)" />

          {/* Smooth Trend Line */}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 4px 8px ${color}33)`
            }}
          />

          {/* Interactive points */}
          {points.map((p, idx) => (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              {/* Hit target */}
              <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
              {/* Outer halo */}
              <circle
                cx={p.x}
                cy={p.y}
                r={hoverIndex === idx ? '6' : '3.5'}
                fill={color}
                className="transition-all duration-200"
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={hoverIndex === idx ? '3' : '1.5'}
                fill="#ffffff"
              />
            </g>
          ))}

          {/* Active Vertical Cursor Line */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={paddingY}
              x2={activePoint.x}
              y2={height - paddingY}
              stroke={color}
              strokeWidth="1.5"
              strokeDasharray="3 3"
              className="pointer-events-none opacity-60"
            />
          )}

          {/* X-axis Labels */}
          {data.map((d, idx) => (
            <text
              key={idx}
              x={getX(idx)}
              y={height - 8}
              textAnchor="middle"
              className="text-[10px] font-semibold fill-slate-400 dark:fill-slate-500 uppercase tracking-wider"
            >
              {d.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
};

// ==========================================
// 4. BAR DISTRIBUTION CHART (Responsive)
// ==========================================
interface BarItem {
  label: React.ReactNode;
  value: number;
  highlight?: boolean;
  color?: string;
}

interface BarDistributionChartProps {
  data: BarItem[];
  title?: string;
  unit?: string;
  height?: number;
  className?: string;
}

export const BarDistributionChart: React.FC<BarDistributionChartProps> = ({
  data,
  title,
  unit = '%',
  height = 160,
  className
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <div className={clsx('flex flex-col space-y-3 w-full min-w-0', className)}>
      {title && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            {title}
          </span>
          {hoverIdx !== null && (
            <span className="text-xs font-mono-tabular font-bold text-cyan-600 dark:text-cyan-400">
              {data[hoverIdx].label}: {data[hoverIdx].value}{unit}
            </span>
          )}
        </div>
      )}

      <div className="w-full overflow-x-auto no-scrollbar">
        <div
          className="flex items-end gap-1.5 sm:gap-3 w-full min-w-0 pt-6 pb-2"
          style={{ height }}
        >
          {data.map((item, idx) => {
            const heightPercent = Math.max(8, Math.round((item.value / maxVal) * 100));
            const isHovered = hoverIdx === idx;

            return (
              <div
                key={idx}
                className="flex-1 min-w-0 flex flex-col items-center h-full justify-end group cursor-pointer"
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                {/* Value popover on hover */}
                <div
                  className={clsx(
                    'text-[9px] sm:text-[10px] font-mono-tabular font-bold transition-all duration-200 mb-1',
                    isHovered ? 'text-indigo-600 dark:text-cyan-400 scale-110' : 'text-slate-400 opacity-80'
                  )}
                >
                  {item.value}{unit}
                </div>

                {/* Bar column */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-xl overflow-hidden h-full flex flex-col justify-end">
                  <div
                    className={clsx(
                      'w-full rounded-t-xl transition-all duration-500',
                      item.color || (item.highlight
                        ? 'bg-gradient-to-t from-indigo-600 to-cyan-400 shadow-md shadow-cyan-500/20'
                        : 'bg-gradient-to-t from-slate-400 to-slate-300 dark:from-slate-700 dark:to-slate-600 group-hover:from-indigo-500 group-hover:to-indigo-400')
                    )}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>

                {/* Label below */}
                <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate w-full text-center mt-1.5 sm:mt-2">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
