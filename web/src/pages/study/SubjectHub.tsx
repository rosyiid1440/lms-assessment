import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  BookOpen, FileText, Trophy, Clock4, LayoutGrid, Plus, Trash2, Save, ChevronRight,
  Target, Award, RotateCcw, CheckCircle2, XCircle, Lightbulb, ArrowLeft, BookMarked,
  Sparkles, Layers, MapPin, GraduationCap, Send
} from 'lucide-react';
import { api } from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { EmptyState } from '../../components/ui/EmptyState';
import { subjectByKey } from './registry';
import type { SubjectDef } from './registry';
import { toolsBySubject } from './toolsRegistry';
import { mathTool } from './tools/MatematikaTool';

interface Lesson { id: string; title: string; summary: string | null; sections: { heading: string; body: string; imageUrl?: string }[] | null; status: string; updatedAt: string }
interface QuizItem { id: string; title: string; description: string | null; questions: { q: string; options: string[]; correct: string; explain?: string }[]; myBest: { score: number; correctCount: number; totalCount: number } | null }
interface TimelineEvt { id: string; year: number; periodLabel: string; title: string; description: string; figure?: string | null; category?: string | null }
interface CardItem { id: string; deck: string; front: string; back: string }
interface MapPoint { id: string; name: string; region: string; x: number; y: number; category?: string | null; description?: string | null }

const isStaff = (slug: string) => slug === 'teacher' || slug === 'admin' || slug === 'super_admin';

/* =============================== SECTIONS =============================== */

const SectionHead = ({ icon: Icon, title, sub, accent }: { icon: any; title: string; sub?: string; accent?: string }) => (
  <div className="flex items-center gap-2.5 mb-4">
    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: accent || 'var(--color-primary-100)', color: 'var(--color-primary-700)' }}>
      <Icon size={18} />
    </div>
    <div>
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  </div>
);

/* ------------------------- 1. Materi (lessons) ------------------------- */

const LessonsTab = ({ subject, staff }: { subject: SubjectDef; staff: boolean }) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [sections, setSections] = useState<{ heading: string; body: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await api.get('/study/lessons', { params: { subject: subject.key } });
    setLessons(res.data.data); setLoading(false);
  }, [subject.key]);

  useEffect(() => { load(); }, [load]);

  const saveLesson = async () => {
    const el = document.getElementById('lesson-title') as HTMLInputElement;
    const sum = document.getElementById('lesson-summary') as HTMLTextAreaElement;
    if (!el?.value.trim()) return;
    const cleanSections = sections.filter((s) => s.heading.trim() || s.body.trim());
    if (editing) {
      await api.put(`/study/lessons/${editing.id}`, { title: el.value, summary: sum.value, sections: cleanSections });
    } else {
      await api.post('/study/lessons', { subject: subject.key, title: el.value, summary: sum.value, sections: cleanSections });
    }
    setShowForm(false); setEditing(null); setSections([]); load();
  };

  const removeLesson = async (id: string) => { await api.delete(`/study/lessons/${id}`); load(); };

  return (
    <div className="max-w-4xl">
      {staff && (
        <button onClick={() => { setShowForm(true); setEditing(null); setSections([]); }} className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors">
          <Plus size={16} /> Tambah Materi
        </button>
      )}

      {showForm && (
        <div className="mb-6 border border-gray-200 rounded-2xl p-5 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-gray-900">{editing ? 'Edit Materi' : 'Materi Baru'}</h4>
            <button onClick={() => { setShowForm(false); setEditing(null); setSections([]); }} className="text-gray-400 hover:text-gray-600"><XCircle size={18} /></button>
          </div>
          <input id="lesson-title" defaultValue={editing?.title || ''} placeholder="Judul materi" className="w-full mb-3 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <textarea id="lesson-summary" defaultValue={editing?.summary || ''} placeholder="Ringkasan singkat" rows={2} className="w-full mb-3 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <div className="space-y-3 mb-3">
            {sections.map((s, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                <input placeholder="Sub-judul" value={s.heading} onChange={(e) => setSections(sections.map((x, j) => j === i ? { ...x, heading: e.target.value } : x))} className="w-full mb-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium" />
                <textarea placeholder="Isi materi..." value={s.body} onChange={(e) => setSections(sections.map((x, j) => j === i ? { ...x, body: e.target.value } : x))} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <button onClick={() => setSections(sections.filter((_, j) => j !== i))} className="mt-2 text-xs text-red-500 flex items-center gap-1"><Trash2 size={12} /> Hapus bagian</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSections([...sections, { heading: '', body: '' }])} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50">+ Bagian baru</button>
            <button onClick={saveLesson} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700"><Save size={14} /> Simpan</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)}</div>
      ) : lessons.length === 0 ? (
        <EmptyState title="Belum ada materi" description="Guru dapat menambahkan materi pelajaran untuk mapel ini." icon={BookOpen} />
      ) : (
        <div className="space-y-3">
          {lessons.map((l) => (
            <div key={l.id} className="border border-gray-200 rounded-2xl bg-white overflow-hidden">
              <button onClick={() => setOpen(open === l.id ? null : l.id)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: subject.tint, color: subject.color }}><FileText size={18} /></div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{l.title}</h4>
                    {l.summary && <p className="text-xs text-gray-500 mt-0.5">{l.summary}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400"><Clock4 size={14} /> </span>
                  <ChevronRight size={18} className={`text-gray-400 transition-transform ${open === l.id ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {open === l.id && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  {(l.sections || []).map((s, i) => (
                    <div key={i} className="pt-4">
                      {s.heading && <h5 className="text-sm font-bold text-gray-900 mb-1.5">{s.heading}</h5>}
                      <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{s.body}</p>
                    </div>
                  ))}
                  {staff && (
                    <div className="flex gap-2 pt-4">
                      <button onClick={() => { setEditing(l); setSections((l.sections || []).map((s: any) => ({ heading: s.heading || '', body: s.body || '' }))); setShowForm(true); }} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">Edit</button>
                      <button onClick={() => removeLesson(l.id)} className="px-3 py-1.5 rounded-lg border border-red-200 text-xs text-red-500 hover:bg-red-50">Hapus</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ------------------------- 2. Latihan (quiz) ------------------------- */

const QuizTab = ({ subject, staff }: { subject: SubjectDef; staff: boolean }) => {
  const { user } = useAuthStore();
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<QuizItem | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<{ score: number; correctCount: number; totalCount: number; detailed: any[] } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [buildQ, setBuildQ] = useState<{ q: string; options: string[]; correct: string; explain?: string }[]>([]);

  const load = useCallback(async () => {
    const res = await api.get('/study/quizzes', { params: { subject: subject.key } });
    setQuizzes(res.data.data); setLoading(false);
  }, [subject.key]);
  useEffect(() => { load(); }, [load]);

  const startQuiz = (q: QuizItem) => { setActive(q); setPicked([]); setResult(null); };
  const submitQuiz = async () => {
    if (!active) return;
    const res = await api.post(`/study/quizzes/${active.id}/attempt`, { answers: picked });
    setResult(res.data); load();
  };

  const addQuestion = () => setBuildQ([...buildQ, { q: '', options: ['', ''], correct: '0', explain: '' }]);
  const setQ = (i: number, patch: any) => setBuildQ(buildQ.map((x, j) => j === i ? { ...x, ...patch } : x));
  const saveQuiz = async () => {
    const t = (document.getElementById('quiz-title') as HTMLInputElement)?.value;
    if (!t?.trim() || !buildQ.every((x) => x.q && x.options.length >= 2)) return;
    await api.post('/study/quizzes', {
      subject: subject.key, title: t,
      description: (document.getElementById('quiz-desc') as HTMLInputElement)?.value,
      questions: buildQ.map((x) => ({ q: x.q, options: x.options, correct: x.options[parseInt(x.correct)] || '', explain: x.explain || null })),
    });
    setShowForm(false); setBuildQ([]); load();
  };

  if (active) {
    const total = (active.questions || []).length;
    return (
      <div className="max-w-3xl">
        <button onClick={() => setActive(null)} className="mb-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"><ArrowLeft size={16} /> Kembali ke daftar</button>
        <div className="border border-gray-200 rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{active.title}</h3>
          <p className="text-xs text-gray-500 mb-5">{total} pertanyaan</p>
          {result ? (
            <div className="text-center py-8">
              <div className="w-24 h-24 rounded-full mx-auto flex flex-col items-center justify-center mb-4" style={{ background: result.score >= 75 ? subject.tint : '#fef2f2', color: result.score >= 75 ? subject.color : '#dc2626' }}>
                <span className="text-3xl font-extrabold">{result.score}</span><span className="text-xs">/ 100</span>
              </div>
              <p className="text-sm font-semibold text-gray-800">{result.correctCount} dari {result.totalCount} benar</p>
              <div className="space-y-3 mt-6 text-left">
                {result.detailed.map((d, i) => (
                  <div key={i} className={`rounded-xl border p-4 ${d.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex gap-2 items-start">
                      {d.isCorrect ? <CheckCircle2 size={18} className="text-green-600 mt-0.5 flex-shrink-0" /> : <XCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{d.q}</p>
                        <p className="text-xs text-gray-600 mt-1">Jawaban: <span className="font-medium">{d.picked !== undefined && d.picked !== null && d.picked !== '' ? d.picked : '—'}</span></p>
                        {!d.isCorrect && <p className="text-xs text-green-700 mt-0.5">Benar: {d.correct}</p>}
                        {d.explain && <p className="text-xs text-gray-500 mt-1.5 flex gap-1 items-start"><Lightbulb size={12} className="mt-0.5 flex-shrink-0" /> {d.explain}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => { setActive(null); }} className="mt-6 inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium"><RotateCcw size={16} /> Selesai</button>
            </div>
          ) : (
            <>
              <div className="space-y-5">
                {(active.questions || []).map((q, qi) => (
                  <div key={qi}>
                    <p className="text-sm font-medium text-gray-900 mb-2 flex gap-2"><span className="text-gray-400 font-bold">{qi + 1}.</span>{q.q}</p>
                    <div className="grid gap-2 pl-6">
                      {q.options.map((opt, oi) => {
                        const isPicked = picked[qi] === oi;
                        return (
                          <button key={oi} onClick={() => setPicked((prev) => { const n = [...prev]; n[qi] = oi; return n; })}
                            className={`text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${isPicked ? 'border-primary-500 bg-primary-50 text-primary-800 font-medium' : 'border-gray-200 hover:border-gray-300'}`}>
                            <span className="font-bold mr-2">{String.fromCharCode(65 + oi)}.</span>{opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={submitQuiz} disabled={picked.filter((p) => p !== undefined && p !== null).length < total}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{ background: subject.color }}>
                <Send size={16} /> Kumpulkan Jawaban
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {staff && (
        <button onClick={() => { setShowForm(true); setBuildQ([]); }} className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
          <Plus size={16} /> Buat Latihan Baru
        </button>
      )}

      {showForm && (
        <div className="mb-6 border border-gray-200 rounded-2xl p-5 bg-white shadow-sm">
          <h4 className="text-sm font-bold text-gray-900 mb-3">Buat Latihan/Kuis Baru</h4>
          <input id="quiz-title" placeholder="Judul latihan" className="w-full mb-2 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input id="quiz-desc" placeholder="Deskripsi (opsional)" className="w-full mb-4 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <div className="space-y-4">
            {buildQ.map((bq, i) => (
              <div key={i} className="border border-gray-100 bg-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500">Pertanyaan {i + 1}</span>
                  <button onClick={() => setBuildQ(buildQ.filter((_, j) => j !== i))} className="text-red-400"><Trash2 size={14} /></button>
                </div>
                <input placeholder="Teks pertanyaan" value={bq.q} onChange={(e) => setQ(i, { q: e.target.value })} className="w-full mb-2 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                {bq.options.map((o, oi) => (
                  <div key={oi} className="flex gap-2 mb-1.5">
                    <input type="radio" name={`q${i}`} checked={parseInt(bq.correct) === oi} onChange={() => setQ(i, { correct: String(oi) })} />
                    <input placeholder={`Opsi ${String.fromCharCode(65 + oi)}`} value={o} onChange={(e) => setQ(i, { options: bq.options.map((x, xi) => xi === oi ? e.target.value : x) })} className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
                    {bq.options.length > 2 && <button onClick={() => setQ(i, { options: bq.options.filter((_, xi) => xi !== oi) })} className="text-red-300"><XCircle size={14} /></button>}
                  </div>
                ))}
                <button onClick={() => setQ(i, { options: [...bq.options, ''] })} className="text-xs text-gray-500 hover:text-gray-700">+ Tambah opsi</button>
                <input placeholder="Penjelasan (opsional)" value={bq.explain || ''} onChange={(e) => setQ(i, { explain: e.target.value })} className="w-full mt-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-500" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={addQuestion} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50">+ Pertanyaan</button>
            <button onClick={saveQuiz} className="px-4 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium">Simpan Latihan</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)}</div>
      ) : quizzes.length === 0 ? (
        <EmptyState title="Belum ada latihan" description="Guru dapat menambahkan latihan soal untuk mapel ini." icon={Trophy} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {quizzes.map((q) => (
            <div key={q.id} className="border border-gray-200 rounded-2xl bg-white p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: subject.tint, color: subject.color }}><Target size={16} /></div>
                {q.myBest && <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: subject.tint, color: subject.color }}>{q.myBest.score}/100</span>}
              </div>
              <h4 className="text-sm font-semibold text-gray-900">{q.title}</h4>
              {q.description && <p className="text-xs text-gray-500 mt-1 mb-3">{q.description}</p>}
              <p className="text-xs text-gray-400 mb-3">{q.questions?.length || 0} pertanyaan{q.myBest ? ` · terbaik ${q.myBest.correctCount}/${q.myBest.totalCount}` : ''}</p>
              <button onClick={() => startQuiz(q)} className="w-full px-4 py-2 rounded-lg text-white text-xs font-bold" style={{ background: subject.color }}>
                {q.myBest ? 'Ulangi' : 'Kerjakan'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ------------------------- 3. Timeline ------------------------- */
const TimelineTab = ({ subject, staff }: { subject: SubjectDef; staff: boolean }) => {
  const [events, setEvents] = useState<TimelineEvt[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await api.get('/study/timeline', { params: { subject: subject.key } });
    setEvents(res.data.data); setLoading(false);
  }, [subject.key]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const g = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value;
    if (!g('tl-title') || !g('tl-year')) return;
    await api.post('/study/timeline', {
      subject: subject.key, title: g('tl-title'), year: g('tl-year'),
      periodLabel: g('tl-period') || '', description: g('tl-desc') || '',
      category: g('tl-cat') || null, icon: 'Flag',
    });
    setShowForm(false); load();
  };
  const remove = async (id: string) => { await api.delete(`/study/timeline/${id}`); load(); };

  return (
    <div className="max-w-3xl">
      {staff && !showForm && <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium"><Plus size={16} /> Tambah Peristiwa</button>}
      {showForm && (
        <div className="mb-6 border border-gray-200 rounded-2xl p-5 bg-white shadow-sm">
          <h4 className="text-sm font-bold text-gray-900 mb-3">Peristiwa Baru</h4>
          <div className="grid md:grid-cols-3 gap-2 mb-2">
            <input id="tl-title" placeholder="Nama peristiwa" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            <input id="tl-year" placeholder="Tahun" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            <input id="tl-period" placeholder="Periode (mis. Masa Hindu-Buddha)" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <input id="tl-cat" placeholder="Kategori (opsional)" className="w-full mb-2 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <textarea id="tl-desc" placeholder="Deskripsi" rows={2} className="w-full mb-3 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <div className="flex gap-2">
            <button onClick={save} className="px-4 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium">Simpan</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-1.5 rounded-lg border text-xs text-gray-500">Batal</button>
          </div>
        </div>
      )}
      {loading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)}</div>
        : events.length === 0 ? <EmptyState title="Belum ada linimasa" description="Tambahkan peristiwa penting untuk memahami mapel ini secara kronologis." icon={Clock4} />
        : (
        <div className="relative pl-6 border-l-2 border-gray-200 space-y-5">
          {events.map((ev) => (
            <div key={ev.id} className="relative">
              <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full border-2 border-white" style={{ background: subject.color }} />
              <div className="border border-gray-200 rounded-2xl bg-white p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full" style={{ background: subject.tint, color: subject.color }}>{ev.year} {ev.periodLabel ? `· ${ev.periodLabel}` : ''}</span>
                  {staff && <button onClick={() => remove(ev.id)} className="text-gray-300 hover:text-red-400"><Trash2 size={14} /></button>}
                </div>
                <h4 className="text-sm font-bold text-gray-900 mt-1">{ev.title}</h4>
                {ev.category && <span className="text-[11px] text-gray-400">{ev.category}</span>}
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{ev.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ------------------------- 4. Kartu Hafalan ------------------------- */
const FlashcardsTab = ({ subject }: { subject: SubjectDef }) => {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [deck, setDeck] = useState('umum');
  const [decks, setDecks] = useState<string[]>(['umum']);
  const [known, setKnown] = useState<number[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await api.get('/study/flashcards', { params: { subject: subject.key } });
    const items = (res.data?.data || []) as CardItem[];
    setCards(items);
    const d = Array.from(new Set(items.map((c) => c.deck)));
    if (d.length) { setDecks(d as string[]); if (!d.includes(deck)) setDeck(d[0]); }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject.key]);

  useEffect(() => { load(); }, [load]);

  const activeCards = useMemo(() => cards.filter((c) => c.deck === deck), [cards, deck]);

  const addCard = async () => {
    const f = (document.getElementById('fc-front') as HTMLInputElement)?.value;
    const b = (document.getElementById('fc-back') as HTMLInputElement)?.value;
    if (!f?.trim() || !b?.trim()) return;
    await api.post('/study/flashcards', { subject: subject.key, deck, front: f, back: b });
    setShowAdd(false); load();
  };

  const mark = (status: 'known' | 'again') => {
    const next = status === 'known';
    setKnown((prev) => next ? [...prev, idx] : prev.filter((k) => k !== idx));
    setFlipped(false);
    setIdx((i) => (i + 1) % activeCards.length);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <select value={deck} onChange={(e) => { setDeck(e.target.value); setIdx(0); setKnown([]); setFlipped(false); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
          {decks.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"><Plus size={14} /> Kartu baru</button>
      </div>

      {showAdd && (
        <div className="mb-4 border border-gray-200 rounded-2xl p-4 bg-white shadow-sm">
          <input id="fc-front" placeholder="Depan (istilah / pertanyaan)" className="w-full mb-2 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input id="fc-back" placeholder="Belakang (definisi / jawaban)" className="w-full mb-3 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <button onClick={addCard} className="px-4 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium">Tambah</button>
        </div>
      )}

      {loading ? <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
        : activeCards.length === 0 ? <EmptyState title="Belum ada kartu" description="Tambah kartu hafalan untuk mengingat istilah penting." icon={BookMarked} />
        : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500">Kartu {idx + 1} dari {activeCards.length}</span>
            <span className="text-xs text-gray-400">Dikuasai: {known.length}</span>
          </div>
          <button onClick={() => setFlipped(!flipped)} className="w-full text-left">
            <div className={`min-h-[220px] rounded-2xl border p-8 shadow-sm transition-colors ${flipped ? 'border-primary-200' : 'border-gray-200 bg-white'}`}>
              {flipped ? (
                <div>
                  <div className="flex items-center gap-2 mb-3"><Lightbulb size={16} className="text-primary-500" /><span className="text-xs font-bold uppercase tracking-wider text-primary-600">Definisi</span></div>
                  <p className="text-lg font-semibold text-gray-900 leading-relaxed">{activeCards[idx].back}</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-3"><Sparkles size={16} style={{ color: subject.color }} /><span className="text-xs font-bold uppercase tracking-wider" style={{ color: subject.color }}>Istilah</span></div>
                  <p className="text-lg font-semibold text-gray-900 leading-relaxed">{activeCards[idx].front}</p>
                </div>
              )}
            </div>
          </button>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => mark('again')} className="px-4 py-3 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50">Ulangi lagi</button>
            <button onClick={() => mark('known')} className="px-4 py-3 rounded-xl text-white text-sm font-semibold" style={{ background: subject.color }}>Sudah hafal ✓</button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------- 5. Peta ------------------------- */
const MapQuestions = [
  { q: 'Letakkan penanda pada koordinat 35, 45', x: 35, y: 45 },
  { q: 'Letakkan penanda pada koordinat 70, 30', x: 70, y: 30 },
  { q: 'Letakkan penanda pada koordinat 20, 75', x: 20, y: 75 },
];
const MapTab = ({ subject, staff }: { subject: SubjectDef; staff: boolean }) => {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [staticPoints] = useState<MapPoint[]>([
    { id: 'demo-1', name: 'Dataran Tinggi', region: 'Pegunungan', x: 28, y: 32, category: 'Relief', description: 'Wilayah dengan relief tinggi' },
    { id: 'demo-2', name: 'Pesisir Selatan', region: 'Pantai', x: 65, y: 78, category: 'Perairan', description: 'Wilayah pantai' },
    { id: 'demo-3', name: 'Lembah Sungai', region: 'Sungai', x: 45, y: 58, category: 'Perairan', description: 'Drainase alami' },
  ]);
  const [chosen, setChosen] = useState<MapPoint | null>(null);
  const [placed, setPlaced] = useState<string[]>([]);
  const [lastDrop, setLastDrop] = useState<{ x: number; y: number } | null>(null);
  const [activeQ, setActiveQ] = useState(0);
  const loading = false;

  const dropOnMap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setLastDrop({ x, y });
  };
  const checkPlacement = () => {
    if (!lastDrop) return;
    const t = MapQuestions[activeQ];
    const ok = Math.abs(lastDrop.x - t.x) <= 12 && Math.abs(lastDrop.y - t.y) <= 12;
    const key = `${t.q}`;
    if (ok && !placed.includes(key)) setPlaced((p) => [...p, key]);
    setActiveQ((a) => a + 1);
  };

  return (
    <div className="max-w-4xl">
      <div className="grid md:grid-cols-[1fr_260px] gap-4">
        <div>
          <div className="rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden relative" style={{ paddingBottom: '55%' }} onClick={dropOnMap}>
            <div className="absolute inset-0">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <path d="M0,0 H100 V100 H0 Z" fill="#eef2f7" />
                <path d="M10,70 Q30,55 45,65 Q60,75 80,58 Q90,52 100,60 V100 H0 Z" fill="#bfdbfe" opacity="0.5" />
                <path d="M30,15 Q50,10 60,20 Q70,28 55,32 Q40,34 30,15 Z" fill="#d1fae5" opacity="0.6" />
              </svg>
              {points.concat(staticPoints).map((p, i) => (
                <button key={p.id} onClick={(e) => { e.stopPropagation(); setChosen(p); }}
                  className="absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center rounded-full text-black shadow-md transform -translate-x-0 -translate-y-0 transition-transform hover:scale-110"
                  style={{ left: `${p.x}%`, top: `${p.y}%`, background: subject.color }}>
                  <MapPin size={16} className="text-white" />
                </button>
              ))}
              {lastDrop && (
                <div className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-gray-900 opacity-70" style={{ left: `${lastDrop.x}%`, top: `${lastDrop.y}%` }} />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap size={16} className="text-gray-500" />
              <span className="text-sm font-bold text-gray-800">Tekan Peta: Lokasi Drop</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              {activeQ < MapQuestions.length ? (
                <div>
                  <p className="text-sm font-semibold text-gray-900">{activeQ + 1}. {MapQuestions[activeQ].q}</p>
                  <p className="text-xs text-gray-500 mt-1">Silakan klik pada peta, lalu periksa jawaban.</p>
                  <button onClick={checkPlacement} className="mt-3 px-4 py-2 rounded-lg text-white text-xs font-bold" style={{ background: subject.color }}>Check Jawaban</button>
                  {lastDrop && <span className="ml-3 text-xs text-gray-400">Koordinat: ({lastDrop.x}, {lastDrop.y})</span>}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: subject.color }}>
                  <Award size={18} /> Selesai! Anda menempatkan {placed.length} dari {MapQuestions.length} lokasi dengan benar.
                </div>
              )}
            </div>
          </div>
        </div>
        <div>
          <div className="border border-gray-200 rounded-2xl p-4 bg-white">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Layers size={16} className="text-gray-400" /> Daftar Titik</h4>
            <div className="space-y-2">
              {points.concat(staticPoints).map((p) => (
                <button key={p.id} onClick={() => setChosen(p)} className="w-full text-left px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <p className="text-xs font-semibold text-gray-800">{p.name}</p>
                  <p className="text-[11px] text-gray-400">{p.region} · {p.category} · ({p.x},{p.y})</p>
                </button>
              ))}
            </div>
            {chosen && (
              <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs font-bold text-gray-800 mb-1">{chosen.name}</p>
                <p className="text-xs text-gray-600">{chosen.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* =============================== HUB PAGE =============================== */

const TABS = [
  { id: 'materi', label: 'Materi', icon: BookOpen },
  { id: 'latihan', label: 'Latihan', icon: Trophy },
  { id: 'timeline', label: 'Linimasa', icon: Clock4 },
  { id: 'hafalan', label: 'Hafalan', icon: BookMarked },
  { id: 'peta', label: 'Peta', icon: MapPin },
  { id: 'simulasi', label: 'Simulasi', icon: LayoutGrid },
];

export const SubjectHub = () => {
  const { subject: key } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const subject = subjectByKey(key || '');
  const initialTab = searchParams.get('tab') || 'materi';
  const knownTab = TABS.find((t) => t.id === initialTab) ? initialTab : 'materi';
  const [tab, setTab] = useState(knownTab);
  const [stats, setStats] = useState<any>(null);
  const staff = isStaff(user?.role?.slug || '');
  const Icon = subject.icon;

  const resolveTo = (to: string) => {
    if (to === '/dashboard/elt') return staff ? '/dashboard/teacher/elt' : '/dashboard/student/elt';
    return to;
  };

  useEffect(() => {
    api.get('/study/summary', { params: { subject: subject.key } }).then((r) => setStats(r.data)).catch(() => {});
  }, [subject.key]);

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="p-4 md:p-6" style={{ background: `linear-gradient(135deg, ${subject.color} 0%, ${subject.color}cc 100%)` }}>
          <div className="flex items-start gap-3 text-white">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur flex-shrink-0"><Icon size={24} /></div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/70">{subject.rumpun} · <Link to="/dashboard/study" className="underline underline-offset-2">Semua Mapel</Link></p>
              <h2 className="text-xl md:text-2xl font-extrabold">{subject.label}</h2>
              <p className="text-sm text-white/85 mt-0.5">{subject.tagline}</p>
            </div>
          </div>
        </div>

        {/* Aplikasi khas mapel */}
        <div className="px-4 md:px-6 py-3">
          <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {subject.apps.map((a) => {
              const aTo = resolveTo(a.to);
              const aTab = aTo.split('?tab=')[1];
              const active = aTab ? aTab === tab : false;
              return aTab ? (
                <button key={a.label} onClick={() => setTab(aTab)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${active ? 'bg-primary-50 border-primary-200 shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: subject.tint, color: subject.color }}><a.icon size={16} /></div>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${active ? 'text-primary-700' : 'text-gray-800'}`}>{a.label}</p>
                    <p className="text-[10px] text-gray-400 truncate">{a.desc}</p>
                  </div>
                </button>
              ) : (
                <Link key={a.label} to={aTo}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-200 text-left hover:border-gray-300 hover:shadow-sm transition-all group">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: subject.tint, color: subject.color }}><a.icon size={16} /></div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate group-hover:text-primary-700">{a.label}</p>
                    <p className="text-[10px] text-gray-400 truncate">{a.desc}</p>
                  </div>
                  <ChevronRight size={14} className="ml-auto text-gray-300" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Generic feature tabs — pendukung semua mapel */}
        {!subject.hasLab && (
          <div className="overflow-x-auto border-t border-gray-100">
            <div className="flex px-3 md:px-6 gap-1">
              {TABS.map((t) => {
                // hanya tab yang relevan
                const skip = t.id === 'peta' && !['geografi', 'sejarah'].includes(subject.key);
                if (skip) return null;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <t.icon size={16} /> {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 md:p-6">
        {tab === 'materi' && <LessonsTab subject={subject} staff={staff} />}
        {tab === 'latihan' && <QuizTab subject={subject} staff={staff} />}
        {tab === 'timeline' && <TimelineTab subject={subject} staff={staff} />}
        {tab === 'hafalan' && <FlashcardsTab subject={subject} />}
        {tab === 'peta' && <MapTab subject={subject} staff={staff} />}
        {tab === 'simulasi' && <SimulationTab subject={subject} />}
      </div>
    </div>
  );
};

const SimulationTab = ({ subject }: { subject: SubjectDef }) => {
  const Tool = toolsBySubject[subject.key as keyof typeof toolsBySubject] || mathTool;
  return (
    <div className="max-w-4xl">
      <SectionHead icon={LayoutGrid} title={`Simulasi & Interaksi ${subject.label}`} sub="Eksplorasi konsep secara mandiri" accent={subject.tint} />
      <Tool subject={subject} />
    </div>
  );
};