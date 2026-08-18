import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/axios';
import { BookOpen, CheckSquare, Award, FileStack } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { BackButton } from '../../components/ui/BackButton';

export const StudentCourseDetail = () => {
  const { id } = useParams();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const fetchCourse = async () => {
    try {
      const res = await api.get(`/courses/${id}`);
      setCourse(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="max-w-5xl mx-auto"><SkeletonList count={4} /></div>;

  if (!course) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <EmptyState
          icon={BookOpen}
          title="Course Not Found"
          description="The course you are looking for does not exist or you don't have access."
          className="py-20"
        />
        <div className="text-center">
          <Link to="/dashboard" className="text-primary-600 hover:underline text-sm font-medium">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const actions = [
    { label: 'Learning Materials', to: `/dashboard/student/courses/${id}/materials`, icon: FileStack, color: 'bg-blue-50 text-blue-600' },
    { label: 'Assignments', to: `/dashboard/student/courses/${id}/assignments`, icon: CheckSquare, color: 'bg-orange-50 text-orange-600' },
    { label: 'Grades', to: `/dashboard/student/grades`, icon: Award, color: 'bg-green-50 text-green-600' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <BackButton to="/dashboard/student/courses" label="Back to My Courses" />

      <div className="bg-gradient-to-br from-primary-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-white shadow-md">
        <div className="inline-block px-3 py-1 bg-white/20 rounded-lg text-[10px] font-bold uppercase tracking-wider mb-3">
          {course.semesterId}
        </div>
        <h1 className="text-2xl md:text-4xl font-extrabold mb-1 leading-tight">{course.subject?.name}</h1>
        <p className="text-primary-100 font-medium md:text-lg">Class: {course.class?.name}</p>
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Course Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {actions.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-300 transition-all active:scale-[0.99]"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${a.color}`}>
                <a.icon size={20} />
              </div>
              <span className="font-bold text-sm text-gray-800">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};