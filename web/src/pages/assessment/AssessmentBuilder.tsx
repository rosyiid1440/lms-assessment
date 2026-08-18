import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/axios';
import { Plus, Search, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

const STATUSES = ['DRAFT', 'SCHEDULED', 'READY', 'RUNNING', 'FINISHED', 'REVIEW', 'PUBLISHED', 'ARCHIVED'];
const VISIBILITIES = ['PRIVATE', 'PUBLIC', 'CLASS', 'COURSE'];

const emptyAssessment = {
  title: '',
  description: '',
  instructions: '',
  status: 'DRAFT',
  visibility: 'CLASS',
  durationMinutes: 60,
  attemptLimit: 1,
  passingScore: 60,
  openDate: '',
  closeDate: '',
  shuffleQuestions: false,
  shuffleOptions: false,
  showResult: true,
  showCorrectAnswer: true,
  showExplanation: true,
  allowResume: true,
  allowReview: true,
  autoSubmit: true,
};

export const AssessmentBuilder = () => {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>(emptyAssessment);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: meta.page, limit: meta.limit };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/assessment/assessments', { params });
      setAssessments(res.data.data);
      setMeta(res.data.meta);
    } catch {
      showToast('Gagal memuat data', 'error');
    } finally {
      setLoading(false);
    }
  }, [meta.page, search, statusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = () => { setIsEditing(false); setForm(emptyAssessment); setIsModalOpen(true); };
  const openEdit = (a: any) => {
    setIsEditing(true);
    setForm({
      ...a,
      openDate: a.openDate ? String(a.openDate).slice(0, 16) : '',
      closeDate: a.closeDate ? String(a.closeDate).slice(0, 16) : '',
    });
    setIsModalOpen(true);
  };

  const saveAssessment = async () => {
    if (!form.title.trim()) { showToast('Judul wajib diisi', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        instructions: form.instructions || null,
        status: form.status,
        visibility: form.visibility,
        durationMinutes: Number(form.durationMinutes) || 60,
        attemptLimit: Number(form.attemptLimit) || 1,
        passingScore: Number(form.passingScore) || 0,
        openDate: form.openDate ? new Date(form.openDate).toISOString() : null,
        closeDate: form.closeDate ? new Date(form.closeDate).toISOString() : null,
        shuffleQuestions: !!form.shuffleQuestions,
        shuffleOptions: !!form.shuffleOptions,
        showResult: !!form.showResult,
        showCorrectAnswer: !!form.showCorrectAnswer,
        showExplanation: !!form.showExplanation,
        allowResume: !!form.allowResume,
        allowReview: !!form.allowReview,
        autoSubmit: !!form.autoSubmit,
      };
      if (isEditing) {
        await api.put(`/assessment/assessments/${form.id}`, payload);
        showToast('Ujian diperbarui');
      } else {
        await api.post('/assessment/assessments', payload);
        showToast('Ujian dibuat');
      }
      setIsModalOpen(false);
      fetchAll();
    } catch (e: any) {
      showToast(e.response?.data?.errors?.[0]?.message || e.response?.data?.detail || 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/assessment/assessments/${confirm.id}`);
      showToast('Ujian dihapus');
      setConfirm({ isOpen: false, id: '' });
      fetchAll();
    } catch { showToast('Gagal menghapus', 'error'); }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await api.post(`/assessment/assessments/${id}/status`, { status });
      showToast(`Status → ${status}`);
      fetchAll();
    } catch (e: any) {
      showToast(e.response?.data?.detail || 'Gagal ubah status', 'error');
    }
  };

  const openDetail = (a: any) => {
    navigate(`/dashboard/assessment/builder/${a.id}`);
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700', SCHEDULED: 'bg-blue-100 text-blue-700', READY: 'bg-cyan-100 text-cyan-700',
      RUNNING: 'bg-purple-100 text-purple-700', FINISHED: 'bg-gray-100 text-gray-700', REVIEW: 'bg-amber-100 text-amber-700',
      PUBLISHED: 'bg-green-100 text-green-700', ARCHIVED: 'bg-orange-100 text-orange-700',
    };
    return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${map[s] || 'bg-gray-100'}`}>{s}</span>;
  };

  const toggle = (field: string) => {
    const value = !form[field];
    setForm({ ...form, [field]: value });
    if (field === 'shuffleQuestions' && value) setForm((f: any) => ({ ...f, randomSelect: true }));
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Assessment Builder</h2>
          <p className="text-sm text-gray-500 mt-1">Buat & kelola ujian</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg">
          <Plus size={16} /> Buat Ujian
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input value={search} onChange={e => { setSearch(e.target.value); setMeta({ ...meta, page: 1 }); }} placeholder="Cari ujian..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setMeta({ ...meta, page: 1 }); }} className="px-3 py-2 text-sm border border-gray-300 rounded-md">
          <option value="">Semua Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-semibold">Judul</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Durasi</th>
                <th className="px-6 py-3 font-semibold">Soal</th>
                <th className="px-6 py-3 font-semibold">Bobot</th>
                <th className="px-6 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" /></td></tr>
              ) : assessments.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Belum ada ujian</td></tr>
              ) : assessments.map((a: any) => (
                <tr key={a.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <button onClick={() => openDetail(a)} className="font-semibold text-gray-900 hover:text-primary-600 text-left">{a.title}</button>
                    <div className="text-xs text-gray-500">{a.visibility} • batas {a.attemptLimit}x</div>
                  </td>
                  <td className="px-6 py-4">{statusBadge(a.status)}</td>
                  <td className="px-6 py-4">{a.durationMinutes} mnt</td>
                  <td className="px-6 py-4">{a.questionCount}</td>
                  <td className="px-6 py-4">{a.maxPoints}</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(a)} className="text-gray-400 hover:text-primary-600 p-1" title="Edit"><Edit2 size={16} /></button>
                    <button onClick={() => setStatus(a.id, a.status === 'PUBLISHED' ? 'ARCHIVED' : 'PUBLISHED')} className="text-gray-400 hover:text-green-600 p-1 ml-1" title={a.status === 'PUBLISHED' ? 'Arsipkan' : 'Publikasikan'}><CheckCircle2 size={16} /></button>
                    <button onClick={() => setConfirm({ isOpen: true, id: a.id })} className="text-gray-400 hover:text-red-600 p-1 ml-1" title="Hapus"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-500">Total <span className="font-medium">{meta.total}</span> ujian</div>
          <div className="flex gap-2">
            <button disabled={meta.page === 1} onClick={() => setMeta({ ...meta, page: meta.page - 1 })} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Prev</button>
            <button disabled={meta.page === meta.totalPages} onClick={() => setMeta({ ...meta, page: meta.page + 1 })} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* Assessment Form Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Edit Ujian' : 'Buat Ujian Baru'} width="max-w-3xl">
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Judul *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Misal: Ujian Akhir Semester Fisika" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Visibilitas</label>
              <select value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm">
                {VISIBILITIES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Durasi (menit)</label>
              <input type="number" value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Batas Percobaan</label>
              <input type="number" min={1} max={100} value={form.attemptLimit} onChange={e => setForm({ ...form, attemptLimit: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nilai Lulus (%)</label>
              <input type="number" value={form.passingScore} onChange={e => setForm({ ...form, passingScore: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Zona Waktu</label>
              <input value="Asia/Jakarta" disabled className="w-full px-3 py-2 border rounded-md text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Buka</label>
              <input type="datetime-local" value={form.openDate || ''} onChange={e => setForm({ ...form, openDate: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tutup</label>
              <input type="datetime-local" value={form.closeDate || ''} onChange={e => setForm({ ...form, closeDate: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Instruksi</label>
            <textarea value={form.instructions || ''} onChange={e => setForm({ ...form, instructions: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['shuffleQuestions', 'Acak Soal'], ['shuffleOptions', 'Acak Opsi'], ['allowResume', 'Lanjutkan'],
              ['allowReview', 'Tinjauan'], ['autoSubmit', 'Auto Submit'], ['showResult', 'Tampilkan Nilai'],
              ['showCorrectAnswer', 'Tampilkan Kunci'], ['showExplanation', 'Tampilkan Pembahasan'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={!!form[key]} onChange={() => toggle(key)} className="h-4 w-4 rounded border-gray-300 text-primary-600" />
                {label}
              </label>
            ))}
          </div>
          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Batal</button>
            <button onClick={saveAssessment} disabled={saving} className="px-5 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirm.isOpen}
        onClose={() => setConfirm({ isOpen: false, id: '' })}
        onConfirm={handleDelete}
        title="Hapus Ujian"
        description="Apakah Anda yakin ingin menghapus ujian ini?"
        confirmText="Hapus"
      />
    </div>
  );
};
