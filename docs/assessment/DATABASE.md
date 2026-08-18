# Assessment Engine — Database Report

**Date:** 2026-08-12
**DB:** PostgreSQL `lms_enterprise` (localhost:5433), Prisma v7 with `@prisma/adapter-pg`.

## 1. Models

Schemas in `prisma/schema/assessment/`:

| Model | Table | Purpose |
|-------|-------|---------|
| `QuestionCategory` | `question_categories` | hierarchical question taxonomy |
| `QuestionTag` | `question_tags` | labels for questions |
| `AssessmentQuestion` | `assessment_questions` | question content (JSON strategy payload) |
| `AssessmentQuestionVersion` | `assessment_question_versions` | immutable snapshots + restore |
| `AssessmentQuestionTag` | `assessment_question_tags` | M:N question↔tag |
| `QuestionAttachment` | `question_attachments` | media attachments (kind/url/mime) |
| `Assessment` | `assessments` | exam definition + scheduling + policy |
| `AssessmentQuestionRef` | `assessment_question_refs` | question attach w/ per-ref points |
| `AssessmentPoolRule` | `assessment_pool_rules` | random selection rules |
| `Attempt` | `attempts` | student attempt + proctoring counters |
| `Answer` | `answers` | per-question response + grading state |
| `Review` | `reviews` | teacher grading record |
| `AssessmentResult` | `assessment_results` | final computed score/grade/passed |
| `AssessmentAnalytics` | `assessment_analytics` | cached aggregate stats |

Note: `prisma/schema/assessment/question-bank.prisma` also defines a legacy `Question`/`QuestionVersion` pair (existing, pre-assessment; not used by this engine).

## 2. Conventions

- **Tenant isolation:** every aggregate carries `tenantId`; composite indexes start with `tenantId`.
- **Soft delete:** `deletedAt DateTime?` on aggregates; queries filter `deletedAt: null`.
- **Audit columns:** `createdById`/`updatedById`/`deletedById` on aggregates.
- **OCC:** `version Int @default(1)` on mutable aggregates (question, assessment, attempt, answer, review).

## 3. Key constraints

- `@@unique([tenantId, slug])` on category/tag.
- `@@unique([assessmentId, questionId])` on refs (no duplicate attachment).
- `@@unique([assessmentId, studentId, attemptNumber])` on attempts (attempt-limit enforcement).
- `@@unique([attemptId, questionId])` on answers and reviews.
- `@@unique([tenantId, slug])` etc. enforce per-tenant integrity.

## 4. Indexes

Coverage for the hot query paths:
- `AssessmentQuestion`: `[tenantId, type, status]`, `[tenantId, categoryId]`, `[tenantId, difficulty]`, `[tenantId, bloomLevel]`, `[tenantId, topic]`, `[tenantId, learningOutcome]`, `[tenantId, updatedAt]`.
- `Assessment`: `[tenantId, status, openDate]`, `[tenantId, classId]`, `[tenantId, courseId]`, `[tenantId, subjectId]`.
- `Attempt`: `[tenantId, assessmentId, status]`, `[tenantId, studentId, status]`, `[tenantId, status, expectedEndTime]`.
- `Answer`: `[tenantId, attemptId]`, `[tenantId, questionId]`, `[tenantId, gradingStatus]`.
- `AssessmentResult`: `[tenantId, assessmentId]`, `[tenantId, studentId]`.
- `Review`: `[tenantId, attemptId]`, `[tenantId, reviewerId]`.

## 5. Data types

- JSON columns: `options`, `answer`, `caseData` (question), `response` (answer), `scoreHistogram`/`questionStats`/`timeDistribution`/`difficultyIndex`/`discrimination` (analytics).
- `Float @db.Real` for points/scores; `SmallInt` for durations/counts.

## 6. Seed data

`prisma/seed/11-assessment.ts` (wired into `prisma/seed/index.ts`; also runs standalone):
- 4 categories + 5 sub-categories, 5 tags, 11 questions (MC, TRUE_FALSE, SHORT_ANSWER, ESSAY, NUMERIC, MATCHING, ORDERING, FILL_BLANK).
- Assessment **"Ujian Formatif Fisika & Matematika"** — PUBLISHED, 11 refs, `maxPoints` 21, passing 60%.
- Standalone run OK. Note: full multi-file seed is currently blocked by a **pre-existing** P2003 failure in `05-students.ts` (attendance FK), unrelated to this engine.

## 7. Migration note

Prisma v7 with driver adapter: migration is applied via `npx prisma migrate deploy` using `DATABASE_URL`; runtime uses `PrismaPg(new Pool({ connectionString: DATABASE_URL }))`. Client (`@prisma/client`) is generated to repo-root `node_modules/.prisma/client`.
