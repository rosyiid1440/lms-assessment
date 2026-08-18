import React, { useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { Plus, Edit2, Trash2, Search, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

const courseSchema = z.object({
  id: z.string().optional(),
  subjectId: z.string().min(1, 'Subject is required'),
  classId: z.string().min(1, 'Class is required'),
  semesterId: z.string().min(1, 'Semester is required'),
  primaryTeacherId: z.string().min(1, 'Primary Teacher is required')
});

type CourseForm = z.infer<typeof courseSchema>;

export const CourseManagement = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [coTeacherModal, setCoTeacherModal] = useState<any>(null);
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, action: () => Promise<void>, title: string, desc: string}>({ isOpen: false, action: async () => {}, title: '', desc: '' });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Master Data
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [activeSemester, setActiveSemester] = useState<any>(null);

  const [coTeacherData, setCoTeacherData] = useState({ teacherId: '', role: 'ASSISTANT' });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CourseForm>({
    resolver: zodResolver(courseSchema)
  });

  useEffect(() => {
    fetchMasterData().then(semId => {
      if (semId) {
        setFilterSemester(semId);
      }
    });
  }, []);

  useEffect(() => {
    if (filterSemester) fetchCourses();
  }, [meta.page, searchTerm, filterSemester, filterSubject, filterStatus]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchMasterData = async () => {
    try {
      const [masterRes, subjectRes, teacherRes] = await Promise.all([
        api.get('/academic-master'),
        api.get('/subjects'),
        api.get('/teachers?limit=1000')
      ]);
      setClasses(masterRes.data.classrooms); // Assuming classrooms here, actually we need Classes (Rombel)
      setSubjects(subjectRes.data);
      setTeachers(teacherRes.data.data);
      setActiveSemester(masterRes.data.activeSemester);

      // fetch classes (Rombel)
      if (masterRes.data.activeSemester) {
        const clsRes = await api.get(`/classes?semesterId=${masterRes.data.activeSemester.id}`);
        setClasses(clsRes.data);
        return masterRes.data.activeSemester.id;
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: meta.page.toString(),
        limit: meta.limit.toString(),
        ...(searchTerm && { q: searchTerm }),
        ...(filterSemester && { semesterId: filterSemester }),
        ...(filterSubject && { subjectId: filterSubject }),
        ...(filterStatus && { status: filterStatus })
      });
      const res = await api.get(`/courses?${params.toString()}`);
      setCourses(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      showToast('Failed to fetch courses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CourseForm) => {
    try {
      if (isEditing) {
        await api.put(`/courses/${data.id}`, data);
        showToast('Course updated successfully', 'success');
      } else {
        await api.post('/courses', data);
        showToast('Course created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchCourses();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Operation failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/courses/${id}`);
      showToast('Course deleted successfully', 'success');
      setConfirmDialog({ ...confirmDialog, isOpen: false });
      fetchCourses();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete', 'error');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.post(`/courses/${id}/status`, { status: newStatus });
      showToast(`Status changed to ${newStatus}`, 'success');
      fetchCourses();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to change status', 'error');
    }
  };

  const handleAddCoTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/courses/${coTeacherModal.id}/co-teachers`, coTeacherData);
      showToast('Co-teacher added successfully', 'success');
      setCoTeacherModal(null);
      setCoTeacherData({ teacherId: '', role: 'ASSISTANT' });
      fetchCourses();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to add co-teacher', 'error');
    }
  };

  const handleRemoveCoTeacher = async (courseId: string, teacherId: string) => {
    try {
      await api.delete(`/courses/${courseId}/co-teachers/${teacherId}`);
      showToast('Co-teacher removed', 'success');
      setConfirmDialog({ ...confirmDialog, isOpen: false });
      fetchCourses();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to remove co-teacher', 'error');
    }
  };

  const openModal = (course?: any) => {
    if (course) {
      setIsEditing(true);
      reset({
        id: course.id,
        subjectId: course.subjectId,
        classId: course.classId,
        semesterId: course.semesterId,
        primaryTeacherId: course.primaryTeacherId
      });
    } else {
      setIsEditing(false);
      reset({ semesterId: activeSemester?.id || '' });
    }
    setIsModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800';
      case 'ARCHIVED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!activeSemester && !loading) {
    return (
      <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 text-yellow-800">
        <h3 className="font-bold text-lg mb-2">No Active Semester</h3>
        <p>You must set an Academic Year & Semester to ACTIVE before managing courses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded shadow-lg z-50 text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Course Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage subjects taught in classes and assign teachers</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Course
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" placeholder="Search Subject or Class..." value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setMeta({...meta, page: 1}); }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary-500"
            />
          </div>
          <select 
            value={filterSubject} onChange={(e) => { setFilterSubject(e.target.value); setMeta({...meta, page: 1}); }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary-500"
          >
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select 
            value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setMeta({...meta, page: 1}); }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary-500"
          >
            <option value="">All Status</option>
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-semibold">Course & Class</th>
                <th className="px-6 py-3 font-semibold">Primary Teacher</th>
                <th className="px-6 py-3 font-semibold">Co-Teachers</th>
                <th className="px-6 py-3 font-semibold text-center">Students</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center">Loading...</td></tr>
              ) : courses.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No courses found</td></tr>
              ) : (
                courses.map(course => (
                  <tr key={course.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{course.subject.name}</div>
                      <div className="text-xs text-gray-500">{course.class.name} • {course.semester.name}</div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {course.primaryTeacher.fullName}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 mb-1">
                        {course.coTeachers.map((ct: any) => (
                          <span key={ct.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-xs">
                            {ct.teacher.fullName} ({ct.role})
                            <button onClick={() => setConfirmDialog({
                              isOpen: true,
                              title: 'Remove Co-Teacher',
                              desc: 'Are you sure you want to remove this co-teacher?',
                              action: () => handleRemoveCoTeacher(course.id, ct.teacherId)
                            })} className="text-red-500 hover:text-red-700 ml-1">&times;</button>
                          </span>
                        ))}
                      </div>
                      <button onClick={() => setCoTeacherModal(course)} className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1">
                        <UserPlus size={12} /> Add Co-Teacher
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-gray-900">
                      {course.studentCount}
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={course.status} 
                        onChange={(e) => handleStatusChange(course.id, e.target.value)}
                        className={`text-xs font-medium rounded-full px-2 py-1 outline-none ${getStatusColor(course.status)}`}
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="ARCHIVED">ARCHIVED</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => openModal(course)} className="text-gray-400 hover:text-gray-600 p-1"><Edit2 size={16} /></button>
                      <button onClick={() => setConfirmDialog({
                        isOpen: true,
                        title: 'Delete Course',
                        desc: 'Are you sure you want to delete this course?',
                        action: () => handleDelete(course.id)
                      })} className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
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
            Showing {(meta.page - 1) * meta.limit + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} records
          </div>
          <div className="flex gap-2">
            <button disabled={meta.page === 1} onClick={() => setMeta({...meta, page: meta.page - 1})} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Prev</button>
            <button disabled={meta.page === meta.totalPages || meta.totalPages === 0} onClick={() => setMeta({...meta, page: meta.page + 1})} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({...confirmDialog, isOpen: false})}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        description={confirmDialog.desc}
        confirmText="Confirm"
        isLoading={false}
      />
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Course' : 'Create New Course'}</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select {...register('subjectId')} className="w-full px-3 py-2 border rounded-md focus:ring-primary-500">
                  <option value="">-- Select Subject --</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {errors.subjectId && <p className="text-red-500 text-xs mt-1">{errors.subjectId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select {...register('classId')} className="w-full px-3 py-2 border rounded-md focus:ring-primary-500">
                  <option value="">-- Select Class --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.classId && <p className="text-red-500 text-xs mt-1">{errors.classId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                <select {...register('semesterId')} className="w-full px-3 py-2 border rounded-md bg-gray-100" disabled>
                  <option value={activeSemester?.id}>{activeSemester?.name}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Teacher</label>
                <select {...register('primaryTeacherId')} className="w-full px-3 py-2 border rounded-md focus:ring-primary-500">
                  <option value="">-- Select Teacher --</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName} (NIP: {t.nip})</option>)}
                </select>
                {errors.primaryTeacherId && <p className="text-red-500 text-xs mt-1">{errors.primaryTeacherId.message}</p>}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                  {isEditing ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CoTeacher Modal */}
      {coTeacherModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Add Co-Teacher</h3>
            <p className="text-sm text-gray-600 mb-4">Course: <strong>{coTeacherModal.subject.name} - {coTeacherModal.class.name}</strong></p>
            <form onSubmit={handleAddCoTeacher} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Teacher</label>
                <select 
                  required value={coTeacherData.teacherId} onChange={e => setCoTeacherData({...coTeacherData, teacherId: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:ring-primary-500"
                >
                  <option value="">-- Select Teacher --</option>
                  {teachers.filter(t => t.id !== coTeacherModal.primaryTeacherId).map(t => (
                    <option key={t.id} value={t.id}>{t.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select 
                  required value={coTeacherData.role} onChange={e => setCoTeacherData({...coTeacherData, role: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:ring-primary-500"
                >
                  <option value="ASSISTANT">ASSISTANT</option>
                  <option value="OBSERVER">OBSERVER</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setCoTeacherModal(null)} className="px-4 py-2 border rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
