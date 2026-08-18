import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/axios';
import { CheckSquare, Paperclip, Send, Clock, CheckCircle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { SafeHtml } from '../../components/ui/SafeHtml';
import { StudentPageHeader } from '../../components/ui/StudentPageHeader';
import { BackButton } from '../../components/ui/BackButton';

export const StudentAssignmentList = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const [modal, setModal] = useState<{isOpen: boolean, data: any}>({ isOpen: false, data: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [content, setContent] = useState('');
  const [attachmentFileId, setAttachmentFileId] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<any>(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (courseId) params.courseId = courseId;
      const res = await api.get('/assignments', { params });
      const subRes = await api.get(`/submissions?studentId=ME`);
      const submissions = subRes.data?.data || [];

      const mapped = (res.data?.data || []).map((ass: any) => ({
        ...ass,
        mySubmission: submissions.find((s: any) => s.assignmentId === ass.id) || null
      }));

      setAssignments(mapped);
    } catch (err) {
      showToast('Failed to load assignments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/submissions', {
        assignmentId: modal.data.id,
        content,
        attachmentFileId
      });
      showToast('Assignment submitted successfully', 'success');
      setModal({ isOpen: false, data: null });
      fetchAssignments();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Submit failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/learning/assets', formData, {
        onUploadProgress: (evt) => {
          setUploadProgress(Math.round((evt.loaded * 100) / evt.total!));
        }
      });
      showToast('File uploaded', 'success');
      setAttachmentFileId(res.data.id);
      setAttachmentFile(res.data);
      setUploadProgress(0);
    } catch (err) {
      showToast('Upload failed', 'error');
      setUploadProgress(0);
    }
  };

  const openModal = (assignment: any) => {
    setContent(assignment.mySubmission?.activeVersion?.content || '');
    setAttachmentFileId(assignment.mySubmission?.attachmentFileId || null);
    setAttachmentFile(assignment.mySubmission?.attachmentFile || null);
    setModal({ isOpen: true, data: assignment });
  };

  if (loading) return <div className="max-w-5xl mx-auto"><SkeletonList count={4} /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 text-white font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <BackButton to={courseId ? `/dashboard/student/courses/${courseId}` : '/dashboard/student/courses'} label={courseId ? 'Back to Course' : 'Back to My Courses'} />

      <StudentPageHeader icon={CheckSquare} title="Assignments" description={courseId ? 'View and submit assignments for this course' : 'View and submit your course assignments'} />

      {assignments.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No Assignments"
          description="You have no pending assignments at the moment."
          className="py-20"
        />
      ) : (
        <div className="space-y-3">
          {assignments.map(ass => {
            const hasGrade = ass.mySubmission?.finalGrade !== null && ass.mySubmission?.finalGrade !== undefined;
            return (
              <div key={ass.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 md:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{ass.title}</h3>
                      {ass.mySubmission ? (
                        <span className="shrink-0 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                          <CheckCircle size={12} /> {ass.mySubmission.status}
                        </span>
                      ) : (
                        <span className="shrink-0 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-yellow-50 text-yellow-700 border border-yellow-200">
                          PENDING
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`text-xs font-semibold text-gray-500 flex items-center gap-1.5 mt-1.5 ${new Date(ass.dueDate) < new Date() ? 'text-red-500' : ''}`}>
                    <Clock size={13} /> Due: {new Date(ass.dueDate).toLocaleString()}
                  </div>

                  {hasGrade ? (
                    <div className="mt-3 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Score</span>
                      <span className="text-xl font-black text-gray-900">{ass.mySubmission.finalGrade} <span className="text-sm text-gray-400">/ {ass.maxScore}</span></span>
                    </div>
                  ) : (
                    <button
                      onClick={() => openModal(ass)}
                      className="mt-3 w-full md:w-auto px-5 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md transition-colors active:scale-[0.98]"
                    >
                      {ass.mySubmission ? 'Edit Submission' : 'Submit Work'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modal.isOpen} onClose={() => setModal({isOpen: false, data: null})} title="Submit Assignment" width="max-w-3xl">
        {modal.data && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-gray-50 p-4 md:p-5 rounded-2xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-2">{modal.data.title}</h3>
              <SafeHtml html={modal.data.instruction} className="text-sm text-gray-700 mb-4" />
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-gray-500">
                <span>Due: {new Date(modal.data.dueDate).toLocaleString()}</span>
                <span>Max Score: {modal.data.maxScore}</span>
              </div>
            </div>

            {modal.data.mySubmission?.feedback && (
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
                <h4 className="text-xs font-extrabold text-blue-700 uppercase tracking-wider mb-2">Teacher Feedback</h4>
                <p className="text-sm text-blue-900">{modal.data.mySubmission.feedback}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Your Answer / Comments</label>
              <textarea
                rows={5} required
                value={content} onChange={e => setContent(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none shadow-sm"
                placeholder="Type your answer or leave a comment for the teacher here..."
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Attachment (Optional)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-5 text-center bg-gray-50/50">
                {attachmentFileId ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg flex-shrink-0"><Paperclip size={20} /></div>
                      <div className="text-sm font-bold text-gray-900 truncate text-left">
                        {attachmentFile?.originalName || 'File Attached'}
                        <div className="text-xs font-medium text-gray-500">File is ready for submission</div>
                      </div>
                    </div>
                    <button type="button" onClick={() => { setAttachmentFileId(null); setAttachmentFile(null); }} className="text-red-500 hover:text-red-700 text-xs font-bold px-3 py-1.5 bg-red-50 rounded-lg">Remove</button>
                  </div>
                ) : (
                  <>
                    <input type="file" onChange={handleFileUpload} className="hidden" id="student-upload" />
                    <label htmlFor="student-upload" className="cursor-pointer flex flex-col items-center">
                      <div className="w-12 h-12 bg-white shadow-sm border border-gray-200 text-primary-500 rounded-full flex items-center justify-center mb-3">
                        <Paperclip size={20} />
                      </div>
                      <span className="text-sm font-bold text-gray-900">Upload your work</span>
                    </label>
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-4 overflow-hidden">
                        <div className="bg-primary-600 h-full rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="pt-5 border-t border-gray-100 flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setModal({isOpen: false, data: null})} className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2">
                {isSubmitting ? 'Submitting...' : <><Send size={16} /> Turn In</>}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};