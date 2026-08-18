import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './core/config/env';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaAuthRepository } from './modules/auth/prisma-auth.repository';
import { AuthService } from './modules/auth/auth.service';
import { SessionService } from './modules/auth/session.service';
import { AuthController } from './modules/auth/auth.controller';
import { createAuthRoutes } from './modules/auth/auth.routes';
import { buildAssessmentModule } from './modules/assessment';
import { buildGradebookModule } from './modules/gradebook';
import { GlobalErrorMiddleware } from './core/middleware/error.middleware';
import { Logger } from './core/infrastructure/observability/logger/logger';
import { MemoryEventBus } from './core/infrastructure/events/event-bus';
import { RequestContextService } from './core/context/request-context.service';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { spawn, execFile } from 'child_process';

// --- GLOBAL BIGINT SERIALIZATION FIX ---
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = express();

const storagePath = path.join(process.cwd(), 'storage');
if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, storagePath),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    }
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    // Basic MIME type validation expanded for MVP
    const allowedMimes = [
      'application/pdf',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-zip-compressed',
      'audio/mpeg', 'audio/wav', 'audio/ogg'
    ];
    // Allow more forgiving checks for generic types
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type (${file.mimetype}). Only PDF, Media, and Office files are allowed.`));
    }
  }
});

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Simple correlation ID middleware
app.use((req, res, next) => {
  const correlationId = req.header('x-correlation-id') || crypto.randomUUID();
  RequestContextService.run({ correlationId, requestId: crypto.randomUUID() }, () => {
    next();
  });
});

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const eventBus = new MemoryEventBus();

// Auth Module wiring
const authRepo = new PrismaAuthRepository(prisma);
const authService = new AuthService(authRepo, eventBus);
const sessionService = new SessionService(authRepo, eventBus);
const authController = new AuthController(authService, sessionService);
const authRoutes = createAuthRoutes(authController);

app.use('/api/auth', authRoutes);

// Auth Middleware for MVP
// Fetches user + role once per request and attaches to req.user,
// eliminating per-endpoint N+1 role lookups across all protected routes.
const requireAuth = async (req: any, res: any, next: any) => {
  const token = req.cookies?.accessToken || req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
    // Single DB hit: fetch user with role, valid for the lifetime of this request
    const userWithRole = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, 
        tenantId: true, 
        deletedAt: true, 
        role: { select: { slug: true } },
        teacherProfile: { select: { id: true } },
        studentProfile: { select: { id: true } }
      }
    });
    if (!userWithRole || userWithRole.deletedAt) {
      return res.status(401).json({ error: 'User not found or deactivated' });
    }
    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      sessionId: decoded.sessionId,
      roleSlug: userWithRole.role.slug,
      teacherId: userWithRole.teacherProfile?.id,
      studentId: userWithRole.studentProfile?.id
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Assessment Engine (Clean Architecture module)
const assessmentRoutes = buildAssessmentModule(prisma);
app.use('/api/assessment', requireAuth, assessmentRoutes);

// Gradebook Engine (Clean Architecture module)
const gradebookRoutes = buildGradebookModule(prisma);
app.use('/api/gradebook', requireAuth, gradebookRoutes);

app.get('/api/users/me', requireAuth, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { role: true }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId }
    });

    res.json({ ...user, tenant });
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to fetch me');
    res.status(500).json({ error: 'Server error' });
  }
});

// Users Management MVP
app.get('/api/users', requireAuth, async (req: any, res: any) => {
  try {
    const { q, roleId, status, page = 1, limit = 20, sortBy = 'createdAt', sortDir = 'desc' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const where: any = { tenantId: req.user.tenantId, deletedAt: null };
    if (q) {
      where.OR = [
        { email: { contains: q as string, mode: 'insensitive' } },
        { studentProfile: { fullName: { contains: q as string, mode: 'insensitive' } } },
        { teacherProfile: { fullName: { contains: q as string, mode: 'insensitive' } } },
      ];
    }
    if (roleId) where.roleId = roleId;
    if (status) where.status = status;

    const validSortFields = ['createdAt', 'email', 'status'];
    const orderField = validSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          role: { select: { id: true, name: true, slug: true } },
          studentProfile: { select: { fullName: true, nis: true } },
          teacherProfile: { select: { fullName: true, nip: true } }
        },
        orderBy: { [orderField]: sortDir === 'asc' ? 'asc' : 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      })
    ]);

    const mapped = users.map((u: any) => ({
      ...u,
      name: u.studentProfile?.fullName || u.teacherProfile?.fullName || 'No Profile'
    }));

    res.json({
      data: mapped,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to fetch users');
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users', requireAuth, async (req: any, res: any) => {
  try {
    const { email, roleId, status, password, profile } = req.body;
    
    // Simple hash just for MVP
    const { HashUtil } = require('./shared/utils/hash.util');
    const passwordHash = await HashUtil.hash(password || 'password123');

    const newUser = await prisma.user.create({
      data: {
        tenantId: req.user.tenantId,
        email,
        passwordHash,
        roleId,
        status: status || 'ACTIVE',
      },
      include: { role: true }
    });

    res.json(newUser);
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to create user');
    if (error.code === 'P2002') return res.status(400).json({ error: 'Email already exists' });
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.put('/api/users/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { email, roleId, status, password } = req.body;
    
    const data: any = { email, roleId, status };
    if (password) {
      const { HashUtil } = require('./shared/utils/hash.util');
      data.passwordHash = await HashUtil.hash(password);
    }

    const updated = await prisma.user.updateMany({
      where: { id, tenantId: req.user.tenantId },
      data
    });
    res.json(updated);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Email already exists' });
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.delete('/api/users/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    await prisma.user.updateMany({
      where: { id, tenantId: req.user.tenantId },
      data: { deletedAt: new Date() }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.get('/api/roles', requireAuth, async (req: any, res: any) => {
  const roles = await prisma.role.findMany({
    where: { tenantId: req.user.tenantId }
  });
  res.json(roles);
});

// Tenants list for login page
app.get('/api/tenants', async (req, res) => {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, code: true }
  });
  res.json(tenants);
});

// --- ACADEMIC YEAR MANAGEMENT MVP ---

app.get('/api/academic-years', requireAuth, async (req: any, res: any) => {
  try {
    const years = await prisma.academicYear.findMany({
      where: { tenantId: req.user.tenantId, deletedAt: null },
      orderBy: { startDate: 'desc' }
    });
    res.json(years);
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to fetch academic years');
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/academic-years', requireAuth, async (req: any, res: any) => {
  try {
    const { name, startDate, endDate, status } = req.body;
    
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }
    
    // Parse to Date objects to satisfy Prisma schema (db.Date)
    const newYear = await prisma.academicYear.create({
      data: {
        tenantId: req.user.tenantId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status || 'DRAFT'
      }
    });
    
    res.status(201).json(newYear);
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to create academic year');
    if (error.code === 'P2002') return res.status(400).json({ error: 'Academic year name already exists' });
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.put('/api/academic-years/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { name, startDate, endDate, status } = req.body;
    
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }

    const updated = await prisma.academicYear.updateMany({
      where: { id, tenantId: req.user.tenantId },
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status
      }
    });
    
    res.json(updated);
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to update academic year');
    if (error.code === 'P2002') return res.status(400).json({ error: 'Academic year name already exists' });
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.delete('/api/academic-years/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // Soft delete
    await prisma.academicYear.updateMany({
      where: { id, tenantId: req.user.tenantId },
      data: { deletedAt: new Date() }
    });
    
    res.json({ success: true });
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to delete academic year');
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- CLASS MANAGEMENT MVP ---

app.get('/api/academic-master', requireAuth, async (req: any, res: any) => {
  try {
    const grades = await prisma.gradeLevel.findMany({ where: { tenantId: req.user.tenantId, deletedAt: null } });
    const majors = await prisma.major.findMany({ where: { tenantId: req.user.tenantId, deletedAt: null } });
    const classrooms = await prisma.classroom.findMany({ where: { tenantId: req.user.tenantId, deletedAt: null } });
    const subjects = await prisma.subject.findMany({ where: { tenantId: req.user.tenantId, deletedAt: null } });
    
    // Get active semester
    const semester = await prisma.semester.findFirst({
      where: { tenantId: req.user.tenantId, status: 'RUNNING', deletedAt: null },
      include: { academicYear: true }
    });
    
    res.json({ grades, majors, classrooms, subjects, activeSemester: semester });
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to fetch academic master data');
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/classes', requireAuth, async (req: any, res: any) => {
  try {
    const semesterId = req.query.semesterId;
    const classes = await prisma.class.findMany({
      where: { 
        tenantId: req.user.tenantId, 
        deletedAt: null,
        ...(semesterId ? { semesterId: semesterId as string } : {})
      },
      include: {
        gradeLevel: true,
        major: true,
        classroom: true,
        semester: { include: { academicYear: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(classes);
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to fetch classes');
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/classes', requireAuth, async (req: any, res: any) => {
  try {
    const { code, name, gradeLevelId, majorId, classroomId, semesterId } = req.body;
    
    const newClass = await prisma.class.create({
      data: {
        tenantId: req.user.tenantId,
        code,
        name,
        gradeLevelId,
        majorId,
        classroomId: classroomId || null,
        semesterId
      }
    });
    
    res.status(201).json(newClass);
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to create class');
    if (error.code === 'P2002') return res.status(400).json({ error: 'Class code or name already exists in this semester' });
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.put('/api/classes/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { code, name, gradeLevelId, majorId, classroomId } = req.body;
    
    const updated = await prisma.class.updateMany({
      where: { id, tenantId: req.user.tenantId },
      data: {
        code,
        name,
        gradeLevelId,
        majorId,
        classroomId: classroomId || null
      }
    });
    
    res.json(updated);
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to update class');
    if (error.code === 'P2002') return res.status(400).json({ error: 'Class code or name already exists in this semester' });
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.delete('/api/classes/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    await prisma.class.updateMany({
      where: { id, tenantId: req.user.tenantId },
      data: { deletedAt: new Date() }
    });
    res.json({ success: true });
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to delete class');
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- STUDENT MANAGEMENT MVP ---

app.get('/api/students', requireAuth, async (req: any, res: any) => {
  try {
    const { q, classId, gradeLevelId, majorId, status, page = 1, limit = 10, sortBy = 'createdAt', sortDir = 'desc' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Build the query
    const where: any = { tenantId: req.user.tenantId, user: { deletedAt: null } };

    // Search by NIS or Name
    if (q) {
      where.OR = [
        { nis: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } }
      ];
    }

    // Filter by User status
    if (status) {
      where.user.status = status as string;
    }

    // Filter by Enrollment class
    if (classId) {
      where.studentEnrollments = {
        some: { classId: classId as string, status: 'ACTIVE' }
      };
    } else if (gradeLevelId || majorId) {
      where.studentEnrollments = {
        some: { 
          status: 'ACTIVE',
          class: {
            ...(gradeLevelId ? { gradeLevelId: gradeLevelId as string } : {}),
            ...(majorId ? { majorId: majorId as string } : {})
          }
        }
      };
    }

    const total = await prisma.studentProfile.count({ where });
    const students = await prisma.studentProfile.findMany({
      where,
      include: {
        user: { select: { email: true, status: true } },
        studentEnrollments: {
          where: { status: 'ACTIVE' },
          include: { class: { include: { gradeLevel: true, major: true } } },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { [(['createdAt', 'fullName', 'nis', 'updatedAt'].includes(sortBy as string) ? sortBy as string : 'createdAt')]: sortDir === 'asc' ? 'asc' : 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });

    res.json({
      data: students,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to fetch students');
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

app.post('/api/students', requireAuth, async (req: any, res: any) => {
  try {
    const {
      nis, nisn, fullName, gender, birthPlace, birthDate, religion,
      address, phone, parentName, parentPhone, email, status, classId
    } = req.body;

    // Validate active semester
    const activeSemester = await prisma.semester.findFirst({
      where: { tenantId: req.user.tenantId, status: 'RUNNING', deletedAt: null }
    });

    if (!activeSemester) {
      return res.status(400).json({ error: 'Tidak dapat membuat siswa karena tidak ada semester RUNNING.' });
    }

    // Find student role
    const role = await prisma.role.findFirst({
      where: { tenantId: req.user.tenantId, slug: 'student' }
    });

    if (!role) {
      return res.status(400).json({ error: 'Student role not found in system.' });
    }

    const { HashUtil } = require('./shared/utils/hash.util');
    const passwordHash = await HashUtil.hash(nis); // Default password is NIS

    // Use transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const newUser = await tx.user.create({
        data: {
          tenantId: req.user.tenantId,
          email: email || `${nis}@student.local`,
          passwordHash,
          roleId: role.id,
          status: status || 'ACTIVE',
        }
      });

      // 2. Create Profile
      const profile = await tx.studentProfile.create({
        data: {
          tenantId: req.user.tenantId,
          userId: newUser.id,
          nis,
          nisn,
          fullName,
          gender,
          birthPlace,
          birthDate: birthDate ? new Date(birthDate) : null,
          religion,
          address,
          phone,
          parentName,
          parentPhone,
          createdById: req.user.userId
        }
      });

      // 3. Create Enrollment if classId provided
      if (classId) {
        await tx.studentEnrollment.create({
          data: {
            tenantId: req.user.tenantId,
            studentId: profile.id,
            classId,
            semesterId: activeSemester.id,
            status: 'ACTIVE',
            createdById: req.user.userId
          }
        });
      } else {
        throw new Error('Tidak boleh membuat siswa tanpa kelas aktif');
      }

      return profile;
    });

    res.status(201).json(result);
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to create student');
    if (error.code === 'P2002') return res.status(400).json({ error: 'NIS, NISN, atau Email sudah terdaftar.' });
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.put('/api/students/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const {
      nis, nisn, fullName, gender, birthPlace, birthDate, religion,
      address, phone, parentName, parentPhone, email, status, classId
    } = req.body;

    const activeSemester = await prisma.semester.findFirst({
      where: { tenantId: req.user.tenantId, status: 'RUNNING', deletedAt: null }
    });

    if (!activeSemester) {
      return res.status(400).json({ error: 'Tidak ada semester RUNNING.' });
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { id, tenantId: req.user.tenantId }
    });

    if (!profile) return res.status(404).json({ error: 'Siswa tidak ditemukan' });

    await prisma.$transaction(async (tx) => {
      // 1. Update Profile
      await tx.studentProfile.update({
        where: { id },
        data: {
          nis, nisn, fullName, gender, birthPlace, 
          birthDate: birthDate ? new Date(birthDate) : null,
          religion, address, phone, parentName, parentPhone,
          updatedById: req.user.userId
        }
      });

      // 2. Update User
      await tx.user.update({
        where: { id: profile.userId },
        data: { email, status }
      });

      // 3. Update Enrollment
      if (classId) {
        // Find active enrollment in current semester
        const existingEnrollment = await tx.studentEnrollment.findFirst({
          where: { studentId: profile.id, semesterId: activeSemester.id, status: 'ACTIVE' }
        });

        if (existingEnrollment) {
          if (existingEnrollment.classId !== classId) {
            await tx.studentEnrollment.update({
              where: { id: existingEnrollment.id },
              data: { classId, updatedById: req.user.userId }
            });
          }
        } else {
          await tx.studentEnrollment.create({
            data: {
              tenantId: req.user.tenantId,
              studentId: profile.id,
              classId,
              semesterId: activeSemester.id,
              status: 'ACTIVE',
              createdById: req.user.userId
            }
          });
        }
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to update student');
    if (error.code === 'P2002') return res.status(400).json({ error: 'NIS, NISN, atau Email sudah terdaftar.' });
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.delete('/api/students/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const profile = await prisma.studentProfile.findUnique({
      where: { id, tenantId: req.user.tenantId }
    });

    if (!profile) return res.status(404).json({ error: 'Not found' });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: profile.userId },
        data: { deletedAt: new Date() }
      });

      await tx.studentEnrollment.updateMany({
        where: { studentId: id },
        data: { deletedAt: new Date(), updatedById: req.user.userId }
      });
    });

    res.json({ success: true });
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to delete student');
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- TEACHER MANAGEMENT MVP ---

app.get('/api/teachers', requireAuth, async (req: any, res: any) => {
  try {
    const { q, status, specialization, page = 1, limit = 10, sortBy = 'createdAt', sortDir = 'desc' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const where: any = { tenantId: req.user.tenantId, user: { deletedAt: null } };

    if (q) {
      where.OR = [
        { nip: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } }
      ];
    }

    if (status) where.user.status = status as string;
    if (specialization) where.specialization = { contains: specialization, mode: 'insensitive' };

    const total = await prisma.teacherProfile.count({ where });
    const teachers = await prisma.teacherProfile.findMany({
      where,
      include: {
        user: { select: { email: true, status: true } },
      },
      orderBy: { [(['createdAt', 'fullName', 'nip', 'updatedAt'].includes(sortBy as string) ? sortBy as string : 'createdAt')]: sortDir === 'asc' ? 'asc' : 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });

    res.json({
      data: teachers,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to fetch teachers');
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

app.post('/api/teachers', requireAuth, async (req: any, res: any) => {
  try {
    const {
      nip, nuptk, fullName, gender, birthPlace, birthDate, religion,
      address, phone, specialization, email, status
    } = req.body;

    const role = await prisma.role.findFirst({
      where: { tenantId: req.user.tenantId, slug: 'teacher' }
    });

    if (!role) {
      return res.status(400).json({ error: 'Teacher role not found in system.' });
    }

    const { HashUtil } = require('./shared/utils/hash.util');
    const passwordHash = await HashUtil.hash(nip); // Default password is NIP

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          tenantId: req.user.tenantId,
          email: email || `${nip}@teacher.local`,
          passwordHash,
          roleId: role.id,
          status: status || 'ACTIVE',
        }
      });

      const profile = await tx.teacherProfile.create({
        data: {
          tenantId: req.user.tenantId,
          userId: newUser.id,
          nip,
          nuptk,
          fullName,
          gender,
          birthPlace,
          birthDate: birthDate ? new Date(birthDate) : null,
          religion,
          address,
          phone,
          specialization,
          createdById: req.user.userId
        }
      });

      return profile;
    });

    res.status(201).json(result);
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to create teacher');
    if (error.code === 'P2002') return res.status(400).json({ error: 'NIP, NUPTK, atau Email sudah terdaftar.' });
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.put('/api/teachers/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const {
      nip, nuptk, fullName, gender, birthPlace, birthDate, religion,
      address, phone, specialization, email, status
    } = req.body;

    const profile = await prisma.teacherProfile.findUnique({
      where: { id, tenantId: req.user.tenantId }
    });

    if (!profile) return res.status(404).json({ error: 'Guru tidak ditemukan' });

    await prisma.$transaction(async (tx) => {
      await tx.teacherProfile.update({
        where: { id },
        data: {
          nip, nuptk, fullName, gender, birthPlace, 
          birthDate: birthDate ? new Date(birthDate) : null,
          religion, address, phone, specialization,
          updatedById: req.user.userId
        }
      });

      await tx.user.update({
        where: { id: profile.userId },
        data: { email, status }
      });
    });

    res.json({ success: true });
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to update teacher');
    if (error.code === 'P2002') return res.status(400).json({ error: 'NIP, NUPTK, atau Email sudah terdaftar.' });
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.delete('/api/teachers/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const profile = await prisma.teacherProfile.findUnique({
      where: { id, tenantId: req.user.tenantId }
    });

    if (!profile) return res.status(404).json({ error: 'Not found' });

    await prisma.user.update({
      where: { id: profile.userId },
      data: { deletedAt: new Date() }
    });

    res.json({ success: true });
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to delete teacher');
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- ENROLLMENT MANAGEMENT MVP ---

app.get('/api/enrollments', requireAuth, async (req: any, res: any) => {
  try {
    const { q, classId, semesterId, status, page = 1, limit = 10, sortBy = 'createdAt', sortDir = 'desc' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const where: any = { tenantId: req.user.tenantId, deletedAt: null };

    if (q) {
      where.student = {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { nis: { contains: q, mode: 'insensitive' } }
        ]
      };
    }

    if (classId) where.classId = classId;
    if (semesterId) where.semesterId = semesterId;
    if (status) where.status = status;

    const total = await prisma.studentEnrollment.count({ where });
    const enrollments = await prisma.studentEnrollment.findMany({
      where,
      include: {
        student: true,
        class: { include: { gradeLevel: true, major: true } },
        semester: { include: { academicYear: true } }
      },
      orderBy: { [(['createdAt', 'updatedAt', 'status'].includes(sortBy as string) ? sortBy as string : 'createdAt')]: sortDir === 'asc' ? 'asc' : 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });

    res.json({
      data: enrollments,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to fetch enrollments');
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/enrollments', requireAuth, async (req: any, res: any) => {
  try {
    const { studentId, classId, semesterId } = req.body;

    // Ownership checks: all foreign keys MUST belong to caller's tenant
    const [semester, student, cls] = await Promise.all([
      prisma.semester.findUnique({ where: { id: semesterId, tenantId: req.user.tenantId } }),
      prisma.studentProfile.findUnique({ where: { id: studentId, tenantId: req.user.tenantId } }),
      prisma.class.findUnique({ where: { id: classId, tenantId: req.user.tenantId, deletedAt: null } }),
    ]);

    if (!semester) return res.status(404).json({ error: 'Semester not found' });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    if (semester.status === 'CLOSED') return res.status(400).json({ error: 'Cannot assign to a CLOSED semester' });
    if (semester.status !== 'RUNNING') return res.status(400).json({ error: 'Semester is not RUNNING' });

    // Use transaction to prevent Race Condition on checking active enrollment
    const newEnrollment = await prisma.$transaction(async (tx) => {
      const existing = await tx.studentEnrollment.findFirst({
        where: { studentId, semesterId, status: 'ACTIVE', deletedAt: null }
      });
      if (existing) throw new Error('Student already has an active enrollment in this semester');

      return await tx.studentEnrollment.create({
        data: {
          tenantId: req.user.tenantId,
          studentId,
          classId,
          semesterId,
          status: 'ACTIVE',
          createdById: req.user.userId
        }
      });
    });

    res.status(201).json(newEnrollment);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.post('/api/enrollments/bulk', requireAuth, async (req: any, res: any) => {
  try {
    const { studentIds, classId, semesterId } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'No students selected' });
    }

    // Ownership checks: foreign keys MUST belong to caller's tenant
    const [semester, cls] = await Promise.all([
      prisma.semester.findUnique({ where: { id: semesterId, tenantId: req.user.tenantId } }),
      prisma.class.findUnique({ where: { id: classId, tenantId: req.user.tenantId, deletedAt: null } })
    ]);

    if (!semester) return res.status(404).json({ error: 'Semester not found' });
    if (semester.status !== 'RUNNING') return res.status(400).json({ error: 'Semester is not RUNNING' });
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    // Validate all students belong to the tenant
    const validStudents = await prisma.studentProfile.count({
      where: {
        id: { in: studentIds },
        tenantId: req.user.tenantId
      }
    });

    if (validStudents !== studentIds.length) {
      return res.status(403).json({ error: 'One or more students do not exist or belong to another tenant' });
    }

    const results = await prisma.$transaction(async (tx) => {
      const existing = await tx.studentEnrollment.findMany({
        where: { studentId: { in: studentIds }, semesterId, status: 'ACTIVE', deletedAt: null }
      });
      const existingIds = new Set(existing.map((e: any) => e.studentId));
      const toCreate = studentIds.filter((id: string) => !existingIds.has(id));

      if (toCreate.length > 0) {
        await tx.studentEnrollment.createMany({
          data: toCreate.map((studentId: string) => ({
            tenantId: req.user.tenantId,
            studentId,
            classId,
            semesterId,
            status: 'ACTIVE',
            createdById: req.user.userId
          }))
        });
      }
      return toCreate.length;
    });

    res.json({ success: true, count: results });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.post('/api/enrollments/:id/move', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { newClassId } = req.body;

    const oldEnrollment = await prisma.studentEnrollment.findUnique({ where: { id, tenantId: req.user.tenantId } });
    if (!oldEnrollment) return res.status(404).json({ error: 'Enrollment not found' });
    if (oldEnrollment.status !== 'ACTIVE') return res.status(400).json({ error: 'Can only move active enrollments' });
    if (oldEnrollment.classId === newClassId) return res.status(400).json({ error: 'Cannot move to the same class' });

    // Ownership check: target class MUST belong to caller's tenant
    const targetClass = await prisma.class.findUnique({ where: { id: newClassId, tenantId: req.user.tenantId, deletedAt: null } });
    if (!targetClass) return res.status(404).json({ error: 'Target class not found' });

    const result = await prisma.$transaction(async (tx) => {
      await tx.studentEnrollment.update({
        where: { id },
        data: { status: 'TRANSFERRED', updatedById: req.user.userId }
      });

      return await tx.studentEnrollment.create({
        data: {
          tenantId: req.user.tenantId,
          studentId: oldEnrollment.studentId,
          semesterId: oldEnrollment.semesterId,
          classId: newClassId,
          status: 'ACTIVE',
          createdById: req.user.userId
        }
      });
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.post('/api/enrollments/:id/status', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // GRADUATED, WITHDRAWN, etc.
    
    if (!['GRADUATED', 'WITHDRAWN', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = await prisma.studentEnrollment.updateMany({
      where: { id, tenantId: req.user.tenantId },
      data: { status, updatedById: req.user.userId }
    });

    res.json({ success: true, updated });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.get('/api/enrollments/history/:studentId', requireAuth, async (req: any, res: any) => {
  try {
    const { studentId } = req.params;
    const history = await prisma.studentEnrollment.findMany({
      where: { studentId, tenantId: req.user.tenantId, deletedAt: null },
      include: {
        class: { include: { gradeLevel: true, major: true } },
        semester: { include: { academicYear: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(history);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- COURSE MANAGEMENT MVP ---

app.get('/api/courses', requireAuth, async (req: any, res: any) => {
  try {
    const { q, semesterId, academicYearId, subjectId, teacherId, status, page = 1, limit = 10, sortBy = 'createdAt', sortDir = 'desc' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const where: any = { tenantId: req.user.tenantId, deletedAt: null };

    if (q) {
      where.OR = [
        { subject: { name: { contains: q, mode: 'insensitive' } } },
        { class: { name: { contains: q, mode: 'insensitive' } } }
      ];
    }

    if (semesterId) where.semesterId = semesterId;
    if (academicYearId) where.academicYearId = academicYearId;
    if (subjectId) where.subjectId = subjectId;
    if (teacherId) where.primaryTeacherId = teacherId;
    if (status) where.status = status;

    // RBAC: If Teacher, only see their own courses
    const userRole = req.user.roleSlug;
    if (userRole === 'teacher') {
      const teacherId = req.user.teacherId;
      if (!teacherId) {
        // Teacher has no profile yet, return empty list instead of all courses
        return res.json({ data: [], meta: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 } });
      }
      
      where.OR = [
        ...(where.OR || []),
        { primaryTeacherId: teacherId },
        { coTeachers: { some: { teacherId: teacherId } } }
      ];
    }

    const total = await prisma.course.count({ where });
    
    // We need student count which comes from active enrollments in the same class and semester.
    const courses = await prisma.course.findMany({
      where,
      include: {
        subject: true,
        class: {
          include: {
            _count: {
              select: {
                enrollments: { where: { status: 'ACTIVE', semesterId: semesterId ? (semesterId as string) : undefined } }
              }
            }
          }
        },
        academicYear: true,
        semester: true,
        primaryTeacher: true,
        coTeachers: { include: { teacher: true } },
        chapters: {
          include: {
            lessons: {
              include: {
                materials: {
                  select: { currentVersionId: true }
                }
              }
            }
          }
        }
      },
      orderBy: { [(['createdAt', 'updatedAt', 'status'].includes(sortBy as string) ? sortBy as string : 'createdAt')]: sortDir === 'asc' ? 'asc' : 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });

    const mapped = courses.map((c: any) => {
      let publishedCount = 0;
      let draftCount = 0;
      c.chapters.forEach((ch: any) => {
        ch.lessons.forEach((ls: any) => {
          ls.materials.forEach((mat: any) => {
            if (mat.currentVersionId) publishedCount++;
            else draftCount++;
          });
        });
      });

      // Remove the heavy chapters payload before sending to frontend
      const { chapters, ...courseData } = c;

      return {
        ...courseData,
        studentCount: c.class._count.enrollments,
        totalMaterials: publishedCount + draftCount,
        publishedCount,
        draftCount
      };
    });

    res.json({
      data: mapped,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to fetch courses');
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/courses/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const course = await prisma.course.findUnique({
      where: { id, tenantId: req.user.tenantId },
      include: {
        subject: true,
        class: {
          include: { 
            gradeLevel: true, 
            major: true,
            enrollments: { 
              where: { status: 'ACTIVE' },
              include: { student: { include: { user: true } } }
            }
          }
        },
        academicYear: true,
        semester: true,
        primaryTeacher: { include: { user: true } },
        coTeachers: { include: { teacher: true } },
        _count: {
          select: { chapters: true }
        }
      }
    });

    if (!course) return res.status(404).json({ error: 'Course not found' });

    // Fetch activities and counts separately with optimized queries
    const materials = await prisma.material.findMany({
      where: { lesson: { chapter: { courseId: id } } },
      select: { 
        id: true, type: true, createdAt: true, updatedAt: true, currentVersionId: true,
        activeVersion: { select: { title: true, versionNumber: true } },
        lesson: { select: { title: true } }
      }
    });

    const chapters = await prisma.chapter.findMany({
      where: { courseId: id },
      select: { id: true, title: true, createdAt: true, _count: { select: { lessons: true } } }
    });

    const lessons = await prisma.lesson.findMany({
      where: { chapter: { courseId: id } },
      select: { id: true, title: true, createdAt: true }
    });

    let publishedCount = 0;
    let draftCount = 0;
    const activities: any[] = [];
    const latestMaterials: any[] = [];

    chapters.forEach((ch: any) => activities.push({ id: ch.id, type: 'CHAPTER_CREATED', title: `Created chapter: ${ch.title}`, date: ch.createdAt }));
    lessons.forEach((ls: any) => activities.push({ id: ls.id, type: 'LESSON_CREATED', title: `Added lesson: ${ls.title}`, date: ls.createdAt }));

    materials.forEach((mat: any) => {
      if (mat.currentVersionId) {
        publishedCount++;
        activities.push({ id: mat.id, type: 'MATERIAL_PUBLISHED', title: `Published material: ${mat.activeVersion?.title || mat.type}`, date: mat.updatedAt });
        latestMaterials.push(mat);
      } else {
        draftCount++;
        activities.push({ id: mat.id, type: 'MATERIAL_DRAFTED', title: `Drafted material: ${mat.activeVersion?.title || mat.type}`, date: mat.createdAt });
      }
    });

    // Sort activities latest first, take top 10
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    latestMaterials.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const payload = {
      ...course,
      studentCount: course.class.enrollments.length,
      materialCount: materials.length,
      publishedCount,
      draftCount,
      students: course.class.enrollments.map((e: any) => e.student),
      activities: activities.slice(0, 10),
      latestMaterials: latestMaterials.slice(0, 5),
      chapters // Provide minimal chapter data for UI counts
    };

    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.post('/api/courses', requireAuth, async (req: any, res: any) => {
  try {
    const { subjectId, classId, semesterId, primaryTeacherId } = req.body;

    const semester = await prisma.semester.findUnique({ where: { id: semesterId, tenantId: req.user.tenantId } });
    if (!semester || semester.status !== 'RUNNING') {
      return res.status(400).json({ error: 'Semester is not RUNNING' });
    }

    const cls = await prisma.class.findUnique({ where: { id: classId, tenantId: req.user.tenantId, deletedAt: null } });
    if (!cls) return res.status(400).json({ error: 'Class not found or deleted' });

    const teacher = await prisma.teacherProfile.findUnique({ 
      where: { id: primaryTeacherId, tenantId: req.user.tenantId },
      include: { user: true }
    });
    // Assuming roleId logic or user status
    if (!teacher || teacher.user.deletedAt) return res.status(400).json({ error: 'Invalid teacher' });

    const newCourse = await prisma.course.create({
      data: {
        tenantId: req.user.tenantId,
        academicYearId: semester.academicYearId,
        semesterId,
        subjectId,
        classId,
        primaryTeacherId,
        status: 'DRAFT',
        createdById: req.user.userId
      }
    });

    res.status(201).json(newCourse);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Course already exists for this subject, class, and semester' });
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.put('/api/courses/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { subjectId, classId, primaryTeacherId } = req.body;

    const updated = await prisma.course.updateMany({
      where: { id, tenantId: req.user.tenantId },
      data: { subjectId, classId, primaryTeacherId, updatedById: req.user.userId }
    });

    res.json(updated);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Course already exists for this subject, class, and semester' });
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.post('/api/courses/:id/status', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // DRAFT, PLANNED, ACTIVE, COMPLETED, ARCHIVED

    await prisma.course.updateMany({
      where: { id, tenantId: req.user.tenantId },
      data: { status, updatedById: req.user.userId }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.delete('/api/courses/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    await prisma.course.updateMany({
      where: { id, tenantId: req.user.tenantId },
      data: { deletedAt: new Date(), updatedById: req.user.userId }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.post('/api/courses/:id/co-teachers', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { teacherId, role } = req.body;

    const course = await prisma.course.findUnique({ where: { id, tenantId: req.user.tenantId } });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    
    if (course.primaryTeacherId === teacherId) {
      return res.status(400).json({ error: 'Primary teacher cannot be added as co-teacher' });
    }

    const coTeacher = await prisma.courseCoTeacher.create({
      data: { courseId: id, teacherId, role: role || 'ASSISTANT' }
    });

    res.json(coTeacher);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Teacher is already a co-teacher for this course' });
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.delete('/api/courses/:id/co-teachers/:teacherId', requireAuth, async (req: any, res: any) => {
  try {
    const { id, teacherId } = req.params;
    
    // Validate ownership
    const course = await prisma.course.findUnique({ where: { id, tenantId: req.user.tenantId } });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    await prisma.courseCoTeacher.delete({
      where: { courseId_teacherId: { courseId: id, teacherId } }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.get('/api/subjects', requireAuth, async (req: any, res: any) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: { tenantId: req.user.tenantId, deletedAt: null },
      orderBy: { name: 'asc' }
    });
    res.json(subjects);
  } catch (error: any) {
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- LEARNING CONTENT MVP ---

app.get('/api/learning/tree', requireAuth, async (req: any, res: any) => {
  try {
    const { courseId, q, status } = req.query;
    const userRole = req.user.roleSlug;

    const where: any = { tenantId: req.user.tenantId, deletedAt: null };
    if (courseId) where.id = courseId;
    
    // RBAC: Teacher ownership
    if (userRole === 'teacher') {
      const teacher = { id: req.user.teacherId };
      if (teacher) {
        where.OR = [
          { primaryTeacherId: teacher.id },
          { coTeachers: { some: { teacherId: teacher.id } } }
        ];
      }
    }

    // RBAC: Student enrollment
    if (userRole === 'student') {
      const student = { id: req.user.studentId };
      if (student) {
        where.class = {
          enrollments: { some: { studentId: student.id, status: 'ACTIVE' } }
        };
      }
    }

    const lessonWhere = userRole === 'student' ? { status: 'PUBLISHED' } : {};
    const materialWhere = userRole === 'student' ? { currentVersionId: { not: null } } : {};

    // We only fetch courses the user has access to or all for admin
    const courses = await prisma.course.findMany({
      where,
      include: {
        subject: true,
        class: true,
        chapters: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              where: lessonWhere,
              orderBy: { order: 'asc' },
              include: {
                materials: {
                  where: materialWhere,
                  orderBy: { order: 'asc' },
                  include: {
                    activeVersion: {
                      include: { asset: true }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(courses);
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to fetch learning tree');
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/learning/chapters', requireAuth, async (req: any, res: any) => {
  try {
    const { courseId, title, description } = req.body;
    
    // Validate parent ownership
    const parent = await prisma.course.findUnique({ where: { id: courseId, tenantId: req.user.tenantId, deletedAt: null } });
    if (!parent) return res.status(404).json({ error: 'Course not found' });

    const count = await prisma.chapter.count({ where: { courseId } });
    const chapter = await prisma.chapter.create({
      data: {
        tenantId: req.user.tenantId,
        courseId,
        title,
        description,
        order: count + 1
      }
    });
    res.status(201).json(chapter);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.put('/api/learning/chapters/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { title, description } = req.body;
    const chapter = await prisma.chapter.updateMany({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      data: { title, description }
    });
    res.json(chapter);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.post('/api/learning/lessons', requireAuth, async (req: any, res: any) => {
  try {
    const { chapterId, title, description, estimatedDuration } = req.body;
    
    // Validate parent ownership
    const parent = await prisma.chapter.findUnique({ where: { id: chapterId, tenantId: req.user.tenantId } });
    if (!parent) return res.status(404).json({ error: 'Chapter not found' });

    const count = await prisma.lesson.count({ where: { chapterId } });
    const lesson = await prisma.lesson.create({
      data: {
        tenantId: req.user.tenantId,
        chapterId,
        title,
        description,
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : 0,
        order: count + 1,
        status: 'DRAFT'
      }
    });
    res.status(201).json(lesson);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.put('/api/learning/lessons/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { title, description, estimatedDuration } = req.body;
    const lesson = await prisma.lesson.updateMany({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      data: { 
        title, 
        description,
        ...(estimatedDuration !== undefined && { estimatedDuration: parseInt(estimatedDuration) })
      }
    });
    res.json(lesson);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.post('/api/learning/materials', requireAuth, async (req: any, res: any) => {
  try {
    const { lessonId, title, type, content, assetId, status } = req.body;
    
    // Validate parent ownership
    const parent = await prisma.lesson.findUnique({ where: { id: lessonId, tenantId: req.user.tenantId } });
    if (!parent) return res.status(404).json({ error: 'Lesson not found' });

    const count = await prisma.material.count({ where: { lessonId } });
    
    const result = await prisma.$transaction(async (tx) => {
      const material = await tx.material.create({
        data: {
          tenantId: req.user.tenantId,
          lessonId,
          type,
          order: count + 1,
        }
      });

      const version = await tx.materialVersion.create({
        data: {
          tenantId: req.user.tenantId,
          materialId: material.id,
          title,
          contentHash: crypto.createHash('sha256').update(content || assetId || '').digest('hex'),
          searchableContent: content,
          assetId,
          versionNumber: 1,
          createdById: req.user.userId
        }
      });

      // Auto-publish if requested by frontend
      if (status === 'PUBLISHED') {
        await tx.material.update({
          where: { id: material.id },
          data: { currentVersionId: version.id }
        });
      }

      return { material, version };
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.post('/api/learning/materials/:id/publish', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { versionId } = req.body;

    // Ownership check: material MUST belong to caller's tenant
    const material = await prisma.material.findUnique({
      where: { id, tenantId: req.user.tenantId }
    });
    if (!material) return res.status(404).json({ error: 'Material not found' });

    // Version MUST belong to that material (composite key prevents cross-material injection)
    const version = await prisma.materialVersion.findUnique({
      where: { id: versionId, materialId: id }
    });
    if (!version) return res.status(404).json({ error: 'Version not found' });

    const updated = await prisma.material.update({
      where: { id },
      data: { currentVersionId: version.id }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.put('/api/learning/materials/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { title, searchableContent, assetId, status } = req.body;

    // Ownership check: material MUST belong to caller's tenant
    const material = await prisma.material.findUnique({
      where: { id, tenantId: req.user.tenantId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
    });

    if (!material) return res.status(404).json({ error: 'Material not found' });

    const nextVersion = (material.versions[0]?.versionNumber || 0) + 1;

    const result = await prisma.$transaction(async (tx) => {
      const newVersion = await tx.materialVersion.create({
        data: {
          tenantId: req.user.tenantId,
          materialId: id,
          title,
          contentHash: crypto.createHash('sha256').update(searchableContent || assetId || '').digest('hex'),
          searchableContent: searchableContent,
          assetId,
          versionNumber: nextVersion,
          createdById: req.user.userId
        }
      });

      if (status === 'PUBLISHED') {
        await tx.material.update({
          where: { id },
          data: { currentVersionId: newVersion.id }
        });
      }
      return newVersion;
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.get('/api/learning/materials/:id/versions', requireAuth, async (req: any, res: any) => {
  try {
    // Ownership check: material MUST belong to caller's tenant before exposing version history
    const material = await prisma.material.findUnique({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    });
    if (!material) return res.status(404).json({ error: 'Material not found' });

    const versions = await prisma.materialVersion.findMany({
      where: { materialId: req.params.id },
      orderBy: { versionNumber: 'desc' },
      include: { asset: true }
    });
    res.json(versions);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- LEARNING TREE DELETION ---
app.delete('/api/learning/chapters/:id', requireAuth, async (req: any, res: any) => {
  try {
    await prisma.chapter.deleteMany({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: 'Failed to delete chapter' });
  }
});

app.delete('/api/learning/lessons/:id', requireAuth, async (req: any, res: any) => {
  try {
    await prisma.lesson.deleteMany({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: 'Failed to delete lesson' });
  }
});

app.delete('/api/learning/materials/:id', requireAuth, async (req: any, res: any) => {
  try {
    await prisma.material.deleteMany({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: 'Failed to delete material' });
  }
});

app.post('/api/learning/assets', requireAuth, upload.single('file'), async (req: any, res: any) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    // In a real scenario we'd do virus scanning. Here we just set to READY.
    const fingerprint = await new Promise<string>((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const rs = fs.createReadStream(file.path);
      rs.on('error', reject);
      rs.on('data', chunk => hash.update(chunk));
      rs.on('end', () => resolve(hash.digest('hex')));
    });

    const asset = await prisma.asset.upsert({
      where: { tenantId_fingerprint: { tenantId: req.user.tenantId, fingerprint } },
      update: {},
      create: {
        tenantId: req.user.tenantId,
        fingerprint,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        storageProvider: 'LOCAL',
        storageKey: file.filename,
        status: 'READY',
        processingStatus: 'COMPLETED',
        createdById: req.user.userId
      }
    });

    // BigInt serialization workaround
    const serialized = { ...asset, sizeBytes: asset.sizeBytes.toString() };
    res.json(serialized);
  } catch (error: any) {
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// Serve files
app.use('/storage', express.static(storagePath));

// --- DASHBOARD API ---

app.get('/api/dashboard/stats', requireAuth, async (req: any, res: any) => {
  try {
    const userRole = req.user.roleSlug;
    
    if (userRole === 'teacher') {
      const teacherProfile = { id: req.user.teacherId };
      if (!teacherProfile) return res.json({});

      const coursesTaught = await prisma.course.findMany({
        where: { 
          tenantId: req.user.tenantId, 
          deletedAt: null, 
          OR: [
            { primaryTeacherId: teacherProfile.id },
            { coTeachers: { some: { teacherId: teacherProfile.id } } }
          ]
        },
        select: { id: true, classId: true, subject: true, class: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' }
      });

      const courseIds = coursesTaught.map(c => c.id);
      const classIds = [...new Set(coursesTaught.map(c => c.classId))];

      // Total students and materials can be fetched in parallel
      const [totalStudents, materials] = await Promise.all([
        prisma.studentEnrollment.count({
          where: { 
            tenantId: req.user.tenantId, 
            classId: { in: classIds }, 
            status: 'ACTIVE' 
          }
        }),
        prisma.material.findMany({
          where: { tenantId: req.user.tenantId, lesson: { chapter: { courseId: { in: courseIds } } } },
          select: { currentVersionId: true, createdAt: true, activeVersion: { select: { title: true, createdAt: true } }, lesson: { select: { title: true, chapter: { select: { course: { select: { subject: { select: { name: true } } } } } } } } },
          orderBy: { updatedAt: 'desc' },
          take: 10
        })
      ]);

      const totalMaterial = materials.length;
      const totalPublishedMaterial = materials.filter(m => m.currentVersionId !== null).length;
      const totalDraftMaterial = totalMaterial - totalPublishedMaterial;

      // Recent Activity Mapping
      const recentActivity = materials.slice(0, 5).map(m => ({
        title: m.activeVersion?.title || 'Draft Material',
        course: m.lesson.chapter.course.subject.name,
        type: m.currentVersionId ? 'PUBLISHED' : 'CREATED',
        date: m.activeVersion?.createdAt || m.createdAt
      }));

      res.json({
        totalCourses: courseIds.length,
        totalClasses: classIds.length,
        totalStudents,
        totalMaterial,
        totalDraftMaterial,
        totalPublishedMaterial,
        teacherPendingGrading: 0,
        todaySchedule: [], // Real data needs scheduling domain
        recentActivity,
        recentCourses: coursesTaught.slice(0, 3)
      });
    } else if (userRole === 'student') {
      // Student stats
      const studentId = req.user.studentId;
      if (!studentId) return res.json({});

      const enrollments = await prisma.studentEnrollment.findMany({
        where: { studentId, status: 'ACTIVE', deletedAt: null, tenantId: req.user.tenantId },
        include: { class: { include: { courses: { include: { subject: true } } } } }
      });

      const courseIds = enrollments.flatMap((en: any) => en.class.courses.map((c: any) => c.id));

      const [totalAssignments, pendingSubmissions, gradedSubmissions, attendanceRecords, announcements] = await Promise.all([
        prisma.assignment.count({
          where: { courseId: { in: courseIds }, tenantId: req.user.tenantId, deletedAt: null, status: { in: ['OPEN', 'CLOSED', 'GRADING', 'PUBLISHED'] } }
        }),
        prisma.assignment.count({
          where: {
            courseId: { in: courseIds }, tenantId: req.user.tenantId, deletedAt: null, status: 'OPEN',
            NOT: { submissions: { some: { studentId } } }
          }
        }),
        prisma.submission.findMany({
          where: { studentId, tenantId: req.user.tenantId, deletedAt: null, finalGrade: { not: null } },
          select: { finalGrade: true, assignment: { select: { maxScore: true } } }
        }),
        prisma.attendanceRecord.findMany({
          where: { studentId, tenantId: req.user.tenantId, session: { deletedAt: null } },
          select: { status: true }
        }),
        prisma.announcement.count({
          where: { courseId: { in: courseIds }, tenantId: req.user.tenantId, deletedAt: null, status: 'PUBLISHED' }
        })
      ]);

      const totalPresent = attendanceRecords.filter((r: any) => r.status === 'PRESENT').length;
      const attendanceRate = attendanceRecords.length > 0 ? Math.round((totalPresent / attendanceRecords.length) * 100) : 100;

      let gradeAverage = 0;
      if (gradedSubmissions.length > 0) {
        const totalPct = gradedSubmissions.reduce((sum: number, s: any) => {
          const max = s.assignment?.maxScore || 100;
          return sum + (s.finalGrade / max) * 100;
        }, 0);
        gradeAverage = Math.round(totalPct / gradedSubmissions.length);
      }

      const enrolledCourses = enrollments.flatMap((en: any) =>
        en.class.courses.map((c: any) => ({
          id: c.id,
          subjectName: c.subject.name,
          className: en.class.name
        }))
      );

      res.json({
        totalCourses: courseIds.length,
        totalAssignments,
        pendingSubmissions,
        gradeAverage,
        attendanceRate,
        totalAttendanceRecords: attendanceRecords.length,
        totalAnnouncements: announcements,
        enrolledCourses: enrolledCourses.slice(0, 5)
      });
    } else {
      // Admin stats can be fetched in parallel
      const [totalStudents, totalTeachers, totalClasses] = await Promise.all([
        prisma.studentProfile.count({ where: { tenantId: req.user.tenantId } }),
        prisma.teacherProfile.count({ where: { tenantId: req.user.tenantId } }),
        prisma.class.count({ where: { tenantId: req.user.tenantId, deletedAt: null } })
      ]);
      
      res.json({
        totalStudents,
        totalTeachers,
        totalClasses
      });
    }
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to fetch dashboard stats');
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/learning/chapters/reorder', requireAuth, async (req: any, res: any) => {
  try {
    const { items } = req.body; // [{ id: 'xxx', order: 1 }, ...]
    await prisma.$transaction(
      items.map((item: any) => 
        prisma.chapter.updateMany({
          where: { id: item.id, tenantId: req.user.tenantId },
          data: { order: item.order }
        })
      )
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.put('/api/learning/lessons/reorder', requireAuth, async (req: any, res: any) => {
  try {
    const { items } = req.body;
    await prisma.$transaction(
      items.map((item: any) => 
        prisma.lesson.updateMany({
          where: { id: item.id, tenantId: req.user.tenantId },
          data: { order: item.order }
        })
      )
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.put('/api/learning/materials/reorder', requireAuth, async (req: any, res: any) => {
  try {
    const { items } = req.body;
    await prisma.$transaction(
      items.map((item: any) => 
        prisma.material.updateMany({
          where: { id: item.id, tenantId: req.user.tenantId },
          data: { order: item.order }
        })
      )
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- ASSIGNMENT MANAGEMENT MVP ---

app.get('/api/assignments', requireAuth, async (req: any, res: any) => {
  try {
    const { courseId, status, scope, q, page = 1, limit = 10, sortBy = 'updatedAt', sortDir = 'desc' } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;

    const userRole = req.user.roleSlug;
    
    // Students can omit courseId to get all their assignments
    if (!courseId && userRole !== 'student') {
      return res.status(400).json({ error: 'courseId is required' });
    }

    const where: any = { tenantId: req.user.tenantId, deletedAt: null };
    if (courseId) where.courseId = courseId;

    // Search
    if (q) {
      where.title = { contains: q, mode: 'insensitive' };
    }

    if (userRole === 'student') {
      where.status = { in: ['OPEN', 'CLOSED', 'GRADING', 'PUBLISHED'] };
      if (req.user.studentId) {
        if (!courseId) {
          const enrollments = await prisma.studentEnrollment.findMany({ 
            where: { studentId: req.user.studentId, status: 'ACTIVE', deletedAt: null },
            select: { classId: true }
          });
          const classIds = enrollments.map((e: any) => e.classId);
          const enrolledCourses = await prisma.course.findMany({ 
            where: { classId: { in: classIds } },
            select: { id: true }
          });
          where.courseId = { in: enrolledCourses.map((c: any) => c.id) };
        }
        where.OR = [
          { scope: 'COURSE' },
          { scope: 'INDIVIDUAL', assignedStudentIds: { has: req.user.studentId } }
        ];
      }
    } else {
      if (status) where.status = status;
      if (scope) where.scope = scope;
    }

    const [total, assignments] = await Promise.all([
      prisma.assignment.count({ where }),
      prisma.assignment.findMany({
        where,
        include: { attachmentFile: true },
        orderBy: { [(['createdAt', 'updatedAt', 'dueDate', 'title', 'status'].includes(sortBy as string) ? sortBy as string : 'updatedAt')]: sortDir === 'asc' ? 'asc' : 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      })
    ]);

    res.json({
      data: assignments,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.post('/api/assignments', requireAuth, async (req: any, res: any) => {
  try {
    const { courseId, title, instruction, dueDate, maxScore, scope, assignedStudentIds, attachmentFileId, status } = req.body;
    
    // Validate teacher access to this course (simplified for MVP)
    const assignment = await prisma.assignment.create({
      data: {
        tenantId: req.user.tenantId,
        courseId,
        title,
        instruction,
        dueDate: new Date(dueDate),
        maxScore: maxScore ? parseFloat(maxScore) : 100,
        scope: scope || 'COURSE',
        assignedStudentIds: assignedStudentIds || [],
        attachmentFileId: attachmentFileId || null,
        status: status || 'DRAFT',
        createdById: req.user.userId
      }
    });

    res.status(201).json(assignment);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.put('/api/assignments/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { title, instruction, dueDate, maxScore, scope, assignedStudentIds, attachmentFileId, status } = req.body;

    // Validate status transition
    if (status && !['DRAFT', 'PUBLISHED', 'OPEN', 'CLOSED', 'GRADING', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const assignment = await prisma.assignment.updateMany({
      where: { id, tenantId: req.user.tenantId },
      data: {
        title,
        instruction,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        maxScore: maxScore ? parseFloat(maxScore) : undefined,
        scope,
        assignedStudentIds,
        attachmentFileId,
        status,
        updatedById: req.user.userId
      }
    });

    res.json(assignment);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.delete('/api/assignments/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    await prisma.assignment.updateMany({
      where: { id, tenantId: req.user.tenantId },
      data: { deletedAt: new Date(), updatedById: req.user.userId }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- SUBMISSION MANAGEMENT MVP ---

app.get('/api/submissions', requireAuth, async (req: any, res: any) => {
  try {
    const { assignmentId, studentId, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    
    const userRole = req.user.roleSlug;
    
    if (!assignmentId && userRole !== 'student') {
      return res.status(400).json({ error: 'assignmentId is required' });
    }

    const where: any = { tenantId: req.user.tenantId, deletedAt: null };
    if (assignmentId) where.assignmentId = assignmentId;

    if (userRole === 'student') {
      if (!req.user.studentId) return res.status(403).json({ error: 'Student profile not found' });
      where.studentId = req.user.studentId;
    } else if (studentId === 'ME') {
      return res.status(403).json({ error: 'Forbidden' });
    } else if (studentId) {
      where.studentId = studentId;
    }

    const [total, submissions] = await Promise.all([
      prisma.submission.count({ where }),
      prisma.submission.findMany({
        where,
        include: {
          activeVersion: true,
          attachmentFile: true
        },
        orderBy: { updatedAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      })
    ]);

    // Manually map students since there is no direct relation in schema
    const studentIds = [...new Set(submissions.map((s: any) => s.studentId).filter(Boolean))];
    const students = await prisma.studentProfile.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, fullName: true, nis: true }
    });

    const mappedSubmissions = submissions.map((s: any) => ({
      ...s,
      student: students.find((st: any) => st.id === s.studentId) || null
    }));

    res.json({
      data: mappedSubmissions,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});


app.get('/api/submissions/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const submission = await prisma.submission.findUnique({
      where: { id, tenantId: req.user.tenantId, deletedAt: null },
      include: {
        activeVersion: true,
        attachmentFile: true,
        assignment: true
      }
    });

    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    // Manually attach student
    const student = await prisma.studentProfile.findUnique({
      where: { id: submission.studentId }
    });

    res.json({ ...submission, student });
  } catch (error: any) {
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.post('/api/submissions', requireAuth, async (req: any, res: any) => {
  try {
    const { assignmentId, content, attachmentFileId } = req.body;

    const userRole = req.user.roleSlug;
    if (userRole !== 'student') return res.status(403).json({ error: 'Only students can submit' });

    const studentId = req.user.studentId;
    if (!studentId) return res.status(403).json({ error: 'Profile not found' });

    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId, tenantId: req.user.tenantId, deletedAt: null } });
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    // Validate business rules
    if (assignment.status !== 'OPEN') return res.status(400).json({ error: 'Assignment is not open for submission' });
    if (new Date() > new Date(assignment.dueDate)) return res.status(400).json({ error: 'Past due date' });

    // Validate enrollment & scope
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId: studentId, class: { courses: { some: { id: assignment.courseId } } }, status: 'ACTIVE' }
    });
    if (!enrollment) return res.status(403).json({ error: 'Not enrolled in this course' });

    if (assignment.scope === 'INDIVIDUAL' && !assignment.assignedStudentIds.includes(studentId)) {
      return res.status(403).json({ error: 'Assignment not assigned to you' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let submission = await tx.submission.findUnique({
        where: { assignmentId_studentId: { assignmentId, studentId: studentId } },
        include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
      });

      if (!submission) {
        submission = await tx.submission.create({
          data: {
            tenantId: req.user.tenantId,
            assignmentId,
            studentId: studentId,
            status: 'SUBMITTED',
            submittedAt: new Date(),
            attachmentFileId: attachmentFileId || null
          },
          include: { versions: true }
        });
      } else {
        await tx.submission.update({
          where: { id: submission.id },
          data: { 
            status: 'SUBMITTED', 
            submittedAt: new Date(),
            attachmentFileId: attachmentFileId || submission.attachmentFileId
          }
        });
      }

      const nextVersion = (submission.versions?.[0]?.versionNumber || 0) + 1;
      const attachmentFileIds = attachmentFileId ? [attachmentFileId] : [];

      const newVersion = await tx.submissionVersion.create({
        data: {
          tenantId: req.user.tenantId,
          submissionId: submission.id,
          versionNumber: nextVersion,
          content,
          attachmentFileIds
        }
      });

      return await tx.submission.update({
        where: { id: submission.id },
        data: { currentVersionId: newVersion.id },
        include: { activeVersion: true }
      });
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.put('/api/submissions/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { finalGrade, feedback } = req.body;

    const userRole = req.user.roleSlug;
    if (userRole === 'student') return res.status(403).json({ error: 'Students cannot grade' });

    const updated = await prisma.submission.updateMany({
      where: { id, tenantId: req.user.tenantId },
      data: {
        finalGrade: parseFloat(finalGrade),
        feedback,
        status: 'GRADED',
        gradedAt: new Date(),
        gradedById: req.user.userId
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.delete('/api/submissions/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    await prisma.submission.updateMany({
      where: { id, tenantId: req.user.tenantId },
      data: { deletedAt: new Date() }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- GRADEBOOK MANAGEMENT MVP ---

app.get('/api/gradebook', requireAuth, async (req: any, res: any) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ error: 'courseId is required' });

    // Fetch assignments for the course
    const assignments = await prisma.assignment.findMany({
      where: { courseId, tenantId: req.user.tenantId, deletedAt: null },
      orderBy: { dueDate: 'asc' }
    });

    // Fetch enrolled students
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { class: { courses: { some: { id: courseId } } }, status: 'ACTIVE', deletedAt: null },
      include: { student: true }
    });

    // Fetch all submissions for these assignments
    const submissions = await prisma.submission.findMany({
      where: { assignmentId: { in: assignments.map((a: any) => a.id) }, tenantId: req.user.tenantId, deletedAt: null }
    });

    // Build grid data
    const grid = enrollments.map((en: any) => {
      const studentId = en.studentId;
      const studentSubmissions = submissions.filter((s: any) => s.studentId === studentId);
      
      let totalScore = 0;
      let gradedCount = 0;
      let missingCount = 0;
      let submittedCount = 0;

      const grades: any = {};

      assignments.forEach((ass: any) => {
        const sub = studentSubmissions.find((s: any) => s.assignmentId === ass.id);
        grades[ass.id] = sub || null;

        if (sub) {
          submittedCount++;
          if (sub.finalGrade !== null && sub.finalGrade !== undefined) {
            totalScore += sub.finalGrade;
            gradedCount++;
          }
        } else {
          // If no submission and due date has passed
          if (new Date() > new Date(ass.dueDate)) {
            missingCount++;
          }
        }
      });

      const averageScore = gradedCount > 0 ? (totalScore / gradedCount) : 0;

      return {
        student: en.student,
        grades,
        stats: {
          totalAssignments: assignments.length,
          submitted: submittedCount,
          missing: missingCount,
          averageScore: parseFloat(averageScore.toFixed(2)),
          finalScore: parseFloat(averageScore.toFixed(2)) // Can be customized later with weighting
        }
      };
    });

    res.json({ assignments, grid });
  } catch (error: any) {
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.put('/api/gradebook/bulk', requireAuth, async (req: any, res: any) => {
  try {
    const { updates } = req.body; // Array of { studentId, assignmentId, finalGrade, feedback }

    if (!Array.isArray(updates)) return res.status(400).json({ error: 'Invalid updates format' });
    
    const userRole = req.user.roleSlug;
    if (userRole === 'student') return res.status(403).json({ error: 'Students cannot grade' });

    // Validate ownership and tenant isolation
    const assignmentIds = [...new Set(updates.map((u: any) => u.assignmentId))];
    const assignments = await prisma.assignment.findMany({
      where: { id: { in: assignmentIds }, tenantId: req.user.tenantId }
    });

    if (assignments.length !== assignmentIds.length) {
      return res.status(403).json({ error: 'One or more assignments not found or do not belong to your tenant' });
    }

    if (userRole === 'teacher') {
      const profile = { id: req.user.teacherId };
      if (!profile) return res.status(403).json({ error: 'Teacher profile not found' });
      
      const courseIds = [...new Set(assignments.map(a => a.courseId))];
      const courses = await prisma.course.findMany({
        where: { id: { in: courseIds } },
        include: { coTeachers: true }
      });
      
      for (const ass of assignments) {
        const course = courses.find(c => c.id === ass.courseId);
        if (!course) return res.status(403).json({ error: 'Course not found for assignment' });
        
        const isOwner = course.primaryTeacherId === profile.id || course.coTeachers.some((ct: any) => ct.teacherId === profile.id);
        if (!isOwner) return res.status(403).json({ error: 'You are not authorized to grade one or more of these assignments' });
      }
    }

    const results = await prisma.$transaction(async (tx) => {
      const operations = updates
        .filter((u: any) => u.finalGrade !== undefined && u.finalGrade !== null)
        .map((update: any) => tx.submission.upsert({
          where: { assignmentId_studentId: { assignmentId: update.assignmentId, studentId: update.studentId } },
          update: {
            finalGrade: parseFloat(update.finalGrade),
            feedback: update.feedback,
            status: 'GRADED',
            gradedAt: new Date(),
            gradedById: req.user.userId
          },
          create: {
            tenantId: req.user.tenantId,
            assignmentId: update.assignmentId,
            studentId: update.studentId,
            status: 'GRADED',
            finalGrade: parseFloat(update.finalGrade),
            feedback: update.feedback,
            gradedAt: new Date(),
            gradedById: req.user.userId
          }
        }));

      await Promise.all(operations);
      return operations.length;
    });

    res.json({ success: true, updatedCount: results });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.get('/api/gradebook/student/:studentId', requireAuth, async (req: any, res: any) => {
  try {
    let targetStudentId = req.params.studentId;
    if (targetStudentId === 'ME') {
      targetStudentId = req.user.studentId;
      if (!targetStudentId) return res.status(404).json({ error: 'Profile not found' });
    }

    // Fetch active enrollments for the student
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { studentId: targetStudentId, status: 'ACTIVE', deletedAt: null },
      include: { class: { include: { courses: { include: { subject: true } } } } }
    });

    const courseIds = enrollments.flatMap((en: any) => en.class.courses.map((c: any) => c.id));

    const assignments = await prisma.assignment.findMany({
      where: { courseId: { in: courseIds }, tenantId: req.user.tenantId, deletedAt: null },
      orderBy: { dueDate: 'desc' }
    });

    const submissions = await prisma.submission.findMany({
      where: { studentId: targetStudentId, assignmentId: { in: assignments.map((a: any) => a.id) }, deletedAt: null }
    });

    // Group by course
    const result: any[] = [];

    enrollments.forEach((en: any) => {
      en.class.courses.forEach((course: any) => {
        const courseAssignments = assignments.filter((a: any) => a.courseId === course.id);
        const courseSubmissions = submissions.filter((s: any) => courseAssignments.some((a: any) => a.id === s.assignmentId));

        let totalScore = 0;
        let gradedCount = 0;
        let missingCount = 0;

        const detailedAssignments = courseAssignments.map((ass: any) => {
          const sub = courseSubmissions.find((s: any) => s.assignmentId === ass.id);
          
          if (sub && sub.finalGrade !== null) {
            totalScore += sub.finalGrade;
            gradedCount++;
          } else if (!sub && new Date() > new Date(ass.dueDate)) {
            missingCount++;
          }

          return { ...ass, mySubmission: sub || null };
        });

        const average = gradedCount > 0 ? (totalScore / gradedCount).toFixed(2) : 0;

        result.push({
          course,
          stats: { average, gradedCount, missingCount, totalAssignments: courseAssignments.length },
          assignments: detailedAssignments
        });
      });
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- ATTENDANCE MANAGEMENT MVP ---

app.get('/api/attendance/sessions', requireAuth, async (req: any, res: any) => {
  try {
    const { courseId, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    
    if (!courseId) return res.status(400).json({ error: 'courseId is required' });

    const where = { courseId, tenantId: req.user.tenantId, deletedAt: null };

    const [total, sessions] = await Promise.all([
      prisma.attendanceSession.count({ where }),
      prisma.attendanceSession.findMany({
        where,
        include: {
          _count: { select: { records: true } }
        },
        orderBy: { date: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      })
    ]);

    res.json({
      data: sessions,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.post('/api/attendance/sessions', requireAuth, async (req: any, res: any) => {
  try {
    const { courseId, date, topic, description } = req.body;
    
    // Check if course is active
    const course = await prisma.course.findUnique({ where: { id: courseId, tenantId: req.user.tenantId } });
    if (!course || course.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Course must be ACTIVE to take attendance' });
    }

    const session = await prisma.attendanceSession.create({
      data: {
        tenantId: req.user.tenantId,
        courseId,
        date: new Date(date),
        topic,
        description,
        createdById: req.user.userId
      }
    });

    res.status(201).json(session);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Session already exists for this date' });
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.get('/api/attendance/sessions/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const session = await prisma.attendanceSession.findUnique({
      where: { id, tenantId: req.user.tenantId, deletedAt: null },
      include: { records: true, course: true }
    });
    
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Fetch active enrolled students to match with records
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { class: { courses: { some: { id: session.courseId } } }, status: 'ACTIVE', deletedAt: null },
      include: { student: true }
    });

    res.json({ session, enrolledStudents: enrollments.map((e: any) => e.student) });
  } catch (error: any) {
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.put('/api/attendance/sessions/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { date, topic, description } = req.body;
    
    const updated = await prisma.attendanceSession.updateMany({
      where: { id, tenantId: req.user.tenantId },
      data: { date: new Date(date), topic, description, updatedById: req.user.userId }
    });
    res.json(updated);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Session already exists for this date' });
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.delete('/api/attendance/sessions/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    await prisma.attendanceSession.updateMany({
      where: { id, tenantId: req.user.tenantId },
      data: { deletedAt: new Date(), updatedById: req.user.userId }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.post('/api/attendance/sessions/:id/records', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { updates } = req.body; // Array of { studentId, status, notes }

    if (!Array.isArray(updates)) return res.status(400).json({ error: 'Updates must be an array' });

    await prisma.$transaction(async (tx) => {
      const operations = updates.map((record: any) => 
        tx.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId: id, studentId: record.studentId } },
          update: { status: record.status, notes: record.notes, updatedById: req.user.userId },
          create: {
            tenantId: req.user.tenantId,
            sessionId: id,
            studentId: record.studentId,
            status: record.status,
            notes: record.notes,
            createdById: req.user.userId
          }
        })
      );
      await Promise.all(operations);
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.get('/api/attendance/student/:studentId', requireAuth, async (req: any, res: any) => {
  try {
    let targetStudentId = req.params.studentId;
    if (targetStudentId === 'ME') {
      targetStudentId = req.user.studentId;
      if (!targetStudentId) return res.status(404).json({ error: 'Profile not found' });
    }

    const records = await prisma.attendanceRecord.findMany({
      where: { studentId: targetStudentId, tenantId: req.user.tenantId, session: { deletedAt: null } },
      include: { session: { include: { course: { include: { subject: true } } } } },
      orderBy: { session: { date: 'desc' } }
    });

    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- ANNOUNCEMENT MANAGEMENT MVP ---

app.get('/api/announcements', requireAuth, async (req: any, res: any) => {
  try {
    const { courseId, status, q } = req.query;
    const userRole = req.user.roleSlug;
    
    const where: any = { tenantId: req.user.tenantId, deletedAt: null };

    if (q) {
      where.title = { contains: q, mode: 'insensitive' };
    }

    if (courseId) {
      where.courseId = courseId;
    }

    if (userRole === 'student') {
      where.status = 'PUBLISHED';
      
      const studentId = req.user.studentId;
      if (!studentId) return res.status(403).json({ error: 'Student profile not found' });
      
      // If courseId is not provided, fetch announcements for all enrolled courses
      if (!courseId) {
        const enrollments = await prisma.studentEnrollment.findMany({
          where: { studentId: studentId, status: 'ACTIVE', deletedAt: null },
          select: { class: { select: { courses: { select: { id: true } } } } }
        });
        const enrolledCourseIds = enrollments.flatMap((en: any) => en.class.courses.map((c: any) => c.id));
        where.courseId = { in: enrolledCourseIds };
      } else {
        // Validate enrollment in the specific course
        const enrollment = await prisma.studentEnrollment.findFirst({
          where: { studentId: studentId, class: { courses: { some: { id: courseId } } }, status: 'ACTIVE' }
        });
        if (!enrollment) return res.status(403).json({ error: 'Not enrolled in this course' });
      }
    } else if (userRole === 'teacher') {
      if (status) where.status = status;
      const teacherId = req.user.teacherId;
      if (!teacherId) return res.status(403).json({ error: 'Teacher profile not found' });
      
      if (!courseId) {
        const taughtCourses = await prisma.course.findMany({
          where: {
            OR: [
              { primaryTeacherId: teacherId },
              { coTeachers: { some: { teacherId: teacherId } } }
            ]
          },
          select: { id: true }
        });
        where.courseId = { in: taughtCourses.map((c: any) => c.id) };
      } else {
        // Strict ownership check
        const isOwner = await prisma.course.findFirst({
          where: {
            id: courseId,
            OR: [
              { primaryTeacherId: teacherId },
              { coTeachers: { some: { teacherId: teacherId } } }
            ]
          }
        });
        if (!isOwner) return res.status(403).json({ error: 'Not authorized for this course announcements' });
      }
    } else {
      // Admin
      if (status) where.status = status;
    }

    const announcements = await prisma.announcement.findMany({
      where,
      include: { 
        course: { include: { subject: true } },
        attachmentFile: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Manually map createdBy names for MVP
    const userIds = [...new Set(announcements.map((a: any) => a.createdById).filter(Boolean))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true }
    });

    const mapped = announcements.map((a: any) => ({
      ...a,
      authorEmail: users.find((u: any) => u.id === a.createdById)?.email || 'Unknown'
    }));

    res.json(mapped);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'An unexpected error occurred' });
  }
});

app.post('/api/announcements', requireAuth, async (req: any, res: any) => {
  try {
    const { courseId, title, content, attachmentFileId, status } = req.body;
    
    // RBAC: Strict validation for teachers
    if (req.user.roleSlug === 'teacher') {
      const teacherId = req.user.teacherId;
      if (!teacherId) return res.status(403).json({ error: 'Teacher profile not found' });
      
      const isOwner = await prisma.course.findFirst({
        where: {
          id: courseId,
          OR: [
            { primaryTeacherId: teacherId },
            { coTeachers: { some: { teacherId: teacherId } } }
          ]
        }
      });
      if (!isOwner) return res.status(403).json({ error: 'Not authorized for this course' });
    }

    // Strict sanitization for UUID foreign key
    const cleanAttachmentId = (attachmentFileId && attachmentFileId.trim() !== '') ? attachmentFileId : null;

    const announcement = await prisma.announcement.create({
      data: {
        tenantId: req.user.tenantId,
        courseId,
        title,
        content,
        attachmentFileId: cleanAttachmentId,
        status: status || 'DRAFT',
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        createdById: req.user.userId
      }
    });

    res.status(201).json(announcement);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'An unexpected error occurred' });
  }
});

app.put('/api/announcements/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { title, content, attachmentFileId, status } = req.body;

    const existing = await prisma.announcement.findUnique({ where: { id, tenantId: req.user.tenantId } });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    // RBAC: Strict validation for teachers
    if (req.user.roleSlug === 'teacher') {
      const teacherId = req.user.teacherId;
      if (!teacherId) return res.status(403).json({ error: 'Teacher profile not found' });
      
      const isOwner = await prisma.course.findFirst({
        where: {
          id: existing.courseId,
          OR: [
            { primaryTeacherId: teacherId },
            { coTeachers: { some: { teacherId: teacherId } } }
          ]
        }
      });
      if (!isOwner) return res.status(403).json({ error: 'Not authorized for this course' });
    }

    // Strict sanitization for UUID foreign key
    const cleanAttachmentId = (attachmentFileId && attachmentFileId.trim() !== '') ? attachmentFileId : null;

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        title,
        content,
        attachmentFileId: cleanAttachmentId,
        status,
        publishedAt: status === 'PUBLISHED' && existing.status !== 'PUBLISHED' ? new Date() : existing.publishedAt,
        updatedById: req.user.userId
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'An unexpected error occurred' });
  }
});

app.delete('/api/announcements/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    await prisma.announcement.updateMany({
      where: { id, tenantId: req.user.tenantId },
      data: { deletedAt: new Date(), updatedById: req.user.userId }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.post('/api/announcements/:id/publish', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const updated = await prisma.announcement.updateMany({
      where: { id, tenantId: req.user.tenantId, status: { not: 'PUBLISHED' } },
      data: { status: 'PUBLISHED', publishedAt: new Date(), updatedById: req.user.userId }
    });
    res.json({ success: true, updated });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- LIVE PRESENTATION API (PPTX share) ---
// Teacher uploads a .pptx, gets a public link (no login). Students open the
// link and watch the slide that the teacher currently controls (next/prev).

// Helper: unique-ish share code generation (retry on collision).
const generateShareCode = async (): Promise<string> => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = crypto.randomBytes(6).toString('base64url'); // ~8 chars
    const exists = await prisma.livePresentation.findUnique({ where: { shareCode: code } });
    if (!exists) return code;
  }
  throw new Error('Failed to generate a unique share code');
};

// Create: upload a .pptx and return share metadata (auth: teacher/admin).
app.post('/api/presentations', requireAuth, upload.single('file'), async (req: any, res: any) => {
  try {
    const role = req.user.roleSlug;
    if (role !== 'teacher' && role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({ error: 'Only teachers and admins can create presentations' });
    }

    const file = req.file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'File .pptx wajib diunggah' });

    const ext = (path.extname(file.originalname) || '').toLowerCase();
    if (!['.ppt', '.pptx'].includes(ext)) {
      // clean up the uploaded file since it's not a presentation
      try { fs.unlinkSync(file.path); } catch {}
      return res.status(400).json({ error: 'Hanya file PowerPoint (.ppt / .pptx) yang diperbolehkan' });
    }

    const titleInput = (req.body && req.body.title) || path.basename(file.originalname, path.extname(file.originalname));
    const shareCode = await generateShareCode();

    const pres = await prisma.livePresentation.create({
      data: {
        tenantId: req.user.tenantId,
        createdById: req.user.userId,
        title: String(titleInput),
        shareCode,
        fileName: file.filename,
        originalName: file.originalname,
        currentSlide: 0,
        isLive: true,
      }
    });

    res.status(201).json({
      ...pres,
      fileUrl: `/storage/${file.filename}`,
      shareUrl: `${req.protocol}://${req.get('host')}/live/${shareCode}`,
    });
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to create presentation');
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
  }
});

// List own (teacher) / all (admin) presentations.
app.get('/api/presentations', requireAuth, async (req: any, res: any) => {
  try {
    const { q } = req.query;
    const where: any = { tenantId: req.user.tenantId, deletedAt: null };
    if (q) where.title = { contains: q, mode: 'insensitive' };

    if (req.user.roleSlug === 'teacher') {
      where.createdById = req.user.userId;
    }

    const [items, total] = await Promise.all([
      prisma.livePresentation.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 100 }),
      prisma.livePresentation.count({ where }),
    ]);

    res.json({
      data: items.map((p: any) => ({ ...p, fileUrl: `/storage/${p.fileName}` })),
      meta: { total }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a presentation (owner/teacher, or admin).
app.get('/api/presentations/:id', requireAuth, async (req: any, res: any) => {
  try {
    const pres = await prisma.livePresentation.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }
    });
    if (!pres) return res.status(404).json({ error: 'Presentation not found' });
    if (req.user.roleSlug === 'teacher' && pres.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to view this presentation' });
    }
    res.json({ ...pres, fileUrl: `/storage/${pres.fileName}` });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Teacher controls the current slide (next / prev / goto).
app.post('/api/presentations/:id/control', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { action, slide } = req.body;

    const pres = await prisma.livePresentation.findFirst({
      where: { id, tenantId: req.user.tenantId, deletedAt: null }
    });
    if (!pres) return res.status(404).json({ error: 'Presentation not found' });
    if (pres.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'Only the presenting teacher can control slides' });
    }

    let next = pres.currentSlide;
    if (action === 'next') next = pres.currentSlide + 1;
    else if (action === 'prev') next = pres.currentSlide - 1;
    else if (action === 'goto' && typeof slide === 'number') next = Math.round(slide);
    // Clamp within available slides (slideCount may be 0 before client reports it).
    const max = Math.max(0, pres.slideCount - 1);
    next = Math.max(0, Math.min(next, max));

    const updated = await prisma.livePresentation.update({
      where: { id },
      data: { currentSlide: next },
    });
    res.json({ id: updated.id, currentSlide: updated.currentSlide, isLive: updated.isLive });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// Public view (no login) — only exposes enough for the student slide viewer.
app.get('/api/live/:shareCode', async (req: any, res: any) => {
  try {
    const pres = await prisma.livePresentation.findFirst({
      where: { shareCode: req.params.shareCode, deletedAt: null, isLive: true }
    });
    if (!pres) return res.status(410).json({ error: 'Presentasi tidak ditemukan atau sudah diakhiri' });

    res.json({
      id: pres.id,
      title: pres.title,
      currentSlide: pres.currentSlide,
      slideCount: pres.slideCount,
      isLive: pres.isLive,
      fileUrl: `/storage/${pres.fileName}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Report slide count from the client-side renderer (owner only).
app.post('/api/presentations/:id/slide-count', requireAuth, async (req: any, res: any) => {
  try {
    const { slideCount } = req.body;
    if (!Number.isInteger(slideCount) || slideCount < 0) {
      return res.status(400).json({ error: 'slideCount must be a non-negative integer' });
    }
    const pres = await prisma.livePresentation.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }
    });
    if (!pres) return res.status(404).json({ error: 'Presentation not found' });
    if (pres.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const updated = await prisma.livePresentation.update({
      where: { id: pres.id },
      data: { slideCount, currentSlide: Math.min(pres.currentSlide, Math.max(0, slideCount - 1)) },
    });
    res.json({ id: updated.id, slideCount: updated.slideCount, currentSlide: updated.currentSlide });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// End a live presentation (owner only).
app.post('/api/presentations/:id/end', requireAuth, async (req: any, res: any) => {
  try {
    const pres = await prisma.livePresentation.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }
    });
    if (!pres) return res.status(404).json({ error: 'Presentation not found' });
    if (pres.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'Only the presenting teacher can end this presentation' });
    }
    const updated = await prisma.livePresentation.update({
      where: { id: pres.id },
      data: { isLive: false },
    });
    res.json({ id: updated.id, isLive: updated.isLive });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// Delete a presentation (soft delete; owner or admin).
app.delete('/api/presentations/:id', requireAuth, async (req: any, res: any) => {
  try {
    const pres = await prisma.livePresentation.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }
    });
    if (!pres) return res.status(404).json({ error: 'Presentation not found' });
    if (req.user.roleSlug === 'teacher' && pres.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this presentation' });
    }
    await prisma.livePresentation.update({ where: { id: pres.id }, data: { deletedAt: new Date(), isLive: false } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- TEACHING MODULES API (Modul Ajar - Kurikulum Merdeka) ---
// Standalone documents owned by teachers; admins can view all.
app.get('/api/teaching-modules', requireAuth, async (req: any, res: any) => {
  try {
    const { q, status, page = 1, limit = 20, sortBy = 'updatedAt', sortDir = 'desc' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const where: any = { tenantId: req.user.tenantId, deletedAt: null };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { mataPelajaran: { contains: q, mode: 'insensitive' } },
        { penyusun: { contains: q, mode: 'insensitive' } }
      ];
    }
    if (status) where.status = status;

    const userRole = req.user.roleSlug;
    if (userRole === 'teacher') {
      const teacherId = req.user.teacherId;
      if (!teacherId) return res.status(403).json({ error: 'Teacher profile not found' });
      where.createdById = req.user.userId;
    }

    const total = await prisma.teachingModule.count({ where });

    const modules = await prisma.teachingModule.findMany({
      where,
      orderBy: { [(['title', 'updatedAt', 'createdAt', 'status', 'kelas'].includes(sortBy as string) ? sortBy as string : 'updatedAt')]: sortDir === 'asc' ? 'asc' : 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });

    const userIds = [...new Set(modules.map((m: any) => m.createdById).filter(Boolean))];
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, teacherProfile: { select: { fullName: true } } }
        })
      : [];
    const mapped = modules.map((m: any) => ({
      ...m,
      authorEmail: users.find((u: any) => u.id === m.createdById)?.email || '',
      authorName: users.find((u: any) => u.id === m.createdById)?.teacherProfile?.fullName || ''
    }));

    res.json({
      data: mapped,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to fetch teaching modules');
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/teaching-modules/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const mod = await prisma.teachingModule.findFirst({
      where: { id, tenantId: req.user.tenantId, deletedAt: null }
    });
    if (!mod) return res.status(404).json({ error: 'Teaching module not found' });

    // Teachers can only access their own modules (admins can read all)
    if (req.user.roleSlug === 'teacher' && mod.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to view this module' });
    }

    const author = mod.createdById
      ? await prisma.user.findUnique({
          where: { id: mod.createdById },
          select: { id: true, email: true, teacherProfile: { select: { fullName: true } } }
        })
      : null;

    res.json({ ...mod, authorEmail: author?.email || '', authorName: author?.teacherProfile?.fullName || '' });
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to fetch teaching module');
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/teaching-modules', requireAuth, async (req: any, res: any) => {
  try {
    const userRole = req.user.roleSlug;
    if (userRole !== 'teacher' && userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({ error: 'Only teachers and admins can create teaching modules' });
    }

    const {
      title, penyusun, institusi, tahunPenyusunan, jenjang, kelas, mataPelajaran,
      alokasiWaktu, jumlahPertemuan, kompetensiAwal, profilPelajarPancasila,
      saranaPrasarana, targetPesertaDidik, modelPembelajaran, tujuanPembelajaran,
      pemahamanBermakna, pertanyaanPemantik, kegiatanPembelajaran, asesmen,
      pengayaanRemedial, refleksiGuru, refleksiPesertaDidik, lkpd, bahanBacaan,
      glosarium, daftarPustaka, status
    } = req.body;

    if (!title) return res.status(400).json({ error: 'Title is required' });

    const mod = await prisma.teachingModule.create({
      data: {
        tenantId: req.user.tenantId,
        createdById: req.user.userId,
        title: title as string,
        penyusun, institusi, tahunPenyusunan, jenjang, kelas, mataPelajaran,
        alokasiWaktu,
        jumlahPertemuan: jumlahPertemuan ? parseInt(jumlahPertemuan) : null,
        kompetensiAwal, saranaPrasarana, targetPesertaDidik, modelPembelajaran,
        tujuanPembelajaran, pemahamanBermakna, pertanyaanPemantik,
        pengayaanRemedial, refleksiGuru, refleksiPesertaDidik,
        lkpd, bahanBacaan, glosarium, daftarPustaka,
        profilPelajarPancasila: profilPelajarPancasila ?? null,
        kegiatanPembelajaran: kegiatanPembelajaran ?? null,
        asesmen: asesmen ?? null,
        status: status || 'DRAFT'
      }
    });

    res.status(201).json(mod);
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to create teaching module');
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
  }
});

app.put('/api/teaching-modules/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const existing = await prisma.teachingModule.findFirst({
      where: { id, tenantId: req.user.tenantId, deletedAt: null }
    });
    if (!existing) return res.status(404).json({ error: 'Teaching module not found' });
    if (req.user.roleSlug === 'teacher' && existing.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to edit this module' });
    }

    const {
      title, penyusun, institusi, tahunPenyusunan, jenjang, kelas, mataPelajaran,
      alokasiWaktu, jumlahPertemuan, kompetensiAwal, profilPelajarPancasila,
      saranaPrasarana, targetPesertaDidik, modelPembelajaran, tujuanPembelajaran,
      pemahamanBermakna, pertanyaanPemantik, kegiatanPembelajaran, asesmen,
      pengayaanRemedial, refleksiGuru, refleksiPesertaDidik, lkpd, bahanBacaan,
      glosarium, daftarPustaka, status
    } = req.body;

    if (title !== undefined && !title) return res.status(400).json({ error: 'Title is required' });

    const mod = await prisma.teachingModule.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(penyusun !== undefined && { penyusun }),
        ...(institusi !== undefined && { institusi }),
        ...(tahunPenyusunan !== undefined && { tahunPenyusunan }),
        ...(jenjang !== undefined && { jenjang }),
        ...(kelas !== undefined && { kelas }),
        ...(mataPelajaran !== undefined && { mataPelajaran }),
        ...(alokasiWaktu !== undefined && { alokasiWaktu }),
        ...(jumlahPertemuan !== undefined && { jumlahPertemuan: jumlahPertemuan ? parseInt(jumlahPertemuan) : null }),
        ...(kompetensiAwal !== undefined && { kompetensiAwal }),
        ...(profilPelajarPancasila !== undefined && { profilPelajarPancasila: profilPelajarPancasila ?? null }),
        ...(saranaPrasarana !== undefined && { saranaPrasarana }),
        ...(targetPesertaDidik !== undefined && { targetPesertaDidik }),
        ...(modelPembelajaran !== undefined && { modelPembelajaran }),
        ...(tujuanPembelajaran !== undefined && { tujuanPembelajaran }),
        ...(pemahamanBermakna !== undefined && { pemahamanBermakna }),
        ...(pertanyaanPemantik !== undefined && { pertanyaanPemantik }),
        ...(kegiatanPembelajaran !== undefined && { kegiatanPembelajaran: kegiatanPembelajaran ?? null }),
        ...(asesmen !== undefined && { asesmen: asesmen ?? null }),
        ...(pengayaanRemedial !== undefined && { pengayaanRemedial }),
        ...(refleksiGuru !== undefined && { refleksiGuru }),
        ...(refleksiPesertaDidik !== undefined && { refleksiPesertaDidik }),
        ...(lkpd !== undefined && { lkpd }),
        ...(bahanBacaan !== undefined && { bahanBacaan }),
        ...(glosarium !== undefined && { glosarium }),
        ...(daftarPustaka !== undefined && { daftarPustaka }),
        ...(status !== undefined && { status })
      }
    });

    res.json(mod);
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to update teaching module');
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
  }
});

app.delete('/api/teaching-modules/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const existing = await prisma.teachingModule.findFirst({
      where: { id, tenantId: req.user.tenantId, deletedAt: null }
    });
    if (!existing) return res.status(404).json({ error: 'Teaching module not found' });
    if (req.user.roleSlug === 'teacher' && existing.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this module' });
    }

    await prisma.teachingModule.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

app.post('/api/teaching-modules/:id/status', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const existing = await prisma.teachingModule.findFirst({
      where: { id, tenantId: req.user.tenantId, deletedAt: null }
    });
    if (!existing) return res.status(404).json({ error: 'Teaching module not found' });
    if (req.user.roleSlug === 'teacher' && existing.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to update this module' });
    }

    const updated = await prisma.teachingModule.update({
      where: { id },
      data: { status }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- AI ASSISTANT API (Modul Ajar - Google Gemini) ---
import { GeminiAiService, buildModuleGenerationSystemPrompt, buildTpAtpPrompt, buildAssessmentPrompt, buildQuestionBankPrompt } from './modules/ai/gemini.service';

const geminiAi = new GeminiAiService();

app.get('/api/ai/status', requireAuth, async (req: any, res: any) => {
  res.json({ enabled: geminiAi.enabled, provider: geminiAi.providerName, model: geminiAi.modelName });
});

// Generate full module (all components) from a topic / subject / phase.
app.post('/api/ai/module/generate', requireAuth, async (req: any, res: any) => {
  try {
    if (!geminiAi.enabled) return res.status(400).json({ error: 'AI belum aktif. Tambahkan GEMINI_API_KEY pada server/.env. atau set GEMINI_PROVIDER=web2 untuk memakai proxy lokal gemini-web2api.' });

    const { mataPelajaran, jenjang, kelas, tema, elemen, jumlahPertemuan } = req.body;
    if (!mataPelajaran || !kelas || !tema) {
      return res.status(400).json({ error: 'Mata pelajaran, kelas, dan tema wajib diisi.' });
    }

    const userPrompt = `
Mata Pelajaran : ${mataPelajaran}
Jenjang        : ${jenjang || ''}
Kelas / Fase   : ${kelas}
Jumlah Pertemuan: ${jumlahPertemuan || 2}
Tema/Topik     : ${tema}
Elemen/CP (opsional): ${elemen || ''}

Buatkan Modul Ajar lengkap untuk tema di atas. Isi semua kunci pada skema.
`;
    const data = await geminiAi.generateJson2(buildModuleGenerationSystemPrompt(), userPrompt);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'AI gagal memproses permintaan' : error.message });
  }
});

// Generate TP/ATP from phase + subject + CP.
app.post('/api/ai/tp-atp', requireAuth, async (req: any, res: any) => {
  try {
    if (!geminiAi.enabled) return res.status(400).json({ error: 'AI belum aktif. Tambahkan GEMINI_API_KEY pada server/.env. atau set GEMINI_PROVIDER=web2 untuk memakai proxy lokal gemini-web2api.' });

    const { mataPelajaran, jenjang, kelas, elemen, capaianPembelajaran } = req.body;
    if (!mataPelajaran || !capaianPembelajaran) {
      return res.status(400).json({ error: 'Mata pelajaran dan Capaian Pembelajaran wajib diisi.' });
    }

    const userPrompt = `
Fase / Jenjang : ${jenjang || ''}
Kelas          : ${kelas || ''}
Mata Pelajaran : ${mataPelajaran}
Elemen         : ${elemen || ''}
Capaian Pembelajaran (CP): ${capaianPembelajaran}

Uraikan CP di atas menjadi TP dan rekomendasikan ATP.
`;
    const data = await geminiAi.generateJson2(buildTpAtpPrompt(), userPrompt);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'AI gagal memproses permintaan' : error.message });
  }
});

// Generate assessments (diagnostik, formatif, sumatif) for a topic.
app.post('/api/ai/assessment', requireAuth, async (req: any, res: any) => {
  try {
    if (!geminiAi.enabled) return res.status(400).json({ error: 'AI belum aktif. Tambahkan GEMINI_API_KEY pada server/.env. atau set GEMINI_PROVIDER=web2 untuk memakai proxy lokal gemini-web2api.' });

    const { mataPelajaran, jenjang, kelas, tema } = req.body;
    if (!tema) return res.status(400).json({ error: 'Tema/topik wajib diisi.' });

    const userPrompt = `
Mata Pelajaran : ${mataPelajaran || ''}
Jenjang        : ${jenjang || ''}
Kelas / Fase   : ${kelas || ''}
Topik          : ${tema}

Buatkan asesmen lengkap untuk topik di atas.
`;
    const data = await geminiAi.generateJson2(buildAssessmentPrompt(), userPrompt);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'AI gagal memproses permintaan' : error.message });
  }
});

// Generate bank-soal questions from a topic (used by the QuestionBank AI wizard).
app.post('/api/ai/questions/generate', requireAuth, async (req: any, res: any) => {
  try {
    if (!geminiAi.enabled) return res.status(400).json({ error: 'AI belum aktif. Tambahkan GEMINI_API_KEY pada server/.env. atau set GEMINI_PROVIDER=web2 untuk memakai proxy lokal gemini-web2api.' });

    const { mataPelajaran, jenjang, kelas, topik, tipe, jumlah, kesulitan } = req.body;
    if (!topik) return res.status(400).json({ error: 'Topik wajib diisi.' });
    const n = Math.min(Math.max(parseInt(jumlah, 10) || 5, 1), 20);

    const userPrompt = `
Mata Pelajaran : ${mataPelajaran || ''}
Jenjang        : ${jenjang || ''}
Kelas / Fase   : ${kelas || ''}
Topik          : ${topik}
Tipe Soal      : ${tipe || 'PILIHAN_GANDA'}
Jumlah Soal    : ${n}
Tingkat Kesulitan: ${kesulitan || 'SEDANG'}

Buatkan ${n} soal sesuai tipe "${tipe || 'PILIHAN_GANDA'}" untuk topik di atas.
`;
    const data = await geminiAi.generateJson2(buildQuestionBankPrompt(), userPrompt);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'AI gagal memproses permintaan' : error.message });
  }
});

// AI Copilot: chat with context about an existing module to improve a section.
app.post('/api/ai/chat', requireAuth, async (req: any, res: any) => {
  try {
    if (!geminiAi.enabled) return res.status(400).json({ error: 'AI belum aktif. Tambahkan GEMINI_API_KEY pada server/.env. atau set GEMINI_PROVIDER=web2 untuk memakai proxy lokal gemini-web2api.' });

    const { moduleContext, message } = req.body;
    if (!message) return res.status(400).json({ error: 'Pesan wajib diisi.' });

    const contextText = moduleContext
      ? `KONTEKS MODUL AJAR SAAT INI (JSON):\n${JSON.stringify(moduleContext, null, 2)}\n\n`
      : '';

    const systemPrompt = `Anda adalah AI Copilot penyusun Modul Ajar Kurikulum Merdeka.
Guru sedang menyusun modul ajar dan akan meminta perbaikan/pengembangan pada bagian tertentu.
Jawablah ringkas, praktis, dalam Bahasa Indonesia, sesuai konteks modul yang diberikan.`;

    const result = await geminiAi.generateText({
      systemPrompt,
      userPrompt: `${contextText}PERTANYAAN GURU:\n${message}`,
      temperature: 0.6,
    });
    res.json({ text: result });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'AI gagal memproses permintaan' : error.message });
  }
});

// AI Chat khusus untuk Siswa (Asisten Sekolah)
app.post('/api/ai/student-chat', requireAuth, async (req: any, res: any) => {
  try {
    if (!geminiAi.enabled) return res.status(400).json({ error: 'AI belum aktif.' });
    
    const messages = req.body.messages || [];
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Pesan chat kosong' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
    const schoolName = tenant?.name || 'Sekolah';
    
    // Susun histori chat untuk dikirim ke Gemini
    const userPrompt = messages.map((m: any) => `${m.role === 'user' ? 'Siswa' : 'AI'}: ${m.content}`).join('\n\n') + '\n\nAI:';

    const systemPrompt = `Kamu bukan Google Gemini atau asisten AI biasa. Kamu adalah AI cerdas dan ramah resmi dari ${schoolName}.
Tugas utamamu adalah membantu siswa dalam belajar, menjawab pertanyaan materi, dan memotivasi mereka.
Jika ditanya siapa kamu, jawablah bahwa kamu adalah AI ${schoolName} yang siap membantu.
Gunakan bahasa yang edukatif, ramah, dan sesuai dengan siswa sekolah. Jawablah langsung inti masalah dan jangan terlalu bertele-tele.`;

    const result = await geminiAi.generateText({
      systemPrompt,
      userPrompt: userPrompt,
      temperature: 0.5,
    });
    
    res.json({ text: result });
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Student AI Chat Failed');
    res.status(500).json({ error: 'Gagal menghubungi server AI', detail: error.message });
  }
});

// --- CALENDAR API ---
// Returns a unified feed of events for a given month, RBAC-filtered by role.
// Each event: { id, type: 'assignment'|'attendance'|'announcement', title, date, meta }
app.get('/api/calendar', requireAuth, async (req: any, res: any) => {
  try {
    const now = new Date();
    const year = parseInt((req.query.year as string) || String(now.getFullYear()));
    const month = parseInt((req.query.month as string) || String(now.getMonth() + 1)); // 1-indexed

    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 1); // exclusive

    const { tenantId, roleSlug, studentId, teacherId } = req.user;
    const events: any[] = [];

    // --- Pre-fetch accessible courses to avoid schema relation gaps ---
    let allowedCourseIds: string[] = [];
    const courseMap: Record<string, any> = {};

    if (roleSlug === 'student' && studentId) {
      const enrollments = await prisma.studentEnrollment.findMany({
        where: { studentId, status: 'ACTIVE', deletedAt: null },
        select: { classId: true }
      });
      const classIds = enrollments.map((e: any) => e.classId);
      const enrolledCourses = await prisma.course.findMany({
        where: { classId: { in: classIds }, deletedAt: null },
        select: { id: true, subject: { select: { name: true } } }
      });
      enrolledCourses.forEach((c: any) => courseMap[c.id] = c);
      allowedCourseIds = enrolledCourses.map((c: any) => c.id);
    } else if (roleSlug === 'teacher' && teacherId) {
      const taughtCourses = await prisma.course.findMany({
        where: {
          deletedAt: null,
          OR: [
            { primaryTeacherId: teacherId },
            { coTeachers: { some: { teacherId } } }
          ]
        },
        select: { id: true, subject: { select: { name: true } } }
      });
      taughtCourses.forEach((c: any) => courseMap[c.id] = c);
      allowedCourseIds = taughtCourses.map((c: any) => c.id);
    } else if (roleSlug === 'admin') {
      const allCourses = await prisma.course.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, subject: { select: { name: true } } }
      });
      allCourses.forEach((c: any) => courseMap[c.id] = c);
      allowedCourseIds = allCourses.map((c: any) => c.id);
    }

    // --- Assignments ---
    const assignmentWhere: any = {
      tenantId,
      deletedAt: null,
      dueDate: { gte: from, lt: to },
    };

    if (roleSlug !== 'admin') {
      if ((roleSlug === 'student' && studentId) || (roleSlug === 'teacher' && teacherId)) {
        assignmentWhere.courseId = { in: allowedCourseIds };
      } else {
        assignmentWhere.id = 'none'; // Fallback for incomplete profiles
      }
    }

    const assignments = await prisma.assignment.findMany({
      where: assignmentWhere,
      select: {
        id: true,
        title: true,
        dueDate: true,
        maxScore: true,
        status: true,
        courseId: true
      },
      orderBy: { dueDate: 'asc' },
      take: 200
    });

    for (const a of assignments) {
      events.push({
        id: a.id,
        type: 'assignment',
        title: a.title,
        date: a.dueDate,
        meta: {
          status: a.status,
          maxScore: a.maxScore,
          courseId: a.courseId,
          subjectName: courseMap[a.courseId]?.subject?.name || 'Unknown Subject'
        }
      });
    }

    // --- Attendance Sessions ---
    const attendanceWhere: any = {
      tenantId,
      deletedAt: null,
      date: { gte: from, lt: to },
    };

    if (roleSlug !== 'admin') {
      if ((roleSlug === 'student' && studentId) || (roleSlug === 'teacher' && teacherId)) {
        attendanceWhere.courseId = { in: allowedCourseIds };
      } else {
        attendanceWhere.id = 'none';
      }
    }

    const sessions = await prisma.attendanceSession.findMany({
      where: attendanceWhere,
      select: {
        id: true,
        date: true,
        topic: true,
        courseId: true
      },
      orderBy: { date: 'asc' },
      take: 200
    });

    for (const s of sessions) {
      events.push({
        id: s.id,
        type: 'attendance',
        title: s.topic || 'Attendance Session',
        date: s.date,
        meta: {
          courseId: s.courseId,
          subjectName: courseMap[s.courseId]?.subject?.name || 'Unknown Subject'
        }
      });
    }

    // --- Announcements ---
    const announcementWhere: any = {
      tenantId,
      deletedAt: null,
      publishedAt: { gte: from, lt: to },
      status: 'PUBLISHED'
    };

    if (roleSlug !== 'admin') {
      if ((roleSlug === 'student' && studentId) || (roleSlug === 'teacher' && teacherId)) {
        announcementWhere.courseId = { in: allowedCourseIds };
      } else {
        announcementWhere.id = 'none';
      }
    }

    const announcements = await prisma.announcement.findMany({
      where: announcementWhere,
      select: { id: true, title: true, publishedAt: true },
      orderBy: { publishedAt: 'asc' },
      take: 100
    });
    
    for (const ann of announcements) {
      events.push({
        id: ann.id,
        type: 'announcement',
        title: ann.title,
        date: ann.publishedAt,
        meta: {}
      });
    }

    // Sort all events by date ascending
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({ year, month, events });
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to fetch calendar');
    res.status(500).json({ error: 'Server error' });
  }
});

// --- ELT API (English Language Teaching) ---
// Activities spanning 5 skills: Speaking, Listening, Reading, Writing, Grammar, Vocabulary.
// Plus collaborative (discussion / peer review) and per-skill progress analytics.

const ELT_ACTIVITY_TYPES = ['VOICE_RECORDING','PRONUNCIATION_AI','LISTENING_VIDEO','LISTENING_TRANSCRIPT','READING_PASSAGE','WRITING_ESSAY','GRAMMAR_SPELL','CLOZE_TEST','VOCAB_FLASHCARD','VOCAB_QUIZ','DISCUSSION','PEER_REVIEW'];
const ELT_SKILLS = ['SPEAKING','LISTENING','READING','WRITING','GRAMMAR','VOCABULARY'];

// Resolve courses visible to the current user (teacher/student/admin).
const getVisibleCourseIds = async (prisma: any, user: any): Promise<any> => {
  const { tenantId, roleSlug, studentId, teacherId } = user;
  if (roleSlug === 'student' && studentId) {
    const enrollments = await prisma.studentEnrollment.findMany({ where: { studentId, status: 'ACTIVE', deletedAt: null }, select: { classId: true } });
    const classIds = enrollments.map((e: any) => e.classId);
    if (!classIds.length) return [];
    const courses = await prisma.course.findMany({ where: { classId: { in: classIds }, deletedAt: null }, select: { id: true } });
    return courses.map((c: any) => c.id);
  }
  if (roleSlug === 'teacher' && teacherId) {
    const courses = await prisma.course.findMany({ where: { deletedAt: null, OR: [{ primaryTeacherId: teacherId }, { coTeachers: { some: { teacherId } } }] }, select: { id: true } });
    return courses.map((c: any) => c.id);
  }
  if (roleSlug === 'admin' || roleSlug === 'super_admin') {
    const courses = await prisma.course.findMany({ where: { tenantId, deletedAt: null }, select: { id: true } });
    return courses.map((c: any) => c.id);
  }
  return [];
};

// --- List ELT activities (role-aware) ---
app.get('/api/elt/activities', requireAuth, async (req: any, res: any) => {
  try {
    const { courseId, skillType, activityType } = req.query;
    const user = req.user;
    const where: any = { tenantId: user.tenantId, deletedAt: null };

    const courseIds = await getVisibleCourseIds(prisma, user);
    if (courseId) {
      if (user.roleSlug !== 'admin' && user.roleSlug !== 'super_admin' && !courseIds.includes(courseId)) {
        return res.status(403).json({ error: 'Not authorized to access this course' });
      }
      where.courseId = courseId;
    } else {
      where.courseId = { in: courseIds };
    }
    if (skillType) where.skillType = skillType;
    if (activityType) where.activityType = activityType;

    const activities = await prisma.eltActivity.findMany({
      where,
      include: { _count: { select: { attempts: true, items: true } } },
      orderBy: [{ courseId: 'asc' }, { publishedAt: 'desc' }]
    });
    // attach my attempt for students
    let myAttemptMap: Record<string, any> = {};
    if (user.roleSlug === 'student' && user.studentId) {
      const attempts = await prisma.eltAttempt.findMany({ where: { studentId: user.studentId, activityId: { in: activities.map((a: any) => a.id) } } });
      for (const a of attempts) myAttemptMap[a.activityId] = a;
    }
    const courseIdsFlat = [...new Set(activities.map((a: any) => a.courseId))];
    const courses = courseIdsFlat.length ? await prisma.course.findMany({ where: { id: { in: courseIdsFlat } }, select: { id: true, subject: { select: { name: true } } } }) : [];
    const courseName = (id: string) => courses.find((c: any) => c.id === id)?.subject?.name || 'Unknown';

    res.json({
      data: activities.map((a: any) => ({ ...a, courseName: courseName(a.courseId), myAttempt: myAttemptMap[a.id] || null })),
    });
  } catch (error: any) {
    Logger.error({ error: error.message }, 'Failed to fetch elt activities');
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Create ELT activity (teacher/admin) ---
app.post('/api/elt/activities', requireAuth, async (req: any, res: any) => {
  try {
    const role = req.user.roleSlug;
    if (role !== 'teacher' && role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({ error: 'Only teachers and admins can create activities' });
    }
    const { courseId, title, instructions, skillType, activityType, config, cefrLevel } = req.body;
    if (!courseId || !title || !skillType || !activityType) {
      return res.status(400).json({ error: 'courseId, title, skillType, dan activityType wajib diisi' });
    }
    if (!ELT_ACTIVITY_TYPES.includes(activityType)) return res.status(400).json({ error: 'Invalid activityType' });
    if (!ELT_SKILLS.includes(skillType)) return res.status(400).json({ error: 'Invalid skillType' });

    const before = await prisma.course.count({ where: { id: courseId, tenantId: req.user.tenantId, deletedAt: null } });
    if (!before) return res.status(404).json({ error: 'Course not found' });

    const activity = await prisma.eltActivity.create({
      data: {
        tenantId: req.user.tenantId,
        courseId,
        createdById: req.user.userId,
        title: String(title),
        instructions: String(instructions || ''),
        skillType,
        activityType,
        config: config || undefined,
        cefrLevel: cefrLevel || null,
        status: 'VISIBLE',
        publishedAt: new Date(),
      }
    });
    res.status(201).json(activity);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- Get single activity with items ---
app.get('/api/elt/activities/:id', requireAuth, async (req: any, res: any) => {
  try {
    const activity = await prisma.eltActivity.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null } });
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    const [items, course, myAttempt] = await Promise.all([
      prisma.eltItem.findMany({ where: { activityId: activity.id }, orderBy: { order: 'asc' } }),
      prisma.course.findUnique({ where: { id: activity.courseId }, select: { id: true, subject: { select: { name: true } } } }),
      req.user.studentId
        ? prisma.eltAttempt.findFirst({ where: { activityId: activity.id, studentId: req.user.studentId } })
        : Promise.resolve(null),
    ]);
    const attemptWithUrl = myAttempt ? { ...myAttempt, recordingFileUrl: myAttempt.recordingFileId ? (await (async () => { const a = await prisma.asset.findUnique({ where: { id: myAttempt.recordingFileId } }); return a ? `/storage/${a.storageKey}` : null; })()) : null } : null;
    res.json({ ...activity, courseName: course?.subject?.name || 'Unknown', items, myAttempt: attemptWithUrl });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Update activity (owner teacher/admin) ---
app.put('/api/elt/activities/:id', requireAuth, async (req: any, res: any) => {
  try {
    const existing = await prisma.eltActivity.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null } });
    if (!existing) return res.status(404).json({ error: 'Activity not found' });
    if (req.user.roleSlug === 'teacher' && existing.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to edit this activity' });
    }
    const { title, instructions, skillType, activityType, config, cefrLevel, status } = req.body;
    const updated = await prisma.eltActivity.update({
      where: { id: existing.id },
      data: {
        ...(title !== undefined && { title }),
        ...(instructions !== undefined && { instructions }),
        ...(skillType !== undefined && ELT_SKILLS.includes(skillType) ? { skillType } : {}),
        ...(activityType !== undefined && ELT_ACTIVITY_TYPES.includes(activityType) ? { activityType } : {}),
        ...(config !== undefined && { config }),
        ...(cefrLevel !== undefined && { cefrLevel }),
        ...(status !== undefined && { status }),
      }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- Delete activity (soft) ---
app.delete('/api/elt/activities/:id', requireAuth, async (req: any, res: any) => {
  try {
    const existing = await prisma.eltActivity.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null } });
    if (!existing) return res.status(404).json({ error: 'Activity not found' });
    if (req.user.roleSlug === 'teacher' && existing.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this activity' });
    }
    await prisma.eltActivity.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- Add item (flashcard / cloze / quiz) to activity ---
app.post('/api/elt/activities/:id/items', requireAuth, async (req: any, res: any) => {
  try {
    const existing = await prisma.eltActivity.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null } });
    if (!existing) return res.status(404).json({ error: 'Activity not found' });
    if (req.user.roleSlug === 'teacher' && existing.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { itemType, front, back, options, audioUrl, hint } = req.body;
    if (!itemType || !front) return res.status(400).json({ error: 'itemType and front wajib diisi' });
    const last = await prisma.eltItem.findFirst({ where: { activityId: existing.id }, orderBy: { order: 'desc' } });
    const item = await prisma.eltItem.create({
      data: { tenantId: req.user.tenantId, activityId: existing.id, itemType, order: last ? last.order + 1 : 1, front, back: back || null, options: options || undefined, hint: hint || null, audioUrl: audioUrl || null }
    });
    res.status(201).json(item);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- Submit an attempt (student) with optional audio upload ---
app.post('/api/elt/attempts', requireAuth, upload.single('audio'), async (req: any, res: any) => {
  try {
    const user = req.user;
    if (user.roleSlug !== 'student') return res.status(403).json({ error: 'Only students can submit attempts' });
    if (!user.studentId) return res.status(403).json({ error: 'Student profile not found' });

    const { activityId, content, recordingDurationSec, answers, selfGrade } = req.body;
    const activity = await prisma.eltActivity.findFirst({ where: { id: activityId, tenantId: user.tenantId, deletedAt: null } });
    if (!activity) return res.status(404).json({ error: 'Activity not found' });

    const file = req.file as Express.Multer.File | undefined;
    let recordingFileId: string | undefined;

    if (file) {
      const asset = await prisma.asset.create({
        data: {
          tenantId: user.tenantId,
          fingerprint: crypto.createHash('sha256').update(file.filename + Date.now()).digest('hex'),
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          storageProvider: 'LOCAL',
          storageKey: file.filename,
          status: 'READY',
          durationSeconds: recordingDurationSec ? parseInt(recordingDurationSec) : null,
          createdById: user.userId,
        }
      });
      recordingFileId = asset.id;
    }

    const existingAttempt = await prisma.eltAttempt.findUnique({ where: { activityId_studentId: { activityId, studentId: user.studentId } } });
    let attempt;
    if (existingAttempt) {
      attempt = await prisma.eltAttempt.update({
        where: { id: existingAttempt.id },
        data: {
          status: 'SUBMITTED',
          content: content ?? existingAttempt.content,
          answers: answers ?? existingAttempt.answers,
          recordingFileId: recordingFileId || existingAttempt.recordingFileId,
          recordingDurationSec: recordingDurationSec ? parseInt(recordingDurationSec) : existingAttempt.recordingDurationSec,
          selfGrade: selfGrade ? parseFloat(selfGrade) : existingAttempt.selfGrade,
          submittedAt: new Date(),
        }
      });
    } else {
      attempt = await prisma.eltAttempt.create({
        data: {
          tenantId: user.tenantId,
          activityId: activity.id,
          studentId: user.studentId,
          courseId: activity.courseId,
          status: 'SUBMITTED',
          content: content || null,
          answers: answers || undefined,
          recordingFileId,
          recordingDurationSec: recordingDurationSec ? parseInt(recordingDurationSec) : null,
          selfGrade: selfGrade ? parseFloat(selfGrade) : null,
          submittedAt: new Date(),
        }
      });
    }

    let recordingFileUrl: string | null = null;
    if (file) {
      recordingFileUrl = `/storage/${file.filename}`;
    } else if (attempt.recordingFileId) {
      const a = await prisma.asset.findUnique({ where: { id: attempt.recordingFileId } });
      recordingFileUrl = a ? `/storage/${a.storageKey}` : null;
    }
    res.status(201).json({ ...attempt, recordingFileUrl });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- Teacher view all attempts for an activity ---
app.get('/api/elt/activities/:id/attempts', requireAuth, async (req: any, res: any) => {
  try {
    const activity = await prisma.eltActivity.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null } });
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    const attempts = await prisma.eltAttempt.findMany({
      where: { activityId: activity.id },
      include: { reviews: true },
      orderBy: { submittedAt: 'desc' },
      take: 500
    });
    const studentIds = [...new Set(attempts.map((a: any) => a.studentId))];
    const students = studentIds.length
      ? await prisma.user.findMany({ where: { studentProfile: { id: { in: studentIds } } }, select: { id: true, studentProfile: { select: { id: true, fullName: true } } } })
      : [];
    const studentMap: Record<string, any> = {};
    for (const s of students) if (s.studentProfile) studentMap[s.studentProfile.id] = s;
    const recordIds = [...new Set(attempts.map((a: any) => a.recordingFileId).filter(Boolean))];
    const recs = recordIds.length ? await prisma.asset.findMany({ where: { id: { in: recordIds } }, select: { id: true, storageKey: true } }) : [];
    const recMap: Record<string, string> = {};
    for (const r of recs) recMap[r.id] = `/storage/${r.storageKey}`;

    res.json({
      data: attempts.map((a: any) => ({
        ...a,
        studentName: studentMap[a.studentId]?.studentProfile?.fullName || 'Unknown',
        studentEmail: studentMap[a.studentId]?.email || '',
        recordingFileUrl: a.recordingFileId ? recMap[a.recordingFileId] || null : null,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Grade an attempt (teacher decision) ---
app.post('/api/elt/attempts/:id/grade', requireAuth, async (req: any, res: any) => {
  try {
    const existing = await prisma.eltAttempt.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
    if (!existing) return res.status(404).json({ error: 'Attempt not found' });
    const activity = await prisma.eltActivity.findFirst({ where: { id: existing.activityId } });
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    const role = req.user.roleSlug;
    if (role !== 'admin' && role !== 'super_admin') {
      if (role !== 'teacher' || !req.user.teacherId) {
        return res.status(403).json({ error: 'Only teachers can grade attempts' });
      }
      const isTeacherOfCourse = await prisma.course.count({
        where: { id: activity.courseId, OR: [{ primaryTeacherId: req.user.teacherId }, { coTeachers: { some: { teacherId: req.user.teacherId } } }] }
      });
      if (!isTeacherOfCourse && activity.createdById !== req.user.userId) {
        return res.status(403).json({ error: 'Not authorized to grade this attempt' });
      }
    }
    const { finalGrade, feedback, status } = req.body;
    const updated = await prisma.eltAttempt.update({
      where: { id: existing.id },
      data: {
        finalGrade: finalGrade !== undefined ? parseFloat(finalGrade) : existing.finalGrade,
        feedback: feedback !== undefined ? feedback : existing.feedback,
        status: status || 'GRADED',
        gradedAt: new Date(),
        gradedById: req.user.userId,
      }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- Add comment / peer review (student or teacher) ---
app.post('/api/elt/activities/:id/comments', requireAuth, upload.single('audio'), async (req: any, res: any) => {
  try {
    const activity = await prisma.eltActivity.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null } });
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    const { content, parentId, attemptId, targetAsset, rating } = req.body;
    const file = req.file as Express.Multer.File | undefined;
    let audioFileId: string | undefined;
    if (file) {
      const asset = await prisma.asset.create({ data: { tenantId: req.user.tenantId, fingerprint: crypto.createHash('sha256').update(file.originalname + Date.now()).digest('hex'), originalName: file.originalname, mimeType: file.mimetype, sizeBytes: file.size, storageProvider: 'LOCAL', storageKey: file.filename, status: 'READY', createdById: req.user.userId } });
      audioFileId = asset.id;
    }
    const comment = await prisma.eltComment.create({
      data: {
        tenantId: req.user.tenantId,
        activityId: activity.id,
        authorId: req.user.userId,
        authorRole: req.user.roleSlug,
        parentId: parentId || null,
        attemptId: attemptId || null,
        targetAsset: targetAsset || null,
        rating: rating ? parseInt(rating) : null,
        content: content || (file ? 'voice note' : ''),
        audioFileId,
      }
    });
    res.status(201).json({ ...comment, audioFileUrl: file ? `/storage/${file.filename}` : null });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- List comments (threaded) for an activity ---
app.get('/api/elt/activities/:id/comments', requireAuth, async (req: any, res: any) => {
  try {
    const comments = await prisma.eltComment.findMany({ where: { activityId: req.params.id, tenantId: req.user.tenantId, parentId: null }, include: { replies: true }, orderBy: { createdAt: 'asc' } });
    const authorIds = [...new Set(comments.map((c: any) => c.authorId))];
    const users = authorIds.length ? await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, email: true, teacherProfile: { select: { fullName: true } }, studentProfile: { select: { fullName: true } } } }) : [];
    const userMap: Record<string, any> = {};
    for (const u of users) userMap[u.id] = { name: u.teacherProfile?.fullName || u.studentProfile?.fullName || u.email, role: u.teacherProfile ? 'teacher' : 'student' };
    const mapComment = (c: any) => ({ ...c, authorName: userMap[c.authorId]?.name || 'Unknown', replies: c.replies?.map(mapComment) || [] });
    res.json({ data: comments.map(mapComment) });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Skill progress analytics for a course ---
app.get('/api/elt/progress', requireAuth, async (req: any, res: any) => {
  try {
    const { courseId, skillType } = req.query;
    const where: any = { tenantId: req.user.tenantId, deletedAt: null };
    if (courseId) where.courseId = courseId;
    if (skillType) where.skillType = skillType;
    const activities = await prisma.eltActivity.findMany({ where, select: { id: true, skillType: true, activityType: true, title: true, courseId: true, _count: { select: { items: true } } } });
    const activityIds = activities.map((a: any) => a.id);
    const attempts = activityIds.length ? await prisma.eltAttempt.findMany({ where: { activityId: { in: activityIds }, status: { not: 'DRAFT' } } }) : [];

    // student view: personal progress
    if (req.user.roleSlug === 'student' && req.user.studentId) {
      const mine = attempts.filter((a: any) => a.studentId === req.user.studentId);
      const bySkill: any = {};
      for (const s of ELT_SKILLS) bySkill[s] = { done: activities.filter((a: any) => a.skillType === s).length ? mine.filter((a: any) => { const act = activities.find((x: any) => x.id === a.activityId); return act && act.skillType === s; }).length : 0, total: activities.filter((a: any) => a.skillType === s).length };
      return res.json({ skillType: 'person', skills: bySkill, activities: activities.map((a: any) => ({ id: a.id, skillType: a.skillType, activityType: a.activityType, _count: a._count })) });
    }

    // teacher/admin: class overview per activity
    const studentIds = [...new Set(attempts.map((a: any) => a.studentId))];
    const students = studentIds.length ? await prisma.studentProfile.findMany({ where: { id: { in: studentIds } }, select: { id: true, fullName: true } }) : [];
    const rows = activities.map((a: any) => {
      const group = attempts.filter((x: any) => x.activityId === a.id);
      const graded = group.filter((x: any) => x.finalGrade !== null);
      return {
        activityId: a.id,
        skillType: a.skillType,
        activityType: a.activityType,
        courseId: a.courseId,
        totalStudents: students.length,
        attempts: group.length,
        graded: graded.length,
        avgScore: graded.length ? Math.round((graded.reduce((s: any, x: any) => s + (x.finalGrade || 0), 0) / graded.length) * 10) / 10 : null,
      };
    });
    res.json({ totalType: 'class', bySkill: ELT_SKILLS.map((s) => ({ skillType: s, activities: rows.filter((r: any) => r.skillType === s).length, attempts: rows.filter((r) => r.skillType === s).reduce((sum, r) => sum + r.attempts, 0), graded: rows.filter((r) => r.skillType === s).reduce((sum, r) => sum + r.graded, 0) })), activities: rows });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// INFORMATICS / CODING LAB  (English & Informatics feature set)
// Executors + autograder + challenges + projects + leaderboard + badges
// ---------------------------------------------------------------------------
const runCode = (
  language: string,
  code: string,
  stdinInput: string,
  timeoutMs: number
): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean; ms: number }> =>
  new Promise((resolve) => {
    const started = Date.now();
    const finish = (stdout: string, stderr: string, exitCode: number, timedOut = false) =>
      resolve({ stdout, stderr, exitCode, timedOut, ms: Date.now() - started });

    let cmd: string, args: string[];
    if (language === 'PYTHON') {
      cmd = 'python'; args = ['-u', '-c', code];
    } else if (language === 'JAVASCRIPT') {
      cmd = 'node'; args = ['-e', code];
    } else if (language === 'HTML' || language === 'CSS') {
      cmd = 'node'; args = ['-e', 'console.log("Web/markup code renders client-side in the browser editor.")'];
    } else if (language === 'SQL') {
      const sdir = path.join(storagePath, `sql_${Date.now()}_${Math.floor(Math.random() * 1e6)}`);
      fs.mkdirSync(sdir, { recursive: true });
      const sfile = path.join(sdir, 'run.mjs');
      const esc = code.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
      const script = `import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync(':memory:');
const setup = \`CREATE TABLE students(id INTEGER PRIMARY KEY, name TEXT, class TEXT);
INSERT INTO students VALUES (1,'Ani','X-1'),(2,'Budi','X-1'),(3,'Citra','X-2');
CREATE TABLE grades(id INTEGER PRIMARY KEY, student_id INTEGER, subject TEXT, score INTEGER);
INSERT INTO grades VALUES (1,1,'Mat',90),(2,1,'Fis',80),(3,2,'Mat',75),(4,3,'Mat',95);\`;
db.exec(setup);
const sql = \`${esc}\`;
let out = '';
try {
  const st = db.prepare(sql);
  if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().includes('RETURNING')) {
    const rows = st.all();
    out = rows.length === 0 ? '(0 rows)' : JSON.stringify(rows, null, 2);
  } else {
    const info = st.run();
    out = JSON.stringify({ changes: Number(info.changes ?? 0), lastInsertRowid: Number(info.lastInsertRowid ?? 0) });
  }
} finally { db.close(); }
console.log(out);`;
      fs.writeFileSync(sfile, script);
      execFile('node', [sfile], { timeout: timeoutMs + 3000 }, (sErr, so, se) => {
        try { fs.rmSync(sdir, { recursive: true, force: true }); } catch {}
        if (sErr) finish('', `SQL ERROR\n${(se || String(sErr)).toString().split('\\n')[0]}`, 1);
        else finish(so || '', se || '', 0);
      });
      return;
    } else if (language === 'CPP' || language === 'JAVA') {
      const ext = language === 'CPP' ? 'cpp' : 'java';
      const dir = path.join(storagePath, `lang_${Date.now()}_${Math.floor(Math.random() * 1e6)}`);
      fs.mkdirSync(dir, { recursive: true });
      const srcName = language === 'JAVA' ? 'Main.java' : `main.${ext === 'java' ? 'java' : 'cpp'}`;
      const src = path.join(dir, srcName);
      fs.writeFileSync(src, code);
      const GPP = process.env.CPP_COMPILER || (process.platform === 'win32' ? 'C:\\mingw64\\bin\\g++.exe' : 'g++');
      const compiler = language === 'CPP' ? GPP : 'javac';
      const cArgs = language === 'CPP' ? [src, '-o', path.join(dir, 'a.exe')] : ['-d', dir, src];
      execFile(compiler, cArgs, { timeout: timeoutMs + 4000 }, (cErr) => {
        if (cErr) {
          const msg = (cErr as any).message || String(cErr);
          try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
          finish('', `COMPILE ERROR\n${msg.split('\n')[0]}\n${(msg.split('\n')[1] || '')}`, 2);
          return;
        }
        const runCmd = language === 'CPP' ? path.join(dir, 'a.exe') : 'java';
        const runArgs = language === 'CPP' ? [] : ['-cp', dir, 'Main'];
        const env = process.platform === 'win32' && language === 'CPP' ? { ...process.env, PATH: path.dirname(GPP) + path.delimiter + (process.env.PATH || '') } : undefined;
        const child = spawn(runCmd, runArgs, { shell: false, cwd: process.cwd(), env });
        let so = '', se = '';
        const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} finish(so, se, 1, true); }, timeoutMs);
        child.stdout.on('data', d => so += d);
        child.stderr.on('data', d => se += d);
        child.on('error', () => { clearTimeout(timer); finish(so, se, 1); });
        child.on('close', (c2: any) => { clearTimeout(timer); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} finish(so, se, c2 || 0); });
        if (stdinInput) child.stdin.write(stdinInput);
        child.stdin.end();
      });
      return;
    } else {
      finish('', `Unsupported language: ${language}`, 1);
      return;
    }

    const child = spawn(cmd, args, { shell: false });
    let so = '', se = '';
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} finish(so, se, 1, true); }, timeoutMs);
    child.stdout.on('data', d => so += d);
    child.stderr.on('data', d => se += d);
    child.on('error', (err: any) => { clearTimeout(timer); finish(so, se || `runtime error: ${err.message}`, 1); });
    child.on('close', (cod: any) => { clearTimeout(timer); finish(so, se, cod || 0); });
    if (stdinInput) child.stdin.write(stdinInput);
    child.stdin.end();
  });

const normalizeOut = (s: string) => (s || '').replace(/\r\n/g, '\n').replace(/\s+$/, '');

// --- Standalone code runner (editor "Run" button) ---
app.post('/api/informatics/run', requireAuth, async (req: any, res: any) => {
  try {
    const { language, code, input } = req.body;
    if (!code) return res.status(400).json({ error: 'Kode wajib diisi.' });
    const r = await runCode(language || 'PYTHON', code, input || '', 4000);
    res.json({ stdout: r.stdout, stderr: r.stderr, exitCode: r.exitCode, timedOut: r.timedOut, ms: r.ms });
  } catch (error: any) {
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
  }
});

// --- Own & all challenges (RBAC) ---
app.get('/api/informatics/challenges', requireAuth, async (req: any, res: any) => {
  try {
    const { courseId, difficulty, language, q } = req.query;
    const where: any = { tenantId: req.user.tenantId, deletedAt: null };
    if (courseId) where.courseId = courseId;
    if (difficulty) where.difficulty = difficulty;
    if (language) where.language = language;
    if (q) where.title = { contains: q, mode: 'insensitive' };
    const items = await prisma.codingChallenge.findMany({
      where,
      include: { course: courseId ? false : { select: { id: true, subject: { select: { name: true } } } } },
      orderBy: [{ difficulty: 'asc' }, { createdAt: 'desc' }],
      take: 500
    });
    const studentId = req.user.studentId;
    let attemptMap: Record<string, any> = {};
    if (studentId && items.length) {
      const atts = await prisma.codingAttempt.findMany({ where: { studentId, challengeId: { in: items.map((i: any) => i.id) } } });
      for (const a of atts) attemptMap[a.challengeId] = a;
    }
    res.json({
      data: items.map((i: any) => ({
        ...i,
        testCasesHidden: true, // don't leak
        myAttempt: attemptMap[i.id] ? { status: attemptMap[i.id].status, score: attemptMap[i.id].score, passedTests: attemptMap[i.id].passedTests, totalTests: attemptMap[i.id].totalTests } : null,
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Create challenge (teacher/admin) ---
app.post('/api/informatics/challenges', requireAuth, async (req: any, res: any) => {
  try {
    const role = req.user.roleSlug;
    if (role !== 'teacher' && role !== 'admin' && role !== 'super_admin') return res.status(403).json({ error: 'Only teachers and admins can create challenges' });
    const { title, description, difficulty, language, score, points, starterCode, testCases, courseId } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'title and description wajib diisi' });
    const ch = await prisma.codingChallenge.create({
      data: {
        tenantId: req.user.tenantId,
        courseId: courseId || null,
        createdById: req.user.userId,
        title, description,
        difficulty: difficulty || 'EASY',
        language: language || 'PYTHON',
        score: score || 50,
        points: points || 10,
        starterCode: starterCode || null,
        testCases: testCases || null,
        status: 'VISIBLE',
      }
    });
    res.status(201).json(ch);
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- Single challenge (with test cases visible to students so they can practise) ---
app.get('/api/informatics/challenges/:id', requireAuth, async (req: any, res: any) => {
  try {
    const ch = await prisma.codingChallenge.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null } });
    if (!ch) return res.status(404).json({ error: 'Challenge not found' });
    let myAttempt = null;
    if (req.user.studentId) {
      myAttempt = await prisma.codingAttempt.findUnique({ where: { challengeId_studentId: { challengeId: ch.id, studentId: req.user.studentId } } });
    }
    res.json({ ...ch, myAttempt });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Submit solution -> autograde via test cases ---
app.post('/api/informatics/challenges/:id/submit', requireAuth, async (req: any, res: any) => {
  try {
    if (req.user.roleSlug !== 'student') return res.status(403).json({ error: 'Only students can submit solutions' });
    if (!req.user.studentId) return res.status(403).json({ error: 'Student profile not found' });
    const ch = await prisma.codingChallenge.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null } });
    if (!ch) return res.status(404).json({ error: 'Challenge not found' });
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ error: 'Kode wajib diisi' });

    const cases: any[] = (ch.testCases as any) || [];
    if (!cases.length) {
      const r = await runCode(language || ch.language, code, '', 4000);
      const status = r.timedOut ? 'TIME_LIMIT' : (r.exitCode === 0 ? 'ACCEPTED' : 'RUNTIME_ERROR');
      const existingAtt = await prisma.codingAttempt.findUnique({ where: { challengeId_studentId: { challengeId: ch.id, studentId: req.user.studentId } } });
      const bestScore = Math.max(existingAtt?.score || 0, status === 'ACCEPTED' ? ch.points : 0);
      const att = await prisma.codingAttempt.upsert({
        where: { challengeId_studentId: { challengeId: ch.id, studentId: req.user.studentId } },
        update: { code, language: language || ch.language, status, passedTests: 0, totalTests: 0, output: r.stdout || r.stderr, compileError: r.exitCode !== 0 ? r.stderr : null, runtimeMs: r.ms, score: bestScore, acceptedAt: (status === 'ACCEPTED' || existingAtt?.acceptedAt) ? (existingAtt?.acceptedAt || new Date()) : null },
        create: { tenantId: req.user.tenantId, challengeId: ch.id, studentId: req.user.studentId, code, language: language || ch.language, status, passedTests: 0, totalTests: 0, output: r.stdout || r.stderr, compileError: r.exitCode !== 0 ? r.stderr : null, runtimeMs: r.ms, score: status === 'ACCEPTED' ? ch.points : 0, acceptedAt: status === 'ACCEPTED' ? new Date() : null }
      });
      return res.json(att);
    }

    let passed = 0;
    const results: any[] = [];
    let firstError = '';
    let timedOut = false;
    let totalMs = 0;
    for (const tc of cases) {
      const r = await runCode(language || ch.language, code, tc.input || '', 2000);
      totalMs = Math.max(totalMs, r.ms);
      if (r.timedOut) { timedOut = true; results.push({ ...tc, pass: false, reason: 'Time Limit' }); if (!firstError) firstError = 'Time Limit Exceeded'; break; }
      if (r.exitCode !== 0) { results.push({ ...tc, pass: false, reason: (r.stderr || 'runtime').slice(0, 200) }); if (!firstError) firstError = r.stderr; break; }
      const got = normalizeOut(r.stdout);
      const exp = normalizeOut(tc.expected !== undefined ? String(tc.expected) : '');
      if (got === exp) { passed++; results.push({ ...tc, pass: true, out: got }); }
      else { results.push({ ...tc, pass: false, out: got, expected: exp }); if (!firstError) firstError = `Expected "${exp}", got "${got}"`; }
    }

    const allPass = passed === cases.length;
    const status = timedOut ? 'TIME_LIMIT' : allPass ? 'ACCEPTED' : 'WRONG_ANSWER';
    const existingAtt = await prisma.codingAttempt.findUnique({ where: { challengeId_studentId: { challengeId: ch.id, studentId: req.user.studentId } } });
    const prevBest = existingAtt?.score || 0;
    const newScore = allPass ? ch.points : 0;
    const bestScore = Math.max(prevBest, newScore);
    const att = await prisma.codingAttempt.upsert({
      where: { challengeId_studentId: { challengeId: ch.id, studentId: req.user.studentId } },
      update: { code, language: language || ch.language, status, passedTests: passed, totalTests: cases.length, output: JSON.stringify(results), compileError: firstError || null, runtimeMs: totalMs, score: bestScore, acceptedAt: (allPass || existingAtt?.acceptedAt) ? (existingAtt?.acceptedAt || new Date()) : null },
      create: { tenantId: req.user.tenantId, challengeId: ch.id, studentId: req.user.studentId, code, language: language || ch.language, status, passedTests: passed, totalTests: cases.length, output: JSON.stringify(results), compileError: firstError || null, runtimeMs: totalMs, score: newScore, acceptedAt: allPass ? new Date() : null }
    });
    res.json({ ...att, results, firstError, totalMs, status });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message });
  }
});

// --- AI Code Reviewer (Gemini, non-answer-giving) ---
app.post('/api/informatics/review', requireAuth, async (req: any, res: any) => {
  try {
    const { code, language, focus } = req.body;
    if (!code) return res.status(400).json({ error: 'Kode wajib diisi' });
    if (!geminiAi.enabled) return res.status(400).json({ error: 'AI belum aktif. Tambahkan GEMINI_API_KEY pada server/.env atau set GEMINI_PROVIDER=web2.' });
    const systemPrompt = `Anda adalah AI Code Reviewer untuk pelajar Informatika SMA.
Jangan pernah menulis jawaban/kode jadi. Beri tips ringkas dalam Bahasa Indonesia:
1) Error: jelaskan penyebab & letak baris, tanpa memberikan solusi kode penuh.
2) Clean code: penamaan, struktur, komentar.
3) Efisiensi: kompleksitas Big-O bila relevan.
Akhiri dengan saran pertanyaan agar siswa berpikir sendiri. Fokus pada ${focus || 'kode'}.`;
    const userPrompt = `BAHASA: ${language || 'Python'}\nKODE SISWA:\n${code}`;
    const text = await geminiAi.generateText({ systemPrompt, userPrompt, temperature: 0.4 });
    res.json({ text });
  } catch (error: any) {
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'AI gagal memproses' : error.message });
  }
});

// --- Code similarity (token-based MOSS-lite comparison) ---
app.post('/api/informatics/similarity', requireAuth, async (req: any, res: any) => {
  try {
    const { codeA, codeB } = req.body;
    if (typeof codeA !== 'string' || typeof codeB !== 'string') return res.status(400).json({ error: 'codeA & codeB wajib' });
    const tok = (s: string) => s
      .replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/['"`][^'"`]*['"`]/g, '"')
      .replace(/[^a-zA-Z0-9_]/g, ' ')
      .split(/\s+/).filter(Boolean).map(w => w.toLowerCase());
    const a = tok(codeA), b = tok(codeB);
    if (!a.length || !b.length) return res.json({ similarity: 0 });
    const setA = new Set(a);
    let overlap = 0;
    for (const w of new Set(b)) if (setA.has(w)) overlap++;
    const union = new Set([...setA, ...new Set(b)]).size || 1;
    const sim = Math.round((overlap / union) * 100);
    res.json({ similarity: sim, note: sim > 75 ? 'High similarity detected — likely plagiarism. Verify manually.' : sim > 50 ? 'Moderate similarity. Review structure.' : 'Low similarity.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Informatics projects (multi-file / Git technical tasks) ---
app.get('/api/informatics/projects', requireAuth, async (req: any, res: any) => {
  try {
    const studentId = req.user.studentId;
    const items = await prisma.codingProject.findMany({ where: { tenantId: req.user.tenantId, deletedAt: null }, orderBy: { updatedAt: 'desc' }, take: 200 });
    let myMap: Record<string, any> = {};
    if (studentId && items.length) {
      const subs = await prisma.codingProjectSubmission.findMany({ where: { studentId, projectId: { in: items.map((i: any) => i.id) } } });
      for (const s of subs) myMap[s.projectId] = s;
    }
    res.json({ data: items.map((i: any) => ({ ...i, mySubmission: myMap[i.id] ? { status: myMap[i.id].status, score: myMap[i.id].score } : null })) });
  } catch (error: any) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/informatics/projects/:id', requireAuth, async (req: any, res: any) => {
  try {
    const project = await prisma.codingProject.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const subs = await prisma.codingProjectSubmission.findMany({ where: { projectId: project.id }, orderBy: { submittedAt: 'desc' }, take: 300 });
    const studentIds = [...new Set(subs.map((s: any) => s.studentId))];
    const users = studentIds.length ? await prisma.studentProfile.findMany({ where: { id: { in: studentIds } }, select: { id: true, fullName: true } }) : [];
    const my = req.user.studentId ? subs.find((s: any) => s.studentId === req.user.studentId) : null;
    res.json({ ...project, mySubmission: my || null, data: subs.map((s: any) => ({ ...s, studentName: users.find(u => u.id === s.studentId)?.fullName || 'Unknown' })) });
  } catch (error: any) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/informatics/projects', requireAuth, async (req: any, res: any) => {
  try {
    const role = req.user.roleSlug;
    if (role !== 'teacher' && role !== 'admin' && role !== 'super_admin') return res.status(403).json({ error: 'Only teachers can create projects' });
    const { title, description, maxScore, groupGit, courseId } = req.body;
    if (!title) return res.status(400).json({ error: 'Title wajib diisi' });
    const p = await prisma.codingProject.create({ data: { tenantId: req.user.tenantId, courseId: courseId || null, createdById: req.user.userId, title, description: description || '', maxScore: maxScore || 100, groupGit: groupGit !== false, status: 'VISIBLE', publishedAt: new Date() } });
    res.status(201).json(p);
  } catch (error: any) { res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message }); }
});

app.post('/api/informatics/projects/:id/submit', requireAuth, async (req: any, res: any) => {
  try {
    if (req.user.roleSlug !== 'student') return res.status(403).json({ error: 'Only students can submit' });
    if (!req.user.studentId) return res.status(403).json({ error: 'Student profile not found' });
    const project = await prisma.codingProject.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const { files, githubUrl, branch } = req.body;
    if (!files && !githubUrl) return res.status(400).json({ error: 'Upload file atau berikan URL Git' });
    const existing = await prisma.codingProjectSubmission.findFirst({ where: { projectId: project.id, studentId: req.user.studentId } });
    const sub = existing
      ? await prisma.codingProjectSubmission.update({ where: { id: existing.id }, data: { files: files || undefined, githubUrl: githubUrl || null, branch: branch || null, submittedAt: new Date() } })
      : await prisma.codingProjectSubmission.create({ data: { tenantId: req.user.tenantId, projectId: project.id, studentId: req.user.studentId, files: files || undefined, githubUrl: githubUrl || null, branch: branch || null, status: 'PENDING', submittedAt: new Date() } });
    res.status(201).json(sub);
  } catch (error: any) { res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message }); }
});

app.post('/api/informatics/projects/:id/grade', requireAuth, async (req: any, res: any) => {
  try {
    const role = req.user.roleSlug;
    if (role !== 'teacher' && role !== 'admin' && role !== 'super_admin') return res.status(403).json({ error: 'Only teacher/admin can grade' });
    const { score, feedback, submissionId } = req.body;
    if (!submissionId) return res.status(400).json({ error: 'submissionId wajib' });
    const sub = await prisma.codingProjectSubmission.findFirst({ where: { id: submissionId, tenantId: req.user.tenantId } });
    if (!sub) return res.status(404).json({ error: 'Submission not found' });
    const updated = await prisma.codingProjectSubmission.update({ where: { id: sub.id }, data: { score: score ? parseFloat(score) : sub.score, feedback: feedback ?? sub.feedback, status: 'ACCEPTED', gradedAt: new Date(), gradedById: req.user.userId } });
    res.json(updated);
  } catch (error: any) { res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message }); }
});

// --- Leaderboard (top aggregate of codingAttempts) ---
app.get('/api/informatics/leaderboard', requireAuth, async (req: any, res: any) => {
  try {
    const attempts = await prisma.codingAttempt.findMany({ where: { tenantId: req.user.tenantId }, select: { studentId: true, score: true, status: true } });
    const map: Record<string, any> = {};
    for (const a of attempts) {
      if (a.status !== 'ACCEPTED') continue;
      if (!map[a.studentId]) map[a.studentId] = { score: 0, solved: 0 };
      map[a.studentId].score += a.score;
      map[a.studentId].solved += 1;
    }
    const studentIds = Object.keys(map);
    const users = studentIds.length ? await prisma.studentProfile.findMany({ where: { id: { in: studentIds } }, select: { id: true, fullName: true } }) : [];
    const rows = studentIds.map(id => ({ studentId: id, studentName: users.find(u => u.id === id)?.fullName || 'Unknown', ...map[id] }))
      .sort((x, y) => y.score - x.score || y.solved - x.solved);
    res.json({ data: rows });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// PHYSICS LEARNING SUITE
// Helpers: parametric evaluation, data stats & regression
// ============================================================

// Deterministic pseudo-random for a given (seed, questionId) so each
// student keeps the same numbers across re-submits.
const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const roundTo = (v: number, d: number) => {
  const p = Math.pow(10, d || 0);
  return Math.round(v * p) / p;
};

// Fill a template string replacing {var} tokens with actual numbers.
const fillTemplate = (str: string, vars: Record<string, number>, decimals: number) =>
  (str || '').replace(/\{(\w+)\}/g, (_m, k) => (vars[k] != null ? String(roundTo(vars[k], decimals)) : ('{' + k + '}')));

const evaluateFormula = (expr: string, vars: Record<string, number>) => {
  const names = Object.keys(vars);
  const fn = new Function(...names, `"use strict"; return (${expr});`);
  return fn(...names.map(n => vars[n]));
};

// seq: { min, max, step, decimals } -> random value
const pickVar = (r: () => number, spec: any) => {
  const { min, max, step = 1, decimals = 0 } = spec;
  const range = max - min;
  const raw = min + r() * range;
  const stepped = step ? Math.round(raw / step) * step : raw;
  return roundTo(stepped, decimals ?? 0);
};

// Linear regression y = mx + c (via least squares)
const bestFitLine = (pts: { x: number; y: number }[]) => {
  const n = pts.length;
  if (!n) return { slope: 0, intercept: 0, r: 0 };
  const sx = pts.reduce((a, p) => a + p.x, 0);
  const sy = pts.reduce((a, p) => a + p.y, 0);
  const sxx = pts.reduce((a, p) => a + p.x * p.x, 0);
  const sxy = pts.reduce((a, p) => a + p.x * p.y, 0);
  const d = n * sxx - sx * sx;
  const slope = d !== 0 ? (n * sxy - sx * sy) / d : 0;
  const intercept = d !== 0 ? (sy - slope * sx) / n : 0;
  const syy = pts.reduce((a, p) => a + p.y * p.y, 0);
  const denom = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  const r = denom !== 0 ? (n * sxy - sx * sy) / denom : 0;
  return { slope, intercept, r };
};

const stats = (vals: number[]) => {
  if (!vals.length) return { mean: 0, stdev: 0, variance: 0, n: 0, min: 0, max: 0 };
  const n = vals.length;
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1 || 1);
  return {
    mean: roundTo(mean, 4), stdev: roundTo(Math.sqrt(variance), 4), variance: roundTo(variance, 4),
    n, min: Math.min(...vals), max: Math.max(...vals),
  };
};

// --- Simulations CRUD ---
app.get('/api/physics/simulations', requireAuth, async (req: any, res: any) => {
  try { const data = await prisma.physicsSimulation.findMany({ where: { tenantId: req.user.tenantId, deletedAt: null }, orderBy: { updatedAt: 'desc' }, take: 200 }); res.json({ data }); } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/physics/simulations', requireAuth, async (req: any, res: any) => {
  try {
    const role = req.user.roleSlug;
    if (role !== 'teacher' && role !== 'admin' && role !== 'super_admin') return res.status(403).json({ error: 'Only teachers can create simulations' });
    const { title, description, type, params, courseId } = req.body;
    if (!title) return res.status(400).json({ error: 'Judul wajib diisi' });
    const s = await prisma.physicsSimulation.create({ data: { tenantId: req.user.tenantId, courseId: courseId || null, createdById: req.user.userId, title, description: description || '', type: type || 'PROJECTILE', params: params || null } });
    res.status(201).json(s);
  } catch (e: any) { res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : e.message }); }
});

app.delete('/api/physics/simulations/:id', requireAuth, async (req: any, res: any) => {
  try { await prisma.physicsSimulation.updateMany({ where: { id: req.params.id, tenantId: req.user.tenantId }, data: { deletedAt: new Date() } }); res.json({ ok: true }); } catch { res.status(500).json({ error: 'Server error' }); }
});

// --- Virtual Labs CRUD ---
app.get('/api/physics/labs', requireAuth, async (req: any, res: any) => {
  try { const data = await prisma.physicsVirtualLab.findMany({ where: { tenantId: req.user.tenantId, deletedAt: null }, orderBy: { updatedAt: 'desc' }, take: 200 }); res.json({ data }); } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/physics/labs', requireAuth, async (req: any, res: any) => {
  try {
    const role = req.user.roleSlug;
    if (role !== 'teacher' && role !== 'admin' && role !== 'super_admin') return res.status(403).json({ error: 'Only teachers can create labs' });
    const { title, description, topic, instruments, instrumentsJson, steps, courseId } = req.body;
    if (!title) return res.status(400).json({ error: 'Judul wajib diisi' });
    const ins = instruments || (instrumentsJson ? (typeof instrumentsJson === 'string' ? { parsed: instrumentsJson } : instrumentsJson) : null);
    const l = await prisma.physicsVirtualLab.create({ data: { tenantId: req.user.tenantId, title, description: description || '', topic: topic || null, instruments: ins || null, procedure: steps || null, status: 'PUBLISHED', createdById: courseId ? undefined : req.user.userId } });
    res.status(201).json(l);
  } catch (e: any) { res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : e.message }); }
});

// --- Parametric questions ---
app.get('/api/physics/questions', requireAuth, async (req: any, res: any) => {
  try {
    const data = await prisma.physicsQuestion.findMany({ where: { tenantId: req.user.tenantId, deletedAt: null }, orderBy: { updatedAt: 'desc' }, take: 300 });
    const studentId = req.user.studentId;
    let attMap: Record<string, any> = {};
    if (studentId && data.length) {
      const atts = await prisma.physicsQuestionAttempt.findMany({ where: { studentId, questionId: { in: data.map((d: any) => d.id) } } });
      for (const a of atts) attMap[a.questionId] = a;
    }
    res.json({ data: data.map((d: any) => ({ ...d, myAttempt: attMap[d.id] ? { accepted: attMap[d.id].accepted, score: attMap[d.id].score } : null })) });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/physics/questions', requireAuth, async (req: any, res: any) => {
  try {
    const role = req.user.roleSlug;
    if (role !== 'teacher' && role !== 'admin' && role !== 'super_admin') return res.status(403).json({ error: 'Only teachers can create questions' });
    const { title, body, field, format, difficulty, points, variables, formula, hint, explanation, steps, courseId } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Judul dan isi wajib diisi' });
    const q = await prisma.physicsQuestion.create({ data: { tenantId: req.user.tenantId, courseId: courseId || null, title, body, field: field || 'MECHANICS', format: format || 'PARAMETRIC', difficulty: difficulty || 'EASY', points: points || 10, variables: variables || null, formulaSteps: formula || null, hint: hint || null, explanation: explanation || null, answerUnits: steps || null } });
    res.status(201).json(q);
  } catch (e: any) { res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : e.message }); }
});

// Serve a question with a particular random seed filled in + answer for that seed.
app.post('/api/physics/questions/:id/session', requireAuth, async (req: any, res: any) => {
  try {
    const q = await prisma.physicsQuestion.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null } });
    if (!q) return res.status(404).json({ error: 'Question not found' });
    const seed = req.body.seed ?? Math.floor(Math.random() * 100000);
    const r = rng(seed);
    const vars: Record<string, number> = {};
    const dec = Math.max(0, (q.variables as any)?.decimals || 0);
    for (const v of (q.variables as any[]) || []) {
      if (!v.key) continue;
      const vv = typeof v.value === 'number' ? v.value : pickVar(r, v);
      vars[v.key] = typeof v.value === 'number' ? v.value : vv;
    }
    const body = fillTemplate(q.body, vars, dec);
    let answer = null;
    try { if (q.formulaSteps) answer = evaluateFormula(q.formulaSteps, vars); } catch {}
    res.json({ id: q.id, title: q.title, body, vars, seed, answer, answerUnit: (q.answerUnits as any)?.unit });
  } catch (e: any) { res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : e.message }); }
});

// Submit attempt with step-by-step checking via formulaSteps array
app.post('/api/physics/questions/:id/attempt', requireAuth, async (req: any, res: any) => {
  try {
    if (req.user.roleSlug !== 'student' || !req.user.studentId) return res.status(403).json({ error: 'Only students can submit' });
    const { seed, answer, value } = req.body;
    const q = await prisma.physicsQuestion.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
    if (!q) return res.status(404).json({ error: 'Question not found' });
    const r = rng(Number(seed || 0));
    const vars: Record<string, number> = {};
    for (const v of (q.variables as any[]) || []) {
      if (!v.key) continue;
      vars[v.key] = typeof v.value === 'number' ? v.value : pickVar(r, v);
    }
    const expected = q.formulaSteps ? evaluateFormula(q.formulaSteps, vars) : null;
    const numAnswer = parseFloat(value ?? answer ?? '');
    const tol = Math.abs(expected) < 1e-6 ? 1e-6 : Math.abs(expected) * 0.001 + 1e-4;
    const accepted = expected != null && !isNaN(numAnswer) && Math.abs(numAnswer - expected) <= Math.max(tol, 1e-6);
    const score = accepted ? (q.points || 10) : 0;
    const att = await prisma.physicsQuestionAttempt.create({ data: { tenantId: req.user.tenantId, questionId: q.id, studentId: req.user.studentId, seed, variables: vars, answer: String(numAnswer || ''), accepted, score, feedback: { step: accepted ? null : q.hint, correct: accepted } } });
    res.json({ accepted, expected: numAnswer == null ? null : roundTo(expected, 4), score, hint: accepted ? null : q.hint, explanation: accepted ? q.explanation : null, seed });
  } catch (e: any) { res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : e.message }); }
});

// --- Data analysis: compute stats & best-fit from a table ---
app.post('/api/physics/data/analyze', requireAuth, async (req: any, res: any) => {
  try {
    const { rows } = req.body;
    const pts = (rows || []).filter((r: any) => isFinite(Number(r?.x)) && isFinite(Number(r?.y)))
      .map((r: any) => ({ x: Number(r.x), y: Number(r.y) }));
    const line = bestFitLine(pts);
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    res.json({ line, x: stats(xs), y: stats(ys), n: pts.length, points: pts });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/physics/data/exp', requireAuth, async (req: any, res: any) => {
  try {
    if (req.user.roleSlug !== 'student' || !req.user.studentId) return res.status(403).json({ error: 'Students only' });
    const { title, description, xLabel, yLabel, rows } = req.body;
    if (!title) return res.status(400).json({ error: 'Judul wajib' });
    const e = await prisma.physicsDataExp.create({ data: { tenantId: req.user.tenantId, title, description: description || '', xLabel: xLabel || 'x', yLabel: yLabel || 'y', data: rows || null, status: 'SUBMITTED' } });
    res.status(201).json(e);
  } catch (e: any) { res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : e.message }); }
});

app.get('/api/physics/data/exp', requireAuth, async (req: any, res: any) => {
  try { const data = await prisma.physicsDataExp.findMany({ where: { tenantId: req.user.tenantId }, orderBy: { createdAt: 'desc' }, take: 200 }); res.json({ data }); } catch { res.status(500).json({ error: 'Server error' }); }
});

// --- Interactive video notes ---
app.get('/api/physics/videos', requireAuth, async (req: any, res: any) => {
  try { const data = await prisma.physicsVideoNote.findMany({ where: { tenantId: req.user.tenantId, deletedAt: null }, orderBy: { updatedAt: 'desc' }, take: 200 }); res.json({ data }); } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/physics/videos', requireAuth, async (req: any, res: any) => {
  try {
    const role = req.user.roleSlug;
    if (role !== 'teacher' && role !== 'admin' && role !== 'super_admin') return res.status(403).json({ error: 'Only teachers can create videos' });
    const { title, description, videoUrl, quizzes, courseId } = req.body;
    if (!title || !videoUrl) return res.status(400).json({ error: 'Judul dan URL video wajib' });
    const v = await prisma.physicsVideoNote.create({ data: { tenantId: req.user.tenantId, courseId: courseId || null, title, description: description || '', videoUrl, quizzes: quizzes || null, status: 'PUBLISHED' } });
    res.status(201).json(v);
  } catch (e: any) { res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : e.message }); }
});

// ============================================================================
// PAI API (Pendidikan Agama Islam) — Tahfidz, Ibadah, Media, Diskusi, Asesmen
// ============================================================================
const PAI_IBADAH_TYPES = ['FARDHU','SUNNAH','QURAN','SADAQAH','OTHER'];
const PAI_ROLES = ['teacher','admin','super_admin'];

// --- Tahfidz targets (CRUD) ---
app.get('/api/pai/tahfidz-targets', requireAuth, async (req: any, res: any) => {
  try {
    const targets = await prisma.paiTahfidzTarget.findMany({ where: { tenantId: req.user.tenantId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
    res.json(targets);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/pai/tahfidz-targets', requireAuth, async (req: any, res: any) => {
  try {
    const role = req.user.roleSlug;
    if (!PAI_ROLES.includes(role)) return res.status(403).json({ error: 'Hanya guru/admin' });
    const { title, description, surah, surahType, targetAyat, courseId } = req.body;
    if (!title || !surah) return res.status(400).json({ error: 'Judul dan surah wajib' });
    const t = await prisma.paiTahfidzTarget.create({ data: { tenantId: req.user.tenantId, courseId: courseId || null, createdById: req.user.userId, title, description: description || '', surah, surahType: surahType || 'SURAH', targetAyat: targetAyat ? parseInt(targetAyat) : 1 } });
    res.status(201).json(t);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.put('/api/pai/tahfidz-targets/:id', requireAuth, async (req: any, res: any) => {
  try {
    const role = req.user.roleSlug;
    if (!PAI_ROLES.includes(role)) return res.status(403).json({ error: 'Hanya guru' });
    const { title, description, surah, surahType, targetAyat } = req.body;
    const t = await prisma.paiTahfidzTarget.update({ where: { id: req.params.id }, data: { title, description, surah, surahType, targetAyat } });
    res.json(t);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/pai/tahfidz-targets/:id', requireAuth, async (req: any, res: any) => {
  try {
    const role = req.user.roleSlug;
    if (!PAI_ROLES.includes(role)) return res.status(403).json({ error: 'Hanya guru' });
    await prisma.paiTahfidzTarget.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- Tahfidz recitation: submit audio (student) ---
app.post('/api/pai/recitations', requireAuth, upload.single('audio'), async (req: any, res: any) => {
  try {
    if (req.user.roleSlug !== 'student' || !req.user.studentId) return res.status(403).json({ error: 'Hanya siswa' });
    const { targetId, recordingDurationSec, ayatProgress, studentComment } = req.body;
    const target = await prisma.paiTahfidzTarget.findFirst({ where: { id: targetId, tenantId: req.user.tenantId, deletedAt: null } });
    if (!target) return res.status(404).json({ error: 'Target tidak ditemukan' });

    const file = req.file as Express.Multer.File | undefined;
    let recordingFileId: string | undefined;
    if (file) {
      const asset = await prisma.asset.create({
        data: {
          tenantId: req.user.tenantId,
          fingerprint: crypto.createHash('sha256').update(file.filename + Date.now()).digest('hex'),
          originalName: file.originalname, mimeType: file.mimetype, sizeBytes: file.size,
          storageProvider: 'LOCAL', storageKey: file.filename, status: 'READY',
          durationSeconds: recordingDurationSec ? parseInt(recordingDurationSec) : null,
          createdById: req.user.userId,
        }
      });
      recordingFileId = asset.id;
    }

    let rec;
    const existing = await prisma.paiRecitation.findUnique({ where: { targetId_studentId: { targetId, studentId: req.user.studentId } } });
    if (existing) {
      rec = await prisma.paiRecitation.update({
        where: { id: existing.id },
        data: { status: 'SUBMITTED', recordingFileId: recordingFileId || existing.recordingFileId, recordingDurationSec: recordingDurationSec ? parseInt(recordingDurationSec) : existing.recordingDurationSec, ayatProgress: ayatProgress ? parseInt(ayatProgress) : existing.ayatProgress, studentComment: studentComment || existing.studentComment, submittedAt: new Date() }
      });
    } else {
      rec = await prisma.paiRecitation.create({
        data: { tenantId: req.user.tenantId, targetId, studentId: req.user.studentId, status: 'SUBMITTED', recordingFileId, recordingDurationSec: recordingDurationSec ? parseInt(recordingDurationSec) : null, ayatProgress: ayatProgress ? parseInt(ayatProgress) : 0, studentComment: studentComment || null, submittedAt: new Date() }
      });
    }
    const a = recordingFileId ? await prisma.asset.findUnique({ where: { id: recordingFileId } }) : null;
    res.status(201).json({ ...rec, recordingFileUrl: a ? `/storage/${a.storageKey}` : null });
  } catch (e: any) { res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'Gagal mengirim' : e.message }); }
});

// --- Teacher lists recitations (+ target) ---
app.get('/api/pai/recitations', requireAuth, async (req: any, res: any) => {
  try {
    const { targetId, studentId } = req.query;
    const recs = await prisma.paiRecitation.findMany({
      where: {
        tenantId: req.user.tenantId,
        targetId: targetId || undefined,
        studentId: studentId || undefined,
      },
      include: { target: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(recs);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- Grade a recitation (teacher) ---
app.post('/api/pai/recitations/:id/grade', requireAuth, async (req: any, res: any) => {
  try {
    const role = req.user.roleSlug;
    if (!PAI_ROLES.includes(role)) return res.status(403).json({ error: 'Hanya guru' });
    const { score, tajwidScore, makhrajScore, comment, status } = req.body;
    const rec = await prisma.paiRecitation.update({
      where: { id: req.params.id },
      data: { score: score !== undefined ? parseFloat(score) : undefined, tajwidScore: tajwidScore !== undefined ? parseFloat(tajwidScore) : undefined, makhrajScore: makhrajScore !== undefined ? parseFloat(makhrajScore) : undefined, comment: comment ?? undefined, status: status ?? 'APPROVED', gradedAt: new Date(), gradedById: req.user.userId },
    });
    res.json(rec);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- Murottal library ---
app.get('/api/pai/murottal', requireAuth, async (req: any, res: any) => {
  try {
    const list = await prisma.paiMurottal.findMany({ where: { tenantId: req.user.tenantId, status: 'VISIBLE' }, orderBy: { createdAt: 'desc' } });
    res.json(list);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/pai/murottal', requireAuth, async (req: any, res: any) => {
  try {
    const role = req.user.roleSlug;
    if (!PAI_ROLES.includes(role)) return res.status(403).json({ error: 'Hanya guru' });
    const { title, surah, qari, url } = req.body;
    if (!title || !url) return res.status(400).json({ error: 'Judul dan URL wajib' });
    const m = await prisma.paiMurottal.create({ data: { tenantId: req.user.tenantId, title, surah: surah || '', qari: qari || '', url } });
    res.status(201).json(m);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- Ibadah daily journal (student) ---
app.post('/api/pai/ibadah/logs', requireAuth, async (req: any, res: any) => {
  try {
    if (req.user.roleSlug !== 'student') return res.status(403).json({ error: 'Hanya siswa' });
    const { ibadahType, label, done, note } = req.body;
    if (!PAI_IBADAH_TYPES.includes(ibadahType)) return res.status(400).json({ error: 'Tipe ibadah tidak valid' });
    const log = await prisma.paiIbadahLog.create({ data: { tenantId: req.user.tenantId, studentId: req.user.studentId, ibadahType, label: label || ibadahType, done: done === true, note: note || null } });
    res.status(201).json(log);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/api/pai/ibadah/logs', requireAuth, async (req: any, res: any) => {
  try {
    const { studentId, from, to } = req.query;
    const sid = req.user.roleSlug === 'teacher' || req.user.roleSlug === 'admin' || req.user.roleSlug === 'super_admin' ? (studentId || undefined) : req.user.studentId;
    const logs = await prisma.paiIbadahLog.findMany({
      where: { tenantId: req.user.tenantId, studentId: sid, ...(from && to ? { journalDate: { gte: new Date(from as string), lte: new Date(to as string) } } : {}) },
      orderBy: { journalDate: 'desc' },
    });
    res.json(logs);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- Ibadah goals (gamified) ---
app.get('/api/pai/ibadah/goals', requireAuth, async (req: any, res: any) => {
  try {
    const { studentId } = req.query;
    const sid = PAI_ROLES.includes(req.user.roleSlug) ? (studentId || undefined) : req.user.studentId;
    const goals = await prisma.paiIbadahGoal.findMany({ where: { tenantId: req.user.tenantId, studentId: sid }, orderBy: { createdAt: 'desc' } });
    res.json(goals);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/pai/ibadah/goals', requireAuth, async (req: any, res: any) => {
  try {
    const role = req.user.roleSlug;
    if (role !== 'student' && !PAI_ROLES.includes(role)) return res.status(403).json({ error: 'Hanya siswa/guru' });
    const { title, type, targetCount, period, rewardPoints } = req.body;
    if (!title || !PAI_IBADAH_TYPES.includes(type)) return res.status(400).json({ error: 'Data tidak valid' });
    const g = await prisma.paiIbadahGoal.create({ data: { tenantId: req.user.tenantId, studentId: role === 'student' ? req.user.studentId : (req.body.studentId || req.user.studentId), title, type, targetCount: targetCount ? parseInt(targetCount) : 7, period: period || 'WEEK', rewardPoints: rewardPoints ? parseInt(rewardPoints) : 10 } });
    res.status(201).json(g);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- Timeline (SKI history events) ---
app.get('/api/pai/timeline', requireAuth, async (req: any, res: any) => {
  try {
    const events = await prisma.paiTimelineEvent.findMany({ where: { tenantId: req.user.tenantId, status: 'VISIBLE' }, orderBy: { year: 'asc' } });
    res.json(events);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/pai/timeline', requireAuth, async (req: any, res: any) => {
  try {
    const role = req.user.roleSlug;
    if (!PAI_ROLES.includes(role)) return res.status(403).json({ error: 'Hanya guru' });
    const { title, year, periodLabel, description, figure, location, icon, category, orderIndex } = req.body;
    if (!title || !year) return res.status(400).json({ error: 'Judul dan tahun wajib' });
    const ev = await prisma.paiTimelineEvent.create({ data: { tenantId: req.user.tenantId, createdById: req.user.userId, title, year: parseInt(year), periodLabel: periodLabel || '', description: description || '', figure: figure || '', location: location || null, icon: icon || null, category: category || null, orderIndex: orderIndex ? parseInt(orderIndex) : 0 } });
    res.status(201).json(ev);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- Dalil database ---
app.get('/api/pai/dalil', requireAuth, async (req: any, res: any) => {
  try {
    const { theme, q } = req.query;
    const list = await prisma.paiDalil.findMany({
      where: { tenantId: req.user.tenantId, status: 'VISIBLE', ...(theme ? { theme: String(theme) } : {}), ...(q ? { OR: [{ arabic: { contains: String(q), mode: 'insensitive' } }, { translation: { contains: String(q), mode: 'insensitive' } }, { theme: { contains: String(q), mode: 'insensitive' } }] } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/pai/dalil', requireAuth, async (req: any, res: any) => {
  try {
    const role = req.user.roleSlug;
    if (!PAI_ROLES.includes(role)) return res.status(403).json({ error: 'Hanya guru' });
    const { source, arabic, latin, translation, tafsir, theme, tags, category } = req.body;
    if (!source || !arabic || !translation) return res.status(400).json({ error: 'Sumber, arab, & terjemah wajib' });
    const d = await prisma.paiDalil.create({ data: { tenantId: req.user.tenantId, createdById: req.user.userId, source, arabic, latin: latin || null, translation, tafsir: tafsir || null, theme: theme || '', tags: tags || null, category: category || null } });
    res.status(201).json(d);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- Discussion forum (public by course/theme) ---
app.get('/api/pai/discussions', requireAuth, async (req: any, res: any) => {
  try {
const roles = PAI_ROLES;
    const isTeacher = roles.includes(req.user.roleSlug);
    const forums = await prisma.paiDiscussion.findMany({
      where: { tenantId: req.user.tenantId, deletedAt: null, ...(!isTeacher ? { isPrivate: false } : {}) },
      include: { replies: { orderBy: { createdAt: 'asc' } }, course: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(forums);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/pai/discussions', requireAuth, async (req: any, res: any) => {
  try {
    const { title, body, category, isPrivate, courseId } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Judul dan isi wajib' });
    const f = await prisma.paiDiscussion.create({ data: { tenantId: req.user.tenantId, courseId: courseId || null, createdById: req.user.userId, title, body, category: category || 'umum', isPrivate: isPrivate === true } });
    res.status(201).json(f);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/pai/discussions/:id/replies', requireAuth, async (req: any, res: any) => {
  try {
    const forum = await prisma.paiDiscussion.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
    if (!forum) return res.status(404).json({ error: 'Forum tidak ditemukan' });
    if (forum.isPrivate && req.user.roleSlug === 'student' && forum.createdById !== req.user.userId) return res.status(403).json({ error: 'Diskusi privat' });
    const { body } = req.body;
    if (!body) return res.status(400).json({ error: 'Isi wajib' });
    const r = await prisma.paiDiscussionReply.create({ data: { tenantId: req.user.tenantId, forumId: forum.id, authorId: req.user.userId, body } });
    res.status(201).json(r);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- Private Q&A with ustadz ---
app.get('/api/pai/private-questions', requireAuth, async (req: any, res: any) => {
  try {
    const roles = PAI_ROLES;
    const isStaff = roles.includes('teacher');
    const list = await prisma.paiPrivateQuestion.findMany({
      where: { tenantId: req.user.tenantId, ...(!isStaff ? { studentId: req.user.studentId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/pai/private-questions', requireAuth, async (req: any, res: any) => {
  try {
    if (req.user.roleSlug !== 'student') return res.status(403).json({ error: 'Hanya siswa' });
    const { question, topic } = req.body;
    if (!question) return res.status(400).json({ error: 'Pertanyaan wajib' });
    const q = await prisma.paiPrivateQuestion.create({ data: { tenantId: req.user.tenantId, studentId: req.user.studentId, question, topic: topic || null } });
    res.status(201).json(q);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/pai/private-questions/:id/answer', requireAuth, async (req: any, res: any) => {
  try {
    const role = req.user.roleSlug;
    if (!PAI_ROLES.includes(role)) return res.status(403).json({ error: 'Hanya guru' });
    const { answer } = req.body;
    if (!answer) return res.status(400).json({ error: 'Jawaban wajib' });
    const q = await prisma.paiPrivateQuestion.update({ where: { id: req.params.id }, data: { answer, status: 'ANSWERED', answeredById: req.user.userId, answeredAt: new Date() } });
    res.json(q);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- Moral case analysis + submissions ---
app.get('/api/pai/moral-cases', requireAuth, async (req: any, res: any) => {
  try {
    const cases = await prisma.paiMoralCase.findMany({ where: { tenantId: req.user.tenantId, status: 'VISIBLE' }, orderBy: { createdAt: 'desc' } });
    res.json(cases);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/pai/moral-cases', requireAuth, async (req: any, res: any) => {
  try {
    const role = req.user.roleSlug;
    if (!PAI_ROLES.includes(role)) return res.status(403).json({ error: 'Hanya guru' });
    const { title, scenario, guideValues } = req.body;
    if (!title || !scenario) return res.status(400).json({ error: 'Judul dan skenario wajib' });
    const m = await prisma.paiMoralCase.create({ data: { tenantId: req.user.tenantId, createdById: req.user.userId, title, scenario, guideValues: guideValues || '' } });
    res.status(201).json(m);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/pai/moral-cases/:id/submit', requireAuth, async (req: any, res: any) => {
  try {
    if (req.user.roleSlug !== 'student') return res.status(403).json({ error: 'Hanya siswa' });
    const { answer } = req.body;
    if (!answer) return res.status(400).json({ error: 'Analisis wajib' });
    const existing = await prisma.paiMoralSubmission.findFirst({ where: { caseId: req.params.id, studentId: req.user.studentId } });
    let sub;
    if (existing) {
      sub = await prisma.paiMoralSubmission.update({ where: { id: existing.id }, data: { answer, status: 'SUBMITTED' } });
    } else {
      sub = await prisma.paiMoralSubmission.create({ data: { tenantId: req.user.tenantId, caseId: req.params.id, studentId: req.user.studentId, answer, status: 'SUBMITTED' } });
    }
    res.status(201).json(sub);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
// --- teacher view submissions for a case ---
app.get('/api/pai/moral-cases/:id/submissions', requireAuth, async (req: any, res: any) => {
  try {
    const subs = await prisma.paiMoralSubmission.findMany({
      where: { tenantId: req.user.tenantId, caseId: req.params.id },
      include: { student: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(subs);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- Story-based character quiz ---
app.get('/api/pai/story-quizzes', requireAuth, async (req: any, res: any) => {
  try {
    const list = await prisma.paiStoryQuiz.findMany({ where: { tenantId: req.user.tenantId, status: 'PUBLISHED' }, orderBy: { createdAt: 'desc' } });
    res.json(list);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/pai/story-quizzes', requireAuth, async (req: any, res: any) => {
  try {
    const role = req.user.roleSlug;
    if (!PAI_ROLES.includes(role)) return res.status(403).json({ error: 'Hanya guru' });
    const { title, description, story, questions, status } = req.body;
    if (!title || !story) return res.status(400).json({ error: 'Judul dan cerita wajib' });
    const q = await prisma.paiStoryQuiz.create({ data: { tenantId: req.user.tenantId, createdById: req.user.userId, title, description: description || '', story, questions: questions || null, status: status || 'PUBLISHED' } });
    res.status(201).json(q);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================================================
// ARTS API (Seni Budaya) — Gallery, Performance, Apresiasi, Rubrik, Storyboard
// ============================================================================
const ARTS_ROLES = ['teacher','admin','super_admin'];
const ARTS_BRANCHES = ['TARI','SENI_RUPA','TEATER','MUSIK'];
const ARTS_CATEGORIES = ['MUSIK','TARI','TEATER'];

const uploadImage = upload.single('image');
const uploadMedia = upload.single('media');

const resolveUrl = async (fileId: string | null | undefined) => {
  if (!fileId) return null;
  const a = await prisma.asset.findUnique({ where: { id: fileId } });
  return a ? `/storage/${a.storageKey}` : null;
};

const saveUploadedFile = async (req: any, file: Express.Multer.File, durationSec?: number) => {
  const asset = await prisma.asset.create({
    data: {
      tenantId: req.user.tenantId,
      fingerprint: crypto.createHash('sha256').update(file.filename + Date.now()).digest('hex'),
      originalName: file.originalname, mimeType: file.mimetype, sizeBytes: file.size,
      storageProvider: 'LOCAL', storageKey: file.filename, status: 'READY',
      durationSeconds: durationSec || null, createdById: req.user.userId,
    }
  });
  return asset;
};

// --- 1. ARTWORK (Seni Rupa) ---
app.get('/api/arts/artworks', requireAuth, async (req: any, res: any) => {
  try {
    const { studentId } = req.query;
    const isStaff = ARTS_ROLES.includes(req.user.roleSlug);
    const sid = isStaff ? (studentId || undefined) : req.user.studentId;
    const items = await prisma.artsArtwork.findMany({
      where: { tenantId: req.user.tenantId, deletedAt: null, studentId: sid, ...(!isStaff ? { status: { not: 'DRAFT' } } : {}) },
      include: { annotations: true },
      orderBy: { createdAt: 'desc' },
    });
    const withUrl = await Promise.all(items.map(async (it) => ({ ...it, imageFileUrl: await resolveUrl(it.imageFileId) })));
    res.json(withUrl);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post('/api/arts/artworks', requireAuth, uploadImage, async (req: any, res: any) => {
  try {
    if (req.user.roleSlug !== 'student') return res.status(403).json({ error: 'Hanya siswa' });
    const { title, description, medium, semester } = req.body;
    if (!title) return res.status(400).json({ error: 'Judul wajib' });
    const file = req.file as Express.Multer.File | undefined;
    let imageFileId: string | undefined, imageUrl: string | null = null;
    if (file) { const asset = await saveUploadedFile(req, file); imageFileId = asset.id; imageUrl = `/storage/${file.filename}`; }
    const art = await prisma.artsArtwork.create({ data: { tenantId: req.user.tenantId, studentId: req.user.studentId, title, description: description || null, medium: medium || 'LUKISAN', semester: semester || null, status: 'SUBMITTED', imageFileId, imageUrl } });
    res.status(201).json({ ...art, imageFileUrl: imageUrl });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.put('/api/arts/artworks/:id', requireAuth, uploadImage, async (req: any, res: any) => {
  try {
    const { title, description, medium, semester, status } = req.body;
    const file = req.file as Express.Multer.File | undefined;
    let data: any = { title, description, medium, semester, status };
    if (file) { const asset = await saveUploadedFile(req, file); data.imageFileId = asset.id; data.imageUrl = `/storage/${file.filename}`; }
    const art = await prisma.artsArtwork.update({ where: { id: req.params.id }, data });
    res.json({ ...art, imageFileUrl: await resolveUrl(art.imageFileId) });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/arts/artworks/:id', requireAuth, async (req: any, res: any) => {
  try {
    await prisma.artsArtwork.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- 1b. ANNOTATION (teacher visual feedback) ---
app.get('/api/arts/artworks/:id/annotations', requireAuth, async (req: any, res: any) => {
  try {
    const list = await prisma.artsAnnotation.findMany({ where: { tenantId: req.user.tenantId, artworkId: req.params.id }, orderBy: { createdAt: 'asc' } });
    res.json(list);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post('/api/arts/artworks/:id/annotations', requireAuth, async (req: any, res: any) => {
  try {
    const isStaff = ARTS_ROLES.includes(req.user.roleSlug);
    if (!isStaff) return res.status(403).json({ error: 'Hanya guru' });
    const { data, comment } = req.body;
    const ann = await prisma.artsAnnotation.create({ data: { tenantId: req.user.tenantId, artworkId: req.params.id, authorId: req.user.userId, data: data || null, comment: comment || null } });
    res.status(201).json(ann);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- 1c. EXHIBITION (virtual gallery) ---
app.get('/api/arts/exhibitions', requireAuth, async (req: any, res: any) => {
  try {
    const list = await prisma.artsExhibition.findMany({ where: { tenantId: req.user.tenantId }, orderBy: { createdAt: 'desc' } });
    res.json(list);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/arts/exhibitions', requireAuth, async (req: any, res: any) => {
  try {
    const isStaff = ARTS_ROLES.includes(req.user.roleSlug);
    if (!isStaff) return res.status(403).json({ error: 'Hanya guru' });
    const { title, description, artworkIds, coverImageUrl } = req.body;
    if (!title) return res.status(400).json({ error: 'Judul wajib' });
    const ex = await prisma.artsExhibition.create({ data: { tenantId: req.user.tenantId, createdById: req.user.userId, title, description: description || null, artworkIds: artworkIds || [], coverImageUrl: coverImageUrl || null } });
    res.status(201).json(ex);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.put('/api/arts/exhibitions/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { title, description, artworkIds, coverImageUrl } = req.body;
    const ex = await prisma.artsExhibition.update({ where: { id: req.params.id }, data: { title, description, artworkIds, coverImageUrl } });
    res.json(ex);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- 2. PERFORMANCE (Musik / Tari / Teater) ---
app.get('/api/arts/performances', requireAuth, async (req: any, res: any) => {
  try {
    const { studentId } = req.query;
    const isStaff = ARTS_ROLES.includes(req.user.roleSlug);
    const sid = isStaff ? (studentId || undefined) : req.user.studentId;
    const items = await prisma.artsPerformance.findMany({
      where: { tenantId: req.user.tenantId, deletedAt: null, studentId: sid },
      include: { timeComments: { orderBy: { timestampSec: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    const withUrl = await Promise.all(items.map(async (it) => ({ ...it, mediaFileUrl: await resolveUrl(it.mediaFileId) })));
    res.json(withUrl);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post('/api/arts/performances', requireAuth, uploadMedia, async (req: any, res: any) => {
  try {
    if (req.user.roleSlug !== 'student') return res.status(403).json({ error: 'Hanya siswa' });
    const { title, description, category, durationSec } = req.body;
    if (!title) return res.status(400).json({ error: 'Judul wajib' });
    if (!ARTS_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Kategori tidak valid' });
    const file = req.file as Express.Multer.File | undefined;
    let mediaFileId: string | undefined, mediaUrl: string | null = null;
    if (file) { const asset = await saveUploadedFile(req, file, durationSec ? parseInt(durationSec) : undefined); mediaFileId = asset.id; mediaUrl = `/storage/${file.filename}`; }
    const perf = await prisma.artsPerformance.create({ data: { tenantId: req.user.tenantId, studentId: req.user.studentId, title, description: description || null, category, status: 'SUBMITTED', mediaFileId, mediaUrl, durationSec: durationSec ? parseInt(durationSec) : null } });
    res.status(201).json({ ...perf, mediaFileUrl: mediaUrl });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.put('/api/arts/performances/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { title, description, status } = req.body;
    const perf = await prisma.artsPerformance.update({ where: { id: req.params.id }, data: { title, description, status } });
    res.json(perf);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- 2b. TIME-STAMPED FEEDBACK ---
app.post('/api/arts/performances/:id/comments', requireAuth, async (req: any, res: any) => {
  try {
    const { timestampSec, body } = req.body;
    if (body === undefined || body === null || body === '') return res.status(400).json({ error: 'Isi komentar wajib' });
    const perf = await prisma.artsPerformance.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
    if (!perf) return res.status(404).json({ error: 'Pertunjukan tidak ditemukan' });
    const c = await prisma.artsTimeComment.create({ data: { tenantId: req.user.tenantId, performanceId: perf.id, authorId: req.user.userId, timestampSec: parseFloat(timestampSec) || 0, body } });
    res.status(201).json(c);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- 2c. SHEET MUSIC (partitur / tablatur) ---
app.get('/api/arts/sheets', requireAuth, async (req: any, res: any) => {
  try {
    const list = await prisma.artsSheetMusic.findMany({ where: { tenantId: req.user.tenantId }, orderBy: { createdAt: 'desc' } });
    res.json(list);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/arts/sheets', requireAuth, async (req: any, res: any) => {
  try {
    const isStaff = ARTS_ROLES.includes(req.user.roleSlug);
    if (!isStaff) return res.status(403).json({ error: 'Hanya guru' });
    const { title, description, sheetType, notesData, referenceAudioUrl } = req.body;
    if (!title) return res.status(400).json({ error: 'Judul wajib' });
    const s = await prisma.artsSheetMusic.create({ data: { tenantId: req.user.tenantId, createdById: req.user.userId, title, description: description || null, sheetType: sheetType || 'NOT_ANGKA', notesData: notesData || null, referenceAudioUrl: referenceAudioUrl || null } });
    res.status(201).json(s);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/arts/sheets/:id', requireAuth, async (req: any, res: any) => {
  try {
    await prisma.artsSheetMusic.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- 3. VIRTUAL TOUR + CULTURAL MAP ---
app.get('/api/arts/tours', requireAuth, async (req: any, res: any) => {
  try {
    const list = await prisma.artsVirtualTour.findMany({ where: { tenantId: req.user.tenantId }, orderBy: { createdAt: 'desc' } });
    res.json(list);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/arts/tours', requireAuth, async (req: any, res: any) => {
  try {
    const isStaff = ARTS_ROLES.includes(req.user.roleSlug);
    if (!isStaff) return res.status(403).json({ error: 'Hanya guru' });
    const { title, description, embedUrl, coverImageUrl, location } = req.body;
    if (!title || !embedUrl) return res.status(400).json({ error: 'Judul dan URL embed wajib' });
    const t = await prisma.artsVirtualTour.create({ data: { tenantId: req.user.tenantId, createdById: req.user.userId, title, description: description || null, embedUrl, coverImageUrl: coverImageUrl || null, location: location || null } });
    res.status(201).json(t);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/arts/tours/:id', requireAuth, async (req: any, res: any) => {
  try {
    await prisma.artsVirtualTour.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.get('/api/arts/sites', requireAuth, async (req: any, res: any) => {
  try {
    const { region } = req.query;
    const list = await prisma.artsCulturalSite.findMany({ where: { tenantId: req.user.tenantId, ...(region ? { region: String(region) } : {}) }, orderBy: { region: 'asc' } });
    res.json(list);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/arts/sites', requireAuth, async (req: any, res: any) => {
  try {
    const isStaff = ARTS_ROLES.includes(req.user.roleSlug);
    if (!isStaff) return res.status(403).json({ error: 'Hanya guru' });
    const { name, region, latitude, longitude, category, description, imageUrl } = req.body;
    if (!name || !region || latitude === undefined) return res.status(400).json({ error: 'Nama, daerah, dan koordinat wajib' });
    const s = await prisma.artsCulturalSite.create({ data: { tenantId: req.user.tenantId, createdById: req.user.userId, name, region, latitude: parseFloat(latitude), longitude: longitude ? parseFloat(longitude) : 0, category: category || 'SITUS', description: description || null, imageUrl: imageUrl || null } });
    res.status(201).json(s);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- 4. RUBRIK ---
app.get('/api/arts/rubrics', requireAuth, async (req: any, res: any) => {
  try {
    const { branch } = req.query;
    const list = await prisma.artsRubric.findMany({ where: { tenantId: req.user.tenantId, ...(branch ? { branch: String(branch) } : {}) }, orderBy: { createdAt: 'desc' } });
    res.json(list);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/arts/rubrics', requireAuth, async (req: any, res: any) => {
  try {
    const isStaff = ARTS_ROLES.includes(req.user.roleSlug);
    if (!isStaff) return res.status(403).json({ error: 'Hanya guru' });
    const { title, branch, dimensions } = req.body;
    if (!title || !ARTS_BRANCHES.includes(branch)) return res.status(400).json({ error: 'Judul dan cabang wajib' });
    const r = await prisma.artsRubric.create({ data: { tenantId: req.user.tenantId, createdById: req.user.userId, title, branch, dimensions: dimensions || null } });
    res.status(201).json(r);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/arts/rubrics/:id', requireAuth, async (req: any, res: any) => {
  try {
    await prisma.artsRubric.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- 4b. PEER REVIEW (apresiasi lintas siswa) ---
app.get('/api/arts/reviews', requireAuth, async (req: any, res: any) => {
  try {
    const { artworkId, performanceId } = req.query;
    const list = await prisma.artsPeerReview.findMany({
      where: { tenantId: req.user.tenantId, artworkId: artworkId || undefined, performanceId: performanceId || undefined },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/arts/reviews', requireAuth, async (req: any, res: any) => {
  try {
    if (req.user.roleSlug !== 'student') return res.status(403).json({ error: 'Hanya siswa' });
    const { artworkId, performanceId, rubricId, description, formalAnalysis, interpretation, evaluation, scores } = req.body;
    if (!artworkId && !performanceId) return res.status(400).json({ error: 'Pilih karya atau pertunjukan' });
    const r = await prisma.artsPeerReview.create({ data: { tenantId: req.user.tenantId, reviewerId: req.user.userId, artworkId: artworkId || null, performanceId: performanceId || null, rubricId: rubricId || null, description: description || null, formalAnalysis: formalAnalysis || null, interpretation: interpretation || null, evaluation: evaluation || null, scores: scores || null, status: 'SUBMITTED' } });
    res.status(201).json(r);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- 4c. GRADING (teacher rubric grade) ---
app.get('/api/arts/grades', requireAuth, async (req: any, res: any) => {
  try {
    const { artworkId, performanceId, studentId } = req.query;
    const isStaff = ARTS_ROLES.includes(req.user.roleSlug);
    const list = await prisma.artsGrade.findMany({ where: { tenantId: req.user.tenantId, artworkId: artworkId || undefined, performanceId: performanceId || undefined, ...(!isStaff ? { studentId: req.user.studentId } : studentId ? { studentId: String(studentId) } : {}) }, orderBy: { createdAt: 'desc' } });
    res.json(list);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/arts/grades', requireAuth, async (req: any, res: any) => {
  try {
    const isStaff = ARTS_ROLES.includes(req.user.roleSlug);
    if (!isStaff) return res.status(403).json({ error: 'Hanya guru' });
    const { artworkId, performanceId, studentId, rubricId, scores, score, feedback } = req.body;
    if (!artworkId && !performanceId) return res.status(400).json({ error: 'Pilih karya atau pertunjukan' });
    const g = await prisma.artsGrade.create({ data: { tenantId: req.user.tenantId, studentId, artworkId: artworkId || null, performanceId: performanceId || null, rubricId: rubricId || null, scores: scores || null, score: score !== undefined ? parseFloat(score) : null, feedback: feedback || null, gradedById: req.user.userId } });
    res.status(201).json(g);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- 5. STORYBOARD KOLABORATIF ---
app.get('/api/arts/storyboards', requireAuth, async (req: any, res: any) => {
  try {
    const list = await prisma.artsStoryboard.findMany({ where: { tenantId: req.user.tenantId, deletedAt: null }, include: { frames: { orderBy: { orderIndex: 'asc' } } }, orderBy: { createdAt: 'desc' } });
    res.json(list);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/arts/storyboards', requireAuth, async (req: any, res: any) => {
  try {
    const { title, description, script, genre } = req.body;
    if (!title) return res.status(400).json({ error: 'Judul wajib' });
    const s = await prisma.artsStoryboard.create({ data: { tenantId: req.user.tenantId, createdById: req.user.userId, title, description: description || null, script: script || null, genre: genre || null, status: 'OPEN' } });
    res.status(201).json(s);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.put('/api/arts/storyboards/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { title, description, script, genre, status } = req.body;
    const s = await prisma.artsStoryboard.update({ where: { id: req.params.id }, data: { title, description, script, genre, status } });
    res.json(s);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/arts/storyboards/:id', requireAuth, async (req: any, res: any) => {
  try {
    await prisma.artsStoryboard.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
// Add frame (collaborative - any student or staff)
app.post('/api/arts/storyboards/:id/frames', requireAuth, uploadImage, async (req: any, res: any) => {
  try {
    const sb = await prisma.artsStoryboard.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
    if (!sb) return res.status(404).json({ error: 'Storyboard tidak ditemukan' });
    const { orderIndex, sceneLabel, description, dialogue } = req.body;
    const file = req.file as Express.Multer.File | undefined;
    let imageFileId: string | undefined, imageUrl: string | null = null;
    if (file) { const asset = await saveUploadedFile(req, file); imageFileId = asset.id; imageUrl = `/storage/${file.filename}`; }
    const f = await prisma.artsStoryboardFrame.create({ data: { tenantId: req.user.tenantId, storyboardId: sb.id, addedById: req.user.userId, orderIndex: orderIndex ? parseInt(orderIndex) : 0, sceneLabel: sceneLabel || null, description: description || null, dialogue: dialogue || null, imageFileId, imageUrl } });
    res.status(201).json({ ...f, imageFileUrl: imageUrl });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.put('/api/arts/storyboards/:id/frames/:frameId', requireAuth, uploadImage, async (req: any, res: any) => {
  try {
    const { orderIndex, sceneLabel, description, dialogue } = req.body;
    const file = req.file as Express.Multer.File | undefined;
    let data: any = { orderIndex: orderIndex ? parseInt(orderIndex) : undefined, sceneLabel, description, dialogue };
    if (file) { const asset = await saveUploadedFile(req, file); data.imageFileId = asset.id; data.imageUrl = `/storage/${file.filename}`; }
    const f = await prisma.artsStoryboardFrame.update({ where: { id: req.params.frameId }, data });
    res.json(f);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/arts/storyboards/:id/frames/:frameId', requireAuth, async (req: any, res: any) => {
  try {
    await prisma.artsStoryboardFrame.delete({ where: { id: req.params.frameId } });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================================================
// STUDY API — Platform Penunjang Pembelajaran Semua Mapel
// Model generik diflter berdasarkan field `subject`.
// ============================================================================
const STUDY_ROLES = ['teacher', 'admin', 'super_admin'];

const subjectOf = (req: any) => String(req.query.subject || req.body.subject || '').trim();

// --- Lessons (materi per mapel) ---
app.get('/api/study/lessons', requireAuth, async (req: any, res: any) => {
  try {
    const subject = subjectOf(req);
    if (!subject) return res.status(400).json({ error: 'Subject wajib' });
    const data = await prisma.studyLesson.findMany({
      where: { tenantId: req.user.tenantId, subject, deletedAt: null, ...(req.user.roleSlug === 'student' ? { status: 'VISIBLE' } : {}) },
      orderBy: { updatedAt: 'desc' }, take: 300,
    });
    res.json({ data });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/study/lessons', requireAuth, async (req: any, res: any) => {
  try {
    if (!STUDY_ROLES.includes(req.user.roleSlug)) return res.status(403).json({ error: 'Hanya guru/admin' });
    const { subject, title, summary, sections, status } = req.body;
    if (!subject || !title) return res.status(400).json({ error: 'Subject dan judul wajib' });
    const lesson = await prisma.studyLesson.create({ data: { tenantId: req.user.tenantId, createdById: req.user.userId, subject, title, summary: summary || null, sections: sections || null, status: status || 'VISIBLE' } });
    res.status(201).json(lesson);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.put('/api/study/lessons/:id', requireAuth, async (req: any, res: any) => {
  try {
    if (!STUDY_ROLES.includes(req.user.roleSlug)) return res.status(403).json({ error: 'Hanya guru/admin' });
    const { title, summary, sections, status } = req.body;
    const lesson = await prisma.studyLesson.update({ where: { id: req.params.id }, data: { title, summary, sections, status } });
    res.json(lesson);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/study/lessons/:id', requireAuth, async (req: any, res: any) => {
  try {
    if (!STUDY_ROLES.includes(req.user.roleSlug)) return res.status(403).json({ error: 'Hanya guru/admin' });
    await prisma.studyLesson.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- Timeline (peristiwa per mapel) ---
app.get('/api/study/timeline', requireAuth, async (req: any, res: any) => {
  try {
    const subject = subjectOf(req);
    if (!subject) return res.status(400).json({ error: 'Subject wajib' });
    const data = await prisma.studyTimelineEvent.findMany({ where: { tenantId: req.user.tenantId, subject }, orderBy: [{ year: 'asc' }, { orderIndex: 'asc' }], take: 300 });
    res.json({ data });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/study/timeline', requireAuth, async (req: any, res: any) => {
  try {
    if (!STUDY_ROLES.includes(req.user.roleSlug)) return res.status(403).json({ error: 'Hanya guru/admin' });
    const { subject, year, periodLabel, title, description, figure, category, icon, orderIndex } = req.body;
    if (!subject || !title || !year) return res.status(400).json({ error: 'Subject, judul, dan tahun wajib' });
    const ev = await prisma.studyTimelineEvent.create({ data: { tenantId: req.user.tenantId, createdById: req.user.userId, subject, title, year: parseInt(year), periodLabel: periodLabel || '', description: description || '', figure: figure || null, category: category || null, icon: icon || null, orderIndex: orderIndex ? parseInt(orderIndex) : 0 } });
    res.status(201).json(ev);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/study/timeline/:id', requireAuth, async (req: any, res: any) => {
  try {
    if (!STUDY_ROLES.includes(req.user.roleSlug)) return res.status(403).json({ error: 'Hanya guru/admin' });
    await prisma.studyTimelineEvent.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- Quizzes (bank soal per mapel) + attempts ---
app.get('/api/study/quizzes', requireAuth, async (req: any, res: any) => {
  try {
    const subject = subjectOf(req);
    if (!subject) return res.status(400).json({ error: 'Subject wajib' });
    const quizzes = await prisma.studyQuiz.findMany({
      where: { tenantId: req.user.tenantId, subject, deletedAt: null, ...(req.user.roleSlug === 'student' ? { status: 'VISIBLE' } : {}) },
      orderBy: { updatedAt: 'desc' }, take: 300,
    });
    const studentId = req.user.studentId;
    let attMap: Record<string, any> = {};
    if (studentId && quizzes.length) {
      const attempts = await prisma.studyAttempt.findMany({ where: { studentId, quizId: { in: quizzes.map((q: any) => q.id) } } });
      for (const a of attempts) {
        if (!attMap[a.quizId] || a.submittedAt > attMap[a.quizId].submittedAt) attMap[a.quizId] = a;
      }
    }
    res.json({ data: quizzes.map((q: any) => ({ ...q, myBest: attMap[q.id] ? { score: attMap[q.id].score, correctCount: attMap[q.id].correctCount, totalCount: attMap[q.id].totalCount } : null })) });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/study/quizzes', requireAuth, async (req: any, res: any) => {
  try {
    if (!STUDY_ROLES.includes(req.user.roleSlug)) return res.status(403).json({ error: 'Hanya guru/admin' });
    const { subject, title, description, questions: raw, status } = req.body;
    if (!subject || !title) return res.status(400).json({ error: 'Subject dan judul wajib' });
    const questions = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : raw;
    if (!Array.isArray(questions) || questions.length === 0) return res.status(400).json({ error: 'Minimal satu pertanyaan' });
    const quiz = await prisma.studyQuiz.create({ data: { tenantId: req.user.tenantId, createdById: req.user.userId, subject, title, description: description || null, questions: questions.map((q: any) => ({ q: q.q || q.text, options: q.options || [], correct: q.correct, explain: q.explain || null })), status: status || 'VISIBLE' } });
    res.status(201).json(quiz);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/study/quizzes/:id', requireAuth, async (req: any, res: any) => {
  try {
    if (!STUDY_ROLES.includes(req.user.roleSlug)) return res.status(403).json({ error: 'Hanya guru/admin' });
    await prisma.studyQuiz.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/study/quizzes/:id/attempt', requireAuth, async (req: any, res: any) => {
  try {
    if (req.user.roleSlug !== 'student' || !req.user.studentId) return res.status(403).json({ error: 'Hanya siswa' });
    const quiz = await prisma.studyQuiz.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null } });
    if (!quiz) return res.status(404).json({ error: 'Kuis tidak ditemukan' });
    const questions = (quiz.questions as any[]) || [];
    const answers = req.body.answers || [];
    let correctCount = 0;
    const detailed = questions.map((q: any, i: number) => {
      const picked = answers[i];
      const isCorrect = q.correct !== undefined && String(picked) === String(q.correct);
      if (isCorrect) correctCount++;
      return { idx: i, q: q.q, picked, correct: q.correct, isCorrect, explain: q.explain || null, options: q.options };
    });
    const total = questions.length;
    const score = total ? Math.round((correctCount / total) * 100) : 0;
    const att = await prisma.studyAttempt.create({ data: { tenantId: req.user.tenantId, quizId: quiz.id, studentId: req.user.studentId, answers: detailed, score, correctCount, totalCount: total } });
    res.status(201).json({ id: att.id, score, correctCount, totalCount: total, detailed });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/api/study/quizzes/:id/attempts', requireAuth, async (req: any, res: any) => {
  try {
    const quiz = await prisma.studyQuiz.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
    if (!quiz) return res.status(404).json({ error: 'Kuis tidak ditemukan' });
    const isStaff = STUDY_ROLES.includes(req.user.roleSlug);
    const data = await prisma.studyAttempt.findMany({
      where: { tenantId: req.user.tenantId, quizId: quiz.id, ...(!isStaff ? { studentId: req.user.studentId } : {}) },
      include: { quiz: { select: { title: true } } },
      orderBy: { submittedAt: 'desc' }, take: 200,
    });
    res.json({ data });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- Flashcards (kartu hafalan per mapel/deck) ---
app.get('/api/study/flashcards', requireAuth, async (req: any, res: any) => {
  try {
    const subject = subjectOf(req);
    if (!subject) return res.status(400).json({ error: 'Subject wajib' });
    const { deck } = req.query;
    const data = await prisma.studyFlashcard.findMany({ where: { tenantId: req.user.tenantId, subject, ...(deck ? { deck: String(deck) } : {}) }, orderBy: { createdAt: 'asc' }, take: 500 });
    res.json({ data });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/study/flashcards', requireAuth, async (req: any, res: any) => {
  try {
    const { subject, deck, front, back } = req.body;
    if (!subject || !front || !back) return res.status(400).json({ error: 'Subject, depan, dan belakang wajib' });
    const fc = await prisma.studyFlashcard.create({ data: { tenantId: req.user.tenantId, subject, deck: deck || 'umum', front, back } });
    res.status(201).json(fc);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/study/flashcards/:id', requireAuth, async (req: any, res: any) => {
  try {
    if (!STUDY_ROLES.includes(req.user.roleSlug)) return res.status(403).json({ error: 'Hanya guru/admin' });
    await prisma.studyFlashcard.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- Map points (peta konsep / budaya / wilayah per mapel) ---
app.get('/api/study/map-points', requireAuth, async (req: any, res: any) => {
  try {
    const subject = subjectOf(req);
    if (!subject) return res.status(400).json({ error: 'Subject wajib' });
    const data = await prisma.studyMapPoint.findMany({ where: { tenantId: req.user.tenantId, subject }, orderBy: { createdAt: 'asc' }, take: 500 });
    res.json({ data });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/api/study/map-points', requireAuth, async (req: any, res: any) => {
  try {
    if (!STUDY_ROLES.includes(req.user.roleSlug)) return res.status(403).json({ error: 'Hanya guru/admin' });
    const { subject, name, region, x, y, category, description } = req.body;
    if (!subject || !name) return res.status(400).json({ error: 'Subject dan nama wajib' });
    const p = await prisma.studyMapPoint.create({ data: { tenantId: req.user.tenantId, createdById: req.user.userId, subject, name, region: region || '', x: x ? parseInt(x) : 0, y: y ? parseInt(y) : 0, category: category || null, description: description || null } });
    res.status(201).json(p);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/study/map-points/:id', requireAuth, async (req: any, res: any) => {
  try {
    if (!STUDY_ROLES.includes(req.user.roleSlug)) return res.status(403).json({ error: 'Hanya guru/admin' });
    await prisma.studyMapPoint.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- Summary (statistik ringkas per mapel) ---
app.get('/api/study/summary', requireAuth, async (req: any, res: any) => {
  try {
    const subject = subjectOf(req);
    if (!subject) return res.status(400).json({ error: 'Subject wajib' });
    const studentId = req.user.studentId;
    const base = { tenantId: req.user.tenantId, subject };
    const [lessons, quizzes, flashcards, timeline, myAttempts] = await Promise.all([
      prisma.studyLesson.count({ where: { ...base, deletedAt: null } }),
      prisma.studyQuiz.count({ where: { ...base, deletedAt: null } }),
      prisma.studyFlashcard.count({ where: base }),
      prisma.studyTimelineEvent.count({ where: base }),
      studentId ? prisma.studyAttempt.findMany({ where: { tenantId: req.user.tenantId, studentId }, include: { quiz: { select: { subject: true } } }, orderBy: { submittedAt: 'desc' }, take: 50 }) : [],
    ]);
    const attemptsOfSubject = myAttempts.filter((a: any) => a.quiz?.subject === subject);
    const avgScore = attemptsOfSubject.length ? Math.round(attemptsOfSubject.reduce((s: number, a: any) => s + (a.score || 0), 0) / attemptsOfSubject.length) : 0;
    res.json({ lessons, quizzes, flashcards, timeline, attempts: attemptsOfSubject.length, avgScore, studentId: studentId || null });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// Global RFC7807 error handler (mapped via ExceptionMapper + ZodError adapter)
app.use(GlobalErrorMiddleware);

app.listen(env.PORT, () => {
  Logger.info(`LMS Server running on port ${env.PORT}`);
});