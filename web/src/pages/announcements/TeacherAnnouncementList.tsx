import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../lib/axios';
import { Search, Plus, Megaphone, Edit2, Trash2, Paperclip, Eye, Download, CheckCircle, Clock, Archive } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { RichTextEditor } from '../../components/RichTextEditor';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { SafeHtml } from '../../components/ui/SafeHtml';

export const TeacherAnnouncementList = ({ courseId }: { courseId: string }) => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const [modal, setModal] = useState<{isOpen: boolean, data: any}>({ isOpen: false, data: null });
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, action: () => Promise<void>, title: string, desc: string, isDestructive?: boolean}>({ isOpen: false, action: async () => {}, title: '', desc: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { register, handleSubmit, reset, control, watch, setValue } = useForm();
  const [uploadProgress, setUploadProgress] = useState(0);
  const watchAttachment = watch('attachmentFile') || null;

  useEffect(() => {
    fetchAnnouncements();
  }, [courseId]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/announcements?courseId=${courseId}`);
      setAnnouncements(res.data);
    } catch (err) {
      showToast('Failed to load announcements', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    setIsSubmitting(true);
    const payload = { ...data, courseId };

    try {
      if (modal.data?.id) {
        await api.put(`/announcements/${modal.data.id}`, payload);
        showToast('Announcement updated', 'success');
      } else {
        await api.post('/announcements', payload);
        showToast('Announcement created', 'success');
      }
      setModal({ isOpen: false, data: null });
      fetchAnnouncements();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Operation failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSubmitting(true);
    try {
      await api.delete(`/announcements/${id}`);
      showToast('Announcement deleted', 'success');
      setConfirmDialog({ ...confirmDialog, isOpen: false });
      fetchAnnouncements();
    } catch (err) {
      showToast('Delete failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setIsSubmitting(true);
    try {
      if (newStatus === 'PUBLISHED') {
        await api.post(`/announcements/${id}/publish`);
      } else {
        await api.put(`/announcements/${id}`, { status: newStatus });
      }
      showToast(`Status changed to ${newStatus}`, 'success');
      setConfirmDialog({ ...confirmDialog, isOpen: false });
      fetchAnnouncements();
    } catch (err) {
      showToast('Failed to change status', 'error');
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

  const openModal = (announcement?: any) => {
    if (announcement) {
      reset({
        ...announcement,
        attachmentFile: announcement.attachmentFile || null
      });
      setModal({ isOpen: true, data: announcement });
    } else {
      reset({ status: 'DRAFT', title: '', content: '', attachmentFileId: null, attachmentFile: null });
      setModal({ isOpen: true, data: {} });
    }
  };

  const filteredAnnouncements = useMemo(() => {
    let result = [...announcements];
    if (searchTerm) {
      result = result.filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (filterStatus) {
      result = result.filter(a => a.status === filterStatus);
    }
    return result;
  }, [announcements, searchTerm, filterStatus]);

  if (loading) return <div className="max-w-4xl pt-6"><SkeletonList count={3} /></div>;

  return (
    <div className="max-w-4xl space-y-6 pb-12 mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 text-white animate-in fade-in slide-in-from-top-4 font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" placeholder="Search announcements..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 bg-gray-50 focus:bg-white outline-none transition-all shadow-sm" 
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 outline-none shadow-sm focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all font-semibold text-gray-700">
            <option value="">All Status</option>
            <option value="DRAFT">Drafts</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all transform hover:-translate-y-0.5 w-full sm:w-auto"
        >
          <Plus size={18} /> New Announcement
        </button>
      </div>

      {filteredAnnouncements.length === 0 ? (
        <EmptyState 
          icon={Megaphone}
          title="No Announcements"
          description={searchTerm || filterStatus ? "No announcements match your filters." : "You haven't posted any announcements for this course yet."}
          className="py-20 border-none shadow-none bg-transparent"
        />
      ) : (
        <div className="space-y-6">
          {filteredAnnouncements.map(ann => (
            <div key={ann.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors pr-4">{ann.title}</h3>
                  <div className="flex gap-2 flex-shrink-0">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border flex items-center gap-1 ${
                      ann.status === 'PUBLISHED' ? 'bg-green-50 text-green-700 border-green-200' : 
                      ann.status === 'ARCHIVED' ? 'bg-gray-100 text-gray-700 border-gray-300' :
                      'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                      {ann.status === 'PUBLISHED' && <CheckCircle size={10} />}
                      {ann.status === 'ARCHIVED' && <Archive size={10} />}
                      {ann.status === 'DRAFT' && <Clock size={10} />}
                      {ann.status}
                    </span>
                  </div>
                </div>
                
                <SafeHtml html={ann.content} className="text-sm text-gray-700 line-clamp-3 mb-4" />

                {ann.attachmentFile && (
                  <div className="inline-flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Paperclip size={16}/></div>
                    <div className="truncate max-w-[200px] sm:max-w-xs">
                      <div className="text-xs font-bold text-gray-900 truncate">{ann.attachmentFile.originalName}</div>
                      <div className="text-[10px] font-medium text-gray-500">{(Number(ann.attachmentFile.sizeBytes) / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <div className="text-xs font-semibold text-gray-500">
                  {ann.status === 'PUBLISHED' && ann.publishedAt 
                    ? `Published on ${new Date(ann.publishedAt).toLocaleString()}` 
                    : `Last updated ${new Date(ann.updatedAt).toLocaleString()}`}
                </div>
                <div className="flex items-center gap-2">
                  {ann.status === 'DRAFT' && (
                    <button onClick={() => setConfirmDialog({isOpen: true, title: 'Publish', desc: 'Publishing will make this visible to all students immediately.', isDestructive: false, action: () => handleStatusChange(ann.id, 'PUBLISHED')})} className="px-4 py-1.5 bg-white text-green-700 font-bold text-xs rounded-lg hover:bg-green-50 transition-colors border border-green-200 shadow-sm">
                      Publish
                    </button>
                  )}
                  {ann.status === 'PUBLISHED' && (
                    <button onClick={() => setConfirmDialog({isOpen: true, title: 'Archive', desc: 'Archiving will hide this from students.', isDestructive: false, action: () => handleStatusChange(ann.id, 'ARCHIVED')})} className="px-4 py-1.5 bg-white text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-100 transition-colors border border-gray-300 shadow-sm">
                      Archive
                    </button>
                  )}
                  <button onClick={() => openModal(ann)} className="p-1.5 text-gray-500 hover:text-primary-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><Edit2 size={14}/></button>
                  <button onClick={() => setConfirmDialog({isOpen: true, title: 'Delete Announcement', desc: 'Are you sure you want to delete this announcement permanently?', isDestructive: true, action: () => handleDelete(ann.id)})} className="p-1.5 text-gray-500 hover:text-red-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><Trash2 size={14}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      <Modal isOpen={modal.isOpen} onClose={() => setModal({isOpen: false, data: null})} title={modal.data?.id ? 'Edit Announcement' : 'New Announcement'} width="max-w-3xl">
        <form onSubmit={handleSubmit(handleSave)} className="space-y-6 pb-4">
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Title *</label>
              <input {...register('title')} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none text-gray-900 font-bold" placeholder="E.g. Important Info for Next Week" />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Message *</label>
              <div className="border border-gray-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 transition-shadow shadow-sm bg-white">
                <Controller
                  name="content"
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
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Attachment (Optional)</label>
              {watchAttachment ? (
                <div className="flex flex-col sm:flex-row items-center justify-between p-5 bg-blue-50 border border-blue-200 rounded-2xl shadow-sm gap-4">
                  <div className="flex items-center gap-4 w-full truncate">
                    <div className="p-3 bg-white text-blue-600 rounded-xl flex-shrink-0 shadow-sm border border-blue-100"><Paperclip size={24}/></div>
                    <div className="truncate">
                      <div className="text-sm font-extrabold text-gray-900 truncate">{watchAttachment.originalName || watchAttachment.title}</div>
                      <div className="text-xs font-medium text-gray-500 mt-1">{(Number(watchAttachment.sizeBytes || 0) / 1024 / 1024).toFixed(2)} MB &bull; {watchAttachment.mimeType}</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => { setValue('attachmentFileId', null); setValue('attachmentFile', null); }} className="px-4 py-2 bg-white text-red-600 font-bold text-xs rounded-xl border border-red-100 hover:bg-red-50 transition-colors flex-shrink-0 shadow-sm">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center bg-gray-50/50 hover:bg-gray-50 transition-colors group relative overflow-hidden">
                  <input type="file" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className="flex flex-col items-center pointer-events-none">
                    <div className="w-14 h-14 bg-white shadow-sm border border-gray-200 text-primary-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Paperclip size={24} />
                    </div>
                    <span className="text-sm font-extrabold text-gray-900">Click or drag file to attach</span>
                    <span className="text-xs font-medium text-gray-500 mt-2">Max 100MB</span>
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

            <div>
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Initial Status</label>
              <select {...register('status')} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none font-bold text-gray-700">
                <option value="DRAFT">DRAFT (Save for later)</option>
                <option value="PUBLISHED">PUBLISHED (Visible immediately)</option>
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 mt-8 bg-gray-50/80 -mx-6 -mb-6 p-6 rounded-b-2xl">
            <button type="button" onClick={() => setModal({isOpen: false, data: null})} className="px-6 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-200 bg-gray-100 border border-gray-200 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md transition-all disabled:opacity-50 transform hover:-translate-y-0.5">
              {isSubmitting ? 'Saving...' : 'Save Announcement'}
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
