import * as XLSX from 'xlsx';
import type { SubjectScore } from '../types';

export interface ExcelScoreRow {
  admissionNumber: string;
  studentName: string;
  ca1: number;
  ca2: number;
  assignment: number;
  project: number;
  exam: number;
}

export interface ParseExcelResult {
  scores: ExcelScoreRow[];
  errors: string[];
}

/**
 * Generates an Excel (.xlsx) file with pre-populated student roster
 */
export function exportMarkSheetTemplate(
  classArmName: string,
  subjectName: string,
  termName: string,
  students: { admissionNumber: string; fullName: string; currentScore?: SubjectScore }[]
) {
  const headers = [
    'Admission Number',
    'Student Full Name',
    'CA 1 [Max 10]',
    'CA 2 [Max 10]',
    'Assignment [Max 10]',
    'Project [Max 10]',
    'Exam [Max 60]',
    'Total [Max 100]',
    'Grade'
  ];

  const rows = students.map(s => {
    const score = s.currentScore;
    return [
      s.admissionNumber,
      s.fullName,
      score ? score.ca1 : '',
      score ? score.ca2 : '',
      score ? score.assignment : '',
      score ? score.project : '',
      score ? score.exam : '',
      score ? score.total : '',
      score ? score.grade : ''
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([
    [`EVEREST INTERNATIONAL SCHOOLS - OFFICIAL MARK SHEET`],
    [`Class: ${classArmName} | Subject: ${subjectName} | Term: ${termName}`],
    [],
    headers,
    ...rows
  ]);

  // Set column widths for readability
  ws['!cols'] = [
    { wch: 20 }, // Admission Number
    { wch: 30 }, // Full Name
    { wch: 15 }, // CA 1
    { wch: 15 }, // CA 2
    { wch: 18 }, // Assignment
    { wch: 15 }, // Project
    { wch: 15 }, // Exam
    { wch: 15 }, // Total
    { wch: 10 }  // Grade
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Scores');

  const sanitizedClass = classArmName.replace(/\s+/g, '_');
  const sanitizedSubject = subjectName.replace(/\s+/g, '_');
  const fileName = `${sanitizedClass}_${sanitizedSubject}_MarkSheet.xlsx`;

  XLSX.writeFile(wb, fileName);
}

/**
 * Parses an uploaded .xlsx file and validates score bounds
 */
export async function parseMarkSheetFile(file: File): Promise<ParseExcelResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        const worksheet = wb.Sheets[firstSheetName];
        
        // Convert sheet to array of arrays
        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Search for header row containing 'Admission Number'
        let headerRowIndex = -1;
        for (let r = 0; r < rawData.length; r++) {
          const row = rawData[r];
          if (row && row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('admission number'))) {
            headerRowIndex = r;
            break;
          }
        }

        if (headerRowIndex === -1) {
          resolve({
            scores: [],
            errors: ['Could not find valid header row. Please make sure to use the official Everest Mark Sheet template.']
          });
          return;
        }

        const dataRows = rawData.slice(headerRowIndex + 1);
        const parsedScores: ExcelScoreRow[] = [];
        const errors: string[] = [];

        dataRows.forEach((row, idx) => {
          if (!row || row.length < 2 || !row[0]) return; // Skip empty rows

          const admissionNumber = String(row[0]).trim();
          const studentName = String(row[1] || '').trim();

          const ca1 = parseFloat(row[2]) || 0;
          const ca2 = parseFloat(row[3]) || 0;
          const assignment = parseFloat(row[4]) || 0;
          const project = parseFloat(row[5]) || 0;
          const exam = parseFloat(row[6]) || 0;

          const rowNum = headerRowIndex + 2 + idx;

          // Validate constraints
          if (ca1 < 0 || ca1 > 10) {
            errors.push(`Row ${rowNum} (${studentName}): CA 1 is ${ca1}, but max is 10.`);
          }
          if (ca2 < 0 || ca2 > 10) {
            errors.push(`Row ${rowNum} (${studentName}): CA 2 is ${ca2}, but max is 10.`);
          }
          if (assignment < 0 || assignment > 10) {
            errors.push(`Row ${rowNum} (${studentName}): Assignment is ${assignment}, but max is 10.`);
          }
          if (project < 0 || project > 10) {
            errors.push(`Row ${rowNum} (${studentName}): Project is ${project}, but max is 10.`);
          }
          if (exam < 0 || exam > 60) {
            errors.push(`Row ${rowNum} (${studentName}): Exam is ${exam}, but max is 60.`);
          }

          parsedScores.push({
            admissionNumber,
            studentName,
            ca1: Math.min(Math.max(ca1, 0), 10),
            ca2: Math.min(Math.max(ca2, 0), 10),
            assignment: Math.min(Math.max(assignment, 0), 10),
            project: Math.min(Math.max(project, 0), 10),
            exam: Math.min(Math.max(exam, 0), 60)
          });
        });

        resolve({ scores: parsedScores, errors });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = error => reject(error);
    reader.readAsArrayBuffer(file);
  });
}
