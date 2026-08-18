import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/axios';
import { Clock, Flag, Send, ChevronLeft, ChevronRight, CheckCircle2, ShieldAlert, WifiOff, Maximize2, MonitorSmartphone, Lock } from 'lucide-react';
import { useExamLockdown } from '../../hooks/useExamLockdown';
import { ExamLockOverlay } from '../../components/ui/ExamLockOverlay';

interface AttemptQuestion {
  refId: string;
  questionId: string;
  orderIndex: number;
  points: number;
  type: string;
  prompt: string;
  options: any[] | null;
  caseData: any;
  matchChoices: string[] | null;
  orderItems: string[] | null;
  flagged: boolean;
  visited: boolean;
  status: string;
  response: any;
}

interface Attempt {
  id: string;
  assessmentId: string;
  attemptNumber: number;
  status: string;
  startedAt: string;
  expectedEndTime: string;
  submittedAt: string | null;
  totalSecondsLeft: number;
  tabSwitches: number;
  fullscreenExits: number;
  networkDisconnects: number;
  proctoringStatus: string;
  questions: AttemptQuestion[];
}

export const AttemptPlayer = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);
  const attemptRef = useRef<Attempt | null>(null);

  // ---------- ExamBro-style lockdown ----------
  const lockdown = useExamLockdown({
    attemptId: started ? attempt?.id : undefined,
    maxViolations: 3,
    awaySecondsLimit: 90,
    heartbeatIntervalMs: 15000,
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const enterFullscreen = () => {
    const el = document.documentElement as any;
    const req = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el) ?? el.msRequestFullscreen?.bind(el);
    if (req) req().catch(() => {});
  };

  const doSubmit = useCallback(async (auto = false) => {
    const attemptNow = attemptRef.current;
    if (!attemptNow || submittedRef.current || submitting) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      await api.post(`/assessment/attempts/${attemptNow.id}/submit`);
      setSubmitted(true);
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (e: any) {
      submittedRef.current = false;
      showToast(e.response?.data?.detail || 'Gagal mengumpulkan', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [submitting]);

  // ---------- Start gate ----------
  const beginExam = async () => {
    enterFullscreen();
    setStarted(true);
    if (!attemptId) return;
    setLoading(true);
    try {
      const res = await api.post(`/assessment/attempts/${attemptId}/resume`);
      const a = res.data.data;
      if (!a || a.status === 'COMPLETED' || a.status === 'MANUAL_SUBMITTED' || a.status === 'AUTO_SUBMITTED') {
        setSubmitted(true);
        return;
      }
      setAttempt(a);
      attemptRef.current = a;
      setSecondsLeft(a.totalSecondsLeft);
    } catch (e: any) {
      showToast(e.response?.data?.detail || 'Gagal memuat ujian', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Timer ----------
  useEffect(() => {
    if (attempt && secondsLeft > 0 && !submitted) {
      timerRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            doSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [attempt?.id, secondsLeft === 0, submitted]);

  // ---------- Answer handling ----------
  const saveAnswer = async (q: AttemptQuestion, response: any) => {
    const attemptNow = attemptRef.current;
    if (!attemptNow || submittedRef.current || lockdown.locked) return;
    setSaving(true);
    const optimistic = attemptNow.questions.map((x) => x.refId === q.refId ? { ...x, response, visited: true } : x);
    const next = { ...attemptNow, questions: optimistic };
    setAttempt(next);
    attemptRef.current = next;
    try {
      await api.put(`/assessment/attempts/${attemptNow.id}/questions/${q.refId}/answer`, { response, visited: true });
    } catch (e: any) {
      showToast(e.response?.data?.detail || 'Gagal menyimpan jawaban', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleFlag = async (q: AttemptQuestion) => {
    const attemptNow = attemptRef.current;
    if (!attemptNow || lockdown.locked) return;
    const flagged = !q.flagged;
    const optimistic = attemptNow.questions.map((x) => x.refId === q.refId ? { ...x, flagged } : x);
    const next = { ...attemptNow, questions: optimistic };
    setAttempt(next);
    attemptRef.current = next;
    try {
      await api.put(`/assessment/attempts/${attemptNow.id}/questions/${q.refId}/answer`, { response: q.response, flagged, visited: true });
    } catch { /* ignore */ }
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const isAnswered = (q: AttemptQuestion) => {
    if (!q.response) return false;
    if (typeof q.response === 'string') return !!q.response.trim();
    if (Array.isArray(q.response.keys)) return q.response.keys.length > 0;
    if (Array.isArray(q.response.pairs)) return q.response.pairs.length > 0;
    if (Array.isArray(q.response.sequence)) return q.response.sequence.length > 0;
    if (typeof q.response.text === 'string') return !!q.response.text.trim();
    if (typeof q.response.boolean === 'boolean') return true;
    if (typeof q.response.number === 'number') return true;
    return false;
  };

  const answeredCount = attempt?.questions.filter(isAnswered).length || 0;

  // ---------- MATCHING / ORDERING renderers ----------
  const renderMatching = (q: AttemptQuestion) => {
    const opts = q.options || [];
    const choices = q.matchChoices || [];
    const pairs = Array.isArray(q.response?.pairs) ? q.response.pairs : [];

    const setRightFor = (left: string, right: string) => {
      const rest = pairs.filter((p: any) => p.left !== left && p.right !== right);
      const nextPairs = right ? [...rest, { left, right }] : pairs.filter((p: any) => p.left !== left);
      saveAnswer(q, { pairs: nextPairs });
    };

    const chosenForOther = (right: string, left: string) => pairs.some((p: any) => p.right === right && p.left !== left);

    return (
      <div className="space-y-3">
        {opts.map((o: any) => {
          const current = pairs.find((p: any) => p.left === o.label);
          return (
            <div key={o.key} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border border-gray-200">
              <div className="flex-1 text-sm font-medium text-gray-800">{o.label}</div>
              <select
                className="sm:w-64 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                value={current?.right || ''}
                onChange={(e) => setRightFor(o.label, e.target.value)}
              >
                <option value="">— pilih pasangan —</option>
                {choices.map((c: string) => (
                  <option key={c} value={c} disabled={chosenForOther(c, o.label)}>{c}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    );
  };

  const renderOrdering = (q: AttemptQuestion) => {
    const items = q.orderItems || [];
    const currentSeq = Array.isArray(q.response?.sequence) ? q.response.sequence : [];
    const remaining = items.filter((i: string) => !currentSeq.includes(i));

    const moveUp = (idx: number) => {
      if (idx <= 0) return;
      const next = [...currentSeq];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      saveAnswer(q, { sequence: next });
    };
    const moveDown = (idx: number) => {
      if (idx >= currentSeq.length - 1) return;
      const next = [...currentSeq];
      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
      saveAnswer(q, { sequence: next });
    };
    const addItem = (item: string) => saveAnswer(q, { sequence: [...currentSeq, item] });
    const removeItem = (item: string) => saveAnswer(q, { sequence: currentSeq.filter((x: string) => x !== item) });

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          {currentSeq.map((item: string, idx: number) => (
            <div key={item} className="flex items-center gap-2 p-3 rounded-lg border border-primary-200 bg-primary-50/50">
              <span className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
              <span className="flex-1 text-sm text-gray-800">{item}</span>
              <button onClick={() => moveUp(idx)} disabled={idx === 0} className="px-2 py-1 text-xs border rounded hover:bg-white disabled:opacity-40">↑</button>
              <button onClick={() => moveDown(idx)} disabled={idx >= currentSeq.length - 1} className="px-2 py-1 text-xs border rounded hover:bg-white disabled:opacity-40">↓</button>
              <button onClick={() => removeItem(item)} className="px-2 py-1 text-xs border rounded text-red-500 hover:bg-white">✕</button>
            </div>
          ))}
          {currentSeq.length === 0 && (
            <div className="p-4 text-sm text-gray-400 text-center border border-dashed border-gray-200 rounded-lg">
              Klik item di bawah untuk menambahkan urutan
            </div>
          )}
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Item tersedia</div>
          <div className="flex flex-wrap gap-2">
            {remaining.map((item: string) => (
              <button key={item} onClick={() => addItem(item)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">{item}</button>
            ))}
            {remaining.length === 0 && <span className="text-xs text-gray-400">Semua item sudah diurutkan.</span>}
          </div>
        </div>
      </div>
    );
  };

  const renderQuestion = (q: AttemptQuestion) => {
    const opts = q.options || [];
    const isChecked = (key: string) => Array.isArray(q.response?.keys) && q.response.keys.includes(key);

    switch (q.type) {
      case 'MULTIPLE_CHOICE':
        return (
          <div className="space-y-2">
            {opts.map((o: any) => (
              <label key={o.key} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isChecked(o.key) ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name={q.refId} checked={isChecked(o.key)} onChange={() => saveAnswer(q, { keys: [o.key] })} className="h-4 w-4 text-primary-600" />
                <span className="text-sm text-gray-800">{o.label}</span>
              </label>
            ))}
          </div>
        );
      case 'MULTIPLE_RESPONSE':
        return (
          <div className="space-y-2">
            {opts.map((o: any) => (
              <label key={o.key} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isChecked(o.key) ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="checkbox" checked={isChecked(o.key)} onChange={(e) => {
                  const keys = new Set(q.response?.keys || []);
                  if (e.target.checked) keys.add(o.key); else keys.delete(o.key);
                  saveAnswer(q, { keys: [...keys] });
                }} className="h-4 w-4 text-primary-600 rounded" />
                <span className="text-sm text-gray-800">{o.label}</span>
              </label>
            ))}
          </div>
        );
      case 'TRUE_FALSE':
        return (
          <div className="space-y-2">
            {opts.map((o: any) => (
              <label key={o.key} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${q.response?.boolean === (o.key === 'true') ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name={q.refId} checked={q.response?.boolean === (o.key === 'true')} onChange={() => saveAnswer(q, { boolean: o.key === 'true' })} className="h-4 w-4 text-primary-600" />
                <span className="text-sm text-gray-800">{o.label}</span>
              </label>
            ))}
          </div>
        );
      case 'NUMERIC':
        return (
          <input type="number" step="any" value={q.response?.number ?? ''} onChange={(e) => saveAnswer(q, { number: e.target.value === '' ? null : Number(e.target.value) })}
            className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Masukkan angka" />
        );
      case 'MATCHING':
        return renderMatching(q);
      case 'ORDERING':
        return renderOrdering(q);
      case 'FILL_BLANK':
      case 'SHORT_ANSWER':
        return (
          <input value={q.response?.text ?? ''} onChange={(e) => saveAnswer(q, { text: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Tulis jawaban..." />
        );
      case 'ESSAY':
      case 'CASE_STUDY':
      case 'READING_COMPREHENSION':
        return (
          <textarea value={q.response?.text ?? ''} onChange={(e) => saveAnswer(q, { text: e.target.value })} rows={8}
            className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Tulis jawaban uraian..." />
        );
      default:
        return (
          <textarea value={q.response?.text ?? ''} onChange={(e) => saveAnswer(q, { text: e.target.value })} rows={5}
            className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Tulis jawaban..." />
        );
    }
  };

  // ---------- Success screen ----------
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ujian Terkumpul</h2>
          <p className="text-sm text-gray-500 mb-6">Jawaban Anda telah berhasil dikumpulkan.</p>
          <button onClick={() => navigate('/dashboard/assessment/results')} className="px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg">
            Lihat Hasil
          </button>
        </div>
      </div>
    );
  }

  // ---------- Start gate (ExamBro style) ----------
  if (!started) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-5">
            <MonitorSmartphone size={30} />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-3">Ujian Terawasi</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            Ujian berlangsung dalam mode pengawasan. Selama mengerjakan Anda <b>tidak boleh</b>:
          </p>
          <ul className="text-left text-sm text-gray-600 space-y-2 mb-6">
            <li className="flex items-start gap-2"><Lock size={16} className="text-red-500 mt-0.5 flex-shrink-0" /> Pindah ke tab / aplikasi lain</li>
            <li className="flex items-start gap-2"><Lock size={16} className="text-red-500 mt-0.5 flex-shrink-0" /> Membuka notifikasi (tarik dari atas)</li>
            <li className="flex items-start gap-2"><Lock size={16} className="text-red-500 mt-0.5 flex-shrink-0" /> Membelah layar (split-screen) di Android</li>
            <li className="flex items-start gap-2"><Lock size={16} className="text-red-500 mt-0.5 flex-shrink-0" /> Keluar dari mode layar penuh</li>
          </ul>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 mb-6">
            Pelanggaran dicatat. 3 pelanggaran = ujian dikumpulkan otomatis.
          </div>
          <button
            onClick={beginExam}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-lg shadow-primary-600/25 transition-all"
          >
            <Maximize2 size={18} /> Mulai Ujian — Layar Penuh
          </button>
        </div>
      </div>
    );
  }

  if (loading || !attempt) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  const q = attempt.questions[currentIdx];
  if (!q) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* ExamBro lock overlay */}
      {lockdown.locked && (
        <ExamLockOverlay
          message={lockdown.lockMessage}
          violations={lockdown.violations}
          awaySeconds={lockdown.awaySeconds}
          offline={lockdown.offline}
          permanentlyLocked={lockdown.permanentlyLocked}
          maxViolations={3}
          onResume={lockdown.resume}
        />
      )}

      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ujian</span>
          <span className="text-sm font-semibold text-gray-900">Percobaan #{attempt.attemptNumber}</span>
          {lockdown.fullscreen ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <Maximize2 size={10} /> TERAWASI
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              <Maximize2 size={10} /> KELUAR LAYAR PENUH
            </span>
          )}
          {lockdown.offline && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              <WifiOff size={10} /> OFFLINE
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lockdown.violations > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
              <ShieldAlert size={14} /> {lockdown.violations} pelanggaran
            </span>
          )}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-sm font-semibold ${secondsLeft < 60 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-700'}`}>
            <Clock size={16} /> {fmtTime(secondsLeft)}
          </div>
          <button onClick={() => setConfirmSubmit(true)} disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50">
            <Send size={16} /> {submitting ? 'Mengumpulkan...' : 'Kumpulkan'}
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="flex-1 w-full max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gray-400 px-2 py-1 bg-gray-50 rounded">{q.type}</span>
              <span className="text-xs text-gray-400">{q.points} poin</span>
            </div>
            <button onClick={() => toggleFlag(q)} className={`flex items-center gap-1 text-xs font-medium p-1.5 rounded-lg ${q.flagged ? 'bg-amber-50 text-amber-600' : 'text-gray-400 hover:bg-gray-50'}`}>
              <Flag size={14} /> {q.flagged ? 'Ditandai' : 'Tandai'}
            </button>
          </div>
          <div className="text-sm text-gray-900 leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: q.prompt }} />
          {renderQuestion(q)}
          {saving && <div className="text-xs text-gray-400 mt-3">Menyimpan...</div>}
          <div className="flex justify-between mt-8 pt-4 border-t border-gray-100">
            <button onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              <ChevronLeft size={16} /> Sebelumnya
            </button>
            <button onClick={() => setCurrentIdx(Math.min(attempt.questions.length - 1, currentIdx + 1))} disabled={currentIdx === attempt.questions.length - 1}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              Berikutnya <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Navigator */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-fit lg:sticky lg:top-20">
          <div className="text-sm font-semibold text-gray-900 mb-1">Navigasi Soal</div>
          <div className="text-xs text-gray-500 mb-3">Terjawab {answeredCount}/{attempt.questions.length}</div>
          <div className="grid grid-cols-5 gap-2">
            {attempt.questions.map((x, i) => {
              const answered = isAnswered(x);
              const cls = i === currentIdx
                ? 'border-primary-600 text-primary-700 bg-primary-50 ring-2 ring-primary-100'
                : answered
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : x.flagged
                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                    : 'bg-gray-50 text-gray-600 border-gray-200';
              return (
                <button key={x.refId} onClick={() => setCurrentIdx(i)} className={`h-9 text-xs font-semibold rounded-lg border ${cls}`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-200 inline-block" /> Terjawab</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-100 inline-block" /> Ditandai</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-gray-200 inline-block" /> Belum dijawab</div>
          </div>
        </div>
      </div>

      {/* Submit confirm modal */}
      {confirmSubmit && (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Kumpulkan Ujian?</h3>
            <p className="text-sm text-gray-500 mb-6">
              {answeredCount}/{attempt.questions.length} soal terjawab. Anda tidak dapat mengubah jawaban setelah dikumpulkan.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmSubmit(false)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50">
                Batal
              </button>
              <button onClick={() => { setConfirmSubmit(false); doSubmit(); }} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700">
                Kumpulkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
