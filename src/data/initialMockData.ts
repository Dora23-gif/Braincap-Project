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
  UserSession,
  StaffMember
} from '../types';

export const INITIAL_SESSIONS: AcademicSession[] = [
  { id: 'sess-2024-2025', name: '2024/2025', isCurrent: false },
  { id: 'sess-2025-2026', name: '2025/2026', isCurrent: true },
  { id: 'sess-2026-2027', name: '2026/2027', isCurrent: false }
];

export const INITIAL_TERMS: AcademicTerm[] = [
  {
    id: 'term-1-2025',
    sessionId: 'sess-2025-2026',
    name: '1st Term',
    resumptionDate: '2025-09-08',
    closingDate: '2025-12-12',
    nextTermResumptionDate: '2026-01-12',
    isActive: false,
    isResultsPublished: true
  },
  {
    id: 'term-2-2025',
    sessionId: 'sess-2025-2026',
    name: '2nd Term',
    resumptionDate: '2026-01-12',
    closingDate: '2026-04-10',
    nextTermResumptionDate: '2026-05-04',
    isActive: true,
    isResultsPublished: true
  },
  {
    id: 'term-3-2025',
    sessionId: 'sess-2025-2026',
    name: '3rd Term',
    resumptionDate: '2026-05-04',
    closingDate: '2026-07-24',
    nextTermResumptionDate: '2026-09-14',
    isActive: false,
    isResultsPublished: false
  }
];

export const INITIAL_CLASS_LEVELS: ClassLevel[] = [
  { id: 'lvl-jss1', name: 'JSS 1', section: 'JUNIOR', order: 1 },
  { id: 'lvl-jss2', name: 'JSS 2', section: 'JUNIOR', order: 2 },
  { id: 'lvl-jss3', name: 'JSS 3', section: 'JUNIOR', order: 3 },
  { id: 'lvl-sss1', name: 'SSS 1', section: 'SENIOR', order: 4 },
  { id: 'lvl-sss2', name: 'SSS 2', section: 'SENIOR', order: 5 },
  { id: 'lvl-sss3', name: 'SSS 3', section: 'SENIOR', order: 6 }
];

import {
  FULL_CLASS_ARMS,
  FULL_STAFF,
  FULL_PARENTS,
  FULL_STUDENTS,
  FULL_SCORES,
  FULL_AFFECTIVE,
  FULL_ALLOCATIONS,
  FULL_DEMO_USERS
} from './mockDataset100';

export const INITIAL_CLASS_ARMS: ClassArm[] = FULL_CLASS_ARMS;

export const INITIAL_SUBJECTS: Subject[] = [
  // 13 Mandatory Subjects for All Junior Secondary Students (JSS 1, JSS 2, JSS 3)
  { id: 'subj-eng', name: 'English Studies', code: 'ENG', category: 'CORE', applicableTo: 'ALL', group: 'CORE', isCompulsoryJunior: true, isCompulsorySeniorScience: true },
  { id: 'subj-mth', name: 'Mathematics', code: 'MTH', category: 'CORE', applicableTo: 'ALL', group: 'CORE', isCompulsoryJunior: true, isCompulsorySeniorScience: true },
  { id: 'subj-igb', name: 'Igbo', code: 'IGB', category: 'GENERAL', applicableTo: 'ALL', group: 'LANGUAGE', isCompulsoryJunior: true },
  { id: 'subj-bsc', name: 'Basic Science', code: 'BSC', category: 'SCIENCE', applicableTo: 'JUNIOR', group: 'CORE', isCompulsoryJunior: true },
  { id: 'subj-phe', name: 'Physical & Health Education', code: 'PHE', category: 'GENERAL', applicableTo: 'JUNIOR', group: 'CORE', isCompulsoryJunior: true },
  { id: 'subj-btech', name: 'Basic Technology', code: 'BTECH', category: 'SCIENCE', applicableTo: 'JUNIOR', group: 'CORE', isCompulsoryJunior: true },
  { id: 'subj-his', name: 'Nigerian History', code: 'HIS', category: 'CORE', applicableTo: 'ALL', group: 'CORE', isCompulsoryJunior: true, isCompulsorySeniorScience: true },
  { id: 'subj-scs', name: 'Social and Citizenship Studies', code: 'SCS', category: 'CORE', applicableTo: 'JUNIOR', group: 'CORE', isCompulsoryJunior: true },
  { id: 'subj-cca', name: 'Cultural & Creative Arts', code: 'CCA', category: 'ARTS', applicableTo: 'JUNIOR', group: 'CORE', isCompulsoryJunior: true },
  { id: 'subj-bus', name: 'Business Studies', code: 'BUS', category: 'COMMERCIAL', applicableTo: 'JUNIOR', group: 'CORE', isCompulsoryJunior: true },
  { id: 'subj-agr', name: 'Agricultural Science', code: 'AGR', category: 'SCIENCE', applicableTo: 'ALL', group: 'GENERAL_ELECTIVE', isCompulsoryJunior: true },
  { id: 'subj-crs', name: 'Christian Religious Studies', code: 'CRS', category: 'ARTS', applicableTo: 'JUNIOR', group: 'CORE', isCompulsoryJunior: true },
  { id: 'subj-frn', name: 'French', code: 'FRN', category: 'GENERAL', applicableTo: 'JUNIOR', group: 'CORE', isCompulsoryJunior: true },

  // Senior Secondary Science Core Subjects (Locked & Non-droppable for SSS 1-3)
  { id: 'subj-phy', name: 'Physics', code: 'PHY', category: 'SCIENCE', applicableTo: 'SENIOR', group: 'CORE', isCompulsorySeniorScience: true },
  { id: 'subj-che', name: 'Chemistry', code: 'CHE', category: 'SCIENCE', applicableTo: 'SENIOR', group: 'CORE', isCompulsorySeniorScience: true },
  { id: 'subj-bio', name: 'Biology', code: 'BIO', category: 'SCIENCE', applicableTo: 'SENIOR', group: 'CORE', isCompulsorySeniorScience: true },
  { id: 'subj-civ', name: 'Civic Education', code: 'CIV', category: 'CORE', applicableTo: 'ALL', group: 'CORE', isCompulsorySeniorScience: true },

  // Senior Secondary Languages (Max 1 for Senior)
  { id: 'subj-yor', name: 'Yoruba Language', code: 'YOR', category: 'GENERAL', applicableTo: 'SENIOR', group: 'LANGUAGE' },
  { id: 'subj-hau', name: 'Hausa Language', code: 'HAU', category: 'GENERAL', applicableTo: 'SENIOR', group: 'LANGUAGE' },

  // Senior Secondary Trade / Vocational Subjects (Max 1 for Senior)
  { id: 'subj-dp', name: 'Data Processing', code: 'DP', category: 'COMMERCIAL', applicableTo: 'SENIOR', group: 'TRADE' },
  { id: 'subj-fn', name: 'Food and Nutrition', code: 'FN', category: 'GENERAL', applicableTo: 'SENIOR', group: 'TRADE' },

  // Senior Secondary Electives
  { id: 'subj-cmp', name: 'Computer Studies', code: 'CMP', category: 'SCIENCE', applicableTo: 'SENIOR', group: 'GENERAL_ELECTIVE' },
  { id: 'subj-eco', name: 'Economics', code: 'ECO', category: 'COMMERCIAL', applicableTo: 'SENIOR', group: 'GENERAL_ELECTIVE' },
  { id: 'subj-geo', name: 'Geography', code: 'GEO', category: 'SCIENCE', applicableTo: 'SENIOR', group: 'GENERAL_ELECTIVE' },
  { id: 'subj-td', name: 'Technical Drawing', code: 'TD', category: 'SCIENCE', applicableTo: 'SENIOR', group: 'GENERAL_ELECTIVE' },
  { id: 'subj-fmth', name: 'Further Mathematics', code: 'FMTH', category: 'SCIENCE', applicableTo: 'SENIOR', group: 'GENERAL_ELECTIVE' }
];

export const INITIAL_STAFF: StaffMember[] = FULL_STAFF;
export const INITIAL_PARENTS: Parent[] = FULL_PARENTS;
export const INITIAL_STUDENTS: Student[] = FULL_STUDENTS;
export const INITIAL_ALLOCATIONS: TeacherAllocation[] = FULL_ALLOCATIONS;
export const INITIAL_SCORES: SubjectScore[] = FULL_SCORES;
export const INITIAL_AFFECTIVE: AffectiveAndPsychomotor[] = FULL_AFFECTIVE;
export const DEMO_USERS: UserSession[] = FULL_DEMO_USERS;
