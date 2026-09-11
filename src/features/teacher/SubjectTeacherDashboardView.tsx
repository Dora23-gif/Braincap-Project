import React, { useState, useMemo } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Send,
  Users,
  Award,
  TrendingUp,
  FileSpreadsheet,
  Clock,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  BarChart3,
  MessageSquare,
  Calendar
} from 'lucide-react';

import { FuturisticPageShell } from '../../components/common/FuturisticPageShell';
import { FuturisticKPICard } from '../../components/common/FuturisticKPICard';
import { DoubleBezelCard } from '../../components/common/DoubleBezelCard';
import { BarDistributionChart, RadialGauge } from '../../components/common/ChartComponents';
import { ModalPortal } from '../../components/common/ModalPortal';

interface SubjectTeacherDashboardViewProps {
  onNavigateToScores?: (classArmId: string, subjectId: string) => void;
}

export const SubjectTeacherDashboardView: React.FC<SubjectTeacherDashboardViewProps> = ({
  onNavigateToScores
}) => {
  const {
    students,
    scores,
    activeTerm,
    activeSession,
    subjectSubmissions,
    submitSubjectMarksheet,
    allocations,
    weeklyTimetables,
    examTimetable,
    sendMessage,
    classArms,
    staff
  } = useSchoolData();

  const { user } = useAuth();

  // Dynamically resolve teacher's allocated subjects from live context allocations
  const teacherAllocations = useMemo(() => {
    const teacherId = user?.id || user?.staffId;
    const fromAllocations = allocations.filter(
      a => a.teacherId === teacherId || a.teacherId === user?.id || (a.teacherName && user?.name && a.teacherName.toLowerCase() === user.name.toLowerCase())
    );
    if (fromAllocations.length > 0) {
      return fromAllocations.map(a => ({
        classArmId: a.classArmId,
        classArmName: a.classArmName || a.classArmId,
        subjectId: a.subjectId,
        subjectName: a.subjectName || a.subjectId
      }));
    }
    if (user?.allocatedSubjects && user.allocatedSubjects.length > 0) {
      return user.allocatedSubjects;
    }
    return allocations.slice(0, 2).map(a => ({
      classArmId: a.classArmId,
      classArmName: a.classArmName || a.classArmId,
      subjectId: a.subjectId,
      subjectName: a.subjectName || a.subjectId
    }));
  }, [allocations, user]);

  // Compute this teacher's scheduled invigilation duties from examTimetable
  const myInvigilationShifts = useMemo(() => {
    const teacherId = user?.id || user?.staffId;
    return examTimetable.filter(
      e =>
        e.chiefInvigilatorStaffId === teacherId ||
        e.chiefInvigilatorStaffId === user?.id ||
        (e.chiefInvigilatorName && user?.name && e.chiefInvigilatorName.toLowerCase().includes(user.name.toLowerCase()))
    );
  }, [examTimetable, user]);

  // Compute this teacher's teaching timetable periods across all assigned arms
  const myTeachingPeriods = useMemo(() => {
    const periodsList: { day: string; periodNumber: number; time: string; subject: string; classArm: string; room?: string }[] = [];
    const myArmIds = teacherAllocations.map(a => a.classArmId);
    
    myArmIds.forEach(armId => {
      const armTimetable = weeklyTimetables[armId] || [];
      const armObj = classArms.find(a => a.id === armId);
      const armName = armObj ? (armObj.fullName || armObj.name) : armId;
      
      armTimetable.forEach(daySchedule => {
        daySchedule.periods.forEach(p => {
          const isMySubject = teacherAllocations.some(
            a => a.classArmId === armId && a.subjectName === p.subjectName
          );
          if (isMySubject) {
            periodsList.push({
              day: daySchedule.day,
              periodNumber: p.periodNumber,
              time: p.timeRange || '08:15 - 09:00',
              subject: p.subjectName,
              classArm: armName,
              room: p.roomOrLab || p.room
            });
          }
        });
      });
    });
    return periodsList;
  }, [weeklyTimetables, teacherAllocations, classArms]);

  const [selectedAllocationIdx, setSelectedAllocationIdx] = useState<number>(0);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isQuickMessageOpen, setIsQuickMessageOpen] = useState(false);
  const [messageRecipientRole, setMessageRecipientRole] = useState<'FORM_MASTER' | 'EXAMINATION_OFFICER' | 'VICE_PRINCIPAL_ACADEMICS'>('FORM_MASTER');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');

  const [submissionTarget, setSubmissionTarget] = useState<{
    classArmId: string;
    classArmName: string;
    subjectId: string;
    subjectName: string;
  } | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState(
    'All Continuous Assessment marks, laboratory experiments, and examination scripts have been audited.'
  );
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Compute analytics for each allocated class
  const allocationCards = teacherAllocations.map(alloc => {
    const armStudents = students.filter(s => s.currentClassArmId === alloc.classArmId);
    const armScores = scores.filter(
      s => s.classArmId === alloc.classArmId && s.subjectId === alloc.subjectId && s.termId === activeTerm.id
    );

    const gradedScores = armScores.filter(s => s.total > 0);
    const gradedCount = gradedScores.length;
    const totalCount = armStudents.length;
    const percentage = totalCount > 0 ? Math.round((gradedCount / totalCount) * 100) : 0;

    const totals = gradedScores.map(s => s.total);
    const average = totals.length > 0 ? Number((totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1)) : 0;
    const highest = totals.length > 0 ? Math.max(...totals) : 0;
    const lowest = totals.length > 0 ? Math.min(...totals) : 0;
    const passCount = totals.filter(t => t >= 50).length;
    const passRate = totals.length > 0 ? Math.round((passCount / totals.length) * 100) : 0;

    // Grade breakdown
    const distinctions = gradedScores.filter(s => s.total >= 70).length;
    const credits = gradedScores.filter(s => s.total >= 50 && s.total < 70).length;
    const passes = gradedScores.filter(s => s.total >= 45 && s.total < 50).length;
    const fails = gradedScores.filter(s => s.total < 45).length;

    // Submission status
    const submission = subjectSubmissions.find(
      sub => sub.classArmId === alloc.classArmId && sub.subjectId === alloc.subjectId && sub.termId === activeTerm.id
    );
    const isSubmitted = submission?.status === 'SUBMITTED';

    return {
      ...alloc,
      totalStudents: totalCount,
      gradedCount,
      percentage,
      average,
      highest,
      lowest,
      passRate,
      distinctions,
      credits,
      passes,
      fails,
      isSubmitted,
      submittedAt: submission?.submittedAt,
      submissionComments: submission?.submissionComments
    };
  });

  // Overall stats
  const totalStudentsTaught = allocationCards.reduce((acc, cur) => acc + cur.totalStudents, 0);
  const totalGraded = allocationCards.reduce((acc, cur) => acc + cur.gradedCount, 0);
  const overallCompletionRate = totalStudentsTaught > 0 ? Math.round((totalGraded / totalStudentsTaught) * 100) : 0;

  // Identify students scoring below 50 in teacher's subjects
  const remedialCandidates: {
    student: (typeof students)[0];
    classArmName: string;
    subjectName: string;
    score: (typeof scores)[0];
  }[] = [];

  teacherAllocations.forEach(alloc => {
    const armScores = scores.filter(
      s => s.classArmId === alloc.classArmId && s.subjectId === alloc.subjectId && s.termId === activeTerm.id
    );
    armScores.forEach(sc => {
      if (sc.total > 0 && sc.total < 50) {
        const studentObj = students.find(s => s.id === sc.studentId);
        if (studentObj) {
          remedialCandidates.push({
            student: studentObj,
            classArmName: alloc.classArmName,
            subjectName: alloc.subjectName,
            score: sc
          });
        }
      }
    });
  });

  const handleOpenSubmitModal = (alloc: (typeof teacherAllocations)[0]) => {
    setSubmissionTarget(alloc);
    setIsSubmitModalOpen(true);
  };

  const handleConfirmSubmission = () => {
    if (!submissionTarget) return;

    submitSubjectMarksheet(
      submissionTarget.classArmId,
      submissionTarget.subjectId,
      submissionNotes,
      user ? { id: user.id, name: user.name, role: user.activeRole } : undefined
    );

    setIsSubmitModalOpen(false);
    showToast(
      `${submissionTarget.subjectName} marksheet for ${submissionTarget.classArmName} officially submitted to Form Master & Exam Officer!`
    );
  };

  return (
    <FuturisticPageShell
      title="FACULTY GRADING & ACADEMIC HUB"
      subtitle={`Assigned Specialist: ${user?.name || 'Dr. Michael Adebayo'} (${user?.staffId || 'STF/2026/018'}). Continuous Assessment (40%), Terminal Examination (60%), pedagogical student feedback, and mark sheet submission.`}
      icon={BookOpen}
      badgeText={overallCompletionRate === 100 ? 'All Marksheets Ready' : `${overallCompletionRate}% Graded`}
      badgeVariant={overallCompletionRate === 100 ? 'success' : 'info'}
      actions={
        onNavigateToScores && teacherAllocations.length > 0 ? (
          <button
            onClick={() =>
              onNavigateToScores(
                teacherAllocations[selectedAllocationIdx].classArmId,
                teacherAllocations[selectedAllocationIdx].subjectId
              )
            }
            className="touch-target px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-950/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Open Grade Sheet</span>
          </button>
        ) : undefined
      }
    >
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-cyan-900 text-white text-xs font-bold shadow-2xl flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-cyan-300" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 4 Metric Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <FuturisticKPICard
          title="Teaching Groups"
          value={`${teacherAllocations.length}`}
          subtitle="Senior Secondary Specialist"
          icon={BookOpen}
          sparklineData={[1, 2, 2, 2, 2, teacherAllocations.length]}
          glowColor="cyan"
          trend={{ value: 'Full Load', isPositive: true }}
        />

        <FuturisticKPICard
          title="Enrolled Students"
          value={`${totalStudentsTaught}`}
          subtitle={`Across ${teacherAllocations.length} Class Arms`}
          icon={Users}
          sparklineData={[60, 62, 63, 64, 64, totalStudentsTaught]}
          glowColor="emerald"
          trend={{ value: '100% Active', isPositive: true }}
        />

        <FuturisticKPICard
          title="Grading Completion"
          value={`${overallCompletionRate}%`}
          subtitle={`${totalGraded} of ${totalStudentsTaught} Graded`}
          icon={TrendingUp}
          sparklineData={[15, 30, 48, 62, 80, overallCompletionRate]}
          glowColor="amber"
          trend={{ value: overallCompletionRate === 100 ? 'Complete' : 'In Progress', isPositive: overallCompletionRate >= 80 }}
        />

        <FuturisticKPICard
          title="Remedial Watch"
          value={`${remedialCandidates.length}`}
          subtitle="Scoring Below 50%"
          icon={AlertTriangle}
          sparklineData={[6, 5, 4, 3, 2, remedialCandidates.length]}
          glowColor="rose"
          trend={{ value: `${remedialCandidates.length} Requiring Clinic`, isPositive: remedialCandidates.length === 0 }}
        />
      </div>

      {/* Allocated Classes Assessment Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-cyan-500" />
            <span>My Allocated Teaching Classes ({allocationCards.length})</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Strictly isolated to your authorized subject assignments
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {allocationCards.map((card, idx) => (
            <DoubleBezelCard key={idx} hoverEffect>
              <div className="space-y-5 flex flex-col justify-between h-full">
                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-serif font-bold text-slate-900 dark:text-white">
                        {card.subjectName}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300">
                        {card.classArmName}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Continuous Assessment (40%) + Terminal Exam (60%)
                    </div>
                  </div>

                  {card.isSubmitted ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Submitted</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1.5 border border-amber-200 dark:border-amber-800">
                      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>In Progress ({card.percentage}%)</span>
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Grading Progress</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {card.gradedCount} / {card.totalStudents} Students ({card.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-cyan-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${card.percentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Class Performance Metrics Strip */}
                <div className="grid grid-cols-4 gap-2 py-3 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-center">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Class Avg</div>
                    <div className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                      {card.average}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Highest</div>
                    <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {card.highest}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Lowest</div>
                    <div className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                      {card.lowest}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Pass Rate</div>
                    <div className="text-sm font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
                      {card.passRate}%
                    </div>
                  </div>
                </div>

                {/* Visual Distribution Chart */}
                <BarDistributionChart
                  data={[
                    { label: 'A1 (70+)', value: card.distinctions, color: '#10B981' },
                    { label: 'B-C (50-69)', value: card.credits, color: '#06B6D4' },
                    { label: 'D-E (45-49)', value: card.passes, color: '#F59E0B' },
                    { label: 'F9 (<45)', value: card.fails, color: '#F43F5E' }
                  ]}
                  title="Grade Spectrum"
                  unit=" pupils"
                  height={130}
                />

                {/* Actions Strip */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  {card.isSubmitted ? (
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 italic flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Transmitted to Form Master &amp; Exam Officer</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenSubmitModal(card)}
                      className="touch-target px-4 py-2 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Mark Sheet</span>
                    </button>
                  )}

                  {onNavigateToScores && (
                    <button
                      onClick={() => onNavigateToScores(card.classArmId, card.subjectId)}
                      className="touch-target px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 ml-auto"
                    >
                      <span>Edit Marks Grid</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </DoubleBezelCard>
          ))}
        </div>
      </div>

      {/* Live Operational Duties & Schedules (Timetable & Invigilation) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Class Teaching Schedule */}
        <div className="lg:col-span-6">
          <DoubleBezelCard>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Weekly Class Teaching Periods ({myTeachingPeriods.length})
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                VP Academics Sync
              </span>
            </div>

            {myTeachingPeriods.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No active timetable periods allocated for this week yet.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {myTeachingPeriods.map((period, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
                          {period.day} • Period {period.periodNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {period.subject}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Class: <span className="font-semibold">{period.classArm}</span> {period.room && `• Hall: ${period.room}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-500" />
                        {period.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DoubleBezelCard>
        </div>

        {/* Examination Invigilation Roster */}
        <div className="lg:col-span-6">
          <DoubleBezelCard>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Exam Invigilation Roster ({myInvigilationShifts.length})
                </h3>
              </div>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                Exam Officer Sync
              </span>
            </div>

            {myInvigilationShifts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No active exam invigilation shifts assigned to your profile.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {myInvigilationShifts.map(shift => (
                  <div
                    key={shift.id}
                    className="p-3 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl border border-amber-200/50 dark:border-amber-900/40 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {shift.subjectName} ({shift.subjectCode})
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300">
                        {shift.sessionType}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
                      <span>Date: <strong>{shift.examDate}</strong> • {shift.timeSlot}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Hall: <strong>{shift.examHallName}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DoubleBezelCard>
        </div>
      </div>

      {/* Direct Inter-Role Faculty Communications */}
      <div className="p-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-cyan-500/10 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Direct Role Communications & Coordination
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Instantly transmit verified inquiries or alerts to your Form Master, Exam Officer, or VP Academics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setMessageRecipientRole('FORM_MASTER');
              setMessageSubject(`Form Master Inquiry: ${teacherAllocations[0]?.classArmName || 'Class Arm'}`);
              setMessageContent('Dear Form Master,\n\nRegarding the continuous assessment and pastoral remarks for our arm students...');
              setIsQuickMessageOpen(true);
            }}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition"
          >
            Message Form Master
          </button>
          <button
            onClick={() => {
              setMessageRecipientRole('EXAMINATION_OFFICER');
              setMessageSubject('Exam Duty / Question Packet Clearance');
              setMessageContent('Dear Examination Officer,\n\nRegarding my scheduled invigilation shift in the Examination Hall...');
              setIsQuickMessageOpen(true);
            }}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition"
          >
            Message Exam Officer
          </button>
          <button
            onClick={() => {
              setMessageRecipientRole('VICE_PRINCIPAL_ACADEMICS');
              setMessageSubject('Curriculum Velocity & Lab Practical Report');
              setMessageContent('Good day Mrs. Victoria Okafor,\n\nI would like to brief you on our laboratory experiments schedule...');
              setIsQuickMessageOpen(true);
            }}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition"
          >
            Message VP Academics
          </button>
        </div>
      </div>

      {/* Early Academic Intervention Radar */}
      <DoubleBezelCard>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 mb-4 border-b border-slate-100 dark:border-white/5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Academic Remedial Radar (&lt; 50% in Physics)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pupils scoring below benchmark who require extra lab exercises or referral to VP Academics Clinics
            </p>
          </div>

          <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            {remedialCandidates.length} Students Needing Support
          </span>
        </div>

        {remedialCandidates.length === 0 ? (
          <div className="py-8 text-center text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40 flex flex-col items-center gap-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="font-bold">No students currently in academic deficiency!</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">All graded students are performing at or above the 50% credit threshold.</span>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-6">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="py-3 px-4 sm:px-6">Student</th>
                  <th className="py-3 px-4">Cohort</th>
                  <th className="py-3 px-4">CA1 (10)</th>
                  <th className="py-3 px-4">CA2 (10)</th>
                  <th className="py-3 px-4">Assign (10)</th>
                  <th className="py-3 px-4">Proj (10)</th>
                  <th className="py-3 px-4">Exam (60)</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4 sm:px-6">Intervention Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {remedialCandidates.map((cand, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 sm:px-6 font-bold text-slate-900 dark:text-white">
                      {cand.student.lastName}, {cand.student.firstName}
                      <div className="text-[10px] font-mono text-slate-400">{cand.student.admissionNumber}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {cand.classArmName}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-700 dark:text-slate-300">{cand.score.ca1}</td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-700 dark:text-slate-300">{cand.score.ca2}</td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-700 dark:text-slate-300">{cand.score.assignment}</td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-700 dark:text-slate-300">{cand.score.project}</td>
                    <td className="py-3 px-4 font-mono-tabular font-bold text-rose-600 dark:text-rose-400">{cand.score.exam}</td>
                    <td className="py-3 px-4 font-mono-tabular font-bold text-rose-700 dark:text-rose-400">
                      {cand.score.total}%
                    </td>
                    <td className="py-3 px-4 sm:px-6 text-slate-600 dark:text-slate-400 italic text-[11px]">
                      {cand.score.teacherRemark || 'Needs extra practical revision in vectors and ray optics.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DoubleBezelCard>

      {/* SUBMISSION MODAL */}
      {isSubmitModalOpen && submissionTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-cyan-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Submit {submissionTarget.subjectName} Mark Sheet
                </h3>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-900/60 text-cyan-900 dark:text-cyan-300">
                <div className="font-bold">{submissionTarget.classArmName} • {submissionTarget.subjectName}</div>
                <div className="text-[11px] text-cyan-700 dark:text-cyan-400 mt-0.5">
                  Submitting this mark sheet certifies that all Continuous Assessment and Examination scores have been entered and moderated.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Teacher Verification Remark
                </label>
                <textarea
                  rows={3}
                  value={submissionNotes}
                  onChange={e => setSubmissionNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>
                  The Form Master and Examination Officer will receive immediate notification that your mark sheet is ready for cohort broadsheet collation.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="touch-target px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmission}
                className="touch-target px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm &amp; Transmit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ROLE MESSAGING MODAL */}
      <ModalPortal isOpen={isQuickMessageOpen} onClose={() => setIsQuickMessageOpen(false)} maxWidthClass="max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Dispatch Verified Role Message
              </h3>
            </div>
            <button
              onClick={() => setIsQuickMessageOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
            >
              ✕
            </button>
          </div>

          <form
            onSubmit={e => {
              e.preventDefault();
              if (!messageSubject.trim() || !messageContent.trim()) return;

              let targetRecipientName = 'Form Master';
              if (messageRecipientRole === 'EXAMINATION_OFFICER') targetRecipientName = 'Examination Officer (Mr. Babatunde Sanusi)';
              else if (messageRecipientRole === 'VICE_PRINCIPAL_ACADEMICS') targetRecipientName = 'VP Academics (Mrs. Victoria Okafor)';

              sendMessage({
                threadId: `th-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                senderId: user?.id || user?.staffId || 'teacher-01',
                senderName: user?.name || 'Subject Teacher',
                senderRole: 'TEACHER',
                recipientId: 'ALL',
                recipientName: targetRecipientName,
                recipientRole: messageRecipientRole,
                subject: messageSubject.trim(),
                content: messageContent.trim(),
                priority: 'NORMAL'
              });

              setIsQuickMessageOpen(false);
              setMessageSubject('');
              setMessageContent('');
              showToast(`Message successfully delivered to ${targetRecipientName}!`);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Recipient Role
              </label>
              <select
                value={messageRecipientRole}
                onChange={e => setMessageRecipientRole(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="FORM_MASTER">Form Master (Pastoral / Broadsheet)</option>
                <option value="EXAMINATION_OFFICER">Examination Officer (Invigilation / Packets)</option>
                <option value="VICE_PRINCIPAL_ACADEMICS">Vice Principal Academics (Instruction / Labs)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subject Line
              </label>
              <input
                type="text"
                required
                value={messageSubject}
                onChange={e => setMessageSubject(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Message Body
              </label>
              <textarea
                required
                rows={4}
                value={messageContent}
                onChange={e => setMessageContent(e.target.value)}
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsQuickMessageOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transmit Message</span>
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>
    </FuturisticPageShell>
  );
};
