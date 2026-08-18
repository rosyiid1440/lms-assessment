import React, { useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { Plus, Edit2, Trash2, GraduationCap } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

interface ClassData {
  id: string;
  code: string;
  name: string;
  gradeLevel: { id: string; level: number; phase: string };
  major: { id: string; name: string };
  classroom: { id: string; name: string } | null;
  semester: { id: string; name: string; academicYear: { name: string } };
}

export const ClassManagement = () => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, id: string}>({isOpen: false, id: ''});
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Master Data
  const [grades, setGrades] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [activeSemester, setActiveSemester] = useState<any>(null);

  const [formData, setFormData] = useState({
    id: '', code: '', name: '', gradeLevelId: '', majorId: '', classroomId: ''
  });

  useEffect(() => {
    fetchMasterData().then((semesterId) => {
      if (semesterId) fetchClasses(semesterId);
      else setLoading(false);
    });
  }, []);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchMasterData = async () => {
    try {
      const res = await api.get('/academic-master');
      setGrades(res.data.grades);
      setMajors(res.data.majors);
      setClassrooms(res.data.classrooms);
      setActiveSemester(res.data.activeSemester);
      return res.data.activeSemester?.id;
    } catch (err) {
      return null;
    }
  };

  const fetchClasses = async (semesterId: string) => {
    try {
      const res = await api.get(`/classes?semesterId=${semesterId}`);
      setClasses(res.data);
    } catch (err) {
      showToast('Failed to fetch classes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSemester) {
      showToast('No active semester found.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await api.put(`/classes/${formData.id}`, formData);
        showToast('Class updated successfully', 'success');
      } else {
        await api.post('/classes', { ...formData, semesterId: activeSemester.id });
        showToast('Class created successfully', 'success');
      }
      closeModal();
      fetchClasses(activeSemester.id);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Operation failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await api.delete(`/classes/${confirmDialog.id}`);
      showToast('Class deleted successfully', 'success');
      setConfirmDialog({isOpen: false, id: ''});
      fetchClasses(activeSemester.id);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModal = (cls?: ClassData) => {
    if (cls) {
      setIsEditing(true);
      setFormData({
        id: cls.id,
        code: cls.code,
        name: cls.name,
        gradeLevelId: cls.gradeLevel.id,
        majorId: cls.major.id,
        classroomId: cls.classroom?.id || ''
      });
    } else {
      setIsEditing(false);
      setFormData({ id: '', code: '', name: '', gradeLevelId: '', majorId: '', classroomId: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  if (!activeSemester && !loading) {
    return (
      <EmptyState 
        icon={GraduationCap}
        title="No Active Semester"
        description="You must set an Academic Year & Semester to ACTIVE before you can manage classes."
        className="mt-8"
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 text-white animate-in fade-in slide-in-from-top-4 font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Class Management</h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Managing classes for <strong>{activeSemester?.name}</strong> ({activeSemester?.academicYear?.name})
          </p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all transform hover:-translate-y-0.5"
        >
          <Plus size={18} /> Add Class
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <SkeletonTable rows={5} cols={6} />
        ) : classes.length === 0 ? (
          <EmptyState 
            icon={GraduationCap}
            title="No Classes Found"
            description="You haven't created any classes for this semester yet."
            className="border-none shadow-none py-20"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/80 text-gray-700 border-b border-gray-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4 font-extrabold">Class Name</th>
                  <th className="px-6 py-4 font-extrabold">Code</th>
                  <th className="px-6 py-4 font-extrabold">Grade / Phase</th>
                  <th className="px-6 py-4 font-extrabold">Major</th>
                  <th className="px-6 py-4 font-extrabold">Room</th>
                  <th className="px-6 py-4 font-extrabold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {classes.map(cls => (
                  <tr key={cls.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 font-bold text-gray-900">{cls.name}</td>
                    <td className="px-6 py-4 font-mono font-medium text-xs text-gray-500 bg-gray-50 rounded px-2">{cls.code}</td>
                    <td className="px-6 py-4 font-medium">Grade {cls.gradeLevel.level} (Phase {cls.gradeLevel.phase})</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider bg-purple-50 text-purple-700 border border-purple-100">
                        {cls.major.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">{cls.classroom?.name || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openModal(cls)} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"><Edit2 size={16} /></button>
                      <button onClick={() => setConfirmDialog({isOpen: true, id: cls.id})} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1 opacity-0 group-hover:opacity-100 focus:opacity-100"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={isEditing ? 'Edit Class' : 'Add New Class'}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1.5">Class Code</label>
              <input 
                type="text" required placeholder="e.g. 10-MIPA-1"
                value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1.5">Class Name</label>
              <input 
                type="text" required placeholder="e.g. X MIPA 1"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">Grade Level</label>
            <select 
              required value={formData.gradeLevelId} onChange={e => setFormData({...formData, gradeLevelId: e.target.value})}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            >
              <option value="">-- Select Grade --</option>
              {grades.map(g => <option key={g.id} value={g.id}>Grade {g.level} (Phase {g.phase})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">Major / Program</label>
            <select 
              required value={formData.majorId} onChange={e => setFormData({...formData, majorId: e.target.value})}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            >
              <option value="">-- Select Major --</option>
              {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">Classroom (Optional)</label>
            <select 
              value={formData.classroomId} onChange={e => setFormData({...formData, classroomId: e.target.value})}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            >
              <option value="">-- No Room Assigned --</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name} (Cap: {c.capacity})</option>)}
            </select>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 mt-8">
            <button type="button" onClick={closeModal} className="px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-primary-600 text-white font-bold rounded-xl shadow-md hover:bg-primary-700 hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Class')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({isOpen: false, id: ''})}
        onConfirm={handleDelete}
        title="Delete Class"
        description="Are you sure you want to delete this class? This may orphan enrolled students."
        confirmText="Delete"
        isLoading={isSubmitting}
      />
    </div>
  );
};
