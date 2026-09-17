import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import { SchemeOfWorkTracker, DayTimetable, TimetablePeriod } from '../../types';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Clock,
  Search,
  Filter,
  UserMinus,
  FileCheck,
  BrainCircuit,
  Calendar,
  GraduationCap,
  Sparkles,
  HelpCircle,
  X,
  Edit3,
  Upload,
  Download,
  Plus,
  Trash2,
  Edit2,
  Layers,
  Building,
  Printer
} from 'lucide-react';
import { FuturisticPageShell } from '../../components/common/FuturisticPageShell';
import { getWelcomeMessage } from '../../lib/userDisplay';
import { FuturisticKPICard } from '../../components/common/FuturisticKPICard';
import { SegmentedControl, SegmentedControlOption } from '../../components/common/SegmentedControl';
import { DoubleBezelCard } from '../../components/common/DoubleBezelCard';
import { ModalPortal } from '../../components/common/ModalPortal';

export const VPAcademicsDashboardView: React.FC = () => {
  const {
    students,
    subjects,
    classArms,
    scores,
    staff,
    schemeOfWork,
    updateSchemeOfWorkVelocity,
    dropStudentSubject,
    activeSession,
    activeTerm,
    weeklyTimetables,
    getWardTimetable,
    updateClassTimetable,
    addPeriodToTimetable,
    deletePeriodFromTimetable,
    importWeeklyTimetableFromData
  } = useSchoolData();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'SCHEME_OF_WORK' | 'SCHOOL_TIMETABLE' | 'SUBJECT_DROPS' | 'CA_AUDIT' | 'REMEDIAL_CLINIC'>('SCHEME_OF_WORK');

  // Timetable builder states
  const [selectedTimetableArm, setSelectedTimetableArm] = useState<string>(classArms[0]?.id || 'arm-sss2-gold');
  const [selectedTimetableDay, setSelectedTimetableDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'>('Monday');
  const [isAddPeriodOpen, setIsAddPeriodOpen] = useState(false);
  const [periodNumInput, setPeriodNumInput] = useState<number>(1);
  const [periodTimeRangeInput, setPeriodTimeRangeInput] = useState('08:15 - 09:00');
  const [periodSubjectInput, setPeriodSubjectInput] = useState('');
  const [periodTeacherInput, setPeriodTeacherInput] = useState('');
  const [periodRoomInput, setPeriodRoomInput] = useState('Senior Wing 2A');
  const [timetableFeedback, setTimetableFeedback] = useState('');
  const [timetableError, setTimetableError] = useState('');
  const [isPreviewExcelOpen, setIsPreviewExcelOpen] = useState(false);
  const [parsedExcelTimetable, setParsedExcelTimetable] = useState<DayTimetable[]>([]);
  const timetableFileInputRef = useRef<HTMLInputElement>(null);

  // Filters for Scheme of Work
  const [sowSearch, setSowSearch] = useState('');
  const [sowVelocityFilter, setSowVelocityFilter] = useState<'ALL' | 'AHEAD' | 'ON_TRACK' | 'BEHIND'>('ALL');
  const [sowClassFilter, setSowClassFilter] = useState<string>('ALL');

  // Inspection modal state
  const [inspectingItem, setInspectingItem] = useState<SchemeOfWorkTracker | null>(null);
  const [inspectionWeek, setInspectionWeek] = useState<number>(10);
  const [inspectionVelocity, setInspectionVelocity] = useState<'AHEAD' | 'ON_TRACK' | 'BEHIND'>('ON_TRACK');
  const [inspectionNote, setInspectionNote] = useState<string>('');

  // Subject Drop state
  const [dropSearch, setDropSearch] = useState('');
  const [selectedStudentForDrop, setSelectedStudentForDrop] = useState<any | null>(null);
  const [selectedSubjectToDrop, setSelectedSubjectToDrop] = useState<string>('');
  const [dropReason, setDropReason] = useState<string>('');
  const [dropSuccessMsg, setDropSuccessMsg] = useState<string>('');

  // Remedial clinic state
  const [remedialArmFilter, setRemedialArmFilter] = useState<string>('ALL');
  const [assignedClinics, setAssignedClinics] = useState<Record<string, string>>({
    'std-002': 'Saturday STEM Intensive Clinic',
    'std-007': 'After-School Math Booster Lab'
  });

  // Calculate Metrics
  const sowMetrics = useMemo(() => {
    const total = schemeOfWork.length;
    const ahead = schemeOfWork.filter(s => s.syllabusVelocity === 'AHEAD').length;
    const onTrack = schemeOfWork.filter(s => s.syllabusVelocity === 'ON_TRACK').length;
    const behind = schemeOfWork.filter(s => s.syllabusVelocity === 'BEHIND').length;
    const complianceRate = total > 0 ? Math.round(((ahead + onTrack) / total) * 100) : 100;
    return { total, ahead, onTrack, behind, complianceRate };
  }, [schemeOfWork]);

  // Senior Students (SSS 2 and SSS 3) for subject drops
  const seniorStudents = useMemo(() => {
    return students.filter(s => 
      s.currentClassArmName.startsWith('SSS 2') || s.currentClassArmName.startsWith('SSS 3')
    );
  }, [students]);

  const filteredSeniorStudents = useMemo(() => {
    return seniorStudents.filter(s => {
      const name = (s.name || `${s.firstName || ''} ${s.lastName || ''}`).toLowerCase();
      const adm = (s.admissionNumber || '').toLowerCase();
      const q = dropSearch.toLowerCase();
      return name.includes(q) || adm.includes(q);
    });
  }, [seniorStudents, dropSearch]);

  // CA Quality Moderation Analysis
  const caAuditData = useMemo(() => {
    return classArms.map(arm => {
      const armScores = scores.filter(sc => sc.classArmId === arm.id && sc.termId === activeTerm.id);
      const totalEntered = armScores.length;
      if (totalEntered === 0) return { arm, totalEntered: 0, caAvg: 0, examAvg: 0, flags: [] };

      const caAvg = Math.round(
        armScores.reduce((acc, curr) => acc + (curr.ca1 + curr.ca2 + (curr.assignment || 0) + (curr.project || 0)), 0) / totalEntered
      );
      const examAvg = Math.round(
        armScores.reduce((acc, curr) => acc + curr.exam, 0) / totalEntered
      );

      const flags: string[] = [];
      const highCaCount = armScores.filter(s => (s.ca1 + s.ca2 + (s.assignment || 0) + (s.project || 0)) >= 36).length;
      if (totalEntered >= 5 && (highCaCount / totalEntered) > 0.75) {
        flags.push('Grade Clustering: >75% CA scores >= 36/40');
      }
      if (caAvg >= 32 && examAvg < 25) {
        flags.push('CA/Exam Dissonance: High CA vs Low Exam performance');
      }

      return { arm, totalEntered, caAvg, examAvg, flags };
    });
  }, [classArms, scores, activeTerm.id]);

  // Students requiring remedial clinic (<50% in core subjects)
  const remedialCandidates = useMemo(() => {
    const candidates: {
      studentId: string;
      studentName: string;
      admissionNumber: string;
      classArmName: string;
      criticalSubjects: { subjectName: string; score: number }[];
    }[] = [];

    students.forEach(student => {
      if (remedialArmFilter !== 'ALL' && student.currentClassArmId !== remedialArmFilter) return;

      const studentScores = scores.filter(sc => sc.studentId === student.id && sc.termId === activeTerm.id);
      const critical: { subjectName: string; score: number }[] = [];

      studentScores.forEach(sc => {
        const sub = subjects.find(s => s.id === sc.subjectId);
        if (sub && (sub.name === 'Mathematics' || sub.name === 'English Studies' || sub.name === 'Physics' || sub.name === 'Chemistry' || sub.name === 'Basic Science')) {
          if (sc.total < 50) {
            critical.push({ subjectName: sub.name, score: sc.total });
          }
        }
      });

      if (critical.length > 0) {
        candidates.push({
          studentId: student.id,
          studentName: student.name || `${student.firstName || ''} ${student.lastName || ''}`,
          admissionNumber: student.admissionNumber,
          classArmName: student.currentClassArmName,
          criticalSubjects: critical
        });
      }
    });

    return candidates;
  }, [students, scores, subjects, activeTerm.id, remedialArmFilter]);

  // Filter Scheme of Work
  const filteredSow = useMemo(() => {
    return schemeOfWork.filter(item => {
      const matchSearch = item.subjectName.toLowerCase().includes(sowSearch.toLowerCase()) ||
        item.teacherName.toLowerCase().includes(sowSearch.toLowerCase()) ||
        item.currentWeekTopic.toLowerCase().includes(sowSearch.toLowerCase());
      const matchVelocity = sowVelocityFilter === 'ALL' || item.syllabusVelocity === sowVelocityFilter;
      const matchClass = sowClassFilter === 'ALL' || item.classArmId === sowClassFilter;
      return matchSearch && matchVelocity && matchClass;
    });
  }, [schemeOfWork, sowSearch, sowVelocityFilter, sowClassFilter]);

  const handleOpenInspect = (item: SchemeOfWorkTracker) => {
    setInspectingItem(item);
    setInspectionWeek(item.actualWeekCompleted);
    setInspectionVelocity(item.syllabusVelocity);
    setInspectionNote(item.vpInspectionRemark || '');
  };

  const handleSaveInspection = () => {
    if (!inspectingItem) return;
    updateSchemeOfWorkVelocity(inspectingItem.id, {
      actualWeekCompleted: inspectionWeek,
      syllabusVelocity: inspectionVelocity,
      vpInspectionRemark: inspectionNote,
      lastLessonNoteDate: new Date().toISOString().split('T')[0]
    }, {
      id: user?.staffId || 'stf-019',
      name: user?.name || 'Mr. Babatunde Fashola',
      role: 'VICE_PRINCIPAL_ACADEMICS'
    });
    setInspectingItem(null);
  };

  const handleDropSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForDrop || !selectedSubjectToDrop) return;
    const level = selectedStudentForDrop.currentClassArmName.startsWith('SSS 3') ? 'SSS 3' : 'SSS 2';
    dropStudentSubject(selectedStudentForDrop.id, selectedSubjectToDrop, level, dropReason);
    setDropSuccessMsg(`Subject successfully dropped for ${selectedStudentForDrop.name || selectedStudentForDrop.firstName}. Registered subject list updated.`);
    setSelectedSubjectToDrop('');
    setDropReason('');
    setTimeout(() => {
      setSelectedStudentForDrop(null);
      setDropSuccessMsg('');
    }, 2000);
  };

  // Weekly Timetable Handlers (VP Academics Authority)
  const handleDownloadTimetableTemplate = () => {
    const selectedArmObj = classArms.find(a => a.id === selectedTimetableArm);
    const armName = selectedArmObj ? selectedArmObj.name : 'All_Classes';
    const currentTimetable = getWardTimetable(selectedTimetableArm);

    const rows: any[] = [];
    currentTimetable.forEach((daySchedule: DayTimetable) => {
      daySchedule.periods.forEach((p: TimetablePeriod) => {
        rows.push({
          'Class Arm': armName,
          'Day': daySchedule.day,
          'Period Number': p.periodNumber,
          'Time Slot': p.timeRange,
          'Subject Name': p.subjectName,
          'Subject Code': p.subjectCode,
          'Teacher In Charge': p.teacherName,
          'Room / Laboratory': p.roomOrLab,
          'Break Period': p.isBreak ? 'YES' : 'NO'
        });
      });
    });

    if (rows.length === 0) {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      days.forEach(day => {
        rows.push(
          { 'Class Arm': armName, 'Day': day, 'Period Number': 1, 'Time Slot': '08:15 - 09:00', 'Subject Name': 'Mathematics', 'Subject Code': 'MTH', 'Teacher In Charge': 'Mr. Babatunde Fashola', 'Room / Laboratory': 'Senior Wing 2A', 'Break Period': 'NO' },
          { 'Class Arm': armName, 'Day': day, 'Period Number': 2, 'Time Slot': '09:00 - 09:45', 'Subject Name': 'English Studies', 'Subject Code': 'ENG', 'Teacher In Charge': 'Mrs. Sarah Adeleke', 'Room / Laboratory': 'Senior Wing 2A', 'Break Period': 'NO' },
          { 'Class Arm': armName, 'Day': day, 'Period Number': 3, 'Time Slot': '09:45 - 10:30', 'Subject Name': 'Physics', 'Subject Code': 'PHY', 'Teacher In Charge': 'Engr. Emeka Okafor', 'Room / Laboratory': 'Physics Lab', 'Break Period': 'NO' },
          { 'Class Arm': armName, 'Day': day, 'Period Number': 4, 'Time Slot': '10:30 - 11:00', 'Subject Name': 'Morning Break', 'Subject Code': 'RECESS', 'Teacher In Charge': 'Floor Prefects', 'Room / Laboratory': 'Dining & Quadrangle', 'Break Period': 'YES' },
          { 'Class Arm': armName, 'Day': day, 'Period Number': 5, 'Time Slot': '11:00 - 11:45', 'Subject Name': 'Chemistry', 'Subject Code': 'CHM', 'Teacher In Charge': 'Dr. Mrs. A. O. Adeleke', 'Room / Laboratory': 'Chemistry Lab', 'Break Period': 'NO' },
          { 'Class Arm': armName, 'Day': day, 'Period Number': 6, 'Time Slot': '11:45 - 12:30', 'Subject Name': 'Biology', 'Subject Code': 'BIO', 'Teacher In Charge': 'Mr. Michael Davies', 'Room / Laboratory': 'Biology Lab', 'Break Period': 'NO' }
        );
      });
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Weekly_Timetable');
    XLSX.writeFile(wb, `Everest_Timetable_${armName.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawData || rawData.length === 0) {
          setTimetableError('No timetable records found in the uploaded file.');
          setTimeout(() => setTimetableError(''), 5000);
          return;
        }

        const daysMap: Record<string, TimetablePeriod[]> = {
          'Monday': [],
          'Tuesday': [],
          'Wednesday': [],
          'Thursday': [],
          'Friday': []
        };

        rawData.forEach((row, idx) => {
          const rawDay = (row['Day'] || row['day'] || 'Monday').toString().trim();
          const dayKey = (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].find(
            d => d.toLowerCase() === rawDay.toLowerCase()
          ) || 'Monday') as 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

          const periodNumber = parseInt(row['Period Number'] || row['Period'] || row['periodNumber'] || String(idx + 1), 10);
          const timeRange = String(row['Time Slot'] || row['Time'] || row['timeRange'] || '08:15 - 09:00');
          const subjectName = String(row['Subject Name'] || row['Subject'] || row['subjectName'] || 'General Studies');
          const subjectCode = String(row['Subject Code'] || row['Code'] || row['subjectCode'] || subjectName.slice(0, 3).toUpperCase());
          const teacherName = String(row['Teacher In Charge'] || row['Teacher'] || row['teacherName'] || 'Class Teacher');
          const roomOrLab = String(row['Room / Laboratory'] || row['Room'] || row['roomOrLab'] || 'Classroom');
          const isBreak = String(row['Break Period'] || row['isBreak'] || '').toUpperCase() === 'YES' || subjectName.toLowerCase().includes('break') || subjectName.toLowerCase().includes('recess');

          daysMap[dayKey].push({
            periodNumber: isNaN(periodNumber) ? 1 : periodNumber,
            timeRange,
            subjectName,
            subjectCode,
            teacherName,
            roomOrLab,
            isBreak
          });
        });

        const formattedDays: DayTimetable[] = (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const).map(day => ({
          day,
          periods: daysMap[day].sort((a, b) => a.periodNumber - b.periodNumber)
        }));

        setParsedExcelTimetable(formattedDays);
        setIsPreviewExcelOpen(true);
      } catch (err) {
        console.error('Failed to parse timetable Excel file:', err);
        setTimetableError('Failed to parse timetable spreadsheet. Please ensure it follows the recommended template format.');
        setTimeout(() => setTimetableError(''), 5000);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleCommitParsedTimetable = () => {
    if (parsedExcelTimetable.length === 0) return;
    importWeeklyTimetableFromData(selectedTimetableArm, parsedExcelTimetable, {
      id: user?.staffId || 'stf-019',
      name: user?.name || 'Mr. Babatunde Fashola',
      role: 'VICE_PRINCIPAL_ACADEMICS'
    });
    setIsPreviewExcelOpen(false);
    setTimetableFeedback('Weekly timetable successfully imported from Excel and published to student/parent portals.');
    setTimeout(() => setTimetableFeedback(''), 4000);
  };

  const handleAddPeriodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodSubjectInput.trim()) return;

    const matchedSubject = subjects.find(s => s.name.toLowerCase() === periodSubjectInput.toLowerCase());

    const newPeriod: TimetablePeriod = {
      periodNumber: Number(periodNumInput),
      timeRange: periodTimeRangeInput.trim(),
      subjectName: periodSubjectInput.trim(),
      subjectCode: matchedSubject?.code || periodSubjectInput.slice(0, 3).toUpperCase(),
      teacherName: periodTeacherInput.trim() || 'Assigned Instructor',
      roomOrLab: periodRoomInput.trim() || 'Assigned Classroom',
      isBreak: periodSubjectInput.toLowerCase().includes('break') || periodSubjectInput.toLowerCase().includes('recess')
    };

    addPeriodToTimetable(selectedTimetableArm, selectedTimetableDay, newPeriod, {
      id: user?.staffId || 'stf-019',
      name: user?.name || 'Mr. Babatunde Fashola',
      role: 'VICE_PRINCIPAL_ACADEMICS'
    });

    setIsAddPeriodOpen(false);
    setPeriodSubjectInput('');
    setPeriodTeacherInput('');
    setTimetableFeedback(`Period ${periodNumInput} added to ${selectedTimetableDay}'s schedule.`);
    setTimeout(() => setTimetableFeedback(''), 3000);
  };

  const handleDeletePeriod = (periodNumber: number) => {
    deletePeriodFromTimetable(selectedTimetableArm, selectedTimetableDay, periodNumber, {
      id: user?.staffId || 'stf-019',
      name: user?.name || 'Mr. Babatunde Fashola',
      role: 'VICE_PRINCIPAL_ACADEMICS'
    });
    setTimetableFeedback(`Period ${periodNumber} removed from ${selectedTimetableDay}.`);
    setTimeout(() => setTimetableFeedback(''), 3000);
  };

  const ACADEMIC_TABS: SegmentedControlOption<'SCHEME_OF_WORK' | 'SCHOOL_TIMETABLE' | 'SUBJECT_DROPS' | 'CA_AUDIT' | 'REMEDIAL_CLINIC'>[] = [
    { id: 'SCHEME_OF_WORK', label: 'Scheme of Work & Velocity', icon: BookOpen, count: schemeOfWork.length },
    { id: 'SCHOOL_TIMETABLE', label: 'Master School Timetable', icon: Calendar },
    { id: 'SUBJECT_DROPS', label: 'SSS Subject Drop Gateway', icon: UserMinus, badge: '12 → 11 → 9' },
    { id: 'CA_AUDIT', label: 'CA Quality & Inflation Moderation', icon: FileCheck },
    { id: 'REMEDIAL_CLINIC', label: 'Remedial Clinic Coordinator', icon: BrainCircuit, count: remedialCandidates.length }
  ];

  return (
    <FuturisticPageShell
      title="VICE PRINCIPAL (ACADEMICS) COMMAND"
      subtitle={`${getWelcomeMessage(user?.name || 'Vice-Principal')}. Instructional delivery across ${classArms.length} arms, syllabus completion velocity, senior elective subject drops (12 → 11 → 9), and continuous assessment quality moderation.`}
      icon={GraduationCap}
      badgeText="Instructional Week: 10 of 12"
      badgeVariant="info"
    >
      {/* 4 Metric Summary Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
        <FuturisticKPICard
          title="Syllabus Compliance"
          value={`${sowMetrics.complianceRate}%`}
          subtitle={`${sowMetrics.ahead + sowMetrics.onTrack} of ${sowMetrics.total} on track`}
          icon={TrendingUp}
          sparklineData={[78, 82, 85, 88, 91, sowMetrics.complianceRate]}
          glowColor="emerald"
          trend={{ value: '+3% this week', isPositive: true }}
          onClick={() => setActiveTab('SCHEME_OF_WORK')}
        />

        <FuturisticKPICard
          title="Lagging Syllabi"
          value={`${sowMetrics.behind}`}
          subtitle="Requiring make-up periods"
          icon={Clock}
          sparklineData={[5, 4, 4, 3, 2, sowMetrics.behind]}
          glowColor="amber"
          trend={{ value: sowMetrics.behind === 0 ? 'None' : `${sowMetrics.behind} flagged`, isPositive: sowMetrics.behind === 0 }}
          onClick={() => setActiveTab('SCHEME_OF_WORK')}
        />

        <FuturisticKPICard
          title="Senior Cohorts"
          value={`${seniorStudents.length}`}
          subtitle="SSS 2 & SSS 3 Candidate Pool"
          icon={GraduationCap}
          sparklineData={[80, 82, 83, 84, 84, seniorStudents.length]}
          glowColor="cyan"
          trend={{ value: 'Full Enrollment', isPositive: true }}
          onClick={() => setActiveTab('SUBJECT_DROPS')}
        />

        <FuturisticKPICard
          title="Remedial Clinic Leads"
          value={`${remedialCandidates.length}`}
          subtitle="Core marks under 50%"
          icon={AlertTriangle}
          sparklineData={[10, 8, 7, 5, 4, remedialCandidates.length]}
          glowColor="rose"
          trend={{ value: `${remedialCandidates.length} Active Patients`, isPositive: remedialCandidates.length === 0 }}
          onClick={() => setActiveTab('REMEDIAL_CLINIC')}
        />
      </div>

      {/* Modern Segmented Navigation Tabs */}
      <SegmentedControl
        options={ACADEMIC_TABS}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* TAB 1: SCHEME OF WORK TRACKER */}
      {activeTab === 'SCHEME_OF_WORK' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search subject, teacher, topic..."
                value={sowSearch}
                onChange={e => setSowSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={sowVelocityFilter}
                onChange={e => setSowVelocityFilter(e.target.value as any)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="ALL">All Velocities</option>
                <option value="AHEAD">Ahead of Schedule</option>
                <option value="ON_TRACK">On Track (Week 10)</option>
                <option value="BEHIND">Lagging / Behind</option>
              </select>

              <select
                value={sowClassFilter}
                onChange={e => setSowClassFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="ALL">All Class Arms</option>
                {classArms.map(arm => (
                  <option key={arm.id} value={arm.id}>{arm.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Scheme of work table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-4">Subject & Class Arm</th>
                    <th className="p-4">Subject Master</th>
                    <th className="p-4">Current Week Topic</th>
                    <th className="p-4 text-center">Velocity</th>
                    <th className="p-4">VP Inspection Notes</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSow.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{item.subjectName}</div>
                        <div className="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold">{item.classArmName}</div>
                      </td>
                      <td className="p-4 font-medium text-slate-700 dark:text-slate-300">
                        {item.teacherName}
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{item.currentWeekTopic}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Lesson Note Logged: {item.lastLessonNoteDate}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          item.syllabusVelocity === 'AHEAD'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40'
                            : item.syllabusVelocity === 'ON_TRACK'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300/40'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300/40'
                        }`}>
                          {item.syllabusVelocity === 'AHEAD' && <TrendingUp className="w-3 h-3" />}
                          {item.syllabusVelocity === 'ON_TRACK' && <CheckCircle2 className="w-3 h-3" />}
                          {item.syllabusVelocity === 'BEHIND' && <Clock className="w-3 h-3" />}
                          {item.syllabusVelocity} (Wk {item.actualWeekCompleted}/{item.expectedWeek})
                        </span>
                      </td>
                      <td className="p-4 max-w-sm">
                        <p className="text-slate-600 dark:text-slate-400 text-[11px] italic line-clamp-2">
                          "{item.vpInspectionRemark || 'Pending VP Academic syllabus audit.'}"
                        </p>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleOpenInspect(item)}
                          className="px-3 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 font-semibold text-xs border border-cyan-200 dark:border-cyan-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Audit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: MASTER SCHOOL TIMETABLE (VP ACADEMICS GOVERNANCE) */}
      {activeTab === 'SCHOOL_TIMETABLE' && (
        <div className="space-y-6">
          <input
            ref={timetableFileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleExcelUpload}
            className="hidden"
          />

          {/* Feedback banner */}
          {timetableFeedback && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-3 animate-fade-in shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{timetableFeedback}</span>
            </div>
          )}

          {/* Timetable Command Header Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300">
                  <Calendar className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Institutional Master Academic Timetable
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200">
                  VP Academics Authority
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                Design weekly periods, classroom venues, and subject teacher allocations across all registered class arms. Alternatively, upload your formatted school schedule in bulk via Excel spreadsheet.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              <button
                type="button"
                onClick={handleDownloadTimetableTemplate}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Download current class arm timetable as Excel template"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Download Template (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => timetableFileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Timetable (Excel)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const currentArmTimetable = weeklyTimetables[selectedTimetableArm] || weeklyTimetables['arm-sss2-gold'] || [];
                  const currentDay = currentArmTimetable.find(d => d.day === selectedTimetableDay);
                  const nextPeriodNum = (currentDay?.periods.length || 0) + 1;
                  setPeriodNumInput(nextPeriodNum);
                  setPeriodSubjectInput('');
                  setPeriodTeacherInput('');
                  setIsAddPeriodOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Period</span>
              </button>
            </div>
          </div>

          {timetableFeedback && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{timetableFeedback}</span>
            </div>
          )}

          {timetableError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-2.5 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{timetableError}</span>
            </div>
          )}

          {/* Class Arm Selector with custom-horizontal-scrollbar and breathing room */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Select Class Arm ({classArms.length} Total Arms)
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Active Arm: <strong className="text-cyan-600 dark:text-cyan-400">{classArms.find(a => a.id === selectedTimetableArm)?.name || 'SSS 2 Gold'}</strong>
              </span>
            </div>

            <div className="overflow-x-auto pb-3 pt-1 custom-horizontal-scrollbar flex items-center gap-2">
              {classArms.map(arm => {
                const isSelected = selectedTimetableArm === arm.id;
                return (
                  <button
                    key={arm.id}
                    type="button"
                    onClick={() => setSelectedTimetableArm(arm.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/20 scale-[1.02]'
                        : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80'
                    }`}
                  >
                    {arm.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Days of the Week Selector */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto custom-horizontal-scrollbar">
            {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const).map(day => {
              const isSelected = selectedTimetableDay === day;
              const currentArmTimetable = weeklyTimetables[selectedTimetableArm] || weeklyTimetables['arm-sss2-gold'] || [];
              const dayObj = currentArmTimetable.find(d => d.day === day);
              const count = dayObj?.periods.length || 0;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedTimetableDay(day)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-slate-900 dark:border-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span>{day}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                    isSelected
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {count} {count === 1 ? 'Period' : 'Periods'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Day's Periods Schedule Table */}
          {(() => {
            const currentArmTimetable = weeklyTimetables[selectedTimetableArm] || weeklyTimetables['arm-sss2-gold'] || [];
            const daySchedule = currentArmTimetable.find(d => d.day === selectedTimetableDay) || { day: selectedTimetableDay, periods: [] };
            const periods = daySchedule.periods || [];

            return (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {selectedTimetableDay} Routine & Period Sequence
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {periods.length} Scheduled Periods
                  </span>
                </div>

                {periods.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 flex items-center justify-center mx-auto">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">No Periods Scheduled for {selectedTimetableDay}</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      There are currently no instructional or break periods defined for {selectedTimetableDay} in this class arm.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setPeriodNumInput(1);
                        setPeriodSubjectInput('');
                        setPeriodTeacherInput('');
                        setIsAddPeriodOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add First Period</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3.5 text-center w-16">Period</th>
                          <th className="p-3.5">Time Interval</th>
                          <th className="p-3.5">Subject & Code</th>
                          <th className="p-3.5">Instructor / Teacher</th>
                          <th className="p-3.5">Assigned Venue / Lab</th>
                          <th className="p-3.5">Type</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {periods.map(period => (
                          <tr
                            key={period.periodNumber}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                              period.isBreak ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                            }`}
                          >
                            <td className="p-3.5 text-center font-bold text-slate-700 dark:text-slate-300">
                              #{period.periodNumber}
                            </td>
                            <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                              {period.timeRange}
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {period.subjectName}
                                </span>
                                {period.subjectCode && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {period.subjectCode}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                              {period.teacherName}
                            </td>
                            <td className="p-3.5 text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                              <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{period.roomOrLab}</span>
                            </td>
                            <td className="p-3.5">
                              {period.isBreak ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                                  Recess / Break
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200">
                                  Academic
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeletePeriod(period.periodNumber)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="Delete this period"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 2: SSS SUBJECT DROP GATEWAY */}
      {activeTab === 'SUBJECT_DROPS' && (
        <div className="space-y-6">
          {/* Statutory Policy Rules Banner */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-xs">
                <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                  Federal Republic of Nigeria Senior Secondary Subject Selection Rules
                </h3>
                <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                  <strong>SSS 1:</strong> Students take up to 12 subjects across Core, Science, Trade, and Languages. &bull;{' '}
                  <strong>SSS 2 Transition:</strong> Eligible to drop 1 elective subject (down to 11 subjects). &bull;{' '}
                  <strong>SSS 3 Transition:</strong> Final drop down to exactly 9 subjects for official WAEC/NECO registration.
                </p>
                <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2.5 py-1 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 font-semibold">
                    🔒 Non-Droppable Core: English, Maths, Civic, Nigerian History, Physics, Chemistry, Biology
                  </span>
                  <span className="px-2.5 py-1 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 font-semibold">
                    ⚖️ Max 1 Trade Subject (Data Processing / Food & Nut)
                  </span>
                  <span className="px-2.5 py-1 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 font-semibold">
                    🗣️ Max 1 Language (Yoruba / Hausa / French)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Student Roster Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                Senior Secondary Candidates Subject Roster ({filteredSeniorStudents.length} Students)
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search candidate name or admission no..."
                  value={dropSearch}
                  onChange={e => setDropSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-3.5">Candidate Details</th>
                    <th className="p-3.5">Class Arm</th>
                    <th className="p-3.5 text-center">Active Subjects</th>
                    <th className="p-3.5">Dropped Subjects History</th>
                    <th className="p-3.5 text-right">Gateway Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSeniorStudents.map(student => {
                    const studentName = student.name || `${student.firstName || ''} ${student.lastName || ''}`;
                    const subjectCount = (student.registeredSubjectIds || []).length;
                    const isSss3 = student.currentClassArmName.startsWith('SSS 3');
                    const canDrop = isSss3 ? subjectCount > 9 : subjectCount > 11;

                    return (
                      <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-white">{studentName}</div>
                          <div className="text-[11px] font-mono text-slate-400">{student.admissionNumber}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {student.currentClassArmName}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                            subjectCount === 9
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : subjectCount === 11
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {subjectCount} Subjects
                          </span>
                        </td>
                        <td className="p-3.5">
                          {student.droppedSubjects && student.droppedSubjects.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {student.droppedSubjects.map(d => (
                                <span key={d.subjectId} className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-[10px] font-semibold">
                                  {d.subjectName} ({d.level})
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No drops recorded</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => setSelectedStudentForDrop(student)}
                            disabled={!canDrop}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                              canDrop
                                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            <span>{canDrop ? 'Review Drop' : 'Target Count Met'}</span>
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

      {/* TAB 3: CA QUALITY & GRADE INFLATION AUDIT */}
      {activeTab === 'CA_AUDIT' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Grading Standard</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">Continuous Assessment (40%)</div>
              <div className="text-xs text-slate-500 mt-1">CA1 (10) + CA2 (10) + Assgn (10) + Proj (10)</div>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Terminal Examination</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">Written Theory & Practicals (60%)</div>
              <div className="text-xs text-slate-500 mt-1">Moderated departmental examination papers</div>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Active Term</div>
              <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">{activeTerm.name} 2025/2026</div>
              <div className="text-xs text-slate-500 mt-1">Live marks moderation and variance checks</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white text-sm">
              Cohort-Level Continuous Assessment Variance & Inflation Audit
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-4">Class Arm</th>
                    <th className="p-4 text-center">Marks Entered</th>
                    <th className="p-4 text-center">Average CA (Max 40)</th>
                    <th className="p-4 text-center">Average Exam (Max 60)</th>
                    <th className="p-4">Moderation Quality Flags</th>
                    <th className="p-4 text-right">Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {caAuditData.map(item => (
                    <tr key={item.arm.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-4 font-bold text-slate-900 dark:text-white">{item.arm.fullName}</td>
                      <td className="p-4 text-center font-mono">{item.totalEntered}</td>
                      <td className="p-4 text-center font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {item.caAvg} / 40
                      </td>
                      <td className="p-4 text-center font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {item.examAvg} / 60
                      </td>
                      <td className="p-4">
                        {item.flags.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {item.flags.map((flag, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span>{flag}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Normal distribution (No inflation detected)
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          item.flags.length === 0
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {item.flags.length === 0 ? 'PASSED' : 'UNDER REVIEW'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REMEDIAL CLINIC COORDINATOR */}
      {activeTab === 'REMEDIAL_CLINIC' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Targeted Academic Remedial Clinics
              </h3>
              <p className="text-xs text-slate-500">
                Automated identification of candidates scoring under 50% in Mathematics, English Language, or Core Science disciplines.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={remedialArmFilter}
                onChange={e => setRemedialArmFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="ALL">All 12 Class Arms</option>
                {classArms.map(arm => (
                  <option key={arm.id} value={arm.id}>{arm.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-4">Candidate</th>
                    <th className="p-4">Class Arm</th>
                    <th className="p-4">Struggling Core Subject(s)</th>
                    <th className="p-4">Assigned Remedial Clinic</th>
                    <th className="p-4 text-right">Intervention Assignment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {remedialCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        No candidates currently require emergency remedial intervention in this selection.
                      </td>
                    </tr>
                  ) : (
                    remedialCandidates.map(c => {
                      const currentClinic = assignedClinics[c.studentId];
                      return (
                        <tr key={c.studentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-4">
                            <div className="font-bold text-slate-900 dark:text-white">{c.studentName}</div>
                            <div className="text-[11px] font-mono text-slate-400">{c.admissionNumber}</div>
                          </td>
                          <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{c.classArmName}</td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1.5">
                              {c.criticalSubjects.map((cs, idx) => (
                                <span key={idx} className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-[11px] font-bold">
                                  {cs.subjectName}: {cs.score}%
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-4">
                            {currentClinic ? (
                              <span className="px-2.5 py-1 rounded-md bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-200 border border-cyan-300/40 text-[11px] font-semibold">
                                {currentClinic}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <select
                              value={currentClinic || ''}
                              onChange={e => setAssignedClinics(prev => ({ ...prev, [c.studentId]: e.target.value }))}
                              className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                            >
                              <option value="">Select Clinic...</option>
                              <option value="Saturday STEM Intensive Clinic">Saturday STEM Intensive Clinic</option>
                              <option value="After-School Math Booster Lab">After-School Math Booster Lab</option>
                              <option value="English Diction & Essay Clinic">English Diction & Essay Clinic</option>
                              <option value="Peer Tutoring Mentorship Group">Peer Tutoring Mentorship Group</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SCHEME OF WORK AUDIT & INSPECTION */}
      {inspectingItem && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-scale-up">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    VP Syllabus Inspection & Lesson Note Audit
                  </h3>
                  <p className="text-xs text-slate-500">
                    {inspectingItem.subjectName} &bull; {inspectingItem.classArmName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingItem(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject Master</label>
                  <input
                    type="text"
                    disabled
                    value={inspectingItem.teacherName}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Syllabus Topic</label>
                  <input
                    type="text"
                    disabled
                    value={inspectingItem.currentWeekTopic}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Actual Completed Week</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={inspectionWeek}
                      onChange={e => setInspectionWeek(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Syllabus Velocity</label>
                    <select
                      value={inspectionVelocity}
                      onChange={e => setInspectionVelocity(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                    >
                      <option value="AHEAD">AHEAD OF SCHEDULE</option>
                      <option value="ON_TRACK">ON TRACK</option>
                      <option value="BEHIND">BEHIND / LAGGING</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Vice Principal Instructional Remarks & Directive
                  </label>
                  <textarea
                    rows={3}
                    value={inspectionNote}
                    onChange={e => setInspectionNote(e.target.value)}
                    placeholder="Record mandatory instructional recommendations, double-period catch-up mandates, or commendations..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setInspectingItem(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveInspection}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Ratify VP Inspection</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL: SSS SUBJECT DROP EXECUTION */}
      {selectedStudentForDrop && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-scale-up">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    SSS Elective Subject Drop Authorization
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedStudentForDrop.name || `${selectedStudentForDrop.firstName} ${selectedStudentForDrop.lastName}`} &bull; {selectedStudentForDrop.currentClassArmName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudentForDrop(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {dropSuccessMsg ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{dropSuccessMsg}</span>
                </div>
              ) : (
                <form onSubmit={handleDropSubjectSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Select Eligible Subject to Drop
                    </label>
                    <select
                      required
                      value={selectedSubjectToDrop}
                      onChange={e => setSelectedSubjectToDrop(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="">-- Choose Subject --</option>
                      {(selectedStudentForDrop.registeredSubjectIds || []).map((subId: string) => {
                        const subObj = subjects.find(s => s.id === subId);
                        if (!subObj) return null;
                        const isCore = subObj.isCompulsorySeniorScience || subObj.group === 'CORE';
                        if (isCore) return null;
                        return (
                          <option key={subId} value={subId}>
                            {subObj.name} ({subObj.category} - {subObj.group})
                          </option>
                        );
                      })}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Only non-core electives, secondary trades, or optional languages are droppable.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Reason for Elective Drop / Departmental Recommendation
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Specializing in Pure Sciences; approved drop of Commercial Elective."
                      value={dropReason}
                      onChange={e => setDropReason(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSelectedStudentForDrop(null)}
                      className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <UserMinus className="w-4 h-4" />
                      <span>Authorize Subject Drop</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL: ADD PERIOD TO TIMETABLE */}
      {isAddPeriodOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-scale-up">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      Add Period to Timetable
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedTimetableDay} &bull; {classArms.find(a => a.id === selectedTimetableArm)?.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddPeriodOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddPeriodSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Period Number
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={12}
                      value={periodNumInput}
                      onChange={e => setPeriodNumInput(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Time Slot
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 08:15 - 09:00"
                      value={periodTimeRangeInput}
                      onChange={e => setPeriodTimeRangeInput(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subject / Routine Activity
                  </label>
                  <input
                    type="text"
                    required
                    list="subjects-datalist"
                    placeholder="e.g. Mathematics, English Studies, Morning Recess..."
                    value={periodSubjectInput}
                    onChange={e => setPeriodSubjectInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-cyan-500"
                  />
                  <datalist id="subjects-datalist">
                    {subjects.map(s => (
                      <option key={s.id} value={s.name}>{s.name} ({s.code})</option>
                    ))}
                    <option value="Morning Recess" />
                    <option value="Lunch Break" />
                    <option value="Assembly & Devotion" />
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Teacher In Charge
                  </label>
                  <input
                    type="text"
                    list="staff-datalist"
                    placeholder="e.g. Mr. Babatunde Fashola"
                    value={periodTeacherInput}
                    onChange={e => setPeriodTeacherInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-cyan-500"
                  />
                  <datalist id="staff-datalist">
                    {staff.map(st => (
                      <option key={st.id} value={st.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Classroom / Laboratory / Venue
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Room 204, Chemistry Lab, Dining Quadrangle"
                    value={periodRoomInput}
                    onChange={e => setPeriodRoomInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddPeriodOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Save Period</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL: EXCEL IMPORT PREVIEW */}
      {isPreviewExcelOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 animate-scale-up max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      Preview Excel Timetable Import
                    </h3>
                    <p className="text-xs text-slate-500">
                      Target Class Arm: <strong className="text-cyan-600 dark:text-cyan-400">{classArms.find(a => a.id === selectedTimetableArm)?.name}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPreviewExcelOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-4 flex-1 pr-1">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  The spreadsheet has been parsed into <strong>{parsedExcelTimetable.length} school days</strong>. Review the scheduled periods below before ratifying:
                </p>

                <div className="space-y-3">
                  {parsedExcelTimetable.map(d => (
                    <div key={d.day} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{d.day}</span>
                        <span className="text-[11px] font-semibold text-slate-500">{d.periods.length} Periods</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                        {d.periods.map(p => (
                          <div key={p.periodNumber} className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              #{p.periodNumber} {p.subjectName} ({p.timeRange})
                            </span>
                            <span className="text-slate-400 text-[10px]">{p.roomOrLab}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPreviewExcelOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCommitParsedTimetable}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Commit Master Timetable</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </FuturisticPageShell>
  );
};
