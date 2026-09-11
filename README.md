# Everest School Management System (Braincap Project)

A production-grade, multi-role School Management and Academic Operations System engineered for Nigerian secondary and primary educational institutions.

Built with **React 19**, **TypeScript**, **Tailwind CSS v4**, and **Vite**.

---

## 🌟 Key Capabilities & Architectural Features

### 1. Role-Based Access Control (RBAC) & Purview Isolation
- **13 Institutional Roles**: Super Administrator, Principal, Vice Principal Academics, Vice Principal Administration, Exam Officer, Form Master, Subject Teacher, Bursar, Librarian, Guidance Counselor, House Master, Admissions Officer, and Parent.
- **Strict Subject Purview**: Subject Teachers can only enter marks and access rosters for their allocated subjects and class arms.
- **Custodial Homeroom Arm Isolation**: Form Masters are locked to their assigned pastoral arm for attendance, psychomotor ratings, and terminal broadsheets.
- **Dual-Role Switching**: Seamlessly switch between active roles (e.g. Subject Teacher and Form Master) while maintaining strict jurisdictional boundaries.
- **Parent-Only Ward Dossiers**: Parents securely view grades, attendance, and fee status for their verified wards only. Students access records through their parents' portal.

### 2. Comprehensive Academic & Examination Operations
- **Continuous Assessment & Grading Engine**: 40% CA (CA1: 10, CA2: 10, Assignment: 10, Project: 10) and 60% Exam with instant WAEC grading scales (A1-F9) and automatic GPA calculations.
- **Master Broadsheets & Score Collation**: High-density collation sheets with sticky student identifiers, aggregate computations, ranking, and export tools.
- **Academic Promotion Matrix & Rollover**: End-of-year promotion evaluations supporting promoted, repeat, and promoted-on-trial statuses with custom discretionary workflows.
- **Official Print-Ready Report Cards**: Clean `@media print` reports with bursary clearance safeguards, cognitive domains, affective traits, and principal's remarks.

### 3. Student Lifecycle & Admissions Management
- **Admissions Wizard**: Multi-step student onboarding covering biodata, Nigerian LGA/State geography, photo studio capture, and class arm assignment.
- **Daily Attendance Register**: Homeroom roll call tracking present, absent, excused, and late statuses.
- **Psychomotor & Behavioral Assessments**: 10-trait evaluation matrix (punctuality, neatness, leadership, attentiveness, politeness, etc.).
- **Campus Exeat & Gate Passes**: Digital gate passes with departure tracking, approvals, and QR-ready verification.

### 4. Enterprise Governance & Auditing
- **Forensic Audit Trails**: Immutable system event logging capturing actor IDs, timestamps, and field-level diffs.
- **Subject Allocation Matrix**: Institutional assignment of teachers to subjects and class cohorts.
- **Native Dialogue Elimination**: Modern in-app modals and toast banners throughout—zero blocking browser dialogues.
- **Full Dark Mode / Cyber Aesthetic**: High-contrast, accessibility-audited dark and light themes.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4 + PostCSS
- **Build Tool**: Vite 8 with HMR
- **Icons**: Lucide React
- **Spreadsheet Processing**: SheetJS (XLSX)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/earthraider63-eng/Braincap-Project.git
cd Braincap-Project

# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

---

## 🔒 Security & Governance
- Role permissions are validated across client routes and component view shields.
- Access to grades and dossiers is gated by bursary payment clearance and academic publication status.
- Zero mock student logins—all student progress is monitored via verified parent authentication credentials.
