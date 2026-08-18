import React, { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../../lib/axios';
import { Play, Pause, Video, Plus, CheckCircle2, X, Film, HelpCircle } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';
import { Modal } from '../../components/ui/Modal';
import { useAuthStore } from '../../stores/authStore';

export const VideoNotes = () => {
  const { user } = useAuthStore();
  const isTeacher = user?.role?.slug === 'teacher' || user?.role?.slug === 'admin';
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [active, setActive] = useState<any>(null);
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);
  const [qResult, setQResult] = useState<boolean | null>(null);
  const [paused, setPaused] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ title: '', description: '', videoUrl: '', quizzesStr: '' });
  const [answered, setAnswered] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const answeredRef = useRef<string[]>([]);
  answeredRef.current = answered;

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(false);
    try { const res = await api.get('/physics/videos'); setVideos(res.data.data || []); } catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async () => {
    if (!form.title || !form.videoUrl) return alert('Judul dan URL video wajib');
    setSaving(true);
    try {
      const quizzes = form.quizzesStr.split('\n').filter(Boolean).map((l: string) => {
        const parts = l.split('|');
        return { timeSec: parseFloat(parts[0]) || 0, question: parts[1] || '', options: parts[2]?.split(',') || [], correct: parseInt(parts[3]) - 1, explain: parts[4] || '' };
      });
      await api.post('/physics/videos', { title: form.title, description: form.description, videoUrl: form.videoUrl, quizzes });
      setShowForm(false); setForm({ title: '', description: '', videoUrl: '', quizzesStr: '' }); fetchAll();
    } catch (e: any) { alert(e?.response?.data?.error || 'Gagal simpan video'); } finally { setSaving(false); }
  };

  const onTime = () => {
    const v = videoRef.current; if (!v) return;
    const t = v.currentTime;
    for (const q of active?.quizzes || []) {
      const key = `${q.timeSec}-${q.question}`;
      if (answeredRef.current.includes(key)) continue;
      if (t >= q.timeSec && t < q.timeSec + 0.6) { setPaused(true); v.pause(); setCurrentQuiz(q); setQResult(null); setAnswered(a => [...a, key]); return; }
    }
  };

  const answer = (choice: number) => {
    const correct = currentQuiz.correct;
    setQResult(choice === correct);
  };
  const resume = () => {
    if (videoRef.current) { videoRef.current.play(); setPaused(false); setCurrentQuiz(null); }
  };

  if (error) return <ErrorState message="Gagal memuat video." onRetry={fetchAll} />;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <BackButton to="/dashboard/study/fisika" label="Kembali ke Fisika" />
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2"><Video size={28} className="text-primary-600" /> Video Pembelajaran Interaktif</h2>
          <p className="text-sm text-gray-600 mt-1">Video berhenti otomatis di detik tertentu dan menampilkan kuis pemahaman.</p>
        </div>
        {isTeacher && <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700"><Plus size={18} /> Buat Video</button>}
      </div>

      {loading ? <SkeletonList count={3} /> : videos.length === 0 ? (
        <EmptyState icon={Video} title="Belum ada video" description={isTeacher ? 'Buat video dengan kuis tertanam.' : 'Guru belum menambahkan video.'} className="py-24" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map((v) => (
            <div key={v.id} onClick={() => { setActive(v); setAnswered([]); }} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-xl transition-all">
              <div className="h-36 bg-gray-900 flex items-center justify-center relative">
                <Film className="text-gray-500" size={40} />
                <span className="absolute inset-0 flex items-center justify-center"><span className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center text-primary-600"><Play size={20} /></span></span>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-1">{v.title}</h3>
                <p className="text-xs text-gray-400 line-clamp-1">{v.description}</p>
                {Array.isArray(v.quizzes) && v.quizzes.length > 0 && (
                  <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-primary-600 bg-primary-50 rounded-md px-2 py-1"><HelpCircle size={11} /> {v.quizzes.length} kuis tertanam</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video player modal */}
      <Modal isOpen={!!active} onClose={() => setActive(null)} title={active?.title} width="max-w-3xl">
        {active && (
          <div className="space-y-3">
            <video ref={videoRef} key={active.id} className="w-full rounded-xl bg-black aspect-video" controls onTimeUpdate={onTime} src={active.videoUrl} />
            <p className="text-sm text-gray-600">{active.description}</p>
            {currentQuiz && (
              <div className="bg-primary-50 rounded-xl p-4 space-y-3 border border-primary-100">
                <p className="font-bold text-gray-800 flex items-center gap-2"><HelpCircle size={16} className="text-primary-600" /> {currentQuiz.question}</p>
                <div className="grid gap-2">
                  {(currentQuiz.options || []).map((opt: string, i: number) => (
                    <button key={i} disabled={qResult != null} onClick={() => answer(i)}
                      className={`text-left px-3 py-2 text-sm rounded-xl border transition-colors ${qResult == null ? 'bg-white border-gray-200 hover:bg-primary-50 hover:border-primary-300' : qResult && i === currentQuiz.correct ? 'bg-green-50 border-green-300 text-green-800' : 'bg-white border-gray-200 text-gray-400'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
                {qResult != null && (
                  <div>
                    <p className={`text-sm font-bold ${qResult ? 'text-green-700' : 'text-red-600'}`}>{qResult ? 'Benar!' : 'Tidak tepat.'}</p>
                    {currentQuiz.explain && <p className="text-xs text-gray-600 mt-1">{currentQuiz.explain}</p>}
                    <button onClick={resume} className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg"><Play size={12} /> Lanjutkan video</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Buat Video Kuis" width="max-w-2xl">
        <div className="space-y-4">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Judul video" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl" />
          <input value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="URL video (mp4/YouTube embed)" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Deskripsi..." className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl" />
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1 block">Kuis — satu baris: <b>detik|pertanyaan|opsi(koma)|jawabanBenar|penjelasan</b></label>
            <textarea value={form.quizzesStr} onChange={(e) => setForm({ ...form, quizzesStr: e.target.value })} rows={5} placeholder={'5|Ke arah mana gaya gesek saat roda berputar ke kanan?|Kiri,Kanan,Ke atas,Ke bawah|1|Gaya gesek melawan arah gerak\n15|Berapa percepatan gravitasi?|9.8,10,12,15|1|Nilai standar 9.8 m/s²'} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl font-mono" />
          </div>
          <button onClick={handleCreate} disabled={saving} className="w-full px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl disabled:opacity-60">{saving ? 'Menyimpan...' : 'Simpan Video'}</button>
        </div>
      </Modal>
    </div>
  );
};