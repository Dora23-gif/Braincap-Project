import React, { useState } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import {
  Award,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  Search,
  CheckCircle2,
  Calendar,
  Send,
  FileText,
  UserX,
  Mail,
  Medal,
  Crown
} from 'lucide-react';

export const PrincipalHonorsProbationView: React.FC = () => {
  const { students, classArms, subjects, scores, activeTerm, activeSession } = useSchoolData();

  const [activeTab, setActiveTab] = useState<'HONORS' | 'PROBATION'>('HONORS');
  const [sectionFilter, setSectionFilter] = useState<'ALL' | 'JUNIOR' | 'SENIOR'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [selectedHonorsStudent, setSelectedHonorsStudent] = useState<any | null>(null);
  const [selectedProbationStudent, setSelectedProbationStudent] = useState<any | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Process all students and their term averages
  const allStudentStats = students.map(student => {
    const arm = classArms.find(a => a.id === student.currentClassArmId);
    const sReg = student.registeredSubjectIds || [];
    const sScores = scores.filter(
      sc => sc.studentId === student.id && sc.termId === activeTerm.id && (sReg.length === 0 || sReg.includes(sc.subjectId))
    );

    const totalAggregate = sScores.reduce((acc, sc) => acc + sc.total, 0);
    const average = sScores.length > 0 ? Number((totalAggregate / sScores.length).toFixed(1)) : 0;

    // Highest subject
    const sortedSubjectScores = [...sScores].sort((a, b) => b.total - a.total);
    const bestSubjectScore = sortedSubjectScores[0];
    const bestSubject = subjects.find(sub => sub.id === bestSubjectScore?.subjectId);

    // Deficient subjects (< 50)
    const deficientSubjectScores = sScores.filter(s => s.total < 50);
    const deficientSubjects = deficientSubjectScores.map(sc => {
      const sub = subjects.find(s => s.id === sc.subjectId);
      return {
        name: sub?.name || 'Subject',
        code: sub?.code || '',
        total: sc.total
      };
    });

    const isJunior = arm?.fullName.includes('JSS');

    return {
      student,
      arm,
      isJunior,
      scores: sScores,
      totalAggregate,
      average,
      bestSubject: bestSubject ? { name: bestSubject.name, total: bestSubjectScore.total } : null,
      deficientSubjects
    };
  });

  // Filter Honors Students (>= 75%)
  const honorsStudents = allStudentStats
    .filter(s => s.average >= 75)
    .sort((a, b) => b.average - a.average);

  // Filter Probation Students (< 45% or >= 3 deficient subjects)
  const probationStudents = allStudentStats
    .filter(s => s.average < 45 || s.deficientSubjects.length >= 3)
    .sort((a, b) => a.average - b.average);

  // Filtered lists based on search and section
  const filterList = (list: typeof allStudentStats) => {
    return list.filter(item => {
      const studentFullName = item.student.name || `${item.student.firstName} ${item.student.lastName}`;
      const matchesSearch =
        studentFullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.arm?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSection =
        sectionFilter === 'ALL' ||
        (sectionFilter === 'JUNIOR' && item.isJunior) ||
        (sectionFilter === 'SENIOR' && !item.isJunior);

      return matchesSearch && matchesSection;
    });
  };

  const displayedHonors = filterList(honorsStudents);
  const displayedProbation = filterList(probationStudents);

  const highestScore = honorsStudents[0]?.average || 0;

  const handleIssueCommendation = (studentName: string) => {
    showToast(`Official Principal's Commendation Certificate prepared for ${studentName}. Added to Speech Day Dossier.`);
    setSelectedHonorsStudent(null);
  };

  const handleSummonConference = (studentName: string) => {
    showToast(`Executive Parent Conference notice dispatched for ${studentName}. Case file created.`);
    setSelectedProbationStudent(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-600 dark:text-amber-500 shrink-0" />
            <h1 className="font-serif-title font-bold text-slate-900 dark:text-white text-lg tracking-tight">
              HONORS ROLL & ACADEMIC PROBATION MONITOR
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Executive oversight tracking academic distinction scholars (&ge;75%) and students requiring urgent pastoral/remedial intervention (&lt;45%) for{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{activeSession.name} • {activeTerm.name}</span>.
          </p>
        </div>

        {/* Quick Stats Pills */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-amber-600" />
            <span>Top Scholar: {highestScore}%</span>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('HONORS')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            activeTab === 'HONORS'
              ? 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 ring-2 ring-amber-400/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Honors Scholars</span>
            <Crown className="w-4 h-4" />
          </div>
          <div className="text-2xl font-serif-title font-bold text-amber-700 dark:text-amber-300 font-mono-tabular">
            {honorsStudents.length}
          </div>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-400 font-medium">
            {Math.round((honorsStudents.length / (students.length || 1)) * 100)}% of student body (&ge;75% average)
          </span>
        </div>

        <div
          onClick={() => setActiveTab('PROBATION')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            activeTab === 'PROBATION'
              ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 ring-2 ring-rose-400/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Academic Probation</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-serif-title font-bold text-rose-700 dark:text-rose-300 font-mono-tabular">
            {probationStudents.length}
          </div>
          <span className="text-[10px] text-rose-600/80 dark:text-rose-400 font-medium">
            Sub-benchmark (&lt;45%) or 3+ failures
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Junior Honors</span>
            <GraduationCap className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-serif-title font-bold text-slate-900 dark:text-white font-mono-tabular">
            {honorsStudents.filter(s => s.isJunior).length}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">JSS 1 – JSS 3 Scholars</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Senior Honors</span>
            <Medal className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-serif-title font-bold text-slate-900 dark:text-white font-mono-tabular">
            {honorsStudents.filter(s => !s.isJunior).length}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">SSS 1 – SSS 3 Scholars</span>
        </div>
      </div>

      {/* Navigation Controls: Tabs & Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Segmented Tab Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('HONORS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'HONORS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Principal's Honors Roll ({honorsStudents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('PROBATION')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'PROBATION'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Academic Probation Watchlist ({probationStudents.length})</span>
          </button>
        </div>

        {/* Search & Section Filter */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search scholar or arm..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={sectionFilter}
            onChange={e => setSectionFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Sections</option>
            <option value="JUNIOR">Junior Secondary (JSS)</option>
            <option value="SENIOR">Senior Secondary (SSS)</option>
          </select>
        </div>
      </div>

      {/* Tab 1: Honors Roll View */}
      {activeTab === 'HONORS' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-amber-950 dark:text-amber-200">
                  Everest International Schools Dean & Principal's Commendation List
                </h3>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-400">
                  Scholars attaining a cumulative average of 75% or higher across all registered subjects.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 font-mono-tabular">
              {displayedHonors.length} Laureates Listed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedHonors.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                No scholars currently match the distinction criteria in this filter.
              </div>
            ) : (
              displayedHonors.map((item, idx) => (
                <div
                  key={item.student.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs hover:border-amber-300 dark:hover:border-amber-700 transition-all space-y-4 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-400/20 to-transparent rounded-bl-full pointer-events-none" />

                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold text-sm flex items-center justify-center font-mono-tabular">
                        #{idx + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                          {item.student.name || `${item.student.firstName} ${item.student.lastName}`}
                        </h4>
                        <span className="text-[11px] text-slate-400 font-mono-tabular">
                          {item.student.admissionNumber} • {item.arm?.fullName}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-serif-title font-bold text-base text-amber-600 dark:text-amber-400 font-mono-tabular">
                        {item.average}%
                      </div>
                      <span className="text-[10px] text-slate-400">Mean Score</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300">
                      <span>Total Aggregate:</span>
                      <strong className="font-mono-tabular">{item.totalAggregate} pts</strong>
                    </div>
                    {item.bestSubject && (
                      <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300">
                        <span>Top Subject:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {item.bestSubject.name} ({item.bestSubject.total}%)
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300">
                      <span>School House:</span>
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">{item.student.house}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedHonorsStudent(item)}
                    className="w-full py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                    <span>View Commendation Citation</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Academic Probation View */}
      {activeTab === 'PROBATION' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-rose-950 dark:text-rose-200">
                  Institutional Academic Intervention & Probation Registry
                </h3>
                <p className="text-[11px] text-rose-800/80 dark:text-rose-400">
                  Scholars below the 45% passing threshold or failing multiple core subjects. Immediate remedial directive active.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-rose-900 dark:text-rose-200 font-mono-tabular">
              {displayedProbation.length} Cases Monitored
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedProbation.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                No scholars currently on the probation watchlist in this filter.
              </div>
            ) : (
              displayedProbation.map(item => (
                <div
                  key={item.student.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs hover:border-rose-300 dark:hover:border-rose-700 transition-all space-y-4 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                        {item.student.name || `${item.student.firstName} ${item.student.lastName}`}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono-tabular">
                        {item.student.admissionNumber} • {item.arm?.fullName}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="font-serif-title font-bold text-base text-rose-600 dark:text-rose-400 font-mono-tabular">
                        {item.average}%
                      </div>
                      <span className="text-[10px] text-rose-600 font-semibold uppercase">Probation</span>
                    </div>
                  </div>

                  {/* Deficiencies Breakdown */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                      Deficient Subjects (&lt;50%):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {item.deficientSubjects.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">Overall average below benchmark</span>
                      ) : (
                        item.deficientSubjects.map(d => (
                          <span
                            key={d.code}
                            className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold"
                          >
                            {d.name}: {d.total}%
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedProbationStudent(item)}
                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Issue Pastoral Intervention</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal: Honors Commendation Citation */}
      {selectedHonorsStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-amber-200 dark:border-amber-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif-title font-bold text-slate-900 dark:text-white text-base">
                  Principal's Commendation Certificate
                </h3>
                <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  Everest International Schools • Office of the Principal
                </span>
              </div>
            </div>

            <div className="p-4 bg-amber-50/50 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-800/60 text-center space-y-2">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                This is to officially certify that
              </p>
              <h2 className="font-serif-title font-bold text-lg text-slate-900 dark:text-white">
                {selectedHonorsStudent.student.name}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Class Arm: <strong>{selectedHonorsStudent.arm?.fullName}</strong> • Admission No: <strong>{selectedHonorsStudent.student.admissionNumber}</strong>
              </p>
              <div className="py-2">
                <span className="px-3 py-1 rounded-full bg-amber-500 text-white font-bold text-xs shadow-xs">
                  Academic Distinction Average: {selectedHonorsStudent.average}%
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                "For exhibiting superior intellectual rigor, impeccable moral standing, and meritorious academic distinction during the {activeTerm.name}."
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedHonorsStudent(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => handleIssueCommendation(selectedHonorsStudent.student.name)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Endorse & Issue Certificate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Academic Probation Pastoral Intervention */}
      {selectedProbationStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-rose-200 dark:border-rose-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif-title font-bold text-slate-900 dark:text-white text-base">
                  Issue Pastoral Intervention Directive
                </h3>
                <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                  Case File: {selectedProbationStudent.student.name} ({selectedProbationStudent.arm?.fullName})
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-rose-50/60 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-1">
                <div className="font-bold">Probation Summary:</div>
                <div>Overall Term Average: <strong className="font-mono-tabular">{selectedProbationStudent.average}%</strong></div>
                <div>Deficient Subjects: {selectedProbationStudent.deficientSubjects.map((d: any) => `${d.name} (${d.total}%)`).join(', ') || 'General academic deficiency'}</div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Mandatory Intervention Protocol</label>
                <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded text-rose-600" />
                    <span>Summon Parents for Executive Conference with Principal</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded text-rose-600" />
                    <span>Assign Mandatory Remedial After-School Clinics</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded text-rose-600" />
                    <span>Weekly Form Master Academic Progress Logging</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedProbationStudent(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSummonConference(selectedProbationStudent.student.name)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Intervention Order</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
