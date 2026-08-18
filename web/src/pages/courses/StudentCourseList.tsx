import React, { useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { BookOpen, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { StudentPageHeader } from '../../components/ui/StudentPageHeader';
import { BackButton } from '../../components/ui/BackButton';

export const StudentCourseList = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/gradebook/student/ME');
      if (Array.isArray(res.data)) {
        setCourses(res.data.map((item: any) => item.course));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="max-w-5xl mx-auto"><SkeletonList count={4} /></div>;

  if (courses.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <StudentPageHeader icon={BookOpen} title="My Courses" description="View your enrolled courses" />
        <EmptyState
          icon={BookOpen}
          title="No Courses Enrolled"
          description="You are not currently enrolled in any courses."
          className="py-20"
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <BackButton to="/dashboard" label="Back to Dashboard" />
      <StudentPageHeader icon={BookOpen} title="My Courses" description="View your enrolled courses" />

      <div className="space-y-3">
        {courses.map((course: any) => (
          <Link
            key={course.id}
            to={`/dashboard/student/courses/${course.id}`}
            className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md hover:border-primary-300 transition-all active:scale-[0.99]"
          >
            <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
              {course.subject?.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 truncate">{course.subject?.name}</h3>
              <p className="text-xs text-gray-500 font-medium truncate">{course.class?.name || 'Assigned Class'}</p>
            </div>
            <ArrowRight size={20} className="text-gray-300 flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
};