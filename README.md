# TaskFlow — Task Management System

A full-stack task management application:

- **Frontend** — Angular 20 (standalone components, signals, typed reactive forms)
- **Backend** — .NET 6 Web API following Clean Architecture + Repository/UnitOfWork
- **Database** — MS SQL Server (single importable script with schema + seed data)
- **Auth** — JWT bearer tokens with Admin/User roles

## Repository layout

```
TASK_MANAGEMENT_SYSTEM/
├── database/
│   └── TaskManagerDb.sql        # creates the DB, schema and seed data (idempotent)
├── backend/
│   ├── TaskManager.sln
│   └── src/
│       ├── TaskManager.Domain          # entities, enums, repository interfaces
│       ├── TaskManager.Application     # DTOs, services, validation
│       ├── TaskManager.Infrastructure  # EF Core, repositories, JWT, file storage
│       └── TaskManager.API             # controllers, middleware, Swagger
└── frontend/
    └── src/app/                 # shell, auth, dashboard, tasks, projects, profile, users
```

## Prerequisites

| Tool              | Version                                   |
| ----------------- | ----------------------------------------- |
| .NET SDK          | 6.0                                       |
| Node.js           | 20.19+ or 22.12+ (24.x works)             |
| MS SQL Server     | 2016+ (Express / Developer / LocalDB)     |

## 1. Import the database

The script creates the `TaskManagerDb` database, all tables, indexes and seed data.
It is idempotent — safe to run more than once, and it never drops existing data.

**Option A — SSMS:** open `database/TaskManagerDb.sql` and press **Execute (F5)**.

**Option B — sqlcmd:**

```bash
sqlcmd -S localhost -E -i database/TaskManagerDb.sql
```

**Option C — PowerShell:**

```powershell
Invoke-Sqlcmd -InputFile database/TaskManagerDb.sql -ServerInstance localhost
```

The default connection string in `backend/src/TaskManager.API/appsettings.json` targets a
default local instance:

```
Server=localhost;Database=TaskManagerDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true
```

For a named instance (e.g. SQL Express) change `Server=localhost` to `Server=.\SQLEXPRESS`.
SQL authentication also works: `Server=localhost;Database=TaskManagerDb;User Id=sa;Password=...;TrustServerCertificate=True`.

## 2. Run the backend

```bash
cd backend/src/TaskManager.API
dotnet run
```

- API base URL: `http://localhost:5000/api`
- Swagger UI (Development): `http://localhost:5000/swagger` — use **Authorize** with a bearer token
- Uploaded attachments are stored under `backend/src/TaskManager.API/App_Data/Attachments`

## 3. Run the frontend

```bash
cd frontend
npm install
npm start
```

- App: `http://localhost:4200` (dev server proxies nothing — it calls the API directly via
  `apiUrl` in `src/environments/environment.development.ts`, default `http://localhost:5000/api`)

## Demo accounts

The seed data ships with one administrator and three regular users:

| Role  | Email                     | Password   |
| ----- | ------------------------- | ---------- |
| Admin | admin@taskmanager.local   | `Admin@123` |
| User  | sarah@taskmanager.local   | `User@123`  |
| User  | james@taskmanager.local   | `User@123`  |
| User  | priya@taskmanager.local   | `User@123`  |

The login page has **Use** buttons for the admin and user accounts that prefill the form.

## Features

- **Dashboard** — totals, completion rate, overdue/due-today counts, breakdowns by status and
  priority, a 14-day completion chart and upcoming tasks.
- **Tasks** — search, filter (status, priority, project, assignee, overdue), sort, paginate;
  create/edit dialogs, inline status switching, due-date handling and assignee tracking.
- **Projects** — colour-coded project cards with owner, task counts, archive/restore and delete.
- **Comments** — per-task discussion with author/admin moderation.
- **Attachments** — upload/download/delete files per task (10 MB limit, extension allow-list).
- **Users (admin)** — promote/demote roles and enable/disable accounts.
- **Profile** — update your details, change your password, see your task numbers.

## Building for production

```bash
# Backend
cd backend/src/TaskManager.API
dotnet publish -c Release -o out

# Frontend (bundles to frontend/dist)
cd frontend
npm run build
```
