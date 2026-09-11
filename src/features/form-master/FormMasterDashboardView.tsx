import React, { useState } from 'react';
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
  MessageSquare
} from 'lucide-react';
import type { PastoralLogCategory } from '../../types';

import { FuturisticPageShell } from '../../components/common/FuturisticPageShell';
import { FuturisticKPICard } from '../../components/common/FuturisticKPICard';
import { DoubleBezelCard } from '../../components/common/DoubleBezelCard';
import { SegmentedControl, SegmentedControlOption } from '../../components/common/SegmentedControl';
import { RadialGauge } from '../../components/common/ChartComponents';
import { ModalPortal } from '../../components/common/ModalPortal';

export const FormMasterDashboardView: React.FC = () => {
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
  const armStudents = students.filter(s => s.currentClassArmId === currentArm.id);

  const [activeTab, setActiveTab] = useState<'welfare' | 'compliance' | 'endorsement'>('welfare');
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

  // Subjects taught in this arm
  const armScores = scores.filter(s => s.classArmId === currentArm.id && s.termId === activeTerm.id);
  const activeSubjectIds = Array.from(new Set(armScores.map(s => s.subjectId)));
  const relevantSubjects = subjects.filter(
    s => activeSubjectIds.includes(s.id) || s.category === 'CORE'
  );

  // Build subject compliance list
  const subjectCompliance = relevantSubjects.map(subj => {
    const alloc = allocations.find(
      a => a.classArmId === currentArm.id && a.subjectId === subj.id
    );
    const subjScores = armScores.filter(s => s.subjectId === subj.id);
    const completedCount = subjScores.filter(s => s.total > 0).length;
    const isComplete = completedCount >= armStudents.length && armStudents.length > 0;

    return {
      subject: subj,
      teacherId: alloc ? alloc.teacherId : 'stf-002',
      teacherName: alloc ? alloc.teacherName : 'Unallocated Faculty',
      teacherEmail: alloc ? `${alloc.teacherName.toLowerCase().replace(/[^a-z]/g, '.')}@everest.sch.ng` : '',
      completedCount,
      totalExpected: armStudents.length,
      isComplete,
      percentage: armStudents.length > 0 ? Math.round((completedCount / armStudents.length) * 100) : 0
    };
  });

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
      subject: `Constitutional Broadsheet Endorsement: ${currentArm.fullName}`,
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

  const tabs: SegmentedControlOption<'welfare' | 'compliance' | 'endorsement'>[] = [
    { id: 'welfare', label: 'Pastoral Roster & Welfare', icon: Users, count: armStudents.length },
    { id: 'compliance', label: 'Subject Submissions', icon: BookOpen, badge: `${completedSubjectsCount}/${totalSubjectsCount}` },
    { id: 'endorsement', label: 'Broadsheet Endorsement', icon: Stamp, badge: isEndorsed ? 'Signed' : 'Pending' }
  ];

  return (
    <FuturisticPageShell
      title={`${currentArm.fullName} HOMEROOM & PASTORAL COMMAND`}
      subtitle={`Form Master: ${user?.name || 'Dr. Michael Adebayo'} (${user?.staffId || 'STF/2026/018'}). Supervising cohort welfare, statutory 65-day attendance, psychomotor ratings, and terminal broadsheet sign-off.`}
      icon={ShieldCheck}
      badgeText={isEndorsed ? 'Broadsheet Endorsed' : 'Collation In Progress'}
      badgeVariant={isEndorsed ? 'success' : 'warning'}
      actions={
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsDirectMessageOpen(true)}
            className="touch-target px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <MessageSquare className="w-4 h-4 text-amber-500" />
            <span>Message Staff / VP</span>
          </button>

          <button
            onClick={() => setIsPastoralModalOpen(true)}
            className="touch-target px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Log Pastoral Note</span>
          </button>

          <button
            onClick={() => setIsEndorseModalOpen(true)}
            className={`touch-target px-4 py-2.5 rounded-2xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95 ${
              isEndorsed
                ? 'bg-slate-200 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/20'
            }`}
          >
            <Stamp className="w-4 h-4" />
            <span>{isEndorsed ? 'View Endorsement' : 'Endorse Broadsheet'}</span>
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

      {/* 4 Metric KPI Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <FuturisticKPICard
          title="Cohort Enrollment"
          value={`${armStudents.length}`}
          subtitle={`${maleCount} Boys • ${femaleCount} Girls`}
          icon={Users}
          sparklineData={[28, 29, 30, 30, 31, armStudents.length]}
          glowColor="emerald"
          trend={{ value: '100% Retained', isPositive: true }}
        />

        <FuturisticKPICard
          title="Attendance Rate"
          value="98.2%"
          subtitle="Statutory 65 Days Tracked"
          icon={CalendarCheck}
          sparklineData={[94, 96, 95, 97, 98, 98.2]}
          glowColor="cyan"
          trend={{ value: '+0.8% vs last term', isPositive: true }}
        />

        <FuturisticKPICard
          title="Marksheet Progress"
          value={`${completedSubjectsCount}/${totalSubjectsCount}`}
          subtitle={`${compliancePercentage}% Submissions Complete`}
          icon={BookOpen}
          sparklineData={[2, 4, 6, 8, 10, completedSubjectsCount]}
          glowColor="amber"
          trend={{ value: `${totalSubjectsCount - completedSubjectsCount} Pending`, isPositive: completedSubjectsCount === totalSubjectsCount }}
        />

        <FuturisticKPICard
          title="Pastoral Welfare Logs"
          value={`${armPastoralLogs.length}`}
          subtitle="Active Homeroom Diary"
          icon={HeartPulse}
          sparklineData={[1, 3, 4, 6, 8, armPastoralLogs.length]}
          glowColor="indigo"
          trend={{ value: 'All Reviewed', isPositive: true }}
        />
      </div>

      {/* Cohort Telemetry HUD Banner */}
      <DoubleBezelCard>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Homeroom Readiness &amp; Statutory Verification HUD
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time synchronization for {currentArm.fullName} ahead of Examination Board sealing.
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            Cohort: {currentArm.fullName}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="flex items-center justify-around p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50">
            <RadialGauge
              percentage={98.2}
              label="Attendance"
              color="#10B981"
              glowColor="rgba(16, 185, 129, 0.4)"
              size={110}
            />
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">65 Statutory Days</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Average days present: 64</div>
              <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Class threshold met ✓</div>
            </div>
          </div>

          <div className="flex items-center justify-around p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50">
            <RadialGauge
              percentage={compliancePercentage}
              label="Submission"
              color="#F59E0B"
              glowColor="rgba(245, 158, 11, 0.4)"
              size={110}
            />
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{completedSubjectsCount} of {totalSubjectsCount} Subjects</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Continuous Assessment &amp; Exam</div>
              <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                {compliancePercentage === 100 ? 'Ready for Sealing' : 'Awaiting Remaining Teachers'}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Constitutional Status:</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                isEndorsed
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}>
                {isEndorsed ? 'Officially Endorsed' : 'Awaiting Endorsement'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Affective Trait Ratings:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">10 / 10 Dimensions Logged</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Pastoral Escalations:</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">0 Critical</span>
            </div>
          </div>
        </div>
      </DoubleBezelCard>

      {/* Interactive Tabs */}
      <SegmentedControl
        options={tabs}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* TAB 1: PASTORAL ROSTER & WELFARE */}
      {activeTab === 'welfare' && (
        <div className="space-y-6">
          {/* Student Roster Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {armStudents.map(st => {
              const ap = affectiveTraits.find(
                t => t.studentId === st.id && t.termId === activeTerm.id
              );
              const studentLogs = armPastoralLogs.filter(l => l.studentId === st.id);

              return (
                <div
                  key={st.id}
                  className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
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

                  {/* Bio & Health Tags */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>Guardian Phone</span>
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
                        Logs: <strong className="text-slate-900 dark:text-white">{studentLogs.length}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => {
                      setLogStudentId(st.id);
                      setIsPastoralModalOpen(true);
                    }}
                    className="touch-target w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Add Pastoral Welfare Note</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Pastoral & Welfare Ledger */}
          <DoubleBezelCard>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-white/5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-rose-500" />
                  <span>Homeroom Pastoral &amp; Welfare Activity Ledger</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Official historical diary of health observations, parent communications, and student welfare notices
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {['ALL', 'HEALTH', 'WELFARE', 'CONDUCT', 'PARENT_COMMUNICATION', 'UNIFORM'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
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

      {/* TAB 2: SUBJECT TEACHER SUBMISSIONS */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <DoubleBezelCard>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-white/5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <span>Subject Marksheet Submission Compliance Matrix</span>
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
                    <th className="py-3 px-4 sm:px-6 text-right">Form Master Action</th>
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
                        {item.isComplete ? (
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 italic">
                            Verified ✓
                          </span>
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

      {/* TAB 3: BROADSHEET ENDORSEMENT GATEWAY */}
      {activeTab === 'endorsement' && (
        <div className="space-y-6">
          <DoubleBezelCard>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 mb-4 border-b border-slate-100 dark:border-white/5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Stamp className="w-4 h-4 text-amber-500" />
                  <span>Class Arm Broadsheet Endorsement &amp; Handover</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Form Master’s constitutional sign-off certifying composite accuracy prior to Examination Officer sealing and Principal assent
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
                    Form Master remarks &amp; 10 behavioral traits logged.
                  </div>
                </div>
              </div>

              {/* Endorsement Certificate Card */}
              <div className="p-6 rounded-2xl bg-linear-to-br from-amber-50/70 via-white to-emerald-50/60 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-800 border border-amber-200/80 dark:border-amber-500/20 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Constitutional Form Master Endorsement Certificate
                    </span>
                    <h4 className="text-base font-serif font-bold text-slate-900 dark:text-white">
                      Terminal Dossier Verification for {currentArm.fullName}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl italic">
                      "{currentEndorsement?.generalComments || endorsementComments}"
                    </p>
                  </div>

                  <div className="sm:text-right space-y-1 shrink-0">
                    <div className="text-[10px] text-slate-400 font-mono">
                      {currentEndorsement?.endorsedAt ? new Date(currentEndorsement.endorsedAt).toLocaleDateString() : 'Pending Transmission'}
                    </div>
                    <div className="font-serif italic text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-400 dark:border-slate-600 pb-0.5">
                      {currentEndorsement?.formMasterSignature || user?.name || 'Dr. Michael Adebayo'}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Form Master Digital Seal</div>
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
              {/* Student Selector */}
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

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select
                  value={logCategory}
                  onChange={e => setLogCategory(e.target.value as PastoralLogCategory)}
                  className="touch-target w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="WELFARE">General Welfare &amp; Moral Wellbeing</option>
                  <option value="HEALTH">Health &amp; Clinic Observation</option>
                  <option value="PARENT_COMMUNICATION">Parent / Guardian Communication</option>
                  <option value="CONDUCT">Classroom Conduct &amp; Merit</option>
                  <option value="UNIFORM">Uniform &amp; Personal Turnout</option>
                </select>
              </div>

              {/* Observation Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Detailed Observation Note</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Record factual observation, teacher counsel, or clinic visit details..."
                  value={logNote}
                  onChange={e => setLogNote(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Action Taken */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Action Taken / Resolution (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Called mother via telephone; advised rest at clinic"
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
                  Save to Record
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
                By signing this endorsement, you certify as Form Master that:
              </p>
              <ul className="space-y-1.5 list-disc pl-5 text-slate-700 dark:text-slate-300">
                <li>All continuous assessment and exam marks for {currentArm.fullName} have been verified.</li>
                <li>Statutory attendance days have been calculated accurately.</li>
                <li>Affective domain traits and holistic Form Master remarks are complete.</li>
              </ul>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Form Master Verification Comment</label>
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
                  This action formally transmits the cohort broadsheet to the <strong>Examination Officer</strong> for sealing, after which it enters the <strong>Principal's</strong> clearance queue.
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
                    From: <span className="font-bold text-slate-800 dark:text-slate-200">{user?.name || 'Form Master'}</span> ({currentArm.fullName})
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
                    placeholder="e.g., Request for Timetable Moderation / CA Deficit Advisory"
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
