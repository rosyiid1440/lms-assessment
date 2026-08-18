# Assessment Engine — Security Report

**Date:** 2026-08-12

## 1. Authentication & authorization

- **Auth:** login requires `email` + `password` + `tenantId`. Tokens returned as HTTP-only cookies (never in the JSON body).
- **Global guard:** the whole module is mounted behind `requireAuth` (`app.use('/api/assessment', requireAuth, ...)` in `main.ts:135`).
- **Role separation:** `requireStaff` (teacher/admin/super_admin) for authoring/review/analytics; `requireStudent` (student with `StudentProfile`) for attempts/results. Both return RFC 7807 `AUTH_003` 403 on mismatch.
- **Tenant isolation:** every repository query filters by `tenantId` from the authenticated actor — cross-tenant data access is structurally prevented, not just by guard.

## 2. Ownership checks (defense in depth)

- `resume`: verifies `attempt.studentId === studentId` → "Bukan attempt milik Anda" otherwise.
- `saveAnswer`: same ownership check + rejects submit-ed attempts + rejects past `expectedEndTime`.
- `submit`: ownership check + double-submit rejection.
- Attempt listing/result listing scoped by `studentId` from token.

## 3. Validation hardening (Zod v4)

- Body/query/params validated on **every** route (no route reads raw `req.body`/`req.query`).
- Strict types: enums for question type/difficulty/Bloom/status, UUID params, `min/max` bounds (e.g. points 0–1000, duration 1–1440, score 0–1000).
- Payload caps prevent abuse: import ≤5000 rows, bulk grade ≤200 items, options ≤100, questionIds ≤500, tagIds ≤50.
- Rich-text `prompt` max 20000 chars; explanation/hint capped.

## 4. Business-rule enforcement (server-side, not client-side)

- Attempt window: `openDate`/`closeDate` checked on start.
- Attempt limit: `countAttempts >= attemptLimit` → "Batas percobaan telah tercapai".
- Assessment must be READY/RUNNING/PUBLISHED to start.
- Manual grade score capped at question maxPoints.
- Status transitions validated (e.g. can't mutate PUBLISHED question/assessment illegally).

## 5. Integrity & audit

- **OCC** via `version` on question/assessment/attempt/answer/review aggregates.
- **Audit logger:** START/SUBMIT/GRADE and CRUD actions recorded to the audit ledger with actor + newValues.
- **Soft delete** (`deletedAt`) preserves history; unique constraints keep tenant slugs clean.

## 6. Frontend notes

- API client uses `withCredentials: true`; 401 → redirect `/login` (public `/live/*` routes exempt).
- `dangerouslySetInnerHTML` is used to render rich-text prompts (matching existing app pattern). **Recommendation:** sanitize with a library (e.g. DOMPurify) before rendering teacher-authored HTML in student-facing attempt player.

## 7. Residual risks / recommendations

| # | Risk | Recommendation |
|---|------|----------------|
| 1 | HTML prompt injection via `dangerouslySetInnerHTML` | Add DOMPurify sanitization server-side or client-side before rendering |
| 2 | No rate limiting on auth/token refresh | Already app-level concern; ensure existing rate-limiter covers `/api/assessment` |
| 3 | Secrets/config | `DATABASE_URL` lives in `.env` (git-ignored per repo convention); confirm `.env.production.example` stays complete |
| 4 | Proctoring counters are recorded but not yet enforced by backend policies (tabSwitches etc.) | Future: tie `browserLock`/`fullscreenMode` flags to enforcement logic |
