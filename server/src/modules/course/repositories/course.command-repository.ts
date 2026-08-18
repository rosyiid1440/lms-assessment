import { PrismaClient } from '@prisma/client';
import { CreateCourseDTO, CourseDetailDTO, CourseStatus } from '../dtos/course.dto';
import { CourseMapper } from '../mappers/course.mapper';

export interface ICourseCommandRepository {
  create(data: CreateCourseDTO): Promise<CourseDetailDTO>;
  updateStatus(id: string, tenantId: string, status: CourseStatus, expectedVersion: number): Promise<CourseDetailDTO>;
  // Future: updateSchedule, addCoTeacher, etc. (All increment version)
}

/**
 * Optimized EXCLUSIVELY for mutating state (Writes).
 * Contains strict Optimistic Concurrency Control (OCC) logic.
 */
export class PrismaCourseCommandRepository implements ICourseCommandRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateCourseDTO): Promise<CourseDetailDTO> {
    const newCourse = await this.prisma.course.create({
      data: {
        tenantId: data.tenantId,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
        semester: 'ODD', // Should map from DB/Semester entity, simplified for now
        status: 'DRAFT',
        version: 1, // Start Version
        // coTeachers handled via pivot table creations if specified
      },
      include: { subject: true, class: true, teacher: true } // Pull relations for full aggregate validation
    });

    return CourseMapper.toDetailDTO(newCourse);
  }

  async updateStatus(id: string, tenantId: string, status: CourseStatus, expectedVersion: number): Promise<CourseDetailDTO> {
    // OCC: Update ONLY if the version matches what the client saw
    const result = await this.prisma.course.updateMany({
      where: { 
        id, 
        tenantId, 
        version: expectedVersion 
      },
      data: { 
        status: status as any,
        version: { increment: 1 }, // Atomic Version Increment
        updatedAt: new Date()
      }
    });

    if (result.count === 0) {
      throw new Error('OCC_FAILED'); // Caught by Domain Service
    }

    // Return the updated aggregate for event emission
    const updated = await this.prisma.course.findUniqueOrThrow({
      where: { id },
      include: { subject: true, class: true, teacher: true }
    });

    return CourseMapper.toDetailDTO(updated);
  }
}
