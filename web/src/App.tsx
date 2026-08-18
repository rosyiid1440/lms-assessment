import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { DashboardLayout } from './components/DashboardLayout';
import { DashboardHome } from './pages/DashboardHome';
import { UserManagement } from './pages/users/UserManagement';
import { AcademicYear } from './pages/academic/AcademicYear';
import { ClassManagement } from './pages/academic/ClassManagement';
import { StudentManagement } from './pages/students/StudentManagement';
import { TeacherManagement } from './pages/teachers/TeacherManagement';
import { EnrollmentManagement } from './pages/enrollments/EnrollmentManagement';
import { CourseManagement } from './pages/courses/CourseManagement';
import { MaterialManagement } from './pages/learning/MaterialManagement';
import { TeacherCourseList } from './pages/teacher/TeacherCourseList';
import { TeacherCourseDetail } from './pages/teacher/TeacherCourseDetail';
import { TeacherMaterialDetail } from './pages/learning/TeacherMaterialDetail';
import { TeacherModuleList, TeacherModuleForm, TeacherModuleDetail } from './pages/modules';
import { TeacherPresentationList, TeacherPresentationControl, StudentLiveView } from './pages/presentations';
import { TeacherEltList, TeacherEltDetail, StudentEltList, StudentEltDetail } from './pages/elt';
import { CodeEditor, ChallengesList, ChallengeDetail, VirtualLab, ProjectsList, ProjectDetail, Leaderboard } from './pages/informatics';
import { SimulationPlayground, VirtualLab as PhysicsVirtualLab, MathWorks, ParametricQuestions, DataAnalysis, VideoNotes } from './pages/physics';
import { TahfidzPage, IbadahJournal, IslamicMedia, DiscussionPage, CharacterAssessment } from './pages/pai';
import { VirtualGallery, PerformanceStudio, AppreciationPage, RubricPage, StoryboardPage } from './pages/arts';
import { StudentAssignmentList } from './pages/submissions/StudentAssignmentList';
import { StudentGradebook } from './pages/grades/StudentGradebook';
import { StudentAttendanceList } from './pages/attendance/StudentAttendanceList';
import { StudentAnnouncementList } from './pages/announcements/StudentAnnouncementList';
import { StudentCourseList } from './pages/courses/StudentCourseList';
import { StudentCourseDetail } from './pages/courses/StudentCourseDetail';
import { StudentMaterialList } from './pages/learning/StudentMaterialList';
import { CalendarView } from './pages/calendar/CalendarView';
import { SubjectHub, StudyIndex } from './pages/study';
import { QuestionBank } from './pages/assessment/QuestionBank';
import { AssessmentBuilder } from './pages/assessment/AssessmentBuilder';
import { AssessmentDetail } from './pages/assessment/AssessmentDetail';
import { AttemptPlayer } from './pages/assessment/AttemptPlayer';
import { StudentAssessmentList } from './pages/assessment/StudentAssessmentList';
import { StudentAssessmentResults } from './pages/assessment/StudentAssessmentResults';
import { Review } from './pages/assessment/Review';
import { Analytics } from './pages/assessment/Analytics';
import { ExamMonitor } from './pages/assessment/ExamMonitor';
import { useAuthStore } from './stores/authStore';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuthStore();
  
  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

function App() {
  const { initAuth } = useAuthStore();

  React.useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/live/:shareCode" element={<StudentLiveView />} />
        <Route
          path="/exam/:attemptId"
          element={
            <ProtectedRoute>
              <AttemptPlayer />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="academic" element={<AcademicYear />} />
          <Route path="classes" element={<ClassManagement />} />
          <Route path="students" element={<StudentManagement />} />
          <Route path="teachers" element={<TeacherManagement />} />
          <Route path="enrollments" element={<EnrollmentManagement />} />
          <Route path="courses" element={<CourseManagement />} />
          <Route path="materials" element={<MaterialManagement />} />
          
          {/* TEACHER ROUTES */}
          <Route path="teacher/courses" element={<TeacherCourseList />} />
          <Route path="teacher/courses/:id" element={<TeacherCourseDetail />} />
          <Route path="teacher/courses/:id/materials/:matId" element={<TeacherMaterialDetail />} />
          <Route path="teacher/modules" element={<TeacherModuleList />} />
          <Route path="teacher/modules/new" element={<TeacherModuleForm />} />
          <Route path="teacher/modules/:id" element={<TeacherModuleDetail />} />
          <Route path="teacher/modules/:id/edit" element={<TeacherModuleForm />} />
          <Route path="teacher/presentations" element={<TeacherPresentationList />} />
          <Route path="teacher/presentations/:id/control" element={<TeacherPresentationControl />} />
          <Route path="teacher/elt" element={<TeacherEltList />} />
          <Route path="teacher/elt/:id" element={<TeacherEltDetail />} />
          {/* INFORMATICS LAB (shared teacher/student) */}
          <Route path="informatics/editor" element={<CodeEditor />} />
          <Route path="informatics/challenges" element={<ChallengesList />} />
          <Route path="informatics/challenges/:id" element={<ChallengeDetail />} />
          <Route path="informatics/lab" element={<VirtualLab />} />
          <Route path="informatics/projects" element={<ProjectsList />} />
          <Route path="informatics/projects/:id" element={<ProjectDetail />} />
          <Route path="informatics/leaderboard" element={<Leaderboard />} />
          {/* PHYSICS LAB (shared teacher/student) */}
          <Route path="physics/simulations" element={<SimulationPlayground />} />
          <Route path="physics/virtual-lab" element={<PhysicsVirtualLab />} />
          <Route path="physics/math-editor" element={<MathWorks />} />
          <Route path="physics/questions" element={<ParametricQuestions />} />
          <Route path="physics/data-analysis" element={<DataAnalysis />} />
          <Route path="physics/video-notes" element={<VideoNotes />} />
          <Route path="pai/tahfidz" element={<TahfidzPage />} />
          <Route path="pai/ibadah" element={<IbadahJournal />} />
          <Route path="pai/media" element={<IslamicMedia />} />
          <Route path="pai/discussion" element={<DiscussionPage />} />
          <Route path="pai/assessment" element={<CharacterAssessment />} />
          <Route path="arts/gallery" element={<VirtualGallery />} />
          <Route path="arts/studio" element={<PerformanceStudio />} />
          <Route path="arts/appreciation" element={<AppreciationPage />} />
          <Route path="arts/rubric" element={<RubricPage />} />
          <Route path="arts/storyboard" element={<StoryboardPage />} />
          {/* STUDY HUB — all mapel */}
          <Route path="study" element={<StudyIndex />} />
          <Route path="study/:subject" element={<SubjectHub />} />
          {/* STUDENT ROUTES */}
          <Route path="student/courses" element={<StudentCourseList />} />
          <Route path="student/courses/:id" element={<StudentCourseDetail />} />
          <Route path="student/courses/:id/materials" element={<StudentMaterialList />} />
          <Route path="student/courses/:id/assignments" element={<StudentAssignmentList />} />
          <Route path="student/grades" element={<StudentGradebook />} />
          <Route path="student/attendance" element={<StudentAttendanceList />} />
          <Route path="student/announcements" element={<StudentAnnouncementList />} />
          <Route path="student/elt" element={<StudentEltList />} />
          <Route path="student/elt/:id" element={<StudentEltDetail />} />
          {/* SHARED ROUTES */}
          <Route path="calendar" element={<CalendarView />} />
          {/* ASSESSMENT ENGINE */}
          <Route path="assessment/questions" element={<QuestionBank />} />
          <Route path="assessment/builder" element={<AssessmentBuilder />} />
          <Route path="assessment/builder/:id" element={<AssessmentDetail />} />
          <Route path="assessment/attempts" element={<StudentAssessmentList />} />
          <Route path="assessment/results" element={<StudentAssessmentResults />} />
          <Route path="assessment/review" element={<Review />} />
          <Route path="assessment/monitor" element={<ExamMonitor />} />
          <Route path="assessment/analytics" element={<Analytics />} />
          <Route path="assessment/analytics/:id" element={<Analytics />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
