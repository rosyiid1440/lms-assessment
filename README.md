# LMS Assessment Platform

Enterprise-grade Learning Management System with a modular assessment engine, real-time exam proctoring, gradebook automation, and multi-tenant support.

## Tech Stack

- **Backend**: Node.js, Express 5, TypeScript
- **Database**: PostgreSQL 16, Prisma ORM
- **Cache / Queue**: Redis (optional in dev), in-memory queue for local development
- **Frontend**: React, Vite, TypeScript
- **Observability**: Prometheus, Grafana, Promtail (optional)
- **Testing**: Vitest, Supertest
- **Auth**: JWT (access/refresh), Argon2id password hashing

## Architecture

The system is organized into functional modules:

| Domain | Description |
| --- | --- |
| `identity` | Users, roles, authentication, authorization (RBAC policies) |
| `academic` | Academic calendar, classes, enrollments, master data |
| `assessment` | Question bank, exam engine, attempts, grading, analytics, review |
| `assignment` | Assignments, submissions, similarity checks |
| `gradebook` | Formula engine, ledger, projections, report cards |
| `course` | Courses and course state machine |
| `learning` | Lessons, materials (PDF/YouTube resources), progress, unlock engine |
| `workspace` | Student notes, reading position, encryption provider |
| `platform` | Tenants, jobs, notifications, outbox pattern, audit |
| `ai` | Gemini-based assistant integration |

Key cross-cutting features:

- **CQRS-lite** — command/query repository separation (see `docs/12-decision-records/ADR-002-cqrs-lite.md`)
- **Event bus** with transactional **outbox** worker
- **State machines** for course, lesson, enrollment, assignment, approval flows
- **Multi-tenant** resolver middleware
- Background **job queue** with Postgres-backed workers

## Getting Started

### Prerequisites

- Node.js 20+ (or 22+)
- Docker (for PostgreSQL and Redis)
- npm

### 1. Clone & install

```bash
npm install
npm install --prefix server
npm install --prefix web
```

### 2. Configure environment

```bash
cp .env.example .env
```

### 3. Start dependencies

```bash
docker compose up -d
```

### 4. Generate Prisma client & migrate

```bash
npm run prisma:generate
npx prisma migrate deploy
```

### 5. Seed the database (optional)

```bash
npm run prisma:seed
```

### 6. Run the app

```bash
npm run dev
```

- API server: http://localhost:5000
- Web app: http://localhost:3000

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Run API server and web app concurrently |
| `npm run test:integration` | Integration tests |
| `npm run test:e2e` | End-to-end tests |
| `npm run test:coverage` | Test coverage report |
| `npm run benchmark` | Performance benchmarks |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate:deploy` | Apply migrations |
| `npm run prisma:seed` | Seed data |
| `npm run bootstrap:prod` | Production bootstrap checks |

## Project Structure

```
server/src/
  core/          # Config, middleware, infrastructure, workers, observability
  modules/       # Business domains (auth, assessment, gradebook, ...)
  shared/        # Shared utilities (JWT, hashing, cookies, tokens)
  integrations/  # Webhooks, WebSocket gateway
web/src/
  components/    # Shared UI components
  hooks/         # Custom hooks
  pages/         # Feature pages (assessment, courses, gradebook, ...)
  stores/        # State stores
prisma/
  schema/        # Modular Prisma schema files per domain
  migrations/    # SQL migrations
  seed/          # Seed scripts
docs/            # Architecture, assessment, deployment documentation
observability/   # Prometheus, Grafana, Promtail configs
tests/           # Integration, e2e, chaos, performance tests
```

## Deployment

For production deployment see:

- `docker-compose.production.yml`
- `docs/assessment/PRODUCTION-READINESS.md`
- `docs/aapanel-nginx/` — sample nginx/AaPanel configuration
- `docs/assessment/API.md`, `SECURITY.md`, `PERFORMANCE.md`

## License

Private / internal use.
