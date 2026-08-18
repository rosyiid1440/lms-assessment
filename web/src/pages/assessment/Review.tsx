import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { ClipboardCheck, Send } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';

export const Review = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: meta.page, limit: meta.limit };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/assessment/reviews', { params });
      setReviews(res.data.data);
      setMeta(res.data.meta);
    } catch {
      showToast('Gagal memuat data', 'error');
    } finally {
      setLoading(false);
    }
  }, [meta.page, statusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openDetail = async (r: any) => {
    setDetail({ ...r, questions: [], attemptId: r.attemptId });
    setDetailLoading(true);
    try {
      const res = await api.get(`/assessment/attempts/${r.attemptId}/reviews`);
      const pending = res.data.data || [];
      const idx = pending.findIndex((x: any) => x.questionId === r.questionId);
      setDetail({ ...r, questions: pending, activeIdx: Math.max(0, idx) });
      const s: Record<string, string> = {};
      const f: Record<string, string> = {};
      pending.forEach((x: any) => {
        s[x.questionId] = x.score ? String(x.score) : '';
        f[x.questionId] = x.feedback || '';
      });
      setScores(s);
      setFeedbacks(f);
    } catch {
      showToast('Gagal memuat detail', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const gradeOne = async (item: any) => {
    const questionId = item.questionId;
    const score = Number(scores[questionId]);
    if (Number.isNaN(score)) { showToast('Skor wajib diisi', 'error'); return; }
    const maxPoints = item.maxPoints ?? item.questionRef?.question?.points ?? 1;
    if (score > maxPoints) { showToast(`Skor melebihi maksimal ${maxPoints}`, 'error'); return; }
    try {
      await api.post(`/assessment/attempts/${detail.attemptId}/questions/${questionId}/grade`, {
        score, feedback: feedbacks[questionId] || null, regradeReason: 'MANUAL',
      });
      showToast('Nilai tersimpan');
      openDetail({ attemptId: detail.attemptId, questionId });
      fetchAll();
    } catch (e: any) {
      showToast(e.response?.data?.detail || 'Gagal menilai', 'error');
    }
  };

  const setScore = (id: string, val: string) => setScores(prev => ({ ...prev, [id]: val }));
  const setFeedback = (id: string, val: string) => setFeedbacks(prev => ({ ...prev, [id]: val }));

  const statusBadge = (s: string) => (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${s === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{s}</span>
  );

  const renderResponse = (item: any) => {
    const response = item.questionRef?.answers?.[0]?.response;
    if (!response) return <span className="text-gray-400 italic">Tidak ada jawaban</span>;
    if (typeof response === 'string') return <p className="text-sm text-gray-800 whitespace-pre-wrap">{response}</p>;
    if (response.text) return <p className="text-sm text-gray-800 whitespace-pre-wrap">{response.text}</p>;
    if (response.keys?.length) return <div className="flex flex-wrap gap-2">{response.keys.map((k: string) => <span key={k} className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">{k}</span>)}</div>;
    if (response.boolean !== undefined) return <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">{String(response.boolean)}</span>;
    return <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded">{JSON.stringify(response, null, 2)}</pre>;
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Penilaian Manual</h2>
          <p className="text-sm text-gray-500 mt-1">Periksa & nilai jawaban esai/uraian</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStatusFilter('PENDING')} className={`px-4 py-2 text-sm font-medium rounded-lg border ${statusFilter === 'PENDING' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-300 text-gray-600'}`}>Pending</button>
          <button onClick={() => setStatusFilter('COMPLETED')} className={`px-4 py-2 text-sm font-medium rounded-lg border ${statusFilter === 'COMPLETED' ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-300 text-gray-600'}`}>Selesai</button>
          <button onClick={() => setStatusFilter('')} className={`px-4 py-2 text-sm font-medium rounded-lg border ${statusFilter === '' ? 'bg-gray-100 border-gray-300 text-gray-700' : 'border-gray-300 text-gray-600'}`}>Semua</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-semibold">Soal</th>
                <th className="px-6 py-3 font-semibold">Tipe</th>
                <th className="px-6 py-3 font-semibold">Bobot</th>
                <th className="px-6 py-3 font-semibold">Skor</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" /></td></tr>
              ) : reviews.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Tidak ada review</td></tr>
              ) : reviews.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 max-w-md line-clamp-2" dangerouslySetInnerHTML={{ __html: r.prompt || '' }} />
                  </td>
                  <td className="px-6 py-4">{r.questionType}</td>
                  <td className="px-6 py-4">{r.maxPoints}</td>
                  <td className="px-6 py-4 font-semibold">{r.score || '-'}</td>
                  <td className="px-6 py-4">{statusBadge(r.status)}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openDetail(r)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg">
                      <ClipboardCheck size={14} /> Nilai
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-500">Total <span className="font-medium">{meta.total}</span></div>
          <div className="flex gap-2">
            <button disabled={meta.page === 1} onClick={() => setMeta({ ...meta, page: meta.page - 1 })} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Prev</button>
            <button disabled={meta.page === meta.totalPages} onClick={() => setMeta({ ...meta, page: meta.page + 1 })} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* Grading Modal */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title="Penilaian Jawaban Uraian" width="max-w-3xl">
        {detail && (
          <div className="space-y-4">
            {detailLoading ? (
              <div className="py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" /></div>
            ) : detail.questions.length === 0 ? (
              <div className="py-8 text-center text-gray-500">Tidak ada soal pending di attempt ini</div>
            ) : detail.questions.map((item: any) => {
              const q = item.questionRef?.question || {};
              const maxPoints = item.questionRef?.points ?? q.points ?? 1;
              return (
                <div key={item.questionId} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="text-sm font-medium text-gray-900" dangerouslySetInnerHTML={{ __html: q.prompt || item.prompt || '' }} />
                    <span className="text-xs font-mono text-gray-400 whitespace-nowrap">{q.type}</span>
                  </div>
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-gray-500 mb-1 uppercase">Jawaban Siswa</div>
                    <div className="bg-gray-50 rounded-lg p-3">{renderResponse(item)}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Skor (maks {maxPoints})</label>
                      <input type="number" min={0} max={maxPoints} step="0.5" value={scores[item.questionId] ?? ''} onChange={(e) => setScore(item.questionId, e.target.value)}
                        className="w-full px-3 py-2 border rounded-md text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Feedback</label>
                      <input value={feedbacks[item.questionId] ?? ''} onChange={(e) => setFeedback(item.questionId, e.target.value)}
                        className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Catatan untuk siswa (opsional)" />
                    </div>
                  </div>
                  <div className="flex justify-end mt-3">
                    <button onClick={() => gradeOne(item)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg">
                      <Send size={14} /> Simpan Nilai
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
};
