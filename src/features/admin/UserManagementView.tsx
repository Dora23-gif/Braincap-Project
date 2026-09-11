import React, { useState } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { StaffMember, UserRole } from '../../types';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Search,
  CheckCircle2,
  XCircle,
  Copy,
  Edit2,
  Lock,
  Unlock,
  AlertTriangle,
  X,
  Sparkles,
  Mail,
  Award,
  BookOpen,
  Camera,
  MapPin
} from 'lucide-react';
import { DoubleBezelCard } from '../../components/common/DoubleBezelCard';
import { FuturisticKPICard } from '../../components/common/FuturisticKPICard';
import { FuturisticPageShell } from '../../components/common/FuturisticPageShell';
import { ModalPortal } from '../../components/common/ModalPortal';

export const UserManagementView: React.FC = () => {
  const { staff, classArms, subjects, addStaff, updateStaff, toggleStaffStatus, resetStaffPin } = useSchoolData();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [confirmToggleStaff, setConfirmToggleStaff] = useState<StaffMember | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [revealedPinStaffId, setRevealedPinStaffId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add/Edit Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formPrimaryRole, setFormPrimaryRole] = useState<UserRole>('SUBJECT_TEACHER');
  const [formRoles, setFormRoles] = useState<UserRole[]>(['SUBJECT_TEACHER']);
  const [formClassArmId, setFormClassArmId] = useState('');
  const [formSubjectIds, setFormSubjectIds] = useState<string[]>([]);
  const [formTeachingArmIds, setFormTeachingArmIds] = useState<string[]>([]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`);
  };

  const handleSubjectToggle = (subjectId: string) => {
    if (formSubjectIds.includes(subjectId)) {
      setFormSubjectIds(formSubjectIds.filter(id => id !== subjectId));
    } else {
      setFormSubjectIds([...formSubjectIds, subjectId]);
    }
  };

  const handleTeachingArmToggle = (armId: string) => {
    if (formTeachingArmIds.includes(armId)) {
      setFormTeachingArmIds(formTeachingArmIds.filter(id => id !== armId));
    } else {
      setFormTeachingArmIds([...formTeachingArmIds, armId]);
    }
  };

  const handleSelectJuniorArms = () => {
    const juniorIds = classArms.filter(a => (a.fullName || a.name).toLowerCase().includes('jss')).map(a => a.id);
    setFormTeachingArmIds(prev => Array.from(new Set([...prev, ...juniorIds])));
  };

  const handleSelectSeniorArms = () => {
    const seniorIds = classArms.filter(a => (a.fullName || a.name).toLowerCase().includes('sss')).map(a => a.id);
    setFormTeachingArmIds(prev => Array.from(new Set([...prev, ...seniorIds])));
  };

  const handleClearTeachingArms = () => {
    setFormTeachingArmIds([]);
  };

  // Filtered staff
  const filteredStaff = staff.filter(member => {
    const memberStaffId = member.staffId || member.identifier || '';
    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      memberStaffId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole =
      roleFilter === 'ALL' ||
      member.role === roleFilter ||
      (member.roles && member.roles.includes(roleFilter as UserRole));

    const matchesStatus =
      statusFilter === 'ALL' || member.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Quick stats
  const totalStaff = staff.length;
  const activeStaff = staff.filter(s => s.status === 'ACTIVE').length;
  const suspendedStaff = staff.filter(s => s.status === 'SUSPENDED').length;
  const multiRoleStaff = staff.filter(s => s.roles && s.roles.length > 1).length;

  const openAddModal = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
    setFormPhotoUrl('');
    setFormPrimaryRole('SUBJECT_TEACHER');
    setFormRoles(['SUBJECT_TEACHER']);
    setFormClassArmId('');
    setFormSubjectIds([]);
    setFormTeachingArmIds([]);
    setIsAddModalOpen(true);
  };

  const openEditModal = (member: StaffMember) => {
    setEditingStaff(member);
    setFormName(member.name);
    setFormEmail(member.email);
    setFormPhone(member.phoneNumber || '');
    setFormAddress(member.address || '');
    setFormPhotoUrl(member.photoUrl || '');
    setFormPrimaryRole(member.role || member.roles[0] || 'SUBJECT_TEACHER');
    setFormRoles(member.roles && member.roles.length > 0 ? member.roles : (member.role ? [member.role] : ['SUBJECT_TEACHER']));
    setFormClassArmId(member.formMasterClassArmId || member.formMasterArmId || '');
    setFormSubjectIds(member.assignedSubjectIds || []);
    setFormTeachingArmIds(member.assignedClassArms || []);
  };

  const handleRoleToggle = (role: UserRole) => {
    if (formRoles.includes(role)) {
      if (formRoles.length === 1) return;
      const newRoles = formRoles.filter(r => r !== role);
      setFormRoles(newRoles);
      if (formPrimaryRole === role) {
        setFormPrimaryRole(newRoles[0]);
      }
    } else {
      setFormRoles([...formRoles, role]);
    }
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    const isSubjectTeacher = formRoles.includes('SUBJECT_TEACHER') || formPrimaryRole === 'SUBJECT_TEACHER';
    const isFormMaster = formRoles.includes('FORM_MASTER') || formPrimaryRole === 'FORM_MASTER';

    const armObj = classArms.find(a => a.id === formClassArmId);
    const staffCode = `STF/2026/${String(staff.length + 1).padStart(3, '0')}`;

    // Combine teaching class arms with form master class arm if applicable
    const allAssignedArms = Array.from(new Set([
      ...formTeachingArmIds,
      ...(isFormMaster && formClassArmId ? [formClassArmId] : [])
    ]));

    // Generate allocated subjects matrix
    const allocated = formSubjectIds.flatMap(subId => {
      const subObj = subjects.find(s => s.id === subId);
      return formTeachingArmIds.map(armId => {
        const aObj = classArms.find(a => a.id === armId);
        return {
          classArmId: armId,
          classArmName: aObj?.fullName || armId,
          subjectId: subId,
          subjectName: subObj?.name || subId
        };
      });
    });

    const newStaff = addStaff({
      name: formName.trim(),
      identifier: staffCode,
      staffId: staffCode,
      title: isFormMaster && isSubjectTeacher
        ? 'Form Master & Subject Teacher'
        : isFormMaster
        ? 'Form Master / Class Head'
        : isSubjectTeacher
        ? 'Senior Academic Subject Teacher'
        : 'Academic Staff',
      email: formEmail.trim().toLowerCase(),
      phoneNumber: formPhone.trim() || '+234 800 000 0000',
      address: formAddress.trim(),
      photoUrl: formPhotoUrl || undefined,
      role: formPrimaryRole,
      roles: formRoles,
      assignedClassArms: allAssignedArms,
      assignedSubjectIds: formSubjectIds,
      allocatedSubjects: allocated,
      formMasterClassArmId: isFormMaster ? formClassArmId : undefined,
      formMasterClassArmName: isFormMaster && armObj ? armObj.fullName : undefined
    });

    setIsAddModalOpen(false);
    showToast(`Staff account for ${newStaff.name} created! Default PIN: ${newStaff.defaultPin}`);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !formName.trim() || !formEmail.trim()) return;

    const isSubjectTeacher = formRoles.includes('SUBJECT_TEACHER') || formPrimaryRole === 'SUBJECT_TEACHER';
    const isFormMaster = formRoles.includes('FORM_MASTER') || formPrimaryRole === 'FORM_MASTER';

    const armObj = classArms.find(a => a.id === formClassArmId);

    const allAssignedArms = Array.from(new Set([
      ...formTeachingArmIds,
      ...(isFormMaster && formClassArmId ? [formClassArmId] : [])
    ]));

    const allocated = formSubjectIds.flatMap(subId => {
      const subObj = subjects.find(s => s.id === subId);
      return formTeachingArmIds.map(armId => {
        const aObj = classArms.find(a => a.id === armId);
        return {
          classArmId: armId,
          classArmName: aObj?.fullName || armId,
          subjectId: subId,
          subjectName: subObj?.name || subId
        };
      });
    });

    updateStaff(editingStaff.id, {
      name: formName.trim(),
      email: formEmail.trim().toLowerCase(),
      phoneNumber: formPhone.trim(),
      address: formAddress.trim(),
      photoUrl: formPhotoUrl || undefined,
      role: formPrimaryRole,
      roles: formRoles,
      assignedClassArms: allAssignedArms,
      assignedSubjectIds: formSubjectIds,
      allocatedSubjects: allocated,
      formMasterClassArmId: isFormMaster ? formClassArmId : undefined,
      formMasterClassArmName: isFormMaster && armObj ? armObj.fullName : undefined
    });

    setEditingStaff(null);
    showToast(`Updated profile for ${formName}`);
  };

  const handleConfirmToggle = () => {
    if (!confirmToggleStaff) return;
    toggleStaffStatus(
      confirmToggleStaff.id,
      suspensionReason.trim() || undefined,
      { id: 'stf-001', name: 'Dr. Kenneth Balogun', role: 'SUPER_ADMIN' }
    );
    showToast(
      confirmToggleStaff.status === 'ACTIVE'
        ? `Suspended account for ${confirmToggleStaff.name}`
        : `Restored access for ${confirmToggleStaff.name}`
    );
    setConfirmToggleStaff(null);
    setSuspensionReason('');
  };

  const handleResetPin = (member: StaffMember) => {
    const pin = resetStaffPin(member.id, {
      id: 'stf-001',
      name: 'Dr. Kenneth Balogun',
      role: 'SUPER_ADMIN'
    });
    setRevealedPinStaffId(member.id);
    copyToClipboard(pin, `New PIN for ${member.name}`);
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'PRINCIPAL':
        return 'bg-slate-900 text-amber-400 border-slate-700';
      case 'VICE_PRINCIPAL':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'EXAM_OFFICER':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'FORM_MASTER':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'SUBJECT_TEACHER':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatRoleLabel = (role: string) => {
    return role.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  return (
    <FuturisticPageShell
      title="USER MANAGEMENT CONSOLE"
      subtitle="Super Administrator identity & access management. Configure multi-roles, generate PINs, and enforce instant account containment."
      icon={ShieldCheck}
      badgeText={`${activeStaff} Active Staff`}
      badgeVariant="cyber"
      actions={
        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer touch-target active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      }
    >
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/90 dark:bg-slate-800/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700/80 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <FuturisticKPICard
          title="Total Staff"
          value={totalStaff}
          subtitle="Academic & admin personnel"
          icon={Users}
          glowColor="indigo"
          sparklineData={[20, 22, 24, 25, 27, 28, totalStaff]}
        />
        <FuturisticKPICard
          title="Active Accounts"
          value={activeStaff}
          subtitle="Authorized credentials"
          icon={CheckCircle2}
          glowColor="emerald"
          trend={{ value: `${Math.round((activeStaff / (totalStaff || 1)) * 100)}% active`, isPositive: true }}
          sparklineData={[18, 19, 21, 23, 24, 25, activeStaff]}
        />
        <FuturisticKPICard
          title="Suspended"
          value={suspendedStaff}
          subtitle="Immediate containment"
          icon={ShieldAlert}
          glowColor="rose"
          trend={suspendedStaff > 0 ? { value: `${suspendedStaff} locked`, isPositive: false } : undefined}
          sparklineData={[0, 1, 0, 1, 0, suspendedStaff]}
        />
        <FuturisticKPICard
          title="Multi-Role Staff"
          value={multiRoleStaff}
          subtitle="Teacher + Master / Admin"
          icon={Sparkles}
          glowColor="cyan"
          sparklineData={[3, 4, 4, 5, 6, 7, multiRoleStaff]}
        />
      </div>

      {/* Control Filters */}
      <DoubleBezelCard innerClassName="p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, staff ID, or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="PRINCIPAL">Principal</option>
              <option value="VICE_PRINCIPAL">Vice Principal</option>
              <option value="EXAM_OFFICER">Exam Officer</option>
              <option value="FORM_MASTER">Form Master</option>
              <option value="SUBJECT_TEACHER">Subject Teacher</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="SUSPENDED">Suspended Only</option>
            </select>
          </div>
        </div>
      </DoubleBezelCard>

      {/* Staff Directory Table */}
      <DoubleBezelCard innerClassName="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Assigned Roles</th>
                <th className="py-3.5 px-4">Responsibilities</th>
                <th className="py-3.5 px-4">Contact & Security</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Governance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500 italic">
                    No staff members match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredStaff.map(member => {
                  const effectiveRoles: UserRole[] = member.roles && member.roles.length > 0
                    ? member.roles
                    : (member.role ? [member.role] : ['SUBJECT_TEACHER']);
                  const isSuspended = member.status === 'SUSPENDED';

                  return (
                    <tr
                      key={member.id}
                      className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${isSuspended ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''}`}
                    >
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {member.photoUrl ? (
                            <img
                              src={member.photoUrl}
                              alt=""
                              className="w-9 h-9 rounded-xl object-cover border border-indigo-200 dark:border-indigo-800 shadow-2xs shrink-0"
                            />
                          ) : (
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSuspended
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60'
                            }`}>
                              {member.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{member.name}</span>
                              {isSuspended && (
                                <span className="text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-1.5 py-0.2 rounded font-bold uppercase">
                                  Suspended
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono-tabular text-slate-400 dark:text-slate-500">
                              {member.staffId || member.identifier}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Roles */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {effectiveRoles.map(r => (
                            <span
                              key={r}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getRoleBadgeStyle(r)}`}
                            >
                              {formatRoleLabel(r)}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Responsibilities */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5 max-w-xs">
                          {(member.formMasterClassArmName || member.formMasterClassArmId) && (
                            <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">
                              <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>
                                Form Master:{' '}
                                {(() => {
                                  const arm = classArms.find(
                                    a => a.id === member.formMasterClassArmId || a.fullName === member.formMasterClassArmName || a.name === member.formMasterClassArmName
                                  );
                                  return arm?.fullName || member.formMasterClassArmName || 'Assigned Arm';
                                })()}
                              </span>
                            </div>
                          )}

                          {member.assignedSubjectIds && member.assignedSubjectIds.length > 0 && (
                            <div className="text-[10px] text-slate-700 dark:text-slate-300 font-medium">
                              <span className="font-bold text-indigo-700 dark:text-indigo-400">
                                {member.assignedSubjectIds.length} Subject{member.assignedSubjectIds.length > 1 ? 's' : ''}:
                              </span>{' '}
                              {member.assignedSubjectIds.map(sid => {
                                const sub = subjects.find(s => s.id === sid);
                                return sub?.code || sub?.name || sid;
                              }).join(', ')}
                            </div>
                          )}

                          {member.assignedClassArms && member.assignedClassArms.length > 0 && (
                            <div
                              className="text-[10px] text-slate-600 dark:text-slate-400 truncate"
                              title={member.assignedClassArms.map(aid => {
                                const arm = classArms.find(a => a.id === aid || a.fullName === aid || a.name === aid);
                                return arm?.fullName || aid;
                              }).join(', ')}
                            >
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                Teaching ({member.assignedClassArms.length} {member.assignedClassArms.length > 1 ? 'Arms' : 'Arm'}):
                              </span>{' '}
                              {member.assignedClassArms.map(aid => {
                                const arm = classArms.find(a => a.id === aid || a.fullName === aid || a.name === aid);
                                return arm?.fullName || aid;
                              }).join(', ')}
                            </div>
                          )}

                          {!member.formMasterClassArmName && !member.formMasterClassArmId && (!member.assignedSubjectIds || member.assignedSubjectIds.length === 0) && (!member.assignedClassArms || member.assignedClassArms.length === 0) && (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">Administrative Leadership</span>
                          )}
                        </div>
                      </td>

                      {/* Contact & Security */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-[11px]">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[140px]">{member.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <KeyRound className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span className="font-mono-tabular font-semibold text-slate-700 dark:text-slate-300">
                              {revealedPinStaffId === member.id ? (member.defaultPin || '••••••') : '••••••'}
                            </span>
                            <button
                              onClick={() => {
                                if (revealedPinStaffId === member.id) {
                                  setRevealedPinStaffId(null);
                                } else {
                                  setRevealedPinStaffId(member.id);
                                }
                              }}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold underline cursor-pointer"
                            >
                              {revealedPinStaffId === member.id ? 'Hide' : 'Show'}
                            </button>
                            <button
                              onClick={() => copyToClipboard(member.defaultPin || 'EIS-0000', `PIN for ${member.name}`)}
                              title="Copy PIN"
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isSuspended
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                              : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                          }`}
                        >
                          {isSuspended ? (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>SUSPENDED</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ACTIVE</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Governance Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(member)}
                            title="Edit Staff & Roles"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleResetPin(member)}
                            title="Regenerate Access PIN"
                            className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setConfirmToggleStaff(member)}
                            title={isSuspended ? 'Reactivate Account' : 'Suspend Account (1-Click)'}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isSuspended
                                ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                                : 'border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                            }`}
                          >
                            {isSuspended ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </DoubleBezelCard>

      {/* Add Staff Modal */}
      <ModalPortal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} maxWidthClass="max-w-2xl">
        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[88vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-serif-title font-bold text-slate-900 dark:text-white text-base">Add New Staff Member</h3>
            </div>
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
            {/* Photo Upload & Preview */}
            <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              {formPhotoUrl ? (
                <img
                  src={formPhotoUrl}
                  alt="Staff Preview"
                  className="w-14 h-14 rounded-xl object-cover border-2 border-indigo-500 shadow-xs shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                  <Camera className="w-6 h-6" />
                </div>
              )}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block text-xs">
                  Staff Passport Photo
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-xs text-slate-500 dark:text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-950/60 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  {formPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormPhotoUrl('')}
                      className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Full Name with Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. Kenneth Balogun or Mrs. Ngozi Okonjo"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Official Email *</label>
                <input
                  type="email"
                  required
                  placeholder="name@everest.sch.ng"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
                <input
                  type="text"
                  placeholder="+234 803 000 0000"
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Residential Address</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 15 Garki District, Area 11, Abuja"
                value={formAddress}
                onChange={e => setFormAddress(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">Primary Role</label>
              <select
                value={formPrimaryRole}
                onChange={e => setFormPrimaryRole(e.target.value as UserRole)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-semibold focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500"
              >
                <option value="SUBJECT_TEACHER">Subject Teacher</option>
                <option value="FORM_MASTER">Form Master</option>
                <option value="EXAM_OFFICER">Exam Officer</option>
                <option value="VICE_PRINCIPAL">Vice Principal</option>
                <option value="PRINCIPAL">Principal</option>
                <option value="SUPER_ADMIN">Super Administrator</option>
              </select>
            </div>

              {/* Multi-Role assignment checkboxes */}
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <label className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] uppercase tracking-wider">
                  Multi-Role Assignments (Select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                  {(['SUBJECT_TEACHER', 'FORM_MASTER', 'EXAM_OFFICER', 'VICE_PRINCIPAL'] as UserRole[]).map(r => (
                    <label key={r} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formRoles.includes(r)}
                        onChange={() => handleRoleToggle(r)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-medium text-[11px]">{formatRoleLabel(r)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Subject Teacher Academic Allocation */}
              {(formRoles.includes('SUBJECT_TEACHER') || formPrimaryRole === 'SUBJECT_TEACHER') && (
                <div className="space-y-3 p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200/80 dark:border-indigo-800/50">
                  <div className="flex items-center justify-between pb-1 border-b border-indigo-100 dark:border-indigo-900/50">
                    <label className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Subject Teacher Allocation</span>
                    </label>
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-full">
                      {formSubjectIds.length} Subject{formSubjectIds.length !== 1 ? 's' : ''} • {formTeachingArmIds.length} Class Arm{formTeachingArmIds.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Specific Subjects Multi-Select */}
                  <div className="space-y-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] block">
                      Assigned Subjects (Click to select/unselect):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-white/70 dark:bg-slate-800/60 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                      {subjects.map(sub => {
                        const isSelected = formSubjectIds.includes(sub.id);
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleSubjectToggle(sub.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 border ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span>{sub.name}</span>
                            <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'}`}>
                              ({sub.code})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Specific Class Arms Taught Multi-Select */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] block">
                        Assigned Class Arms / Cohorts:
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <button
                          type="button"
                          onClick={handleSelectJuniorArms}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 cursor-pointer"
                        >
                          All Junior (JSS)
                        </button>
                        <button
                          type="button"
                          onClick={handleSelectSeniorArms}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 cursor-pointer"
                        >
                          All Senior (SSS)
                        </button>
                        <button
                          type="button"
                          onClick={handleClearTeachingArms}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-500 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700 cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-white/70 dark:bg-slate-800/60 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                      {classArms.map(arm => {
                        const isSelected = formTeachingArmIds.includes(arm.id);
                        return (
                          <button
                            key={arm.id}
                            type="button"
                            onClick={() => handleTeachingArmToggle(arm.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 border ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span>{arm.fullName || arm.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Workload Intelligence Calculation */}
                  <div className="p-2.5 bg-white/80 dark:bg-slate-800/80 rounded-lg border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 dark:text-slate-400">
                      Calculated Teaching Workload:
                    </span>
                    <span className="font-bold text-indigo-700 dark:text-indigo-400 font-mono-tabular">
                      {formSubjectIds.length} Subject{formSubjectIds.length !== 1 ? 's' : ''} × {formTeachingArmIds.length} Class{formTeachingArmIds.length !== 1 ? 'es' : ''} = {formSubjectIds.length * formTeachingArmIds.length} Teaching Loads
                    </span>
                  </div>
                </div>
              )}

              {/* Form Master assignment conditional */}
              {formRoles.includes('FORM_MASTER') && (
                <div className="space-y-1 p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                  <label className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Assigned Form Class Arm</span>
                  </label>
                  <select
                    value={formClassArmId}
                    onChange={e => setFormClassArmId(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-semibold focus:outline-none"
                  >
                    <option value="">-- Select Form Class Arm (e.g. JSS 1 Gold) --</option>
                    {classArms.map(arm => (
                      <option key={arm.id} value={arm.id}>
                        {arm.fullName || arm.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-between">
                <div>
                  <span className="font-bold text-indigo-900 dark:text-indigo-200 block">Default Authentication PIN</span>
                  <span className="text-[10px] text-indigo-700 dark:text-indigo-400">Auto-generated for initial portal login</span>
                </div>
                <span className="font-mono-tabular font-bold text-sm bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-700 text-indigo-800 dark:text-indigo-300">
                  EIS-{Math.floor(1000 + Math.random() * 9000)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
      </ModalPortal>

      {/* Edit Staff Modal */}
      <ModalPortal isOpen={!!editingStaff} onClose={() => setEditingStaff(null)} maxWidthClass="max-w-2xl">
        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[88vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-serif-title font-bold text-slate-900 dark:text-white text-base">
                Edit Profile: {editingStaff?.name}
              </h3>
            </div>
            <button
              onClick={() => setEditingStaff(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
            {/* Photo Upload & Preview */}
            <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              {formPhotoUrl ? (
                <img
                  src={formPhotoUrl}
                  alt="Staff Preview"
                  className="w-14 h-14 rounded-xl object-cover border-2 border-indigo-500 shadow-xs shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                  <Camera className="w-6 h-6" />
                </div>
              )}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block text-xs">
                  Staff Passport Photo
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-xs text-slate-500 dark:text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-950/60 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  {formPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormPhotoUrl('')}
                      className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Full Name *</label>
              <input
                type="text"
                required
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Official Email *</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Phone</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Residential Address</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 15 Garki District, Area 11, Abuja"
                value={formAddress}
                onChange={e => setFormAddress(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <label className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] uppercase tracking-wider">
                  Assigned Roles
                </label>
                <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                  {(['SUPER_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'EXAM_OFFICER', 'FORM_MASTER', 'SUBJECT_TEACHER'] as UserRole[]).map(r => (
                    <label key={r} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formRoles.includes(r)}
                        onChange={() => handleRoleToggle(r)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-medium text-[11px]">{formatRoleLabel(r)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Subject Teacher Academic Allocation */}
              {(formRoles.includes('SUBJECT_TEACHER') || formPrimaryRole === 'SUBJECT_TEACHER') && (
                <div className="space-y-3 p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200/80 dark:border-indigo-800/50">
                  <div className="flex items-center justify-between pb-1 border-b border-indigo-100 dark:border-indigo-900/50">
                    <label className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Subject Teacher Allocation</span>
                    </label>
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-full">
                      {formSubjectIds.length} Subject{formSubjectIds.length !== 1 ? 's' : ''} • {formTeachingArmIds.length} Class Arm{formTeachingArmIds.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Specific Subjects Multi-Select */}
                  <div className="space-y-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] block">
                      Assigned Subjects (Click to select/unselect):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-white/70 dark:bg-slate-800/60 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                      {subjects.map(sub => {
                        const isSelected = formSubjectIds.includes(sub.id);
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleSubjectToggle(sub.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 border ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span>{sub.name}</span>
                            <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'}`}>
                              ({sub.code})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Specific Class Arms Taught Multi-Select */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] block">
                        Assigned Class Arms / Cohorts:
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <button
                          type="button"
                          onClick={handleSelectJuniorArms}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 cursor-pointer"
                        >
                          All Junior (JSS)
                        </button>
                        <button
                          type="button"
                          onClick={handleSelectSeniorArms}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 cursor-pointer"
                        >
                          All Senior (SSS)
                        </button>
                        <button
                          type="button"
                          onClick={handleClearTeachingArms}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-500 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700 cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-white/70 dark:bg-slate-800/60 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                      {classArms.map(arm => {
                        const isSelected = formTeachingArmIds.includes(arm.id);
                        return (
                          <button
                            key={arm.id}
                            type="button"
                            onClick={() => handleTeachingArmToggle(arm.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 border ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span>{arm.fullName || arm.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Workload Intelligence Calculation */}
                  <div className="p-2.5 bg-white/80 dark:bg-slate-800/80 rounded-lg border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 dark:text-slate-400">
                      Calculated Teaching Workload:
                    </span>
                    <span className="font-bold text-indigo-700 dark:text-indigo-400 font-mono-tabular">
                      {formSubjectIds.length} Subject{formSubjectIds.length !== 1 ? 's' : ''} × {formTeachingArmIds.length} Class{formTeachingArmIds.length !== 1 ? 'es' : ''} = {formSubjectIds.length * formTeachingArmIds.length} Teaching Loads
                    </span>
                  </div>
                </div>
              )}

              {formRoles.includes('FORM_MASTER') && (
                <div className="space-y-1 p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                  <label className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Form Master of Class Arm</span>
                  </label>
                  <select
                    value={formClassArmId}
                    onChange={e => setFormClassArmId(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-semibold focus:outline-none"
                  >
                    <option value="">-- Select Form Class Arm (e.g. JSS 1 Gold) --</option>
                    {classArms.map(arm => (
                      <option key={arm.id} value={arm.id}>
                        {arm.fullName || arm.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
      </ModalPortal>

      {/* 1-Click Suspension Confirmation Modal */}
      <ModalPortal
        isOpen={!!confirmToggleStaff}
        onClose={() => {
          setConfirmToggleStaff(null);
          setSuspensionReason('');
        }}
        maxWidthClass="max-w-md"
      >
        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-3 text-amber-600">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-serif-title font-bold text-slate-900 dark:text-white text-base">
                {confirmToggleStaff?.status === 'ACTIVE'
                  ? 'Suspend Staff Account'
                  : 'Reactivate Staff Account'}
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">{confirmToggleStaff?.staffId || confirmToggleStaff?.identifier}</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {confirmToggleStaff?.status === 'ACTIVE'
              ? `Are you sure you want to suspend access for ${confirmToggleStaff?.name}? This takes effect immediately and revokes all portal privileges.`
              : `Restore active status and portal access for ${confirmToggleStaff?.name}?`}
          </p>

          {confirmToggleStaff?.status === 'ACTIVE' && (
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Reason for Suspension (Audit Log Record)</label>
              <input
                type="text"
                placeholder="e.g. Account audit, study leave, or security containment"
                value={suspensionReason}
                onChange={e => setSuspensionReason(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-rose-500"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                setConfirmToggleStaff(null);
                setSuspensionReason('');
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmToggle}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer ${
                confirmToggleStaff?.status === 'ACTIVE'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {confirmToggleStaff?.status === 'ACTIVE' ? 'Confirm Suspension' : 'Confirm Reactivation'}
            </button>
          </div>
        </div>
      </ModalPortal>
    </FuturisticPageShell>
  );
};
