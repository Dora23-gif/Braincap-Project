import React, { useState } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import { Search, Phone, Mail, BookOpen, Users, Pencil, Trash2, Camera, AlertTriangle, Check, X, MapPin, UserPlus } from 'lucide-react';
import { SubjectSelectionModal } from './SubjectSelectionModal';
import { FuturisticPageShell } from '../../components/common/FuturisticPageShell';
import { DoubleBezelCard } from '../../components/common/DoubleBezelCard';
import { ModalPortal } from '../../components/common/ModalPortal';
import { PaginationControls } from '../../components/common/PaginationControls';
import { api, PaginatedResponse, ARM_PK_BY_SLUG, adaptStudentFromBackend } from '../../lib/api';
import type { Student } from '../../types';


export const StudentDirectoryView: React.FC<{
  onSelectStudent?: (studentId: string) => void;
  onNavigateToAdmissions?: () => void;
}> = ({
  onSelectStudent,
  onNavigateToAdmissions
}) => {
  const { students, classArms, updateStudent, deleteStudent, allocations, getNextAdmissionNumber } = useSchoolData();
  const { user } = useAuth();
  const isSuperAdmin = user?.activeRole === 'SUPER_ADMIN' || user?.assignedRoles?.includes('SUPER_ADMIN');
  const isFormMaster = user?.activeRole === 'FORM_MASTER';
  const isSubjectTeacher = user?.activeRole === 'SUBJECT_TEACHER' || user?.activeRole === 'TEACHER';
  const canEnroll = isSuperAdmin || user?.activeRole === 'PRINCIPAL' || user?.activeRole === 'VICE_PRINCIPAL' || user?.activeRole === 'ADMISSIONS_OFFICER';

  // Compute teacher's allocated class arm IDs
  const teacherArmIds = React.useMemo(() => {
    const teacherId = user?.id || user?.staffId;
    const fromAllocations = allocations.filter(
      a => a.teacherId === teacherId || a.teacherId === user?.id || (a.teacherName && user?.name && a.teacherName.toLowerCase() === user.name.toLowerCase())
    );
    const list = fromAllocations.length > 0 ? fromAllocations : (user?.allocatedSubjects || []);
    return Array.from(new Set(list.map(a => a.classArmId)));
  }, [allocations, user]);

  // Allowed class arms based on role
  const allowedArms = React.useMemo(() => {
    if (isFormMaster && user?.formMasterArmId) {
      return classArms.filter(a => a.id === user.formMasterArmId);
    }
    if (isSubjectTeacher) {
      return classArms.filter(a => teacherArmIds.includes(a.id));
    }
    return classArms;
  }, [classArms, isFormMaster, isSubjectTeacher, user?.formMasterArmId, teacherArmIds]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArmFilter, setSelectedArmFilter] = useState(
    isFormMaster && user?.formMasterArmId ? user.formMasterArmId : 'ALL'
  );
  const [curriculumStudent, setCurriculumStudent] = useState<Student | null>(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [serverStudents, setServerStudents] = useState<Student[] | null>(null);
  const [serverTotalCount, setServerTotalCount] = useState<number | null>(null);
  const [serverTotalPages, setServerTotalPages] = useState<number | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Super Admin Edit Student State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState<Partial<Student>>({});

  // Super Admin Delete Student State
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch paginated students from backend
  React.useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsLoadingPage(true);
      try {
        const queryParams: Record<string, any> = {
          page,
          page_size: pageSize,
        };
        if (searchTerm.trim()) {
          queryParams.search = searchTerm.trim();
        }
        if (selectedArmFilter !== 'ALL') {
          const armObj = classArms.find(a => a.id === selectedArmFilter);
          queryParams.current_class_arm = armObj ? (armObj.fullName || armObj.id) : selectedArmFilter;
        }

        const res = await api.get<PaginatedResponse<any>>('/students/students/', queryParams);
        if (!isCancelled && res && Array.isArray(res.results)) {
          const adapted = res.results.map(adaptStudentFromBackend);
          setServerStudents(adapted);
          setServerTotalCount(res.count);
          setServerTotalPages(res.total_pages || Math.ceil(res.count / pageSize));
        }
      } catch (err) {
        if (!isCancelled) {
          setServerStudents(null);
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
  }, [page, pageSize, searchTerm, selectedArmFilter, refreshTrigger, students.length]);


  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setEditForm({
      firstName: student.firstName,
      lastName: student.lastName,
      middleName: student.middleName || '',
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      stateOfOrigin: student.stateOfOrigin,
      lga: student.lga,
      address: student.address || '',
      passportPhotoUrl: student.passportPhotoUrl,
      house: student.house,
      bloodGroup: student.bloodGroup,
      genotype: student.genotype,
      currentClassArmId: student.currentClassArmId,
      currentClassArmName: student.currentClassArmName,
      isBoarder: student.isBoarder,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      parentEmail: student.parentEmail
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm(prev => ({ ...prev, passportPhotoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const arm = classArms.find(a => a.id === editForm.currentClassArmId);
    const updates: Partial<Student> = {
      ...editForm,
      currentClassArmName: arm ? arm.fullName : editForm.currentClassArmName
    };

    await updateStudent(editingStudent.id, updates, {
      id: user?.id || 'stf-001',
      name: user?.name || 'Dr. Kenneth Balogun',
      role: user?.activeRole || 'SUPER_ADMIN'
    });

    setEditingStudent(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleConfirmDelete = () => {
    if (!deletingStudent) return;
    if (!deleteReason.trim() || deleteReason.trim().length < 5) {
      setDeleteError('Please provide an administrative reason of at least 5 characters.');
      return;
    }

    deleteStudent(deletingStudent.id, deleteReason.trim(), {
      id: user?.id || 'stf-001',
      name: user?.name || 'Dr. Kenneth Balogun',
      role: user?.activeRole || 'SUPER_ADMIN'
    });

    setDeletingStudent(null);
    setDeleteReason('');
    setDeleteError(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const clientFilteredStudents = React.useMemo(() => {
    const selectedArmObj = classArms.find(a => a.id === selectedArmFilter);
    const targetFullName = (selectedArmObj?.fullName || '').toLowerCase().trim();

    return students.filter(s => {
      // Role jurisdictional boundaries
      if (isFormMaster && user?.formMasterArmId && s.currentClassArmId !== user.formMasterArmId) {
        return false;
      }
      if (isSubjectTeacher && !teacherArmIds.includes(s.currentClassArmId)) {
        return false;
      }

      let matchesArm = false;
      if (selectedArmFilter === 'ALL') {
        matchesArm = true;
      } else {
        const studentArmId = String(s.currentClassArmId || '').toLowerCase().trim();
        const studentArmName = (s.currentClassArmName || '').toLowerCase().trim();
        const filterId = String(selectedArmFilter || '').toLowerCase().trim();

        matchesArm =
          studentArmId === filterId ||
          (targetFullName !== '' && (studentArmName === targetFullName || studentArmName.includes(targetFullName)));
      }

      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !search ||
        s.firstName.toLowerCase().includes(search) ||
        s.lastName.toLowerCase().includes(search) ||
        s.admissionNumber.toLowerCase().includes(search) ||
        (s.currentClassArmName || '').toLowerCase().includes(search) ||
        s.stateOfOrigin.toLowerCase().includes(search);

      return matchesArm && matchesSearch;
    });
  }, [students, isFormMaster, user?.formMasterArmId, isSubjectTeacher, teacherArmIds, selectedArmFilter, searchTerm, classArms]);

  const displayedStudents = React.useMemo(() => {
    if (serverStudents !== null) {
      return serverStudents;
    }
    const start = (page - 1) * pageSize;
    return clientFilteredStudents.slice(start, start + pageSize);
  }, [serverStudents, clientFilteredStudents, page, pageSize]);

  const totalCount = serverTotalCount !== null ? serverTotalCount : clientFilteredStudents.length;
  const totalPages = serverTotalPages !== null ? serverTotalPages : Math.max(1, Math.ceil(clientFilteredStudents.length / pageSize));

  return (
    <FuturisticPageShell
      title="STUDENT ENROLLMENT DIRECTORY"
      subtitle={
        isFormMaster
          ? `Custodial roster for your pastoral arm (${allowedArms[0]?.fullName || 'Assigned Class Arm'}).`
          : isSubjectTeacher
          ? 'Students enrolled in cohorts across your teaching allocations.'
          : 'Active school roster with Nigerian demographic profiles, curriculum subject allocations, and parent links'
      }
      icon={Users}
      badgeText={`${totalCount} Enrolled`}
      badgeVariant="info"
    >
      {/* Filter Bar */}
      <DoubleBezelCard innerClassName="p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Filter roster by class arm, demographic profile, or admission ID
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Box */}
            <div className="relative flex-1 md:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, adm no, state..."
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 transition-all"
              />
            </div>

            {/* Arm Filter */}
            {isFormMaster && user?.formMasterArmId ? (
              <div className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Arm: {allowedArms[0]?.fullName || user.formMasterArmName}</span>
              </div>
            ) : (
              <select
                value={selectedArmFilter}
                onChange={e => {
                  setSelectedArmFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
              >

                {!isSubjectTeacher && <option value="ALL">All Class Arms</option>}
                {allowedArms.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}
                  </option>
                ))}
              </select>
            )}

            {/* Quick Action: Enroll Student */}
            {onNavigateToAdmissions && canEnroll && (
              <button
                type="button"
                onClick={onNavigateToAdmissions}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
                title={`Enroll New Student - Next Serial ID: ${getNextAdmissionNumber()}`}
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Enroll Student</span>
                <span className="px-1.5 py-0.5 rounded-md bg-slate-950/15 text-[10px] font-mono font-black">
                  {getNextAdmissionNumber()}
                </span>
              </button>
            )}
          </div>
        </div>
      </DoubleBezelCard>

      {/* Directory Grid */}
      {displayedStudents.length === 0 ? (
        <DoubleBezelCard innerClassName="p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Students Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              No students match the selected filter criteria or search query.
            </p>
          </div>
          {onNavigateToAdmissions && canEnroll && (
            <button
              type="button"
              onClick={onNavigateToAdmissions}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Enroll New Student ({getNextAdmissionNumber()})</span>
            </button>
          )}
        </DoubleBezelCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {displayedStudents.map(student => {
          const registeredCount = student.registeredSubjectIds ? student.registeredSubjectIds.length : 0;
          return (
            <DoubleBezelCard
              key={student.id}
              hoverEffect
              innerClassName="p-5 space-y-4 flex flex-col justify-between h-full"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={student.passportPhotoUrl}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover border-2 border-slate-100 dark:border-slate-800 shadow-2xs"
                  />
                  <div className="truncate">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {student.lastName}, {student.firstName}
                    </h3>
                    <div className="text-[11px] font-mono-tabular font-bold text-amber-900 dark:text-amber-400">
                      {student.admissionNumber}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{student.currentClassArmName}</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Gender / Blood:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {student.gender} • {student.bloodGroup} ({student.genotype})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Curriculum:</span>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                      {registeredCount > 0 ? `${registeredCount} Subjects Enrolled` : 'Pending Registration'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">State / LGA:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[150px]">
                      {student.stateOfOrigin} ({student.lga})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">House:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{student.house} House</span>
                  </div>
                  {student.address && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Address:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[150px]">
                        {student.address}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">Guardian: {student.parentName}</div>
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <Phone className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span className="font-mono-tabular">{student.parentPhone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 truncate">
                    <Mail className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span className="truncate">{student.parentEmail}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCurriculumStudent(student)}
                  className="w-full py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Manage Subjects ({registeredCount})</span>
                </button>

                {/* Super Admin Actions: Edit & Remove */}
                {isSuperAdmin && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(student)}
                      className="py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit Details</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDeletingStudent(student); setDeleteReason(''); setDeleteError(null); }}
                      className="py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                )}

                {onSelectStudent && (
                  <button
                    type="button"
                    onClick={() => onSelectStudent(student.id)}
                    className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    View Academic Dossier
                  </button>
                )}
              </div>
            </DoubleBezelCard>
          );
        })}
      </div>
      )}

      {/* Server Pagination Navigation */}
      <PaginationControls
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoadingPage}
        itemLabel="students"
        className="mt-6"
      />


      {/* Subject Selection / Drop Management Modal */}
      {curriculumStudent && (
        <SubjectSelectionModal
          student={curriculumStudent}
          isOpen={!!curriculumStudent}
          onClose={() => {
            setCurriculumStudent(null);
            setRefreshTrigger(p => p + 1);
          }}
        />
      )}

      {/* Super Admin Edit Student Modal */}
      <ModalPortal isOpen={!!editingStudent} onClose={() => setEditingStudent(null)} maxWidthClass="max-w-2xl">
        {editingStudent && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Edit Student Personal Details
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                    {editingStudent.admissionNumber} • {editingStudent.name || `${editingStudent.firstName} ${editingStudent.lastName}`}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudentEdit} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Photo Upload & Preview */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <img
                  src={editForm.passportPhotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt="Student Passport"
                  className="w-16 h-16 rounded-xl object-cover border-2 border-amber-500 shadow-sm shrink-0"
                />
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-amber-500" />
                    <span>Upload Student Passport Photo</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 dark:file:bg-amber-950/60 file:text-amber-700 dark:file:text-amber-300 hover:file:bg-amber-100 cursor-pointer"
                  />
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.firstName || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Last Name (Surname) *</label>
                  <input
                    type="text"
                    required
                    value={editForm.lastName || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={editForm.middleName || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, middleName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Gender, DOB & Class Arm */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Gender *</label>
                  <select
                    value={editForm.gender || 'MALE'}
                    onChange={e => setEditForm(prev => ({ ...prev, gender: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={editForm.dateOfBirth || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Class Arm *</label>
                  <select
                    value={editForm.currentClassArmId || ''}
                    onChange={e => {
                      const arm = classArms.find(a => a.id === e.target.value);
                      setEditForm(prev => ({
                        ...prev,
                        currentClassArmId: e.target.value,
                        currentClassArmName: arm?.fullName || prev.currentClassArmName
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {classArms.map(arm => (
                      <option key={arm.id} value={arm.id}>
                        {arm.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* State of Origin, LGA, Residential Address */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">State of Origin</label>
                  <input
                    type="text"
                    value={editForm.stateOfOrigin || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, stateOfOrigin: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">LGA</label>
                  <input
                    type="text"
                    value={editForm.lga || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, lga: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Residential Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 14 Admiralty Way, Lekki Phase 1, Lagos"
                    value={editForm.address || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* House, Blood Group, Genotype, Boarding Status */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">House</label>
                  <select
                    value={editForm.house || 'Emerald'}
                    onChange={e => setEditForm(prev => ({ ...prev, house: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Emerald">Emerald House</option>
                    <option value="Sapphire">Sapphire House</option>
                    <option value="Ruby">Ruby House</option>
                    <option value="Diamond">Diamond House</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Blood Group</label>
                  <select
                    value={editForm.bloodGroup || 'O+'}
                    onChange={e => setEditForm(prev => ({ ...prev, bloodGroup: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Genotype</label>
                  <select
                    value={editForm.genotype || 'AA'}
                    onChange={e => setEditForm(prev => ({ ...prev, genotype: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {['AA', 'AS', 'AC', 'SS'].map(gt => (
                      <option key={gt} value={gt}>{gt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Boarding Status</label>
                  <select
                    value={editForm.isBoarder ? 'BOARDING' : 'DAY'}
                    onChange={e => setEditForm(prev => ({ ...prev, isBoarder: e.target.value === 'BOARDING' }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="DAY">Day Student</option>
                    <option value="BOARDING">Boarding Student</option>
                  </select>
                </div>
              </div>

              {/* Parent / Guardian Information */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-bold text-slate-800 dark:text-slate-200">Parent / Legal Guardian Information</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Guardian Name *</label>
                    <input
                      type="text"
                      required
                      value={editForm.parentName || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, parentName: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={editForm.parentPhone || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, parentPhone: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editForm.parentEmail || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, parentEmail: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Form Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </ModalPortal>

      {/* Super Admin Delete Confirmation Modal */}
      <ModalPortal isOpen={!!deletingStudent} onClose={() => setDeletingStudent(null)} maxWidthClass="max-w-md">
        {deletingStudent && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Remove Student from Register
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Institutional record removal and de-enrollment
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl border border-rose-200/80 dark:border-rose-800/60 space-y-1 text-xs">
              <div className="font-bold text-rose-900 dark:text-rose-200">
                {deletingStudent.lastName}, {deletingStudent.firstName} ({deletingStudent.admissionNumber})
              </div>
              <div className="text-slate-600 dark:text-slate-300">
                Class Arm: <span className="font-semibold">{deletingStudent.currentClassArmName}</span>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 pt-1">
                Warning: Removing this student permanently deletes their active enrollment profile and records an entry in Activity History.
              </p>
            </div>

            {deleteError && (
              <div className="p-2.5 bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Mandatory Reason for Deletion / Removal *
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Transferred to another school, Duplicate admission entry..."
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Removal</span>
              </button>
            </div>
          </div>
        )}
      </ModalPortal>
    </FuturisticPageShell>
  );
};
