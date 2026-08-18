import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/axios';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Dices, Plus, CheckCircle2, XCircle, Lightbulb, BookOpen, Trash2, RefreshCw } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';
import { Modal } from '../../components/ui/Modal';
import { useAuthStore } from '../../stores/authStore';

const FIELDS: Record<string, string> = { MECHANICS: 'Mekanika', THERMODYNAMICS: 'Termodinamika', WAVE_OPTICS: 'Gelombang & Optik', ELECTRICITY: 'Listrik', MAGNETISM: 'Magnet', MODERN: 'Fisika Modern' };
const DIFF: Record<string, string> = { EASY: 'Mudah', MEDIUM: 'Sedang', HARD: 'Sulit' };

const Tex = ({ children }: { children: string }) => {
  const [html, setHtml] = useState('');
  useEffect(() => {
    try { setHtml(katex.renderToString(children, { displayMode: false, throwOnError: false })); } catch { setHtml(children); }
  }, [children]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

export const ParametricQuestions = () => {
  const { user } = useAuthStore();
  const isTeacher = user?.role?.slug === 'teacher' || user?.role?.slug === 'admin';
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [active, setActive] = useState<any>(null); // { id, body, vars, seed }
  const [ans, setAns] = useState('');
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ title: '', body: '', field: 'MECHANICS', difficulty: 'EASY', points: 10, varsStr: '', formula: '', hint: '', explanation: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(false);
    try { const res = await api.get('/physics/questions'); setItems(res.data.data || []); } catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const open = async (q: any) => {
    try { const res = await api.post(`/physics/questions/${q.id}/session`, {}); setActive(res.data); setAns(''); setResult(null); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal memuat soal'); }
  };

  const newNumbers = async () => {
    if (!active) return;
    try { const res = await api.post(`/physics/questions/${active.id}/session`, {}); setActive(res.data); setAns(''); setResult(null); } catch {}
  };

  const submit = async () => {
    if (!active) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/physics/questions/${active.id}/attempt`, { seed: active.seed, value: ans });
      setResult(res.data); fetchAll();
    } catch (e: any) { alert(e?.response?.data?.error || 'Gagal mengirim'); } finally { setSubmitting(false); }
  };

  const handleCreate = async () => {
    if (!form.title || !form.body) return alert('Judul dan isi wajib');
    setSaving(true);
    try {
      const variables = form.varsStr.split('\n').filter((l: string) => l.trim()).map((l: string): any => {
        const [key, min, max, step, decimals] = l.split(':');
        return { key: (key || '').trim(), min: parseFloat(min as string), max: parseFloat(max as string), step: parseFloat(step as string) || 1, decimals: parseInt(decimals as string) || 0 };
      }).filter((v: any) => v.key && isFinite(v.min) && isFinite(v.max));
      await api.post('/physics/questions', { title: form.title, body: form.body, field: form.field, difficulty: form.difficulty, points: parseInt(form.points) || 10, variables, formula: form.formula, hint: form.hint, explanation: form.explanation });
      setShowForm(false); setForm({ title: '', body: '', field: 'MECHANICS', difficulty: 'EASY', points: 10, varsStr: '', formula: '', hint: '', explanation: '' }); fetchAll();
    } catch (e: any) { alert(e?.response?.data?.error || 'Gagal membuat soal'); } finally { setSaving(false); }
  };

  if (error) return <ErrorState message="Gagal memuat bank soal." onRetry={fetchAll} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <BackButton to="/dashboard/study/fisika" label="Kembali ke Fisika" />
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2"><Dices size={28} className="text-primary-600" /> Soal Parametrik Dinamis</h2>
          <p className="text-sm text-gray-600 mt-1">Setiap siswa mendapat angka berbeda untuk soal yang sama — mencegah menyalin jawaban.</p>
        </div>
        {isTeacher && <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700"><Plus size={18} /> Buat Soal</button>}
      </div>

      {loading ? <SkeletonList count={4} /> : items.length === 0 ? (
        <EmptyState icon={Dices} title="Belum ada soal parametrik" description={isTeacher ? 'Buat soal dengan variabel acak.' : 'Guru belum membuat soal.'} className="py-24" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((q) => (
            <div key={q.id} onClick={() => open(q)} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl p-5 cursor-pointer transition-all hover:-translate-y-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-primary-50 text-primary-700 rounded-md">{FIELDS[q.field] || q.field}</span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-gray-100 text-gray-600 rounded-md">{DIFF[q.difficulty] || q.difficulty}</span>
                <span className="ml-auto text-[10px] font-extrabold text-amber-600">{q.points} poin</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{q.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">{q.body}</p>
              {q.myAttempt?.accepted ? (
                <span className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-green-600"><CheckCircle2 size={13} /> Terpecahkan</span>
              ) : q.myAttempt ? (
                <span className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-amber-600"><Lightbulb size={13} /> Dicoba</span>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Solve modal */}
      <Modal isOpen={!!active} onClose={() => setActive(null)} title={active?.title} width="max-w-2xl">
        {active && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{active.body}</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(active.vars || {}).map(([k, v]) => (
                <span key={k} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-md">{k} = {String(v)}</span>
              ))}
            </div>
            <button onClick={newNumbers} className="flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700"><RefreshCw size={13} /> Acak angka baru</button>
            <div className="flex gap-2">
              <input value={ans} onChange={(e) => setAns(e.target.value)} type="number" placeholder="Jawaban numerik..." className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl" />
              <button onClick={submit} disabled={submitting || !ans} className="px-5 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl disabled:opacity-50">{submitting ? 'Memeriksa...' : 'Periksa'}</button>
            </div>
            {result && (
              <div className={`rounded-xl p-4 text-sm ${result.accepted ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
                <p className="font-bold flex items-center gap-2">{result.accepted ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {result.accepted ? `Benar! +${result.score} poin` : 'Belum tepat'}</p>
                {!result.accepted && result.hint && (
                  <p className="mt-2 flex items-start gap-1.5"><Lightbulb size={14} className="shrink-0 mt-0.5" /><span>Petunjuk: {result.hint}</span></p>
                )}
                {result.accepted && result.explanation && <p className="mt-2 text-xs">Pembahasan: {result.explanation}</p>}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Buat Soal Parametrik" width="max-w-3xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Judul soal" className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl" />
            <select value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl">
              {Object.entries(FIELDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1 block">Isi soal — pakai token {'{var}'} yang akan diganti angka acak</label>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3} placeholder={'Sebuah benda bermassa {m} kg bergerak dengan percepatan {a} m/s². Hitung gaya yang bekerja (F = m·a)!'} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1 block">Variabel acak — satu per baris: <b>key:min:max:step:decimals</b></label>
            <textarea value={form.varsStr} onChange={(e) => setForm({ ...form, varsStr: e.target.value })} rows={3} placeholder={'m:2:10:1:1\na:2:8:0.5:2'} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl font-mono" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1 block">Rumus kunci jawaban (JavaScript, pakai nama variabel) — mis: <b>m*a</b></label>
            <input value={form.formula} onChange={(e) => setForm({ ...form, formula: e.target.value })} placeholder="m*a" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} type="number" placeholder="Poin" className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl" />
            <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl">
              {Object.entries(DIFF).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <textarea value={form.hint} onChange={(e) => setForm({ ...form, hint: e.target.value })} placeholder="Petunjuk bertahap bila salah..." className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl" />
          <textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} placeholder="Pembahasan lengkap bila benar..." className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl" />
          <button onClick={handleCreate} disabled={saving} className="w-full px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl disabled:opacity-60">{saving ? 'Menyimpan...' : 'Simpan Soal'}</button>
        </div>
      </Modal>
    </div>
  );
};
