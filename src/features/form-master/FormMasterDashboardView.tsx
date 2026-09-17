import React, { useState, useMemo } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Users,
  CalendarCheck,
  BookOpen,
  HeartPulse,
  CheckCircle2,
  Clock,
  Send,
  PlusCircle,
  Stamp,
  Activity,
  AlertCircle,
  Phone,
  Droplet,
  MessageSquare,
  Award,
  TrendingUp,
  TrendingDown,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  ChevronRight
} from 'lucide-react';
import type { PastoralLogCategory } from '../../types';

import { FuturisticPageShell } from '../../components/common/FuturisticPageShell';
import { getWelcomeMessage } from '../../lib/userDisplay';
import { FuturisticKPICard } from '../../components/common/FuturisticKPICard';
import { DoubleBezelCard } from '../../components/common/DoubleBezelCard';
import { SegmentedControl, SegmentedControlOption } from '../../components/common/SegmentedControl';
import { RadialGauge } from '../../components/common/ChartComponents';
import { ModalPortal } from '../../components/common/ModalPortal';

interface FormMasterDashboardViewProps {
  onNavigateToScores?: (armId?: string, subjectId?: string) => void;
  onNavigateView?: (view: string, studentId?: string) => void;
}

export const FormMasterDashboardView: React.FC<FormMasterDashboardViewProps> = ({
  onNavigateToScores,
  onNavigateView
}) => {
  const {
    classArms,
    students,
    subjects,
    allocations,
    scores,
    staff,
    activeTerm,
    affectiveTraits,
    pastoralLogs,
    armEndorsements,
    addPastoralLog,
    endorseClassArm,
    nudgeDefaultingTeachers,
    sendMessage
  } = useSchoolData();

  const { user } = useAuth();

  // Scope to Form Master's assigned arm dynamically
  const designatedArmId = user?.formMasterArmId || classArms.find(a => a.formMasterId === user?.id)?.id || 'arm-sss2-gold';
  const currentArm = classArms.find(a => a.id === designatedArmId) || classArms.find(a => a.formMasterId === user?.id) || classArms[0];
  const armStudents = useMemo(() => students.filter(s => s.currentClassArmId === currentArm.id), [students, currentArm.id]);

  // Determine subjects taught by the Form Master in this arm
  const myTaughtAllocations = useMemo(() => {
    return allocations.filter(
      a => a.classArmId === currentArm.id && (
        a.teacherId === user?.id ||
        a.teacherId === user?.staffId ||
        (a.teacherName && user?.name && a.teacherName.toLowerCase() === user.name.toLowerCase())
      )
    );
  }, [allocations, currentArm.id, user]);

  const myTaughtSubjectIds = useMemo(() => myTaughtAllocations.map(a => a.subjectId), [myTaughtAllocations]);
  const myTaughtSubjectNames = useMemo(() => myTaughtAllocations.map(a => a.subjectName).join(', ') || 'Physics', [myTaughtAllocations]);

  const [activeTab, setActiveTab] = useState<'performance' | 'students' | 'support' | 'compliance' | 'pastoral' | 'endorsement'>('performance');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [isPastoralModalOpen, setIsPastoralModalOpen] = useState(false);
  const [isEndorseModalOpen, setIsEndorseModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // New Pastoral Log Form State
  const [logStudentId, setLogStudentId] = useState(armStudents[0]?.id || '');
  const [logCategory, setLogCategory] = useState<PastoralLogCategory>('WELFARE');
  const [logNote, setLogNote] = useState('');
  const [logAction, setLogAction] = useState('');

  // Endorsement Form State
  const [endorsementComments, setEndorsementComments] = useState(
    'All Continuous Assessment marks, examination scores, affective ratings, and statutory attendance numbers have been thoroughly audited and verified.'
  );

  // Inter-Role Direct Message State
  const [isDirectMessageOpen, setIsDirectMessageOpen] = useState(false);
  const [directRecipientRole, setDirectRecipientRole] = useState<'VICE_PRINCIPAL_ACADEMICS' | 'EXAMINATION_OFFICER' | 'PRINCIPAL'>('VICE_PRINCIPAL_ACADEMICS');
  const [directSubject, setDirectSubject] = useState('');
  const [directContent, setDirectContent] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Demographics
  const maleCount = armStudents.filter(s => s.gender === 'MALE').length;
  const femaleCount = armStudents.filter(s => s.gender === 'FEMALE').length;

  // Arm Endorsement state
  const currentEndorsement = armEndorsements.find(
    e => e.classArmId === currentArm.id && e.termId === activeTerm.id
  );
  const isEndorsed = currentEndorsement?.isEndorsed || false;

  // Filtered pastoral logs for this arm
  const armPastoralLogs = pastoralLogs.filter(l => l.classArmId === currentArm.id);
  const displayedLogs = selectedCategoryFilter === 'ALL'
    ? armPastoralLogs
    : armPastoralLogs.filter(l => l.category === selectedCategoryFilter);

  // Scores in this arm
  const armScores = useMemo(() => {
    return scores.filter(s => s.classArmId === currentArm.id && s.termId === activeTerm.id);
  }, [scores, currentArm.id, activeTerm.id]);

  // Subjects taught in this arm
  const activeSubjectIds = Array.from(new Set(armScores.map(s => s.subjectId)));
  const relevantSubjects = useMemo(() => {
    return subjects.filter(s => activeSubjectIds.includes(s.id) || s.category === 'CORE');
  }, [subjects, activeSubjectIds]);

  // Calculate Student Performance Stats
  const studentsWithStats = useMemo(() => {
    return armStudents.map(st => {
      const studentScores = armScores.filter(s => s.studentId === st.id);
      const totalScoreSum = studentScores.reduce((acc, s) => acc + s.total, 0);
      const average = studentScores.length > 0 ? Math.round((totalScoreSum / studentScores.length) * 10) / 10 : 0;
      
      const traits = affectiveTraits.find(t => t.studentId === st.id && t.termId === activeTerm.id);
      const daysPresent = traits ? traits.daysPresent : 64;

      // Check failing subjects (< 40)
      const failingSubjects = studentScores.filter(s => s.total < 40).map(s => {
        const subj = subjects.find(sub => sub.id === s.subjectId);
        return { name: subj?.name || 'Subject', score: s.total };
      });

      const isHonors = average >= 75;
      const needsSupport = (average > 0 && average < 50) || failingSubjects.length > 0;

      return {
        student: st,
        scoresCount: studentScores.length,
        average,
        daysPresent,
        failingSubjects,
        isHonors,
        needsSupport
      };
    }).sort((a, b) => b.average - a.average);
  }, [armStudents, armScores, affectiveTraits, activeTerm.id, subjects]);

  const honorsStudents = useMemo(() => studentsWithStats.filter(s => s.isHonors), [studentsWithStats]);
  const supportStudents = useMemo(() => studentsWithStats.filter(s => s.needsSupport), [studentsWithStats]);

  const classTotalAvg = useMemo(() => {
    const valid = studentsWithStats.filter(s => s.average > 0);
    if (valid.length === 0) return 0;
    return Math.round((valid.reduce((acc, s) => acc + s.average, 0) / valid.length) * 10) / 10;
  }, [studentsWithStats]);

  // Build subject compliance list & averages
  const subjectCompliance = useMemo(() => {
    return relevantSubjects.map(subj => {
      const alloc = allocations.find(
        a => a.classArmId === currentArm.id && a.subjectId === subj.id
      );
      const subjScores = armScores.filter(s => s.subjectId === subj.id);
      const completedCount = subjScores.filter(s => s.total > 0).length;
      const isComplete = completedCount >= armStudents.length && armStudents.length > 0;

      const scoreSum = subjScores.reduce((acc, s) => acc + s.total, 0);
      const averageScore = subjScores.length > 0 ? Math.round(scoreSum / subjScores.length) : 0;
      const passCount = subjScores.filter(s => s.total >= 50).length;
      const passRate = subjScores.length > 0 ? Math.round((passCount / subjScores.length) * 100) : 0;

      const isTaughtByMe = myTaughtSubjectIds.includes(subj.id);

      return {
        subject: subj,
        teacherId: alloc ? alloc.teacherId : 'stf-002',
        teacherName: alloc ? alloc.teacherName : 'Unallocated Faculty',
        teacherEmail: alloc ? `${alloc.teacherName.toLowerCase().replace(/[^a-z]/g, '.')}@everest.sch.ng` : '',
        completedCount,
        totalExpected: armStudents.length,
        isComplete,
        percentage: armStudents.length > 0 ? Math.round((completedCount / armStudents.length) * 100) : 0,
        averageScore,
        passRate,
        isTaughtByMe
      };
    });
  }, [relevantSubjects, allocations, currentArm.id, armScores, armStudents.length, myTaughtSubjectIds]);

  const completedSubjectsCount = subjectCompliance.filter(s => s.isComplete).length;
  const totalSubjectsCount = subjectCompliance.length;
  const compliancePercentage = totalSubjectsCount > 0
    ? Math.round((completedSubjectsCount / totalSubjectsCount) * 100)
    : 100;

  // Handle Log Save
  const handleSavePastoralLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logNote.trim()) return;

    const studentObj = armStudents.find(s => s.id === logStudentId);
    if (!studentObj) return;

    addPastoralLog(
      {
        studentId: studentObj.id,
        studentName: `${studentObj.lastName}, ${studentObj.firstName}`,
        admissionNumber: studentObj.admissionNumber,
        classArmId: currentArm.id,
        date: new Date().toISOString().split('T')[0],
        category: logCategory,
        note: logNote.trim(),
        actionTaken: logAction.trim() || undefined,
        recordedBy: user?.staffId || 'STF/2026/018',
        recordedByName: user?.name || 'Dr. Michael Adebayo'
      },
      user ? { id: user.id, name: user.name, role: user.activeRole } : undefined
    );

    setIsPastoralModalOpen(false);
    setLogNote('');
    setLogAction('');
    showToast(`Pastoral record successfully added for ${studentObj.firstName}!`);
  };

  // Handle Endorsement
  const handleConfirmEndorsement = () => {
    endorseClassArm(
      currentArm.id,
      endorsementComments,
      user ? { id: user.id, name: user.name, role: user.activeRole } : undefined
    );

    sendMessage({
      threadId: `th-fm-endorse-${currentArm.id}-${Date.now()}`,
      senderId: user?.id || user?.staffId || 'stf-fm',
      senderName: user?.name || 'Dr. Michael Adebayo',
      senderRole: 'FORM_MASTER',
      recipientId: 'stf-002',
      recipientName: 'Examination Council',
      recipientRole: 'EXAMINATION_OFFICER',
      subject: `Terminal Broadsheet Endorsement: ${currentArm.fullName}`,
      content: `The Form Master for ${currentArm.fullName} has certified and officially endorsed the terminal broadsheet collation. All marks, affective ratings, and statutory attendance numbers are verified and transmitted for Examination Council sealing.`,
      priority: 'OFFICIAL_DIRECTIVE',
      relatedEntity: { type: 'BROADSHEET', id: currentArm.id }
    });

    setIsEndorseModalOpen(false);
    showToast(`${currentArm.fullName} terminal results officially endorsed and transmitted to Exam Officer!`);
  };

  // Handle Nudge
  const handleNudgeTeacher = (subjectName: string, teacherName: string, teacherId?: string) => {
    nudgeDefaultingTeachers(
      currentArm.id,
      subjectName,
      user ? { id: user.id, name: user.name, role: user.activeRole } : undefined
    );

    sendMessage({
      threadId: `th-fm-nudge-${currentArm.id}-${Date.now()}`,
      senderId: user?.id || user?.staffId || 'stf-fm',
      senderName: user?.name || 'Dr. Michael Adebayo',
      senderRole: 'FORM_MASTER',
      recipientId: teacherId || 'stf-002',
      recipientName: teacherName,
      recipientRole: 'TEACHER',
      subject: `URGENT: Outstanding Marksheet Submission for ${subjectName} (${currentArm.fullName})`,
      content: `Broadsheet collation notice from ${user?.name || 'Form Master'}: Continuous assessment and exam scores for ${subjectName} in ${currentArm.fullName} are still incomplete. Please submit immediately to enable statutory broadsheet endorsement.`,
      priority: 'URGENT',
      relatedEntity: { type: 'BROADSHEET', id: currentArm.id }
    });

    showToast(`Marks entry reminder alert dispatched to ${teacherName} for ${subjectName}!`);
  };

  const handleSendDirectMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directSubject.trim() || !directContent.trim()) return;

    setIsSendingMessage(true);

    let recId = 'stf-003';
    let recName = 'Mrs. Victoria Okafor';
    if (directRecipientRole === 'PRINCIPAL') {
      const p = staff.find(s => s.role === 'PRINCIPAL');
      recId = p ? p.id : 'stf-001';
      recName = p ? p.name : 'Dr. Michael Adebayo';
    } else if (directRecipientRole === 'EXAMINATION_OFFICER') {
      const eo = staff.find(s => s.role === 'EXAMINATION_OFFICER');
      recId = eo ? eo.id : 'stf-002';
      recName = eo ? eo.name : 'Examination Council';
    } else {
      const vp = staff.find(s => s.role === 'VICE_PRINCIPAL_ACADEMICS');
      recId = vp ? vp.id : 'stf-003';
      recName = vp ? vp.name : 'Mrs. Victoria Okafor';
    }

    sendMessage({
      threadId: `th-fm-admin-${Date.now()}`,
      senderId: user?.id || user?.staffId || 'stf-fm',
      senderName: user?.name || 'Dr. Michael Adebayo',
      senderRole: 'FORM_MASTER',
      recipientId: recId,
      recipientName: recName,
      recipientRole: directRecipientRole,
      subject: directSubject.trim(),
      content: directContent.trim(),
      priority: 'NORMAL',
      relatedEntity: { type: 'BROADSHEET', id: currentArm.id }
    });

    setIsSendingMessage(false);
    setIsDirectMessageOpen(false);
    setDirectSubject('');
    setDirectContent('');
    showToast(`Direct message transmitted to ${recName}!`);
  };

  const tabs: SegmentedControlOption<'performance' | 'students' | 'support' | 'compliance' | 'pastoral' | 'endorsement'>[] = [
    { id: 'performance', label: 'Class Performance', icon: Activity },
    { id: 'students', label: 'Class Students', icon: Users, count: armStudents.length },
    { id: 'support', label: 'Students Needing Support', icon: AlertCircle, count: supportStudents.length },
    { id: 'compliance', label: 'Subject Marksheets', icon: BookOpen, badge: `${completedSubjectsCount}/${totalSubjectsCount}` },
    { id: 'pastoral', label: 'Pastoral & Welfare', icon: HeartPulse, count: armPastoralLogs.length },
    { id: 'endorsement', label: 'Reports & Sign-Off', icon: Stamp, badge: isEndorsed ? 'Signed' : 'Pending' }
  ];

  return (
    <FuturisticPageShell
      title={`${currentArm.fullName} — Form Teacher Dashboard`}
      subtitle={`${getWelcomeMessage(user?.name || 'Form Teacher')}. Managing class performance, attendance, subject marks, and pastoral care for ${armStudents.length} students in ${currentArm.fullName}.`}
      icon={ShieldCheck}
      badgeText={isEndorsed ? 'Broadsheet Endorsed' : 'Collation In Progress'}
      badgeVariant={isEndorsed ? 'success' : 'warning'}
      actions={
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Enter Marks for Form Teacher's own assigned subjects */}
          {myTaughtAllocations.length > 0 && (
            <button
              onClick={() => {
                if (onNavigateToScores) {
                  onNavigateToScores(currentArm.id, myTaughtAllocations[0].subjectId);
                } else if (onNavigateView) {
                  onNavigateView('score-entry');
                }
              }}
              className="touch-target px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              title={`Enter marks for ${myTaughtSubjectNames} in ${currentArm.fullName}`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Enter Marks ({myTaughtSubjectNames})</span>
            </button>
          )}

          {/* Direct link to Class Broadsheet */}
          <button
            onClick={() => onNavigateView?.('master-broadsheet')}
            className="touch-target px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Class Broadsheet</span>
          </button>

          {/* Direct link to Report Cards */}
          <button
            onClick={() => onNavigateView?.('report-card')}
            className="touch-target px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <FileText className="w-4 h-4 text-blue-500" />
            <span>Report Cards</span>
          </button>

          {/* Direct Message to VP/Admin */}
          <button
            onClick={() => setIsDirectMessageOpen(true)}
            className="touch-target px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <MessageSquare className="w-4 h-4 text-amber-500" />
            <span>Message VP</span>
          </button>
        </div>
      }
    >
      {/* Toast */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-emerald-900 text-white text-xs font-bold shadow-2xl flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 4 Clear Summary Cards for Form Teacher */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <FuturisticKPICard
          title="Number of Students"
          value={`${armStudents.length}`}
          subtitle={`${maleCount} Boys • ${femaleCount} Girls`}
          icon={Users}
          sparklineData={[28, 29, 30, 30, 31, armStudents.length]}
          glowColor="emerald"
          trend={{ value: '100% Enrolled', isPositive: true }}
        />

        <FuturisticKPICard
          title="Class Average"
          value={`${classTotalAvg}%`}
          subtitle="Overall Cohort Score"
          icon={TrendingUp}
          sparklineData={[65, 68, 67, 70, 72, classTotalAvg]}
          glowColor="cyan"
          trend={{ value: classTotalAvg >= 60 ? 'Above Target' : 'Target: 60%', isPositive: classTotalAvg >= 60 }}
        />

        <FuturisticKPICard
          title="Students Performing Well"
          value={`${honorsStudents.length}`}
          subtitle="Average 75% or Higher"
          icon={Award}
          sparklineData={[3, 4, 4, 5, 5, honorsStudents.length]}
          glowColor="indigo"
          trend={{ value: `${Math.round((honorsStudents.length / (armStudents.length || 1)) * 100)}% of class`, isPositive: true }}
        />

        <FuturisticKPICard
          title="Students Needing Support"
          value={`${supportStudents.length}`}
          subtitle="Average Below 50% / Deficits"
          icon={AlertCircle}
          sparklineData={[4, 3, 3, 2, 2, supportStudents.length]}
          glowColor="amber"
          trend={{ value: `${supportStudents.length} for academic intervention`, isPositive: supportStudents.length === 0 }}
        />
      </div>

      {/* Interactive Tabs */}
      <SegmentedControl
        options={tabs}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* TAB 1: CLASS PERFORMANCE */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Class Overview HUD Banner */}
          <DoubleBezelCard>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {currentArm.fullName} — Academic Performance &amp; Attendance
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Real-time academic summary calculated by system grading rules across all subjects.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigateView?.('master-broadsheet')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Full Broadsheet</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="flex items-center justify-around p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50">
                <RadialGauge
                  percentage={98.2}
                  label="Attendance"
                  color="#10B981"
                  glowColor="rgba(16, 185, 129, 0.4)"
                  size={100}
                />
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Statutory 65 Days</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Class Average: 64 days present</div>
                  <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Meeting requirements ✓</div>
                </div>
              </div>

              <div className="flex items-center justify-around p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50">
                <RadialGauge
                  percentage={compliancePercentage}
                  label="Marksheets"
                  color="#F59E0B"
                  glowColor="rgba(245, 158, 11, 0.4)"
                  size={100}
                />
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{completedSubjectsCount} of {totalSubjectsCount} Submitted</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">CA + Exam Entries</div>
                  <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    {compliancePercentage === 100 ? 'Ready for Broadsheet Sign-Off' : 'Awaiting Remaining Marks'}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Class Average:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{classTotalAvg}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Honors Pupils (&ge; 75%):</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{honorsStudents.length} Students</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Academic Support Needed:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{supportStudents.length} Students</span>
                </div>
              </div>
            </div>
          </DoubleBezelCard>

          {/* Subject Performance Breakdown Table */}
          <DoubleBezelCard>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-white/5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <span>Subject Performance Overview</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Performance and marksheet submission status across all subjects taken by {currentArm.fullName}.
                </p>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                You teach: <strong className="text-emerald-600 dark:text-emerald-400">{myTaughtSubjectNames}</strong>
              </div>
            </div>

            <div className="overflow-x-auto -mx-4 sm:-mx-6">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="py-3 px-4 sm:px-6">Subject</th>
                    <th className="py-3 px-4">Teacher</th>
                    <th className="py-3 px-4">Your Role</th>
                    <th className="py-3 px-4">Graded Students</th>
                    <th className="py-3 px-4">Subject Average</th>
                    <th className="py-3 px-4">Pass Rate (&ge;50%)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {subjectCompliance.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 sm:px-6 font-bold text-slate-900 dark:text-white">
                        {item.subject.name}
                        <span className="ml-1.5 font-mono text-[10px] text-slate-400">({item.subject.code})</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{item.teacherName}</div>
                      </td>
                      <td className="py-3 px-4">
                        {item.isTaughtByMe ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            Assigned Teacher (Editable)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            View Only
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular">
                        <span className="text-slate-900 dark:text-slate-100">{item.completedCount} / {item.totalExpected}</span>
                      </td>
                      <td className="py-3 px-4 font-bold font-mono text-slate-800 dark:text-slate-200">
                        {item.averageScore > 0 ? `${item.averageScore}%` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {item.averageScore > 0 ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.passRate >= 70
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : item.passRate >= 50
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}>
                            {item.passRate}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.isComplete ? (
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Submitted</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>Incomplete</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 sm:px-6 text-right">
                        {item.isTaughtByMe ? (
                          <button
                            onClick={() => {
                              if (onNavigateToScores) {
                                onNavigateToScores(currentArm.id, item.subject.id);
                              } else if (onNavigateView) {
                                onNavigateView('score-entry');
                              }
                            }}
                            className="touch-target px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Enter Marks</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onNavigateView?.('score-entry')}
                            className="touch-target px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
                            title="View marks for this subject (read-only for Form Master)"
                          >
                            <Eye className="w-3 h-3 text-slate-500" />
                            <span>View Marks</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DoubleBezelCard>

          {/* Individual Student Performance Table */}
          <DoubleBezelCard>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-white/5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span>Student Performance &amp; Rankings</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Individual student term averages and standing calculated from current database scores.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigateView?.('report-card')}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold flex items-center gap-1.5 hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View All Report Cards</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto -mx-4 sm:-mx-6">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="py-3 px-4 sm:px-6">Rank</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Admission No.</th>
                    <th className="py-3 px-4">Gender</th>
                    <th className="py-3 px-4">Subjects Graded</th>
                    <th className="py-3 px-4">Term Average</th>
                    <th className="py-3 px-4">Academic Standing</th>
                    <th className="py-3 px-4">Attendance</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Report Card</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {studentsWithStats.map((item, idx) => {
                    const st = item.student;
                    return (
                      <tr key={st.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 sm:px-6 font-mono font-bold text-slate-500">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={st.passportPhotoUrl}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                            <span className="font-bold text-slate-900 dark:text-white">
                              {st.lastName}, {st.firstName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {st.admissionNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {st.gender === 'MALE' ? 'Male' : 'Female'}
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-slate-700 dark:text-slate-300">
                          {item.scoresCount} Subjects
                        </td>
                        <td className="py-3 px-4 font-bold font-mono text-sm text-slate-900 dark:text-white">
                          {item.average > 0 ? `${item.average}%` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          {item.isHonors ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
                              Honors (&ge;75%)
                            </span>
                          ) : item.needsSupport ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                              Needs Support
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              Good Standing
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-slate-600 dark:text-slate-400">
                          {item.daysPresent}/65 Days
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-right">
                          <button
                            onClick={() => onNavigateView?.('report-card', item.student.id)}
                            className="touch-target px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3 h-3 text-blue-500" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </DoubleBezelCard>
        </div>
      )}

      {/* TAB 2: CLASS STUDENTS ROSTER */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {armStudents.map(st => {
              const ap = affectiveTraits.find(
                t => t.studentId === st.id && t.termId === activeTerm.id
              );
              const studentLogs = armPastoralLogs.filter(l => l.studentId === st.id);
              const stat = studentsWithStats.find(s => s.student.id === st.id);

              return (
                <div
                  key={st.id}
                  className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start gap-3.5">
                    <img
                      src={st.passportPhotoUrl}
                      alt=""
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-500/30 shadow-xs shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {st.lastName}, {st.firstName}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                          {st.gender === 'MALE' ? 'Male' : 'Female'}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate">
                        {st.admissionNumber}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        DOB: {st.dateOfBirth}
                      </div>
                    </div>
                  </div>

                  {/* Academic Average & Standing */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-bold uppercase">Term Average</span>
                      <span className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                        {stat && stat.average > 0 ? `${stat.average}%` : '—'}
                      </span>
                    </div>
                    <div>
                      {stat?.isHonors ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                          Honors
                        </span>
                      ) : stat?.needsSupport ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          Needs Support
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Good Standing
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bio & Health Tags */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>Guardian</span>
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                        {st.parentPhone || '+234 802 333 4444'}
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <Droplet className="w-3 h-3 text-rose-400" />
                        <span>Blood / Genotype</span>
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {st.bloodGroup || 'O+'} • {st.genotype || 'AA'}
                      </div>
                    </div>
                  </div>

                  {/* Attendance & Pastoral Quick Stat */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-1.5">
                      <CalendarCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                        Present: <strong className="text-slate-900 dark:text-white">{ap ? ap.daysPresent : 64}/65</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-rose-500" />
                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                        Welfare Logs: <strong className="text-slate-900 dark:text-white">{studentLogs.length}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        setLogStudentId(st.id);
                        setIsPastoralModalOpen(true);
                      }}
                      className="touch-target py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Pastoral Note</span>
                    </button>
                    <button
                      onClick={() => onNavigateView?.('report-card', st.id)}
                      className="touch-target py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-800 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      <span>Report Card</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: STUDENTS NEEDING SUPPORT */}
      {activeTab === 'support' && (
        <div className="space-y-6">
          <DoubleBezelCard>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-white/5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>Academic Support &amp; Intervention Monitoring</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Students in {currentArm.fullName} performing below 50% or recording low marks in specific subjects.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                {supportStudents.length} Students Requiring Attention
              </span>
            </div>

            {supportStudents.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-slate-700 dark:text-slate-300">All students are currently in good academic standing!</p>
                <p className="text-[11px] text-slate-400 mt-1">No pupils in {currentArm.fullName} have averages below 50% or failing marks.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {supportStudents.map(item => {
                  const st = item.student;
                  return (
                    <div
                      key={st.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/40 shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={st.passportPhotoUrl}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover border border-amber-400/40 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                {st.lastName}, {st.firstName}
                              </h4>
                              <span className="font-mono text-[11px] text-slate-400">({st.admissionNumber})</span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Guardian: {st.parentPhone || '+234 802 333 4444'} • Attendance: {item.daysPresent}/65 Days
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Average</span>
                            <span className="font-mono font-bold text-base text-amber-600 dark:text-amber-400">
                              {item.average > 0 ? `${item.average}%` : 'Pending'}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setLogStudentId(st.id);
                              setLogCategory('WELFARE');
                              setLogNote(`Academic Support Plan initiated: Student requires targeted tutoring in ${item.failingSubjects.map(s => s.name).join(', ') || 'core subjects'}.`);
                              setIsPastoralModalOpen(true);
                            }}
                            className="touch-target px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Log Support Plan</span>
                          </button>
                        </div>
                      </div>

                      {/* Subject Deficits */}
                      {item.failingSubjects.length > 0 && (
                        <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40 text-xs space-y-1">
                          <span className="font-bold text-amber-800 dark:text-amber-300 text-[11px]">
                            Specific Subject Deficits (Score &lt; 40%):
                          </span>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {item.failingSubjects.map((sub, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                              >
                                {sub.name}: {sub.score}%
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </DoubleBezelCard>
        </div>
      )}

      {/* TAB 4: SUBJECT MARKSHEETS (COMPLIANCE) */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          {/* Info Banner about Form Master vs Subject Teacher Permissions */}
          <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <span className="font-bold block text-sm">Form Teacher &amp; Subject Teacher Permission Boundary</span>
              <p className="text-slate-600 dark:text-slate-300">
                As Form Teacher of <strong>{currentArm.fullName}</strong>, you can enter marks for the subjects you teach ({myTaughtSubjectNames}). For all other subjects, marks are entered and modified by their assigned subject teachers, and you monitor their completion here before terminal sign-off.
              </p>
            </div>
          </div>

          <DoubleBezelCard>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-white/5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <span>Subject Marksheet Submission Compliance</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Track mark sheet entry progress across all subjects taken by {currentArm.fullName} before broadsheet closure
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Completion:</span>
                <div className="w-28 sm:w-36 bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${compliancePercentage}%` }}
                  ></div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {compliancePercentage}%
                </span>
              </div>
            </div>

            <div className="overflow-x-auto -mx-4 sm:-mx-6">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="py-3 px-4 sm:px-6">Subject</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Assigned Subject Teacher</th>
                    <th className="py-3 px-4">Scores Graded</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {subjectCompliance.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 sm:px-6 font-bold text-slate-900 dark:text-white">
                        {item.subject.name}
                        <span className="ml-1.5 font-mono text-[10px] text-slate-400">({item.subject.code})</span>
                        {item.isTaughtByMe && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Your Subject
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {item.subject.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{item.teacherName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.teacherEmail || 'faculty@everest.sch.ng'}</div>
                      </td>
                      <td className="py-3 px-4 font-mono-tabular">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-900 dark:text-slate-100">{item.completedCount} / {item.totalExpected}</span>
                          <span className="text-[10px] text-slate-400">({item.percentage}%)</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {item.isComplete ? (
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Submitted &amp; Graded</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>Incomplete Entry</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 sm:px-6 text-right">
                        {item.isTaughtByMe ? (
                          <button
                            onClick={() => {
                              if (onNavigateToScores) {
                                onNavigateToScores(currentArm.id, item.subject.id);
                              } else if (onNavigateView) {
                                onNavigateView('score-entry');
                              }
                            }}
                            className="touch-target px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Enter Marks</span>
                          </button>
                        ) : item.isComplete ? (
                          <button
                            onClick={() => onNavigateView?.('score-entry')}
                            className="touch-target px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-slate-500" />
                            <span>View Marks</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleNudgeTeacher(item.subject.name, item.teacherName, item.teacherId)}
                            className="touch-target px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <Send className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>Nudge Teacher</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DoubleBezelCard>
        </div>
      )}

      {/* TAB 5: PASTORAL & WELFARE */}
      {activeTab === 'pastoral' && (
        <div className="space-y-6">
          <DoubleBezelCard>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-white/5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-rose-500" />
                  <span>Homeroom Pastoral &amp; Welfare Activity Diary</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Official historical diary of health observations, parent communications, and student welfare notices
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsPastoralModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Log Note</span>
                </button>

                <div className="flex flex-wrap items-center gap-1">
                  {['ALL', 'HEALTH', 'WELFARE', 'CONDUCT', 'PARENT_COMMUNICATION', 'UNIFORM'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        selectedCategoryFilter === cat
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {cat.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {displayedLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No pastoral welfare logs found for this filter criteria.
              </div>
            ) : (
              <div className="space-y-3">
                {displayedLogs.map(log => {
                  const badgeColor =
                    log.category === 'HEALTH'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                      : log.category === 'PARENT_COMMUNICATION'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900'
                      : log.category === 'CONDUCT'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';

                  return (
                    <div
                      key={log.id}
                      className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">{log.studentName}</span>
                          <span className="font-mono text-[10px] text-slate-400">({log.admissionNumber})</span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border uppercase ${badgeColor}`}>
                            {log.category.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-400">{log.date}</span>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                        {log.note}
                      </p>

                      {log.actionTaken && (
                        <div className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-lg p-2.5 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                          <span><strong>Action / Resolution:</strong> {log.actionTaken}</span>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span>Recorded by: {log.recordedByName}</span>
                        <span className="italic">Signed into EMIS Pastoral Records</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DoubleBezelCard>
        </div>
      )}

      {/* TAB 6: REPORTS & SIGN-OFF (ENDORSEMENT) */}
      {activeTab === 'endorsement' && (
        <div className="space-y-6">
          {/* Automated Workflow Card */}
          <div className="p-5 rounded-2xl bg-linear-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border border-emerald-200/80 dark:border-emerald-900/40 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Automated Academic Report Workflow</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Subject Teachers enter marks &rarr; System automatically calculates totals, grades, and positions &rarr; Results are combined into terminal broadsheets &rarr; Form Teacher certifies and signs off &rarr; Student Report Cards are generated and published.
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                onClick={() => onNavigateView?.('report-card')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Open Class Report Cards</span>
              </button>
              <button
                onClick={() => onNavigateView?.('master-broadsheet')}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                <span>Open Class Broadsheet</span>
              </button>
            </div>
          </div>

          <DoubleBezelCard>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 mb-4 border-b border-slate-100 dark:border-white/5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Stamp className="w-4 h-4 text-amber-500" />
                  <span>Class Broadsheet Endorsement &amp; Verification</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Form Teacher’s official sign-off certifying result accuracy prior to Examination Officer sealing
                </p>
              </div>

              {isEndorsed ? (
                <div className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <Stamp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Officially Endorsed by {currentEndorsement?.endorsedByName}</span>
                </div>
              ) : (
                <button
                  onClick={() => setIsEndorseModalOpen(true)}
                  className="touch-target px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Stamp className="w-4 h-4" />
                  <span>Sign &amp; Endorse Class Arm</span>
                </button>
              )}
            </div>

            <div className="space-y-6">
              {/* Checklist of Collation Integrity */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">1. Marksheet Submissions</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {completedSubjectsCount} of {totalSubjectsCount} subjects verified.
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">2. Statutory Attendance</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    All 65 days accounted for across all {armStudents.length} pupils.
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">3. Affective &amp; Psychomotor</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Form Master remarks &amp; behavioral traits logged.
                  </div>
                </div>
              </div>

              {/* Endorsement Certificate Card */}
              <div className="p-6 rounded-2xl bg-linear-to-br from-amber-50/70 via-white to-emerald-50/60 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-800 border border-amber-200/80 dark:border-amber-500/20 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Form Teacher Endorsement Certificate
                    </span>
                    <h4 className="text-base font-serif font-bold text-slate-900 dark:text-white">
                      Terminal Result Verification for {currentArm.fullName}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl italic">
                      "{currentEndorsement?.generalComments || endorsementComments}"
                    </p>
                  </div>

                  <div className="sm:text-right space-y-1 shrink-0">
                    <div className="text-[10px] text-slate-400 font-mono">
                      {currentEndorsement?.endorsedAt ? new Date(currentEndorsement.endorsedAt).toLocaleDateString() : 'Pending Sign-Off'}
                    </div>
                    <div className="font-serif italic text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-400 dark:border-slate-600 pb-0.5">
                      {currentEndorsement?.formMasterSignature || user?.name || 'Dr. Michael Adebayo'}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Form Teacher Digital Seal</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-amber-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span>Transmitted to: <strong className="text-slate-900 dark:text-slate-200">Mr. Samuel Danjuma (Examination Officer)</strong></span>
                  <span>Executive Reviewer: <strong className="text-slate-900 dark:text-slate-200">Dr. Mrs. A. O. Adeleke (Principal)</strong></span>
                </div>
              </div>
            </div>
          </DoubleBezelCard>
        </div>
      )}

      {/* MODAL: LOG PASTORAL WELFARE NOTE */}
      {isPastoralModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Log Pastoral Welfare Note</h3>
              </div>
              <button
                onClick={() => setIsPastoralModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePastoralLog} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Select Student</label>
                <select
                  value={logStudentId}
                  onChange={e => setLogStudentId(e.target.value)}
                  className="touch-target w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                >
                  {armStudents.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.lastName}, {st.firstName} ({st.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select
                  value={logCategory}
                  onChange={e => setLogCategory(e.target.value as PastoralLogCategory)}
                  className="touch-target w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="WELFARE">General Welfare &amp; Wellbeing</option>
                  <option value="HEALTH">Health &amp; Clinic Observation</option>
                  <option value="PARENT_COMMUNICATION">Parent / Guardian Communication</option>
                  <option value="CONDUCT">Classroom Conduct &amp; Merit</option>
                  <option value="UNIFORM">Uniform &amp; Personal Turnout</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Observation Note</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Record factual observation, teacher counsel, or clinic visit details..."
                  value={logNote}
                  onChange={e => setLogNote(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Action Taken / Resolution (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Spoke with parent via phone; scheduled follow-up"
                  value={logAction}
                  onChange={e => setLogAction(e.target.value)}
                  className="touch-target w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPastoralModalOpen(false)}
                  className="touch-target px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="touch-target px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ENDORSE BROADSHEET */}
      {isEndorseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Stamp className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Endorse {currentArm.fullName} Broadsheet</h3>
              </div>
              <button
                onClick={() => setIsEndorseModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <p>
                By signing this endorsement, you certify as Form Teacher that:
              </p>
              <ul className="space-y-1.5 list-disc pl-5 text-slate-700 dark:text-slate-300">
                <li>All continuous assessment and exam marks for {currentArm.fullName} have been verified.</li>
                <li>Statutory attendance days have been calculated accurately.</li>
                <li>Affective domain traits and holistic Form Teacher remarks are complete.</li>
              </ul>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Form Teacher Verification Comment</label>
                <textarea
                  rows={3}
                  value={endorsementComments}
                  onChange={e => setEndorsementComments(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-300 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <span>
                  This action formally transmits the class broadsheet to the <strong>Examination Officer</strong> for sealing, after which it enters the <strong>Principal's</strong> clearance queue.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEndorseModalOpen(false)}
                className="touch-target px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEndorsement}
                className="touch-target px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Stamp className="w-3.5 h-3.5" />
                <span>Confirm Endorsement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Master Inter-Role Direct Message Modal */}
      {isDirectMessageOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Faculty &amp; Executive Memo
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    From: <span className="font-bold text-slate-800 dark:text-slate-200">{user?.name || 'Form Teacher'}</span> ({currentArm.fullName})
                  </p>
                </div>
              </div>

              <form onSubmit={handleSendDirectMessage} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Send Directive / Memo To
                  </label>
                  <select
                    value={directRecipientRole}
                    onChange={e => setDirectRecipientRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="VICE_PRINCIPAL_ACADEMICS">Vice Principal Academics (Mrs. Victoria Okafor)</option>
                    <option value="EXAMINATION_OFFICER">Examination Council / Officer</option>
                    <option value="PRINCIPAL">Executive Principal (Dr. Michael Adebayo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subject / Concern Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Timetable Moderation / CA Deficit Advisory"
                    value={directSubject}
                    onChange={e => setDirectSubject(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Message Body
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Type official communication or escalation to academic administration..."
                    value={directContent}
                    onChange={e => setDirectContent(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsDirectMessageOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingMessage}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingMessage ? 'Sending...' : 'Transmit Memo'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </FuturisticPageShell>
  );
};
