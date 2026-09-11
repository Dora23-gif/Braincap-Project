import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchoolData } from '../../context/SchoolDataContext';
import { DEMO_USERS } from '../../data/initialMockData';
import {
  BookOpen,
  Users,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Lock,
  GraduationCap
} from 'lucide-react';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { DoubleBezelCard } from '../../components/common/DoubleBezelCard';
import { SegmentedControl, SegmentedControlOption } from '../../components/common/SegmentedControl';

export const LoginGate: React.FC = () => {
  const { login, loginAsDemoUser } = useAuth();
  const { resetToDefaultData } = useSchoolData();
  const [resetSuccess, setResetSuccess] = useState(false);
  const [loginTab, setLoginTab] = useState<'STAFF' | 'PARENT'>('STAFF');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!identifier.trim()) {
      setErrorMessage('Please enter your identifier.');
      return;
    }
    const success = login(identifier, password);
    if (!success) {
      setErrorMessage('Invalid credentials. You can use any of the quick-login demo accounts below.');
    }
  };

  const loginTabs: SegmentedControlOption<'STAFF' | 'PARENT'>[] = [
    { id: 'STAFF', label: 'Faculty & Administrative Staff', icon: BookOpen },
    { id: 'PARENT', label: 'Parent / Guardian & Ward', icon: Users }
  ];

  return (
    <div className="min-h-[100dvh] cyber-canvas flex flex-col justify-center relative overflow-hidden font-sans p-4 sm:p-6 lg:p-8">
      {/* Ambient Lighting Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 dark:bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Theme Toggle in Corner */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="max-w-5xl mx-auto w-full relative z-10">
        <DoubleBezelCard className="overflow-hidden shadow-2xl p-1.5 sm:p-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 rounded-[calc(1.5rem-0.25rem)] overflow-hidden">
            
            {/* Left Column: Prestigious School Branding */}
            <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-between bg-slate-50 dark:bg-slate-900/60 border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-white/5">
              <div>
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <img src="/crest.svg" alt="Everest Crest" className="w-12 h-14 object-contain drop-shadow-md" />
                    <div className="absolute -inset-1 bg-amber-500/20 rounded-full blur-xs -z-10" />
                  </div>
                  <div>
                    <div className="font-serif-title text-xl font-bold text-slate-900 dark:text-white tracking-wide">
                      EVEREST <span className="text-amber-600 dark:text-amber-400 font-sans text-base font-semibold">INTERNATIONAL</span>
                    </div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 font-mono tracking-wider font-semibold uppercase">
                      Excellence • Character • Leadership
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>EMIS Secure Portal</span>
                  </div>
                  <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
                    Federal Republic of Nigeria Institutional Education Information System
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Enterprise-grade academic administration, continuous assessment collation, pastoral roll call, and consolidated Family &amp; Student Command Portal.
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>NERDC 2025/2026 Dual Curriculum Compliant</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Unified Parent &amp; Ward Security Model</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Login Panel */}
            <div className="lg:col-span-7 p-6 sm:p-10 bg-white dark:bg-[#0B101E] flex flex-col justify-center">
              {/* Segmented Pill Tabs */}
              <div className="mb-5">
                <SegmentedControl
                  options={loginTabs}
                  activeId={loginTab}
                  onChange={(tab) => {
                    setLoginTab(tab);
                    setIdentifier(tab === 'STAFF' ? 'STF/2026/018' : 'parent@everest.com');
                    setErrorMessage('');
                  }}
                />
              </div>

              {loginTab === 'PARENT' && (
                <div className="text-[11px] text-amber-900 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 leading-relaxed flex items-start gap-2">
                  <span className="text-sm">💡</span>
                  <span>
                    <strong>Family &amp; Student Access:</strong> Students access their weekly timetables, registered subjects, and CA marks through their parent/guardian portal.
                  </span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {loginTab === 'STAFF' ? 'Staff Identification Number' : 'Parent Registered Email Address'}
                  </label>
                  <div className="relative">
                    <input
                      type={loginTab === 'PARENT' ? 'email' : 'text'}
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      placeholder={
                        loginTab === 'STAFF'
                          ? 'e.g. STF/2026/018'
                          : 'e.g. parent@everest.com'
                      }
                      className="touch-target w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono-tabular"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Access Password or Security PIN
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="touch-target w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono-tabular"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="touch-target w-full mt-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all duration-200 shadow-md shadow-amber-950/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <span>Enter Academic Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Quick Demo Credentials Bar for Evaluation */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Quick 1-Click Evaluation Roles
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resetToDefaultData();
                      setResetSuccess(true);
                      setTimeout(() => setResetSuccess(false), 2500);
                    }}
                    className="touch-target text-[11px] text-amber-700 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                    title="Reload default 100 records (students, staff, parents, marks)"
                  >
                    <RotateCcw className={`w-3 h-3 ${resetSuccess ? 'animate-spin' : ''}`} />
                    <span>{resetSuccess ? '✓ Dataset Reloaded!' : 'Reset 100 Records'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DEMO_USERS.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => loginAsDemoUser(u.id)}
                      className="touch-target p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-amber-50 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 text-left transition-all cursor-pointer group hover:border-amber-500/40"
                    >
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 truncate">
                        {u.name.split(' ')[0]} {u.name.split(' ')[1] || ''}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {u.activeRole.replace('_', ' ')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </DoubleBezelCard>
      </div>
    </div>
  );
};
