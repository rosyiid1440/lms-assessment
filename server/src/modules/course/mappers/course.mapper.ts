import { CourseDetailDTO, CourseStatus } from '../dtos/course.dto';

/**
 * Mapper for Command / Aggregate Root completeness.
 * Strictly used by Command operations or strict verifications.
 */
export class CourseMapper {
  static toDetailDTO(entity: any): CourseDetailDTO {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      subjectId: entity.subjectId,
      classId: entity.classId,
      teacherId: entity.teacherId,
      academicYearId: entity.academicYearId,
      semesterId: entity.semesterId,
      subjectName: entity.subject?.name || 'Unknown Subject',
      className: entity.class?.name || 'Unknown Class',
      teacherName: entity.teacher?.fullName || 'Unknown Teacher',
      status: entity.status as CourseStatus,
      version: entity.version,
      coTeachers: entity.coTeachers?.map((ct: any) => ({ id: ct.id, name: ct.fullName })) || [],
      schedules: entity.schedules || [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
