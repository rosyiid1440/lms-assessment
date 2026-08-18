import React, { useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { CalendarCheck, CheckCircle, XCircle, Clock as ClockIcon } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { StudentPageHeader } from '../../components/ui/StudentPageHeader';
import { BackButton } from '../../components/ui/BackButton';

const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { cls: string; icon: any }> = {
    PRESENT: { cls: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
    ABSENT: { cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
    LATE: { cls: 'bg-orange-50 text-orange-700 border-orange-200', icon: ClockIcon },
  };
  const c = config[status] || { cls: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: ClockIcon };
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider border ${c.cls}`}>
      <Icon size={12} /> {status}
    </span>
  );
};

export const StudentAttendanceList = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const res = await api.get('/attendance/student/ME');
      if (Array.isArray(res.data)) setRecords(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="max-w-5xl mx-auto"><SkeletonList count={4} /></div>;

  if (records.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <StudentPageHeader icon={CalendarCheck} title="My Attendance" description="Your attendance history" />
        <EmptyState
          icon={CalendarCheck}
          title="No Attendance Records"
          description="You don't have any attendance records yet."
          className="py-20"
        />
      </div>
    );
  }

  const presentCount = records.filter(r => r.status === 'PRESENT').length;
  const rate = Math.round((presentCount / records.length) * 100);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <BackButton to="/dashboard" label="Back to Dashboard" />
      <StudentPageHeader icon={CalendarCheck} title="My Attendance" description="Your attendance history" />

      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">Overall Rate</div>
          <div className={`text-3xl font-black ${rate < 75 ? 'text-red-600' : 'text-green-600'}`}>{rate}%</div>
        </div>
        <div className="text-right text-xs font-bold text-gray-500">
          <div className="text-green-600 mb-1">{presentCount} Present</div>
          <div>{records.length - presentCount} Others</div>
        </div>
      </div>

      <div className="space-y-3">
        {records.map((record: any) => (
          <div key={record.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-blue-50 text-blue-700 flex-shrink-0">
              <span className="text-sm font-bold leading-none">{new Date(record.session?.date).getDate()}</span>
              <span className="text-[10px] font-medium capitalize">{new Date(record.session?.date).toLocaleDateString('en', { month: 'short' })}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-900 truncate">{record.session?.course?.subject?.name || 'General'}</div>
              <div className="text-xs text-gray-500 font-medium truncate">{record.session?.topic || 'General Session'}</div>
            </div>
            <StatusBadge status={record.status} />
          </div>
        ))}
      </div>
    </div>
  );
};