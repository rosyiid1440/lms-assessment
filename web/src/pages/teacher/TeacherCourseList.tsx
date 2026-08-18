import React, { useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { Search, Users, BookOpen, CheckSquare, CalendarCheck, BookMarked, MoreVertical, FolderOpen, MoreHorizontal, Clock, ArrowRight, Book, Activity } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';

export const TeacherCourseList = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
    const handleClickOutside = () => setMenuOpen(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [searchTerm]);

  const fetchCourses = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get(`/courses?limit=50${searchTerm ? `&q=${searchTerm}` : ''}`);
      setCourses(res.data.data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const getGradient = (name: string) => {
    const gradients = [
      'from-blue-600 to-indigo-700',
      'from-emerald-500 to-teal-700',
      'from-orange-500 to-red-600',
      'from-purple-600 to-pink-700',
      'from-cyan-600 to-blue-700'
    ];
    return gradients[name.length % gradients.length];
  };

  if (error) return <ErrorState message="Failed to load your courses." onRetry={fetchCourses} />;

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 pb-12">
      <BackButton to="/dashboard" label="Back to Dashboard" />
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">My Courses</h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">Manage your active classes, learning materials, and student progress</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" placeholder="Search subject or class..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm transition-all bg-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <SkeletonList count={3} />
        </div>
      ) : courses.length === 0 ? (
        <EmptyState 
          icon={BookOpen}
          title="No courses found"
          description={searchTerm ? "We couldn't find any courses matching your search." : "You haven't been assigned to any courses for the current semester."}
          className="py-24"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map(course => {
            const gradient = getGradient(course.subject.name);
            const progress = course.totalMaterials > 0 ? Math.min((course.publishedCount / course.totalMaterials) * 100, 100) : 0;
            
            return (
              <div key={course.id} className="group flex flex-col bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden transform hover:-translate-y-1">
                
                {/* Card Cover Header */}
                <div className={`h-32 bg-gradient-to-br ${gradient} p-5 relative overflow-hidden cursor-pointer`} onClick={() => navigate(`/dashboard/teacher/courses/${course.id}`)}>
                  {/* Decorative Pattern */}
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/40 to-transparent"></div>
                  
                  <div className="relative z-10 flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-white leading-tight line-clamp-1">{course.subject.name}</h3>
                      <p className="text-white/80 text-sm font-medium mt-1">{course.class.name}</p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === course.id ? null : course.id); }}
                      className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
                    >
                      <MoreVertical size={20} />
                    </button>

                    {/* Context Menu */}
                    {menuOpen === course.id && (
                      <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/teacher/courses/${course.id}`); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"><FolderOpen size={16}/> Open Workspace</button>
                        <div className="h-px bg-gray-100 my-1"></div>
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/teacher/courses/${course.id}?tab=materials`); }} className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"><BookOpen size={16}/> Materials</button>
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/teacher/courses/${course.id}?tab=assignments`); }} className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"><CheckSquare size={16}/> Assignments</button>
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/teacher/courses/${course.id}?tab=grades`); }} className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"><BookMarked size={16}/> Gradebook</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Avatar Overlap */}
                <div className="relative px-5">
                  <div className="absolute -top-6 right-5 w-12 h-12 rounded-full bg-white shadow-md border-2 border-white flex items-center justify-center overflow-hidden z-20">
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 flex items-center justify-center font-extrabold text-lg">
                      {course.primaryTeacher.fullName.charAt(0)}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="px-5 pt-8 pb-5 flex-1 flex flex-col cursor-pointer" onClick={() => navigate(`/dashboard/teacher/courses/${course.id}`)}>
                  
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-gray-100 text-gray-600 rounded-md">
                      {course.semester.name}
                    </span>
                    <span className={`px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-md ${
                      course.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {course.status}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-y-4 gap-x-2 mb-6 mt-auto">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1"><Users size={14}/> Students</div>
                      <div className="text-lg font-bold text-gray-900">{course.studentCount}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1"><Activity size={14}/> Progress</div>
                      <div className="text-lg font-bold text-gray-900">{course.publishedCount}/{course.totalMaterials}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1"><BookOpen size={14}/> Drafts</div>
                      <div className="text-lg font-bold text-gray-900">{course.draftCount}</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-gray-500">
                      <span>Course Readiness</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-1000 ease-out ${progress === 100 ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions Footer */}
                <div className="border-t border-gray-100 p-2 flex justify-between bg-gray-50/50">
                  <div className="flex gap-1">
                    <button onClick={() => navigate(`/dashboard/teacher/courses/${course.id}?tab=materials`)} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Materials">
                      <Book size={18} />
                    </button>
                    <button onClick={() => navigate(`/dashboard/teacher/courses/${course.id}?tab=assignments`)} className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Assignments">
                      <CheckSquare size={18} />
                    </button>
                    <button onClick={() => navigate(`/dashboard/teacher/courses/${course.id}?tab=attendance`)} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Attendance">
                      <CalendarCheck size={18} />
                    </button>
                  </div>
                  <button onClick={() => navigate(`/dashboard/teacher/courses/${course.id}`)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                    Workspace <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
