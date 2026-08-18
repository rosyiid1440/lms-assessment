import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/axios';

export const StudentAssessmentResults = () => {
  const [results, setResults] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/assessment/my/results', { params: { page: meta.page, limit: meta.limit } });
      setResults(res.data.data || []);
      setMeta(res.data.meta);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [meta.page]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const gradeColor = (g: string) => {
    if (g === 'A') return 'text-green-600';
    if (g === 'B') return 'text-emerald-600';
    if (g === 'C') return 'text-amber-600';
    if (g === 'D') return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Hasil Ujian</h2>
        <p className="text-sm text-gray-500 mt-1">Rekap nilai ujian yang telah dikerjakan</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-semibold">Ujian</th>
                <th className="px-6 py-3 font-semibold">Nilai</th>
                <th className="px-6 py-3 font-semibold">%</th>
                <th className="px-6 py-3 font-semibold">Grade</th>
                <th className="px-6 py-3 font-semibold">Benar/Salah/Kosong</th>
                <th className="px-6 py-3 font-semibold">Waktu</th>
                <th className="px-6 py-3 font-semibold">Lulus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" /></td></tr>
              ) : results.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">Belum ada hasil ujian</td></tr>
              ) : results.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium text-gray-900">{r.assessmentTitle || r.assessmentId}</td>
                  <td className="px-6 py-4 font-semibold">{r.rawScore}/{r.totalPoints}</td>
                  <td className="px-6 py-4">{r.percentage}%</td>
                  <td className={`px-6 py-4 font-bold ${gradeColor(r.grade)}`}>{r.grade}</td>
                  <td className="px-6 py-4">{r.correctCount}/{r.wrongCount}/{r.skippedCount}</td>
                  <td className="px-6 py-4">{r.timeSpentSeconds ? `${Math.round(r.timeSpentSeconds / 60)}m` : '-'}</td>
                  <td className="px-6 py-4">{r.passed ? <span className="text-green-600 font-semibold">✓</span> : <span className="text-red-500 font-semibold">✗</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-500">Total <span className="font-medium">{meta.total}</span> hasil</div>
          <div className="flex gap-2">
            <button disabled={meta.page === 1} onClick={() => setMeta({ ...meta, page: meta.page - 1 })} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Prev</button>
            <button disabled={meta.page === meta.totalPages} onClick={() => setMeta({ ...meta, page: meta.page + 1 })} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};
