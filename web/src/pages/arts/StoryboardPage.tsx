import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { Clapperboard, Plus, Trash2, Loader2, ImagePlus, Edit3, Film, Send } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';
import { Modal } from '../../components/ui/Modal';

export const StoryboardPage = () => {
  const { user } = useAuthStore();
  const isTeacher = user?.role?.slug === 'teacher' || user?.role?.slug === 'admin';
  const [boards, setBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [active, setActive] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showFrame, setShowFrame] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', genre: '', script: '' });
  const [frameForm, setFrameForm] = useState({ sceneLabel: '', description: '', dialogue: '' });
  const [frameFile, setFrameFile] = useState<any>(null);
  const [scriptDraft, setScriptDraft] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(false);
    try { const r = await api.get('/arts/storyboards'); setBoards(r.data || []); } catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createBoard = async () => {
    if (!form.title) return alert('Judul wajib');
    setSaving(true);
    try { const r = await api.post('/arts/storyboards', form); setShowCreate(false); setForm({ title: '', description: '', genre: '', script: '' }); await fetchAll(); const b = await api.get('/arts/storyboards'); const created = (b.data || []).find((x: any) => x.id === r.data.id); setActive(created); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal'); } finally { setSaving(false); }
  };

  const openBoard = (b: any) => { setActive(b); setScriptDraft(b.script || ''); };

  const addFrame = async () => {
    if (!frameForm.sceneLabel && !frameForm.description) return alert('Isi sketsa adegan dulu');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('sceneLabel', frameForm.sceneLabel); fd.append('description', frameForm.description); fd.append('dialogue', frameForm.dialogue);
      if (frameFile) fd.append('image', frameFile);
      await api.post(`/arts/storyboards/${active.id}/frames`, fd);
      setShowFrame(false); setFrameForm({ sceneLabel: '', description: '', dialogue: '' }); setFrameFile(null);
      const r = await api.get('/arts/storyboards'); setActive((r.data || []).find((x: any) => x.id === active.id));
    } catch (e: any) { alert(e?.response?.data?.error || 'Gagal'); } finally { setSaving(false); }
  };

  const saveScript = async () => {
    setSaving(true);
    try { await api.put(`/arts/storyboards/${active.id}`, { script: scriptDraft }); setActive({ ...active, script: scriptDraft }); alert('Naskah tersimpan!'); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal'); } finally { setSaving(false); }
  };

  const deleteFrame = async (frameId: string) => {
    if (!confirm('Hapus frame ini?')) return;
    try { await api.delete(`/arts/storyboards/${active.id}/frames/${frameId}`); const r = await api.get('/arts/storyboards'); setActive((r.data || []).find((x: any) => x.id === active.id)); } catch { alert('Gagal'); }
  };

  const deleteBoard = async (id: string) => {
    if (!confirm('Hapus storyboard?')) return;
    try { await api.delete(`/arts/storyboards/${id}`); if (active?.id === id) setActive(null); fetchAll(); } catch { alert('Gagal'); }
  };

  if (loading) return <div className="max-w-6xl mx-auto p-6"><SkeletonList /></div>;
  if (error) return <div className="max-w-6xl mx-auto p-6"><ErrorState message="Gagal memuat storyboard." onRetry={fetchAll} /></div>;

  if (active) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4">
        <BackButton to="/dashboard/study/seni-budaya" label="Kembali ke Seni Budaya" />
        <button onClick={() => setActive(null)} className="text-sm font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1">← Kembali ke daftar</button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2"><Clapperboard size={28} className="text-orange-600" /> {active.title}</h2><p className="text-sm text-gray-600 mt-1">{active.genre ? `Genre: ${active.genre}` : 'Storyboard kolaboratif'} · {active.frames?.length || 0} frame</p></div>
          <div className="flex gap-2">
            <button onClick={() => setShowFrame(true)} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"><Plus size={16} /> Frame</button>
            {isTeacher && <button onClick={() => deleteBoard(active.id)} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-100"><Trash2 size={16} /> Hapus</button>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Frames board */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Film size={14} /> Papan Storyboard</h3>
            {active.frames?.length === 0 && <EmptyState title="Belum ada frame" description="Tambahkan sketsa adegan pertama." />}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {active.frames?.map((f: any, i: number) => (
                <div key={f.id} className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="aspect-video bg-gray-50 flex items-center justify-center relative">
                    <span className="absolute top-2 left-2 text-[10px] font-bold bg-orange-600 text-white px-2 py-0.5 rounded-full">{i + 1}</span>
                    {f.imageFileUrl ? <img src={f.imageFileUrl} alt={f.sceneLabel} className="w-full h-full object-cover" /> : <Film size={32} className="text-gray-200" />}
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="text-sm font-semibold text-gray-900">{f.sceneLabel || `Frame ${i + 1}`}</div>
                    {f.description && <p className="text-xs text-gray-600">{f.description}</p>}
                    {f.dialogue && <div className="text-xs italic text-indigo-600">🗣 {f.dialogue}</div>}
                    <button onClick={() => deleteFrame(f.id)} className="text-[10px] text-red-400 hover:text-red-600">Hapus frame</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Collaborative script */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Edit3 size={14} /> Naskah Kolaboratif</h3>
            <p className="text-xs text-gray-400">Tulis naskah bersama teman kelompok. Setiap orang bisa mengedit.</p>
            <textarea value={scriptDraft} onChange={(e) => setScriptDraft(e.target.value)} placeholder="Adegan 1: …" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl min-h-[280px]" />
            <button onClick={saveScript} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-xl text-sm font-semibold">{saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Simpan Naskah</button>
          </div>
        </div>

        {showFrame && (
          <Modal isOpen={showFrame} title="Tambah Frame Adegan" onClose={() => setShowFrame(false)}>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-xl p-3 cursor-pointer"><ImagePlus size={18} className="text-orange-600" /> {frameFile ? frameFile.name : 'Unggah sketsa visual (opsional)'} <input type="file" accept="image/*" className="hidden" onChange={(e) => setFrameFile(e.target.files?.[0])} /></label>
              <input value={frameForm.sceneLabel} onChange={(e) => setFrameForm({ ...frameForm, sceneLabel: e.target.value })} placeholder="Scene 1, Shot A" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
              <textarea value={frameForm.description} onChange={(e) => setFrameForm({ ...frameForm, description: e.target.value })} placeholder="Deskripsi visual adegan / blocking" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={3} />
              <textarea value={frameForm.dialogue} onChange={(e) => setFrameForm({ ...frameForm, dialogue: e.target.value })} placeholder="Dialog / catatan aktor" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={2} />
              <button onClick={addFrame} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-xl text-sm font-semibold"><Plus size={16} /> Tambah Frame</button>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4">
      <BackButton to="/dashboard/study/seni-budaya" label="Kembali ke Seni Budaya" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2"><Clapperboard size={28} className="text-orange-600" /> Digital Storyboard Kolaboratif</h2><p className="text-sm text-gray-600 mt-1">Susun naskah & rancang storyboard adegan secara bersama.</p></div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"><Plus size={16} /> Storyboard</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {boards.length === 0 && <div className="md:col-span-3"><EmptyState title="Belum ada storyboard" description="Buat proyek drama/tari kelompokmu." /></div>}
        {boards.map((b) => (
          <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2 cursor-pointer hover:border-orange-200 hover:shadow transition" onClick={() => openBoard(b)}>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">{b.title}</h4>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${b.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{b.status}</span>
            </div>
            {b.genre && <div className="text-xs text-gray-400">Genre: {b.genre}</div>}
            <div className="text-xs text-gray-500">{b.frames?.length || 0} frame · {b.script ? `${b.script.length} karakter naskah` : 'Naskah belum dimulai'}</div>
            {b.description && <p className="text-xs text-gray-400 line-clamp-2">{b.description}</p>}
          </div>
        ))}
      </div>

      {showCreate && (
        <Modal isOpen={showCreate} title="Storyboard Baru" onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Judul proyek (cth: Pementasan Malin Kundang)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} placeholder="Genre (Drama, Komedi, Tari…)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi proyek" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={2} />
            <textarea value={form.script} onChange={(e) => setForm({ ...form, script: e.target.value })} placeholder="Naskah awal (opsional)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={3} />
            <button onClick={createBoard} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-xl text-sm font-semibold"><Plus size={16} /> Buat</button>
          </div>
        </Modal>
      )}
    </div>
  );
};