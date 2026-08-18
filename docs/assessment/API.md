# Assessment Engine — API Report

**Date:** 2026-08-12
**Base path:** `/api/assessment` (behind `requireAuth`)
**Auth:** HTTP-only cookies (email + password + tenantId login; tokens never in body)

## 1. Route inventory (41 handlers, 26 endpoints)

### Categories / Tags (staff)
| Method | Path | Body/Query |
|--------|------|-----------|
| GET | `/categories` | query: pagination + search/parentId |
| POST | `/categories` | name, parentId?, description?, orderIndex? |
| PUT | `/categories/:id` | partial category fields |
| DELETE | `/categories/:id` | — |
| GET | `/tags` | query: pagination + search |
| POST | `/tags` | name, color? |
| DELETE | `/tags/:id` | — |

### Questions (staff)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/questions` | filters: search/type/difficulty/bloom/status/categoryId/tagId/topic/learningOutcome/subjectId |
| GET | `/questions/export` | same filters → JSON payload |
| POST | `/questions/import` | `{ rows: any[] }` (≤5000) |
| GET | `/questions/:id` | detail |
| POST | `/questions` | CreateQuestionSchema |
| PUT | `/questions/:id` | partial update |
| DELETE | `/questions/:id` | — |
| POST | `/questions/:id/duplicate` | — |
| POST | `/questions/:id/status` | `{ status: DRAFT\|PUBLISHED\|ARCHIVED }` |
| GET | `/questions/:id/versions` | version list |
| POST | `/questions/:id/versions/:version/restore` | restore snapshot |

### Assessments (staff)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/assessments` | filters: search/status/classId/courseId/subjectId |
| GET | `/assessments/:id` | detail incl. questions + poolRules |
| POST | `/assessments` | CreateAssessmentSchema |
| PUT | `/assessments/:id` | partial update |
| DELETE | `/assessments/:id` | — |
| POST | `/assessments/:id/status` | `{ status }` |
| POST | `/assessments/:id/questions` | `{ questionIds[], points? }` |
| DELETE | `/assessments/:assessmentId/questions/:questionId` | detach |
| POST | `/assessments/:id/pool-rules` | pool rule |
| DELETE | `/assessments/:id/pool-rules/:ruleId` | — |
| GET | `/assessments/:id/analytics` | cached metrics |
| POST | `/assessments/:id/analytics/refresh` | recompute |
| GET | `/assessments/:id/results` | paginated results |

### Review / Grading (staff)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/reviews` | filters: attemptId/questionId/status |
| GET | `/attempts/:attemptId/reviews` | pending by attempt + student response |
| POST | `/attempts/:attemptId/questions/:questionId/grade` | score (≤ maxPoints), feedback, regradeReason |
| POST | `/reviews/bulk` | `{ items: [{attemptId, questionId, score, feedback?}] }` (≤200) |

### Attempts (student)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/my/assessments` | available READY/RUNNING/PUBLISHED |
| POST | `/assessments/:id/start` | 201; auto-resumes active; enforces limit/window |
| POST | `/attempts/:id/resume` | resume in-progress |
| PUT | `/attempts/:attemptId/questions/:questionRefId/answer` | `{ response, flagged?, visited?, timeSpentSeconds? }` |
| POST | `/attempts/:id/submit` | finalize + auto-grade + result |
| GET | `/my/results` | student's results |

## 2. Response envelope

- Success: `{ success: true, data, meta? }` (`meta` = `{ total, page, limit, totalPages }` on paginated).
- Start attempt returns `201`; all others `200`.
- Errors: RFC 7807 `{ type, title, status, detail, instance, timestamp }`; Zod failures → `REQ_001`; not-found → `RES_001`; business rules → `RES_003` (e.g. "Batas percobaan telah tercapai", "Assessment belum dibuka", "Waktu pengerjaan habis", "Skor melebihi batas maksimal N").

## 3. Request validation (Zod v4)

- Every route is guarded by `validateRequest({ body?, query?, params? })` with Zod schemas.
- Express 5 getter shadowing fixed via `Object.defineProperty` for query/params.
- Pagination defaults (`page=1`, `limit=20`) applied by query schemas — required to avoid Prisma `skip/take` 500s.

## 4. Role guards

- `requireStaff` (teacher/admin/super_admin): categories, tags, questions, assessments, pool-rules, analytics, results, review/grading.
- `requireStudent` (student + StudentProfile): `/my/*`, start/resume/save/submit.

## 5. Runtime-verified behaviors

End-to-end cookie-jar tests confirmed: login, category create/list, MC question CRUD + duplicate + versions + export + import, assessment create/attach/publish, student start/resume/save-correct/save-wrong/submit, autograde (rawScore 1, grade A, passed at 100%), essay manual grade (PENDING → grade B at 80%), attempt-limit 422, analytics get/refresh, results list, bulk grade, question status 422 after publish.

## 6. Frontend contract

Client wrapper: `web/src/lib/assessment.ts` (axios, base `/api`, `withCredentials`). Pages call `/assessment/*` directly via `web/src/lib/axios.ts`. See IMPLEMENTATION.md for page↔endpoint mapping.
