import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/axios';
import { useNavigate } from 'react-router-dom';
import { FolderGit2, Plus, Upload, GitBranch, CheckCircle2, Search, FileCode2 } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';
import { Modal } from '../../components/ui/Modal';
import { useAuthStore } from '../../stores/authStore';

export const ProjectsList = () => {
  const { user } = useAuthStore();
  const isTeacher = user?.role?.slug === 'teacher' || user?.role?.slug === 'admin';
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', maxScore: '100', groupGit: true, courseId: '' });
  const navigate = useNavigate();

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await api.get('/informatics/projects');
      setProjects(res.data.data || []);
    } catch (e) { setError(true); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post('/informatics/projects', {
        title: form.title, description: form.description,
        maxScore: parseFloat(form.maxScore) || 100,
        groupGit: form.groupGit,
        courseId: form.courseId || undefined,
      });
      setShowForm(false);
      setForm({ title: '', description: '', maxScore: '100', groupGit: true, courseId: '' });
      fetchAll();
    } catch (e: any) { alert(e?.response?.data?.error || 'Gagal membuat proyek.'); } finally { setSaving(false); }
  };

  if (error) return <ErrorState message="Gagal memuat proyek." onRetry={fetchAll} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <BackButton to="/dashboard/study/informatika" label="Kembali ke Informatika" />
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2"><FolderGit2 size={28} className="text-orange-500" /> Proyek Teknis</h2>
          <p className="text-sm text-gray-500 mt-1">Pengumpulan multi-file proyek & integrasi Git (GitHub/GitLab) untuk tugas kelompok.</p>
        </div>
        {isTeacher && <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-700"><Plus size={18} /> Buat Proyek</button>}
      </div>

      {loading ? <SkeletonList count={3} /> : projects.length === 0 ? (
        <EmptyState icon={FolderGit2} title="Belum ada proyek" description={isTeacher ? 'Buat proyek teknis untuk siswa.' : 'Guru belum membuat proyek.'} className="py-24" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p) => {
            const mySub = p.mySubmission;
            return (
              <div key={p.id} onClick={() => navigate(`/dashboard/informatics/projects/${p.id}`)} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl p-5 cursor-pointer hover:-translate-y-1 transition-all">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center"><FolderGit2 size={20} /></div>
                  {p.mySubmission ? <span className="flex items-center gap-1 text-xs font-bold text-green-600"><CheckCircle2 size={13} /> Dikumpulkan</span> : <span className="text-xs font-bold text-gray-300">Belum</span>}
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{p.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{p.description}</p>
                <div className="flex items-center justify-between border-t border-gray-50 pt-3 text-xs text-gray-500">
                  <span>Skor Max: {p.maxScore}</span>
                  {p.groupGit && <span className="flex items-center gap-1"><GitBranch size={12} /> Git</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Buat Proyek Teknis">
        <div className="space-y-4">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Judul proyek" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Deskripsi & kriteria..." className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} placeholder="Skor max" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl" />
            <label className="flex items-center gap-2 text-sm text-gray-600 px-2">
              <input type="checkbox" checked={form.groupGit} onChange={(e) => setForm({ ...form, groupGit: e.target.checked })} /> Dukung Git / kelompok
            </label>
          </div>
          <button onClick={handleCreate} disabled={saving} className="w-full px-4 py-2.5 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-700 disabled:opacity-60">{saving ? 'Menyimpan...' : 'Simpan Proyek'}</button>
        </div>
      </Modal>
    </div>
  );
};