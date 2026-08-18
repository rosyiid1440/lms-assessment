import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/axios';
import { FlaskConical, Plus, TestTube, Mic, Ruler, Gauge, Trash2, List, ClipboardList } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';
import { Modal } from '../../components/ui/Modal';
import { useAuthStore } from '../../stores/authStore';

const INSTRUMENT_OPTIONS = [
  { name: 'Stopwatch', unit: 'detik', icon: '⏱' },
  { name: 'Amperemeter', unit: 'A', icon: '⚡' },
  { name: 'Jangka Sorong', unit: 'mm', icon: '🔧' },
  { name: 'Termometer', unit: '°C', icon: '🌡' },
  { name: 'Busur Derajat', unit: '°', icon: '📐' },
  { name: 'Neraca', unit: 'kg', icon: '⚖️' },
];

export const VirtualLab = () => {
  const { user } = useAuthStore();
  const isTeacher = user?.role?.slug === 'teacher' || user?.role?.slug === 'admin';
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ title: '', description: '', topic: '', instrumentsStr: '', stepsStr: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(false);
    try { const res = await api.get('/physics/labs'); setLabs(res.data.data || []); } catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async () => {
    if (!form.title) return alert('Judul wajib diisi');
    setSaving(true);
    try {
      const instruments = form.instrumentsStr.split('\n').filter(Boolean).map((s: string) => ({ name: s.split(':')[0].trim(), unit: s.split(':')[1]?.trim() || '' }));
      const steps = form.stepsStr.split('\n').filter(Boolean);
      await api.post('/physics/labs', { title: form.title, description: form.description, topic: form.topic, instruments, steps });
      setShowForm(false); setForm({ title: '', description: '', topic: '', instrumentsStr: '', stepsStr: '' }); fetchAll();
    } catch (e: any) { alert(e?.response?.data?.error || 'Gagal membuat lab'); } finally { setSaving(false); }
  };

  if (error) return <ErrorState message="Gagal memuat virtual lab." onRetry={fetchAll} />;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <BackButton to="/dashboard/study/fisika" label="Kembali ke Fisika" />
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2"><FlaskConical size={28} className="text-primary-600" /> Laboratorium Virtual</h2>
          <p className="text-sm text-gray-600 mt-1">Eksperimen berbasis web dengan alat ukur digital.</p>
        </div>
        {isTeacher && <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700"><Plus size={18} /> Buat Lab</button>}
      </div>

      {loading ? <SkeletonList count={3} /> : labs.length === 0 ? (
        <EmptyState icon={FlaskConical} title="Belum ada lab" description="Guru dapat membuat eksperimen virtual." className="py-24" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {labs.map((l) => (
            <div key={l.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center"><FlaskConical size={20} /></div>
                  <div>
                    <h3 className="font-bold text-gray-900">{l.title}</h3>
                    {l.topic && <p className="text-xs text-gray-400">{l.topic}</p>}
                  </div>
                  {isTeacher && <button onClick={async () => { try { await api.delete('/physics/labs'); } catch {} }} className="ml-auto text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>}
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{l.description}</p>
                {Array.isArray(l.instruments) && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {l.instruments.slice(0, 4).map((ins: any, i: number) => (
                      <span key={i} className="px-2 py-1 text-[10px] font-bold bg-gray-100 text-gray-600 rounded-md">{ins.icon || '🔬'} {ins.name}{ins.unit ? ` (${ins.unit})` : ''}</span>
                    ))}
                  </div>
                )}
                <button onClick={() => setOpen(open === l.id ? null : l.id)} className="flex items-center gap-2 text-xs font-bold text-primary-600 hover:text-primary-700">
                  <ClipboardList size={14} /> {open === l.id ? 'Tutup langkah' : 'Lihat prosedur'}
                </button>
                {open === l.id && Array.isArray(l.procedure) && (
                  <ol className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                    {l.procedure.map((s: string, i: number) => <li key={i} className="text-sm text-gray-600 flex gap-2"><span className="font-bold text-primary-600">{i + 1}.</span>{s}</li>)}
                  </ol>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Buat Eksperimen Virtual" width="max-w-2xl">
        <div className="space-y-4">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Judul lab" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl" />
          <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Topik (cth: Kinematika, Listrik Statis)" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Tujuan & deskripsi eksperimen..." className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl" />
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1 block">Alat ukur (satu per baris: Nama:Satuan)</label>
            <textarea value={form.instrumentsStr} onChange={(e) => setForm({ ...form, instrumentsStr: e.target.value })} rows={3} placeholder={'Stopwatch:s\nAmperemeter:A\nJangka Sorong:mm'} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl font-mono" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1 block">Langkah prosedur (satu per baris)</label>
            <textarea value={form.stepsStr} onChange={(e) => setForm({ ...form, stepsStr: e.target.value })} rows={4} placeholder={'1. Siapkan ...\n2. Ukur ...\n3. Catat hasil'} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl" />
          </div>
          <button onClick={handleCreate} disabled={saving} className="w-full px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl disabled:opacity-60">{saving ? 'Menyimpan...' : 'Simpan Lab'}</button>
        </div>
      </Modal>
    </div>
  );
};