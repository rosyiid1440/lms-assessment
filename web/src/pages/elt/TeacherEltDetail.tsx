import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/axios';
import { Play, Pause, CheckCircle, MessageSquare, Users, ArrowLeft, Send, Star, Mic, Headphones, BookOpen, PenLine, SpellCheck, Layers } from 'lucide-react';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';

const SKILL_ICONS: Record<string, any> = { SPEAKING: Mic, LISTENING: Headphones, READING: BookOpen, WRITING: PenLine, GRAMMAR: SpellCheck, VOCABULARY: Layers };

export const TeacherEltDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeForm, setGradeForm] = useState<Record<string, any>>({});
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [aRes, attRes, comRes] = await Promise.all([
        api.get(`/elt/activities/${id}`),
        api.get(`/elt/activities/${id}/attempts`),
        api.get(`/elt/activities/${id}/comments`),
      ]);
      setActivity(aRes.data);
      setAttempts(attRes.data.data || []);
      setComments(comRes.data.data || []);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleGrade = async (attemptId: string) => {
    const f = gradeForm[attemptId] || {};
    try {
      await api.post(`/elt/attempts/${attemptId}/grade`, { finalGrade: f.finalGrade, feedback: f.feedback, status: 'GRADED' });
      await fetchAll();
      setGradingId(null);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Gagal memberi nilai.');
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    setSendingComment(true);
    try {
      await api.post(`/elt/activities/${id}/comments`, { content: newComment });
      setNewComment('');
      fetchAll();
    } catch (err) {
      alert('Gagal mengirim komentar.');
    } finally {
      setSendingComment(false);
    }
  };

  const submitCommentReply = async (content: string, parentId?: string) => {
    try {
      await api.post(`/elt/activities/${id}/comments`, { content, parentId: parentId || undefined });
      fetchAll();
    } catch (err) {
      alert('Gagal mengirim balasan.');
    }
  };

  const SkillIcon = activity ? SKILL_ICONS[activity.skillType] || Layers : Layers;
  const renderAudio = (url: string) => (
    <audio
      controls
      src={url}
      className="w-full h-10"
      onPlay={() => setPlaying(url)}
      onPause={() => setPlaying(url === playing ? null : playing)}
    />
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        <BackButton to="/dashboard/study/bahasa-inggris" label="Kembali ke Bahasa Inggris" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error || !activity) return <ErrorState message="Gagal memuat aktivitas." onRetry={fetchAll} />;

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-12">
      <BackButton to="/dashboard/study/bahasa-inggris" label="Kembali ke Bahasa Inggris" />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-primary-50 text-primary-700 rounded-md flex items-center gap-1">
              <SkillIcon size={14} /> {activity.skillType}
            </span>
            <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-gray-100 text-gray-600 rounded-md">
              {activity.activityType.replace(/_/g, ' ')}
            </span>
            {activity.cefrLevel && <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-teal-50 text-teal-700 rounded-md">CEFR {activity.cefrLevel}</span>}
            <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-gray-50 text-gray-500 rounded-md">{activity.courseName}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">{activity.title}</h2>
          {activity.instructions && <p className="text-sm text-gray-500 mt-2 whitespace-pre-wrap max-w-3xl">{activity.instructions}</p>}
        </div>
        <button
          onClick={() => navigate('/dashboard/teacher/elt')}
          className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-600 text-sm font-bold rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={16} /> Kembali
        </button>
      </div>

      {/* Activity config preview */}
      {activity.config && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Detail Aktivitas</h3>
          {activity.config.prompt && <p className="text-sm text-gray-700 whitespace-pre-wrap"><span className="font-semibold">Prompt:</span> {activity.config.prompt}</p>}
          {activity.config.mediaUrl && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Media:</p>
              {activity.config.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                <video controls src={activity.config.mediaUrl} className="w-full max-w-2xl rounded-xl" />
              ) : (
                <audio controls src={activity.config.mediaUrl} className="w-full max-w-2xl" />
              )}
            </div>
          )}
          {activity.config.transcript && (
            <p className="text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto bg-gray-50 rounded-xl p-4"><span className="font-semibold">Transkrip:</span> {activity.config.transcript}</p>
          )}
          {activity.config.passage && (
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">{activity.config.passage}</p>
          )}
          {activity.items?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Item ({activity.items.length}):</p>
              <ul className="space-y-1.5 text-sm text-gray-600">
                {activity.items.map((i: any) => (
                  <li key={i.id} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <Layers size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>{i.itemType}: <b>{i.front}</b>{i.back ? ` → ${i.back}` : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Submissions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2"><Users size={18} className="text-primary-600" /> Pengiriman Siswa ({attempts.length})</h3>
        </div>
        {attempts.length === 0 ? (
          <p className="text-sm text-gray-500 px-5 py-8 text-center">Belum ada pengiriman dari siswa.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {attempts.map((a: any) => (
              <div key={a.id} className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold uppercase">
                      {a.studentName?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{a.studentName}</p>
                      <p className="text-xs text-gray-400">{a.studentEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-md ${
                      a.status === 'GRADED' ? 'bg-green-100 text-green-700' : a.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>{a.status}</span>
                    {a.finalGrade !== null && a.finalGrade !== undefined && (
                      <span className="px-2 py-1 text-[10px] font-extrabold bg-primary-50 text-primary-700 rounded-md">{a.finalGrade}</span>
                    )}
                  </div>
                </div>

                {a.recordingFileUrl && (
                  <div>{renderAudio(a.recordingFileUrl)}</div>
                )}
                {a.content && (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2.5">{a.content}</p>
                )}
                {a.recognitionScore != null && (
                  <p className="text-xs text-gray-500">Skor pengucapan (AI): <b>{a.recognitionScore}</b></p>
                )}
                {a.selfGrade != null && (
                  <p className="text-xs text-gray-500">Skor mandiri: <b>{a.selfGrade}</b></p>
                )}

                {a.feedback && (
                  <div className="bg-primary-50 text-primary-800 text-sm rounded-lg px-3 py-2">
                    <b>Feedback:</b> {a.feedback}
                  </div>
                )}

                {gradingId === a.id ? (
                  <div className="space-y-2 bg-gray-50 rounded-xl p-3">
                    <input
                      type="number"
                      placeholder="Nilai (0-100)"
                      value={gradeForm[a.id]?.finalGrade ?? ''}
                      onChange={(e) => setGradeForm({ ...gradeForm, [a.id]: { ...gradeForm[a.id], finalGrade: e.target.value } })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                    />
                    <textarea
                      placeholder="Feedback..."
                      value={gradeForm[a.id]?.feedback ?? ''}
                      onChange={(e) => setGradeForm({ ...gradeForm, [a.id]: { ...gradeForm[a.id], feedback: e.target.value } })}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleGrade(a.id)} className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700">
                        <CheckCircle size={15} /> Simpan Nilai
                      </button>
                      <button onClick={() => setGradingId(null)} className="px-3 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Batal</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setGradingId(a.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <Send size={14} /> {a.finalGrade != null ? 'Ubah Nilai' : 'Beri Nilai / Feedback'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discussion */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2"><MessageSquare size={18} className="text-primary-600" /> Diskusi ({comments.length})</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          {comments.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Belum ada diskusi.</p>}
          {comments.map((c: any) => (
            <div key={c.id} className="bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-gray-700">{c.authorName} <span className="font-normal text-gray-400">({c.authorRole})</span></p>
                <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString('id-ID')}</span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
              {c.replies?.map((r: any) => (
                <div key={r.id} className="mt-2 ml-4 bg-white rounded-lg px-3 py-2 border border-gray-100">
                  <p className="text-xs font-bold text-gray-600 mb-0.5">{r.authorName}</p>
                  <p className="text-sm text-gray-600">{r.content}</p>
                </div>
              ))}
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              placeholder="Tulis komentar untuk semua siswa..."
              className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={handleComment}
              disabled={sendingComment}
              className="px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-60"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};