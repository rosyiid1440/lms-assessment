import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { Scale, BookOpen, Plus, Send, Loader2, Award, Lightbulb, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';
import { Modal } from '../../components/ui/Modal';

export const CharacterAssessment = () => {
  const { user } = useAuthStore();
  const isTeacher = user?.role?.slug === 'teacher' || user?.role?.slug === 'admin';
  const [cases, setCases] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<'moral' | 'story'>('moral');
  const [showCase, setShowCase] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [saving, setSaving] = useState(false);
  const [answerText, setAnswerText] = useState<Record<string, string>>({});

  const [caseForm, setCaseForm] = useState({ title: '', scenario: '', guideValues: '' });
  const [quizForm, setQuizForm] = useState({ title: '', description: '', story: '', questions: '' });

  // story quiz state
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const [c, q] = await Promise.all([api.get('/pai/moral-cases'), api.get('/pai/story-quizzes')]);
      setCases(c.data || []); setQuizzes(q.data || []);
    } catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createCase = async () => {
    if (!caseForm.title || !caseForm.scenario) return alert('Judul dan skenario wajib');
    setSaving(true);
    try { await api.post('/pai/moral-cases', caseForm); setShowCase(false); setCaseForm({ title: '', scenario: '', guideValues: '' }); fetchAll(); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal membuat'); } finally { setSaving(false); }
  };

  const createQuiz = async () => {
    if (!quizForm.title || !quizForm.story) return alert('Judul dan cerita wajib');
    let questions: any[] = [];
    try { questions = JSON.parse(quizForm.questions); } catch { return alert('Format soal JSON tidak valid'); }
    setSaving(true);
    try { await api.post('/pai/story-quizzes', { title: quizForm.title, description: quizForm.description, story: quizForm.story, questions }); setShowQuiz(false); setQuizForm({ title: '', description: '', story: '', questions: '' }); fetchAll(); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal'); } finally { setSaving(false); }
  };

  const submitMoral = async (caseId: string) => {
    const answer = answerText[caseId];
    if (!answer?.trim()) return alert('Tulis analisis dulu');
    setSaving(true);
    try { await api.post(`/pai/moral-cases/${caseId}/submit`, { answer }); fetchAll(); alert('Analisis terkirim!'); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal'); } finally { setSaving(false); }
  };

  const startQuiz = (q: any) => {
    setActiveQuiz(q); setCurrentQ(0); setPicked(null); setScore(0); setDone(false);
  };

  const questions = useMemo(() => (activeQuiz?.questions && Array.isArray(activeQuiz.questions) ? activeQuiz.questions : []), [activeQuiz]);
  const q = questions[currentQ];

  const answer = (idx: number) => {
    if (picked !== null) return;
    setPicked(idx);
    if (idx === q.correct) setScore((s) => s + 1);
  };
  const nextQ = () => {
    if (currentQ + 1 >= questions.length) { setDone(true); return; }
    setCurrentQ((c) => c + 1); setPicked(null);
  };

  if (loading) return <div className="max-w-5xl mx-auto p-6"><SkeletonList /></div>;
  if (error) return <div className="max-w-5xl mx-auto p-6"><ErrorState message="Gagal memuat asesmen." onRetry={fetchAll} /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 px-4">
      <BackButton to="/dashboard/study/pai" label="Kembali ke PAI" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2"><Scale size={28} className="text-violet-600" /> Asesmen Karakter</h2>
          <p className="text-sm text-gray-600 mt-1">Analisis kasus moral berdasarkan nilai-nilai Islam + kuis cerita para Nabi.</p>
        </div>
        <div className="flex gap-2">
          {isTeacher && <>
            <button onClick={() => setShowCase(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"><Plus size={16} /> Kasus Moral</button>
            <button onClick={() => setShowQuiz(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"><Plus size={16} /> Kuis Cerita</button>
          </>}
        </div>
      </div>

      <div className="flex gap-2 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm w-fit">
        <button onClick={() => setTab('moral')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold ${tab === 'moral' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}><Scale size={15} /> Kasus Moral</button>
        <button onClick={() => setTab('story')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold ${tab === 'story' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}><BookOpen size={15} /> Kuis Cerita</button>
      </div>

      {tab === 'moral' && (
        <div className="grid grid-cols-1 gap-4">
          {cases.length === 0 && <EmptyState title="Belum ada kasus moral." description="" />}
          {cases.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb size={16} className="text-amber-500" />
                <h3 className="font-semibold text-gray-900">{c.title}</h3>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{c.scenario}</p>
              {c.guideValues && <div className="text-xs text-violet-700 bg-violet-50 rounded-lg px-3 py-2 inline-flex items-center gap-1.5"><Sparkles size={12} /> Nilai panduan: {c.guideValues}</div>}
              <div className="flex gap-2">
                <textarea value={answerText[c.id] || ''} onChange={(e) => setAnswerText({ ...answerText, [c.id]: e.target.value })} placeholder="Tulis analisis & pendapatmu sesuai nilai Islam…" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={3} />
                <button onClick={() => submitMoral(c.id)} disabled={saving} className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-xl text-sm font-semibold h-fit self-end">{saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Kirim</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'story' && (
        <div className="grid grid-cols-1 gap-4">
          {quizzes.length === 0 && <EmptyState title="Belum ada kuis cerita." description="" />}
          {quizzes.map((qz) => (
            <div key={qz.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-violet-500" />
                <h3 className="font-semibold text-gray-900">{qz.title}</h3>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{qz.story}</p>
              <div className="text-xs text-gray-400">{Array.isArray(qz.questions) ? qz.questions.length : 0} soal</div>
              <button onClick={() => startQuiz(qz)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"><Award size={15} /> Mulai Kuis</button>
            </div>
          ))}
        </div>
      )}

      {activeQuiz && !done && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setActiveQuiz(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{activeQuiz.title}</h3>
              <button onClick={() => setActiveQuiz(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            {q && (
              <>
                <p className="text-sm font-medium text-violet-700">Soal {currentQ + 1} dari {questions.length} · Skor: {score}</p>
                <div className="p-4 bg-violet-50 rounded-xl">
                  <p className="text-sm font-medium text-gray-900 leading-relaxed">{q.q || q.question}</p>
                </div>
                <div className="space-y-2">
                  {(q.options || []).map((opt: string, i: number) => {
                    let cls = 'border-gray-200 hover:bg-violet-50 text-gray-700';
                    if (picked !== null) {
                      if (i === q.correct) cls = 'border-emerald-400 bg-emerald-50 text-emerald-700';
                      else if (i === picked) cls = 'border-red-400 bg-red-50 text-red-700';
                      else cls = 'border-gray-200 text-gray-400';
                    }
                    return (
                      <button key={i} onClick={() => answer(i)} className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition ${cls}`}>
                        <span className="inline-flex items-center gap-2">{picked !== null && i === q.correct && <CheckCircle2 size={14} />}{picked === i && i !== q.correct && <XCircle size={14} />}{opt}</span>
                      </button>
                    );
                  })}
                </div>
                {picked !== null && (
                  <div className="space-y-3">
                    {q.explain && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{q.explain}</p>}
                    <button onClick={nextQ} className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold">{currentQ + 1 >= questions.length ? 'Lihat Hasil' : 'Soal Berikutnya'}</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeQuiz && done && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mx-auto"><Award size={28} /></div>
            <h3 className="text-xl font-bold text-gray-900">{activeQuiz.title}</h3>
            <p className="text-sm text-gray-600">Skor kamu: <span className="font-bold text-violet-600 text-2xl">{score}</span> / {questions.length}</p>
            <p className="text-xs text-gray-500">{score === questions.length ? 'Luar biasa! Kamu memahami kisah dengan baik. 🌟' : score >= questions.length / 2 ? 'Bagus! Terus belajar dari kisah para Nabi. 👏' : 'Ayo baca ulang kisahnya dan coba lagi. 💪'}</p>
            <button onClick={() => setActiveQuiz(null)} className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold">Selesai</button>
          </div>
        </div>
      )}

      {showCase && (
        <Modal isOpen={showCase} title="Kasus Moral Baru" onClose={() => setShowCase(false)}>
          <div className="space-y-3">
            <input value={caseForm.title} onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })} placeholder="Judul kasus" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <textarea value={caseForm.scenario} onChange={(e) => setCaseForm({ ...caseForm, scenario: e.target.value })} placeholder="Skenario/cerita kasus" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={4} />
            <input value={caseForm.guideValues} onChange={(e) => setCaseForm({ ...caseForm, guideValues: e.target.value })} placeholder="Nilai panduan (cth: Amanah, Jujur)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <button onClick={createCase} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold">{saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Simpan</button>
          </div>
        </Modal>
      )}

      {showQuiz && (
        <Modal isOpen={showQuiz} title="Kuis Cerita Baru" onClose={() => setShowQuiz(false)}>
          <div className="space-y-3">
            <input value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} placeholder="Judul kuis (cth: Kisah Nabi Ibrahim)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <textarea value={quizForm.story} onChange={(e) => setQuizForm({ ...quizForm, story: e.target.value })} placeholder="Cerita" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={4} />
            <textarea value={quizForm.questions} onChange={(e) => setQuizForm({ ...quizForm, questions: e.target.value })} placeholder={`Format JSON soal:\n[{"q":"Pertanyaan","options":["A","B"],"correct":0,"explain":"Penjelasan"}]`} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl font-mono" rows={5} />
            <button onClick={createQuiz} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold">{saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Simpan</button>
          </div>
        </Modal>
      )}
    </div>
  );
};