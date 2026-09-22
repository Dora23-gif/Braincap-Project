import React, { useState, useMemo } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, Shield, BookOpen, Plus, Trash2, Search, Filter, AlertTriangle, X, Layers, UserPlus } from 'lucide-react';
import { FuturisticPageShell } from '../../components/common/FuturisticPageShell';
import { DoubleBezelCard } from '../../components/common/DoubleBezelCard';
import { ModalPortal } from '../../components/common/ModalPortal';
import { PaginationControls } from '../../components/common/PaginationControls';
import { api, PaginatedResponse } from '../../lib/api';

export const SubjectAllocationView: React.FC = () => {
  const { allocations, staff, classArms, subjects, allocateTeacher, removeTeacherAllocation } = useSchoolData();
  const { user } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allocationToDelete, setAllocationToDelete] = useState<any | null>(null);
  const [selectedArmId, setSelectedArmId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [filterArmId, setFilterArmId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [serverAllocations, setServerAllocations] = useState<any[] | null>(null);
  const [serverTotalCount, setServerTotalCount] = useState<number | null>(null);
  const [serverTotalPages, setServerTotalPages] = useState<number | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch paginated allocations from backend
  React.useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsLoadingPage(true);
      try {
        const queryParams: Record<string, any> = {
          page,
          page_size: pageSize,
        };
        if (searchQuery.trim()) {
          queryParams.search = searchQuery.trim();
        }
        if (filterArmId !== 'ALL') {
          queryParams.class_arm = filterArmId;
        }

        const res = await api.get<PaginatedResponse<any>>('/academics/teacher-allocations/', queryParams);
        if (!isCancelled && res && Array.isArray(res.results)) {
          setServerAllocations(
            res.results.map(r => ({
              id: r.id,
              teacherId: String(r.teacher || ''),
              teacherName: r.teacher_name || '',
              classArmId: String(r.class_arm || ''),
              classArmName: r.class_arm_name || '',
              subjectId: String(r.subject || ''),
              subjectName: r.subject_name || '',
            }))
          );
          setServerTotalCount(res.count);
          setServerTotalPages(res.total_pages || Math.ceil(res.count / pageSize));
        }
      } catch (err) {
        if (!isCancelled) {
          setServerAllocations(null);
          setServerTotalCount(null);
          setServerTotalPages(null);
        }
      } finally {
        if (!isCancelled) setIsLoadingPage(false);
      }
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [page, pageSize, searchQuery, filterArmId, refreshTrigger]);

  const eligibleTeachers = useMemo(() => {
    return staff.filter(s => s.status === 'ACTIVE');
  }, [staff]);

  const filteredAllocations = useMemo(() => {
    return allocations.filter(alloc => {
      if (filterArmId !== 'ALL' && alloc.classArmId !== filterArmId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTeacher = (alloc.teacherName || '').toLowerCase().includes(q);
        const matchesSubject = (alloc.subjectName || '').toLowerCase().includes(q);
        const matchesArm = (alloc.classArmName || '').toLowerCase().includes(q);
        if (!matchesTeacher && !matchesSubject && !matchesArm) return false;
      }
      return true;
    });
  }, [allocations, filterArmId, searchQuery]);

  const displayedAllocations = useMemo(() => {
    if (serverAllocations !== null) {
      return serverAllocations;
    }
    const start = (page - 1) * pageSize;
    return filteredAllocations.slice(start, start + pageSize);
  }, [serverAllocations, filteredAllocations, page, pageSize]);

  const totalCount = serverTotalCount !== null ? serverTotalCount : filteredAllocations.length;
  const totalPages = serverTotalPages !== null ? serverTotalPages : Math.max(1, Math.ceil(filteredAllocations.length / pageSize));

  const handleAllocate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArmId || !selectedSubjectId || !selectedTeacherId) return;

    allocateTeacher(selectedArmId, selectedSubjectId, selectedTeacherId, {
      id: user?.id || 'admin',
      name: user?.name || 'Administrator',
      role: user?.activeRole || 'SUPER_ADMIN'
    });

    setIsModalOpen(false);
    setSelectedArmId('');
    setSelectedSubjectId('');
    setSelectedTeacherId('');
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <FuturisticPageShell
      title="TEACHER ALLOCATION MATRIX"
      subtitle="Subject-to-Teacher assignments across class arms. Dictates live marksheet access and score entry privileges."
      icon={BookOpen}
      badgeText={`${totalCount} Active Teaching Allocations`}
      badgeVariant="cyber"
    >
      {/* Controls Bar: Search, Arm Filter, and Allocate Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-full sm:max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search teacher, subject, arm..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterArmId}
              onChange={e => {
                setFilterArmId(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Class Arms</option>
              {classArms.map(arm => (
                <option key={arm.id} value={arm.id}>
                  {arm.fullName || arm.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            if (classArms.length > 0) setSelectedArmId(classArms[0].id);
            if (subjects.length > 0) setSelectedSubjectId(subjects[0].id);
            if (eligibleTeachers.length > 0) setSelectedTeacherId(eligibleTeachers[0].id);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-xs shadow-md transition flex items-center gap-2 justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>Allocate Teacher to Subject</span>
        </button>
      </div>

      {/* Allocation Table */}
      <DoubleBezelCard innerClassName="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="py-3.5 pl-4 pr-1 w-8 text-center">#</th>
                <th className="py-3.5 pl-1 pr-4">Assigned Teacher</th>
                <th className="py-3.5 px-4">Class Arm</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4 text-center">Score Entry Access</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {displayedAllocations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No matching teacher allocations found.
                  </td>
                </tr>
              ) : (
                displayedAllocations.map((alloc, idx) => (
                  <tr key={alloc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 pl-4 pr-1 text-center text-slate-400 dark:text-slate-500 font-mono-tabular">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-3.5 pl-1 pr-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>{alloc.teacherName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">{alloc.classArmName}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{alloc.subjectName}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Shield className="w-3 h-3" />
                        <span>Authorized</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setAllocationToDelete(alloc)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                        title="Deallocate Teacher"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DoubleBezelCard>

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoadingPage}
        itemLabel="teaching allocations"
        className="mt-4"
      />


      {/* Allocate Teacher Modal */}
      <ModalPortal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidthClass="max-w-lg">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/80 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shadow-xs">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Allocate Subject Teacher
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Assign faculty instructor to classroom subject and grant marksheet access
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleAllocate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>Faculty Member (Teacher) *</span>
              </label>
              <select
                required
                value={selectedTeacherId}
                onChange={e => setSelectedTeacherId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition shadow-2xs"
              >
                {eligibleTeachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.staffId || t.email})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Teacher will be authorized to record and submit continuous assessment & exam marks.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <span>Target Class Arm *</span>
              </label>
              <select
                required
                value={selectedArmId}
                onChange={e => setSelectedArmId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition shadow-2xs"
              >
                {classArms.map(arm => (
                  <option key={arm.id} value={arm.id}>
                    {arm.fullName || arm.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Subject *</span>
              </label>
              <select
                required
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition shadow-2xs"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code} - {s.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-amber-500/20 transition cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Save Allocation</span>
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* Confirmation Modal */}
      <ModalPortal isOpen={!!allocationToDelete} onClose={() => setAllocationToDelete(null)} maxWidthClass="max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400 shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Revoke Subject Allocation</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Are you sure you want to remove the allocation for <strong className="text-slate-900 dark:text-white font-semibold">{allocationToDelete?.teacherName}</strong> in <strong className="text-slate-900 dark:text-white font-semibold">{allocationToDelete?.subjectName}</strong> ({allocationToDelete?.classArmName})?
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setAllocationToDelete(null)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (allocationToDelete) {
                  removeTeacherAllocation(allocationToDelete.id, {
                    id: user?.id || 'admin',
                    name: user?.name || 'Administrator',
                    role: user?.activeRole || 'SUPER_ADMIN'
                  });
                  setAllocationToDelete(null);
                  setRefreshTrigger(prev => prev + 1);
                }
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer shadow-xs"
            >
              Confirm Revocation
            </button>
          </div>
        </div>
      </ModalPortal>
    </FuturisticPageShell>
  );
};
