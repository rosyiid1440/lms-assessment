import React, { useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

const teacherSchema = z.object({
  id: z.string().optional(),
  nip: z.string().min(1, 'NIP is required'),
  nuptk: z.string().optional(),
  fullName: z.string().min(1, 'Full name is required'),
  gender: z.enum(['MALE', 'FEMALE']),
  birthPlace: z.string().optional(),
  birthDate: z.string().optional(),
  religion: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  specialization: z.string().optional(),
  status: z.string()
});

type TeacherForm = z.infer<typeof teacherSchema>;

export const TeacherManagement = () => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, id: string}>({isOpen: false, id: ''});

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('fullName');
  const [sortDir, setSortDir] = useState('asc');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TeacherForm>({
    resolver: zodResolver(teacherSchema),
    defaultValues: { status: 'ACTIVE', gender: 'MALE' }
  });

  useEffect(() => {
    fetchTeachers();
  }, [meta.page, searchTerm, filterStatus, sortBy, sortDir]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: meta.page.toString(),
        limit: meta.limit.toString(),
        sortBy,
        sortDir,
        ...(searchTerm && { q: searchTerm }),
        ...(filterStatus && { status: filterStatus }),
      });
      const res = await api.get(`/teachers?${params.toString()}`);
      setTeachers(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      showToast('Failed to fetch teachers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: TeacherForm) => {
    try {
      if (isEditing) {
        await api.put(`/teachers/${data.id}`, data);
        showToast('Teacher updated successfully', 'success');
      } else {
        await api.post('/teachers', data);
        showToast('Teacher created successfully', 'success');
      }
      closeModal();
      fetchTeachers();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Operation failed', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/teachers/${confirmDialog.id}`);
      showToast('Teacher deleted successfully', 'success');
      setConfirmDialog({isOpen: false, id: ''});
      fetchTeachers();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete', 'error');
    }
  };

  const openModal = (teacher?: any) => {
    if (teacher) {
      setIsEditing(true);
      reset({
        id: teacher.id,
        nip: teacher.nip,
        nuptk: teacher.nuptk || '',
        fullName: teacher.fullName,
        gender: teacher.gender,
        birthPlace: teacher.birthPlace || '',
        birthDate: teacher.birthDate ? new Date(teacher.birthDate).toISOString().split('T')[0] : '',
        religion: teacher.religion || '',
        address: teacher.address || '',
        phone: teacher.phone || '',
        email: teacher.user?.email || '',
        specialization: teacher.specialization || '',
        status: teacher.user?.status || 'ACTIVE',
      });
    } else {
      setIsEditing(false);
      reset({ status: 'ACTIVE', gender: 'MALE' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    reset();
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded shadow-lg z-50 text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Teacher Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage teacher records and profiles</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Teacher
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" placeholder="Search NIP / Name..." value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setMeta({...meta, page: 1}); }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary-500"
            />
          </div>
          <select 
            value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setMeta({...meta, page: 1}); }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary-500"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-semibold cursor-pointer" onClick={() => handleSort('nip')}>
                  NIP / NUPTK {sortBy === 'nip' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 font-semibold cursor-pointer" onClick={() => handleSort('fullName')}>
                  Teacher Name {sortBy === 'fullName' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 font-semibold">Specialization</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div></td></tr>
              ) : teachers.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No teachers found</td></tr>
              ) : (
                teachers.map(teacher => (
                  <tr key={teacher.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{teacher.nip}</div>
                      <div className="text-xs text-gray-500">{teacher.nuptk || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{teacher.fullName}</div>
                      <div className="text-xs text-gray-500">{teacher.gender}</div>
                    </td>
                    <td className="px-6 py-4">{teacher.specialization || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        teacher.user?.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {teacher.user?.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openModal(teacher)} className="text-gray-400 hover:text-gray-600 p-1"><Edit2 size={16} /></button>
                      <button onClick={() => setConfirmDialog({isOpen: true, id: teacher.id})} className="text-gray-400 hover:text-red-600 p-1 ml-2"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium">{(meta.page - 1) * meta.limit + 1}</span> to <span className="font-medium">{Math.min(meta.page * meta.limit, meta.total)}</span> of <span className="font-medium">{meta.total}</span> teachers
          </div>
          <div className="flex gap-2">
            <button disabled={meta.page === 1} onClick={() => setMeta({...meta, page: meta.page - 1})} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Previous</button>
            <button disabled={meta.page === meta.totalPages} onClick={() => setMeta({...meta, page: meta.page + 1})} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({isOpen: false, id: ''})}
        onConfirm={handleDelete}
        title="Delete Teacher"
        description="Are you sure you want to delete this teacher? This action cannot be undone."
        confirmText="Delete"
      />
      
      <Modal isOpen={isModalOpen} onClose={closeModal} title={isEditing ? 'Edit Teacher' : 'Add New Teacher'} width="max-w-3xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 border-b pb-2">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">NIP *</label>
                      <input {...register('nip')} className="w-full px-3 py-2 border rounded-md focus:ring-primary-500" />
                      {errors.nip && <p className="text-red-500 text-xs mt-1">{errors.nip.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">NUPTK</label>
                      <input {...register('nuptk')} className="w-full px-3 py-2 border rounded-md focus:ring-primary-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                    <input {...register('fullName')} className="w-full px-3 py-2 border rounded-md focus:ring-primary-500" />
                    {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                      <select {...register('gender')} className="w-full px-3 py-2 border rounded-md focus:ring-primary-500">
                        <option value="MALE">Laki-laki</option>
                        <option value="FEMALE">Perempuan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Religion</label>
                      <input {...register('religion')} className="w-full px-3 py-2 border rounded-md focus:ring-primary-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Birth Place</label>
                      <input {...register('birthPlace')} className="w-full px-3 py-2 border rounded-md focus:ring-primary-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Birth Date</label>
                      <input type="date" {...register('birthDate')} className="w-full px-3 py-2 border rounded-md focus:ring-primary-500" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 border-b pb-2">Academic & Contact</h4>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Specialization / Subject</label>
                    <input {...register('specialization')} placeholder="e.g. Mathematics, Physics" className="w-full px-3 py-2 border rounded-md focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select {...register('status')} className="w-full px-3 py-2 border rounded-md focus:ring-primary-500">
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email (Optional)</label>
                    <input type="email" {...register('email')} className="w-full px-3 py-2 border rounded-md focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                    <input {...register('phone')} className="w-full px-3 py-2 border rounded-md focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                    <textarea {...register('address')} rows={2} className="w-full px-3 py-2 border rounded-md focus:ring-primary-500" />
                  </div>
                </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 mt-8">
            <button type="button" onClick={closeModal} className="px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md transition-all disabled:opacity-50">
              {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Teacher')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
