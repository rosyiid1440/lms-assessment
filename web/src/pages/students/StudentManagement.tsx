import React, { useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { Plus, Edit2, Trash2, Search, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

const studentSchema = z.object({
  id: z.string().optional(),
  nis: z.string().min(1, 'NIS is required'),
  nisn: z.string().min(1, 'NISN is required'),
  fullName: z.string().min(1, 'Full name is required'),
  gender: z.enum(['MALE', 'FEMALE']),
  birthPlace: z.string().optional(),
  birthDate: z.string().optional(),
  religion: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  status: z.string(),
  classId: z.string().min(1, 'Class is required')
});

type StudentForm = z.infer<typeof studentSchema>;

export const StudentManagement = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, id: string}>({isOpen: false, id: ''});
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('fullName');
  const [sortDir, setSortDir] = useState('asc');

  // Master Data
  const [classes, setClasses] = useState<any[]>([]);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<StudentForm>({
    resolver: zodResolver(studentSchema),
    defaultValues: { status: 'ACTIVE', gender: 'MALE' }
  });

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [meta.page, searchTerm, filterClass, filterStatus, sortBy, sortDir]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchMasterData = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: meta.page.toString(),
        limit: meta.limit.toString(),
        sortBy,
        sortDir,
        ...(searchTerm && { q: searchTerm }),
        ...(filterClass && { classId: filterClass }),
        ...(filterStatus && { status: filterStatus }),
      });
      const res = await api.get(`/students?${params.toString()}`);
      setStudents(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      showToast('Failed to fetch students', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: StudentForm) => {
    try {
      if (isEditing) {
        await api.put(`/students/${data.id}`, data);
        showToast('Student updated successfully', 'success');
      } else {
        await api.post('/students', data);
        showToast('Student created successfully', 'success');
      }
      closeModal();
      fetchStudents();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Operation failed', 'error');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/students/${confirmDialog.id}`);
      showToast('Student deleted successfully', 'success');
      setConfirmDialog({isOpen: false, id: ''});
      fetchStudents();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const openModal = (student?: any) => {
    if (student) {
      setIsEditing(true);
      reset({
        id: student.id,
        nis: student.nis,
        nisn: student.nisn,
        fullName: student.fullName,
        gender: student.gender,
        birthPlace: student.birthPlace || '',
        birthDate: student.birthDate ? new Date(student.birthDate).toISOString().split('T')[0] : '',
        religion: student.religion || '',
        address: student.address || '',
        phone: student.phone || '',
        email: student.user?.email || '',
        parentName: student.parentName || '',
        parentPhone: student.parentPhone || '',
        status: student.user?.status || 'ACTIVE',
        classId: student.studentEnrollments?.[0]?.classId || ''
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
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded shadow-lg z-50 text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage student records, enrollments, and profiles</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Student
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Toolbar: Search & Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search NIS / Name..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setMeta({...meta, page: 1}); }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary-500"
            />
          </div>
          
          <select 
            value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setMeta({...meta, page: 1}); }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary-500"
          >
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-semibold cursor-pointer" onClick={() => handleSort('nis')}>
                  NIS / NISN {sortBy === 'nis' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 font-semibold cursor-pointer" onClick={() => handleSort('fullName')}>
                  Student Name {sortBy === 'fullName' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 font-semibold">Class</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div></td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No students found</td></tr>
              ) : (
                students.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{student.nis}</div>
                      <div className="text-xs text-gray-500">{student.nisn}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{student.fullName}</div>
                      <div className="text-xs text-gray-500">{student.gender}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {student.studentEnrollments?.[0]?.class?.name || 'No Class'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        student.user?.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {student.user?.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openModal(student)} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Edit2 size={16} /></button>
                      <button onClick={() => setConfirmDialog({isOpen: true, id: student.id})} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
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
            Showing <span className="font-medium">{(meta.page - 1) * meta.limit + 1}</span> to <span className="font-medium">{Math.min(meta.page * meta.limit, meta.total)}</span> of <span className="font-medium">{meta.total}</span> students
          </div>
          <div className="flex gap-2">
            <button 
              disabled={meta.page === 1} onClick={() => setMeta({...meta, page: meta.page - 1})}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              disabled={meta.page === meta.totalPages} onClick={() => setMeta({...meta, page: meta.page + 1})}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={isEditing ? 'Edit Student' : 'Add New Student'} width="max-w-3xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 border-b pb-2">Basic Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">NIS *</label>
                  <input {...register('nis')} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none" />
                  {errors.nis && <p className="text-red-500 text-xs mt-1">{errors.nis.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">NISN *</label>
                  <input {...register('nisn')} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none" />
                  {errors.nisn && <p className="text-red-500 text-xs mt-1">{errors.nisn.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                <input {...register('fullName')} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none" />
                {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Gender</label>
                  <select {...register('gender')} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all outline-none">
                    <option value="MALE">Laki-laki</option>
                    <option value="FEMALE">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Religion</label>
                  <input {...register('religion')} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Birth Place</label>
                  <input {...register('birthPlace')} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Birth Date</label>
                  <input type="date" {...register('birthDate')} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none" />
                </div>
              </div>
            </div>

            {/* Academic & Contact */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 border-b pb-2">Academic & Contact</h4>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Current Class *</label>
                <select {...register('classId')} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all outline-none">
                  <option value="">-- Select Class --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.classId && <p className="text-red-500 text-xs mt-1">{errors.classId.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                <select {...register('status')} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all outline-none">
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email (Optional)</label>
                <input type="email" {...register('email')} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Parent Name</label>
                  <input {...register('parentName')} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Parent Phone</label>
                  <input {...register('parentPhone')} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 mt-8">
            <button type="button" onClick={closeModal} className="px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md transition-all disabled:opacity-50">
              {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Student')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({isOpen: false, id: ''})}
        onConfirm={handleDelete}
        title="Delete Student"
        description="Are you sure you want to delete this student? This will soft delete their enrollment and profile."
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  );
};
