import React, { useState, useMemo } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import { Student } from '../../types';
import {
  Award,
  AlertTriangle,
  GraduationCap,
  Search,
  CheckCircle2,
  Medal,
  BookOpen,
  Send,
  Printer,
  Download,
  ChevronDown,
  ChevronUp,
  X,
  User,
  SlidersHorizontal,
  ClipboardList,
  Check
} from 'lucide-react';

export const PrincipalHonorsProbationView: React.FC = () => {
  const {
    students,
    classArms,
    subjects,
    scores,
    activeTerm,
    activeSession,
    schoolSettings,
    pastoralLogs,
    addPastoralLog,
    addAuditLog,
    sendMessage
  } = useSchoolData();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'HONORS' | 'SUPPORT'>('HONORS');
  const [sectionFilter, setSectionFilter] = useState<'ALL' | 'JSS' | 'SSS'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllHonors, setShowAllHonors] = useState(false);
  const [showAllSupport, setShowAllSupport] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [selectedHonorsStudent, setSelectedHonorsStudent] = useState<any | null>(null);
  const [selectedSupportStudent, setSelectedSupportStudent] = useState<any | null>(null);

  // Support Plan Form State
  const [remedialTutorials, setRemedialTutorials] = useState(true);
  const [formMasterTracking, setFormMasterTracking] = useState(true);
  const [parentConsultation, setParentConsultation] = useState(true);
  const [planNotes, setPlanNotes] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to extract clean class level name (e.g. JSS 1, JSS 2, SSS 3)
  const getClassLevelName = (armFullName?: string, className?: string): string => {
    const text = (armFullName || className || '').toUpperCase();
    if (text.includes('JSS 1') || text.includes('JSS1')) return 'JSS 1';
    if (text.includes('JSS 2') || text.includes('JSS2')) return 'JSS 2';
    if (text.includes('JSS 3') || text.includes('JSS3')) return 'JSS 3';
    if (text.includes('SSS 1') || text.includes('SSS1')) return 'SSS 1';
    if (text.includes('SSS 2') || text.includes('SSS2')) return 'SSS 2';
    if (text.includes('SSS 3') || text.includes('SSS3')) return 'SSS 3';
    return text.includes('JSS') ? 'JSS' : text.includes('SSS') ? 'SSS' : 'Secondary';
  };

  // Process all students and compute real averages and subject breakdowns from database
  const allStudentStats = useMemo(() => {
    return students.map(student => {
      const arm = classArms.find(
        a => a.id === student.currentClassArmId ||
             (student.currentClassArmName && a.fullName === student.currentClassArmName) ||
             (student.currentClassArmName && a.name === student.currentClassArmName)
      );

      const classFullName = arm?.fullName || student.currentClassArmName || 'General';
      const levelName = getClassLevelName(arm?.fullName, student.currentClassArmName);
      const isJunior = levelName.includes('JSS') || classFullName.toUpperCase().includes('JSS');

      // Match student scores by studentId or admissionNumber
      let sScores = scores.filter(sc => {
        const idMatches = sc.studentId === student.id ||
          (student.admissionNumber && sc.admissionNumber &&
           sc.admissionNumber.trim().toLowerCase() === student.admissionNumber.trim().toLowerCase());
        if (!idMatches) return false;

        if (activeTerm?.id && sc.termId && sc.termId !== activeTerm.id) {
          return false;
        }
        return true;
      });

      // Fallback if active term filter returns 0 but student has scores in database
      if (sScores.length === 0) {
        sScores = scores.filter(sc =>
          sc.studentId === student.id ||
          (student.admissionNumber && sc.admissionNumber &&
           sc.admissionNumber.trim().toLowerCase() === student.admissionNumber.trim().toLowerCase())
        );
      }

      // Compute aggregate and average
      const totalAggregate = sScores.reduce((acc, sc) => acc + (Number(sc.total) || 0), 0);
      const average = sScores.length > 0
        ? Number((totalAggregate / sScores.length).toFixed(1))
        : null;

      // Subject breakdown with subject names
      const detailedSubjects = sScores.map(sc => {
        const sub = subjects.find(s => s.id === sc.subjectId || s.code === sc.subjectId);
        return {
          id: sc.subjectId,
          name: sub?.name || sc.subjectId.replace(/^subj-/, '').toUpperCase(),
          code: sub?.code || sc.subjectId,
          total: Number(sc.total) || 0,
          grade: sc.grade || 'C'
        };
      });

      // Sort by total descending for top subjects
      const sortedByScore = [...detailedSubjects].sort((a, b) => b.total - a.total);
      const bestSubject = sortedByScore[0] || null;
      const topSubjects = sortedByScore.slice(0, 3);

      // Subjects needing improvement (scores < 70% or lowest 3 subjects)
      const lowestSubjects = [...detailedSubjects].sort((a, b) => a.total - b.total);
      const belowThreshold = lowestSubjects.filter(s => s.total < 70);
      const subjectsNeedingImprovement = belowThreshold.length > 0 ? belowThreshold : lowestSubjects.slice(0, 2);

      return {
        student,
        arm,
        classFullName,
        levelName,
        isJunior,
        scoresCount: sScores.length,
        totalAggregate,
        average, // null if no score records, otherwise number e.g. 82.5 or 76
        bestSubject,
        topSubjects,
        subjectsNeedingImprovement,
        allSubjects: sortedByScore
      };
    });
  }, [students, classArms, subjects, scores, activeTerm]);

  // All students with calculated averages >= 75%
  const allHonorsStudents = useMemo(() => {
    return allStudentStats
      .filter(s => s.average !== null && s.average >= 75)
      .sort((a, b) => (b.average || 0) - (a.average || 0));
  }, [allStudentStats]);

  // Students needing academic support
  const allSupportStudents = useMemo(() => {
    return allStudentStats
      .filter(s => s.average !== null && (s.average < 77 || s.subjectsNeedingImprovement.some(sub => sub.total < 70)))
      .sort((a, b) => (a.average || 0) - (b.average || 0));
  }, [allStudentStats]);

  // Junior and Senior Honors counts for summary cards
  const juniorHonorsCount = useMemo(() => {
    return allHonorsStudents.filter(s => s.isJunior).length;
  }, [allHonorsStudents]);

  const seniorHonorsCount = useMemo(() => {
    return allHonorsStudents.filter(s => !s.isJunior).length;
  }, [allHonorsStudents]);

  const topOverallAverage = allHonorsStudents[0]?.average || 0;

  // Filter function by search term and section filter (ALL, JSS, SSS)
  const applyFilters = (list: typeof allStudentStats) => {
    return list.filter(item => {
      const studentFullName = item.student.name || `${item.student.firstName} ${item.student.lastName}`;
      const matchesSearch =
        studentFullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.classFullName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSection =
        sectionFilter === 'ALL' ||
        (sectionFilter === 'JSS' && item.isJunior) ||
        (sectionFilter === 'SSS' && !item.isJunior);

      return matchesSearch && matchesSection;
    });
  };

  const filteredHonors = useMemo(() => applyFilters(allHonorsStudents), [allHonorsStudents, searchTerm, sectionFilter]);
  const filteredSupport = useMemo(() => applyFilters(allSupportStudents), [allSupportStudents, searchTerm, sectionFilter]);

  // Pick diverse representative 6-7 students across distinct class levels (JSS 1 through SSS 3)
  const getRepresentativeList = (list: typeof allStudentStats, pickHighest: boolean): typeof allStudentStats => {
    const classLevels = ['JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'];
    const selected: typeof allStudentStats = [];
    const seenIds = new Set<string>();

    // First pick one top/bottom student from each class level
    for (const lvl of classLevels) {
      const matching = list.filter(s => s.levelName === lvl);
      if (matching.length > 0) {
        const sorted = [...matching].sort((a, b) =>
          pickHighest ? (b.average || 0) - (a.average || 0) : (a.average || 0) - (b.average || 0)
        );
        selected.push(sorted[0]);
        seenIds.add(sorted[0].student.id);
      }
    }

    // Fill up to 7 students if needed from remaining students
    const remainder = list.filter(s => !seenIds.has(s.student.id));
    const sortedRemainder = [...remainder].sort((a, b) =>
      pickHighest ? (b.average || 0) - (a.average || 0) : (a.average || 0) - (b.average || 0)
    );

    while (selected.length < 7 && sortedRemainder.length > 0) {
      const nextStudent = sortedRemainder.shift();
      if (nextStudent) selected.push(nextStudent);
    }

    return selected;
  };

  // Determine displayed Honors list (6-7 representative by default, or all when toggled)
  const displayedHonors = useMemo(() => {
    if (showAllHonors || searchTerm.trim() || sectionFilter !== 'ALL') {
      return filteredHonors;
    }
    return getRepresentativeList(filteredHonors, true);
  }, [filteredHonors, showAllHonors, searchTerm, sectionFilter]);

  // Determine displayed Support list (6-7 representative by default, or all when toggled)
  const displayedSupport = useMemo(() => {
    if (showAllSupport || searchTerm.trim() || sectionFilter !== 'ALL') {
      return filteredSupport;
    }
    return getRepresentativeList(filteredSupport, false);
  }, [filteredSupport, showAllSupport, searchTerm, sectionFilter]);

  const generateCertificateHTML = (item: any) => {
    const studentName = item.student.name || `${item.student.firstName} ${item.student.lastName}`;
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const principalName = schoolSettings?.principalName || 'Dr. Alistair Montgomery';
    const principalTitle = schoolSettings?.principalTitle || 'Principal & Head of School';
    const signatureImg = schoolSettings?.principalSignatureUrl
      ? `<img src="${schoolSettings.principalSignatureUrl}" alt="Signature" style="height: 46px; margin-bottom: -15px; display: block; margin-left: auto; margin-right: auto;" />`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Principal's Honors Certificate - ${studentName}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      font-family: 'Times New Roman', Times, Georgia, serif;
      margin: 0; padding: 25px; background-color: #f8fafc; color: #1e293b;
      display: flex; align-items: center; justify-content: center; min-height: 95vh;
    }
    .cert-container {
      width: 100%; max-width: 1020px; background: #ffffff;
      border: 10px double #b45309; padding: 45px 55px; text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08); position: relative;
    }
    .school-name {
      font-size: 28px; font-weight: bold; color: #78350f; letter-spacing: 3px;
      text-transform: uppercase; margin: 0 0 4px 0;
    }
    .school-motto {
      font-size: 13px; font-style: italic; color: #64748b; margin-bottom: 25px; letter-spacing: 1px;
    }
    .cert-title-box {
      border-top: 2px solid #d97706; border-bottom: 2px solid #d97706;
      padding: 10px 0; margin: 20px auto 25px auto; max-width: 650px;
    }
    .cert-title {
      font-size: 30px; font-weight: bold; color: #b45309; text-transform: uppercase;
      letter-spacing: 3px; margin: 0;
    }
    .cert-subtitle {
      font-size: 13px; color: #92400e; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px;
    }
    .presented-text {
      font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: #475569; margin-top: 22px;
    }
    .student-name {
      font-size: 36px; font-weight: bold; color: #0f172a; margin: 14px 0;
      border-bottom: 2px solid #b45309; display: inline-block; padding: 0 40px 6px 40px;
    }
    .citation {
      font-size: 15px; line-height: 1.7; color: #334155; max-width: 780px; margin: 20px auto;
    }
    .highlight-score {
      font-weight: bold; color: #b45309; font-size: 17px;
    }
    .signatures-row {
      display: flex; justify-content: space-between; align-items: flex-end; margin-top: 45px; padding: 0 30px;
    }
    .sig-col { width: 220px; text-align: center; }
    .sig-line {
      border-top: 1.5px solid #475569; padding-top: 6px; font-size: 13px; font-weight: bold; color: #0f172a;
    }
    .sig-sub { font-size: 11px; color: #64748b; }
    .seal-box {
      width: 90px; height: 90px; border-radius: 50%; border: 3px dashed #b45309;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-size: 10px; font-weight: bold; color: #92400e; text-transform: uppercase; margin: 0 auto;
    }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="school-name">Everest International Schools</div>
    <div class="school-motto">Excellence • Integrity • Leadership</div>
    <div class="cert-title-box">
      <h1 class="cert-title">Principal's Honors Certificate</h1>
      <div class="cert-subtitle">Certificate of Academic Distinction</div>
    </div>
    <div class="presented-text">This is proudly awarded to</div>
    <div class="student-name">${studentName}</div>
    <div class="citation">
      In recognition of academic distinction and superior performance in <strong>${item.classFullName}</strong> (Admission No: <strong>${item.student.admissionNumber}</strong>), maintaining a cumulative distinction average of <span class="highlight-score">${item.average}%</span> during the <strong>${activeSession?.name || '2025/2026'} Academic Session • ${activeTerm?.name || '2nd Term'}</strong>.
    </div>
    <div class="signatures-row">
      <div class="sig-col">
        <div class="sig-line">${dateStr}</div>
        <div class="sig-sub">Date of Issue</div>
      </div>
      <div class="sig-col">
        <div class="seal-box">
          <span>Official Seal</span>
          <span>of Excellence</span>
        </div>
      </div>
      <div class="sig-col">
        ${signatureImg}
        <div class="sig-line">${principalName}</div>
        <div class="sig-sub">${principalTitle}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const handlePrintCertificate = (item: any) => {
    const studentName = item.student.name || `${item.student.firstName} ${item.student.lastName}`;
    const printWindow = window.open('', '_blank', 'width=1020,height=720');
    if (!printWindow) {
      window.print();
      return;
    }
    const html = generateCertificateHTML(item);
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 450);
    showToast(`Print dialog opened for ${studentName}'s Honors Certificate.`);
  };

  const handleDownloadCertificate = (item: any) => {
    const studentName = item.student.name || `${item.student.firstName} ${item.student.lastName}`;
    const cleanName = studentName.replace(/\s+/g, '_');
    const html = generateCertificateHTML(item);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EIS_Honors_Certificate_${cleanName}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Honors Certificate downloaded for ${studentName}.`);
  };

  const handlePrintSupportSummary = (item: any) => {
    const studentName = item.student.name || `${item.student.firstName} ${item.student.lastName}`;
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      window.print();
      return;
    }
    const deficiencies = item.subjectsNeedingImprovement.map((s: any) => `<li style="margin-bottom: 6px;"><strong>${s.name}</strong>: ${s.total}% (Grade: ${s.grade})</li>`).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Academic Support Plan - ${studentName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 35px; color: #1e293b; line-height: 1.6; }
            h1 { color: #b91c1c; font-size: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 0; }
            .meta { margin: 15px 0 25px 0; font-size: 13px; background: #f8fafc; padding: 12px 16px; border-radius: 8px; }
            .meta div { margin-bottom: 4px; }
            .section-title { font-weight: bold; margin: 20px 0 8px 0; text-transform: uppercase; font-size: 12px; color: #475569; }
            ul { margin: 8px 0; padding-left: 20px; font-size: 13px; }
            .plan-box { background: #fef2f2; border: 1px solid #fee2e2; padding: 15px; border-radius: 8px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Everest International Schools • Academic Support Plan</h1>
          <div class="meta">
            <div><strong>Student Name:</strong> ${studentName}</div>
            <div><strong>Class:</strong> ${item.classFullName} &nbsp;|&nbsp; <strong>Admission No:</strong> ${item.student.admissionNumber}</div>
            <div><strong>Current Term Average:</strong> ${item.average}% (${activeTerm?.name || '2nd Term'})</div>
            <div><strong>Date Generated:</strong> ${dateStr}</div>
          </div>
          <div class="section-title">Subjects Requiring Targeted Academic Intervention</div>
          <ul>${deficiencies}</ul>
          <div class="plan-box">
            <div class="section-title" style="color: #991b1b;">Recommended School Actions</div>
            <ul>
              <li>Assign weekly remedial tutorials in deficient subject areas</li>
              <li>Continuous performance logging by Form Master</li>
              <li>Schedule parent academic consultation</li>
            </ul>
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  };

  const handleSaveSupportPlan = (item: any) => {
    const studentName = item.student.name || `${item.student.firstName} ${item.student.lastName}`;
    const selectedActions: string[] = [];
    if (remedialTutorials) selectedActions.push('Weekly remedial tutorials');
    if (formMasterTracking) selectedActions.push('Form Master weekly tracking');
    if (parentConsultation) selectedActions.push('Parent academic consultation');
    if (planNotes.trim()) selectedActions.push(`Notes: ${planNotes.trim()}`);

    const deficienciesSummary = item.subjectsNeedingImprovement
      .map((s: any) => `${s.name} (${s.total}%)`)
      .join(', ');

    // 1. Add official pastoral record (stored in state & localStorage)
    addPastoralLog({
      studentId: item.student.id,
      studentName: studentName,
      admissionNumber: item.student.admissionNumber,
      classArmId: item.student.currentClassArmId || 'arm-1',
      date: new Date().toISOString().split('T')[0],
      category: 'PARENT_COMMUNICATION',
      note: `Academic Support Plan initiated. Deficient areas: ${deficienciesSummary}. ${planNotes.trim() ? `Instructions: ${planNotes.trim()}` : ''}`,
      actionTaken: selectedActions.join('; '),
      recordedBy: user?.id || 'stf-001',
      recordedByName: user?.name || 'Principal'
    });

    // 2. Add Activity History record
    addAuditLog({
      userId: user?.id || 'stf-001',
      userIdentifier: user?.identifier || user?.staffId || 'PRN-001',
      userName: user?.name || 'Principal',
      userRole: user?.activeRole || 'PRINCIPAL',
      action: 'SETTINGS_UPDATED',
      targetEntity: `Support Plan: ${studentName} (${item.classFullName})`,
      details: `Principal authorized an academic support plan for ${studentName}. Measures: ${selectedActions.join(', ')}.`,
      metadata: {
        studentId: item.student.id,
        admissionNumber: item.student.admissionNumber,
        reason: `Targeted academic intervention for ${deficienciesSummary}`
      }
    });

    // 3. Dispatch official communication directive if communications is enabled
    if (sendMessage) {
      sendMessage({
        threadId: `th-support-${item.student.id}-${Date.now()}`,
        senderId: user?.id || 'stf-001',
        senderName: user?.name || 'Principal',
        senderRole: 'PRINCIPAL',
        recipientId: 'form-master',
        recipientName: 'Form Master',
        recipientRole: 'FORM_MASTER',
        subject: `Academic Support Plan Directive: ${studentName} (${item.classFullName})`,
        content: `An academic intervention plan has been authorized for ${studentName} (${item.student.admissionNumber}) in ${item.classFullName}. Deficient subjects: ${deficienciesSummary}. Actions: ${selectedActions.join(', ')}. Please monitor and update the progress register.`,
        priority: 'URGENT'
      });
    }

    showToast(`Academic Support Plan saved to student profile and recorded in Activity History.`);
    setSelectedSupportStudent(null);
    setPlanNotes('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 flex items-center justify-center">
              <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="font-serif-title font-bold text-slate-900 dark:text-white text-xl tracking-tight">
              Academic Performance
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            Review top-performing honors students and identify students who need academic support for{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {activeSession?.name || '2025/2026'} • {activeTerm?.name || '2nd Term'}
            </span>.
          </p>
        </div>

        {/* Quick Stat Pill */}
        {topOverallAverage > 0 && (
          <div className="px-3.5 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2 self-start md:self-auto">
            <Medal className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Top Average: {topOverallAverage}%</span>
          </div>
        )}
      </div>

      {/* Four Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Honors Students */}
        <div
          onClick={() => setActiveTab('HONORS')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            activeTab === 'HONORS'
              ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 ring-2 ring-amber-400/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Honors Students</span>
            <Award className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif-title font-bold text-amber-700 dark:text-amber-300 font-mono-tabular">
            {allHonorsStudents.length}
          </div>
          <p className="text-[11px] text-amber-800/80 dark:text-amber-400 font-medium mt-1">
            Students with an average of 75% or higher.
          </p>
        </div>

        {/* Card 2: Students Needing Support */}
        <div
          onClick={() => setActiveTab('SUPPORT')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            activeTab === 'SUPPORT'
              ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 ring-2 ring-rose-400/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Students Needing Support</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif-title font-bold text-rose-700 dark:text-rose-300 font-mono-tabular">
            {allSupportStudents.length}
          </div>
          <p className="text-[11px] text-rose-800/80 dark:text-rose-400 font-medium mt-1">
            Students performing below the required level and needing academic support.
          </p>
        </div>

        {/* Card 3: Junior Honors */}
        <div
          onClick={() => {
            setActiveTab('HONORS');
            setSectionFilter('JSS');
          }}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 ${
            activeTab === 'HONORS' && sectionFilter === 'JSS' ? 'ring-2 ring-indigo-400/20' : ''
          }`}
        >
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Junior Honors</span>
            <GraduationCap className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif-title font-bold text-slate-900 dark:text-white font-mono-tabular">
            {juniorHonorsCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Qualifying honors students in JSS1–JSS3.
          </p>
        </div>

        {/* Card 4: Senior Honors */}
        <div
          onClick={() => {
            setActiveTab('HONORS');
            setSectionFilter('SSS');
          }}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 ${
            activeTab === 'HONORS' && sectionFilter === 'SSS' ? 'ring-2 ring-indigo-400/20' : ''
          }`}
        >
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Senior Honors</span>
            <Medal className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif-title font-bold text-slate-900 dark:text-white font-mono-tabular">
            {seniorHonorsCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Qualifying honors students in SSS1–SSS3.
          </p>
        </div>
      </div>

      {/* Navigation Controls: Tabs & Section Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Section Tabs */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('HONORS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'HONORS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Principal's Honors List ({allHonorsStudents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('SUPPORT')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'SUPPORT'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Students Needing Support ({allSupportStudents.length})</span>
          </button>
        </div>

        {/* Search & All / JSS / SSS Filter */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student or class..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setSectionFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                sectionFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSectionFilter('JSS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                sectionFilter === 'JSS'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              JSS
            </button>
            <button
              onClick={() => setSectionFilter('SSS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                sectionFilter === 'SSS'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              SSS
            </button>
          </div>
        </div>
      </div>

      {/* Section 1: Principal's Honors List */}
      {activeTab === 'HONORS' && (
        <div className="space-y-4">
          {/* Section Banner */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 sm:p-5 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-amber-950 dark:text-amber-200">
                  Principal's Honors List
                </h2>
                <p className="text-xs text-amber-800/80 dark:text-amber-400 mt-0.5">
                  Students with an average of 75% or higher.
                </p>
              </div>
            </div>

            {/* Indicator & View All Toggle */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200 font-mono-tabular">
                Showing {displayedHonors.length} of {filteredHonors.length} Qualifying Students
              </span>
              {filteredHonors.length > 7 && !searchTerm.trim() && sectionFilter === 'ALL' && (
                <button
                  onClick={() => setShowAllHonors(!showAllHonors)}
                  className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  {showAllHonors ? (
                    <>
                      <span>Show Sample Overview (6)</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>View All ({filteredHonors.length})</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Honors Students Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedHonors.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                No honors students match the selected filter.
              </div>
            ) : (
              displayedHonors.map((item, idx) => (
                <div
                  key={item.student.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs hover:border-amber-300 dark:hover:border-amber-700 transition-all space-y-4 relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Name, Class, and Average */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center justify-center font-mono-tabular">
                            #{idx + 1}
                          </span>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            {item.student.name || `${item.student.firstName} ${item.student.lastName}`}
                          </h3>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{item.classFullName}</span>
                          <span>•</span>
                          <span className="font-mono-tabular text-[11px]">{item.student.admissionNumber}</span>
                        </div>
                      </div>

                      {/* Prominent Average Score Display */}
                      <div className="text-right shrink-0">
                        <div className="text-lg sm:text-xl font-serif-title font-bold text-amber-600 dark:text-amber-400 font-mono-tabular">
                          {item.average !== null ? `${item.average}%` : 'N/A'}
                        </div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Average</span>
                      </div>
                    </div>

                    {/* Relevant Subjects & Performance Details */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800/80 text-xs space-y-1.5">
                      {item.bestSubject && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Best Subject:</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">
                            {item.bestSubject.name} ({item.bestSubject.total}%)
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Total Points:</span>
                        <strong className="font-mono-tabular text-slate-800 dark:text-slate-200">
                          {item.totalAggregate} pts across {item.scoresCount} subjects
                        </strong>
                      </div>

                      {item.topSubjects.length > 1 && (
                        <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-[10px] font-bold text-slate-400 block mb-1">Top Scores:</span>
                          <div className="flex flex-wrap gap-1">
                            {item.topSubjects.map((sub, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[11px] font-medium text-slate-700 dark:text-slate-200"
                              >
                                {sub.name}: <strong>{sub.total}%</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => setSelectedHonorsStudent(item)}
                    className="w-full py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>View Certificate Details</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Section 2: Students Needing Support */}
      {activeTab === 'SUPPORT' && (
        <div className="space-y-4">
          {/* Section Banner */}
          <div className="bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent p-4 sm:p-5 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-rose-950 dark:text-rose-200">
                  Students Needing Support
                </h2>
                <p className="text-xs text-rose-800/80 dark:text-rose-400 mt-0.5">
                  Students performing below the required level and needing academic support.
                </p>
              </div>
            </div>

            {/* Indicator & View All Toggle */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span className="text-xs font-bold text-rose-900 dark:text-rose-200 font-mono-tabular">
                Showing {displayedSupport.length} of {filteredSupport.length} Students
              </span>
              {filteredSupport.length > 7 && !searchTerm.trim() && sectionFilter === 'ALL' && (
                <button
                  onClick={() => setShowAllSupport(!showAllSupport)}
                  className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/60 dark:hover:bg-rose-900 text-rose-900 dark:text-rose-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  {showAllSupport ? (
                    <>
                      <span>Show Sample Overview (6)</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>View All ({filteredSupport.length})</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Support Students Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedSupport.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                No students currently need academic support in this filter.
              </div>
            ) : (
              displayedSupport.map(item => (
                <div
                  key={item.student.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs hover:border-rose-300 dark:hover:border-rose-700 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Name, Class, and Average */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            {item.student.name || `${item.student.firstName} ${item.student.lastName}`}
                          </h3>
                          {pastoralLogs && pastoralLogs.some(
                            p => p.studentId === item.student.id || (item.student.admissionNumber && p.admissionNumber === item.student.admissionNumber)
                          ) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                              <Check className="w-2.5 h-2.5" />
                              Plan Active
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{item.classFullName}</span>
                          <span>•</span>
                          <span className="font-mono-tabular text-[11px]">{item.student.admissionNumber}</span>
                        </div>
                      </div>

                      {/* Prominent Average Score Display */}
                      <div className="text-right shrink-0">
                        <div className="text-lg sm:text-xl font-serif-title font-bold text-rose-600 dark:text-rose-400 font-mono-tabular">
                          {item.average !== null ? `${item.average}%` : 'N/A'}
                        </div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Average</span>
                      </div>
                    </div>

                    {/* Subjects Needing Improvement */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                        Subjects Needing Improvement:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.subjectsNeedingImprovement.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">No specific subject deficiencies recorded</span>
                        ) : (
                          item.subjectsNeedingImprovement.map((sub, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 text-xs font-semibold"
                            >
                              {sub.name}: <strong>{sub.total}%</strong>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <button
                    onClick={() => setSelectedSupportStudent(item)}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>View Details</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Honors Certificate & Details */}
      {selectedHonorsStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-amber-200 dark:border-amber-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-title font-bold text-slate-900 dark:text-white text-base">
                    Principal's Honors Certificate
                  </h3>
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                    Academic Distinction Recognition
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedHonorsStudent(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-amber-50/50 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-800/60 text-center space-y-2.5">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                Officially Awarded To
              </p>
              <h2 className="font-serif-title font-bold text-xl text-slate-900 dark:text-white">
                {selectedHonorsStudent.student.name || `${selectedHonorsStudent.student.firstName} ${selectedHonorsStudent.student.lastName}`}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Class: <strong>{selectedHonorsStudent.classFullName}</strong> • Admission No: <strong>{selectedHonorsStudent.student.admissionNumber}</strong>
              </p>

              <div className="py-1">
                <span className="px-3.5 py-1.5 rounded-full bg-amber-500 text-white font-bold text-xs shadow-xs">
                  Overall Average: {selectedHonorsStudent.average}%
                </span>
              </div>

              <div className="pt-2 text-left space-y-1 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Performance Highlights:</span>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                  <div>Best Subject: <strong className="text-emerald-600">{selectedHonorsStudent.bestSubject?.name} ({selectedHonorsStudent.bestSubject?.total}%)</strong></div>
                  <div>Total Points: <strong>{selectedHonorsStudent.totalAggregate} pts</strong></div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedHonorsStudent(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadCertificate(selectedHonorsStudent)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Download certificate file (.html) to your computer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>Download File</span>
              </button>
              <button
                onClick={() => handlePrintCertificate(selectedHonorsStudent)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Print or Save as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save as PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Students Needing Support Details */}
      {selectedSupportStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-rose-200 dark:border-rose-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-title font-bold text-slate-900 dark:text-white text-base">
                    Academic Support Details
                  </h3>
                  <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                    Targeted Academic Improvement Plan
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedSupportStudent(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedSupportStudent.student.name || `${selectedSupportStudent.student.firstName} ${selectedSupportStudent.student.lastName}`}
                  </span>
                  <span className="font-mono-tabular text-slate-500">
                    {selectedSupportStudent.student.admissionNumber}
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  Class: <strong>{selectedSupportStudent.classFullName}</strong> • Overall Average: <strong className="text-rose-600">{selectedSupportStudent.average}%</strong>
                </div>
              </div>

              {/* Subjects Needing Improvement Breakdown */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Subjects Needing Improvement
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedSupportStudent.subjectsNeedingImprovement.map((sub: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between"
                    >
                      <span className="font-semibold text-rose-900 dark:text-rose-200 truncate">{sub.name}</span>
                      <span className="font-mono-tabular font-bold text-rose-700 dark:text-rose-400 shrink-0">
                        {sub.total}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Support Plan Checklist */}
              <div className="space-y-2 pt-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Recommended Academic Support Actions
                </label>
                <div className="space-y-2 text-slate-700 dark:text-slate-300">
                  <label className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={remedialTutorials}
                      onChange={e => setRemedialTutorials(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Assign weekly remedial tutorials in deficient subjects</span>
                  </label>
                  <label className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={formMasterTracking}
                      onChange={e => setFormMasterTracking(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Notify Form Master for continuous academic progress tracking</span>
                  </label>
                  <label className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={parentConsultation}
                      onChange={e => setParentConsultation(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Schedule parent academic consultation with subject teachers</span>
                  </label>
                </div>
              </div>

              {/* Optional Custom Instructions / Notes */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block text-xs">
                  Specific Teacher / Form Master Directives (Optional)
                </label>
                <textarea
                  placeholder="e.g. Focus on foundational algebra principles and daily revision drills..."
                  value={planNotes}
                  onChange={e => setPlanNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setSelectedSupportStudent(null);
                  setPlanNotes('');
                }}
                className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => handlePrintSupportSummary(selectedSupportStudent)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Print Academic Support Plan"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>Print Plan</span>
              </button>
              <button
                onClick={() => handleSaveSupportPlan(selectedSupportStudent)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Save Support Plan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
