import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('eis_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('eis_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('eis_theme', 'light');
    }
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={() => setIsDark(!isDark)}
      className="relative p-2.5 rounded-full border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-cyan-400 hover:border-amber-400 dark:hover:border-cyan-500/50 transition-all duration-300 shadow-xs cursor-pointer touch-target flex items-center justify-center group active:scale-95"
      title={isDark ? 'Switch to daylight canvas' : 'Switch to deep midnight obsidian'}
      aria-label="Toggle theme mode"
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Moon className="w-4 h-4 text-cyan-400 transition-all duration-500 rotate-0 scale-100 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
        ) : (
          <Sun className="w-4 h-4 text-amber-600 transition-all duration-500 rotate-0 scale-100 group-hover:rotate-45" />
        )}
      </div>
    </button>
  );
};

