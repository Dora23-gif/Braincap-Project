import React, { useState, useMemo } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  ExternalCandidateProfile,
  InvigilationShift,
  ClassBroadsheetSeal,
  ExternalExamBody,
  InvigilationRole,
  ExamTimetableEntry
} from '../../types';
import {
  BookOpen,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Users,
  Printer,
  ShieldCheck,
  Send,
  Plus,
  Lock,
  Building,
  Calendar,
  Sparkles,
  ChevronRight,
  X,
  FileCheck,
  FileText,
  UserCheck,
  Bell,
  GraduationCap,
  Award,
  Trash2,
  Edit,
  Download,
  Globe
} from 'lucide-react';

import { FuturisticPageShell } from '../../components/common/FuturisticPageShell';
import { FuturisticKPICard } from '../../components/common/FuturisticKPICard';
import { DoubleBezelCard } from '../../components/common/DoubleBezelCard';
import { SegmentedControl, SegmentedControlOption } from '../../components/common/SegmentedControl';
import { ModalPortal } from '../../components/common/ModalPortal';

export const ExamOfficerDashboardView: React.FC = () => {
  const {
    students,
    classArms,
    classLevels,
    subjects,
    scores,
    staff,
    examHalls,
    invigilationRoster,
    externalCandidates,
    broadsheetSeals,
    assignInvigilator,
    updateInvigilationStatus,
    updateExternalCandidateStatus,
    sealClassBroadsheet,
    nudgeDefaultingTeachers,
    activeSession,
    activeTerm,
    examTimetable,
    addExamTimetableEntry,
    updateExamTimetableEntry,
    deleteExamTimetableEntry,
    sendMessage,
    publishResults
  } = useSchoolData();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'MISSING_MARKS' | 'EXAM_TIMETABLE' | 'EXTERNAL_EXAMS' | 'EXAM_HALLS' | 'INVIGILATION'>('MISSING_MARKS');

  // Search and filters
  const [broadsheetArmFilter, setBroadsheetArmFilter] = useState('ALL');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [examBodyFilter, setExamBodyFilter] = useState<string>('ALL');

  // General Exam Timetable state
  const [examDateFilter, setExamDateFilter] = useState('ALL');
  const [examClassFilter, setExamClassFilter] = useState('ALL');
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examDateInput, setExamDateInput] = useState('2026-04-14');
  const [examTimeSlotInput, setExamTimeSlotInput] = useState('09:00 - 11:30 (Morning Session)');
  const [examSessionTypeInput, setExamSessionTypeInput] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
  const [examSubjectInput, setExamSubjectInput] = useState('');
  const [examClassesInput, setExamClassesInput] = useState<string[]>(['SSS 1', 'SSS 2', 'SSS 3']);
  const [examHallInput, setExamHallInput] = useState('');
  const [examInvigilatorInput, setExamInvigilatorInput] = useState('');
  const [examInstructionsInput, setExamInstructionsInput] = useState('');
  const [examToast, setExamToast] = useState('');
  const [deletingExamItem, setDeletingExamItem] = useState<ExamTimetableEntry | null>(null);

  // Modal states
  const [sealingArm, setSealingArm] = useState<{ id: string; name: string } | null>(null);
  const [sealNotes, setSealNotes] = useState('');
  const [nudgeFeedback, setNudgeFeedback] = useState<string>('');

  const [viewingCandidateCard, setViewingCandidateCard] = useState<ExternalCandidateProfile | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<ExternalCandidateProfile | null>(null);
  const [candidateStatusInput, setCandidateStatusInput] = useState<ExternalCandidateProfile['registrationStatus']>('INDEX_NUMBER_ISSUED');
  const [candidateIndexInput, setCandidateIndexInput] = useState('');

  const [isNewShiftOpen, setIsNewShiftOpen] = useState(false);
  const [newStaffId, setNewStaffId] = useState('');
  const [newHallId, setNewHallId] = useState('');
  const [newDate, setNewDate] = useState('2026-04-06');
  const [newTimeSlot, setNewTimeSlot] = useState('09:00 - 11:30 (Morning Session)');
  const [newSubjectName, setNewSubjectName] = useState('Mathematics (General)');
  const [newRole, setNewRole] = useState<InvigilationRole>('CHIEF_INVIGILATOR');

  const [viewingDeskLabelsHall, setViewingDeskLabelsHall] = useState<any | null>(null);

  // Collation statistics per arm
  const armCollationStats = useMemo(() => {
    return classArms.map(arm => {
      const armStudents = students.filter(s => s.currentClassArmId === arm.id);
      const studentCount = armStudents.length;
      const isJunior = arm.fullName.startsWith('JSS');
      const expectedSubjectsPerStudent = isJunior ? 13 : 9;
      const expectedTotalMarks = studentCount * expectedSubjectsPerStudent;

      const armScores = scores.filter(sc => sc.classArmId === arm.id && sc.termId === activeTerm.id);
      const enteredMarks = armScores.length;
      const completionPercentage = expectedTotalMarks > 0 
        ? Math.min(100, Math.round((enteredMarks / expectedTotalMarks) * 100))
        : 100;

      const isSealed = broadsheetSeals.some(b => b.classArmId === arm.id && b.termId === activeTerm.id);
      const missingCount = Math.max(0, expectedTotalMarks - enteredMarks);
      const sealRecord = broadsheetSeals.find(s => s.classArmId === arm.id && s.termId === activeTerm.id);

      return {
        arm,
        studentCount,
        expectedSubjectsPerStudent,
        expectedTotalMarks,
        enteredMarks,
        completionPercentage,
        missingCount,
        missingScoresCount: missingCount,
        isSealed,
        sealRecord
      };
    });
  }, [classArms, students, scores, activeTerm.id, broadsheetSeals]);

  const overallCollationRate = useMemo(() => {
    const totalExpected = armCollationStats.reduce((acc, a) => acc + a.expectedTotalMarks, 0);
    const totalEntered = armCollationStats.reduce((acc, a) => acc + a.enteredMarks, 0);
    return totalExpected > 0 ? Math.round((totalEntered / totalExpected) * 100) : 100;
  }, [armCollationStats]);

  const totalMissingMarks = useMemo(() => {
    return armCollationStats.reduce((acc, a) => acc + a.missingCount, 0);
  }, [armCollationStats]);

  const sealedArmsCount = useMemo(() => {
    return armCollationStats.filter(a => a.isSealed).length;
  }, [armCollationStats]);

  // Filtered External Candidates
  const filteredCandidates = useMemo(() => {
    return externalCandidates.filter(c => {
      const q = candidateSearch.toLowerCase();
      const matchSearch = c.studentName.toLowerCase().includes(q) ||
        c.admissionNumber.toLowerCase().includes(q) ||
        c.indexNumber.toLowerCase().includes(q) ||
        c.nediNinNumber.includes(q);
      const matchBody = examBodyFilter === 'ALL' || c.examBody === examBodyFilter;
      return matchSearch && matchBody;
    });
  }, [externalCandidates, candidateSearch, examBodyFilter]);

  const handleSealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sealingArm) return;
    sealClassBroadsheet(sealingArm.id, sealNotes, {
      id: user?.id || user?.staffId || 'usr-exam',
      name: user?.name || 'Dr. Michael Adebayo',
      role: 'EXAM_OFFICER'
    });

    const principalStaff = staff.find(s => s.role === 'PRINCIPAL');
    sendMessage({
      threadId: `th-seal-${sealingArm.id}-${Date.now()}`,
      senderId: user?.id || user?.staffId || 'usr-exam',
      senderName: user?.name || 'Examination Officer',
      senderRole: 'EXAMINATION_OFFICER',
      recipientId: principalStaff ? principalStaff.id : 'stf-001',
      recipientName: principalStaff ? principalStaff.name : 'Dr. Michael Adebayo',
      recipientRole: 'PRINCIPAL',
      subject: `Official Broadsheet Sealed: ${sealingArm.name}`,
      content: `The Master Broadsheet for ${sealingArm.name} has been formally sealed by the Examination Council. Sealing notes: "${sealNotes || 'All subject scores verified and sealed without irregularity.'}". It is now ready for your Executive Assent and remarking sign-off.`,
      priority: 'OFFICIAL_DIRECTIVE',
      relatedEntity: { type: 'BROADSHEET', id: sealingArm.id }
    });

    setSealingArm(null);
    setSealNotes('');
  };

  const handleNudge = (armId: string, subjectName: string) => {
    nudgeDefaultingTeachers(armId, subjectName, {
      id: user?.id || user?.staffId || 'usr-exam',
      name: user?.name || 'Dr. Michael Adebayo',
      role: 'EXAM_OFFICER'
    });

    const targetArm = classArms.find(a => a.id === armId);
    if (targetArm) {
      sendMessage({
        threadId: `th-nudge-${armId}-${Date.now()}`,
        senderId: user?.id || user?.staffId || 'usr-exam',
        senderName: user?.name || 'Examination Officer',
        senderRole: 'EXAMINATION_OFFICER',
        recipientId: targetArm.formMasterId || 'stf-001',
        recipientName: targetArm.formMasterName || 'Form Master',
        recipientRole: 'FORM_MASTER',
        subject: `URGENT: Outstanding Continuous Assessment & Examination Scores for ${targetArm.fullName}`,
        content: `Statutory examination collation notice: Outstanding mark sheets have been flagged for ${targetArm.fullName} (${subjectName}). Please ensure all assigned faculty finalize grading before broadsheet seal deadlines.`,
        priority: 'URGENT',
        relatedEntity: { type: 'BROADSHEET', id: armId }
      });
    }

    setNudgeFeedback(`Formal examination board notification dispatched for ${subjectName}.`);
    setTimeout(() => setNudgeFeedback(''), 4000);
  };

  const handleRequestPrincipalAssent = () => {
    const principalStaff = staff.find(s => s.role === 'PRINCIPAL');
    sendMessage({
      threadId: `th-req-assent-${Date.now()}`,
      senderId: user?.id || user?.staffId || 'usr-exam',
      senderName: user?.name || 'Examination Officer',
      senderRole: 'EXAMINATION_OFFICER',
      recipientId: principalStaff ? principalStaff.id : 'stf-001',
      recipientName: principalStaff ? principalStaff.name : 'Dr. Michael Adebayo',
      recipientRole: 'PRINCIPAL',
      subject: `Executive Assent & Clearance Request: ${activeTerm.name} Broadsheets`,
      content: `The Examination Council has collated and sealed class broadsheets for ${activeTerm.name}. We respectfully request your executive inspection, remarking sign-off, and formal ratification of Result Clearance so report cards can be released to students and parents.`,
      priority: 'OFFICIAL_DIRECTIVE',
      relatedEntity: { type: 'RESULT_CLEARANCE', id: activeTerm.id }
    });
    setNudgeFeedback(`Official Executive Assent request transmitted directly to Principal ${principalStaff?.name || 'Dr. Michael Adebayo'}.`);
    setTimeout(() => setNudgeFeedback(''), 5000);
  };

  const handleSaveCandidateEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCandidate) return;
    updateExternalCandidateStatus(
      editingCandidate.id,
      candidateStatusInput,
      candidateIndexInput,
      {
        id: user?.id || user?.staffId || 'usr-exam',
        name: user?.name || 'Dr. Michael Adebayo',
        role: 'EXAM_OFFICER'
      }
    );
    setEditingCandidate(null);
  };

  const handleAssignShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffId || !newHallId) return;

    const staffMember = staff.find(s => s.id === newStaffId);
    const hall = examHalls.find(h => h.id === newHallId);

    assignInvigilator({
      staffId: newStaffId,
      staffName: staffMember?.name || 'Staff Invigilator',
      hallId: newHallId,
      hallName: hall?.name || 'Examination Hall',
      date: newDate,
      timeSlot: newTimeSlot,
      subjectName: newSubjectName,
      role: newRole,
      status: 'SCHEDULED'
    }, {
      id: user?.id || user?.staffId || 'usr-exam',
      name: user?.name || 'Dr. Michael Adebayo',
      role: 'EXAM_OFFICER'
    });

    if (staffMember) {
      sendMessage({
        threadId: `th-invig-${newStaffId}-${Date.now()}`,
        senderId: user?.id || user?.staffId || 'usr-exam',
        senderName: user?.name || 'Examination Officer',
        senderRole: 'EXAMINATION_OFFICER',
        recipientId: newStaffId,
        recipientName: staffMember.name,
        recipientRole: 'TEACHER',
        subject: `Official Invigilation Roster Assignment: ${newSubjectName}`,
        content: `You have been officially rostered as ${newRole} for ${newSubjectName} on ${newDate} (${newTimeSlot}) at ${hall?.name || 'Examination Hall'}. Please report 30 minutes prior to exam commencement.`,
        priority: 'OFFICIAL_DIRECTIVE',
        relatedEntity: { type: 'EXAM_TIMETABLE', id: newStaffId }
      });
    }

    setIsNewShiftOpen(false);
  };

  const EXAM_TABS: SegmentedControlOption<'MISSING_MARKS' | 'EXAM_TIMETABLE' | 'EXTERNAL_EXAMS' | 'EXAM_HALLS' | 'INVIGILATION'>[] = [
    { id: 'MISSING_MARKS', label: 'Collation & Broadsheet Sealing', icon: FileSpreadsheet, count: totalMissingMarks },
    { id: 'EXAM_TIMETABLE', label: 'General Examination Timetable', icon: Calendar, count: examTimetable.length },
    { id: 'EXTERNAL_EXAMS', label: 'External Councils Registry', icon: Award, count: externalCandidates.length },
    { id: 'EXAM_HALLS', label: 'Exam Halls & Desk Allocator', icon: Building, count: examHalls.length },
    { id: 'INVIGILATION', label: 'Faculty Invigilation Roster', icon: UserCheck, count: invigilationRoster.length }
  ];

  return (
    <FuturisticPageShell
      title="EXAMINATION COUNCIL & MODERATION HUB"
      subtitle="Live continuous assessment collation, master broadsheet statutory sealing, WAEC/NECO/BECE registry, and examination halls."
      icon={Award}
      badgeText={activeTerm.isResultsPublished ? 'Broadsheets Published' : 'Moderation In Progress'}
      badgeVariant={activeTerm.isResultsPublished ? 'success' : 'warning'}
    >
      {/* 4 Metric Summary Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <FuturisticKPICard
          title="Overall Collation Rate"
          value={`${overallCollationRate}%`}
          subtitle={`${sealedArmsCount} of ${classArms.length} Broadsheets Sealed`}
          icon={FileSpreadsheet}
          sparklineData={[42, 58, 67, 75, 84, overallCollationRate]}
          glowColor="emerald"
          trend={{ value: 'Broadsheet Pace', isPositive: true }}
          onClick={() => setActiveTab('MISSING_MARKS')}
        />

        <FuturisticKPICard
          title="Pending / Missing Marks"
          value={totalMissingMarks}
          subtitle="Unsubmitted CA / Exam Scores"
          icon={AlertTriangle}
          glowColor="rose"
          badge={totalMissingMarks > 0 ? 'Action Req' : 'Complete'}
          trend={{ value: totalMissingMarks > 0 ? 'Defaulting Faculty' : 'Zero Deficits', isPositive: totalMissingMarks === 0 }}
          onClick={() => setActiveTab('MISSING_MARKS')}
        />

        <FuturisticKPICard
          title="External Candidates"
          value={externalCandidates.length}
          subtitle="WAEC • NECO • BECE Registry"
          icon={GraduationCap}
          glowColor="amber"
          badge="External Reg"
          onClick={() => setActiveTab('EXTERNAL_EXAMS')}
        />

        <FuturisticKPICard
          title="Exam Halls & Desks"
          value={`${examHalls.length} Halls`}
          subtitle={`${examHalls.reduce((a, b) => a + b.capacity, 0)} Total Seating Capacity`}
          icon={Building}
          glowColor="cyan"
          badge="Logistics"
          onClick={() => setActiveTab('EXAM_HALLS')}
        />
      </div>

      {/* Navigation Tabs with SegmentedControl */}
      <SegmentedControl
        options={EXAM_TABS}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {nudgeFeedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-slide-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{nudgeFeedback}</span>
        </div>
      )}

      {/* TAB 1: COLLATION & MISSING MARKS AUDIT */}
      {activeTab === 'MISSING_MARKS' && (
        <div className="space-y-6">
          {/* Executive Clearance & Portal Publication Gate */}
          <DoubleBezelCard>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  activeTerm.isResultsApprovedByPrincipal
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}>
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Terminal Results Publication &amp; Executive Assent Gate
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeTerm.isResultsApprovedByPrincipal
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}>
                      {activeTerm.isResultsApprovedByPrincipal ? '✓ Principal Assent Granted' : '⏳ Awaiting Principal Assent'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                    {activeTerm.isResultsApprovedByPrincipal
                      ? 'The Principal has ratified executive clearance and completed pastoral remarking. The Examination Council is authorized to publish broadsheets and student report cards live to portal users.'
                      : 'Statutory prerequisite: Broadsheets must receive executive clearance and remarking approval from the Principal before terminal release to student and parent dashboards.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {!activeTerm.isResultsApprovedByPrincipal ? (
                  <button
                    onClick={handleRequestPrincipalAssent}
                    className="touch-target px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Request Executive Assent</span>
                  </button>
                ) : (
                  <button
                    onClick={() => publishResults(activeTerm.id, !activeTerm.isResultsPublished)}
                    className={`touch-target px-5 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95 ${
                      activeTerm.isResultsPublished
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/20'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/20'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>{activeTerm.isResultsPublished ? 'Revoke Portal Release' : 'Publish Results to Portals'}</span>
                  </button>
                )}
              </div>
            </div>
          </DoubleBezelCard>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Class Arm Broadsheet Collation Progress & Sealing Gate
                </h3>
                <p className="text-xs text-slate-500">
                  Track mark sheet completion across cohorts. Broadsheets with 100% entry can be sealed and transmitted to Principal clearance.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={broadsheetArmFilter}
                  onChange={e => setBroadsheetArmFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                >
                  <option value="ALL">All 12 Class Arms</option>
                  {classArms.map(arm => (
                    <option key={arm.id} value={arm.id}>{arm.fullName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-4">Class Arm</th>
                    <th className="p-4 text-center">Enrolled Pupils</th>
                    <th className="p-4 text-center">Marks Entered / Expected</th>
                    <th className="p-4 text-center">Collation Progress</th>
                    <th className="p-4 text-center">Missing Marks</th>
                    <th className="p-4">Sealing Status</th>
                    <th className="p-4 text-right">Officer Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {armCollationStats
                    .filter(item => broadsheetArmFilter === 'ALL' || item.arm.id === broadsheetArmFilter)
                    .map(item => (
                      <tr key={item.arm.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">{item.arm.fullName}</div>
                          <div className="text-[11px] text-slate-400">{item.arm.formMasterName} (Form Master)</div>
                        </td>
                        <td className="p-4 text-center font-bold text-slate-800 dark:text-slate-200">
                          {item.studentCount}
                        </td>
                        <td className="p-4 text-center font-mono text-slate-700 dark:text-slate-300">
                          {item.enteredMarks} / {item.expectedTotalMarks}
                        </td>
                        <td className="p-4 text-center">
                          <div className="w-28 mx-auto space-y-1">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span>{item.completionPercentage}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  item.completionPercentage === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${item.completionPercentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {item.missingScoresCount > 0 ? (
                            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-xs font-mono">
                              {item.missingScoresCount} missing
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Complete</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {item.isSealed ? (
                            <div>
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[10px] uppercase tracking-wide flex items-center gap-1 w-fit">
                                <Lock className="w-3 h-3" />
                                <span>SEALED & TRANSMITTED</span>
                              </span>
                              <div className="text-[10px] text-slate-400 mt-1">{item.sealRecord?.sealedBy}</div>
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wide">
                              UNSEALED / IN PROGRESS
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.missingScoresCount > 0 && (
                              <button
                                onClick={() => handleNudge(item.arm.id, 'Continuous Assessment & Examination')}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-semibold text-xs border border-rose-200 dark:border-rose-900 cursor-pointer flex items-center gap-1"
                                title="Broadcast compliance reminder to subject masters"
                              >
                                <Bell className="w-3 h-3" />
                                <span>Nudge Masters</span>
                              </button>
                            )}
                            {!item.isSealed && (
                              <button
                                onClick={() => setSealingArm({ id: item.arm.id, name: item.arm.fullName })}
                                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1"
                              >
                                <Lock className="w-3 h-3" />
                                <span>Seal Broadsheet</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GENERAL EXAMINATION TIMETABLE */}
      {activeTab === 'EXAM_TIMETABLE' && (
        <div className="space-y-6 animate-fade-slide-up">
          {/* Header Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif-title font-bold text-slate-900 dark:text-white text-base">
                    Master General Examination Timetable
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Official Schedule Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  The Examination Officer oversees and schedules all terminal examinations, practical sessions, hall logistics, and chief invigilation appointments for junior and senior schools.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Schedule</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingExamId(null);
                  setExamDateInput('2026-04-14');
                  setExamTimeSlotInput('09:00 - 11:30 (Morning Session)');
                  setExamSessionTypeInput('MORNING');
                  setExamSubjectInput(subjects[0]?.name || 'Mathematics (General)');
                  setExamClassesInput(['SSS 1', 'SSS 2', 'SSS 3']);
                  setExamHallInput(examHalls[0]?.id || 'hall-01');
                  setExamInvigilatorInput(staff[0]?.id || 'stf-001');
                  setExamInstructionsInput('Official examination rules apply.');
                  setIsExamModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-950/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule Exam Paper</span>
              </button>
            </div>
          </div>

          {examToast && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-slide-up">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{examToast}</span>
            </div>
          )}

          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Scheduled Papers: {examTimetable.length}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Active Term: {activeTerm.name} ({activeSession.name})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500">Cohort:</span>
                <select
                  value={examClassFilter}
                  onChange={e => setExamClassFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium"
                >
                  <option value="ALL">All Cohorts</option>
                  <option value="JSS 1">JSS 1</option>
                  <option value="JSS 2">JSS 2</option>
                  <option value="JSS 3">JSS 3</option>
                  <option value="SSS 1">SSS 1</option>
                  <option value="SSS 2">SSS 2</option>
                  <option value="SSS 3">SSS 3</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500">Date:</span>
                <select
                  value={examDateFilter}
                  onChange={e => setExamDateFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium"
                >
                  <option value="ALL">All Dates</option>
                  {Array.from(new Set(examTimetable.map(e => e.examDate))).sort().map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Timetable Schedule Grid / Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3.5 px-4 min-w-[140px]">Date & Session</th>
                    <th className="py-3.5 px-4 min-w-[200px]">Subject & Paper</th>
                    <th className="py-3.5 px-4 min-w-[170px]">Applicable Classes</th>
                    <th className="py-3.5 px-4 min-w-[180px]">Examination Hall</th>
                    <th className="py-3.5 px-4 min-w-[160px]">Chief Invigilator</th>
                    <th className="py-3.5 px-4 min-w-[180px]">Instructions</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {examTimetable
                    .filter(entry => {
                      if (examDateFilter !== 'ALL' && entry.examDate !== examDateFilter) return false;
                      if (examClassFilter !== 'ALL' && !entry.applicableClasses.some(c => c.includes(examClassFilter))) return false;
                      return true;
                    })
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors">
                        <td className="py-3 px-4 font-mono-tabular">
                          <div className="font-bold text-slate-900 dark:text-white">{item.examDate}</div>
                          <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.sessionType === 'MORNING'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                          }`}>
                            {item.timeSlot}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">
                            {item.subjectName}
                          </div>
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                            Code: {item.subjectCode}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {item.applicableClasses.map(c => (
                              <span
                                key={c}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-semibold">
                            <Building className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                            <span>{item.examHallName}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>{item.chiefInvigilatorName}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs italic max-w-xs">
                          {item.specialInstructions || 'Standard exam protocols apply.'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingExamId(item.id);
                                setExamDateInput(item.examDate);
                                setExamTimeSlotInput(item.timeSlot);
                                setExamSessionTypeInput(item.sessionType);
                                setExamSubjectInput(item.subjectName);
                                setExamClassesInput(item.applicableClasses);
                                setExamHallInput(item.examHallId);
                                setExamInvigilatorInput(item.chiefInvigilatorStaffId);
                                setExamInstructionsInput(item.specialInstructions || '');
                                setIsExamModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                              title="Edit exam paper parameters"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingExamItem(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                              title="Delete scheduled paper"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXTERNAL EXAMS REGISTRY (WAEC / NECO / BECE) */}
      {activeTab === 'EXTERNAL_EXAMS' && (
        <div className="space-y-6">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-xs">
              <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                Statutory External Council Registration Compliance (Center No: 4250102)
              </h3>
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                All WAEC/NECO senior candidates must be registered for exactly <strong>9 accredited subjects</strong> and have verified 11-digit National Identity Numbers (NIN) in accordance with the National Education Data Infrastructure (NEDI) mandate. JSS 3 BECE candidates must register all <strong>13 compulsory junior subjects</strong>.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                Candidate Master Entry Register ({filteredCandidates.length} Candidates)
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search candidate, NIN, index no..."
                    value={candidateSearch}
                    onChange={e => setCandidateSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <select
                  value={examBodyFilter}
                  onChange={e => setExamBodyFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                >
                  <option value="ALL">All Examination Bodies</option>
                  <option value="WAEC_WASSCE">WAEC WASSCE (May/June)</option>
                  <option value="NECO_SSCE">NECO SSCE (June/July)</option>
                  <option value="BECE_JSCE">BECE Junior WAEC</option>
                  <option value="JAMB_UTME">JAMB UTME Screening</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-4">Candidate Details</th>
                    <th className="p-4">Exam Body</th>
                    <th className="p-4">Index / Center Code</th>
                    <th className="p-4">NEDI / NIN Identifier</th>
                    <th className="p-4 text-center">Accredited Subjects</th>
                    <th className="p-4 text-center">Registration Status</th>
                    <th className="p-4 text-right">Photo Card & Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCandidates.map(cand => (
                    <tr key={cand.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-4 flex items-center gap-3">
                        <img
                          src={cand.passportPhotoUrl}
                          alt={cand.studentName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-sm">{cand.studentName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{cand.admissionNumber} &bull; {cand.classArmName}</div>
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                        {cand.examBody.replace(/_/g, ' ')}
                      </td>
                      <td className="p-4 font-mono font-bold text-amber-700 dark:text-amber-400">
                        {cand.indexNumber}
                        <div className="text-[10px] text-slate-400 font-normal">Center: {cand.centerNumber}</div>
                      </td>
                      <td className="p-4 font-mono text-slate-700 dark:text-slate-300">
                        {cand.nediNinNumber}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                          cand.registeredSubjectCodes.length === 9 || cand.registeredSubjectCodes.length === 13
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {cand.registeredSubjectCodes.length} Subjects
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                          {cand.registrationStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingCandidate(cand);
                              setCandidateStatusInput(cand.registrationStatus);
                              setCandidateIndexInput(cand.indexNumber);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer"
                          >
                            Update
                          </button>
                          <button
                            onClick={() => setViewingCandidateCard(cand)}
                            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Photo Card</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXAM HALLS & SEATING ENGINE */}
      {activeTab === 'EXAM_HALLS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {examHalls.map(hall => (
              <div key={hall.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 flex items-center justify-center font-bold font-mono">
                    {hall.code}
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 font-mono">
                    {hall.capacity} Desks
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{hall.name}</h4>
                  <p className="text-xs text-slate-500">{hall.building}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Assigned Cohorts</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {hall.assignedArms.map((armName, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
                        {armName}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setViewingDeskLabelsHall(hall)}
                  className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Generate Desk Labels</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: FACULTY INVIGILATION ROSTER */}
      {activeTab === 'INVIGILATION' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Master Faculty Invigilation & Relief Duty Schedule
              </h3>
              <p className="text-xs text-slate-500">
                Official roster of chief invigilators, assistants, and relief proctors across all active examination halls.
              </p>
            </div>
            <button
              onClick={() => setIsNewShiftOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Roster Invigilator</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-4">Invigilating Officer</th>
                    <th className="p-4">Assigned Hall</th>
                    <th className="p-4">Date & Session Time</th>
                    <th className="p-4">Examination Paper</th>
                    <th className="p-4 text-center">Invigilation Role</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invigilationRoster.map(shift => (
                    <tr key={shift.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{shift.staffName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{shift.staffId}</div>
                      </td>
                      <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">{shift.hallName}</td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{shift.date}</div>
                        <div className="text-[11px] text-slate-400">{shift.timeSlot}</div>
                      </td>
                      <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{shift.subjectName}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          shift.role === 'CHIEF_INVIGILATOR'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                            : shift.role === 'ASSISTANT_INVIGILATOR'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {shift.role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {shift.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => updateInvigilationStatus(shift.id, shift.status === 'COMPLETED' ? 'CONFIRMED' : 'COMPLETED')}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer"
                        >
                          {shift.status === 'COMPLETED' ? 'Reopen' : 'Mark Done'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SEAL BROADSHEET */}
      {sealingArm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Seal & Transmit Master Broadsheet
              </h3>
              <button
                onClick={() => setSealingArm(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              You are about to formally seal the terminal broadsheet for <strong>{sealingArm.name}</strong> ({activeTerm.name}). This certifies that all marks are moderated and transmits the broadsheet to the <strong>Principal's Executive Clearance Desk</strong>.
            </p>

            <form onSubmit={handleSealSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Examination Officer Submission Notes
                </label>
                <textarea
                  rows={3}
                  value={sealNotes}
                  onChange={e => setSealNotes(e.target.value)}
                  placeholder="e.g. All continuous assessment scores verified; no grade anomalies detected; broadsheet certified."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSealingArm(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Seal Broadsheet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CANDIDATE OFFICIAL PHOTOCARD SLIP */}
      {viewingCandidateCard && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6 border border-slate-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-amber-600 pb-4">
              <div className="flex items-center gap-3">
                <img src="/crest.svg" alt="Everest Crest" className="w-12 h-14 object-contain" />
                <div>
                  <h3 className="font-serif font-black text-base text-slate-900">
                    EVEREST INTERNATIONAL SCHOOLS
                  </h3>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-amber-700">
                    Official External Examination Entry Card & Photocard
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewingCandidateCard(null)}
                className="text-slate-400 hover:text-slate-600 p-1 print:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate Identity */}
            <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <img
                src={viewingCandidateCard.passportPhotoUrl}
                alt={viewingCandidateCard.studentName}
                className="w-20 h-24 object-cover rounded-xl border-2 border-slate-300 shadow-sm shrink-0"
              />
              <div className="space-y-1 text-xs">
                <div className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
                  {viewingCandidateCard.examBody.replace(/_/g, ' ')}
                </div>
                <div className="font-serif font-bold text-slate-900 text-base">
                  {viewingCandidateCard.studentName}
                </div>
                <div className="font-mono text-slate-600">Admission: {viewingCandidateCard.admissionNumber}</div>
                <div className="font-mono font-bold text-slate-900">
                  Index No: <span className="text-amber-700">{viewingCandidateCard.indexNumber}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Center No: {viewingCandidateCard.centerNumber} &bull; NIN: {viewingCandidateCard.nediNinNumber}
                </div>
              </div>
            </div>

            {/* Accredited Subjects List */}
            <div className="space-y-2 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Accredited Subjects ({viewingCandidateCard.registeredSubjectNames.length} Total)
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {viewingCandidateCard.registeredSubjectNames.map((subj, idx) => (
                  <div key={idx} className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-800 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-900 text-[10px] flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    <span className="truncate">{subj}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification Sign-Off */}
            <div className="pt-4 border-t border-slate-200 flex justify-between items-end text-xs">
              <div>
                <div className="font-serif italic text-sm text-slate-800">Mr. Samuel Danjuma</div>
                <div className="font-bold text-slate-900">Chief Examination Officer</div>
                <div className="text-[10px] text-slate-400">Accredited WAEC/NECO Custodian</div>
              </div>
              <div className="text-right">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-600 flex items-center justify-center text-[8px] font-bold text-amber-800 uppercase text-center p-1">
                  OFFICIAL COUNCIL SEAL
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 print:hidden">
              <button
                onClick={() => setViewingCandidateCard(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Photocard</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: UPDATE CANDIDATE REGISTRATION */}
      {editingCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Update External Candidate Status
              </h3>
              <button
                onClick={() => setEditingCandidate(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCandidateEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Council Index Number
                </label>
                <input
                  type="text"
                  required
                  value={candidateIndexInput}
                  onChange={e => setCandidateIndexInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Registration Lifecycle Status
                </label>
                <select
                  value={candidateStatusInput}
                  onChange={e => setCandidateStatusInput(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
                >
                  <option value="BIODATA_CAPTURED">Biodata Captured</option>
                  <option value="SUBJECTS_VERIFIED">Subjects Verified</option>
                  <option value="FEES_CLEARED">Council Fees Cleared</option>
                  <option value="INDEX_NUMBER_ISSUED">Index Number Issued</option>
                  <option value="SUBMITTED_TO_COUNCIL">Submitted to Council Portal</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCandidate(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ROSTER NEW INVIGILATOR */}
      {isNewShiftOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Assign Faculty Invigilation Duty
              </h3>
              <button
                onClick={() => setIsNewShiftOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignShift} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Faculty Member
                </label>
                <select
                  required
                  value={newStaffId}
                  onChange={e => setNewStaffId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  <option value="">-- Select Teacher --</option>
                  {staff.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.title})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Examination Hall
                </label>
                <select
                  required
                  value={newHallId}
                  onChange={e => setNewHallId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  <option value="">-- Select Hall --</option>
                  {examHalls.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.capacity} seats)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Exam Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Invigilation Role
                  </label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="CHIEF_INVIGILATOR">Chief Invigilator</option>
                    <option value="ASSISTANT_INVIGILATOR">Assistant Invigilator</option>
                    <option value="RELIEF_INVIGILATOR">Relief Invigilator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Session Time Slot
                </label>
                <input
                  type="text"
                  required
                  value={newTimeSlot}
                  onChange={e => setNewTimeSlot(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Paper
                </label>
                <input
                  type="text"
                  required
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewShiftOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md cursor-pointer"
                >
                  Confirm Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRINT DESK LABELS */}
      {viewingDeskLabelsHall && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 border border-slate-300">
            <div className="flex items-center justify-between border-b-2 border-cyan-700 pb-3">
              <div>
                <h3 className="font-serif font-black text-base text-slate-900">
                  {viewingDeskLabelsHall.name} — Desk Number Labels
                </h3>
                <div className="text-[10px] uppercase font-bold text-cyan-700">
                  Seating Capacity: {viewingDeskLabelsHall.capacity} Desks &bull; Assigned: {viewingDeskLabelsHall.assignedArms.join(', ')}
                </div>
              </div>
              <button
                onClick={() => setViewingDeskLabelsHall(null)}
                className="text-slate-400 hover:text-slate-600 p-1 print:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-2">
              {Array.from({ length: 9 }).map((_, idx) => (
                <div key={idx} className="p-3 rounded-xl border-2 border-dashed border-slate-300 text-center space-y-1 bg-slate-50">
                  <div className="text-[9px] uppercase font-bold text-slate-400">DESK NUMBER</div>
                  <div className="font-mono font-black text-2xl text-slate-900">
                    {viewingDeskLabelsHall.code}-{String(idx + 1).padStart(3, '0')}
                  </div>
                  <div className="text-[10px] font-bold text-cyan-800 truncate">
                    {viewingDeskLabelsHall.assignedArms[0]}
                  </div>
                  <div className="text-[9px] text-slate-400">Everest International Schools</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 print:hidden">
              <button
                onClick={() => setViewingDeskLabelsHall(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
              >
                Dismiss
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print Hall Desk Cards</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SCHEDULE / EDIT EXAM PAPER */}
      {isExamModalOpen && (
        <ModalPortal>
          <div className="bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif-title font-bold text-slate-900 dark:text-white text-base">
                    {editingExamId ? 'Edit Examination Paper' : 'Schedule New Examination Paper'}
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Official General Examination Timetable Entry
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExamModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                const subj = subjects.find(s => s.name.toLowerCase() === examSubjectInput.toLowerCase()) || {
                  name: examSubjectInput,
                  code: examSubjectInput.slice(0, 4).toUpperCase()
                };
                const hall = examHalls.find(h => h.id === examHallInput) || examHalls[0];
                const invigilator = staff.find(s => s.id === examInvigilatorInput) || staff[0];

                if (editingExamId) {
                  updateExamTimetableEntry(editingExamId, {
                    examDate: examDateInput,
                    timeSlot: examTimeSlotInput,
                    sessionType: examSessionTypeInput,
                    subjectName: subj.name,
                    subjectCode: subj.code,
                    applicableClasses: examClassesInput.length > 0 ? examClassesInput : ['All Classes'],
                    examHallId: hall?.id || 'hall-01',
                    examHallName: hall?.name || 'Main Exam Hall Alpha',
                    chiefInvigilatorStaffId: invigilator?.id || 'stf-001',
                    chiefInvigilatorName: invigilator?.name || 'Staff Member',
                    specialInstructions: examInstructionsInput
                  }, {
                    id: user?.id || 'exam-usr',
                    name: user?.name || 'Dr. Kemi Adeleke',
                    role: 'EXAM_OFFICER'
                  });
                  setExamToast(`Updated examination paper ${subj.name}.`);
                } else {
                  addExamTimetableEntry({
                    examDate: examDateInput,
                    timeSlot: examTimeSlotInput,
                    sessionType: examSessionTypeInput,
                    subjectName: subj.name,
                    subjectCode: subj.code,
                    applicableClasses: examClassesInput.length > 0 ? examClassesInput : ['All Classes'],
                    examHallId: hall?.id || 'hall-01',
                    examHallName: hall?.name || 'Main Exam Hall Alpha',
                    chiefInvigilatorStaffId: invigilator?.id || 'stf-001',
                    chiefInvigilatorName: invigilator?.name || 'Staff Member',
                    specialInstructions: examInstructionsInput
                  }, {
                    id: user?.id || 'exam-usr',
                    name: user?.name || 'Dr. Kemi Adeleke',
                    role: 'EXAM_OFFICER'
                  });
                  setExamToast(`Successfully scheduled examination paper ${subj.name}.`);
                }
                setTimeout(() => setExamToast(''), 3500);
                setIsExamModalOpen(false);
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Exam Date
                  </label>
                  <input
                    type="date"
                    required
                    value={examDateInput}
                    onChange={e => setExamDateInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Session Type
                  </label>
                  <select
                    value={examSessionTypeInput}
                    onChange={e => {
                      const val = e.target.value as 'MORNING' | 'AFTERNOON';
                      setExamSessionTypeInput(val);
                      if (val === 'MORNING') setExamTimeSlotInput('09:00 - 11:30 (Morning Session)');
                      else setExamTimeSlotInput('13:00 - 15:30 (Afternoon Session)');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="MORNING">Morning Session (09:00 - 11:30)</option>
                    <option value="AFTERNOON">Afternoon Session (13:00 - 15:30)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Time Slot Description
                </label>
                <input
                  type="text"
                  required
                  value={examTimeSlotInput}
                  onChange={e => setExamTimeSlotInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  placeholder="e.g. 09:00 - 11:30 (Morning Session)"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subject / Examination Paper
                </label>
                <select
                  required
                  value={examSubjectInput}
                  onChange={e => setExamSubjectInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  <option value="">Select Examination Subject</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Applicable Classes / Cohorts
                </label>
                <div className="flex flex-wrap gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  {['JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'].map(c => {
                    const isSelected = examClassesInput.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setExamClassesInput(examClassesInput.filter(x => x !== c));
                          } else {
                            setExamClassesInput([...examClassesInput, c]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Examination Hall
                  </label>
                  <select
                    required
                    value={examHallInput}
                    onChange={e => setExamHallInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">Select Exam Hall</option>
                    {examHalls.map(h => (
                      <option key={h.id} value={h.id}>{h.name} (Cap: {h.capacity})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Chief Invigilator
                  </label>
                  <select
                    required
                    value={examInvigilatorInput}
                    onChange={e => setExamInvigilatorInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">Select Faculty Member</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.title || s.role || 'Faculty'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Special Instructions / Materials Allowed
                </label>
                <textarea
                  rows={2}
                  value={examInstructionsInput}
                  onChange={e => setExamInstructionsInput(e.target.value)}
                  placeholder="e.g. Non-programmable mathematical instruments and 4-figure tables allowed."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 font-medium resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsExamModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{editingExamId ? 'Save Changes' : 'Schedule Examination Paper'}</span>
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* Exam Timetable Paper Deletion Confirmation Modal */}
      <ModalPortal isOpen={!!deletingExamItem} onClose={() => setDeletingExamItem(null)} maxWidthClass="max-w-md">
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400 shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Remove Examination Paper</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-900 dark:text-white font-semibold">{deletingExamItem?.subjectName}</strong> scheduled for <span className="font-semibold text-slate-800 dark:text-slate-200">{deletingExamItem?.examDate}</span> ({deletingExamItem?.timeSlot}) from the master examination timetable?
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeletingExamItem(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (deletingExamItem) {
                  deleteExamTimetableEntry(deletingExamItem.id, {
                    id: user?.id || 'exam-usr',
                    name: user?.name || 'Dr. Kemi Adeleke',
                    role: 'EXAM_OFFICER'
                  });
                  setExamToast(`Removed ${deletingExamItem.subjectName} from exam timetable.`);
                  setTimeout(() => setExamToast(''), 3000);
                  setDeletingExamItem(null);
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer shadow-xs"
            >
              Confirm Removal
            </button>
          </div>
        </div>
      </ModalPortal>
    </FuturisticPageShell>
  );
};
