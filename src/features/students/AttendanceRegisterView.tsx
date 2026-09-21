import React, { useState, useEffect, useMemo } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import type { AttendanceStatus } from '../../types';
import { Calendar, CheckCircle2, Save, Eye, ShieldAlert, Loader2 } from 'lucide-react';
import { resolveArmId, resolveArmPk } from '../../lib/api';

export const AttendanceRegisterView: React.FC = () => {
  const { classArms, students, attendanceRecords, recordAttendance, staff } = useSchoolData();
  const { user } = useAuth();

  const isSuperAdmin = user?.activeRole === 'SUPER_ADMIN' || user?.assignedRoles?.includes('SUPER_ADMIN');
  const isFormMaster = user?.activeRole === 'FORM_MASTER' || user?.role === 'FORM_MASTER' || user?.assignedRoles?.includes('FORM_MASTER');
  const isVPAdmin = user?.activeRole === 'VICE_PRINCIPAL_ADMIN' || user?.activeRole === 'VICE_PRINCIPAL' || user?.activeRole === 'VICE_PRINCIPAL_ACADEMICS';

  // Find matching staff record for additional custody verification
  const matchedStaff = useMemo(() => {
    if (!user) return null;
    return staff.find(st =>
      st.id === user.id ||
      (st.identifier && (st.identifier === user.identifier || st.identifier === user.staffId)) ||
      (st.email && user.email && st.email.toLowerCase() === user.email.toLowerCase())
    );
  }, [staff, user]);

  // Determine Form Master's designated class arm
  const designatedArmSlug = useMemo(() => {
    const raw =
      user?.formMasterArmId ||
      user?.formMasterClassArmId ||
      (user as any)?.form_master_class_arm ||
      matchedStaff?.formMasterArmId ||
      matchedStaff?.formMasterClassArmId;
    if (raw) return resolveArmId(raw);
    const armByTeacher = classArms.find(a =>
      a.formMasterId === user?.id ||
      a.formMasterId === user?.staffId ||
      (user?.identifier && a.formMasterId === user.identifier) ||
      (a.formMasterName && user?.name && a.formMasterName.toLowerCase() === user.name.toLowerCase())
    );
    return armByTeacher?.id;
  }, [user, matchedStaff, classArms]);

  const [selectedArmId, setSelectedArmId] = useState<string>(() => {
    if (isFormMaster && designatedArmSlug) return designatedArmSlug;
    return classArms[0]?.id || 'arm-sss2-gold';
  });

  useEffect(() => {
    if (isFormMaster && designatedArmSlug) {
      setSelectedArmId(designatedArmSlug);
    }
  }, [isFormMaster, designatedArmSlug]);

  const isCustodyArm = useMemo(() => {
    if (!designatedArmSlug) return false;
    return (
      resolveArmId(designatedArmSlug) === resolveArmId(selectedArmId) ||
      (resolveArmPk(designatedArmSlug) !== undefined && resolveArmPk(designatedArmSlug) === resolveArmPk(selectedArmId))
    );
  }, [designatedArmSlug, selectedArmId]);

  // Form Masters are fully authorized for their class arm; Admins have statutory school-wide authority
  const canEditAttendance = isSuperAdmin || isVPAdmin || (isFormMaster && (isCustodyArm || !designatedArmSlug));
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [saveAlert, setSaveAlert] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentArm = useMemo(() => {
    return classArms.find(a =>
      a.id === selectedArmId ||
      resolveArmId(a.id, a.fullName) === resolveArmId(selectedArmId) ||
      (resolveArmPk(a.id) !== undefined && resolveArmPk(a.id) === resolveArmPk(selectedArmId))
    ) || classArms[0];
  }, [classArms, selectedArmId]);

  const armStudents = useMemo(() => {
    const canonicalSelected = resolveArmId(selectedArmId);
    const selectedPk = resolveArmPk(selectedArmId);
    return students.filter(s =>
      s.currentClassArmId === selectedArmId ||
      resolveArmId(s.currentClassArmId) === canonicalSelected ||
      (selectedPk !== undefined && resolveArmPk(s.currentClassArmId) === selectedPk)
    );
  }, [students, selectedArmId]);

  // Initialize status map for the day
  const [statusMap, setStatusMap] = useState<Map<string, AttendanceStatus>>(() => {
    const map = new Map<string, AttendanceStatus>();
    armStudents.forEach(s => {
      const existing = attendanceRecords.find(r => (r.studentId === s.id || (s.admissionNumber && r.studentId === s.admissionNumber)) && r.date === selectedDate);
      map.set(s.id, existing ? existing.status : 'PRESENT');
    });
    return map;
  });

  // Re-sync status map when date or arm changes
  useEffect(() => {
    const map = new Map<string, AttendanceStatus>();
    armStudents.forEach(s => {
      const existing = attendanceRecords.find(r => (r.studentId === s.id || (s.admissionNumber && r.studentId === s.admissionNumber)) && r.date === selectedDate);
      map.set(s.id, existing ? existing.status : 'PRESENT');
    });
    setStatusMap(map);
  }, [selectedDate, selectedArmId, armStudents, attendanceRecords]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (!canEditAttendance) return;
    setStatusMap(prev => {
      const next = new Map(prev);
      next.set(studentId, status);
      return next;
    });
  };

  const handleMarkAllPresent = () => {
    if (!canEditAttendance) return;
    setStatusMap(prev => {
      const next = new Map(prev);
      armStudents.forEach(s => next.set(s.id, 'PRESENT'));
      return next;
    });
  };

  const handleSave = async () => {
    if (!canEditAttendance) return;
    setIsSaving(true);
    try {
      const payload = armStudents.map(s => ({
        studentId: s.id,
        classArmId: selectedArmId,
        status: statusMap.get(s.id) || 'PRESENT'
      }));
      await recordAttendance(selectedDate, payload);
      setSaveAlert(true);
      setTimeout(() => setSaveAlert(false), 3000);
    } catch (err) {
      console.error('Failed to save attendance register:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const presentCount = Array.from(statusMap.values()).filter(st => st === 'PRESENT').length;
  const absentCount = Array.from(statusMap.values()).filter(st => st === 'ABSENT').length;
  const lateCount = Array.from(statusMap.values()).filter(st => st === 'LATE').length;

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-serif-title font-bold text-slate-900 dark:text-white text-base">
              DAILY ATTENDANCE REGISTER
            </span>
            {canEditAttendance ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {isFormMaster ? 'Form Master Custody' : 'Administrative Authority'}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                Read-Only Audit Mode
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {canEditAttendance
              ? `Record daily roll call and sync with terminal days present calculation for ${currentArm.fullName}.`
              : `Viewing statutory daily roll-call register for ${currentArm.fullName} in read-only audit mode.`}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Class Arm Selector / Form Master Custody Badge */}
          {isFormMaster && designatedArmSlug ? (
            <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Custody: {currentArm?.fullName || designatedArmSlug}</span>
            </div>
          ) : (
            <select
              value={selectedArmId}
              onChange={e => setSelectedArmId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {classArms.map(a => (
                <option key={a.id} value={a.id}>
                  {a.fullName}
                </option>
              ))}
            </select>
          )}

          {/* Date Picker - 100% visible in both light & dark mode */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent focus:outline-none font-mono-tabular text-slate-900 dark:text-white font-bold cursor-pointer"
            />
          </div>

          {/* Action Buttons: Only visible when authorized */}
          {canEditAttendance ? (
            <>
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs cursor-pointer transition-colors"
              >
                Mark All Present
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || armStudents.length === 0}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isSaving ? 'Saving...' : 'Save Register'}</span>
              </button>
            </>
          ) : (
            <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              <span>Read-Only Mode</span>
            </div>
          )}
        </div>
      </div>

      {saveAlert && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Daily attendance records successfully saved and synced to student dossiers!</span>
        </div>
      )}

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Enrolled Students</div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono-tabular mt-1">{armStudents.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Present Today</div>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono-tabular mt-1">{presentCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[10px] font-bold text-rose-500 uppercase">Absent Today</div>
          <div className="text-xl font-black text-rose-700 dark:text-rose-400 font-mono-tabular mt-1">{absentCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Late Arrivals</div>
          <div className="text-xl font-black text-amber-700 dark:text-amber-400 font-mono-tabular mt-1">{lateCount}</div>
        </div>
      </div>

      {/* Attendance Roster Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
              <th className="py-3 pl-3 pr-1 w-8 text-center">#</th>
              <th className="py-3 pl-1 pr-2 min-w-[180px]">Student Name</th>
              <th className="py-3 px-2 w-28 text-center">Adm No</th>
              <th className="py-3 px-4 text-center min-w-[280px]">Roll Call Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {armStudents.map((s, idx) => {
              const currentStatus = statusMap.get(s.id) || 'PRESENT';

              return (
                <tr key={s.id} className="hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors">
                  <td className="py-3 pl-3 pr-1 text-center text-slate-400 font-mono-tabular">{idx + 1}</td>
                  <td className="py-3 pl-1 pr-2 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2.5">
                      <img src={s.passportPhotoUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                      <span className="truncate">
                        {s.lastName}, {s.firstName}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center font-mono-tabular text-slate-500 dark:text-slate-400 text-[11px]">
                    {s.admissionNumber}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {canEditAttendance ? (
                      <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 gap-1">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(s.id, 'PRESENT')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentStatus === 'PRESENT'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          P (Present)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(s.id, 'ABSENT')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentStatus === 'ABSENT'
                              ? 'bg-rose-600 text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          A (Absent)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(s.id, 'LATE')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentStatus === 'LATE'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          L (Late)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(s.id, 'EXCUSED')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentStatus === 'EXCUSED'
                              ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          E (Excused)
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center">
                        {currentStatus === 'PRESENT' && (
                          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            Present
                          </span>
                        )}
                        {currentStatus === 'ABSENT' && (
                          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            Absent
                          </span>
                        )}
                        {currentStatus === 'LATE' && (
                          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            Late Arrival
                          </span>
                        )}
                        {currentStatus === 'EXCUSED' && (
                          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                            Excused
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};
