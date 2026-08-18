import React, { useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { Award, AlertCircle } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { StudentPageHeader } from '../../components/ui/StudentPageHeader';
import { BackButton } from '../../components/ui/BackButton';

const StatusBadge = ({ status, isMissing }: { status?: string; isMissing?: boolean }) => {
  if (isMissing) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider bg-red-50 text-red-700 border border-red-200">
        <AlertCircle size={12} /> Missing
      </span>
    );
  }
  if (!status) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider bg-gray-50 text-gray-500 border border-gray-200">
        Pending
      </span>
    );
  }
  const graded = status === 'GRADED';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider border ${graded ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
      {status}
    </span>
  );
};

export const StudentGradebook = () => {
  const [coursesData, setCoursesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const res = await api.get('/gradebook/student/ME');
      if (Array.isArray(res.data)) setCoursesData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="max-w-5xl mx-auto"><SkeletonList count={4} /></div>;

  if (coursesData.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <StudentPageHeader icon={Award} title="My Grades" description="Your academic performance across courses" />
        <EmptyState
          icon={Award}
          title="No Grades Available"
          description="You are not enrolled in any courses or there are no assignments graded yet."
          className="py-20"
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <BackButton to="/dashboard" label="Back to Dashboard" />
      <StudentPageHeader icon={Award} title="My Grades" description="Your academic performance across courses" />

      {coursesData.map((cData: any) => (
        <div key={cData.course.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Course Header */}
          <div className="p-4 md:p-5 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-extrabold text-gray-900 truncate">{cData.course.subject?.name}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                  {cData.course.semesterId}
                </p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-center">
                  <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Avg</div>
                  <div className="text-xl font-black text-primary-700">{cData.stats.average}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Missing</div>
                  <div className={`text-xl font-black ${cData.stats.missingCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {cData.stats.missingCount}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Assignments as cards (mobile friendly) */}
          {cData.assignments.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 italic">No assignments for this course.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {cData.assignments.map((ass: any) => {
                const isMissing = !ass.mySubmission && new Date() > new Date(ass.dueDate);
                const hasGrade = ass.mySubmission?.finalGrade !== null && ass.mySubmission?.finalGrade !== undefined;
                return (
                  <div key={ass.id} className="p-4 md:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 truncate">{ass.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Due: {new Date(ass.dueDate).toLocaleDateString()}</div>
                      </div>
                      <StatusBadge status={ass.mySubmission?.status} isMissing={isMissing} />
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="text-xs font-semibold text-gray-500">Score</div>
                      <div className="text-lg font-black text-gray-900">
                        {hasGrade ? (
                          <>
                            {ass.mySubmission.finalGrade} <span className="text-xs font-bold text-gray-400">/ {ass.maxScore}</span>
                          </>
                        ) : (
                          <span className="text-gray-300 font-bold">-</span>
                        )}
                      </div>
                    </div>
                    {ass.mySubmission?.feedback && (
                      <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 italic line-clamp-2">
                        "{ass.mySubmission.feedback}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};