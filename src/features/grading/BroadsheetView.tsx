import React, { useState, useMemo } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import { calculateTotalAggregate, computeRankings, formatOrdinal } from '../../lib/gradeCalculator';
import { Printer, Globe, Sparkles, FileSpreadsheet, ShieldCheck, AlertCircle } from 'lucide-react';
import { FuturisticPageShell } from '../../components/common/FuturisticPageShell';
import { DoubleBezelCard } from '../../components/common/DoubleBezelCard';

export const BroadsheetView: React.FC = () => {
  const { classArms, subjects, students, scores, activeTerm, publishResults, allocations } = useSchoolData();
  const { user } = useAuth();

  const isFormMaster = user?.activeRole === 'FORM_MASTER';
  const isSubjectTeacher = user?.activeRole === 'SUBJECT_TEACHER' || user?.activeRole === 'TEACHER';

  // Dynamic allocations for teacher
  const teacherAllocations = useMemo(() => {
    if (!isSubjectTeacher) return [];
    const teacherId = user?.id || user?.staffId;
    const found = allocations.filter(
      a => a.teacherId === teacherId || a.teacherId === user?.id || (a.teacherName && user?.name && a.teacherName.toLowerCase() === user.name.toLowerCase())
    );
    return found.length > 0 ? found : (user?.allocatedSubjects || []);
  }, [allocations, user, isSubjectTeacher]);

  const teacherArmIds = useMemo(() => {
    return Array.from(new Set(teacherAllocations.map(a => a.classArmId)));
  }, [teacherAllocations]);

  // Allowed class arms based strictly on role
  const allowedArms = useMemo(() => {
    if (isFormMaster && user?.formMasterArmId) {
      return classArms.filter(a => a.id === user.formMasterArmId);
    }
    if (isSubjectTeacher) {
      return classArms.filter(a => teacherArmIds.includes(a.id));
    }
    return classArms;
  }, [classArms, isFormMaster, isSubjectTeacher, user?.formMasterArmId, teacherArmIds]);

  const defaultArmId = allowedArms[0]?.id || classArms[0].id;
  const [selectedArmId, setSelectedArmId] = useState(defaultArmId);
  const [isHeatmapActive, setIsHeatmapActive] = useState(true);
  const [assentAlert, setAssentAlert] = useState<string | null>(null);

  const currentArm = classArms.find(a => a.id === selectedArmId) || allowedArms[0] || classArms[0];
  const armStudents = students.filter(s => s.currentClassArmId === selectedArmId);

  // My subject IDs for this arm (if subject teacher)
  const mySubjectIdsForArm = useMemo(() => {
    if (!isSubjectTeacher) return [];
    return teacherAllocations.filter(a => a.classArmId === selectedArmId).map(a => a.subjectId);
  }, [isSubjectTeacher, teacherAllocations, selectedArmId]);

  // Get subjects that have scores for this arm or default to senior subjects
  const armScores = scores.filter(s => s.classArmId === selectedArmId && s.termId === activeTerm.id);
  const activeSubjectIds = Array.from(new Set(armScores.map(s => s.subjectId)));
  const displaySubjects = subjects.filter(s => activeSubjectIds.includes(s.id) || s.category === 'CORE');

  // Compute total aggregates and rankings based ONLY on registered subjects
  const studentsWithTotals = armStudents.map(student => {
    const registeredIds = student.registeredSubjectIds || [];
    const studentScores = armScores.filter(
      s => s.studentId === student.id && (registeredIds.length === 0 || registeredIds.includes(s.subjectId))
    );
    const totalAggregate = calculateTotalAggregate(studentScores);
    const avg = studentScores.length > 0 ? totalAggregate / studentScores.length : 0;
    return {
      student,
      scores: studentScores,
      totalAggregate,
      average: Number(avg.toFixed(1))
    };
  });

  const rankMap = computeRankings(
    studentsWithTotals.map(st => ({ studentId: st.student.id, totalAggregate: st.totalAggregate }))
  );

  const canPublish = user?.activeRole === 'SUPER_ADMIN' || user?.activeRole === 'PRINCIPAL' || user?.activeRole === 'EXAMINATION_OFFICER';

  const handleTogglePublish = () => {
    if (!activeTerm.isResultsPublished && !activeTerm.isResultsApprovedByPrincipal && user?.activeRole !== 'SUPER_ADMIN') {
      setAssentAlert('Executive Assent Required: The Principal has not yet ratified Result Clearance for this term. Please ensure the Principal inspects broadsheets and grants clearance in Principal Remarking before releasing scores to student and parent dashboards.');
      setTimeout(() => setAssentAlert(null), 6000);
      return;
    }
    publishResults(activeTerm.id, !activeTerm.isResultsPublished);
  };

  return (
    <FuturisticPageShell
      title={isSubjectTeacher ? "Student Performance & Broadsheet" : isFormMaster ? "Class Performance & Broadsheet" : "Master Broadsheet & Class Performance"}
      subtitle={`View and analyze student scores, subject averages, and term rankings for ${currentArm.fullName}.`}
      icon={FileSpreadsheet}
      badgeText={activeTerm.isResultsPublished ? 'Published to Portal' : 'Unpublished Draft'}
      badgeVariant={activeTerm.isResultsPublished ? 'success' : 'warning'}
      actions={
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Heatmap Toggle */}
          <button
            onClick={() => setIsHeatmapActive(!isHeatmapActive)}
            className={`touch-target px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isHeatmapActive
                ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Heatmap {isHeatmapActive ? 'On' : 'Off'}</span>
          </button>

          {/* Publish Results Button (Exam Officer / Principal / Super Admin) */}
          {canPublish && (
            <button
              onClick={handleTogglePublish}
              className={`touch-target px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 ${
                activeTerm.isResultsPublished
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/20'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/20'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{activeTerm.isResultsPublished ? 'Results Published' : 'Publish to Portal'}</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="touch-target p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
            title="Print Broadsheet"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      }
    >
      {assentAlert && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-start gap-3 shadow-md animate-fade-slide-up">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <span>{assentAlert}</span>
        </div>
      )}

      {/* Class Cohort Selector Bar */}
      <DoubleBezelCard>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Active Cohort Selection
            </span>
            <div className="text-base font-serif font-bold text-slate-900 dark:text-white">
              {currentArm.fullName} ({armStudents.length} Students)
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.activeRole === 'FORM_MASTER' && user?.formMasterArmId ? (
              <div className="touch-target px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Custody: {currentArm.fullName}</span>
              </div>
            ) : (
              <select
                value={selectedArmId}
                onChange={e => setSelectedArmId(e.target.value)}
                className="touch-target px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {allowedArms.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </DoubleBezelCard>

      {/* Broadsheet Table Container */}
      <DoubleBezelCard innerClassName="p-0 sm:p-0 overflow-hidden">
        {/* Mobile Horizontal Scroll Cue */}
        <div className="sm:hidden px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-medium flex items-center justify-between">
          <span>↔ Swipe horizontally to view full class broadsheet</span>
        </div>

        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left border-collapse text-xs min-w-[850px]">
            <thead className="sticky top-0 z-20 bg-slate-900 dark:bg-slate-950 text-white text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 pl-2.5 pr-0.5 w-8 min-w-[32px] max-w-[32px] text-center sticky left-0 z-30 bg-slate-900 dark:bg-slate-950">#</th>
                <th className="py-3 pl-1 pr-4 min-w-[190px] sticky left-[31px] z-30 bg-slate-900 dark:bg-slate-950 border-r border-slate-800">
                  Student Name &amp; Adm No
                </th>

                {/* Dynamic Subject Columns */}
                {displaySubjects.map(sub => {
                  const isMySubject = isSubjectTeacher && mySubjectIdsForArm.includes(sub.id);

                  return (
                    <th
                      key={sub.id}
                      className={`py-3 px-2 text-center min-w-[70px] border-r border-slate-800 ${
                        isMySubject ? 'bg-amber-600/30 text-amber-300 border-b-2 border-amber-400 font-extrabold' : ''
                      }`}
                    >
                      <div className="truncate max-w-[80px]" title={isMySubject ? `${sub.name} (Your Teaching Allocation)` : sub.name}>
                        {sub.code}
                        {isMySubject && <span className="block text-[8px] text-amber-400 font-bold">MINE</span>}
                      </div>
                    </th>
                  );
                })}

                {/* Aggregate & Positions */}
                <th className="py-3 px-3 text-center min-w-[90px] bg-slate-950 text-amber-400 border-r border-slate-800 font-bold">
                  Total (Agg)
                </th>
                <th className="py-3 px-3 text-center min-w-[70px] bg-slate-950 text-white border-r border-slate-800">
                  Avg %
                </th>
                <th className="py-3 px-3 text-center min-w-[70px] bg-amber-500 text-slate-950 font-black">
                  Rank
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {studentsWithTotals.map((item, idx) => {
                const rank = rankMap.get(item.student.id) || 1;

                return (
                  <tr key={item.student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 pl-2.5 pr-0.5 w-8 min-w-[32px] max-w-[32px] text-center font-mono-tabular text-slate-400 sticky left-0 z-10 bg-white dark:bg-[#0E1526]">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 pl-1 pr-4 font-semibold text-slate-900 dark:text-slate-100 sticky left-[31px] z-10 bg-white dark:bg-[#0E1526] border-r border-slate-100 dark:border-slate-800">
                      <div className="truncate max-w-[180px]">
                        {item.student.lastName}, {item.student.firstName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono-tabular">
                        {item.student.admissionNumber}
                      </div>
                    </td>

                    {/* Subject Score Cells */}
                    {displaySubjects.map(sub => {
                      const isRegistered = !item.student.registeredSubjectIds || 
                        item.student.registeredSubjectIds.length === 0 || 
                        item.student.registeredSubjectIds.includes(sub.id);
                      
                      const sc = item.scores.find(s => s.subjectId === sub.id);
                      const total = sc ? sc.total : 0;
                      const hasScore = !!sc;

                      if (!isRegistered) {
                        return (
                          <td
                            key={sub.id}
                            className="py-2 px-2 text-center font-mono-tabular border-r border-slate-100 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 text-slate-400 select-none text-[10px]"
                            title={`${item.student.firstName} is not enrolled in ${sub.name}`}
                          >
                            —
                          </td>
                        );
                      }

                      let cellBg = '';
                      if (isHeatmapActive && hasScore) {
                        if (total >= 80) cellBg = 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold';
                        else if (total < 45) cellBg = 'bg-rose-500/10 text-rose-800 dark:text-rose-300 font-bold';
                      }

                      return (
                        <td
                          key={sub.id}
                          className={`py-2 px-2 text-center font-mono-tabular border-r border-slate-100 dark:border-slate-800 ${cellBg}`}
                        >
                          {hasScore ? (
                            <div>
                              <span className="dark:text-slate-200">{total}</span>
                              <span className="text-[9px] text-slate-400 ml-1">({sc.grade})</span>
                            </div>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Aggregate Column */}
                    <td className="py-2.5 px-3 text-center font-mono-tabular font-extrabold text-slate-900 dark:text-amber-300 bg-amber-50/30 dark:bg-amber-950/20 border-r border-slate-100 dark:border-slate-800">
                      {item.totalAggregate}
                    </td>

                    {/* Average Percentage */}
                    <td className="py-2.5 px-3 text-center font-mono-tabular font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                      {item.average}%
                    </td>

                    {/* Rank */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                          rank === 1
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                            : rank <= 3
                            ? 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {formatOrdinal(rank)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DoubleBezelCard>
    </FuturisticPageShell>
  );
};
