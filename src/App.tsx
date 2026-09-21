import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SchoolDataProvider } from './context/SchoolDataContext';
import { LoginGate } from './features/auth/LoginGate';
import { AppHeader } from './components/layout/AppHeader';
import { AppSidebar, ActiveNavView } from './components/layout/AppSidebar';
import { ShieldAlert } from 'lucide-react';
import { ViewLoadingSkeleton } from './components/common/ViewLoadingSkeleton';
import { RootErrorBoundary } from './components/common/RootErrorBoundary';
import { ChangePasswordModal } from './components/common/ChangePasswordModal';

// Admin views (Lazy-loaded on demand)
const SessionsTermsView = React.lazy(() => import('./features/admin/SessionsTermsView').then(m => ({ default: m.SessionsTermsView })));
const ClassesArmsView = React.lazy(() => import('./features/admin/ClassesArmsView').then(m => ({ default: m.ClassesArmsView })));
const SubjectManagementView = React.lazy(() => import('./features/admin/SubjectManagementView').then(m => ({ default: m.SubjectManagementView })));
const SubjectAllocationView = React.lazy(() => import('./features/admin/SubjectAllocationView').then(m => ({ default: m.SubjectAllocationView })));
const UserManagementView = React.lazy(() => import('./features/admin/UserManagementView').then(m => ({ default: m.UserManagementView })));
const AcademicRolloverView = React.lazy(() => import('./features/admin/AcademicRolloverView').then(m => ({ default: m.AcademicRolloverView })));
const AuditLogView = React.lazy(() => import('./features/admin/AuditLogView').then(m => ({ default: m.AuditLogView })));
const SchoolSettingsView = React.lazy(() => import('./features/admin/SchoolSettingsView').then(m => ({ default: m.SchoolSettingsView })));

// Student views (Lazy-loaded on demand)
const StudentDirectoryView = React.lazy(() => import('./features/students/StudentDirectoryView').then(m => ({ default: m.StudentDirectoryView })));
const AdmissionsWizard = React.lazy(() => import('./features/students/AdmissionsWizard').then(m => ({ default: m.AdmissionsWizard })));
const AttendanceRegisterView = React.lazy(() => import('./features/students/AttendanceRegisterView').then(m => ({ default: m.AttendanceRegisterView })));
const PsychomotorRatingView = React.lazy(() => import('./features/students/PsychomotorRatingView').then(m => ({ default: m.PsychomotorRatingView })));

// Grading views (Lazy-loaded on demand)
const ScoreEntryGridView = React.lazy(() => import('./features/grading/ScoreEntryGridView').then(m => ({ default: m.ScoreEntryGridView })));
const BroadsheetView = React.lazy(() => import('./features/grading/BroadsheetView').then(m => ({ default: m.BroadsheetView })));
const PrintableReportCard = React.lazy(() => import('./features/reports/PrintableReportCard').then(m => ({ default: m.PrintableReportCard })));

// Portal views (Lazy-loaded on demand)
const ParentDashboard = React.lazy(() => import('./features/portal/ParentDashboard').then(m => ({ default: m.ParentDashboard })));
const StudentDashboard = React.lazy(() => import('./features/portal/StudentDashboard').then(m => ({ default: m.StudentDashboard })));

// Principal Executive views (Lazy-loaded on demand)
const PrincipalDashboardView = React.lazy(() => import('./features/principal/PrincipalDashboardView').then(m => ({ default: m.PrincipalDashboardView })));
const PrincipalRemarkingView = React.lazy(() => import('./features/principal/PrincipalRemarkingView').then(m => ({ default: m.PrincipalRemarkingView })));
const PrincipalHonorsProbationView = React.lazy(() => import('./features/principal/PrincipalHonorsProbationView').then(m => ({ default: m.PrincipalHonorsProbationView })));

// Vice Principal views (Lazy-loaded on demand)
const VPAcademicsDashboardView = React.lazy(() => import('./features/vice-principal/VPAcademicsDashboardView').then(m => ({ default: m.VPAcademicsDashboardView })));
const VPAdminDashboardView = React.lazy(() => import('./features/vice-principal/VPAdminDashboardView').then(m => ({ default: m.VPAdminDashboardView })));

// Examination Officer views (Lazy-loaded on demand)
const ExamOfficerDashboardView = React.lazy(() => import('./features/exam-officer/ExamOfficerDashboardView').then(m => ({ default: m.ExamOfficerDashboardView })));

// Form Master views (Lazy-loaded on demand)
const FormMasterDashboardView = React.lazy(() => import('./features/form-master/FormMasterDashboardView').then(m => ({ default: m.FormMasterDashboardView })));

// Subject Teacher views (Lazy-loaded on demand)
const SubjectTeacherDashboardView = React.lazy(() => import('./features/teacher/SubjectTeacherDashboardView').then(m => ({ default: m.SubjectTeacherDashboardView })));

// Communications & Directives view (Lazy-loaded on demand)
const CommunicationsHubView = React.lazy(() => import('./features/communications/CommunicationsHubView').then(m => ({ default: m.CommunicationsHubView })));

const ROLE_PERMISSIONS: Record<string, ActiveNavView[]> = {
  SUPER_ADMIN: [
    'user-management', 'academic-rollover', 'audit-log', 'school-settings',
    'sessions-terms', 'classes-arms', 'subject-management', 'subject-allocations', 'student-directory',
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
    'classes-arms', 'subject-management', 'audit-log', 'report-card', 'communications'
  ],
  VICE_PRINCIPAL: [
    'vp-admin-dashboard', 'attendance-register', 'student-directory', 'admissions-wizard',
    'classes-arms', 'subject-management', 'audit-log', 'report-card', 'communications'
  ],
  VICE_PRINCIPAL_STUDENT_AFFAIRS: [
    'vp-admin-dashboard', 'attendance-register', 'student-directory', 'classes-arms',
    'subject-management', 'report-card', 'communications'
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
    'master-broadsheet', 'report-card', 'student-directory', 'score-entry', 'communications'
  ],
  SUBJECT_TEACHER: [
    'teacher-dashboard', 'score-entry', 'master-broadsheet', 'report-card', 'communications'
  ],
  TEACHER: [
    'teacher-dashboard', 'score-entry', 'master-broadsheet', 'report-card', 'communications'
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
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

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

  const [activeView, setActiveView] = useState<ActiveNavView>(() => (user ? getDefaultView(user.activeRole) : 'user-management'));
  const [selectedReportCardStudentId, setSelectedReportCardStudentId] = useState<string>('');
  const [scoreEntryClassArmId, setScoreEntryClassArmId] = useState<string | undefined>(undefined);
  const [scoreEntrySubjectId, setScoreEntrySubjectId] = useState<string | undefined>(undefined);

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
        return (
          <FormMasterDashboardView
            onNavigateView={(view, studentId) => {
              if (studentId) setSelectedReportCardStudentId(studentId);
              setActiveView(view as any);
            }}
          />
        );
      case 'teacher-dashboard':
        return (
          <SubjectTeacherDashboardView
            onNavigateView={view => setActiveView(view as any)}
            onNavigateToScores={(classArmId, subjectId) => {
              setScoreEntryClassArmId(classArmId);
              setScoreEntrySubjectId(subjectId);
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
      case 'subject-management':
        return <SubjectManagementView />;
      case 'subject-allocations':
        return <SubjectAllocationView />;
      case 'student-directory':
        return (
          <StudentDirectoryView
            onSelectStudent={(studentId) => {
              setSelectedReportCardStudentId(studentId);
              setActiveView('report-card');
            }}
            onNavigateToAdmissions={
              user?.activeRole === 'PRINCIPAL' || user?.role === 'PRINCIPAL'
                ? undefined
                : () => setActiveView('admissions-wizard')
            }
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
        return (
          <ScoreEntryGridView
            initialClassArmId={scoreEntryClassArmId}
            initialSubjectId={scoreEntrySubjectId}
          />
        );
      case 'master-broadsheet':
        return <BroadsheetView />;
      case 'attendance-register':
        return <AttendanceRegisterView />;
      case 'psychomotor-matrix':
        return <PsychomotorRatingView />;
      case 'report-card':
        return <PrintableReportCard initialStudentId={selectedReportCardStudentId} />;
      case 'student-portal':
        return user.activeRole === 'STUDENT' ? (
          <StudentDashboard
            onViewReportCard={(studentId) => {
              setSelectedReportCardStudentId(studentId);
              setActiveView('report-card');
            }}
          />
        ) : (
          <ParentDashboard
            onViewReportCard={(studentId) => {
              setSelectedReportCardStudentId(studentId);
              setActiveView('report-card');
            }}
          />
        );
      case 'parent-portal':
        return (
          <ParentDashboard
            onViewReportCard={(studentId) => {
              setSelectedReportCardStudentId(studentId);
              setActiveView('report-card');
            }}
          />
        );
      case 'communications':
        return <CommunicationsHubView />;
      default:
        return (
          <ParentDashboard
            onViewReportCard={(studentId) => {
              setSelectedReportCardStudentId(studentId);
              setActiveView('report-card');
            }}
          />
        );
    }
  };

  return (
    <div className="min-h-screen w-full cyber-canvas text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      <AppHeader
        onToggleSidebar={() => setIsOpenMobile(!isOpenMobile)}
        onNavigate={view => setActiveView(view as any)}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
      />

      <div className="flex-1 flex flex-row w-full min-w-0 items-start">
        <AppSidebar
          activeView={activeView}
          onSelectView={view => setActiveView(view)}
          isOpenMobile={isOpenMobile}
          onCloseMobile={() => setIsOpenMobile(false)}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        />

        <main className="flex-1 min-w-0 p-4 sm:p-5 md:p-6 lg:p-6 xl:p-8">
          <React.Suspense fallback={<ViewLoadingSkeleton />}>
            {renderActiveView()}
          </React.Suspense>
        </main>
      </div>

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <RootErrorBoundary>
      <AuthProvider>
        <SchoolDataProvider>
          <AppContent />
        </SchoolDataProvider>
      </AuthProvider>
    </RootErrorBoundary>
  );
}
