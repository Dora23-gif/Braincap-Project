import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchoolData } from '../../context/SchoolDataContext';
import { getRoleLabel, getShortName } from '../../lib/userDisplay';
import {
  Layers,
  Users,
  UserPlus,
  BookOpen,
  FileSpreadsheet,
  CheckSquare,
  Award,
  FileText,
  Settings,
  GraduationCap,
  CalendarDays,
  X,
  ShieldCheck,
  RotateCw,
  History,
  Stamp,
  LayoutDashboard,
  BarChart3,
  MessageSquare,
  LogOut,
  KeyRound
} from 'lucide-react';

export type ActiveNavView =
  | 'sessions-terms'
  | 'classes-arms'
  | 'subject-management'
  | 'subject-allocations'
  | 'student-directory'
  | 'admissions-wizard'
  | 'score-entry'
  | 'master-broadsheet'
  | 'attendance-register'
  | 'psychomotor-matrix'
  | 'report-card'
  | 'parent-portal'
  | 'student-portal'
  | 'user-management'
  | 'academic-rollover'
  | 'audit-log'
  | 'school-settings'
  | 'principal-dashboard'
  | 'principal-remarks'
  | 'honors-probation'
  | 'vp-academics-dashboard'
  | 'vp-admin-dashboard'
  | 'exam-officer-dashboard'
  | 'form-master-dashboard'
  | 'teacher-dashboard'
  | 'communications';

interface AppSidebarProps {
  activeView: ActiveNavView;
  onSelectView: (view: ActiveNavView) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenChangePassword?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeView,
  onSelectView,
  isOpenMobile,
  onCloseMobile,
  onOpenChangePassword
}) => {
  const { user, logout } = useAuth();
  const { portalMessages } = useSchoolData();
  if (!user) return null;

  const currentUserId = user.id || user.staffId || '';
  const currentUserRole = user.activeRole || '';
  const msgList = Array.isArray(portalMessages) ? portalMessages : [];
  const unreadCount = msgList.filter(
    m =>
      !m.isRead &&
      (m.recipientId === currentUserId ||
        m.recipientRole === currentUserRole ||
        m.recipientId === 'ALL' ||
        m.recipientRole === 'ALL')
  ).length;

  interface NavItem {
    id: ActiveNavView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }

  interface NavGroup {
    title: string;
    items: NavItem[];
  }

  const getNavGroups = (): NavGroup[] => {
    const role = user.activeRole;

    const getRoleGroups = (): NavGroup[] => {
      if (role === 'SUPER_ADMIN') {
      return [
        {
          title: 'Governance & Security',
          items: [
            { id: 'user-management', label: 'User Management', icon: ShieldCheck, badge: 'Admin' },
            { id: 'academic-rollover', label: 'Academic Rollover', icon: RotateCw, badge: 'Annual' },
            { id: 'audit-log', label: 'Activity History', icon: History },
            { id: 'school-settings', label: 'Institutional Settings', icon: Stamp }
          ]
        },
        {
          title: 'Academic Structure',
          items: [
            { id: 'sessions-terms', label: 'Sessions & Terms', icon: CalendarDays },
            { id: 'classes-arms', label: 'Classes & Arms', icon: Layers },
            { id: 'subject-management', label: 'Subject Management', icon: BookOpen },
            { id: 'subject-allocations', label: 'Teacher Allocations', icon: Settings }
          ]
        },
        {
          title: 'Student Records',
          items: [
            { id: 'student-directory', label: 'Student Directory', icon: Users },
            { id: 'admissions-wizard', label: 'New Admission', icon: UserPlus, badge: 'New' },
            { id: 'attendance-register', label: 'School Attendance', icon: CheckSquare }
          ]
        },
        {
          title: 'Examinations & Reports',
          items: [
            { id: 'master-broadsheet', label: 'Master Broadsheet', icon: FileSpreadsheet },
            { id: 'score-entry', label: 'Marksheet Overrides', icon: BookOpen },
            { id: 'psychomotor-matrix', label: 'Behavior & Remarks', icon: Award },
            { id: 'report-card', label: 'Printable Report Card', icon: FileText }
          ]
        }
      ];
    }

    if (role === 'PRINCIPAL') {
      return [
        {
          title: 'Executive Command',
          items: [
            { id: 'principal-dashboard', label: 'Executive Intelligence', icon: LayoutDashboard, badge: 'Live' },
            { id: 'principal-remarks', label: 'Result Clearance & Remarks', icon: Stamp, badge: 'Sign-Off' },
            { id: 'honors-probation', label: 'Academic Performance', icon: Award }
          ]
        },
        {
          title: 'Academic Oversight',
          items: [
            { id: 'master-broadsheet', label: 'Master Broadsheet', icon: FileSpreadsheet },
            { id: 'report-card', label: 'Printable Report Cards', icon: FileText },
            { id: 'academic-rollover', label: 'Promotion Council Matrix', icon: RotateCw },
            { id: 'student-directory', label: 'Student Directory', icon: Users }
          ]
        },
        {
          title: 'Institutional Governance',
          items: [
            { id: 'subject-allocations', label: 'Teacher Allocations', icon: Settings },
            { id: 'classes-arms', label: 'Classes & Cohorts', icon: Layers },
            { id: 'sessions-terms', label: 'Sessions & Terms', icon: CalendarDays }
          ]
        },
        {
          title: 'Institutional Identity',
          items: [
            { id: 'school-settings', label: 'Institutional Settings & Seal', icon: ShieldCheck },
            { id: 'audit-log', label: 'Activity History', icon: History }
          ]
        }
      ];
    }

    if (role === 'VICE_PRINCIPAL_ACADEMICS') {
      return [
        {
          title: 'Instructional Leadership',
          items: [
            { id: 'vp-academics-dashboard', label: 'Academics Command', icon: BookOpen, badge: 'Live' },
            { id: 'master-broadsheet', label: 'Master Broadsheet', icon: FileSpreadsheet },
            { id: 'subject-allocations', label: 'Teacher Allocations', icon: Settings }
          ]
        },
        {
          title: 'Curriculum & Assessment',
          items: [
            { id: 'score-entry', label: 'Continuous Assessment', icon: BookOpen },
            { id: 'honors-probation', label: 'Academic Performance', icon: Award },
            { id: 'report-card', label: 'Printable Report Cards', icon: FileText }
          ]
        },
        {
          title: 'Student Records',
          items: [
            { id: 'student-directory', label: 'Student Directory', icon: Users },
            { id: 'classes-arms', label: 'Classes & Arms', icon: Layers },
            { id: 'sessions-terms', label: 'Sessions & Terms', icon: CalendarDays }
          ]
        }
      ];
    }

    if (role === 'VICE_PRINCIPAL_ADMIN' || role === 'VICE_PRINCIPAL') {
      return [
        {
          title: 'Administration & Discipline',
          items: [
            { id: 'vp-admin-dashboard', label: 'Student Affairs Command', icon: ShieldCheck, badge: 'Active' },
            { id: 'attendance-register', label: 'Daily Roll Call Register', icon: CheckSquare },
            { id: 'student-directory', label: 'Student Directory', icon: Users }
          ]
        },
        {
          title: 'Student Intake & Classes',
          items: [
            { id: 'admissions-wizard', label: 'New Admission', icon: UserPlus, badge: 'New' },
            { id: 'classes-arms', label: 'Classes & Cohorts', icon: Layers },
            { id: 'subject-management', label: 'Subject Management', icon: BookOpen }
          ]
        },
        {
          title: 'Institutional Oversight',
          items: [
            { id: 'audit-log', label: 'Activity History', icon: History },
            { id: 'report-card', label: 'Terminal Report Cards', icon: FileText }
          ]
        }
      ];
    }

    if (role === 'EXAM_OFFICER') {
      return [
        {
          title: 'Examination Command',
          items: [
            { id: 'exam-officer-dashboard', label: 'Exam Command Center', icon: ShieldCheck, badge: 'Live' },
            { id: 'master-broadsheet', label: 'Master Broadsheet', icon: FileSpreadsheet },
            { id: 'score-entry', label: 'Audit Score Sheets', icon: BookOpen },
            { id: 'report-card', label: 'Terminal Report Cards', icon: FileText }
          ]
        },
        {
          title: 'School Registry',
          items: [
            { id: 'student-directory', label: 'Student Directory', icon: Users },
            { id: 'classes-arms', label: 'Classes & Cohorts', icon: Layers }
          ]
        }
      ];
    }

    if (role === 'SUBJECT_TEACHER' || role === 'TEACHER') {
      return [
        {
          title: 'Teacher Workspace',
          items: [
            { id: 'teacher-dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'score-entry', label: 'Enter Marks', icon: FileSpreadsheet, badge: 'CA + Exam' },
            { id: 'master-broadsheet', label: 'Student Performance', icon: BarChart3 },
            { id: 'report-card', label: 'Reports', icon: FileText }
          ]
        }
      ];
    }

    if (role === 'FORM_MASTER') {
      return [
        {
          title: 'Form Teacher Workspace',
          items: [
            { id: 'form-master-dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'student-directory', label: 'My Class Students', icon: Users },
            { id: 'score-entry', label: 'Enter Marks', icon: FileSpreadsheet, badge: 'Assigned' },
            { id: 'master-broadsheet', label: 'Class Performance', icon: BarChart3 },
            { id: 'attendance-register', label: 'Attendance', icon: CheckSquare },
            { id: 'psychomotor-matrix', label: 'Psychomotor & Remarks', icon: Award },
            { id: 'report-card', label: 'Report Cards', icon: FileText }
          ]
        }
      ];
    }

    if (role === 'PARENT' || role === 'STUDENT') {
      return [
        {
          title: 'Family & Student Portal',
          items: [
            { id: 'parent-portal', label: 'Ward Hub & Academics', icon: Users, badge: 'Unified' },
            { id: 'report-card', label: 'Terminal Report Card', icon: FileText, badge: 'Official' }
          ]
        }
      ];
    }

    if (role === 'ADMISSIONS_OFFICER') {
      return [
        {
          title: 'Admissions & Enrollment',
          items: [
            { id: 'admissions-wizard', label: 'New Admission', icon: UserPlus, badge: 'Intake' },
            { id: 'student-directory', label: 'Student Directory', icon: Users },
            { id: 'classes-arms', label: 'Classes & Cohorts', icon: Layers }
          ]
        }
      ];
    }

      return [];
    };

    const roleGroups = getRoleGroups();
    const hasComms = roleGroups.some(group => group.items.some(item => item.id === 'communications'));

    if (hasComms) {
      return roleGroups;
    }

    const commsGroup: NavGroup = {
      title: 'Portal Directives & Hub',
      items: [
        {
          id: 'communications',
          label: 'Communications & Directives',
          icon: MessageSquare,
          badge: unreadCount > 0 ? `${unreadCount} New` : undefined
        }
      ]
    };

    return [...roleGroups, commsGroup];
  };

  const navGroups = getNavGroups();

  return (
    <>
      {/* Mobile Backdrop with Blur */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Futuristic Sidebar Panel */}
      <aside
        className={`fixed md:sticky top-0 md:top-16 left-0 z-50 md:z-30 w-64 lg:w-72 xl:w-80 shrink-0 h-[100dvh] md:h-[calc(100dvh-4rem)] bg-white/95 dark:bg-[#070B14]/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-white/10 p-3 lg:p-4 flex flex-col transition-all duration-300 m-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Mobile Header with close button */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-white/10 md:hidden shrink-0">
          <div className="flex items-center gap-2">
            <img src="/crest.svg" alt="Crest" className="w-7 h-8 object-contain" />
            <span className="font-serif-title font-bold text-slate-900 dark:text-white text-sm tracking-wide">EVEREST EMIS</span>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 touch-target flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Sections - fills available vertical space and scrolls if needed */}
        <div className="flex-1 space-y-3 lg:space-y-4 overflow-y-auto pr-1 -mr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx}>
              <div className="px-2.5 lg:px-3 text-[9.5px] lg:text-[10.5px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-1">
                {group.title}
              </div>
              <div className="space-y-0.5 lg:space-y-1">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectView(item.id);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-2.5 lg:px-3 py-1.5 lg:py-2 rounded-xl text-xs lg:text-[13px] font-semibold lg:font-bold transition-all duration-150 cursor-pointer min-h-[34px] lg:min-h-[40px] active:scale-[0.98] ${
                        isActive
                          ? 'bg-gradient-to-r from-amber-600 to-amber-700 dark:from-indigo-600 dark:to-cyan-600 text-white shadow-sm shadow-amber-600/20 dark:shadow-cyan-500/20 font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 lg:gap-3 truncate">
                        <Icon className={`w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[9px] lg:text-[9.5px] font-extrabold px-1.5 lg:px-2 py-0.5 rounded-full shrink-0 ${
                            isActive
                              ? 'bg-black/20 text-white border border-white/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions & Info Box - pinned to bottom */}
        <div className="pt-2.5 lg:pt-3 border-t border-slate-100 dark:border-white/10 mt-auto space-y-1.5 lg:space-y-2 shrink-0">

          {/* User Identity Card */}
          <div className="px-2.5 lg:px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0E1526] border border-slate-200/80 dark:border-white/5 flex items-center gap-2.5">
            {/* Avatar */}
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border-2 border-amber-500/30 dark:border-cyan-500/30 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Name + Role */}
            <div className="min-w-0 flex-1">
              <div className="text-xs lg:text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
                {getShortName(user.name)}
              </div>
              <div className="text-[10px] lg:text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate leading-tight mt-0.5">
                {getRoleLabel(user.activeRole)}
              </div>
            </div>
          </div>

          {/* Change Password Button */}
          <button
            onClick={() => {
              onCloseMobile();
              onOpenChangePassword?.();
            }}
            className="w-full flex items-center justify-between px-2.5 lg:px-3 py-1.5 lg:py-2 rounded-xl text-xs lg:text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 dark:hover:text-amber-400 border border-transparent hover:border-amber-200 dark:hover:border-amber-900/50 transition-all duration-150 cursor-pointer min-h-[34px] lg:min-h-[38px] active:scale-[0.98] touch-manipulation"
            title="Change Account Password"
          >
            <div className="flex items-center gap-2.5 lg:gap-3 truncate">
              <KeyRound className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0 text-amber-500 dark:text-amber-400" />
              <span className="truncate">Change Password</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">
              Security
            </span>
          </button>

          {/* Sign Out Button */}
          <button
            onClick={() => {
              onCloseMobile();
              logout();
            }}
            className="w-full flex items-center justify-between px-2.5 lg:px-3 py-1.5 lg:py-2 rounded-xl text-xs lg:text-[13px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 transition-all duration-150 cursor-pointer min-h-[34px] lg:min-h-[38px] active:scale-[0.98] touch-manipulation"
            title="Sign Out of Portal"
          >
            <div className="flex items-center gap-2.5 lg:gap-3 truncate">
              <LogOut className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span className="truncate">Sign Out</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">
              Exit
            </span>
          </button>

          {/* Federal MoE Validated Section */}
          <div className="px-2.5 lg:px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0E1526] border border-slate-200/80 dark:border-white/5">
            <div className="text-[9px] lg:text-[9.5px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-cyan-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Federal MoE Validated</span>
            </div>
            <div className="text-xs lg:text-[13px] text-slate-800 dark:text-slate-200 font-bold mt-0.5">Everest Intl. Schools</div>
            <div className="text-[9px] lg:text-[9.5px] text-slate-400 dark:text-slate-500 font-mono-tabular mt-0.5">EMIS Enterprise v2.4</div>
          </div>
        </div>
      </aside>

    </>
  );
};
