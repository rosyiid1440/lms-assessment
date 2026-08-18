import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../../lib/axios';
import { BarChart3, Plus, Trash2, TrendingUp, Calculator, Save, Table2, X, Stethoscope } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';
import { useAuthStore } from '../../stores/authStore';

interface Pt { x: string; y: string; }

const num = (s: string) => parseFloat(s);
const Plot = ({ pts, slope, intercept }: { pts: Pt[]; slope: number; intercept: number }) => {
  const data = pts.filter(p => isFinite(num(p.x)) && isFinite(num(p.y))).map(p => ({ x: num(p.x), y: num(p.y) }));
  const W = 640, H = 420, P = 40;
  if (data.length === 0) return <div className="text-sm text-gray-400 p-16 text-center">Masukkan data untuk melihat grafik.</div>;
  const xs = data.map(p => p.x), ys = data.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys, 0), maxY = Math.max(...ys);

  const X = (x: number) => P + ((x - minX) / (maxX - minX || 1)) * (W - 2 * P);
  const Y = (y: number) => H - P - ((y - minY) / (maxY - minY || 1)) * (H - 2 * P);
  const ptPath = data.map((p, i) => `${i === 0 ? 'M' : 'L'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  // line of best fit at x-range
  const lx1 = minX, lx2 = maxX;
  const ly1 = slope * lx1 + intercept, ly2 = slope * lx2 + intercept;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-white rounded-xl">
      <rect x="0" y="0" width={W} height={H} fill="#fafafa" rx="12" />
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="#94a3b8" strokeWidth="1.5" />
      <line x1={P} y1={H - P} x2={P} y2={P} stroke="#94a3b8" strokeWidth="1.5" />
      {data.map((p, i) => (
        <g key={i}>
          <circle cx={X(p.x)} cy={Y(p.y)} r="4.5" fill="#2563eb" />
        </g>
      ))}
      <path d={ptPath} fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="4 3" />
      <line x1={X(lx1)} y1={Y(ly1)} x2={X(lx2)} y2={Y(ly2)} stroke="#f97316" strokeWidth="2.5" />
      <text x={P} y={P + 12} fontSize="11" fill="#0f172a" fontWeight="bold">garis tren: y = {(slope).toFixed(3)}x + {(intercept).toFixed(3)}</text>
    </svg>
  );
};

export const DataAnalysis = () => {
  const { user } = useAuthStore();
  const isTeacher = user?.role?.slug === 'teacher' || user?.role?.slug === 'admin';
  const [title, setTitle] = useState('');
  const [xLabel, setXLabel] = useState('Waktu (s)');
  const [yLabel, setYLabel] = useState('Jarak (m)');
  const [rows, setRows] = useState<Pt[]>([{ x: '', y: '' }, { x: '', y: '' }]);
  const [saved, setSaved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadedExp, setLoadedExp] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(false);
    try { const res = await api.get('/physics/data/exp'); setSaved(res.data.data || []); } catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const analysis = useMemo(() => {
    const ptsArr = rows.filter(r => isFinite(parseFloat(r.x)) && isFinite(parseFloat(r.y))).map(r => ({ x: parseFloat(r.x), y: parseFloat(r.y) }));
    if (ptsArr.length === 0) return { slope: 0, intercept: 0, xs: null, ys: null };
    const n = ptsArr.length;
    const sx = ptsArr.reduce((a, p) => a + p.x, 0), sy = ptsArr.reduce((a, p) => a + p.y, 0);
    const sxx = ptsArr.reduce((a, p) => a + p.x * p.x, 0), sxy = ptsArr.reduce((a, p) => a + p.x * p.y, 0);
    const d = n * sxx - sx * sx;
    const slope = d !== 0 ? (n * sxy - sx * sy) / d : 0;
    const intercept = d !== 0 ? (sy - slope * sx) / n : 0;
    const mean = (a: number[]): number => a.reduce((x, y) => x + y, 0) / a.length;
    const xArr = ptsArr.map(p => p.x), yArr = ptsArr.map(p => p.y);
    const variance = (a: number[]) => a.reduce((acc, v) => acc + (v - mean(a)) ** 2, 0) / (a.length - 1 || 1);
    return { slope, intercept, xs: { mean: mean(xArr), stdev: Math.sqrt(variance(xArr)), n }, ys: { mean: mean(yArr), stdev: Math.sqrt(variance(yArr)), n } };
  }, [rows]);

  const setRow = (i: number, k: 'x' | 'y', v: string) => setRows(rows.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const addRow = () => setRows([...rows, { x: '', y: '' }]);

  const saveExp = async () => {
    if (!title) return alert('Judul wajib');
    setSaving(true);
    try { await api.post('/physics/data/exp', { title, xLabel, yLabel, rows }); fetchData(); setSaved([]); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal simpan'); } finally { setSaving(false); }
  };

  const loadExp = (e: any) => {
    setLoadedExp(e);
    setTitle(e.title || ''); setXLabel(e.xLabel || 'x'); setYLabel(e.yLabel || 'y');
    setRows(Array.isArray(e.data) && e.data.length ? e.data : [{ x: '', y: '' }]);
  };

  if (error) return <ErrorState message="Gagal memuat data." onRetry={fetchData} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <BackButton to="/dashboard/study/fisika" label="Kembali ke Fisika" />
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2"><BarChart3 size={28} className="text-primary-600" /> Analisis Data & Plotting</h2>
        <p className="text-sm text-gray-600 mt-1">Masukkan tabel hasil percobaan → grafik + garis tren (line of best fit) + statistik otomatis.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Data input */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Table2 size={14} /> Data Eksperimen</h3>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul percobaan (cth: Jarak vs Waktu)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
          <div className="flex gap-2">
            <input value={xLabel} onChange={(e) => setXLabel(e.target.value)} placeholder="Label Sumbu X" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <input value={yLabel} onChange={(e) => setYLabel(e.target.value)} placeholder="Label Sumbu Y" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl" />
          </div>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center font-bold text-xs text-gray-500 uppercase tracking-wider px-1">
            <span>{xLabel || 'X'}</span><span>{yLabel || 'Y'}</span><span></span>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <input value={r.x} onChange={(e) => setRow(i, 'x', e.target.value)} type="number" className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              <input value={r.y} onChange={(e) => setRow(i, 'y', e.target.value)} type="number" className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              <button onClick={() => setRows(rows.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-500"><X size={16} /></button>
            </div>
          ))}
          <button onClick={addRow} className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl w-full justify-center"><Plus size={15} /> Tambah Baris</button>
          <button onClick={saveExp} disabled={saving} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl w-full disabled:opacity-60"><Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Percobaan'}</button>
        </div>

        {/* Plot + stats */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><BarChart3 size={14} /> Grafik & Tren</h3>
          <Plot pts={rows} slope={analysis.slope} intercept={analysis.intercept} />
          {analysis.xs && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase">{xLabel || 'X'}</p>
                <p className="font-bold text-gray-800">{analysis.xs.mean.toFixed(3)}</p>
                <p className="text-xs text-gray-500">σ = {analysis.xs.stdev.toFixed(3)} · n={analysis.xs.n}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase">{yLabel || 'Y'}</p>
                <p className="font-bold text-gray-800">{analysis.ys.mean.toFixed(3)}</p>
                <p className="text-xs text-gray-500">σ = {analysis.ys.stdev.toFixed(3)} · n={analysis.ys.n}</p>
              </div>
              <div className="bg-primary-50 rounded-xl p-3 col-span-2 flex items-center justify-between">
                <p className="text-xs font-bold text-primary-700">Garis tren<br /><span className="text-primary-600 font-normal">y = {analysis.slope.toFixed(3)}x {analysis.intercept >= 0 ? '+' : '-'} {Math.abs(analysis.intercept).toFixed(3)}</span></p>
                <span className="text-[10px] font-bold text-primary-500">SLOPE</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saved experiments */}
      {saved.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Percobaan Tersimpan</h3>
          <div className="flex flex-wrap gap-2">
            {saved.map((e) => (
              <button key={e.id} onClick={() => loadExp(e)} className="px-3 py-2 text-xs font-bold bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-primary-50">{e.title}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};