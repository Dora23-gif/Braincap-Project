import React, { useState, useRef, useEffect } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import { ExcelImportExportModal } from './ExcelImportExportModal';
import { ScoreOverrideModal } from './ScoreOverrideModal';
import { evaluateGrade } from '../../lib/gradeCalculator';
import type { GradeLetter, SubjectScore } from '../../types';
import {
  FileSpreadsheet,
  Lock,
  Unlock,
  AlertCircle,
  HelpCircle,
  SlidersHorizontal,
  ShieldAlert,
  Send,
  CheckCircle2,
  Check
} from 'lucide-react';
import { FuturisticPageShell } from '../../components/common/FuturisticPageShell';
import { DoubleBezelCard } from '../../components/common/DoubleBezelCard';
import { ModalPortal } from '../../components/common/ModalPortal';

export const ScoreEntryGridView: React.FC = () => {
  const {
    classArms,
    subjects,
    students,
    scores,
    activeTerm,
    updateScore,
    bulkSaveScores,
    toggleGradeLock,
    overrideScore,
    subjectSubmissions,
    submitSubjectMarksheet,
    allocations
  } = useSchoolData();

  const { user } = useAuth();
  const isSubjectTeacher = user?.activeRole === 'SUBJECT_TEACHER' || user?.activeRole === 'TEACHER';
  
  // Resolve allocations dynamically from context or user session
  const dynamicAllocations = allocations.filter(
    a => a.teacherId === user?.id || a.teacherId === user?.staffId || (a.teacherName && user?.name && a.teacherName.toLowerCase() === user.name.toLowerCase())
  );
  const teacherAllocations = isSubjectTeacher
    ? (dynamicAllocations.length > 0 ? dynamicAllocations : (user?.allocatedSubjects || []))
    : [];

  // Scoped class arms for subject teachers vs school-wide administrators
  const allowedClassArms = isSubjectTeacher
    ? classArms.filter(a => teacherAllocations.some(alloc => alloc.classArmId === a.id))
    : classArms;

  // Pick default class and subject
  const defaultClassArm = allowedClassArms[0] || classArms[0];
  const defaultSubject = subjects.find(s => s.id === 'subj-phy') || subjects[0];

  const [selectedArmId, setSelectedArmId] = useState<string>(
    teacherAllocations[0]?.classArmId || defaultClassArm.id
  );

  // Scoped subjects for currently selected arm
  const allowedSubjects = isSubjectTeacher
    ? subjects.filter(s => teacherAllocations.some(alloc => alloc.classArmId === selectedArmId && alloc.subjectId === s.id))
    : subjects;

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    teacherAllocations.find(a => a.classArmId === selectedArmId)?.subjectId || allowedSubjects[0]?.id || defaultSubject.id
  );

  // Sync selectedSubjectId if selectedArmId changes or if selectedSubjectId is not allowed
  useEffect(() => {
    if (allowedSubjects.length > 0 && !allowedSubjects.some(s => s.id === selectedSubjectId)) {
      setSelectedSubjectId(allowedSubjects[0].id);
    }
  }, [selectedArmId, allowedSubjects, selectedSubjectId]);

  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitComment, setSubmitComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState<{
    score: SubjectScore;
    studentName: string;
    admissionNumber: string;
  } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED'>('SAVED');
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

  // Selected arm & subject models
  const currentArm = classArms.find(a => a.id === selectedArmId) || defaultClassArm;
  const currentSubject = subjects.find(s => s.id === selectedSubjectId) || defaultSubject;

  // Filter students belonging to this arm who are strictly registered for this subject
  const armStudents = students.filter(s => {
    if (s.currentClassArmId !== selectedArmId) return false;
    // Strict enrollment verification: student MUST offer this subject
    return Array.isArray(s.registeredSubjectIds) && s.registeredSubjectIds.includes(selectedSubjectId);
  });

  // Is this grade sheet locked by exam officer?
  const existingSheetScores = scores.filter(
    s => s.classArmId === selectedArmId && s.subjectId === selectedSubjectId && s.termId === activeTerm.id
  );
  const isSheetLocked = existingSheetScores.length > 0 && existingSheetScores.every(s => s.isLocked);

  // Store matrix inputs refs for arrow navigation: key = `${studentIndex}_${fieldIndex}`
  // fieldIndex: 0 = ca1, 1 = ca2, 2 = assignment, 3 = project, 4 = exam
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    let nextRow = rowIndex;
    let nextCol = colIndex;

    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      nextRow = Math.min(rowIndex + 1, armStudents.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextRow = Math.max(rowIndex - 1, 0);
    } else if (e.key === 'ArrowRight' && (e.target as HTMLInputElement).selectionEnd === (e.target as HTMLInputElement).value.length) {
      nextCol = Math.min(colIndex + 1, 4);
    } else if (e.key === 'ArrowLeft' && (e.target as HTMLInputElement).selectionStart === 0) {
      nextCol = Math.max(colIndex - 1, 0);
    } else {
      return;
    }

    const nextKey = `${nextRow}_${nextCol}`;
    const nextInput = inputRefs.current.get(nextKey);
    if (nextInput) {
      nextInput.focus();
      nextInput.select();
    }
  };

  const handleScoreChange = (
    scoreId: string,
    field: 'ca1' | 'ca2' | 'assignment' | 'project' | 'exam',
    rawVal: string
  ) => {
    const max = field === 'exam' ? 60 : 10;
    const num = rawVal === '' ? 0 : parseFloat(rawVal);

    if (isNaN(num)) return;

    if (num > max) {
      setValidationWarning(`Invalid entry: ${field.toUpperCase()} cannot exceed ${max}`);
      return;
    } else {
      setValidationWarning(null);
    }

    setSaveStatus('SAVING');
    updateScore(scoreId, { [field]: num });

    setTimeout(() => {
      setSaveStatus('SAVED');
    }, 400);
  };

  // Compute live class statistics
  const currentScoresList = armStudents.map(s => {
    return (
      scores.find(
        sc => sc.studentId === s.id && sc.subjectId === selectedSubjectId && sc.termId === activeTerm.id
      ) || {
        id: `sc-temp-${s.id}`,
        studentId: s.id,
        studentName: `${s.firstName} ${s.lastName}`,
        admissionNumber: s.admissionNumber,
        classArmId: selectedArmId,
        subjectId: selectedSubjectId,
        termId: activeTerm.id,
        ca1: 0,
        ca2: 0,
        assignment: 0,
        project: 0,
        exam: 0,
        total: 0,
        grade: 'F' as GradeLetter,
        remark: 'Fail',
        isLocked: false,
        updatedAt: new Date().toISOString()
      }
    );
  });

  const totals = currentScoresList.map(s => s.total);
  const classAvg = totals.length > 0 ? (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1) : '0';
  const highestTotal = totals.length > 0 ? Math.max(...totals) : 0;
  const lowestTotal = totals.length > 0 ? Math.min(...totals) : 0;
  const passCount = totals.filter(t => t >= 45).length;
  const passRate = totals.length > 0 ? ((passCount / totals.length) * 100).toFixed(0) : '0';

  const canLockGrades = user?.activeRole === 'SUPER_ADMIN' || user?.activeRole === 'PRINCIPAL' || user?.activeRole === 'EXAM_OFFICER';

  const currentSubmission = subjectSubmissions?.find(
    sub => sub.classArmId === selectedArmId && sub.subjectId === selectedSubjectId && sub.termId === activeTerm.id
  );
  const isSubmitted = currentSubmission?.status === 'SUBMITTED' || currentSubmission?.status === 'MODERATED';
  const isInputDisabled = isSheetLocked || (isSubjectTeacher && isSubmitted);

  return (
    <FuturisticPageShell
      title="CONTINUOUS ASSESSMENT & SCORE ENTRY MATRIX"
      subtitle={`High-speed keyboard continuous assessment matrix (CA1 10%, CA2 10%, Assignment 10%, Project 10%, Exam 60%) for ${currentArm.fullName} - ${currentSubject.name}.`}
      icon={FileSpreadsheet}
      badgeText={isSheetLocked ? 'Grade Sheet Locked' : isSubmitted ? 'Marksheet Submitted' : 'Entry Active'}
      badgeVariant={isSheetLocked ? 'warning' : isSubmitted ? 'success' : 'info'}
      actions={
        <div className="flex flex-wrap items-center gap-2.5">
          {isSubjectTeacher && (
            isSubmitted ? (
              <div className="touch-target px-3.5 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Sheet Submitted {currentSubmission?.submittedAt ? `(${new Date(currentSubmission.submittedAt).toLocaleDateString()})` : ''}</span>
              </div>
            ) : (
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="touch-target px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit to Form Master</span>
              </button>
            )
          )}

          {canLockGrades && (
            <button
              onClick={() => toggleGradeLock(selectedArmId, selectedSubjectId)}
              className={`touch-target px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isSheetLocked
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
              }`}
            >
              {isSheetLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{isSheetLocked ? 'Sheet Locked' : 'Sheet Open'}</span>
            </button>
          )}

          <button
            onClick={() => setIsExcelModalOpen(true)}
            className="touch-target px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500" />
            <span>Excel Offline</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700">
            <span className={`w-2 h-2 rounded-full ${saveStatus === 'SAVING' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span>{saveStatus === 'SAVING' ? 'Saving...' : 'Auto-Saved'}</span>
          </div>
        </div>
      }
    >
      {/* Top Selector Card */}
      <DoubleBezelCard>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                {isSubjectTeacher ? 'Assigned Class Cohort' : 'Class Cohort'}
              </label>
              <select
                value={selectedArmId}
                onChange={e => setSelectedArmId(e.target.value)}
                className="touch-target px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {allowedClassArms.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                {isSubjectTeacher ? 'Your Teaching Subject' : 'Assigned Subject'}
              </label>
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="touch-target px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {allowedSubjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total registered candidates: <strong className="text-slate-900 dark:text-white font-mono">{armStudents.length}</strong>
          </div>
        </div>
      </DoubleBezelCard>

      {/* Validation Warning Alert */}
      {validationWarning && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationWarning}</span>
        </div>
      )}

      {/* Main Keyboard Grid Table */}
      <DoubleBezelCard innerClassName="p-0 overflow-hidden">
        <div className="p-4 bg-slate-50/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{currentArm.fullName}</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="text-amber-800 dark:text-amber-400">{currentSubject.name}</span>
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Continuous Assessment (40%) + Terminal Exam (60%) = Total (100%)
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Use Arrow Keys &amp; Enter for keyboard-only input</span>
          </div>
        </div>

        {/* Mobile Horizontal Scroll Cue */}
        <div className="sm:hidden px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-medium flex items-center justify-between">
          <span>↔ Swipe horizontally to view assessment columns</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 pl-3 pr-1 w-8 text-center">#</th>
                <th className="py-3 pl-1 pr-2 min-w-[180px]">Student Name</th>
                <th className="py-3 px-2 w-24 text-center">Adm. No</th>
                <th className="py-3 px-2 w-20 text-center bg-amber-50/40 border-l border-r border-slate-200">
                  CA 1 (10)
                </th>
                <th className="py-3 px-2 w-20 text-center bg-amber-50/40 border-r border-slate-200">
                  CA 2 (10)
                </th>
                <th className="py-3 px-2 w-24 text-center bg-amber-50/40 border-r border-slate-200">
                  Assg (10)
                </th>
                <th className="py-3 px-2 w-24 text-center bg-amber-50/40 border-r border-slate-200">
                  Proj (10)
                </th>
                <th className="py-3 px-2 w-24 text-center bg-blue-50/40 border-r border-slate-200">
                  Exam (60)
                </th>
                <th className="py-3 px-3 w-20 text-center bg-slate-50">Total</th>
                <th className="py-3 px-3 w-16 text-center">Grade</th>
                <th className="py-3 px-4 min-w-[100px]">WAEC Remark</th>
                <th className="py-3 px-4 min-w-[220px]">Pedagogical Feedback</th>
                {user?.activeRole === 'SUPER_ADMIN' && (
                  <th className="py-3 px-3 text-right w-24">Admin</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {armStudents.length === 0 ? (
                <tr>
                  <td colSpan={user?.activeRole === 'SUPER_ADMIN' ? 13 : 12} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <p className="text-sm font-semibold">No students offering {currentSubject.name} in {currentArm.fullName}</p>
                    <p className="text-xs mt-1">Only candidates with registered subject enrollments appear on this marksheet.</p>
                  </td>
                </tr>
              ) : (
                armStudents.map((student, rIdx) => {
                const score = currentScoresList[rIdx];
                const gradeInfo = evaluateGrade(score.total);

                return (
                  <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 pl-3 pr-1 text-center text-slate-400 font-mono-tabular">
                      {rIdx + 1}
                    </td>
                    <td className="py-2.5 pl-1 pr-2 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <img
                          src={student.passportPhotoUrl}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <span className="truncate">
                          {student.lastName}, {student.firstName}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono-tabular text-slate-500 dark:text-slate-400 text-[11px]">
                      {student.admissionNumber}
                    </td>

                    {/* CA 1 Input (Max 10) */}
                    <td className="py-1 px-1 text-center bg-amber-50/10 dark:bg-amber-950/20 border-l border-r border-slate-200/60 dark:border-slate-800">
                      <input
                        ref={el => { if (el) inputRefs.current.set(`${rIdx}_0`, el); }}
                        disabled={isInputDisabled}
                        type="number"
                        min="0"
                        max="10"
                        value={score.ca1 || ''}
                        onChange={e => handleScoreChange(score.id, 'ca1', e.target.value)}
                        onKeyDown={e => handleKeyDown(e, rIdx, 0)}
                        className={`w-full py-1.5 text-center font-mono-tabular font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 text-xs ${
                          score.ca1 > 10 ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-200' : 'bg-transparent text-slate-800 dark:text-slate-100'
                        }`}
                      />
                    </td>

                    {/* CA 2 Input (Max 10) */}
                    <td className="py-1 px-1 text-center bg-amber-50/10 dark:bg-amber-950/20 border-r border-slate-200/60 dark:border-slate-800">
                      <input
                        ref={el => { if (el) inputRefs.current.set(`${rIdx}_1`, el); }}
                        disabled={isInputDisabled}
                        type="number"
                        min="0"
                        max="10"
                        value={score.ca2 || ''}
                        onChange={e => handleScoreChange(score.id, 'ca2', e.target.value)}
                        onKeyDown={e => handleKeyDown(e, rIdx, 1)}
                        className={`w-full py-1.5 text-center font-mono-tabular font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 text-xs ${
                          score.ca2 > 10 ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-200' : 'bg-transparent text-slate-800 dark:text-slate-100'
                        }`}
                      />
                    </td>

                    {/* Assignment Input (Max 10) */}
                    <td className="py-1 px-1 text-center bg-amber-50/10 dark:bg-amber-950/20 border-r border-slate-200/60 dark:border-slate-800">
                      <input
                        ref={el => { if (el) inputRefs.current.set(`${rIdx}_2`, el)} }
                        disabled={isInputDisabled}
                        type="number"
                        min="0"
                        max="10"
                        value={score.assignment || ''}
                        onChange={e => handleScoreChange(score.id, 'assignment', e.target.value)}
                        onKeyDown={e => handleKeyDown(e, rIdx, 2)}
                        className={`w-full py-1.5 text-center font-mono-tabular font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 text-xs ${
                          score.assignment > 10 ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-200' : 'bg-transparent text-slate-800 dark:text-slate-100'
                        }`}
                      />
                    </td>

                    {/* Project Input (Max 10) */}
                    <td className="py-1 px-1 text-center bg-amber-50/10 dark:bg-amber-950/20 border-r border-slate-200/60 dark:border-slate-800">
                      <input
                        ref={el => { if (el) inputRefs.current.set(`${rIdx}_3`, el); }}
                        disabled={isInputDisabled}
                        type="number"
                        min="0"
                        max="10"
                        value={score.project || ''}
                        onChange={e => handleScoreChange(score.id, 'project', e.target.value)}
                        onKeyDown={e => handleKeyDown(e, rIdx, 3)}
                        className={`w-full py-1.5 text-center font-mono-tabular font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 text-xs ${
                          score.project > 10 ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-200' : 'bg-transparent text-slate-800 dark:text-slate-100'
                        }`}
                      />
                    </td>

                    {/* Terminal Exam Input (Max 60) */}
                    <td className="py-1 px-1 text-center bg-blue-50/20 dark:bg-blue-950/20 border-r border-slate-200/60 dark:border-slate-800">
                      <input
                        ref={el => { if (el) inputRefs.current.set(`${rIdx}_4`, el); }}
                        disabled={isInputDisabled}
                        type="number"
                        min="0"
                        max="60"
                        value={score.exam || ''}
                        onChange={e => handleScoreChange(score.id, 'exam', e.target.value)}
                        onKeyDown={e => handleKeyDown(e, rIdx, 4)}
                        className={`w-full py-1.5 text-center font-mono-tabular font-extrabold rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 text-xs ${
                          score.exam > 60 ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-200' : 'bg-transparent text-blue-900 dark:text-blue-200'
                        }`}
                      />
                    </td>

                    {/* Computed Total (100) with [OV] Badge */}
                    <td className="py-2.5 px-3 text-center font-mono-tabular font-bold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/50">
                      <div className="flex items-center justify-center gap-1">
                        <span>{score.total}</span>
                        {score.isOverridden && (
                          <span
                            className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 cursor-help"
                            title={`OVERRIDDEN by ${score.overriddenBy || 'Admin'}\nReason: ${score.overrideReason}\nTicket #${score.overrideTicketId || 'N/A'}\nPrevious Score: ${score.previousScore?.total ?? 'N/A'}`}
                          >
                            [OV]
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Letter Grade */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-black border ${gradeInfo.badgeClass}`}>
                        {score.grade}
                      </span>
                    </td>

                    {/* Remark */}
                    <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                      {score.remark}
                    </td>

                    {/* Teacher Feedback / Pedagogical Remark */}
                    <td className="py-1 px-3">
                      <input
                        disabled={isInputDisabled}
                        type="text"
                        placeholder="Pedagogical remark..."
                        value={score.teacherRemark || ''}
                        onChange={e => {
                          setSaveStatus('SAVING');
                          updateScore(score.id, { teacherRemark: e.target.value });
                          setTimeout(() => setSaveStatus('SAVED'), 400);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </td>

                    {/* Super Admin Override Trigger */}
                    {user?.activeRole === 'SUPER_ADMIN' && (
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setOverrideTarget({
                            score,
                            studentName: `${student.lastName}, ${student.firstName}`,
                            admissionNumber: student.admissionNumber
                          })}
                          title="Administrative Score Override"
                          className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          <span>Override</span>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        {/* Real-time Statistics Summary Bar */}
        <div className="p-4 bg-slate-900 text-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Class Performance Summary</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-mono-tabular">
            <div>
              <span className="text-slate-400 mr-2">Average:</span>
              <span className="font-bold text-white">{classAvg}%</span>
            </div>
            <div>
              <span className="text-slate-400 mr-2">Highest:</span>
              <span className="font-bold text-emerald-400">{highestTotal}%</span>
            </div>
            <div>
              <span className="text-slate-400 mr-2">Lowest:</span>
              <span className="font-bold text-rose-400">{lowestTotal}%</span>
            </div>
            <div>
              <span className="text-slate-400 mr-2">Pass Rate:</span>
              <span className="font-bold text-amber-300">{passRate}%</span>
            </div>
          </div>
        </div>
      </DoubleBezelCard>

      {/* Excel Round-Trip Modal */}
      <ExcelImportExportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        classArmName={currentArm.fullName}
        classArmId={selectedArmId}
        subjectName={currentSubject.name}
        subjectId={selectedSubjectId}
        termName={activeTerm.name}
        students={armStudents}
        currentScores={currentScoresList}
        onImportSuccess={imported => {
          bulkSaveScores(selectedArmId, selectedSubjectId, imported);
        }}
      />

      {/* Super Admin Score Override Modal */}
      {overrideTarget && (
        <ScoreOverrideModal
          isOpen={!!overrideTarget}
          scoreRecord={overrideTarget.score}
          studentName={overrideTarget.studentName}
          admissionNumber={overrideTarget.admissionNumber}
          subjectName={currentSubject.name}
          onClose={() => setOverrideTarget(null)}
          onSave={(newScores, reason, ticketId) => {
            overrideScore({
              scoreId: overrideTarget.score.id,
              newScores,
              reason,
              ticketId,
              adminUser: {
                id: user?.id || 'stf-001',
                name: user?.name || 'Dr. Kenneth Balogun',
                role: user?.activeRole || 'SUPER_ADMIN'
              }
            });
            setOverrideTarget(null);
          }}
        />
      )}

      {/* Subject Teacher Mark Sheet Submission Modal */}
      <ModalPortal isOpen={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)}>
        <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Submit Mark Sheet to Form Master
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formally sign off and transfer scores for broadsheet compilation and exam moderation.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Class Arm:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{currentArm.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Subject:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{currentSubject.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Graded Enrollees:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {currentScoresList.filter(s => s.total > 0).length} / {armStudents.length} Students
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Class Average:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{classAvg}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pass Rate:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{passRate}%</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Subject Teacher General Note / Feedback for Form Master (Optional)
            </label>
            <textarea
              value={submitComment}
              onChange={e => setSubmitComment(e.target.value)}
              rows={3}
              placeholder="e.g., Syllabus completed in full. Practical exam was conducted in physics laboratory with standard apparatus..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setIsSubmitting(true);
                submitSubjectMarksheet(
                  selectedArmId,
                  selectedSubjectId,
                  submitComment,
                  {
                    id: user?.id || 'STF/2026/018',
                    name: user?.name || 'Dr. Michael Adebayo',
                    role: 'SUBJECT_TEACHER'
                  }
                );
                setIsSubmitting(false);
                setIsSubmitModalOpen(false);
                setSubmitComment('');
              }}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting...' : 'Certify & Transmit'}</span>
            </button>
          </div>
        </div>
      </ModalPortal>
    </FuturisticPageShell>
  );
};
