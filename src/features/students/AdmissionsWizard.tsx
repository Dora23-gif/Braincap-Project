import React, { useState } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { NIGERIAN_STATES, getLgasForState } from '../../data/nigerianGeo';
import type { Student } from '../../types';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Camera,
  User,
  MapPin,
  School,
  Sparkles
} from 'lucide-react';

export const AdmissionsWizard: React.FC<{ onComplete?: (student: Student) => void }> = ({ onComplete }) => {
  const { classArms, registerStudent } = useSchoolData();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [dateOfBirth, setDateOfBirth] = useState('2011-05-15');
  const [bloodGroup, setBloodGroup] = useState<'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-'>('O+');
  const [genotype, setGenotype] = useState<'AA' | 'AS' | 'AC' | 'SS'>('AA');
  const [house, setHouse] = useState<'Emerald' | 'Sapphire' | 'Ruby' | 'Diamond'>('Emerald');

  // Geographic state
  const [selectedState, setSelectedState] = useState('Lagos');
  const [selectedLga, setSelectedLga] = useState('Ikeja');

  // Passport
  const [passportPhotoUrl, setPassportPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1544717305-2782549b5136?w=240&auto=format&fit=crop&q=80'
  );

  // Placement & Guardian
  const [selectedClassArmId, setSelectedClassArmId] = useState(classArms[0].id);
  const [isBoarder, setIsBoarder] = useState(true);
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');

  // Result state
  const [registeredStudent, setRegisteredStudent] = useState<Student | null>(null);

  const lgas = getLgasForState(selectedState);

  const handleStateChange = (stateName: string) => {
    setSelectedState(stateName);
    const newLgas = getLgasForState(stateName);
    setSelectedLga(newLgas[0] || '');
  };

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    const arm = classArms.find(a => a.id === selectedClassArmId) || classArms[0];

    const newStudent = registerStudent({
      firstName: firstName || 'Chinedu',
      lastName: lastName || 'Okafor',
      middleName,
      gender,
      dateOfBirth,
      stateOfOrigin: selectedState,
      lga: selectedLga,
      passportPhotoUrl,
      house,
      bloodGroup,
      genotype,
      parentId: `prt-${Date.now()}`,
      parentName: parentName || 'Mr. & Mrs. Okafor',
      parentPhone: parentPhone || '+234 802 333 4455',
      parentEmail: parentEmail || 'okafor.family@example.com',
      currentClassArmId: selectedClassArmId,
      currentClassArmName: arm.fullName,
      isBoarder
    });

    setRegisteredStudent(newStudent);
    if (onComplete) onComplete(newStudent);
  };

  if (registeredStudent) {
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-md text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Student Successfully Admitted!</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            The student profile and official admission number have been created and assigned to the academic roster.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left max-w-md mx-auto space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Official Admission Number:</span>
            <span className="font-mono-tabular font-bold text-amber-900 dark:text-amber-400">{registeredStudent.admissionNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Full Name:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {registeredStudent.lastName}, {registeredStudent.firstName} {registeredStudent.middleName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Class Arm:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{registeredStudent.currentClassArmName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">State / LGA:</span>
            <span className="text-slate-700 dark:text-slate-300">{registeredStudent.stateOfOrigin} ({registeredStudent.lga})</span>
          </div>
        </div>

        <button
          onClick={() => {
            setRegisteredStudent(null);
            setStep(1);
            setFirstName('');
            setLastName('');
          }}
          className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-950 font-bold text-xs shadow-xs cursor-pointer"
        >
          Enroll Another Student
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Step Header */}
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Student Admissions &amp; Intake Wizard</h2>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Register new candidate, record Nigerian demographics, and generate student registration number.
          </div>
        </div>
        <div className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-full">
          Step {step} of 4
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-4 border-b border-slate-100 dark:border-slate-800 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        <div className={`py-2.5 border-r border-slate-100 dark:border-slate-800 ${step === 1 ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-b-2 border-b-amber-600 dark:border-b-amber-500' : ''}`}>
          1. Biodata
        </div>
        <div className={`py-2.5 border-r border-slate-100 dark:border-slate-800 ${step === 2 ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-b-2 border-b-amber-600 dark:border-b-amber-500' : ''}`}>
          2. Geography
        </div>
        <div className={`py-2.5 border-r border-slate-100 dark:border-slate-800 ${step === 3 ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-b-2 border-b-amber-600 dark:border-b-amber-500' : ''}`}>
          3. Biometrics
        </div>
        <div className={`py-2.5 ${step === 4 ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-b-2 border-b-amber-600 dark:border-b-amber-500' : ''}`}>
          4. Placement
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleFinish} className="p-6 sm:p-8 space-y-6">
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Personal Candidate Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Surname (Last Name) *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="e.g. Adeleke"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="e.g. Babatunde"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Middle Name</label>
                <input
                  type="text"
                  value={middleName}
                  onChange={e => setMiddleName(e.target.value)}
                  placeholder="e.g. Oluwaseun"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Gender *</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={e => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono-tabular"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">School House</label>
                <select
                  value={house}
                  onChange={e => setHouse(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Emerald">Emerald House</option>
                  <option value="Sapphire">Sapphire House</option>
                  <option value="Ruby">Ruby House</option>
                  <option value="Diamond">Diamond House</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={e => setBloodGroup(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono-tabular"
                >
                  <option value="O+">O+ (Universal Donor)</option>
                  <option value="A+">A+</option>
                  <option value="B+">B+</option>
                  <option value="AB+">AB+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Genotype</label>
                <select
                  value={genotype}
                  onChange={e => setGenotype(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono-tabular"
                >
                  <option value="AA">AA (Standard)</option>
                  <option value="AS">AS (Carrier)</option>
                  <option value="AC">AC</option>
                  <option value="SS">SS</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Nigerian Geographic Origins</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  State of Origin (36 States + FCT) *
                </label>
                <select
                  value={selectedState}
                  onChange={e => handleStateChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                >
                  {NIGERIAN_STATES.map(s => (
                    <option key={s.state} value={s.state}>
                      {s.state} State
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Local Government Area (LGA) *
                </label>
                <select
                  value={selectedLga}
                  onChange={e => setSelectedLga(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                >
                  {lgas.map(lga => (
                    <option key={lga} value={lga}>
                      {lga}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-300">
              Selected origin:{' '}
              <span className="font-bold">
                {selectedLga} Local Government, {selectedState} State
              </span>
              . This will be officially printed on the student's WAEC/NECO bio-dossier.
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Camera className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Biometric Passport Photo Studio</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <div className="relative">
                <img
                  src={passportPhotoUrl}
                  alt="Preview"
                  className="w-28 h-32 rounded-xl object-cover border-2 border-amber-500 shadow-sm"
                />
                <div className="absolute inset-0 rounded-xl border-2 border-dashed border-white/50 pointer-events-none" />
              </div>

              <div className="space-y-3 flex-1 text-center sm:text-left">
                <div className="text-xs font-bold text-slate-900 dark:text-white">Official Portrait Requirements</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Clear white background, head centered, neutral expression. In-browser canvas automatically normalizes and compresses the photo under 40 KB for low-bandwidth mobile loading.
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPassportPhotoUrl(
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Sample Photo 1
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPassportPhotoUrl(
                        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Sample Photo 2
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <School className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Academic Placement &amp; Parent Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assign Class Arm *
                </label>
                <select
                  value={selectedClassArmId}
                  onChange={e => setSelectedClassArmId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                >
                  {classArms.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Residency Status
                </label>
                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      checked={isBoarder}
                      onChange={() => setIsBoarder(true)}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>Boarding House</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      checked={!isBoarder}
                      onChange={() => setIsBoarder(false)}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>Day Student</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3">Parent / Legal Guardian Information</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Guardian Name *</label>
                  <input
                    type="text"
                    required
                    value={parentName}
                    onChange={e => setParentName(e.target.value)}
                    placeholder="Chief / Dr. / Mrs. ..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Phone (SMS / Calls) *</label>
                  <input
                    type="tel"
                    required
                    value={parentPhone}
                    onChange={e => setParentPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Email (Report Cards) *</label>
                  <input
                    type="email"
                    required
                    value={parentEmail}
                    onChange={e => setParentEmail(e.target.value)}
                    placeholder="parent@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Senior Secondary Curriculum Pre-Configuration Notice */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Automated Curriculum Allocation:</span> Upon admission, candidate is enrolled in the standard Everest Secondary curriculum (7 Compulsory Core: Maths, English, Physics, Chemistry, Biology, Civic, History + 1 Language: Yoruba + 1 Trade: Data Processing + 3 Electives: Computer Studies, Agricultural Science, Further Maths = 12 subjects). Custom electives can be adjusted at any time in the Student Directory.
              </div>
            </div>
          </div>
        )}

        {/* Stepper Navigation Buttons */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((step - 1) as any)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((step + 1) as any)}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Complete Admission</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
