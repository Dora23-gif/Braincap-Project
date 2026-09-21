import React, { useState, useMemo, useEffect } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import { getWelcomeMessage } from '../../lib/userDisplay';
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
  BarChart3,
  MessageSquare,
  Calendar,
  Layers,
  LayoutDashboard,
  FileText,
  Search,
  Filter,
  ArrowRight
} from 'lucide-react';

import { FuturisticPageShell } from '../../components/common/FuturisticPageShell';
import { FuturisticKPICard } from '../../components/common/FuturisticKPICard';
import { DoubleBezelCard } from '../../components/common/DoubleBezelCard';
import { BarDistributionChart } from '../../components/common/ChartComponents';
import { ModalPortal } from '../../components/common/ModalPortal';
import { evaluateGrade } from '../../lib/gradeCalculator';
import { resolveArmId, resolveSubjectId, resolveArmPk, resolveSubjectPk } from '../../lib/api';

interface SubjectTeacherDashboardViewProps {
  onNavigateToScores?: (classArmId?: string, subjectId?: string) => void;
  onNavigateView?: (view: string) => void;
}

export const SubjectTeacherDashboardView: React.FC<SubjectTeacherDashboardViewProps> = ({
  onNavigateToScores,
  onNavigateView
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
    subjects,
    staff
  } = useSchoolData();

  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'classes' | 'subjects' | 'performance' | 'reports'>('dashboard');

  // Dynamically resolve teacher's allocated subjects from live context allocations
  const teacherAllocations = useMemo(() => {
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

    const fromAllocations = allocations.filter(isTeacherMatch);
    const source = fromAllocations.length > 0 ? fromAllocations : (user?.allocatedSubjects || []);
    return source.map((a: any) => {
      const armCanonical = resolveArmId(a.classArmId || a.class_arm || a.class_arm_id, a.classArmName || a.class_arm_name);
      const armObj = classArms.find(arm => arm.id === armCanonical || resolveArmId(arm.id, arm.fullName) === armCanonical);
      const subjCanonical = resolveSubjectId(a.subjectId || a.subject_code || a.subject || a.subject_id);
      const subjObj = subjects.find(s => s.id === subjCanonical || resolveSubjectId(s.id) === subjCanonical);

      return {
        classArmId: armCanonical,
        classArmName: armObj?.fullName || a.classArmName || a.class_arm_name || armCanonical,
        subjectId: subjCanonical,
        subjectName: subjObj?.name || a.subjectName || a.subject_name || subjCanonical
      };
    });
  }, [allocations, user, classArms, subjects]);

  // Unique classes and subjects
  const uniqueClassArmIds = useMemo(() => {
    return Array.from(new Set(teacherAllocations.map(a => a.classArmId)));
  }, [teacherAllocations]);

  const uniqueSubjectIds = useMemo(() => {
    return Array.from(new Set(teacherAllocations.map(a => a.subjectId)));
  }, [teacherAllocations]);

  // Scheduled timetable periods across assigned arms
  const myTeachingPeriods = useMemo(() => {
    const periodsList: { day: string; periodNumber: number; time: string; subject: string; classArm: string; room?: string }[] = [];
    
    uniqueClassArmIds.forEach(armId => {
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
  }, [weeklyTimetables, teacherAllocations, uniqueClassArmIds, classArms]);

  // Helper to resolve all students offering a subject in a specific arm
  const getStudentsOfferingSubjectInArm = (classArmId: string, classArmName?: string, subjectId?: string) => {
    if (!classArmId || !subjectId) return [];

    const canonicalArmId = resolveArmId(classArmId, classArmName);
    const armPk = resolveArmPk(classArmId) || resolveArmPk(classArmName) || resolveArmPk(canonicalArmId);
    const canonicalSubjId = resolveSubjectId(subjectId);
    const subjPk = resolveSubjectPk(subjectId) || resolveSubjectPk(canonicalSubjId);
    const subjCode = canonicalSubjId.replace(/^subj-/, '').toUpperCase();

    // Look up subject object and arm object
    const subjObj = subjects.find(s =>
      s.id === subjectId ||
      s.id === canonicalSubjId ||
      s.code?.toUpperCase() === subjCode ||
      (subjPk !== undefined && (s as any).pk === subjPk)
    );
    const armObj = classArms.find(a =>
      a.id === classArmId ||
      a.id === canonicalArmId ||
      resolveArmId(a.id, a.fullName) === canonicalArmId ||
      (armPk !== undefined && resolveArmPk(a.id) === armPk)
    );

    const armFullName = (armObj?.fullName || classArmName || '').toLowerCase();
    const isJuniorArm = armFullName.includes('jss') || canonicalArmId.includes('jss');
    const isSeniorArm = armFullName.includes('sss') || canonicalArmId.includes('sss');
    const isScienceArm =
      armFullName.includes('science') ||
      armFullName.includes('diamond') ||
      armFullName.includes('emerald') ||
      armFullName.includes('gold') ||
      canonicalArmId.includes('diamond') ||
      canonicalArmId.includes('emerald') ||
      canonicalArmId.includes('gold');

    // Compulsory subject logic (WAEC / Everest core rules):
    const isCompulsoryForArm = Boolean(
      (isJuniorArm && (
        subjObj?.isCompulsoryJunior ||
        subjObj?.applicableTo === 'JUNIOR' ||
        subjObj?.applicableTo === 'ALL' ||
        subjObj?.category === 'CORE'
      )) ||
      (isSeniorArm && (
        subjObj?.category === 'CORE' ||
        ['ENG', 'MTH', 'CIV', 'HIS'].includes(subjCode) ||
        (subjObj?.isCompulsorySeniorScience && (isScienceArm || ['PHY', 'CHE', 'BIO'].includes(subjCode))) ||
        (['PHY', 'CHE', 'BIO'].includes(subjCode) && isScienceArm)
      ))
    );

    return students.filter(s => {
      // 1. Arm matching (resilient against slug, PK, and full name)
      const matchesArm =
        s.currentClassArmId === classArmId ||
        s.currentClassArmId === canonicalArmId ||
        resolveArmId(s.currentClassArmId, s.currentClassArmName) === canonicalArmId ||
        (armPk !== undefined && resolveArmPk(s.currentClassArmId) === armPk) ||
        (Boolean(armObj?.fullName) && Boolean(s.currentClassArmName) && s.currentClassArmName.toLowerCase().trim() === armObj!.fullName.toLowerCase().trim());

      if (!matchesArm) return false;

      // If subject is compulsory for this class arm, every student in the arm offers it!
      if (isCompulsoryForArm) return true;

      // 2. Subject offering check:
      const regIds = Array.isArray(s.registeredSubjectIds) ? s.registeredSubjectIds : [];
      const regCodes = Array.isArray(s.registeredSubjectCodes) ? s.registeredSubjectCodes.map(c => c.toUpperCase()) : [];

      const isRegistered =
        regIds.includes(subjectId) ||
        regIds.includes(canonicalSubjId) ||
        regIds.includes(`subj-${subjCode.toLowerCase()}`) ||
        regIds.includes(subjCode.toLowerCase()) ||
        regIds.includes(subjCode) ||
        (subjPk !== undefined && regIds.includes(String(subjPk))) ||
        regCodes.includes(subjCode);

      if (isRegistered) return true;

      // 3. Existing score record for this specific subject and term
      const hasScoreRecord = scores.some(
        sc => (sc.studentId === s.id || (s.admissionNumber && sc.admissionNumber === s.admissionNumber)) &&
              (sc.subjectId === subjectId ||
               sc.subjectId === canonicalSubjId ||
               sc.subjectId.toLowerCase().replace(/^subj-/, '') === subjCode.toLowerCase() ||
               (subjPk !== undefined && String(sc.subjectId) === String(subjPk))) &&
              (sc.classArmId === classArmId ||
               sc.classArmId === canonicalArmId ||
               resolveArmId(sc.classArmId) === canonicalArmId ||
               (armPk !== undefined && resolveArmPk(sc.classArmId) === armPk)) &&
              sc.termId === activeTerm.id
      );

      return hasScoreRecord;
    });
  };

  // Compute analytics for each allocated class
  const allocationCards = useMemo(() => {
    return teacherAllocations.map(alloc => {
      const armStudents = getStudentsOfferingSubjectInArm(alloc.classArmId, alloc.classArmName, alloc.subjectId);
      const canonicalArmId = resolveArmId(alloc.classArmId, alloc.classArmName);
      const armPk = resolveArmPk(alloc.classArmId) || resolveArmPk(alloc.classArmName) || resolveArmPk(canonicalArmId);
      const canonicalSubjId = resolveSubjectId(alloc.subjectId);
      const subjPk = resolveSubjectPk(alloc.subjectId) || resolveSubjectPk(canonicalSubjId);

      const armScores = scores.filter(
        s => (s.classArmId === alloc.classArmId ||
              s.classArmId === canonicalArmId ||
              resolveArmId(s.classArmId) === canonicalArmId ||
              (armPk !== undefined && resolveArmPk(s.classArmId) === armPk)) &&
             (s.subjectId === alloc.subjectId ||
              s.subjectId === canonicalSubjId ||
              resolveSubjectId(s.subjectId) === canonicalSubjId ||
              (subjPk !== undefined && resolveSubjectPk(s.subjectId) === subjPk)) &&
             s.termId === activeTerm.id
      );

      const gradedScores = armScores.filter(s => s.total > 0);
      const gradedCount = gradedScores.length;
      // Safeguard: totalCount cannot be less than gradedCount if scores are recorded
      const totalCount = Math.max(armStudents.length, gradedCount);
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
        sub => (sub.classArmId === alloc.classArmId ||
                resolveArmId(sub.classArmId) === canonicalArmId ||
                (armPk !== undefined && resolveArmPk(sub.classArmId) === armPk)) &&
               (sub.subjectId === alloc.subjectId ||
                resolveSubjectId(sub.subjectId) === canonicalSubjId ||
                (subjPk !== undefined && resolveSubjectPk(sub.subjectId) === subjPk)) &&
               sub.termId === activeTerm.id
      );
      const isSubmitted = submission?.status === 'SUBMITTED' || submission?.status === 'MODERATED';

      const armObj = classArms.find(a =>
        a.id === alloc.classArmId ||
        a.id === canonicalArmId ||
        resolveArmId(a.id, a.fullName) === canonicalArmId
      );
      const formMasterStaff = staff.find(st => st.id === armObj?.formMasterId);

      return {
        ...alloc,
        formMasterName: formMasterStaff?.name || 'Class Form Teacher',
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
        submittedAt: submission?.submittedAt
      };
    });
  }, [teacherAllocations, students, scores, activeTerm, subjectSubmissions, classArms, staff, subjects]);

  // Overall totals
  const totalStudentsTaught = allocationCards.reduce((acc, cur) => acc + cur.totalStudents, 0);
  const totalGraded = allocationCards.reduce((acc, cur) => acc + cur.gradedCount, 0);
  const overallCompletionRate = totalStudentsTaught > 0 ? Math.round((totalGraded / totalStudentsTaught) * 100) : 0;

  // Search & Filter state for Student Performance tab
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerformanceClass, setSelectedPerformanceClass] = useState('ALL');
  const [selectedPerformanceSubject, setSelectedPerformanceSubject] = useState('ALL');
  const [selectedPerformanceLevel, setSelectedPerformanceLevel] = useState<'ALL' | 'HONORS' | 'CREDIT' | 'SUPPORT'>('ALL');

  // Available subjects taught in the selected class (or across all assigned classes)
  const availablePerformanceSubjects = useMemo(() => {
    const relevantAllocs = selectedPerformanceClass === 'ALL'
      ? teacherAllocations
      : teacherAllocations.filter(a => a.classArmId === selectedPerformanceClass);
    const seen = new Set<string>();
    const list: { id: string; name: string; code?: string }[] = [];
    relevantAllocs.forEach(a => {
      if (!seen.has(a.subjectId)) {
        seen.add(a.subjectId);
        const subjObj = subjects.find(s => s.id === a.subjectId);
        list.push({
          id: a.subjectId,
          name: a.subjectName || subjObj?.name || a.subjectId,
          code: subjObj?.code
        });
      }
    });
    return list;
  }, [teacherAllocations, selectedPerformanceClass, subjects]);

  // Reset subject filter if it is no longer available under the selected class
  useEffect(() => {
    if (selectedPerformanceSubject !== 'ALL' && !availablePerformanceSubjects.some(s => s.id === selectedPerformanceSubject)) {
      setSelectedPerformanceSubject('ALL');
    }
  }, [selectedPerformanceClass, availablePerformanceSubjects, selectedPerformanceSubject]);

  // Build full student performance list across assigned classes
  const studentPerformanceList = useMemo(() => {
    const list: {
      studentId: string;
      studentName: string;
      admissionNumber: string;
      passportPhotoUrl?: string;
      classArmId: string;
      classArmName: string;
      subjectId: string;
      subjectName: string;
      caScore: number;
      testScore: number;
      examScore: number;
      totalScore: number;
      grade: string;
      remark: string;
    }[] = [];

    teacherAllocations.forEach(alloc => {
      const candidates = getStudentsOfferingSubjectInArm(alloc.classArmId, alloc.classArmName, alloc.subjectId);
      const canonicalSubjId = resolveSubjectId(alloc.subjectId);
      const subjPk = resolveSubjectPk(alloc.subjectId) || resolveSubjectPk(canonicalSubjId);
      const subjCode = canonicalSubjId.replace(/^subj-/, '').toUpperCase();

      candidates.forEach(cand => {
        const sc = scores.find(
          s => (s.studentId === cand.id || (cand.admissionNumber && s.admissionNumber === cand.admissionNumber)) &&
               (s.subjectId === alloc.subjectId ||
                s.subjectId === canonicalSubjId ||
                s.subjectId.toLowerCase().replace(/^subj-/, '') === subjCode.toLowerCase() ||
                (subjPk !== undefined && String(s.subjectId) === String(subjPk))) &&
               s.termId === activeTerm.id
        );

        const ca = (sc?.ca1 || 0) + (sc?.assignment || 0);
        const test = (sc?.ca2 || 0) + (sc?.project || 0);
        const exam = sc?.exam || 0;
        const total = sc?.total || 0;
        const evaluated = evaluateGrade(total);

        list.push({
          studentId: cand.id,
          studentName: `${cand.lastName}, ${cand.firstName}`,
          admissionNumber: cand.admissionNumber,
          passportPhotoUrl: cand.passportPhotoUrl,
          classArmId: alloc.classArmId,
          classArmName: alloc.classArmName,
          subjectId: alloc.subjectId,
          subjectName: alloc.subjectName,
          caScore: ca,
          testScore: test,
          examScore: exam,
          totalScore: total,
          grade: sc?.grade || evaluated.grade,
          remark: sc?.remark || evaluated.remark
        });
      });
    });

    return list;
  }, [teacherAllocations, students, scores, activeTerm]);

  // Filtered performance list
  const filteredStudents = useMemo(() => {
    return studentPerformanceList.filter(item => {
      if (selectedPerformanceClass !== 'ALL' && item.classArmId !== selectedPerformanceClass) {
        return false;
      }
      if (selectedPerformanceSubject !== 'ALL' && item.subjectId !== selectedPerformanceSubject) {
        return false;
      }
      if (selectedPerformanceLevel === 'HONORS' && item.totalScore < 75) {
        return false;
      }
      if (selectedPerformanceLevel === 'CREDIT' && (item.totalScore < 50 || item.totalScore >= 75)) {
        return false;
      }
      if (selectedPerformanceLevel === 'SUPPORT' && item.totalScore >= 50) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.studentName.toLowerCase().includes(q);
        const matchAdm = item.admissionNumber.toLowerCase().includes(q);
        if (!matchName && !matchAdm) return false;
      }
      return true;
    });
  }, [studentPerformanceList, selectedPerformanceClass, selectedPerformanceSubject, selectedPerformanceLevel, searchQuery]);

  // Submission Modal state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submissionTarget, setSubmissionTarget] = useState<(typeof teacherAllocations)[0] | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState(
    'All Assessment marks, tests, and examination scripts have been audited.'
  );

  // Quick message modal
  const [isQuickMessageOpen, setIsQuickMessageOpen] = useState(false);
  const [messageRecipientRole, setMessageRecipientRole] = useState<'FORM_MASTER' | 'EXAMINATION_OFFICER' | 'VICE_PRINCIPAL_ACADEMICS'>('FORM_MASTER');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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
    showToast(`${submissionTarget.subjectName} marksheet for ${submissionTarget.classArmName} submitted to Form Master.`);
  };

  const handleOpenEnterMarks = (classArmId?: string, subjectId?: string) => {
    if (onNavigateToScores) {
      onNavigateToScores(classArmId, subjectId);
    } else if (onNavigateView) {
      onNavigateView('score-entry');
    }
  };

  return (
    <FuturisticPageShell
      title="Teacher Dashboard"
      subtitle={`${getWelcomeMessage(user?.name || 'Teacher')}. Manage your assigned classes, subjects, student marks, and academic performance.`}
      icon={BookOpen}
      badgeText={overallCompletionRate === 100 ? 'All Marksheets Ready' : `${overallCompletionRate}% Marks Entered`}
      badgeVariant={overallCompletionRate === 100 ? 'success' : 'info'}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenEnterMarks()}
            className="touch-target px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-950/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Enter Marks</span>
          </button>
        </div>
      }
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`touch-target px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('classes')}
          className={`touch-target px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'classes'
              ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>My Classes</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 font-mono">
            {uniqueClassArmIds.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('subjects')}
          className={`touch-target px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'subjects'
              ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>My Subjects</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 font-mono">
            {uniqueSubjectIds.length}
          </span>
        </button>

        <button
          onClick={() => handleOpenEnterMarks()}
          className="touch-target px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-all cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Enter Marks</span>
          <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 uppercase font-semibold">Live</span>
        </button>

        <button
          onClick={() => setActiveTab('performance')}
          className={`touch-target px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'performance'
              ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Student Performance</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`touch-target px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Reports</span>
        </button>
      </div>

      {/* TAB 1: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <FuturisticKPICard
              title="Assigned Classes"
              value={`${uniqueClassArmIds.length}`}
              subtitle="Teaching cohorts"
              icon={Layers}
              glowColor="cyan"
              trend={{ value: 'Active', isPositive: true }}
            />

            <FuturisticKPICard
              title="My Subjects"
              value={`${uniqueSubjectIds.length}`}
              subtitle={teacherAllocations[0]?.subjectName || 'Teaching Subject'}
              icon={BookOpen}
              glowColor="amber"
              trend={{ value: 'Syllabus on track', isPositive: true }}
            />

            <FuturisticKPICard
              title="Students Enrolled"
              value={`${totalStudentsTaught}`}
              subtitle="Across assigned classes"
              icon={Users}
              glowColor="emerald"
              trend={{ value: 'In database', isPositive: true }}
            />

            <FuturisticKPICard
              title="Marks Entered"
              value={`${overallCompletionRate}%`}
              subtitle={`${totalGraded} of ${totalStudentsTaught} students`}
              icon={TrendingUp}
              glowColor="rose"
              trend={{ value: overallCompletionRate === 100 ? 'Complete' : 'In Progress', isPositive: overallCompletionRate >= 80 }}
            />
          </div>

          {/* Quick Marks Entry & Status Table */}
          <DoubleBezelCard>
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                  <span>Assigned Classes &amp; Marksheet Status</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select any class to enter Continuous Assessment, Tests, and Exam scores.
                </p>
              </div>

              <button
                onClick={() => handleOpenEnterMarks()}
                className="touch-target px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <span>Open Score Entry Grid</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4 text-center">Students</th>
                    <th className="py-3 px-4 text-center">Marks Entered</th>
                    <th className="py-3 px-4 text-center">Class Avg</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {allocationCards.map((card, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {card.classArmName}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {card.subjectName}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-600 dark:text-slate-400">
                        {card.totalStudents}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {card.gradedCount} / {card.totalStudents}
                        </span>
                        <div className="w-20 mx-auto bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full"
                            style={{ width: `${card.percentage}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {card.average > 0 ? `${card.average}%` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {card.isSubmitted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Submitted</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>In Progress</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEnterMarks(card.classArmId, card.subjectId)}
                            className="touch-target px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>Enter Marks</span>
                          </button>

                          {!card.isSubmitted && (
                            <button
                              onClick={() => handleOpenSubmitModal(card)}
                              className="touch-target px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-all"
                              title="Submit Marksheet to Form Master"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DoubleBezelCard>

          {/* Weekly Teaching Timetable Schedule */}
          <DoubleBezelCard>
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Weekly Teaching Timetable ({myTeachingPeriods.length} Periods)
                </h3>
              </div>
              <span className="text-xs text-slate-500">Term schedule</span>
            </div>

            {myTeachingPeriods.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No active timetable periods scheduled for this week.
              </div>
            ) : (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {myTeachingPeriods.map((period, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {period.day} • Period {period.periodNumber}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white mt-1.5">
                        {period.subject}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Class: <strong>{period.classArm}</strong> {period.room && `• ${period.room}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400">
                        {period.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DoubleBezelCard>
        </div>
      )}

      {/* TAB 2: MY CLASSES */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">My Assigned Classes</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Classes where you are assigned to teach. You only enter marks for these classes.
              </p>
            </div>
            <span className="text-xs font-bold bg-amber-500/10 text-amber-800 dark:text-amber-400 px-3 py-1 rounded-full">
              {uniqueClassArmIds.length} Classes Total
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allocationCards.map((card, idx) => (
              <DoubleBezelCard key={idx} hoverEffect>
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Class Cohort</span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                        {card.classArmName}
                      </h3>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Form Teacher: <strong className="text-slate-700 dark:text-slate-300">{card.formMasterName}</strong>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {card.totalStudents} Students
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Subject Taught</span>
                      <span className="font-bold text-slate-900 dark:text-white">{card.subjectName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Class Average</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{card.average > 0 ? `${card.average}%` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Pass Rate</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{card.passRate}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-500">
                      {card.gradedCount} / {card.totalStudents} scores entered
                    </span>
                    <button
                      onClick={() => handleOpenEnterMarks(card.classArmId, card.subjectId)}
                      className="touch-target px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Enter Marks for {card.classArmName}</span>
                    </button>
                  </div>
                </div>
              </DoubleBezelCard>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MY SUBJECTS */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">My Subjects</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Subjects assigned to your faculty profile.
              </p>
            </div>
            <span className="text-xs font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-3 py-1 rounded-full">
              {uniqueSubjectIds.length} Subject(s)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {uniqueSubjectIds.map((subjId, idx) => {
              const subjObj = subjects.find(s => s.id === subjId || resolveSubjectId(s.id) === resolveSubjectId(subjId));
              const classesTeachingThis = teacherAllocations.filter(a => a.subjectId === subjId || resolveSubjectId(a.subjectId) === resolveSubjectId(subjId));
              const totalCandidates = classesTeachingThis.reduce((acc, cur) => {
                const count = getStudentsOfferingSubjectInArm(cur.classArmId, cur.classArmName, subjId).length;
                return acc + count;
              }, 0);

              return (
                <DoubleBezelCard key={idx} hoverEffect>
                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                          <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {subjObj?.name || subjId}
                          </h3>
                          <span className="text-xs font-mono text-slate-500">
                            Code: {subjObj?.code || 'SUBJ'} • {subjObj?.category || 'CORE'}
                          </span>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {totalCandidates} Enrolled
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Classes Offered
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {classesTeachingThis.map((c, cIdx) => (
                          <span
                            key={cIdx}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                          >
                            {c.classArmName}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        Grading Rules: CA (40%) + Exam (60%)
                      </span>
                      <button
                        onClick={() => handleOpenEnterMarks(classesTeachingThis[0]?.classArmId, subjId)}
                        className="touch-target px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Enter Marks</span>
                      </button>
                    </div>
                  </div>
                </DoubleBezelCard>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: STUDENT PERFORMANCE */}
      {activeTab === 'performance' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Student Performance</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Overview of student scores in your subjects. Calculated automatically from the database.
              </p>
            </div>

            <button
              onClick={() => handleOpenEnterMarks()}
              className="touch-target px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Enter / Edit Marks</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Box */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student or admission #..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="touch-target w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Class Filter */}
              <select
                value={selectedPerformanceClass}
                onChange={e => setSelectedPerformanceClass(e.target.value)}
                className="touch-target px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Assigned Classes</option>
                {uniqueClassArmIds.map(armId => {
                  const armObj = classArms.find(a => a.id === armId);
                  const alloc = teacherAllocations.find(a => a.classArmId === armId);
                  return (
                    <option key={armId} value={armId}>
                      {armObj?.fullName || alloc?.classArmName || armId}
                    </option>
                  );
                })}
              </select>

              {/* Subject Filter */}
              <select
                value={selectedPerformanceSubject}
                onChange={e => setSelectedPerformanceSubject(e.target.value)}
                className="touch-target px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Assigned Subjects</option>
                {availablePerformanceSubjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.code ? `(${s.code})` : ''}
                  </option>
                ))}
              </select>

              {/* Performance Level Filter */}
              <select
                value={selectedPerformanceLevel}
                onChange={e => setSelectedPerformanceLevel(e.target.value as any)}
                className="touch-target px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Performance Levels</option>
                <option value="HONORS">Honors (75%+)</option>
                <option value="CREDIT">Good Standing (50 - 74%)</option>
                <option value="SUPPORT">Needing Support (&lt; 50%)</option>
              </select>
            </div>

            <div className="text-xs text-slate-500">
              Showing <strong>{filteredStudents.length}</strong> of {studentPerformanceList.length} students
            </div>
          </div>

          {/* Performance Table */}
          <DoubleBezelCard innerClassName="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-4 min-w-[180px]">Student Name</th>
                    <th className="py-3 px-3 text-center">Adm. No</th>
                    <th className="py-3 px-3">Class</th>
                    <th className="py-3 px-3 text-center bg-amber-50/40">CA (20)</th>
                    <th className="py-3 px-3 text-center bg-amber-50/40">Test (20)</th>
                    <th className="py-3 px-3 text-center bg-blue-50/40">Exam (60)</th>
                    <th className="py-3 px-3 text-center bg-slate-50 font-black">Total (100)</th>
                    <th className="py-3 px-3 text-center">Grade</th>
                    <th className="py-3 px-4">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        No students match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((item, idx) => {
                      const isHonors = item.totalScore >= 75;
                      const needsSupport = item.totalScore > 0 && item.totalScore < 50;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono-tabular">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              {item.passportPhotoUrl ? (
                                <img
                                  src={item.passportPhotoUrl}
                                  alt=""
                                  className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {item.studentName.charAt(0)}
                                </div>
                              )}
                              <span>{item.studentName}</span>
                              {isHonors && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  Honors
                                </span>
                              )}
                              {needsSupport && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                  Support
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono-tabular text-slate-500 text-[11px]">
                            {item.admissionNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {item.classArmName}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono-tabular font-bold text-slate-800 dark:text-slate-200">
                            {item.caScore > 0 ? item.caScore : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono-tabular font-bold text-slate-800 dark:text-slate-200">
                            {item.testScore > 0 ? item.testScore : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono-tabular font-bold text-blue-900 dark:text-blue-300">
                            {item.examScore > 0 ? item.examScore : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono-tabular font-extrabold text-sm text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/50">
                            {item.totalScore > 0 ? `${item.totalScore}%` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                              {item.grade || '—'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {item.remark || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </DoubleBezelCard>
        </div>
      )}

      {/* TAB 5: REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Academic Reports</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Access student report cards and term broadsheet results generated automatically by the system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DoubleBezelCard hoverEffect>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center border border-amber-200 dark:border-amber-800">
                    <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Class Performance &amp; Broadsheet
                    </h3>
                    <p className="text-xs text-slate-500">
                      View multi-subject collation broadsheets and rankings for your classes.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">
                    All subjects aggregated
                  </span>
                  <button
                    onClick={() => onNavigateView?.('master-broadsheet')}
                    className="touch-target px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <span>View Broadsheet</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </DoubleBezelCard>

            <DoubleBezelCard hoverEffect>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                    <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Terminal Report Cards
                    </h3>
                    <p className="text-xs text-slate-500">
                      Inspect generated report cards with CA, exam scores, and comments.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">
                    Official printable format
                  </span>
                  <button
                    onClick={() => onNavigateView?.('report-card')}
                    className="touch-target px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <span>Preview Report Cards</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </DoubleBezelCard>
          </div>
        </div>
      )}

      {/* SUBMISSION MODAL */}
      {isSubmitModalOpen && submissionTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-amber-500" />
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
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-300">
                <div className="font-bold">{submissionTarget.classArmName} • {submissionTarget.subjectName}</div>
                <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                  Submitting this marksheet certifies that Assessment, Test, and Examination marks are audited and complete.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Teacher's Submission Note
                </label>
                <textarea
                  rows={3}
                  value={submissionNotes}
                  onChange={e => setSubmissionNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>
                  The Form Master and Exam Officer will receive an automated notification that marks are ready.
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
                className="touch-target px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Mark Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </FuturisticPageShell>
  );
};
