import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/axios';
import { Plus, Search, Edit2, Trash2, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

interface User {
  id: string;
  email: string;
  name: string;
  status: string;
  role: { id: string; name: string; slug: string };
  createdAt: string;
}

const PAGE_SIZE = 20;

export const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({ id: '', email: '', roleId: '', password: '', status: 'ACTIVE' });

  // Server-side filters + pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = useCallback(async (
    page: number, 
    search: string, 
    role: string, 
    status: string,
    signal?: AbortSignal
  ) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(PAGE_SIZE),
      };
      if (search) params.q = search;
      if (role) params.roleId = role;
      if (status) params.status = status;

      const res = await api.get('/users', { params, signal });
      setUsers(res.data.data);
      setMeta(res.data.meta);
    } catch (err: any) {
      if (err.name !== 'CanceledError') {
        showToast('Failed to fetch users', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await api.get('/roles');
      setRoles(res.data);
    } catch {
      showToast('Failed to fetch roles', 'error');
    }
  };

  // Re-fetch when filters / page change with Debounce
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchUsers(meta.page, searchTerm, filterRole, filterStatus, controller.signal);
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [meta.page, searchTerm, filterRole, filterStatus, fetchUsers]);

  useEffect(() => {
    fetchRoles();
  }, []);

  const resetPage = () => setMeta((m) => ({ ...m, page: 1 }));

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await api.put(`/users/${formData.id}`, formData);
        showToast('User updated successfully', 'success');
      } else {
        await api.post('/users', formData);
        showToast('User created successfully', 'success');
      }
      closeModal();
      fetchUsers(meta.page, searchTerm, filterRole, filterStatus);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await api.delete(`/users/${confirmDialog.id}`);
      showToast('User deleted successfully', 'success');
      setConfirmDialog({ isOpen: false, id: '' });
      fetchUsers(meta.page, searchTerm, filterRole, filterStatus);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModal = (user?: User) => {
    if (user) {
      setIsEditing(true);
      setFormData({ id: user.id, email: user.email, roleId: user.role?.id || '', password: '', status: user.status });
    } else {
      setIsEditing(false);
      setFormData({ id: '', email: '', roleId: '', password: '', status: 'ACTIVE' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ id: '', email: '', roleId: '', password: '', status: 'ACTIVE' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 text-white animate-in fade-in slide-in-from-top-4 font-medium ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">User Management</h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">Manage teachers, students, and administrators</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all transform hover:-translate-y-0.5"
        >
          <Plus size={18} /> Add User
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {/* Filters */}
        <div className="p-5 border-b border-gray-100 bg-white flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); resetPage(); }}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 bg-gray-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all outline-none"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value); resetPage(); }}
            className="px-4 py-2.5 text-sm border border-gray-200 bg-gray-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none font-medium text-gray-700"
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); resetPage(); }}
            className="px-4 py-2.5 text-sm border border-gray-200 bg-gray-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none font-medium text-gray-700"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="PENDING">PENDING</option>
          </select>
        </div>

        {loading ? (
          <SkeletonTable rows={6} cols={5} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Users Found"
            description={searchTerm ? 'Try a different search term.' : 'Your user list is empty.'}
            className="border-none shadow-none py-20"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/80 text-gray-700 border-b border-gray-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4 font-extrabold">User</th>
                  <th className="px-6 py-4 font-extrabold">Role</th>
                  <th className="px-6 py-4 font-extrabold">Status</th>
                  <th className="px-6 py-4 font-extrabold">Joined</th>
                  <th className="px-6 py-4 font-extrabold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 flex items-center justify-center font-bold text-sm shadow-sm border border-white">
                          {user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{user.name}</div>
                          <div className="text-gray-500 text-xs font-medium">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                        {user.role?.name || 'No Role'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider border ${
                          user.status === 'ACTIVE'
                            ? 'bg-green-50 text-green-700 border-green-100'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-medium">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openModal(user)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setConfirmDialog({ isOpen: true, id: user.id })}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {meta.total > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-xs text-gray-500 font-medium">
              Showing{' '}
              <span className="font-bold text-gray-800">{(meta.page - 1) * meta.limit + 1}</span>
              {' '}–{' '}
              <span className="font-bold text-gray-800">{Math.min(meta.page * meta.limit, meta.total)}</span>
              {' '}of{' '}
              <span className="font-bold text-gray-800">{meta.total}</span> users
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={meta.page === 1}
                onClick={() => setMeta((m) => ({ ...m, page: m.page - 1 }))}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold text-gray-700 px-2">
                {meta.page} / {meta.totalPages}
              </span>
              <button
                disabled={meta.page >= meta.totalPages}
                onClick={() => setMeta((m) => ({ ...m, page: m.page + 1 }))}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={isEditing ? 'Edit User' : 'Add New User'}>
        <form onSubmit={handleCreateUser} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">Role</label>
            <select
              required
              value={formData.roleId}
              onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-gray-700"
            >
              <option value="">-- Select Role --</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">Status</label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-gray-700"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="PENDING">PENDING</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">
              {isEditing ? 'New Password (Optional)' : 'Temporary Password'}
            </label>
            <input
              type="password"
              required={!isEditing}
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            />
          </div>
          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={closeModal}
              className="px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, id: '' })}
        onConfirm={handleDelete}
        title="Delete User"
        description="Are you sure you want to delete this user? This action will prevent them from logging in."
        confirmText="Delete"
        isLoading={isSubmitting}
      />
    </div>
  );
};
