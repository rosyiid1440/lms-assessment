import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/axios';
import { Trophy, Medal, Cpu } from 'lucide-react';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';

const medals = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];

export const Leaderboard = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(false);
    try { const res = await api.get('/informatics/leaderboard'); setRows(res.data?.data || res.data || []); } catch (e) { setError(true); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="max-w-3xl mx-auto space-y-6"><h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2"><Trophy className="text-primary-600" /> Leaderboard Coding</h2><SkeletonCard /></div>;
  if (error) return <ErrorState message="Gagal memuat leaderboard." onRetry={fetchData} />;

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2"><Trophy size={26} className="text-primary-600" /> Leaderboard Coding</h2>
        <p className="text-sm text-gray-600 mt-1">Peringkat berdasarkan skor terbaik pada semua challenge.</p>
      </div>
      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <Cpu className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-sm text-gray-500">Belum ada yang menyelesaikan challenge. Ayo selesaikan challenge pertamamu!</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {rows.map((r, i) => (
            <div key={r.studentId || i} className={`flex items-center gap-4 px-5 py-4 ${i % 2 ? 'bg-gray-50/50' : ''}`}>
              <div className="w-8 text-center">
                {i < 3 ? <Medal size={22} className={medals[i]} /> : <span className="text-sm font-bold text-gray-400">{i + 1}</span>}
              </div>
              <div className="flex-1">
                <p className="text-sm font-extrabold text-gray-900">{r.studentName}</p>
                <p className="text-xs text-gray-400">{r.solved} challenge {r.solved === 1 ? 'selesai' : 'selesai'}</p>
              </div>
              <span className="text-sm font-extrabold text-primary-600">{r.totalScore}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};