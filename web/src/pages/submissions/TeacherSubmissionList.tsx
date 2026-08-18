import React, { useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { Search, Download, Eye, FileText, CheckCircle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { SafeHtml } from '../../components/ui/SafeHtml';

interface TeacherSubmissionListProps {
  assignmentId: string;
  maxScore: number;
}

export const TeacherSubmissionList = ({ assignmentId, maxScore }: TeacherSubmissionListProps) => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  
  const [gradeModal, setGradeModal] = useState<{isOpen: boolean, data: any}>({ isOpen: false, data: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [assignmentId]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/submissions?assignmentId=${assignmentId}`);
      setSubmissions(res.data.data || res.data);
    } catch (err) {
      showToast('Failed to load submissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const form = e.target as HTMLFormElement;
    const finalGrade = form.score.value;
    const feedback = form.feedback.value;

    try {
      await api.put(`/submissions/${gradeModal.data.id}`, { finalGrade, feedback });
      showToast('Grade saved successfully', 'success');
      setGradeModal({ isOpen: false, data: null });
      fetchSubmissions();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save grade', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-extrabold uppercase">Submitted</span>;
      case 'GRADED': return <span className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md text-[10px] font-extrabold uppercase">Graded</span>;
      case 'LATE_SUBMITTED': return <span className="px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-md text-[10px] font-extrabold uppercase">Late</span>;
      default: return <span className="px-2.5 py-1 bg-gray-50 text-gray-700 border border-gray-200 rounded-md text-[10px] font-extrabold uppercase">{status}</span>;
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400 animate-pulse font-medium">Loading submissions...</div>;

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 text-white animate-in fade-in slide-in-from-top-4 font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {submissions.length === 0 ? (
        <EmptyState 
          icon={FileText}
          title="No Submissions Yet"
          description="Students haven't submitted any work for this assignment."
          className="border-none shadow-none py-12"
        />
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 font-extrabold text-gray-700 text-xs uppercase tracking-wider">Student</th>
                <th className="px-5 py-3 font-extrabold text-gray-700 text-xs uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 font-extrabold text-gray-700 text-xs uppercase tracking-wider">Submitted At</th>
                <th className="px-5 py-3 font-extrabold text-gray-700 text-xs uppercase tracking-wider">Score</th>
                <th className="px-5 py-3 font-extrabold text-gray-700 text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {submissions.map(sub => (
                <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-gray-900">{sub.student.fullName}</div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">{sub.student.nis}</div>
                  </td>
                  <td className="px-5 py-4">{getStatusBadge(sub.status)}</td>
                  <td className="px-5 py-4 font-medium text-xs text-gray-500">
                    {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-5 py-4">
                    {sub.finalGrade !== null ? (
                      <span className="font-extrabold text-gray-900">{sub.finalGrade} <span className="text-gray-400 font-medium text-xs">/ {maxScore}</span></span>
                    ) : (
                      <span className="text-gray-400 italic text-xs font-medium">Not graded</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button 
                      onClick={() => setGradeModal({ isOpen: true, data: sub })}
                      className="px-4 py-2 bg-white border border-gray-200 text-primary-600 font-bold text-xs rounded-lg hover:bg-primary-50 transition-colors shadow-sm"
                    >
                      {sub.finalGrade !== null ? 'Edit Grade' : 'Review & Grade'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={gradeModal.isOpen} onClose={() => setGradeModal({isOpen: false, data: null})} title="Review Submission" width="max-w-2xl">
        {gradeModal.data && (
          <form onSubmit={handleSaveGrade} className="flex flex-col h-full">
            <div className="space-y-6 pb-6 border-b border-gray-100 flex-1 overflow-y-auto">
              
              <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center border border-gray-100">
                <div>
                  <h4 className="font-extrabold text-gray-900">{gradeModal.data.student.fullName}</h4>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{gradeModal.data.student.nis}</p>
                </div>
                <div className="text-right">
                  {getStatusBadge(gradeModal.data.status)}
                  <p className="text-xs text-gray-400 mt-1 font-medium">{gradeModal.data.submittedAt ? new Date(gradeModal.data.submittedAt).toLocaleString() : ''}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Student's Work</h4>
                <SafeHtml html={gradeModal.data.activeVersion?.content || '<span class="text-gray-400 italic">No text content provided.</span>'} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm min-h-[100px] text-sm" />
                
                {gradeModal.data.attachmentFile && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FileText size={20}/></div>
                      <div className="overflow-hidden">
                        <span className="font-bold text-sm text-gray-900 block truncate">{gradeModal.data.attachmentFile.originalName}</span>
                        <span className="text-xs text-gray-500 font-medium">{(Number(gradeModal.data.attachmentFile.sizeBytes) / 1024 / 1024).toFixed(2)} MB &bull; {gradeModal.data.attachmentFile.mimeType}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a href={`/storage/${gradeModal.data.attachmentFile.storageKey}`} target="_blank" className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-1"><Eye size={14}/> Preview</a>
                      <a href={`/storage/${gradeModal.data.attachmentFile.storageKey}`} download className="px-3 py-1.5 bg-blue-600 border border-transparent text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1"><Download size={14}/> Download</a>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="md:col-span-1">
                  <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Score (Max: {maxScore}) *</label>
                  <input type="number" name="score" required min={0} max={maxScore} step="0.1" defaultValue={gradeModal.data.finalGrade || ''} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-gray-900 text-lg" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Teacher Feedback</label>
                  <textarea name="feedback" rows={3} defaultValue={gradeModal.data.feedback || ''} placeholder="Great job! But you need to improve on..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none text-sm"></textarea>
                </div>
              </div>

            </div>

            <div className="pt-6 flex justify-end gap-3 mt-auto bg-white">
              <button type="button" onClick={() => setGradeModal({isOpen: false, data: null})} className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2">
                {isSubmitting ? 'Saving...' : <><CheckCircle size={16}/> Save Grade</>}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
