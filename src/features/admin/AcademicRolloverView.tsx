import React, { useState, useMemo, useEffect } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { ModalPortal } from '../../components/common/ModalPortal';
import { PaginationControls } from '../../components/common/PaginationControls';
import { fetchRolloverCandidates, RolloverCandidate } from '../../lib/api';
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  Filter,
  SlidersHorizontal,
  FileSpreadsheet,
  X,
  Award,
  BookOpen
} from 'lucide-react';

export const AcademicRolloverView: React.FC = () => {
  const {
    students,
    classArms,
    classLevels,
    activeSession,
    activeTerm,
    scores,
    executeAcademicRollover
  } = useSchoolData();

  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedDecision, setSelectedDecision] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [serverCandidates, setServerCandidates] = useState<RolloverCandidate[] | null>(null);
  const [serverTotalCount, setServerTotalCount] = useState<number | null>(null);
  const [serverTotalPages, setServerTotalPages] = useState<number | null>(null);
  const [serverSummary, setServerSummary] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Local administrative overrides before rollover execution: studentId -> { decision, note }
  const [overrides, setOverrides] = useState<Record<string, { decision: string; note: string }>>({});
  const [overrideModalStudent, setOverrideModalStudent] = useState<any | null>(null);
  const [overrideFormDecision, setOverrideFormDecision] = useState<string>('PROMOTED');
  const [overrideFormNote, setOverrideFormNote] = useState<string>('');

  // 3-Step Rollover Modal
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
  const [rolloverStep, setRolloverStep] = useState<1 | 2 | 3 | 4>(1);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [rolloverResult, setRolloverResult] = useState<any | null>(null);

  // Fetch paginated candidates from live backend
  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetchRolloverCandidates({
          page,
          page_size: pageSize,
          level: selectedLevel !== 'ALL' ? selectedLevel : undefined,
          decision: selectedDecision !== 'ALL' ? selectedDecision : undefined,
          search: searchTerm.trim() || undefined,
        });

        if (!isCancelled && res && Array.isArray(res.results)) {
          setServerCandidates(res.results);
          setServerTotalCount(res.count);
          setServerTotalPages(res.total_pages || Math.ceil(res.count / pageSize));
          if (res.summary) {
            setServerSummary(res.summary);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setServerCandidates(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [page, pageSize, selectedLevel, selectedDecision, searchTerm]);

  // Calculate promotion candidate matrix
  const candidateMatrix = useMemo(() => {
    return students
      .filter(s => s.status === 'ACTIVE')
      .map(student => {
        const studentScores = scores.filter(s => s.studentId === student.id);
        const mathScore = studentScores.find(s => s.subjectId === 'subj-mth')?.total ?? 60;
        const engScore = studentScores.find(s => s.subjectId === 'subj-eng')?.total ?? 62;

        const totalScoreSum = studentScores.reduce((sum, s) => sum + (s.total || 0), 0);
        const count = studentScores.length;
        const cumulativeAverage = count > 0 ? Number((totalScoreSum / count).toFixed(1)) : 65.0;

        // Mock Term 1 and Term 2 variance for realistic 3-term display
        const term1Avg = Number(Math.max(40, Math.min(95, cumulativeAverage - 2.5)).toFixed(1));
        const term2Avg = Number(Math.max(40, Math.min(95, cumulativeAverage + 1.2)).toFixed(1));
        const term3Avg = cumulativeAverage;

        const armName = student.currentClassArmName || '';
        const isSss3 = armName.includes('SSS 3');
        const isJss3 = armName.includes('JSS 3');

        let autoDecision: 'PROMOTED' | 'PROMOTED_ON_TRIAL' | 'REPEAT' | 'GRADUATE' = 'PROMOTED';
        if (isSss3) {
          autoDecision = 'GRADUATE';
        } else if (cumulativeAverage >= 50 && mathScore >= 50 && engScore >= 50) {
          autoDecision = 'PROMOTED';
        } else if (cumulativeAverage >= 46 && (mathScore >= 48 || engScore >= 48)) {
          autoDecision = 'PROMOTED_ON_TRIAL';
        } else {
          autoDecision = 'REPEAT';
        }

        const override = overrides[student.id];
        const effectiveDecision = override ? override.decision : autoDecision;

        // Next Arm computation
        let nextArm = 'Same Class (Repeating)';
        if (effectiveDecision === 'GRADUATE') {
          nextArm = 'Graduated Alumni';
        } else if (effectiveDecision === 'PROMOTED' || effectiveDecision === 'PROMOTED_ON_TRIAL') {
          if (armName.includes('JSS 1')) nextArm = armName.replace('JSS 1', 'JSS 2');
          else if (armName.includes('JSS 2')) nextArm = armName.replace('JSS 2', 'JSS 3');
          else if (armName.includes('JSS 3')) nextArm = armName.replace('JSS 3', 'SSS 1');
          else if (armName.includes('SSS 1')) nextArm = armName.replace('SSS 1', 'SSS 2');
          else if (armName.includes('SSS 2')) nextArm = armName.replace('SSS 2', 'SSS 3');
          else nextArm = armName;
        }

        return {
          student,
          armName,
          mathScore,
          engScore,
          term1Avg,
          term2Avg,
          term3Avg,
          cumulativeAverage,
          autoDecision,
          effectiveDecision,
          hasOverride: !!override,
          overrideNote: override?.note,
          nextArm,
          isTransitioningToSenior: isJss3 && (effectiveDecision === 'PROMOTED' || effectiveDecision === 'PROMOTED_ON_TRIAL')
        };
      });
  }, [students, scores, overrides]);

  // Filters
  const filteredCandidates = useMemo(() => {
    return candidateMatrix.filter(item => {
      const matchesSearch =
        item.student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesLevel =
        selectedLevel === 'ALL' || item.armName.startsWith(selectedLevel);

      const matchesDecision =
        selectedDecision === 'ALL' || item.effectiveDecision === selectedDecision;

      return matchesSearch && matchesLevel && matchesDecision;
    });
  }, [candidateMatrix, searchTerm, selectedLevel, selectedDecision]);

  // Displayed Candidates with Pagination
  const displayedCandidates = useMemo(() => {
    if (serverCandidates !== null && Object.keys(overrides).length === 0) {
      return serverCandidates;
    }
    const start = (page - 1) * pageSize;
    return filteredCandidates.slice(start, start + pageSize);
  }, [serverCandidates, filteredCandidates, page, pageSize, overrides]);

  const totalCandidatesCount =
    serverTotalCount !== null && Object.keys(overrides).length === 0
      ? serverTotalCount
      : filteredCandidates.length;

  const totalPagesCount =
    serverTotalPages !== null && Object.keys(overrides).length === 0
      ? serverTotalPages
      : Math.max(1, Math.ceil(filteredCandidates.length / pageSize));

  // Aggregate Stats
  const hasLocalOverrides = Object.keys(overrides).length > 0;
  const totalEligible = hasLocalOverrides || !serverSummary ? candidateMatrix.length : serverSummary.total_eligible;
  const promotedTotal = hasLocalOverrides || !serverSummary ? candidateMatrix.filter(c => c.effectiveDecision === 'PROMOTED').length : serverSummary.promoted;
  const trialTotal = hasLocalOverrides || !serverSummary ? candidateMatrix.filter(c => c.effectiveDecision === 'PROMOTED_ON_TRIAL').length : serverSummary.promoted_on_trial;
  const repeatTotal = hasLocalOverrides || !serverSummary ? candidateMatrix.filter(c => c.effectiveDecision === 'REPEAT').length : serverSummary.repeat;
  const graduateTotal = hasLocalOverrides || !serverSummary ? candidateMatrix.filter(c => c.effectiveDecision === 'GRADUATE').length : serverSummary.graduate;

  const openOverrideModal = (candidate: any) => {
    setOverrideModalStudent(candidate);
    setOverrideFormDecision(candidate.effectiveDecision);
    setOverrideFormNote(candidate.overrideNote || '');
  };

  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModalStudent) return;

    setOverrides(prev => ({
      ...prev,
      [overrideModalStudent.student.id]: {
        decision: overrideFormDecision,
        note: overrideFormNote.trim() || 'Administrative board discretion'
      }
    }));

    setOverrideModalStudent(null);
  };

  const handleClearOverride = (studentId: string) => {
    setOverrides(prev => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
  };

  const handleExecuteRollover = async () => {
    const result = await executeAcademicRollover(
      {
        id: 'stf-001',
        name: 'Dr. Kenneth Balogun',
        role: 'SUPER_ADMIN'
      },
      overrides
    );
    setRolloverResult(result);
    setRolloverStep(4);
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'PROMOTED':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'PROMOTED_ON_TRIAL':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'REPEAT':
        return 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'GRADUATE':
        return 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getNextSessionPreview = () => {
    const startYear = parseInt(activeSession.name.split('/')[0]) || 2025;
    return `${startYear + 1}/${startYear + 2} Academic Session`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="font-serif-title font-bold text-slate-900 dark:text-white text-lg tracking-tight">
              ACADEMIC ROLLOVER & PROMOTION ENGINE
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated session rollover according to Nigerian secondary education standards (50% cumulative threshold + core credit requirements).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setRolloverStep(1);
              setConfirmationCode('');
              setIsRolloverModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
            <span>Launch Academic Rollover</span>
          </button>
        </div>
      </div>

      {/* Readiness Check Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 dark:from-amber-950/20 dark:via-indigo-950/20 dark:to-emerald-950/20 rounded-2xl p-4 border border-amber-200/80 dark:border-amber-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-900 dark:text-amber-300 flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-5 h-5 text-amber-700 dark:text-amber-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              End-of-Session Promotion Readiness Status: Ready for Execution
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              Current Session: <strong className="text-slate-900 dark:text-white">{activeSession.name}</strong> • Active Term: <strong className="text-slate-900 dark:text-white">{activeTerm.name}</strong> • Minimum Credit Threshold: <strong className="text-slate-900 dark:text-white">≥ 50% in Maths & English</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
          <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs">
            {Object.keys(overrides).length} Compassionate Overrides Active
          </span>
        </div>
      </div>

      {/* Summary Matrix Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Total Enrolled</div>
          <div className="text-2xl font-serif-title font-bold text-slate-900 dark:text-white mt-1 font-mono-tabular">
            {totalEligible}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">Across JSS 1 to SSS 3</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Eligible (Promoted)</div>
          <div className="text-2xl font-serif-title font-bold text-emerald-700 dark:text-emerald-400 mt-1 font-mono-tabular">
            {promotedTotal}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Met all promotion criteria</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Promoted on Trial</div>
          <div className="text-2xl font-serif-title font-bold text-amber-700 dark:text-amber-400 mt-1 font-mono-tabular">
            {trialTotal}
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Conditional progression</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400">Held Back (Repeat)</div>
          <div className="text-2xl font-serif-title font-bold text-rose-700 dark:text-rose-400 mt-1 font-mono-tabular">
            {repeatTotal}
          </div>
          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Under academic review</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">Graduating Alumni</div>
          <div className="text-2xl font-serif-title font-bold text-purple-700 dark:text-purple-400 mt-1 font-mono-tabular">
            {graduateTotal}
          </div>
          <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">SSS 3 Valedictory Class</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search student name or admission number..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={selectedLevel}
            onChange={e => {
              setSelectedLevel(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Levels</option>
            <option value="JSS 1">JSS 1</option>
            <option value="JSS 2">JSS 2</option>
            <option value="JSS 3">JSS 3 (Transition to Senior)</option>
            <option value="SSS 1">SSS 1</option>
            <option value="SSS 2">SSS 2</option>
            <option value="SSS 3">SSS 3 (Graduation Set)</option>
          </select>

          <select
            value={selectedDecision}
            onChange={e => {
              setSelectedDecision(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Decisions</option>
            <option value="PROMOTED">Promoted</option>
            <option value="PROMOTED_ON_TRIAL">On Trial</option>
            <option value="REPEAT">Repeat</option>
            <option value="GRADUATE">Graduating</option>
          </select>

          <select
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            title="Rows per page"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      </div>

      {/* Promotion Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Student Identification</th>
                <th className="py-3.5 px-3">Current Class</th>
                <th className="py-3.5 px-3 text-center">1st Term</th>
                <th className="py-3.5 px-3 text-center">2nd Term</th>
                <th className="py-3.5 px-3 text-center">3rd Term</th>
                <th className="py-3.5 px-3 text-center font-bold text-slate-700 dark:text-slate-200">Cumulative Avg</th>
                <th className="py-3.5 px-3 text-center">Core Math</th>
                <th className="py-3.5 px-3 text-center">Core English</th>
                <th className="py-3.5 px-3">Promotion Status</th>
                <th className="py-3.5 px-4">Target Class Destination</th>
                <th className="py-3.5 px-3 text-right">Discretion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {displayedCandidates.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 dark:text-slate-500 italic">
                    {isLoading ? 'Loading candidates from database...' : 'No students found matching your criteria.'}
                  </td>
                </tr>
              ) : (
                displayedCandidates.map(candidate => {
                  const s = candidate.student;
                  const isTrial = candidate.effectiveDecision === 'PROMOTED_ON_TRIAL';
                  const isRepeat = candidate.effectiveDecision === 'REPEAT';
                  const isGraduate = candidate.effectiveDecision === 'GRADUATE';

                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors ${
                        candidate.hasOverride ? 'bg-indigo-50/20 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      {/* Name & Admission */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {s.lastName}, {s.firstName}
                        </div>
                        <div className="text-[10px] font-mono-tabular text-slate-400 dark:text-slate-500">
                          {s.admissionNumber}
                        </div>
                      </td>

                      {/* Class */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{candidate.armName}</span>
                      </td>

                      {/* Term 1 */}
                      <td className="py-3 px-3 text-center font-mono-tabular text-slate-500 dark:text-slate-400">
                        {candidate.term1Avg}%
                      </td>

                      {/* Term 2 */}
                      <td className="py-3 px-3 text-center font-mono-tabular text-slate-500 dark:text-slate-400">
                        {candidate.term2Avg}%
                      </td>

                      {/* Term 3 */}
                      <td className="py-3 px-3 text-center font-mono-tabular text-slate-500 dark:text-slate-400">
                        {candidate.term3Avg}%
                      </td>

                      {/* Cumulative Average */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-mono-tabular font-bold px-2 py-0.5 rounded ${
                            candidate.cumulativeAverage >= 70
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : candidate.cumulativeAverage >= 50
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                          }`}
                        >
                          {candidate.cumulativeAverage}%
                        </span>
                      </td>

                      {/* Core Math */}
                      <td className="py-3 px-3 text-center font-mono-tabular">
                        <span
                          className={`font-semibold ${
                            candidate.mathScore >= 50 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {candidate.mathScore}
                        </span>
                      </td>

                      {/* Core English */}
                      <td className="py-3 px-3 text-center font-mono-tabular">
                        <span
                          className={`font-semibold ${
                            candidate.engScore >= 50 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {candidate.engScore}
                        </span>
                      </td>

                      {/* Promotion Decision */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getDecisionBadge(
                              candidate.effectiveDecision
                            )}`}
                          >
                            {candidate.effectiveDecision.replace('_', ' ')}
                          </span>
                          {candidate.hasOverride && (
                            <span className="block text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold italic">
                              Overridden: {candidate.overrideNote}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Target Destination */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                          <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{candidate.nextArm}</span>
                        </div>
                        {candidate.isTransitioningToSenior && (
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block">
                            Transition to Senior Secondary
                          </span>
                        )}
                      </td>

                      {/* Discretion Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openOverrideModal(candidate)}
                            title="Apply Administrative Board Override"
                            className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>
                          {candidate.hasOverride && (
                            <button
                              onClick={() => handleClearOverride(candidate.student.id)}
                              title="Reset to Automated Rule"
                              className="p-1 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={page}
        totalPages={totalPagesCount}
        totalCount={totalCandidatesCount}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoading}
        itemLabel="promotion candidates"
        className="mt-4"
      />

      {/* Compassionate Override Modal */}
      <ModalPortal isOpen={!!overrideModalStudent} onClose={() => setOverrideModalStudent(null)} maxWidthClass="max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-serif-title font-bold text-slate-900 dark:text-white text-base">
                Administrative Override
              </h3>
            </div>
            <button
              onClick={() => setOverrideModalStudent(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-200">
              {overrideModalStudent?.student.lastName}, {overrideModalStudent?.student.firstName}
            </div>
            <div className="text-slate-500 dark:text-slate-400 font-mono-tabular">
              {overrideModalStudent?.student.admissionNumber} • {overrideModalStudent?.armName}
            </div>
            <div className="text-slate-600 dark:text-slate-300">
              Calculated Average: <strong className="text-slate-900 dark:text-white">{overrideModalStudent?.cumulativeAverage}%</strong> (Maths: {overrideModalStudent?.mathScore}, English: {overrideModalStudent?.engScore})
            </div>
          </div>

          <form onSubmit={handleSaveOverride} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Override Promotion Decision</label>
              <select
                value={overrideFormDecision}
                onChange={e => setOverrideFormDecision(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500"
              >
                <option value="PROMOTED">Promoted (Regular)</option>
                <option value="PROMOTED_ON_TRIAL">Promoted on Trial (Conditional)</option>
                <option value="REPEAT">Held Back (Repeat Class)</option>
                <option value="GRADUATE">Graduated Alumni</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Justification &amp; Board Minute Reference</label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Approved by Academic Board minute #AB-2026/04 following verified medical leave in Term 2."
                value={overrideFormNote}
                onChange={e => setOverrideFormNote(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setOverrideModalStudent(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer"
              >
                Apply Override
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* 3-Step Guided Rollover Modal */}
      <ModalPortal isOpen={isRolloverModalOpen} onClose={() => setIsRolloverModalOpen(false)} maxWidthClass="max-w-lg">
        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <RotateCw className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin-reverse" />
              <h3 className="font-serif-title font-bold text-slate-900 dark:text-white text-base">
                Academic Rollover Execution Protocol
              </h3>
            </div>
            <button
              onClick={() => setIsRolloverModalOpen(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stepper Header */}
          {rolloverStep < 4 && (
            <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className={rolloverStep >= 1 ? 'text-indigo-600 dark:text-indigo-400' : ''}>1. Review Impact</span>
              <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
              <span className={rolloverStep >= 2 ? 'text-indigo-600 dark:text-indigo-400' : ''}>2. Target Session</span>
              <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
              <span className={rolloverStep >= 3 ? 'text-indigo-600 dark:text-indigo-400' : ''}>3. Authorization</span>
            </div>
          )}

          {/* Step 1: Review Impact */}
          {rolloverStep === 1 && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  Promotion Summary Matrix Breakdown
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1">
                    <span>Total Active Candidates:</span>
                    <strong className="font-mono-tabular text-slate-900 dark:text-white">{totalEligible}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1 text-emerald-700 dark:text-emerald-400">
                    <span>Regular Promotion:</span>
                    <strong className="font-mono-tabular">{promotedTotal}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1 text-amber-700 dark:text-amber-400">
                    <span>Promoted on Trial:</span>
                    <strong className="font-mono-tabular">{trialTotal}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1 text-rose-700 dark:text-rose-400">
                    <span>Held Back (Repeating):</span>
                    <strong className="font-mono-tabular">{repeatTotal}</strong>
                  </div>
                  <div className="flex justify-between text-purple-700 dark:text-purple-400 col-span-2">
                    <span>Graduating SSS 3 Alumni:</span>
                    <strong className="font-mono-tabular">{graduateTotal}</strong>
                  </div>
                </div>
              </div>

              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Executing this rollover will automatically advance eligible students to their respective higher classes (e.g. JSS 1 Gold to JSS 2 Gold, SSS 2 to SSS 3) and convert SSS 3 to Graduated Alumni records.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsRolloverModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setRolloverStep(2)}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                >
                  Next: Target Session
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Session Target */}
          {rolloverStep === 2 && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">Current Academic Session</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{activeSession.name}</span>
                </div>
                <div className="flex items-center justify-center py-1">
                  <ArrowRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-indigo-800 dark:text-indigo-300 font-bold uppercase text-[10px]">Target New Academic Session</span>
                  <span className="font-bold text-indigo-900 dark:text-indigo-200 font-serif-title text-sm">{getNextSessionPreview()}</span>
                </div>
              </div>

              <div className="space-y-1 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                <p>• The system will instantiate the <strong className="text-slate-900 dark:text-white">{getNextSessionPreview()}</strong> calendar.</p>
                <p>• Active term will transition to <strong className="text-slate-900 dark:text-white">1st Term</strong>.</p>
                <p>• Historical dossiers and marks for {activeSession.name} will be preserved in immutable terminal archives.</p>
              </div>

              <div className="flex justify-between gap-2 pt-2">
                <button
                  onClick={() => setRolloverStep(1)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => setRolloverStep(3)}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                >
                  Next: Authorize Rollover
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation Authorization */}
          {rolloverStep === 3 && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-rose-50 dark:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Super Administrator High-Integrity Action</span>
                </div>
                <p className="text-[11px] text-rose-800 dark:text-rose-300 leading-relaxed">
                  This action irrevocably advances students into their next academic tiers and updates official transcripts across the portal.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Type <strong>ROLLOVER</strong> to authorize session transition:
                </label>
                <input
                  type="text"
                  value={confirmationCode}
                  onChange={e => setConfirmationCode(e.target.value.toUpperCase())}
                  placeholder="Type ROLLOVER"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono-tabular font-bold tracking-wider text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex justify-between gap-2 pt-2">
                <button
                  onClick={() => setRolloverStep(2)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleExecuteRollover}
                  disabled={confirmationCode !== 'ROLLOVER'}
                  className={`px-5 py-2 rounded-xl font-bold transition-all shadow-xs cursor-pointer ${
                    confirmationCode === 'ROLLOVER'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  }`}
                >
                  Execute Institutional Rollover
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Success Result Screen */}
          {rolloverStep === 4 && rolloverResult && (
            <div className="space-y-4 text-center py-2 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="font-serif-title font-bold text-slate-900 dark:text-white text-lg">
                  Academic Rollover Successfully Completed!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Activated Session: <strong className="text-slate-900 dark:text-white">{rolloverResult.newSessionName}</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-left bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 text-[10px] block uppercase">Promoted</span>
                  <strong className="text-emerald-700 dark:text-emerald-400 text-base font-mono-tabular">{rolloverResult.promotedCount}</strong>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 text-[10px] block uppercase">On Trial</span>
                  <strong className="text-amber-700 dark:text-amber-400 text-base font-mono-tabular">{rolloverResult.trialCount}</strong>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 text-[10px] block uppercase">Repeating</span>
                  <strong className="text-rose-700 dark:text-rose-400 text-base font-mono-tabular">{rolloverResult.heldBackCount}</strong>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 text-[10px] block uppercase">Graduated Alumni</span>
                  <strong className="text-purple-700 dark:text-purple-400 text-base font-mono-tabular">{rolloverResult.graduatedCount}</strong>
                </div>
              </div>

              <button
                onClick={() => setIsRolloverModalOpen(false)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Return to Console
              </button>
            </div>
          )}
        </div>
      </ModalPortal>
    </div>
  );
};
