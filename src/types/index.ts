// Domain Types for Everest International Schools EMIS

export type RoleType = 
  | 'SUPER_ADMIN' 
  | 'PRINCIPAL' 
  | 'VICE_PRINCIPAL'
  | 'VICE_PRINCIPAL_ACADEMICS'
  | 'VICE_PRINCIPAL_ADMIN'
  | 'VICE_PRINCIPAL_STUDENT_AFFAIRS'
  | 'EXAM_OFFICER' 
  | 'EXAMINATION_OFFICER'
  | 'SUBJECT_TEACHER' 
  | 'TEACHER'
  | 'FORM_MASTER' 
  | 'ADMISSIONS_OFFICER' 
  | 'STUDENT' 
  | 'PARENT'
  | 'ALL';

export interface UserSession {
  id: string;
  name: string;
  identifier: string; // Staff ID, Admission No, or Email
  email?: string;
  assignedRoles: RoleType[];
  activeRole: RoleType;
  role?: RoleType;
  avatarUrl?: string;
  // Contextual associations for dual-role staff
  staffId?: string;
  studentId?: string;
  parentId?: string;
  wardIds?: string[];
  allocatedSubjects?: {
    classArmId: string;
    classArmName: string;
    subjectId: string;
    subjectName: string;
  }[];
  formMasterArmId?: string;
  formMasterArmName?: string;
}

export interface AcademicSession {
  id: string;
  name: string; // e.g. "2025/2026"
  isCurrent: boolean;
  startDate?: string;
  endDate?: string;
}

export type TermName = '1st Term' | '2nd Term' | '3rd Term';

export interface AcademicTerm {
  id: string;
  sessionId: string;
  name: TermName;
  resumptionDate: string; // ISO date YYYY-MM-DD
  closingDate: string;
  nextTermResumptionDate: string;
  isActive: boolean;
  isResultsPublished: boolean;
  isResultsApprovedByPrincipal?: boolean;
  principalApprovedAt?: string;
  principalApprovedBy?: string;
}

export type SchoolSection = 'JUNIOR' | 'SENIOR';

export interface ClassLevel {
  id: string;
  name: string; // e.g. "JSS 1", "SSS 2"
  section: SchoolSection;
  order: number; // 1 for JSS 1 up to 6 for SSS 3
}

export interface ClassArm {
  id: string;
  classLevelId: string;
  name: string; // "Gold", "Diamond", "Emerald", "Silver"
  fullName: string; // "SSS 2 Gold"
  formMasterId?: string;
  formMasterName?: string;
}

export type SubjectGroup = 'CORE' | 'LANGUAGE' | 'TRADE' | 'GENERAL_ELECTIVE';

export interface Subject {
  id: string;
  name: string; // "Mathematics", "English Language", "Physics"
  code: string; // "MTH", "ENG", "PHY"
  category: 'CORE' | 'SCIENCE' | 'ARTS' | 'COMMERCIAL' | 'GENERAL';
  applicableTo: 'ALL' | 'JUNIOR' | 'SENIOR';
  group: SubjectGroup;
  isCompulsorySeniorScience?: boolean;
  isCompulsoryJunior?: boolean;
  backendId?: number;
}

export interface TeacherAllocation {
  id: string;
  teacherId: string;
  teacherName: string;
  classArmId: string;
  classArmName: string;
  subjectId: string;
  subjectName: string;
}

export interface Parent {
  id: string;
  fullName: string;
  name?: string;
  email: string;
  phoneNumber: string;
  phone?: string;
  address: string;
  occupation: string;
  wardIds: string[];
  fatherName?: string;
  motherName?: string;
}

export interface DroppedSubjectRecord {
  level: 'SSS 2' | 'SSS 3';
  subjectId: string;
  subjectName: string;
  date: string;
  academicSession?: string;
  reason?: string;
}

export interface Student {
  id: string;
  admissionNumber: string; // e.g. "EIS/2026/0142"
  firstName: string;
  lastName: string;
  name?: string; // alias for `${firstName} ${lastName}`
  middleName?: string;
  gender: 'MALE' | 'FEMALE';
  dateOfBirth: string; // YYYY-MM-DD
  stateOfOrigin: string;
  lga: string;
  passportPhotoUrl: string;
  house: 'Emerald' | 'Sapphire' | 'Ruby' | 'Diamond';
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';
  genotype: 'AA' | 'AS' | 'AC' | 'SS';
  parentId?: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  currentClassArmId: string;
  currentClassArmName: string;
  isBoarder: boolean;
  status: 'ACTIVE' | 'GRADUATED' | 'TRANSFERRED';
  registeredSubjectIds: string[];
  registeredSubjectCodes?: string[];
  droppedSubjects?: DroppedSubjectRecord[];
  address?: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface DailyAttendanceRecord {
  id: string;
  studentId: string;
  classArmId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
}

export type GradeLetter = 'A' | 'B' | 'C' | 'D' | 'F';

export type UserRole = RoleType;

export interface StaffMember {
  id: string;
  name: string;
  identifier: string; // e.g. STF/2026/001
  staffId?: string; // alias for identifier
  email: string;
  phoneNumber?: string;
  address?: string;
  photoUrl?: string;
  role?: RoleType;
  roles: RoleType[];
  title: string;
  status: 'ACTIVE' | 'SUSPENDED';
  defaultPin?: string;
  allocatedSubjects?: {
    classArmId: string;
    classArmName: string;
    subjectId: string;
    subjectName: string;
  }[];
  assignedSubjectIds?: string[];
  formMasterArmId?: string;
  formMasterArmName?: string;
  formMasterClassArmId?: string;
  formMasterClassArmName?: string;
  assignedClassArms?: string[];
  joinedDate?: string;
  backendId?: number;
}

export interface AuditLogDiffItem {
  field: string;
  previousValue: any;
  newValue: any;
}

export type AuditLogAction =
  | 'GRADE_LOCK_TOGGLE'
  | 'ADMIN_SCORE_OVERRIDE'
  | 'SCORE_OVERRIDE'
  | 'STAFF_STATUS_CHANGE'
  | 'USER_SUSPENDED'
  | 'USER_ROLE_CHANGE'
  | 'STAFF_CREATED'
  | 'STAFF_UPDATED'
  | 'STAFF_PIN_RESET'
  | 'PIN_RESET'
  | 'STUDENT_ADMISSION'
  | 'SUBJECT_DROP'
  | 'TERM_PUBLISH'
  | 'SESSION_ROLLOVER'
  | 'SETTINGS_UPDATED'
  | 'DISCIPLINE_RECORDED'
  | 'DISCIPLINE_RESOLVED'
  | 'DISCIPLINE_ESCALATED'
  | 'EXEAT_APPROVED'
  | 'EXEAT_RETURNED'
  | 'SYLLABUS_AUDITED'
  | 'BROADSHEET_SEALED'
  | 'INVIGILATOR_ASSIGNED'
  | 'EXTERNAL_EXAM_REGISTERED'
  | 'TEACHER_NUDGED'
  | 'CLASS_ARM_ENDORSED'
  | 'PASTORAL_NOTE_LOGGED'
  | 'SUBJECT_MARKSHEET_SUBMITTED'
  | 'SUBJECT_MARKSHEET_RETRACTED'
  | 'CLASS_ARM_CREATED'
  | 'CLASS_LEVEL_CREATED'
  | 'STUDENT_UPDATED'
  | 'STUDENT_DELETED'
  | 'TEACHER_ALLOCATED'
  | 'ALLOCATION_REMOVED'
  | 'DIRECTIVE_ISSUED';

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO date string
  userId: string;
  userIdentifier: string;
  userName: string;
  userRole: RoleType;
  action: AuditLogAction;
  targetEntity: string;
  details: string;
  diff?: AuditLogDiffItem[];
  metadata?: Record<string, any>;
}

export interface SchoolSettings {
  principalName: string;
  principalTitle: string;
  principalSignatureUrl: string;
  watermarkSealUrl: string;
  showWatermarkInPrint: boolean;
  showWatermarkInPreview: boolean;
  autoSignReportCards: boolean;
  schoolMotto: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
}

export interface SubjectScore {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classArmId: string;
  subjectId: string;
  termId: string;
  // Continuous Assessment (Total = 100)
  ca1: number;         // Max 10
  ca2: number;         // Max 10
  assignment: number;  // Max 10
  project: number;     // Max 10
  exam: number;        // Max 60
  total: number;       // Max 100
  grade: GradeLetter;  // A (70+), B (60-69), C (50-59), D (45-49), F (<45)
  remark: string;      // "Excellent", "Very Good", etc.
  teacherRemark?: string; // Pedagogical comment from subject teacher
  isLocked: boolean;
  updatedAt: string;
  // Administrative Override properties
  isOverridden?: boolean;
  overrideReason?: string;
  overrideTicketId?: string;
  overriddenBy?: string;
  overriddenAt?: string;
  previousScore?: {
    ca1: number;
    ca2: number;
    assignment?: number;
    project?: number;
    exam: number;
    total: number;
    grade?: GradeLetter;
  };
}

export interface AffectiveAndPsychomotor {
  studentId: string;
  termId: string;
  // Affective traits (1 - 5 scale)
  punctuality: number;
  neatness: number;
  politeness: number;
  attentiveness: number;
  honesty: number;
  relationshipWithPeers: number;
  // Psychomotor skills (1 - 5 scale)
  handwriting: number;
  sportsAndGames: number;
  craftsmanship: number;
  musicalArtisticSkill: number;
  // Remarks
  formMasterRemark: string;
  principalRemark: string;
  daysPresent: number;
  daysAbsent: number;
  totalSchoolDays: number;
}

export interface StudentTerminalDossier {
  student: Student;
  term: AcademicTerm;
  session: AcademicSession;
  scores: SubjectScore[];
  affectiveAndPsychomotor: AffectiveAndPsychomotor;
  totalAggregateScore: number;
  maxPossibleAggregate: number;
  percentageAverage: number;
  armPosition: number;
  totalInArm: number;
  setPosition: number;
  totalInSet: number;
  annualAverage?: number; // For 3rd term promotion
  promotionStatus?: 'PROMOTED' | 'PROMOTED_ON_TRIAL' | 'REPEAT';
}

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'RESOLVED' | 'ESCALATED_TO_PRINCIPAL';

export interface DisciplinaryIncident {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classArmId: string;
  classArmName: string;
  incidentType: 'UNIFORM_DRESS_CODE' | 'TARDINESS_TRUANCY' | 'BULLYING_HARASSMENT' | 'DISRUPTIVE_BEHAVIOR' | 'ACADEMIC_DISHONESTY' | 'CONTRABAND_POSSESSION' | 'VANDALISM';
  severity: IncidentSeverity;
  date: string; // YYYY-MM-DD
  description: string;
  actionTaken: 'VERBAL_WARNING' | 'WRITTEN_REPRIMAND' | 'CAMPUS_DETENTION' | 'COMMUNITY_SERVICE' | 'INTERNAL_SUSPENSION' | 'PARENTAL_SUMMONS';
  demeritPoints: number;
  recordedBy: string;
  status: IncidentStatus;
  resolutionNotes?: string;
}

export type ExeatType = 'MEDICAL' | 'WEEKEND_HOME' | 'COMPASSIONATE' | 'DAY_EARLY_DEPARTURE';
export type ExeatStatus = 'PENDING' | 'APPROVED' | 'ACTIVE_OFF_CAMPUS' | 'RETURNED' | 'OVERDUE' | 'REJECTED';

export interface CampusExeat {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classArmName: string;
  exeatType: ExeatType;
  departureDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  reason: string;
  destination: string;
  authorizedGuardian: string;
  guardianPhone: string;
  status: ExeatStatus;
  approvedBy: string;
  issuedAt: string;
}

export interface SchemeOfWorkTracker {
  id: string;
  subjectId: string;
  subjectName: string;
  classArmId: string;
  classArmName: string;
  teacherId: string;
  teacherName: string;
  currentWeekTopic: string;
  expectedWeek: number;
  actualWeekCompleted: number;
  syllabusVelocity: 'AHEAD' | 'ON_TRACK' | 'BEHIND';
  lastLessonNoteDate: string;
  vpInspectionRemark?: string;
}

export interface ExamHall {
  id: string;
  name: string;
  code: string;
  capacity: number;
  assignedArms: string[];
  invigilatorCount: number;
  building: string;
}

export type InvigilationRole = 'CHIEF_INVIGILATOR' | 'ASSISTANT_INVIGILATOR' | 'RELIEF_INVIGILATOR';

export interface InvigilationShift {
  id: string;
  staffId: string;
  staffName: string;
  hallId: string;
  hallName: string;
  date: string;
  timeSlot: string;
  subjectName: string;
  role: InvigilationRole;
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'ABSENT_REPLACED';
}

export type ExternalExamBody = 'WAEC_WASSCE' | 'NECO_SSCE' | 'BECE_JSCE' | 'JAMB_UTME';
export type ExternalRegistrationStatus = 'BIODATA_CAPTURED' | 'SUBJECTS_VERIFIED' | 'FEES_CLEARED' | 'INDEX_NUMBER_ISSUED' | 'SUBMITTED_TO_COUNCIL';

export interface ExternalCandidateProfile {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classArmName: string;
  examBody: ExternalExamBody;
  indexNumber: string;
  centerNumber: string;
  nediNinNumber: string;
  registrationStatus: ExternalRegistrationStatus;
  passportPhotoUrl: string;
  registeredSubjectCodes: string[];
  registeredSubjectNames: string[];
  candidateCategory: 'INTERNAL_REGULAR' | 'EXTERNAL_REMEDIAL';
  disabilityAccessArrangements?: string;
}

export interface ClassBroadsheetSeal {
  classArmId: string;
  classArmName: string;
  termId: string;
  isSealed: boolean;
  sealedAt?: string;
  sealedBy?: string;
  submissionNotes?: string;
  missingMarksCount: number;
}

export type PastoralLogCategory = 'WELFARE' | 'HEALTH' | 'CONDUCT' | 'PARENT_COMMUNICATION' | 'UNIFORM';

export interface PastoralLogEntry {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classArmId: string;
  date: string;
  category: PastoralLogCategory;
  note: string;
  actionTaken?: string;
  recordedBy: string;
  recordedByName: string;
}

export interface ClassArmEndorsement {
  classArmId: string;
  classArmName: string;
  termId: string;
  isEndorsed: boolean;
  endorsedBy: string;
  endorsedByName: string;
  endorsedAt?: string;
  formMasterSignature?: string;
  generalComments?: string;
  totalStudents: number;
  completedMarksheetsCount: number;
  totalSubjectsCount: number;
}

export interface SubjectMarksheetSubmission {
  id: string;
  classArmId: string;
  classArmName: string;
  subjectId: string;
  subjectName: string;
  termId: string;
  teacherId: string;
  teacherName: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'MODERATED';
  submittedAt?: string;
  gradedStudentsCount: number;
  totalStudentsCount: number;
  classAverage: number;
  submissionComments?: string;
}

export interface StudentFeeClearance {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  termId: string;
  termName: string;
  totalTuition: number;
  amountPaid: number;
  outstandingBalance: number;
  status: 'CLEARED' | 'OUTSTANDING' | 'EXEMPTED';
  clearedDate?: string;
  receiptNumber?: string;
  paymentMethod?: 'BANK_TRANSFER' | 'ONLINE_PAYMENT' | 'BANK_DRAFT';
  bankName?: string;
}

export interface TimetablePeriod {
  periodNumber: number;
  timeRange: string; // e.g. "08:15 - 09:00"
  subjectName: string;
  subjectCode: string;
  teacherName: string;
  roomOrLab: string;
  isBreak?: boolean;
  subjectId?: string;
  startTime?: string;
  endTime?: string;
  room?: string;
}

export interface DayTimetable {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  periods: TimetablePeriod[];
}

export interface ParentInquiry {
  id: string;
  studentId: string;
  studentName: string;
  classArmName: string;
  parentId: string;
  parentName: string;
  recipientStaffId: string;
  recipientStaffName: string;
  recipientRole: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'PENDING' | 'RESOLVED';
  staffReply?: string;
  repliedAt?: string;
}

export interface ExamTimetableEntry {
  id: string;
  examDate: string; // e.g. "2026-04-14"
  timeSlot: string; // e.g. "09:00 - 11:30 (Morning Session)"
  sessionType: 'MORNING' | 'AFTERNOON';
  subjectName: string;
  subjectCode: string;
  applicableClasses: string[]; // e.g. ["SSS 1", "SSS 2", "SSS 3"]
  examHallId: string;
  examHallName: string;
  chiefInvigilatorStaffId: string;
  chiefInvigilatorName: string;
  specialInstructions?: string;
}

export interface PortalMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: RoleType;
  senderAvatarUrl?: string;
  recipientId: string; // User ID, Staff ID, Parent ID, or 'ALL'
  recipientName: string;
  recipientRole: RoleType;
  subject: string;
  content: string;
  createdAt: string;
  readAt?: string;
  isRead: boolean;
  priority: 'NORMAL' | 'URGENT' | 'OFFICIAL_DIRECTIVE';
  relatedEntity?: {
    type: 'STUDENT' | 'EXAM' | 'ATTENDANCE' | 'SCORE' | 'TIMETABLE' | 'GENERAL' | 'BROADSHEET' | 'RESULT_CLEARANCE' | 'EXAM_TIMETABLE' | 'CLASS_ARM';
    id?: string;
    label?: string;
    name?: string;
  };
}
