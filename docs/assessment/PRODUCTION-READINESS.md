# Assessment Engine — Production Readiness Report

**Date:** 2026-08-12

## 1. Verification summary

| Layer | Status | Evidence |
|-------|--------|----------|
| Backend strict typecheck | ✅ PASS | `npx tsc -p tsconfig.check.json` exit 0 (module scope) |
| Backend runtime E2E | ✅ PASS | cookie-jar curl flows: login → CRUD → attempt → grade → analytics |
| Frontend typecheck | ✅ PASS | `npx tsc -b` in `web/` |
| Frontend production build | ✅ PASS | `npx vite build` succeeds |
| Lint | ⚠️ PASS (warnings) | only `exhaustive-deps` warnings, matching existing pages |
| Migration/seed | ⚠️ PARTIAL | assessment seed runs standalone; full seed blocked by pre-existing `05-students.ts` P2003 |

## 2. What ships in this change

- **Backend:** full Clean-Arch assessment module (14 files) mounted at `/api/assessment`.
- **Frontend:** 5 pages (QuestionBank, AssessmentBuilder, Review, Analytics, AttemptPlayer) + routes + sidebar.
- **Seed:** `prisma/seed/11-assessment.ts` (idempotent, standalone-runnable).

## 3. Pre-existing issues (not introduced here, but block full rollout)

1. **Full seed fails** — `prisma/seed/05-students.ts` hits P2003 (attendance FK). Assessment seed must be run via wrapper/standalone until fixed.
2. **Full-server typecheck errors** — pre-existing in monolith `main.ts`, `env.ts`, `auth`. Module-scoped typecheck (tsconfig.check.json) is the accepted gate.
3. **Single large frontend bundle** — repo-wide; recommend route-level code splitting via `React.lazy`.

## 4. Known gaps / follow-ups

| Area | Gap | Suggested action |
|------|-----|------------------|
| Tests | No assessment-specific automated tests (unit/integration/E2E) | Add unit tests for GradingEngine; integration tests for attempt flow; browser E2E for player |
| Sanitization | `dangerouslySetInnerHTML` renders rich-text prompts unsanitized | Introduce DOMPurify sanitization |
| Proctoring | counters recorded but not enforced | Wire `browserLock`/`fullscreenMode` to block UI + `autoSubmit` on violation |
| Analytics | cached snapshot lacks auto-refresh trigger | Refresh analytics row inside submit transaction (or queue) to keep dashboards fresh |
| Pool rules | add/remove implemented; random draw execution not E2E-verified | Verify randomSelect/poolSource materialization path |
| Fullscreen/browser lock | flags exist in schema + UI only | Backend enforcement when enabled |

## 5. Deployment checklist

- [ ] `npx prisma migrate deploy` (driver-adapter aware; `DATABASE_URL` set).
- [ ] Regenerate client: `npx prisma generate` (outputs to repo-root `node_modules/.prisma/client`).
- [ ] Seed assessment data: `npx tsx prisma/seed/11-assessment.ts` (or after fixing `05-students.ts`).
- [ ] Build frontend: `cd web && npm run build`; serve `web/dist`.
- [ ] Smoke test with a seeded teacher login (`teacher1@sman1.sch.id` / `password123`) and student login (`10000@student.sch.id` / `password123`) on tenant `00000000-0000-0000-0000-000000000000`.
- [ ] Confirm CSRF/origin policy + CORS allowlist covers `web/dist` origin.
- [ ] Set production cookie `secure: true` for the auth cookie.

## 6. Rollback plan

- Backend module is additive (own router + tables). Rollback = remove `app.use('/api/assessment', ...)` and drop `assessment-*` tables via a down migration.
- Frontend pages are additive routes; rollback = remove imports/routes in `App.tsx` + sidebar links.
