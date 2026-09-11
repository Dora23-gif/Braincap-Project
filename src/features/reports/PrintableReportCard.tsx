import React, { useState } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import { formatOrdinal } from '../../lib/gradeCalculator';
import { Printer, Lock, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';

export const PrintableReportCard: React.FC = () => {
  const { students, subjects, getStudentDossier, activeTerm, schoolSettings, getWardFeeClearance } = useSchoolData();
  const { user } = useAuth();

  const isSubjectTeacherOnly = user?.activeRole === 'SUBJECT_TEACHER' || user?.activeRole === 'TEACHER';
  const isParent = user?.activeRole === 'PARENT' || user?.activeRole === 'STUDENT';
  const isFormMaster = user?.activeRole === 'FORM_MASTER';

  // Strict purview scoping
  const parentWards = isParent && user?.parentId
    ? students.filter(s => s.parentId === user.parentId)
    : [];

  const formMasterStudents = isFormMaster && user?.formMasterArmId
    ? students.filter(s => s.currentClassArmId === user.formMasterArmId)
    : [];

  // Determine authorized student list based on active role
  const authorizedStudents = isParent
    ? parentWards
    : isFormMaster
    ? formMasterStudents
    : students;

  const defaultStudentId =
    (isParent ? parentWards[0]?.id : null) ||
    (isFormMaster ? formMasterStudents[0]?.id : null) ||
    user?.studentId ||
    authorizedStudents[0]?.id ||
    '';

  const [selectedStudentId, setSelectedStudentId] = useState<string>(defaultStudentId);

  // If active user is Subject Teacher, deny access
  if (isSubjectTeacherOnly) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 p-8 text-center shadow-xs max-w-2xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center mx-auto mb-4 text-rose-600 dark:text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Access Restricted Protocol
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          Comprehensive terminal dossiers and report cards are restricted to Form Masters, Academic Leadership, and verified Parents/Guardians. Subject teachers are authorized to input subject assessments via the Score Entry Grid.
        </p>
      </div>
    );
  }

  // Handle case where Form Master has no assigned arm or students
  if (isFormMaster && formMasterStudents.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/50 p-8 text-center shadow-xs max-w-2xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          No Assigned Arm Students Found
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
          Your account is designated as Form Master, but no students are currently enrolled in your assigned custodial arm ({user?.formMasterArmName || 'Unallocated'}).
        </p>
      </div>
    );
  }

  // Resolve current active student
  const activeStudentId = authorizedStudents.some(s => s.id === selectedStudentId)
    ? selectedStudentId
    : (authorizedStudents[0]?.id || '');

  const feeClearance = getWardFeeClearance(activeStudentId, activeTerm.id);
  const isFeeWithheld = isParent && feeClearance && feeClearance.status === 'OUTSTANDING';
  const isResultsLocked = isParent && !activeTerm.isResultsPublished;

  const dossier = getStudentDossier(activeStudentId, activeTerm.id);

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
    <div className="space-y-6">
      {/* Action Bar (Hidden on Print) */}
      <div className="no-print bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Student / Ward Selector */}
        {isParent ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Official Terminal Dossier</span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {student.firstName} {student.lastName} ({student.admissionNumber})
              </h2>
            </div>
            {parentWards.length > 1 && (
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {parentWards.map(ward => (
                  <button
                    key={ward.id}
                    type="button"
                    onClick={() => setSelectedStudentId(ward.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                {isFormMaster ? `Class Arm (${user?.formMasterArmName}):` : 'Select Student:'}
              </label>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                {authorizedStudents.length} Students
              </span>
            </div>
            <select
              value={activeStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
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
            className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all ${
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

      {/* Institutional Fee Withholding Notice for Parents */}
      {isFeeWithheld && (
        <div className="max-w-[210mm] mx-auto bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-900/60 rounded-2xl p-8 text-center shadow-md">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 border border-rose-300 dark:border-rose-800/60 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-600 dark:text-rose-400 shadow-xs">
            <Lock className="w-8 h-8" />
          </div>
          <span className="text-xs font-extrabold tracking-widest uppercase text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-3 py-1 rounded-full">
            Bursary Clearance Required
          </span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-3">
            Terminal Academic Dossier Withheld — Outstanding Tuition Balance
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl mx-auto mt-2 leading-relaxed">
            In accordance with Everest International School financial regulations, official terminal report cards and dossiers are automatically withheld for students with unliquidated school fees.
          </p>
          <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-900/50 max-w-md mx-auto inline-block text-left w-full">
            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Student:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{student.firstName} {student.lastName} ({student.admissionNumber})</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100 dark:border-slate-800">
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
        <div className="max-w-[210mm] mx-auto bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-900/60 rounded-2xl p-8 text-center shadow-md">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-800/60 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-700 dark:text-amber-400 shadow-xs">
            <Clock className="w-8 h-8" />
          </div>
          <span className="text-xs font-extrabold tracking-widest uppercase text-amber-800 dark:text-amber-400 bg-amber-200/70 dark:bg-amber-900/40 px-3 py-1 rounded-full">
            Moderation in Progress
          </span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-3">
            Academic Results Under Institutional Ratification
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl mx-auto mt-2 leading-relaxed">
            The terminal marks and continuous assessment records for {activeTerm.name} ({session.name}) are undergoing final statutory audit and seal by the Examination Officer and the Principal. Official parent release is scheduled upon completion of moderation.
          </p>
        </div>
      )}

      {/* The Printable A4 Report Card Container (Hidden if withheld or locked for parents) */}
      {(!isFeeWithheld && !isResultsLocked) && (
      <div className="print-only-container relative max-w-[210mm] mx-auto bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-lg text-slate-900 font-sans overflow-hidden">
        
        {/* Anti-Counterfeit Official Watermark Seal */}
        {schoolSettings.showWatermarkInPrint && schoolSettings.watermarkSealUrl && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.06] select-none z-0">
            <img
              src={schoolSettings.watermarkSealUrl}
              alt="Official Seal"
              className="w-[450px] h-[450px] object-contain"
            />
          </div>
        )}

        {/* School Header & Crest */}
        <div className="relative z-10 border-b-2 border-slate-900 pb-4 flex items-center justify-between gap-4">
          <div className="w-20 h-24 shrink-0 flex items-center justify-center">
            <img src="/crest.svg" alt="Everest Logo" className="w-18 h-22 object-contain" />
          </div>

          <div className="text-center flex-1">
            <div className="text-[11px] font-bold text-amber-800 tracking-[0.2em] uppercase">
              Federal Ministry of Education Approved
            </div>
            <h1 className="font-serif-title text-xl sm:text-2xl font-black text-slate-950 tracking-wider uppercase mt-0.5">
              EVEREST INTERNATIONAL SCHOOLS
            </h1>
            <div className="text-[11px] font-medium text-slate-600 italic mt-0.5">
              "Excellence, Character, and Leadership"
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Plot 12, Everest Boulevard, Victoria Island, Lagos, Nigeria • Tel: +234 (01) 888-EVEREST
            </div>
          </div>

          {/* Security Hologram / Stamp Seal */}
          <div className="w-20 h-20 shrink-0 border-2 border-dashed border-amber-500/40 rounded-full flex flex-col items-center justify-center text-center p-1 bg-amber-50/20">
            <div className="text-[8px] font-extrabold text-amber-800 uppercase leading-tight">OFFICIAL SEAL</div>
            <div className="text-[10px] font-mono-tabular font-bold text-slate-700">#EIS-2026</div>
            <div className="text-[7px] text-emerald-700 font-bold uppercase">VERIFIED</div>
          </div>
        </div>

        {/* Title Banner */}
        <div className="bg-slate-900 text-white text-center py-1.5 px-4 my-3 rounded-md">
          <span className="font-serif-title text-xs font-bold tracking-widest uppercase">
            CONTINUOUS ASSESSMENT &amp; TERMINAL PROGRESS DOSSIER
          </span>
        </div>

        {/* Student Biodata Profile Strip */}
        <div className="grid grid-cols-12 gap-3 p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs mb-4">
          <div className="col-span-10 grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Student Full Name:</span>
              <span className="font-bold text-slate-950 uppercase">
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

          <div className="col-span-2 flex items-center justify-end">
            <img
              src={student.passportPhotoUrl}
              alt="Passport"
              className="w-16 h-20 rounded-md object-cover border-2 border-slate-300 shadow-2xs"
            />
          </div>
        </div>

        {/* Cognitive Academic Evaluation Table */}
        <div className="mb-4">
          <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Cognitive Performance Record</span>
            <span className="text-[10px] text-slate-500 font-normal">
              CA: 40% (CA1: 10, CA2: 10, Assg: 10, Proj: 10) | Exam: 60%
            </span>
          </div>

          <table className="w-full text-left border-collapse text-xs border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px] border-b border-slate-300">
                <th className="py-2 px-2.5 border-r border-slate-300">Subject</th>
                <th className="py-2 px-2 text-center w-12 border-r border-slate-300">CA1 (10)</th>
                <th className="py-2 px-2 text-center w-12 border-r border-slate-300">CA2 (10)</th>
                <th className="py-2 px-2 text-center w-14 border-r border-slate-300">Assg (10)</th>
                <th className="py-2 px-2 text-center w-14 border-r border-slate-300">Proj (10)</th>
                <th className="py-2 px-2 text-center w-14 border-r border-slate-300 bg-blue-50/50">Exam (60)</th>
                <th className="py-2 px-2 text-center w-14 border-r border-slate-300 bg-amber-50/40">Total (100)</th>
                <th className="py-2 px-2 text-center w-12 border-r border-slate-300">Grade</th>
                <th className="py-2 px-3">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {scores.map(s => {
                const subObj = subjects.find(sub => sub.id === s.subjectId);
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2.5 font-semibold text-slate-900 border-r border-slate-200">
                      {subObj ? subObj.name : s.subjectId.replace('subj-', '').toUpperCase()}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono-tabular border-r border-slate-200">{s.ca1}</td>
                    <td className="py-1.5 px-2 text-center font-mono-tabular border-r border-slate-200">{s.ca2}</td>
                    <td className="py-1.5 px-2 text-center font-mono-tabular border-r border-slate-200">{s.assignment}</td>
                    <td className="py-1.5 px-2 text-center font-mono-tabular border-r border-slate-200">{s.project}</td>
                    <td className="py-1.5 px-2 text-center font-mono-tabular font-bold text-slate-900 border-r border-slate-200 bg-blue-50/20">
                      {s.exam}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono-tabular font-extrabold text-slate-950 border-r border-slate-200 bg-amber-50/20">
                      {s.total}
                    </td>
                    <td className="py-1.5 px-2 text-center font-extrabold border-r border-slate-200">
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
                    <td className="py-1.5 px-3 text-slate-600 text-[11px] font-medium">{s.remark}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-slate-900 text-white text-xs mb-4 font-mono-tabular">
          <div className="text-center border-r border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans uppercase">Total Aggregate</span>
            <span className="text-base font-bold text-amber-400">{totalAggregateScore}</span>
            <span className="text-[10px] text-slate-400 ml-1">/ {scores.length * 100}</span>
          </div>
          <div className="text-center border-r border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans uppercase">Term Average</span>
            <span className="text-base font-bold text-white">{percentageAverage}%</span>
          </div>
          <div className="text-center border-r border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans uppercase">Position in Arm</span>
            <span className="text-base font-bold text-emerald-400">{formatOrdinal(armPosition)}</span>
            <span className="text-[10px] text-slate-400 ml-1">out of {totalInArm}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-slate-400 block font-sans uppercase">Position in Set</span>
            <span className="text-base font-bold text-amber-300">{formatOrdinal(setPosition)}</span>
            <span className="text-[10px] text-slate-400 ml-1">out of {totalInSet}</span>
          </div>
        </div>

        {/* Affective and Psychomotor Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-xs page-break-avoid">
          {/* Affective Traits */}
          <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50">
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
          <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50">
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
        <div className="border border-slate-300 rounded-lg p-4 space-y-3 text-xs page-break-avoid bg-white">
          <div>
            <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider block mb-0.5">
              Form Master's Remark:
            </span>
            <p className="italic text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
              "{ap.formMasterRemark}"
            </p>
          </div>

          <div>
            <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider block mb-0.5">
              Principal's Remark &amp; Endorsement:
            </span>
            <p className="italic text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
              "{ap.principalRemark}"
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-end justify-between">
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Next Term Resumes:</div>
              <div className="text-xs font-bold text-amber-900">
                {term.nextTermResumptionDate}
              </div>
            </div>

            <div className="text-right">
              {schoolSettings.autoSignReportCards && schoolSettings.principalSignatureUrl && (
                <div className="h-10 flex justify-end mb-1">
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

