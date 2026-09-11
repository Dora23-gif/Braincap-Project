import React, { useState, useMemo } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import { DisciplinaryIncident, CampusExeat, IncidentSeverity, IncidentStatus, ExeatType } from '../../types';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  UserX,
  FileText,
  Clock,
  CheckCircle2,
  Filter,
  Search,
  Plus,
  ArrowRight,
  ExternalLink,
  Printer,
  Calendar,
  Building,
  Phone,
  Send,
  X,
  UserCheck,
  ChevronRight,
  MapPin,
  Stamp
} from 'lucide-react';
import { FuturisticPageShell } from '../../components/common/FuturisticPageShell';
import { FuturisticKPICard } from '../../components/common/FuturisticKPICard';
import { SegmentedControl, SegmentedControlOption } from '../../components/common/SegmentedControl';

export const VPAdminDashboardView: React.FC = () => {
  const {
    students,
    classArms,
    affectiveTraits,
    disciplinaryIncidents,
    campusExeats,
    addDisciplinaryIncident,
    resolveDisciplinaryIncident,
    escalateDisciplinaryIncident,
    approveCampusExeat,
    markExeatReturned,
    rejectCampusExeat,
    schoolSettings,
    activeSession,
    activeTerm
  } = useSchoolData();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'DISCIPLINE' | 'ABSENTEEISM' | 'EXEATS'>('DISCIPLINE');

  // Discipline state
  const [discSearch, setDiscSearch] = useState('');
  const [discStatusFilter, setDiscStatusFilter] = useState<string>('ALL');
  const [discSeverityFilter, setDiscSeverityFilter] = useState<string>('ALL');
  const [isNewIncidentOpen, setIsNewIncidentOpen] = useState(false);
  const [resolvingIncident, setResolvingIncident] = useState<DisciplinaryIncident | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // New incident form state
  const [newStudentId, setNewStudentId] = useState('');
  const [newIncidentType, setNewIncidentType] = useState<DisciplinaryIncident['incidentType']>('UNIFORM_DRESS_CODE');
  const [newSeverity, setNewSeverity] = useState<IncidentSeverity>('MEDIUM');
  const [newActionTaken, setNewActionTaken] = useState<DisciplinaryIncident['actionTaken']>('CAMPUS_DETENTION');
  const [newDemerits, setNewDemerits] = useState<number>(5);
  const [newDescription, setNewDescription] = useState('');

  // Truancy / Absenteeism state
  const [truancyArmFilter, setTruancyArmFilter] = useState('ALL');
  const [summonsStudent, setSummonsStudent] = useState<any | null>(null);

  // Exeat state
  const [exeatStatusFilter, setExeatStatusFilter] = useState('ALL');
  const [viewingExeatPass, setViewingExeatPass] = useState<CampusExeat | null>(null);

  // Chronic Absenteeism calculation (< 85% attendance)
  const chronicAbsenteeismList = useMemo(() => {
    const list: {
      student: any;
      daysPresent: number;
      daysAbsent: number;
      totalDays: number;
      attendanceRate: number;
      classArmName: string;
    }[] = [];

    students.forEach(student => {
      if (truancyArmFilter !== 'ALL' && student.currentClassArmId !== truancyArmFilter) return;

      const trait = affectiveTraits.find(t => t.studentId === student.id && t.termId === activeTerm.id);
      const daysPresent = trait ? trait.daysPresent : 62;
      const daysAbsent = trait ? trait.daysAbsent : 3;
      const totalDays = trait ? trait.totalSchoolDays : 65;
      const attendanceRate = totalDays > 0 ? Math.round((daysPresent / totalDays) * 100) : 100;

      if (attendanceRate < 85) {
        list.push({
          student,
          daysPresent,
          daysAbsent,
          totalDays,
          attendanceRate,
          classArmName: student.currentClassArmName
        });
      }
    });

    return list.sort((a, b) => a.attendanceRate - b.attendanceRate);
  }, [students, affectiveTraits, activeTerm.id, truancyArmFilter]);

  // Metric summaries
  const openIncidentsCount = useMemo(() => {
    return disciplinaryIncidents.filter(i => i.status === 'OPEN').length;
  }, [disciplinaryIncidents]);

  const totalDemeritsAccumulated = useMemo(() => {
    return disciplinaryIncidents.reduce((acc, curr) => acc + curr.demeritPoints, 0);
  }, [disciplinaryIncidents]);

  const activeExeatsCount = useMemo(() => {
    return campusExeats.filter(e => e.status === 'ACTIVE_OFF_CAMPUS' || e.status === 'APPROVED').length;
  }, [campusExeats]);

  // Filtered Disciplinary Incidents
  const filteredIncidents = useMemo(() => {
    return disciplinaryIncidents.filter(i => {
      const q = discSearch.toLowerCase();
      const matchSearch = i.studentName.toLowerCase().includes(q) ||
        i.admissionNumber.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q);
      const matchStatus = discStatusFilter === 'ALL' || i.status === discStatusFilter;
      const matchSeverity = discSeverityFilter === 'ALL' || i.severity === discSeverityFilter;
      return matchSearch && matchStatus && matchSeverity;
    });
  }, [disciplinaryIncidents, discSearch, discStatusFilter, discSeverityFilter]);

  // Filtered Exeats
  const filteredExeats = useMemo(() => {
    return campusExeats.filter(e => {
      return exeatStatusFilter === 'ALL' || e.status === exeatStatusFilter;
    });
  }, [campusExeats, exeatStatusFilter]);

  const handleCreateIncident = (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find(s => s.id === newStudentId);
    if (!st) return;

    addDisciplinaryIncident({
      studentId: st.id,
      studentName: st.name || `${st.firstName} ${st.lastName}`,
      admissionNumber: st.admissionNumber,
      classArmId: st.currentClassArmId,
      classArmName: st.currentClassArmName,
      incidentType: newIncidentType,
      severity: newSeverity,
      date: new Date().toISOString().split('T')[0],
      description: newDescription,
      actionTaken: newActionTaken,
      demeritPoints: newDemerits,
      recordedBy: user?.name || 'Mrs. Ayodele Tinubu (VP Admin)',
      status: 'OPEN'
    }, {
      id: user?.staffId || 'stf-004',
      name: user?.name || 'Mrs. Ayodele Tinubu',
      role: 'VICE_PRINCIPAL_ADMIN'
    });

    setIsNewIncidentOpen(false);
    setNewStudentId('');
    setNewDescription('');
    setNewDemerits(5);
  };

  const handleSaveResolution = () => {
    if (!resolvingIncident || !resolutionNotes) return;
    resolveDisciplinaryIncident(resolvingIncident.id, resolutionNotes, {
      id: user?.staffId || 'stf-004',
      name: user?.name || 'Mrs. Ayodele Tinubu',
      role: 'VICE_PRINCIPAL_ADMIN'
    });
    setResolvingIncident(null);
    setResolutionNotes('');
  };

  const handleEscalateIncident = (incident: DisciplinaryIncident) => {
    escalateDisciplinaryIncident(incident.id, 'Escalated to Principal for Disciplinary Committee Hearing and Statutory Review.', {
      id: user?.staffId || 'stf-004',
      name: user?.name || 'Mrs. Ayodele Tinubu',
      role: 'VICE_PRINCIPAL_ADMIN'
    });
  };

  const VP_ADMIN_TABS: SegmentedControlOption<'DISCIPLINE' | 'ABSENTEEISM' | 'EXEATS'>[] = [
    { id: 'DISCIPLINE', label: 'Disciplinary Ledger & Demerits', icon: ShieldAlert, count: disciplinaryIncidents.length },
    { id: 'ABSENTEEISM', label: 'Chronic Truancy & Parent Summons', icon: UserX, count: chronicAbsenteeismList.length },
    { id: 'EXEATS', label: 'Campus Exeat & Gate Passes', icon: Clock, count: campusExeats.length }
  ];

  return (
    <FuturisticPageShell
      title="VICE PRINCIPAL (ADMINISTRATION) COMMAND"
      subtitle={`Student discipline, demerit points registry, campus exeat authorization passes, and chronic absenteeism intervention (<85% attendance). Registered: ${students.length} Pupils.`}
      icon={ShieldAlert}
      badgeText={openIncidentsCount > 0 ? `${openIncidentsCount} Open Incidents` : 'Discipline In Order'}
      badgeVariant={openIncidentsCount > 0 ? 'warning' : 'success'}
      actions={
        <button
          onClick={() => setIsNewIncidentOpen(true)}
          className="touch-target px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Log Disciplinary Incident</span>
        </button>
      }
    >
      {/* 4 Key Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <FuturisticKPICard
          title="Open Demerit Cases"
          value={`${openIncidentsCount}`}
          subtitle="Pending hearing / action"
          icon={AlertTriangle}
          sparklineData={[8, 7, 6, 5, 4, openIncidentsCount]}
          glowColor="amber"
          trend={{ value: openIncidentsCount === 0 ? 'Clear' : `${openIncidentsCount} Active`, isPositive: openIncidentsCount === 0 }}
        />

        <FuturisticKPICard
          title="Demerit Points Total"
          value={`${totalDemeritsAccumulated} Pts`}
          subtitle="Recorded across 12 arms"
          icon={ShieldAlert}
          sparklineData={[120, 110, 95, 80, 70, totalDemeritsAccumulated]}
          glowColor="rose"
          trend={{ value: '-12% this month', isPositive: true }}
        />

        <FuturisticKPICard
          title="Active Campus Exeats"
          value={`${activeExeatsCount}`}
          subtitle="Authorized gate passes"
          icon={Clock}
          sparklineData={[3, 5, 4, 6, 5, activeExeatsCount]}
          glowColor="cyan"
          trend={{ value: 'All Verified', isPositive: true }}
        />

        <FuturisticKPICard
          title="Chronic Truancy Flag"
          value={`${chronicAbsenteeismList.length}`}
          subtitle="Attendance < 85%"
          icon={UserX}
          sparklineData={[6, 5, 4, 3, 2, chronicAbsenteeismList.length]}
          glowColor="rose"
          trend={{ value: `${chronicAbsenteeismList.length} Pupils Flagged`, isPositive: chronicAbsenteeismList.length === 0 }}
        />
      </div>

      {/* Tabs */}
      <SegmentedControl
        options={VP_ADMIN_TABS}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* TAB 1: DISCIPLINARY INCIDENTS & DEMERITS */}
      {activeTab === 'DISCIPLINE' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search offender name, admission, incident..."
                value={discSearch}
                onChange={e => setDiscSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={discStatusFilter}
                onChange={e => setDiscStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open Cases</option>
                <option value="RESOLVED">Resolved</option>
                <option value="ESCALATED_TO_PRINCIPAL">Escalated to Principal</option>
              </select>

              <select
                value={discSeverityFilter}
                onChange={e => setDiscSeverityFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="ALL">All Severities</option>
                <option value="LOW">Low (1-3 pts)</option>
                <option value="MEDIUM">Medium (4-6 pts)</option>
                <option value="HIGH">High (7-10 pts)</option>
                <option value="CRITICAL">Critical (11-20 pts)</option>
              </select>

              <button
                onClick={() => setIsNewIncidentOpen(true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Violation</span>
              </button>
            </div>
          </div>

          {/* Incident Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-4">Date & Candidate</th>
                    <th className="p-4">Violation Type</th>
                    <th className="p-4 text-center">Severity</th>
                    <th className="p-4 text-center">Demerit Points</th>
                    <th className="p-4">Disciplinary Action Taken</th>
                    <th className="p-4">Status & Notes</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredIncidents.map(inc => (
                    <tr key={inc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{inc.studentName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{inc.admissionNumber} &bull; {inc.classArmName}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{inc.date}</div>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {inc.incidentType.replace(/_/g, ' ')}
                        </span>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 max-w-xs line-clamp-1">
                          {inc.description}
                        </p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          inc.severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300/40'
                            : inc.severity === 'HIGH'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-300/40'
                            : inc.severity === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300/40'
                        }`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-mono font-bold text-sm border border-rose-200 dark:border-rose-900">
                          +{inc.demeritPoints}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-700 dark:text-slate-300">
                        {inc.actionTaken.replace(/_/g, ' ')}
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className="mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inc.status === 'RESOLVED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : inc.status === 'ESCALATED_TO_PRINCIPAL'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {inc.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {inc.resolutionNotes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-1">
                            {inc.resolutionNotes}
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inc.status === 'OPEN' && (
                            <>
                              <button
                                onClick={() => setResolvingIncident(inc)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-300/40 cursor-pointer"
                              >
                                Resolve
                              </button>
                              <button
                                onClick={() => handleEscalateIncident(inc)}
                                className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-semibold text-[11px] border border-purple-300/40 cursor-pointer"
                                title="Escalate to Principal for Disciplinary Committee Hearing"
                              >
                                Escalate
                              </button>
                            </>
                          )}
                          {inc.status !== 'OPEN' && (
                            <span className="text-slate-400 text-[11px] italic">Concluded</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CHRONIC ABSENTEEISM & TRUANCY */}
      {activeTab === 'ABSENTEEISM' && (
        <div className="space-y-6">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-xs">
              <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                Statutory Attendance Benchmark (75% Minimum Exam Threshold)
              </h3>
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                Students dropping below <strong>85% attendance</strong> are flagged for early administrative intervention. Under WAEC and Lagos State Ministry of Basic Education guidelines, candidates with less than <strong>75% term attendance</strong> are barred from sitting final terminal examinations.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                Flagged Truancy & Chronic Absenteeism List ({chronicAbsenteeismList.length} Students)
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={truancyArmFilter}
                  onChange={e => setTruancyArmFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                >
                  <option value="ALL">All Class Arms</option>
                  {classArms.map(arm => (
                    <option key={arm.id} value={arm.id}>{arm.fullName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-4">Candidate Details</th>
                    <th className="p-4">Class Arm</th>
                    <th className="p-4 text-center">Days Present / Total</th>
                    <th className="p-4 text-center">Days Absent</th>
                    <th className="p-4 text-center">Attendance %</th>
                    <th className="p-4">Guardian Contact</th>
                    <th className="p-4 text-right">Summons Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {chronicAbsenteeismList.map(item => {
                    const stName = item.student.name || `${item.student.firstName} ${item.student.lastName}`;
                    return (
                      <tr key={item.student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white">{stName}</div>
                          <div className="text-[11px] font-mono text-slate-400">{item.student.admissionNumber}</div>
                        </td>
                        <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{item.classArmName}</td>
                        <td className="p-4 text-center font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {item.daysPresent} / {item.totalDays}
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold font-mono">
                            {item.daysAbsent} Days
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                            item.attendanceRate < 75
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {item.attendanceRate}%
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{item.student.parentName || 'Registered Guardian'}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            <span>{item.student.parentPhone || '+234 800 000 0000'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSummonsStudent(item)}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Issue Summons</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CAMPUS EXEATS & GATE PASSES */}
      {activeTab === 'EXEATS' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              Campus Exeat & Security Movement Register
            </div>
            <div className="flex items-center gap-2">
              <select
                value={exeatStatusFilter}
                onChange={e => setExeatStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="ALL">All Exeat Statuses</option>
                <option value="APPROVED">Approved Passes</option>
                <option value="ACTIVE_OFF_CAMPUS">Active Off-Campus</option>
                <option value="RETURNED">Returned & Checked-In</option>
                <option value="PENDING">Pending Approval</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-4">Student & Class Arm</th>
                    <th className="p-4">Exeat Type</th>
                    <th className="p-4">Departure & Expected Return</th>
                    <th className="p-4">Destination & Reason</th>
                    <th className="p-4">Authorized Guardian</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Gate Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredExeats.map(ex => (
                    <tr key={ex.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{ex.studentName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{ex.admissionNumber} &bull; {ex.classArmName}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-200 border border-cyan-300/40">
                          {ex.exeatType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          Depart: {new Date(ex.departureDate).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Return: {new Date(ex.expectedReturnDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">{ex.destination}</div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{ex.reason}</p>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{ex.authorizedGuardian}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{ex.guardianPhone}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          ex.status === 'RETURNED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : ex.status === 'ACTIVE_OFF_CAMPUS'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : ex.status === 'APPROVED'
                            ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {ex.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {ex.status === 'PENDING' && (
                            <button
                              onClick={() => approveCampusExeat(ex.id, user?.name || 'Mrs. Ayodele Tinubu')}
                              className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-[11px] shadow-xs cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {(ex.status === 'ACTIVE_OFF_CAMPUS' || ex.status === 'APPROVED') && (
                            <button
                              onClick={() => markExeatReturned(ex.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Mark Returned</span>
                            </button>
                          )}
                          <button
                            onClick={() => setViewingExeatPass(ex)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center gap-1"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Slip</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LOG NEW DISCIPLINARY INCIDENT */}
      {isNewIncidentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Log Disciplinary Incident & Demerit Points
                </h3>
                <p className="text-xs text-slate-500">Official Student Affairs Sanction Form</p>
              </div>
              <button
                onClick={() => setIsNewIncidentOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Offending Student
                </label>
                <select
                  required
                  value={newStudentId}
                  onChange={e => setNewStudentId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.name || `${st.firstName} ${st.lastName}`} ({st.admissionNumber} - {st.currentClassArmName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Violation Type
                  </label>
                  <select
                    value={newIncidentType}
                    onChange={e => setNewIncidentType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="UNIFORM_DRESS_CODE">Uniform & Dress Code</option>
                    <option value="TARDINESS_TRUANCY">Tardiness / Truancy</option>
                    <option value="BULLYING_HARASSMENT">Bullying / Harassment</option>
                    <option value="DISRUPTIVE_BEHAVIOR">Disruptive Behavior</option>
                    <option value="ACADEMIC_DISHONESTY">Academic Dishonesty</option>
                    <option value="CONTRABAND_POSSESSION">Contraband Possession</option>
                    <option value="VANDALISM">Vandalism</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Severity Level
                  </label>
                  <select
                    value={newSeverity}
                    onChange={e => {
                      const sev = e.target.value as IncidentSeverity;
                      setNewSeverity(sev);
                      if (sev === 'LOW') setNewDemerits(2);
                      else if (sev === 'MEDIUM') setNewDemerits(5);
                      else if (sev === 'HIGH') setNewDemerits(10);
                      else if (sev === 'CRITICAL') setNewDemerits(15);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="LOW">Low (1-3 pts)</option>
                    <option value="MEDIUM">Medium (4-6 pts)</option>
                    <option value="HIGH">High (7-10 pts)</option>
                    <option value="CRITICAL">Critical (11-20 pts)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Action / Sanction Prescribed
                  </label>
                  <select
                    value={newActionTaken}
                    onChange={e => setNewActionTaken(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="VERBAL_WARNING">Verbal Warning</option>
                    <option value="WRITTEN_REPRIMAND">Written Reprimand</option>
                    <option value="CAMPUS_DETENTION">Campus Detention</option>
                    <option value="COMMUNITY_SERVICE">Community Service</option>
                    <option value="PARENTAL_SUMMONS">Parental Summons</option>
                    <option value="INTERNAL_SUSPENSION">Internal Suspension</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Demerit Points
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newDemerits}
                    onChange={e => setNewDemerits(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Incident Description & Prefect / Teacher Report
                </label>
                <textarea
                  required
                  rows={3}
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="State specific date, time, location on campus, confiscated items, or staff witnesses..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewIncidentOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Record Demerit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESOLVE INCIDENT */}
      {resolvingIncident && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Conclude Disciplinary Sanction
              </h3>
              <button
                onClick={() => setResolvingIncident(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-3">
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white">{resolvingIncident.studentName}</div>
                <div className="text-slate-500 text-[11px]">{resolvingIncident.description}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Resolution Notes & Remedial Undertaking
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Student served 2-hour detention, letter of apology submitted and signed by guardian."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setResolvingIncident(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveResolution}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
              >
                Mark as Resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: OFFICIAL PARENT DISCIPLINARY SUMMONS LETTER */}
      {summonsStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl p-8 max-w-2xl w-full shadow-2xl space-y-6 my-8 border border-slate-300">
            {/* Header / Letterhead */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                <img src="/crest.svg" alt="Everest Crest" className="w-14 h-16 object-contain" />
                <div>
                  <h2 className="font-serif font-black text-xl text-slate-900 tracking-wide">
                    EVEREST INTERNATIONAL SCHOOLS
                  </h2>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-amber-700">
                    Office of the Vice Principal (Administration & Student Affairs)
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Plot 12, Academic Boulevard, Victoria Island Extension, Lagos &bull; +234 1 800 383 7378
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSummonsStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1 print:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summons Metadata */}
            <div className="flex justify-between text-xs text-slate-700">
              <div>
                <div><strong>Ref:</strong> EIS/VPA/SUM/{new Date().getFullYear()}/042</div>
                <div><strong>Date:</strong> {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
              <div className="text-right">
                <div className="inline-block px-2.5 py-1 rounded bg-rose-100 text-rose-800 font-bold uppercase text-[10px] border border-rose-300">
                  URGENT STATUTORY NOTICE
                </div>
              </div>
            </div>

            {/* Recipient */}
            <div className="text-xs text-slate-800 space-y-0.5">
              <div>To: <strong>{summonsStudent.student.parentName || 'Parent / Legal Guardian'}</strong></div>
              <div>Guardian Phone: {summonsStudent.student.parentPhone || '+234 800 000 0000'}</div>
              <div>Address: Registered Residential Dossier, Lagos State</div>
            </div>

            {/* Letter Title */}
            <div className="border-y border-slate-300 py-2 text-center font-bold text-sm text-slate-900 uppercase tracking-wide">
              FORMAL ADMINISTRATIVE SUMMONS: CHRONIC ABSENTEEISM & TRUANCY WARNING FOR {summonsStudent.student.name || summonsStudent.student.firstName} ({summonsStudent.student.admissionNumber})
            </div>

            {/* Body */}
            <div className="text-xs text-slate-700 space-y-3 leading-relaxed">
              <p>Dear Parent/Guardian,</p>
              <p>
                The Office of the Vice Principal (Administration) hereby brings to your urgent notice that your ward, <strong>{summonsStudent.student.name || summonsStudent.student.firstName}</strong> of class <strong>{summonsStudent.classArmName}</strong>, has currently accumulated <strong>{summonsStudent.daysAbsent} days of unexcused absence</strong> out of {summonsStudent.totalDays} academic days in the current 2nd Term 2025/2026.
              </p>
              <p>
                This represents an attendance compliance rate of only <strong>{summonsStudent.attendanceRate}%</strong>, which is critically beneath our institutional target of 85% and rapidly jeopardizes the <strong>75% statutory threshold</strong> mandated by the Lagos State Ministry of Basic Education and the West African Examinations Council (WAEC).
              </p>
              <p>
                Consequently, you are hereby requested to attend a mandatory conference with the Vice Principal (Administration) and the Form Master on <strong>Friday at 10:00 AM prompt</strong> at the Administrative Complex. Failure to attend may result in statutory referral to the School Disciplinary Committee and possible academic rustication.
              </p>
            </div>

            {/* Signatures */}
            <div className="pt-6 flex justify-between items-end border-t border-slate-200 text-xs">
              <div>
                <div className="font-serif italic text-base text-slate-800">Mrs. Ayodele Tinubu</div>
                <div className="font-bold text-slate-900">Mrs. Ayodele Tinubu</div>
                <div className="text-[11px] text-slate-500">Vice Principal (Administration)</div>
              </div>

              <div className="text-right">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-600 flex items-center justify-center text-[10px] text-amber-800 font-bold uppercase text-center p-1">
                  OFFICIAL EIS SEAL
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 print:hidden">
              <button
                onClick={() => setSummonsStudent(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
              >
                Dismiss
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Summons</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: OFFICIAL CAMPUS EXEAT SLIP */}
      {viewingExeatPass && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 border border-slate-300">
            <div className="flex items-center justify-between border-b-2 border-cyan-800 pb-3">
              <div>
                <div className="font-serif font-black text-base text-cyan-950">EVEREST INTERNATIONAL SCHOOLS</div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-700">Official Campus Gate Pass / Exeat Authorization</div>
              </div>
              <button
                onClick={() => setViewingExeatPass(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Student Name</div>
                  <div className="font-bold text-slate-900 text-sm">{viewingExeatPass.studentName}</div>
                  <div className="text-[11px] text-slate-500">{viewingExeatPass.admissionNumber}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Class Arm</div>
                  <div className="font-bold text-slate-900">{viewingExeatPass.classArmName}</div>
                  <div className="text-[11px] text-cyan-700 font-semibold">{viewingExeatPass.exeatType.replace(/_/g, ' ')}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Departure Time</div>
                  <div className="font-medium text-slate-800">{new Date(viewingExeatPass.departureDate).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Expected Return</div>
                  <div className="font-medium text-slate-800">{new Date(viewingExeatPass.expectedReturnDate).toLocaleString()}</div>
                </div>
              </div>

              <div>
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Authorized Destination & Reason</div>
                <div className="font-medium text-slate-800">{viewingExeatPass.destination}</div>
                <div className="text-slate-500 italic mt-0.5">{viewingExeatPass.reason}</div>
              </div>

              <div className="p-3 rounded-xl bg-cyan-50/60 border border-cyan-200/60">
                <div className="text-cyan-900 text-[10px] uppercase font-semibold">Escort Guardian</div>
                <div className="font-bold text-cyan-950">{viewingExeatPass.authorizedGuardian}</div>
                <div className="text-cyan-700 font-mono text-[11px]">{viewingExeatPass.guardianPhone}</div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-[11px]">
                <div>
                  <div className="text-slate-400 text-[10px]">Authorized By</div>
                  <div className="font-bold text-slate-900">{viewingExeatPass.approvedBy}</div>
                  <div className="text-slate-500">Security Gate Cleared</div>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase text-[10px] border border-emerald-300">
                  {viewingExeatPass.status}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setViewingExeatPass(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Gate Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </FuturisticPageShell>
  );
};
