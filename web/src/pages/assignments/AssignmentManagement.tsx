import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../lib/axios';
import { Search, Plus, CheckSquare, Edit2, Trash2, CalendarClock, Paperclip, CheckCircle, Eye, Download, X, AlertCircle, Users } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { RichTextEditor } from '../../components/RichTextEditor';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { Drawer } from '../../components/ui/Drawer';
import { SafeHtml } from '../../components/ui/SafeHtml';

import { TeacherSubmissionList } from '../submissions/TeacherSubmissionList';

interface AssignmentManagementProps {
  courseId: string;
  courseStudents: any[];
}

export const AssignmentManagement = ({ courseId, courseStudents }: AssignmentManagementProps) => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const [modal, setModal] = useState<{isOpen: boolean, data: any}>({ isOpen: false, data: null });
  const [detailDrawer, setDetailDrawer] = useState<{isOpen: boolean, data: any}>({ isOpen: false, data: null });
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, action: () => Promise<void>, title: string, desc: string, isDestructive?: boolean}>({ isOpen: false, action: async () => {}, title: '', desc: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterScope, setFilterScope] = useState('');
  const [sortBy, setSortBy] = useState('dueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const { register, handleSubmit, reset, control, watch, setValue } = useForm();
  const [uploadProgress, setUploadProgress] = useState(0);
  const watchScope = watch('scope', 'COURSE');
  const watchAssignedStudents = watch('assignedStudentIds') || [];
  const watchAttachment = watch('attachmentFile') || null;

  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    fetchAssignments();
  }, [courseId]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/assignments?courseId=${courseId}`);
      setAssignments(res.data.data || res.data);
    } catch (err) {
      showToast('Failed to load assignments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    setIsSubmitting(true);
    const payload = { ...data, courseId };

    try {
      if (modal.data?.id) {
        await api.put(`/assignments/${modal.data.id}`, payload);
        showToast('Assignment updated', 'success');
      } else {
        await api.post('/assignments', payload);
        showToast('Assignment created', 'success');
      }
      setModal({ isOpen: false, data: null });
      fetchAssignments();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Operation failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSubmitting(true);
    try {
      await api.delete(`/assignments/${id}`);
      showToast('Assignment deleted', 'success');
      setConfirmDialog({ ...confirmDialog, isOpen: false });
      if (detailDrawer.isOpen && detailDrawer.data?.id === id) {
        setDetailDrawer({ isOpen: false, data: null });
      }
      fetchAssignments();
    } catch (err) {
      showToast('Delete failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setIsSubmitting(true);
    try {
      await api.put(`/assignments/${id}`, { status: newStatus });
      showToast(`Assignment status changed to ${newStatus}`, 'success');
      setConfirmDialog({ ...confirmDialog, isOpen: false });
      
      if (detailDrawer.isOpen && detailDrawer.data?.id === id) {
        setDetailDrawer({ isOpen: true, data: { ...detailDrawer.data, status: newStatus } });
      }
      fetchAssignments();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to change status', 'error');
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
      setValue('attachmentFile', res.data);
      setValue('attachmentFileId', res.data.id);
      setUploadProgress(0);
    } catch (err) {
      showToast('Upload failed', 'error');
      setUploadProgress(0);
    }
  };

  const handleRemoveAttachment = () => {
    setValue('attachmentFile', null);
    setValue('attachmentFileId', null);
  };

  const openModal = (assignment?: any) => {
    if (assignment) {
      reset({
        ...assignment,
        dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().split('T')[0] : '',
        assignedStudentIds: assignment.assignedStudentIds || [],
        attachmentFile: assignment.attachmentFile || null
      });
      setModal({ isOpen: true, data: assignment });
    } else {
      reset({ status: 'DRAFT', maxScore: 100, scope: 'COURSE', instruction: '', assignedStudentIds: [], attachmentFileId: null, attachmentFile: null });
      setModal({ isOpen: true, data: {} });
    }
  };

  const toggleStudent = (id: string) => {
    const current = watchAssignedStudents;
    if (current.includes(id)) {
      setValue('assignedStudentIds', current.filter((s: string) => s !== id));
    } else {
      setValue('assignedStudentIds', [...current, id]);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!studentSearch) return courseStudents;
    return courseStudents.filter((s: any) => 
      s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.nis.toLowerCase().includes(studentSearch.toLowerCase())
    );
  }, [courseStudents, studentSearch]);

  const filteredAssignments = useMemo(() => {
    let result = [...assignments];
    if (searchTerm) {
      result = result.filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (filterStatus) {
      result = result.filter(a => a.status === filterStatus);
    }
    if (filterScope) {
      result = result.filter(a => a.scope === filterScope);
    }
    result.sort((a, b) => {
      const valA = new Date(sortBy === 'dueDate' ? a.dueDate : a.updatedAt).getTime();
      const valB = new Date(sortBy === 'dueDate' ? b.dueDate : b.updatedAt).getTime();
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
    return result;
  }, [assignments, searchTerm, filterStatus, filterScope, sortBy, sortDir]);

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  if (loading) return <div className="max-w-4xl pt-6"><SkeletonList count={3} /></div>;

  return (
    <div className="max-w-5xl space-y-6 pb-12">
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 text-white animate-in fade-in slide-in-from-top-4 font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" placeholder="Search assignments..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 bg-gray-50 focus:bg-white outline-none transition-all shadow-sm" 
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 outline-none shadow-sm focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all">
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
          <select value={filterScope} onChange={e => setFilterScope(e.target.value)} className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 outline-none shadow-sm focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all">
            <option value="">All Scopes</option>
            <option value="COURSE">Course (All Students)</option>
            <option value="INDIVIDUAL">Individual</option>
          </select>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all transform hover:-translate-y-0.5 w-full md:w-auto"
        >
          <Plus size={18} /> Create Assignment
        </button>
      </div>

      {/* Sorting */}
      <div className="flex justify-end gap-4 px-2">
        <button onClick={() => toggleSort('dueDate')} className={`text-[11px] font-extrabold uppercase tracking-wider ${sortBy === 'dueDate' ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'} transition-colors`}>
          Sort by Due Date {sortBy === 'dueDate' && (sortDir === 'asc' ? '↑' : '↓')}
        </button>
        <button onClick={() => toggleSort('updatedAt')} className={`text-[11px] font-extrabold uppercase tracking-wider ${sortBy === 'updatedAt' ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'} transition-colors`}>
          Sort by Updated {sortBy === 'updatedAt' && (sortDir === 'asc' ? '↑' : '↓')}
        </button>
      </div>

      {/* List */}
      {filteredAssignments.length === 0 ? (
        <EmptyState 
          icon={CheckSquare}
          title="No Assignments Found"
          description={searchTerm || filterStatus || filterScope ? "Adjust your filters to see more assignments." : "Create your first assignment to evaluate your students."}
          className="py-24 border-none shadow-none bg-transparent"
        />
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map(ass => (
            <div 
              key={ass.id} 
              onClick={() => setDetailDrawer({ isOpen: true, data: ass })}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md hover:border-primary-200 transition-all group flex flex-col sm:flex-row sm:items-center cursor-pointer transform hover:-translate-y-0.5"
            >
              <div className="p-6 flex-1 relative">
                <div className="flex items-center gap-3 mb-2 pr-12">
                  <h3 className="text-lg font-extrabold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1">{ass.title}</h3>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${
                    ass.status === 'OPEN' || ass.status === 'PUBLISHED' ? 'bg-green-50 text-green-700 border-green-200' : 
                    ass.status === 'DRAFT' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                    'bg-gray-50 text-gray-700 border-gray-200'
                  }`}>
                    {ass.status}
                  </span>
                  {ass.scope === 'INDIVIDUAL' && (
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                      Individual
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-gray-500">
                  <span className={`flex items-center gap-1.5 ${new Date(ass.dueDate) < new Date() ? 'text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100' : 'bg-gray-50 px-2 py-1 rounded-md border border-gray-100'}`}>
                    <CalendarClock size={14} className={new Date(ass.dueDate) < new Date() ? 'text-red-500' : 'text-gray-400'}/> Due: {new Date(ass.dueDate).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100"><CheckCircle size={14} className="text-gray-400"/> Max Score: {ass.maxScore}</span>
                  {ass.attachmentFileId && <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100"><Paperclip size={14}/> 1 Attachment</span>}
                </div>
              </div>
              <div className="p-4 sm:p-6 sm:border-l border-t sm:border-t-0 border-gray-100 bg-gray-50/50 flex items-center justify-end gap-2">
                {ass.status === 'DRAFT' && (
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDialog({isOpen: true, title: 'Publish Assignment', desc: 'Are you sure?', isDestructive: false, action: async () => handleStatusChange(ass.id, 'PUBLISHED')}); }} className="px-4 py-2 bg-white text-green-700 font-bold text-xs rounded-lg hover:bg-green-50 transition-colors border border-green-200 shadow-sm">
                    Publish
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); openModal(ass); }} className="p-2 text-gray-500 hover:text-primary-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><Edit2 size={16}/></button>
                <button onClick={(e) => { e.stopPropagation(); setConfirmDialog({isOpen: true, title: 'Delete', desc: 'Are you sure?', isDestructive: true, action: async () => handleDelete(ass.id)}); }} className="p-2 text-gray-500 hover:text-red-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assignment Detail Drawer */}
      <Drawer 
        isOpen={detailDrawer.isOpen} 
        onClose={() => setDetailDrawer({isOpen: false, data: null})} 
        title="Assignment Details" 
        width="w-full sm:w-[600px] lg:w-[800px]"
      >
        {detailDrawer.data && (
          <div className="space-y-8 pb-4">
            <div className="flex justify-between items-start bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 mb-3">{detailDrawer.data.title}</h2>
                <div className="flex gap-3 text-sm font-semibold text-gray-500">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${
                    detailDrawer.data.status === 'OPEN' || detailDrawer.data.status === 'PUBLISHED' ? 'bg-green-50 text-green-700 border-green-200' : 
                    detailDrawer.data.status === 'DRAFT' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                    'bg-gray-50 text-gray-700 border-gray-200'
                  }`}>
                    {detailDrawer.data.status}
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                    {detailDrawer.data.scope === 'COURSE' ? 'All Students' : 'Individual'}
                  </span>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1">Due Date</div>
                <div className={`text-sm font-bold px-3 py-1.5 rounded-lg border ${new Date(detailDrawer.data.dueDate) < new Date() ? 'text-red-700 bg-red-50 border-red-200' : 'text-gray-900 bg-gray-50 border-gray-200'}`}>
                  {new Date(detailDrawer.data.dueDate).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm text-center">
                <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Max Score</div>
                <div className="text-xl font-black text-gray-900">{detailDrawer.data.maxScore} pts</div>
              </div>
              <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm text-center">
                <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Created At</div>
                <div className="text-sm font-bold text-gray-900 mt-1">{new Date(detailDrawer.data.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm text-center">
                <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Last Updated</div>
                <div className="text-sm font-bold text-gray-900 mt-1">{new Date(detailDrawer.data.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-3">Instructions</h3>
              <SafeHtml html={detailDrawer.data.instruction || '<p class="text-gray-400 italic">No instructions provided.</p>'} className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm text-sm" />
            </div>

            {detailDrawer.data.attachmentFile && (
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-3">Attachment</h3>
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-2xl shadow-sm gap-4">
                  <div className="flex items-center gap-4 w-full">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl flex-shrink-0"><Paperclip size={24}/></div>
                    <div className="overflow-hidden">
                      <div className="text-sm font-bold text-gray-900 truncate">{detailDrawer.data.attachmentFile.originalName}</div>
                      <div className="text-xs font-semibold text-gray-500 mt-0.5">{(Number(detailDrawer.data.attachmentFile.sizeBytes) / 1024 / 1024).toFixed(2)} MB &bull; {detailDrawer.data.attachmentFile.mimeType}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <a href={`/storage/${detailDrawer.data.attachmentFile.storageKey}`} target="_blank" className="flex-1 sm:flex-none justify-center px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors"><Eye size={16}/> View</a>
                    <a href={`/storage/${detailDrawer.data.attachmentFile.storageKey}`} download className="flex-1 sm:flex-none justify-center px-4 py-2 bg-blue-600 border border-transparent rounded-xl text-xs font-bold text-white hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors"><Download size={16}/> Download</a>
                  </div>
                </div>
              </div>
            )}

            {detailDrawer.data.scope === 'INDIVIDUAL' && (
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2"><Users size={16} className="text-gray-400"/> Assigned Students</h3>
                <div className="flex flex-wrap gap-2 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                  {detailDrawer.data.assignedStudentIds?.map((id: string) => {
                    const student = courseStudents.find(s => s.id === id);
                    return student ? (
                      <span key={id} className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-900 text-xs font-bold rounded-lg shadow-sm flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[8px]">{student.fullName.charAt(0)}</div>
                        {student.fullName}
                      </span>
                    ) : null;
                  })}
                  {(!detailDrawer.data.assignedStudentIds || detailDrawer.data.assignedStudentIds.length === 0) && (
                    <span className="text-sm text-gray-400 italic">No students assigned.</span>
                  )}
                </div>
              </div>
            )}

            <div className="mt-8 border-t border-gray-100 pt-8">
              <h3 className="text-lg font-extrabold text-gray-900 mb-6">Student Submissions</h3>
              <TeacherSubmissionList assignmentId={detailDrawer.data.id} maxScore={detailDrawer.data.maxScore} />
            </div>

            <div className="sticky bottom-0 bg-gray-50/90 backdrop-blur-md pt-6 border-t border-gray-200 flex justify-between gap-3 mt-8">
              <button 
                onClick={() => setConfirmDialog({
                  isOpen: true, title: 'Delete Assignment', desc: 'Are you sure you want to delete this assignment? All associated data will be lost.', isDestructive: true,
                  action: async () => handleDelete(detailDrawer.data.id)
                })} 
                className="px-6 py-2.5 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl transition-colors flex items-center gap-2"
              >
                <Trash2 size={16}/> Delete
              </button>

              <div className="flex gap-3">
                {detailDrawer.data.status === 'DRAFT' && (
                  <button 
                    onClick={() => setConfirmDialog({
                      isOpen: true, title: 'Publish Assignment', desc: 'Publishing will make this assignment visible to all assigned students immediately. Are you sure you are ready to publish?', isDestructive: false,
                      action: async () => handleStatusChange(detailDrawer.data.id, 'PUBLISHED')
                    })} 
                    className="px-6 py-2.5 text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-colors shadow-sm"
                  >
                    Publish
                  </button>
                )}
                {detailDrawer.data.status === 'PUBLISHED' && (
                  <button 
                    onClick={() => setConfirmDialog({
                      isOpen: true, title: 'Close Assignment', desc: 'Closing this assignment will prevent students from submitting further works. Proceed?', isDestructive: false,
                      action: async () => handleStatusChange(detailDrawer.data.id, 'CLOSED')
                    })} 
                    className="px-6 py-2.5 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors shadow-sm"
                  >
                    Close Assignment
                  </button>
                )}
                <button onClick={() => { setDetailDrawer({...detailDrawer, isOpen: false}); openModal(detailDrawer.data); }} className="px-6 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-md flex items-center gap-2 transform hover:-translate-y-0.5"><Edit2 size={16}/> Edit</button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Create/Edit Form Modal */}
      <Modal isOpen={modal.isOpen} onClose={() => setModal({isOpen: false, data: null})} title={modal.data?.id ? 'Edit Assignment' : 'Create Assignment'} width="max-w-4xl">
        <form onSubmit={handleSubmit(handleSave)} className="space-y-6 pb-4">
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Assignment Title *</label>
              <input {...register('title')} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none text-gray-900 font-bold" placeholder="e.g. Midterm Physics Project" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Due Date *</label>
                <input type="date" {...register('dueDate')} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none font-bold text-gray-900" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Max Score</label>
                <input type="number" {...register('maxScore')} required min={0} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none font-bold text-gray-900" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Status</label>
                <select {...register('status')} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none font-extrabold text-gray-700">
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="OPEN">OPEN</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
            </div>

            <div className="bg-white p-6 border border-gray-200 rounded-2xl shadow-sm">
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-4">Assignment Scope</label>
              <div className="flex gap-6 mb-5">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 cursor-pointer">
                  <input type="radio" value="COURSE" {...register('scope')} className="w-4 h-4 text-primary-600 focus:ring-primary-500" />
                  All Students (Course)
                </label>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 cursor-pointer">
                  <input type="radio" value="INDIVIDUAL" {...register('scope')} className="w-4 h-4 text-primary-600 focus:ring-primary-500" />
                  Specific Students
                </label>
              </div>
              
              {watchScope === 'INDIVIDUAL' && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mt-2 animate-in fade-in slide-in-from-top-2">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" placeholder="Search to add students..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-sm font-medium border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-shadow bg-white" />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 border border-gray-200 rounded-lg p-2 bg-white shadow-inner">
                    {filteredStudents.length === 0 ? (
                      <div className="text-center text-xs font-medium text-gray-400 py-6">No students found matching your search.</div>
                    ) : (
                      filteredStudents.map((s: any) => {
                        const isSelected = watchAssignedStudents.includes(s.id);
                        return (
                          <div key={s.id} onClick={() => toggleStudent(s.id)} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border ${isSelected ? 'bg-primary-50 border-primary-200' : 'bg-white border-transparent hover:bg-gray-50'}`}>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-primary-600 border-primary-600 text-white shadow-sm' : 'border-gray-300 bg-white'}`}>
                              {isSelected && <CheckCircle size={14} strokeWidth={3} />}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-[10px] font-extrabold text-gray-700 flex-shrink-0 shadow-sm border border-white">{s.fullName.charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-gray-900 truncate">{s.fullName}</div>
                              <div className="text-[10px] font-medium text-gray-500 truncate">{s.nis}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="mt-4 text-xs font-extrabold text-primary-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={14}/> Selected: {watchAssignedStudents.length} student(s)
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Instructions *</label>
              <div className="border border-gray-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-shadow shadow-sm">
                <Controller
                  name="instruction"
                  control={control}
                  defaultValue=""
                  rules={{ required: true }}
                  render={({ field }) => (
                    <RichTextEditor content={field.value} onChange={field.onChange} />
                  )}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Attachment</label>
              
              {watchAttachment ? (
                <div className="flex flex-col sm:flex-row items-center justify-between p-5 bg-blue-50 border border-blue-200 rounded-2xl shadow-sm gap-4">
                  <div className="flex items-center gap-4 w-full truncate">
                    <div className="p-3 bg-white text-blue-600 rounded-xl flex-shrink-0 shadow-sm border border-blue-100"><Paperclip size={24}/></div>
                    <div className="truncate">
                      <div className="text-sm font-extrabold text-gray-900 truncate">{watchAttachment.originalName || watchAttachment.title}</div>
                      <div className="text-xs font-medium text-gray-500 mt-1">{(Number(watchAttachment.sizeBytes || 0) / 1024 / 1024).toFixed(2)} MB &bull; {watchAttachment.mimeType}</div>
                    </div>
                  </div>
                  <button type="button" onClick={handleRemoveAttachment} className="px-4 py-2 bg-white text-red-600 font-bold text-xs rounded-xl border border-red-100 hover:bg-red-50 transition-colors flex-shrink-0 shadow-sm">
                    Remove File
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center bg-gray-50/50 hover:bg-gray-50 transition-colors group relative overflow-hidden">
                  <input type="file" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" id="file-upload-ass" />
                  <div className="flex flex-col items-center pointer-events-none">
                    <div className="w-14 h-14 bg-white shadow-sm border border-gray-200 text-primary-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Paperclip size={24} />
                    </div>
                    <span className="text-sm font-extrabold text-gray-900">Click or drag file to upload</span>
                    <span className="text-xs font-medium text-gray-500 mt-2">Supports PDF, DOCX, Images, Video (Max 100MB)</span>
                  </div>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-6 overflow-hidden">
                      <div className="bg-primary-600 h-full rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  )}
                </div>
              )}
              <input type="hidden" {...register('attachmentFileId')} />
            </div>

          </div>
          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 mt-8 bg-gray-50/80 -mx-6 -mb-6 p-6 rounded-b-2xl">
            <button type="button" onClick={() => setModal({isOpen: false, data: null})} className="px-6 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-200 bg-gray-100 border border-gray-200 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md transition-all disabled:opacity-50 transform hover:-translate-y-0.5">
              {isSubmitting ? 'Saving...' : 'Save Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({...confirmDialog, isOpen: false})}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        description={confirmDialog.desc}
        confirmText="Confirm"
        isDestructive={confirmDialog.isDestructive}
        isLoading={isSubmitting}
      />
    </div>
  );
};