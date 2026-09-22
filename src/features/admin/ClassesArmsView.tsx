import React, { useState } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import { Users, UserCheck, Layers, Plus, PlusCircle, X, Check, Building2 } from 'lucide-react';
import { FuturisticPageShell } from '../../components/common/FuturisticPageShell';
import { DoubleBezelCard } from '../../components/common/DoubleBezelCard';
import { SegmentedControl, SegmentedControlOption } from '../../components/common/SegmentedControl';
import { ModalPortal } from '../../components/common/ModalPortal';
import type { SchoolSection } from '../../types';

export const ClassesArmsView: React.FC = () => {
  const { classLevels, classArms, students, staff, addClassArm, addClassLevel } = useSchoolData();
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
  };

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

          {/* Action Buttons */}
          {user?.activeRole === 'SUPER_ADMIN' && (
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
            </div>
          )}
        </div>
      }
    >
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
                <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full shrink-0">
                  {arms.length} Arms
                </span>
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
                        className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">{arm.fullName}</div>
                          <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                            <UserCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate">Form Master: {arm.formMasterName || 'Unassigned'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-mono-tabular font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 sm:px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{studentCount} Students</span>
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

      {/* Add Class Arm Modal */}
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

      {/* Add Class Level Modal */}
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
