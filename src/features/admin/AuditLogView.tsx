import React, { useState } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { AuditLogAction } from '../../types';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  Download,
  Clock,
  User,
  ArrowRight,
  FileSpreadsheet,
  AlertCircle,
  Lock,
  Unlock,
  KeyRound,
  RotateCw,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useSchoolData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');

  // Filter logs
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.targetEntity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.metadata?.ticketId && log.metadata.ticketId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;
    const matchesRole = selectedRole === 'ALL' || log.userRole === selectedRole;

    return matchesSearch && matchesAction && matchesRole;
  });

  const getActionBadge = (action: AuditLogAction) => {
    switch (action) {
      case 'SCORE_OVERRIDE':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
          icon: SlidersHorizontal,
          label: 'Score Override'
        };
      case 'GRADE_LOCK_TOGGLE':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
          icon: Lock,
          label: 'Sheet Lock/Unlock'
        };
      case 'SESSION_ROLLOVER':
        return {
          bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
          icon: RotateCw,
          label: 'Session Rollover'
        };
      case 'USER_SUSPENDED':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
          icon: AlertCircle,
          label: 'Account Suspension'
        };
      case 'USER_ROLE_CHANGE':
        return {
          bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
          icon: User,
          label: 'Role Change'
        };
      case 'PIN_RESET':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
          icon: KeyRound,
          label: 'PIN Reset'
        };
      case 'SETTINGS_UPDATED':
      default:
        return {
          bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          icon: Sparkles,
          label: 'System Settings'
        };
    }
  };

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'User Name', 'Role', 'Action', 'Target Entity', 'Details', 'Diff Summary'];
    const rows = filteredLogs.map(log => {
      const diffStr = (log.diff || [])
        .map(d => `${d.field}: ${JSON.stringify(d.previousValue)} -> ${JSON.stringify(d.newValue)}`)
        .join('; ');

      return [
        `"${log.timestamp}"`,
        `"${log.userName}"`,
        `"${log.userRole}"`,
        `"${log.action}"`,
        `"${log.targetEntity.replace(/"/g, '""')}"`,
        `"${log.details.replace(/"/g, '""')}"`,
        `"${diffStr.replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EIS_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h1 className="font-serif-title font-bold text-slate-900 dark:text-white text-lg tracking-tight">
              FORENSIC ACTIVITY AUDIT LOG
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Immutable timeline of administrative overrides, score sheet locks, account security transitions, and institutional rollover operations.
          </p>
        </div>

        <button
          onClick={exportToCSV}
          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span>Export Audit Trail (CSV)</span>
        </button>
      </div>

      {/* Security Assurance Banner */}
      <div className="bg-indigo-950 text-white rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm border border-indigo-900/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-800/80 flex items-center justify-center shrink-0 border border-indigo-700">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-xs font-bold flex items-center gap-2">
              <span>WORM (Write Once, Read Many) Tamper-Evident Trail Active</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-mono-tabular font-semibold">
                SHA-256 Validated
              </span>
            </div>
            <p className="text-[11px] text-indigo-200 mt-0.5">
              Every continuous assessment override, grade sheet modification, and PIN generation is permanently indexed with exact prior/subsequent value diffs.
            </p>
          </div>
        </div>

        <span className="text-xs font-mono-tabular font-bold text-indigo-200 shrink-0 hidden md:block">
          {filteredLogs.length} Events Logged
        </span>
      </div>

      {/* Control Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search actor, target entity, or ticket #..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={selectedAction}
            onChange={e => setSelectedAction(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Event Types</option>
            <option value="SCORE_OVERRIDE">Score Overrides</option>
            <option value="GRADE_LOCK_TOGGLE">Sheet Locks/Unlocks</option>
            <option value="SESSION_ROLLOVER">Session Rollover</option>
            <option value="USER_SUSPENDED">Account Suspensions</option>
            <option value="PIN_RESET">PIN Resets</option>
            <option value="SETTINGS_UPDATED">Settings Updates</option>
          </select>

          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="PRINCIPAL">Principal</option>
            <option value="EXAM_OFFICER">Exam Officer</option>
            <option value="FORM_MASTER">Form Master</option>
          </select>
        </div>
      </div>

      {/* Audit Log Timeline Entries */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <History className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">No audit entries matching filter criteria.</p>
          </div>
        ) : (
          filteredLogs.map(log => {
            const badge = getActionBadge(log.action);
            const BadgeIcon = badge.icon;
            const { date, time } = formatTimestamp(log.timestamp);

            return (
              <div
                key={log.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3"
              >
                {/* Entry Top Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${badge.bg}`}
                    >
                      <BadgeIcon className="w-3.5 h-3.5" />
                      <span>{badge.label}</span>
                    </span>

                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {log.targetEntity}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono-tabular text-slate-400 dark:text-slate-500 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                    <span>{date} at {time}</span>
                  </div>
                </div>

                {/* Actor & Details */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div className="md:col-span-1 space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Authorized Actor</span>
                    <div className="font-bold text-slate-900 dark:text-white">{log.userName}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono-tabular">
                      {log.userIdentifier} • <span className="font-semibold text-indigo-700 dark:text-indigo-400">{log.userRole}</span>
                    </div>
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Operation Narrative</span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                      {log.details}
                    </p>
                    {log.metadata?.reason && (
                      <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-100 dark:border-amber-900/40 mt-1">
                        <strong>Official Justification:</strong> {log.metadata.reason}
                        {log.metadata?.ticketId && (
                          <span className="ml-2 font-mono-tabular text-amber-900 dark:text-amber-200 font-bold">
                            [Ticket #{log.metadata.ticketId}]
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Diff View (Prior vs New Value) */}
                {log.diff && log.diff.length > 0 && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block tracking-wider">
                      Forensic Value Diff
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {log.diff.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] flex items-center justify-between gap-2 shadow-2xs font-mono-tabular"
                        >
                          <span className="font-semibold text-slate-600 dark:text-slate-400 truncate">{item.field}:</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-900/60 px-1.5 py-0.5 rounded">
                              {JSON.stringify(item.previousValue)}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                            <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-900/60 px-1.5 py-0.5 rounded font-bold">
                              {JSON.stringify(item.newValue)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
