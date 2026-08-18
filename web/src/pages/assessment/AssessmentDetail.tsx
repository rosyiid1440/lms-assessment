import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/axios';
import { ArrowLeft, BookOpen, Link2, Unlink, Eye, Scale, Plus, X, Save, Sparkles } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';

const QUESTION_TYPES = ['MULTIPLE_CHOICE', 'MULTIPLE_RESPONSE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'NUMERIC', 'MATCHING', 'ORDERING', 'FILL_BLANK', 'DATE'];
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'HOTS'];
const BLOOM_LEVELS = ['C1_REMEMBERING', 'C2_UNDERSTANDING', 'C3_APPLYING', 'C4_ANALYZING', 'C5_EVALUATING', 'C6_CREATING'];

const emptyNewQuestion = {
  type: 'MULTIPLE_CHOICE',
  difficulty: 'MEDIUM',
  bloomLevel: 'C2_UNDERSTANDING',
  prompt: '',
  explanation: '',
  points: 1,
  options: [{ key: 'a', label: '', isCorrect: false }],
  answer: { keys: [] },
};

export const AssessmentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [questionBank, setQuestionBank] = useState<any[]>([]);
  const [qbMeta, setQbMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [qbSearch, setQbSearch] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [attachPoints, setAttachPoints] = useState('1');
  const [questionPoints, setQuestionPoints] = useState<Record<string, string>>({});
  const [balanceTotal, setBalanceTotal] = useState('100');
  const [balancing, setBalancing] = useState(false);
  const [isNewQuestionModal, setIsNewQuestionModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState<any>(emptyNewQuestion);
  const [savingNewQuestion, setSavingNewQuestion] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const [d, an] = await Promise.all([
        api.get(`/assessment/assessments/${id}`),
        api.get(`/assessment/assessments/${id}/analytics`),
      ]);
      setDetail(d.data.data);
      setAnalytics(an.data.data);
      setSelectedQuestions([]);
    } catch (e: any) {
      showToast(e.response?.data?.detail || 'Gagal memuat detail ujian', 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) fetchDetail(); }, [id, fetchDetail]);

  const loadQuestionBank = async () => {
    try {
      const params: Record<string, any> = { page: qbMeta.page, limit: qbMeta.limit, status: 'PUBLISHED', mine: true };
      if (qbSearch) params.search = qbSearch;
      const res = await api.get('/assessment/questions', { params });
      setQuestionBank(res.data.data);
      setQbMeta(res.data.meta);
    } catch { showToast('Gagal memuat bank soal', 'error'); }
  };

  const toggleSelect = (qid: string) => {
    setSelectedQuestions(prev => prev.includes(qid) ? prev.filter(x => x !== qid) : [...prev, qid]);
  };

  const attachSelected = async () => {
    if (!selectedQuestions.length) { showToast('Pilih minimal 1 soal', 'error'); return; }
    try {
      await api.post(`/assessment/assessments/${detail.id}/questions`, { questionIds: selectedQuestions, points: Number(attachPoints) || 1 });
      showToast(`${selectedQuestions.length} soal dilampirkan`);
      setSelectedQuestions([]);
      fetchDetail();
    } catch (e: any) {
      showToast(e.response?.data?.detail || 'Gagal melampirkan', 'error');
    }
  };

  const setQuestionPoint = async (qid: string, points: number) => {
    try {
      await api.put(`/assessment/assessments/${detail.id}/questions/${qid}`, { points });
      showToast('Bobot soal diperbarui');
      fetchDetail();
    } catch (e: any) {
      showToast(e.response?.data?.detail || 'Gagal ubah bobot', 'error');
    }
  };

  const balanceQuestions = async () => {
    if (!detail.questions?.length) { showToast('Belum ada soal', 'error'); return; }
    setBalancing(true);
    try {
      await api.post(`/assessment/assessments/${detail.id}/questions/balance`, { totalPoints: Number(balanceTotal) || 100 });
      showToast(`Bobot dibagi rata ke total ${Number(balanceTotal) || 100} poin`);
      fetchDetail();
    } catch (e: any) {
      showToast(e.response?.data?.detail || 'Gagal bagi bobot', 'error');
    } finally {
      setBalancing(false);
    }
  };

  const removeQuestion = async (qid: string) => {
    try {
      await api.delete(`/assessment/assessments/${detail.id}/questions/${qid}`);
      showToast('Soal dilepas');
      fetchDetail();
    } catch { showToast('Gagal melepas soal', 'error'); }
  };

  const loadResults = async () => {
    try {
      const res = await api.get(`/assessment/assessments/${detail.id}/results`, { params: { page: 1, limit: 50 } });
      setResults(res.data.data || []);
    } catch { showToast('Gagal memuat hasil', 'error'); }
  };

  const updateNQOption = (i: number, field: string, value: any) => {
    const options = [...(newQuestion.options || [])];
    options[i] = { ...options[i], [field]: value };
    setNewQuestion({ ...newQuestion, options });
  };

  const addNQOption = () => {
    const options = [...(newQuestion.options || [])];
    // Find the max char code among existing keys to prevent duplicates when deleting
    let maxCode = 96; // 'a' is 97
    options.forEach(o => {
      if (o.key && o.key.length === 1) {
        maxCode = Math.max(maxCode, o.key.charCodeAt(0));
      }
    });
    const nextKey = String.fromCharCode(maxCode + 1);
    options.push({ key: nextKey, label: '', isCorrect: false });
    setNewQuestion({ ...newQuestion, options });
  };

  const setNQCorrect = (i: number, val: boolean) => {
    const options = [...(newQuestion.options || [])];
    if (newQuestion.type === 'MULTIPLE_CHOICE') {
      options.forEach((o, idx) => { options[idx] = { ...o, isCorrect: idx === i && val }; });
    } else {
      options[i] = { ...options[i], isCorrect: val };
    }
    const correct = options.filter(o => o.isCorrect).map(o => o.key);
    setNewQuestion({ ...newQuestion, options, answer: { ...(newQuestion.answer || {}), keys: correct } });
  };

  const createAndAttach = async () => {
    if (!newQuestion.prompt.trim()) { showToast('Prompt wajib diisi', 'error'); return; }
    setSavingNewQuestion(true);
    try {
      const payload: Record<string, any> = {
        type: newQuestion.type,
        difficulty: newQuestion.difficulty,
        bloomLevel: newQuestion.bloomLevel,
        status: 'PUBLISHED',
        prompt: newQuestion.prompt,
        explanation: newQuestion.explanation || null,
        points: Number(newQuestion.points) || 1,
        negativeMarking: 0,
        categoryId: null,
      };
      if (['MULTIPLE_CHOICE', 'MULTIPLE_RESPONSE', 'TRUE_FALSE'].includes(newQuestion.type)) {
        payload.options = newQuestion.options?.map((o: any) => ({ key: o.key, label: o.label, isCorrect: !!o.isCorrect }));
      }
      if (newQuestion.type === 'TRUE_FALSE') {
        payload.answer = { boolean: newQuestion.options?.find((o: any) => o.isCorrect)?.key === 'true' };
      } else if (['MULTIPLE_CHOICE', 'MULTIPLE_RESPONSE'].includes(newQuestion.type)) {
        payload.answer = { keys: newQuestion.options?.filter((o: any) => o.isCorrect).map((o: any) => o.key) };
      } else if (['SHORT_ANSWER', 'FILL_BLANK'].includes(newQuestion.type)) {
        payload.answer = { text: newQuestion.answer?.text || '', variants: newQuestion.answer?.text ? [newQuestion.answer.text] : [] };
      } else if (newQuestion.type === 'NUMERIC') {
        payload.answer = { number: Number(newQuestion.answer?.number) || 0, tolerance: Number(newQuestion.answer?.tolerance) || 0 };
      } else if (newQuestion.type === 'ESSAY') {
        payload.answer = null;
      }
      const res = await api.post('/assessment/questions', payload);
      const qid = res.data?.data?.id;
      await api.post(`/assessment/assessments/${detail.id}/questions`, { questionIds: [qid], points: Number(newQuestion.points) || 1 });
      showToast('Soal baru dibuat dan dilampirkan');
      setIsNewQuestionModal(false);
      setNewQuestion(emptyNewQuestion);
      fetchDetail();
    } catch (e: any) {
      showToast(e.response?.data?.errors?.[0]?.message || e.response?.data?.detail || 'Gagal membuat soal', 'error');
    } finally {
      setSavingNewQuestion(false);
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700', SCHEDULED: 'bg-blue-100 text-blue-700', READY: 'bg-cyan-100 text-cyan-700',
      RUNNING: 'bg-purple-100 text-purple-700', FINISHED: 'bg-gray-100 text-gray-700', REVIEW: 'bg-amber-100 text-amber-700',
      PUBLISHED: 'bg-green-100 text-green-700', ARCHIVED: 'bg-orange-100 text-orange-700',
    };
    return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${map[s] || 'bg-gray-100'}`}>{s}</span>;
  };

  if (loading && !detail) {
    return <div className="py-20 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" /></div>;
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {!detail ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center text-gray-500">Ujian tidak ditemukan</div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => navigate('/dashboard/assessment/builder')} className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50">
              <ArrowLeft size={16} /> Kembali
            </button>
            <h2 className="text-2xl font-bold text-gray-900">{detail.title}</h2>
            {statusBadge(detail.status)}
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
            <span>Status: <b>{detail.status}</b></span>
            <span>Durasi: <b>{detail.durationMinutes} mnt</b></span>
            <span>Soal: <b>{detail.questions?.length ?? detail.questionCount}</b></span>
            <span>Bobot: <b>{detail.maxPoints}</b></span>
            <span>Lulus: <b>{detail.passingScore}%</b></span>
            <span>Batas: <b>{detail.attemptLimit}x</b></span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2"><Link2 size={16} /> Kelola Soal</h4>
            <button onClick={() => { loadQuestionBank(); }} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg">
              <BookOpen size={16} /> Pilih dari Bank Soal
            </button>
            <button onClick={() => setIsNewQuestionModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg">
              <Plus size={16} /> Tambah Soal Baru
            </button>
            <button onClick={loadResults} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50">
              <Eye size={16} /> Lihat Hasil
            </button>
          </div>

          {questionBank.length > 0 && (
            <div className="border border-primary-200 bg-primary-50/50 rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <input value={qbSearch} onChange={e => { setQbSearch(e.target.value); setQbMeta({ ...qbMeta, page: 1 }); }} placeholder="Cari soal bank..."
                  className="flex-1 min-w-[200px] px-3 py-2 border rounded-md text-sm" />
                <input type="number" value={attachPoints} onChange={e => setAttachPoints(e.target.value)} className="w-24 px-3 py-2 border rounded-md text-sm" placeholder="Poin" />
                <button onClick={attachSelected} disabled={!selectedQuestions.length} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-40">
                  Lampirkan ({selectedQuestions.length})
                </button>
                <button onClick={() => { setQuestionBank([]); }} className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Tutup</button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {questionBank.map((q: any) => (
                  <label key={q.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-white cursor-pointer">
                    <input type="checkbox" checked={selectedQuestions.includes(q.id)} onChange={() => toggleSelect(q.id)} className="h-4 w-4 mt-0.5 rounded border-gray-300 text-primary-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-800 line-clamp-1" dangerouslySetInnerHTML={{ __html: q.prompt }} />
                      <div className="text-xs text-gray-500">{q.type} • {q.difficulty} • {q.points} poin</div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{qbMeta.total} soal tersedia</span>
                <div className="flex gap-2">
                  <button disabled={qbMeta.page === 1} onClick={() => setQbMeta({ ...qbMeta, page: qbMeta.page - 1 })} className="px-2 py-1 border rounded disabled:opacity-40">Prev</button>
                  <button disabled={qbMeta.page === qbMeta.totalPages} onClick={() => setQbMeta({ ...qbMeta, page: qbMeta.page + 1 })} className="px-2 py-1 border rounded disabled:opacity-40">Next</button>
                </div>
              </div>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b flex flex-wrap items-center justify-between gap-3">
              <span className="font-semibold text-sm text-gray-700">Soal Terlampir <span className="text-gray-400 font-normal">({detail.questions?.length ?? 0}) • total {detail.maxPoints} poin</span></span>
              <div className="flex items-center gap-2">
                <input type="number" value={balanceTotal} onChange={e => setBalanceTotal(e.target.value)} className="w-24 px-3 py-1.5 border rounded-md text-sm" placeholder="Total" />
                <button onClick={balanceQuestions} disabled={balancing} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">
                  <Scale size={13} /> {balancing ? 'Membagi...' : 'Bobot Otomatis'}
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {(detail.questions || []).map((q: any, i: number) => {
                const qid = q.question?.id || q.questionId || q.id;
                const pts = questionPoints[qid] ?? String(q.points ?? q.question?.points ?? 1);
                return (
                  <div key={qid} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xs font-mono text-gray-400 w-6">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 line-clamp-1" dangerouslySetInnerHTML={{ __html: q.prompt || q.question?.prompt || '' }} />
                      <div className="text-xs text-gray-500">{q.type || q.question?.type} • {(q.points ?? q.question?.points ?? 1)} poin</div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={pts}
                      onChange={e => setQuestionPoints({ ...questionPoints, [qid]: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { setQuestionPoint(qid, Number(pts) || 0); setQuestionPoints({ ...questionPoints, [qid]: String(Number(pts) || 0) }); }
                      }}
                      onBlur={() => { setQuestionPoint(qid, Number(pts) || 0); setQuestionPoints({ ...questionPoints, [qid]: String(Number(pts) || 0) }); }}
                      className="w-20 px-2 py-1.5 border rounded-md text-sm text-center"
                      title="Bobot soal (Enter/selesai untuk simpan)"
                    />
                    <button onClick={() => removeQuestion(qid)} className="text-gray-400 hover:text-red-600 p-1" title="Lepas"><Unlink size={16} /></button>
                  </div>
                );
              })}
              {!detail.questions?.length && <div className="px-4 py-8 text-center text-gray-400 text-sm">Belum ada soal terlampir</div>}
            </div>
          </div>

          {analytics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['Peserta', analytics.participantCount], ['Submit', analytics.submittedCount],
                ['Rata-rata', `${analytics.averageScore}%`], ['Tertinggi', `${analytics.highestScore}%`],
              ].map(([label, value]) => (
                <div key={String(label)} className="border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-500 mt-1">{label}</div>
                </div>
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-sm text-gray-700">Hasil Pengerjaan</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-left">
                    <tr>
                      <th className="px-4 py-2 font-medium">Siswa</th>
                      <th className="px-4 py-2 font-medium">Nilai</th>
                      <th className="px-4 py-2 font-medium">Pct</th>
                      <th className="px-4 py-2 font-medium">Grade</th>
                      <th className="px-4 py-2 font-medium">Lulus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.map((r: any) => (
                      <tr key={r.id}>
                        <td className="px-4 py-2">{r.studentName || r.studentId}</td>
                        <td className="px-4 py-2">{r.rawScore}/{r.totalPoints}</td>
                        <td className="px-4 py-2">{r.percentage}%</td>
                        <td className="px-4 py-2 font-bold">{r.grade}</td>
                        <td className="px-4 py-2">{r.passed ? <span className="text-green-600">✓</span> : <span className="text-red-500">✗</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tambah Soal Baru Modal */}
      <Modal isOpen={isNewQuestionModal} onClose={() => setIsNewQuestionModal(false)} title="Tambah Soal Baru" width="max-w-3xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipe Soal</label>
              <select value={newQuestion.type} onChange={e => setNewQuestion({ ...newQuestion, type: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm">
                {QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Kesulitan</label>
              <select value={newQuestion.difficulty} onChange={e => setNewQuestion({ ...newQuestion, difficulty: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm">
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tingkat Bloom</label>
              <select value={newQuestion.bloomLevel} onChange={e => setNewQuestion({ ...newQuestion, bloomLevel: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm">
                {BLOOM_LEVELS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bobot Awal</label>
              <input type="number" min={0} value={newQuestion.points} onChange={e => setNewQuestion({ ...newQuestion, points: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Pertanyaan (HTML)</label>
            <textarea value={newQuestion.prompt} onChange={e => setNewQuestion({ ...newQuestion, prompt: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Tulis pertanyaan..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Pembahasan (opsional)</label>
            <textarea value={newQuestion.explanation} onChange={e => setNewQuestion({ ...newQuestion, explanation: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>

          {['MULTIPLE_CHOICE', 'MULTIPLE_RESPONSE', 'TRUE_FALSE'].includes(newQuestion.type) && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">Opsi Jawaban</label>
              {newQuestion.type === 'TRUE_FALSE' && (
                <div className="flex gap-4 px-1 py-1">
                  {['true', 'false'].map(k => (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <input type="radio" name="tf" checked={newQuestion.options?.[0]?.key === k} onChange={() => {
                        const options = [{ key: 'true', label: 'Benar', isCorrect: k === 'true' }, { key: 'false', label: 'Salah', isCorrect: k === 'false' }];
                        setNewQuestion({ ...newQuestion, options, answer: { boolean: k === 'true' } });
                      }} className="h-4 w-4" />
                      {k === 'true' ? 'Benar' : 'Salah'}
                    </label>
                  ))}
                </div>
              )}
              {newQuestion.type !== 'TRUE_FALSE' && (
                <div className="space-y-2">
                  {(newQuestion.options || []).map((o: any, i: number) => (
                    <div key={o.key} className="flex items-center gap-2">
                      <input
                        type={newQuestion.type === 'MULTIPLE_RESPONSE' ? 'checkbox' : 'radio'}
                        name="opt" checked={!!o.isCorrect}
                        onChange={e => setNQCorrect(i, e.target.checked)}
                        className="h-4 w-4" />
                      <input value={o.label} onChange={e => updateNQOption(i, 'label', e.target.value)} className="flex-1 px-3 py-2 border rounded-md text-sm" placeholder={`Opsi ${o.key}`} />
                      {newQuestion.options.length > 1 && <button onClick={() => {
                        const options = newQuestion.options.filter((_: any, idx: number) => idx !== i);
                        const correct = options.filter((x: any) => x.isCorrect).map((x: any) => x.key);
                        setNewQuestion({ ...newQuestion, options, answer: { ...(newQuestion.answer || {}), keys: correct } });
                      }} className="text-gray-400 hover:text-red-600 p-1"><X size={16} /></button>}
                    </div>
                  ))}
                  <button onClick={addNQOption} className="flex items-center gap-1.5 text-sm text-primary-600 hover:underline"><Plus size={14} /> Tambah opsi</button>
                </div>
              )}
            </div>
          )}

          {(newQuestion.type === 'SHORT_ANSWER' || newQuestion.type === 'FILL_BLANK') && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Jawaban Benar</label>
              <input value={newQuestion.answer?.text || ''} onChange={e => setNewQuestion({ ...newQuestion, answer: { ...(newQuestion.answer || {}), text: e.target.value } })} className="w-full px-3 py-2 border rounded-md text-sm" />
            </div>
          )}
          {newQuestion.type === 'NUMERIC' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nilai Numerik</label>
                <input type="number" value={newQuestion.answer?.number || 0} onChange={e => setNewQuestion({ ...newQuestion, answer: { ...(newQuestion.answer || {}), number: e.target.value } })} className="w-full px-3 py-2 border rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Toleransi</label>
                <input type="number" value={newQuestion.answer?.tolerance || 0} onChange={e => setNewQuestion({ ...newQuestion, answer: { ...(newQuestion.answer || {}), tolerance: e.target.value } })} className="w-full px-3 py-2 border rounded-md text-sm" />
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={() => setIsNewQuestionModal(false)} className="px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Batal</button>
            <button onClick={createAndAttach} disabled={savingNewQuestion} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50">
              <Save size={15} /> {savingNewQuestion ? 'Menyimpan...' : 'Simpan & Lampirkan'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
