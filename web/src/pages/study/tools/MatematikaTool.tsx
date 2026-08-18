import React, { useMemo, useState } from 'react';
import { Plus, Minus, Calculator } from 'lucide-react';
import type { SubjectDef } from '../registry';

const PRESETS = [
  { label: 'Linear y=2x+1', fn: '2x+1' },
  { label: 'Kuadrat y=x²', fn: 'x^2' },
  { label: 'sin(x)', fn: 'sin(x)' },
  { label: 'cos(x)', fn: 'cos(x)' },
  { label: 'log10(x)', fn: 'log10(x)' },
  { label: '√x', fn: 'sqrt(x)' },
];

// tiny safe math evaluator (x in degrees? no—radians like real math for trig)
function evalFn(expr: string, x: number): number {
  const safe = (v: number) => (Number.isFinite(v) ? v : NaN);
  try {
    const s = expr.replace(/\^/g, '**').replace(/sqrt\(/g, 'Math.sqrt(')
      .replace(/sin\(/g, 'Math.sin(').replace(/cos\(/g, 'Math.cos(').replace(/tan\(/g, 'Math.tan(')
      .replace(/log10\(/g, 'Math.log10(').replace(/abs\(/g, 'Math.abs(');
    // eslint-disable-next-line no-new-func
    const f = new Function('x', `"use strict"; return (${s});`);
    return safe(Number(f(x)));
  } catch { return NaN; }
}

interface Pt { x: number; y: number }

export const mathTool = ({ subject }: { subject: SubjectDef }) => {
  const [expr, setExpr] = useState('x^2');
  const [preset, setPreset] = useState(PRESETS[1].fn);
  const [scale, setScale] = useState(20); // px per unit

  const applyPreset = (fn: string) => setExpr(fn.replace(/y\s*=\s*/, ''));

  const points = useMemo<Pt[]>(() => {
    if (!expr.trim()) return [];
    const pts: Pt[] = [];
    for (let i = -200; i <= 200; i++) {
      const x = i / 20;
      const y = evalFn(expr, x);
      if (Number.isFinite(y)) pts.push({ x, y });
    }
    return pts;
  }, [expr]);

  const toCanvas = (x: number, y: number, w: number, h: number) => ({
    cx: w / 2 + x * scale,
    cy: h / 2 - y * scale,
  });

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => applyPreset(p.fn)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium hover:border-gray-400 transition-colors">{p.label}</button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-sm font-mono text-gray-700 flex items-center"><Calculator size={16} className="mr-1.5" style={{ color: subject.color }} /> y =</span>
        <input value={expr} onChange={(e) => setExpr(e.target.value)}
          className="flex-1 min-w-[180px] px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          placeholder="mis. 2x+1, x^2, sin(x)" />
        <div className="flex items-center gap-1">
          <button onClick={() => setScale(Math.max(4, scale - 2))} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"><Minus size={14} /></button>
          <span className="text-xs text-gray-500 w-16 text-center">zoom {scale}</span>
          <button onClick={() => setScale(Math.min(100, scale + 2))} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"><Plus size={14} /></button>
        </div>
      </div>

      <div className="relative w-full h-[380px] rounded-2xl border border-gray-200 bg-[repeating-linear-gradient(0deg,#f3f4f6_0_1px,transparent_1px_20px),repeating-linear-gradient(90deg,#f3f4f6_0_1px,transparent_1px_20px)] bg-white overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 380" preserveAspectRatio="none">
          <line x1="300" y1="0" x2="300" y2="380" stroke="#d1d5db" strokeWidth="1" />
          <line x1="0" y1="190" x2="600" y2="190" stroke="#d1d5db" strokeWidth="1" />
          <path d={points.map((p, i) => {
            const c = toCanvas(p.x, p.y, 600, 380);
            return `${i === 0 || (i > 0 && Math.abs(p.x - points[i - 1].x) > 0.2) ? 'M' : 'L'} ${c.cx},${c.cy}`;
          }).join(' ')} fill="none" stroke={subject.color} strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
        {!Number.isFinite(evalFn(expr, 0)) && <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">Fungsi tidak valid</div>}
      </div>

      <p className="text-xs text-gray-400 mt-2">Fungsi: y=ax+b · x^2 · sin(x) · cos(x) · tan(x) · sqrt(x) · log10(x) · abs(x)</p>
    </div>
  );
};