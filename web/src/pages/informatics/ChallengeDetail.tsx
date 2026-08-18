import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/axios';
import { Play, Loader2, CheckCircle2, XCircle, Sparkles, Mic, FileCode } from 'lucide-react';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';
import { useAuthStore } from '../../stores/authStore';

const DIFF: Record<string, { label: string; color: string }> = {
  EASY: { label: 'Mudah', color: 'bg-green-100 text-green-700' },
  MEDIUM: { label: 'Sedang', color: 'bg-amber-100 text-amber-700' },
  HARD: { label: 'Sulit', color: 'bg-red-100 text-red-700' },
};

export const ChallengeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const isTeacher = user?.role?.slug === 'teacher' || user?.role?.slug === 'admin';
  const [ch, setCh] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [code, setCode] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [review, setReview] = useState('');

  const fetchCh = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await api.get(`/informatics/challenges/${id}`);
      setCh(res.data);
      setCode(res.data.starterCode || '');
    } catch (e) { setError(true); } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchCh(); }, [fetchCh]);

  const submit = async () => {
    setRunning(true); setResult(null);
    try {
      const res = await api.post(`/informatics/challenges/${id}/submit`, { language: ch.language, code });
      setResult(res.data);
    } catch (e: any) { setResult({ status: 'RUNTIME_ERROR', compileError: e?.response?.data?.error || 'Gagal mengirim.', results: [] }); }
    finally { setRunning(false); }
  };

  const runReview = async () => {
    setReview('(memuat...)');
    try { const res = await api.post('/informatics/review', { language: ch.language, code }); setReview(res.data.text || ''); }
    catch (e: any) { setReview(e?.response?.data?.error || 'AI review tidak tersedia.'); }
  };

  if (loading) return <div className="max-w-5xl mx-auto space-y-6"><BackButton to="/dashboard/study/informatika" label="Kembali ke Informatika" /><SkeletonCard /></div>;
  if (error || !ch) return <ErrorState message="Challenge tidak ditemukan." onRetry={fetchCh} />;

  const isAccepted = result?.status === 'ACCEPTED';
  const statusColor: Record<string, string> = {
    ACCEPTED: 'bg-green-100 text-green-700',
    WRONG_ANSWER: 'bg-red-100 text-red-700',
    RUNTIME_ERROR: 'bg-red-100 text-red-700',
    COMPILE_ERROR: 'bg-orange-100 text-orange-700',
    TIME_LIMIT: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-12">
      <BackButton to="/dashboard/study/informatika" label="Kembali ke Informatika" />
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className={`px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-md ${DIFF[ch.difficulty]?.color}`}>{DIFF[ch.difficulty]?.label}</span>
          <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-gray-100 text-gray-600 rounded-md">{ch.language}</span>
          <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-700 rounded-md">🏆 {ch.points} poin</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">{ch.title}</h2>
        <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap max-w-3xl">{ch.description}</p>
        {ch.myAttempt?.status === 'ACCEPTED' && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-xl text-sm font-bold"><CheckCircle2 size={15} /> Terpecahkan — {ch.myAttempt.score} poin</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Code editor */}
        <div className="bg-[#0f1117] rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="px-4 py-2.5 bg-[#161923] border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-300 flex items-center gap-2"><FileCode size={14} className="text-primary-400" /> Solusi Anda ({ch.language})</span>
          </div>
          <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} className="flex-1 bg-transparent text-[#d4d4d4] text-sm font-mono p-4 outline-none resize-y min-h-[340px] leading-relaxed" style={{ colorScheme: 'dark' }} rows={14} />
          <div className="flex gap-2 p-3 bg-[#161923] border-t border-white/10">
            <button onClick={submit} disabled={running || isTeacher} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-60">
              {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} {isTeacher ? 'Autograder (student only)' : 'Kirim & Uji (Submit)'}
            </button>
            <button onClick={runReview} disabled={!ch} className="px-4 py-2.5 flex items-center gap-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700"><Sparkles size={16} /> AI Hint</button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Hasil Autograder</h3>
          {!result && <p className="text-sm text-gray-400">Kirim solusi untuk melihat hasil test case.</p>}
          {result && (
            <>
<div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${statusColor[result.status] || 'bg-gray-100 text-gray-600'}`}>
                {isAccepted ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                {result.status} — {result.passedTests}/{result.totalTests} tes</div>
              {result.compileError && <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 whitespace-pre-wrap">{result.compileError}</div>}
              {Array.isArray(result.results) && result.results.map((r: any, i: number) => (
                <div key={i} className={`rounded-xl px-4 py-2 text-sm border ${r.pass ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                  <p className={`font-mono text-xs mb-1 ${r.pass ? 'text-green-700' : 'text-red-700'}`}>{r.pass ? '✓ tes ' + (i + 1) : '✗ tes ' + (i + 1)}</p>
                  <p className="text-xs text-gray-600 font-mono whitespace-pre-wrap">Input: {r.input} {r.reason ? <span className="text-red-500">· {r.reason}</span> : <>| Harapan: <b>{r.expected}</b> | Dapat: <b>{r.out}</b></>}</p>
                </div>
              ))}
            </>
          )}
          {review && (
            <div className="bg-violet-50 text-violet-900 rounded-xl p-4 text-sm whitespace-pre-wrap">
              <p className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-2 flex items-center gap-1"><Sparkles size={12} /> AI Hint</p>
              {review}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};