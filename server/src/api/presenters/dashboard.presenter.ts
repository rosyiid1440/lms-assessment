import { ICourseQueryRepository } from '../../../modules/course/repositories/course.query-repository';
import { IProgressProjectionRepository } from '../../../modules/learning/progress/services/progress.service';
// import { INotificationQueryRepository } from '../../../modules/notification/...';

export interface DashboardResponse {
  courses: any[];
  resumeLearning: any | null;
  unreadNotifications: number;
}

/**
 * Presenter Layer (API Composition).
 * Aggregates read-optimized data from multiple independent domains.
 * Eliminates the need for cross-domain SQL JOINs.
 */
export class DashboardPresenter {
  constructor(
    private readonly courseQueryRepo: ICourseQueryRepository,
    private readonly progressQueryRepo: IProgressProjectionRepository,
    // private readonly notificationRepo: INotificationQueryRepository
  ) {}

  async buildStudentDashboard(studentId: string, tenantId: string, activeSemesterId: string): Promise<DashboardResponse> {
    
    // Execute independently and concurrently (O(1) lookups from Projections)
    const [courses, resumeContext] = await Promise.all([
      this.courseQueryRepo.findDashboardCoursesByStudent(studentId, tenantId, activeSemesterId),
      this.progressQueryRepo.getStudentContext(studentId), // Fetches the 'Continue Learning' projection
      // this.notificationRepo.countUnread(studentId)
    ]);

    return {
      courses: courses.map(c => ({
        id: c.id,
        subjectName: c.subjectName,
        teacherName: c.teacherName
      })),
      resumeLearning: resumeContext ? {
        lastLessonId: resumeContext.get('last_lesson_id'),
        courseId: resumeContext.get('last_course_id')
      } : null,
      unreadNotifications: 3 // Mocked result
    };
  }
}
