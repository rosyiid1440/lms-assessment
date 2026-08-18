import React, { useMemo, useState } from 'react';
import { LineChart, SlidersHorizontal } from 'lucide-react';
import type { SubjectDef } from '../registry';

export const ekonomiTool = ({ subject }: { subject: SubjectDef }) => {
  const [dShift, setDShift] = useState(0);     // demand shift
  const [sShift, setSShift] = useState(0);     // supply shift
  const [tax, setTax] = useState(0);           // per-unit tax

  // Simple linear model: Qd = a - bP (shift), Qs = -c + dP (shift+tax)
  const analyse = useMemo(() => {
    const a = 100 + dShift * 20;
    const b = 3;
    const c = 30 - sShift * 15;
    const d = 2;
    // with tax t: price received = P - t; Qs = -c + d(P - t)
    const denom = b + d;
    const pStar = (a + c + d * tax) / denom;
    const qStar = a - b * pStar;
    return { pStar: Math.max(0, pStar), qStar: Math.max(0, qStar), a, b, c, d, tax };
  }, [dShift, sShift, tax]);

  const label = (s: number, base: string) =>
    s > 0 ? `${base} ↑` : s < 0 ? `${base} ↓` : base;

  return (
    <div className="max-w-4xl">
      <div className="border border-gray-200 rounded-2xl bg-white p-5 mb-5">
        <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><SlidersHorizontal size={16} style={{ color: subject.color }} /> Pengaturan Pasar</h4>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500">{label(dShift, 'Permintaan')}</label>
            <input type="range" min={-4} max={4} value={dShift} onChange={(e) => setDShift(Number(e.target.value))} className="w-full mt-2" style={{ accentColor: subject.color }} />
            <span className="text-xs text-gray-400">{dShift} unit</span>
          </div>
          <div>
            <label className="text-xs text-gray-500">{label(sShift, 'Penawaran')}</label>
            <input type="range" min={-4} max={4} value={sShift} onChange={(e) => setSShift(Number(e.target.value))} className="w-full mt-2" style={{ accentColor: subject.color }} />
            <span className="text-xs text-gray-400">{sShift} unit</span>
          </div>
          <div>
            <label className="text-xs text-gray-500">Pajak per unit (tax)</label>
            <input type="range" min={0} max={12} value={tax} onChange={(e) => setTax(Number(e.target.value))} className="w-full mt-2" style={{ accentColor: subject.color }} />
            <span className="text-xs text-gray-400">{tax}</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_240px] gap-4">
        <div className="border border-gray-200 rounded-2xl bg-white p-4">
          <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2"><LineChart size={16} style={{ color: subject.color }} /> Kurva Permintaan & Penawaran</h4>
          <svg viewBox="0 0 100 80" className="w-full" preserveAspectRatio="none" style={{ maxHeight: 300 }}>
            {/* axes */}
            <line x1="10" y1="72" x2="96" y2="72" stroke="#9ca3af" strokeWidth="1" />
            <line x1="10" y1="72" x2="10" y2="8" stroke="#9ca3af" strokeWidth="1" />
            {/* Demand curve: Q = a - bP  =>  P ranges 0..(a/b) */}
            {/* Map: P in [0, a/b] -> cy in [66, 12]; Q in [0, a] -> cx in [14, 94] */}
            {(() => {
              const pMax = analyse.a / analyse.b;
              const toX = (q: number) => 14 + (q / analyse.a) * 80;
              const toY = (p: number) => 66 - (p / pMax) * 54;
              const d1 = `M ${toX(0)},${toY(pMax)} L ${toX(analyse.a)},${toY(0)}`;
              // Supply: Qs = -c + d(P - t) => P = (Qs + c)/d + t
              const qsMax = analyse.c > 0 ? analyse.c : 10;
              const s1 = `M ${toX(qsMax)},${toY(0)} L ${toX(analyse.a)},${toY((analyse.a + analyse.c) / analyse.d + analyse.tax)}`;
              const eqP = analyse.pStar;
              const eqX = toX(analyse.qStar);
              const eqY = toY(eqP);
              return (
                <>
                  <path d={d1} stroke="#2563eb" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  <path d={s1} stroke="#dc2626" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  {/* equilibrium */}
                  <circle cx={eqX} cy={eqY} r="3" fill="#111827" stroke="#fff" strokeWidth="1" />
                  <line x1={eqX} y1={eqY} x2={eqX} y2="72" stroke="#9ca3af" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="10" y1={eqY} x2={eqX} y2={eqY} stroke="#9ca3af" strokeWidth="1" strokeDasharray="3 3" />
                </>
              );
            })()}
          </svg>
        </div>
        <div className="border border-gray-200 rounded-2xl bg-white p-4">
          <h4 className="text-sm font-bold text-gray-900 mb-3">Hasil Analisis</h4>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-xl" style={{ background: subject.tint }}>
              <p className="text-xs text-gray-500">Harga keseimbangan</p>
              <p className="text-xl font-extrabold" style={{ color: subject.color }}>P* = {analyse.pStar.toFixed(1)}</p>
            </div>
            <div className="flex justify-between"><span className="text-gray-400">Kuantitas (Q)</span><b>{analyse.qStar.toFixed(1)}</b></div>
            <div className="flex justify-between"><span className="text-gray-400">Intersep D</span><b>{analyse.a}</b></div>
            <div className="flex justify-between"><span className="text-gray-400">Intersep S</span><b>{analyse.c}</b></div>
          </div>
          <p className="text-xs text-gray-500 mt-4 leading-relaxed">Geser pengaturan untuk melihat bagaimana perubahan permintaan, penawaran, dan pajak menggeser harga serta kuantitas keseimbangan.</p>
        </div>
      </div>
    </div>
  );
};