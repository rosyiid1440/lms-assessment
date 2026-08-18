import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/axios';
import { Play, RefreshCw, Clock, ShieldAlert } from 'lucide-react';

export const StudentAssessmentList = () => {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [notice, setNotice] = useState<string>('');
  const navigate = useNavigate();

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/assessment/my/assessments', { params: { page: meta.page, limit: meta.limit } });
      setAssessments(res.data.data);
      setMeta(res.data.meta);
    } catch {
      showToast('Gagal memuat ujian', 'error');
    } finally {
      setLoading(false);
    }
  }, [meta.page]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const startAttempt = async (id: string) => {
    try {
      const res = await api.post(`/assessment/assessments/${id}/start`);
      const attempt = res.data.data;
      if (attempt?.status === 'COMPLETED' || attempt?.status === 'MANUAL_SUBMITTED' || attempt?.status === 'AUTO_SUBMITTED') {
        setNotice('Anda telah menyelesaikan ujian ini.');
        showToast('Ujian sudah selesai dikerjakan', 'error');
        return;
      }
      if (attempt?.proctoringStatus === 'DISQUALIFIED') {
        setNotice('Attempt ini ditandai karena pelanggaran. Hubungi guru Anda.');
        showToast('Attempt didiskualifikasi', 'error');
        return;
      }
      navigate(`/exam/${attempt.id}`);
    } catch (e: any) {
      showToast(e.response?.data?.detail || 'Gagal memulai ujian', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <ShieldAlert size={20} /> {notice}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-900">Ujian Saya</h2>
        <p className="text-sm text-gray-500 mt-1">
          Ujian dikerjakan pada halaman khusus layar penuh. Dilarang pindah aplikasi, membuka notifikasi, atau membelah layar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" /></div>
        ) : assessments.length === 0 ? (
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">Belum ada ujian tersedia</div>
        ) : assessments.map((a: any) => {
          const inProgress = a.attemptCount > a.submittedCount;
          const exhausted = a.submittedCount >= a.attemptLimit;
          return (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-900">{a.title}</h3>
                <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full font-medium">{a.status}</span>
              </div>
              {a.description && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{a.description}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-4">
                <span className="flex items-center gap-1"><Clock size={12} /> {a.durationMinutes} menit</span>
                <span>{a.questionCount} soal</span>
                <span>Batas {a.attemptLimit}x</span>
                <span>Lulus ≥{a.passingScore}%</span>
              </div>
              {a.openDate && <div className="text-xs text-amber-600 mb-3">Buka: {new Date(a.openDate).toLocaleString('id-ID')}</div>}
              {a.closeDate && <div className="text-xs text-red-500 mb-3">Tutup: {new Date(a.closeDate).toLocaleString('id-ID')}</div>}
              <button
                onClick={() => startAttempt(a.id)}
                disabled={exhausted}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg ${exhausted ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-white bg-primary-600 hover:bg-primary-700'}`}
              >
                {inProgress ? <><RefreshCw size={16} /> Lanjutkan</> : <><Play size={16} /> Kerjakan</>}
              </button>
              {exhausted && <div className="text-xs text-gray-400 mt-2">Batas percobaan tercapai.</div>}
              {!exhausted && a.submittedCount > 0 && <div className="text-xs text-gray-400 mt-2">Sisa percobaan: {a.attemptLimit - a.submittedCount}x</div>}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Total {meta.total} ujian</span>
        <div className="flex gap-2">
          <button disabled={meta.page === 1} onClick={() => setMeta({ ...meta, page: meta.page - 1 })} className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40">Prev</button>
          <button disabled={meta.page === meta.totalPages} onClick={() => setMeta({ ...meta, page: meta.page + 1 })} className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
};
