import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { RefreshCw, BarChart3, Award, TrendingUp, Users, Timer, Target, ClipboardList, Search } from 'lucide-react';
import { useParams } from 'react-router-dom';

const emptyAnalytics = {
  participantCount: 0, submittedCount: 0, notSubmittedCount: 0, averageScore: 0, medianScore: 0,
  highestScore: 0, lowestScore: 0, stdDeviation: 0, passRate: 0, scoreHistogram: [], questionStats: [],
  timeDistribution: [], difficultyIndex: [], discrimination: [],
};

export const Analytics = () => {
  const { id } = useParams<{ id: string }>();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selected, setSelected] = useState(id || '');
  const [analytics, setAnalytics] = useState<any>(emptyAnalytics);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [search, setSearch] = useState('');
  const [resultPage, setResultPage] = useState(1);
  const [resultTotal, setResultTotal] = useState(0);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAssessments = useCallback(async () => {
    try {
      const res = await api.get('/assessment/assessments', { params: { page: 1, limit: 100, search } });
      setAssessments(res.data.data || []);
    } catch {
      showToast('Gagal memuat ujian', 'error');
    }
  }, [search]);

  useEffect(() => { loadAssessments(); }, [loadAssessments]);

  const loadAnalytics = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const [a, r] = await Promise.all([
        api.get(`/assessment/assessments/${selected}/analytics`),
        api.get(`/assessment/assessments/${selected}/results`, { params: { page: resultPage, limit: 20 } }),
      ]);
      setAnalytics(a.data.data);
      setResults(r.data.data || []);
      setResultTotal(r.data.meta?.total || 0);
    } catch {
      showToast('Gagal memuat analitik', 'error');
    } finally {
      setLoading(false);
    }
  }, [selected, resultPage]);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  const refresh = async () => {
    try {
      const res = await api.post(`/assessment/assessments/${selected}/analytics/refresh`);
      setAnalytics(res.data.data);
      showToast('Analitik diperbarui');
    } catch {
      showToast('Gagal refresh', 'error');
    }
  };

  const hist = Array.isArray(analytics.scoreHistogram) ? analytics.scoreHistogram : [];
  const maxHist = Math.max(1, ...hist.map((h: any) => h.count));

  const statCards = [
    { label: 'Peserta', value: analytics.participantCount, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Sudah Submit', value: analytics.submittedCount, icon: ClipboardList, color: 'bg-green-50 text-green-600' },
    { label: 'Rata-rata', value: `${analytics.averageScore}%`, icon: BarChart3, color: 'bg-primary-50 text-primary-600' },
    { label: 'Median', value: `${analytics.medianScore}%`, icon: TrendingUp, color: 'bg-cyan-50 text-cyan-600' },
    { label: 'Tertinggi', value: `${analytics.highestScore}%`, icon: Award, color: 'bg-amber-50 text-amber-600' },
    { label: 'Terendah', value: `${analytics.lowestScore}%`, icon: Target, color: 'bg-red-50 text-red-600' },
    { label: 'Tingkat Lulus', value: `${analytics.passRate}%`, icon: Award, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Std. Dev', value: analytics.stdDeviation.toFixed ? analytics.stdDeviation.toFixed(2) : analytics.stdDeviation, icon: Timer, color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analitik Ujian</h2>
          <p className="text-sm text-gray-500 mt-1">Statistik & hasil pengerjaan</p>
        </div>
        {selected && (
          <button onClick={refresh} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg">
            <RefreshCw size={16} /> Refresh
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari ujian..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
          {assessments.map((a: any) => (
            <button key={a.id} onClick={() => setSelected(a.id)}
              className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${selected === a.id ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 hover:bg-gray-50'}`}>
              <div className="font-medium line-clamp-1">{a.title}</div>
              <div className="text-xs text-gray-500">{a.questionCount} soal • {a.maxPoints} poin</div>
            </button>
          ))}
          {assessments.length === 0 && <div className="col-span-3 py-6 text-center text-gray-400 text-sm">Tidak ada ujian</div>}
        </div>
      </div>

      {selected && (
        <>
          {loading ? (
            <div className="py-16 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCards.map((c: any) => (
                  <div key={c.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className={`w-10 h-10 rounded-lg ${c.color} flex items-center justify-center mb-3`}>
                      <c.icon size={18} />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{c.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{c.label}</div>
                  </div>
                ))}
              </div>

              {analytics.assessmentTitle && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="text-sm font-semibold text-gray-900 mb-1">{analytics.assessmentTitle}</div>
                  <div className="text-xs text-gray-500">Terakhir dihitung: {analytics.computedAt ? new Date(analytics.computedAt).toLocaleString('id-ID') : '-'}</div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {hist.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="text-sm font-semibold text-gray-900 mb-4">Distribusi Skor</div>
                    <div className="flex items-end gap-1 h-40">
                      {hist.map((h: any) => (
                        <div key={h.bucket} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full rounded-t bg-primary-500/80" style={{ height: `${(h.count / maxHist) * 100}%` }} />
                          <span className="text-[10px] text-gray-500 rotate-45 origin-left">{h.bucket}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analytics.questionStats?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="text-sm font-semibold text-gray-900 mb-3">Statistik per Soal</div>
                    <div className="max-h-72 overflow-y-auto space-y-2">
                      {analytics.questionStats.map((s: any, i: number) => (
                        <div key={s.questionId} className="text-xs">
                          <div className="flex justify-between text-gray-600 mb-1">
                            <span className="line-clamp-1">Soal #{i + 1}</span>
                            <span className="font-medium">{s.correctPct?.toFixed?.(1) ?? 0}% benar</span>
                          </div>
                          <div className="flex h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div className="bg-green-500" style={{ width: `${s.correctPct ?? 0}%` }} />
                            <div className="bg-red-400" style={{ width: `${s.wrongPct ?? 0}%` }} />
                            <div className="bg-gray-300" style={{ width: `${s.skippedPct ?? 0}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 font-semibold text-sm text-gray-900">Hasil Pengerjaan</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-gray-600">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="px-6 py-3 font-semibold text-left">Siswa</th>
                        <th className="px-6 py-3 font-semibold text-left">Nilai</th>
                        <th className="px-6 py-3 font-semibold text-left">%</th>
                        <th className="px-6 py-3 font-semibold text-left">Grade</th>
                        <th className="px-6 py-3 font-semibold text-left">Benar/Salah/Kosong</th>
                        <th className="px-6 py-3 font-semibold text-left">Waktu</th>
                        <th className="px-6 py-3 font-semibold text-left">Lulus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {results.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">Belum ada hasil</td></tr>
                      ) : results.map((r: any) => (
                        <tr key={r.id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-3">{r.studentName || r.studentId}</td>
                          <td className="px-6 py-3 font-semibold">{r.rawScore}/{r.totalPoints}</td>
                          <td className="px-6 py-3">{r.percentage}%</td>
                          <td className="px-6 py-3 font-bold text-gray-900">{r.grade}</td>
                          <td className="px-6 py-3">{r.correctCount}/{r.wrongCount}/{r.skippedCount}</td>
                          <td className="px-6 py-3">{r.timeSpentSeconds ? `${Math.round(r.timeSpentSeconds / 60)}m` : '-'}</td>
                          <td className="px-6 py-3">{r.passed ? <span className="text-green-600 font-semibold">✓</span> : <span className="text-red-500 font-semibold">✗</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                  <div className="text-sm text-gray-500">Total <span className="font-medium">{resultTotal}</span> hasil</div>
                  <div className="flex gap-2">
                    <button disabled={resultPage === 1} onClick={() => setResultPage(resultPage - 1)} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Prev</button>
                    <button disabled={results.length < 20} onClick={() => setResultPage(resultPage + 1)} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Next</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
