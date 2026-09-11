import React, { useState, useEffect } from 'react';
import { SubjectScore } from '../../types';
import { computeSubjectTotal, evaluateGrade } from '../../lib/gradeCalculator';
import {
  SlidersHorizontal,
  X,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  FileText,
  ArrowRight
} from 'lucide-react';
import { ModalPortal } from '../../components/common/ModalPortal';

interface ScoreOverrideModalProps {
  isOpen: boolean;
  scoreRecord: SubjectScore | null;
  studentName: string;
  admissionNumber: string;
  subjectName: string;
  onClose: () => void;
  onSave: (
    newScores: {
      ca1: number;
      ca2: number;
      assignment: number;
      project: number;
      exam: number;
    },
    reason: string,
    ticketId: string
  ) => void;
}

export const ScoreOverrideModal: React.FC<ScoreOverrideModalProps> = ({
  isOpen,
  scoreRecord,
  studentName,
  admissionNumber,
  subjectName,
  onClose,
  onSave
}) => {
  if (!isOpen || !scoreRecord) return null;

  const [ca1, setCa1] = useState<number>(scoreRecord.ca1);
  const [ca2, setCa2] = useState<number>(scoreRecord.ca2);
  const [assignment, setAssignment] = useState<number>(scoreRecord.assignment);
  const [project, setProject] = useState<number>(scoreRecord.project);
  const [exam, setExam] = useState<number>(scoreRecord.exam);

  const [ticketId, setTicketId] = useState<string>(
    scoreRecord.overrideTicketId || `EIS-TKT-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [reason, setReason] = useState<string>(scoreRecord.overrideReason || '');
  const [errorWarning, setErrorWarning] = useState<string | null>(null);

  useEffect(() => {
    if (scoreRecord) {
      setCa1(scoreRecord.ca1);
      setCa2(scoreRecord.ca2);
      setAssignment(scoreRecord.assignment);
      setProject(scoreRecord.project);
      setExam(scoreRecord.exam);
      setTicketId(scoreRecord.overrideTicketId || `EIS-TKT-${Math.floor(1000 + Math.random() * 9000)}`);
      setReason(scoreRecord.overrideReason || '');
    }
  }, [scoreRecord]);

  const newTotal = computeSubjectTotal(ca1, ca2, assignment, project, exam);
  const { grade: newGrade, remark: newRemark } = evaluateGrade(newTotal);

  const prevTotal = scoreRecord.total;
  const { grade: prevGrade } = evaluateGrade(prevTotal);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId.trim()) {
      setErrorWarning('Mandatory authorization ticket number or board reference is required.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 10) {
      setErrorWarning('Please provide an official audit justification of at least 10 characters.');
      return;
    }

    onSave(
      { ca1, ca2, assignment, project, exam },
      reason.trim(),
      ticketId.trim().toUpperCase()
    );
    onClose();
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800 shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif-title font-bold text-slate-900 dark:text-slate-100 text-base leading-tight">
                Administrative Score Override Protocol
              </h3>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular">
                {subjectName} • {studentName} ({admissionNumber})
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audit Warning Banner */}
        <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold block">Super Administrator High-Integrity Protocol</span>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              This score sheet is locked. Overriding marks bypasses standard departmental moderation and will brand this record with an immutable <strong>[OV]</strong> badge in all student dossiers and generate an audit log entry.
            </p>
          </div>
        </div>

        {errorWarning && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorWarning}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Assessment Inputs Grid */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">
              Continuous Assessment &amp; Examination Breakdown
            </label>
            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">CA 1 (10)</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={ca1}
                  onChange={e => setCa1(Math.min(10, Math.max(0, Number(e.target.value))))}
                  className="w-full p-2 text-center font-mono-tabular font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">CA 2 (10)</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={ca2}
                  onChange={e => setCa2(Math.min(10, Math.max(0, Number(e.target.value))))}
                  className="w-full p-2 text-center font-mono-tabular font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">Assg (10)</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={assignment}
                  onChange={e => setAssignment(Math.min(10, Math.max(0, Number(e.target.value))))}
                  className="w-full p-2 text-center font-mono-tabular font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">Proj (10)</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={project}
                  onChange={e => setProject(Math.min(10, Math.max(0, Number(e.target.value))))}
                  className="w-full p-2 text-center font-mono-tabular font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">Exam (60)</span>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={exam}
                  onChange={e => setExam(Math.min(60, Math.max(0, Number(e.target.value))))}
                  className="w-full p-2 text-center font-mono-tabular font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Before / After Preview Card */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Previous Score</span>
              <div className="font-mono-tabular font-bold text-slate-600 dark:text-slate-300 text-sm">
                {prevTotal}/100 <span className="text-xs font-semibold">({prevGrade})</span>
              </div>
            </div>

            <ArrowRight className="w-5 h-5 text-indigo-500 dark:text-indigo-400 shrink-0" />

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Adjusted Score</span>
              <div className="font-mono-tabular font-bold text-emerald-700 dark:text-emerald-300 text-base">
                {newTotal}/100 <span className="text-xs font-bold">({newGrade} - {newRemark})</span>
              </div>
            </div>
          </div>

          {/* Mandatory Ticket ID & Reason */}
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Authorization Ticket / Minute Reference *</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Internal Helpdesk / Audit Ref</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. EIS-TKT-2026-081"
                value={ticketId}
                onChange={e => setTicketId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono-tabular font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Official Justification for Score Override *</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Min 10 characters</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Examination script remarking requested by Head of Science. Transposition error of 12 marks in CA2 verified against paper script."
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs cursor-pointer"
            >
              Apply Score Override
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
