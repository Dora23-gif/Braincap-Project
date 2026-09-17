import React, { useState, useMemo } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { FuturisticPageShell } from '../../components/common/FuturisticPageShell';
import { DoubleBezelCard } from '../../components/common/DoubleBezelCard';
import { ModalPortal } from '../../components/common/ModalPortal';
import type { Subject, SubjectGroup } from '../../types';

export const SubjectManagementView: React.FC = () => {
  const { subjects, addSubject, updateSubject } = useSchoolData();
  const { user } = useAuth();

  const canManage =
    user?.activeRole === 'SUPER_ADMIN' ||
    user?.activeRole === 'PRINCIPAL' ||
    user?.activeRole === 'VICE_PRINCIPAL_ADMIN' ||
    user?.activeRole === 'VICE_PRINCIPAL' ||
    user?.assignedRoles?.includes('SUPER_ADMIN') ||
    user?.assignedRoles?.includes('VICE_PRINCIPAL_ADMIN') ||
    user?.assignedRoles?.includes('VICE_PRINCIPAL');

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Add Subject Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newCategory, setNewCategory] = useState<Subject['category']>('GENERAL');
  const [newApplicableTo, setNewApplicableTo] = useState<Subject['applicableTo']>('ALL');
  const [newGroup, setNewGroup] = useState<SubjectGroup>('GENERAL_ELECTIVE');
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Edit Subject Modal State
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editCategory, setEditCategory] = useState<Subject['category']>('GENERAL');
  const [editApplicableTo, setEditApplicableTo] = useState<Subject['applicableTo']>('ALL');
  const [editGroup, setEditGroup] = useState<SubjectGroup>('GENERAL_ELECTIVE');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Success Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered Subject List
  const filteredSubjects = useMemo(() => {
    return subjects.filter(subject => {
      const matchesSearch =
        !searchQuery.trim() ||
        subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'ALL' || subject.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [subjects, searchQuery, selectedCategory]);

  // Open Edit Modal with current data
  const handleOpenEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setEditName(subject.name);
    setEditCode(subject.code);
    setEditCategory(subject.category || 'GENERAL');
    setEditApplicableTo(subject.applicableTo || 'ALL');
    setEditGroup(subject.group || 'GENERAL_ELECTIVE');
    setEditError(null);
  };

  // Submit Add Subject
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const name = newName.trim();
    const code = newCode.trim().toUpperCase();

    if (!name) {
      setAddError('Please enter a subject name.');
      return;
    }
    if (!code) {
      setAddError('Please enter a subject code.');
      return;
    }

    // Check duplicate code locally
    const duplicate = subjects.find(s => s.code.toUpperCase() === code);
    if (duplicate) {
      setAddError(`Subject code "${code}" is already used by ${duplicate.name}. Please enter a unique code.`);
      return;
    }

    setIsAdding(true);
    try {
      await addSubject({
        name,
        code,
        category: newCategory,
        applicableTo: newApplicableTo,
        group: newGroup,
        isCompulsoryJunior: newApplicableTo === 'JUNIOR' || newCategory === 'CORE',
        isCompulsorySeniorScience: newCategory === 'SCIENCE' && newApplicableTo === 'SENIOR'
      });

      showToast(`Subject "${name}" (${code}) created successfully.`);
      setIsAddModalOpen(false);
      setNewName('');
      setNewCode('');
      setNewCategory('GENERAL');
      setNewApplicableTo('ALL');
      setNewGroup('GENERAL_ELECTIVE');
    } catch (err: any) {
      setAddError(err?.message || 'Failed to create subject on the server.');
    } finally {
      setIsAdding(false);
    }
  };

  // Submit Edit Subject
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;
    setEditError(null);

    const name = editName.trim();
    const code = editCode.trim().toUpperCase();

    if (!name) {
      setEditError('Subject name cannot be empty.');
      return;
    }
    if (!code) {
      setEditError('Subject code cannot be empty.');
      return;
    }

    // Check duplicate code against other subjects
    const duplicate = subjects.find(
      s => s.id !== editingSubject.id && s.code.toUpperCase() === code
    );
    if (duplicate) {
      setEditError(`Subject code "${code}" is already used by ${duplicate.name}.`);
      return;
    }

    setIsSaving(true);
    try {
      await updateSubject(editingSubject.id, {
        name,
        code,
        category: editCategory,
        applicableTo: editApplicableTo,
        group: editGroup
      });

      showToast(`Subject updated to "${name}" (${code}) successfully.`);
      setEditingSubject(null);
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update subject on the server.');
    } finally {
      setIsSaving(false);
    }
  };

  const categoryBadges: Record<string, { bg: string; text: string }> = {
    CORE: { bg: 'bg-indigo-100 dark:bg-indigo-950/60', text: 'text-indigo-800 dark:text-indigo-300' },
    SCIENCE: { bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-800 dark:text-emerald-300' },
    ARTS: { bg: 'bg-purple-100 dark:bg-purple-950/60', text: 'text-purple-800 dark:text-purple-300' },
    COMMERCIAL: { bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-800 dark:text-amber-300' },
    GENERAL: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' }
  };

  return (
    <FuturisticPageShell
      title="SUBJECT MANAGEMENT"
      subtitle="Manage the subjects offered by the school."
      icon={BookOpen}
      badgeText={`${subjects.length} Subjects in Database`}
      badgeVariant="success"
      actions={
        canManage && (
          <button
            onClick={() => {
              setAddError(null);
              setIsAddModalOpen(true);
            }}
            className="touch-target px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-950/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Subject</span>
          </button>
        )
      }
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Control Bar: Search & Category Chips */}
      <DoubleBezelCard innerClassName="p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search subjects..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {['ALL', 'CORE', 'SCIENCE', 'ARTS', 'COMMERCIAL', 'GENERAL'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat === 'ALL' ? 'All Categories' : cat}
              </button>
            ))}
          </div>
        </div>
      </DoubleBezelCard>

      {/* Main Subjects Table */}
      <DoubleBezelCard innerClassName="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4 sm:px-6">Subject</th>
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Applicable Level</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredSubjects.length > 0 ? (
                filteredSubjects.map(subject => {
                  const catStyle = categoryBadges[subject.category] || categoryBadges.GENERAL;
                  return (
                    <tr
                      key={subject.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white text-xs block">
                              {subject.name}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {subject.group?.replace(/_/g, ' ') || 'General Curriculum'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          {subject.code}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${catStyle.bg} ${catStyle.text}`}>
                          {subject.category || 'GENERAL'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {subject.applicableTo === 'ALL'
                          ? 'All Classes (JSS & SSS)'
                          : subject.applicableTo === 'JUNIOR'
                          ? 'Junior Secondary Only'
                          : 'Senior Secondary Only'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Active</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        {canManage ? (
                          <button
                            onClick={() => handleOpenEdit(subject)}
                            className="touch-target px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 hover:text-amber-800 dark:hover:text-amber-300 border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                          >
                            <Pencil className="w-3 h-3 text-amber-500" />
                            <span>Edit</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">Read-Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      No subjects found matching "{searchQuery}"
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Try adjusting your search criteria or filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DoubleBezelCard>

      {/* MODAL 1: ADD NEW SUBJECT */}
      {isAddModalOpen && (
        <ModalPortal>
          <div className="bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-title font-bold text-slate-900 dark:text-white text-base">
                    Add New Subject
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Register a new subject into the curriculum database
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubject} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={e => setNewCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CSC"
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-amber-500 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="GENERAL">General</option>
                    <option value="CORE">Core</option>
                    <option value="SCIENCE">Science</option>
                    <option value="ARTS">Arts</option>
                    <option value="COMMERCIAL">Commercial</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Applicable To
                  </label>
                  <select
                    value={newApplicableTo}
                    onChange={e => setNewApplicableTo(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">All Classes</option>
                    <option value="JUNIOR">Junior Secondary Only</option>
                    <option value="SENIOR">Senior Secondary Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isAdding}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isAdding ? 'Saving...' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* MODAL 2: EDIT EXISTING SUBJECT */}
      {editingSubject && (
        <ModalPortal>
          <div className="bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-title font-bold text-slate-900 dark:text-white text-base">
                    Edit Subject
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Correct information or update curriculum attributes
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEditingSubject(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="e.g. Mathematics"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editCode}
                  onChange={e => setEditCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MTH"
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-amber-500 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="GENERAL">General</option>
                    <option value="CORE">Core</option>
                    <option value="SCIENCE">Science</option>
                    <option value="ARTS">Arts</option>
                    <option value="COMMERCIAL">Commercial</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Applicable To
                  </label>
                  <select
                    value={editApplicableTo}
                    onChange={e => setEditApplicableTo(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">All Classes</option>
                    <option value="JUNIOR">Junior Secondary Only</option>
                    <option value="SENIOR">Senior Secondary Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSubject(null)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </FuturisticPageShell>
  );
};
