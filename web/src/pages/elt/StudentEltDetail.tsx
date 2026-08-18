import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/axios';
import { Mic, Square, Play, Pause, PenLine, SpellCheck, Send, CheckCircle2, RotateCcw, ArrowLeft, ArrowRight, Volume2, MessageSquare, Layers, Star } from 'lucide-react';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';

const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const StudentEltDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  // Recording state
  const [recording, setRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingSec, setRecordingSec] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Writing
  const [content, setContent] = useState('');
  const [grammarReport, setGrammarReport] = useState<any[]>([]);
  const [checked, setChecked] = useState(false);

  // Cloze answers
  const [clozeAnswers, setClozeAnswers] = useState<Record<string, string>>({});
  const [clozeResult, setClozeResult] = useState<any>(null);

  // Flashcard
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set());

  // Quiz
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

  // Reading
  const [readingDone, setReadingDone] = useState(false);

  // Comments
  const [newComment, setNewComment] = useState('');

  const type = activity?.activityType;
  const items = activity?.items || [];
  const isCollab = type === 'DISCUSSION' || type === 'PEER_REVIEW';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [aRes, cRes] = await Promise.all([
        api.get(`/elt/activities/${id}`),
        api.get(`/elt/activities/${id}/comments`),
      ]);
      setActivity(aRes.data);
      setComments(cRes.data.data || []);
      setContent(aRes.data.myAttempt?.content || '');
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ---- Recording helpers ----
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        setRecordingBlob(blob);
        setRecordingUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordingSec(0);
      timerRef.current = setInterval(() => setRecordingSec((s) => s + 1), 1000);
    } catch {
      alert('Tidak dapat mengakses mikrofon. Pastikan izin mikrofon diberikan.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  };

  const handleSubmitRecording = async () => {
    if (!recordingBlob) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('audio', recordingBlob, 'recording.webm');
      fd.append('activityId', id!);
      fd.append('recordingDurationSec', String(recordingSec));
      await api.post('/elt/attempts', fd);
      setRecordingUrl(null);
      setRecordingBlob(null);
      fetchAll();
      alert('Pengiriman berhasil!');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Gagal mengirim audio.');
    } finally {
      setSaving(false);
    }
  };

  // ---- Grammar & spelling checker (rule-based, client-side) ----
  const runGrammarCheck = () => {
    if (!content.trim()) { setChecked(true); setGrammarReport([]); return; }
    const text = content;
    const report: any[] = [];
    const add = (index: number, word: string, fix: string, note: string) => report.push({ index, word, fix, note });

    // Common misspellings (trie-ish list)
    const misspellings: Record<string, string> = {
      'recieve': 'receive', 'seperate': 'separate', 'definately': 'definitely', 'occured': 'occurred',
      'writting': 'writing', 'untill': 'until', 'wich': 'which', 'teh': 'the', 'alot': 'a lot',
      'everyday': 'every day', 'i': 'I', 'im': "I'm", 'dont': "don't", 'cant': "can't", 'isnt': "isn't",
      'arent': "aren't", 'wont': "won't", 'ive': "I've", 'youre': "you're", 'theyre': "they're",
      'couldve': "could've", 'doesnt': "doesn't", 'wasnt': "wasn't", 'didnt': "didn't",
    };
    const words = text.split(/\s+/);
    words.forEach((w, i) => {
      const cleaned = w.replace(/[^a-zA-Z']/g, '');
      const key = cleaned.toLowerCase();
      if (misspellings[key] && cleaned !== misspellings[key]) {
        add(i, cleaned, misspellings[key], 'Ejaan / bentuk kata');
      }
    });

    // Subject-verb agreement (he/she/it + verb without -s)
    const svaPattern = /\b(he|she|it)\s+(have|do|go|like|want|play|work|study|read|write)\b/gi;
    let m;
    while ((m = svaPattern.exec(text)) !== null) {
      const wrong = `${m[1]} ${m[2]}`;
      const fix = `${m[1]} ${m[2]}s`;
      add(m.index, wrong, fix, 'Kesepakatan subjek-predikat (tambah -s/-es)');
    }

    // Double spaces / repeated words
    const repeatPattern = /\b(\w+)\s+\1\b/gi;
    while ((m = repeatPattern.exec(text)) !== null) {
      if (['the', 'and'].includes(m[1].toLowerCase())) continue;
      add(m.index, m[0], m[1], 'Kata terulang');
    }

    setGrammarReport(report);
    setChecked(true);
  };

  const submitWriting = async () => {
    setSaving(true);
    try {
      await api.post('/elt/attempts', { activityId: id, content, selfGrade: 100 - grammarReport.length * 2 });
      fetchAll();
      alert('Pengiriman berhasil!');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Gagal mengirim tulisan.');
    } finally {
      setSaving(false);
    }
  };

  // ---- Cloze submit ----
  const submitCloze = async () => {
    const missing = items.filter((i: any) => !clozeAnswers[i.id]?.trim());
    if (missing.length) { alert('Masih ada jawaban yang kosong.'); return; }
    let score = 0;
    const result = items.map((i: any) => {
      const isCorrect = clozeAnswers[i.id]?.trim().toLowerCase() === (i.back || '').toLowerCase();
      if (isCorrect) score += 1;
      return { id: i.id, correct: isCorrect, expected: i.back };
    });
    const pct = items.length ? Math.round((score / items.length) * 100) : 0;
    setClozeResult({ result, score, pct });
    setSaving(true);
    try {
      await api.post('/elt/attempts', { activityId: id, answers: { cloze: clozeAnswers }, selfGrade: pct });
      fetchAll();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  // ---- Quiz submit ----
  const submitQuiz = async () => {
    const missing = items.filter((i: any) => !quizAnswers[i.id]);
    if (missing.length) { alert('Masih ada soal yang belum dijawab.'); return; }
    let score = 0;
    items.forEach((i: any) => { if (quizAnswers[i.id] === i.back) score += 1; });
    const pct = items.length ? Math.round((score / items.length) * 100) : 0;
    setSaving(true);
    try {
      await api.post('/elt/attempts', { activityId: id, answers: { quiz: quizAnswers }, selfGrade: pct });
      fetchAll();
      alert(`Skor Anda: ${score}/${items.length} (${pct}%)`);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Gagal mengirim kuis.');
    } finally { setSaving(false); }
  };

  // ---- Flashcard ----
  const markKnown = (cardId: string) => {
    const next = new Set(knownCards); next.add(cardId); setKnownCards(next);
    setFlipped(false);
    setTimeout(() => setCardIndex((i) => Math.min(i + 1, items.length - 1)), 150);
  };
  const flashDone = items.length > 0 && knownCards.size >= items.length;

  // ---- Discussion / comment ----
  const handleComment = async () => {
    if (!newComment.trim()) return;
    setSaving(true);
    try {
      await api.post(`/elt/activities/${id}/comments`, { content: newComment });
      setNewComment('');
      fetchAll();
    } catch (err) { alert('Gagal mengirim komentar.'); } finally { setSaving(false); }
  };

  const submitDiscussion = async () => {
    // For discussion, require at least one comment posted
    if (!content.trim()) { alert('Tulis jawaban Anda dulu.'); return; }
    setSaving(true);
    try {
      await api.post('/elt/attempts', { activityId: id, content });
      await api.post(`/elt/activities/${id}/comments`, { content });
      fetchAll();
      alert('Berhasil mengirim kontribusi diskusi!');
    } catch (err: any) { alert(err?.response?.data?.error || 'Gagal mengirim.'); } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <BackButton to="/dashboard/study/bahasa-inggris" label="Kembali ke Bahasa Inggris" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }
  if (error || !activity) return <ErrorState message="Gagal memuat aktivitas." onRetry={fetchAll} />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-12">
      <BackButton to="/dashboard/study/bahasa-inggris" label="Kembali ke Bahasa Inggris" />
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-primary-50 text-primary-700 rounded-md">{activity.skillType}</span>
          <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-gray-100 text-gray-600 rounded-md">{activity.activityType.replace(/_/g, ' ')}</span>
          {activity.cefrLevel && <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-teal-50 text-teal-700 rounded-md">CEFR {activity.cefrLevel}</span>}
          <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-gray-50 text-gray-500 rounded-md">{activity.courseName}</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">{activity.title}</h2>
        {activity.instructions && <p className="text-sm text-gray-500 mt-2 whitespace-pre-wrap">{activity.instructions}</p>}
        {attempt?.finalGrade != null && (
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl">
            <CheckCircle2 size={16} /> Nilai: <b>{attempt.finalGrade}</b>
          </div>
        )}
        {attempt?.feedback && (
          <div className="mt-3 bg-primary-50 text-primary-800 text-sm rounded-xl px-4 py-3">
            <b>Feedback Guru:</b> {attempt.feedback}
          </div>
        )}
      </div>

      {/* Prompt config */}
      {activity.config?.prompt && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Topik</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{activity.config.prompt}</p>
        </div>
      )}

      {/* ============ VOICE RECORDING / PRONUNCIATION AI ============ */}
      {(type === 'VOICE_RECORDING' || type === 'PRONUNCIATION_AI') && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-extrabold text-gray-900">Rekam Audio Anda</h3>
          {!recording && !recordingUrl && (
            <button onClick={startRecording} className="flex items-center gap-2 px-5 py-3 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 transition-colors">
              <Mic size={18} /> Mulai Rekam
            </button>
          )}
          {recording && (
            <div className="flex items-center gap-3">
              <button onClick={stopRecording} className="flex items-center gap-2 px-5 py-3 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-700 transition-colors">
                <Square size={16} /> Stop ({recordingSec}s)
              </button>
            </div>
          )}
          {recordingUrl && (
            <div className="space-y-3">
              <audio controls src={recordingUrl} className="w-full" />
              <div className="flex gap-2">
                <button onClick={handleSubmitRecording} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-60">
                  <Send size={16} /> {saving ? 'Mengirim...' : 'Kirim Rekaman'}
                </button>
                <button onClick={() => { setRecordingUrl(null); setRecordingBlob(null); }} className="px-4 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl">
                  <RotateCcw size={15} className="inline mr-1" /> Rekam Ulang
                </button>
              </div>
            </div>
          )}
          {activity.myAttempt?.recordingFileUrl && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Rekaman Anda sebelumnya</p>
              <audio controls src={activity.myAttempt.recordingFileUrl} className="w-full" />
            </div>
          )}
        </div>
      )}

      {/* ============ LISTENING (media + interactive transcript) ============ */}
      {(type === 'LISTENING_VIDEO' || type === 'LISTENING_TRANSCRIPT') && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-extrabold text-gray-900">Dengarkan & Pahami</h3>
          {activity.config?.mediaUrl && (
            activity.config.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
              <video controls src={activity.config.mediaUrl} className="w-full rounded-xl bg-black" />
            ) : (
              <audio controls src={activity.config.mediaUrl} className="w-full" />
            )
          )}
          {activity.config?.transcript && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Transkrip (klik kata untuk lihat panduan)</p>
              <p className="text-sm leading-relaxed text-gray-700 bg-gray-50 rounded-xl p-4 whitespace-pre-wrap">
                {activity.config.transcript.split(/(\s+)/).map((word: string, idx: number) =>
                  /^[a-zA-Z]+$/.test(word) ? (
                    <span key={idx} className="cursor-pointer hover:bg-teal-100 hover:text-teal-800 rounded px-0.5 transition-colors" title={`Word #${idx + 1}`}>{word}</span>
                  ) : <span key={idx}>{word}</span>
                )}
              </p>
            </div>
          )}
          {activity.config?.passage && (
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-4">{activity.config.passage}</p>
          )}
          <button onClick={submitWriting} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-60">
            <CheckCircle2 size={16} /> {saving ? 'Mengirim...' : 'Tandai Sudah Dipelajari'}
          </button>
        </div>
      )}

      {/* ============ READING PASSAGE ============ */}
      {type === 'READING_PASSAGE' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-extrabold text-gray-900">Baca Bacaan</h3>
          {activity.config?.passage && (
            <div className="text-sm leading-relaxed text-gray-800 bg-gray-50 rounded-xl p-5 whitespace-pre-wrap">
              {activity.config.passage.split(/(\s+)/).map((word: string, idx: number) =>
                /^[a-zA-Z]+$/.test(word) ? (
                  <span key={idx} className="cursor-pointer hover:bg-teal-100 hover:text-teal-800 rounded px-0.5 transition-colors" title="Kata">{word}</span>
                ) : <span key={idx}>{word}</span>
              )}
            </div>
          )}
          {activity.config?.transcript && <p className="text-xs text-gray-400">Glosarium terpasang di bacaan.</p>}
          <button onClick={submitWriting} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-60">
            <CheckCircle2 size={16} /> {saving ? 'Mengirim...' : 'Tandai Selesai Membaca'}
          </button>
        </div>
      )}

      {/* ============ WRITING / GRAMMAR ============ */}
      {(type === 'WRITING_ESSAY' || type === 'GRAMMAR_SPELL') && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-extrabold text-gray-900">{type === 'GRAMMAR_SPELL' ? 'Menulis + Grammar Checker' : 'Tulis Esai / Paragraf'}</h3>
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); setChecked(false); }}
            rows={8}
            placeholder="Tulis jawaban Anda di sini..."
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 resize-y"
          />
          {type === 'GRAMMAR_SPELL' && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={runGrammarCheck} className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors">
                <SpellCheck size={16} /> Cek Grammar & Ejaan
              </button>
              {checked && (
                <span className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-xl ${grammarReport.length === 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {grammarReport.length === 0 ? 'Tidak ditemukan masalah' : `${grammarReport.length} potensi masalah ditemukan`}
                </span>
              )}
            </div>
          )}
          {checked && grammarReport.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Saran Perbaikan</p>
              {grammarReport.map((g: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm bg-white rounded-lg px-3 py-2">
                  <div>
                    <span className="text-amber-700 line-through">{g.word}</span>
                    <ArrowRight size={14} className="inline mx-2 text-gray-400" />
                    <span className="text-green-700 font-bold">{g.fix}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{g.note}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button onClick={submitWriting} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-60">
            <Send size={16} /> {saving ? 'Mengirim...' : 'Kirim Tulisan'}
          </button>
        </div>
      )}

      {/* ============ CLOZE TEST ============ */}
      {type === 'CLOZE_TEST' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-extrabold text-gray-900">Isi Bagian yang Rumpang</h3>
          {items.map((i: any, idx: number) => (
            <div key={i.id} className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-700 mb-2">{idx + 1}. {i.front}</p>
              <input
                type="text"
                value={clozeAnswers[i.id] || ''}
                onChange={(e) => setClozeAnswers({ ...clozeAnswers, [i.id]: e.target.value })}
                placeholder="Jawaban Anda..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              {clozeResult && clozeResult.result.find((r: any) => r.id === i.id) && (
                <p className={`text-xs mt-1 font-bold ${clozeResult.result.find((r: any) => r.id === i.id).correct ? 'text-green-600' : 'text-red-500'}`}>
                  {clozeResult.result.find((r: any) => r.id === i.id).correct ? '✓ Benar' : `✗ Salah. Jawaban: ${clozeResult.result.find((r: any) => r.id === i.id).expected}`}
                </p>
              )}
            </div>
          ))}
          {clozeResult && (
            <div className="flex items-center gap-2 px-4 py-3 bg-primary-50 text-primary-800 rounded-xl">
              <CheckCircle2 size={16} /> Skor: {clozeResult.score}/{items.length} ({clozeResult.pct}%)
            </div>
          )}
          <button onClick={submitCloze} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-60">
            <Send size={16} /> {saving ? 'Mengirim...' : 'Periksa & Kirim'}
          </button>
        </div>
      )}

      {/* ============ VOCAB FLASHCARD ============ */}
      {type === 'VOCAB_FLASHCARD' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-extrabold text-gray-900">Flashcards — Hafalkan Kata</h3>
          {items.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada kartu. Guru belum menambahkan item.</p>
          ) : flashDone ? (
            <div className="text-center py-8">
              <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
              <p className="text-lg font-bold text-gray-900">Semua kartu selesai!</p>
              <button onClick={() => { setCardIndex(0); setKnownCards(new Set()); setFlipped(false); }} className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 mx-auto">
                <RotateCcw size={16} /> Ulangi Lagi
              </button>
            </div>
          ) : (
            <div>
              <div
                className="relative h-52 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl cursor-pointer select-none transition-all duration-300"
                onClick={() => setFlipped(!flipped)}
              >
                <div className="absolute inset-0 flex items-center justify-center px-8">
                  <div className="text-center">
                    <p className="text-xs text-white/70 uppercase tracking-widest mb-2">{flipped ? 'Arti' : 'Kata'} • Kartu {cardIndex + 1}/{items.length}</p>
                    <p className="text-2xl font-extrabold text-white">
                      {flipped ? (items[cardIndex].back || items[cardIndex].back) : items[cardIndex].front}
                    </p>
                    {flipped && items[cardIndex].hint && <p className="text-white/80 text-sm mt-2">{items[cardIndex].hint}</p>}
                  </div>
                </div>
                <span className="absolute bottom-3 right-4 text-white/50 text-xs flex items-center gap-1"><Volume2 size={12} /> klik untuk balik</span>
              </div>
              <div className="flex justify-center gap-3 mt-4">
                <button onClick={() => setCardIndex((i) => Math.max(0, i - 1))} disabled={cardIndex === 0} className="px-4 py-2 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">
                  <ArrowLeft size={15} className="inline mr-1" /> Sebelumnya
                </button>
                <button onClick={() => markKnown(items[cardIndex].id)} className="px-4 py-2 text-sm font-bold text-white bg-green-500 rounded-xl hover:bg-green-600">
                  Sudah Hafal ✓
                </button>
                <button onClick={() => setCardIndex((i) => Math.min(items.length - 1, i + 1))} disabled={cardIndex >= items.length - 1} className="px-4 py-2 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">
                  Berikutnya <ArrowRight size={15} className="inline ml-1" />
                </button>
              </div>
              <p className="text-center text-xs text-gray-400 mt-2">Dihafal: {knownCards.size}/{items.length}</p>
            </div>
          )}
        </div>
      )}

      {/* ============ VOCAB QUIZ ============ */}
      {type === 'VOCAB_QUIZ' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-extrabold text-gray-900">Kuis Kosakata</h3>
          {items.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada soal.</p>
          ) : (
            <>
              {items.map((i: any, idx: number) => {
                const opts = (i.options as any[]) || [];
                return (
                  <div key={i.id} className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-800 font-medium mb-3">{idx + 1}. {i.front}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {opts.map((o: any, oi: number) => (
                        <button
                          key={oi}
                          onClick={() => setQuizAnswers({ ...quizAnswers, [i.id]: o })}
                          className={`text-left px-3 py-2 text-sm rounded-lg border transition-colors ${quizAnswers[i.id] === o ? 'border-primary-500 bg-primary-50 text-primary-700 font-semibold' : 'border-gray-200 text-gray-700 hover:bg-white'}`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <button onClick={submitQuiz} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-60">
                <Send size={16} /> {saving ? 'Mengirim...' : 'Kirim & Lihat Skor'}
              </button>
            </>
          )}
        </div>
      )}

      {/* ============ DISCUSSION ============ */}
      {type === 'DISCUSSION' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-extrabold text-gray-900">Forum Diskusi</h3>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="Tulis pendapat / jawaban Anda..."
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
          />
          <button onClick={submitDiscussion} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-60">
            <Send size={16} /> {saving ? 'Mengirim...' : 'Kirim ke Forum'}
          </button>
          {comments.length > 0 && (
            <div className="space-y-3">
              {comments.map((c: any) => (
                <div key={c.id} className="bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-gray-700">{c.authorName}</p>
                    <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString('id-ID')}</span>
                  </div>
                  <p className="text-sm text-gray-700">{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============ PEER REVIEW ============ */}
      {type === 'PEER_REVIEW' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-extrabold text-gray-900">Peer Review</h3>
          <p className="text-sm text-gray-500">Review kiriman teman dan beri penilaian (1-5 bintang).</p>
          {comments.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada kiriman untuk direview.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c: any) => (
                <div key={c.id} className="bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-gray-700">{c.authorName}</p>
                    {c.rating && <span className="flex gap-0.5">{Array.from({ length: c.rating }).map((_, i) => <Star key={i} size={12} className="text-amber-400 fill-amber-400" />)}</span>}
                  </div>
                  <p className="text-sm text-gray-700">{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============ COMMENTS THREAD (shared) ============ */}
      {!isCollab && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2"><MessageSquare size={18} className="text-primary-600" /> Diskusi ({comments.length})</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              placeholder="Tulis komentar..."
              className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
            />
            <button onClick={handleComment} disabled={saving} className="px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-60">
              <Send size={15} />
            </button>
          </div>
          {comments.map((c: any) => (
            <div key={c.id} className="bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-gray-700">{c.authorName}</p>
                <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString('id-ID')}</span>
              </div>
              <p className="text-sm text-gray-700">{c.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
