import React, { useState } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import type { Student, Subject } from '../../types';
import {
  X,
  Lock,
  Check,
  AlertTriangle,
  BookOpen,
  Award,
  Trash2,
  Info,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { ModalPortal } from '../../components/common/ModalPortal';

interface SubjectSelectionModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
}

export const SubjectSelectionModal: React.FC<SubjectSelectionModalProps> = ({
  student,
  isOpen,
  onClose
}) => {
  const { subjects, updateStudentSubjects, dropStudentSubject } = useSchoolData();

  if (!isOpen) return null;

  // Determine class level and target requirement
  const isJunior = student.currentClassArmName.includes('JSS');
  const isSS1 = student.currentClassArmName.includes('SSS 1');
  const isSS2 = student.currentClassArmName.includes('SSS 2');
  const isSS3 = student.currentClassArmName.includes('SSS 3');

  const requiredCount = isJunior ? 13 : isSS1 ? 12 : isSS2 ? 11 : isSS3 ? 9 : 12;
  const currentLevelLabel: 'JSS' | 'SSS 1' | 'SSS 2' | 'SSS 3' = isJunior ? 'JSS' : isSS1 ? 'SSS 1' : isSS2 ? 'SSS 2' : 'SSS 3';

  const defaultJssSubjects = [
    'subj-eng', 'subj-mth', 'subj-igb', 'subj-bsc', 'subj-phe', 'subj-btech',
    'subj-his', 'subj-scs', 'subj-cca', 'subj-bus', 'subj-agr', 'subj-crs', 'subj-frn'
  ];

  // Current registered subject IDs
  const [selectedIds, setSelectedIds] = useState<string[]>(
    student.registeredSubjectIds && student.registeredSubjectIds.length > 0
      ? student.registeredSubjectIds
      : isJunior
      ? defaultJssSubjects
      : [
          'subj-mth', 'subj-eng', 'subj-phy', 'subj-che', 'subj-bio', 'subj-civ', 'subj-his',
          'subj-yor', 'subj-dp', 'subj-cmp', 'subj-agr', 'subj-fmth'
        ]
  );

  const [dropCandidate, setDropCandidate] = useState<Subject | null>(null);
  const [dropReason, setDropReason] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Group subjects
  const jssMandatorySubjects = subjects.filter(s => s.isCompulsoryJunior);
  const coreSubjects = subjects.filter(s => s.isCompulsorySeniorScience);
  const languageSubjects = subjects.filter(s => s.group === 'LANGUAGE' && s.applicableTo !== 'JUNIOR');
  const tradeSubjects = subjects.filter(s => s.group === 'TRADE');
  const electiveSubjects = subjects.filter(s => s.group === 'GENERAL_ELECTIVE');

  // Selected language & trade
  const selectedLanguage = languageSubjects.find(s => selectedIds.includes(s.id));
  const selectedTrade = tradeSubjects.find(s => selectedIds.includes(s.id));

  // Language selection handler (mutually exclusive)
  const handleSelectLanguage = (langId: string) => {
    setSelectedIds(prev => {
      // Remove any previously selected language
      const filtered = prev.filter(id => !languageSubjects.some(l => l.id === id));
      return [...filtered, langId];
    });
  };

  // Trade selection handler (mutually exclusive)
  const handleSelectTrade = (tradeId: string) => {
    setSelectedIds(prev => {
      // Remove any previously selected trade
      const filtered = prev.filter(id => !tradeSubjects.some(t => t.id === id));
      return [...filtered, tradeId];
    });
  };

  // Elective toggle handler
  const handleToggleElective = (subjId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(subjId)) {
        return prev.filter(id => id !== subjId);
      } else {
        return [...prev, subjId];
      }
    });
  };

  // Handle formal drop (for SS2 and SS3 progressive drops)
  const handleConfirmDrop = () => {
    if (!dropCandidate) return;
    dropStudentSubject(
      student.id,
      dropCandidate.id,
      currentLevelLabel as 'SSS 2' | 'SSS 3',
      dropReason || `Elective dropped for ${currentLevelLabel} curriculum specialization`
    );
    setSelectedIds(prev => prev.filter(id => id !== dropCandidate.id));
    setDropCandidate(null);
    setDropReason('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSave = () => {
    updateStudentSubjects(student.id, selectedIds);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  const currentCount = selectedIds.length;
  const isCountExact = currentCount === requiredCount;
  const countDiff = currentCount - requiredCount;

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Manage Curriculum &amp; Subject Registration</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                  {student.currentClassArmName}
                </span>
              </h2>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {student.lastName}, {student.firstName} • <span className="font-mono">{student.admissionNumber}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Requirements Notification Bar */}
        <div className="px-6 py-3 bg-amber-500/10 dark:bg-amber-950/30 border-b border-amber-200/50 dark:border-amber-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              {isJunior ? (
                <>Universal Basic Education (UBE) Policy: <strong>13 Mandatory Subjects</strong> (All Compulsory • Non-Droppable)</>
              ) : (
                <>{currentLevelLabel} Rule: <strong>{requiredCount} subjects total</strong> (7 Core + 1 Language + 1 Trade + {requiredCount - 9} Electives)</>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                isCountExact
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
              }`}
            >
              {currentCount} / {requiredCount} Selected
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {isJunior ? (
            /* Junior Secondary 13 Mandatory Subjects View */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <div className="font-bold text-xs">National Universal Basic Education (UBE) Policy</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Under Nigerian Federal Ministry of Education policy, all 13 subjects below are compulsory for all Junior Secondary School (JSS 1, JSS 2, and JSS 3) students. No subjects can be dropped until students advance to Senior Secondary (SSS 1).
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Mandatory Junior Secondary Curriculum (13 of 13 Required)</span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">100% Enrolled</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {jssMandatorySubjects.map(subj => (
                    <div
                      key={subj.id}
                      className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 flex items-center justify-between shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">{subj.name}</div>
                          <div className="text-[10px] font-mono text-slate-400 font-semibold">{subj.code} • {subj.category}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20">
                        Mandatory
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Validation Banner if wrong count */}
              {!isCountExact && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-amber-900 dark:text-amber-200">
                    {countDiff > 0 ? (
                      <span>
                        You have selected <strong>{countDiff} extra subject{countDiff > 1 ? 's' : ''}</strong>. Please drop {countDiff} elective{countDiff > 1 ? 's' : ''} to satisfy the {currentLevelLabel} maximum of {requiredCount}.
                      </span>
                    ) : (
                      <span>
                        You need to select <strong>{Math.abs(countDiff)} more subject{Math.abs(countDiff) > 1 ? 's' : ''}</strong> to complete the {currentLevelLabel} requirement of {requiredCount}.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Section 1: 7 Locked Compulsory Core Subjects */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>1. Compulsory Core Subjects (7 Required • Permanent)</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">Locked by MOE/WAEC</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {coreSubjects.map(subj => (
                    <div
                      key={subj.id}
                      className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between opacity-85 select-none"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{subj.name}</span>
                          <span className="ml-1.5 text-[10px] font-mono text-slate-400 font-semibold">({subj.code})</span>
                        </div>
                      </div>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Nigerian Languages (Strictly Max 1) */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>2. Nigerian Language (Strictly 1 Only)</span>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    {selectedLanguage ? `Selected: ${selectedLanguage.name}` : 'None chosen'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {languageSubjects.map(subj => {
                    const isSelected = selectedIds.includes(subj.id);
                    return (
                      <button
                        key={subj.id}
                        type="button"
                        onClick={() => handleSelectLanguage(subj.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 dark:border-amber-500/80 shadow-xs'
                            : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{subj.name}</span>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-amber-600 bg-amber-600 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 mt-1">{subj.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Trade / Entrepreneurship Subject (Strictly Max 1) */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>3. Trade / Vocational Curriculum (Strictly 1 Only)</span>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    {selectedTrade ? `Selected: ${selectedTrade.name}` : 'None chosen'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {tradeSubjects.map(subj => {
                    const isSelected = selectedIds.includes(subj.id);
                    return (
                      <button
                        key={subj.id}
                        type="button"
                        onClick={() => handleSelectTrade(subj.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 dark:border-amber-500/80 shadow-xs'
                            : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{subj.name}</span>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-amber-600 bg-amber-600 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 mt-1">{subj.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 4: General Electives */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                    4. General Electives ({requiredCount - 9} Needed)
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {electiveSubjects.filter(s => selectedIds.includes(s.id)).length} selected
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {electiveSubjects.map(subj => {
                    const isSelected = selectedIds.includes(subj.id);
                    return (
                      <div
                        key={subj.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/60'
                            : 'bg-white dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/60'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleElective(subj.id)}
                            className="rounded border-slate-300 dark:border-slate-600 text-amber-600 focus:ring-amber-500"
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100">{subj.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">{subj.code}</div>
                          </div>
                        </label>

                        {/* Quick drop button for SS2/SS3 if registered */}
                        {(isSS2 || isSS3) && isSelected && (
                          <button
                            type="button"
                            onClick={() => setDropCandidate(subj)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title={`Drop ${subj.name} for ${currentLevelLabel}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Dropped Subjects Audit History */}
          {student.droppedSubjects && student.droppedSubjects.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                Archived Dropped Subjects
              </div>
              <div className="space-y-1">
                {student.droppedSubjects.map((d, i) => {
                  const s = subjects.find(sub => sub.id === d.subjectId);
                  return (
                    <div key={i} className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>• {s ? s.name : d.subjectName || d.subjectId} (Dropped at {d.level})</span>
                      <span className="font-mono text-[10px]">{d.date}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {saveSuccess ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Changes saved successfully!
              </span>
            ) : (
              <span>Review subject totals before confirming.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!isCountExact}
              onClick={handleSave}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                isCountExact
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirm Registration ({currentCount}/{requiredCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Sub-Modal for Dropping a Subject */}
      {dropCandidate && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 bg-rose-100 dark:bg-rose-950/60 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Confirm Subject Drop
                </h3>
                <div className="text-[11px] text-slate-500">
                  Dropping for {currentLevelLabel} curriculum specialization
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to drop <strong>{dropCandidate.name} ({dropCandidate.code})</strong> for{' '}
              <strong>{student.firstName} {student.lastName}</strong>? This subject will be removed from active terminal scorecards and added to the student's curriculum audit history.
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason / Note (Optional)
              </label>
              <input
                type="text"
                value={dropReason}
                onChange={e => setDropReason(e.target.value)}
                placeholder="e.g. Specializing in engineering electives"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDropCandidate(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDrop}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Confirm Drop
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalPortal>
  );
};