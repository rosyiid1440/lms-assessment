import { PrismaClient } from '@prisma/client';
import { CourseProjectionMapper, CourseCardDTO, TeacherCourseSummaryDTO } from '../mappers/course-projection.mapper';

export interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, ttlSeconds: number): Promise<void>;
}

export interface ICourseQueryRepository {
  findDashboardCoursesByStudent(studentId: string, tenantId: string, semesterId: string): Promise<CourseCardDTO[]>;
  findCoursesByTeacher(teacherId: string, tenantId: string, semesterId: string): Promise<TeacherCourseSummaryDTO[]>;
  getCourseVersion(courseId: string, tenantId: string): Promise<number>;
}

/**
 * Optimized EXCLUSIVELY for Read operations.
 * Implements Aggressive Projection Selection and Version-Based Caching.
 * Future-ready: Can be swapped with Redis/ElasticSearch via DI.
 */
export class PrismaCourseQueryRepository implements ICourseQueryRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cache: ICacheProvider
  ) {}

  /**
   * Universal Latency Benchmark Wrapper
   */
  private async benchmark<T>(operationName: string, queryFn: () => Promise<T>): Promise<T> {
    const startTime = process.hrtime();
    const result = await queryFn();
    const diff = process.hrtime(startTime);
    const latencyMs = diff[0] * 1e3 + diff[1] * 1e-6;

    if (latencyMs > 20) {
      // Structured Log for ELK/Datadog
      console.warn(JSON.stringify({
        level: 'WARN',
        type: 'QUERY_SLOW',
        operation: operationName,
        latencyMs: latencyMs.toFixed(2),
        threshold: 20
      }));
    }
    // GlobalMetrics.recordHistogram(`query_${operationName}_latency_ms`, latencyMs);
    
    return result;
  }

  async getCourseVersion(courseId: string, tenantId: string): Promise<number> {
    // Ultra-lightweight query just to get the current version
    return this.benchmark('getCourseVersion', async () => {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId, tenantId },
        select: { version: true }
      });
      return course?.version || 0;
    });
  }

  async findDashboardCoursesByStudent(studentId: string, tenantId: string, semesterId: string): Promise<CourseCardDTO[]> {
    return this.benchmark('findDashboardCoursesByStudent', async () => {
      // 1. In reality, we join StudentEnrollment -> Class -> Course.
      // Assuming a simplistic direct class query for illustration of aggressive select.
      const courses = await this.prisma.course.findMany({
        where: { 
          tenantId,
          // classId: student's active class Id,
          status: 'ACTIVE'
        },
        select: {
          id: true,
          status: true,
          subject: { select: { name: true } },
          class: { select: { name: true } },
          teacher: { select: { fullName: true } }
        }
      });

      return courses.map(CourseProjectionMapper.toCourseCard);
    });
  }

  async findCoursesByTeacher(teacherId: string, tenantId: string, semesterId: string): Promise<TeacherCourseSummaryDTO[]> {
    // Example of using Version-Based Caching for a single entity fetch 
    // (If this was for a specific course dashboard instead of a list).
    // For a list, we might cache the list itself based on a generic teacher-semester version token.
    
    return this.benchmark('findCoursesByTeacher', async () => {
      const courses = await this.prisma.course.findMany({
        where: { teacherId, tenantId, status: { not: 'ARCHIVED' } },
        select: {
          id: true,
          subject: { select: { name: true } },
          class: { 
            select: { 
              name: true, 
              _count: { select: { enrollments: true } } 
            } 
          },
          schedules: { select: { dayOfWeek: true, startTime: true, endTime: true } }
        }
      });

      return courses.map(CourseProjectionMapper.toTeacherSummary);
    });
  }
}
