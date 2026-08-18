import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { BookOpen, Mic, Square, Play, Pause, CheckCircle2, Trash2, Plus, Target, Award, Headphones, Loader2 } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';
import { Modal } from '../../components/ui/Modal';

const STATUS_STYLE: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-700',
  SUBMITTED: 'bg-amber-100 text-amber-700',
  REVIEWED: 'bg-blue-100 text-blue-700',
  RETURNED: 'bg-red-100 text-red-700',
};

export const TahfidzPage = () => {
  const { user } = useAuthStore();
  const isTeacher = user?.role?.slug === 'teacher' || user?.role?.slug === 'admin';
  const [targets, setTargets] = useState<any[]>([]);
  const [recitations, setRecitations] = useState<any[]>([]);
  const [murottal, setMurottal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // teacher create form
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', surah: '', surahType: 'SURAH', targetAyat: 1 });
  const [saving, setSaving] = useState(false);

  // student recording
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [recUrl, setRecUrl] = useState<string | null>(null);
  const [ayatProgress, setAyatProgress] = useState(0);
  const [studentComment, setStudentComment] = useState('');
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const [t, r, m] = await Promise.all([api.get('/pai/tahfidz-targets'), api.get('/pai/recitations'), api.get('/pai/murottal')]);
      setTargets(t.data || []);
      setRecitations(r.data || []);
      setMurottal(m.data || []);
    } catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createTarget = async () => {
    if (!form.title || !form.surah) return alert('Judul dan surah wajib');
    setSaving(true);
    try { await api.post('/pai/tahfidz-targets', form); setShowCreate(false); setForm({ title: '', description: '', surah: '', surahType: 'SURAH', targetAyat: 1 }); fetchAll(); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal membuat target'); } finally { setSaving(false); }
  };

  const deleteTarget = async (id: string) => {
    if (!confirm('Hapus target hafalan ini?')) return;
    try { await api.delete(`/pai/tahfidz-targets/${id}`); fetchAll(); } catch { alert('Gagal menghapus'); }
  };

  const startRecording = async () => {
    if (!selectedTarget) return alert('Pilih target hafalan dulu');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        setBlob(b); setRecUrl(URL.createObjectURL(b));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start(); mediaRef.current = mr;
      setRecording(true); setRecSec(0);
      timerRef.current = setInterval(() => setRecSec((s) => s + 1), 1000);
    } catch { alert('Tidak dapat mengakses mikrofon.'); }
  };
  const stopRecording = () => { mediaRef.current?.stop(); if (timerRef.current) clearInterval(timerRef.current); setRecording(false); };

  const submitRecording = async () => {
    if (!blob || !selectedTarget) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('audio', blob, 'recording.webm');
      fd.append('targetId', selectedTarget);
      fd.append('recordingDurationSec', String(recSec));
      fd.append('ayatProgress', String(ayatProgress));
      if (studentComment) fd.append('studentComment', studentComment);
      await api.post('/pai/recitations', fd);
      setBlob(null); setRecUrl(null); setStudentComment('');
      fetchAll(); alert('Hafalan terkirim untuk dinilai!');
    } catch (e: any) { alert(e?.response?.data?.error || 'Gagal mengirim'); } finally { setSaving(false); }
  };

  const gradeRec = async (rec: any, score: number, status: string) => {
    try { await api.post(`/pai/recitations/${rec.id}/grade`, { score, status, comment: rec.comment || 'Sudah dinilai' }); fetchAll(); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal menilai'); }
  };

  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const togglePlay = (url: string) => {
    if (playing === url) { audioRef.current?.pause(); setPlaying(null); return; }
    if (audioRef.current) audioRef.current.pause();
    audioRef.current = new Audio(url);
    audioRef.current.onended = () => setPlaying(null);
    audioRef.current.play();
    setPlaying(url);
  };

  if (loading) return <div className="max-w-7xl mx-auto p-6"><SkeletonList /></div>;
  if (error) return <div className="max-w-7xl mx-auto p-6"><ErrorState message="Gagal memuat data tahfidz." onRetry={fetchAll} /></div>;

  const myRecs = recitations.filter((r) => r.targetId === selectedTarget);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 px-4">
      <BackButton to="/dashboard/study/pai" label="Kembali ke PAI" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2"><BookOpen size={28} className="text-emerald-600" /> Tahfidz & Murajaah</h2>
          <p className="text-sm text-gray-600 mt-1">Setor hafalan lewat rekaman suara, pantau progres hafalan Juz 30.</p>
        </div>
        {isTeacher && <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm"><Plus size={16} /> Target Baru</button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Target list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Target size={14} /> Target Hafalan</h3>
          {targets.length === 0 && <EmptyState title="Belum ada target hafalan. Guru bisa menambah target baru." description="" />}
          {targets.map((t) => {
            const rec = recitations.find((r) => r.targetId === t.id);
            const done = rec?.status === 'APPROVED';
            return (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-emerald-200 transition cursor-pointer" onClick={() => setSelectedTarget(t.id)}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${done ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>{done ? <CheckCircle2 size={20} /> : <BookOpen size={20} />}</div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-sm">{t.title}</div>
                  <div className="text-xs text-gray-500">{t.surah} · target {t.targetAyat} ayat</div>
                  {rec && <div className="text-xs mt-0.5"><span className={`px-1.5 py-0.5 rounded-full ${STATUS_STYLE[rec.status] || 'bg-gray-100 text-gray-600'}`}>{rec.status}</span>{rec.score !== null && <span className="ml-2 font-bold text-emerald-600">{rec.score}</span>}</div>}
                </div>
                {isTeacher && <button onClick={(e) => { e.stopPropagation(); deleteTarget(t.id); }} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>}
              </div>
            );
          })}
        </div>

        {/* Recording panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Mic size={14} /> Setor Hafalan</h3>
          <select value={selectedTarget} onChange={(e) => setSelectedTarget(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl">
            <option value="">Pilih target hafalan…</option>
            {targets.map((t) => <option key={t.id} value={t.id}>{t.surah}</option>)}
          </select>
          {selectedTarget && (
            <div className="space-y-3">
              <input type="number" min={0} value={ayatProgress} onChange={(e) => setAyatProgress(parseInt(e.target.value) || 0)} placeholder="Jumlah ayat disetorkan" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
              <textarea value={studentComment} onChange={(e) => setStudentComment(e.target.value)} placeholder="Catatan (opsional)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={2} />
              {!recording ? (
                <button onClick={startRecording} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-semibold"><Mic size={16} /> Mulai Rekam</button>
              ) : (
                <button onClick={stopRecording} className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white py-2.5 rounded-xl text-sm font-semibold"><Square size={16} /> Stop ({recSec}s)</button>
              )}
              {recUrl && (
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl">
                  <button onClick={() => togglePlay(recUrl)} className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">{playing === recUrl ? <Pause size={14} /> : <Play size={14} />}</button>
                  <audio src={recUrl} className="hidden" />
                  <span className="text-xs text-gray-600 flex-1">Rekaman siap ({recSec}s)</span>
                  <button onClick={submitRecording} disabled={saving} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">{saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Kirim</button>
                </div>
              )}
              {myRecs.length > 0 && (
                <div className="text-xs text-gray-500">
                  Status terakhir:{' '}
                  <span className={`px-1.5 py-0.5 rounded-full ${STATUS_STYLE[myRecs[myRecs.length - 1].status] || 'bg-gray-100'}`}>{myRecs[myRecs.length - 1].status}</span>
                  {myRecs[myRecs.length - 1].comment && <div className="mt-1 italic">{myRecs[myRecs.length - 1].comment}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Murottal library */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Headphones size={14} /> Perpustakaan Murottal</h3>
        {murottal.length === 0 && <EmptyState title="Belum ada murottal." description="" />}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {murottal.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
              <button onClick={() => togglePlay(m.url)} className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">{playing === m.url ? <Pause size={16} /> : <Play size={16} />}</button>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{m.title}</div>
                <div className="text-xs text-gray-500">{m.surah} · {m.qari}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Teacher review table */}
      {isTeacher && recitations.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Award size={14} /> Penilaian Setoran</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100"><th className="py-2 pr-3">Siswa</th><th className="py-2 pr-3">Target</th><th className="py-2 pr-3">Durasi</th><th className="py-2 pr-3">Status</th><th className="py-2">Aksi</th></tr></thead>
              <tbody>
                {recitations.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-2 pr-3 text-gray-800">{r.studentId}</td>
                    <td className="py-2 pr-3 text-gray-500">{r.target?.surah}</td>
                    <td className="py-2 pr-3 text-gray-500">{r.recordingDurationSec ?? 0}s</td>
                    <td className="py-2 pr-3"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_STYLE[r.status] || 'bg-gray-100'}`}>{r.status}</span></td>
                    <td className="py-2 space-x-1">
                      <button onClick={() => gradeRec(r, 100, 'APPROVED')} className="px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-semibold hover:bg-green-200">Lulus</button>
                      <button onClick={() => gradeRec(r, 60, 'RETURNED')} className="px-2 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200">Revisi</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <Modal isOpen={showCreate} title="Target Hafalan Baru" onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Judul (cth: Hafalan Surat Pendek)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <input value={form.surah} onChange={(e) => setForm({ ...form, surah: e.target.value })} placeholder="Surah & ayat (cth: An-Nas 1-6)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <select value={form.surahType} onChange={(e) => setForm({ ...form, surahType: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl">
              <option value="SURAH">Surah</option><option value="JUZ">Juz</option><option value="AYAT">Ayat</option>
            </select>
            <input type="number" value={form.targetAyat} onChange={(e) => setForm({ ...form, targetAyat: parseInt(e.target.value) || 1 })} placeholder="Target ayat" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={2} />
            <button onClick={createTarget} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold">{saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Simpan</button>
          </div>
        </Modal>
      )}
    </div>
  );
};
