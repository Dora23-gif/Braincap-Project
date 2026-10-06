# SCHOOL MANAGEMENT SYSTEM
## Comprehensive Backend Engineering, Architecture & Deployment Documentary

An exhaustive reference manual covering end-to-end development, domain modeling, RESTful API design, database schemas, RBAC security, and production deployment.

---

## 1. Executive Summary & Architecture Overview

The backend of the School Portal is engineered as an enterprise-grade, decoupled RESTful API built on Python and Django REST Framework (DRF). It is architected specifically to handle institutional governance, complex Nigerian academic grading conventions (Continuous Assessment + Exam breakdowns, Master Broadsheets, Psychomotor/Affective evaluations, Class Arm allocations), role-based access control (RBAC) across multiple institutional tiers, and audit-proof score certification.

### Core Architectural Principles:
* **Modular Domain-Driven Design:** A modular Django apps directory under `backend/apps/` segregating concerns cleanly across distinct institutional domains.
* **Hierarchical RBAC Security:** Granular access control allowing Super Admins, Principals, Vice Principals, Exam Officers, Form Masters, Subject Teachers, Parents, and Students to access only authorized datasets.
* **Academic Rigor & Audit Trails:** Deterministic grade aggregation, GPA computation, subject ranking, class position calculations, and broadsheet lock/seal states.
* **Dual-Engine Database Layer:** Support for both SQLite (for local rapid execution) and PostgreSQL (for scalable cloud deployments with ACID guarantees).

---

## 2. Project Directory & Workspace Layout

The project follows a clean separation of concerns, keeping all backend server logic contained in a standalone directory with zero pollution of frontend client assets.

```text
backend/
├── manage.py                          # Django management script
├── requirements.txt                   # Production Python dependencies
├── config/                            # Core Django project configuration
│   ├── __init__.py
│   ├── settings.py                    # Environment-aware settings, CORS, DRF, JWT
│   ├── urls.py                        # Master API root routing (/api/v1/...)
│   ├── wsgi.py                        # WSGI entrypoint for production servers (Gunicorn)
│   └── asgi.py                        # ASGI entrypoint for async capabilities
└── apps/                              # Domain-specific applications
    ├── accounts/                      # Identity, Custom User, Staff/Parent/Student profiles, Auth
    ├── academics/                     # Sessions, Terms, Classes, Arms, Subjects, Allocations
    ├── students/                      # Student registry, Attendance, Psychomotor, Exeats, Discipline
    ├── grading/                       # CA/Exam scores, Broadsheets, Grade scales, Audit overrides
    └── governance/                    # School identity/settings, Audit logging, Communications
```

---

## 3. Domain Applications, Models & Database Schemas

### 3.1 `accounts` App (Identity & Authentication)
The accounts application handles authentication, multi-role staff assignments, PIN-based portal access, and institutional profile management.
* **`CustomUser` (`AbstractUser`):** Custom user model inheriting `AbstractUser`, using email/username for authentication and maintaining an `active_role` plus a `roles` list for staff who hold multiple concurrent responsibilities (e.g., Subject Teacher + Form Master).
* **`StaffProfile`:** Links directly to `CustomUser` for administrative & teaching personnel, tracking staff ID, qualifications, employment date, phone, address, and biometric photos.
* **`ParentProfile`:** Contains guardian metadata, emergency contact numbers, occupation, and Many-to-Many ward relationships to linked students.

### 3.2 `academics` App (Academic Structure & Allocations)
This app models the entire academic calendar, class structure, and teacher distribution:
* **`AcademicSession`:** Represents a full school year (e.g. 2025/2026) with `is_active` flag and start/end dates.
* **`Term`:** Term divisions (First Term, Second Term, Third Term) with opening/closing dates and active status.
* **`ClassLevel`:** High-level educational tiers (JSS 1, JSS 2, JSS 3, SSS 1, SSS 2, SSS 3).
* **`ClassArm`:** Physical cohorts within a class level (e.g., JSS 1 Gold, SSS 2 Science A) with assigned Form Master.
* **`Subject`:** Subject catalog with subject codes (e.g. MTH101, ENG101), category (Core, Elective, Vocational), and grade level relevance.
* **`SubjectAllocation`:** Links a Teacher to a specific Subject and Class Arm for a given academic term/session.

### 3.3 `students` App (Student Lifecycle & Pastoral Care)
Tracks the entire student journey from admission to graduation:
* **`Student`:** Unique admission number (e.g. EIS/2026/001), full bio data, passport photo, current class arm, guardian relationship, boarding/day status, and active status.
* **`DailyAttendance`:** Day-by-day morning roll call (Present, Absent, Late, Excused) recorded per class arm by the Form Master.
* **`AffectivePsychomotor`:** 5-point Likert behavioral assessments covering Affective traits (Punctuality, Neatness, Politeness) and Psychomotor skills (Handwriting, Sports, Crafts).
* **`DisciplinaryIncident`:** Disciplinary infractions (Uniform, Truancy, Bullying) with severity levels, demerits, and sanction logs.
* **`CampusExeat`:** Digital gate passes for boarders/day students leaving campus, with departure/return timestamps and Vice-Principal approval.

### 3.4 `grading` App (Examinations, Broadsheets & Audit Overrides)
The computational heart of the school portal:
* **`ScoreEntry`:** Continuous Assessment breakdown (CA1, CA2, CA3 / Mid-Term) + Exam score, calculated total (0–100), automated letter grade (A1–F9), and pass/fail remarks.
* **`GradeScale`:** Institutional grade definitions (A1: 75–100, B2: 70–74, B3: 65–69, C4: 60–64, etc.) with grade points and official remark texts.
* **`BroadsheetSeal`:** Cryptographic lock & seal records stamped by Exam Officer and Principal to permanently freeze marksheet editing prior to report card generation.
* **`ScoreAuditTrail`:** Immutable ledger capturing every score alteration made after initial submission, recording old score, new score, timestamp, modifier user, and mandatory reason.

---

## 4. REST API Endpoints & DRF Architecture

The API is built using Django REST Framework `ModelViewSet`s, Routers, and custom `APIView`s.

| Endpoint URL | HTTP Method | Handler / ViewSet | Authorized Roles |
| :--- | :--- | :--- | :--- |
| `/api/v1/accounts/auth/login/` | `POST` | `CustomAuthTokenView` | Public / All Users |
| `/api/v1/accounts/users/` | `GET`, `POST` | `UserViewSet` | Super Admin, Principal |
| `/api/v1/accounts/staff/` | `GET`, `PUT` | `StaffProfileViewSet` | Super Admin, Principal, VP |
| `/api/v1/academics/sessions/` | `GET`, `POST` | `AcademicSessionViewSet` | Admin, Principal, Exam Officer |
| `/api/v1/academics/class-arms/` | `GET`, `POST` | `ClassArmViewSet` | Admin, Principal, VP, Form Master |
| `/api/v1/academics/subjects/` | `GET`, `POST` | `SubjectViewSet` | Admin, Principal, VP |
| `/api/v1/academics/allocations/` | `GET`, `POST` | `SubjectAllocationViewSet` | Admin, Principal, VP |
| `/api/v1/students/` | `GET`, `POST` | `StudentViewSet` | Admin, Principal, VP, Teachers |
| `/api/v1/students/attendance/bulk/` | `POST` | `DailyAttendanceViewSet` | Form Master, VP, Admin |
| `/api/v1/students/psychomotor/` | `GET`, `POST` | `AffectivePsychomotorViewSet` | Form Master, VP, Admin |
| `/api/v1/grading/scores/` | `GET`, `POST` | `ScoreEntryViewSet` | Teachers, Exam Officer, Admin |
| `/api/v1/grading/broadsheet/` | `GET` | `MasterBroadsheetView` | Exam Officer, Principal, VP, Form Master |
| `/api/v1/grading/scores/override/` | `POST` | `ScoreOverrideView` | Exam Officer, Principal |
| `/api/v1/grading/broadsheet/seal/` | `POST` | `BroadsheetSealView` | Exam Officer, Principal |
| `/api/v1/governance/settings/` | `GET`, `PUT` | `SchoolSettingsView` | Super Admin, Principal |
| `/api/v1/governance/audit-logs/` | `GET` | `AuditLogViewSet` | Super Admin, Principal |

---

## 5. Authentication, Permissions & Security (RBAC)

Security is enforced at multiple layers to ensure complete institutional compliance:
* **JWT Token Authentication:** Stateless JSON Web Tokens with short-lived access tokens and sliding refresh tokens. Supports instant password changes and PIN-based quick authentication.
* **Granular Permission Classes:** Custom DRF permission classes (`IsPrincipalOrAdmin`, `IsExamOfficerOrPrincipal`, `IsTeacherOrAdmin`, `IsFormMaster`, `ParentAccessOnly`) prevent privilege escalation.
* **Score Lockdown Engine:** Score tables enforce locking states; once marked locked or sealed, direct modifications via API are rejected unless executed through the privileged Score Override endpoint with audit logging.
* **Tenant & Ward Isolation:** Endpoints automatically filter QuerySets so that Parents can only see their own wards, Subject Teachers see only their assigned classes, and Form Masters see only their registered class arm.

---

## 6. Data Seeding & Management Commands

Custom Django management commands were developed to populate realistic, high-fidelity institutional datasets for immediate testing and staging:
* **`seed_essential` (`backend/apps/accounts/management/commands/`):** Creates the baseline institutional structure: Super Administrator, Principal, Vice-Principal, Exam Officer, Class Levels (JSS 1 to SSS 3), Class Arms (Gold, Silver, Science, Arts), and the standard Nigerian curriculum subjects.
* **`seed_school_data` (`backend/apps/academics/management/commands/`):** Populates over 100 realistic student records, complete CA1/CA2/CA3/Exam scores across all subjects, attendance histories, disciplinary logs, and psychomotor evaluations.

---

## 7. Production Deployment & DevOps Architecture

The backend is production-ready for deployment to modern containerized or PaaS cloud providers (e.g. Render, Railway, DigitalOcean, AWS, Heroku):

### Step 1: Production Settings & Environment Variables
Ensure `.env` contains the following production variables:
```env
SECRET_KEY=your-secure-random-production-secret-key
DEBUG=False
ALLOWED_HOSTS=schoolportal-api.yourdomain.com,localhost
DATABASE_URL=postgresql://db_user:password@db-host.internal:5432/school_portal_db
CORS_ALLOWED_ORIGINS=https://schoolportal.yourdomain.com
JWT_SECRET_KEY=your-secure-jwt-signing-secret
```

### Step 2: Static Files & Database Migrations
Run the automated migration and static collection commands during deployment:
```bash
# 1. Apply schema migrations
python manage.py migrate

# 2. Seed initial essential accounts & subjects (if fresh database)
python manage.py seed_essential

# 3. Collect static files for WhiteNoise
python manage.py collectstatic --noinput
```

### Step 3: WSGI Server Execution with Gunicorn
Execute Gunicorn with worker threads and connection timeout limits:
```bash
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3 --threads 2 --timeout 60
```

---

## 8. Conclusion & Maintenance Protocol

The backend architecture delivers high cohesion, loose coupling, and strict compliance with Nigerian and international academic standards. As new features (e.g., Online Fee Payments via Paystack/Flutterwave, Automated SMS/WhatsApp Alerts, Computer-Based Testing) are introduced, they can be plugged in as modular apps inside `backend/apps/` without disrupting existing core workflows.
