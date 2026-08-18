import React, { useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { Plus, Edit2, Trash2, Calendar, Search } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

export const AcademicYear = () => {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, id: string}>({isOpen: false, id: ''});
  
  const [formData, setFormData] = useState({ id: '', name: '', startDate: '', endDate: '', status: 'DRAFT' });
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchYears();
  }, []);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchYears = async () => {
    try {
      const res = await api.get('/academic-years');
      setYears(res.data);
    } catch (err) {
      showToast('Failed to fetch academic years', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await api.put(`/academic-years/${formData.id}`, formData);
        showToast('Academic year updated', 'success');
      } else {
        await api.post('/academic-years', formData);
        showToast('Academic year created', 'success');
      }
      closeModal();
      fetchYears();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Operation failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await api.delete(`/academic-years/${confirmDialog.id}`);
      showToast('Academic year deleted', 'success');
      setConfirmDialog({isOpen: false, id: ''});
      fetchYears();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModal = (year?: AcademicYear) => {
    if (year) {
      setIsEditing(true);
      setFormData({
        id: year.id,
        name: year.name,
        startDate: new Date(year.startDate).toISOString().split('T')[0],
        endDate: new Date(year.endDate).toISOString().split('T')[0],
        status: year.status
      });
    } else {
      setIsEditing(false);
      setFormData({ id: '', name: '', startDate: '', endDate: '', status: 'DRAFT' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-200';
      case 'CLOSED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ARCHIVED': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200'; // DRAFT
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 text-white animate-in fade-in slide-in-from-top-4 font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Academic Years</h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">Manage school academic years and semesters</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
        >
          <Plus size={18} /> Add Year
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <SkeletonTable rows={5} cols={5} />
        ) : years.length === 0 ? (
          <EmptyState 
            icon={Calendar} 
            title="No Academic Years" 
            description="You haven't set up any academic years yet."
            className="border-none shadow-none py-20"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/80 text-gray-700 border-b border-gray-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4 font-extrabold">Name</th>
                  <th className="px-6 py-4 font-extrabold">Start Date</th>
                  <th className="px-6 py-4 font-extrabold">End Date</th>
                  <th className="px-6 py-4 font-extrabold">Status</th>
                  <th className="px-6 py-4 font-extrabold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {years.map(year => (
                  <tr key={year.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 font-bold text-gray-900">{year.name}</td>
                    <td className="px-6 py-4 font-medium">{new Date(year.startDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium">{new Date(year.endDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 border rounded-md text-[10px] font-extrabold tracking-wider ${getStatusClass(year.status)}`}>
                        {year.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openModal(year)} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"><Edit2 size={16} /></button>
                      <button onClick={() => setConfirmDialog({isOpen: true, id: year.id})} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1 opacity-0 group-hover:opacity-100 focus:opacity-100"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={isEditing ? 'Edit Academic Year' : 'Add Academic Year'}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">Year Name (e.g. 2026/2027)</label>
            <input 
              type="text" required
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1.5">Start Date</label>
              <input 
                type="date" required
                value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1.5">End Date</label>
              <input 
                type="date" required
                value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">Status</label>
            <select 
              required
              value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all font-medium text-gray-700"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="CLOSED">CLOSED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 mt-8">
            <button 
              type="button" onClick={closeModal}
              className="px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Year')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({isOpen: false, id: ''})}
        onConfirm={handleDelete}
        title="Delete Academic Year"
        description="Are you sure you want to delete this academic year? This action cannot be undone and may affect enrolled students."
        confirmText="Delete"
        isLoading={isSubmitting}
      />
    </div>
  );
};
