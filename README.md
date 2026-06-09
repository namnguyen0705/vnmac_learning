# vnmac_elearning

Repository for the `vnmac_elearning` platform, separated into independent backend and frontend projects.

## Structure

- Backend: `backend/vnmac_elearning.Api`
- Frontend: `frontend/vnmac_elearning.web`
- Solution: `vnmac_elearning.sln`
- .NET SDK pinned in repo: `10.0.101`

## Backend

ASP.NET Core `.NET 10` API for the VNMAC e-learning platform.

### Implemented

- Login by username and password
- JWT access token and refresh token
- CAPTCHA demo for login
- Rate limiting for login
- Course, lesson, quiz, progress, certificate, and analytics models
- SCORM-capable LMS runtime for `SCORM 1.2` and `SCORM 2004`
- Required learning flow: `Video -> Interactive -> Quiz -> Unlock`
- Quiz pass rule: `100 percent`
- Auto certificate issuance after full completion
- Admin APIs for course management, lesson management, question bank, learner list, analytics, and CSV export
- SCORM lesson management inside the same course structure
- LMS player wrapper that exposes `API` and `API_1484_11`
- Swagger UI at `/swagger`
- Normalized relational schema for course assessments and attempt tracking

### Run backend

```bash
dotnet build vnmac_elearning.sln
dotnet run --project backend/vnmac_elearning.Api
```

### Default login

- Default password for seeded and backfilled accounts: `Vnmac@123`
- Sample usernames: `admin`, `content`, `viewer`, `learner01`

### Main endpoints

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/courses`
- `GET /api/learning/learners/{userId}/dashboard`
- `GET /api/learning/learners/{userId}/progress`
- `POST /api/learning/learners/{userId}/lessons/{lessonId}/video-progress`
- `POST /api/learning/learners/{userId}/lessons/{lessonId}/interactive-attempts`
- `POST /api/learning/learners/{userId}/lessons/{lessonId}/scorm/launch`
- `GET /api/learning/learners/{userId}/quizzes/{lessonId}/session`
- `POST /api/learning/learners/{userId}/quizzes/{lessonId}/attempts`
- `GET /api/learning/learners/{userId}/certificate`
- `GET /api/scorm/player/{sessionId}`
- `POST /api/scorm/runtime/{sessionId}/initialize`
- `GET /api/scorm/runtime/{sessionId}/value?element=...`
- `PUT /api/scorm/runtime/{sessionId}/value`
- `POST /api/scorm/runtime/{sessionId}/commit`
- `POST /api/scorm/runtime/{sessionId}/terminate`
- `GET /api/certificates/verify/{certificateId}`
- `GET /api/admin/analytics`

### Database schema

- Detailed schema and ERD: `docs/database-schema.md`
- Current migration that removes legacy lesson and quiz storage: `20260414084742_EnforceRelationalLearningSchema`
- Current migration that adds LMS SCORM runtime tables: `20260429014628_AddScormLmsRuntime`

### SCORM demo content

- `backend/vnmac_elearning.Api/wwwroot/scorm/demo-scorm-12/index.html`
- `backend/vnmac_elearning.Api/wwwroot/scorm/demo-scorm-2004/index.html`

These are sample SCO pages that can be referenced from admin lesson payloads when creating a `Scorm` lesson.

## Frontend

React + TypeScript + Vite application for learner and admin UI.

### Run frontend

```bash
cd frontend/vnmac_elearning.web
npm install
npm run dev
```

### Build frontend

```bash
cd frontend/vnmac_elearning.web
npm run build
```

The Vite dev server proxies `/api` requests to the backend at `http://localhost:5211`.

## Verified

- `dotnet build vnmac_elearning.sln`
- `dotnet ef database update --project backend/vnmac_elearning.Api --startup-project backend/vnmac_elearning.Api --context TrainingDbContext`
- SCORM smoke flow: `launch -> initialize -> set value -> commit -> terminate`
- `cd frontend/vnmac_elearning.web && npm run build`
