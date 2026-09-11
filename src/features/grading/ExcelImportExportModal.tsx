import React, { useState } from 'react';
import { exportMarkSheetTemplate, parseMarkSheetFile, type ExcelScoreRow } from '../../lib/excelEngine';
import type { SubjectScore, Student } from '../../types';
import { Download, Upload, X, FileSpreadsheet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ModalPortal } from '../../components/common/ModalPortal';

interface ExcelImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  classArmName: string;
  classArmId: string;
  subjectName: string;
  subjectId: string;
  termName: string;
  students: Student[];
  currentScores: SubjectScore[];
  onImportSuccess: (scores: ExcelScoreRow[]) => void;
}

export const ExcelImportExportModal: React.FC<ExcelImportExportModalProps> = ({
  isOpen,
  onClose,
  classArmName,
  classArmId: _classArmId,
  subjectName,
  subjectId: _subjectId,
  termName,
  students,
  currentScores,
  onImportSuccess
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<ExcelScoreRow[] | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    const studentData = students.map(s => ({
      admissionNumber: s.admissionNumber,
      fullName: `${s.lastName}, ${s.firstName} ${s.middleName || ''}`.trim(),
      currentScore: currentScores.find(sc => sc.studentId === s.id)
    }));

    exportMarkSheetTemplate(classArmName, subjectName, termName, studentData);
  };

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    setValidationErrors([]);
    setParsedData(null);

    try {
      const result = await parseMarkSheetFile(file);
      setParsedData(result.scores);
      setValidationErrors(result.errors);
    } catch (err: any) {
      setValidationErrors(['Failed to read file. Please ensure it is a valid .xlsx spreadsheet.']);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyImport = () => {
    if (parsedData && parsedData.length > 0) {
      onImportSuccess(parsedData);
      onClose();
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center text-amber-700 dark:text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Offline Excel Mark Sheet Round-Trip</h2>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {classArmName} • {subjectName} ({termName})
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Section A: Export */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">1. Download Roster Template</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Generates a pre-filled Excel spreadsheet with all enrolled students in {classArmName}. Fill marks offline at home.
              </div>
            </div>
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              <span>Download (.xlsx)</span>
            </button>
          </div>

          {/* Section B: Import Dropzone */}
          <div>
            <div className="text-xs font-bold text-slate-900 mb-2">2. Upload Completed Mark Sheet</div>
            <label
              onDragOver={e => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={e => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFile(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                dragActive ? 'border-amber-500 bg-amber-50/40' : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={e => e.target.files && e.target.files[0] && handleFile(e.target.files[0])}
              />
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-2">
                <Upload className="w-5 h-5 text-slate-600" />
              </div>
              <div className="text-xs font-semibold text-slate-800">
                Click to browse or drag and drop your completed spreadsheet
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Accepts Microsoft Excel (.xlsx)</div>
            </label>
          </div>

          {/* Validation Warnings */}
          {validationErrors.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Validation Notices ({validationErrors.length})</span>
              </div>
              <ul className="text-xs text-amber-800 list-disc list-inside space-y-0.5 max-h-28 overflow-y-auto">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Parsed Preview */}
          {parsedData && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Successfully read {parsedData.length} student mark rows</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Ready to Sync
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyImport}
            disabled={!parsedData || parsedData.length === 0 || isProcessing}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              parsedData && parsedData.length > 0 && !isProcessing
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm cursor-pointer'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            Apply & Save to Portal
          </button>
        </div>
      </div>
    </ModalPortal>
  );
};
