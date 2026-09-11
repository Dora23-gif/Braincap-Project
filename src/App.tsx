import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SchoolDataProvider } from './context/SchoolDataContext';
import { LoginGate } from './features/auth/LoginGate';
import { AppHeader } from './components/layout/AppHeader';
import { AppSidebar, ActiveNavView } from './components/layout/AppSidebar';
import { ShieldAlert } from 'lucide-react';

// Admin views
import { SessionsTermsView } from './features/admin/SessionsTermsView';
import { ClassesArmsView } from './features/admin/ClassesArmsView';
import { SubjectAllocationView } from './features/admin/SubjectAllocationView';
import { UserManagementView } from './features/admin/UserManagementView';
import { AcademicRolloverView } from './features/admin/AcademicRolloverView';
import { AuditLogView } from './features/admin/AuditLogView';
import { SchoolSettingsView } from './features/admin/SchoolSettingsView';

// Student views
import { StudentDirectoryView } from './features/students/StudentDirectoryView';
import { AdmissionsWizard } from './features/students/AdmissionsWizard';
import { AttendanceRegisterView } from './features/students/AttendanceRegisterView';
import { PsychomotorRatingView } from './features/students/PsychomotorRatingView';

// Grading views
import { ScoreEntryGridView } from './features/grading/ScoreEntryGridView';
import { BroadsheetView } from './features/grading/BroadsheetView';
import { PrintableReportCard } from './features/reports/PrintableReportCard';

// Portal views
import { ParentDashboard } from './features/portal/ParentDashboard';
import { StudentDashboard } from './features/portal/StudentDashboard';

// Principal Executive views
import { PrincipalDashboardView } from './features/principal/PrincipalDashboardView';
import { PrincipalRemarkingView } from './features/principal/PrincipalRemarkingView';
import { PrincipalHonorsProbationView } from './features/principal/PrincipalHonorsProbationView';

// Vice Principal views
import { VPAcademicsDashboardView } from './features/vice-principal/VPAcademicsDashboardView';
import { VPAdminDashboardView } from './features/vice-principal/VPAdminDashboardView';

// Examination Officer views
import { ExamOfficerDashboardView } from './features/exam-officer/ExamOfficerDashboardView';

// Form Master views
import { FormMasterDashboardView } from './features/form-master/FormMasterDashboardView';

// Subject Teacher views
import { SubjectTeacherDashboardView } from './features/teacher/SubjectTeacherDashboardView';

// Communications & Directives view
import { CommunicationsHubView } from './features/communications/CommunicationsHubView';

const ROLE_PERMISSIONS: Record<string, ActiveNavView[]> = {
  SUPER_ADMIN: [
    'user-management', 'academic-rollover', 'audit-log', 'school-settings',
    'sessions-terms', 'classes-arms', 'subject-allocations', 'student-directory',
    'admissions-wizard', 'score-entry', 'master-broadsheet', 'attendance-register',
    'psychomotor-matrix', 'report-card', 'parent-portal', 'student-portal',
    'principal-dashboard', 'principal-remarks', 'honors-probation',
    'vp-academics-dashboard', 'vp-admin-dashboard', 'exam-officer-dashboard',
    'form-master-dashboard', 'teacher-dashboard', 'communications'
  ],
  PRINCIPAL: [
    'principal-dashboard', 'principal-remarks', 'honors-probation', 'master-broadsheet',
    'report-card', 'academic-rollover', 'student-directory', 'subject-allocations',
    'classes-arms', 'sessions-terms', 'school-settings', 'audit-log', 'communications'
  ],
  VICE_PRINCIPAL_ACADEMICS: [
    'vp-academics-dashboard', 'master-broadsheet', 'subject-allocations', 'score-entry',
    'honors-probation', 'report-card', 'student-directory', 'classes-arms',
    'sessions-terms', 'communications'
  ],
  VICE_PRINCIPAL_ADMIN: [
    'vp-admin-dashboard', 'attendance-register', 'student-directory', 'admissions-wizard',
    'classes-arms', 'audit-log', 'report-card', 'communications'
  ],
  VICE_PRINCIPAL: [
    'vp-admin-dashboard', 'attendance-register', 'student-directory', 'admissions-wizard',
    'classes-arms', 'audit-log', 'report-card', 'communications'
  ],
  VICE_PRINCIPAL_STUDENT_AFFAIRS: [
    'vp-admin-dashboard', 'attendance-register', 'student-directory', 'classes-arms',
    'report-card', 'communications'
  ],
  EXAM_OFFICER: [
    'exam-officer-dashboard', 'master-broadsheet', 'score-entry', 'report-card',
    'student-directory', 'classes-arms', 'communications'
  ],
  EXAMINATION_OFFICER: [
    'exam-officer-dashboard', 'master-broadsheet', 'score-entry', 'report-card',
    'student-directory', 'classes-arms', 'communications'
  ],
  FORM_MASTER: [
    'form-master-dashboard', 'attendance-register', 'psychomotor-matrix',
    'master-broadsheet', 'report-card', 'student-directory', 'communications'
  ],
  SUBJECT_TEACHER: [
    'teacher-dashboard', 'score-entry', 'master-broadsheet', 'communications'
  ],
  TEACHER: [
    'teacher-dashboard', 'score-entry', 'master-broadsheet', 'communications'
  ],
  ADMISSIONS_OFFICER: [
    'admissions-wizard', 'student-directory', 'classes-arms', 'communications'
  ],
  PARENT: [
    'parent-portal', 'student-portal', 'report-card', 'communications'
  ],
  STUDENT: [
    'parent-portal', 'student-portal', 'report-card', 'communications'
  ]
};

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  // Set default view depending on active role
  const getDefaultView = (role: string): ActiveNavView => {
    switch (role) {
      case 'SUBJECT_TEACHER':
      case 'TEACHER':
        return 'teacher-dashboard';
      case 'FORM_MASTER':
        return 'form-master-dashboard';
      case 'EXAM_OFFICER':
      case 'EXAMINATION_OFFICER':
        return 'exam-officer-dashboard';
      case 'ADMISSIONS_OFFICER':
        return 'admissions-wizard';
      case 'PARENT':
      case 'STUDENT':
        return 'parent-portal';
      case 'SUPER_ADMIN':
        return 'user-management';
      case 'PRINCIPAL':
        return 'principal-dashboard';
      case 'VICE_PRINCIPAL_ACADEMICS':
        return 'vp-academics-dashboard';
      case 'VICE_PRINCIPAL_ADMIN':
      case 'VICE_PRINCIPAL':
      case 'VICE_PRINCIPAL_STUDENT_AFFAIRS':
        return 'vp-admin-dashboard';
      default:
        return 'user-management';
    }
  };

  const [activeView, setActiveView] = useState<ActiveNavView>('user-management');

  // React when user or activeRole changes (e.g. role switcher clicked)
  useEffect(() => {
    if (user) {
      setActiveView(getDefaultView(user.activeRole));
    }
  }, [user?.activeRole]);

  if (!user) {
    return <LoginGate />;
  }

  const renderActiveView = () => {
    // Enforce strict Role-Based Access Control
    const allowedViews = ROLE_PERMISSIONS[user.activeRole] || [];
    if (!allowedViews.includes(activeView)) {
      return (
        <div className="p-8 sm:p-12 max-w-lg mx-auto text-center space-y-4 my-auto">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold font-serif-title text-slate-900 dark:text-white">
            Access Restricted Protocol
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Your current active role (<span className="font-bold text-amber-600 dark:text-amber-400">{user.activeRole.replace(/_/g, ' ')}</span>) does not have authorization or security clearance to access this module.
          </p>
          <button
            onClick={() => setActiveView(getDefaultView(user.activeRole))}
            className="touch-target px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-950/20 cursor-pointer active:scale-95"
          >
            Return to Authorized Workspace
          </button>
        </div>
      );
    }

    switch (activeView) {
      case 'user-management':
        return <UserManagementView />;
      case 'principal-dashboard':
        return <PrincipalDashboardView onNavigateView={view => setActiveView(view as any)} />;
      case 'principal-remarks':
        return <PrincipalRemarkingView />;
      case 'honors-probation':
        return <PrincipalHonorsProbationView />;
      case 'vp-academics-dashboard':
        return <VPAcademicsDashboardView />;
      case 'vp-admin-dashboard':
        return <VPAdminDashboardView />;
      case 'exam-officer-dashboard':
        return <ExamOfficerDashboardView />;
      case 'form-master-dashboard':
        return <FormMasterDashboardView />;
      case 'teacher-dashboard':
        return (
          <SubjectTeacherDashboardView
            onNavigateToScores={() => {
              setActiveView('score-entry');
            }}
          />
        );
      case 'academic-rollover':
        return <AcademicRolloverView />;
      case 'audit-log':
        return <AuditLogView />;
      case 'school-settings':
        return <SchoolSettingsView />;
      case 'sessions-terms':
        return <SessionsTermsView />;
      case 'classes-arms':
        return <ClassesArmsView />;
      case 'subject-allocations':
        return <SubjectAllocationView />;
      case 'student-directory':
        return (
          <StudentDirectoryView
            onSelectStudent={() => {
              setActiveView('report-card');
            }}
          />
        );
      case 'admissions-wizard':
        return (
          <AdmissionsWizard
            onComplete={() => {
              setActiveView('student-directory');
            }}
          />
        );
      case 'score-entry':
        return <ScoreEntryGridView />;
      case 'master-broadsheet':
        return <BroadsheetView />;
      case 'attendance-register':
        return <AttendanceRegisterView />;
      case 'psychomotor-matrix':
        return <PsychomotorRatingView />;
      case 'report-card':
        return <PrintableReportCard />;
      case 'parent-portal':
      case 'student-portal':
        return (
          <ParentDashboard
            onViewReportCard={() => {
              setActiveView('report-card');
            }}
          />
        );
      case 'communications':
        return <CommunicationsHubView />;
      default:
        return (
          <ParentDashboard
            onViewReportCard={() => {
              setActiveView('report-card');
            }}
          />
        );
    }
  };

  return (
    <div className="min-h-[100dvh] cyber-canvas text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      <AppHeader
        onToggleSidebar={() => setIsOpenMobile(!isOpenMobile)}
        onNavigate={view => setActiveView(view as any)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <AppSidebar
          activeView={activeView}
          onSelectView={view => setActiveView(view)}
          isOpenMobile={isOpenMobile}
          onCloseMobile={() => setIsOpenMobile(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SchoolDataProvider>
        <AppContent />
      </SchoolDataProvider>
    </AuthProvider>
  );
}
