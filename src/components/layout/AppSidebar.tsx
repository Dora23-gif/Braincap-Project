import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchoolData } from '../../context/SchoolDataContext';
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
  MessageSquare
} from 'lucide-react';

export type ActiveNavView =
  | 'sessions-terms'
  | 'classes-arms'
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
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeView,
  onSelectView,
  isOpenMobile,
  onCloseMobile
}) => {
  const { user } = useAuth();
  const { portalMessages } = useSchoolData();
  if (!user) return null;

  const currentUserId = user.id || user.staffId || '';
  const currentUserRole = user.activeRole || '';
  const unreadCount = portalMessages.filter(
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
            { id: 'audit-log', label: 'Activity Audit Log', icon: History },
            { id: 'school-settings', label: 'Institutional Settings', icon: Stamp }
          ]
        },
        {
          title: 'Academic Structure',
          items: [
            { id: 'sessions-terms', label: 'Sessions & Terms', icon: CalendarDays },
            { id: 'classes-arms', label: 'Classes & Arms', icon: Layers },
            { id: 'subject-allocations', label: 'Teacher Allocations', icon: Settings }
          ]
        },
        {
          title: 'Student Records',
          items: [
            { id: 'student-directory', label: 'Student Directory', icon: Users },
            { id: 'admissions-wizard', label: 'Admissions Wizard', icon: UserPlus, badge: 'New' },
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
            { id: 'honors-probation', label: 'Honors & Probation', icon: Award }
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
            { id: 'audit-log', label: 'Activity Audit Log', icon: History }
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
            { id: 'honors-probation', label: 'Honors & Probation', icon: Award },
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
            { id: 'admissions-wizard', label: 'Admissions Wizard', icon: UserPlus, badge: 'New' },
            { id: 'classes-arms', label: 'Classes & Cohorts', icon: Layers }
          ]
        },
        {
          title: 'Institutional Oversight',
          items: [
            { id: 'audit-log', label: 'Activity Audit Log', icon: History },
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

    if (role === 'SUBJECT_TEACHER') {
      return [
        {
          title: 'Faculty Assessment Hub',
          items: [
            { id: 'teacher-dashboard', label: 'Academic Command Hub', icon: BookOpen, badge: 'Live' },
            { id: 'score-entry', label: 'Mark Sheet Entry (CA+Exam)', icon: FileSpreadsheet },
            { id: 'master-broadsheet', label: 'Class Performance Matrix', icon: FileText }
          ]
        }
      ];
    }

    if (role === 'FORM_MASTER') {
      return [
        {
          title: 'Pastoral Leadership',
          items: [
            { id: 'form-master-dashboard', label: 'Pastoral Command Center', icon: ShieldCheck, badge: 'Live' },
            { id: 'attendance-register', label: 'Daily Roll Call Register', icon: CheckSquare, badge: 'Roll Call' },
            { id: 'psychomotor-matrix', label: 'Psychomotor & Remarks', icon: Award }
          ]
        },
        {
          title: 'Class Arm Collation',
          items: [
            { id: 'master-broadsheet', label: 'Class Arm Broadsheet', icon: FileSpreadsheet },
            { id: 'report-card', label: 'Preview Arm Report Cards', icon: FileText }
          ]
        },
        {
          title: 'My Class Roster',
          items: [
            { id: 'student-directory', label: 'Class Students List', icon: Users }
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
            { id: 'admissions-wizard', label: 'Admissions Wizard', icon: UserPlus, badge: 'Intake' },
            { id: 'student-directory', label: 'Student Directory', icon: Users },
            { id: 'classes-arms', label: 'Classes & Cohorts', icon: Layers }
          ]
        }
      ];
    }

      return [];
    };

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

    return [...getRoleGroups(), commsGroup];
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
        className={`fixed md:sticky top-0 md:top-[61px] left-0 z-50 md:z-30 w-64 h-[100dvh] md:h-[calc(100dvh-61px)] bg-white/95 dark:bg-[#070B14]/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-white/10 p-4 flex flex-col justify-between overflow-y-auto transition-all duration-300 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Mobile Header with close button */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-white/10 md:hidden">
            <div className="flex items-center gap-2">
              <img src="/crest.svg" alt="Crest" className="w-7 h-8 object-contain" />
              <span className="font-serif-title font-bold text-slate-900 dark:text-white text-sm tracking-wide">EVEREST EMIS</span>
            </div>
            <button
              onClick={onCloseMobile}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 touch-target flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Sections */}
          <div className="space-y-6">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx}>
                <div className="px-3 text-[10px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">
                  {group.title}
                </div>
                <div className="space-y-1">
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
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer min-h-[44px] active:scale-[0.98] ${
                          isActive
                            ? 'bg-gradient-to-r from-amber-600 to-amber-700 dark:from-indigo-600 dark:to-cyan-600 text-white shadow-md shadow-amber-600/20 dark:shadow-cyan-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
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
        </div>

        {/* Footer Info Box */}
        <div className="pt-4 border-t border-slate-100 dark:border-white/10 mt-4">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0E1526] border border-slate-200/80 dark:border-white/5 shadow-2xs">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-cyan-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Federal MoE Validated</span>
            </div>
            <div className="text-xs text-slate-800 dark:text-slate-200 font-bold mt-0.5">Everest Intl. Schools</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono-tabular mt-1">EMIS Enterprise v2.4</div>
          </div>
        </div>
      </aside>
    </>
  );
};
