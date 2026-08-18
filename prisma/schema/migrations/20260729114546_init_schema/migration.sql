-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'LOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LoginStatus" AS ENUM ('SUCCESS', 'FAILED', 'LOCKED', 'PASSWORD_RESET', 'LOGOUT', 'TOKEN_REUSE');

-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('ACTIVE', 'USED', 'REVOKED', 'COMPROMISED');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "AcademicYearStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SemesterStatus" AS ENUM ('DRAFT', 'PLANNING', 'RUNNING', 'GRADING', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SemesterType" AS ENUM ('ODD', 'EVEN');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'TRANSFERRED', 'GRADUATED', 'WITHDRAWN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TeacherAssignmentStatus" AS ENUM ('ASSIGNED', 'ACTIVE', 'REASSIGNED', 'FINISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TeacherRoleType" AS ENUM ('PRIMARY', 'ASSISTANT', 'OBSERVER');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PLANNED', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VisibilityStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'LOCKED');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('PDF', 'VIDEO', 'AUDIO', 'IMAGE', 'YOUTUBE', 'EXTERNAL_LINK', 'MARKDOWN', 'HTML', 'SCORM', 'H5P', 'OFFICE');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('UPLOADING', 'UPLOADED', 'SCANNING', 'PROCESSING', 'READY', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "VirusScanStatus" AS ENUM ('PENDING', 'CLEAN', 'INFECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "StorageProviderType" AS ENUM ('LOCAL', 'S3', 'CLOUDFLARE_R2', 'MINIO', 'GDRIVE');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'OPEN', 'CLOSED', 'GRADING', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('FILE_ONLY', 'TEXT_ONLY', 'FILE_AND_TEXT', 'EXTERNAL_LINK');

-- CreateEnum
CREATE TYPE "GradingStrategy" AS ENUM ('MANUAL', 'RUBRIC', 'AUTO_GRADE');

-- CreateEnum
CREATE TYPE "LatePolicy" AS ENUM ('REJECT', 'ACCEPT_WARNING', 'ACCEPT_PENALTY');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'LATE_SUBMITTED', 'RETURNED_FOR_REVISION', 'GRADED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'MULTIPLE_RESPONSE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'NUMERIC', 'FILE_UPLOAD', 'PROGRAMMING');

-- CreateEnum
CREATE TYPE "QuestionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'HOTS');

-- CreateEnum
CREATE TYPE "BloomLevel" AS ENUM ('C1_REMEMBERING', 'C2_UNDERSTANDING', 'C3_APPLYING', 'C4_ANALYZING', 'C5_EVALUATING', 'C6_CREATING');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'READY', 'RUNNING', 'FINISHED', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'AUTO_SUBMITTED', 'MANUAL_SUBMITTED', 'EVALUATING', 'COMPLETED', 'ABANDONED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('INITIAL_ENTRY', 'CORRECTION', 'REMEDIAL', 'PENALTY');

-- CreateEnum
CREATE TYPE "GradeSourceType" AS ENUM ('ASSIGNMENT', 'EXAM', 'PROJECT_P5', 'OBSERVATION', 'ATTENDANCE');

-- CreateEnum
CREATE TYPE "FormulaCalculationType" AS ENUM ('WEIGHTED_AVERAGE', 'BEST_OF', 'SUM');

-- CreateEnum
CREATE TYPE "ReportCardStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MasteryLevel" AS ENUM ('NOT_EVALUATED', 'NEEDS_INTERVENTION', 'APPROACHING', 'PROFICIENT', 'EXCEEDS');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'PUSH', 'SMS', 'WHATSAPP', 'IN_APP');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'RETRYING', 'DEAD');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('PLAIN', 'STICKY', 'TIMESTAMP', 'REFLECTION', 'QUOTE');

-- CreateTable
CREATE TABLE "academic_years" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "AcademicYearStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "deletedById" UUID,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semesters" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "SemesterType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "SemesterStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "deletedById" UUID,

    CONSTRAINT "semesters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "gradeLevelId" UUID NOT NULL,
    "majorId" UUID NOT NULL,
    "classroomId" UUID,
    "semesterId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "deletedById" UUID,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_enrollments" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "deletedById" UUID,

    CONSTRAINT "student_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_assignments" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "status" "TeacherAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "isHomeroom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "deletedById" UUID,

    CONSTRAINT "teacher_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_levels" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "level" SMALLINT NOT NULL,
    "phase" VARCHAR(10) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "deletedById" UUID,

    CONSTRAINT "grade_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "majors" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "deletedById" UUID,

    CONSTRAINT "majors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classrooms" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "capacity" SMALLINT NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "deletedById" UUID,

    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "instruction" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "submissionType" "SubmissionType" NOT NULL DEFAULT 'FILE_AND_TEXT',
    "gradingStrategy" "GradingStrategy" NOT NULL DEFAULT 'MANUAL',
    "latePolicy" "LatePolicy" NOT NULL DEFAULT 'REJECT',
    "maxAttempts" SMALLINT NOT NULL DEFAULT 1,
    "scheduledAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "lateDueDate" TIMESTAMP(3),
    "rubricId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "deletedById" UUID,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionId" UUID,
    "finalGrade" REAL,
    "gradedAt" TIMESTAMP(3),
    "gradedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_versions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT,
    "attachmentFileIds" UUID[],
    "aiMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "instruction" TEXT,
    "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "durationMinutes" SMALLINT NOT NULL,
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
    "shuffleChoices" BOOLEAN NOT NULL DEFAULT false,
    "autoPublishResult" BOOLEAN NOT NULL DEFAULT false,
    "showCorrectAnswers" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempts" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "expectedEndTime" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "lastHeartbeatAt" TIMESTAMP(3),
    "tabSwitches" SMALLINT NOT NULL DEFAULT 0,
    "fullscreenExits" SMALLINT NOT NULL DEFAULT 0,
    "networkDisconnects" SMALLINT NOT NULL DEFAULT 0,
    "score" REAL,
    "timeSpentSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "type" "QuestionType" NOT NULL,
    "difficulty" "QuestionDifficulty" NOT NULL,
    "bloomLevel" "BloomLevel" NOT NULL,
    "phase" VARCHAR(10),
    "cpId" VARCHAR(100),
    "tpId" VARCHAR(100),
    "atpId" VARCHAR(100),
    "currentVersionId" UUID,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" UUID,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_versions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT NOT NULL,
    "attachments" UUID[],
    "strategyPayload" JSONB NOT NULL,
    "estimatedTime" SMALLINT NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,

    CONSTRAINT "question_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rubrics" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "isReusable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "rubrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rubric_criteria" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "rubricId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "order" SMALLINT NOT NULL,

    CONSTRAINT "rubric_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rubric_scales" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "criterionId" UUID NOT NULL,
    "points" REAL NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "rubric_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_formulas" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "calculationType" "FormulaCalculationType" NOT NULL DEFAULT 'WEIGHTED_AVERAGE',
    "passingScore" REAL NOT NULL DEFAULT 75.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "grade_formulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_formula_components" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "formulaId" UUID NOT NULL,
    "sourceType" "GradeSourceType" NOT NULL,
    "weightPercentage" REAL NOT NULL,
    "dropLowest" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "grade_formula_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_ledgers" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "sourceType" "GradeSourceType" NOT NULL,
    "referenceId" UUID NOT NULL,
    "referenceVersion" INTEGER NOT NULL,
    "cpId" VARCHAR(100),
    "tpId" VARCHAR(100),
    "entryType" "LedgerEntryType" NOT NULL,
    "scoreChange" REAL NOT NULL,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "reason" VARCHAR(500) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" UUID NOT NULL,

    CONSTRAINT "grade_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_projections" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "finalScore" REAL NOT NULL,
    "letterGrade" VARCHAR(5) NOT NULL,
    "isPassed" BOOLEAN NOT NULL,
    "lastLedgerId" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_projections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competency_summaries" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "tpId" VARCHAR(100) NOT NULL,
    "masteryScore" REAL NOT NULL,
    "masteryLevel" "MasteryLevel" NOT NULL DEFAULT 'NOT_EVALUATED',
    "needsRemedial" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competency_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_cards" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "status" "ReportCardStatus" NOT NULL DEFAULT 'DRAFT',
    "studentSnapshotInfo" JSONB NOT NULL,
    "attendanceSummary" JSONB NOT NULL,
    "p5ProjectSummary" JSONB,
    "homeroomTeacherNote" TEXT,
    "homeroomSignatureId" UUID,
    "principalSignatureId" UUID,
    "verificationQrHash" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "report_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_card_items" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "reportCardId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "subjectName" VARCHAR(255) NOT NULL,
    "teacherName" VARCHAR(255) NOT NULL,
    "finalScore" REAL NOT NULL,
    "letterGrade" VARCHAR(5) NOT NULL,
    "highestCompetencyDesc" TEXT NOT NULL,
    "lowestCompetencyDesc" TEXT NOT NULL,

    CONSTRAINT "report_card_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "deviceId" VARCHAR(255) NOT NULL,
    "deviceName" VARCHAR(255) NOT NULL,
    "platform" VARCHAR(100) NOT NULL,
    "browser" VARCHAR(100) NOT NULL,
    "os" VARCHAR(100) NOT NULL,
    "ipAddress" VARCHAR(45) NOT NULL,
    "isTrustedDevice" BOOLEAN NOT NULL DEFAULT false,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRefreshAt" TIMESTAMP(3),
    "logoutAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "hashedToken" VARCHAR(255) NOT NULL,
    "status" "TokenStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "rotatedFromTokenId" UUID,
    "rotatedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_histories" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID,
    "sessionId" UUID,
    "emailAttempted" VARCHAR(255),
    "ipAddress" VARCHAR(45) NOT NULL,
    "userAgent" VARCHAR(255) NOT NULL,
    "status" "LoginStatus" NOT NULL,
    "loginMethod" VARCHAR(50) NOT NULL,
    "authenticationProvider" VARCHAR(50) NOT NULL,
    "failureReason" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID,
    "email" VARCHAR(255) NOT NULL,
    "ipAddress" VARCHAR(45) NOT NULL,
    "success" BOOLEAN NOT NULL,
    "failureReason" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "module" VARCHAR(100) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "roleId" UUID NOT NULL,
    "avatarFileId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "nis" VARCHAR(50) NOT NULL,
    "nisn" VARCHAR(50) NOT NULL,
    "fullName" VARCHAR(255) NOT NULL,
    "gender" "Gender" NOT NULL,
    "birthPlace" VARCHAR(100),
    "birthDate" DATE,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_profiles" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "nip" VARCHAR(50) NOT NULL,
    "nuptk" VARCHAR(50),
    "fullName" VARCHAR(255) NOT NULL,
    "gender" "Gender" NOT NULL,
    "specialization" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "fingerprint" VARCHAR(255) NOT NULL,
    "originalName" VARCHAR(500) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "sizeBytes" BIGINT NOT NULL DEFAULT 0,
    "storageProvider" "StorageProviderType" NOT NULL DEFAULT 'LOCAL',
    "storageKey" VARCHAR(1000) NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'UPLOADING',
    "virusStatus" "VirusScanStatus" NOT NULL DEFAULT 'PENDING',
    "processingStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" INTEGER,
    "pageCount" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "deletedById" UUID,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "primaryTeacherId" UUID NOT NULL,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "deletedById" UUID,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_co_teachers" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "role" "TeacherRoleType" NOT NULL DEFAULT 'ASSISTANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_co_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "order" SMALLINT NOT NULL,
    "visibility" "VisibilityStatus" NOT NULL DEFAULT 'VISIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "chapterId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "order" SMALLINT NOT NULL,
    "status" "LessonStatus" NOT NULL DEFAULT 'DRAFT',
    "estimatedDuration" INTEGER NOT NULL DEFAULT 0,
    "completionRule" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "type" "MaterialType" NOT NULL,
    "order" SMALLINT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "currentVersionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_versions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "assetId" UUID,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "contentHash" VARCHAR(255) NOT NULL,
    "searchableContent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,

    CONSTRAINT "material_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "correlationId" VARCHAR(100),
    "requestId" VARCHAR(100),
    "actorId" UUID,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
    "resource" VARCHAR(100) NOT NULL,
    "resourceId" UUID,
    "action" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "auditLogId" UUID NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "diffSummary" TEXT,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_attachments" (
    "id" UUID NOT NULL,
    "auditLogId" UUID NOT NULL,
    "storedFileId" UUID NOT NULL,

    CONSTRAINT "audit_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "secretKey" VARCHAR(255) NOT NULL,
    "topics" TEXT[],
    "status" "WebhookStatus" NOT NULL DEFAULT 'ACTIVE',
    "maxRetries" SMALLINT NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" UUID NOT NULL,
    "endpointId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "topic" VARCHAR(255) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" SMALLINT NOT NULL DEFAULT 0,
    "lastHttpResponse" SMALLINT,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_index_queues" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "attempt" SMALLINT NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "search_index_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "variables" TEXT[],

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "topic" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "actionUrl" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "providerId" VARCHAR(100),
    "targetContact" VARCHAR(255) NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "errorLog" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "eventType" VARCHAR(255) NOT NULL,
    "aggregateType" VARCHAR(100) NOT NULL,
    "aggregateId" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" SMALLINT NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "lockedUntil" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "scope" VARCHAR(50) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stored_files" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "fingerprint" VARCHAR(255) NOT NULL,
    "originalName" VARCHAR(500) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "sizeBytes" BIGINT NOT NULL DEFAULT 0,
    "storageProvider" VARCHAR(50) NOT NULL,
    "storageKey" VARCHAR(1000) NOT NULL,
    "contextType" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "plan" VARCHAR(50) NOT NULL DEFAULT 'FREE',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Jakarta',
    "locale" VARCHAR(10) NOT NULL DEFAULT 'id-ID',
    "logoFileId" UUID,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "deletedById" UUID,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_folders" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "color" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_notes" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "folderId" UUID,
    "courseId" UUID NOT NULL,
    "lessonId" UUID,
    "materialId" UUID,
    "type" "NoteType" NOT NULL,
    "encryptedContent" TEXT NOT NULL,
    "searchableContent" TEXT NOT NULL,
    "summary" TEXT,
    "embeddingStatus" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SYNCED',
    "lastDeviceId" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_bookmarks" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "folderId" UUID,
    "courseId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "materialId" UUID,
    "title" VARCHAR(255) NOT NULL,
    "thumbnail" VARCHAR(500),
    "positionContext" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_reading_positions" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "materialId" UUID,
    "positionContext" JSONB NOT NULL,
    "lastDeviceId" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_reading_positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "academic_years_tenantId_deletedAt_idx" ON "academic_years"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "academic_years_tenantId_status_idx" ON "academic_years"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_tenantId_name_key" ON "academic_years"("tenantId", "name");

-- CreateIndex
CREATE INDEX "semesters_tenantId_deletedAt_idx" ON "semesters"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "semesters_tenantId_status_idx" ON "semesters"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "semesters_academicYearId_type_key" ON "semesters"("academicYearId", "type");

-- CreateIndex
CREATE INDEX "classes_tenantId_deletedAt_idx" ON "classes"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "classes_semesterId_idx" ON "classes"("semesterId");

-- CreateIndex
CREATE UNIQUE INDEX "classes_semesterId_name_key" ON "classes"("semesterId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "classes_semesterId_code_key" ON "classes"("semesterId", "code");

-- CreateIndex
CREATE INDEX "student_enrollments_tenantId_deletedAt_idx" ON "student_enrollments"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "student_enrollments_classId_status_idx" ON "student_enrollments"("classId", "status");

-- CreateIndex
CREATE INDEX "student_enrollments_studentId_status_idx" ON "student_enrollments"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "student_enrollments_studentId_semesterId_key" ON "student_enrollments"("studentId", "semesterId");

-- CreateIndex
CREATE INDEX "teacher_assignments_tenantId_deletedAt_idx" ON "teacher_assignments"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "teacher_assignments_classId_status_idx" ON "teacher_assignments"("classId", "status");

-- CreateIndex
CREATE INDEX "teacher_assignments_teacherId_status_idx" ON "teacher_assignments"("teacherId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_assignments_teacherId_classId_subjectId_semesterId_key" ON "teacher_assignments"("teacherId", "classId", "subjectId", "semesterId");

-- CreateIndex
CREATE INDEX "grade_levels_tenantId_deletedAt_idx" ON "grade_levels"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "grade_levels_tenantId_level_key" ON "grade_levels"("tenantId", "level");

-- CreateIndex
CREATE INDEX "majors_tenantId_deletedAt_idx" ON "majors"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "majors_tenantId_code_key" ON "majors"("tenantId", "code");

-- CreateIndex
CREATE INDEX "classrooms_tenantId_deletedAt_idx" ON "classrooms"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "classrooms_tenantId_code_key" ON "classrooms"("tenantId", "code");

-- CreateIndex
CREATE INDEX "assignments_tenantId_deletedAt_idx" ON "assignments"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "assignments_courseId_status_idx" ON "assignments"("courseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_currentVersionId_key" ON "submissions"("currentVersionId");

-- CreateIndex
CREATE INDEX "submissions_tenantId_idx" ON "submissions"("tenantId");

-- CreateIndex
CREATE INDEX "submissions_assignmentId_status_idx" ON "submissions"("assignmentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_assignmentId_studentId_key" ON "submissions"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "submission_versions_tenantId_idx" ON "submission_versions"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "submission_versions_submissionId_versionNumber_key" ON "submission_versions"("submissionId", "versionNumber");

-- CreateIndex
CREATE INDEX "exams_tenantId_deletedAt_idx" ON "exams"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "exams_courseId_status_idx" ON "exams"("courseId", "status");

-- CreateIndex
CREATE INDEX "exam_attempts_tenantId_idx" ON "exam_attempts"("tenantId");

-- CreateIndex
CREATE INDEX "exam_attempts_examId_status_idx" ON "exam_attempts"("examId", "status");

-- CreateIndex
CREATE INDEX "exam_attempts_status_expectedEndTime_idx" ON "exam_attempts"("status", "expectedEndTime");

-- CreateIndex
CREATE UNIQUE INDEX "exam_attempts_examId_studentId_key" ON "exam_attempts"("examId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "questions_currentVersionId_key" ON "questions"("currentVersionId");

-- CreateIndex
CREATE INDEX "questions_tenantId_deletedAt_idx" ON "questions"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "questions_subjectId_type_idx" ON "questions"("subjectId", "type");

-- CreateIndex
CREATE INDEX "questions_tpId_idx" ON "questions"("tpId");

-- CreateIndex
CREATE INDEX "question_versions_tenantId_idx" ON "question_versions"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "question_versions_questionId_versionNumber_key" ON "question_versions"("questionId", "versionNumber");

-- CreateIndex
CREATE INDEX "rubrics_tenantId_deletedAt_idx" ON "rubrics"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "rubric_criteria_tenantId_idx" ON "rubric_criteria"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "rubric_criteria_rubricId_order_key" ON "rubric_criteria"("rubricId", "order");

-- CreateIndex
CREATE INDEX "rubric_scales_tenantId_idx" ON "rubric_scales"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "rubric_scales_criterionId_points_key" ON "rubric_scales"("criterionId", "points");

-- CreateIndex
CREATE UNIQUE INDEX "grade_formulas_courseId_key" ON "grade_formulas"("courseId");

-- CreateIndex
CREATE INDEX "grade_formulas_tenantId_idx" ON "grade_formulas"("tenantId");

-- CreateIndex
CREATE INDEX "grade_formula_components_tenantId_idx" ON "grade_formula_components"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "grade_formula_components_formulaId_sourceType_key" ON "grade_formula_components"("formulaId", "sourceType");

-- CreateIndex
CREATE INDEX "grade_ledgers_tenantId_studentId_courseId_idx" ON "grade_ledgers"("tenantId", "studentId", "courseId");

-- CreateIndex
CREATE INDEX "grade_ledgers_referenceId_entryType_idx" ON "grade_ledgers"("referenceId", "entryType");

-- CreateIndex
CREATE INDEX "grade_projections_tenantId_idx" ON "grade_projections"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "grade_projections_studentId_courseId_key" ON "grade_projections"("studentId", "courseId");

-- CreateIndex
CREATE INDEX "competency_summaries_tenantId_idx" ON "competency_summaries"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "competency_summaries_studentId_courseId_tpId_key" ON "competency_summaries"("studentId", "courseId", "tpId");

-- CreateIndex
CREATE UNIQUE INDEX "report_cards_verificationQrHash_key" ON "report_cards"("verificationQrHash");

-- CreateIndex
CREATE INDEX "report_cards_tenantId_idx" ON "report_cards"("tenantId");

-- CreateIndex
CREATE INDEX "report_cards_status_idx" ON "report_cards"("status");

-- CreateIndex
CREATE UNIQUE INDEX "report_cards_studentId_semesterId_key" ON "report_cards"("studentId", "semesterId");

-- CreateIndex
CREATE INDEX "report_card_items_tenantId_idx" ON "report_card_items"("tenantId");

-- CreateIndex
CREATE INDEX "user_sessions_tenantId_idx" ON "user_sessions"("tenantId");

-- CreateIndex
CREATE INDEX "user_sessions_userId_revokedAt_idx" ON "user_sessions"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_hashedToken_key" ON "refresh_tokens"("hashedToken");

-- CreateIndex
CREATE INDEX "refresh_tokens_tenantId_idx" ON "refresh_tokens"("tenantId");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_status_idx" ON "refresh_tokens"("userId", "status");

-- CreateIndex
CREATE INDEX "login_histories_tenantId_idx" ON "login_histories"("tenantId");

-- CreateIndex
CREATE INDEX "login_histories_userId_status_idx" ON "login_histories"("userId", "status");

-- CreateIndex
CREATE INDEX "login_histories_ipAddress_idx" ON "login_histories"("ipAddress");

-- CreateIndex
CREATE INDEX "login_attempts_tenantId_idx" ON "login_attempts"("tenantId");

-- CreateIndex
CREATE INDEX "login_attempts_userId_createdAt_idx" ON "login_attempts"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "login_attempts_ipAddress_createdAt_idx" ON "login_attempts"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "roles_tenantId_idx" ON "roles"("tenantId");

-- CreateIndex
CREATE INDEX "roles_deletedAt_idx" ON "roles"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenantId_slug_key" ON "roles"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_slug_key" ON "permissions"("slug");

-- CreateIndex
CREATE INDEX "role_permissions_roleId_idx" ON "role_permissions"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE INDEX "users_tenantId_status_idx" ON "users"("tenantId", "status");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_userId_key" ON "student_profiles"("userId");

-- CreateIndex
CREATE INDEX "student_profiles_tenantId_idx" ON "student_profiles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_tenantId_nis_key" ON "student_profiles"("tenantId", "nis");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_tenantId_nisn_key" ON "student_profiles"("tenantId", "nisn");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_profiles_userId_key" ON "teacher_profiles"("userId");

-- CreateIndex
CREATE INDEX "teacher_profiles_tenantId_idx" ON "teacher_profiles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_profiles_tenantId_nip_key" ON "teacher_profiles"("tenantId", "nip");

-- CreateIndex
CREATE INDEX "assets_tenantId_deletedAt_idx" ON "assets"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "assets_virusStatus_idx" ON "assets"("virusStatus");

-- CreateIndex
CREATE UNIQUE INDEX "assets_tenantId_fingerprint_key" ON "assets"("tenantId", "fingerprint");

-- CreateIndex
CREATE INDEX "courses_tenantId_deletedAt_idx" ON "courses"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "courses_classId_status_idx" ON "courses"("classId", "status");

-- CreateIndex
CREATE INDEX "courses_primaryTeacherId_status_idx" ON "courses"("primaryTeacherId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "courses_subjectId_classId_semesterId_key" ON "courses"("subjectId", "classId", "semesterId");

-- CreateIndex
CREATE INDEX "course_co_teachers_teacherId_idx" ON "course_co_teachers"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "course_co_teachers_courseId_teacherId_key" ON "course_co_teachers"("courseId", "teacherId");

-- CreateIndex
CREATE INDEX "chapters_tenantId_idx" ON "chapters"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_courseId_order_key" ON "chapters"("courseId", "order");

-- CreateIndex
CREATE INDEX "lessons_tenantId_idx" ON "lessons"("tenantId");

-- CreateIndex
CREATE INDEX "lessons_status_idx" ON "lessons"("status");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_chapterId_order_key" ON "lessons"("chapterId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "materials_currentVersionId_key" ON "materials"("currentVersionId");

-- CreateIndex
CREATE INDEX "materials_tenantId_idx" ON "materials"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "materials_lessonId_order_key" ON "materials"("lessonId", "order");

-- CreateIndex
CREATE INDEX "material_versions_tenantId_idx" ON "material_versions"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "material_versions_materialId_versionNumber_key" ON "material_versions"("materialId", "versionNumber");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_correlationId_idx" ON "audit_logs"("correlationId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_resource_idx" ON "audit_logs"("actorId", "resource");

-- CreateIndex
CREATE INDEX "webhook_endpoints_tenantId_status_idx" ON "webhook_endpoints"("tenantId", "status");

-- CreateIndex
CREATE INDEX "webhook_deliveries_status_nextRetryAt_idx" ON "webhook_deliveries"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "search_index_queues_status_createdAt_idx" ON "search_index_queues"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_tenantId_code_key" ON "notification_templates"("tenantId", "code");

-- CreateIndex
CREATE INDEX "notifications_tenantId_recipientId_createdAt_idx" ON "notifications"("tenantId", "recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_deliveries_notificationId_channel_idx" ON "notification_deliveries"("notificationId", "channel");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_idx" ON "notification_deliveries"("status");

-- CreateIndex
CREATE INDEX "outbox_events_tenantId_idx" ON "outbox_events"("tenantId");

-- CreateIndex
CREATE INDEX "outbox_events_status_availableAt_idx" ON "outbox_events"("status", "availableAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_tenantId_key_key" ON "system_settings"("tenantId", "key");

-- CreateIndex
CREATE INDEX "stored_files_tenantId_contextType_idx" ON "stored_files"("tenantId", "contextType");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_code_key" ON "tenants"("code");

-- CreateIndex
CREATE INDEX "tenants_deletedAt_idx" ON "tenants"("deletedAt");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "workspace_folders_tenantId_studentId_idx" ON "workspace_folders"("tenantId", "studentId");

-- CreateIndex
CREATE INDEX "workspace_notes_tenantId_studentId_courseId_idx" ON "workspace_notes"("tenantId", "studentId", "courseId");

-- CreateIndex
CREATE INDEX "workspace_notes_embeddingStatus_idx" ON "workspace_notes"("embeddingStatus");

-- CreateIndex
CREATE INDEX "workspace_bookmarks_tenantId_studentId_courseId_idx" ON "workspace_bookmarks"("tenantId", "studentId", "courseId");

-- CreateIndex
CREATE INDEX "workspace_reading_positions_tenantId_idx" ON "workspace_reading_positions"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_reading_positions_studentId_courseId_key" ON "workspace_reading_positions"("studentId", "courseId");

-- AddForeignKey
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_gradeLevelId_fkey" FOREIGN KEY ("gradeLevelId") REFERENCES "grade_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "majors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teacher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "submission_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_versions" ADD CONSTRAINT "submission_versions_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "question_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rubric_criteria" ADD CONSTRAINT "rubric_criteria_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "rubrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rubric_scales" ADD CONSTRAINT "rubric_scales_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "rubric_criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_formula_components" ADD CONSTRAINT "grade_formula_components_formulaId_fkey" FOREIGN KEY ("formulaId") REFERENCES "grade_formulas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_card_items" ADD CONSTRAINT "report_card_items_reportCardId_fkey" FOREIGN KEY ("reportCardId") REFERENCES "report_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "user_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_histories" ADD CONSTRAINT "login_histories_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "user_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_profiles" ADD CONSTRAINT "teacher_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_co_teachers" ADD CONSTRAINT "course_co_teachers_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "material_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_versions" ADD CONSTRAINT "material_versions_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_versions" ADD CONSTRAINT "material_versions_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_auditLogId_fkey" FOREIGN KEY ("auditLogId") REFERENCES "audit_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_attachments" ADD CONSTRAINT "audit_attachments_auditLogId_fkey" FOREIGN KEY ("auditLogId") REFERENCES "audit_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_notes" ADD CONSTRAINT "workspace_notes_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "workspace_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_bookmarks" ADD CONSTRAINT "workspace_bookmarks_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "workspace_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
