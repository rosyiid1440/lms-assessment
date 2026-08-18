import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/axios';
import { MaterialManagement } from '../learning/MaterialManagement';
import { AssignmentManagement } from '../assignments/AssignmentManagement';
import { TeacherGradebook } from '../grades/TeacherGradebook';
import { TeacherAttendanceList } from '../attendance/TeacherAttendanceList';
import { TeacherAnnouncementList } from '../announcements/TeacherAnnouncementList';
import { Users, FileText, CheckSquare, CalendarCheck, BookMarked, Settings, ChevronRight, BookOpen, Clock, Layout, Search, GraduationCap, Megaphone } from 'lucide-react';
import { SkeletonCard, SkeletonTable } from '../../components/ui/Skeleton';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Drawer } from '../../components/ui/Drawer';
import { BackButton } from '../../components/ui/BackButton';

export const TeacherCourseDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = searchParams.get('tab') || 'overview';

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Student list states
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSort, setStudentSort] = useState('name');

  // Student Drawer
  const [studentDrawer, setStudentDrawer] = useState<{isOpen: boolean, student: any}>({ isOpen: false, student: null });

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const fetchCourse = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get(`/courses/${id}`);
      setCourse(res.data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Layout },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'materials', label: 'Materials', icon: FileText },
    { id: 'assignments', label: 'Assignments', icon: CheckSquare },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'grades', label: 'Grades', icon: BookMarked },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const filteredStudents = React.useMemo(() => {
    if (!course?.students) return [];
    let filtered = course.students.filter((s: any) => 
      s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.nis.toLowerCase().includes(studentSearch.toLowerCase())
    );
    if (studentSort === 'name') filtered.sort((a: any, b: any) => a.fullName.localeCompare(b.fullName));
    if (studentSort === 'nis') filtered.sort((a: any, b: any) => a.nis.localeCompare(b.nis));
    return filtered;
  }, [course?.students, studentSearch, studentSort]);

  if (error) return <ErrorState message="Failed to load course workspace." onRetry={fetchCourse} />;

  if (loading) return (
    <div className="space-y-6">
      <SkeletonCard />
      <SkeletonTable rows={4} cols={3} />
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6 pb-12">
      {/* Rich Course Header */}
      <div className="bg-white border border-gray-200 rounded-2xl px-4 md:px-8 py-4 md:py-6 shadow-sm relative overflow-hidden">
        {/* Banner pattern background */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary-50 to-transparent opacity-50 pointer-events-none"></div>
        <div className="absolute -top-24 -right-10 text-primary-100 opacity-20 pointer-events-none">
          <BookOpen size={200} strokeWidth={0.5} />
        </div>

        <div className="relative z-10 space-y-3 md:space-y-4">
          <BackButton to="/dashboard/teacher/courses" label="Back to My Courses" />

          <div className="hidden md:flex items-center text-xs font-medium text-gray-400 uppercase tracking-wider">
            <Link to="/dashboard" className="hover:text-primary-600 transition-colors">Dashboard</Link>
            <ChevronRight size={14} className="mx-1" />
            <Link to="/dashboard/teacher/courses" className="hover:text-primary-600 transition-colors">My Courses</Link>
            <ChevronRight size={14} className="mx-1" />
            <span className="text-gray-900">{course.subject.code}</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">{course.subject.name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 font-medium">
                <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100"><GraduationCap size={16}/> {course.class.name}</span>
                <span className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md border border-purple-100"><Clock size={16}/> {course.semester.name}</span>
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${course.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                  <CheckSquare size={16}/> {course.status}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 bg-white/80 backdrop-blur-sm p-3 md:p-4 rounded-xl border border-gray-100 shadow-sm w-full sm:w-auto">
              <div className="text-center flex-1 sm:flex-none">
                <div className="text-2xl font-black text-gray-900">{course.studentCount}</div>
                <div className="text-[10px] uppercase font-bold text-gray-400 mt-1 tracking-wider">Students</div>
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              <div className="text-center flex-1 sm:flex-none">
                <div className="text-2xl font-black text-gray-900">{course.materialCount}</div>
                <div className="text-[10px] uppercase font-bold text-gray-400 mt-1 tracking-wider">Materials</div>
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              <div className="text-center flex-1 sm:flex-none">
                <div className="text-2xl font-black text-gray-900">{1 + course.coTeachers.length}</div>
                <div className="text-[10px] uppercase font-bold text-gray-400 mt-1 tracking-wider">Teachers</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Area */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
        
        {/* Desktop Mini Sidebar */}
        <aside className="hidden lg:block w-64 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex-shrink-0 lg:sticky lg:top-4">
          <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-4 px-3">Workspace</div>
          <nav className="space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const active = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(`/dashboard/teacher/courses/${id}?tab=${tab.id}`, { replace: true })}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    active 
                      ? 'bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-100/50' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon size={18} className={active ? 'text-primary-600' : 'text-gray-400'} strokeWidth={active ? 2.5 : 2} /> 
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Tab Bar */}
        <div className="lg:hidden w-full flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(`/dashboard/teacher/courses/${id}?tab=${tab.id}`, { replace: true })}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold border transition-colors ${
                  active
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Workspace Content */}
        <main className="flex-1 min-w-0 w-full">
          
          {currentTab === 'overview' && (
            <div className="max-w-5xl space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-gray-900">Course Overview</h3>
                  <span className="text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                    Last updated: {new Date(course.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="p-4 md:p-6 text-gray-600 leading-relaxed text-sm">
                  {course.subject.description ? (
                    <p>{course.subject.description}</p>
                  ) : (
                    <p className="italic text-gray-400">No description provided for this subject. The description usually outlines the learning objectives and standard curriculum for the semester.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Teaching Team */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Teaching Team</h3>
                  </div>
                  <div className="p-4 md:p-6 space-y-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 flex items-center justify-center font-bold text-lg shadow-sm border border-primary-50">
                        {course.primaryTeacher.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{course.primaryTeacher.fullName}</div>
                        <div className="text-xs font-semibold text-primary-600 uppercase tracking-wider mt-0.5">Primary Teacher</div>
                      </div>
                    </div>
                    {course.coTeachers.map((ct: any) => (
                      <div key={ct.id} className="flex items-center gap-4 pl-4 border-l-2 border-gray-100">
                        <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-sm border border-gray-200">
                          {ct.teacher.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-800 text-sm">{ct.teacher.fullName}</div>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-0.5">{ct.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity Timeline */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                  <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-center">
                    <EmptyState 
                      icon={Clock}
                      title="No recent activity"
                      description="Course timeline will appear here once materials or assignments are published."
                      className="border-none py-8 shadow-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'students' && (
            <div className="max-w-5xl space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" placeholder="Search by Name or NIS..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 transition-shadow bg-gray-50 focus:bg-white outline-none" 
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <select 
                    value={studentSort} onChange={e => setStudentSort(e.target.value)}
                    className="flex-1 md:flex-none px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-primary-500 font-medium text-gray-700 bg-white outline-none"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="nis">Sort by NIS</option>
                  </select>
                  <div className="text-sm font-medium text-gray-500">
                    <span className="text-gray-900 font-bold text-lg">{filteredStudents.length}</span> / {course.studentCount} Students
                  </div>
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <EmptyState 
                  icon={Users}
                  title={studentSearch ? "No students match your search" : "No students enrolled"}
                  description={studentSearch ? "Try a different name or NIS." : "There are no active students in this class for the current semester."}
                  className="py-24 border-none shadow-none"
                />
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {filteredStudents.map((student: any) => (
                      <div key={student.id} onClick={() => setStudentDrawer({ isOpen: true, student })} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex items-center gap-3 active:scale-[0.99] transition-all">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-700 font-bold text-sm shadow-sm border border-gray-300 flex-shrink-0">
                          {student.fullName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 truncate">{student.fullName}</div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">{student.nis} {student.nisn ? `• ${student.nisn}` : ''}</div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] font-bold text-gray-500">{student.gender === 'MALE' ? 'Laki-Laki' : 'Perempuan'}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${student.user.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                              {student.user.status}
                            </span>
                          </div>
                        </div>
                        <button className="px-4 py-2 text-xs font-bold bg-primary-50 text-primary-700 border border-primary-200 rounded-lg flex-shrink-0">View</button>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden md:block bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm text-gray-600">
                      <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-700 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-6 py-4 font-extrabold">Student Name</th>
                          <th className="px-6 py-4 font-extrabold">NIS / NISN</th>
                          <th className="px-6 py-4 font-extrabold">Gender</th>
                          <th className="px-6 py-4 font-extrabold">Status</th>
                          <th className="px-6 py-4 font-extrabold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredStudents.map((student: any) => (
                          <tr key={student.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={() => setStudentDrawer({ isOpen: true, student })}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-700 font-bold text-sm shadow-sm border border-gray-300">
                                  {student.fullName.charAt(0)}
                                </div>
                                <div>
                                  <span className="font-bold text-gray-900 block group-hover:text-primary-600 transition-colors">{student.fullName}</span>
                                  <span className="text-xs text-gray-500 font-medium">{student.email || '-'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-mono font-medium text-gray-700">{student.nis}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5">{student.nisn}</div>
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-700">
                              {student.gender === 'MALE' ? 'Laki-Laki' : 'Perempuan'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold ${student.user.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {student.user.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setStudentDrawer({ isOpen: true, student }); }}
                                className="px-4 py-2 text-xs font-bold bg-white border border-gray-200 text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 hover:text-primary-600 hover:border-primary-200 transition-all"
                              >
                                View Profile
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {currentTab === 'announcements' && (
            <div className="max-w-5xl space-y-6">
              <TeacherAnnouncementList courseId={id!} />
            </div>
          )}

          {currentTab === 'materials' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-[75vh] md:h-[calc(100vh-14rem)]">
              <MaterialManagement courseId={id} />
            </div>
          )}

          {currentTab === 'assignments' && (
            <div className="max-w-5xl space-y-6">
              <AssignmentManagement courseId={id!} courseStudents={course.students} />
            </div>
          )}

          {currentTab === 'attendance' && (
            <div className="max-w-5xl space-y-6">
              <TeacherAttendanceList courseId={id!} />
            </div>
          )}

          {currentTab === 'grades' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-[70vh] md:h-[calc(100vh-14rem)]">
              <TeacherGradebook courseId={id!} />
            </div>
          )}

          {currentTab === 'settings' && (
            <div className="max-w-2xl">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-6 md:p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Course Settings</h3>
                <p className="text-sm text-gray-500 mb-8 leading-relaxed">Manage course visibility, archiving, and advanced configurations. Only Primary Teachers and Admins have full access to these settings.</p>
                
                <div className="space-y-4 border-t border-gray-100 pt-6">
                  <div className="p-5 border border-red-100 bg-red-50/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-red-900">Archive Course</div>
                      <div className="text-xs text-red-700 mt-1 max-w-sm">Archive this course to hide it from active student dashboards. Data is preserved.</div>
                    </div>
                    <button className="px-5 py-2 border border-red-200 rounded-lg bg-white text-sm font-bold text-red-600 hover:bg-red-50 shadow-sm transition-colors flex-shrink-0">Archive</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Student Profile Drawer */}
      <Drawer 
        isOpen={studentDrawer.isOpen} 
        onClose={() => setStudentDrawer({ isOpen: false, student: null })}
        title="Student Profile"
      >
        {studentDrawer.student && (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-primary-700 font-bold text-3xl shadow-inner mb-4">
                {studentDrawer.student.fullName.charAt(0)}
              </div>
              <h3 className="text-xl font-bold text-gray-900">{studentDrawer.student.fullName}</h3>
              <p className="text-sm font-medium text-gray-500 mt-1">{studentDrawer.student.nis} / {studentDrawer.student.nisn}</p>
              <span className="mt-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                ACTIVE STUDENT
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">Academic Info</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-400 text-xs font-bold uppercase mb-1">Gender</div>
                  <div className="text-gray-900 font-medium">{studentDrawer.student.gender}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs font-bold uppercase mb-1">Religion</div>
                  <div className="text-gray-900 font-medium">{studentDrawer.student.religion || '-'}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">Enrollment History</h4>
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-600 italic text-center">
                History data currently loaded on demand.
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
