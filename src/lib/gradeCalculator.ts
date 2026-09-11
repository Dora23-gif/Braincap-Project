import type { GradeLetter, SubjectScore } from '../types';

export interface GradeResult {
  grade: GradeLetter;
  remark: string;
  badgeClass: string;
}

export function computeSubjectTotal(
  ca1: number,
  ca2: number,
  assignment: number,
  project: number,
  exam: number
): number {
  const clamp = (val: number, max: number) => Math.min(Math.max(Number(val) || 0, 0), max);
  const total = clamp(ca1, 10) + clamp(ca2, 10) + clamp(assignment, 10) + clamp(project, 10) + clamp(exam, 60);
  return Number(total.toFixed(2));
}

export function evaluateGrade(totalScore: number): GradeResult {
  const score = Number(totalScore) || 0;
  if (score >= 70) {
    return {
      grade: 'A',
      remark: 'Excellent',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  } else if (score >= 60) {
    return {
      grade: 'B',
      remark: 'Very Good',
      badgeClass: 'bg-teal-50 text-teal-700 border-teal-200'
    };
  } else if (score >= 50) {
    return {
      grade: 'C',
      remark: 'Credit',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
    };
  } else if (score >= 45) {
    return {
      grade: 'D',
      remark: 'Pass',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
    };
  } else {
    return {
      grade: 'F',
      remark: 'Fail',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200'
    };
  }
}

/**
 * 3rd Term Promotional Simple Average: (Term1 + Term2 + Term3) / 3
 */
export function calculateAnnualAverage(
  term1Average: number,
  term2Average: number,
  term3Average: number
): number {
  const sum = (Number(term1Average) || 0) + (Number(term2Average) || 0) + (Number(term3Average) || 0);
  return Number((sum / 3).toFixed(2));
}

/**
 * Total Aggregate calculation (sum of all subject totals)
 */
export function calculateTotalAggregate(scores: SubjectScore[]): number {
  return scores.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
}

/**
 * Rank array of students by total aggregate score descending.
 * Returns map of studentId -> rank number (1-based, standard competition rank)
 */
export function computeRankings(
  studentsWithTotals: { studentId: string; totalAggregate: number }[]
): Map<string, number> {
  const sorted = [...studentsWithTotals].sort((a, b) => b.totalAggregate - a.totalAggregate);
  const ranks = new Map<string, number>();

  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].totalAggregate < sorted[i - 1].totalAggregate) {
      currentRank = i + 1;
    }
    ranks.set(sorted[i].studentId, currentRank);
  }
  return ranks;
}

export function formatOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
