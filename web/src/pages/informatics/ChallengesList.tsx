import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/axios';
import { useNavigate } from 'react-router-dom';
import { Trophy, Plus, Search, Trash2, CheckCircle2, Clock, Target, Code2, Flame } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useAuthStore } from '../../stores/authStore';

const DIFF: Record<string, { label: string; color: string }> = {
  EASY: { label: 'Mudah', color: 'bg-green-100 text-green-700' },
  MEDIUM: { label: 'Sedang', color: 'bg-amber-100 text-amber-700' },
  HARD: { label: 'Sulit', color: 'bg-red-100 text-red-700' },
};

export const ChallengesList = () => {
  const { user } = useAuthStore();
  const isTeacher = user?.role?.slug === 'teacher' || user?.role?.slug === 'admin';
  const [items, setItems] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    title: '', description: '', difficulty: 'EASY', language: 'PYTHON', points: 10, score: 50, courseId: '', starterCode: '', testCasesStr: ''
  });

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const [ch, lb, co] = await Promise.all([api.get(`/informatics/challenges${search ? `?q=${search}` : ''}`), api.get('/informatics/leaderboard'), api.get('/courses?limit=100')]);
      setItems(ch.data.data || []);
      setLeaderboard(lb.data.data || []);
      setCourses(co.data.data || []);
    } catch (e) { setError(true); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async () => {
    if (!form.title || !form.description) { alert('Judul dan deskripsi wajib diisi.'); return; }
    setSaving(true);
    try {
      let testCases: any = null;
      if (form.testCasesStr.trim()) {
        testCases = form.testCasesStr.split('\n').filter((l: string) => l.trim()).map((l: string) => {
          const parts = l.split('|');
          return { input: (parts[0] || '').replace(/\\n/g, '\n'), expected: parts[1] || '' };
        });
      }
      await api.post('/informatics/challenges', {
        title: form.title, description: form.description, difficulty: form.difficulty,
        language: form.language, points: parseInt(form.points) || 10, score: parseInt(form.score) || 50,
        courseId: form.courseId || undefined, starterCode: form.starterCode || undefined, testCases,
      });
      setShowForm(false);
      setForm({ title: '', description: '', difficulty: 'EASY', language: 'PYTHON', points: 10, score: 50, courseId: '', starterCode: '', testCasesStr: '' });
      fetchAll();
    } catch (e: any) { alert(e?.response?.data?.error || 'Gagal membuat challenge.'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await api.delete(`/informatics/challenges/${deleteTarget.id}`); setDeleteTarget(null); fetchAll(); } catch (e) { alert('Gagal menghapus.'); }
  };

  if (error) return <ErrorState message="Gagal memuat challenge." onRetry={fetchAll} />;

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 pb-12">
      <BackButton to="/dashboard/study/informatika" label="Kembali ke Informatika" />
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2"><Target size={28} className="text-primary-600" /> Coding Challenges</h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">Tantangan pemecahan masalah dengan tingkat kesulitan bertingkat dan autograder.</p>
        </div>
        {isTeacher && (
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-500/20">
            <Plus size={18} /> Buat Challenge
          </button>
        )}
      </div>

      {/* Leaderboard preview */}
      {leaderboard.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Trophy size={14} /> Papan Peringkat</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {leaderboard.slice(0, 3).map((r, i) => (
              <div key={r.studentId} className={`flex items-center gap-3 rounded-xl p-3 ${i === 0 ? 'bg-amber-50 ring-1 ring-amber-200' : i === 1 ? 'bg-gray-50' : 'bg-orange-50'}`}>
                <span className="text-2xl font-extrabold text-gray-300">#{i + 1}</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">{r.name}</p>
                  <p className="text-xs text-gray-500">{r.score} poin • {r.solved} solved</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari challenge..." className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 bg-white" />
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : items.length === 0 ? (
        <EmptyState icon={Target} title="Belum ada challenge" description={isTeacher ? 'Buat challenge pertama untuk siswa.' : 'Guru belum membuat challenge.'} className="py-24" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((c) => (
            <div key={c.id} onClick={() => window.location.href = `/dashboard/informatics/challenges/${c.id}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer p-5 flex flex-col hover:-translate-y-1">
              <div className="flex items-start justify-between mb-3 gap-2">
                <span className={`px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-md ${DIFF[c.difficulty]?.color || 'bg-gray-100 text-gray-600'}`}>{DIFF[c.difficulty]?.label || c.difficulty}</span>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-gray-100 text-gray-600 rounded-md">{c.language}</span>
                  {isTeacher && (
                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
              <h3 className="text-base font-bold text-gray-900 leading-snug mb-2">{c.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-2 flex-1">{c.description}</p>
              <div className="flex items-center justify-between mt-4 border-t border-gray-50 pt-3">
                <span className="flex items-center gap-1 text-xs text-gray-500"><Trophy size={13} className="text-amber-500" /> {c.points} poin</span>
                {c.myAttempt ? (
                  c.myAttempt.status === 'ACCEPTED' ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-green-600"><CheckCircle2 size={13} /> Selesai</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-600"><Clock size={13} /> {c.myAttempt.passedTests}/{c.myAttempt.totalTests} tes</span>
                  )
                ) : <span className="flex items-center gap-1 text-xs font-bold text-gray-300"><Flame size={13} /> Belum dicoba</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Buat Challenge" width="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1 block">Judul</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="cth: Jumlah Dua Angka" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1 block">Kursus</label>
              <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl">
                <option value="">Tanpa kursus</option>
                {courses.map((c: any) => <option key={c.id} value={c.id}>{c.subject?.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1 block">Deskripsi (format: <b>input</b> → <b>output</b>)</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Baca dua integer a dan b, lalu cetak hasil a+b..." className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1 block">Sulit</label>
              <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl">
                {Object.keys(DIFF).map(d => <option key={d} value={d}>{DIFF[d].label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1 block">Bahasa</label>
              <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl">
                {['PYTHON', 'JAVASCRIPT', 'CPP', 'JAVA'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1 block">Poin</label>
              <input type="number" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1 block">Skor Max</label>
              <input type="number" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1 block">Draft kode awal (starter)</label>
            <textarea value={form.starterCode} onChange={(e) => setForm({ ...form, starterCode: e.target.value })} rows={3} placeholder="def solve():" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl font-mono" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1 block">Test cases — satu baris berarti 1 kasus, format: <b>input|harapan</b> (pakai \n untuk baris</label>
            <textarea value={form.testCasesStr} onChange={(e) => setForm({ ...form, testCasesStr: e.target.value })} rows={3} placeholder={'1 2|3\n3 4|7'} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl font-mono" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleCreate} disabled={saving} className="flex-1 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-60">{saving ? 'Menyimpan...' : 'Simpan Challenge'}</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Batal</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Hapus Challenge?" description={'"' + (deleteTarget?.title || '') + '" akan dihapus.'} confirmText="Hapus" />
    </div>
  );
};