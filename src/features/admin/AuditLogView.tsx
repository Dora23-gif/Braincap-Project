import React, { useState } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { AuditLogAction } from '../../types';
import {
  History,
  ShieldCheck,
  Search,
  Download,
  Clock,
  User,
  ArrowRight,
  AlertCircle,
  Lock,
  RotateCw,
  SlidersHorizontal,
  KeyRound,
  Sparkles,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { PaginationControls } from '../../components/common/PaginationControls';
import { api, PaginatedResponse } from '../../lib/api';

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useSchoolData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [serverLogs, setServerLogs] = useState<any[] | null>(null);
  const [serverTotalCount, setServerTotalCount] = useState<number | null>(null);
  const [serverTotalPages, setServerTotalPages] = useState<number | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(false);

  // Fetch paginated audit logs from backend
  React.useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsLoadingPage(true);
      try {
        const queryParams: Record<string, any> = {
          page,
          page_size: pageSize,
        };
        if (searchTerm.trim()) {
          queryParams.search = searchTerm.trim();
        }
        if (selectedAction !== 'ALL') {
          queryParams.action = selectedAction;
        }
        if (selectedRole !== 'ALL') {
          queryParams.user_role = selectedRole;
        }

        const res = await api.get<PaginatedResponse<any>>('/governance/audit-logs/', queryParams);
        if (!isCancelled && res && Array.isArray(res.results)) {
          setServerLogs(
            res.results.map(r => ({
              id: r.id,
              timestamp: r.timestamp,
              userId: r.user ? String(r.user) : undefined,
              userName: r.user_name || 'System',
              userIdentifier: r.user_identifier || 'SYS-001',
              userRole: r.user_role || 'SUPER_ADMIN',
              action: r.action,
              targetEntity: r.target_entity,
              details: r.details,
              diff: r.diff,
              metadata: r.metadata,
            }))
          );
          setServerTotalCount(res.count);
          setServerTotalPages(res.total_pages || Math.ceil(res.count / pageSize));
        }
      } catch (err) {
        if (!isCancelled) {
          setServerLogs(null);
          setServerTotalCount(null);
          setServerTotalPages(null);
        }
      } finally {
        if (!isCancelled) setIsLoadingPage(false);
      }
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [page, pageSize, searchTerm, selectedAction, selectedRole]);

  // Filter logs (client fallback when backend is unreachable or local mock data is used)
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.targetEntity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.metadata?.reason && log.metadata.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.metadata?.ticketId && log.metadata.ticketId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;
    const matchesRole = selectedRole === 'ALL' || log.userRole === selectedRole;

    return matchesSearch && matchesAction && matchesRole;
  });

  const displayedLogs = React.useMemo(() => {
    if (serverLogs !== null) {
      return serverLogs;
    }
    const start = (page - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [serverLogs, filteredLogs, page, pageSize]);

  const totalCount = serverTotalCount !== null ? serverTotalCount : filteredLogs.length;
  const totalPages = serverTotalPages !== null ? serverTotalPages : Math.max(1, Math.ceil(filteredLogs.length / pageSize));

  // Friendly human action badges
  const getActionInfo = (action: AuditLogAction) => {
    switch (action) {
      case 'SCORE_OVERRIDE':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
          icon: SlidersHorizontal,
          label: 'Score Change'
        };
      case 'GRADE_LOCK_TOGGLE':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
          icon: Lock,
          label: 'Sheet Lock / Unlock'
        };
      case 'SESSION_ROLLOVER':
        return {
          bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
          icon: RotateCw,
          label: 'Academic Rollover'
        };
      case 'USER_SUSPENDED':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
          icon: AlertCircle,
          label: 'Account Suspended'
        };
      case 'USER_ROLE_CHANGE':
        return {
          bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
          icon: User,
          label: 'Role Updated'
        };
      case 'PIN_RESET':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
          icon: KeyRound,
          label: 'PIN / Password Reset'
        };
      case 'SETTINGS_UPDATED':
      default:
        return {
          bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          icon: Sparkles,
          label: 'Settings Updated'
        };
    }
  };

  // Convert role codes into clean, readable titles
  const formatRole = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'PRINCIPAL':
        return 'Principal';
      case 'VICE_PRINCIPAL_ACADEMICS':
        return 'Vice Principal (Academics)';
      case 'VICE_PRINCIPAL_ADMIN':
      case 'VICE_PRINCIPAL':
        return 'Vice Principal';
      case 'EXAM_OFFICER':
        return 'Exam Officer';
      case 'FORM_MASTER':
        return 'Form Master';
      case 'TEACHER':
        return 'Teacher';
      case 'ACCOUNTANT':
        return 'Bursar / Accountant';
      default:
        return role.replace(/_/g, ' ');
    }
  };

  // Format date and time simply
  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return { date: iso, time: '' };
      return {
        date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      };
    } catch {
      return { date: iso, time: '' };
    }
  };

  // Format field names cleanly (e.g. ca1Score -> 1st CA Score, score -> Score)
  const formatFieldName = (field: string): string => {
    const fieldMap: Record<string, string> = {
      score: 'Score',
      totalScore: 'Total Score',
      total_score: 'Total Score',
      ca1Score: '1st CA Score',
      ca1_score: '1st CA Score',
      ca2Score: '2nd CA Score',
      ca2_score: '2nd CA Score',
      ca_score: 'CA Score',
      examScore: 'Exam Score',
      exam_score: 'Exam Score',
      isLocked: 'Locked',
      is_locked: 'Locked',
      status: 'Status',
      role: 'Role',
      activeRole: 'Role',
      isActive: 'Active Status',
      is_active: 'Active Status',
      pin: 'PIN',
      password: 'Password',
      reason: 'Reason',
    };
    if (fieldMap[field]) return fieldMap[field];
    return field
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Strip JSON formatting quotes and simplify values
  const formatChangeValue = (val: any): string => {
    if (val === null || val === undefined || val === '') return 'None';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    const str = String(val);
    // Remove surrounding quotes if it was a JSON stringified value
    if (str.startsWith('"') && str.endsWith('"')) {
      return str.slice(1, -1);
    }
    return str;
  };

  const exportToCSV = () => {
    const headers = ['Date & Time', 'Person', 'Role', 'Action', 'Target / Subject', 'Details', 'Reason', 'Changes'];
    const rows = filteredLogs.map(log => {
      const { date, time } = formatDateTime(log.timestamp);
      const changesStr = (log.diff || [])
        .map((d: any) => `${formatFieldName(d.field)}: ${formatChangeValue(d.previousValue)} → ${formatChangeValue(d.newValue)}`)
        .join('; ');

      return [
        `"${date} ${time}"`,
        `"${log.userName} (${log.userIdentifier || ''})"`,
        `"${formatRole(log.userRole)}"`,
        `"${getActionInfo(log.action).label}"`,
        `"${(log.targetEntity || '').replace(/"/g, '""')}"`,
        `"${(log.details || '').replace(/"/g, '""')}"`,
        `"${(log.metadata?.reason || '').replace(/"/g, '""')}"`,
        `"${changesStr.replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Activity_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 flex items-center justify-center">
              <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="font-serif-title font-bold text-slate-900 dark:text-white text-xl tracking-tight">
              Activity History
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            A clear, step-by-step record of actions taken across the school portal, including score updates, lock changes, and account activities.
          </p>
        </div>

        <button
          onClick={exportToCSV}
          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span>Export History (CSV)</span>
        </button>
      </div>

      {/* Reassuring, Simple Activity Summary Banner */}
      <div className="bg-indigo-900/90 dark:bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-indigo-800/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-800 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-indigo-700/80 dark:border-slate-700">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-bold flex items-center gap-2 text-white">
              <span>Secure Activity Log</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-medium">
                <CheckCircle2 className="w-3 h-3" />
                Automatic & Protected
              </span>
            </div>
            <p className="text-xs text-indigo-200 dark:text-slate-400 mt-0.5">
              All important activities are permanently saved here so you can easily see who made changes, what was updated, and when.
            </p>
          </div>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-indigo-950/80 dark:bg-slate-800/90 border border-indigo-800 dark:border-slate-700 text-xs font-medium text-indigo-200 dark:text-slate-300 shrink-0 self-end sm:self-auto">
          <span className="font-bold text-white mr-1.5">{totalCount}</span>
          <span>{totalCount === 1 ? 'Action Recorded' : 'Actions Recorded'}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search by person, student, subject, or reason..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={selectedAction}
            onChange={e => {
              setSelectedAction(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Actions</option>
            <option value="SCORE_OVERRIDE">Score Changes</option>
            <option value="GRADE_LOCK_TOGGLE">Sheet Locks & Unlocks</option>
            <option value="SESSION_ROLLOVER">Academic Rollovers</option>
            <option value="USER_SUSPENDED">Account Suspensions</option>
            <option value="USER_ROLE_CHANGE">Role Updates</option>
            <option value="PIN_RESET">PIN & Password Resets</option>
            <option value="SETTINGS_UPDATED">Settings Updates</option>
          </select>

          <select
            value={selectedRole}
            onChange={e => {
              setSelectedRole(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="PRINCIPAL">Principal</option>
            <option value="VICE_PRINCIPAL">Vice Principal</option>
            <option value="EXAM_OFFICER">Exam Officer</option>
            <option value="FORM_MASTER">Form Master</option>
            <option value="TEACHER">Teacher</option>
          </select>
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="space-y-3.5">
        {displayedLogs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <History className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {isLoadingPage ? 'Loading activity history...' : 'No activity records found matching your search or filters.'}
            </p>
          </div>
        ) : (
          displayedLogs.map(log => {
            const actionInfo = getActionInfo(log.action);
            const ActionIcon = actionInfo.icon;
            const { date, time } = formatDateTime(log.timestamp);
            const hasDiff = Array.isArray(log.diff) && log.diff.length > 0;
            const hasReason = Boolean(log.metadata?.reason);

            return (
              <div
                key={log.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3.5"
              >
                {/* Header Row: Action badge, target entity, and Date/Time */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${actionInfo.bg}`}
                    >
                      <ActionIcon className="w-3.5 h-3.5" />
                      <span>{actionInfo.label}</span>
                    </span>

                    {log.targetEntity && (
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {log.targetEntity}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span>
                      <strong className="font-semibold text-slate-700 dark:text-slate-300">{date}</strong>
                      {time && <span> at {time}</span>}
                    </span>
                  </div>
                </div>

                {/* Structured Information with Simple, Clear Labels */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 text-xs">
                  {/* Person & Role */}
                  <div className="md:col-span-4 lg:col-span-3 space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wide block">
                        Person
                      </span>
                      <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                        {log.userName}
                      </div>
                      {log.userIdentifier && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular">
                          ID: {log.userIdentifier}
                        </div>
                      )}
                    </div>

                    <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wide block">
                        Role
                      </span>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] border border-indigo-100 dark:border-indigo-800/60">
                        {formatRole(log.userRole)}
                      </span>
                    </div>
                  </div>

                  {/* Details, Reason & Changes */}
                  <div className="md:col-span-8 lg:col-span-9 space-y-2.5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wide block mb-0.5">
                        Details
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                        {log.details}
                      </p>
                    </div>

                    {/* Reason (when applicable) */}
                    {hasReason && (
                      <div className="bg-amber-50/80 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/70 dark:border-amber-900/50 text-xs">
                        <div className="flex items-start gap-1.5">
                          <span className="font-bold text-amber-900 dark:text-amber-300 shrink-0">
                            Reason:
                          </span>
                          <span className="text-amber-800 dark:text-amber-200">
                            {log.metadata.reason}
                          </span>
                          {log.metadata?.ticketId && (
                            <span className="ml-auto font-mono-tabular text-[11px] font-semibold text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded">
                              Ref #{log.metadata.ticketId}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Changes (Score: 48 → 55) */}
                    {hasDiff && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wide block">
                          Changes
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {log.diff.map((item: any, idx: number) => {
                            const fieldLabel = formatFieldName(item.field);
                            const oldVal = formatChangeValue(item.previousValue);
                            const newVal = formatChangeValue(item.newValue);

                            return (
                              <div
                                key={idx}
                                className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs shadow-2xs"
                              >
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {fieldLabel}:
                                </span>
                                <span className="line-through text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded font-medium border border-rose-200/50 dark:border-rose-900/40">
                                  {oldVal}
                                </span>
                                <ArrowRight className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                                <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-900/40">
                                  {newVal}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoadingPage}
        itemLabel="recorded actions"
        className="mt-6"
      />
    </div>
  );
};
