import {
  SchoolSettings,
  AuditLogEntry,
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
  ParentInquiry
} from '../types';

// Elegant SVG signature data URL for Dr. Mrs. Adeleke
export const DEFAULT_PRINCIPAL_SIGNATURE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 100" width="320" height="100"><path d="M20,60 C45,25 70,80 95,40 C110,15 130,70 150,50 C165,35 180,65 200,45 C215,30 230,55 245,40 C260,30 280,70 300,50" fill="none" stroke="%231e293b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M40,75 C90,65 180,72 270,68" fill="none" stroke="%231e293b" stroke-width="1.8" stroke-linecap="round"/><text x="210" y="85" font-family="serif" font-size="11" font-style="italic" fill="%23475569">Dr. Mrs. A. O. Adeleke</text></svg>';

// Regal heraldic watermark seal SVG data URL
export const DEFAULT_WATERMARK_SEAL = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="90" fill="none" stroke="%23d4af37" stroke-width="3" stroke-dasharray="6,3"/><circle cx="100" cy="100" r="82" fill="none" stroke="%23d4af37" stroke-width="1"/><path d="M100 35 L125 75 L155 80 L132 105 L138 135 L100 118 L62 135 L68 105 L45 80 L75 75 Z" fill="%23d4af37" fill-opacity="0.12" stroke="%23d4af37" stroke-width="1.5"/><text x="100" y="160" font-family="serif" font-size="9" font-weight="bold" fill="%23b45309" text-anchor="middle" letter-spacing="1">EVEREST INTL SCHOOLS</text><text x="100" y="172" font-family="sans-serif" font-size="7" font-weight="600" fill="%2378350f" text-anchor="middle" letter-spacing="1.5">OFFICIAL SEAL • 2026</text></svg>';

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  principalName: 'Dr. Mrs. A. O. Adeleke',
  principalTitle: 'Principal & Head of Academics',
  principalSignatureUrl: DEFAULT_PRINCIPAL_SIGNATURE,
  watermarkSealUrl: DEFAULT_WATERMARK_SEAL,
  showWatermarkInPrint: true,
  showWatermarkInPreview: true,
  autoSignReportCards: true,
  schoolMotto: 'Excellence • Character • Leadership',
  schoolAddress: 'Plot 12, Academic Boulevard, Victoria Island Extension, Lagos, Nigeria',
  schoolPhone: '+234 1 800 383 7378',
  schoolEmail: 'admissions@everest.sch.ng'
};

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-001',
    timestamp: '2026-03-28T09:14:22Z',
    userId: 'stf-001',
    userIdentifier: 'STF/2026/001',
    userName: 'Dr. Kenneth Balogun',
    userRole: 'SUPER_ADMIN',
    action: 'SETTINGS_UPDATED',
    targetEntity: 'Institutional Settings: Digital Seal & Signature',
    details: 'Configured Principal digital signature and high-security watermark seal for 2nd Term result cards.',
    diff: [
      { field: 'showWatermarkInPrint', previousValue: false, newValue: true },
      { field: 'autoSignReportCards', previousValue: false, newValue: true }
    ],
    metadata: {
      ipAddress: '192.168.1.10',
      reason: 'Standardization for 2025/2026 terminal dossier dispatches'
    }
  },
  {
    id: 'log-002',
    timestamp: '2026-03-27T14:30:10Z',
    userId: 'stf-018',
    userIdentifier: 'STF/2026/018',
    userName: 'Dr. Michael Adebayo',
    userRole: 'EXAM_OFFICER',
    action: 'GRADE_LOCK_TOGGLE',
    targetEntity: 'Score Sheet: SSS 2 Gold - Physics (PHY)',
    details: 'Locked continuous assessment sheet for SSS 2 Gold Physics following departmental moderation.',
    diff: [
      { field: 'isLocked', previousValue: false, newValue: true }
    ],
    metadata: {
      classArmName: 'SSS 2 Gold',
      reason: 'Official deadline reached for CA2 and examination marks entry'
    }
  },
  {
    id: 'log-003',
    timestamp: '2026-03-26T11:45:00Z',
    userId: 'stf-001',
    userIdentifier: 'STF/2026/001',
    userName: 'Dr. Kenneth Balogun',
    userRole: 'SUPER_ADMIN',
    action: 'ADMIN_SCORE_OVERRIDE',
    targetEntity: 'SubjectScore: Oluwaseun Adeyemi (EIS/2026/0142) - Physics',
    details: 'Administrative grade override performed following re-marking of Section B question 4.',
    diff: [
      { field: 'exam', previousValue: 48, newValue: 55 },
      { field: 'total', previousValue: 86, newValue: 93 },
      { field: 'grade', previousValue: 'A', newValue: 'A' }
    ],
    metadata: {
      ticketId: 'ACAD-2026-089',
      reason: 'Academic board approved re-grade of physics theory question 4'
    }
  },
  {
    id: 'log-004',
    timestamp: '2026-03-25T16:20:00Z',
    userId: 'stf-001',
    userIdentifier: 'STF/2026/001',
    userName: 'Dr. Kenneth Balogun',
    userRole: 'SUPER_ADMIN',
    action: 'STAFF_STATUS_CHANGE',
    targetEntity: 'Staff: Mr. Paul Bello (STF/2026/007)',
    details: 'Account status maintained as ACTIVE following routine dual-role clearance.',
    diff: [
      { field: 'status', previousValue: 'ACTIVE', newValue: 'ACTIVE' }
    ],
    metadata: {
      reason: 'Routine quarterly credential validation'
    }
  },
  {
    id: 'log-005',
    timestamp: '2026-03-20T08:00:00Z',
    userId: 'stf-002',
    userIdentifier: 'STF/2026/002',
    userName: 'Dr. Mrs. A. O. Adeleke',
    userRole: 'PRINCIPAL',
    action: 'TERM_PUBLISH',
    targetEntity: 'Academic Term: 2nd Term 2025/2026',
    details: 'Published terminal scores to student and parent portals after broadsheet collation sign-off.',
    diff: [
      { field: 'isResultsPublished', previousValue: false, newValue: true }
    ],
    metadata: {
      sessionName: '2025/2026'
    }
  }
];

export const INITIAL_DISCIPLINARY_INCIDENTS: DisciplinaryIncident[] = [
  {
    id: 'disc-001',
    studentId: 'std-008',
    studentName: 'Chukwudi Nnamani',
    admissionNumber: 'EIS/2026/0148',
    classArmId: 'arm-jss2-gold',
    classArmName: 'JSS 2 Gold',
    incidentType: 'UNIFORM_DRESS_CODE',
    severity: 'LOW',
    date: '2026-03-24',
    description: 'Appeared at morning assembly in non-regulation sports footwear and without school blazer.',
    actionTaken: 'VERBAL_WARNING',
    demeritPoints: 2,
    recordedBy: 'Mrs. Ayodele Tinubu (VP Admin)',
    status: 'RESOLVED',
    resolutionNotes: 'Scholar complied following advisory. Correct uniform worn the next day.'
  },
  {
    id: 'disc-002',
    studentId: 'std-015',
    studentName: 'Babatunde Lawal',
    admissionNumber: 'EIS/2026/0155',
    classArmId: 'arm-sss2-diamond',
    classArmName: 'SSS 2 Diamond',
    incidentType: 'TARDINESS_TRUANCY',
    severity: 'MEDIUM',
    date: '2026-03-22',
    description: 'Repeated unexcused late arrival to 1st period Chemistry practicals (3 consecutive lab sessions).',
    actionTaken: 'CAMPUS_DETENTION',
    demeritPoints: 5,
    recordedBy: 'Mrs. Ayodele Tinubu (VP Admin)',
    status: 'RESOLVED',
    resolutionNotes: 'Served 1-hour Friday detention and submitted apology letter to chemistry master.'
  },
  {
    id: 'disc-003',
    studentId: 'std-002',
    studentName: 'Ifeanyi Okafor',
    admissionNumber: 'EIS/2026/0138',
    classArmId: 'arm-sss1-gold',
    classArmName: 'SSS 1 Gold',
    incidentType: 'CONTRABAND_POSSESSION',
    severity: 'HIGH',
    date: '2026-03-26',
    description: 'Found in possession of unauthorized smart cellular device during evening prep study hours.',
    actionTaken: 'PARENTAL_SUMMONS',
    demeritPoints: 10,
    recordedBy: 'Mrs. Ayodele Tinubu (VP Admin)',
    status: 'OPEN',
    resolutionNotes: 'Device impounded in VP Admin safe. Guardian invited for conference.'
  },
  {
    id: 'disc-004',
    studentId: 'std-011',
    studentName: 'Emeka Okoli',
    admissionNumber: 'EIS/2026/0150',
    classArmId: 'arm-jss3-gold',
    classArmName: 'JSS 3 Gold',
    incidentType: 'DISRUPTIVE_BEHAVIOR',
    severity: 'LOW',
    date: '2026-03-20',
    description: 'Disruptive noise-making in the senior reading room and defying library prefect directives.',
    actionTaken: 'COMMUNITY_SERVICE',
    demeritPoints: 3,
    recordedBy: 'Mrs. Ayodele Tinubu (VP Admin)',
    status: 'RESOLVED',
    resolutionNotes: 'Completed 2 hours of library catalog organization during weekend activity period.'
  },
  {
    id: 'disc-005',
    studentId: 'std-020',
    studentName: 'Farouk Al-Hassan',
    admissionNumber: 'EIS/2026/0160',
    classArmId: 'arm-sss3-diamond',
    classArmName: 'SSS 3 Diamond',
    incidentType: 'ACADEMIC_DISHONESTY',
    severity: 'CRITICAL',
    date: '2026-03-27',
    description: 'Attempted smuggling of unauthorized formula sheets into mock physics examination hall.',
    actionTaken: 'INTERNAL_SUSPENSION',
    demeritPoints: 15,
    recordedBy: 'Mrs. Ayodele Tinubu (VP Admin)',
    status: 'ESCALATED_TO_PRINCIPAL',
    resolutionNotes: 'Paper cancelled. Case file forwarded to Principal for Disciplinary Committee ratification.'
  }
];

export const INITIAL_CAMPUS_EXEATS: CampusExeat[] = [
  {
    id: 'exeat-001',
    studentId: 'std-014',
    studentName: 'Zainab Abubakar',
    admissionNumber: 'EIS/2026/0144',
    classArmName: 'SSS 2 Gold',
    exeatType: 'MEDICAL',
    departureDate: '2026-03-26T09:30:00Z',
    expectedReturnDate: '2026-03-27T16:00:00Z',
    actualReturnDate: '2026-03-27T15:15:00Z',
    reason: 'Consultant orthodontic appointment and dental checkup at St. Nicholas Hospital',
    destination: 'Victoria Island, Lagos',
    authorizedGuardian: 'Alhaji M. Abubakar (Father)',
    guardianPhone: '+234 802 333 4444',
    status: 'RETURNED',
    approvedBy: 'Mrs. Ayodele Tinubu (VP Admin)',
    issuedAt: '2026-03-25T14:00:00Z'
  },
  {
    id: 'exeat-002',
    studentId: 'std-007',
    studentName: 'Kelechi Eze',
    admissionNumber: 'EIS/2026/0140',
    classArmName: 'SSS 1 Diamond',
    exeatType: 'WEEKEND_HOME',
    departureDate: '2026-03-28T14:00:00Z',
    expectedReturnDate: '2026-03-30T17:00:00Z',
    reason: 'Family patriarch 80th birthday thanksgiving mass and reception',
    destination: 'GRA Ikeja, Lagos',
    authorizedGuardian: 'Barrister N. Eze (Father)',
    guardianPhone: '+234 803 444 5555',
    status: 'ACTIVE_OFF_CAMPUS',
    approvedBy: 'Mrs. Ayodele Tinubu (VP Admin)',
    issuedAt: '2026-03-27T11:00:00Z'
  },
  {
    id: 'exeat-003',
    studentId: 'std-012',
    studentName: 'Fadekemi Adeleke',
    admissionNumber: 'EIS/2026/0152',
    classArmName: 'JSS 3 Diamond',
    exeatType: 'COMPASSIONATE',
    departureDate: '2026-03-29T10:00:00Z',
    expectedReturnDate: '2026-03-31T18:00:00Z',
    reason: 'Funeral and commemoration ceremony for maternal grandparent',
    destination: 'Bodija, Ibadan, Oyo State',
    authorizedGuardian: 'Mrs. R. Adeleke (Mother)',
    guardianPhone: '+234 805 666 7777',
    status: 'APPROVED',
    approvedBy: 'Mrs. Ayodele Tinubu (VP Admin)',
    issuedAt: '2026-03-28T16:30:00Z'
  },
  {
    id: 'exeat-004',
    studentId: 'std-004',
    studentName: 'Tariq Al-Mansoor',
    admissionNumber: 'EIS/2026/0145',
    classArmName: 'JSS 2 Emerald',
    exeatType: 'DAY_EARLY_DEPARTURE',
    departureDate: '2026-03-28T12:00:00Z',
    expectedReturnDate: '2026-03-28T17:00:00Z',
    actualReturnDate: '2026-03-28T16:45:00Z',
    reason: 'National Youth Chess Championship registration and screening',
    destination: 'National Stadium, Surulere',
    authorizedGuardian: 'Dr. K. Al-Mansoor (Father)',
    guardianPhone: '+234 808 777 8888',
    status: 'RETURNED',
    approvedBy: 'Mrs. Ayodele Tinubu (VP Admin)',
    issuedAt: '2026-03-28T08:15:00Z'
  }
];

export const INITIAL_SCHEME_OF_WORK: SchemeOfWorkTracker[] = [
  {
    id: 'sow-001',
    subjectId: 'subj-phy',
    subjectName: 'Physics',
    classArmId: 'arm-sss2-gold',
    classArmName: 'SSS 2 Gold',
    teacherId: 'stf-018',
    teacherName: 'Dr. Michael Adebayo',
    currentWeekTopic: 'Electric Field & Capacitance Calculations',
    expectedWeek: 10,
    actualWeekCompleted: 10,
    syllabusVelocity: 'ON_TRACK',
    lastLessonNoteDate: '2026-03-25',
    vpInspectionRemark: 'Thorough theoretical derivations and exemplary laboratory setups.'
  },
  {
    id: 'sow-002',
    subjectId: 'subj-mth',
    subjectName: 'Mathematics',
    classArmId: 'arm-sss2-diamond',
    classArmName: 'SSS 2 Diamond',
    teacherId: 'stf-005',
    teacherName: 'Mrs. Folashade Alabi',
    currentWeekTopic: 'Differential Calculus: Rates of Change and Optimization',
    expectedWeek: 10,
    actualWeekCompleted: 11,
    syllabusVelocity: 'AHEAD',
    lastLessonNoteDate: '2026-03-27',
    vpInspectionRemark: 'Ahead of national WAEC syllabus schedule. Excellent problem sets.'
  },
  {
    id: 'sow-003',
    subjectId: 'subj-che',
    subjectName: 'Chemistry',
    classArmId: 'arm-sss1-gold',
    classArmName: 'SSS 1 Gold',
    teacherId: 'stf-008',
    teacherName: 'Mrs. Grace Danladi',
    currentWeekTopic: 'Volumetric Analysis & Acid-Base Titration Curves',
    expectedWeek: 10,
    actualWeekCompleted: 9,
    syllabusVelocity: 'BEHIND',
    lastLessonNoteDate: '2026-03-18',
    vpInspectionRemark: 'Lagging by 1 week due to mid-term practical re-runs. Double period scheduled.'
  },
  {
    id: 'sow-004',
    subjectId: 'subj-eng',
    subjectName: 'English Language',
    classArmId: 'arm-jss1-emerald',
    classArmName: 'JSS 1 Emerald',
    teacherId: 'stf-006',
    teacherName: 'Mr. Chukwuma Eze',
    currentWeekTopic: 'Formal Letter Writing & Phonetic Transcription',
    expectedWeek: 10,
    actualWeekCompleted: 10,
    syllabusVelocity: 'ON_TRACK',
    lastLessonNoteDate: '2026-03-26',
    vpInspectionRemark: 'Active speech laboratory sessions and grammar exercises well logged.'
  },
  {
    id: 'sow-005',
    subjectId: 'subj-fmth',
    subjectName: 'Further Mathematics',
    classArmId: 'arm-sss3-gold',
    classArmName: 'SSS 3 Gold',
    teacherId: 'stf-005',
    teacherName: 'Mrs. Folashade Alabi',
    currentWeekTopic: 'Matrices, Determinants & Vector Transformations in 3D',
    expectedWeek: 10,
    actualWeekCompleted: 10,
    syllabusVelocity: 'ON_TRACK',
    lastLessonNoteDate: '2026-03-26',
    vpInspectionRemark: 'Intensive past question revision underway for WAEC/UTME candidates.'
  },
  {
    id: 'sow-006',
    subjectId: 'subj-btech',
    subjectName: 'Basic Technology',
    classArmId: 'arm-jss2-diamond',
    classArmName: 'JSS 2 Diamond',
    teacherId: 'stf-010',
    teacherName: 'Engr. David Okoro',
    currentWeekTopic: 'Isometric and Oblique Pictorial Projections',
    expectedWeek: 10,
    actualWeekCompleted: 8,
    syllabusVelocity: 'BEHIND',
    lastLessonNoteDate: '2026-03-15',
    vpInspectionRemark: 'Drawing board practicals delayed. Mandatory remedial workshop assigned.'
  }
];

export const INITIAL_EXAM_HALLS: ExamHall[] = [
  {
    id: 'hall-001',
    name: 'Sir Ahmadu Bello Memorial Hall (MPH)',
    code: 'MPH-A',
    capacity: 120,
    assignedArms: ['SSS 3 Gold', 'SSS 3 Diamond'],
    invigilatorCount: 4,
    building: 'Centenary Academic Wing'
  },
  {
    id: 'hall-002',
    name: 'Prof. Wole Soyinka Science Auditorium',
    code: 'SCI-B',
    capacity: 80,
    assignedArms: ['SSS 2 Gold', 'SSS 2 Diamond'],
    invigilatorCount: 3,
    building: 'Science & Innovation Complex'
  },
  {
    id: 'hall-003',
    name: 'Chinua Achebe CBT & Language Lab',
    code: 'CBT-C',
    capacity: 60,
    assignedArms: ['JSS 3 Gold', 'JSS 3 Diamond'],
    invigilatorCount: 2,
    building: 'Digital Learning Tower'
  },
  {
    id: 'hall-004',
    name: 'Queen Amina Junior School Hall',
    code: 'QAH-D',
    capacity: 90,
    assignedArms: ['JSS 1 Gold', 'JSS 1 Emerald', 'JSS 2 Gold'],
    invigilatorCount: 3,
    building: 'Junior Secondary Pavilion'
  }
];

export const INITIAL_INVIGILATION_ROSTER: InvigilationShift[] = [
  {
    id: 'inv-001',
    staffId: 'stf-006',
    staffName: 'Mr. Chukwuma Eze',
    hallId: 'hall-001',
    hallName: 'Sir Ahmadu Bello Memorial Hall (MPH)',
    date: '2026-04-06',
    timeSlot: '09:00 - 11:30 (Morning Session)',
    subjectName: 'Physics (Paper 1 & 2 Theory/Obj)',
    role: 'CHIEF_INVIGILATOR',
    status: 'CONFIRMED'
  },
  {
    id: 'inv-002',
    staffId: 'stf-005',
    staffName: 'Mrs. Folashade Alabi',
    hallId: 'hall-001',
    hallName: 'Sir Ahmadu Bello Memorial Hall (MPH)',
    date: '2026-04-06',
    timeSlot: '09:00 - 11:30 (Morning Session)',
    subjectName: 'Physics (Paper 1 & 2 Theory/Obj)',
    role: 'ASSISTANT_INVIGILATOR',
    status: 'CONFIRMED'
  },
  {
    id: 'inv-003',
    staffId: 'stf-007',
    staffName: 'Mr. Paul Bello',
    hallId: 'hall-002',
    hallName: 'Prof. Wole Soyinka Science Auditorium',
    date: '2026-04-06',
    timeSlot: '09:00 - 11:30 (Morning Session)',
    subjectName: 'Chemistry Practical Test',
    role: 'CHIEF_INVIGILATOR',
    status: 'CONFIRMED'
  },
  {
    id: 'inv-004',
    staffId: 'stf-011',
    staffName: 'Mrs. Ngozi Okeke',
    hallId: 'hall-003',
    hallName: 'Chinua Achebe CBT & Language Lab',
    date: '2026-04-06',
    timeSlot: '13:00 - 15:00 (Afternoon Session)',
    subjectName: 'BECE Basic Science & Technology Mock',
    role: 'CHIEF_INVIGILATOR',
    status: 'SCHEDULED'
  },
  {
    id: 'inv-005',
    staffId: 'stf-010',
    staffName: 'Engr. David Okoro',
    hallId: 'hall-001',
    hallName: 'Sir Ahmadu Bello Memorial Hall (MPH)',
    date: '2026-04-06',
    timeSlot: '11:00 - 12:00 (Relief Rotation)',
    subjectName: 'Mid-Session Invigilator Relief',
    role: 'RELIEF_INVIGILATOR',
    status: 'CONFIRMED'
  }
];

export const INITIAL_EXTERNAL_CANDIDATES: ExternalCandidateProfile[] = [
  {
    id: 'cand-001',
    studentId: 'std-020',
    studentName: 'Farouk Al-Hassan',
    admissionNumber: 'EIS/2026/0160',
    classArmName: 'SSS 3 Diamond',
    examBody: 'WAEC_WASSCE',
    indexNumber: '4250102/001',
    centerNumber: '4250102',
    nediNinNumber: '29384719283',
    registrationStatus: 'INDEX_NUMBER_ISSUED',
    passportPhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    registeredSubjectCodes: ['ENG', 'MTH', 'CIV', 'HIS', 'PHY', 'CHE', 'BIO', 'DP', 'GEO'],
    registeredSubjectNames: ['English Studies', 'Mathematics', 'Civic Education', 'Nigerian History', 'Physics', 'Chemistry', 'Biology', 'Data Processing', 'Geography'],
    candidateCategory: 'INTERNAL_REGULAR'
  },
  {
    id: 'cand-002',
    studentId: 'std-002',
    studentName: 'Ifeanyi Okafor',
    admissionNumber: 'EIS/2026/0138',
    classArmName: 'SSS 3 Gold',
    examBody: 'WAEC_WASSCE',
    indexNumber: '4250102/002',
    centerNumber: '4250102',
    nediNinNumber: '83920194821',
    registrationStatus: 'INDEX_NUMBER_ISSUED',
    passportPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    registeredSubjectCodes: ['ENG', 'MTH', 'CIV', 'HIS', 'PHY', 'CHE', 'BIO', 'DP', 'ECO'],
    registeredSubjectNames: ['English Studies', 'Mathematics', 'Civic Education', 'Nigerian History', 'Physics', 'Chemistry', 'Biology', 'Data Processing', 'Economics'],
    candidateCategory: 'INTERNAL_REGULAR'
  },
  {
    id: 'cand-003',
    studentId: 'std-014',
    studentName: 'Zainab Abubakar',
    admissionNumber: 'EIS/2026/0144',
    classArmName: 'SSS 3 Gold',
    examBody: 'NECO_SSCE',
    indexNumber: '7021104/003',
    centerNumber: '7021104',
    nediNinNumber: '48291039482',
    registrationStatus: 'SUBJECTS_VERIFIED',
    passportPhotoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
    registeredSubjectCodes: ['ENG', 'MTH', 'CIV', 'HIS', 'PHY', 'CHE', 'BIO', 'FN', 'YOR'],
    registeredSubjectNames: ['English Studies', 'Mathematics', 'Civic Education', 'Nigerian History', 'Physics', 'Chemistry', 'Biology', 'Food and Nutrition', 'Yoruba Language'],
    candidateCategory: 'INTERNAL_REGULAR'
  },
  {
    id: 'cand-004',
    studentId: 'std-011',
    studentName: 'Emeka Okoli',
    admissionNumber: 'EIS/2026/0150',
    classArmName: 'JSS 3 Gold',
    examBody: 'BECE_JSCE',
    indexNumber: 'BECE/2026/088',
    centerNumber: '4250102',
    nediNinNumber: '91827364510',
    registrationStatus: 'INDEX_NUMBER_ISSUED',
    passportPhotoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=80',
    registeredSubjectCodes: ['ENG', 'MTH', 'IGB', 'BSC', 'PHE', 'BTECH', 'HIS', 'SCS', 'CCA', 'BUS', 'AGR', 'CRS', 'FRN'],
    registeredSubjectNames: ['English Studies', 'Mathematics', 'Igbo', 'Basic Science', 'Physical & Health Education', 'Basic Technology', 'Nigerian History', 'Social and Citizenship Studies', 'Cultural & Creative Arts', 'Business Studies', 'Agricultural Science', 'Christian Religious Studies', 'French'],
    candidateCategory: 'INTERNAL_REGULAR'
  }
];

export const INITIAL_BROADSHEET_SEALS: ClassBroadsheetSeal[] = [
  {
    classArmId: 'arm-sss3-gold',
    classArmName: 'SSS 3 Gold',
    termId: 'term-2-2025',
    isSealed: true,
    sealedAt: '2026-03-27T16:00:00Z',
    sealedBy: 'Mr. Samuel Danjuma (Exam Officer)',
    submissionNotes: 'All 9 WAEC subjects fully moderated; transmitted to Principal clearance desk.',
    missingMarksCount: 0
  },
  {
    classArmId: 'arm-sss2-gold',
    classArmName: 'SSS 2 Gold',
    termId: 'term-2-2025',
    isSealed: false,
    missingMarksCount: 2
  },
  {
    classArmId: 'arm-jss1-gold',
    classArmName: 'JSS 1 Gold',
    termId: 'term-2-2025',
    isSealed: false,
    missingMarksCount: 0
  }
];

export const INITIAL_PASTORAL_LOGS: PastoralLogEntry[] = [
  {
    id: 'past-001',
    studentId: 'std-041',
    studentName: 'Oluwaseun Emmanuel Adeyemi',
    admissionNumber: 'EIS/2026/0141',
    classArmId: 'arm-sss2-gold',
    date: '2026-03-24',
    category: 'HEALTH',
    note: 'Student reported mild asthmatic shortness of breath during morning physical exercise. Inhaler administered at clinic under matron supervision; recovered quickly.',
    actionTaken: 'Clinic bed rest for 45 mins. Notified mother via telephone.',
    recordedBy: 'STF/2026/018',
    recordedByName: 'Dr. Michael Adebayo (Form Master)'
  },
  {
    id: 'past-002',
    studentId: 'std-014',
    studentName: 'Zainab Abubakar',
    admissionNumber: 'EIS/2026/0144',
    classArmId: 'arm-sss2-gold',
    date: '2026-03-20',
    category: 'PARENT_COMMUNICATION',
    note: 'Conferred with Alhaji Abubakar regarding upcoming orthodontic treatment in V.I. and scheduled absence during Thursday afternoon double periods.',
    actionTaken: 'Exeat request documented and coordinated with VP Admin.',
    recordedBy: 'STF/2026/018',
    recordedByName: 'Dr. Michael Adebayo (Form Master)'
  },
  {
    id: 'past-003',
    studentId: 'std-001',
    studentName: 'Chukwuemeka Okonkwo',
    admissionNumber: 'EIS/2026/0137',
    classArmId: 'arm-sss2-gold',
    date: '2026-03-18',
    category: 'CONDUCT',
    note: 'Commended for excellent leadership as Class Captain during the inter-arm science laboratory competition.',
    actionTaken: 'Awarded 2 class merit points and positive note in student record.',
    recordedBy: 'STF/2026/018',
    recordedByName: 'Dr. Michael Adebayo (Form Master)'
  },
  {
    id: 'past-004',
    studentId: 'std-041',
    studentName: 'Oluwaseun Emmanuel Adeyemi',
    admissionNumber: 'EIS/2026/0141',
    classArmId: 'arm-sss2-gold',
    date: '2026-03-15',
    category: 'UNIFORM',
    note: 'Arrived on Tuesday without prescribed school blazer and tie.',
    actionTaken: 'Verbal caution issued. Brought complete regulation blazer on Wednesday.',
    recordedBy: 'STF/2026/018',
    recordedByName: 'Dr. Michael Adebayo (Form Master)'
  }
];

export const INITIAL_ARM_ENDORSEMENTS: ClassArmEndorsement[] = [
  {
    classArmId: 'arm-sss3-gold',
    classArmName: 'SSS 3 Gold',
    termId: 'term-2-2025',
    isEndorsed: true,
    endorsedBy: 'STF/2026/012',
    endorsedByName: 'Mr. Jude Chukwuma',
    endorsedAt: '2026-03-26T14:30:00Z',
    formMasterSignature: 'J. Chukwuma',
    generalComments: 'All WAEC candidate marks verified. Exceptional cohort performance in Further Mathematics and Physics.',
    totalStudents: 5,
    completedMarksheetsCount: 9,
    totalSubjectsCount: 9
  },
  {
    classArmId: 'arm-sss2-gold',
    classArmName: 'SSS 2 Gold',
    termId: 'term-2-2025',
    isEndorsed: false,
    endorsedBy: 'STF/2026/018',
    endorsedByName: 'Dr. Michael Adebayo',
    totalStudents: 5,
    completedMarksheetsCount: 8,
    totalSubjectsCount: 9,
    generalComments: 'Awaiting submission of Chemistry marksheet from Mrs. K. Adeleke before final sign-off.'
  }
];

export const INITIAL_SUBJECT_SUBMISSIONS: SubjectMarksheetSubmission[] = [
  {
    id: 'subm-001',
    classArmId: 'arm-sss2-gold',
    classArmName: 'SSS 2 Gold',
    subjectId: 'subj-phy',
    subjectName: 'Physics',
    termId: 'term-2-2025',
    teacherId: 'STF/2026/018',
    teacherName: 'Dr. Michael Adebayo',
    status: 'SUBMITTED',
    submittedAt: '2026-03-26T11:00:00Z',
    gradedStudentsCount: 5,
    totalStudentsCount: 5,
    classAverage: 71.4,
    submissionComments: 'All CA1, CA2, practical labs and terminal exam scores fully graded and verified.'
  },
  {
    id: 'subm-002',
    classArmId: 'arm-sss2-diamond',
    classArmName: 'SSS 2 Diamond',
    subjectId: 'subj-phy',
    subjectName: 'Physics',
    termId: 'term-2-2025',
    teacherId: 'STF/2026/018',
    teacherName: 'Dr. Michael Adebayo',
    status: 'IN_PROGRESS',
    gradedStudentsCount: 4,
    totalStudentsCount: 5,
    classAverage: 65.2,
    submissionComments: 'Pending make-up practical examination for 1 student.'
  }
];

export const INITIAL_FEE_CLEARANCES: StudentFeeClearance[] = [
  {
    id: 'fee-001',
    studentId: 'std-041',
    studentName: 'Oluwaseun Emmanuel Adeyemi',
    admissionNumber: 'EIS/2026/0141',
    termId: 'term-2-2025',
    termName: '2nd Term 2025/2026',
    totalTuition: 480000,
    amountPaid: 480000,
    outstandingBalance: 0,
    status: 'CLEARED',
    clearedDate: '2026-01-14',
    receiptNumber: 'REC/2026/0892',
    paymentMethod: 'BANK_TRANSFER',
    bankName: 'Zenith Bank PLC'
  },
  {
    id: 'fee-002',
    studentId: 'std-042',
    studentName: 'Chioma Blessing Chukwuma',
    admissionNumber: 'EIS/2026/0142',
    termId: 'term-2-2025',
    termName: '2nd Term 2025/2026',
    totalTuition: 350000,
    amountPaid: 305000,
    outstandingBalance: 45000,
    status: 'OUTSTANDING',
    paymentMethod: 'BANK_TRANSFER',
    bankName: 'Access Bank PLC'
  },
  {
    id: 'fee-003',
    studentId: 'std-043',
    studentName: 'Musa Ibrahim Danjuma',
    admissionNumber: 'EIS/2026/0143',
    termId: 'term-2-2025',
    termName: '2nd Term 2025/2026',
    totalTuition: 480000,
    amountPaid: 480000,
    outstandingBalance: 0,
    status: 'CLEARED',
    clearedDate: '2026-01-10',
    receiptNumber: 'REC/2026/0855',
    paymentMethod: 'ONLINE_PAYMENT',
    bankName: 'Guaranty Trust Bank (GTCO)'
  }
];

export const INITIAL_WEEKLY_TIMETABLES: Record<string, DayTimetable[]> = {
  'arm-sss2-gold': [
    {
      day: 'Monday',
      periods: [
        { periodNumber: 1, timeRange: '08:15 - 09:00', subjectName: 'Mathematics', subjectCode: 'MTH', teacherName: 'Mrs. F. Alabi', roomOrLab: 'Senior Wing 2A' },
        { periodNumber: 2, timeRange: '09:00 - 09:45', subjectName: 'English Language', subjectCode: 'ENG', teacherName: 'Mr. C. Eze', roomOrLab: 'Senior Wing 2A' },
        { periodNumber: 3, timeRange: '09:45 - 10:30', subjectName: 'Senior Physics', subjectCode: 'PHY', teacherName: 'Dr. M. Adebayo', roomOrLab: 'Physics Lab 1' },
        { periodNumber: 4, timeRange: '11:00 - 11:45', subjectName: 'Chemistry', subjectCode: 'CHE', teacherName: 'Mrs. H. Musa', roomOrLab: 'Chemistry Lab' },
        { periodNumber: 5, timeRange: '11:45 - 12:30', subjectName: 'Biology', subjectCode: 'BIO', teacherName: 'Dr. K. Bello', roomOrLab: 'Biology Lab' },
        { periodNumber: 6, timeRange: '13:30 - 14:15', subjectName: 'Data Processing', subjectCode: 'DP', teacherName: 'Mr. E. Okafor', roomOrLab: 'ICT Hub 2' },
        { periodNumber: 7, timeRange: '14:15 - 15:00', subjectName: 'Civic Education', subjectCode: 'CIV', teacherName: 'Mr. T. Balogun', roomOrLab: 'Senior Wing 2A' },
        { periodNumber: 8, timeRange: '15:00 - 15:45', subjectName: 'Supervised Prep', subjectCode: 'PRP', teacherName: 'Dr. M. Adebayo', roomOrLab: 'Main Library' }
      ]
    },
    {
      day: 'Tuesday',
      periods: [
        { periodNumber: 1, timeRange: '08:15 - 09:00', subjectName: 'Senior Physics', subjectCode: 'PHY', teacherName: 'Dr. M. Adebayo', roomOrLab: 'Physics Lab 1' },
        { periodNumber: 2, timeRange: '09:00 - 09:45', subjectName: 'Further Mathematics', subjectCode: 'FMTH', teacherName: 'Mrs. F. Alabi', roomOrLab: 'Senior Wing 2A' },
        { periodNumber: 3, timeRange: '09:45 - 10:30', subjectName: 'English Language', subjectCode: 'ENG', teacherName: 'Mr. C. Eze', roomOrLab: 'Senior Wing 2A' },
        { periodNumber: 4, timeRange: '11:00 - 11:45', subjectName: 'Economics', subjectCode: 'ECO', teacherName: 'Mr. S. Danjuma', roomOrLab: 'Senior Wing 2A' },
        { periodNumber: 5, timeRange: '11:45 - 12:30', subjectName: 'Chemistry', subjectCode: 'CHE', teacherName: 'Mrs. H. Musa', roomOrLab: 'Chemistry Lab' },
        { periodNumber: 6, timeRange: '13:30 - 14:15', subjectName: 'Nigerian History', subjectCode: 'HIS', teacherName: 'Mr. B. Fashola', roomOrLab: 'Senior Wing 2A' },
        { periodNumber: 7, timeRange: '14:15 - 15:00', subjectName: 'Igbo Language', subjectCode: 'IGB', teacherName: 'Mrs. N. Okeke', roomOrLab: 'Language Wing B' },
        { periodNumber: 8, timeRange: '15:00 - 15:45', subjectName: 'Practical Lab Clinic', subjectCode: 'LAB', teacherName: 'Dr. M. Adebayo', roomOrLab: 'Physics Lab 1' }
      ]
    },
    {
      day: 'Wednesday',
      periods: [
        { periodNumber: 1, timeRange: '08:15 - 09:00', subjectName: 'Chemistry Practical', subjectCode: 'CHE', teacherName: 'Mrs. H. Musa', roomOrLab: 'Chemistry Lab' },
        { periodNumber: 2, timeRange: '09:00 - 09:45', subjectName: 'Mathematics', subjectCode: 'MTH', teacherName: 'Mrs. F. Alabi', roomOrLab: 'Senior Wing 2A' },
        { periodNumber: 3, timeRange: '09:45 - 10:30', subjectName: 'Biology', subjectCode: 'BIO', teacherName: 'Dr. K. Bello', roomOrLab: 'Biology Lab' },
        { periodNumber: 4, timeRange: '11:00 - 11:45', subjectName: 'English Language', subjectCode: 'ENG', teacherName: 'Mr. C. Eze', roomOrLab: 'Senior Wing 2A' },
        { periodNumber: 5, timeRange: '11:45 - 12:30', subjectName: 'Senior Physics', subjectCode: 'PHY', teacherName: 'Dr. M. Adebayo', roomOrLab: 'Physics Lab 1' },
        { periodNumber: 6, timeRange: '13:30 - 14:15', subjectName: 'Data Processing', subjectCode: 'DP', teacherName: 'Mr. E. Okafor', roomOrLab: 'ICT Hub 2' },
        { periodNumber: 7, timeRange: '14:15 - 15:00', subjectName: 'Sports & Games', subjectCode: 'PHE', teacherName: 'Coach D. Adeleke', roomOrLab: 'Sports Pavilion' },
        { periodNumber: 8, timeRange: '15:00 - 15:45', subjectName: 'Sports & Games', subjectCode: 'PHE', teacherName: 'Coach D. Adeleke', roomOrLab: 'Sports Pavilion' }
      ]
    },
    {
      day: 'Thursday',
      periods: [
        { periodNumber: 1, timeRange: '08:15 - 09:00', subjectName: 'Mathematics', subjectCode: 'MTH', teacherName: 'Mrs. F. Alabi', roomOrLab: 'Senior Wing 2A' },
        { periodNumber: 2, timeRange: '09:00 - 09:45', subjectName: 'Biology Practical', subjectCode: 'BIO', teacherName: 'Dr. K. Bello', roomOrLab: 'Biology Lab' },
        { periodNumber: 3, timeRange: '09:45 - 10:30', subjectName: 'Nigerian History', subjectCode: 'HIS', teacherName: 'Mr. B. Fashola', roomOrLab: 'Senior Wing 2A' },
        { periodNumber: 4, timeRange: '11:00 - 11:45', subjectName: 'Economics', subjectCode: 'ECO', teacherName: 'Mr. S. Danjuma', roomOrLab: 'Senior Wing 2A' },
        { periodNumber: 5, timeRange: '11:45 - 12:30', subjectName: 'English Language', subjectCode: 'ENG', teacherName: 'Mr. C. Eze', roomOrLab: 'Senior Wing 2A' },
        { periodNumber: 6, timeRange: '13:30 - 14:15', subjectName: 'Further Mathematics', subjectCode: 'FMTH', teacherName: 'Mrs. F. Alabi', roomOrLab: 'Senior Wing 2A' },
        { periodNumber: 7, timeRange: '14:15 - 15:00', subjectName: 'Civic Education', subjectCode: 'CIV', teacherName: 'Mr. T. Balogun', roomOrLab: 'Senior Wing 2A' },
        { periodNumber: 8, timeRange: '15:00 - 15:45', subjectName: 'Robotics & STEM Club', subjectCode: 'STM', teacherName: 'Dr. M. Adebayo', roomOrLab: 'ICT Hub 1' }
      ]
    },
    {
      day: 'Friday',
      periods: [
        { periodNumber: 1, timeRange: '08:15 - 09:00', subjectName: 'School Assembly', subjectCode: 'ASM', teacherName: 'Principal & Faculty', roomOrLab: 'Assembly Hall' },
        { periodNumber: 2, timeRange: '09:00 - 09:45', subjectName: 'English Language', subjectCode: 'ENG', teacherName: 'Mr. C. Eze', roomOrLab: 'Senior Wing 2A' },
        { periodNumber: 3, timeRange: '09:45 - 10:30', subjectName: 'Mathematics', subjectCode: 'MTH', teacherName: 'Mrs. F. Alabi', roomOrLab: 'Senior Wing 2A' },
        { periodNumber: 4, timeRange: '11:00 - 11:45', subjectName: 'Senior Physics', subjectCode: 'PHY', teacherName: 'Dr. M. Adebayo', roomOrLab: 'Physics Lab 1' },
        { periodNumber: 5, timeRange: '11:45 - 12:30', subjectName: 'Chemistry', subjectCode: 'CHE', teacherName: 'Mrs. H. Musa', roomOrLab: 'Chemistry Lab' },
        { periodNumber: 6, timeRange: '13:30 - 14:15', subjectName: 'Jumu\'ah / Fellowship', subjectCode: 'REL', teacherName: 'Chaplaincy Team', roomOrLab: 'Chapel / Mosque' },
        { periodNumber: 7, timeRange: '14:15 - 15:00', subjectName: 'Societies & Debating', subjectCode: 'SOC', teacherName: 'Staff Mentors', roomOrLab: 'Main Auditorium' },
        { periodNumber: 8, timeRange: '15:00 - 15:45', subjectName: 'Pastoral Form Period', subjectCode: 'PAS', teacherName: 'Dr. M. Adebayo', roomOrLab: 'Senior Wing 2A' }
      ]
    }
  ]
};

export const INITIAL_PARENT_INQUIRIES: ParentInquiry[] = [
  {
    id: 'inq-001',
    studentId: 'std-041',
    studentName: 'Oluwaseun Emmanuel Adeyemi',
    classArmName: 'SSS 2 Gold',
    parentId: 'prt-001',
    parentName: 'Chief & Mrs. T. Adeyemi',
    recipientStaffId: 'STF/2026/018',
    recipientStaffName: 'Dr. Michael Adebayo',
    recipientRole: 'Form Master / Senior Physics Teacher',
    subject: 'Inquiry regarding WAEC Physics Practical Apparatus & Textbooks',
    message: 'Good day Dr. Adebayo. We noticed Oluwaseun scored 8/10 in his mechanics project. Does he require any specialized laboratory drafting set or supplemental textbook for his 3rd Term electricity practicals?',
    createdAt: '2026-03-22T14:15:00Z',
    status: 'RESOLVED',
    staffReply: 'Good day Chief Adeyemi. Oluwaseun is excelling in physics practicals. The school laboratory is fully outfitted with all optical benches and electrical resistance boards. A standard Nelkon & Parker Physics textbook is sufficient.',
    repliedAt: '2026-03-23T09:30:00Z'
  }
];





