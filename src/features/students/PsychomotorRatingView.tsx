import React, { useState } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import type { AffectiveAndPsychomotor } from '../../types';
import { Award, Save, CheckCircle2, Sparkles } from 'lucide-react';

export const PsychomotorRatingView: React.FC = () => {
  const { classArms, students, affectiveTraits, updatePsychomotor, activeTerm } = useSchoolData();
  const { user } = useAuth();

  const isFormMaster = user?.activeRole === 'FORM_MASTER';
  const isSuperAdmin = user?.activeRole === 'SUPER_ADMIN' || user?.assignedRoles?.includes('SUPER_ADMIN');
  const isPrincipal = user?.activeRole === 'PRINCIPAL' || user?.assignedRoles?.includes('PRINCIPAL');

  const [selectedArmId, setSelectedArmId] = useState(
    isFormMaster && user?.formMasterArmId ? user.formMasterArmId : classArms[0]?.id || 'arm-sss2-gold'
  );

  const canEditPsychomotor = (isFormMaster && user?.formMasterArmId === selectedArmId) || isSuperAdmin;
  const currentArm = classArms.find(a => a.id === selectedArmId) || classArms[0];
  const armStudents = students.filter(s => s.currentClassArmId === selectedArmId);
  const [selectedStudentId, setSelectedStudentId] = useState(armStudents[0]?.id || students[0].id);
  const [saveAlert, setSaveAlert] = useState(false);

  const currentStudent = students.find(s => s.id === selectedStudentId) || students[0];

  const currentTraits = affectiveTraits.find(
    t => t.studentId === selectedStudentId && t.termId === activeTerm.id
  ) || {
    studentId: selectedStudentId,
    termId: activeTerm.id,
    punctuality: 4,
    neatness: 4,
    politeness: 5,
    attentiveness: 4,
    honesty: 5,
    relationshipWithPeers: 4,
    handwriting: 4,
    sportsAndGames: 4,
    craftsmanship: 3,
    musicalArtisticSkill: 4,
    formMasterRemark: 'A diligent student who demonstrates consistent moral character and academic engagement.',
    principalRemark: 'Commendable performance. Maintain this standard.',
    daysPresent: 64,
    daysAbsent: 1,
    totalSchoolDays: 65
  };

  const [formData, setFormData] = useState<AffectiveAndPsychomotor>(currentTraits);

  // Sync when student changes
  React.useEffect(() => {
    const found = affectiveTraits.find(
      t => t.studentId === selectedStudentId && t.termId === activeTerm.id
    );
    if (found) {
      setFormData(found);
    } else {
      setFormData({
        studentId: selectedStudentId,
        termId: activeTerm.id,
        punctuality: 4,
        neatness: 4,
        politeness: 5,
        attentiveness: 4,
        honesty: 5,
        relationshipWithPeers: 4,
        handwriting: 4,
        sportsAndGames: 4,
        craftsmanship: 3,
        musicalArtisticSkill: 4,
        formMasterRemark: 'A dedicated student with commendable focus and polite demeanor in class activities.',
        principalRemark: 'Good terminal result. Keep it up.',
        daysPresent: 64,
        daysAbsent: 1,
        totalSchoolDays: 65
      });
    }
  }, [selectedStudentId, affectiveTraits, activeTerm.id]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditPsychomotor) return;
    updatePsychomotor(formData);
    setSaveAlert(true);
    setTimeout(() => setSaveAlert(false), 2500);
  };

  const renderRatingBar = (label: string, field: keyof AffectiveAndPsychomotor) => {
    const val = (formData[field] as number) || 3;

    return (
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-300">{label}</span>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map(rating => (
            <button
              key={rating}
              type="button"
              disabled={!canEditPsychomotor}
              onClick={() => setFormData({ ...formData, [field]: rating })}
              className={`w-7 h-7 rounded-lg text-xs font-bold font-mono-tabular transition-all ${
                val === rating
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              } ${!canEditPsychomotor ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
            >
              {rating}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-serif-title font-bold text-slate-900 dark:text-white text-base">
              AFFECTIVE &amp; PSYCHOMOTOR EVALUATION
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {activeTerm.name}
            </span>
            {canEditPsychomotor ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Form Master Custody
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Read-Only Audit Mode
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {canEditPsychomotor
              ? `Evaluate behavioral traits, psychomotor skills, and append official pastoral remarks for ${currentArm.fullName}.`
              : `Viewing pastoral affective traits and psychomotor ratings for ${currentArm.fullName} in read-only mode.`}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user?.activeRole === 'FORM_MASTER' && user?.formMasterArmId ? (
            <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Custody: {currentArm.fullName}</span>
            </div>
          ) : (
            <select
              value={selectedArmId}
              onChange={e => {
                setSelectedArmId(e.target.value);
                const newArmStudents = students.filter(s => s.currentClassArmId === e.target.value);
                if (newArmStudents.length > 0) setSelectedStudentId(newArmStudents[0].id);
              }}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {classArms.map(a => (
                <option key={a.id} value={a.id}>
                  {a.fullName}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {saveAlert && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Behavioral assessment and pastoral remarks successfully saved to student terminal dossier!</span>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Student Selector Sidebar (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-3 space-y-1 overflow-y-auto max-h-[650px]">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Enrolled Students ({armStudents.length})
          </div>
          {armStudents.map(st => {
            const isSelected = st.id === selectedStudentId;

            return (
              <button
                key={st.id}
                onClick={() => setSelectedStudentId(st.id)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/60 shadow-xs text-amber-950 dark:text-amber-200 font-semibold'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <img src={st.passportPhotoUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                <div className="truncate flex-1">
                  <div className="text-xs font-bold truncate text-slate-900 dark:text-white">
                    {st.lastName}, {st.firstName}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono-tabular truncate">{st.admissionNumber}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Evaluation Form (8 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <img src={currentStudent.passportPhotoUrl} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-amber-500 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {currentStudent.lastName}, {currentStudent.firstName} {currentStudent.middleName || ''}
                </h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                  {currentStudent.admissionNumber} • {currentStudent.currentClassArmName}
                </div>
              </div>
            </div>

            {canEditPsychomotor && (
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Evaluation</span>
              </button>
            )}
          </div>

          {/* Affective Domain Traits */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Affective Domain Traits (1: Poor to 5: Excellent)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {renderRatingBar('Punctuality & Regularity', 'punctuality')}
              {renderRatingBar('Neatness & Uniform', 'neatness')}
              {renderRatingBar('Politeness & Courtesy', 'politeness')}
              {renderRatingBar('Attentiveness in Class', 'attentiveness')}
              {renderRatingBar('Honesty & Integrity', 'honesty')}
              {renderRatingBar('Relationship with Peers', 'relationshipWithPeers')}
            </div>
          </div>

          {/* Psychomotor Skills */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Psychomotor Skills (1: Poor to 5: Excellent)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {renderRatingBar('Handwriting & Legibility', 'handwriting')}
              {renderRatingBar('Sports & Athletic Games', 'sportsAndGames')}
              {renderRatingBar('Manual Dexterity & Craft', 'craftsmanship')}
              {renderRatingBar('Musical & Artistic Skill', 'musicalArtisticSkill')}
            </div>
          </div>

          {/* Form Master Remarks Studio with Categorized Presets */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Form Master's Official Remark</label>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                    Form Master Custody
                  </span>
                </div>
                {canEditPsychomotor && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Click a preset below to auto-populate</span>
                )}
              </div>
              <textarea
                rows={3}
                disabled={!canEditPsychomotor}
                value={formData.formMasterRemark}
                onChange={e => setFormData({ ...formData, formMasterRemark: e.target.value })}
                placeholder="Enter holistic pastoral and academic observation..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 disabled:opacity-80 font-sans"
              />

              {/* Categorized Remark Presets (active if canEditPsychomotor) */}
              {canEditPsychomotor && (
                <div className="mt-2.5 space-y-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Honor Roll & Exemplary:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, formMasterRemark: `${currentStudent.firstName} is an exemplary scholar who demonstrates sustained academic excellence, stellar leadership, and impeccable character.` })}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors text-left cursor-pointer"
                      >
                        "Exemplary scholar with sustained academic excellence..."
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, formMasterRemark: `Outstanding terminal performance. Consistently diligent, highly focused, and an inspiration to classmates.` })}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors text-left cursor-pointer"
                      >
                        "Outstanding terminal performance. Highly focused..."
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Steady & Commendable:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, formMasterRemark: `A very disciplined and hardworking student. Displays admirable moral character and steady academic dedication.` })}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors text-left cursor-pointer"
                      >
                        "Disciplined and hardworking student with steady dedication..."
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, formMasterRemark: `Shows keen intellectual curiosity and steady improvement across all subjects. Keep maintaining this positive attitude.` })}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors text-left cursor-pointer"
                      >
                        "Keen intellectual curiosity and steady improvement..."
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Remedial & Guidance Needed:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, formMasterRemark: `Capable of commendable results, but needs to dedicate more revision time to core quantitative and science subjects.` })}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors text-left cursor-pointer"
                      >
                        "Capable of commendable results; needs more quantitative study..."
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, formMasterRemark: `Demonstrates good potential; requires greater consistency in homework submission and active classroom engagement.` })}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors text-left cursor-pointer"
                      >
                        "Good potential; requires homework consistency..."
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Principal's Official Remark - Read-Only for Form Master */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Principal's Executive Endorsement Remark</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    🔒 Executive Desk Only
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">Signed by School Principal</span>
              </div>
              <div className="text-xs font-serif text-slate-800 dark:text-slate-200 italic bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                "{formData.principalRemark || 'Pending Principal’s final review and signature at the conclusion of term.'}"
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
