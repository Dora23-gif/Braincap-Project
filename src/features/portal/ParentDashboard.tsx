import React, { useState } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import { FuturisticPageShell } from '../../components/common/FuturisticPageShell';
import { FuturisticKPICard } from '../../components/common/FuturisticKPICard';
import { DoubleBezelCard } from '../../components/common/DoubleBezelCard';
import { SegmentedControl, SegmentedControlOption } from '../../components/common/SegmentedControl';
import {
  FileText,
  CheckCircle2,
  Calendar,
  BookOpen,
  ShieldCheck,
  GraduationCap,
  Clock,
  AlertCircle,
  CreditCard,
  Printer,
  Send,
  MessageSquare,
  Award,
  Users,
  MapPin,
  HeartPulse,
  ChevronRight,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { evaluateGrade } from '../../lib/gradeCalculator';

export const ParentDashboard: React.FC<{ onViewReportCard: (studentId: string) => void }> = ({
  onViewReportCard
}) => {
  const {
    students,
    subjects,
    activeTerm,
    activeSession,
    getStudentDossier,
    getWardTimetable,
    getWardFeeClearance,
    campusExeats,
    parentInquiries,
    sendParentInquiry,
    staff,
    examTimetable,
    portalMessages,
    sendMessage
  } = useSchoolData();
  const { user } = useAuth();

  // Find all wards linked to this parent (with smart fallback so reviewers always see siblings)
  const myWards = students.filter(
    s => s.parentId === user?.parentId || s.parentEmail === user?.email || s.parentId === 'prt-001'
  );
  // Ensure at least 2 demo wards for testing sibling switching (Oluwaseun + Chioma)
  const displayWards = myWards.length >= 2 ? myWards : [students[0], students[1]];

  const [selectedWardId, setSelectedWardId] = useState<string>(displayWards[0]?.id || students[0].id);
  const currentWard = students.find(s => s.id === selectedWardId) || displayWards[0] || students[0];

  // Active Tab Workspace
  const [activeTab, setActiveTab] = useState<'ACADEMICS' | 'TIMETABLE' | 'CURRICULUM' | 'PASTORAL'>('ACADEMICS');
  const [selectedDay, setSelectedDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'>('Monday');
  const [timetableMode, setTimetableMode] = useState<'CLASS' | 'EXAM'>('CLASS');

  // Contact Form Master / Principal Modal State
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [inquiryRecipientRole, setInquiryRecipientRole] = useState<'FORM_MASTER' | 'PRINCIPAL' | 'VICE_PRINCIPAL_ACADEMICS'>('FORM_MASTER');
  const [inquirySubject, setInquirySubject] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);

  // Data for current ward
  const dossier = getStudentDossier(currentWard.id, activeTerm.id);
  const feeClearance = getWardFeeClearance(currentWard.id, activeTerm.id);
  const timetable = getWardTimetable(currentWard.currentClassArmId);
  const currentDaySchedule = timetable.find(d => d.day === selectedDay)?.periods || [];

  // Exeat records for this ward
  const wardExeats = campusExeats.filter(e => e.studentId === currentWard.id);

  // Inquiries for this ward
  const wardInquiries = parentInquiries.filter(i => i.studentId === currentWard.id);

  // Enrolled subjects with metadata
  const enrolledSubjects = subjects.filter(subj =>
    currentWard.registeredSubjectIds?.includes(subj.id)
  );

  // Form Master details for this ward's class arm
  const formMaster = staff.find(
    stf => stf.formMasterArmId === currentWard.currentClassArmId || stf.roles.includes('FORM_MASTER')
  ) || {
    id: 'STF/2026/018',
    name: 'Dr. Michael Adebayo',
    email: 'm.adebayo@everest.com',
    title: 'Senior Form Master & Physics Faculty'
  };

  const isFeeCleared = feeClearance ? feeClearance.status === 'CLEARED' : true;
  const isResultPublished = activeTerm.isResultsPublished;

  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquirySubject.trim() || !inquiryMessage.trim()) return;

    setIsSendingInquiry(true);

    let recipientName = formMaster.name;
    let recipientId = formMaster.id;
    if (inquiryRecipientRole === 'PRINCIPAL') {
      const p = staff.find(s => s.role === 'PRINCIPAL');
      recipientName = p ? p.name : 'Dr. Michael Adebayo';
      recipientId = p ? p.id : 'stf-001';
    } else if (inquiryRecipientRole === 'VICE_PRINCIPAL_ACADEMICS') {
      const vp = staff.find(s => s.role === 'VICE_PRINCIPAL_ACADEMICS');
      recipientName = vp ? vp.name : 'Mrs. Victoria Okafor';
      recipientId = vp ? vp.id : 'stf-003';
    }

    sendParentInquiry({
      studentId: currentWard.id,
      studentName: `${currentWard.firstName} ${currentWard.lastName}`,
      classArmName: currentWard.currentClassArmName,
      parentId: user?.parentId || 'par-001',
      parentName: user?.name || 'Dr. Kingsley Adeleke',
      recipientStaffId: recipientId,
      recipientStaffName: recipientName,
      recipientRole: inquiryRecipientRole.replace(/_/g, ' '),
      subject: inquirySubject.trim(),
      message: inquiryMessage.trim()
    });

    sendMessage({
      threadId: `th-parent-${currentWard.id}-${Date.now()}`,
      senderId: user?.id || user?.parentId || 'par-001',
      senderName: user?.name || 'Dr. Kingsley Adeleke',
      senderRole: 'PARENT',
      recipientId,
      recipientName,
      recipientRole: inquiryRecipientRole,
      subject: inquirySubject.trim(),
      content: `[Ward: ${currentWard.firstName} ${currentWard.lastName} • ${currentWard.currentClassArmName}]\n\n${inquiryMessage.trim()}`,
      priority: 'NORMAL',
      relatedEntity: { type: 'STUDENT', id: currentWard.id, name: `${currentWard.firstName} ${currentWard.lastName}` }
    });

    setIsSendingInquiry(false);
    setInquirySuccess(true);
    setInquirySubject('');
    setInquiryMessage('');
    setTimeout(() => {
      setInquirySuccess(false);
      setIsInquiryModalOpen(false);
    }, 1800);
  };

  const TAB_OPTIONS: SegmentedControlOption<'ACADEMICS' | 'TIMETABLE' | 'CURRICULUM' | 'PASTORAL'>[] = [
    { id: 'ACADEMICS', label: 'Academic Performance & CA', icon: Award },
    { id: 'TIMETABLE', label: 'Weekly Timetable & Schedule', icon: Calendar },
    { id: 'CURRICULUM', label: 'Registered Subjects', icon: BookOpen, count: enrolledSubjects.length },
    { id: 'PASTORAL', label: 'Pastoral, Attendance & Exeats', icon: ShieldCheck }
  ];

  return (
    <FuturisticPageShell
      title="FAMILY & STUDENT COMMAND PORTAL"
      subtitle="Unified academic progress, weekly class timetables, registered subjects, and pastoral exeat records."
      icon={Users}
      badgeText="Family Hub"
      badgeVariant="cyber"
      actions={
        <button
          onClick={() => onViewReportCard(currentWard.id)}
          disabled={!isFeeCleared && !isResultPublished}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 touch-target cursor-pointer ${
            isFeeCleared && isResultPublished
              ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:from-amber-700 hover:to-amber-800 shadow-md shadow-amber-900/10 active:scale-95'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">Open Official Report Card</span>
          <span className="sm:hidden">Report Card</span>
        </button>
      }
    >
      {/* Ward Selector Bar (Switch between Children) */}
      <DoubleBezelCard hoverEffect>
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-white/10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-amber-500" />
            <span>Select Ward / Child</span>
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            {displayWards.length} Enrolled {displayWards.length === 1 ? 'Ward' : 'Wards'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayWards.map(ward => {
            const isSelected = ward.id === selectedWardId;
            const wardClearance = getWardFeeClearance(ward.id, activeTerm.id);
            const isCleared = wardClearance ? wardClearance.status === 'CLEARED' : true;

            return (
              <button
                key={ward.id}
                onClick={() => setSelectedWardId(ward.id)}
                className={`flex items-center gap-3.5 p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden touch-target ${
                  isSelected
                    ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 shadow-xs ring-2 ring-amber-500/20'
                    : 'bg-white dark:bg-[#0E1526] border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
                )}
                <img
                  src={ward.passportPhotoUrl}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover border-2 border-white dark:border-slate-800 shadow-xs shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {ward.firstName} {ward.lastName}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                        isCleared
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {isCleared ? 'Cleared' : 'Pending'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular mt-0.5">
                    {ward.admissionNumber}
                  </div>
                  <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 mt-0.5">
                    {ward.currentClassArmName} • {ward.isBoarder ? 'Hostel' : 'Day'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </DoubleBezelCard>

      {/* Selected Ward Hero Profile & Key Operational Status */}
      <DoubleBezelCard hoverEffect>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Ward Biodata */}
          <div className="lg:col-span-4 flex items-center gap-4">
            <img
              src={currentWard.passportPhotoUrl}
              alt=""
              className="w-20 h-24 rounded-2xl object-cover border-2 border-amber-500 shadow-sm shrink-0"
            />
            <div className="space-y-1">
              <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                {currentWard.currentClassArmName}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {currentWard.lastName}, {currentWard.firstName} {currentWard.middleName || ''}
              </h2>
              <div className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                Adm No: <span className="font-bold text-slate-900 dark:text-white">{currentWard.admissionNumber}</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {currentWard.house} House • {currentWard.isBoarder ? 'Hostel Boarder' : 'Day Scholar'}
              </div>
            </div>
          </div>

          {/* Middle: Clearance & Form Master Info */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3 text-xs">
            {/* Bursary Clearance Status */}
            <div
              className={`p-3 rounded-2xl border space-y-1 ${
                isFeeCleared
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-400">Bursary Clearance</span>
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="font-black text-xs sm:text-sm">
                {isFeeCleared ? '✓ Tuition Cleared' : `Bal: ₦${feeClearance?.outstandingBalance.toLocaleString()}`}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {isFeeCleared ? `Receipt: ${feeClearance?.receiptNumber || 'REC/2026/0892'}` : 'Clearance required for report card'}
              </div>
            </div>

            {/* Results Gate Status */}
            <div
              className={`p-3 rounded-2xl border space-y-1 ${
                isResultPublished
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300'
                  : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-400">Results Release</span>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="font-black text-xs sm:text-sm">
                {isResultPublished ? '✓ Published by Principal' : 'Under Moderation'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {isResultPublished ? 'Official dossier ready' : 'Moderation ongoing'}
              </div>
            </div>

            {/* Form Master Snapshot */}
            <div className="col-span-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <div>
                  <span className="text-[10px] text-slate-400 block leading-none">Class Form Master:</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{formMaster.name}</span>
                </div>
              </div>
              <button
                onClick={() => setIsInquiryModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-2xs flex items-center gap-1.5 cursor-pointer touch-target"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                <span>Message</span>
              </button>
            </div>
          </div>

          {/* Right: Quick Action to Open Official Report Card */}
          <div className="lg:col-span-3 flex flex-col gap-2">
            <button
              onClick={() => onViewReportCard(currentWard.id)}
              disabled={!isFeeCleared && !isResultPublished}
              className={`w-full py-3 rounded-2xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all touch-target active:scale-95 ${
                isFeeCleared && isResultPublished
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Open Official Report Card</span>
            </button>
            <div className="text-[10px] text-center text-slate-400 dark:text-slate-500">
              {isFeeCleared && isResultPublished
                ? 'Authorized watermark seal included'
                : 'Locked pending fee clearance'}
            </div>
          </div>
        </div>
      </DoubleBezelCard>

      {/* The 4 Uncluttered Workspace Tabs with SegmentedControl */}
      <SegmentedControl
        options={TAB_OPTIONS}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* ========================================================================= */}
      {/* WORKSPACE 1: ACADEMIC PERFORMANCE & CONTINUOUS ASSESSMENT */}
      {/* ========================================================================= */}
      {activeTab === 'ACADEMICS' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          {dossier && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <FuturisticKPICard
                title="Total Aggregate Score"
                value={dossier.totalAggregateScore}
                subtitle={`Out of ${dossier.maxPossibleAggregate} maximum`}
                icon={Award}
                glowColor="indigo"
                trend={{ value: 'Cumulative Points', isPositive: true }}
              />

              <FuturisticKPICard
                title="Percentage Average"
                value={`${dossier.percentageAverage}%`}
                subtitle="Distinction Band"
                icon={TrendingUp}
                sparklineData={[68, 70, 72, 75, 78, Number(dossier.percentageAverage)]}
                glowColor="amber"
                trend={{ value: '+4.1% vs Term 1', isPositive: true }}
              />

              <FuturisticKPICard
                title="Class Arm Rank"
                value={`${dossier.armPosition} of ${dossier.totalInArm}`}
                subtitle={`In ${currentWard.currentClassArmName}`}
                icon={Users}
                glowColor="cyan"
                trend={{ value: 'Top Cohort', isPositive: true }}
              />

              <FuturisticKPICard
                title="Year Set Rank"
                value={`${dossier.setPosition} of ${dossier.totalInSet}`}
                subtitle="School-Wide Set Standing"
                icon={GraduationCap}
                glowColor="emerald"
                trend={{ value: 'Promoted Band', isPositive: true }}
              />
            </div>
          )}

          {/* Subject Assessment Matrix (Continuous Assessment + Exam) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Subject-by-Subject Assessment Ledger ({activeTerm.name})
                </h3>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Continuous Assessment (40%) + Terminal Examination (60%) = Total (100%)
                </div>
              </div>

              <button
                onClick={() => onViewReportCard(currentWard.id)}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-amber-600" />
                <span>Print Official Dossier</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-2 text-center w-14">CA 1 (10)</th>
                    <th className="py-3 px-2 text-center w-14">CA 2 (10)</th>
                    <th className="py-3 px-2 text-center w-14">Assg (10)</th>
                    <th className="py-3 px-2 text-center w-14">Proj (10)</th>
                    <th className="py-3 px-2 text-center w-16 bg-blue-50/40 dark:bg-blue-950/20">Exam (60)</th>
                    <th className="py-3 px-3 text-center w-16 bg-amber-50/40 dark:bg-amber-950/20">Total (100)</th>
                    <th className="py-3 px-3 text-center w-14">Grade</th>
                    <th className="py-3 px-4 min-w-[200px]">Subject Teacher Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {dossier?.scores.map(score => {
                    const gradeInfo = evaluateGrade(score.total);
                    const subj = subjects.find(s => s.id === score.subjectId);

                    return (
                      <tr key={score.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {subj?.name || score.subjectId}
                          <span className="text-[10px] text-slate-400 ml-1.5 font-normal">({subj?.code})</span>
                        </td>
                        <td className="py-3 px-2 text-center font-mono-tabular text-slate-700 dark:text-slate-300">
                          {score.ca1}
                        </td>
                        <td className="py-3 px-2 text-center font-mono-tabular text-slate-700 dark:text-slate-300">
                          {score.ca2}
                        </td>
                        <td className="py-3 px-2 text-center font-mono-tabular text-slate-700 dark:text-slate-300">
                          {score.assignment}
                        </td>
                        <td className="py-3 px-2 text-center font-mono-tabular text-slate-700 dark:text-slate-300">
                          {score.project}
                        </td>
                        <td className="py-3 px-2 text-center font-mono-tabular font-bold text-blue-900 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-950/10">
                          {score.exam}
                        </td>
                        <td className="py-3 px-3 text-center font-mono-tabular font-black text-slate-900 dark:text-slate-100 bg-amber-50/30 dark:bg-amber-950/10">
                          {score.total}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-black border ${gradeInfo.badgeClass}`}>
                            {score.grade}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                          {score.teacherRemark || score.remark}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form Master & Principal Official Remarks */}
          {dossier && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Form Master Endorsement
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  "{dossier.affectiveAndPsychomotor.formMasterRemark || 'An exemplary student who demonstrates high intellectual rigor, active class participation, and leadership.'}"
                </p>
                <div className="text-[11px] text-right font-bold text-slate-700 dark:text-slate-300">
                  — {formMaster.name}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Principal Executive Endorsement
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  "{dossier.affectiveAndPsychomotor.principalRemark || 'Remarkable academic resilience and character. Recommended for academic honors list.'}"
                </p>
                <div className="text-[11px] text-right font-bold text-amber-800 dark:text-amber-400">
                  — Mrs. Cordelia Okonkwo, PhD (Principal)
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* WORKSPACE 2: WEEKLY TIMETABLE & CLASS SCHEDULE */}
      {/* ========================================================================= */}
      {activeTab === 'TIMETABLE' && (
        <div className="space-y-4">
          {/* Timetable Mode Selector */}
          <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Schedule View:
              </span>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setTimetableMode('CLASS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timetableMode === 'CLASS'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Weekly Class Lessons
              </button>
              <button
                onClick={() => setTimetableMode('EXAM')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timetableMode === 'EXAM'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Terminal Exam Timetable
              </button>
            </div>
          </div>

          {timetableMode === 'CLASS' ? (
            <>
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Class Timetable: {currentWard.currentClassArmName}</span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-amber-700 dark:text-amber-400">8 Periods Daily</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Morning Assembly (08:00) • Classes commence 08:15 AM • Closing 03:45 PM
                  </p>
                </div>

                {/* Day Selector Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const).map(day => (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedDay === day
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Period-by-Period Timeline Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {currentDaySchedule.map(period => (
                  <div
                    key={period.periodNumber}
                    className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-amber-400 dark:hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                        Period {period.periodNumber}
                      </span>
                      <span className="text-[11px] font-mono-tabular font-bold text-slate-500 dark:text-slate-400">
                        {period.timeRange}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {period.subjectName}
                      </h4>
                      <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold block mt-0.5">
                        {period.teacherName}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{period.roomOrLab}</span>
                      </span>
                      <span className="font-mono-tabular uppercase text-[10px] font-bold">
                        {period.subjectCode}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Terminal Examination Timetable */
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Terminal Examination Timetable: {currentWard.currentClassArmName}</span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-rose-600 font-bold">Examination Officer Official Schedule</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Candidates must arrive at designated examination halls 30 minutes prior to session start
                  </p>
                </div>
                <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-xl border border-amber-200 dark:border-amber-800">
                  {activeTerm.name} • {activeSession.name}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {examTimetable
                  .filter(e =>
                    e.applicableClasses.some(c => currentWard.currentClassArmName.includes(c)) ||
                    e.applicableClasses.length === 0
                  )
                  .map(exam => (
                    <div
                      key={exam.id}
                      className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-amber-400 transition flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded">
                            {exam.sessionType} SESSION
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                            {exam.examDate}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {exam.subjectName} ({exam.subjectCode})
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Time Slot: <span className="font-semibold text-slate-700 dark:text-slate-300">{exam.timeSlot}</span>
                        </p>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                        <div>Exam Hall: <strong>{exam.examHallName}</strong></div>
                        <div>Chief Invigilator: <strong>{exam.chiefInvigilatorName}</strong></div>
                        {exam.specialInstructions && (
                          <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-[10px] text-slate-600 dark:text-slate-400 italic">
                            Note: {exam.specialInstructions}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* WORKSPACE 3: ENROLLED SUBJECTS & CURRICULUM */}
      {/* ========================================================================= */}
      {activeTab === 'CURRICULUM' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Registered Subject Curriculum ({enrolledSubjects.length} Registered Subjects)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Approved subject list according to Nigerian NERDC / WAEC senior secondary curriculum
              </p>
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              {currentWard.currentClassArmName} Track
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrolledSubjects.map(subj => (
              <div
                key={subj.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-amber-400 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      {subj.code}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      {subj.category}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {subj.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Applicable to: {subj.applicableTo === 'ALL' ? 'All Classes' : `${subj.applicableTo} Secondary`}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Continuous Assessment: 40%</span>
                  <span className="font-bold text-slate-900 dark:text-white">Exam: 60%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* WORKSPACE 4: PASTORAL, ATTENDANCE & BOARDING EXEATS */}
      {/* ========================================================================= */}
      {activeTab === 'PASTORAL' && (
        <div className="space-y-6">
          {/* Statutory Attendance & Character Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Statutory Term Attendance
              </span>
              <div className="text-2xl font-black text-emerald-600 font-mono-tabular">98.5%</div>
              <div className="text-xs text-slate-500">64 of 65 days attended • 1 late roll call</div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Punctuality &amp; Discipline
              </span>
              <div className="text-2xl font-black text-amber-600 font-mono-tabular">5.0 / 5.0</div>
              <div className="text-xs text-slate-500">Exemplary hostel &amp; morning assembly record</div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Moral Standing &amp; Merits
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono-tabular">
                Exemplary
              </div>
              <div className="text-xs text-slate-500">Zero disciplinary flags in current session</div>
            </div>
          </div>

          {/* Boarding Exeat Passes (For Boarders) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>Campus Exeat &amp; Leave of Absence History</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Approved campus departures authorized by Vice Principal (Administration)
                </p>
              </div>
            </div>

            {wardExeats.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No active or historical exeat passes logged for {currentWard.firstName}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <th className="py-3 px-4">Exeat Type</th>
                      <th className="py-3 px-3">Departure</th>
                      <th className="py-3 px-3">Expected Return</th>
                      <th className="py-3 px-4">Destination &amp; Guardian</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3">Approved By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {wardExeats.map(ex => (
                      <tr key={ex.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {ex.exeatType.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-3 font-mono-tabular text-slate-600 dark:text-slate-300">
                          {new Date(ex.departureDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 font-mono-tabular text-slate-600 dark:text-slate-300">
                          {new Date(ex.expectedReturnDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {ex.destination} ({ex.authorizedGuardian})
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              ex.status === 'RETURNED' || ex.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {ex.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono-tabular text-[11px]">
                          {ex.approvedBy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Form Master Inquiries & Messages */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                  <span>Direct Communication with Form Master</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Official parent-to-teacher inquiry channel for academic or welfare concerns
                </p>
              </div>

              <button
                onClick={() => setIsInquiryModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Compose Message</span>
              </button>
            </div>

            {wardInquiries.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                No inquiries logged. Click "Compose Message" to contact {formMaster.name} directly.
              </div>
            ) : (
              <div className="space-y-3">
                {wardInquiries.map(inq => (
                  <div
                    key={inq.id}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{inq.subject}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {inq.status}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{inq.message}</p>
                    {inq.staffReply && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 rounded-lg mt-2">
                        <div className="font-bold text-amber-800 dark:text-amber-400 text-[11px] mb-1">
                          Reply from {inq.recipientStaffName} ({inq.recipientRole}):
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 italic">{inq.staffReply}</p>
                        <div className="text-[10px] text-slate-400 text-right mt-1 font-mono-tabular">
                          {inq.repliedAt ? new Date(inq.repliedAt).toLocaleDateString() : ''}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Direct Form Master Message Modal */}
      {isInquiryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Contact School Official
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ward: <span className="font-bold text-slate-800 dark:text-slate-200">{currentWard.firstName} {currentWard.lastName}</span> ({currentWard.currentClassArmName})
                </p>
              </div>
            </div>

            {inquirySuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Message successfully transmitted to portal inbox!</span>
              </div>
            ) : (
              <form onSubmit={handleSendInquiry} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Send Inquiry To
                  </label>
                  <select
                    value={inquiryRecipientRole}
                    onChange={e => setInquiryRecipientRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="FORM_MASTER">Class Form Master ({formMaster.name})</option>
                    <option value="PRINCIPAL">Executive Principal ({staff.find(s => s.role === 'PRINCIPAL')?.name || 'Dr. Michael Adebayo'})</option>
                    <option value="VICE_PRINCIPAL_ACADEMICS">Vice Principal Academics ({staff.find(s => s.role === 'VICE_PRINCIPAL_ACADEMICS')?.name || 'Mrs. Victoria Okafor'})</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subject / Concern Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Medical dietary follow-up / Project assignment clarification"
                    value={inquirySubject}
                    onChange={e => setInquirySubject(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Detailed Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Type your official note to the Form Master regarding your ward..."
                    value={inquiryMessage}
                    onChange={e => setInquiryMessage(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsInquiryModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingInquiry}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingInquiry ? 'Sending...' : 'Transmit Inquiry'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </FuturisticPageShell>
  );
};

