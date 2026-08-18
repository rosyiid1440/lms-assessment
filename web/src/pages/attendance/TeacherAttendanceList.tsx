import React, { useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { Search, Plus, CalendarCheck, Edit2, Trash2, Save, ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/SkeletonList';

interface TeacherAttendanceListProps {
  courseId: string;
}

export const TeacherAttendanceList = ({ courseId }: TeacherAttendanceListProps) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const [modal, setModal] = useState<{isOpen: boolean, data: any}>({ isOpen: false, data: null });
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, id: string}>({isOpen: false, id: ''});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Take Attendance View state
  const [activeSession, setActiveSession] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords] = useState<Record<string, {status: string, notes: string}>>({});
  const [isSavingRecords, setIsSavingRecords] = useState(false);

  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    fetchSessions();
  }, [courseId]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/attendance/sessions?courseId=${courseId}`);
      setSessions(res.data.data || res.data); // Fallback in case meta doesn't exist
      // TODO: Handle res.data.meta for pagination UI if needed
    } catch (err) {
      showToast('Failed to load sessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSession = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (modal.data?.id) {
        await api.put(`/attendance/sessions/${modal.data.id}`, data);
        showToast('Session updated', 'success');
      } else {
        await api.post('/attendance/sessions', { ...data, courseId });
        showToast('Session created', 'success');
      }
      setModal({ isOpen: false, data: null });
      fetchSessions();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Operation failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await api.delete(`/attendance/sessions/${confirmDialog.id}`);
      showToast('Session deleted', 'success');
      setConfirmDialog({isOpen: false, id: ''});
      fetchSessions();
    } catch (err) {
      showToast('Delete failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTakeAttendance = async (sessionId: string) => {
    try {
      const res = await api.get(`/attendance/sessions/${sessionId}`);
      setActiveSession(res.data.session);
      setStudents(res.data.enrolledStudents);
      
      const initialRecords: any = {};
      res.data.enrolledStudents.forEach((student: any) => {
        const existing = res.data.session.records.find((r: any) => r.studentId === student.id);
        initialRecords[student.id] = {
          status: existing ? existing.status : 'PRESENT', // Default all present if not taken yet
          notes: existing?.notes || ''
        };
      });
      setRecords(initialRecords);
    } catch (err) {
      showToast('Failed to load attendance records', 'error');
    }
  };

  const handleRecordChange = (studentId: string, field: 'status' | 'notes', value: string) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value }
    }));
  };

  const markAllAs = (status: string) => {
    const updated: any = {};
    Object.keys(records).forEach(studentId => {
      updated[studentId] = { ...records[studentId], status };
    });
    setRecords(updated);
  };

  const handleSaveRecords = async () => {
    setIsSavingRecords(true);
    const updates = Object.keys(records).map(studentId => ({
      studentId,
      status: records[studentId].status,
      notes: records[studentId].notes
    }));

    try {
      await api.post(`/attendance/sessions/${activeSession.id}/records`, { updates });
      showToast('Attendance saved successfully', 'success');
      setActiveSession(null);
      fetchSessions();
    } catch (err) {
      showToast('Failed to save attendance', 'error');
    } finally {
      setIsSavingRecords(false);
    }
  };

  if (activeSession) {
    return (
      <div className="max-w-5xl space-y-6 pb-12">
        {toast && (
          <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 text-white animate-in fade-in slide-in-from-top-4 font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.msg}
          </div>
        )}
        
        <div className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <button onClick={() => setActiveSession(null)} className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Take Attendance</h2>
            <p className="text-sm font-medium text-gray-500 mt-0.5">{new Date(activeSession.date).toLocaleDateString()} &bull; {activeSession.topic || 'General Session'}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[calc(100vh-16rem)]">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-wrap justify-between items-center gap-4 z-10 sticky top-0">
            <div className="flex gap-2">
              <button onClick={() => markAllAs('PRESENT')} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-colors flex items-center gap-1.5 shadow-sm"><CheckCircle size={14}/> Mark All Present</button>
              <button onClick={() => markAllAs('ABSENT')} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors flex items-center gap-1.5 shadow-sm"><XCircle size={14}/> Mark All Absent</button>
            </div>
            <button 
              onClick={handleSaveRecords} disabled={isSavingRecords}
              className="px-6 py-2 bg-primary-600 text-white text-sm font-bold rounded-xl shadow-md hover:bg-primary-700 hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2"
            >
              {isSavingRecords ? 'Saving...' : <><Save size={16} /> Save Attendance</>}
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm text-gray-600 min-w-max">
              <thead className="bg-white border-b-2 border-gray-100 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 sticky left-0 bg-white border-r border-gray-100 shadow-[4px_0_10px_rgba(0,0,0,0.02)]">Student</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 w-1/3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map(student => (
                  <tr key={student.id} className="hover:bg-blue-50/20 group">
                    <td className="px-6 py-3 sticky left-0 bg-white group-hover:bg-blue-50/20 border-r border-gray-100 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-[10px] font-extrabold text-gray-600 shadow-sm border border-gray-300">
                        {student.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-xs truncate">{student.fullName}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{student.nis}</div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <select 
                        value={records[student.id]?.status || 'PRESENT'}
                        onChange={(e) => handleRecordChange(student.id, 'status', e.target.value)}
                        className={`text-xs font-bold rounded-lg px-3 py-1.5 outline-none border transition-colors cursor-pointer ${
                          records[student.id]?.status === 'PRESENT' ? 'bg-green-50 text-green-700 border-green-200' :
                          records[student.id]?.status === 'ABSENT' ? 'bg-red-50 text-red-700 border-red-200' :
                          records[student.id]?.status === 'LATE' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}
                      >
                        <option value="PRESENT" className="bg-white text-gray-900">PRESENT</option>
                        <option value="ABSENT" className="bg-white text-gray-900">ABSENT</option>
                        <option value="LATE" className="bg-white text-gray-900">LATE</option>
                        <option value="EXCUSED" className="bg-white text-gray-900">EXCUSED</option>
                      </select>
                    </td>
                    <td className="px-6 py-3">
                      <input 
                        type="text" placeholder="Add notes (optional)..."
                        value={records[student.id]?.notes || ''}
                        onChange={(e) => handleRecordChange(student.id, 'notes', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-transparent rounded-md focus:bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="max-w-4xl pt-6"><SkeletonList count={3} /></div>;

  return (
    <div className="max-w-5xl space-y-6 pb-12">
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 text-white animate-in fade-in slide-in-from-top-4 font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" placeholder="Search sessions..." 
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 bg-gray-50 focus:bg-white outline-none transition-all shadow-sm" 
          />
        </div>
        <button 
          onClick={() => { reset({ date: new Date().toISOString().split('T')[0] }); setModal({isOpen: true, data: {}}); }}
          className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all transform hover:-translate-y-0.5 w-full sm:w-auto"
        >
          <Plus size={18} /> New Session
        </button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState 
          icon={CalendarCheck}
          title="No Attendance Sessions"
          description="Create a session to start tracking student attendance for this course."
          className="py-24 border-none shadow-none bg-transparent"
        />
      ) : (
        <div className="space-y-4">
          {sessions.map(sess => (
            <div key={sess.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col sm:flex-row sm:items-center">
              <div className="p-6 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><CalendarCheck size={18}/></div>
                  <h3 className="text-lg font-bold text-gray-900">{new Date(sess.date).toLocaleDateString()}</h3>
                </div>
                <div className="pl-11">
                  <p className="text-sm font-medium text-gray-800">{sess.topic || 'General Session'}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{sess.description}</p>
                </div>
              </div>
              <div className="p-4 sm:p-6 sm:border-l border-t sm:border-t-0 border-gray-100 bg-gray-50/50 flex items-center justify-end gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-4">
                  {sess._count.records > 0 ? `${sess._count.records} Records` : 'No Records Taken'}
                </span>
                <button onClick={() => openTakeAttendance(sess.id)} className="px-5 py-2 bg-primary-600 text-white font-bold text-xs rounded-xl hover:bg-primary-700 transition-colors shadow-sm">
                  {sess._count.records > 0 ? 'Edit Attendance' : 'Take Attendance'}
                </button>
                <button onClick={() => { reset({ ...sess, date: new Date(sess.date).toISOString().split('T')[0] }); setModal({isOpen: true, data: sess}); }} className="p-2 text-gray-500 hover:text-primary-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"><Edit2 size={16}/></button>
                <button onClick={() => setConfirmDialog({isOpen: true, id: sess.id})} className="p-2 text-gray-500 hover:text-red-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal.isOpen} onClose={() => setModal({isOpen: false, data: null})} title={modal.data?.id ? 'Edit Session' : 'Create Session'}>
        <form onSubmit={handleSubmit(handleSaveSession)} className="space-y-5">
          <div>
            <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Date *</label>
            <input type="date" {...register('date')} required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all font-bold text-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Topic (Optional)</label>
            <input {...register('topic')} placeholder="e.g. Midterm Review" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all" />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Notes</label>
            <textarea {...register('description')} rows={3} placeholder="Session notes..." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all resize-none" />
          </div>
          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 mt-8">
            <button type="button" onClick={() => setModal({isOpen: false, data: null})} className="px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md transition-all disabled:opacity-50">
              {isSubmitting ? 'Saving...' : 'Save Session'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({isOpen: false, id: ''})}
        onConfirm={handleDelete}
        title="Delete Session"
        description="Are you sure you want to delete this session? All attendance records inside will be permanently lost."
        confirmText="Delete Session"
        isDestructive={true}
        isLoading={isSubmitting}
      />
    </div>
  );
};
