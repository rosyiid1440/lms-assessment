import { MajorSummaryDTO, ClassroomSummaryDTO, ClassSummaryDTO, ClassDetailDTO } from './dtos/master.dto';

export class AcademicMasterMapper {
  static toMajorSummary(data: any): MajorSummaryDTO {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
    };
  }

  static toClassroomSummary(data: any): ClassroomSummaryDTO {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      capacity: data.capacity,
    };
  }

  static toClassSummary(data: any): ClassSummaryDTO {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      gradeLevelName: data.gradeLevel?.name || 'N/A',
      majorName: data.major?.name || 'N/A',
      homeroomTeacherName: data.homeroom?.fullName,
      totalStudents: data._count?.enrollments || 0, // Using Prisma's relation count
    };
  }

  static toClassDetail(data: any): ClassDetailDTO {
    return {
      ...this.toClassSummary(data),
      tenantId: data.tenantId,
      academicYearId: data.academicYearId,
      classroomId: data.classroomId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
