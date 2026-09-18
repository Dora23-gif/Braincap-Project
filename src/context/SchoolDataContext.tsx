import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AcademicSession,
  AcademicTerm,
  ClassLevel,
  ClassArm,
  Subject,
  TeacherAllocation,
  Student,
  Parent,
  SubjectScore,
  AffectiveAndPsychomotor,
  DailyAttendanceRecord,
  StudentTerminalDossier,
  StaffMember,
  AuditLogEntry,
  SchoolSettings,
  DisciplinaryIncident,
  CampusExeat,
  SchemeOfWorkTracker,
  ExamHall,
  InvigilationShift,
  ExternalCandidateProfile,
  ClassBroadsheetSeal,
  PastoralLogEntry,
  ClassArmEndorsement,
  SubjectMarksheetSubmission,
  StudentFeeClearance,
  DayTimetable,
  TimetablePeriod,
  ExamTimetableEntry,
  ParentInquiry,
  PortalMessage
} from '../types';
import {
  INITIAL_SESSIONS,
  INITIAL_TERMS,
  INITIAL_CLASS_LEVELS,
  INITIAL_CLASS_ARMS,
  INITIAL_SUBJECTS,
  INITIAL_ALLOCATIONS,
  INITIAL_STUDENTS,
  INITIAL_SCORES,
  INITIAL_AFFECTIVE,
  INITIAL_PARENTS,
  INITIAL_STAFF
} from '../data/initialMockData';
import {
  DEFAULT_SCHOOL_SETTINGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_DISCIPLINARY_INCIDENTS,
  INITIAL_CAMPUS_EXEATS,
  INITIAL_SCHEME_OF_WORK,
  INITIAL_EXAM_HALLS,
  INITIAL_INVIGILATION_ROSTER,
  INITIAL_EXTERNAL_CANDIDATES,
  INITIAL_BROADSHEET_SEALS,
  INITIAL_PASTORAL_LOGS,
  INITIAL_ARM_ENDORSEMENTS,
  INITIAL_SUBJECT_SUBMISSIONS,
  INITIAL_FEE_CLEARANCES,
  INITIAL_WEEKLY_TIMETABLES,
  INITIAL_PARENT_INQUIRIES
} from '../data/initialEnterpriseData';
import {
  computeSubjectTotal,
  evaluateGrade,
  calculateTotalAggregate,
  computeRankings
} from '../lib/gradeCalculator';
import {
  api,
  adaptStudentFromBackend,
  adaptStudentToBackend,
  adaptClassArmFromBackend,
  adaptClassLevelFromBackend,
  adaptAcademicSessionFromBackend,
  adaptAcademicTermFromBackend,
  adaptSubjectFromBackend,
  adaptSubjectToBackend,
  adaptSubjectScoreFromBackend,
  adaptStaffFromBackend,
  adaptTeacherAllocationFromBackend,
  adaptParentFromBackend,
  adaptAuditLogFromBackend,
  adaptSchoolSettingsFromBackend,
  resolveArmId,
  resolveArmPk,
  resolveSubjectId,
  resolveSubjectPk,
  resolveTermId,
  resolveTermPk,
  resolveStudentCanonicalId,
} from '../lib/api';
import { useAuth } from './AuthContext';

interface SchoolDataContextType {
  sessions: AcademicSession[];
  terms: AcademicTerm[];
  classLevels: ClassLevel[];
  classArms: ClassArm[];
  subjects: Subject[];
  allocations: TeacherAllocation[];
  students: Student[];
  scores: SubjectScore[];
  affectiveTraits: AffectiveAndPsychomotor[];
  attendanceRecords: DailyAttendanceRecord[];
  
  parents: Parent[];
  staff: StaffMember[];
  auditLogs: AuditLogEntry[];
  schoolSettings: SchoolSettings;
  
  // Vice Principal & Student Affairs Ledgers
  disciplinaryIncidents: DisciplinaryIncident[];
  campusExeats: CampusExeat[];
  schemeOfWork: SchemeOfWorkTracker[];

  // Helpers
  activeSession: AcademicSession;
  activeTerm: AcademicTerm;
  
  // Actions
  updateScore: (scoreId: string, partial: Partial<SubjectScore>) => void;
  bulkSaveScores: (classArmId: string, subjectId: string, scoresData: { admissionNumber: string; ca1: number; ca2: number; assignment: number; project: number; exam: number }[]) => Promise<void>;
  toggleGradeLock: (classArmId: string, subjectId: string, actor?: { id: string; name: string; role: any }) => void;
  overrideScore: (params: {
    scoreId: string;
    newScores: Partial<Pick<SubjectScore, 'ca1' | 'ca2' | 'assignment' | 'project' | 'exam'>>;
    reason: string;
    ticketId: string;
    adminUser: { id: string; name: string; role: any };
  }) => void;
  recordAttendance: (date: string, records: { studentId: string; classArmId: string; status: any }[]) => void;
  updatePsychomotor: (record: AffectiveAndPsychomotor) => void;
  updateStudentSubjects: (studentId: string, subjectIds: string[]) => void;
  dropStudentSubject: (studentId: string, subjectId: string, level: 'SSS 2' | 'SSS 3', reason?: string) => void;
  registerStudent: (student: Omit<Student, 'id' | 'admissionNumber' | 'status' | 'registeredSubjectIds'> & { registeredSubjectIds?: string[]; admissionNumber?: string }) => Promise<Student>;
  getNextAdmissionNumber: () => string;
  updateStudent: (studentId: string, updates: Partial<Student>, actor?: { id: string; name: string; role: any }) => void | Promise<void>;
  deleteStudent: (studentId: string, reason: string, actor?: { id: string; name: string; role: any }) => void;
  addClassArm: (armData: { classLevelId: string; name: string; formMasterId?: string; formMasterName?: string }, actor?: { id: string; name: string; role: any }) => ClassArm;
  addClassLevel: (levelData: { name: string; section: 'JUNIOR' | 'SENIOR'; order?: number }, actor?: { id: string; name: string; role: any }) => ClassLevel;
  addSubject: (data: Omit<Subject, 'id'>) => Promise<Subject>;
  updateSubject: (subjectId: string, updates: Partial<Subject>) => Promise<Subject>;
  publishResults: (termId: string, isPublished: boolean) => void;
  setActiveTerm: (termId: string) => void;
  getStudentDossier: (studentId: string, termId?: string) => StudentTerminalDossier | null;
  resetToDefaultData: () => void;

  // Enterprise Governance Actions
  addStaff: (member: Omit<StaffMember, 'id' | 'status' | 'joinedDate'>) => StaffMember;
  updateStaff: (staffId: string, updates: Partial<StaffMember>) => void;
  toggleStaffStatus: (staffId: string, reason?: string, actor?: { id: string; name: string; role: any }) => void;
  resetStaffPin: (staffId: string, actor?: { id: string; name: string; role: any }) => string;
  addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
  updateSchoolSettings: (updates: Partial<SchoolSettings>, actor?: { id: string; name: string; role: any }) => void;
  executeAcademicRollover: (adminUser: { id: string; name: string; role: any }) => {
    promotedCount: number;
    graduatedCount: number;
    heldBackCount: number;
    trialCount: number;
    newSessionName: string;
  };

  // Principal Executive Actions
  togglePrincipalTermClearance: (termId: string, actor: { id: string; name: string; role: any }) => void;
  updatePrincipalStudentRemark: (studentId: string, termId: string, remark: string) => void;
  batchUpdatePrincipalRemarks: (termId: string, remarksMap: Record<string, string>) => void;

  // Vice Principals Actions
  addDisciplinaryIncident: (incident: Omit<DisciplinaryIncident, 'id'>, actor?: { id: string; name: string; role: any }) => void;
  resolveDisciplinaryIncident: (incidentId: string, notes: string, actor?: { id: string; name: string; role: any }) => void;
  escalateDisciplinaryIncident: (incidentId: string, notes?: string, actor?: { id: string; name: string; role: any }) => void;
  approveCampusExeat: (exeatId: string, approverName: string, actor?: { id: string; name: string; role: any }) => void;
  markExeatReturned: (exeatId: string, actor?: { id: string; name: string; role: any }) => void;
  rejectCampusExeat: (exeatId: string, reason?: string, actor?: { id: string; name: string; role: any }) => void;
  updateSchemeOfWorkVelocity: (trackerId: string, updates: Partial<SchemeOfWorkTracker>, actor?: { id: string; name: string; role: any }) => void;

  // Examination Officer Operational Ledgers
  examHalls: ExamHall[];
  invigilationRoster: InvigilationShift[];
  externalCandidates: ExternalCandidateProfile[];
  broadsheetSeals: ClassBroadsheetSeal[];

  // Examination Officer Actions
  assignInvigilator: (shift: Omit<InvigilationShift, 'id'>, actor?: { id: string; name: string; role: any }) => void;
  updateInvigilationStatus: (shiftId: string, status: InvigilationShift['status']) => void;
  updateExternalCandidateStatus: (candidateId: string, status: ExternalCandidateProfile['registrationStatus'], indexNumber?: string, actor?: { id: string; name: string; role: any }) => void;
  sealClassBroadsheet: (classArmId: string, notes?: string, actor?: { id: string; name: string; role: any }) => void;
  nudgeDefaultingTeachers: (classArmId: string, subjectName: string, actor?: { id: string; name: string; role: any }) => void;

  // Form Master Pastoral & Class Arm Operations
  pastoralLogs: PastoralLogEntry[];
  armEndorsements: ClassArmEndorsement[];
  addPastoralLog: (entry: Omit<PastoralLogEntry, 'id'>, actor?: { id: string; name: string; role: any }) => void;
  endorseClassArm: (classArmId: string, comments?: string, actor?: { id: string; name: string; role: any }) => void;

  // Subject Teacher Operations
  subjectSubmissions: SubjectMarksheetSubmission[];
  submitSubjectMarksheet: (classArmId: string, subjectId: string, comments?: string, actor?: { id: string; name: string; role: any }) => void;
  retractSubjectMarksheet: (classArmId: string, subjectId: string, actor?: { id: string; name: string; role: any }) => void;

  // Family & Student Operations
  feeClearances: StudentFeeClearance[];
  weeklyTimetables: Record<string, DayTimetable[]>;
  parentInquiries: ParentInquiry[];
  sendParentInquiry: (inquiry: Omit<ParentInquiry, 'id' | 'createdAt' | 'status'>, actor?: { id: string; name: string; role: any }) => void;
  getWardTimetable: (classArmId: string) => DayTimetable[];
  getWardFeeClearance: (studentId: string, termId: string) => StudentFeeClearance | undefined;

  // Examination Timetable (Exam Officer)
  examTimetable: ExamTimetableEntry[];
  addExamTimetableEntry: (entry: Omit<ExamTimetableEntry, 'id'>, actor?: { id: string; name: string; role: any }) => void;
  updateExamTimetableEntry: (id: string, entry: Partial<ExamTimetableEntry>, actor?: { id: string; name: string; role: any }) => void;
  deleteExamTimetableEntry: (id: string, actor?: { id: string; name: string; role: any }) => void;

  // School Timetable (VP Academics)
  updateClassTimetable: (classArmId: string, days: DayTimetable[], actor?: { id: string; name: string; role: any }) => void;
  addPeriodToTimetable: (classArmId: string, day: string, period: TimetablePeriod, actor?: { id: string; name: string; role: any }) => void;
  deletePeriodFromTimetable: (classArmId: string, day: string, periodNumber: number, actor?: { id: string; name: string; role: any }) => void;
  importWeeklyTimetableFromData: (classArmId: string, parsedDays: DayTimetable[], actor?: { id: string; name: string; role: any }) => void;

  // Teacher Subject Allocations
  allocateTeacher: (classArmId: string, subjectId: string, teacherId: string, actor?: { id: string; name: string; role: any }) => void;
  removeTeacherAllocation: (allocationId: string, actor?: { id: string; name: string; role: any }) => void;

  // Real-Time Inter-Role Communications & Directives
  portalMessages: PortalMessage[];
  sendMessage: (message: Omit<PortalMessage, 'id' | 'createdAt' | 'isRead' | 'readAt'>) => PortalMessage;
  replyToMessage: (threadId: string, content: string, sender: { id: string; name: string; role: any; avatarUrl?: string }) => PortalMessage | null;
  markMessageAsRead: (messageId: string) => void;
  markAllMessagesAsRead: (userIdOrRole: string) => void;
  deleteMessage: (messageId: string) => void;
  isBackendLoaded: boolean;
  refreshBackendData: () => Promise<void>;
}

const SchoolDataContext = createContext<SchoolDataContextType | undefined>(undefined);

const DATA_VERSION = 'v12_unlocked_live_marks';

export const INITIAL_PORTAL_MESSAGES: PortalMessage[] = [
  {
    id: 'msg-001',
    threadId: 'th-executive-directives',
    senderId: 'stf-001',
    senderName: 'Dr. Michael Adebayo',
    senderRole: 'PRINCIPAL',
    senderAvatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    recipientId: 'ALL',
    recipientName: 'All Academic Staff & Officers',
    recipientRole: 'ALL',
    subject: 'Executive Directive: Second Term Examination Protocol & Marksheet Locking',
    content: 'Esteemed Faculty and Academic Officers,\n\nAs we enter the Second Term examination period, all continuous assessments (CA1, CA2, assignments, and practical projects) must be entered and locked in the EIS Portal by Friday at 17:00.\n\nThe Examination Officer and Vice Principals will commence broadsheet verification and terminal sealing immediately after. Ensure strict confidentiality, accuracy, and zero score disparity. Thank you for your continued dedication to academic excellence.\n\nWarm regards,\nDr. Michael Adebayo\nPrincipal & Head of School',
    createdAt: '2026-03-24T08:30:00.000Z',
    isRead: true,
    readAt: '2026-03-24T09:00:00.000Z',
    priority: 'OFFICIAL_DIRECTIVE'
  },
  {
    id: 'msg-002',
    threadId: 'th-admin-vp-sync',
    senderId: 'admin-001',
    senderName: 'Engr. Olatunji Adeleke',
    senderRole: 'SUPER_ADMIN',
    senderAvatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    recipientId: 'stf-003',
    recipientName: 'Mrs. Victoria Okafor',
    recipientRole: 'VICE_PRINCIPAL_ACADEMICS',
    subject: 'Security Audit & SSS 3 Timetable Generation Synchronization',
    content: 'Good morning Mrs. Okafor. I noticed the revised timetable for Senior Secondary has been published. Please verify that the double periods for Physics practicals in Laboratory Alpha do not conflict with Chemistry sessions on Thursdays. Let me know if any access adjustments are required on the server ledger.',
    createdAt: '2026-03-24T09:15:00.000Z',
    isRead: true,
    readAt: '2026-03-24T09:45:00.000Z',
    priority: 'NORMAL'
  },
  {
    id: 'msg-003',
    threadId: 'th-admin-vp-sync',
    senderId: 'stf-003',
    senderName: 'Mrs. Victoria Okafor',
    senderRole: 'VICE_PRINCIPAL_ACADEMICS',
    senderAvatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    recipientId: 'admin-001',
    recipientName: 'Engr. Olatunji Adeleke',
    recipientRole: 'SUPER_ADMIN',
    subject: 'Re: Security Audit & SSS 3 Timetable Generation Synchronization',
    content: 'Good day Engr. Adeleke. The laboratory schedule has been cross-referenced with the Science Department head. Lab Alpha is allocated exclusively to Chemistry on Tuesdays and Physics on Thursdays. There are no clashes. Thank you for flagging!',
    createdAt: '2026-03-24T10:10:00.000Z',
    isRead: false,
    priority: 'NORMAL'
  },
  {
    id: 'msg-004',
    threadId: 'th-parent-olympiad-inquiry',
    senderId: 'par-001',
    senderName: 'Dr. Kingsley Adeleke',
    senderRole: 'PARENT',
    recipientId: 'stf-001',
    recipientName: 'Dr. Michael Adebayo',
    recipientRole: 'PRINCIPAL',
    subject: 'Inquiry Regarding National Mathematics Olympiad & Mock Exam Conflict',
    content: 'Dear Principal Adebayo,\n\nMy ward, Favour Adeleke (SSS 2 Gold), has been invited to represent the state at the National Mathematics Olympiad preliminaries on April 14th. This coincides with the general Mathematics mock exam on the school exam timetable.\n\nCould we arrange for an authorized special sitting or reschedule for him so that his terminal continuous assessment is not affected? We appreciate the school\'s mentorship.\n\nRespectfully,\nDr. Kingsley Adeleke',
    createdAt: '2026-03-24T11:00:00.000Z',
    isRead: false,
    priority: 'URGENT',
    relatedEntity: { type: 'STUDENT', id: 'std-001', name: 'Favour Adeleke' }
  },
  {
    id: 'msg-005',
    threadId: 'th-formmaster-teacher-chase',
    senderId: 'stf-002',
    senderName: 'Mr. Chukwuma Eze',
    senderRole: 'FORM_MASTER',
    recipientId: 'stf-004',
    recipientName: 'Mrs. Folashade Alabi',
    recipientRole: 'TEACHER',
    subject: 'SSS 2 Gold: Outstanding Mathematics Marksheet Submission',
    content: 'Good afternoon Mrs. Alabi,\n\nAs Form Master of SSS 2 Gold, I am finalizing the pastoral evaluations and class broadsheet. We are awaiting the final CA2 component for Mathematics to proceed with arm seal endorsement. Please submit your marksheet endorsement as soon as possible today.\n\nThank you,\nMr. Chukwuma Eze',
    createdAt: '2026-03-24T12:30:00.000Z',
    isRead: false,
    priority: 'NORMAL',
    relatedEntity: { type: 'CLASS_ARM', id: 'arm-sss2-gold', name: 'SSS 2 Gold' }
  },
  {
    id: 'msg-006',
    threadId: 'th-exam-hall-invigilation',
    senderId: 'stf-005',
    senderName: 'Mr. Babatunde Sanusi',
    senderRole: 'EXAMINATION_OFFICER',
    recipientId: 'stf-004',
    recipientName: 'Mrs. Folashade Alabi',
    recipientRole: 'TEACHER',
    subject: 'Chief Invigilator Duty - Main Exam Hall Alpha (Mathematics)',
    content: 'Dear Mrs. Alabi,\n\nPlease be reminded that you have been rostered as Chief Invigilator for the Mathematics General examination on April 14 in Main Exam Hall Alpha. Please report to the Exam Control Office 30 minutes prior to paper commencement to sign out the encrypted question packets.\n\nMr. Babatunde Sanusi\nExamination Officer',
    createdAt: '2026-03-24T13:00:00.000Z',
    isRead: false,
    priority: 'URGENT',
    relatedEntity: { type: 'EXAM', id: 'exam-001', name: 'Mathematics (General)' }
  }
];

export const INITIAL_EXAM_TIMETABLE: ExamTimetableEntry[] = [
  {
    id: 'exam-001',
    examDate: '2026-04-14',
    timeSlot: '09:00 - 11:30 (Morning Session)',
    sessionType: 'MORNING',
    subjectName: 'Mathematics (General)',
    subjectCode: 'MTH',
    applicableClasses: ['SSS 1', 'SSS 2', 'SSS 3'],
    examHallId: 'hall-01',
    examHallName: 'Main Exam Hall Alpha (Auditorium)',
    chiefInvigilatorStaffId: 'stf-004',
    chiefInvigilatorName: 'Mrs. Folashade Alabi',
    specialInstructions: 'Non-programmable mathematical instruments and 4-figure tables allowed.'
  },
  {
    id: 'exam-002',
    examDate: '2026-04-14',
    timeSlot: '13:00 - 15:00 (Afternoon Session)',
    sessionType: 'AFTERNOON',
    subjectName: 'Civic Education',
    subjectCode: 'CIV',
    applicableClasses: ['JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2'],
    examHallId: 'hall-02',
    examHallName: 'West Wing Assembly Hall Beta',
    chiefInvigilatorStaffId: 'stf-008',
    chiefInvigilatorName: 'Mr. Tunde Balogun',
    specialInstructions: 'Section A is OMR objective shading; Section B is essay script.'
  },
  {
    id: 'exam-003',
    examDate: '2026-04-15',
    timeSlot: '09:00 - 11:45 (Morning Session)',
    sessionType: 'MORNING',
    subjectName: 'English Language & Comprehension',
    subjectCode: 'ENG',
    applicableClasses: ['JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'],
    examHallId: 'hall-01',
    examHallName: 'Main Exam Hall Alpha (Auditorium)',
    chiefInvigilatorStaffId: 'stf-002',
    chiefInvigilatorName: 'Mr. Chukwuma Eze',
    specialInstructions: 'Essay paper takes 1 hour 45 mins; Test of Orals starts at 11:00 AM.'
  },
  {
    id: 'exam-004',
    examDate: '2026-04-15',
    timeSlot: '13:30 - 15:30 (Afternoon Session)',
    sessionType: 'AFTERNOON',
    subjectName: 'Data Processing & Computer Studies',
    subjectCode: 'DP',
    applicableClasses: ['SSS 1', 'SSS 2', 'SSS 3'],
    examHallId: 'hall-04',
    examHallName: 'E-Testing Computer CBT Centre',
    chiefInvigilatorStaffId: 'stf-007',
    chiefInvigilatorName: 'Mr. Emeka Okafor',
    specialInstructions: 'Computer-based testing with randomized question banks.'
  },
  {
    id: 'exam-005',
    examDate: '2026-04-16',
    timeSlot: '09:00 - 11:30 (Morning Session)',
    sessionType: 'MORNING',
    subjectName: 'Senior Physics',
    subjectCode: 'PHY',
    applicableClasses: ['SSS 2', 'SSS 3'],
    examHallId: 'hall-03',
    examHallName: 'Senior Science Complex Hall Gamma',
    chiefInvigilatorStaffId: 'stf-001',
    chiefInvigilatorName: 'Dr. Michael Adebayo',
    specialInstructions: 'Formula sheets will be provided by invigilator desk.'
  },
  {
    id: 'exam-006',
    examDate: '2026-04-17',
    timeSlot: '09:00 - 11:30 (Morning Session)',
    sessionType: 'MORNING',
    subjectName: 'Chemistry',
    subjectCode: 'CHE',
    applicableClasses: ['SSS 1', 'SSS 2', 'SSS 3'],
    examHallId: 'hall-01',
    examHallName: 'Main Exam Hall Alpha (Auditorium)',
    chiefInvigilatorStaffId: 'stf-006',
    chiefInvigilatorName: 'Mrs. Hadiza Musa',
    specialInstructions: 'Periodic tables included on question paper cover.'
  }
];

function safeStorageParse<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved || saved === 'undefined' || saved === 'null') return fallback;
    const parsed = JSON.parse(saved);
    return parsed !== undefined && parsed !== null ? parsed : fallback;
  } catch (e) {
    console.warn(`Corrupted localStorage key "${key}", reverting to fallback:`, e);
    return fallback;
  }
}

export const SchoolDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isBackendConnected, user: authUser } = useAuth();
  const [sessions, setSessions] = useState<AcademicSession[]>(() => safeStorageParse('eis_sessions', INITIAL_SESSIONS));
  const [terms, setTerms] = useState<AcademicTerm[]>(() => safeStorageParse('eis_terms', INITIAL_TERMS));
  const [classLevels, setClassLevels] = useState<ClassLevel[]>(() => safeStorageParse('eis_class_levels', INITIAL_CLASS_LEVELS));
  const [classArms, setClassArms] = useState<ClassArm[]>(() => safeStorageParse('eis_class_arms', INITIAL_CLASS_ARMS));
  const [subjects, setSubjects] = useState<Subject[]>(() => safeStorageParse('eis_subjects', INITIAL_SUBJECTS));
  const [allocations, setAllocations] = useState<TeacherAllocation[]>(() => safeStorageParse('eis_allocations', INITIAL_ALLOCATIONS));
  const [students, setStudents] = useState<Student[]>(() => safeStorageParse('eis_students', INITIAL_STUDENTS));
  const [scores, setScores] = useState<SubjectScore[]>(() => safeStorageParse('eis_scores', INITIAL_SCORES));
  const [affectiveTraits, setAffectiveTraits] = useState<AffectiveAndPsychomotor[]>(() => safeStorageParse('eis_affective', INITIAL_AFFECTIVE));
  const [attendanceRecords, setAttendanceRecords] = useState<DailyAttendanceRecord[]>(() => safeStorageParse('eis_attendance', []));
  const [staff, setStaff] = useState<StaffMember[]>(() => safeStorageParse('eis_staff', INITIAL_STAFF));
  const [parents, setParents] = useState<Parent[]>(() => safeStorageParse('eis_parents', INITIAL_PARENTS));
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => safeStorageParse('eis_audit_logs', INITIAL_AUDIT_LOGS));
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(() => safeStorageParse('eis_school_settings', DEFAULT_SCHOOL_SETTINGS));
  const [disciplinaryIncidents, setDisciplinaryIncidents] = useState<DisciplinaryIncident[]>(() => safeStorageParse('eis_discipline', INITIAL_DISCIPLINARY_INCIDENTS));
  const [campusExeats, setCampusExeats] = useState<CampusExeat[]>(() => safeStorageParse('eis_exeats', INITIAL_CAMPUS_EXEATS));
  const [schemeOfWork, setSchemeOfWork] = useState<SchemeOfWorkTracker[]>(() => safeStorageParse('eis_scheme_of_work', INITIAL_SCHEME_OF_WORK));
  const [examHalls, setExamHalls] = useState<ExamHall[]>(() => safeStorageParse('eis_exam_halls', INITIAL_EXAM_HALLS));
  const [invigilationRoster, setInvigilationRoster] = useState<InvigilationShift[]>(() => safeStorageParse('eis_invigilation', INITIAL_INVIGILATION_ROSTER));
  const [externalCandidates, setExternalCandidates] = useState<ExternalCandidateProfile[]>(() => safeStorageParse('eis_external_candidates', INITIAL_EXTERNAL_CANDIDATES));
  const [broadsheetSeals, setBroadsheetSeals] = useState<ClassBroadsheetSeal[]>(() => safeStorageParse('eis_broadsheet_seals', INITIAL_BROADSHEET_SEALS));
  const [pastoralLogs, setPastoralLogs] = useState<PastoralLogEntry[]>(() => safeStorageParse('eis_pastoral_logs', INITIAL_PASTORAL_LOGS));
  const [armEndorsements, setArmEndorsements] = useState<ClassArmEndorsement[]>(() => safeStorageParse('eis_arm_endorsements', INITIAL_ARM_ENDORSEMENTS));
  const [subjectSubmissions, setSubjectSubmissions] = useState<SubjectMarksheetSubmission[]>(() => safeStorageParse('eis_subject_submissions', INITIAL_SUBJECT_SUBMISSIONS));
  const [feeClearances, setFeeClearances] = useState<StudentFeeClearance[]>(() => safeStorageParse('eis_fee_clearances', INITIAL_FEE_CLEARANCES));
  const [weeklyTimetables, setWeeklyTimetables] = useState<Record<string, DayTimetable[]>>(() => safeStorageParse('eis_weekly_timetables', INITIAL_WEEKLY_TIMETABLES));
  const [examTimetable, setExamTimetable] = useState<ExamTimetableEntry[]>(() => safeStorageParse('eis_exam_timetable', INITIAL_EXAM_TIMETABLE));
  const [parentInquiries, setParentInquiries] = useState<ParentInquiry[]>(() => safeStorageParse('eis_parent_inquiries', INITIAL_PARENT_INQUIRIES));
  const [portalMessages, setPortalMessages] = useState<PortalMessage[]>(() => safeStorageParse('eis_portal_messages', INITIAL_PORTAL_MESSAGES));

  useEffect(() => {
    if (localStorage.getItem('eis_data_version') !== DATA_VERSION) {
      localStorage.setItem('eis_data_version', DATA_VERSION);
      localStorage.setItem('eis_students', JSON.stringify(INITIAL_STUDENTS));
      localStorage.setItem('eis_scores', JSON.stringify(INITIAL_SCORES));
      localStorage.setItem('eis_affective', JSON.stringify(INITIAL_AFFECTIVE));
      localStorage.setItem('eis_staff', JSON.stringify(INITIAL_STAFF));
      localStorage.setItem('eis_audit_logs', JSON.stringify(INITIAL_AUDIT_LOGS));
      localStorage.setItem('eis_school_settings', JSON.stringify(DEFAULT_SCHOOL_SETTINGS));
      localStorage.setItem('eis_discipline', JSON.stringify(INITIAL_DISCIPLINARY_INCIDENTS));
      localStorage.setItem('eis_exeats', JSON.stringify(INITIAL_CAMPUS_EXEATS));
      localStorage.setItem('eis_scheme_of_work', JSON.stringify(INITIAL_SCHEME_OF_WORK));
      localStorage.setItem('eis_exam_halls', JSON.stringify(INITIAL_EXAM_HALLS));
      localStorage.setItem('eis_invigilation', JSON.stringify(INITIAL_INVIGILATION_ROSTER));
      localStorage.setItem('eis_external_candidates', JSON.stringify(INITIAL_EXTERNAL_CANDIDATES));
      localStorage.setItem('eis_broadsheet_seals', JSON.stringify(INITIAL_BROADSHEET_SEALS));
      localStorage.setItem('eis_pastoral_logs', JSON.stringify(INITIAL_PASTORAL_LOGS));
      localStorage.setItem('eis_arm_endorsements', JSON.stringify(INITIAL_ARM_ENDORSEMENTS));
      localStorage.setItem('eis_subject_submissions', JSON.stringify(INITIAL_SUBJECT_SUBMISSIONS));
      localStorage.setItem('eis_fee_clearances', JSON.stringify(INITIAL_FEE_CLEARANCES));
      localStorage.setItem('eis_parent_inquiries', JSON.stringify(INITIAL_PARENT_INQUIRIES));
      localStorage.setItem('eis_allocations', JSON.stringify(INITIAL_ALLOCATIONS));
      localStorage.setItem('eis_portal_messages', JSON.stringify(INITIAL_PORTAL_MESSAGES));
      localStorage.setItem('eis_class_levels', JSON.stringify(INITIAL_CLASS_LEVELS));
      localStorage.setItem('eis_class_arms', JSON.stringify(INITIAL_CLASS_ARMS));
      setClassLevels(INITIAL_CLASS_LEVELS);
      setClassArms(INITIAL_CLASS_ARMS);
      setStudents(INITIAL_STUDENTS);
      setScores(INITIAL_SCORES);
      setAffectiveTraits(INITIAL_AFFECTIVE);
      setStaff(INITIAL_STAFF);
      setParents(INITIAL_PARENTS);
      setAuditLogs(INITIAL_AUDIT_LOGS);
      setSchoolSettings(DEFAULT_SCHOOL_SETTINGS);
      setDisciplinaryIncidents(INITIAL_DISCIPLINARY_INCIDENTS);
      setCampusExeats(INITIAL_CAMPUS_EXEATS);
      setSchemeOfWork(INITIAL_SCHEME_OF_WORK);
      setExamHalls(INITIAL_EXAM_HALLS);
      setInvigilationRoster(INITIAL_INVIGILATION_ROSTER);
      setExternalCandidates(INITIAL_EXTERNAL_CANDIDATES);
      setBroadsheetSeals(INITIAL_BROADSHEET_SEALS);
      setPastoralLogs(INITIAL_PASTORAL_LOGS);
      setArmEndorsements(INITIAL_ARM_ENDORSEMENTS);
      setSubjectSubmissions(INITIAL_SUBJECT_SUBMISSIONS);
      setFeeClearances(INITIAL_FEE_CLEARANCES);
      setParentInquiries(INITIAL_PARENT_INQUIRIES);
      setAllocations(INITIAL_ALLOCATIONS);
      setPortalMessages(INITIAL_PORTAL_MESSAGES);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('eis_parents', JSON.stringify(parents));
  }, [parents]);

  const [isBackendLoaded, setIsBackendLoaded] = useState(false);

  const fetchLiveSchoolData = useCallback(async () => {
    try {
      const [
        sessionsRes,
        termsRes,
        studentsRes,
        staffRes,
        scoresRes,
        attendanceRes,
        psychomotorRes,
        settingsRes,
        auditLogsRes,
        subjectsRes,
        classLevelsRes,
        classArmsRes,
        allocationsRes,
      ] = await Promise.allSettled([
        api.get('/academics/sessions/', { page_size: 'all' }),
        api.get('/academics/terms/', { page_size: 'all' }),
        api.get('/academics/class-levels/', { page_size: 'all' }),
        api.get('/academics/class-arms/', { page_size: 'all' }),
        api.get('/students/students/', { page_size: 'all' }),
        api.get('/accounts/users/', { page_size: 'all' }),
        api.get('/grading/scores/', { page_size: 'all' }),
        api.get('/students/attendance/', { page_size: 'all' }),
        api.get('/students/psychomotor/', { page_size: 'all' }),
        api.get('/governance/settings/current/'),
        api.get('/governance/audit-logs/', { page_size: 'all' }),
        api.get('/academics/subjects/', { page_size: 'all' }),
        api.get('/academics/allocations/', { page_size: 'all' }),
      ]);

      if (sessionsRes.status === 'fulfilled' && Array.isArray(sessionsRes.value)) {
        setSessions(sessionsRes.value.map(adaptAcademicSessionFromBackend));
      }
      if (termsRes.status === 'fulfilled' && Array.isArray(termsRes.value)) {
        setTerms(termsRes.value.map(adaptAcademicTermFromBackend));
      }
      if (classLevelsRes.status === 'fulfilled') {
        const raw = (classLevelsRes.value as any)?.results || classLevelsRes.value;
        if (Array.isArray(raw) && raw.length > 0) {
          setClassLevels(raw.map(adaptClassLevelFromBackend));
        }
      }
      if (classArmsRes.status === 'fulfilled') {
        const raw = (classArmsRes.value as any)?.results || classArmsRes.value;
        if (Array.isArray(raw) && raw.length > 0) {
          setClassArms(raw.map(adaptClassArmFromBackend));
        }
      }

      // Safe non-destructive merge: preserve existing students and append/update live backend students
      if (studentsRes.status === 'fulfilled') {
        const raw = (studentsRes.value as any)?.results || studentsRes.value;
        if (Array.isArray(raw) && raw.length > 0) {
          const liveStudents = raw.map(adaptStudentFromBackend);
          setStudents(prev => {
            const currentList = [...prev];
            for (const live of liveStudents) {
              const existingIdx = currentList.findIndex(
                s => s.admissionNumber === live.admissionNumber || s.id === live.id
              );
              if (existingIdx >= 0) {
                currentList[existingIdx] = {
                  ...currentList[existingIdx],
                  ...live,
                  currentClassArmId: live.currentClassArmId || currentList[existingIdx].currentClassArmId,
                  currentClassArmName: live.currentClassArmName || currentList[existingIdx].currentClassArmName,
                };
              } else {
                currentList.push(live);
              }
            }
            return currentList;
          });
        }
      }

      // Safe non-destructive merge: preserve existing rich staff (Principal, etc.) and append live staff
      if (staffRes.status === 'fulfilled') {
        const raw = (staffRes.value as any)?.results || staffRes.value;
        if (Array.isArray(raw) && raw.length > 0) {
          const liveStaff = raw.map(adaptStaffFromBackend);
          setStaff(prev => {
            const currentList = [...prev];
            for (const live of liveStaff) {
              const existingIdx = currentList.findIndex(
                s => s.email === live.email || s.staffId === live.staffId || s.identifier === live.identifier || s.id === live.id
              );
              if (existingIdx >= 0) {
                currentList[existingIdx] = {
                  ...currentList[existingIdx],
                  status: live.status,
                  title: live.title || currentList[existingIdx].title,
                };
              } else {
                currentList.push(live);
              }
            }
            return currentList;
          });

          // Live Parent Accounts hydration
          const parentUsers = raw.filter(
            (u: any) => (u.roles && u.roles.includes('PARENT')) || u.active_role === 'PARENT'
          );
          if (parentUsers.length > 0) {
            const liveParents = parentUsers.map(adaptParentFromBackend);
            setParents(prev => {
              const currentList = [...prev];
              for (const live of liveParents) {
                const existingIdx = currentList.findIndex(
                  p => p.email.toLowerCase() === live.email.toLowerCase() || p.id === live.id
                );
                if (existingIdx >= 0) {
                  currentList[existingIdx] = {
                    ...currentList[existingIdx],
                    ...live,
                    wardIds: live.wardIds && live.wardIds.length > 0 ? live.wardIds : currentList[existingIdx].wardIds,
                  };
                } else {
                  currentList.push(live);
                }
              }
              return currentList;
            });
          }
        }
      }

      // Live Subject Scores hydration (Broadsheets, Marksheets, Report Cards)
      if (scoresRes.status === 'fulfilled') {
        const raw = (scoresRes.value as any)?.results || scoresRes.value;
        if (Array.isArray(raw) && raw.length > 0) {
          const liveScores = raw.map(adaptSubjectScoreFromBackend);
          setScores(prev => {
            const currentList = [...prev];
            for (const live of liveScores) {
              const existingIdx = currentList.findIndex(
                sc => (sc.studentId === live.studentId || (live.admissionNumber && sc.admissionNumber === live.admissionNumber)) &&
                      sc.subjectId === live.subjectId &&
                      sc.termId === live.termId
              );
              if (existingIdx >= 0) {
                currentList[existingIdx] = {
                  ...currentList[existingIdx],
                  ...live,
                };
              } else {
                currentList.push(live);
              }
            }
            return currentList;
          });
        }
      }

      // Live Attendance hydration
      if (attendanceRes.status === 'fulfilled') {
        const raw = (attendanceRes.value as any)?.results || attendanceRes.value;
        if (Array.isArray(raw) && raw.length > 0) {
          setAttendanceRecords(prev => {
            const currentList = [...prev];
            for (const item of raw) {
              const studentId = resolveStudentCanonicalId(item.student, item.admission_number);
              const armId = resolveArmId(item.class_arm, item.class_arm_name);
              const existingIdx = currentList.findIndex(
                r => (r.studentId === studentId || (item.admission_number && r.studentId === item.admission_number)) && r.date === item.date
              );
              const rec: DailyAttendanceRecord = {
                id: String(item.id),
                studentId,
                classArmId: armId,
                date: item.date,
                status: item.status,
              };
              if (existingIdx >= 0) {
                currentList[existingIdx] = rec;
              } else {
                currentList.push(rec);
              }
            }
            return currentList;
          });
        }
      }

      // Live Psychomotor & Affective traits hydration
      if (psychomotorRes.status === 'fulfilled') {
        const raw = (psychomotorRes.value as any)?.results || psychomotorRes.value;
        if (Array.isArray(raw) && raw.length > 0) {
          setAffectiveTraits(prev => {
            const currentList = [...prev];
            for (const item of raw) {
              const studentId = resolveStudentCanonicalId(item.student);
              const termId = resolveTermId(item.term);
              const existingIdx = currentList.findIndex(
                t => t.studentId === studentId && t.termId === termId
              );
              const rec: AffectiveAndPsychomotor = {
                studentId,
                termId,
                punctuality: item.punctuality || 4,
                neatness: item.neatness || 4,
                politeness: item.politeness || 5,
                attentiveness: item.attentiveness || 4,
                honesty: item.honesty || 5,
                relationshipWithPeers: item.relationship_with_peers || 4,
                handwriting: item.handwriting || 4,
                sportsAndGames: item.sports_and_games || 4,
                craftsmanship: item.craftsmanship || 3,
                musicalArtisticSkill: item.musical_artistic_skill || 4,
                formMasterRemark: item.form_master_remark || '',
                principalRemark: item.principal_remark || '',
                daysPresent: item.days_present || 0,
                daysAbsent: item.days_absent || 0,
                totalSchoolDays: item.total_school_days || 65,
              };
              if (existingIdx >= 0) {
                currentList[existingIdx] = rec;
              } else {
                currentList.push(rec);
              }
            }
            return currentList;
          });
        }
      }

      if (settingsRes.status === 'fulfilled' && settingsRes.value) {
        setSchoolSettings(adaptSchoolSettingsFromBackend(settingsRes.value));
      }
      if (auditLogsRes.status === 'fulfilled') {
        const raw = (auditLogsRes.value as any)?.results || auditLogsRes.value;
        if (Array.isArray(raw)) {
          setAuditLogs(raw.map(adaptAuditLogFromBackend));
        }
      }
      if (subjectsRes.status === 'fulfilled') {
        const raw = (subjectsRes.value as any)?.results || subjectsRes.value;
        if (Array.isArray(raw) && raw.length > 0) {
          const liveSubjects = raw.map(adaptSubjectFromBackend);
          setSubjects(prev => {
            const currentList = [...prev];
            for (const live of liveSubjects) {
              const existingIdx = currentList.findIndex(
                s => s.code.toUpperCase() === live.code.toUpperCase() || s.id === live.id || (live.backendId && s.backendId === live.backendId)
              );
              if (existingIdx >= 0) {
                currentList[existingIdx] = {
                  ...currentList[existingIdx],
                  ...live,
                };
              } else {
                currentList.push(live);
              }
            }
            return currentList;
          });
        }
      }

      if (allocationsRes.status === 'fulfilled') {
        const raw = (allocationsRes.value as any)?.results || allocationsRes.value;
        if (Array.isArray(raw)) {
          const liveAllocs = raw.map(adaptTeacherAllocationFromBackend);
          setAllocations(liveAllocs);
        }
      }

      setIsBackendLoaded(true);
    } catch (err) {
      console.warn('Live backend data hydration skipped:', err);
    }
  }, []);

  useEffect(() => {
    fetchLiveSchoolData();
  }, [fetchLiveSchoolData, isBackendConnected, authUser?.id]);

  const resetToDefaultData = () => {
    localStorage.setItem('eis_data_version', DATA_VERSION);
    localStorage.setItem('eis_students', JSON.stringify(INITIAL_STUDENTS));
    localStorage.setItem('eis_scores', JSON.stringify(INITIAL_SCORES));
    localStorage.setItem('eis_affective', JSON.stringify(INITIAL_AFFECTIVE));
    localStorage.setItem('eis_staff', JSON.stringify(INITIAL_STAFF));
    localStorage.setItem('eis_audit_logs', JSON.stringify(INITIAL_AUDIT_LOGS));
    localStorage.setItem('eis_school_settings', JSON.stringify(DEFAULT_SCHOOL_SETTINGS));
    localStorage.setItem('eis_discipline', JSON.stringify(INITIAL_DISCIPLINARY_INCIDENTS));
    localStorage.setItem('eis_exeats', JSON.stringify(INITIAL_CAMPUS_EXEATS));
    localStorage.setItem('eis_scheme_of_work', JSON.stringify(INITIAL_SCHEME_OF_WORK));
    localStorage.setItem('eis_exam_halls', JSON.stringify(INITIAL_EXAM_HALLS));
    localStorage.setItem('eis_invigilation', JSON.stringify(INITIAL_INVIGILATION_ROSTER));
    localStorage.setItem('eis_external_candidates', JSON.stringify(INITIAL_EXTERNAL_CANDIDATES));
    localStorage.setItem('eis_broadsheet_seals', JSON.stringify(INITIAL_BROADSHEET_SEALS));
    localStorage.setItem('eis_pastoral_logs', JSON.stringify(INITIAL_PASTORAL_LOGS));
    localStorage.setItem('eis_arm_endorsements', JSON.stringify(INITIAL_ARM_ENDORSEMENTS));
    localStorage.setItem('eis_subject_submissions', JSON.stringify(INITIAL_SUBJECT_SUBMISSIONS));
    localStorage.setItem('eis_allocations', JSON.stringify(INITIAL_ALLOCATIONS));
    localStorage.setItem('eis_portal_messages', JSON.stringify(INITIAL_PORTAL_MESSAGES));
    localStorage.removeItem('eis_attendance');
    setStudents(INITIAL_STUDENTS);
    setScores(INITIAL_SCORES);
    setAffectiveTraits(INITIAL_AFFECTIVE);
    setStaff(INITIAL_STAFF);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setSchoolSettings(DEFAULT_SCHOOL_SETTINGS);
    setDisciplinaryIncidents(INITIAL_DISCIPLINARY_INCIDENTS);
    setCampusExeats(INITIAL_CAMPUS_EXEATS);
    setSchemeOfWork(INITIAL_SCHEME_OF_WORK);
    setExamHalls(INITIAL_EXAM_HALLS);
    setInvigilationRoster(INITIAL_INVIGILATION_ROSTER);
    setExternalCandidates(INITIAL_EXTERNAL_CANDIDATES);
    setBroadsheetSeals(INITIAL_BROADSHEET_SEALS);
    setPastoralLogs(INITIAL_PASTORAL_LOGS);
    setArmEndorsements(INITIAL_ARM_ENDORSEMENTS);
    setSubjectSubmissions(INITIAL_SUBJECT_SUBMISSIONS);
    setAllocations(INITIAL_ALLOCATIONS);
    setPortalMessages(INITIAL_PORTAL_MESSAGES);
    setAttendanceRecords([]);
    setClassLevels(INITIAL_CLASS_LEVELS);
    setClassArms(INITIAL_CLASS_ARMS);
    setExamTimetable(INITIAL_EXAM_TIMETABLE);
    setWeeklyTimetables(INITIAL_WEEKLY_TIMETABLES);
    localStorage.setItem('eis_exam_timetable', JSON.stringify(INITIAL_EXAM_TIMETABLE));
    localStorage.setItem('eis_weekly_timetables', JSON.stringify(INITIAL_WEEKLY_TIMETABLES));
    localStorage.removeItem('eis_class_levels');
    localStorage.removeItem('eis_class_arms');
  };

  // Local storage synchronization
  useEffect(() => {
    localStorage.setItem('eis_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('eis_terms', JSON.stringify(terms));
  }, [terms]);

  useEffect(() => {
    localStorage.setItem('eis_class_levels', JSON.stringify(classLevels));
  }, [classLevels]);

  useEffect(() => {
    localStorage.setItem('eis_class_arms', JSON.stringify(classArms));
  }, [classArms]);

  useEffect(() => {
    localStorage.setItem('eis_subjects', JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem('eis_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('eis_scores', JSON.stringify(scores));
  }, [scores]);

  useEffect(() => {
    localStorage.setItem('eis_affective', JSON.stringify(affectiveTraits));
  }, [affectiveTraits]);

  useEffect(() => {
    localStorage.setItem('eis_attendance', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem('eis_staff', JSON.stringify(staff));
  }, [staff]);

  useEffect(() => {
    localStorage.setItem('eis_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('eis_school_settings', JSON.stringify(schoolSettings));
  }, [schoolSettings]);

  useEffect(() => {
    localStorage.setItem('eis_discipline', JSON.stringify(disciplinaryIncidents));
  }, [disciplinaryIncidents]);

  useEffect(() => {
    localStorage.setItem('eis_exeats', JSON.stringify(campusExeats));
  }, [campusExeats]);

  useEffect(() => {
    localStorage.setItem('eis_scheme_of_work', JSON.stringify(schemeOfWork));
  }, [schemeOfWork]);

  useEffect(() => {
    localStorage.setItem('eis_exam_halls', JSON.stringify(examHalls));
  }, [examHalls]);

  useEffect(() => {
    localStorage.setItem('eis_invigilation', JSON.stringify(invigilationRoster));
  }, [invigilationRoster]);

  useEffect(() => {
    localStorage.setItem('eis_external_candidates', JSON.stringify(externalCandidates));
  }, [externalCandidates]);

  useEffect(() => {
    localStorage.setItem('eis_broadsheet_seals', JSON.stringify(broadsheetSeals));
  }, [broadsheetSeals]);

  useEffect(() => {
    localStorage.setItem('eis_pastoral_logs', JSON.stringify(pastoralLogs));
  }, [pastoralLogs]);

  useEffect(() => {
    localStorage.setItem('eis_arm_endorsements', JSON.stringify(armEndorsements));
  }, [armEndorsements]);

  useEffect(() => {
    localStorage.setItem('eis_subject_submissions', JSON.stringify(subjectSubmissions));
  }, [subjectSubmissions]);

  useEffect(() => {
    localStorage.setItem('eis_fee_clearances', JSON.stringify(feeClearances));
  }, [feeClearances]);

  useEffect(() => {
    localStorage.setItem('eis_parent_inquiries', JSON.stringify(parentInquiries));
  }, [parentInquiries]);

  useEffect(() => {
    localStorage.setItem('eis_allocations', JSON.stringify(allocations));
  }, [allocations]);

  useEffect(() => {
    localStorage.setItem('eis_portal_messages', JSON.stringify(portalMessages));
  }, [portalMessages]);


  const activeSession = sessions.find(s => s.isCurrent) || sessions[0];
  const activeTerm = terms.find(t => t.isActive) || terms[1];

  const updateScore = (scoreId: string, partial: Partial<SubjectScore>) => {
    setScores(prev => {
      // 1. Try finding by ID
      const directIdx = prev.findIndex(s => s.id === scoreId);
      if (directIdx !== -1) {
        const s = prev[directIdx];
        const ca1 = partial.ca1 !== undefined ? partial.ca1 : s.ca1;
        const ca2 = partial.ca2 !== undefined ? partial.ca2 : s.ca2;
        const assignment = partial.assignment !== undefined ? partial.assignment : s.assignment;
        const project = partial.project !== undefined ? partial.project : s.project;
        const exam = partial.exam !== undefined ? partial.exam : s.exam;

        const total = computeSubjectTotal(ca1, ca2, assignment, project, exam);
        const { grade, remark } = evaluateGrade(total);

        const updated = [...prev];
        updated[directIdx] = {
          ...s,
          ...partial,
          ca1,
          ca2,
          assignment,
          project,
          exam,
          total,
          grade,
          remark,
          updatedAt: new Date().toISOString()
        };
        return updated;
      }

      // 2. If temporary ID or not found by ID, try matching studentId + subjectId + termId
      const targetStudentId = partial.studentId || (scoreId.startsWith('sc-temp-') ? scoreId.replace('sc-temp-', '') : undefined);
      const targetSubjectId = partial.subjectId;
      const targetTermId = partial.termId || activeTerm.id;

      if (targetStudentId && targetSubjectId) {
        const comboIdx = prev.findIndex(
          s => s.studentId === targetStudentId && s.subjectId === targetSubjectId && s.termId === targetTermId
        );
        if (comboIdx !== -1) {
          const s = prev[comboIdx];
          const ca1 = partial.ca1 !== undefined ? partial.ca1 : s.ca1;
          const ca2 = partial.ca2 !== undefined ? partial.ca2 : s.ca2;
          const assignment = partial.assignment !== undefined ? partial.assignment : s.assignment;
          const project = partial.project !== undefined ? partial.project : s.project;
          const exam = partial.exam !== undefined ? partial.exam : s.exam;

          const total = computeSubjectTotal(ca1, ca2, assignment, project, exam);
          const { grade, remark } = evaluateGrade(total);

          const updated = [...prev];
          updated[comboIdx] = {
            ...s,
            ...partial,
            ca1,
            ca2,
            assignment,
            project,
            exam,
            total,
            grade,
            remark,
            updatedAt: new Date().toISOString()
          };
          return updated;
        }

        // 3. Upsert if completely new
        const student = students.find(st => st.id === targetStudentId);
        const ca1 = partial.ca1 || 0;
        const ca2 = partial.ca2 || 0;
        const assignment = partial.assignment || 0;
        const project = partial.project || 0;
        const exam = partial.exam || 0;
        const total = computeSubjectTotal(ca1, ca2, assignment, project, exam);
        const { grade, remark } = evaluateGrade(total);

        const newScore: SubjectScore = {
          id: `sc-dyn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          studentId: targetStudentId,
          studentName: student ? `${student.firstName} ${student.lastName}` : (partial.studentName || 'Student'),
          admissionNumber: student ? student.admissionNumber : (partial.admissionNumber || 'EIS/2026/0000'),
          classArmId: student ? student.currentClassArmId : (partial.classArmId || ''),
          subjectId: targetSubjectId,
          termId: targetTermId,
          ca1,
          ca2,
          assignment,
          project,
          exam,
          total,
          grade,
          remark,
          isLocked: false,
          ...partial,
          updatedAt: new Date().toISOString()
        };
        return [...prev, newScore];
      }

      return prev;
    });
  };

  const bulkSaveScores = async (
    classArmId: string,
    subjectId: string,
    scoresData: { admissionNumber: string; ca1: number; ca2: number; assignment: number; project: number; exam: number }[]
  ): Promise<void> => {
    setScores(prev => {
      const updated = [...prev];

      scoresData.forEach(item => {
        const student = students.find(st => st.admissionNumber === item.admissionNumber);
        if (!student) return;

        const total = computeSubjectTotal(item.ca1, item.ca2, item.assignment, item.project, item.exam);
        const { grade, remark } = evaluateGrade(total);

        const existingIdx = updated.findIndex(
          sc => sc.studentId === student.id && sc.subjectId === subjectId && sc.termId === activeTerm.id
        );

        if (existingIdx !== -1) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            ca1: item.ca1,
            ca2: item.ca2,
            assignment: item.assignment,
            project: item.project,
            exam: item.exam,
            total,
            grade,
            remark,
            updatedAt: new Date().toISOString()
          };
        } else {
          updated.push({
            id: `sc-gen-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            admissionNumber: student.admissionNumber,
            classArmId,
            subjectId,
            termId: activeTerm.id,
            ca1: item.ca1,
            ca2: item.ca2,
            assignment: item.assignment,
            project: item.project,
            exam: item.exam,
            total,
            grade,
            remark,
            isLocked: false,
            updatedAt: new Date().toISOString()
          });
        }
      });

      return updated;
    });

    // Live asynchronous bulk score save to Django backend
    const resolvedArm = resolveArmPk(classArmId) || classArmId;
    const resolvedSub = resolveSubjectPk(subjectId) || subjectId;
    const resolvedTerm = resolveTermPk(activeTerm.id);

    const backendRecords = scoresData.map(item => ({
      student: item.admissionNumber,
      subject: resolvedSub,
      class_arm: resolvedArm,
      term: resolvedTerm,
      ca1: item.ca1,
      ca2: item.ca2,
      assignment: item.assignment,
      project: item.project,
      exam: item.exam,
    }));

    try {
      const res = await api.post('/grading/scores/bulk/', { records: backendRecords });
      if (Array.isArray(res)) {
        const liveScores = res.map(adaptSubjectScoreFromBackend);
        setScores(prev => {
          const map = new Map(prev.map(s => [s.id, s]));
          liveScores.forEach((ls: SubjectScore) => map.set(ls.id, ls));
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn('Backend bulk score save fallback:', err);
      throw err; // re-throw so callers can show an error
    }
  };

  const addAuditLog = (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const newLog: AuditLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const toggleGradeLock = (classArmId: string, subjectId: string, actor?: { id: string; name: string; role: any }) => {
    let willLock = false;
    setScores(prev => {
      // Find current lock status with resilient matching across slugs and PKs
      const existing = prev.find(s => {
        const armMatches = s.classArmId === classArmId || resolveArmId(s.classArmId) === resolveArmId(classArmId);
        const subMatches = s.subjectId === subjectId || resolveSubjectId(s.subjectId) === resolveSubjectId(subjectId);
        const termMatches = s.termId === activeTerm.id || resolveTermId(s.termId) === resolveTermId(activeTerm.id);
        return armMatches && subMatches && termMatches;
      });
      willLock = existing ? !existing.isLocked : true;

      return prev.map(s => {
        const armMatches = s.classArmId === classArmId || resolveArmId(s.classArmId) === resolveArmId(classArmId);
        const subMatches = s.subjectId === subjectId || resolveSubjectId(s.subjectId) === resolveSubjectId(subjectId);
        const termMatches = s.termId === activeTerm.id || resolveTermId(s.termId) === resolveTermId(activeTerm.id);
        if (armMatches && subMatches && termMatches) {
          return { ...s, isLocked: willLock };
        }
        return s;
      });
    });

    // Synchronize lock state with Django backend
    const armPk = resolveArmPk(classArmId);
    const subPk = resolveSubjectPk(subjectId);
    const termPk = resolveTermPk(activeTerm.id);
    api.post('/grading/scores/bulk-lock/', {
      class_arm: armPk !== undefined ? armPk : classArmId,
      subject: subPk !== undefined ? subPk : subjectId,
      term: termPk,
      lock: willLock,
    }).catch(err => console.warn('Could not persist lock toggle to backend:', err));

    const arm = classArms.find(a => a.id === classArmId || resolveArmId(a.id) === resolveArmId(classArmId));
    const sub = subjects.find(s => s.id === subjectId || resolveSubjectId(s.id) === resolveSubjectId(subjectId));
    if (actor) {
      addAuditLog({
        userId: actor.id,
        userIdentifier: actor.name,
        userName: actor.name,
        userRole: actor.role,
        action: 'GRADE_LOCK_TOGGLE',
        targetEntity: `Score Sheet: ${arm?.fullName || arm?.name || classArmId} - ${sub?.name || subjectId}`,
        details: `${willLock ? 'Locked' : 'Unlocked'} marksheet for Continuous Assessment and Examination.`,
        diff: [{ field: 'isLocked', previousValue: !willLock, newValue: willLock }]
      });
    }
  };

  const overrideScore = ({
    scoreId,
    newScores,
    reason,
    ticketId,
    adminUser
  }: {
    scoreId: string;
    newScores: Partial<Pick<SubjectScore, 'ca1' | 'ca2' | 'assignment' | 'project' | 'exam'>>;
    reason: string;
    ticketId: string;
    adminUser: { id: string; name: string; role: any };
  }) => {
    const targetScore = scores.find(s => s.id === scoreId);
    if (!targetScore) return;

    const prevCa1 = targetScore.ca1;
    const prevCa2 = targetScore.ca2;
    const prevExam = targetScore.exam;
    const prevTotal = targetScore.total;

    const ca1 = newScores.ca1 !== undefined ? newScores.ca1 : targetScore.ca1;
    const ca2 = newScores.ca2 !== undefined ? newScores.ca2 : targetScore.ca2;
    const assignment = newScores.assignment !== undefined ? newScores.assignment : targetScore.assignment;
    const project = newScores.project !== undefined ? newScores.project : targetScore.project;
    const exam = newScores.exam !== undefined ? newScores.exam : targetScore.exam;

    const total = computeSubjectTotal(ca1, ca2, assignment, project, exam);
    const { grade, remark } = evaluateGrade(total);

    const subjectObj = subjects.find(sub => sub.id === targetScore.subjectId);
    const subjectName = subjectObj ? subjectObj.name : targetScore.subjectId;

    setScores(prev => prev.map(s => {
      if (s.id === scoreId) {
        return {
          ...s,
          ...newScores,
          total,
          grade,
          remark,
          isOverridden: true,
          overrideReason: reason,
          overrideTicketId: ticketId,
          overriddenBy: adminUser.name,
          overriddenAt: new Date().toISOString(),
          previousScore: {
            ca1: prevCa1,
            ca2: prevCa2,
            exam: prevExam,
            total: prevTotal
          },
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    }));

    const diffItems = [];
    if (newScores.ca1 !== undefined && newScores.ca1 !== prevCa1) {
      diffItems.push({ field: 'CA 1', previousValue: prevCa1, newValue: newScores.ca1 });
    }
    if (newScores.ca2 !== undefined && newScores.ca2 !== prevCa2) {
      diffItems.push({ field: 'CA 2', previousValue: prevCa2, newValue: newScores.ca2 });
    }
    if (newScores.exam !== undefined && newScores.exam !== prevExam) {
      diffItems.push({ field: 'Exam', previousValue: prevExam, newValue: newScores.exam });
    }
    diffItems.push({ field: 'Total Aggregate', previousValue: prevTotal, newValue: total });

    addAuditLog({
      userId: adminUser.id,
      userIdentifier: adminUser.name,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: 'SCORE_OVERRIDE',
      targetEntity: `Score Record: ${targetScore.studentName} (${targetScore.admissionNumber}) - ${subjectName}`,
      details: `Administrative score adjustment authorized under Ticket #${ticketId}. Total modified from ${prevTotal} to ${total} (${grade}).`,
      diff: diffItems,
      metadata: {
        reason,
        ticketId,
        studentName: targetScore.studentName,
        admissionNumber: targetScore.admissionNumber,
        subjectName
      }
    });
  };

  const recordAttendance = (date: string, records: { studentId: string; classArmId: string; status: any }[]) => {
    setAttendanceRecords(prev => {
      // Remove any existing records for this date and these students
      const filtered = prev.filter(r => !(r.date === date && records.some(rec => rec.studentId === r.studentId)));
      const newItems: DailyAttendanceRecord[] = records.map(r => ({
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        studentId: r.studentId,
        classArmId: r.classArmId,
        date,
        status: r.status
      }));
      return [...filtered, ...newItems];
    });

    // Live asynchronous POST to Django backend
    const backendRecords = records.map(r => {
      const student = students.find(s => s.id === r.studentId);
      return {
        student: student ? student.admissionNumber : r.studentId,
        class_arm: resolveArmPk(r.classArmId) || r.classArmId,
        date,
        status: r.status,
      };
    });
    api.post('/students/attendance/bulk/', { records: backendRecords })
      .catch(err => console.warn('Backend attendance sync fallback:', err));
  };

  const updatePsychomotor = (record: AffectiveAndPsychomotor) => {
    setAffectiveTraits(prev => {
      const idx = prev.findIndex(r => r.studentId === record.studentId && r.termId === record.termId);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = record;
        return copy;
      }
      return [...prev, record];
    });

    const student = students.find(s => s.id === record.studentId);
    api.post('/students/psychomotor/', {
      student: student ? student.admissionNumber : record.studentId,
      term: resolveTermPk(record.termId),
      punctuality: record.punctuality,
      neatness: record.neatness,
      politeness: record.politeness,
      attentiveness: record.attentiveness,
      honesty: record.honesty,
      relationship_with_peers: record.relationshipWithPeers,
      handwriting: record.handwriting,
      sports_and_games: record.sportsAndGames,
      craftsmanship: record.craftsmanship,
      musical_artistic_skill: record.musicalArtisticSkill,
      form_master_remark: record.formMasterRemark,
      principal_remark: record.principalRemark,
      days_present: record.daysPresent,
      days_absent: record.daysAbsent,
      total_school_days: record.totalSchoolDays,
    }).catch(err => console.warn('Backend psychomotor sync fallback:', err));
  };

  const updateStudentSubjects = async (studentId: string, subjectIds: string[]) => {
    // 1. Optimistically update local React state
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          registeredSubjectIds: subjectIds
        };
      }
      return s;
    }));

    // 2. Identify student and extract subject codes
    const targetStudent = students.find(s => s.id === studentId);
    const lookupId = studentId;
    const subjectCodes = subjectIds.map(id => {
      const sub = subjects.find(s => s.id === id);
      return sub ? sub.code : id.replace(/^subj-/, '').toUpperCase();
    });

    try {
      const res = await api.post(`/students/students/${lookupId}/set-subjects/`, {
        subject_codes: subjectCodes,
      });
      if (res) {
        const updated = adaptStudentFromBackend(res);
        setStudents(prev => prev.map(s => (s.id === studentId ? { ...s, ...updated, registeredSubjectIds: updated.registeredSubjectIds } : s)));
      }
    } catch (err) {
      console.warn('Backend student subject update sync fallback:', err);
    }
  };

  const dropStudentSubject = async (
    studentId: string,
    subjectId: string,
    level: 'SSS 2' | 'SSS 3',
    reason?: string
  ) => {
    const targetStudent = students.find(s => s.id === studentId);
    if (targetStudent?.currentClassArmName?.includes('JSS')) {
      return;
    }

    const subObj = subjects.find(sub => sub.id === subjectId);
    const remainingSubjects = (targetStudent?.registeredSubjectIds || []).filter(id => id !== subjectId);
    const droppedRecord = {
      subjectId,
      subjectName: subObj ? subObj.name : subjectId,
      level,
      academicSession: activeSession.name,
      date: new Date().toISOString().split('T')[0],
      reason: reason || `Subject dropped upon transition to ${level}`
    };

    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const existingDrops = s.droppedSubjects || [];
        return {
          ...s,
          registeredSubjectIds: remainingSubjects,
          droppedSubjects: [...existingDrops.filter(d => d.subjectId !== subjectId), droppedRecord]
        };
      }
      return s;
    }));

    const lookupId = studentId;
    const backendSubjectPk = subObj?.backendId || resolveSubjectPk(subjectId);
    const cleanCode = subObj?.code || subjectId.replace(/^subj-/, '').toUpperCase();

    try {
      await api.post(`/students/students/${lookupId}/drop-subject/`, {
        subject: backendSubjectPk || cleanCode,
        level,
        reason: reason || `Subject dropped upon transition to ${level}`,
      });
    } catch (err) {
      console.warn('Backend drop subject sync fallback:', err);
    }
  };

  const getNextAdmissionNumber = useCallback((): string => {
    const year = new Date().getFullYear();
    let highestSerial = 0;
    students.forEach(s => {
      const m = s.admissionNumber?.match(/EIS\/\d{4}\/0*(\d+)/i);
      if (m) {
        const val = parseInt(m[1], 10);
        if (val > highestSerial) {
          highestSerial = val;
        }
      }
    });
    if (highestSerial === 0) highestSerial = students.length;
    const nextNum = highestSerial + 1;
    return `EIS/${year}/${String(nextNum).padStart(4, '0')}`;
  }, [students]);

  const registerStudent = async (studentData: Omit<Student, 'id' | 'admissionNumber' | 'status' | 'registeredSubjectIds'> & { registeredSubjectIds?: string[]; admissionNumber?: string }): Promise<Student> => {
    const admissionNumber = studentData.admissionNumber || getNextAdmissionNumber();

    const isJunior = studentData.currentClassArmName?.includes('JSS');
    const defaultJssSubjects = [
      'subj-eng', 'subj-mth', 'subj-igb', 'subj-bsc', 'subj-phe', 'subj-btech',
      'subj-his', 'subj-scs', 'subj-cca', 'subj-bus', 'subj-agr', 'subj-crs', 'subj-frn'
    ];
    const defaultSssSubjects = [
      'subj-mth', 'subj-eng', 'subj-phy', 'subj-che', 'subj-bio', 'subj-civ', 'subj-his',
      'subj-yor', 'subj-dp', 'subj-cmp', 'subj-agr', 'subj-fmth'
    ];
    
    let newStudent: Student = {
      ...studentData,
      id: `std-${Date.now()}`,
      admissionNumber,
      status: 'ACTIVE',
      registeredSubjectIds: studentData.registeredSubjectIds && studentData.registeredSubjectIds.length > 0
        ? studentData.registeredSubjectIds
        : (isJunior ? defaultJssSubjects : defaultSssSubjects)
    };

    // Live asynchronous POST to Django backend
    try {
      const saved = await api.post('/students/students/', adaptStudentToBackend(newStudent));
      if (saved && (saved.id || saved.admission_number)) {
        newStudent = adaptStudentFromBackend(saved);
      }
    } catch (err: any) {
      console.warn('Backend student registration error:', err);
      const errMsg =
        (typeof err?.message === 'string' && err.message) ||
        (typeof err?.detail === 'string' && err.detail) ||
        (err?.detail && typeof err.detail === 'object' ? Object.entries(err.detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ') : null) ||
        'Failed to save student record to backend database.';
      throw new Error(errMsg);
    }

    setStudents(prev => [newStudent, ...prev.filter(s => s.id !== newStudent.id && s.admissionNumber !== newStudent.admissionNumber)]);

    // Update parent's ward list in state
    if (newStudent.parentId) {
      setParents(prev =>
        prev.map(p => {
          if (p.id === newStudent.parentId || p.email.toLowerCase() === newStudent.parentEmail.toLowerCase()) {
            const wards = p.wardIds || [];
            return {
              ...p,
              wardIds: wards.includes(newStudent.id) ? wards : [...wards, newStudent.id],
            };
          }
          return p;
        })
      );
    }

    // Automatically seed score ledger entries for this student in the active term
    // so teachers, form masters, and broadsheets immediately reflect them
    const initialScores: SubjectScore[] = (newStudent.registeredSubjectIds || []).map(subId => ({
      id: `sc-init-${newStudent.id}-${subId}-${activeTerm.id}`,
      studentId: newStudent.id,
      studentName: newStudent.name || `${newStudent.firstName} ${newStudent.lastName}`,
      admissionNumber: newStudent.admissionNumber,
      classArmId: newStudent.currentClassArmId,
      subjectId: subId,
      termId: activeTerm.id,
      ca1: 0,
      ca2: 0,
      assignment: 0,
      project: 0,
      exam: 0,
      total: 0,
      grade: 'F',
      remark: 'Pending Assessment',
      isLocked: false,
      updatedAt: new Date().toISOString()
    }));
    setScores(prev => [...initialScores, ...prev]);

    return newStudent;
  };

  const updateStudent = async (studentId: string, updates: Partial<Student>, actor?: { id: string; name: string; role: any }) => {
    const existing = students.find(s => s.id === studentId || s.admissionNumber === studentId);
    if (!existing) return;

    const arm = classArms.find(a => a.id === (updates.currentClassArmId ?? existing.currentClassArmId));
    const newArmName = updates.currentClassArmName || arm?.fullName || existing.currentClassArmName;
    const newArmId = updates.currentClassArmId ?? (arm ? arm.id : existing.currentClassArmId);
    const newAdmNo = updates.admissionNumber ?? existing.admissionNumber;
    const newFirstName = updates.firstName ?? existing.firstName;
    const newLastName = updates.lastName ?? existing.lastName;
    const newFullName = updates.name || `${newFirstName} ${newLastName}`.trim();

    // Optimistic UI updates
    setStudents(prev => prev.map(s => {
      if (s.id === studentId || s.admissionNumber === newAdmNo) {
        return {
          ...s,
          ...updates,
          name: newFullName,
          currentClassArmId: newArmId,
          currentClassArmName: newArmName,
        };
      }
      return s;
    }));

    // Live asynchronous PATCH to Django backend
    const backendPayload = adaptStudentToBackend({
      ...updates,
      admissionNumber: newAdmNo,
      currentClassArmName: newArmName,
      currentClassArmId: newArmId,
    });

    try {
      const res = await api.patch(`/students/students/${studentId}/`, backendPayload);
      if (res) {
        const live = adaptStudentFromBackend(res);
        setStudents(prev => prev.map(s => (s.id === studentId || s.admissionNumber === newAdmNo ? { ...s, ...live } : s)));
      }
    } catch (err) {
      console.warn('Backend student update fallback:', err);
    }

    // Cascade updates to SubjectScore records
    setScores(prev => prev.map(s => {
      if (s.studentId === studentId) {
        return {
          ...s,
          studentName: newFullName,
          admissionNumber: newAdmNo,
          classArmId: newArmId
        };
      }
      return s;
    }));

    // Cascade to affectiveTraits
    setAffectiveTraits(prev => prev.map(t => {
      if (t.studentId === studentId) {
        return {
          ...t,
          classArmId: newArmId
        };
      }
      return t;
    }));

    // Cascade to daily attendance
    setAttendanceRecords(prev => prev.map(r => {
      if (r.studentId === studentId) {
        return {
          ...r,
          classArmId: newArmId
        };
      }
      return r;
    }));

    // Cascade to disciplinary incidents
    setDisciplinaryIncidents(prev => prev.map(d => {
      if (d.studentId === studentId) {
        return {
          ...d,
          studentName: newFullName,
          classArmName: newArmName
        };
      }
      return d;
    }));

    // Cascade to campus exeats
    setCampusExeats(prev => prev.map(e => {
      if (e.studentId === studentId) {
        return {
          ...e,
          studentName: newFullName,
          classArmName: newArmName
        };
      }
      return e;
    }));

    // Cascade to fee clearances
    setFeeClearances(prev => prev.map(f => {
      if (f.studentId === studentId) {
        return {
          ...f,
          studentName: newFullName,
          admissionNumber: newAdmNo,
          classArmName: newArmName
        };
      }
      return f;
    }));

    if (actor) {
      addAuditLog({
        userId: actor.id,
        userIdentifier: actor.name,
        userName: actor.name,
        userRole: actor.role,
        action: 'STUDENT_UPDATED',
        targetEntity: `Student Profile: ${newFullName} (${newAdmNo})`,
        details: `Updated personal student information and synchronized across all portals: ${Object.keys(updates).join(', ')}.`,
        metadata: { studentId, admissionNumber: newAdmNo, modifiedFields: Object.keys(updates) }
      });
    }
  };

  const deleteStudent = (studentId: string, reason: string, actor?: { id: string; name: string; role: any }) => {
    const existing = students.find(s => s.id === studentId);
    if (!existing) return;

    // Live asynchronous DELETE to Django backend
    api.delete(`/students/students/${studentId}/`)
      .catch(err => console.warn('Backend student delete fallback:', err));

    const studentName = existing.name || `${existing.firstName} ${existing.lastName}`;
    setStudents(prev => prev.filter(s => s.id !== studentId));
    setScores(prev => prev.filter(s => s.studentId !== studentId));
    setAffectiveTraits(prev => prev.filter(t => t.studentId !== studentId));
    setAttendanceRecords(prev => prev.filter(r => r.studentId !== studentId));
    setFeeClearances(prev => prev.filter(f => f.studentId !== studentId));

    if (actor) {
      addAuditLog({
        userId: actor.id,
        userIdentifier: actor.name,
        userName: actor.name,
        userRole: actor.role,
        action: 'STUDENT_DELETED',
        targetEntity: `Student Profile: ${studentName} (${existing.admissionNumber})`,
        details: `Student and all associated academic records removed from institutional register. Reason: ${reason}`,
        metadata: { studentId, admissionNumber: existing.admissionNumber, studentName, reason }
      });
    }
  };

  const addClassLevel = (levelData: { name: string; section: 'JUNIOR' | 'SENIOR'; order?: number }, actor?: { id: string; name: string; role: any }): ClassLevel => {
    const id = `lvl-${Date.now()}`;
    const newLevel: ClassLevel = {
      id,
      name: levelData.name,
      section: levelData.section,
      order: levelData.order || (classLevels.length + 1)
    };
    setClassLevels(prev => [...prev, newLevel]);

    if (actor) {
      addAuditLog({
        userId: actor.id,
        userIdentifier: actor.name,
        userName: actor.name,
        userRole: actor.role,
        action: 'CLASS_LEVEL_CREATED',
        targetEntity: `Class Level: ${newLevel.name} (${newLevel.section})`,
        details: `Created new academic cohort/level ${newLevel.name}.`,
        metadata: { classLevelId: id, levelName: newLevel.name, section: newLevel.section }
      });
    }
    return newLevel;
  };

  const addClassArm = (armData: { classLevelId: string; name: string; formMasterId?: string; formMasterName?: string }, actor?: { id: string; name: string; role: any }): ClassArm => {
    const id = `arm-${Date.now()}`;
    const parentLevel = classLevels.find(l => l.id === armData.classLevelId);
    const fullName = parentLevel ? `${parentLevel.name} ${armData.name}` : armData.name;
    const newArm: ClassArm = {
      id,
      classLevelId: armData.classLevelId,
      name: armData.name,
      fullName,
      formMasterId: armData.formMasterId,
      formMasterName: armData.formMasterName
    };
    setClassArms(prev => [...prev, newArm]);

    if (armData.formMasterId) {
      setStaff(prev => prev.map(m => m.id === armData.formMasterId ? { ...m, formMasterArmId: id, formMasterArmName: fullName } : m));
    }

    if (actor) {
      addAuditLog({
        userId: actor.id,
        userIdentifier: actor.name,
        userName: actor.name,
        userRole: actor.role,
        action: 'CLASS_ARM_CREATED',
        targetEntity: `Class Arm: ${fullName}`,
        details: `Created new classroom arm ${fullName}${armData.formMasterName ? ' assigned to Form Master ' + armData.formMasterName : ''}.`,
        metadata: { classArmId: id, fullName, formMaster: armData.formMasterName }
      });
    }
    return newArm;
  };

  const addSubject = async (data: Omit<Subject, 'id'>): Promise<Subject> => {
    const normCode = data.code.trim().toUpperCase();
    const newId = `subj-${normCode.toLowerCase()}`;
    const newSubject: Subject = {
      id: newId,
      name: data.name.trim(),
      code: normCode,
      category: data.category || 'GENERAL',
      applicableTo: data.applicableTo || 'ALL',
      group: data.group || 'GENERAL_ELECTIVE',
      isCompulsoryJunior: Boolean(data.isCompulsoryJunior),
      isCompulsorySeniorScience: Boolean(data.isCompulsorySeniorScience),
    };

    // Optimistically update state
    setSubjects(prev => {
      const filtered = prev.filter(s => s.code.toUpperCase() !== normCode && s.id !== newId);
      return [...filtered, newSubject];
    });

    try {
      const payload = adaptSubjectToBackend(newSubject);
      const saved = await api.post('/academics/subjects/', payload);
      const live = adaptSubjectFromBackend(saved);
      setSubjects(prev => {
        const filtered = prev.filter(s => s.code.toUpperCase() !== normCode && s.id !== newId);
        return [...filtered, live];
      });
      addAuditLog({
        userId: authUser?.id || 'admin',
        userIdentifier: authUser?.identifier || 'ADMIN',
        userName: authUser?.name || 'Administrator',
        userRole: authUser?.activeRole || 'SUPER_ADMIN',
        action: 'SETTINGS_UPDATED',
        targetEntity: `Subject: ${live.name} (${live.code})`,
        details: `Created new academic subject "${live.name}" with code ${live.code}.`,
      });
      return live;
    } catch (err) {
      console.warn('Backend subject creation error, keeping local fallback:', err);
      return newSubject;
    }
  };

  const updateSubject = async (subjectId: string, updates: Partial<Subject>): Promise<Subject> => {
    const existing = subjects.find(
      s => s.id === subjectId || s.code === subjectId || (s.backendId && String(s.backendId) === String(subjectId))
    );
    if (!existing) {
      throw new Error(`Subject with identifier "${subjectId}" not found.`);
    }

    const updatedSubject: Subject = {
      ...existing,
      ...updates,
      code: updates.code ? updates.code.trim().toUpperCase() : existing.code,
      name: updates.name ? updates.name.trim() : existing.name,
    };

    // Optimistically update state (preserving the frontend ID so references are not severed)
    setSubjects(prev => prev.map(s => s.id === existing.id ? updatedSubject : s));

    const targetPk = existing.backendId || resolveSubjectPk(existing.code) || resolveSubjectPk(existing.id);

    try {
      if (targetPk) {
        const payload = adaptSubjectToBackend(updatedSubject);
        const saved = await api.patch(`/academics/subjects/${targetPk}/`, payload);
        const live = adaptSubjectFromBackend(saved);
        setSubjects(prev => prev.map(s => s.id === existing.id ? { ...live, id: existing.id } : s));
        addAuditLog({
          userId: authUser?.id || 'admin',
          userIdentifier: authUser?.identifier || 'ADMIN',
          userName: authUser?.name || 'Administrator',
          userRole: authUser?.activeRole || 'SUPER_ADMIN',
          action: 'SETTINGS_UPDATED',
          targetEntity: `Subject: ${live.name} (${live.code})`,
          details: `Updated subject "${existing.name}" -> "${live.name}" (Code: ${live.code}).`,
        });
        return { ...live, id: existing.id };
      }
      return updatedSubject;
    } catch (err) {
      console.warn('Backend subject update error, keeping local fallback:', err);
      return updatedSubject;
    }
  };

  const publishResults = (termId: string, isPublished: boolean) => {
    setTerms(prev => prev.map(t => t.id === termId ? { ...t, isResultsPublished: isPublished } : t));
  };

  const setActiveTerm = (termId: string) => {
    setTerms(prev => prev.map(t => ({ ...t, isActive: t.id === termId })));
  };

  const getStudentDossier = (studentId: string, termId?: string): StudentTerminalDossier | null => {
    const targetTermId = termId || activeTerm.id;
    const student =
      students.find(s => String(s.id) === String(studentId)) ||
      students.find(s => s.admissionNumber === studentId) ||
      students[0];
    if (!student) return null;

    const term = terms.find(t => String(t.id) === String(targetTermId) || t.name === targetTermId) || activeTerm;
    const session = sessions.find(s => String(s.id) === String(term.sessionId)) || activeSession;

    // Student's registered subjects list
    const registeredIds = student.registeredSubjectIds || [];

    // Filter student's scores to ONLY those registered for this student
    let studentScores = scores.filter(
      s =>
        String(s.studentId) === String(student.id) &&
        (String(s.termId) === String(targetTermId) || String(s.termId) === String(term.id) || s.termId === term.name) &&
        (registeredIds.length === 0 || registeredIds.includes(s.subjectId))
    );
    if (studentScores.length === 0) {
      studentScores = scores.filter(s => String(s.studentId) === String(student.id));
    }
    const totalAggregateScore = calculateTotalAggregate(studentScores);
    const maxPossibleAggregate = (studentScores.length || 1) * 100;
    const percentageAverage = studentScores.length > 0 ? Number((totalAggregateScore / studentScores.length).toFixed(1)) : 0;

    // Calculate Arm Rank (among peers in same classArm)
    const armStudents = students.filter(s => s.currentClassArmId === student.currentClassArmId);
    const armStudentTotals = armStudents.map(s => {
      const sReg = s.registeredSubjectIds || [];
      const pScores = scores.filter(
        sc => sc.studentId === s.id && sc.termId === targetTermId && (sReg.length === 0 || sReg.includes(sc.subjectId))
      );
      return { studentId: s.id, totalAggregate: calculateTotalAggregate(pScores) };
    });
    const armRanks = computeRankings(armStudentTotals);
    const armPosition = armRanks.get(student.id) || armRanks.get(studentId) || 1;

    // Calculate Set Rank (among peers in same ClassLevel, e.g. SSS 2 Gold + SSS 2 Diamond)
    const studentArm = classArms.find(a => a.id === student.currentClassArmId);
    const peerArms = studentArm ? classArms.filter(a => a.classLevelId === studentArm.classLevelId).map(a => a.id) : [];
    const setStudents = students.filter(s => peerArms.includes(s.currentClassArmId));
    const setStudentTotals = setStudents.map(s => {
      const sReg = s.registeredSubjectIds || [];
      const pScores = scores.filter(
        sc => sc.studentId === s.id && sc.termId === targetTermId && (sReg.length === 0 || sReg.includes(sc.subjectId))
      );
      return { studentId: s.id, totalAggregate: calculateTotalAggregate(pScores) };
    });
    const setRanks = computeRankings(setStudentTotals);
    const setPosition = setRanks.get(student.id) || setRanks.get(studentId) || 1;

    // Affective & Psychomotor traits
    const defaultTraits: AffectiveAndPsychomotor = {
      studentId: student.id,
      termId: targetTermId,
      punctuality: 4,
      neatness: 4,
      politeness: 5,
      attentiveness: 4,
      honesty: 5,
      relationshipWithPeers: 4,
      handwriting: 4,
      sportsAndGames: 4,
      craftsmanship: 3,
      musicalArtisticSkill: 4,
      formMasterRemark: 'A commendable academic disposition throughout the term. Shows consistent improvement.',
      principalRemark: 'Very commendable performance. Keep up the high standards.',
      daysPresent: 63,
      daysAbsent: 2,
      totalSchoolDays: 65
    };

    const traits =
      affectiveTraits.find(
        t =>
          (String(t.studentId) === String(student.id) || String(t.studentId) === String(studentId)) &&
          (String(t.termId) === String(targetTermId) || String(t.termId) === String(term.id) || t.termId === term.name)
      ) || defaultTraits;

    return {
      student,
      term,
      session,
      scores: studentScores,
      affectiveAndPsychomotor: traits,
      totalAggregateScore,
      maxPossibleAggregate,
      percentageAverage,
      armPosition,
      totalInArm: armStudents.length,
      setPosition,
      totalInSet: setStudents.length
    };
  };

  // Staff Management Actions
  const addStaff = (memberData: Omit<StaffMember, 'id' | 'status' | 'joinedDate'>): StaffMember => {
    const newId = `stf-${String(staff.length + 1).padStart(3, '0')}`;
    const initialPin = memberData.defaultPin || `EIS-${Math.floor(1000 + Math.random() * 9000)}`;
    const newMember: StaffMember = {
      ...memberData,
      id: newId,
      status: 'ACTIVE',
      joinedDate: new Date().toISOString().split('T')[0],
      defaultPin: initialPin
    };
    setStaff(prev => [newMember, ...prev]);

    // Live asynchronous POST to Django backend
    api.post('/accounts/users/', {
      username: (memberData.identifier || memberData.staffId || newId).replace(/[\/\s]/g, '_').toLowerCase(),
      first_name: memberData.name.split(' ')[0] || '',
      last_name: memberData.name.split(' ').slice(1).join(' ') || 'Staff',
      email: memberData.email,
      phone_number: memberData.phoneNumber || '',
      identifier: memberData.identifier || memberData.staffId || newId,
      active_role: memberData.roles[0] || 'TEACHER',
      roles: memberData.roles,
      password: initialPin,
      default_pin: initialPin,
      address: memberData.address || '',
    })
    .then(saved => {
      if (saved && saved.id) {
        const live = adaptStaffFromBackend(saved);
        setStaff(prev => prev.map(m => m.id === newId ? live : m));
      }
    })
    .catch(err => console.error('Backend staff add error:', err));

    return newMember;
  };

  const updateStaff = (staffId: string, updates: Partial<StaffMember>) => {
    setStaff(prev => prev.map(m => m.id === staffId ? { ...m, ...updates } : m));

    const currentStaff = staff.find(s => s.id === staffId);

    // Synchronize Form Master assignments with classArms
    if (updates.formMasterArmId !== undefined || updates.name !== undefined) {
      setClassArms(prev => prev.map(arm => {
        if (updates.formMasterArmId && arm.id === updates.formMasterArmId) {
          return {
            ...arm,
            formMasterId: staffId,
            formMasterName: updates.name || (currentStaff?.name || arm.formMasterName)
          };
        }
        if (arm.formMasterId === staffId && updates.formMasterArmId !== undefined && updates.formMasterArmId !== arm.id) {
          return {
            ...arm,
            formMasterId: undefined,
            formMasterName: undefined
          };
        }
        if (arm.formMasterId === staffId && updates.name) {
          return {
            ...arm,
            formMasterName: updates.name
          };
        }
        return arm;
      }));
    }

    // Synchronize Teacher Allocations in React state if allocatedSubjects is provided
    if (updates.allocatedSubjects !== undefined) {
      setAllocations(prev => {
        const filtered = prev.filter(
          a => a.teacherId !== staffId &&
               a.teacherId !== currentStaff?.staffId &&
               a.teacherId !== currentStaff?.identifier
        );
        const newAllocations: TeacherAllocation[] = (updates.allocatedSubjects || []).map((alloc, idx) => ({
          id: `alloc-live-${staffId}-${alloc.classArmId}-${alloc.subjectId}-${idx}`,
          classArmId: alloc.classArmId,
          classArmName: alloc.classArmName,
          subjectId: alloc.subjectId,
          subjectName: alloc.subjectName,
          teacherId: staffId,
          teacherName: updates.name || currentStaff?.name || '',
        }));
        return [...filtered, ...newAllocations];
      });
    }

    if (/^\d+$/.test(staffId)) {
      const payload: any = {};
      if (updates.name) {
        const parts = updates.name.split(' ');
        payload.first_name = parts[0];
        payload.last_name = parts.slice(1).join(' ');
      }
      if (updates.email !== undefined) payload.email = updates.email;
      if (updates.phoneNumber !== undefined) payload.phone_number = updates.phoneNumber;
      if (updates.roles !== undefined) payload.roles = updates.roles;
      if (updates.role !== undefined) payload.active_role = updates.role;
      if (updates.defaultPin !== undefined && updates.defaultPin.trim()) {
        payload.password = updates.defaultPin.trim();
        payload.default_pin = updates.defaultPin.trim();
      }
      if (updates.allocatedSubjects !== undefined) {
        payload.allocated_subjects = updates.allocatedSubjects.map(a => ({
          class_arm: resolveArmPk(a.classArmId) || a.classArmId,
          subject: resolveSubjectPk(a.subjectId) || a.subjectId,
          classArmId: a.classArmId,
          classArmName: a.classArmName,
          subjectId: a.subjectId,
          subjectName: a.subjectName,
        }));
      }
      api.patch(`/accounts/users/${staffId}/`, payload)
        .then(() => {
          // Re-sync allocations from backend SQLite truth
          api.get<any>('/academics/allocations/', { page_size: 'all' })
            .then(res => {
              const raw = res?.results || res;
              if (Array.isArray(raw)) {
                setAllocations(raw.map(adaptTeacherAllocationFromBackend));
              }
            })
            .catch(() => {});
        })
        .catch(err => console.warn('Failed to patch staff on backend:', err));
    }
  };

  const toggleStaffStatus = (staffId: string, reason?: string, actor?: { id: string; name: string; role: any }) => {
    const member = staff.find(m => m.id === staffId);
    if (!member) return;

    const nextStatus = member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setStaff(prev => prev.map(m => m.id === staffId ? { ...m, status: nextStatus } : m));

    if (/^\d+$/.test(staffId)) {
      api.patch(`/accounts/users/${staffId}/`, { is_active: nextStatus === 'ACTIVE' })
        .catch(err => console.warn('Failed to update staff status on backend:', err));
    }

    if (actor) {
      addAuditLog({
        userId: actor.id,
        userIdentifier: actor.name,
        userName: actor.name,
        userRole: actor.role,
        action: nextStatus === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_ROLE_CHANGE',
        targetEntity: `Staff Account: ${member.name} (${member.staffId})`,
        details: `Staff status toggled from ${member.status} to ${nextStatus}. ${reason ? 'Reason: ' + reason : ''}`,
        diff: [{ field: 'status', previousValue: member.status, newValue: nextStatus }],
        metadata: { staffId: member.staffId, staffName: member.name, reason }
      });
    }
  };

  const resetStaffPin = (staffId: string, actor?: { id: string; name: string; role: any }): string => {
    const member = staff.find(m => m.id === staffId);
    if (!member) return '';

    const newPin = `EIS-${Math.floor(1000 + Math.random() * 9000)}`;
    setStaff(prev => prev.map(m => m.id === staffId ? { ...m, defaultPin: newPin } : m));

    if (/^\d+$/.test(staffId)) {
      api.patch(`/accounts/users/${staffId}/`, { password: newPin, default_pin: newPin })
        .catch(err => console.warn('Failed to sync new PIN to backend:', err));
    }

    if (actor) {
      addAuditLog({
        userId: actor.id,
        userIdentifier: actor.name,
        userName: actor.name,
        userRole: actor.role,
        action: 'PIN_RESET',
        targetEntity: `Staff Security: ${member.name} (${member.staffId})`,
        details: `Default authentication PIN regenerated for secure portal onboarding.`,
        diff: [{ field: 'defaultPin', previousValue: '***', newValue: newPin }],
        metadata: { staffId: member.staffId }
      });
    }

    return newPin;
  };

  const updateSchoolSettings = (updates: Partial<SchoolSettings>, actor?: { id: string; name: string; role: any }) => {
    setSchoolSettings(prev => {
      const next = { ...prev, ...updates };
      return next;
    });

    if (actor) {
      const diffs = Object.keys(updates).map(k => ({
        field: k,
        previousValue: (schoolSettings as any)[k],
        newValue: (updates as any)[k]
      }));

      addAuditLog({
        userId: actor.id,
        userIdentifier: actor.name,
        userName: actor.name,
        userRole: actor.role,
        action: 'SETTINGS_UPDATED',
        targetEntity: 'Institutional Settings & Security',
        details: 'Institutional parameters, principal signatures, or security seal configurations updated.',
        diff: diffs
      });
    }
  };

  // Academic Rollover Engine
  const executeAcademicRollover = (adminUser: { id: string; name: string; role: any }) => {
    let promotedCount = 0;
    let graduatedCount = 0;
    let heldBackCount = 0;
    let trialCount = 0;

    const progressionMap: Record<string, { nextLevel: string; nextArmName: (currentName: string) => string }> = {
      'JSS 1': {
        nextLevel: 'JSS 2',
        nextArmName: name => name.replace('JSS 1', 'JSS 2')
      },
      'JSS 2': {
        nextLevel: 'JSS 3',
        nextArmName: name => name.replace('JSS 2', 'JSS 3')
      },
      'JSS 3': {
        nextLevel: 'SSS 1',
        nextArmName: name => name.replace('JSS 3', 'SSS 1')
      },
      'SSS 1': {
        nextLevel: 'SSS 2',
        nextArmName: name => name.replace('SSS 1', 'SSS 2')
      },
      'SSS 2': {
        nextLevel: 'SSS 3',
        nextArmName: name => name.replace('SSS 2', 'SSS 3')
      },
      'SSS 3': {
        nextLevel: 'GRADUATED',
        nextArmName: () => 'Graduated Alumni'
      }
    };

    const updatedStudents = students.map(student => {
      if (student.status !== 'ACTIVE') return student;

      const armName = student.currentClassArmName || '';
      let currentLevelPrefix = '';
      for (const key of Object.keys(progressionMap)) {
        if (armName.startsWith(key)) {
          currentLevelPrefix = key;
          break;
        }
      }

      if (!currentLevelPrefix) return student;

      // Evaluate 3-term cumulative scores for this student
      const studentScores = scores.filter(s => s.studentId === student.id);
      const totalMarks = studentScores.reduce((sum, s) => sum + (s.total || 0), 0);
      const averageScore = studentScores.length > 0 ? totalMarks / studentScores.length : 65;

      const mathScore = studentScores.find(s => s.subjectId === 'subj-mth')?.total ?? 60;
      const engScore = studentScores.find(s => s.subjectId === 'subj-eng')?.total ?? 62;

      let decision: 'PROMOTED' | 'PROMOTED_ON_TRIAL' | 'REPEAT' = 'PROMOTED';
      if (averageScore >= 50 && mathScore >= 50 && engScore >= 50) {
        decision = 'PROMOTED';
      } else if (averageScore >= 46 && (mathScore >= 48 || engScore >= 48)) {
        decision = 'PROMOTED_ON_TRIAL';
      } else {
        decision = 'REPEAT';
      }

      if (currentLevelPrefix === 'SSS 3') {
        graduatedCount++;
        return {
          ...student,
          status: 'GRADUATED' as const,
          currentClassArmId: '',
          currentClassArmName: `Alumni (Graduated ${activeSession.name})`
        };
      }

      if (decision === 'REPEAT') {
        heldBackCount++;
        return student;
      }

      if (decision === 'PROMOTED_ON_TRIAL') {
        trialCount++;
      } else {
        promotedCount++;
      }

      const config = progressionMap[currentLevelPrefix];
      const nextArmName = config.nextArmName(armName);
      const targetArm = classArms.find(a => (a.fullName && a.fullName.toLowerCase() === nextArmName.toLowerCase()) || a.name.toLowerCase() === nextArmName.toLowerCase());

      const defaultSssSubjects = [
        'subj-mth', 'subj-eng', 'subj-phy', 'subj-che', 'subj-bio', 'subj-civ', 'subj-his',
        'subj-yor', 'subj-dp', 'subj-cmp', 'subj-agr', 'subj-fmth'
      ];

      return {
        ...student,
        currentClassArmId: targetArm ? targetArm.id : student.currentClassArmId,
        currentClassArmName: nextArmName,
        registeredSubjectIds: currentLevelPrefix === 'JSS 3' ? defaultSssSubjects : student.registeredSubjectIds
      };
    });

    setStudents(updatedStudents);

    const currentYears = activeSession.name.split('/')[0];
    const startYear = parseInt(currentYears) || 2025;
    const newSessionName = `${startYear + 1}/${startYear + 2} Academic Session`;

    const newSessionId = `ses-${startYear + 1}-${startYear + 2}`;
    const newSession: AcademicSession = {
      id: newSessionId,
      name: newSessionName,
      startDate: `${startYear + 1}-09-15`,
      endDate: `${startYear + 2}-07-20`,
      isCurrent: true
    };

    const updatedSessions = sessions.map(s => ({ ...s, isCurrent: false })).concat(newSession);
    setSessions(updatedSessions);

    addAuditLog({
      userId: adminUser.id,
      userIdentifier: adminUser.name,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: 'SESSION_ROLLOVER',
      targetEntity: `Academic Rollover: ${activeSession.name} → ${newSessionName}`,
      details: `Annual promotion matrix executed. ${promotedCount} students promoted, ${trialCount} on trial, ${heldBackCount} held back, ${graduatedCount} SSS 3 students graduated.`,
      diff: [
        { field: 'activeSession', previousValue: activeSession.name, newValue: newSessionName },
        { field: 'promotedCount', previousValue: 0, newValue: promotedCount },
        { field: 'graduatedCount', previousValue: 0, newValue: graduatedCount },
        { field: 'heldBackCount', previousValue: 0, newValue: heldBackCount }
      ],
      metadata: {
        newSessionName,
        promotedCount,
        trialCount,
        heldBackCount,
        graduatedCount
      }
    });

    return {
      promotedCount,
      graduatedCount,
      heldBackCount,
      trialCount,
      newSessionName
    };
  };

  const updatePrincipalStudentRemark = (studentId: string, termId: string, remark: string) => {
    setAffectiveTraits(prev => {
      const index = prev.findIndex(t => t.studentId === studentId && t.termId === termId);
      if (index >= 0) {
        const next = [...prev];
        next[index] = { ...next[index], principalRemark: remark };
        return next;
      }
      const defaultRecord: AffectiveAndPsychomotor = {
        studentId,
        termId,
        punctuality: 4,
        neatness: 4,
        politeness: 5,
        attentiveness: 4,
        honesty: 5,
        relationshipWithPeers: 4,
        handwriting: 4,
        sportsAndGames: 4,
        craftsmanship: 3,
        musicalArtisticSkill: 4,
        formMasterRemark: 'A commendable academic disposition throughout the term.',
        principalRemark: remark,
        daysPresent: 63,
        daysAbsent: 2,
        totalSchoolDays: 65
      };
      return [...prev, defaultRecord];
    });
  };

  const batchUpdatePrincipalRemarks = (termId: string, remarksMap: Record<string, string>) => {
    setAffectiveTraits(prev => {
      const updated = [...prev];
      Object.entries(remarksMap).forEach(([sId, remark]) => {
        const idx = updated.findIndex(t => t.studentId === sId && t.termId === termId);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], principalRemark: remark };
        } else {
          updated.push({
            studentId: sId,
            termId,
            punctuality: 4,
            neatness: 4,
            politeness: 5,
            attentiveness: 4,
            honesty: 5,
            relationshipWithPeers: 4,
            handwriting: 4,
            sportsAndGames: 4,
            craftsmanship: 3,
            musicalArtisticSkill: 4,
            formMasterRemark: 'A commendable academic disposition throughout the term.',
            principalRemark: remark,
            daysPresent: 63,
            daysAbsent: 2,
            totalSchoolDays: 65
          });
        }
      });
      return updated;
    });
  };

  const togglePrincipalTermClearance = (termId: string, actor: { id: string; name: string; role: any }) => {
    const term = terms.find(t => t.id === termId);
    if (!term) return;
    const willBeApproved = !term.isResultsApprovedByPrincipal;
    const nowIso = new Date().toISOString();

    setTerms(prev => prev.map(t => t.id === termId ? {
      ...t,
      isResultsApprovedByPrincipal: willBeApproved,
      principalApprovedAt: willBeApproved ? nowIso : undefined,
      principalApprovedBy: willBeApproved ? actor.name : undefined
    } : t));

    addAuditLog({
      userId: actor.id,
      userIdentifier: actor.name,
      userName: actor.name,
      userRole: actor.role,
      action: 'TERM_PUBLISH',
      targetEntity: `Executive Result Clearance: ${term.name}`,
      details: willBeApproved
        ? `Principal granted official executive clearance for ${term.name} terminal broadsheets.`
        : `Principal revoked executive clearance for ${term.name} terminal broadsheets.`,
      diff: [
        { field: 'isResultsApprovedByPrincipal', previousValue: !willBeApproved, newValue: willBeApproved }
      ],
      metadata: { reason: willBeApproved ? 'Executive Clearance Ratified' : 'Clearance Revoked' }
    });
  };

  // Vice Principals Actions
  const addDisciplinaryIncident = (incidentData: Omit<DisciplinaryIncident, 'id'>, actor?: { id: string; name: string; role: any }) => {
    const newIncident: DisciplinaryIncident = {
      ...incidentData,
      id: `disc-${Date.now()}`
    };
    setDisciplinaryIncidents(prev => [newIncident, ...prev]);

    addAuditLog({
      userId: actor?.id || 'vp-admin',
      userIdentifier: actor?.name || 'Mrs. Ayodele Tinubu',
      userName: actor?.name || 'Mrs. Ayodele Tinubu',
      userRole: actor?.role || 'VICE_PRINCIPAL_ADMIN',
      action: 'DISCIPLINE_RECORDED',
      targetEntity: `Disciplinary Incident: ${incidentData.studentName} (${incidentData.admissionNumber})`,
      details: `Logged ${incidentData.severity} violation (${incidentData.incidentType.replace('_', ' ')}) with ${incidentData.demeritPoints} demerit points. Action: ${incidentData.actionTaken}.`,
      metadata: { incidentId: newIncident.id, demerits: incidentData.demeritPoints }
    });
  };

  const resolveDisciplinaryIncident = (incidentId: string, notes: string, actor?: { id: string; name: string; role: any }) => {
    let resolvedStudent = '';
    setDisciplinaryIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        resolvedStudent = inc.studentName;
        return {
          ...inc,
          status: 'RESOLVED',
          resolutionNotes: notes
        };
      }
      return inc;
    }));

    addAuditLog({
      userId: actor?.id || 'vp-admin',
      userIdentifier: actor?.name || 'Mrs. Ayodele Tinubu',
      userName: actor?.name || 'Mrs. Ayodele Tinubu',
      userRole: actor?.role || 'VICE_PRINCIPAL_ADMIN',
      action: 'DISCIPLINE_RESOLVED',
      targetEntity: `Disciplinary Incident Resolved: ${resolvedStudent || incidentId}`,
      details: `Disciplinary action concluded and marked resolved. Notes: ${notes}`,
      metadata: { incidentId }
    });
  };

  const escalateDisciplinaryIncident = (incidentId: string, notes?: string, actor?: { id: string; name: string; role: any }) => {
    let studentName = '';
    setDisciplinaryIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        studentName = inc.studentName;
        return {
          ...inc,
          status: 'ESCALATED_TO_PRINCIPAL',
          resolutionNotes: notes || inc.resolutionNotes || 'Escalated to Principal for Disciplinary Committee Hearing.'
        };
      }
      return inc;
    }));

    addAuditLog({
      userId: actor?.id || 'vp-admin',
      userIdentifier: actor?.name || 'Mrs. Ayodele Tinubu',
      userName: actor?.name || 'Mrs. Ayodele Tinubu',
      userRole: actor?.role || 'VICE_PRINCIPAL_ADMIN',
      action: 'DISCIPLINE_ESCALATED',
      targetEntity: `Disciplinary Escalation: ${studentName || incidentId}`,
      details: `Referred to Principal for executive statutory sanction/Disciplinary Committee session.`,
      metadata: { incidentId }
    });
  };

  const approveCampusExeat = (exeatId: string, approverName: string, actor?: { id: string; name: string; role: any }) => {
    let exeatDetails = '';
    setCampusExeats(prev => prev.map(ex => {
      if (ex.id === exeatId) {
        exeatDetails = `${ex.studentName} (${ex.exeatType})`;
        return {
          ...ex,
          status: 'APPROVED',
          approvedBy: approverName || actor?.name || 'Mrs. Ayodele Tinubu (VP Admin)'
        };
      }
      return ex;
    }));

    addAuditLog({
      userId: actor?.id || 'vp-admin',
      userIdentifier: actor?.name || approverName,
      userName: actor?.name || approverName,
      userRole: actor?.role || 'VICE_PRINCIPAL_ADMIN',
      action: 'EXEAT_APPROVED',
      targetEntity: `Campus Exeat Authorized: ${exeatDetails}`,
      details: `Authorized official gate departure pass for student.`,
      metadata: { exeatId }
    });
  };

  const markExeatReturned = (exeatId: string, actor?: { id: string; name: string; role: any }) => {
    let exeatDetails = '';
    const nowIso = new Date().toISOString();
    setCampusExeats(prev => prev.map(ex => {
      if (ex.id === exeatId) {
        exeatDetails = `${ex.studentName}`;
        return {
          ...ex,
          status: 'RETURNED',
          actualReturnDate: nowIso
        };
      }
      return ex;
    }));

    addAuditLog({
      userId: actor?.id || 'vp-admin',
      userIdentifier: actor?.name || 'Security Gate / VP Admin',
      userName: actor?.name || 'Security Gate / VP Admin',
      userRole: actor?.role || 'VICE_PRINCIPAL_ADMIN',
      action: 'EXEAT_RETURNED',
      targetEntity: `Exeat Re-entry Confirmed: ${exeatDetails}`,
      details: `Student verified as checked back into campus premises.`,
      metadata: { exeatId, returnTime: nowIso }
    });
  };

  const rejectCampusExeat = (exeatId: string, reason?: string, actor?: { id: string; name: string; role: any }) => {
    setCampusExeats(prev => prev.map(ex => {
      if (ex.id === exeatId) {
        return {
          ...ex,
          status: 'REJECTED',
          reason: reason ? `${ex.reason} [REJECTED: ${reason}]` : ex.reason
        };
      }
      return ex;
    }));
  };

  const updateSchemeOfWorkVelocity = (trackerId: string, updates: Partial<SchemeOfWorkTracker>, actor?: { id: string; name: string; role: any }) => {
    setSchemeOfWork(prev => prev.map(item => {
      if (item.id === trackerId) {
        return { ...item, ...updates };
      }
      return item;
    }));

    if (updates.vpInspectionRemark) {
      addAuditLog({
        userId: actor?.id || 'vp-acad',
        userIdentifier: actor?.name || 'Mr. Babatunde Fashola',
        userName: actor?.name || 'Mr. Babatunde Fashola',
        userRole: actor?.role || 'VICE_PRINCIPAL_ACADEMICS',
        action: 'SYLLABUS_AUDITED',
        targetEntity: `Scheme of Work Audit: ${trackerId}`,
        details: `Instructional audit logged: ${updates.vpInspectionRemark}`,
        metadata: { trackerId, velocity: updates.syllabusVelocity }
      });
    }
  };

  // Examination Officer Actions
  const assignInvigilator = (shiftData: Omit<InvigilationShift, 'id'>, actor?: { id: string; name: string; role: any }) => {
    const newShift: InvigilationShift = {
      ...shiftData,
      id: `inv-${Date.now()}`
    };
    setInvigilationRoster(prev => [newShift, ...prev]);

    addAuditLog({
      userId: actor?.id || 'stf-003',
      userIdentifier: actor?.name || 'Mr. Samuel Danjuma',
      userName: actor?.name || 'Mr. Samuel Danjuma',
      userRole: actor?.role || 'EXAM_OFFICER',
      action: 'INVIGILATOR_ASSIGNED',
      targetEntity: `Invigilation Slot: ${shiftData.subjectName} (${shiftData.hallName})`,
      details: `Rostered ${shiftData.staffName} as ${shiftData.role.replace('_', ' ')} for ${shiftData.date} [${shiftData.timeSlot}].`,
      metadata: { shiftId: newShift.id }
    });
  };

  const updateInvigilationStatus = (shiftId: string, status: InvigilationShift['status']) => {
    setInvigilationRoster(prev => prev.map(s => s.id === shiftId ? { ...s, status } : s));
  };

  const updateExternalCandidateStatus = (
    candidateId: string,
    status: ExternalCandidateProfile['registrationStatus'],
    indexNumber?: string,
    actor?: { id: string; name: string; role: any }
  ) => {
    let candName = '';
    let examBody = '';
    setExternalCandidates(prev => prev.map(c => {
      if (c.id === candidateId) {
        candName = c.studentName;
        examBody = c.examBody;
        return {
          ...c,
          registrationStatus: status,
          indexNumber: indexNumber || c.indexNumber
        };
      }
      return c;
    }));

    addAuditLog({
      userId: actor?.id || 'stf-003',
      userIdentifier: actor?.name || 'Mr. Samuel Danjuma',
      userName: actor?.name || 'Mr. Samuel Danjuma',
      userRole: actor?.role || 'EXAM_OFFICER',
      action: 'EXTERNAL_EXAM_REGISTERED',
      targetEntity: `External Exam Candidate: ${candName} (${examBody})`,
      details: `Status advanced to ${status.replace('_', ' ')}${indexNumber ? ` with Index Number ${indexNumber}` : ''}.`,
      metadata: { candidateId, status }
    });
  };

  const sealClassBroadsheet = (classArmId: string, notes?: string, actor?: { id: string; name: string; role: any }) => {
    const armObj = classArms.find(a => a.id === classArmId);
    const armName = armObj ? armObj.fullName : classArmId;
    const nowIso = new Date().toISOString();

    setBroadsheetSeals(prev => {
      const existingIdx = prev.findIndex(s => s.classArmId === classArmId && s.termId === activeTerm.id);
      const sealRecord: ClassBroadsheetSeal = {
        classArmId,
        classArmName: armName,
        termId: activeTerm.id,
        isSealed: true,
        sealedAt: nowIso,
        sealedBy: actor?.name || 'Mr. Samuel Danjuma (Exam Officer)',
        submissionNotes: notes || 'Broadsheet audited, grades verified, and formally sealed for Principal clearance.',
        missingMarksCount: 0
      };

      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = sealRecord;
        return next;
      }
      return [...prev, sealRecord];
    });

    addAuditLog({
      userId: actor?.id || 'stf-003',
      userIdentifier: actor?.name || 'Mr. Samuel Danjuma',
      userName: actor?.name || 'Mr. Samuel Danjuma',
      userRole: actor?.role || 'EXAM_OFFICER',
      action: 'BROADSHEET_SEALED',
      targetEntity: `Master Broadsheet Sealed: ${armName}`,
      details: `All continuous assessment marks and examination scores verified. Transmitted to Principal for executive assent.`,
      metadata: { classArmId, termId: activeTerm.id }
    });
  };

  const nudgeDefaultingTeachers = (classArmId: string, subjectName: string, actor?: { id: string; name: string; role: any }) => {
    const armObj = classArms.find(a => a.id === classArmId);
    const armName = armObj ? armObj.fullName : classArmId;

    addAuditLog({
      userId: actor?.id || 'stf-003',
      userIdentifier: actor?.name || 'Mr. Samuel Danjuma',
      userName: actor?.name || 'Mr. Samuel Danjuma',
      userRole: actor?.role || 'EXAM_OFFICER',
      action: 'TEACHER_NUDGED',
      targetEntity: `Marks Entry Compliance Nudge: ${armName} - ${subjectName}`,
      details: `Examination Officer issued an automated deadline nudge for missing Continuous Assessment marks in accordance with NEDI guidelines.`,
      metadata: { classArmId, subjectName }
    });
  };

  const addPastoralLog = (entry: Omit<PastoralLogEntry, 'id'>, actor?: { id: string; name: string; role: any }) => {
    const newEntry: PastoralLogEntry = {
      ...entry,
      id: `past-${Date.now()}`
    };
    setPastoralLogs(prev => [newEntry, ...prev]);

    addAuditLog({
      userId: actor?.id || 'stf-018',
      userIdentifier: actor?.name || 'Dr. Michael Adebayo',
      userName: actor?.name || 'Dr. Michael Adebayo',
      userRole: actor?.role || 'FORM_MASTER',
      action: 'PASTORAL_NOTE_LOGGED',
      targetEntity: `Pastoral Log: ${entry.studentName} (${entry.category})`,
      details: `Form Master recorded ${entry.category} note for ${entry.studentName}. Note: ${entry.note.substring(0, 80)}...`,
      metadata: { studentId: entry.studentId, category: entry.category, classArmId: entry.classArmId }
    });
  };

  const endorseClassArm = (classArmId: string, comments?: string, actor?: { id: string; name: string; role: any }) => {
    const arm = classArms.find(a => a.id === classArmId);
    const armName = arm?.fullName || arm?.name || classArmId;
    const now = new Date().toISOString();
    const actorName = actor?.name || 'Dr. Michael Adebayo';

    setArmEndorsements(prev => {
      const existing = prev.find(e => e.classArmId === classArmId && e.termId === activeTerm.id);
      if (existing) {
        return prev.map(e => e.classArmId === classArmId && e.termId === activeTerm.id ? {
          ...e,
          isEndorsed: true,
          endorsedBy: actor?.id || 'STF/2026/018',
          endorsedByName: actorName,
          endorsedAt: now,
          formMasterSignature: actorName,
          generalComments: comments || e.generalComments
        } : e);
      } else {
        const newEndorsement: ClassArmEndorsement = {
          classArmId,
          classArmName: armName,
          termId: activeTerm.id,
          isEndorsed: true,
          endorsedBy: actor?.id || 'STF/2026/018',
          endorsedByName: actorName,
          endorsedAt: now,
          formMasterSignature: actorName,
          generalComments: comments || 'Form Master verification complete. All continuous assessment marks and examination scores validated.',
          totalStudents: students.filter(s => s.currentClassArmId === classArmId).length,
          completedMarksheetsCount: 9,
          totalSubjectsCount: 9
        };
        return [newEndorsement, ...prev];
      }
    });

    addAuditLog({
      userId: actor?.id || 'stf-018',
      userIdentifier: actorName,
      userName: actorName,
      userRole: actor?.role || 'FORM_MASTER',
      action: 'CLASS_ARM_ENDORSED',
      targetEntity: `Form Master Endorsement: ${armName}`,
      details: `Form Master ${actorName} officially signed off and endorsed terminal results for ${armName}.`,
      metadata: { classArmId, termId: activeTerm.id, comments }
    });
  };

  const submitSubjectMarksheet = (classArmId: string, subjectId: string, comments?: string, actor?: { id: string; name: string; role: any }) => {
    const arm = classArms.find(a => a.id === classArmId);
    const armName = arm?.fullName || classArmId;
    const subj = subjects.find(s => s.id === subjectId);
    const subjName = subj?.name || subjectId;
    const now = new Date().toISOString();
    const actorName = actor?.name || 'Dr. Michael Adebayo';

    // Calculate metrics
    const armScores = scores.filter(s => s.classArmId === classArmId && s.subjectId === subjectId && s.termId === activeTerm.id);
    const gradedCount = armScores.filter(s => s.total > 0).length;
    const totalArmStudents = students.filter(s => s.currentClassArmId === classArmId).length;
    const avg = gradedCount > 0
      ? Number((armScores.reduce((acc, cur) => acc + cur.total, 0) / gradedCount).toFixed(1))
      : 0;

    setSubjectSubmissions(prev => {
      const existing = prev.find(s => s.classArmId === classArmId && s.subjectId === subjectId && s.termId === activeTerm.id);
      if (existing) {
        return prev.map(s => s.classArmId === classArmId && s.subjectId === subjectId && s.termId === activeTerm.id ? {
          ...s,
          status: 'SUBMITTED',
          submittedAt: now,
          gradedStudentsCount: gradedCount,
          totalStudentsCount: totalArmStudents,
          classAverage: avg,
          submissionComments: comments || s.submissionComments
        } : s);
      } else {
        const newSubm: SubjectMarksheetSubmission = {
          id: `subm-${Date.now()}`,
          classArmId,
          classArmName: armName,
          subjectId,
          subjectName: subjName,
          termId: activeTerm.id,
          teacherId: actor?.id || 'STF/2026/018',
          teacherName: actorName,
          status: 'SUBMITTED',
          submittedAt: now,
          gradedStudentsCount: gradedCount,
          totalStudentsCount: totalArmStudents,
          classAverage: avg,
          submissionComments: comments || 'Official continuous assessment marks and examination scores submitted.'
        };
        return [newSubm, ...prev];
      }
    });

    addAuditLog({
      userId: actor?.id || 'stf-018',
      userIdentifier: actorName,
      userName: actorName,
      userRole: actor?.role || 'SUBJECT_TEACHER',
      action: 'SUBJECT_MARKSHEET_SUBMITTED',
      targetEntity: `Subject Marksheet: ${armName} - ${subjName}`,
      details: `Subject Teacher ${actorName} submitted official mark sheet for ${subjName} in ${armName} (${gradedCount}/${totalArmStudents} students graded, class avg: ${avg}%).`,
      metadata: { classArmId, subjectId, termId: activeTerm.id, comments }
    });
  };

  const retractSubjectMarksheet = (classArmId: string, subjectId: string, actor?: { id: string; name: string; role: any }) => {
    setSubjectSubmissions(prev => {
      return prev.map(s => {
        const armMatches = s.classArmId === classArmId || resolveArmId(s.classArmId) === resolveArmId(classArmId);
        const subMatches = s.subjectId === subjectId || resolveSubjectId(s.subjectId) === resolveSubjectId(subjectId);
        const termMatches = s.termId === activeTerm.id || resolveTermId(s.termId) === resolveTermId(activeTerm.id);
        if (armMatches && subMatches && termMatches) {
          return { ...s, status: 'IN_PROGRESS' };
        }
        return s;
      });
    });

    const arm = classArms.find(a => a.id === classArmId || resolveArmId(a.id) === resolveArmId(classArmId));
    const subj = subjects.find(s => s.id === subjectId || resolveSubjectId(s.id) === resolveSubjectId(subjectId));
    if (actor) {
      addAuditLog({
        userId: actor.id,
        userIdentifier: actor.name,
        userName: actor.name,
        userRole: actor.role,
        action: 'SUBJECT_MARKSHEET_RETRACTED',
        targetEntity: `Subject Marksheet: ${arm?.fullName || classArmId} - ${subj?.name || subjectId}`,
        details: `Subject Teacher ${actor.name} reopened marksheet to IN_PROGRESS status for edits.`,
        metadata: { classArmId, subjectId, termId: activeTerm.id }
      });
    }
  };

  const sendParentInquiry = (
    inquiry: Omit<ParentInquiry, 'id' | 'createdAt' | 'status'>,
    actor?: { id: string; name: string; role: any }
  ) => {
    const newInquiry: ParentInquiry = {
      ...inquiry,
      id: `inq-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'PENDING'
    };

    setParentInquiries(prev => [newInquiry, ...prev]);

    const actorUser = actor || { id: 'user-parent', name: inquiry.parentName, role: 'PARENT' };
    addAuditLog({
      userId: actorUser.id,
      userIdentifier: actorUser.name,
      userName: actorUser.name,
      userRole: actorUser.role,
      action: 'PARENT_INQUIRY_SENT' as any,
      targetEntity: `Parent Inquiry: ${inquiry.subject}`,
      details: `Inquiry sent to ${inquiry.recipientStaffName} (${inquiry.recipientRole}) regarding ward ${inquiry.studentName} (${inquiry.classArmName}).`,
      metadata: { inquiryId: newInquiry.id, studentId: inquiry.studentId }
    });
  };

  const getWardTimetable = (classArmId: string): DayTimetable[] => {
    return weeklyTimetables[classArmId] || weeklyTimetables['arm-sss2-gold'] || [];
  };

  const getWardFeeClearance = (studentId: string, termId: string): StudentFeeClearance | undefined => {
    return feeClearances.find(f => f.studentId === studentId && f.termId === termId);
  };

  // Examination Timetable Handlers (Examination Officer)
  const addExamTimetableEntry = (entry: Omit<ExamTimetableEntry, 'id'>, actor?: { id: string; name: string; role: any }) => {
    const newEntry: ExamTimetableEntry = {
      ...entry,
      id: `exam-${Date.now()}`
    };
    const updated = [...examTimetable, newEntry];
    setExamTimetable(updated);
    localStorage.setItem('eis_exam_timetable', JSON.stringify(updated));
    const actorName = actor?.name || 'Dr. Kemi Adeleke';
    addAuditLog({
      userId: actor?.id || 'stf-005',
      userIdentifier: actorName,
      userName: actorName,
      userRole: actor?.role || 'EXAM_OFFICER',
      action: 'EXAM_TIMETABLE_CREATED' as any,
      targetEntity: `Exam Schedule: ${entry.subjectName}`,
      details: `Scheduled general exam paper for ${entry.subjectName} (${entry.timeSlot}) in ${entry.examHallName}.`,
      metadata: { entry: newEntry }
    });
  };

  const updateExamTimetableEntry = (id: string, entry: Partial<ExamTimetableEntry>, actor?: { id: string; name: string; role: any }) => {
    const updated = examTimetable.map(e => e.id === id ? { ...e, ...entry } : e);
    setExamTimetable(updated);
    localStorage.setItem('eis_exam_timetable', JSON.stringify(updated));
    const actorName = actor?.name || 'Dr. Kemi Adeleke';
    addAuditLog({
      userId: actor?.id || 'stf-005',
      userIdentifier: actorName,
      userName: actorName,
      userRole: actor?.role || 'EXAM_OFFICER',
      action: 'EXAM_TIMETABLE_UPDATED' as any,
      targetEntity: `Exam Schedule: ${id}`,
      details: `Updated exam paper schedule parameters for ${entry.subjectName || id}.`,
      metadata: { id, updates: entry }
    });
  };

  const deleteExamTimetableEntry = (id: string, actor?: { id: string; name: string; role: any }) => {
    const target = examTimetable.find(e => e.id === id);
    const updated = examTimetable.filter(e => e.id !== id);
    setExamTimetable(updated);
    localStorage.setItem('eis_exam_timetable', JSON.stringify(updated));
    const actorName = actor?.name || 'Dr. Kemi Adeleke';
    addAuditLog({
      userId: actor?.id || 'stf-005',
      userIdentifier: actorName,
      userName: actorName,
      userRole: actor?.role || 'EXAM_OFFICER',
      action: 'EXAM_TIMETABLE_DELETED' as any,
      targetEntity: `Exam Schedule: ${target?.subjectName || id}`,
      details: `Cancelled and removed scheduled exam paper ${target?.subjectName || id}.`,
      metadata: { id }
    });
  };

  // School Timetable Handlers (VP Academics)
  const updateClassTimetable = (classArmId: string, days: DayTimetable[], actor?: { id: string; name: string; role: any }) => {
    const updated = { ...weeklyTimetables, [classArmId]: days };
    setWeeklyTimetables(updated);
    localStorage.setItem('eis_weekly_timetables', JSON.stringify(updated));
    const arm = classArms.find(a => a.id === classArmId);
    const actorName = actor?.name || 'Mrs. Ayodele Tinubu';
    addAuditLog({
      userId: actor?.id || 'stf-003',
      userIdentifier: actorName,
      userName: actorName,
      userRole: actor?.role || 'VICE_PRINCIPAL_ACADEMICS',
      action: 'TIMETABLE_UPDATED' as any,
      targetEntity: `Weekly Timetable: ${arm?.fullName || classArmId}`,
      details: `Updated master school weekly timetable for ${arm?.fullName || classArmId}.`,
      metadata: { classArmId }
    });
  };

  const addPeriodToTimetable = (classArmId: string, day: string, period: TimetablePeriod, actor?: { id: string; name: string; role: any }) => {
    const currentArmTimetable = weeklyTimetables[classArmId] || INITIAL_WEEKLY_TIMETABLES['arm-sss2-gold'] || [];
    const dayIndex = currentArmTimetable.findIndex(d => d.day.toLowerCase() === day.toLowerCase());
    let updatedDays: DayTimetable[];
    if (dayIndex >= 0) {
      const existingPeriods = currentArmTimetable[dayIndex].periods.filter(p => p.periodNumber !== period.periodNumber);
      const newPeriods = [...existingPeriods, period].sort((a, b) => a.periodNumber - b.periodNumber);
      updatedDays = currentArmTimetable.map((d, i) => i === dayIndex ? { ...d, periods: newPeriods } : d);
    } else {
      updatedDays = [...currentArmTimetable, { day: day as any, periods: [period] }];
    }
    updateClassTimetable(classArmId, updatedDays, actor);
  };

  const deletePeriodFromTimetable = (classArmId: string, day: string, periodNumber: number, actor?: { id: string; name: string; role: any }) => {
    const currentArmTimetable = weeklyTimetables[classArmId] || [];
    const updatedDays = currentArmTimetable.map(d => {
      if (d.day.toLowerCase() === day.toLowerCase()) {
        return {
          ...d,
          periods: d.periods.filter(p => p.periodNumber !== periodNumber)
        };
      }
      return d;
    });
    updateClassTimetable(classArmId, updatedDays, actor);
  };

  const importWeeklyTimetableFromData = (classArmId: string, parsedDays: DayTimetable[], actor?: { id: string; name: string; role: any }) => {
    updateClassTimetable(classArmId, parsedDays, actor);
  };

  // Teacher Subject Allocations
  const allocateTeacher = (classArmId: string, subjectId: string, teacherId: string, actor?: { id: string; name: string; role: any }) => {
    const teacher = staff.find(s => s.id === teacherId);
    const arm = classArms.find(a => a.id === classArmId);
    const sub = subjects.find(s => s.id === subjectId);
    if (!teacher || !arm || !sub) return;

    setAllocations(prev => {
      const existingIdx = prev.findIndex(a => a.classArmId === classArmId && a.subjectId === subjectId);
      const newAllocation: TeacherAllocation = {
        id: existingIdx >= 0 ? prev[existingIdx].id : `alloc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        classArmId,
        classArmName: arm.fullName || arm.name,
        subjectId,
        subjectName: sub.name,
        teacherId,
        teacherName: teacher.name
      };
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = newAllocation;
        return copy;
      }
      return [...prev, newAllocation];
    });

    const armPk = resolveArmPk(classArmId);
    const subPk = resolveSubjectPk(subjectId);
    const teacherPk = /^\d+$/.test(teacherId) ? parseInt(teacherId, 10) : undefined;
    if (armPk && subPk && teacherPk) {
      api.post('/academics/allocations/', {
        class_arm: armPk,
        subject: subPk,
        teacher: teacherPk,
      }).then((res: any) => {
        if (res && res.id) {
          const live = adaptTeacherAllocationFromBackend(res);
          setAllocations(prev => {
            const idx = prev.findIndex(a => a.classArmId === classArmId && a.subjectId === subjectId);
            if (idx >= 0) {
              const cp = [...prev];
              cp[idx] = live;
              return cp;
            }
            return [...prev, live];
          });
        }
      }).catch(err => console.warn('Failed to allocate teacher on backend:', err));
    }

    if (actor) {
      addAuditLog({
        userId: actor.id,
        userIdentifier: actor.name,
        userName: actor.name,
        userRole: actor.role,
        action: 'TEACHER_ALLOCATED',
        targetEntity: `Subject Allocation: ${sub.name} in ${arm.fullName || arm.name}`,
        details: `Assigned teacher ${teacher.name} (${teacher.staffId}) to teach ${sub.name} in ${arm.fullName || arm.name}.`,
        metadata: { classArmId, subjectId, teacherId, teacherName: teacher.name }
      });
    }
  };

  const removeTeacherAllocation = (allocationId: string, actor?: { id: string; name: string; role: any }) => {
    const target = allocations.find(a => a.id === allocationId);
    if (!target) return;
    const teacher = staff.find(s => s.id === target.teacherId);
    const arm = classArms.find(a => a.id === target.classArmId);
    const sub = subjects.find(s => s.id === target.subjectId);

    setAllocations(prev => prev.filter(a => a.id !== allocationId));

    if (/^\d+$/.test(allocationId)) {
      api.delete(`/academics/allocations/${allocationId}/`)
        .catch(err => console.warn('Failed to delete allocation on backend:', err));
    }

    if (actor) {
      addAuditLog({
        userId: actor.id,
        userIdentifier: actor.name,
        userName: actor.name,
        userRole: actor.role,
        action: 'ALLOCATION_REMOVED',
        targetEntity: `Subject Allocation: ${sub?.name || 'Subject'} in ${arm?.fullName || arm?.name || 'Class Arm'}`,
        details: `Deallocated teacher ${teacher?.name || 'Teacher'} from ${sub?.name || 'Subject'}.`,
        metadata: { allocationId, teacherId: target.teacherId, subjectId: target.subjectId }
      });
    }
  };

  // Inter-Role Communications & Directives Handlers
  const sendMessage = (messageData: Omit<PortalMessage, 'id' | 'createdAt' | 'isRead' | 'readAt'>): PortalMessage => {
    const newMessage: PortalMessage = {
      ...messageData,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      isRead: false
    };

    setPortalMessages(prev => [newMessage, ...prev]);

    if (messageData.priority === 'OFFICIAL_DIRECTIVE' || messageData.priority === 'URGENT') {
      addAuditLog({
        userId: messageData.senderId,
        userIdentifier: messageData.senderName,
        userName: messageData.senderName,
        userRole: messageData.senderRole,
        action: 'DIRECTIVE_ISSUED',
        targetEntity: `Message: ${messageData.subject}`,
        details: `Dispatched ${messageData.priority} message to ${messageData.recipientName} (${messageData.recipientRole}).`,
        metadata: {
          recipientId: messageData.recipientId,
          recipientRole: messageData.recipientRole,
          priority: messageData.priority,
          subject: messageData.subject
        }
      });
    }

    return newMessage;
  };

  const replyToMessage = (
    threadId: string,
    content: string,
    sender: { id: string; name: string; role: any; avatarUrl?: string }
  ): PortalMessage | null => {
    const threadMessages = portalMessages.filter(m => m.threadId === threadId);
    if (threadMessages.length === 0) return null;

    const latest = threadMessages[0];
    const recipientId = latest.senderId === sender.id ? latest.recipientId : latest.senderId;
    const recipientName = latest.senderId === sender.id ? latest.recipientName : latest.senderName;
    const recipientRole = latest.senderId === sender.id ? latest.recipientRole : latest.senderRole;

    const replySubject = latest.subject.startsWith('Re: ') ? latest.subject : `Re: ${latest.subject}`;

    const newReply: PortalMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      threadId,
      senderId: sender.id,
      senderName: sender.name,
      senderRole: sender.role,
      senderAvatarUrl: sender.avatarUrl,
      recipientId,
      recipientName,
      recipientRole,
      subject: replySubject,
      content,
      createdAt: new Date().toISOString(),
      isRead: false,
      priority: latest.priority,
      relatedEntity: latest.relatedEntity
    };

    setPortalMessages(prev => [newReply, ...prev]);
    return newReply;
  };

  const markMessageAsRead = (messageId: string) => {
    setPortalMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        return {
          ...m,
          isRead: true,
          readAt: m.readAt || new Date().toISOString()
        };
      }
      return m;
    }));
  };

  const markAllMessagesAsRead = (userIdOrRole: string) => {
    setPortalMessages(prev => prev.map(m => {
      if (
        m.recipientId === userIdOrRole ||
        m.recipientRole === userIdOrRole ||
        m.recipientId === 'ALL' ||
        m.recipientRole === 'ALL'
      ) {
        return {
          ...m,
          isRead: true,
          readAt: m.readAt || new Date().toISOString()
        };
      }
      return m;
    }));
  };

  const deleteMessage = (messageId: string) => {
    setPortalMessages(prev => prev.filter(m => m.id !== messageId));
  };

  return (
    <SchoolDataContext.Provider
      value={{
        sessions,
        terms,
        classLevels,
        classArms,
        subjects,
        allocations,
        students,
        scores,
        affectiveTraits,
        attendanceRecords,
        parents,
        staff,
        auditLogs,
        schoolSettings,
        activeSession,
        activeTerm,
        updateScore,
        bulkSaveScores,
        toggleGradeLock,
        overrideScore,
        recordAttendance,
        updatePsychomotor,
        updateStudentSubjects,
        dropStudentSubject,
        registerStudent,
        getNextAdmissionNumber,
        updateStudent,
        deleteStudent,
        addClassArm,
        addClassLevel,
        addSubject,
        updateSubject,
        publishResults,
        setActiveTerm,
        getStudentDossier,
        resetToDefaultData,
        addStaff,
        updateStaff,
        toggleStaffStatus,
        resetStaffPin,
        addAuditLog,
        updateSchoolSettings,
        executeAcademicRollover,
        togglePrincipalTermClearance,
        updatePrincipalStudentRemark,
        batchUpdatePrincipalRemarks,
        disciplinaryIncidents,
        campusExeats,
        schemeOfWork,
        addDisciplinaryIncident,
        resolveDisciplinaryIncident,
        escalateDisciplinaryIncident,
        approveCampusExeat,
        markExeatReturned,
        rejectCampusExeat,
        updateSchemeOfWorkVelocity,
        examHalls,
        invigilationRoster,
        externalCandidates,
        broadsheetSeals,
        assignInvigilator,
        updateInvigilationStatus,
        updateExternalCandidateStatus,
        sealClassBroadsheet,
        nudgeDefaultingTeachers,
        pastoralLogs,
        armEndorsements,
        addPastoralLog,
        endorseClassArm,
        subjectSubmissions,
        submitSubjectMarksheet,
        retractSubjectMarksheet,
        feeClearances,
        weeklyTimetables,
        parentInquiries,
        sendParentInquiry,
        getWardTimetable,
        getWardFeeClearance,
        examTimetable,
        addExamTimetableEntry,
        updateExamTimetableEntry,
        deleteExamTimetableEntry,
        updateClassTimetable,
        addPeriodToTimetable,
        deletePeriodFromTimetable,
        importWeeklyTimetableFromData,
        allocateTeacher,
        removeTeacherAllocation,
        portalMessages,
        sendMessage,
        replyToMessage,
        markMessageAsRead,
        markAllMessagesAsRead,
        deleteMessage,
        isBackendLoaded,
        refreshBackendData: fetchLiveSchoolData
      }}
    >
      {children}
    </SchoolDataContext.Provider>
  );
};

export function useSchoolData() {
  const context = useContext(SchoolDataContext);
  if (!context) {
    throw new Error('useSchoolData must be used within a SchoolDataProvider');
  }
  return context;
}
