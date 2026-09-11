import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RoleType } from '../../types';
import { Check, ChevronDown, ShieldCheck, GraduationCap, Users, UserCheck, BookOpen } from 'lucide-react';

const ROLE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; bg: string; text: string }> = {
  SUPER_ADMIN: { label: 'Super Administrator', icon: ShieldCheck, bg: 'bg-indigo-50 dark:bg-indigo-950/60', text: 'text-indigo-700 dark:text-indigo-300' },
  PRINCIPAL: { label: 'School Principal', icon: ShieldCheck, bg: 'bg-purple-50 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300' },
  VICE_PRINCIPAL: { label: 'Vice Principal (General)', icon: ShieldCheck, bg: 'bg-sky-50 dark:bg-sky-950/60', text: 'text-sky-700 dark:text-sky-300' },
  VICE_PRINCIPAL_ACADEMICS: { label: 'VP Academics & Instruction', icon: BookOpen, bg: 'bg-cyan-50 dark:bg-cyan-950/60', text: 'text-cyan-800 dark:text-cyan-300' },
  VICE_PRINCIPAL_ADMIN: { label: 'VP Administration & Students', icon: ShieldCheck, bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-800 dark:text-rose-300' },
  EXAM_OFFICER: { label: 'Examination Officer', icon: BookOpen, bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-800 dark:text-amber-300' },
  EXAMINATION_OFFICER: { label: 'Examination Officer', icon: BookOpen, bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-800 dark:text-amber-300' },
  SUBJECT_TEACHER: { label: 'Subject Teacher', icon: BookOpen, bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300' },
  TEACHER: { label: 'Subject Teacher', icon: BookOpen, bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300' },
  FORM_MASTER: { label: 'Form Master / Class Head', icon: UserCheck, bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300' },
  ADMISSIONS_OFFICER: { label: 'Admissions Officer', icon: Users, bg: 'bg-teal-50 dark:bg-teal-950/60', text: 'text-teal-700 dark:text-teal-300' },
  STUDENT: { label: 'Student Portal', icon: GraduationCap, bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-800 dark:text-slate-200' },
  PARENT: { label: 'Parent / Guardian', icon: Users, bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-800 dark:text-amber-300' }
};

export const RoleSwitcher: React.FC = () => {
  const { user, switchActiveRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const currentMeta = ROLE_META[user.activeRole] || ROLE_META.SUBJECT_TEACHER;
  const ActiveIcon = currentMeta.icon;
  const hasMultipleRoles = user.assignedRoles.length > 1;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => hasMultipleRoles && setIsOpen(!isOpen)}
        className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 ${
          hasMultipleRoles
            ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-xs cursor-pointer'
            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 cursor-default'
        }`}
        title={hasMultipleRoles ? 'Click to switch active role' : undefined}
      >
        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${currentMeta.bg} ${currentMeta.text}`}>
          <ActiveIcon className="w-3 h-3" />
        </div>
        <span className="text-slate-900 dark:text-slate-100">{currentMeta.label}</span>
        {hasMultipleRoles && (
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-amber-600 dark:text-amber-400' : ''
            }`}
          />
        )}
      </button>

      {isOpen && hasMultipleRoles && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-900/10 dark:shadow-slate-950/40 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1">
            Active Working Role
          </div>
          {user.assignedRoles.map(role => {
            const meta = ROLE_META[role];
            const Icon = meta.icon;
            const isCurrent = role === user.activeRole;

            return (
              <button
                key={role}
                onClick={() => {
                  switchActiveRole(role);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isCurrent
                    ? 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${meta.bg} ${meta.text}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span>{meta.label}</span>
                </div>
                {isCurrent && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 stroke-[2.5]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
