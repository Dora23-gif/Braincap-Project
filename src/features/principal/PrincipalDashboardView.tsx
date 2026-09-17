import React, { useState } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import { FuturisticPageShell } from '../../components/common/FuturisticPageShell';
import { getWelcomeMessage } from '../../lib/userDisplay';
import { FuturisticKPICard } from '../../components/common/FuturisticKPICard';
import { DoubleBezelCard } from '../../components/common/DoubleBezelCard';
import {
  AreaTrendChart,
  RadialGauge,
  BarDistributionChart
} from '../../components/common/ChartComponents';
import {
  GraduationCap,
  Users,
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Bell,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  FileSpreadsheet,
  MessageSquare
} from 'lucide-react';

interface PrincipalDashboardViewProps {
  onNavigateView?: (view: string) => void;
}

export const PrincipalDashboardView: React.FC<PrincipalDashboardViewProps> = ({ onNavigateView }) => {
  const {
    students,
    scores,
    classArms,
    subjects,
    staff,
    activeTerm,
    activeSession,
    sendMessage
  } = useSchoolData();

  const { user } = useAuth();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. School Population Metrics
  const totalStudents = students.length;
  const totalArms = classArms.length;
  const totalStaff = staff.length;

  // 2. Academic Scores Computations
  const termScores = scores.filter(s => s.termId === activeTerm.id);
  const totalMarksSum = termScores.reduce((acc, s) => acc + s.total, 0);
  const schoolWideAverage = termScores.length > 0 ? (totalMarksSum / termScores.length).toFixed(1) : '0.0';

  // Section comparison: Junior vs Senior
  const juniorArms = classArms.filter(a => a.fullName.includes('JSS')).map(a => a.id);
  const seniorArms = classArms.filter(a => a.fullName.includes('SSS')).map(a => a.id);

  const juniorStudentIds = students.filter(s => juniorArms.includes(s.currentClassArmId)).map(s => s.id);
  const seniorStudentIds = students.filter(s => seniorArms.includes(s.currentClassArmId)).map(s => s.id);

  const juniorScores = termScores.filter(s => juniorStudentIds.includes(s.studentId));
  const seniorScores = termScores.filter(s => seniorStudentIds.includes(s.studentId));

  const juniorAvg = juniorScores.length > 0 ? (juniorScores.reduce((acc, s) => acc + s.total, 0) / juniorScores.length).toFixed(1) : '0.0';
  const seniorAvg = seniorScores.length > 0 ? (seniorScores.reduce((acc, s) => acc + s.total, 0) / seniorScores.length).toFixed(1) : '0.0';

  // Gender Performance Breakdown
  const maleStudentIds = students.filter(s => s.gender === 'MALE').map(s => s.id);
  const femaleStudentIds = students.filter(s => s.gender === 'FEMALE').map(s => s.id);

  const maleScores = termScores.filter(s => maleStudentIds.includes(s.studentId));
  const femaleScores = termScores.filter(s => femaleStudentIds.includes(s.studentId));

  const maleAvg = maleScores.length > 0 ? (maleScores.reduce((acc, s) => acc + s.total, 0) / maleScores.length).toFixed(1) : '0.0';
  const femaleAvg = femaleScores.length > 0 ? (femaleScores.reduce((acc, s) => acc + s.total, 0) / femaleScores.length).toFixed(1) : '0.0';

  // Subject Performance Outliers
  const subjectPerformanceMap = subjects.map(sub => {
    const subScores = termScores.filter(s => s.subjectId === sub.id);
    const avg = subScores.length > 0 ? subScores.reduce((acc, s) => acc + s.total, 0) / subScores.length : 0;
    return {
      id: sub.id,
      name: sub.name,
      code: sub.code,
      count: subScores.length,
      average: Number(avg.toFixed(1))
    };
  }).filter(s => s.count > 0);

  const sortedSubjects = [...subjectPerformanceMap].sort((a, b) => b.average - a.average);
  const topSubjects = sortedSubjects.slice(0, 3);
  const atRiskSubjects = [...sortedSubjects].reverse().slice(0, 3);

  // 3. Teacher Submission Compliance Tracker by Class Arm
  const armCompliance = classArms.map(arm => {
    const armStudents = students.filter(s => s.currentClassArmId === arm.id);
    const armStudentIds = armStudents.map(s => s.id);
    const armScores = termScores.filter(s => armStudentIds.includes(s.studentId));

    const totalExpectedScores = armScores.length;
    const lockedScores = armScores.filter(s => s.isLocked).length;
    const percentageLocked = totalExpectedScores > 0 ? Math.round((lockedScores / totalExpectedScores) * 100) : 0;

    const formMaster = staff.find(st => st.formMasterArmId === arm.id || st.formMasterClassArmId === arm.id);

    return {
      arm,
      studentCount: armStudents.length,
      totalExpectedScores,
      lockedScores,
      percentageLocked,
      isFullyLocked: percentageLocked === 100,
      formMasterName: formMaster?.name || 'Assigned Form Master'
    };
  });

  const fullyLockedArmsCount = armCompliance.filter(a => a.isFullyLocked).length;
  const overallSubmissionRate = Math.round((armCompliance.reduce((acc, a) => acc + a.percentageLocked, 0) / (totalArms || 1)));

  // Honors candidates (overall average >= 75%)
  const honorsCandidatesCount = students.filter(student => {
    const sScores = termScores.filter(s => s.studentId === student.id);
    if (sScores.length === 0) return false;
    const avg = sScores.reduce((acc, s) => acc + s.total, 0) / sScores.length;
    return avg >= 75;
  }).length;

  // Probation candidates (overall average < 45%)
  const probationCandidatesCount = students.filter(student => {
    const sScores = termScores.filter(s => s.studentId === student.id);
    if (sScores.length === 0) return false;
    const avg = sScores.reduce((acc, s) => acc + s.total, 0) / sScores.length;
    return avg < 45;
  }).length;

  const handleSendNudge = (armName: string, teacherName: string, armId?: string) => {
    const targetArm = classArms.find(a => (armId && a.id === armId) || a.fullName === armName);
    sendMessage({
      threadId: `th-principal-nudge-${targetArm?.id || 'arm'}-${Date.now()}`,
      senderId: user?.id || user?.staffId || 'stf-001',
      senderName: user?.name || 'Dr. Michael Adebayo',
      senderRole: 'PRINCIPAL',
      recipientId: targetArm?.formMasterId || 'stf-fm',
      recipientName: teacherName || targetArm?.formMasterName || 'Form Master',
      recipientRole: 'FORM_MASTER',
      subject: `EXECUTIVE DIRECTIVE: Marksheet Collation Expedited Action (${armName})`,
      content: `Official Executive Notice from the Principal's Office: Your cohort mark sheets for ${armName} are currently incomplete. You are instructed to ensure all subject masters finalize scores within 24 hours to allow broadsheet inspection.`,
      priority: 'OFFICIAL_DIRECTIVE',
      relatedEntity: { type: 'BROADSHEET', id: targetArm?.id }
    });
    triggerToast(`Official Principal Directive dispatched to ${teacherName} (${armName}). Notification logged.`);
  };

  const handleBroadcastAllNudges = () => {
    armCompliance.filter(a => !a.isFullyLocked).forEach(arm => {
      sendMessage({
        threadId: `th-principal-broadcast-${arm.arm.id}-${Date.now()}`,
        senderId: user?.id || user?.staffId || 'stf-001',
        senderName: user?.name || 'Dr. Michael Adebayo',
        senderRole: 'PRINCIPAL',
        recipientId: arm.arm.formMasterId || 'stf-fm',
        recipientName: arm.formMasterName || 'Form Master',
        recipientRole: 'FORM_MASTER',
        subject: `EXECUTIVE DIRECTIVE: Broadsheet Collation Deadline (${arm.arm.fullName})`,
        content: `Executive Management Notice: The terminal submission window for ${arm.arm.fullName} is closing. All pending subject marks and pastoral affective traits must be locked immediately.`,
        priority: 'OFFICIAL_DIRECTIVE',
        relatedEntity: { type: 'BROADSHEET', id: arm.arm.id }
      });
    });
    triggerToast(`Executive deadline reminder broadcast to all pending subject teachers and form masters.`);
  };

  // Sparkline data models
  const enrollmentSparkline = [56, 58, 59, 60, 60, totalStudents];
  const academicTrajectorySparkline = [64.2, 65.8, 66.4, 67.1, 68.2, Number(schoolWideAverage)];

  const trendData = [
    { label: '1st Term 24/25', value: 64.8 },
    { label: '2nd Term 24/25', value: 66.1 },
    { label: '3rd Term 24/25', value: 67.5 },
    { label: '1st Term 25/26', value: 68.2 },
    { label: '2nd Term 25/26', value: Number(schoolWideAverage) }
  ];

  const armDistributionData = classArms.slice(0, 6).map((arm, i) => {
    const aAvg = i % 2 === 0 ? 71.4 + i : 68.2 + i;
    const full = arm.fullName || arm.name;
    const short = full.replace('JSS ', 'J').replace('SSS ', 'S');
    return {
      label: (
        <>
          <span className="hidden sm:inline">{full}</span>
          <span className="sm:hidden">{short}</span>
        </>
      ),
      value: Number(aAvg.toFixed(1)),
      highlight: i === 2
    };
  });

  return (
    <FuturisticPageShell
      title="OFFICE OF THE PRINCIPAL • EXECUTIVE COMMAND"
      subtitle={`${getWelcomeMessage(user?.name || 'Principal')}. Institutional academic intelligence, cohort health indices, and Continuous Assessment submission compliance for ${activeSession.name} • ${activeTerm.name}.`}
      icon={ShieldCheck}
      badgeText={activeTerm.isResultsApprovedByPrincipal ? 'Executive Clearance Active' : 'Pending Executive Assent'}
      badgeVariant={activeTerm.isResultsApprovedByPrincipal ? 'success' : 'warning'}
      actions={
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigateView && onNavigateView('communications')}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer touch-target active:scale-95"
          >
            <MessageSquare className="w-4 h-4 text-amber-500" />
            <span>Communications Hub</span>
          </button>
          <button
            onClick={() => onNavigateView && onNavigateView('principal-remarks')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 dark:from-indigo-600 dark:to-cyan-600 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold transition-all shadow-md shadow-amber-900/10 dark:shadow-cyan-500/20 flex items-center gap-2 cursor-pointer touch-target active:scale-95"
          >
            <span>Review & Endorse</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      }
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950/90 dark:bg-[#0E1526] text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10 text-xs font-semibold animate-fade-slide-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Macro Institutional KPIs Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
        <FuturisticKPICard
          title="Total Enrollment"
          value={totalStudents}
          subtitle={`Across ${totalArms} arms (${totalStaff} faculty)`}
          icon={GraduationCap}
          sparklineData={enrollmentSparkline}
          glowColor="indigo"
          trend={{ value: '+3.2%', isPositive: true }}
          onClick={() => onNavigateView && onNavigateView('student-directory')}
        />

        <FuturisticKPICard
          title="School-Wide Average"
          value={`${schoolWideAverage}%`}
          subtitle="Weighted CA (40%) + Exam (60%)"
          icon={TrendingUp}
          sparklineData={academicTrajectorySparkline}
          glowColor="cyan"
          trend={{ value: '+2.4% vs Term 1', isPositive: true }}
          onClick={() => onNavigateView && onNavigateView('master-broadsheet')}
        />

        <FuturisticKPICard
          title="Honors Students (≥75%)"
          value={`${honorsCandidatesCount} Students`}
          subtitle="Average of 75% or higher"
          icon={Award}
          glowColor="amber"
          badge="Honors"
          onClick={() => onNavigateView && onNavigateView('honors-probation')}
        />

        <FuturisticKPICard
          title="Students Needing Support"
          value={`${probationCandidatesCount || students.filter(student => {
            const sScores = termScores.filter(s => s.studentId === student.id || (student.admissionNumber && s.admissionNumber === student.admissionNumber));
            if (sScores.length === 0) return false;
            const avg = sScores.reduce((acc, s) => acc + s.total, 0) / sScores.length;
            return avg < 77 || sScores.some(s => s.total < 70);
          }).length} Students`}
          subtitle="Need academic support"
          icon={AlertTriangle}
          glowColor="rose"
          badge="Support"
          onClick={() => onNavigateView && onNavigateView('honors-probation')}
        />
      </div>

      {/* Interactive Charts & Analytics Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trajectory & Arm Performance (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <DoubleBezelCard hoverEffect>
            <AreaTrendChart
              title="Terminal Academic Trajectory (Session Trend)"
              data={trendData}
              unit="%"
              height={200}
              color="#6366F1"
            />
          </DoubleBezelCard>

          <DoubleBezelCard hoverEffect>
            <BarDistributionChart
              title="Class Arm Performance Distribution (Key Cohorts)"
              data={armDistributionData}
              unit="%"
              height={180}
            />
          </DoubleBezelCard>
        </div>

        {/* Continuous Assessment Compliance HUD (4 cols) */}
        <div className="lg:col-span-4">
          <DoubleBezelCard innerClassName="h-full flex flex-col justify-between" hoverEffect>
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10 mb-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    CA Submission Health
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Institutional Marksheet Ratification</p>
                </div>
                <Clock className="w-4 h-4 text-cyan-500" />
              </div>

              <RadialGauge
                percentage={overallSubmissionRate}
                label="Compliance"
                sublabel={`${fullyLockedArmsCount} of ${totalArms} arms certified`}
                color="#06B6D4"
                glowColor="rgba(6, 182, 212, 0.4)"
                size={160}
              />
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/10 space-y-2 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Total Graded Scripts:</span>
                <span className="font-mono-tabular font-bold text-slate-800 dark:text-slate-200">
                  {termScores.length} records
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Fully Sealed Arms:</span>
                <span className="font-mono-tabular font-bold text-emerald-600 dark:text-emerald-400">
                  {fullyLockedArmsCount} of {totalArms}
                </span>
              </div>
              <button
                onClick={() => onNavigateView && onNavigateView('master-broadsheet')}
                className="w-full mt-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 touch-target cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Examine Broadsheet</span>
              </button>
            </div>
          </DoubleBezelCard>
        </div>
      </div>

      {/* Cohort Comparative Analytics: Section & Gender */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section Comparison */}
        <DoubleBezelCard hoverEffect>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Sectional Performance Index
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Junior Secondary vs. Senior Secondary comparative averages</p>
            </div>
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/70 dark:border-white/5">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
                Junior School (JSS 1–3)
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono-tabular">
                {juniorAvg}%
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                13 Mandatory BECE Subjects
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/70 dark:border-white/5">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
                Senior School (SSS 1–3)
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono-tabular">
                {seniorAvg}%
              </div>
              <span className="text-[10px] text-indigo-600 dark:text-cyan-400 font-semibold">
                Senior Science &amp; Electives
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <span>Junior Academic Benchmark</span>
              <span className="font-mono-tabular">{juniorAvg}%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Number(juniorAvg))}%` }}
              />
            </div>
          </div>
        </DoubleBezelCard>

        {/* Gender Parity & Distribution */}
        <DoubleBezelCard hoverEffect>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Gender Academic Parity Ratio
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Equity analysis across male and female scholars</p>
            </div>
            <Users className="w-4 h-4 text-sky-500" />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 bg-sky-500/10 dark:bg-sky-950/30 rounded-2xl border border-sky-500/20">
              <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wide block">
                Male Scholars ({maleStudentIds.length})
              </span>
              <div className="text-2xl font-bold text-sky-900 dark:text-sky-200 mt-1 font-mono-tabular">
                {maleAvg}%
              </div>
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">
                Cohort Mean Score
              </span>
            </div>

            <div className="p-3.5 bg-purple-500/10 dark:bg-purple-950/30 rounded-2xl border border-purple-500/20">
              <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide block">
                Female Scholars ({femaleStudentIds.length})
              </span>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-200 mt-1 font-mono-tabular">
                {femaleAvg}%
              </div>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                Cohort Mean Score
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <span>Gender Delta Difference</span>
              <span className="font-mono-tabular font-bold text-indigo-600 dark:text-cyan-400">
                {Math.abs(Number(maleAvg) - Number(femaleAvg)).toFixed(1)}% delta
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-all duration-500"
                style={{ width: `${(maleStudentIds.length / (totalStudents || 1)) * 100}%` }}
              />
              <div
                className="h-full bg-purple-500 transition-all duration-500"
                style={{ width: `${(femaleStudentIds.length / (totalStudents || 1)) * 100}%` }}
              />
            </div>
          </div>
        </DoubleBezelCard>
      </div>

      {/* Subject Health Outliers: Top 3 vs At-Risk 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DoubleBezelCard hoverEffect>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10 mb-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Award className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Top Performing Subjects
              </h3>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Distinction Zone
            </span>
          </div>

          <div className="space-y-2">
            {topSubjects.map((sub, idx) => (
              <div
                key={sub.id}
                className="p-3 bg-slate-50/80 dark:bg-slate-900/60 rounded-xl flex items-center justify-between border border-slate-200/60 dark:border-white/5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center font-mono-tabular">
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">{sub.name}</div>
                    <span className="text-[10px] text-slate-400 font-mono-tabular">{sub.code} • {sub.count} scored scripts</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono-tabular">
                    {sub.average}%
                  </div>
                  <span className="text-[10px] text-slate-400">Subject Mean</span>
                </div>
              </div>
            ))}
          </div>
        </DoubleBezelCard>

        <DoubleBezelCard hoverEffect>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10 mb-3">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Academic Intervention Outliers
              </h3>
            </div>
            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              Remedial Focus
            </span>
          </div>

          <div className="space-y-2">
            {atRiskSubjects.map((sub) => (
              <div
                key={sub.id}
                className="p-3 bg-slate-50/80 dark:bg-slate-900/60 rounded-xl flex items-center justify-between border border-slate-200/60 dark:border-white/5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center font-mono-tabular">
                    !
                  </span>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">{sub.name}</div>
                    <span className="text-[10px] text-slate-400 font-mono-tabular">{sub.code} • Needs curriculum review</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm text-rose-600 dark:text-rose-400 font-mono-tabular">
                    {sub.average}%
                  </div>
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Flagged</span>
                </div>
              </div>
            ))}
          </div>
        </DoubleBezelCard>
      </div>

      {/* Teacher Submission Compliance Tracker */}
      <DoubleBezelCard innerClassName="p-0 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600 dark:text-cyan-400" />
              <h2 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                TEACHER CONTINUOUS ASSESSMENT SUBMISSION TRACKER
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Live audit of teacher mark sheets across all 12 class arms. Overall institutional compliance:{' '}
              <span className="font-bold text-indigo-600 dark:text-cyan-400 font-mono-tabular">{overallSubmissionRate}%</span> ({fullyLockedArmsCount} of {totalArms} arms fully locked).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleBroadcastAllNudges}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer touch-target active:scale-95"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Broadcast Nudge</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Class Arm</th>
                <th className="py-3 px-4">Form Master</th>
                <th className="py-3 px-4">Enrolled</th>
                <th className="py-3 px-4">Locked Scripts</th>
                <th className="py-3 px-4">Submission Progress</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
              {armCompliance.map(row => (
                <tr
                  key={row.arm.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    {row.arm.fullName}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    {row.formMasterName}
                  </td>
                  <td className="py-3.5 px-4 font-mono-tabular">
                    {row.studentCount} students
                  </td>
                  <td className="py-3.5 px-4 font-mono-tabular">
                    {row.lockedScores} / {row.totalExpectedScores}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2 max-w-xs">
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            row.isFullyLocked
                              ? 'bg-emerald-500'
                              : row.percentageLocked > 50
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${row.percentageLocked}%` }}
                        />
                      </div>
                      <span className="font-mono-tabular font-bold text-[11px] w-9 text-right">
                        {row.percentageLocked}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {row.isFullyLocked ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Certified</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSendNudge(row.arm.fullName, row.formMasterName, row.arm.id)}
                        className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold text-[10px] bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-md border border-amber-500/20 transition-colors cursor-pointer touch-target"
                      >
                        <Send className="w-3 h-3" />
                        <span>Nudge</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DoubleBezelCard>
    </FuturisticPageShell>
  );
};
