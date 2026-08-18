import { PrismaClient, Prisma } from '@prisma/client';
import { CreateClassDTO, ClassDetailDTO, ClassSummaryDTO } from './dtos/master.dto';
import { AcademicMasterMapper } from './master.mapper';

export interface ClassFilter {
  search?: string;
  majorId?: string;
  gradeLevelId?: string;
  academicYearId?: string;
  tenantId: string;
}

export interface IAcademicMasterRepository {
  createClass(data: CreateClassDTO): Promise<ClassDetailDTO>;
  findClassById(id: string, tenantId: string): Promise<ClassDetailDTO | null>;
  findClassByCode(code: string, tenantId: string, academicYearId: string): Promise<ClassDetailDTO | null>;
  searchClasses(filter: ClassFilter, page: number, limit: number): Promise<{ data: ClassSummaryDTO[]; total: number }>;
  
  assignHomeroom(classId: string, teacherId: string, tenantId: string, expectedUpdatedAt: Date): Promise<void>;
  countActiveHomerooms(teacherId: string, academicYearId: string, tenantId: string): Promise<number>;
}

export class PrismaAcademicMasterRepository implements IAcademicMasterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createClass(data: CreateClassDTO): Promise<ClassDetailDTO> {
    const newClass = await this.prisma.class.create({
      data: {
        tenantId: data.tenantId,
        code: data.code,
        name: data.name,
        gradeLevel: parseInt(data.gradeLevelId, 10), // Assuming ID represents int for now
        // majorId: data.majorId, (Schema relations need adjustment to fit this standard)
        // academicYearId: data.academicYearId
      },
      include: {
        // gradeLevel: true,
        // major: true,
        // homeroom: true
      }
    });
    return AcademicMasterMapper.toClassDetail(newClass);
  }

  async findClassById(id: string, tenantId: string): Promise<ClassDetailDTO | null> {
    const cls = await this.prisma.class.findUnique({
      where: { id, tenantId, deletedAt: null },
      include: { /* relations */ }
    });
    return cls ? AcademicMasterMapper.toClassDetail(cls) : null;
  }

  async findClassByCode(code: string, tenantId: string, academicYearId: string): Promise<ClassDetailDTO | null> {
    const cls = await this.prisma.class.findFirst({
      where: { code, tenantId, deletedAt: null /*, academicYearId */ },
      include: { /* relations */ }
    });
    return cls ? AcademicMasterMapper.toClassDetail(cls) : null;
  }

  async searchClasses(filter: ClassFilter, page: number, limit: number): Promise<{ data: ClassSummaryDTO[]; total: number }> {
    const where: Prisma.ClassWhereInput = {
      tenantId: filter.tenantId,
      deletedAt: null
    };

    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { code: { contains: filter.search, mode: 'insensitive' } }
      ];
    }
    // if (filter.majorId) where.majorId = filter.majorId;
    // if (filter.academicYearId) where.academicYearId = filter.academicYearId;

    const skip = (page - 1) * limit;

    const [total, classes] = await Promise.all([
      this.prisma.class.count({ where }),
      this.prisma.class.findMany({
        where,
        skip,
        take: limit,
        // include: { major: true, homeroom: true, _count: { select: { enrollments: true } } }
      })
    ]);

    return {
      data: classes.map(c => AcademicMasterMapper.toClassSummary(c)),
      total
    };
  }

  async assignHomeroom(classId: string, teacherId: string, tenantId: string, expectedUpdatedAt: Date): Promise<void> {
    // Uses Prisma's where clause to enforce Optimistic Concurrency Control (OCC)
    const result = await this.prisma.class.updateMany({
      where: { id: classId, tenantId, updatedAt: expectedUpdatedAt },
      data: { /* homeroomTeacherId: teacherId, */ updatedAt: new Date() }
    });
    
    if (result.count === 0) {
      throw new Error('OCC_FAILED'); // Caught by Service
    }
  }

  async countActiveHomerooms(teacherId: string, academicYearId: string, tenantId: string): Promise<number> {
    return this.prisma.class.count({
      where: {
        tenantId,
        // homeroomTeacherId: teacherId,
        // academicYearId,
        deletedAt: null
      }
    });
  }
}
