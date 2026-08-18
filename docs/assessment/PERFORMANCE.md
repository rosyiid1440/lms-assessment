# Assessment Engine — Performance Report

**Date:** 2026-08-12

## 1. Index strategy

Hot query paths are covered by composite indexes (see DATABASE.md §4):
- Question filters → `[tenantId, type, status]`, `[tenantId, categoryId]`, `[tenantId, difficulty]`, `[tenantId, bloomLevel]`, `[tenantId, topic]`.
- Student dashboard → `Assessment [tenantId, status, openDate]`, `Attempt [tenantId, studentId, status]`, `AssessmentResult [tenantId, studentId]`.
- Auto-grade loop → `Answer [tenantId, attemptId]`, `[tenantId, questionId]`.

## 2. Query efficiency

- **Pagination is applied everywhere** (`skip/take`) with `count` in `Promise.all` — no unbounded full-table reads.
- **Projected DTOs:** repositories select only needed columns; detail joins (questions+refs) are bounded per assessment.
- **Lazy loading of heavy payloads:** question `options`/`answer`/`caseData` JSON is included only where needed (attempt DTO includes options for the renderer; list endpoints exclude `answer`).
- **Attempt DTO** builds from `findAttemptById` + `listAttemptQuestions` — 2 bounded queries, no N+1.

## 3. Analytics caching

- `AssessmentAnalytics` snapshot table caches computed metrics (avg/median/highest/lowest/std-dev/pass rate/histogram/question stats).
- `GET /analytics` returns the cached row when present (O(1)); explicit `POST /analytics/refresh` recomputes on demand.
- Prevents O(attempts × questions) recomputation on every dashboard view.

## 4. Submit finalization

- Single pass over attempt questions; per-question grading is a direct answer upsert (no per-question aggregation query).
- One aggregate result upsert + one attempt update + one audit insert after the loop.
- Subjective routing: `upsertPendingReview` is a single upsert per essay question (unique `[attemptId, questionId]`).

## 5. Frontend performance

- Paginated tables everywhere (question bank, assessments, reviews, analytics results, student list).
- Vite production build succeeds (3.29 MB JS / 938 KB gzip). **Note:** the app currently emits a single large chunk — existing repo-wide issue, not specific to assessment; dynamic `import()` per route is recommended (see PRODUCTION-READINESS.md).

## 6. Benchmark / load-testing status

- Repo has an existing performance harness under `tests/performance/` (grade-ledger & dashboard benchmarks). The assessment module has **no dedicated load test yet**.

### Recommendation
Add a benchmark scenario (`tests/performance/scenarios/assessment.ts`) covering:
1. **Attempt start + save loop** (N students concurrent) — assert P95 target.
2. **Auto-grade submit** (worst case: 100 questions/attempt) — assert P95.
3. **Analytics refresh** on a mid-size cohort — assert it stays under the caching recompute budget.
4. **Manual grade recompute** after bulk grade of M essays.

Reuse `tests/performance/harness.ts` + `run-benchmarks.ts` and append rows to `benchmark-report.md` following the existing table format.
