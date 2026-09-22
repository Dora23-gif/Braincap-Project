import React, { useState, useMemo } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import { formatOrdinal } from '../../lib/gradeCalculator';
import { Printer, Lock, Clock, AlertTriangle, ShieldAlert, BookOpen } from 'lucide-react';
import { resolveArmId } from '../../lib/api';

interface PrintableReportCardProps {
  initialStudentId?: string;
}

export const PrintableReportCard: React.FC<PrintableReportCardProps> = ({ initialStudentId }) => {
  const { students, parents, subjects, getStudentDossier, activeTerm, schoolSettings, getWardFeeClearance, allocations } = useSchoolData();
  const { user } = useAuth();

  const isSubjectTeacherOnly = user?.activeRole === 'SUBJECT_TEACHER' || user?.activeRole === 'TEACHER';
  const isParent = user?.activeRole === 'PARENT' || user?.activeRole === 'STUDENT';
  const isFormMaster = user?.activeRole === 'FORM_MASTER';

  // Strict purview scoping for Parents (only their own enrolled wards)
  const parentWards = useMemo(() => {
    if (!isParent || !user) return [];

    const userEmail = (user.email || '').trim().toLowerCase();
    const userCleanId = String(user.id || '').replace(/^prt-/, '').trim();
    const userParentCleanId = String(user.parentId || '').replace(/^prt-/, '').trim();
    const sessionWardIds = new Set((user.wardIds || []).map(id => String(id).trim()));

    // Look up parent record in parents collection if available
    const matchedParent = (parents || []).find(p => {
      const pEmail = (p.email || '').trim().toLowerCase();
      const pCleanId = String(p.id || '').replace(/^prt-/, '').trim();
      return (
        (userEmail && pEmail && pEmail === userEmail) ||
        (userCleanId && pCleanId === userCleanId) ||
        (userParentCleanId && pCleanId === userParentCleanId)
      );
    });

    const contextWardIds = new Set((matchedParent?.wardIds || []).map(id => String(id).trim()));

    return students.filter(s => {
      // 1. Direct denormalized parent_email match
      if (userEmail && s.parentEmail && s.parentEmail.trim().toLowerCase() === userEmail) {
        return true;
      }

      // 2. Direct parentId match (clean ID comparison)
      if (s.parentId) {
        const studentParentCleanId = String(s.parentId).replace(/^prt-/, '').trim();
        if (userParentCleanId && studentParentCleanId === userParentCleanId) {
          return true;
        }
        if (userCleanId && studentParentCleanId === userCleanId) {
          return true;
        }
      }

      // 3. User session wardIds (from backend /accounts/me/ or /login/)
      if (sessionWardIds.has(String(s.id).trim()) || sessionWardIds.has(String(s.admissionNumber).trim())) {
        return true;
      }

      // 4. Context parents ward list
      if (contextWardIds.has(String(s.id).trim()) || contextWardIds.has(String(s.admissionNumber).trim())) {
        return true;
      }

      return false;
    });
  }, [isParent, user, students, parents]);

  // Form Master students
  const formMasterStudents = useMemo(() => {
    if (!isFormMaster) return [];
    const directStudents = user?.formMasterArmId
      ? students.filter(s => s.currentClassArmId === user.formMasterArmId)
      : [];
    return directStudents.length > 0 ? directStudents : students.slice(0, 10);
  }, [isFormMaster, user, students]);

  // Subject Teacher's allocated students across their assigned class arms
  const teacherArmIds = useMemo(() => {
    if (!isSubjectTeacherOnly) return [];
    const isTeacherMatch = (a: any) => {
      if (!user) return false;
      const uId = String(user.id || '').trim();
      const aId = String(a.teacherId || '').trim();
      if (aId && uId && aId === uId) return true;
      if (user.staffId && aId && aId === String(user.staffId).trim()) return true;
      if ((user as any).identifier && aId && aId === String((user as any).identifier).trim()) return true;
      if (user.staffId && aId && aId.replace(/[^0-9]/g, '') !== '' && aId.replace(/[^0-9]/g, '') === user.staffId.replace(/[^0-9]/g, '')) return true;
      if (a.teacherName && user.name) {
        const cleanA = a.teacherName.toLowerCase().replace(/^(mr\.|mrs\.|ms\.|dr\.|prof\.|engr\.)\s*/, '').trim();
        const cleanU = user.name.toLowerCase().replace(/^(mr\.|mrs\.|ms\.|dr\.|prof\.|engr\.)\s*/, '').trim();
        if (cleanA && cleanU && (cleanA === cleanU || cleanA.includes(cleanU) || cleanU.includes(cleanA))) return true;
      }
      return false;
    };

    const myAllocs = (allocations || []).filter(isTeacherMatch);
    const source = myAllocs.length > 0 ? myAllocs : (user?.allocatedSubjects || []);
    const armIds = source.map((a: any) => resolveArmId(a.classArmId || a.class_arm || a.class_arm_id, a.classArmName || a.class_arm_name)).filter(Boolean);
    return Array.from(new Set(armIds));
  }, [allocations, user, isSubjectTeacherOnly]);

  const teacherStudents = useMemo(() => {
    if (!isSubjectTeacherOnly) return [];
    const direct = teacherArmIds.length > 0
      ? students.filter(s =>
          teacherArmIds.includes(s.currentClassArmId) ||
          teacherArmIds.includes(resolveArmId(s.currentClassArmId))
        )
      : [];
    return direct.length > 0 ? direct : students;
  }, [isSubjectTeacherOnly, teacherArmIds, students]);

  // Determine authorized student list based on active role
  const authorizedStudents = useMemo(() => {
    if (isParent) {
      return parentWards; // Strictly only the parent's own wards!
    }
    const list = isFormMaster
      ? formMasterStudents
      : isSubjectTeacherOnly
      ? teacherStudents
      : students;
    return list.length > 0 ? list : students;
  }, [isParent, isFormMaster, isSubjectTeacherOnly, parentWards, formMasterStudents, teacherStudents, students]);

  const defaultStudentId =
    (initialStudentId && (!isParent || parentWards.some(w => w.id === initialStudentId)) ? initialStudentId : null) ||
    (isParent ? parentWards[0]?.id : null) ||
    (isFormMaster ? formMasterStudents[0]?.id : null) ||
    user?.studentId ||
    authorizedStudents[0]?.id ||
    (!isParent ? students[0]?.id : '') ||
    '';

  const [selectedStudentId, setSelectedStudentId] = useState<string>(defaultStudentId);

  // Sync state if initialStudentId changes
  React.useEffect(() => {
    if (initialStudentId) {
      if (!isParent || parentWards.some(w => w.id === initialStudentId)) {
        setSelectedStudentId(initialStudentId);
      }
    }
  }, [initialStudentId, isParent, parentWards]);

  // Keep parent's selectedStudentId within parentWards
  React.useEffect(() => {
    if (isParent) {
      if (parentWards.length > 0 && !parentWards.some(w => w.id === selectedStudentId)) {
        setSelectedStudentId(parentWards[0].id);
      }
    }
  }, [isParent, parentWards, selectedStudentId]);

  // Resolve current active student
  const activeStudentId = isParent
    ? (authorizedStudents.find(s => String(s.id) === String(selectedStudentId))?.id || authorizedStudents[0]?.id || '')
    : (authorizedStudents.find(s => String(s.id) === String(selectedStudentId))?.id ||
       students.find(s => String(s.id) === String(selectedStudentId))?.id ||
       authorizedStudents[0]?.id ||
       students[0]?.id ||
       '');

  const feeClearance = activeStudentId ? getWardFeeClearance(activeStudentId, activeTerm.id) : null;
  const isFeeWithheld = isParent && feeClearance && feeClearance.status === 'OUTSTANDING';
  const isResultsLocked = isParent && !activeTerm.isResultsPublished;

  if (isParent && authorizedStudents.length === 0) {
    return (
      <div className="p-8 sm:p-12 text-center max-w-lg mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">No Linked Ward Records</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No authorized student records are linked to your parent account ({user?.email || user?.identifier}). Please contact the school administration if this is an error.
        </p>
      </div>
    );
  }

  const dossier = activeStudentId
    ? getStudentDossier(activeStudentId, activeTerm.id) ||
      (authorizedStudents[0]?.id ? getStudentDossier(authorizedStudents[0].id, activeTerm.id) : null)
    : null;

  if (!dossier) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        No report card data found for the selected student.
      </div>
    );
  }

  const {
    student,
    term,
    session,
    scores,
    affectiveAndPsychomotor: ap,
    totalAggregateScore,
    percentageAverage,
    armPosition,
    totalInArm,
    setPosition,
    totalInSet
  } = dossier;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Action Bar (Hidden on Print) */}
      <div className="no-print bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col gap-3 sm:gap-4">
        {/* Student / Ward Selector */}
        {isParent ? (
          <div className="flex flex-col gap-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Official Terminal Dossier</span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {student.firstName} {student.lastName} ({student.admissionNumber})
              </h2>
            </div>
            {parentWards.length > 1 && (
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto">
                {parentWards.map(ward => (
                  <button
                    key={ward.id}
                    type="button"
                    onClick={() => setSelectedStudentId(ward.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      activeStudentId === ward.id
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {ward.firstName} ({ward.currentClassArmName})
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {isFormMaster ? `Class Arm (${user?.formMasterArmName}):` : isSubjectTeacherOnly ? 'My Class Cohorts:' : 'Select Student:'}
              </label>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                {authorizedStudents.length} Students
              </span>
            </div>
            <select
              value={activeStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
            >
              {authorizedStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.lastName}, {s.firstName} ({s.currentClassArmName} • {s.admissionNumber})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            disabled={isFeeWithheld || isResultsLocked}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all ${
              isFeeWithheld || isResultsLocked
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Report Card</span>
          </button>
        </div>
      </div>

      {/* Informational preview banner for Subject Teachers */}
      {isSubjectTeacherOnly && (
        <div className="no-print bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-indigo-900 dark:text-indigo-200 shadow-2xs">
          <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>
            <strong>Subject Teacher Preview:</strong> You are viewing the terminal academic report card preview for students enrolled in your allocated teaching classes. Continuous assessment and examination scores for your subjects are reflected below.
          </span>
        </div>
      )}

      {/* Institutional Fee Withholding Notice for Parents */}
      {isFeeWithheld && (
        <div className="max-w-full sm:max-w-[210mm] mx-auto bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-900/60 rounded-2xl p-4 sm:p-8 text-center shadow-md">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-rose-100 dark:bg-rose-900/30 border border-rose-300 dark:border-rose-800/60 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 text-rose-600 dark:text-rose-400 shadow-xs">
            <Lock className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <span className="text-[10px] sm:text-xs font-extrabold tracking-widest uppercase text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-3 py-1 rounded-full">
            Bursary Clearance Required
          </span>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-3">
            Terminal Academic Dossier Withheld — Outstanding Tuition Balance
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl mx-auto mt-2 leading-relaxed">
            In accordance with Everest International School financial regulations, official terminal report cards and dossiers are automatically withheld for students with unliquidated school fees.
          </p>
          <div className="mt-4 p-3 sm:p-4 bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-900/50 max-w-md mx-auto text-left w-full">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs py-1 border-b border-slate-100 dark:border-slate-800 gap-0.5">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Student:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{student.firstName} {student.lastName} ({student.admissionNumber})</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs py-1 border-b border-slate-100 dark:border-slate-800 gap-0.5">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Academic Term:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{activeTerm.name} ({session.name})</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 text-rose-700 dark:text-rose-400 font-bold">
              <span>Outstanding Balance:</span>
              <span className="font-mono-tabular text-sm">₦{(feeClearance?.outstandingBalance || 0).toLocaleString()}</span>
            </div>
          </div>
          <div className="mt-5 text-[11px] text-slate-500 dark:text-slate-400">
            Please contact the Accounts &amp; Bursary Office at <strong className="text-slate-700 dark:text-slate-200">accounts@everest.sch.ng</strong> or call <strong className="text-slate-700 dark:text-slate-200">+234 (01) 888-EVEREST</strong> to clear outstanding obligations and unseal the report card.
          </div>
        </div>
      )}

      {/* Results Moderation Notice for Parents */}
      {!isFeeWithheld && isResultsLocked && (
        <div className="max-w-full sm:max-w-[210mm] mx-auto bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-900/60 rounded-2xl p-4 sm:p-8 text-center shadow-md">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-800/60 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 text-amber-700 dark:text-amber-400 shadow-xs">
            <Clock className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <span className="text-[10px] sm:text-xs font-extrabold tracking-widest uppercase text-amber-800 dark:text-amber-400 bg-amber-200/70 dark:bg-amber-900/40 px-3 py-1 rounded-full">
            Moderation in Progress
          </span>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-3">
            Academic Results Under Institutional Ratification
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl mx-auto mt-2 leading-relaxed">
            The terminal marks and continuous assessment records for {activeTerm.name} ({session.name}) are undergoing final statutory audit and seal by the Examination Officer and the Principal. Official parent release is scheduled upon completion of moderation.
          </p>
        </div>
      )}

      {/* The Printable A4 Report Card Container (Hidden if withheld or locked for parents) */}
      {(!isFeeWithheld && !isResultsLocked) && (
      <div className="print-only-container relative w-full sm:max-w-[210mm] mx-auto bg-white p-4 sm:p-6 md:p-10 rounded-2xl border border-slate-200 shadow-lg text-slate-900 font-sans overflow-hidden">
        
        {/* Anti-Counterfeit Official Watermark Seal */}
        {schoolSettings.showWatermarkInPrint && schoolSettings.watermarkSealUrl && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.06] select-none z-0">
            <img
              src={schoolSettings.watermarkSealUrl}
              alt="Official Seal"
              className="w-[300px] h-[300px] sm:w-[450px] sm:h-[450px] object-contain"
            />
          </div>
        )}

        {/* School Header & Crest */}
        <div className="relative z-10 border-b-2 border-slate-900 pb-3 sm:pb-4 flex flex-col sm:flex-row items-center sm:justify-between gap-3 sm:gap-4">
          {/* Crest — hidden on very small phones to save space, visible on sm+ */}
          <div className="hidden sm:flex w-20 h-24 shrink-0 items-center justify-center">
            <img src="/crest.svg" alt="Everest Logo" className="w-18 h-22 object-contain" />
          </div>

          <div className="text-center flex-1">
            <div className="text-[10px] sm:text-[11px] font-bold text-amber-800 tracking-[0.15em] sm:tracking-[0.2em] uppercase">
              Federal Ministry of Education Approved
            </div>
            <h1 className="font-serif-title text-lg sm:text-xl md:text-2xl font-black text-slate-950 tracking-wider uppercase mt-0.5">
              EVEREST INTERNATIONAL SCHOOLS
            </h1>
            <div className="text-[10px] sm:text-[11px] font-medium text-slate-600 italic mt-0.5">
              "Excellence, Character, and Leadership"
            </div>
            <div className="text-[9px] sm:text-[10px] text-slate-500 mt-1 px-2">
              Plot 12, Everest Boulevard, Victoria Island, Lagos, Nigeria • Tel: +234 (01) 888-EVEREST
            </div>
          </div>

          {/* Security Hologram / Stamp Seal — hidden on mobile */}
          <div className="hidden sm:flex w-20 h-20 shrink-0 border-2 border-dashed border-amber-500/40 rounded-full flex-col items-center justify-center text-center p-1 bg-amber-50/20">
            <div className="text-[8px] font-extrabold text-amber-800 uppercase leading-tight">OFFICIAL SEAL</div>
            <div className="text-[10px] font-mono-tabular font-bold text-slate-700">#EIS-2026</div>
            <div className="text-[7px] text-emerald-700 font-bold uppercase">VERIFIED</div>
          </div>
        </div>

        {/* Title Banner */}
        <div className="bg-slate-900 text-white text-center py-1.5 px-3 sm:px-4 my-2.5 sm:my-3 rounded-md">
          <span className="font-serif-title text-[10px] sm:text-xs font-bold tracking-widest uppercase">
            CONTINUOUS ASSESSMENT &amp; TERMINAL PROGRESS DOSSIER
          </span>
        </div>

        {/* Student Biodata Profile Strip */}
        <div className="flex flex-col sm:flex-row gap-3 p-3 sm:p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs mb-3 sm:mb-4">
          {/* Info fields */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-3 sm:gap-x-4">
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-500 block uppercase">Student Full Name:</span>
              <span className="font-bold text-slate-950 uppercase text-[11px] sm:text-xs">
                {student.lastName}, {student.firstName} {student.middleName || ''}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Admission Number:</span>
              <span className="font-mono-tabular font-bold text-slate-900">{student.admissionNumber}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Class &amp; Arm:</span>
              <span className="font-bold text-amber-900">{student.currentClassArmName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Academic Session:</span>
              <span className="font-semibold text-slate-800">{session.name}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Academic Term:</span>
              <span className="font-semibold text-slate-800">{term.name}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">School House:</span>
              <span className="font-semibold text-slate-800">{student.house} House</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Times School Opened:</span>
              <span className="font-mono-tabular font-bold text-slate-800">{ap.totalSchoolDays} Days</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Times Present:</span>
              <span className="font-mono-tabular font-bold text-emerald-700">{ap.daysPresent} Days</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Times Absent:</span>
              <span className="font-mono-tabular font-bold text-rose-700">{ap.daysAbsent} Days</span>
            </div>
          </div>

          {/* Passport photo */}
          <div className="flex items-center justify-center sm:justify-end shrink-0">
            <img
              src={student.passportPhotoUrl}
              alt="Passport"
              className="w-14 h-18 sm:w-16 sm:h-20 rounded-md object-cover border-2 border-slate-300 shadow-2xs"
            />
          </div>
        </div>

        {/* Cognitive Academic Evaluation Table */}
        <div className="mb-3 sm:mb-4">
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
            <span>Cognitive Performance Record</span>
            <span className="text-[9px] sm:text-[10px] text-slate-500 font-normal">
              CA: 40% (CA1: 10, CA2: 10, Assg: 10, Proj: 10) | Exam: 60%
            </span>
          </div>

          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full text-left border-collapse text-[10px] sm:text-xs border border-slate-300 min-w-[560px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[8px] sm:text-[9px] border-b border-slate-300">
                <th className="py-1.5 sm:py-2 px-1.5 sm:px-2.5 border-r border-slate-300">Subject</th>
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center w-10 sm:w-12 border-r border-slate-300">CA1</th>
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center w-10 sm:w-12 border-r border-slate-300">CA2</th>
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center w-10 sm:w-14 border-r border-slate-300">Assg</th>
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center w-10 sm:w-14 border-r border-slate-300">Proj</th>
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center w-10 sm:w-14 border-r border-slate-300 bg-blue-50/50">Exam</th>
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center w-10 sm:w-14 border-r border-slate-300 bg-amber-50/40">Total</th>
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center w-10 sm:w-12 border-r border-slate-300">Grade</th>
                <th className="py-1.5 sm:py-2 px-1.5 sm:px-3">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {scores.map(s => {
                const subObj = subjects.find(sub => sub.id === s.subjectId);
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-1 sm:py-1.5 px-1.5 sm:px-2.5 font-semibold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                      {subObj ? subObj.name : s.subjectId.replace('subj-', '').toUpperCase()}
                    </td>
                    <td className="py-1 sm:py-1.5 px-1 sm:px-2 text-center font-mono-tabular border-r border-slate-200">{s.ca1}</td>
                    <td className="py-1 sm:py-1.5 px-1 sm:px-2 text-center font-mono-tabular border-r border-slate-200">{s.ca2}</td>
                    <td className="py-1 sm:py-1.5 px-1 sm:px-2 text-center font-mono-tabular border-r border-slate-200">{s.assignment}</td>
                    <td className="py-1 sm:py-1.5 px-1 sm:px-2 text-center font-mono-tabular border-r border-slate-200">{s.project}</td>
                    <td className="py-1 sm:py-1.5 px-1 sm:px-2 text-center font-mono-tabular font-bold text-slate-900 border-r border-slate-200 bg-blue-50/20">
                      {s.exam}
                    </td>
                    <td className="py-1 sm:py-1.5 px-1 sm:px-2 text-center font-mono-tabular font-extrabold text-slate-950 border-r border-slate-200 bg-amber-50/20">
                      {s.total}
                    </td>
                    <td className="py-1 sm:py-1.5 px-1 sm:px-2 text-center font-extrabold border-r border-slate-200">
                      <span
                        className={
                          s.grade === 'A'
                            ? 'text-emerald-700'
                            : s.grade === 'B'
                            ? 'text-teal-700'
                            : s.grade === 'C'
                            ? 'text-blue-700'
                            : s.grade === 'D'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }
                      >
                        {s.grade}
                      </span>
                    </td>
                    <td className="py-1 sm:py-1.5 px-1.5 sm:px-3 text-slate-600 text-[10px] sm:text-[11px] font-medium whitespace-nowrap">{s.remark}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          {/* Dropped Subjects Audit Record (if student transitioned & dropped subjects in SS2/SS3) */}
          {student.droppedSubjects && student.droppedSubjects.length > 0 && (
            <div className="mt-2.5 p-2 rounded bg-slate-50 border border-slate-200 text-[10px] text-slate-600 space-y-0.5">
              <span className="font-bold text-slate-800 uppercase tracking-wider block">
                Official Curriculum Transition &amp; Dropped Subjects Log:
              </span>
              {student.droppedSubjects.map((d, i) => {
                const subObj = subjects.find(sub => sub.id === d.subjectId);
                return (
                  <div key={i}>
                    • <strong>{subObj ? subObj.name : d.subjectName || d.subjectId}</strong> dropped upon entrance to{' '}
                    <strong>{d.level}</strong> {d.academicSession ? `(${d.academicSession})` : ''} {d.reason ? `— ${d.reason}` : ''}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Aggregate Summary Box */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 p-2.5 sm:p-3 rounded-lg bg-slate-900 text-white text-xs mb-3 sm:mb-4 font-mono-tabular">
          <div className="text-center sm:border-r sm:border-slate-800">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block font-sans uppercase">Total Aggregate</span>
            <span className="text-sm sm:text-base font-bold text-amber-400">{totalAggregateScore}</span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 ml-1">/ {scores.length * 100}</span>
          </div>
          <div className="text-center sm:border-r sm:border-slate-800">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block font-sans uppercase">Term Average</span>
            <span className="text-sm sm:text-base font-bold text-white">{percentageAverage}%</span>
          </div>
          <div className="text-center sm:border-r sm:border-slate-800">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block font-sans uppercase">Position in Arm</span>
            <span className="text-sm sm:text-base font-bold text-emerald-400">{formatOrdinal(armPosition)}</span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 ml-1">of {totalInArm}</span>
          </div>
          <div className="text-center">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block font-sans uppercase">Position in Set</span>
            <span className="text-sm sm:text-base font-bold text-amber-300">{formatOrdinal(setPosition)}</span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 ml-1">of {totalInSet}</span>
          </div>
        </div>

        {/* Affective and Psychomotor Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4 text-xs page-break-avoid">
          {/* Affective Traits */}
          <div className="border border-slate-300 rounded-lg p-2.5 sm:p-3 bg-slate-50/50">
            <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-2 border-b border-slate-200 pb-1">
              Affective Domain Traits (Rating 1 - 5)
            </div>
            <div className="space-y-1.5">
              {[
                { label: 'Punctuality', val: ap.punctuality },
                { label: 'Neatness & Uniform', val: ap.neatness },
                { label: 'Politeness & Courtesy', val: ap.politeness },
                { label: 'Attentiveness', val: ap.attentiveness },
                { label: 'Honesty & Reliability', val: ap.honesty },
                { label: 'Relationship with Peers', val: ap.relationshipWithPeers }
              ].map(t => (
                <div key={t.label} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">{t.label}:</span>
                  <span className="font-mono-tabular font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {t.val} / 5
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Psychomotor Skills */}
          <div className="border border-slate-300 rounded-lg p-2.5 sm:p-3 bg-slate-50/50">
            <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-2 border-b border-slate-200 pb-1">
              Psychomotor Skills (Rating 1 - 5)
            </div>
            <div className="space-y-1.5">
              {[
                { label: 'Handwriting & Legibility', val: ap.handwriting },
                { label: 'Sports & Games', val: ap.sportsAndGames },
                { label: 'Craftsmanship & Dexterity', val: ap.craftsmanship },
                { label: 'Musical & Artistic Flair', val: ap.musicalArtisticSkill }
              ].map(t => (
                <div key={t.label} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">{t.label}:</span>
                  <span className="font-mono-tabular font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {t.val} / 5
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Remarks and Signatures */}
        <div className="border border-slate-300 rounded-lg p-3 sm:p-4 space-y-3 text-xs page-break-avoid bg-white">
          <div>
            <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider block mb-0.5">
              Form Master's Remark:
            </span>
            <p className="italic text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 text-[11px] sm:text-xs">
              "{ap.formMasterRemark}"
            </p>
          </div>

          <div>
            <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider block mb-0.5">
              Principal's Remark &amp; Endorsement:
            </span>
            <p className="italic text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 text-[11px] sm:text-xs">
              "{ap.principalRemark}"
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Next Term Resumes:</div>
              <div className="text-xs font-bold text-amber-900">
                {term.nextTermResumptionDate}
              </div>
            </div>

            <div className="text-left sm:text-right">
              {schoolSettings.autoSignReportCards && schoolSettings.principalSignatureUrl && (
                <div className="h-10 flex sm:justify-end mb-1">
                  <img
                    src={schoolSettings.principalSignatureUrl}
                    alt="Principal Digital Endorsement"
                    className="max-h-full object-contain"
                  />
                </div>
              )}
              <div className="font-serif-title font-bold text-slate-900 text-xs">
                {schoolSettings.principalName}
              </div>
              <div className="text-[10px] text-slate-500 uppercase">{schoolSettings.principalTitle}</div>
              <div className="text-[9px] text-slate-400 italic">Official Institutional Transcript • EIS Verified</div>
            </div>
          </div>
        </div>

      </div>
      )}
    </div>
  );
};
