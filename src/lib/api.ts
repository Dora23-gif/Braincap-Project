// Centralized HTTP API Client for Everest International Schools EMIS
// Bridges the React frontend to the live Django REST Framework API

import type {
  Student,
  SubjectScore,
  StaffMember,
  AcademicSession,
  AcademicTerm,
  ClassLevel,
  ClassArm,
  Subject,
  SchoolSettings,
  AuditLogEntry,
  UserSession,
  RoleType,
  Parent,
  TeacherAllocation,
} from '../types';

export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')
    ? 'https://everest-backend-mo7u.onrender.com/api/v1'
    : '/api/v1');



/**
 * Extracts a cookie value by name from document.cookie.
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

export interface ApiError {
  status: number;
  message: string;
  detail?: any;
  errors?: any;
}

export interface PaginatedResponse<T> {
  count: number;
  total_pages?: number;
  current_page?: number;
  page_size?: number;
  next: string | null;
  previous: string | null;
  results: T[];
}


/**
 * Unified request executor.
 */
async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Attach session token for cross-origin / mobile clients where 3rd-party cookies are blocked
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('eis_auth_token') : null;
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-Session-Key'] = token;
    }
  } catch (e) {
    // Ignore localStorage access issues
  }

  const method = (options.method || 'GET').toUpperCase();

  // Add CSRF token for mutating requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
  }

  // Handle JSON body serialization
  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const response = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: 'include', // Ensures sessionid cookie is sent with every request
    body,
  });

  if (!response.ok) {
    let errorDetail: any = null;
    let rawText = '';
    try {
      rawText = await response.text();
      try {
        errorDetail = JSON.parse(rawText);
      } catch {
        errorDetail = rawText;
      }
    } catch {
      errorDetail = null;
    }

    let messageStr = '';
    if (typeof errorDetail === 'string') {
      const trimmed = errorDetail.trim();
      if (trimmed.startsWith('<')) {
        const titleMatch = trimmed.match(/<title>(.*?)<\/title>/i);
        const h1Match = trimmed.match(/<h1>(.*?)<\/h1>/i);
        messageStr = titleMatch?.[1]?.replace(/&[^;]+;/g, ' ')?.trim() ||
                     h1Match?.[1]?.replace(/&[^;]+;/g, ' ')?.trim() ||
                     `HTTP Error ${response.status}`;
      } else {
        messageStr = trimmed || `HTTP Error ${response.status}`;
      }
    } else if (typeof errorDetail === 'object' && errorDetail !== null) {
      if (typeof errorDetail.detail === 'string') {
        messageStr = errorDetail.detail;
      } else if (typeof errorDetail.message === 'string') {
        messageStr = errorDetail.message;
      } else {
        const values = Object.values(errorDetail);
        if (values.length > 0) {
          const firstVal: any = values[0];
          messageStr = Array.isArray(firstVal)
            ? String(firstVal[0])
            : typeof firstVal === 'string'
            ? firstVal
            : JSON.stringify(firstVal);
        } else {
          messageStr = `HTTP Error ${response.status}`;
        }
      }
    } else {
      messageStr = `HTTP Error ${response.status}`;
    }

    const err: ApiError = {
      status: response.status,
      message: messageStr,
      detail: messageStr,
      errors: errorDetail,
    };
    throw err;
  }

  // If 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  const rawText = await response.text();
  if (!rawText || !rawText.trim()) {
    return {} as T;
  }
  try {
    return JSON.parse(rawText) as T;
  } catch {
    if (rawText.trim().startsWith('<')) {
      throw {
        status: response.status,
        message: 'Backend server is initializing. Please wait a few seconds and try again.',
      };
    }
    return rawText as unknown as T;
  }
}

export const api = {
  get: <T = any>(endpoint: string, query?: Record<string, any>) => {
    let url = endpoint;
    if (query) {
      const filteredParams = Object.entries(query)
        .filter(([_, v]) => v !== undefined && v !== null && v !== '' && v !== 'ALL')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
      if (filteredParams.length > 0) {
        url += (url.includes('?') ? '&' : '?') + filteredParams.join('&');
      }
    }
    return request<T>(url, { method: 'GET' });
  },

  post: <T = any>(endpoint: string, data?: any) =>
    request<T>(endpoint, { method: 'POST', body: data }),

  put: <T = any>(endpoint: string, data?: any) =>
    request<T>(endpoint, { method: 'PUT', body: data }),

  patch: <T = any>(endpoint: string, data?: any) =>
    request<T>(endpoint, { method: 'PATCH', body: data }),

  delete: <T = any>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};

// ============================================================================
// CANONICAL ID MAPPINGS & RESOLVERS (Neon PostgreSQL PK <-> Full Name <-> Canonical Slug)
// ============================================================================

export const ARM_SLUG_BY_PK: Record<number, string> = {
  // Authoritative Neon PostgreSQL primary keys:
  37: 'arm-jss1-gold',
  38: 'arm-jss1-emerald',
  39: 'arm-jss2-gold',
  40: 'arm-jss2-diamond',
  41: 'arm-jss3-gold',
  42: 'arm-jss3-diamond',
  43: 'arm-sss1-gold',
  44: 'arm-sss1-diamond',
  45: 'arm-sss2-gold',
  46: 'arm-sss2-diamond',
  47: 'arm-sss3-gold',
  48: 'arm-sss3-diamond',
};

export const ARM_PK_BY_SLUG: Record<string, number> = {
  'arm-jss1-gold': 37,
  'arm-jss-1-gold': 37,
  'arm-jss1-emerald': 38,
  'arm-jss-1-emerald': 38,
  'arm-jss2-gold': 39,
  'arm-jss-2-gold': 39,
  'arm-jss2-diamond': 40,
  'arm-jss-2-diamond': 40,
  'arm-jss3-gold': 41,
  'arm-jss-3-gold': 41,
  'arm-jss3-diamond': 42,
  'arm-jss-3-diamond': 42,
  'arm-sss1-gold': 43,
  'arm-sss-1-gold': 43,
  'arm-sss1-commercial-gold': 43,
  'arm-sss-1-commercial-gold': 43,
  'arm-sss1-arts-platinum': 43,
  'arm-sss-1-arts-platinum': 43,
  'arm-sss1-platinum': 43,
  'arm-sss1-diamond': 44,
  'arm-sss-1-diamond': 44,
  'arm-sss1-science-diamond': 44,
  'arm-sss-1-science-diamond': 44,
  'arm-sss1-science-emerald': 44,
  'arm-sss-1-science-emerald': 44,
  'arm-sss2-gold': 45,
  'arm-sss-2-gold': 45,
  'arm-sss2-commercial-gold': 45,
  'arm-sss-2-commercial-gold': 45,
  'arm-sss2-arts-platinum': 45,
  'arm-sss-2-arts-platinum': 45,
  'arm-sss2-platinum': 45,
  'arm-sss2-diamond': 46,
  'arm-sss-2-diamond': 46,
  'arm-sss2-science-diamond': 46,
  'arm-sss-2-science-diamond': 46,
  'arm-sss2-science-emerald': 46,
  'arm-sss-2-science-emerald': 46,
  'arm-sss3-gold': 47,
  'arm-sss-3-gold': 47,
  'arm-sss3-commercial-gold': 47,
  'arm-sss-3-commercial-gold': 47,
  'arm-sss3-arts-platinum': 47,
  'arm-sss-3-arts-platinum': 47,
  'arm-sss3-platinum': 47,
  'arm-sss3-diamond': 48,
  'arm-sss-3-diamond': 48,
  'arm-sss3-science-diamond': 48,
  'arm-sss-3-science-diamond': 48,
  'arm-sss3-science-emerald': 48,
  'arm-sss-3-science-emerald': 48,
};

export const ARM_SLUG_BY_NAME: Record<string, string> = {
  'jss 1 gold': 'arm-jss1-gold',
  'jss1 gold': 'arm-jss1-gold',
  'jss-1-gold': 'arm-jss1-gold',
  'jss 1 emerald': 'arm-jss1-emerald',
  'jss1 emerald': 'arm-jss1-emerald',
  'jss-1-emerald': 'arm-jss1-emerald',
  'jss 2 gold': 'arm-jss2-gold',
  'jss2 gold': 'arm-jss2-gold',
  'jss-2-gold': 'arm-jss2-gold',
  'jss 2 diamond': 'arm-jss2-diamond',
  'jss2 diamond': 'arm-jss2-diamond',
  'jss-2-diamond': 'arm-jss2-diamond',
  'jss 3 gold': 'arm-jss3-gold',
  'jss3 gold': 'arm-jss3-gold',
  'jss-3-gold': 'arm-jss3-gold',
  'jss 3 diamond': 'arm-jss3-diamond',
  'jss3 diamond': 'arm-jss3-diamond',
  'jss-3-diamond': 'arm-jss3-diamond',
  'sss 1 gold': 'arm-sss1-gold',
  'sss1 gold': 'arm-sss1-gold',
  'sss-1-gold': 'arm-sss1-gold',
  'sss 1 commercial gold': 'arm-sss1-gold',
  'sss1 commercial gold': 'arm-sss1-gold',
  'sss-1-commercial-gold': 'arm-sss1-gold',
  'sss 1 diamond': 'arm-sss1-diamond',
  'sss1 diamond': 'arm-sss1-diamond',
  'sss-1-diamond': 'arm-sss1-diamond',
  'sss 1 science diamond': 'arm-sss1-diamond',
  'sss1 science diamond': 'arm-sss1-diamond',
  'sss-1-science-diamond': 'arm-sss1-diamond',
  'sss 1 science emerald': 'arm-sss1-diamond',
  'sss 1 emerald': 'arm-sss1-diamond',
  'sss 1 arts platinum': 'arm-sss1-gold',
  'sss 1 platinum': 'arm-sss1-gold',
  'sss 2 gold': 'arm-sss2-gold',
  'sss2 gold': 'arm-sss2-gold',
  'sss-2-gold': 'arm-sss2-gold',
  'sss 2 commercial gold': 'arm-sss2-gold',
  'sss2 commercial gold': 'arm-sss2-gold',
  'sss-2-commercial-gold': 'arm-sss2-gold',
  'sss 2 diamond': 'arm-sss2-diamond',
  'sss2 diamond': 'arm-sss2-diamond',
  'sss-2-diamond': 'arm-sss2-diamond',
  'sss 2 science diamond': 'arm-sss2-diamond',
  'sss2 science diamond': 'arm-sss2-diamond',
  'sss-2-science-diamond': 'arm-sss2-diamond',
  'sss 2 science emerald': 'arm-sss2-diamond',
  'sss 2 emerald': 'arm-sss2-diamond',
  'sss 2 arts platinum': 'arm-sss2-gold',
  'sss 2 platinum': 'arm-sss2-gold',
  'sss 3 gold': 'arm-sss3-gold',
  'sss3 gold': 'arm-sss3-gold',
  'sss-3-gold': 'arm-sss3-gold',
  'sss 3 commercial gold': 'arm-sss3-gold',
  'sss3 commercial gold': 'arm-sss3-gold',
  'sss-3-commercial-gold': 'arm-sss3-gold',
  'sss 3 diamond': 'arm-sss3-diamond',
  'sss3 diamond': 'arm-sss3-diamond',
  'sss-3-diamond': 'arm-sss3-diamond',
  'sss 3 science diamond': 'arm-sss3-diamond',
  'sss3 science diamond': 'arm-sss3-diamond',
  'sss-3-science-diamond': 'arm-sss3-diamond',
  'sss 3 science emerald': 'arm-sss3-diamond',
  'sss 3 emerald': 'arm-sss3-diamond',
  'sss 3 arts platinum': 'arm-sss3-gold',
  'sss 3 platinum': 'arm-sss3-gold',
};

export const SUBJECT_CODE_BY_PK: Record<number, string> = {
  33: 'eng', 34: 'mth', 35: 'igb', 36: 'bsc', 37: 'phe', 38: 'btech',
  39: 'his', 40: 'scs', 41: 'cca', 42: 'bus', 43: 'agr', 44: 'crs',
  45: 'frn', 46: 'phy', 47: 'che', 48: 'bio', 49: 'civ', 50: 'yor',
  51: 'hau', 52: 'dp',  53: 'fn',  54: 'cmp', 55: 'eco', 56: 'geo',
  57: 'td',  58: 'fmth',
  // Active database PKs:
  59: 'eng', 60: 'mth', 61: 'igb', 62: 'bsc', 63: 'phe', 64: 'btech',
  65: 'his', 66: 'scs', 67: 'cca', 68: 'bus', 69: 'agr', 70: 'crs',
  71: 'frn', 72: 'phy', 73: 'che', 74: 'bio', 75: 'civ', 76: 'yor',
  77: 'hau', 78: 'dp',  79: 'fn',  80: 'cmp', 81: 'eco', 82: 'geo',
  83: 'td',  84: 'fmth', 86: 'tiv', 87: 'fin',
};

export const SUBJECT_PK_BY_CODE: Record<string, number> = {
  'eng': 59, 'mth': 60, 'igb': 61, 'bsc': 62, 'phe': 63, 'btech': 64,
  'his': 65, 'scs': 66, 'cca': 67, 'bus': 68, 'agr': 69, 'crs': 70,
  'frn': 71, 'phy': 72, 'che': 73, 'bio': 74, 'civ': 75, 'yor': 76,
  'hau': 77, 'dp':  78, 'fn':  79, 'cmp': 80, 'eco': 81, 'geo': 82,
  'td':  83, 'fmth': 84, 'tiv': 86, 'fin': 87
};

export function resolveArmId(rawIdOrName?: any, fullName?: string): string {
  const str = String(rawIdOrName || '').trim();

  // 1. If str is already an explicit slug (e.g. arm-jss1-emerald)
  if (str.startsWith('arm-')) {
    return str.replace(/-+/g, '-').replace(/jss-(\d)/, 'jss$1').replace(/sss-(\d)/, 'sss$1');
  }

  // 2. Exact lookup by name FIRST if provided (ensures unambiguous resolution)
  const nameLower = (fullName || '').toLowerCase().trim();
  if (nameLower && ARM_SLUG_BY_NAME[nameLower]) {
    return ARM_SLUG_BY_NAME[nameLower];
  }

  const strLower = str.toLowerCase().trim();
  if (strLower && ARM_SLUG_BY_NAME[strLower]) {
    return ARM_SLUG_BY_NAME[strLower];
  }

  // 3. If str is numeric PK (or arm-<number>)
  const num = parseInt(str.replace(/^arm-/, ''), 10);
  if (!isNaN(num) && ARM_SLUG_BY_PK[num]) {
    return ARM_SLUG_BY_PK[num];
  }

  // 4. Compact match
  const targetText = nameLower || strLower;
  if (targetText) {
    const compact = targetText.replace(/[\s-_]+/g, '');
    for (const [key, slug] of Object.entries(ARM_SLUG_BY_NAME)) {
      const keyCompact = key.replace(/[\s-_]+/g, '');
      if (compact === keyCompact) {
        return slug;
      }
    }
  }

  return str || 'arm-jss1-emerald';
}

export function resolveArmPk(armSlugOrId?: any): number | undefined {
  if (!armSlugOrId) return undefined;
  const str = String(armSlugOrId).trim();
  if (ARM_PK_BY_SLUG[str]) return ARM_PK_BY_SLUG[str];
  const lower = str.toLowerCase();
  if (ARM_PK_BY_SLUG[lower]) return ARM_PK_BY_SLUG[lower];
  if (ARM_SLUG_BY_NAME[lower] && ARM_PK_BY_SLUG[ARM_SLUG_BY_NAME[lower]]) {
    return ARM_PK_BY_SLUG[ARM_SLUG_BY_NAME[lower]];
  }
  const canonical = resolveArmId(str);
  if (ARM_PK_BY_SLUG[canonical]) return ARM_PK_BY_SLUG[canonical];
  const num = parseInt(str.replace(/^arm-/, ''), 10);
  if (!isNaN(num) && num > 0) return num;
  return undefined;
}

export function resolveSubjectId(codeOrPkOrSlug?: any): string {
  if (!codeOrPkOrSlug) return 'subj-eng';
  const str = String(codeOrPkOrSlug).trim();
  if (str.startsWith('subj-')) return str.toLowerCase();
  const num = parseInt(str, 10);
  if (!isNaN(num) && SUBJECT_CODE_BY_PK[num]) return `subj-${SUBJECT_CODE_BY_PK[num]}`;
  const clean = str.toLowerCase().replace(/^subj-/, '');
  return `subj-${clean}`;
}

export function resolveSubjectPk(subjectSlugOrCode?: any): number | undefined {
  if (!subjectSlugOrCode) return undefined;
  const str = String(subjectSlugOrCode).trim().toLowerCase().replace(/^subj-/, '');
  if (SUBJECT_PK_BY_CODE[str]) return SUBJECT_PK_BY_CODE[str];
  const num = parseInt(str, 10);
  if (!isNaN(num)) {
    if (SUBJECT_CODE_BY_PK[num]) return num;
    return num;
  }
  return undefined;
}

export function resolveTermId(rawTerm?: any): string {
  if (!rawTerm) return 'term-2-2025';
  const str = String(rawTerm).trim();
  if (str.startsWith('term-')) return str;
  if (str === '1' || str === '4' || str.includes('1st')) return 'term-1-2025';
  if (str === '3' || str === '6' || str.includes('3rd')) return 'term-3-2025';
  return 'term-2-2025';
}

export function resolveTermPk(termSlugOrId?: any): number {
  if (!termSlugOrId) return 5;
  const str = String(termSlugOrId).trim();
  if (str === '1' || str === '4' || str.includes('1st') || str === 'term-1-2025') return 4;
  if (str === '3' || str === '6' || str.includes('3rd') || str === 'term-3-2025') return 6;
  return 5;
}

export function resolveStudentCanonicalId(rawId?: any, admissionNumber?: string): string {
  const admNo = admissionNumber || '';
  if (admNo) {
    const match = admNo.match(/EIS\/\d{4}\/0*(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 101 && num <= 160) {
        return `std-${String(num - 100).padStart(3, '0')}`;
      } else {
        return `std-${String(num).padStart(3, '0')}`;
      }
    }
  }
  const str = String(rawId || '').trim();
  if (str.startsWith('std-')) return str;
  return str ? `std-${str}` : `std-${Date.now()}`;
}

// ============================================================================
// DATA ADAPTERS (Django snake_case <-> React TypeScript camelCase)
// ============================================================================

export function adaptStudentFromBackend(d: any): Student {
  const armId = resolveArmId(d.current_class_arm, d.current_class_arm_name);
  const canonicalId = resolveStudentCanonicalId(d.id, d.admission_number);

  let regSubjectIds: string[] = [];
  if (Array.isArray(d.registered_subject_codes) && d.registered_subject_codes.length > 0) {
    regSubjectIds = d.registered_subject_codes.map((code: string) => `subj-${String(code).toLowerCase()}`);
  } else if (Array.isArray(d.registered_subject_ids) && d.registered_subject_ids.length > 0) {
    regSubjectIds = d.registered_subject_ids.map((s: any) =>
      resolveSubjectId(typeof s === 'object' ? s.code || s.id : s)
    );
  } else if (Array.isArray(d.registered_subjects) && d.registered_subjects.length > 0) {
    regSubjectIds = d.registered_subjects.map((s: any) =>
      resolveSubjectId(typeof s === 'object' ? s.code || s.id : s)
    );
  }

  return {
    id: canonicalId,
    admissionNumber: d.admission_number || '',
    firstName: d.first_name || '',
    lastName: d.last_name || '',
    middleName: d.middle_name || '',
    name: `${d.first_name || ''} ${d.last_name || ''}`.trim(),
    gender: d.gender || 'MALE',
    dateOfBirth: d.date_of_birth || '2011-01-01',
    stateOfOrigin: d.state_of_origin || '',
    lga: d.lga || '',
    address: d.address || '',
    passportPhotoUrl:
      d.passport_photo_url ||
      d.passport_photo ||
      'https://images.unsplash.com/photo-1544717305-2782549b5136?w=240&auto=format&fit=crop&q=80',
    house: d.house || 'Emerald',
    bloodGroup: d.blood_group || 'O+',
    genotype: d.genotype || 'AA',
    parentId: d.parent ? (String(d.parent).startsWith('prt-') ? String(d.parent) : `prt-${d.parent}`) : (d.parent_id ? `prt-${d.parent_id}` : `prt-${d.id}`),
    parentName: d.parent_name || '',
    parentPhone: d.parent_phone || '',
    parentEmail: d.parent_email || '',
    currentClassArmId: armId,
    currentClassArmName: d.current_class_arm_name || '',
    isBoarder: Boolean(d.is_boarder),
    status: d.status || 'ACTIVE',
    registeredSubjectIds: regSubjectIds,
    registeredSubjectCodes: Array.isArray(d.registered_subject_codes) ? d.registered_subject_codes : [],
    droppedSubjects: (d.dropped_subjects || []).map((drop: any) => ({
      level: drop.level,
      subjectId: resolveSubjectId(drop.subject || drop.subject_id || drop.subject_code),
      subjectName: drop.subject_name || '',
      date: drop.dropped_at ? drop.dropped_at.split('T')[0] : '',
      reason: drop.reason || '',
    })),
  };
}

export function adaptParentFromBackend(d: any): Parent {
  const name =
    d.full_name ||
    `${d.first_name || ''} ${d.last_name || ''}`.trim() ||
    d.name ||
    d.username;
  return {
    id: `prt-${d.id}`,
    fullName: name,
    name,
    email: d.email || '',
    phoneNumber: d.phone_number || '',
    phone: d.phone_number || '',
    address: d.address || '',
    occupation: d.occupation || 'Parent / Legal Guardian',
    wardIds: (d.wards || []).map((w: any) => String(w.id || w.admissionNumber || w)),
  };
}

export function adaptStudentToBackend(s: Partial<Student>): any {
  const payload: Record<string, any> = {};
  if (s.admissionNumber !== undefined) payload.admission_number = s.admissionNumber;
  if (s.firstName !== undefined) payload.first_name = s.firstName;
  if (s.lastName !== undefined) payload.last_name = s.lastName;
  if (s.middleName !== undefined) payload.middle_name = s.middleName;
  if (s.gender !== undefined) payload.gender = s.gender;
  if (s.dateOfBirth !== undefined) payload.date_of_birth = s.dateOfBirth;
  if (s.stateOfOrigin !== undefined) payload.state_of_origin = s.stateOfOrigin;
  if (s.lga !== undefined) payload.lga = s.lga;
  if (s.address !== undefined) payload.address = s.address;
  if (s.house !== undefined) payload.house = s.house;
  if (s.bloodGroup !== undefined) payload.blood_group = s.bloodGroup;
  if (s.genotype !== undefined) payload.genotype = s.genotype;
  if (s.parentId !== undefined && s.parentId) {
    const rawId = String(s.parentId).trim();
    if (rawId.startsWith('prt-') || rawId.startsWith('prt_')) {
      payload.parent = rawId;
    } else {
      const num = parseInt(rawId, 10);
      payload.parent = !isNaN(num) ? num : rawId;
    }
  }
  if (s.parentName !== undefined) payload.parent_name = s.parentName;
  if (s.parentPhone !== undefined) payload.parent_phone = s.parentPhone;
  if (s.parentEmail !== undefined) payload.parent_email = s.parentEmail;
  if (s.currentClassArmName !== undefined && s.currentClassArmName) {
    payload.current_class_arm = s.currentClassArmName;
  } else if (s.currentClassArmId !== undefined) {
    const pk = resolveArmPk(s.currentClassArmId);
    payload.current_class_arm = pk !== undefined ? pk : s.currentClassArmId;
  }
  if (s.isBoarder !== undefined) payload.is_boarder = s.isBoarder;
  if (s.status !== undefined) payload.status = s.status;
  return payload;
}

export function adaptClassArmFromBackend(d: any): ClassArm {
  const armFullName = d.full_name || `${d.class_level_name || ''} ${d.name || ''}`.trim();
  const slug = resolveArmId(d.id, armFullName);

  if (d.id) {
    const numId = typeof d.id === 'number' ? d.id : parseInt(d.id, 10);
    if (!isNaN(numId)) {
      ARM_SLUG_BY_PK[numId] = slug;
      ARM_PK_BY_SLUG[slug] = numId;
    }
  }
  if (armFullName) {
    ARM_SLUG_BY_NAME[armFullName.toLowerCase().trim()] = slug;
  }

  return {
    id: slug,
    classLevelId: String(d.class_level || ''),
    name: d.name || '',
    fullName: armFullName,
    formMasterId: d.form_master ? String(d.form_master) : undefined,
    formMasterName: d.form_master_name || undefined,
  };
}

export function adaptClassArmToBackend(arm: {
  classLevelId: string;
  name: string;
  formMasterId?: string;
  fullName?: string;
}): any {
  const payload: Record<string, any> = {
    class_level: arm.classLevelId,
    name: arm.name.trim(),
  };
  if (arm.fullName) {
    payload.full_name = arm.fullName.trim();
  }
  if (arm.formMasterId) {
    payload.form_master = arm.formMasterId;
  }
  return payload;
}

export function adaptClassLevelFromBackend(d: any): ClassLevel {
  return {
    id: String(d.id),
    name: d.name,
    section: d.section,
    order: d.order,
  };
}

export function adaptAcademicSessionFromBackend(d: any): AcademicSession {
  return {
    id: String(d.id),
    name: d.name,
    isCurrent: Boolean(d.is_current),
    startDate: d.start_date,
    endDate: d.end_date,
  };
}

export function adaptAcademicTermFromBackend(d: any): AcademicTerm {
  return {
    id: resolveTermId(d.id || d.name),
    sessionId: String(d.session || d.academic_session || ''),
    name: d.name,
    resumptionDate: d.resumption_date || '',
    closingDate: d.closing_date || '',
    nextTermResumptionDate: d.next_term_resumption_date || '',
    isActive: Boolean(d.is_active),
    isResultsPublished: Boolean(d.is_results_published),
    isResultsApprovedByPrincipal: Boolean(d.is_results_approved_by_principal ?? d.is_results_published),
  };
}

export function adaptSubjectFromBackend(d: any): Subject {
  const numId = typeof d.id === 'number' ? d.id : parseInt(d.id, 10);
  if (!isNaN(numId) && d.code) {
    const code = String(d.code).trim().toLowerCase();
    SUBJECT_CODE_BY_PK[numId] = code;
    SUBJECT_PK_BY_CODE[code] = numId;
  }
  return {
    id: resolveSubjectId(d.code || d.id),
    name: d.name,
    code: d.code,
    category: d.category || 'GENERAL',
    applicableTo: d.applicable_to || 'ALL',
    group: d.group || 'CORE',
    isCompulsorySeniorScience: Boolean(d.is_compulsory_senior_science),
    isCompulsoryJunior: Boolean(d.is_compulsory_junior),
    backendId: !isNaN(numId) ? numId : undefined,
  };
}

export function adaptSubjectToBackend(s: Partial<Subject>): any {
  const payload: Record<string, any> = {};
  if (s.name !== undefined) payload.name = s.name.trim();
  if (s.code !== undefined) payload.code = s.code.trim().toUpperCase();
  if (s.category !== undefined) payload.category = s.category;
  if (s.applicableTo !== undefined) payload.applicable_to = s.applicableTo;
  if (s.group !== undefined) payload.group = s.group;
  if (s.isCompulsoryJunior !== undefined) payload.is_compulsory_junior = s.isCompulsoryJunior;
  if (s.isCompulsorySeniorScience !== undefined) payload.is_compulsory_senior_science = s.isCompulsorySeniorScience;
  return payload;
}

export function adaptSubjectScoreFromBackend(d: any): SubjectScore {
  const admNo = d.admission_number || d.student_admission_number || '';
  const canonicalStudentId = resolveStudentCanonicalId(d.student, admNo);

  return {
    id: String(d.id),
    studentId: canonicalStudentId,
    studentName: d.student_name || '',
    admissionNumber: admNo,
    classArmId: resolveArmId(d.class_arm, d.class_arm_name),
    subjectId: resolveSubjectId(d.subject_code || d.subject),
    termId: resolveTermId(d.term || d.academic_term),
    ca1: Number(d.ca1 || 0),
    ca2: Number(d.ca2 || 0),
    assignment: Number(d.assignment || 0),
    project: Number(d.project || 0),
    exam: Number(d.exam || 0),
    total: Number(d.total || 0),
    grade: (d.grade as any) || 'F',
    remark: d.remark || '',
    teacherRemark: d.teacher_remark || '',
    isLocked: Boolean(d.is_locked),
    updatedAt: d.updated_at || new Date().toISOString(),
  };
}

export function adaptTeacherAllocationFromBackend(d: any): TeacherAllocation {
  const teacherId = String(d.teacher || '');
  const classArmId = resolveArmId(d.class_arm, d.class_arm_name);
  const subjectCode = d.subject_code || (typeof d.subject === 'number' ? SUBJECT_CODE_BY_PK[d.subject] : undefined);
  const subjectId = resolveSubjectId(subjectCode || d.subject);
  return {
    id: String(d.id),
    teacherId,
    teacherName: d.teacher_name || '',
    classArmId,
    classArmName: d.class_arm_name || classArmId,
    subjectId,
    subjectName: d.subject_name || subjectId,
  };
}

export function adaptStaffFromBackend(d: any): StaffMember {
  const roles = d.assigned_roles && d.assigned_roles.length > 0
    ? d.assigned_roles
    : (d.active_role ? [d.active_role] : ['TEACHER']);

  const primaryRole = d.active_role || roles[0] || 'SUBJECT_TEACHER';

  const roleTitleMap: Record<string, string> = {
    'SUPER_ADMIN': 'Systems Administrator & IT Director',
    'PRINCIPAL': 'Principal & Head of Academics',
    'VICE_PRINCIPAL': 'Vice Principal (Administration)',
    'VICE_PRINCIPAL_ADMIN': 'Vice Principal (Administration)',
    'VICE_PRINCIPAL_ACADEMICS': 'Vice Principal (Academics)',
    'EXAM_OFFICER': 'Chief Examination Officer',
    'FORM_MASTER': 'Form Master',
    'SUBJECT_TEACHER': 'Subject Teacher',
    'ADMISSIONS_OFFICER': 'Admissions Officer',
  };

  const defaultTitle = roleTitleMap[primaryRole] || primaryRole.replace(/_/g, ' ');

  const adaptedAllocations = Array.isArray(d.allocated_subjects || d.allocatedSubjects)
    ? (d.allocated_subjects || d.allocatedSubjects).map((a: any) => ({
        classArmId: resolveArmId(a.class_arm || a.classArmId || a.class_arm_id, a.classArmName || a.class_arm_name),
        classArmName: a.classArmName || a.class_arm_name || '',
        subjectId: resolveSubjectId(a.subject_code || a.subject || a.subjectId || a.subject_id),
        subjectName: a.subjectName || a.subject_name || '',
      }))
    : [];

  const rawAssignedSubIds = Array.isArray(d.assigned_subject_ids)
    ? d.assigned_subject_ids
    : (Array.isArray(d.assignedSubjectIds) ? d.assignedSubjectIds : []);
  const rawAssignedArmIds = Array.isArray(d.assigned_class_arms)
    ? d.assigned_class_arms
    : (Array.isArray(d.assignedClassArms) ? d.assignedClassArms : []);

  const assignedSubjectIds: string[] = Array.from(new Set([
    ...adaptedAllocations.map((a: { subjectId: string }) => a.subjectId),
    ...rawAssignedSubIds.map((s: any) => resolveSubjectId(s))
  ]));

  const assignedClassArms: string[] = Array.from(new Set([
    ...adaptedAllocations.map((a: { classArmId: string }) => a.classArmId),
    ...rawAssignedArmIds.map((arm: any) => resolveArmId(arm))
  ]));

  return {
    id: String(d.id),
    name: d.full_name || `${d.first_name || ''} ${d.last_name || ''}`.trim() || d.username,
    identifier: d.identifier || d.username || `STF/${d.id}`,
    staffId: d.identifier || d.username,
    email: d.email || '',
    phoneNumber: d.phone_number || '',
    address: d.address || '',
    photoUrl: d.avatar_url,
    role: primaryRole,
    roles,
    title: d.title || defaultTitle,
    status: d.is_active ? 'ACTIVE' : 'SUSPENDED',
    formMasterArmId: resolveArmId(d.form_master_class_arm, d.form_master_class_arm_name),
    formMasterArmName: d.form_master_class_arm_name,
    allocatedSubjects: adaptedAllocations,
    assignedSubjectIds,
    assignedClassArms,
    defaultPin: d.default_pin || d.defaultPin || '••••••',
    backendId: !isNaN(Number(d.id)) ? Number(d.id) : undefined,
  };
}

export function adaptAuditLogFromBackend(d: any): AuditLogEntry {
  return {
    id: String(d.id),
    timestamp: d.timestamp,
    userId: String(d.user || ''),
    userIdentifier: d.user_identifier || '',
    userName: d.user_name || '',
    userRole: d.user_role || 'SUPER_ADMIN',
    action: d.action,
    targetEntity: d.target_entity || '',
    details: d.details || '',
    diff: d.diff,
    metadata: d.metadata,
  };
}

export function adaptSchoolSettingsFromBackend(d: any): SchoolSettings {
  return {
    principalName: d.principal_name || 'Dr. Kenneth Balogun',
    principalTitle: d.principal_title || 'Executive Principal & Director',
    principalSignatureUrl: d.principal_signature_url || '',
    watermarkSealUrl: d.watermark_seal_url || '',
    showWatermarkInPrint: Boolean(d.show_watermark_in_print ?? true),
    showWatermarkInPreview: Boolean(d.show_watermark_in_preview ?? true),
    autoSignReportCards: Boolean(d.auto_sign_report_cards ?? true),
    schoolMotto: d.school_motto || 'Excellence, Character & Leadership',
    schoolAddress: d.school_address || 'Plot 1024, Diplomatic Zone, Victoria Island, Lagos State, Nigeria',
    schoolPhone: d.school_phone || '+234 1 234 5678, +234 802 345 6789',
    schoolEmail: d.school_email || 'admissions@everest.sch.ng',
  };
}

export function adaptUserSessionFromBackend(d: any): UserSession {
  const rawRoles = d.assignedRoles || d.assigned_roles || d.roles || (d.active_role || d.activeRole ? [d.active_role || d.activeRole] : ['SUPER_ADMIN']);
  const assignedRoles: RoleType[] = Array.isArray(rawRoles) && rawRoles.length > 0 ? rawRoles : ['SUPER_ADMIN'];
  const activeRole: RoleType = d.activeRole || d.active_role || assignedRoles[0] || 'SUPER_ADMIN';

  const rawWards = Array.isArray(d.wards) ? d.wards : [];
  const wardIds = rawWards.map((w: any) => String(w.id ?? w.admissionNumber ?? w)).filter(Boolean);

  return {
    id: String(d.id),
    name: d.full_name || `${d.first_name || ''} ${d.last_name || ''}`.trim() || d.name || d.username,
    identifier: d.identifier || d.username || `STF/${d.id}`,
    email: d.email || '',
    assignedRoles,
    activeRole,
    role: activeRole,
    avatarUrl: d.avatarUrl || d.avatar_url,
    staffId: d.staffId || d.identifier || d.username,
    formMasterArmId: d.form_master_class_arm ? String(d.form_master_class_arm) : undefined,
    formMasterArmName: d.form_master_class_arm_name,
    allocatedSubjects: d.allocated_subjects || [],
    parentId: d.parent_id
      ? String(d.parent_id)
      : d.parentId
      ? String(d.parentId)
      : activeRole === 'PARENT'
      ? (String(d.id).startsWith('prt-') ? String(d.id) : `prt-${d.id}`)
      : undefined,
    studentId: d.student_id ? String(d.student_id) : d.studentId ? String(d.studentId) : undefined,
    wardIds: wardIds.length > 0 ? wardIds : undefined,
  };
}

// ============================================================================
// ACADEMIC ROLLOVER API & PAGINATION TYPES
// ============================================================================

export interface RolloverCandidate {
  student: Student;
  armName: string;
  mathScore: number;
  engScore: number;
  term1Avg: number;
  term2Avg: number;
  term3Avg: number;
  cumulativeAverage: number;
  autoDecision: 'PROMOTED' | 'PROMOTED_ON_TRIAL' | 'REPEAT' | 'GRADUATE';
  effectiveDecision: 'PROMOTED' | 'PROMOTED_ON_TRIAL' | 'REPEAT' | 'GRADUATE';
  hasOverride: boolean;
  overrideNote?: string;
  nextArm: string;
  isTransitioningToSenior: boolean;
}

export interface RolloverSummary {
  total_eligible: number;
  promoted: number;
  promoted_on_trial: number;
  repeat: number;
  graduate: number;
}

export interface RolloverCandidatesResponse extends PaginatedResponse<RolloverCandidate> {
  summary?: RolloverSummary;
}

export async function fetchRolloverCandidates(params: {
  page?: number;
  page_size?: number | string;
  level?: string;
  decision?: string;
  search?: string;
}): Promise<RolloverCandidatesResponse> {
  return api.get<RolloverCandidatesResponse>('/academics/sessions/rollover-candidates/', params);
}

export async function executeBackendRollover(data: {
  confirmation_code: string;
  overrides?: Record<string, { decision: string; note: string }>;
}): Promise<any> {
  return api.post('/academics/sessions/execute-rollover/', data);
}
