import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { MessagesSquare, Plus, Send, Lock, Loader2, MessageCircleQuestion, HelpCircle } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';
import { Modal } from '../../components/ui/Modal';

export const DiscussionPage = () => {
  const { user } = useAuthStore();
  const [forums, setForums] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<'forum' | 'qa'>('forum');
  const [showForum, setShowForum] = useState(false);
  const [showQ, setShowQ] = useState(false);
  const [saving, setSaving] = useState(false);

  const [forumForm, setForumForm] = useState({ title: '', body: '', category: 'umum', isPrivate: false });
  const [qForm, setQForm] = useState({ question: '', topic: '' });
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const [f, q] = await Promise.all([api.get('/pai/discussions'), api.get('/pai/private-questions')]);
      setForums(f.data || []); setQuestions(q.data || []);
    } catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createForum = async () => {
    if (!forumForm.title || !forumForm.body) return alert('Judul dan isi wajib');
    setSaving(true);
    try { await api.post('/pai/discussions', forumForm); setShowForum(false); setForumForm({ title: '', body: '', category: 'umum', isPrivate: false }); fetchAll(); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal membuat'); } finally { setSaving(false); }
  };

  const ask = async () => {
    if (!qForm.question) return alert('Pertanyaan wajib');
    setSaving(true);
    try { await api.post('/pai/private-questions', qForm); setShowQ(false); setQForm({ question: '', topic: '' }); fetchAll(); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal mengirim'); } finally { setSaving(false); }
  };

  const reply = async (forumId: string) => {
    const body = replyText[forumId];
    if (!body?.trim()) return;
    try { await api.post(`/pai/discussions/${forumId}/replies`, { body }); setReplyText({ ...replyText, [forumId]: '' }); fetchAll(); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal'); }
  };

  const isTeacher = user?.role?.slug === 'teacher' || user?.role?.slug === 'admin';

  if (loading) return <div className="max-w-5xl mx-auto p-6"><SkeletonList /></div>;
  if (error) return <div className="max-w-5xl mx-auto p-6"><ErrorState message="Gagal memuat diskusi." onRetry={fetchAll} /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 px-4">
      <BackButton to="/dashboard/study/pai" label="Kembali ke PAI" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2"><MessagesSquare size={28} className="text-sky-600" /> Ruang Diskusi & Konsultasi</h2>
          <p className="text-sm text-gray-600 mt-1">Diskusi etika & fiqih bersama teman dan ustadz, plus tanya jawab privat.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForum(true)} className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"><Plus size={16} /> Diskusi</button>
          <button onClick={() => setShowQ(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"><HelpCircle size={16} /> Tanya Ustadz</button>
        </div>
      </div>

      <div className="flex gap-2 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm w-fit">
        <button onClick={() => setTab('forum')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold ${tab === 'forum' ? 'bg-sky-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}><MessagesSquare size={15} /> Forum</button>
        <button onClick={() => setTab('qa')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold ${tab === 'qa' ? 'bg-sky-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}><MessageCircleQuestion size={15} /> Tanya Jawab</button>
      </div>

      {tab === 'forum' ? (
        <div className="space-y-4">
          {forums.length === 0 && <EmptyState title="Belum ada diskusi." description="" />}
          {forums.map((f) => (
            <div key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                    {f.title}
                    {f.isPrivate && <span className="flex items-center gap-1 text-xs text-gray-400"><Lock size={12} /> privat</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{f.category} · topik</div>
                </div>
              </div>
              <p className="text-sm text-gray-700">{f.body}</p>
              <div className="space-y-2">
                {f.replies?.map((r: any) => (
                  <div key={r.id} className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700"><span className="font-semibold text-gray-900">{r.authorId}</span>: {r.body}</div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={replyText[f.id] || ''} onChange={(e) => setReplyText({ ...replyText, [f.id]: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') reply(f.id); }} placeholder="Tulis tanggapan…" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl" />
                <button onClick={() => reply(f.id)} className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 rounded-xl text-sm font-semibold"><Send size={14} /> Kirim</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><MessageCircleQuestion size={14} /> Pertanyaan Privat ({questions.length})</h3>
          {questions.length === 0 && <EmptyState title="Belum ada pertanyaan privat." description="" />}
          <div className="space-y-3">
            {questions.map((q) => (
              <div key={q.id} className="p-4 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">{q.question}</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${q.status === 'ANSWERED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{q.status === 'ANSWERED' ? 'Terjawab' : 'Menunggu'}</span>
                </div>
                {q.topic && <div className="text-xs text-gray-400 mt-0.5">Topik: {q.topic}</div>}
                {q.answer && <div className="mt-2 text-sm text-gray-700 bg-emerald-50 border border-emerald-100 rounded-lg p-3">💬 {q.answer}</div>}
                {!q.answer && isTeacher && <div className="mt-2 text-xs text-gray-500">Belum dijawab — jawab via halaman guru.</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {showForum && (
        <Modal isOpen={showForum} title="Buat Diskusi" onClose={() => setShowForum(false)}>
          <div className="space-y-3">
            <input value={forumForm.title} onChange={(e) => setForumForm({ ...forumForm, title: e.target.value })} placeholder="Judul topik diskusi" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <input value={forumForm.category} onChange={(e) => setForumForm({ ...forumForm, category: e.target.value })} placeholder="Kategori (cth: Ibadah, Akhlak)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <textarea value={forumForm.body} onChange={(e) => setForumForm({ ...forumForm, body: e.target.value })} placeholder="Isi diskusi (pendapat kamu)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={4} />
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={forumForm.isPrivate} onChange={(e) => setForumForm({ ...forumForm, isPrivate: e.target.checked })} /> Diskusi privat (khusus guru & pemilik)</label>
            <button onClick={createForum} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white py-2.5 rounded-xl text-sm font-semibold">{saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Publish</button>
          </div>
        </Modal>
      )}

      {showQ && (
        <Modal isOpen={showQ} title="Tanya Ustadz" onClose={() => setShowQ(false)}>
          <div className="space-y-3">
            <input value={qForm.topic} onChange={(e) => setQForm({ ...qForm, topic: e.target.value })} placeholder="Topik (cth: Fiqih, Akhlak, Ibadah)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <textarea value={qForm.question} onChange={(e) => setQForm({ ...qForm, question: e.target.value })} placeholder="Tulis pertanyaanmu…" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={4} />
            <button onClick={ask} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold">{saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Kirim</button>
          </div>
        </Modal>
      )}
    </div>
  );
};