import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/axios';
import { BookOpen, Users, FileText, CheckSquare, Clock, ArrowRight, PlayCircle, Plus, CalendarCheck, Award, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';

export const DashboardHome = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const isTeacher = user?.role?.slug === 'teacher';
  const isStudent = user?.role?.slug === 'student';
  const isAdmin = !isTeacher && !isStudent;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-xl w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-32 bg-gray-200 rounded-xl"></div>
          <div className="h-32 bg-gray-200 rounded-xl"></div>
          <div className="h-32 bg-gray-200 rounded-xl"></div>
          <div className="h-32 bg-gray-200 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-gray-200 rounded-xl"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message="Failed to load your dashboard data." onRetry={fetchStats} />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-900 rounded-xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-xl md:text-3xl font-bold mb-2">Welcome back, {user?.email.split('@')[0]}!</h2>
          <p className="text-primary-100 max-w-xl">
            {isTeacher 
              ? "Here's your teaching overview. Manage your courses, track student progress, and grade assignments all in one place." 
              : isStudent
              ? "Here's your learning overview. Track your courses, assignments, grades, and attendance all in one place."
              : "Here's the school administration overview. Monitor system health, user registrations, and academic progress."}
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
          <BookOpen size={200} />
        </div>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-xl"><Users size={28} /></div>
            <div>
              <h3 className="text-gray-500 text-sm font-medium">Total Students</h3>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalStudents || 0}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-4 bg-green-50 text-green-600 rounded-xl"><Users size={28} /></div>
            <div>
              <h3 className="text-gray-500 text-sm font-medium">Active Teachers</h3>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalTeachers || 0}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-4 bg-purple-50 text-purple-600 rounded-xl"><BookOpen size={28} /></div>
            <div>
              <h3 className="text-gray-500 text-sm font-medium">Active Classes</h3>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalClasses || 0}</p>
            </div>
          </div>
        </div>
      )}

      {isTeacher && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 md:p-3 bg-blue-50 text-blue-600 rounded-lg"><BookOpen size={20} className="md:w-6 md:h-6" /></div>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-gray-900 leading-none">{stats?.totalCourses || 0}</p>
              <h3 className="text-gray-500 text-xs md:text-sm font-medium mt-1">Courses Taught</h3>
            </div>
            
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 md:p-3 bg-green-50 text-green-600 rounded-lg"><Users size={20} className="md:w-6 md:h-6" /></div>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-gray-900 leading-none">{stats?.totalStudents || 0}</p>
              <h3 className="text-gray-500 text-xs md:text-sm font-medium mt-1">Active Students</h3>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 md:p-3 bg-purple-50 text-purple-600 rounded-lg"><FileText size={20} className="md:w-6 md:h-6" /></div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-green-600">{stats?.totalPublishedMaterial || 0} Pub</div>
                  <div className="text-xs font-semibold text-yellow-600">{stats?.totalDraftMaterial || 0} Draft</div>
                </div>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-gray-900 leading-none">{stats?.totalMaterial || 0}</p>
              <h3 className="text-gray-500 text-xs md:text-sm font-medium mt-1">Total Materials</h3>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 md:p-3 bg-orange-50 text-orange-600 rounded-lg"><CheckSquare size={20} className="md:w-6 md:h-6" /></div>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-gray-900 leading-none">{stats?.teacherPendingGrading || 0}</p>
              <h3 className="text-gray-500 text-xs md:text-sm font-medium mt-1">Pending Grading</h3>
            </div>
          </div>

          {/* Continue Teaching / Recent Courses */}
          {stats?.recentCourses?.length > 0 && (
            <div className="mb-8">
              <div className="flex justify-between items-end mb-4">
                <h3 className="text-lg font-bold text-gray-900">Continue Teaching</h3>
                <Link to="/dashboard/teacher/courses" className="text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">View All <ArrowRight size={16}/></Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.recentCourses.map((course: any) => (
                  <Link to={`/dashboard/teacher/courses/${course.id}`} key={course.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all flex flex-col gap-3 group">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                        {course.subject.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1">{course.subject.name}</h4>
                        <p className="text-sm text-gray-500 font-medium">{course.class.name}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Schedule & Quick Actions */}
            <div className="space-y-6 lg:col-span-2">
              
              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Link to="/dashboard/materials" className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50 hover:border-primary-200 transition-colors text-center group">
                    <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-2 group-hover:bg-primary-100 transition-colors"><Plus size={20} /></div>
                    <span className="text-xs font-medium text-gray-700">Create Material</span>
                  </Link>
                  <Link to="/dashboard/teacher/courses" className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50 hover:border-primary-200 transition-colors text-center group">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors"><BookOpen size={20} /></div>
                    <span className="text-xs font-medium text-gray-700">My Courses</span>
                  </Link>
                  <button className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50 hover:border-primary-200 transition-colors text-center group">
                    <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-2 group-hover:bg-green-100 transition-colors"><CheckSquare size={20} /></div>
                    <span className="text-xs font-medium text-gray-700">New Assignment</span>
                  </button>
                  <button className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50 hover:border-primary-200 transition-colors text-center group">
                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-2 group-hover:bg-purple-100 transition-colors"><FileText size={20} /></div>
                    <span className="text-xs font-medium text-gray-700">Gradebook</span>
                  </button>
                </div>
              </div>

              {/* Schedule */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Clock size={20} className="text-primary-600"/> Today's Schedule
                  </h3>
                  <button className="text-sm font-medium text-primary-600 hover:text-primary-700">View Calendar</button>
                </div>
                
                {stats?.todaySchedule?.length === 0 ? (
                  <EmptyState 
                    icon={CalendarCheck} 
                    title="No classes today" 
                    description="You don't have any teaching schedule for today. Use this time to prepare materials or grade assignments."
                  />
                ) : (
                  <div className="space-y-4">
                    {stats?.todaySchedule?.map((schedule: any, i: number) => (
                      <div key={i} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
                        <div className="flex flex-col items-center justify-center w-16 h-16 bg-blue-50 text-blue-700 rounded-lg">
                          <span className="text-sm font-bold">{schedule.time.split(':')[0]}</span>
                          <span className="text-xs font-medium">{schedule.time.split(':')[1]}</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-gray-900 text-lg">{schedule.courseName}</div>
                          <div className="text-sm text-gray-500 font-medium flex items-center gap-2">
                            <span>{schedule.className}</span> &bull; <span>{schedule.room}</span>
                          </div>
                        </div>
                        <button className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 text-sm font-medium rounded-md hover:bg-primary-100">
                          Start Class <PlayCircle size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Activity</h3>
              
              {stats?.recentActivity?.length === 0 ? (
                <EmptyState 
                  icon={FileText} 
                  title="No recent activity" 
                  description="Your recent material creations and course activities will appear here."
                />
              ) : (
                <div className="space-y-6">
                  {stats?.recentActivity?.map((act: any, i: number) => (
                    <div key={i} className="flex gap-4">
                      <div className="relative flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full mt-1 z-10 ${act.type === 'PUBLISHED' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                        {i !== stats.recentActivity.length - 1 && (
                          <div className="w-px h-full bg-gray-200 absolute top-4"></div>
                        )}
                      </div>
                      <div className="pb-2">
                        <p className="text-sm font-semibold text-gray-900">{act.title}</p>
                        <p className="text-xs text-gray-500 font-medium">{act.course}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${act.type === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {act.type}
                          </span>
                          <span className="text-[10px] text-gray-400">{new Date(act.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <Link to="/dashboard/materials" className="mt-6 w-full flex items-center justify-center gap-2 py-2 border border-gray-200 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                View All Materials <ArrowRight size={16} />
              </Link>
            </div>

          </div>
        </>
      )}

      {isStudent && (
        <>
          {/* Stat cards - 2 cols on mobile, 4 on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 md:p-3 bg-blue-50 text-blue-600 rounded-lg"><BookOpen size={20} className="md:w-6 md:h-6" /></div>
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900 leading-none">{stats?.totalCourses || 0}</p>
                  <h3 className="text-gray-500 text-xs md:text-sm font-medium mt-1">Courses</h3>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 md:p-3 bg-orange-50 text-orange-600 rounded-lg"><CheckSquare size={20} className="md:w-6 md:h-6" /></div>
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900 leading-none">{stats?.pendingSubmissions || 0}</p>
                  <h3 className="text-gray-500 text-xs md:text-sm font-medium mt-1">To Do</h3>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 md:p-3 bg-green-50 text-green-600 rounded-lg"><Award size={20} className="md:w-6 md:h-6" /></div>
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900 leading-none">{stats?.gradeAverage || 0}%</p>
                  <h3 className="text-gray-500 text-xs md:text-sm font-medium mt-1">Avg Grade</h3>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 md:p-3 bg-purple-50 text-purple-600 rounded-lg"><CalendarCheck size={20} className="md:w-6 md:h-6" /></div>
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900 leading-none">{stats?.attendanceRate || 0}%</p>
                  <h3 className="text-gray-500 text-xs md:text-sm font-medium mt-1">Attendance</h3>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions - horizontal scroll on mobile */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
            <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Quick Access</h3>
            <div className="flex gap-2 md:gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              <Link to="/dashboard/student/courses" className="shrink-0 flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 font-bold text-sm">
                <BookOpen size={18} /> My Courses
              </Link>
              <Link to="/dashboard/student/assignments" className="shrink-0 flex items-center gap-2 px-4 py-3 bg-orange-50 text-orange-700 rounded-xl border border-orange-100 font-bold text-sm">
                <CheckSquare size={18} /> Assignments
              </Link>
              <Link to="/dashboard/student/grades" className="shrink-0 flex items-center gap-2 px-4 py-3 bg-green-50 text-green-700 rounded-xl border border-green-100 font-bold text-sm">
                <Award size={18} /> Grades
              </Link>
              <Link to="/dashboard/student/attendance" className="shrink-0 flex items-center gap-2 px-4 py-3 bg-yellow-50 text-yellow-700 rounded-xl border border-yellow-100 font-bold text-sm">
                <CalendarCheck size={18} /> Attendance
              </Link>
              <Link to="/dashboard/student/announcements" className="shrink-0 flex items-center gap-2 px-4 py-3 bg-red-50 text-red-700 rounded-xl border border-red-100 font-bold text-sm">
                <Megaphone size={18} /> Announcements
              </Link>
            </div>
          </div>

          {/* Enrolled courses */}
          {stats?.enrolledCourses?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
              <div className="flex justify-between items-center mb-3 md:mb-4">
                <h3 className="text-base md:text-lg font-bold text-gray-900">Enrolled Courses</h3>
                <Link to="/dashboard/student/courses" className="text-sm font-medium text-primary-600 hover:text-primary-700">View All</Link>
              </div>
              <div className="space-y-2 md:space-y-3">
                {stats.enrolledCourses.map((course: any) => (
                  <Link key={course.id} to={`/dashboard/student/courses/${course.id}`} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-primary-200 hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                      {course.subjectName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 truncate">{course.subjectName}</div>
                      <div className="text-xs md:text-sm text-gray-500 font-medium truncate">{course.className}</div>
                    </div>
                    <ArrowRight size={18} className="text-gray-300 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
