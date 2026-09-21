import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import { ExcelImportExportModal } from './ExcelImportExportModal';
import { ScoreOverrideModal } from './ScoreOverrideModal';
import { evaluateGrade } from '../../lib/gradeCalculator';
import type { GradeLetter, SubjectScore, Student } from '../../types';
import {
  api,
  resolveArmId,
  resolveArmPk,
  resolveSubjectId,
  resolveSubjectPk,
  resolveTermId,
  adaptStudentFromBackend
} from '../../lib/api';
import {
  FileSpreadsheet,
  Lock,
  Unlock,
  AlertCircle,
  SlidersHorizontal,
  ShieldAlert,
  Send,
  CheckCircle2,
  Check,
  Info,
  Layers,
  BookOpen,
  Users,
  Save
} from 'lucide-react';
import { FuturisticPageShell } from '../../components/common/FuturisticPageShell';
import { DoubleBezelCard } from '../../components/common/DoubleBezelCard';
import { ModalPortal } from '../../components/common/ModalPortal';

interface ScoreEntryGridViewProps {
  initialClassArmId?: string;
  initialSubjectId?: string;
}

export const ScoreEntryGridView: React.FC<ScoreEntryGridViewProps> = ({
  initialClassArmId,
  initialSubjectId,
}) => {
  const {
    classArms,
    subjects,
    students,
    scores,
    activeTerm,
    updateScore,
    bulkSaveScores,
    toggleGradeLock,
    overrideScore,
    subjectSubmissions,
    submitSubjectMarksheet,
    retractSubjectMarksheet,
    allocations,
    staff
  } = useSchoolData();

  const { user } = useAuth();
  const isSubjectTeacher = user?.activeRole === 'SUBJECT_TEACHER' || user?.activeRole === 'TEACHER';
  const isFormMaster = user?.activeRole === 'FORM_MASTER' || user?.role === 'FORM_MASTER' || user?.assignedRoles?.includes('FORM_MASTER');
  
  // Find matching staff record for additional custody verification
  const matchedStaff = useMemo(() => {
    if (!user) return null;
    return staff.find(st =>
      st.id === user.id ||
      (st.identifier && (st.identifier === user.identifier || st.identifier === user.staffId)) ||
      (st.email && user.email && st.email.toLowerCase() === user.email.toLowerCase())
    );
  }, [staff, user]);

  // Determine Form Master's designated class arm
  const designatedFormMasterArm = useMemo(() => {
    const raw =
      user?.formMasterArmId ||
      user?.formMasterClassArmId ||
      (user as any)?.form_master_class_arm ||
      matchedStaff?.formMasterArmId ||
      matchedStaff?.formMasterClassArmId;
    if (raw) return resolveArmId(raw);
    const armByTeacher = classArms.find(a =>
      a.formMasterId === user?.id ||
      a.formMasterId === user?.staffId ||
      (user?.identifier && a.formMasterId === user.identifier) ||
      (a.formMasterName && user?.name && a.formMasterName.toLowerCase() === user.name.toLowerCase())
    );
    return armByTeacher?.id;
  }, [user, matchedStaff, classArms]);

  // Resolve allocations dynamically from context or user session with resilient teacher matching
  const dynamicAllocations = useMemo(() => {
    return allocations.filter(a => {
      if (!user) return false;
      if (a.teacherId === user.id || a.teacherId === user.staffId) return true;
      if (user.staffId && a.teacherId && a.teacherId.replace(/[^0-9]/g, '') === user.staffId.replace(/[^0-9]/g, '')) return true;
      if (a.teacherName && user.name) {
        const cleanA = a.teacherName.toLowerCase().replace(/^(mr\.|mrs\.|ms\.|dr\.|prof\.|engr\.)\s*/, '').trim();
        const cleanU = user.name.toLowerCase().replace(/^(mr\.|mrs\.|ms\.|dr\.|prof\.|engr\.)\s*/, '').trim();
        if (cleanA === cleanU || cleanA.includes(cleanU) || cleanU.includes(cleanA)) return true;
      }
      return false;
    });
  }, [allocations, user]);
  const teacherAllocations = dynamicAllocations.length > 0 ? dynamicAllocations : (user?.allocatedSubjects || []);

  // Scoped class arms:
  // - Form Master: their assigned class arm plus any classes they teach (or all classes if unrestricted)
  // - Subject Teacher: only classes they are assigned to teach
  // - Admin: all classes
  const allowedClassArms = useMemo(() => {
    if (isFormMaster) {
      const designatedArm = designatedFormMasterArm;
      const filtered = classArms.filter(a =>
        (designatedArm && (
          a.id === designatedArm ||
          resolveArmId(a.id) === resolveArmId(designatedArm) ||
          (resolveArmPk(a.id) !== undefined && resolveArmPk(a.id) === resolveArmPk(designatedArm))
        )) ||
        teacherAllocations.some(alloc =>
          alloc.classArmId === a.id ||
          resolveArmId(alloc.classArmId) === resolveArmId(a.id) ||
          (alloc.classArmName && a.fullName && alloc.classArmName.toLowerCase().trim() === a.fullName.toLowerCase().trim())
        )
      );
      return filtered.length > 0 ? filtered : classArms;
    }
    if (isSubjectTeacher) {
      const filtered = classArms.filter(a =>
        teacherAllocations.some(alloc =>
          alloc.classArmId === a.id ||
          resolveArmId(alloc.classArmId) === resolveArmId(a.id) ||
          (alloc.classArmName && a.fullName && alloc.classArmName.toLowerCase().trim() === a.fullName.toLowerCase().trim())
        )
      );
      return filtered.length > 0 ? filtered : classArms.slice(0, 2);
    }
    return classArms;
  }, [isSubjectTeacher, isFormMaster, classArms, teacherAllocations, designatedFormMasterArm]);

  // Pick default class and subject
  const defaultClassArm = allowedClassArms[0] || classArms[0];
  const defaultSubject = subjects.find(s => s.id === 'subj-phy') || subjects[0];

  const defaultArmId = useMemo(() => {
    if (initialClassArmId && allowedClassArms.some(a => a.id === initialClassArmId || resolveArmId(a.id) === resolveArmId(initialClassArmId))) {
      return initialClassArmId;
    }
    return teacherAllocations[0]?.classArmId || defaultClassArm.id;
  }, [initialClassArmId, allowedClassArms, teacherAllocations, defaultClassArm.id]);

  const [selectedArmId, setSelectedArmId] = useState<string>(defaultArmId);

  useEffect(() => {
    if (initialClassArmId && allowedClassArms.some(a => a.id === initialClassArmId || resolveArmId(a.id) === resolveArmId(initialClassArmId))) {
      setSelectedArmId(initialClassArmId);
    }
  }, [initialClassArmId, allowedClassArms]);

  // Scoped subjects for currently selected arm:
  // - Form Master / Admin: all subjects offered in this class
  // - Subject teacher: only subjects they are assigned to teach in this class
  const allowedSubjects = useMemo(() => {
    if (isSubjectTeacher && !isFormMaster) {
      const canonicalArmId = resolveArmId(selectedArmId);
      const filtered = subjects.filter(s =>
        teacherAllocations.some(alloc =>
          (resolveArmId(alloc.classArmId) === canonicalArmId || alloc.classArmId === selectedArmId) &&
          (alloc.subjectId === s.id || resolveSubjectId(alloc.subjectId) === resolveSubjectId(s.id))
        )
      );
      return filtered.length > 0 ? filtered : subjects.slice(0, 1);
    }
    return subjects;
  }, [isSubjectTeacher, isFormMaster, subjects, teacherAllocations, selectedArmId]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    if (initialSubjectId && allowedSubjects.some(s => s.id === initialSubjectId || resolveSubjectId(s.id) === resolveSubjectId(initialSubjectId))) {
      return initialSubjectId;
    }
    return teacherAllocations.find(a => a.classArmId === defaultArmId || resolveArmId(a.classArmId) === resolveArmId(defaultArmId))?.subjectId || allowedSubjects[0]?.id || defaultSubject.id;
  });

  useEffect(() => {
    if (initialSubjectId && allowedSubjects.some(s => s.id === initialSubjectId || resolveSubjectId(s.id) === resolveSubjectId(initialSubjectId))) {
      setSelectedSubjectId(initialSubjectId);
    }
  }, [initialSubjectId, allowedSubjects]);

  // Sync selectedSubjectId if selectedArmId changes or if selectedSubjectId is not allowed
  useEffect(() => {
    if (allowedSubjects.length > 0 && !allowedSubjects.some(s => s.id === selectedSubjectId || resolveSubjectId(s.id) === resolveSubjectId(selectedSubjectId))) {
      setSelectedSubjectId(allowedSubjects[0].id);
    }
  }, [selectedArmId, allowedSubjects, selectedSubjectId]);

  // Check if current user is permitted to enter marks for this specific class & subject
  const userTeachesThisSubject = teacherAllocations.some(alloc => {
    const armMatches =
      alloc.classArmId === selectedArmId ||
      resolveArmId(alloc.classArmId) === resolveArmId(selectedArmId) ||
      (resolveArmPk(alloc.classArmId) !== undefined && resolveArmPk(alloc.classArmId) === resolveArmPk(selectedArmId));
    const subjMatches =
      alloc.subjectId === selectedSubjectId ||
      resolveSubjectId(alloc.subjectId) === resolveSubjectId(selectedSubjectId) ||
      (resolveSubjectPk(alloc.subjectId) !== undefined && resolveSubjectPk(alloc.subjectId) === resolveSubjectPk(selectedSubjectId));
    return armMatches && subjMatches;
  });

  // Form Masters are fully authorized to enter and edit marks for all subjects in their class arm as requested
  const isReadOnlyForFormMaster = false;

  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);
  const [submitComment, setSubmitComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState<{
    score: SubjectScore;
    studentName: string;
    admissionNumber: string;
  } | null>(null);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<{
    id: string;
    name: string;
    admissionNumber: string;
  } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED'>('SAVED');
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Selected arm & subject models
  const currentArm = classArms.find(a => a.id === selectedArmId || resolveArmId(a.id, a.fullName) === resolveArmId(selectedArmId)) || defaultClassArm;
  const currentSubject = subjects.find(s => s.id === selectedSubjectId || resolveSubjectId(s.id) === resolveSubjectId(selectedSubjectId)) || defaultSubject;

  // Live query to Django backend for exact registered students for selected arm and subject
  const [isLoadingStudents, setIsLoadingStudents] = useState<boolean>(false);
  const [liveFetchedStudents, setLiveFetchedStudents] = useState<Student[] | null>(null);

  useEffect(() => {
    let isCancelled = false;

    // Immediately clear previous student list and show loading indicator
    setIsLoadingStudents(true);
    setLiveFetchedStudents(null);

    const fetchStudentsForSelection = async () => {
      try {
        const armPk = resolveArmPk(selectedArmId);
        const subjPk = resolveSubjectPk(selectedSubjectId);
        const subjCode = (currentSubject.code || selectedSubjectId.replace(/^subj-/, '')).toUpperCase();

        const params: Record<string, any> = { page_size: 'all' };
        if (armPk) {
          params.current_class_arm = armPk;
        } else {
          params.class_arm = selectedArmId;
        }

        if (subjPk) {
          params.subject = subjPk;
        } else {
          params.subject = subjCode || selectedSubjectId;
        }

        const res = await api.get('/students/students/', params);
        const raw = (res as any)?.results || res;
        if (!isCancelled) {
          if (Array.isArray(raw) && raw.length > 0) {
            const adapted = raw.map(adaptStudentFromBackend);
            setLiveFetchedStudents(adapted);
          } else {
            setLiveFetchedStudents([]);
          }
        }
      } catch (err) {
        console.warn('Could not fetch live students for class/subject:', err);
        if (!isCancelled) {
          setLiveFetchedStudents(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingStudents(false);
        }
      }
    };

    fetchStudentsForSelection();
    return () => {
      isCancelled = true;
    };
  }, [selectedArmId, selectedSubjectId, currentSubject.code]);

  // Resilient fallback filtering from school data context
  const armStudents = useMemo(() => {
    const subjCode = (currentSubject.code || selectedSubjectId.replace(/^subj-/, '')).toUpperCase();
    const subjPk = resolveSubjectPk(selectedSubjectId);

    const isJuniorArm = Boolean(currentArm?.fullName?.toLowerCase().includes('jss') || currentArm?.name?.toLowerCase().includes('jss'));
    const isSeniorArm = Boolean(currentArm?.fullName?.toLowerCase().includes('sss') || currentArm?.name?.toLowerCase().includes('sss'));
    const armText = `${currentArm?.fullName || ''} ${currentArm?.name || ''}`.toLowerCase();
    const isScienceArm = armText.includes('science') || armText.includes('diamond') || armText.includes('emerald') || armText.includes('gold');

    // Compulsory subject logic (WAEC / Everest core rules):
    // 1. Junior: all junior subjects (or CORE) are compulsory for all students in JSS
    // 2. Senior Core: ENG, MTH, CIV, HIS are compulsory for all senior students
    // 3. Senior Science: PHY, CHE, BIO are compulsory for senior science arms
    const isCompulsoryForArm = Boolean(
      (isJuniorArm && (
        currentSubject.isCompulsoryJunior ||
        currentSubject.applicableTo === 'JUNIOR' ||
        currentSubject.applicableTo === 'ALL' ||
        currentSubject.category === 'CORE'
      )) ||
      (isSeniorArm && (
        currentSubject.category === 'CORE' ||
        ['ENG', 'MTH', 'CIV', 'HIS'].includes(subjCode) ||
        (currentSubject.isCompulsorySeniorScience && (isScienceArm || ['PHY', 'CHE', 'BIO'].includes(subjCode))) ||
        (['PHY', 'CHE', 'BIO'].includes(subjCode) && isScienceArm)
      ))
    );

    return students.filter(s => {
      // 1. Arm matching (resilient against slug, PK, and full name)
      const matchesArm =
        s.currentClassArmId === selectedArmId ||
        resolveArmId(s.currentClassArmId) === selectedArmId ||
        (resolveArmPk(s.currentClassArmId) !== undefined && resolveArmPk(s.currentClassArmId) === resolveArmPk(selectedArmId)) ||
        (Boolean(currentArm?.fullName) && Boolean(s.currentClassArmName) && s.currentClassArmName.toLowerCase().trim() === currentArm.fullName.toLowerCase().trim());

      if (!matchesArm) return false;

      // If subject is compulsory for this class arm, every student in the arm offers it!
      if (isCompulsoryForArm) return true;

      // 2. Subject offering check:
      const regIds = Array.isArray(s.registeredSubjectIds) ? s.registeredSubjectIds : [];
      const regCodes = Array.isArray(s.registeredSubjectCodes) ? s.registeredSubjectCodes.map(c => c.toUpperCase()) : [];

      const isRegistered =
        regIds.includes(selectedSubjectId) ||
        regIds.includes(`subj-${subjCode.toLowerCase()}`) ||
        regIds.includes(subjCode.toLowerCase()) ||
        regIds.includes(subjCode) ||
        (subjPk !== undefined && regIds.includes(String(subjPk))) ||
        regCodes.includes(subjCode);

      // 3. Existing score record for this specific subject and term
      const hasScoreRecord = scores.some(
        sc => (sc.studentId === s.id || (s.admissionNumber && sc.admissionNumber === s.admissionNumber)) &&
              (sc.subjectId === selectedSubjectId || sc.subjectId.toLowerCase().replace(/^subj-/, '') === subjCode.toLowerCase()) &&
              sc.termId === activeTerm.id
      );

      // Strictly check registration or existing score record (never blanket-allow all students)
      return isRegistered || hasScoreRecord;
    });
  }, [students, selectedArmId, selectedSubjectId, currentArm, currentSubject, scores, activeTerm.id]);

  // Final display list of students (prefer live backend response if non-empty, else context filter)
  const displayStudents = useMemo(() => {
    if (isLoadingStudents) {
      return [];
    }
    if (liveFetchedStudents !== null && liveFetchedStudents.length > 0) {
      return liveFetchedStudents;
    }
    return armStudents;
  }, [isLoadingStudents, liveFetchedStudents, armStudents]);

  // Is this grade sheet locked by exam officer?
  const existingSheetScores = scores.filter(s => {
    const armMatches = s.classArmId === selectedArmId || resolveArmId(s.classArmId) === resolveArmId(selectedArmId);
    const subMatches = s.subjectId === selectedSubjectId || resolveSubjectId(s.subjectId) === resolveSubjectId(selectedSubjectId);
    const termMatches = s.termId === activeTerm.id || resolveTermId(s.termId) === resolveTermId(activeTerm.id);
    return armMatches && subMatches && termMatches;
  });
  const isSheetLocked = existingSheetScores.length > 0 && existingSheetScores.every(s => s.isLocked);

  // Store matrix inputs refs for arrow navigation: key = `${studentIndex}_${fieldIndex}`
  // fieldIndex: 0 = assessment (CA), 1 = test, 2 = exam
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    let nextRow = rowIndex;
    let nextCol = colIndex;
    const maxCol = showDetailedBreakdown ? 4 : 2;

    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      nextRow = Math.min(rowIndex + 1, displayStudents.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextRow = Math.max(rowIndex - 1, 0);
    } else if (e.key === 'ArrowRight' && (e.target as HTMLInputElement).selectionEnd === (e.target as HTMLInputElement).value.length) {
      nextCol = Math.min(colIndex + 1, maxCol);
    } else if (e.key === 'ArrowLeft' && (e.target as HTMLInputElement).selectionStart === 0) {
      nextCol = Math.max(colIndex - 1, 0);
    } else {
      return;
    }

    const nextKey = `${nextRow}_${nextCol}`;
    const nextInput = inputRefs.current.get(nextKey);
    if (nextInput) {
      nextInput.focus();
      nextInput.select();
    }
  };

  // Map scores for each display student
  // Preserves existing database marks, and provides clean empty fields ('') and '—' for students without marks yet
  const studentScoresMap = useMemo(() => {
    const map = new Map<string, {
      score: SubjectScore;
      hasMarks: boolean;
      assessmentScore: number | string;
      testScore: number | string;
      examScore: number | string;
      totalScore: number | string;
      grade: string;
      remark: string;
      teacherRemark: string;
    }>();

    displayStudents.forEach(st => {
      const existing = scores.find(
        sc => (sc.studentId === st.id || (st.admissionNumber && sc.admissionNumber === st.admissionNumber)) &&
              (sc.subjectId === selectedSubjectId || sc.subjectId.toLowerCase().replace(/^subj-/, '') === currentSubject.code?.toLowerCase()) &&
              (sc.termId === activeTerm.id || resolveTermId(sc.termId) === resolveTermId(activeTerm.id))
      );

      if (existing) {
        const ca1 = existing.ca1;
        const ca2 = existing.ca2;
        const assignment = existing.assignment;
        const project = existing.project;
        const exam = existing.exam;

        // Check if marks have been entered for this student
        const hasMarks = (ca1 !== undefined && ca1 !== null && ca1 > 0) ||
                         (ca2 !== undefined && ca2 !== null && ca2 > 0) ||
                         (assignment !== undefined && assignment !== null && assignment > 0) ||
                         (project !== undefined && project !== null && project > 0) ||
                         (exam !== undefined && exam !== null && exam > 0) ||
                         (existing.total > 0);

        const assessmentVal = ((ca1 || 0) + (assignment || 0));
        const testVal = ((ca2 || 0) + (project || 0));
        const examVal = exam || 0;

        map.set(st.id, {
          score: existing,
          hasMarks: Boolean(hasMarks),
          assessmentScore: hasMarks ? assessmentVal : '',
          testScore: hasMarks ? testVal : '',
          examScore: (hasMarks && exam !== undefined) ? examVal : '',
          totalScore: hasMarks ? existing.total : '—',
          grade: hasMarks ? existing.grade : '—',
          remark: hasMarks ? existing.remark : '—',
          teacherRemark: existing.teacherRemark || '',
        });
      } else {
        const dummyScore: SubjectScore = {
          id: `sc-temp-${st.id}`,
          studentId: st.id,
          studentName: `${st.firstName} ${st.lastName}`,
          admissionNumber: st.admissionNumber,
          classArmId: selectedArmId,
          subjectId: selectedSubjectId,
          termId: activeTerm.id,
          ca1: 0,
          ca2: 0,
          assignment: 0,
          project: 0,
          exam: 0,
          total: 0,
          grade: 'F' as GradeLetter,
          remark: 'Fail',
          isLocked: false,
          updatedAt: new Date().toISOString()
        };

        map.set(st.id, {
          score: dummyScore,
          hasMarks: false,
          assessmentScore: '',
          testScore: '',
          examScore: '',
          totalScore: '—',
          grade: '—',
          remark: '—',
          teacherRemark: '',
        });
      }
    });

    return map;
  }, [displayStudents, scores, selectedSubjectId, currentSubject, activeTerm.id, selectedArmId]);

  // Simplified 3-Field Score Change (Assessment, Test, Exam)
  // Maps accurately to Django backend validators: ca1 (max 10), assignment (max 10), ca2 (max 10), project (max 10), exam (max 60)
  const handleScoreFieldChange = (
    student: Student,
    field: 'assessment' | 'test' | 'exam',
    rawVal: string
  ) => {
    const max = field === 'exam' ? 60 : 20;
    const num = rawVal === '' ? 0 : parseFloat(rawVal);

    if (isNaN(num)) return;

    if (num > max) {
      setValidationWarning(`Invalid score: ${field === 'assessment' ? 'Assessment (CA)' : field === 'test' ? 'Test' : 'Exam'} cannot exceed ${max}`);
      return;
    } else {
      setValidationWarning(null);
    }

    setSaveStatus('SAVING');

    const scoreId = scores.find(
      sc => (sc.studentId === student.id || (student.admissionNumber && sc.admissionNumber === student.admissionNumber)) &&
            (sc.subjectId === selectedSubjectId || sc.subjectId.toLowerCase().replace(/^subj-/, '') === currentSubject.code?.toLowerCase()) &&
            (sc.termId === activeTerm.id || resolveTermId(sc.termId) === resolveTermId(activeTerm.id))
    )?.id || `sc-temp-${student.id}`;

    const partialPayload: Partial<SubjectScore> = {
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      classArmId: selectedArmId,
      subjectId: selectedSubjectId,
      termId: activeTerm.id,
    };

    if (field === 'assessment') {
      const ca1 = Math.round((num / 2) * 10) / 10;
      const assignment = Math.round((num - ca1) * 10) / 10;
      updateScore(scoreId, { ...partialPayload, ca1, assignment });
    } else if (field === 'test') {
      const ca2 = Math.round((num / 2) * 10) / 10;
      const project = Math.round((num - ca2) * 10) / 10;
      updateScore(scoreId, { ...partialPayload, ca2, project });
    } else if (field === 'exam') {
      updateScore(scoreId, { ...partialPayload, exam: num });
    }

    setTimeout(() => {
      setSaveStatus('SAVED');
    }, 400);
  };

  // Detailed single-field score change handler (if user toggles detailed mode)
  const handleDetailedScoreChange = (
    student: Student,
    field: 'ca1' | 'ca2' | 'assignment' | 'project' | 'exam',
    rawVal: string
  ) => {
    const max = field === 'exam' ? 60 : 10;
    const num = rawVal === '' ? 0 : parseFloat(rawVal);

    if (isNaN(num)) return;

    if (num > max) {
      setValidationWarning(`Invalid score: ${field.toUpperCase()} cannot exceed ${max}`);
      return;
    } else {
      setValidationWarning(null);
    }

    setSaveStatus('SAVING');

    const scoreId = scores.find(
      sc => (sc.studentId === student.id || (student.admissionNumber && sc.admissionNumber === student.admissionNumber)) &&
            (sc.subjectId === selectedSubjectId || sc.subjectId.toLowerCase().replace(/^subj-/, '') === currentSubject.code?.toLowerCase()) &&
            (sc.termId === activeTerm.id || resolveTermId(sc.termId) === resolveTermId(activeTerm.id))
    )?.id || `sc-temp-${student.id}`;

    updateScore(scoreId, {
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      classArmId: selectedArmId,
      subjectId: selectedSubjectId,
      termId: activeTerm.id,
      [field]: num,
    });

    setTimeout(() => {
      setSaveStatus('SAVED');
    }, 400);
  };

  // Explicit Save Action to persist all marks to Django backend
  const handleSaveAllMarks = async () => {
    setSaveStatus('SAVING');
    const scoresData = displayStudents.map(st => {
      const entry = studentScoresMap.get(st.id);
      const sc = entry?.score;
      return {
        admissionNumber: st.admissionNumber,
        ca1: sc?.ca1 || 0,
        ca2: sc?.ca2 || 0,
        assignment: sc?.assignment || 0,
        project: sc?.project || 0,
        exam: sc?.exam || 0
      };
    });

    try {
      await bulkSaveScores(selectedArmId, selectedSubjectId, scoresData);
      setSaveStatus('SAVED');
      setSaveSuccessMessage(`✓ Marks saved successfully for ${displayStudents.length} student${displayStudents.length !== 1 ? 's' : ''}.`);
      setTimeout(() => {
        setSaveSuccessMessage(null);
      }, 5000);
    } catch {
      setSaveStatus('IDLE');
      setSaveSuccessMessage(`⚠ Could not save to server. Please check your connection and try again.`);
      setTimeout(() => {
        setSaveSuccessMessage(null);
      }, 6000);
    }
  };

  // Compute live class statistics
  const currentScoresList = displayStudents.map(s => {
    return studentScoresMap.get(s.id)?.score || {
      id: `sc-temp-${s.id}`,
      studentId: s.id,
      studentName: `${s.firstName} ${s.lastName}`,
      admissionNumber: s.admissionNumber,
      classArmId: selectedArmId,
      subjectId: selectedSubjectId,
      termId: activeTerm.id,
      ca1: 0,
      ca2: 0,
      assignment: 0,
      project: 0,
      exam: 0,
      total: 0,
      grade: 'F' as GradeLetter,
      remark: 'Fail',
      isLocked: false,
      updatedAt: new Date().toISOString()
    };
  });

  const studentsWithMarks = Array.from(studentScoresMap.values()).filter(v => v.hasMarks);
  const totals = studentsWithMarks.map(v => typeof v.totalScore === 'number' ? v.totalScore : 0);
  const classAvg = totals.length > 0 ? (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1) : '0';
  const highestTotal = totals.length > 0 ? Math.max(...totals) : 0;
  const lowestTotal = totals.length > 0 ? Math.min(...totals) : 0;
  const passCount = totals.filter(t => t >= 45).length;
  const passRate = totals.length > 0 ? ((passCount / totals.length) * 100).toFixed(0) : '0';

  const canLockGrades =
    user?.activeRole === 'SUPER_ADMIN' ||
    user?.activeRole === 'PRINCIPAL' ||
    user?.activeRole === 'VICE_PRINCIPAL' ||
    user?.activeRole === 'VICE_PRINCIPAL_ACADEMICS' ||
    user?.activeRole === 'VICE_PRINCIPAL_ADMIN' ||
    user?.activeRole === 'EXAM_OFFICER';

  const currentSubmission = subjectSubmissions?.find(sub => {
    const armMatches = sub.classArmId === selectedArmId || resolveArmId(sub.classArmId) === resolveArmId(selectedArmId);
    const subMatches = sub.subjectId === selectedSubjectId || resolveSubjectId(sub.subjectId) === resolveSubjectId(selectedSubjectId);
    const termMatches = sub.termId === activeTerm.id || resolveTermId(sub.termId) === resolveTermId(activeTerm.id);
    return armMatches && subMatches && termMatches;
  });
  const isSubmitted = currentSubmission?.status === 'SUBMITTED' || currentSubmission?.status === 'MODERATED';
  const isInputDisabled = isSheetLocked || (isSubjectTeacher && isSubmitted) || isReadOnlyForFormMaster;

  return (
    <FuturisticPageShell
      title="Enter Marks"
      subtitle={`Enter Assessment (CA), Test, and Examination marks for ${currentArm.fullName} — ${currentSubject.name}. Totals and grades are automatically calculated.`}
      icon={FileSpreadsheet}
      badgeText={isReadOnlyForFormMaster ? 'View-Only (Form Master)' : isSheetLocked ? 'Grade Sheet Locked' : isSubmitted ? 'Marksheet Submitted' : 'Entry Active'}
      badgeVariant={isReadOnlyForFormMaster ? 'warning' : isSheetLocked ? 'warning' : isSubmitted ? 'success' : 'info'}
      actions={
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Switch between Simple 3-Part View and Detailed Breakdown */}
          <button
            type="button"
            onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
            className="touch-target px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
            <span>{showDetailedBreakdown ? 'Simple View (3 Inputs)' : 'Detailed Breakdown'}</span>
          </button>

          {/* Explicit Save Marks Button */}
          {!isInputDisabled && (
            <button
              type="button"
              onClick={handleSaveAllMarks}
              disabled={displayStudents.length === 0}
              className="touch-target px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Marks ({displayStudents.length})</span>
            </button>
          )}

          {!isReadOnlyForFormMaster && isSubjectTeacher && (
            isSubmitted ? (
              <div className="flex items-center gap-2">
                <div className="touch-target px-3.5 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Sheet Submitted {currentSubmission?.submittedAt ? `(${new Date(currentSubmission.submittedAt).toLocaleDateString()})` : ''}</span>
                </div>
                {!isSheetLocked && (
                  <button
                    type="button"
                    onClick={() => retractSubjectMarksheet(selectedArmId, selectedSubjectId, user ? { id: user.id, name: user.name, role: user.activeRole } : undefined)}
                    className="touch-target px-3 py-2 rounded-2xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-bold border border-amber-300 dark:border-amber-700 transition-all cursor-pointer"
                  >
                    Edit / Reopen Marks
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="touch-target px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit to Form Master</span>
              </button>
            )
          )}

          {canLockGrades && (
            <button
              onClick={() => toggleGradeLock(selectedArmId, selectedSubjectId)}
              className={`touch-target px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isSheetLocked
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
              }`}
            >
              {isSheetLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{isSheetLocked ? 'Sheet Locked' : 'Sheet Open'}</span>
            </button>
          )}

          <button
            onClick={() => setIsExcelModalOpen(true)}
            className="touch-target px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500" />
            <span>Excel Offline</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700">
            <span className={`w-2 h-2 rounded-full ${saveStatus === 'SAVING' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span>{saveStatus === 'SAVING' ? 'Saving...' : 'Auto-Saved'}</span>
          </div>
        </div>
      }
    >
      {/* Save Result Notification Banner */}
      {saveSuccessMessage && (
        <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 shadow-xs ${
          saveStatus === 'IDLE'
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
        }`}>
          {saveStatus === 'IDLE'
            ? <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            : <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          }
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Top Selector Card: Select Class -> Select Subject */}
      <DoubleBezelCard>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                {isSubjectTeacher ? '1. Select Assigned Class' : '1. Select Class'}
              </label>
              <select
                value={selectedArmId}
                onChange={e => setSelectedArmId(e.target.value)}
                className="touch-target px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {allowedClassArms.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                {isSubjectTeacher ? '2. Select Your Subject' : '2. Select Subject'}
              </label>
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="touch-target px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {allowedSubjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Students offering <strong>{currentSubject.name}</strong>:</span>
            <strong className="text-slate-900 dark:text-white font-mono bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded text-xs shadow-2xs">
              {isLoadingStudents ? '...' : displayStudents.length}
            </strong>
          </div>
        </div>
      </DoubleBezelCard>

      {/* Form Master Read-Only Notification */}
      {isReadOnlyForFormMaster && (
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs flex items-start gap-3 shadow-xs">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">View-Only Mode (Form Master):</span> You are viewing marks for <strong>{currentSubject.name}</strong> in {currentArm.fullName}. Because you do not teach this subject, scores can only be entered and modified by the assigned subject teacher.
          </div>
        </div>
      )}

      {/* Validation Warning Alert */}
      {validationWarning && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationWarning}</span>
        </div>
      )}

      {/* Main Score Entry Table */}
      <DoubleBezelCard innerClassName="p-0 overflow-hidden">
        {/* Prominent Students Section Header with Dynamic Database/API Count */}
        <div className="p-4 bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-sm md:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Students offering {currentSubject.name}:
              </span>
              <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-xs">
                {isLoadingStudents ? '...' : displayStudents.length}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Class: <strong className="text-slate-800 dark:text-slate-200">{currentArm.fullName}</strong></span>
              <span>•</span>
              <span>Subject: <strong className="text-slate-800 dark:text-slate-200">{currentSubject.name} ({currentSubject.code})</strong></span>
              <span>•</span>
              <span>Assessment / CA (20) + Test (20) + Exam (60) = Total (100)</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isInputDisabled && (
              <button
                type="button"
                onClick={handleSaveAllMarks}
                disabled={displayStudents.length === 0 || isLoadingStudents}
                className="touch-target px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Marks ({displayStudents.length} Students)</span>
              </button>
            )}

          </div>
        </div>

        {/* Mobile Horizontal Scroll Cue */}
        <div className="sm:hidden px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-medium flex items-center justify-between">
          <span>↔ Swipe horizontally to view assessment columns</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 pl-3 pr-1 w-8 text-center">#</th>
                <th className="py-3 pl-1 pr-2 min-w-[170px]">Student Name</th>
                <th className="py-3 px-2 w-24 text-center">Student ID</th>
                <th className="py-3 px-2 w-24 text-center">Class</th>
                <th className="py-3 px-2 w-24 text-center">Subject</th>

                {!showDetailedBreakdown ? (
                  <>
                    <th className="py-3 px-2 w-28 text-center bg-amber-50/40 border-l border-r border-slate-200 dark:border-slate-700">
                      Assessment / CA (20)
                    </th>
                    <th className="py-3 px-2 w-24 text-center bg-amber-50/40 border-r border-slate-200 dark:border-slate-700">
                      Test (20)
                    </th>
                    <th className="py-3 px-2 w-24 text-center bg-blue-50/40 border-r border-slate-200 dark:border-slate-700">
                      Exam (60)
                    </th>
                  </>
                ) : (
                  <>
                    <th className="py-3 px-2 w-20 text-center bg-amber-50/40 border-l border-r border-slate-200 dark:border-slate-700">
                      CA 1 (10)
                    </th>
                    <th className="py-3 px-2 w-20 text-center bg-amber-50/40 border-r border-slate-200 dark:border-slate-700">
                      CA 2 (10)
                    </th>
                    <th className="py-3 px-2 w-24 text-center bg-amber-50/40 border-r border-slate-200 dark:border-slate-700">
                      Assg (10)
                    </th>
                    <th className="py-3 px-2 w-24 text-center bg-amber-50/40 border-r border-slate-200 dark:border-slate-700">
                      Proj (10)
                    </th>
                    <th className="py-3 px-2 w-24 text-center bg-blue-50/40 border-r border-slate-200 dark:border-slate-700">
                      Exam (60)
                    </th>
                  </>
                )}

                <th className="py-3 px-3 w-20 text-center bg-slate-50 dark:bg-slate-800">Total</th>
                <th className="py-3 px-3 w-16 text-center">Grade</th>
                <th className="py-3 px-4 min-w-[100px]">Remark</th>
                <th className="py-3 px-4 min-w-[180px]">Teacher's Remark</th>
                {user?.activeRole === 'SUPER_ADMIN' && (
                  <th className="py-3 px-3 text-right w-24">Admin</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoadingStudents ? (
                <tr>
                  <td colSpan={user?.activeRole === 'SUPER_ADMIN' ? 13 : 12} className="py-16 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Loading students for {currentSubject.name}...</p>
                      <p className="text-xs text-slate-400">Retrieving exact enrolled students from database</p>
                    </div>
                  </td>
                </tr>
              ) : displayStudents.length === 0 ? (
                <tr>
                  <td colSpan={user?.activeRole === 'SUPER_ADMIN' ? 13 : 12} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <p className="text-sm font-semibold">No students offering {currentSubject.name} in {currentArm.fullName}</p>
                    <p className="text-xs mt-1">Students enrolled for this subject will appear here automatically.</p>
                  </td>
                </tr>
              ) : (
                displayStudents.map((student, rIdx) => {
                  const entry = studentScoresMap.get(student.id)!;
                  const score = entry.score;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 pl-3 pr-1 text-center text-slate-400 font-mono-tabular">
                        {rIdx + 1}
                      </td>
                      <td className="py-2.5 pl-1 pr-2 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <img
                            src={student.passportPhotoUrl}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                          <span className="truncate">
                            {student.lastName}, {student.firstName}
                          </span>
                        </div>
                      </td>
                      {/* Student ID */}
                      <td className="py-2.5 px-2 text-center font-mono-tabular text-slate-500 dark:text-slate-400 text-[11px]">
                        {student.admissionNumber}
                      </td>
                      {/* Class */}
                      <td className="py-2.5 px-2 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {currentArm.fullName}
                      </td>
                      {/* Subject */}
                      <td className="py-2.5 px-2 text-center">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 whitespace-nowrap">
                          {currentSubject.name}
                        </span>
                      </td>

                      {!showDetailedBreakdown ? (
                        <>
                          {/* Assessment / CA (Max 20) */}
                          <td className="py-1 px-1 text-center bg-amber-50/10 dark:bg-amber-950/20 border-l border-r border-slate-200/60 dark:border-slate-800">
                            <input
                              ref={el => { if (el) inputRefs.current.set(`${rIdx}_0`, el); }}
                              disabled={isInputDisabled}
                              type="number"
                              min="0"
                              max="20"
                              step="0.5"
                              value={entry.assessmentScore}
                              onChange={e => handleScoreFieldChange(student, 'assessment', e.target.value)}
                              onKeyDown={e => handleKeyDown(e, rIdx, 0)}
                              placeholder="0"
                              className={`w-full py-1.5 text-center font-mono-tabular font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 text-xs ${
                                typeof entry.assessmentScore === 'number' && entry.assessmentScore > 20 ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-200' : 'bg-transparent text-slate-800 dark:text-slate-100'
                              } disabled:opacity-60 disabled:cursor-not-allowed`}
                            />
                          </td>

                          {/* Test (Max 20) */}
                          <td className="py-1 px-1 text-center bg-amber-50/10 dark:bg-amber-950/20 border-r border-slate-200/60 dark:border-slate-800">
                            <input
                              ref={el => { if (el) inputRefs.current.set(`${rIdx}_1`, el); }}
                              disabled={isInputDisabled}
                              type="number"
                              min="0"
                              max="20"
                              step="0.5"
                              value={entry.testScore}
                              onChange={e => handleScoreFieldChange(student, 'test', e.target.value)}
                              onKeyDown={e => handleKeyDown(e, rIdx, 1)}
                              placeholder="0"
                              className={`w-full py-1.5 text-center font-mono-tabular font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 text-xs ${
                                typeof entry.testScore === 'number' && entry.testScore > 20 ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-200' : 'bg-transparent text-slate-800 dark:text-slate-100'
                              } disabled:opacity-60 disabled:cursor-not-allowed`}
                            />
                          </td>

                          {/* Exam (Max 60) */}
                          <td className="py-1 px-1 text-center bg-blue-50/20 dark:bg-blue-950/20 border-r border-slate-200/60 dark:border-slate-800">
                            <input
                              ref={el => { if (el) inputRefs.current.set(`${rIdx}_2`, el); }}
                              disabled={isInputDisabled}
                              type="number"
                              min="0"
                              max="60"
                              step="0.5"
                              value={entry.examScore}
                              onChange={e => handleScoreFieldChange(student, 'exam', e.target.value)}
                              onKeyDown={e => handleKeyDown(e, rIdx, 2)}
                              placeholder="0"
                              className={`w-full py-1.5 text-center font-mono-tabular font-extrabold rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 text-xs ${
                                typeof entry.examScore === 'number' && entry.examScore > 60 ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-200' : 'bg-transparent text-blue-900 dark:text-blue-200'
                              } disabled:opacity-60 disabled:cursor-not-allowed`}
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          {/* Detailed Sub-components: CA 1 */}
                          <td className="py-1 px-1 text-center bg-amber-50/10 border-l border-r border-slate-200 dark:border-slate-700">
                            <input
                              ref={el => { if (el) inputRefs.current.set(`${rIdx}_0`, el); }}
                              disabled={isInputDisabled}
                              type="number"
                              min="0"
                              max="10"
                              value={entry.hasMarks ? (score.ca1 || '') : ''}
                              onChange={e => handleDetailedScoreChange(student, 'ca1', e.target.value)}
                              onKeyDown={e => handleKeyDown(e, rIdx, 0)}
                              placeholder="0"
                              className="w-full py-1.5 text-center font-mono-tabular font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                            />
                          </td>
                          {/* CA 2 */}
                          <td className="py-1 px-1 text-center bg-amber-50/10 border-r border-slate-200 dark:border-slate-700">
                            <input
                              ref={el => { if (el) inputRefs.current.set(`${rIdx}_1`, el); }}
                              disabled={isInputDisabled}
                              type="number"
                              min="0"
                              max="10"
                              value={entry.hasMarks ? (score.ca2 || '') : ''}
                              onChange={e => handleDetailedScoreChange(student, 'ca2', e.target.value)}
                              onKeyDown={e => handleKeyDown(e, rIdx, 1)}
                              placeholder="0"
                              className="w-full py-1.5 text-center font-mono-tabular font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                            />
                          </td>
                          {/* Assignment */}
                          <td className="py-1 px-1 text-center bg-amber-50/10 border-r border-slate-200 dark:border-slate-700">
                            <input
                              ref={el => { if (el) inputRefs.current.set(`${rIdx}_2`, el); }}
                              disabled={isInputDisabled}
                              type="number"
                              min="0"
                              max="10"
                              value={entry.hasMarks ? (score.assignment || '') : ''}
                              onChange={e => handleDetailedScoreChange(student, 'assignment', e.target.value)}
                              onKeyDown={e => handleKeyDown(e, rIdx, 2)}
                              placeholder="0"
                              className="w-full py-1.5 text-center font-mono-tabular font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                            />
                          </td>
                          {/* Project */}
                          <td className="py-1 px-1 text-center bg-amber-50/10 border-r border-slate-200 dark:border-slate-700">
                            <input
                              ref={el => { if (el) inputRefs.current.set(`${rIdx}_3`, el); }}
                              disabled={isInputDisabled}
                              type="number"
                              min="0"
                              max="10"
                              value={entry.hasMarks ? (score.project || '') : ''}
                              onChange={e => handleDetailedScoreChange(student, 'project', e.target.value)}
                              onKeyDown={e => handleKeyDown(e, rIdx, 3)}
                              placeholder="0"
                              className="w-full py-1.5 text-center font-mono-tabular font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                            />
                          </td>
                          {/* Exam */}
                          <td className="py-1 px-1 text-center bg-blue-50/20 border-r border-slate-200 dark:border-slate-700">
                            <input
                              ref={el => { if (el) inputRefs.current.set(`${rIdx}_4`, el); }}
                              disabled={isInputDisabled}
                              type="number"
                              min="0"
                              max="60"
                              value={entry.hasMarks ? (score.exam || '') : ''}
                              onChange={e => handleDetailedScoreChange(student, 'exam', e.target.value)}
                              onKeyDown={e => handleKeyDown(e, rIdx, 4)}
                              placeholder="0"
                              className="w-full py-1.5 text-center font-mono-tabular font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                            />
                          </td>
                        </>
                      )}

                      {/* Computed Total (Auto-calculated) */}
                      <td className="py-2.5 px-3 text-center font-mono-tabular font-bold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-extrabold text-sm">
                            {entry.totalScore}
                          </span>
                          {score.isOverridden && (
                            <span
                              className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 cursor-help"
                              title={`OVERRIDDEN by ${score.overriddenBy || 'Admin'}\nReason: ${score.overrideReason}`}
                            >
                              [OV]
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Letter Grade (Auto-calculated) */}
                      <td className="py-2.5 px-3 text-center">
                        {entry.hasMarks ? (
                          <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-black border ${evaluateGrade(typeof entry.totalScore === 'number' ? entry.totalScore : 0).badgeClass}`}>
                            {entry.grade}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold">—</span>
                        )}
                      </td>

                      {/* Remark (Auto-calculated) */}
                      <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                        {entry.hasMarks ? entry.remark : '—'}
                      </td>

                      {/* Teacher Feedback / Pedagogical Remark */}
                      <td className="py-1 px-3">
                        <input
                          disabled={isInputDisabled}
                          type="text"
                          placeholder="Teacher remark..."
                          value={score.teacherRemark || ''}
                          onChange={e => {
                            setSaveStatus('SAVING');
                            updateScore(score.id, {
                              studentId: student.id,
                              subjectId: selectedSubjectId,
                              classArmId: selectedArmId,
                              termId: activeTerm.id,
                              teacherRemark: e.target.value
                            });
                            setTimeout(() => setSaveStatus('SAVED'), 400);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* Super Admin Override Trigger */}
                      {user?.activeRole === 'SUPER_ADMIN' && (
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setOverrideTarget({
                              score,
                              studentName: `${student.lastName}, ${student.firstName}`,
                              admissionNumber: student.admissionNumber
                            })}
                            title="Administrative Score Override"
                            className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>Override</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Real-time Statistics Summary Bar */}
        <div className="p-4 bg-slate-900 text-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Class Performance Summary</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-mono-tabular">
            <div>
              <span className="text-slate-400 mr-2">Average:</span>
              <span className="font-bold text-white">{classAvg}%</span>
            </div>
            <div>
              <span className="text-slate-400 mr-2">Highest:</span>
              <span className="font-bold text-emerald-400">{highestTotal}%</span>
            </div>
            <div>
              <span className="text-slate-400 mr-2">Lowest:</span>
              <span className="font-bold text-rose-400">{lowestTotal}%</span>
            </div>
            <div>
              <span className="text-slate-400 mr-2">Pass Rate:</span>
              <span className="font-bold text-amber-300">{passRate}%</span>
            </div>
          </div>
        </div>
      </DoubleBezelCard>

      {/* Excel Round-Trip Modal */}
      <ExcelImportExportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        classArmName={currentArm.fullName}
        classArmId={selectedArmId}
        subjectName={currentSubject.name}
        subjectId={selectedSubjectId}
        termName={activeTerm.name}
        students={displayStudents}
        currentScores={currentScoresList}
        onImportSuccess={imported => {
          bulkSaveScores(selectedArmId, selectedSubjectId, imported);
        }}
      />

      {/* Super Admin Score Override Modal */}
      {overrideTarget && (
        <ScoreOverrideModal
          isOpen={!!overrideTarget}
          scoreRecord={overrideTarget.score}
          studentName={overrideTarget.studentName}
          admissionNumber={overrideTarget.admissionNumber}
          subjectName={currentSubject.name}
          onClose={() => setOverrideTarget(null)}
          onSave={(newScores, reason, ticketId) => {
            overrideScore({
              scoreId: overrideTarget.score.id,
              newScores,
              reason,
              ticketId,
              adminUser: {
                id: user?.id || 'stf-001',
                name: user?.name || 'Dr. Kenneth Balogun',
                role: user?.activeRole || 'SUPER_ADMIN'
              }
            });
            setOverrideTarget(null);
          }}
        />
      )}

      {/* Subject Teacher Mark Sheet Submission Modal */}
      <ModalPortal isOpen={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)}>
        <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Submit Mark Sheet to Form Master
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formally sign off and transfer scores for broadsheet compilation and exam moderation.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Class Arm:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{currentArm.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Subject:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{currentSubject.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Graded Enrollees:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {currentScoresList.filter(s => s.total > 0).length} / {armStudents.length} Students
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Class Average:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{classAvg}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pass Rate:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{passRate}%</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Subject Teacher General Note / Feedback for Form Master (Optional)
            </label>
            <textarea
              value={submitComment}
              onChange={e => setSubmitComment(e.target.value)}
              rows={3}
              placeholder="e.g., Syllabus completed in full. Practical exam was conducted in physics laboratory with standard apparatus..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setIsSubmitting(true);
                submitSubjectMarksheet(
                  selectedArmId,
                  selectedSubjectId,
                  submitComment,
                  {
                    id: user?.id || 'STF/2026/018',
                    name: user?.name || 'Dr. Michael Adebayo',
                    role: 'SUBJECT_TEACHER'
                  }
                );
                setIsSubmitting(false);
                setIsSubmitModalOpen(false);
                setSubmitComment('');
              }}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting...' : 'Certify & Transmit'}</span>
            </button>
          </div>
        </div>
      </ModalPortal>
    </FuturisticPageShell>
  );
};
