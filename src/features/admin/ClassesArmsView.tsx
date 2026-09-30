import React, { useState } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  UserCheck,
  Layers,
  Plus,
  PlusCircle,
  X,
  Check,
  Building2,
  Trash2,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { FuturisticPageShell } from '../../components/common/FuturisticPageShell';
import { DoubleBezelCard } from '../../components/common/DoubleBezelCard';
import { SegmentedControlOption } from '../../components/common/SegmentedControl';
import { ModalPortal } from '../../components/common/ModalPortal';
import type { SchoolSection, ClassArm, ClassLevel } from '../../types';

export const ClassesArmsView: React.FC = () => {
  const {
    classLevels,
    classArms,
    students,
    staff,
    addClassArm,
    addClassLevel,
    deleteClassArm,
    deleteClassLevel
  } = useSchoolData();
  const { user } = useAuth();
  const [selectedSection, setSelectedSection] = useState<'ALL' | 'JUNIOR' | 'SENIOR'>('ALL');

  const canManage =
    user?.activeRole === 'SUPER_ADMIN' ||
    user?.activeRole === 'PRINCIPAL' ||
    user?.assignedRoles?.includes('SUPER_ADMIN') ||
    user?.assignedRoles?.includes('PRINCIPAL');

  // Add Arm Modal State
  const [isAddArmOpen, setIsAddArmOpen] = useState(false);
  const [selectedLevelId, setSelectedLevelId] = useState(classLevels[0]?.id || '');
  const [armName, setArmName] = useState('');
  const [selectedFormMasterId, setSelectedFormMasterId] = useState('');

  // Add Level Modal State
  const [isAddLevelOpen, setIsAddLevelOpen] = useState(false);
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelSection, setNewLevelSection] = useState<SchoolSection>('JUNIOR');
  const [newLevelOrder, setNewLevelOrder] = useState<number>(classLevels.length + 1);

  // Top Bar Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTab, setDeleteTab] = useState<'ARM' | 'LEVEL'>('ARM');
  const [selectedDeleteArmId, setSelectedDeleteArmId] = useState<string>('');
  const [reassignTargetArmId, setReassignTargetArmId] = useState<string>('');
  const [selectedDeleteLevelId, setSelectedDeleteLevelId] = useState<string>('');

  // Quick Direct Delete State (from card buttons)
  const [armToDelete, setArmToDelete] = useState<ClassArm | null>(null);
  const [armDirectReassignId, setArmDirectReassignId] = useState<string>('');
  const [levelToDelete, setLevelToDelete] = useState<ClassLevel | null>(null);

  // Loading & Feedback
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredLevels = classLevels.filter(
    lvl => selectedSection === 'ALL' || lvl.section === selectedSection
  );

  const sectionOptions: SegmentedControlOption<'ALL' | 'JUNIOR' | 'SENIOR'>[] = [
    {
      id: 'ALL',
      label: (
        <>
          <span className="hidden sm:inline">All Sections</span>
          <span className="sm:hidden">All</span>
        </>
      ),
      count: classLevels.length
    },
    {
      id: 'JUNIOR',
      label: (
        <>
          <span className="hidden sm:inline">Junior School</span>
          <span className="sm:hidden">Junior</span>
        </>
      ),
      count: classLevels.filter(l => l.section === 'JUNIOR').length
    },
    {
      id: 'SENIOR',
      label: (
        <>
          <span className="hidden sm:inline">Senior School</span>
          <span className="sm:hidden">Senior</span>
        </>
      ),
      count: classLevels.filter(l => l.section === 'SENIOR').length
    },
  ];

  const handleCreateArm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!armName.trim() || !selectedLevelId) return;

    const assignedStaff = staff.find(s => s.id === selectedFormMasterId);

    await addClassArm(
      {
        classLevelId: selectedLevelId,
        name: armName.trim(),
        formMasterId: assignedStaff?.id,
        formMasterName: assignedStaff?.name
      },
      {
        id: user?.id || 'stf-001',
        name: user?.name || 'Administrator',
        role: user?.activeRole || 'SUPER_ADMIN'
      }
    );

    setArmName('');
    setSelectedFormMasterId('');
    setIsAddArmOpen(false);
    showToast(`Class arm "${armName.trim()}" created successfully.`);
  };

  const handleCreateLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLevelName.trim()) return;

    await addClassLevel(
      {
        name: newLevelName.trim(),
        section: newLevelSection,
        order: Number(newLevelOrder) || (classLevels.length + 1)
      },
      {
        id: user?.id || 'stf-001',
        name: user?.name || 'Administrator',
        role: user?.activeRole || 'SUPER_ADMIN'
      }
    );

    setNewLevelName('');
    setIsAddLevelOpen(false);
    showToast(`Class level "${newLevelName.trim()}" created successfully.`);
  };

  // Perform Arm Deletion
  const executeDeleteArm = async (armId: string, reassignToId?: string) => {
    if (!armId) return;
    setIsDeleting(true);
    setDeleteError(null);

    const targetArm = classArms.find(a => a.id === armId);
    const armTitle = targetArm?.fullName || 'Class Arm';

    try {
      const res = await deleteClassArm(
        armId,
        {
          id: user?.id || 'stf-001',
          name: user?.name || 'Administrator',
          role: user?.activeRole || 'SUPER_ADMIN'
        },
        reassignToId ? { reassignToArmId: reassignToId } : undefined
      );

      if (!res.success) {
        setDeleteError(res.error || 'Failed to delete class arm.');
        setIsDeleting(false);
        return;
      }

      showToast(`Class arm "${armTitle}" has been removed.`);
      setIsDeleteModalOpen(false);
      setArmToDelete(null);
      setReassignTargetArmId('');
      setArmDirectReassignId('');
    } catch (err: any) {
      setDeleteError(err.message || 'An error occurred while deleting the class arm.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Perform Level Deletion
  const executeDeleteLevel = async (levelId: string) => {
    if (!levelId) return;
    setIsDeleting(true);
    setDeleteError(null);

    const targetLevel = classLevels.find(l => l.id === levelId);
    const levelTitle = targetLevel?.name || 'Class Level';

    try {
      const res = await deleteClassLevel(
        levelId,
        {
          id: user?.id || 'stf-001',
          name: user?.name || 'Administrator',
          role: user?.activeRole || 'SUPER_ADMIN'
        }
      );

      if (!res.success) {
        setDeleteError(res.error || 'Failed to delete class level.');
        setIsDeleting(false);
        return;
      }

      showToast(`Class level "${levelTitle}" and its arms were removed.`);
      setIsDeleteModalOpen(false);
      setLevelToDelete(null);
    } catch (err: any) {
      setDeleteError(err.message || 'An error occurred while deleting the class level.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Currently selected arm in main delete modal
  const activeDeleteArmObj = classArms.find(a => a.id === (selectedDeleteArmId || classArms[0]?.id));
  const activeDeleteArmStudents = activeDeleteArmObj
    ? students.filter(s => s.currentClassArmId === activeDeleteArmObj.id)
    : [];
  const otherArmsInSameLevel = activeDeleteArmObj
    ? classArms.filter(a => a.id !== activeDeleteArmObj.id && a.classLevelId === activeDeleteArmObj.classLevelId)
    : [];

  // Direct card delete arm target
  const directArmStudents = armToDelete
    ? students.filter(s => s.currentClassArmId === armToDelete.id)
    : [];
  const directOtherArms = armToDelete
    ? classArms.filter(a => a.id !== armToDelete.id && a.classLevelId === armToDelete.classLevelId)
    : [];

  // Selected level in main delete modal
  const activeDeleteLevelObj = classLevels.find(l => l.id === (selectedDeleteLevelId || classLevels[0]?.id));
  const activeDeleteLevelArms = activeDeleteLevelObj
    ? classArms.filter(
        a => a.classLevelId === activeDeleteLevelObj.id ||
             a.classLevelId === String(activeDeleteLevelObj.order) ||
             (activeDeleteLevelObj.name && a.fullName?.toLowerCase().startsWith(activeDeleteLevelObj.name.toLowerCase()))
      )
    : [];
  const activeDeleteLevelStudentsCount = activeDeleteLevelArms.reduce(
    (acc, arm) => acc + students.filter(s => s.currentClassArmId === arm.id).length,
    0
  );

  return (
    <FuturisticPageShell
      title="CLASSES & ARMS ARCHITECTURE"
      subtitle="Secondary education hierarchy: Junior Secondary (JSS 1–3) and Senior Secondary (SSS 1–3)"
      icon={Layers}
      badgeText={`${classArms.length} Arms Configured`}
      badgeVariant="cyber"
      actions={
        <div className="w-full xl:w-auto flex flex-wrap items-center gap-2.5 sm:gap-3 min-w-0 justify-start xl:justify-end">
          {/* Section Filter Pills */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
            {sectionOptions.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedSection(tab.id as any)}
                className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedSection === tab.id
                    ? 'bg-white dark:bg-slate-900 text-indigo-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono-tabular ${
                  selectedSection === tab.id
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Action Buttons: Add Arm, Add Level, and DELETE BUTTON */}
          {canManage && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedLevelId(classLevels[0]?.id || '');
                  setIsAddArmOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Arm</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewLevelOrder(classLevels.length + 1);
                  setIsAddLevelOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>Add Level</span>
              </button>

              {/* DELETE BUTTON: Placed right beside Add Level as requested */}
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setSelectedDeleteArmId(classArms[0]?.id || '');
                  setSelectedDeleteLevelId(classLevels[0]?.id || '');
                  setIsDeleteModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                title="Remove a class level or arm"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      }
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200 border border-slate-700 dark:border-slate-300">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Class Level Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4 sm:gap-6">
        {filteredLevels.map(lvl => {
          const arms = classArms.filter(
            a => a.classLevelId === lvl.id ||
                 a.classLevelId === String(lvl.order) ||
                 (lvl.name && a.fullName?.toLowerCase().startsWith(lvl.name.toLowerCase()))
          );

          return (
            <DoubleBezelCard key={lvl.id} hoverEffect innerClassName="p-3.5 sm:p-5 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900 font-bold flex items-center justify-center font-mono-tabular text-xs shrink-0">
                    {lvl.order}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif-title font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">{lvl.name}</h3>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase block truncate">{lvl.section} SCHOOL</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {arms.length} Arms
                  </span>

                  {/* Quick Delete Level Button */}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setLevelToDelete(lvl);
                      }}
                      title={`Delete entire ${lvl.name} level`}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Arms List */}
              <div className="space-y-2">
                {arms.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400 dark:text-slate-500 italic bg-slate-50/50 dark:bg-slate-800/50 rounded-xl">
                    No classroom arms created yet.
                  </div>
                ) : (
                  arms.map(arm => {
                    const studentCount = students.filter(s => s.currentClassArmId === arm.id).length;

                    return (
                      <div
                        key={arm.id}
                        className="group p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-xs hover:border-slate-200 dark:hover:border-slate-700 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">{arm.fullName}</div>
                          <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                            <UserCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate">Form Master: {arm.formMasterName || 'Unassigned'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex items-center gap-1 text-[10px] sm:text-xs font-mono-tabular font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span>{studentCount}</span>
                          </div>

                          {/* Quick Delete Arm Icon */}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null);
                                setArmToDelete(arm);
                                setArmDirectReassignId('');
                              }}
                              title={`Delete ${arm.fullName}`}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </DoubleBezelCard>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. Main Delete Modal (Triggered by the top [Delete] button beside Add Level) */}
      {/* ========================================================================= */}
      <ModalPortal isOpen={isDeleteModalOpen} onClose={() => !isDeleting && setIsDeleteModalOpen(false)} maxWidthClass="max-w-lg">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-800/80 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Remove Academic Class or Arm
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Safely decommission a class arm stream or entire academic level
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setIsDeleteModalOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Delete Type Segmented Switcher */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                setDeleteTab('ARM');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                deleteTab === 'ARM'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Delete Class Arm (e.g. SSS 1 Arts)
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                setDeleteTab('LEVEL');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                deleteTab === 'LEVEL'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Delete Class Level (e.g. SSS 4)
            </button>
          </div>

          {deleteError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{deleteError}</span>
            </div>
          )}

          {/* TAB 1: DELETE CLASS ARM */}
          {deleteTab === 'ARM' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Select Class Arm to Delete <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedDeleteArmId || (classArms[0]?.id || '')}
                  onChange={e => {
                    setSelectedDeleteArmId(e.target.value);
                    setReassignTargetArmId('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none transition cursor-pointer"
                >
                  {classArms.map(arm => {
                    const cnt = students.filter(s => s.currentClassArmId === arm.id).length;
                    return (
                      <option key={arm.id} value={arm.id}>
                        {arm.fullName} ({cnt} {cnt === 1 ? 'student' : 'students'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Enrolled Students Warning & Reassignment */}
              {activeDeleteArmObj && (
                <div className={`p-4 rounded-xl border space-y-2.5 ${
                  activeDeleteArmStudents.length > 0
                    ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                }`}>
                  <div className="flex items-center gap-2">
                    {activeDeleteArmStudents.length > 0 ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    ) : (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {activeDeleteArmStudents.length > 0
                        ? `${activeDeleteArmStudents.length} Students Currently Enrolled`
                        : 'No Students Enrolled (Safe to Delete)'}
                    </span>
                  </div>

                  {activeDeleteArmStudents.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Reassign Enrolled Students To:
                      </label>
                      <select
                        value={reassignTargetArmId}
                        onChange={e => setReassignTargetArmId(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none cursor-pointer"
                      >
                        <option value="">-- Mark Students as Unassigned --</option>
                        {otherArmsInSameLevel.map(a => (
                          <option key={a.id} value={a.id}>
                            Reassign to: {a.fullName}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {reassignTargetArmId
                          ? `Students will be moved to ${classArms.find(a => a.id === reassignTargetArmId)?.fullName}.`
                          : 'Students will remain in the directory with status "Unassigned".'}
                      </p>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Form Master assignment and subject allocations for this arm will also be released.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting || !activeDeleteArmObj}
                  onClick={() => executeDeleteArm(activeDeleteArmObj?.id || selectedDeleteArmId, reassignTargetArmId)}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-rose-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'Deleting...' : `Delete ${activeDeleteArmObj?.fullName || 'Arm'}`}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DELETE CLASS LEVEL */}
          {deleteTab === 'LEVEL' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Select Class Level to Delete <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedDeleteLevelId || (classLevels[0]?.id || '')}
                  onChange={e => setSelectedDeleteLevelId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none transition cursor-pointer"
                >
                  {classLevels.map(lvl => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.name} ({lvl.section} School)
                    </option>
                  ))}
                </select>
              </div>

              {activeDeleteLevelObj && (
                <div className={`p-4 rounded-xl border space-y-2 ${
                  activeDeleteLevelStudentsCount > 0
                    ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                }`}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 shrink-0 ${activeDeleteLevelStudentsCount > 0 ? 'text-rose-600' : 'text-amber-500'}`} />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Contains {activeDeleteLevelArms.length} Classroom Arms & {activeDeleteLevelStudentsCount} Enrolled Students
                    </span>
                  </div>

                  {activeDeleteLevelStudentsCount > 0 ? (
                    <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                      ⚠️ Cannot delete level while students are enrolled. Please delete or reassign the students in its arms first.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Deleting this level will remove {activeDeleteLevelObj.name} and its empty arms from the academic structure.
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting || !activeDeleteLevelObj || activeDeleteLevelStudentsCount > 0}
                  onClick={() => executeDeleteLevel(activeDeleteLevelObj?.id || selectedDeleteLevelId)}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-rose-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'Deleting...' : `Delete ${activeDeleteLevelObj?.name || 'Level'}`}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </ModalPortal>

      {/* ========================================================================= */}
      {/* 2. Direct Quick Delete Arm Modal (Triggered by trash icon on the arm card) */}
      {/* ========================================================================= */}
      <ModalPortal isOpen={!!armToDelete} onClose={() => !isDeleting && setArmToDelete(null)} maxWidthClass="max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Class Arm</h3>
                <p className="text-xs text-slate-500">{armToDelete?.fullName}</p>
              </div>
            </div>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setArmToDelete(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {deleteError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-300 rounded-xl">
              {deleteError}
            </div>
          )}

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Are you sure you want to remove <span className="font-bold text-slate-900 dark:text-white">&quot;{armToDelete?.fullName}&quot;</span> from the school registry?
          </p>

          {directArmStudents.length > 0 && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{directArmStudents.length} Students are currently in this arm</span>
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Reassign them to:
                </label>
                <select
                  value={armDirectReassignId}
                  onChange={e => setArmDirectReassignId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="">-- Leave as Unassigned --</option>
                  {directOtherArms.map(a => (
                    <option key={a.id} value={a.id}>
                      Reassign to: {a.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setArmToDelete(null)}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting || !armToDelete}
              onClick={() => armToDelete && executeDeleteArm(armToDelete.id, armDirectReassignId)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* ========================================================================= */}
      {/* 3. Direct Quick Delete Level Modal (Triggered by trash icon on level header) */}
      {/* ========================================================================= */}
      <ModalPortal isOpen={!!levelToDelete} onClose={() => !isDeleting && setLevelToDelete(null)} maxWidthClass="max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Class Level</h3>
                <p className="text-xs text-slate-500">{levelToDelete?.name}</p>
              </div>
            </div>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setLevelToDelete(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {deleteError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-300 rounded-xl">
              {deleteError}
            </div>
          )}

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Are you sure you want to completely remove the <span className="font-bold text-slate-900 dark:text-white">&quot;{levelToDelete?.name}&quot;</span> cohort level?
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setLevelToDelete(null)}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting || !levelToDelete}
              onClick={() => levelToDelete && executeDeleteLevel(levelToDelete.id)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Delete Level'}</span>
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* ========================================================================= */}
      {/* 4. Add Class Arm Modal */}
      {/* ========================================================================= */}
      <ModalPortal isOpen={isAddArmOpen} onClose={() => setIsAddArmOpen(false)} maxWidthClass="max-w-lg">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Add New Class Arm
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Expand classroom cohort with designated Form Master
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAddArmOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCreateArm} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Parent Class Level <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={selectedLevelId}
                onChange={e => setSelectedLevelId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-850 outline-none transition cursor-pointer"
              >
                {classLevels.map(lvl => (
                  <option key={lvl.id} value={lvl.id}>
                    {lvl.name} ({lvl.section} School)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Arm Designation Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Platinum, Bronze, Ruby, Topaz"
                value={armName}
                onChange={e => setArmName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-850 outline-none transition"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Full name will format as &quot;{classLevels.find(l => l.id === selectedLevelId)?.name || 'Class'} {armName || 'Name'}&quot;.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Assigned Form Master <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <select
                value={selectedFormMasterId}
                onChange={e => setSelectedFormMasterId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-850 outline-none transition cursor-pointer"
              >
                <option value="">Unassigned (Assign Later)</option>
                {staff
                  .filter(s => s.status === 'ACTIVE')
                  .map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.identifier || member.staffId || 'Staff'})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddArmOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-amber-500/20 transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Create Class Arm</span>
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* ========================================================================= */}
      {/* 5. Add Class Level Modal */}
      {/* ========================================================================= */}
      <ModalPortal isOpen={isAddLevelOpen} onClose={() => setIsAddLevelOpen(false)} maxWidthClass="max-w-lg">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/80 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Add Academic Class Level
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Define a new academic cohort or grade level
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAddLevelOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCreateLevel} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Class Level Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. JSS 4, SSS 4 / Pre-Degree"
                value={newLevelName}
                onChange={e => setNewLevelName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-850 outline-none transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                School Section <span className="text-rose-500">*</span>
              </label>
              <select
                value={newLevelSection}
                onChange={e => setNewLevelSection(e.target.value as SchoolSection)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-850 outline-none transition cursor-pointer"
              >
                <option value="JUNIOR">Junior Secondary School</option>
                <option value="SENIOR">Senior Secondary School</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Display Hierarchy Order <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={newLevelOrder}
                onChange={e => setNewLevelOrder(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white font-mono-tabular focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-850 outline-none transition"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddLevelOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-blue-500/20 transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Create Level</span>
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>
    </FuturisticPageShell>
  );
};
