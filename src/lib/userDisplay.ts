import type { RoleType } from '../types';

/**
 * Returns a human-readable role label for any RoleType.
 * e.g. VICE_PRINCIPAL_ACADEMICS → "Vice-Principal (Academics)"
 */
export function getRoleLabel(role: RoleType | string | undefined): string {
  if (!role) return '';
  switch (role) {
    case 'SUPER_ADMIN':           return 'Administrator';
    case 'PRINCIPAL':             return 'Principal';
    case 'VICE_PRINCIPAL_ACADEMICS': return 'Vice-Principal (Academics)';
    case 'VICE_PRINCIPAL_ADMIN':  return 'Vice-Principal (Admin)';
    case 'VICE_PRINCIPAL':        return 'Vice-Principal';
    case 'EXAM_OFFICER':          return 'Exam Officer';
    case 'FORM_MASTER':           return 'Form Teacher';
    case 'SUBJECT_TEACHER':       return 'Teacher';
    case 'TEACHER':               return 'Teacher';
    case 'ADMISSIONS_OFFICER':    return 'Admissions Officer';
    case 'PARENT':                return 'Parent';
    case 'STUDENT':               return 'Student';
    default:
      // Fallback: replace underscores and title-case
      return (role as string)
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
  }
}

/**
 * Returns the shortened display name for the sidebar chip.
 * e.g. "Nnamdi Okeke" → "N. Okeke"
 * e.g. "Mr. John Adeyemi" → "J. Adeyemi"
 */
export function getShortName(fullName: string): string {
  if (!fullName) return '';
  // Strip common honorifics
  const stripped = fullName
    .replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Engr\.|Rev\.)\s*/i, '')
    .trim();
  const parts = stripped.split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first.charAt(0).toUpperCase()}. ${last}`;
}

/**
 * Returns a time-appropriate greeting prefix.
 * e.g. "Good morning", "Good afternoon", "Good evening"
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Formats a welcome message for the dashboard header.
 * e.g. "Welcome back, Mr. Okeke"
 */
export function getWelcomeMessage(fullName: string): string {
  if (!fullName) return 'Welcome back';
  return `Welcome back, ${fullName}`;
}
