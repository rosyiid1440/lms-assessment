import React, { useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { Search, MoveRight, GraduationCap, UserMinus, FileText } from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

export const EnrollmentManagement = () => {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Master Data
  const [classes, setClasses] = useState<any[]>([]);
  const [activeSemester, setActiveSemester] = useState<any>(null);

  // Modals
  const [actionModal, setActionModal] = useState<{type: 'MOVE' | 'STATUS' | 'HISTORY', enrollment: any} | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [newClassId, setNewClassId] = useState('');
  const [newStatus, setNewStatus] = useState('WITHDRAWN');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, action: () => Promise<void>, title: string, desc: string}>({ isOpen: false, action: async () => {}, title: '', desc: '' });

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchEnrollments();
  }, [meta.page, searchTerm, filterClass, filterStatus]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchMasterData = async () => {
    try {
      const res = await api.get('/academic-master');
      setActiveSemester(res.data.activeSemester);
      
      if (res.data.activeSemester) {
        const classRes = await api.get(`/classes?semesterId=${res.data.activeSemester.id}`);
        setClasses(classRes.data);
      } else {
        setClasses([]);
      }
    } catch (err) {
      console.error(err);
      setClasses([]);
    }
  };

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: meta.page.toString(),
        limit: meta.limit.toString(),
        ...(searchTerm && { q: searchTerm }),
        ...(filterClass && { classId: filterClass }),
        ...(filterStatus && { status: filterStatus }),
      });
      const res = await api.get(`/enrollments?${params.toString()}`);
      setEnrollments(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      showToast('Failed to fetch enrollments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveClass = async () => {
    if (!newClassId) {
      showToast('Select a new class', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post(`/enrollments/${actionModal?.enrollment.id}/move`, { newClassId });
      showToast('Student moved to new class successfully', 'success');
      setActionModal(null);
      fetchEnrollments();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to move class', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/enrollments/${actionModal?.enrollment.id}/status`, { status: newStatus });
      showToast(`Student status updated to ${newStatus}`, 'success');
      setActionModal(null);
      fetchEnrollments();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update status', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewHistory = async (studentId: string) => {
    try {
      const res = await api.get(`/enrollments/history/${studentId}`);
      setHistory(res.data);
    } catch (err: any) {
      showToast('Failed to load history', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'TRANSFERRED': return 'bg-yellow-100 text-yellow-800';
      case 'GRADUATED': return 'bg-blue-100 text-blue-800';
      case 'WITHDRAWN': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
          <h2 className="text-2xl font-bold text-gray-900">Enrollment Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage student class placements and academic status</p>
        </div>
        {activeSemester ? (
          <span className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm font-medium border border-primary-100">
            Active Semester: {activeSemester.name}
          </span>
        ) : (
          <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-sm font-medium border border-red-100">
            No Active Semester!
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" placeholder="Search Student..." value={searchTerm}
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
            <option value="TRANSFERRED">TRANSFERRED</option>
            <option value="GRADUATED">GRADUATED</option>
            <option value="WITHDRAWN">WITHDRAWN</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-semibold">Student</th>
                <th className="px-6 py-3 font-semibold">Class</th>
                <th className="px-6 py-3 font-semibold">Semester</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center">Loading...</td></tr>
              ) : enrollments.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No enrollments found</td></tr>
              ) : (
                enrollments.map(en => (
                  <tr key={en.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{en.student.fullName}</div>
                      <div className="text-xs text-gray-500">{en.student.nis}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{en.class.name}</div>
                      <div className="text-xs text-gray-500">{en.class.gradeLevel.level} {en.class.major.code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div>{en.semester.name}</div>
                      <div className="text-xs text-gray-500">{en.semester.academicYear.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(en.status)}`}>
                        {en.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {en.status === 'ACTIVE' && (
                        <>
                          <button 
                            onClick={() => setActionModal({ type: 'MOVE', enrollment: en })}
                            title="Move Class" className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"
                          >
                            <MoveRight size={16} />
                          </button>
                          <button 
                            onClick={() => { setActionModal({ type: 'STATUS', enrollment: en }); setNewStatus('GRADUATED'); }}
                            title="Graduate" className="text-green-600 hover:bg-green-50 p-1.5 rounded"
                          >
                            <GraduationCap size={16} />
                          </button>
                          <button 
                            onClick={() => { setActionModal({ type: 'STATUS', enrollment: en }); setNewStatus('WITHDRAWN'); }}
                            title="Withdraw" className="text-red-600 hover:bg-red-50 p-1.5 rounded"
                          >
                            <UserMinus size={16} />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => { setActionModal({ type: 'HISTORY', enrollment: en }); viewHistory(en.studentId); }}
                        title="History" className="text-gray-600 hover:bg-gray-50 p-1.5 rounded"
                      >
                        <FileText size={16} />
                      </button>
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

      {/* Action Modals */}
      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({...confirmDialog, isOpen: false})}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        description={confirmDialog.desc}
        confirmText="Confirm"
        isLoading={isSubmitting}
      />

      {actionModal?.type === 'MOVE' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Move Class: {actionModal.enrollment.student.fullName}</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">New Class</label>
              <select 
                value={newClassId} onChange={e => setNewClassId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500"
              >
                <option value="">-- Select New Class --</option>
                {classes.filter(c => c.id !== actionModal.enrollment.classId).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setActionModal(null)} className="px-4 py-2 border rounded-md">Cancel</button>
              <button onClick={handleMoveClass} disabled={isSubmitting} className="px-4 py-2 bg-primary-600 text-white rounded-md">Move</button>
            </div>
          </div>
        </div>
      )}

      {actionModal?.type === 'STATUS' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Change Status: {actionModal.enrollment.student.fullName}</h3>
            <p className="mb-4 text-sm text-gray-600">
              Are you sure you want to mark this enrollment as <strong>{newStatus}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setActionModal(null)} className="px-4 py-2 border rounded-md">Cancel</button>
              <button onClick={handleUpdateStatus} disabled={isSubmitting} className="px-4 py-2 bg-primary-600 text-white rounded-md">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {actionModal?.type === 'HISTORY' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Enrollment History: {actionModal.enrollment.student.fullName}</h3>
            <div className="space-y-3">
              {history.map(h => (
                <div key={h.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{h.class.name}</div>
                    <div className="text-xs text-gray-500">{h.semester.name} ({h.semester.academicYear.name})</div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(h.status)}`}>
                      {h.status}
                    </span>
                    <div className="text-xs text-gray-400 mt-1">{new Date(h.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
              {history.length === 0 && <p className="text-gray-500 text-center">Loading history...</p>}
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setActionModal(null)} className="px-4 py-2 border rounded-md">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
