import React, { useState } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  Stamp,
  CheckCircle2,
  AlertTriangle,
  Award,
  Search,
  Save,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  Sparkles,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { ModalPortal } from '../../components/common/ModalPortal';

export const PrincipalRemarkingView: React.FC = () => {
  const { user } = useAuth();
  const {
    students,
    classArms,
    subjects,
    scores,
    affectiveTraits,
    staff,
    activeTerm,
    activeSession,
    togglePrincipalTermClearance,
    updatePrincipalStudentRemark,
    batchUpdatePrincipalRemarks,
    sendMessage
  } = useSchoolData();

  const [selectedArmId, setSelectedArmId] = useState<string>(classArms[0]?.id || '');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState('');
  const [currentRemarkText, setCurrentRemarkText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isClearanceModalOpen, setIsClearanceModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const selectedArm = classArms.find(a => a.id === selectedArmId) || classArms[0];
  const formMaster = staff.find(s => s.formMasterArmId === selectedArm?.id || s.formMasterClassArmId === selectedArm?.id);

  // Students in selected arm
  const armStudents = students.filter(s => s.currentClassArmId === selectedArm?.id);

  // Calculate terminal stats for students in arm
  const studentStats = armStudents.map(student => {
    const sReg = student.registeredSubjectIds || [];
    const sScores = scores.filter(
      sc => sc.studentId === student.id && sc.termId === activeTerm.id && (sReg.length === 0 || sReg.includes(sc.subjectId))
    );
    const totalAggregate = sScores.reduce((acc, sc) => acc + sc.total, 0);
    const average = sScores.length > 0 ? Number((totalAggregate / sScores.length).toFixed(1)) : 0;
    const trait = affectiveTraits.find(t => t.studentId === student.id && t.termId === activeTerm.id);

    return {
      student,
      scores: sScores,
      totalAggregate,
      average,
      formMasterRemark: trait?.formMasterRemark || 'No Form Master remark recorded yet.',
      principalRemark: trait?.principalRemark || ''
    };
  }).sort((a, b) => b.totalAggregate - a.totalAggregate);

  // Default selected student to first student in arm
  const activeStudentItem = studentStats.find(s => s.student.id === selectedStudentId) || studentStats[0];

  // Sync text area when active student changes
  React.useEffect(() => {
    if (activeStudentItem) {
      setCurrentRemarkText(activeStudentItem.principalRemark || '');
    }
  }, [activeStudentItem?.student.id]);

  // Executive Remark Presets
  const remarkPresets = [
    {
      title: 'Academic Distinction',
      badge: 'Gold',
      text: 'Outstanding academic excellence throughout the term. Awarded the Principal\'s Commendation for Distinction.'
    },
    {
      title: 'High Commendation',
      badge: 'Emerald',
      text: 'A very commendable academic performance. Shows intellect, character, and exemplary diligence.'
    },
    {
      title: 'Encouragement & Focus',
      badge: 'Blue',
      text: 'Good performance with promising potential. Stricter focus on core subjects will unlock higher honours.'
    },
    {
      title: 'Academic Probation',
      badge: 'Rose',
      text: 'Placed on Academic Probation due to sub-benchmark scores. Mandatory remedial tutoring and parent conference required.'
    },
    {
      title: 'Senior Promotion',
      badge: 'Purple',
      text: 'Promoted with Honours into the senior academy. Commended for exemplary academic and moral discipline.'
    }
  ];

  const handleSaveRemark = () => {
    if (!activeStudentItem) return;
    const sName = activeStudentItem.student.name || `${activeStudentItem.student.firstName} ${activeStudentItem.student.lastName}`;
    updatePrincipalStudentRemark(activeStudentItem.student.id, activeTerm.id, currentRemarkText.trim());
    showToast(`Principal's remark saved for ${sName}`);
  };

  const handleSaveAndNext = () => {
    if (!activeStudentItem) return;
    const sName = activeStudentItem.student.name || `${activeStudentItem.student.firstName} ${activeStudentItem.student.lastName}`;
    updatePrincipalStudentRemark(activeStudentItem.student.id, activeTerm.id, currentRemarkText.trim());
    showToast(`Remark saved for ${sName}`);

    // Advance to next student
    const currentIndex = studentStats.findIndex(s => s.student.id === activeStudentItem.student.id);
    if (currentIndex < studentStats.length - 1) {
      const nextStudent = studentStats[currentIndex + 1];
      setSelectedStudentId(nextStudent.student.id);
    }
  };

  const handleApplyPreset = (presetText: string) => {
    setCurrentRemarkText(presetText);
  };

  const handleBatchAutoGenerate = () => {
    const updatesMap: Record<string, string> = {};
    studentStats.forEach(item => {
      if (item.average >= 75) {
        updatesMap[item.student.id] = `Outstanding academic excellence (${item.average}%). Awarded the Principal's Distinction for ${activeTerm.name}.`;
      } else if (item.average >= 60) {
        updatesMap[item.student.id] = `A very commendable academic performance (${item.average}%). Keep striving for higher distinction.`;
      } else if (item.average >= 50) {
        updatesMap[item.student.id] = `Satisfactory progress. Continued dedication in core subjects will elevate performance.`;
      } else {
        updatesMap[item.student.id] = `Placed on Academic Probation. Remedial clinic and parental conference required.`;
      }
    });

    batchUpdatePrincipalRemarks(activeTerm.id, updatesMap);
    showToast(`Auto-generated benchmark Principal remarks for all ${studentStats.length} scholars in ${selectedArm.name}!`);
  };

  const handleToggleClearance = () => {
    const willBeApproved = !activeTerm.isResultsApprovedByPrincipal;
    togglePrincipalTermClearance(activeTerm.id, {
      id: user?.id || 'stf-001',
      name: user?.name || 'Dr. Michael Adebayo',
      role: 'PRINCIPAL'
    });

    const examOfficer = staff.find(s => s.role === 'EXAMINATION_OFFICER');
    sendMessage({
      threadId: `th-clearance-${activeTerm.id}-${Date.now()}`,
      senderId: user?.id || 'stf-001',
      senderName: user?.name || 'Dr. Michael Adebayo',
      senderRole: 'PRINCIPAL',
      recipientId: examOfficer ? examOfficer.id : 'stf-002',
      recipientName: examOfficer ? examOfficer.name : 'Examination Council',
      recipientRole: 'EXAMINATION_OFFICER',
      subject: willBeApproved
        ? `Official Executive Assent Ratified: ${activeTerm.name} Results Cleared`
        : `Executive Clearance Revoked: ${activeTerm.name} Results Held for Review`,
      content: willBeApproved
        ? `The Executive Principal has completed broadsheet inspection, pastoral remarking, and formally ratified Result Clearance for ${activeTerm.name}. The Examination Council is now authorized to publish terminal broadsheets and report cards to student and parent portals.`
        : `Official Notice: Result Clearance for ${activeTerm.name} has been placed on hold by the Principal for administrative audit. Do not release report cards until further directive.`,
      priority: 'OFFICIAL_DIRECTIVE',
      relatedEntity: { type: 'RESULT_CLEARANCE', id: activeTerm.id }
    });

    setIsClearanceModalOpen(false);
    showToast(
      willBeApproved
        ? `Official Executive Assent ratified for ${activeTerm.name}. Results authorized for release!`
        : `Executive Result Clearance revoked for ${activeTerm.name}. Results locked for edits.`
    );
  };

  const filteredStudentStats = studentStats.filter(s => {
    const sName = s.student.name || `${s.student.firstName} ${s.student.lastName}`;
    return (
      sName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.student.admissionNumber.toLowerCase().includes(studentSearch.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Clearance Status Gate */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Stamp className="w-6 h-6 text-amber-600 dark:text-amber-500 shrink-0" />
            <h1 className="font-serif-title font-bold text-slate-900 dark:text-white text-lg tracking-tight">
              EXECUTIVE RESULT CLEARANCE & PRINCIPAL'S REMARKING STUDIO
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review Form Master observations, compose executive report card remarks, and grant official Executive Assent for{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{activeSession.name} • {activeTerm.name}</span>.
          </p>
        </div>

        {/* Executive Clearance Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsClearanceModalOpen(true)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer ${
              activeTerm.isResultsApprovedByPrincipal
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {activeTerm.isResultsApprovedByPrincipal
                ? 'Executive Clearance Certified [Revoke]'
                : 'Grant Executive Assent & Seal Results'}
            </span>
          </button>
        </div>
      </div>

      {/* Clearance Banner Advisory */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
        activeTerm.isResultsApprovedByPrincipal
          ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
          : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            activeTerm.isResultsApprovedByPrincipal
              ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
          }`}>
            {activeTerm.isResultsApprovedByPrincipal ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <div className="font-bold text-xs">
              {activeTerm.isResultsApprovedByPrincipal
                ? 'Official Executive Assent Active'
                : 'Principal Executive Review In Progress'}
            </div>
            <div className="text-[11px] opacity-90">
              {activeTerm.isResultsApprovedByPrincipal
                ? `Certified by ${activeTerm.principalApprovedBy || 'Principal'} on ${activeTerm.principalApprovedAt ? new Date(activeTerm.principalApprovedAt).toLocaleDateString() : 'Active Term'}. Examination Officer authorized to release terminal dossiers.`
                : 'Term results cannot be published to parents until the Principal conducts broadsheet inspection and grants formal clearance.'}
            </div>
          </div>
        </div>

        <button
          onClick={handleBatchAutoGenerate}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Batch Remark Arm ({selectedArm.name})</span>
        </button>
      </div>

      {/* Class Arm Selector Strip */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 custom-horizontal-scrollbar w-full sm:w-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            Select Class Arm:
          </span>
          {classArms.map(arm => (
            <button
              key={arm.id}
              onClick={() => {
                setSelectedArmId(arm.id);
                setSelectedStudentId('');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedArmId === arm.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {arm.fullName || arm.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Form Master: <strong className="text-slate-700 dark:text-slate-200">{formMaster?.name || 'Assigned Form Master'}</strong></span>
        </div>
      </div>

      {/* Split-Screen Remarking Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Student Roster List (4 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {selectedArm.fullName} Scholars ({armStudents.length})
              </span>
              <span className="text-[10px] text-slate-400 font-mono-tabular">
                Ranked by Aggregate
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter scholar by name or ID..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[580px] overflow-y-auto">
            {filteredStudentStats.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                No scholars match the search filter.
              </div>
            ) : (
              filteredStudentStats.map((item, idx) => {
                const isSelected = activeStudentItem?.student.id === item.student.id;
                const hasRemark = Boolean(item.principalRemark && item.principalRemark.trim().length > 0);

                return (
                  <div
                    key={item.student.id}
                    onClick={() => setSelectedStudentId(item.student.id)}
                    className={`p-3.5 transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-l-4 border-indigo-600'
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs font-mono-tabular shrink-0 ${
                        idx === 0
                          ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                          : idx === 1
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          : idx === 2
                          ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{item.student.name || `${item.student.firstName} ${item.student.lastName}`}</span>
                          {hasRemark && (
                            <span title="Principal Remark Recorded">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono-tabular">
                          {item.student.admissionNumber} • {item.student.house} House
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-serif-title font-bold text-xs text-slate-900 dark:text-white font-mono-tabular">
                        {item.average}%
                      </div>
                      <span className={`text-[10px] font-bold ${
                        item.average >= 75
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : item.average < 50
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-500'
                      }`}>
                        {item.totalAggregate} pts
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Student Workspace & Remarks Editor (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-6 space-y-5">
          {activeStudentItem ? (
            <>
              {/* Scholar Identification Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-400 text-base shrink-0">
                    {(activeStudentItem.student.name || `${activeStudentItem.student.firstName} ${activeStudentItem.student.lastName}`).split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <h3 className="font-serif-title font-bold text-slate-900 dark:text-white text-base">
                      {activeStudentItem.student.name || `${activeStudentItem.student.firstName} ${activeStudentItem.student.lastName}`}
                    </h3>
                    <div className="text-xs text-slate-400 font-mono-tabular flex items-center gap-2">
                      <span>{activeStudentItem.student.admissionNumber}</span>
                      <span>•</span>
                      <span>{selectedArm.fullName}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{activeStudentItem.student.house} House</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700 text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Term Average</span>
                    <span className="font-serif-title font-bold text-sm text-indigo-600 dark:text-indigo-400 font-mono-tabular">
                      {activeStudentItem.average}%
                    </span>
                  </div>
                  <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700 text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Arm Rank</span>
                    <span className="font-serif-title font-bold text-sm text-amber-600 dark:text-amber-400 font-mono-tabular">
                      #{studentStats.findIndex(s => s.student.id === activeStudentItem.student.id) + 1}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Master's Recorded Remark (Reference) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Form Master's Remark: {formMaster?.name || 'Class Head'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Recorded on Terminal Dossier</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed">
                  "{activeStudentItem.formMasterRemark}"
                </p>
              </div>

              {/* Principal Remark Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Executive Presets (1-Click Insert)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 lowercase font-normal">Click to adopt preset</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {remarkPresets.map(preset => (
                    <button
                      key={preset.title}
                      onClick={() => handleApplyPreset(preset.text)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 transition-all cursor-pointer text-left"
                    >
                      {preset.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Principal's Remark Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <label className="flex items-center gap-1.5">
                    <Stamp className="w-4 h-4 text-amber-600" />
                    <span>Official Principal's Terminal Remark</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono-tabular">
                    {currentRemarkText.length} characters
                  </span>
                </div>

                <textarea
                  rows={4}
                  value={currentRemarkText}
                  onChange={e => setCurrentRemarkText(e.target.value)}
                  placeholder="Enter executive evaluation and directives for this scholar's official report card..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500 leading-relaxed transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setCurrentRemarkText('')}
                  className="px-3.5 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveRemark}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Remark</span>
                  </button>

                  <button
                    onClick={handleSaveAndNext}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Save & Next Scholar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs italic">
              Select a scholar from the roster to begin remarking.
            </div>
          )}
        </div>
      </div>

      {/* Executive Assent Confirmation Modal */}
      {isClearanceModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  activeTerm.isResultsApprovedByPrincipal
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                }`}>
                  <Stamp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif-title font-bold text-slate-900 dark:text-white text-base">
                    {activeTerm.isResultsApprovedByPrincipal
                      ? 'Revoke Executive Clearance'
                      : 'Grant Executive Assent & Seal Results'}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {activeSession.name} • {activeTerm.name}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeTerm.isResultsApprovedByPrincipal
                  ? 'Revoking executive assent will immediately withdraw publication authorization from the Examination Officer. Mark sheets can be revised.'
                  : 'Granting official executive clearance certifies that broadsheets have been inspected and approved by the Principal. The Examination Officer will be authorized to publish report cards to parents.'}
              </p>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700 text-xs space-y-1">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Signatory Authority:</span>
                  <strong className="text-slate-900 dark:text-white">{user?.name || 'Dr. Mrs. A. O. Adeleke'}</strong>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Official Designation:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">School Principal</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setIsClearanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleToggleClearance}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer ${
                    activeTerm.isResultsApprovedByPrincipal
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {activeTerm.isResultsApprovedByPrincipal
                    ? 'Confirm Clearance Revocation'
                    : 'Ratify & Apply Executive Seal'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
