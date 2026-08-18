import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Atom, Waves, Zap } from 'lucide-react';
import { BackButton } from '../../components/ui/BackButton';

const SIM_ICONS: Record<string, any> = { PROJECTILE: Atom, FREE_FALL: Atom, WAVE: Waves, CIRCUIT: Zap, SPRING: Atom };
const SIM_LIST: { key: string; label: string }[] = [
  { key: 'PROJECTILE', label: 'Gerak Parabola' },
  { key: 'FREE_FALL', label: 'Jatuh Bebas' },
  { key: 'WAVE', label: 'Gelombang Sinus' },
  { key: 'CIRCUIT', label: 'Hukum Ohm' },
  { key: 'SPRING', label: 'Getaran Pegas' },
];

export const SimulationPlayground = () => {
  const [type, setType] = useState('PROJECTILE');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(true);
  const [t, setT] = useState(0);
  const runningRef = useRef(running);
  runningRef.current = running;

  const [params, setParams] = useState<Record<string, number>>({ velocity: 24, angle: 45, gravity: 9.8, amplitude: 14, frequency: 1.2, voltage: 12, resistance: 100, spring: 20, mass: 1.5 });
  const setP = (k: string, v: number) => setParams(p => ({ ...p, [k]: v }));

  useEffect(() => {
    let raf = 0; const start = performance.now(); const t0 = t;
    const loop = (now: number) => {
      if (runningRef.current) setT(t0 + (now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const drawSim = () => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#eef2f7'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    if (type === 'PROJECTILE' || type === 'FREE_FALL') {
      const v0 = params.velocity, angle = (params.angle || (type === 'FREE_FALL' ? 90 : 45)) * Math.PI / 180, g = params.gravity;
      const vx = v0 * Math.cos(angle), vy = v0 * Math.sin(angle);
      const scale = 6, groundY = H - 46, x0 = 34;
      const total = (2 * vy) / g;
      const dt = t > total ? total : t;
      const x = x0 + vx * dt * scale;
      const y = groundY - (vy * dt - 0.5 * g * dt * dt) * scale;
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
      ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let i = 0; i <= 70; i++) {
        const tt = (i / 70) * total; const xx = x0 + vx * tt * scale; const yy = groundY - (vy * tt - 0.5 * g * tt * tt) * scale;
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
      ctx.fillStyle = '#2563eb';
      ctx.beginPath(); ctx.arc(Math.max(34, x), Math.max(10, y), 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0f172a'; ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`t=${dt.toFixed(2)} s · jangkauan ≈ ${(vx * total).toFixed(1)} m`, 12, 20);
    } else if (type === 'WAVE') {
      const amp = params.amplitude, freq = params.frequency;
      ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3; ctx.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const y = H / 2 - Math.sin((x / W) * Math.PI * 2 * freq * 1.6 + t * freq * 3) * amp;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = '#94a3b8'; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#0f172a'; ctx.font = '11px sans-serif';
      ctx.fillText(`frekuensi ${freq} Hz · amplitudo ${amp} px`, 12, 18);
    } else if (type === 'CIRCUIT') {
      const V = params.voltage, R = params.resistance, I = V / R;
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 3;
      ctx.strokeRect(40, 40, W - 80, H - 100);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.arc(W / 2, (H + 40) / 2, 26, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(W / 2 - 26, (H + 40) / 2); ctx.lineTo(W / 2 + 26, (H + 40) / 2); ctx.stroke();
      for (let i = 0; i < 9; i++) {
        const p = (t * (V / R) * 0.5 + i / 9) % 1;
        ctx.fillStyle = '#fde047';
        ctx.beginPath(); ctx.arc(40 + p * (W - 80), 66, 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#0f172a'; ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`V=${V} V · R=${R} Ω · I = V/R = ${I.toFixed(3)} A`, 12, 22);
    } else if (type === 'SPRING') {
      const k = params.spring, m = params.mass;
      const omega = Math.sqrt(k / m);
      const cy = H / 2;
      const disp = Math.cos(t * omega) * 60;
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W / 2 - 70, cy); ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i <= 14; i++) {
        const sx = W / 2 - 70 + (i / 14) * 140;
        const sy = i === 0 || i === 14 ? cy : cy + (i % 2 === 0 ? 26 : -26);
        if (i === 0) ctx.moveTo(sx, cy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.fillStyle = '#d97706';
      ctx.beginPath(); ctx.arc(W / 2 + 70 + disp, cy, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0f172a'; ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`k=${k} N/m · m=${m} kg · ω = √(k/m) = ${omega.toFixed(1)} rad/s`, 12, 20);
    }
  };
  useEffect(() => { drawSim(); });

  const controls: Record<string, { key: string; label: string; min: number; max: number; step: number; unit: string }[]> = {
    PROJECTILE: [
      { key: 'velocity', label: 'Kecepatan awal', min: 5, max: 60, step: 1, unit: 'm/s' },
      { key: 'angle', label: 'Sudut elevasi', min: 10, max: 85, step: 5, unit: '°' },
      { key: 'gravity', label: 'Gravitasi', min: 1.6, max: 25, step: 0.1, unit: 'm/s²' },
    ],
    FREE_FALL: [
      { key: 'velocity', label: 'Kecepatan awal', min: 0, max: 40, step: 1, unit: 'm/s' },
      { key: 'gravity', label: 'Gravitasi', min: 1.6, max: 25, step: 0.1, unit: 'm/s²' },
    ],
    WAVE: [
      { key: 'amplitude', label: 'Amplitudo', min: 4, max: 40, step: 1, unit: 'px' },
      { key: 'frequency', label: 'Frekuensi', min: 0.2, max: 4, step: 0.1, unit: 'Hz' },
    ],
    CIRCUIT: [
      { key: 'voltage', label: 'Tegangan V', min: 1, max: 24, step: 1, unit: 'V' },
      { key: 'resistance', label: 'Hambatan R', min: 10, max: 1000, step: 10, unit: 'Ω' },
    ],
    SPRING: [
      { key: 'spring', label: 'Konstanta pegas k', min: 5, max: 60, step: 5, unit: 'N/m' },
      { key: 'mass', label: 'Massa m', min: 0.5, max: 5, step: 0.5, unit: 'kg' },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <BackButton to="/dashboard/study/fisika" label="Kembali ke Fisika" />
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2"><Atom size={28} className="text-primary-600" /> Simulasi Interaktif</h2>
        <p className="text-sm text-gray-600 mt-1">Manipulasi variabel dan amati dampaknya secara real-time (PhET-style playground).</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.keys(SIM_ICONS).map((k) => {
          const Icon = SIM_ICONS[k];
          const meta = SIM_LIST.find(s => s.key === k);
          return (
            <button key={k} onClick={() => { setType(k); setT(0); setRunning(true); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors ${type === k ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              <Icon size={15} /> {meta?.label || k}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Canvas */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
          <canvas ref={canvasRef} width={880} height={420} className="w-full rounded-xl" />
          <div className="flex gap-2 mt-3">
            <button onClick={() => setRunning(!running)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700">
              {running ? <Pause size={16} /> : <Play size={16} />} {running ? 'Jeda' : 'Jalankan'}
            </button>
            <button onClick={() => setT(0)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-200"><RotateCcw size={16} /> Reset</button>
            <span className="ml-auto text-xs text-gray-400 self-center">t = {t.toFixed(2)} s</span>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Kontrol Variabel</h3>
          {(controls[type] || []).map((c) => (
            <div key={c.key}>
              <div className="flex justify-between text-xs text-gray-600 mb-1"><span>{c.label}</span><span className="font-bold">{params[c.key]} {c.unit}</span></div>
              <input type="range" min={c.min} max={c.max} step={c.step} value={params[c.key]}
                onChange={(e) => { setP(c.key, parseFloat(e.target.value)); setT(0); }}
                className="w-full accent-primary-600" />
            </div>
          ))}
          <p className="text-xs text-gray-400 leading-relaxed pt-2 border-t border-gray-100">
            Ubah nilai lalu amati perubahan lintasan / grafik. Cocok untuk eksplorasi konsep sebelum ujian praktik.
          </p>
        </div>
      </div>
    </div>
  );
};
