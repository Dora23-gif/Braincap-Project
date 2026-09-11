import React from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { Globe, Calendar } from 'lucide-react';
import { FuturisticPageShell } from '../../components/common/FuturisticPageShell';
import { DoubleBezelCard } from '../../components/common/DoubleBezelCard';

export const SessionsTermsView: React.FC = () => {
  const { terms, activeSession, setActiveTerm, publishResults } = useSchoolData();

  return (
    <FuturisticPageShell
      title="ACADEMIC CALENDAR & TERMS"
      subtitle="Configure academic sessions, term resumption dates, and control terminal result publication"
      icon={Calendar}
      badgeText={`Session: ${activeSession.name}`}
      badgeVariant="cyber"
    >
      {/* Terms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {terms.map(t => {
          const isActive = t.isActive;

          return (
            <DoubleBezelCard
              key={t.id}
              hoverEffect
              innerClassName={`p-6 space-y-4 ${
                isActive
                  ? 'ring-2 ring-amber-400/40 dark:ring-amber-500/40'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="font-serif-title text-base font-bold text-slate-900 dark:text-white">{t.name}</span>
                {isActive ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 uppercase border border-emerald-200 dark:border-emerald-800">
                    Current Term
                  </span>
                ) : (
                  <button
                    onClick={() => setActiveTerm(t.id)}
                    className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 cursor-pointer"
                  >
                    Set as Active
                  </button>
                )}
              </div>

              <div className="space-y-3 py-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Opening Date:</span>
                  <span className="font-mono-tabular font-bold text-slate-800 dark:text-slate-200">{t.resumptionDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Vacation Date:</span>
                  <span className="font-mono-tabular font-bold text-slate-800 dark:text-slate-200">{t.closingDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Next Term Resumes:</span>
                  <span className="font-mono-tabular font-bold text-amber-700 dark:text-amber-400">{t.nextTermResumptionDate}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {t.isResultsPublished ? '● Portal Live' : '○ Draft Only'}
                </div>
                <button
                  onClick={() => publishResults(t.id, !t.isResultsPublished)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    t.isResultsPublished
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{t.isResultsPublished ? 'Published' : 'Unpublished'}</span>
                </button>
              </div>
            </DoubleBezelCard>
          );
        })}
      </div>
    </FuturisticPageShell>
  );
};
