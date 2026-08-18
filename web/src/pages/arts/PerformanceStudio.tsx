import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { Music, Mic, Square, Video, Upload, Play, Pause, Clock, MessageSquarePlus, FileText, Loader2, AudioLines, ListMusic } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';
import { Modal } from '../../components/ui/Modal';

const CAT_META: Record<string, { label: string; emoji: string }> = {
  MUSIK: { label: 'Musik', emoji: '🎵' }, TARI: { label: 'Tari', emoji: '💃' }, TEATER: { label: 'Teater', emoji: '🎭' },
};

const fmt = (sec: number) => {
  const m = Math.floor(sec / 60); const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

// ---------- Studio recorder (audio in-browser) ----------
const StudioRecorder = ({ onComplete }: { onComplete: (blob: Blob, sec: number) => void }) => {
  const [recording, setRecording] = useState(false);
  const [sec, setSec] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<any>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.onstop = () => {
        const b = new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' });
        setBlob(b); setUrl(URL.createObjectURL(b)); onComplete(b, sec);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start(); mediaRef.current = mr; setRecording(true); setSec(0);
      timer.current = setInterval(() => setSec((s) => s + 1), 1000);
    } catch { alert('Tidak dapat mengakses mikrofon.'); }
  };
  const stop = () => { mediaRef.current?.stop(); if (timer.current) clearInterval(timer.current); setRecording(false); };

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
      <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm"><AudioLines size={16} /> Studio Rekaman Audio</div>
      {!recording ? (
        <button onClick={start} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold"><Mic size={16} /> Mulai Rekam</button>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-red-600 font-bold">{fmt(sec)}</span>
          <button onClick={stop} className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold"><Square size={16} /> Stop</button>
        </div>
      )}
      {url && <audio src={url} controls className="w-64" />}
    </div>
  );
};

export const PerformanceStudio = () => {
  const { user } = useAuthStore();
  const isTeacher = user?.role?.slug === 'teacher' || user?.role?.slug === 'admin';
  const [performances, setPerformances] = useState<any[]>([]);
  const [sheets, setSheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<'studio' | 'sheets'>('studio');
  const [showUpload, setShowUpload] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<any>(null);
  const [form, setForm] = useState({ title: '', description: '', category: 'MUSIK', durationSec: '' });
  const [sheetForm, setSheetForm] = useState({ title: '', description: '', sheetType: 'NOT_ANGKA', referenceAudioUrl: '', notesData: '' });
  const [commentFor, setCommentFor] = useState<any>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const [p, s] = await Promise.all([api.get('/arts/performances'), api.get('/arts/sheets')]);
      setPerformances(p.data || []); setSheets(s.data || []);
    } catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRecorded = (blob: Blob, sec: number) => {
    setFile(blob); setForm((f) => ({ ...f, durationSec: String(sec) }));
  };

  const upload = async () => {
    if (!form.title) return alert('Judul wajib');
    if (!file) return alert('Pilih atau rekam media dulu');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title); fd.append('description', form.description); fd.append('category', form.category); fd.append('durationSec', form.durationSec || '0');
      fd.append('media', file, file.name || 'recording.webm');
      await api.post('/arts/performances', fd);
      setShowUpload(false); setForm({ title: '', description: '', category: 'MUSIK', durationSec: '' }); setFile(null); fetchAll();
    } catch (e: any) { alert(e?.response?.data?.error || 'Gagal mengunggah'); } finally { setSaving(false); }
  };

  const createSheet = async () => {
    if (!sheetForm.title) return alert('Judul wajib');
    let notes: any = null;
    if (sheetForm.notesData.trim()) { try { notes = JSON.parse(sheetForm.notesData); } catch { return alert('Format JSON catatan tidak valid'); } }
    setSaving(true);
    try { await api.post('/arts/sheets', { ...sheetForm, notesData: notes }); setShowSheet(false); setSheetForm({ title: '', description: '', sheetType: 'NOT_ANGKA', referenceAudioUrl: '', notesData: '' }); fetchAll(); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal'); } finally { setSaving(false); }
  };

  const addComment = async (perfId: string, timestampSec: number, body: string) => {
    if (!body.trim()) return;
    try { await api.post(`/arts/performances/${perfId}/comments`, { timestampSec, body }); setCommentFor(null); fetchAll(); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal'); }
  };

  const togglePlay = (url: string) => {
    if (playing === url) { videoRef.current?.pause(); audioRef.current?.pause(); setPlaying(null); return; }
    if (videoRef.current) videoRef.current.pause();
    if (audioRef.current) audioRef.current.pause();
    setPlaying(url);
  };

  const seekTo = (perf: any, sec: number) => {
    if (videoRef.current && perf.mediaFileUrl) { videoRef.current.currentTime = sec; videoRef.current.play(); }
    if (audioRef.current && perf.mediaFileUrl) { audioRef.current.currentTime = sec; audioRef.current.play(); }
  };

  if (loading) return <div className="max-w-6xl mx-auto p-6"><SkeletonList /></div>;
  if (error) return <div className="max-w-6xl mx-auto p-6"><ErrorState message="Gagal memuat studio." onRetry={fetchAll} /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4">
      <BackButton to="/dashboard/study/seni-budaya" label="Kembali ke Seni Budaya" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2"><Music size={28} className="text-indigo-600" /> Studio Musik, Tari & Teater</h2><p className="text-sm text-gray-600 mt-1">Rekam penampilan, terima umpan balik per detik, dan baca partitur interaktif.</p></div>
        <div className="flex gap-2">
          {!isTeacher && <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"><Upload size={16} /> Unggah</button>}
          {isTeacher && <button onClick={() => setShowSheet(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"><FileText size={16} /> Partitur</button>}
        </div>
      </div>

      <div className="flex gap-2 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm w-fit">
        <button onClick={() => setTab('studio')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold ${tab === 'studio' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}><Video size={15} /> Penampilan</button>
        <button onClick={() => setTab('sheets')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold ${tab === 'sheets' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}><ListMusic size={15} /> Partitur</button>
      </div>

      {tab === 'studio' && (
        <div className="grid grid-cols-1 gap-5">
          {performances.length === 0 && <EmptyState title="Belum ada penampilan" description="Unggah atau rekam penampilanmu untuk mulai." />}
          {performances.map((perf) => (
            <div key={perf.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900 flex items-center gap-2">{CAT_META[perf.category]?.emoji} {perf.title}</div>
                  <div className="text-xs text-gray-400">{CAT_META[perf.category]?.label} · {fmt(perf.durationSec || 0)}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${perf.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{perf.status}</span>
              </div>
              {perf.mediaFileUrl && (
                <div className="space-y-2">
                  {perf.category === 'TARI' || perf.category === 'TEATER' ? (
                    <>
                      <video key={perf.mediaFileUrl} ref={videoRef} src={perf.mediaFileUrl} controls className="w-full rounded-xl bg-black max-h-72" onPlay={() => setPlaying(perf.mediaFileUrl)} />
                      {isTeacher && <button onClick={() => setCommentFor(perf)} className="flex items-center gap-1.5 bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-violet-100"><MessageSquarePlus size={14} /> Tambah komentar per detik</button>}
                    </>
                  ) : (
                    <audio src={perf.mediaFileUrl} ref={audioRef} controls className="w-full" onPlay={() => setPlaying(perf.mediaFileUrl)} />
                  )}
                </div>
              )}
              {perf.timeComments?.length > 0 && (
                <div className="space-y-2 bg-amber-50/60 rounded-xl p-3">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Clock size={12} /> Umpan balik guru per detik</div>
                  {perf.timeComments.map((c: any) => (
                    <div key={c.id} className="flex gap-2 items-start">
                      <button onClick={() => seekTo(perf, c.timestampSec)} className="shrink-0 text-xs font-mono bg-amber-600 text-white px-2 py-1 rounded-lg hover:bg-amber-700">{fmt(c.timestampSec)}</button>
                      <div className="text-sm text-gray-700">{c.body}</div>
                    </div>
                  ))}
                </div>
              )}
              {commentFor?.id === perf.id && (
                <TimeCommentForm perf={perf} onAdd={addComment} />
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'sheets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sheets.length === 0 && <div className="md:col-span-2"><EmptyState title="Belum ada partitur" description="Guru bisa menambahkan partitur interaktif." /></div>}
          {sheets.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between"><h4 className="font-semibold text-gray-900">{s.title}</h4><span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{s.sheetType}</span></div>
              <p className="text-xs text-gray-500">{s.description || 'Tanpa deskripsi'}</p>
              {s.referenceAudioUrl && <button onClick={() => togglePlay(s.referenceAudioUrl)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-sm font-semibold">{playing === s.referenceAudioUrl ? <Pause size={15} /> : <Play size={15} />} Dengarkan nada referensi</button>}
              <SheetViewer sheet={s} />
              {isTeacher && <button onClick={async () => { if (confirm('Hapus partitur?')) { await api.delete(`/arts/sheets/${s.id}`); fetchAll(); } }} className="text-xs text-red-500">Hapus</button>}
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <Modal isOpen={showUpload} title="Unggah / Rekam Penampilan" onClose={() => setShowUpload(false)} width="max-w-lg">
          <div className="space-y-3">
            <StudioRecorder onComplete={handleRecorded} />
            <label className="flex items-center gap-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-xl p-3 cursor-pointer"><Video size={18} className="text-indigo-600" /> {file && file.name ? file.name : '…atau unggah file video/audio'} <input type="file" accept="video/*,audio/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0])} /></label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Judul penampilan" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl">{Object.entries(CAT_META).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}</select>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={2} />
            <button onClick={upload} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold">{saving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Unggah</button>
          </div>
        </Modal>
      )}

      {showSheet && (
        <Modal isOpen={showSheet} title="Partitur Baru" onClose={() => setShowSheet(false)} width="max-w-lg">
          <div className="space-y-3">
            <input value={sheetForm.title} onChange={(e) => setSheetForm({ ...sheetForm, title: e.target.value })} placeholder="Judul lagu" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <select value={sheetForm.sheetType} onChange={(e) => setSheetForm({ ...sheetForm, sheetType: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"><option value="NOT_ANGKA">Not Angka</option><option value="NOT_BALOK">Not Balok</option><option value="TABLATUR">Tablatur</option></select>
            <input value={sheetForm.referenceAudioUrl} onChange={(e) => setSheetForm({ ...sheetForm, referenceAudioUrl: e.target.value })} placeholder="URL audio referensi" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <textarea value={sheetForm.notesData} onChange={(e) => setSheetForm({ ...sheetForm, notesData: e.target.value })} placeholder={`Format JSON nada:\n[{"beat":1,"note":"C4","duration":0.5},{"beat":2,"note":"E4","duration":0.5}]`} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl font-mono" rows={4} />
            <button onClick={createSheet} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold"><FileText size={16} /> Simpan</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const TimeCommentForm = ({ perf, onAdd }: { perf: any; onAdd: (id: string, sec: number, body: string) => void }) => {
  const [sec, setSec] = useState(0);
  const [body, setBody] = useState('');
  return (
    <div className="flex flex-col sm:flex-row gap-2 bg-white border border-violet-100 rounded-xl p-3">
      <div className="flex items-center gap-2">
        <Clock size={14} className="text-violet-500" />
        <input type="number" min={0} value={sec} onChange={(e) => setSec(parseInt(e.target.value) || 0)} className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-lg" />
        <span className="text-xs text-gray-400">detik ({fmt(sec)})</span>
      </div>
      <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Catatan pada detik ini…" className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg" />
      <button onClick={() => onAdd(perf.id, sec, body)} className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold">Kirim</button>
    </div>
  );
};

// ---------- Interactive sheet music renderer ----------
const NOTE_PITCH: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const NOTE_NAMES_ID: string[] = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si'];

const SheetViewer = ({ sheet }: { sheet: any }) => {
  const notes: any[] = Array.isArray(sheet.notesData) ? sheet.notesData : [];
  if (notes.length === 0) return <div className="text-xs text-gray-400 italic">Belum ada notasi.</div>;
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <div className="flex items-end gap-2 p-3 bg-gray-50 rounded-xl min-w-max">
          {notes.map((n, i) => {
            const pitch = n.note ? (NOTE_PITCH[n.note[0]] ?? 0) : 0;
            const solfege = NOTE_NAMES_ID[pitch % 7];
            const len = Math.max(28, (n.duration || 0.5) * 48);
            return (
              <div key={i} className="flex flex-col items-center" style={{ width: len }}>
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">{solfege}</div>
                <div className="text-[10px] text-gray-400 mt-1">{n.note || '?'}</div>
                <div className="text-[10px] text-gray-500 mt-0.5 font-mono">{n.duration || 0.5}·</div>
              </div>
            );
          })}
        </div>
      </div>
      {sheet.notesData?.length > 0 && <div className="text-xs text-gray-400">Beat: {notes.map((n) => n.beat).join(' · ')}</div>}
    </div>
  );
};