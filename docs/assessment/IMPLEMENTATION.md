# Assessment Engine — Implementation Report

**Status:** Shipped (backend runtime-verified, frontend build-verified)
**Date:** 2026-08-12
**Scope:** Complete assessment lifecycle on the existing LMS monorepo (`server/` Express+TS+Prisma v7, `web/` React+Vite+Tailwind).

## 1. Architecture

Clean-Architecture module with explicit DI wiring, mirroring the existing `auth` module pattern:

```
server/src/modules/assessment/
├── index.ts                          # buildAssessmentModule(prisma) DI factory
├── controllers/assessment.controller.ts
├── routes/assessment.routes.ts       # 41 route handlers
├── validators/assessment.validator.ts
├── services/
│   ├── question-bank.service.ts
│   ├── assessment.service.ts
│   ├── attempt.service.ts
│   ├── review.service.ts
│   ├── analytics.service.ts
│   └── audit.logger.ts
├── repositories/
│   ├── question-bank.repository.ts
│   ├── assessment.repository.ts
│   └── attempt.repository.ts
├── engines/grading.engine.ts
└── dtos/assessment.dto.ts
```

- Mounted at `app.use('/api/assessment', requireAuth, assessmentRoutes)` in `server/src/main.ts:135`.
- Per-route role guards inside the router: `requireStaff` (teacher/admin/super_admin) and `requireStudent` (student with a `StudentProfile`).
- `req.user` shape: `{ userId, tenantId, sessionId, roleSlug, teacherId?, studentId? }`.

## 2. Backend build status

- Module strict typecheck via `npx tsc -p tsconfig.check.json` — **clean, exit 0**.
- Runtime end-to-end verified with cookie-jar curl flows (login → CRUD → attempt → submit → grade → analytics). See each section below.
- Full-server typecheck has pre-existing errors **unrelated** to this module (monolith `main.ts`, `env.ts`, `auth`) — not introduced by the assessment engine.

## 3. Domain flows implemented

### Question Bank (staff)
- Category CRUD (hierarchical via `parentId`, slug-unique per tenant).
- Tag create/list/delete.
- Question CRUD with 19 supported types, difficulty, Bloom level, points, negative marking, options, canonical answer, explanation.
- Duplicate, status transitions (DRAFT/PUBLISHED/ARCHIVED), version history + restore, JSON export/import.

### Assessment (staff)
- CRUD with scheduling (`openDate`/`closeDate`), duration, attempt limit, passing score, visibility, shuffling, feedback policy.
- Attach/detach questions (points per ref), pool rules (random-by-category/tag/difficulty/etc.), status workflow, analytics + results, bulk grading.

### Attempt (student)
- Start (validates window/status/attempt-limit, auto-resumes active attempt), resume, save answer, submit.
- Objective questions auto-graded on save; subjective routed to pending Review on submit.
- Final scoring: rawScore/totalPoints/percentage/grade/passed recomputed on submit.

### Review (teacher)
- Pending list, per-attempt detail with student response, single grade, bulk grade, score cap validation, attempt score + result recomputation after grading.

### Analytics
- Cached metrics (participants, submitted, avg/median/highest/lowest, std-dev, pass rate, score histogram, per-question stats) + manual refresh.

## 4. Frontend build status

| Page | File | Role | Status |
|------|------|------|--------|
| QuestionBank | `web/src/pages/assessment/QuestionBank.tsx` | staff | done |
| AssessmentBuilder | `web/src/pages/assessment/AssessmentBuilder.tsx` | staff | done |
| Review | `web/src/pages/assessment/Review.tsx` | staff | done |
| Analytics | `web/src/pages/assessment/Analytics.tsx` | staff | done |
| AttemptPlayer | `web/src/pages/assessment/AttemptPlayer.tsx` | student | done |

- Routes wired in `web/src/App.tsx`: `/dashboard/assessment/{questions,builder,review,analytics,analytics/:id,attempts}`.
- Sidebar links added in `web/src/components/DashboardLayout.tsx` for admin/teacher (staff menu) and student (Ujian Saya).
- API client: `web/src/lib/axios.ts` (`withCredentials: true`, 401 → `/login`), plus `web/src/lib/assessment.ts`.
- `npx tsc -b` **clean**; `npx vite build` **succeeds**. Remaining `oxlint` output is `exhaustive-deps` warnings consistent with existing pages.

## 5. Notable engineering decisions

- **Zod v4 compatibility:** `AnyZodObject` removed → middleware uses `ZodType`; `.partial()` never chained onto refined schemas (base/refined/partial split in `assessment.validator.ts`).
- **Express 5 getter shadowing:** `req.query`/`req.params` assigned via `Object.defineProperty` (plain assignment silently dropped).
- **Prisma v7 driver adapter:** `PrismaPg` + `Pool` from `DATABASE_URL`; client generated to repo-root `node_modules/.prisma/client`.
- **Audit logging:** every state-changing action writes to the existing audit ledger.
