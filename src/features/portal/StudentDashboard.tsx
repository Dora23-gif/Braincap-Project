import React from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import { FileText } from 'lucide-react';

export const StudentDashboard: React.FC<{ onViewReportCard: (studentId: string) => void }> = ({
  onViewReportCard
}) => {
  const { students, activeTerm } = useSchoolData();
  const { user } = useAuth();

  const currentStudent = students.find(s => s.id === user?.studentId) || students[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="font-serif-title font-bold text-slate-900 text-base">
            STUDENT ACADEMIC DASHBOARD
          </span>
          <div className="text-xs text-slate-500 mt-0.5">
            Welcome back, {currentStudent.firstName}! Terminal records for {activeTerm.name}
          </div>
        </div>

        <button
          onClick={() => onViewReportCard(currentStudent.id)}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer transition-all"
        >
          <FileText className="w-4 h-4" />
          <span>Access Terminal Report Card</span>
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 flex flex-col sm:flex-row items-center gap-6">
        <img
          src={currentStudent.passportPhotoUrl}
          alt=""
          className="w-24 h-28 rounded-2xl object-cover border-2 border-amber-500 shadow-sm"
        />
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 uppercase tracking-wider">
            {currentStudent.currentClassArmName}
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {currentStudent.lastName}, {currentStudent.firstName} {currentStudent.middleName || ''}
          </h2>
          <div className="text-xs font-mono-tabular font-bold text-slate-500">
            Admission No: <span className="text-slate-900 font-extrabold">{currentStudent.admissionNumber}</span> • {currentStudent.house} House
          </div>
        </div>
      </div>
    </div>
  );
};
