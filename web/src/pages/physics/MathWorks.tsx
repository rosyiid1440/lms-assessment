import React, { useState, useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { ZoomIn, ZoomOut, Sigma, Upload, Eraser } from 'lucide-react';
import { BackButton } from '../../components/ui/BackButton';

const PRESETS: { label: string; tex: string }[] = [
  { label: 'Hukum Newton', tex: 'F = m \\cdot a' },
  { label: 'Kecepatan', tex: 'v = \\frac{\\Delta x}{\\Delta t}' },
  { label: 'Energi Kinetik', tex: 'E_k = \\tfrac{1}{2} m v^2' },
  { label: 'Gravitasi', tex: 'F = G\\frac{m_1 m_2}{r^2}' },
  { label: 'Vektor', tex: '\\vec{v} = v_x\\,\\hat{i} + v_y\\,\\hat{j}' },
  { label: 'Notasi Ilmiah', tex: '1.6 \\times 10^{-19}\\,\\text{C}' },
  { label: 'Gelombang', tex: 'v = f \\cdot \\lambda' },
  { label: 'Tekanan', tex: 'P = \\rho \\, g \\, h' },
];

export const MathWorks = () => {
  const [tex, setTex] = useState('F = m \\cdot a');
  const [err, setErr] = useState('');
  const [zoom, setZoom] = useState(1);
  const [uploaded, setUploaded] = useState<{ name: string; data: string } | null>(null);

  const rendered = useMemo(() => {
    try {
      let html = '';
      try { html = katex.renderToString(tex, { throwOnError: true, displayMode: true }); setErr(''); }
      catch (e: any) { setErr(e?.message || 'Sintaks LaTeX salah'); try { html = katex.renderToString(tex || 'f(x)', { displayMode: true, throwOnError: false }); } catch {} }
      return html;
    } catch { return ''; }
  }, [tex]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { setUploaded({ name: f.name, data: String(reader.result) }); };
    reader.readAsDataURL(f); e.target.value = '';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-12">
      <BackButton to="/dashboard/study/fisika" label="Kembali ke Fisika" />
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2"><Sigma size={28} className="text-primary-600" /> Editor Persamaan (LaTeX)</h2>
        <p className="text-sm text-gray-600 mt-1">Ketik rumus fisika rapi dengan notasi LaTeX/MathML. Gunakan preset cepat atau tulis manual.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => { setTex(p.tex); setErr(''); }}
            className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-primary-50 hover:border-primary-300">
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor */}
        <div className="bg-[#0f1117] rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 bg-[#161923] border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-300 flex items-center gap-2"><Sigma size={14} className="text-primary-400" /> Input LaTeX</span>
            <button onClick={() => setTex('')} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-200"><Eraser size={12} /> Bersihkan</button>
          </div>
          <textarea value={tex} onChange={(e) => setTex(e.target.value)} spellCheck={false}
            className="w-full bg-transparent text-[#d4d4d4] text-sm font-mono p-4 outline-none resize-none leading-relaxed" rows={10} />
          <div className="px-4 py-2 text-xs text-gray-500 border-t border-white/10 font-mono">{'Contoh: \\frac{a}{b}, \\sqrt{x}, \\vec{v}, 10^{-9}'}</div>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Pratinjau</h3>
            <div className="flex gap-1">
              <button onClick={() => setZoom(z => Math.max(0.6, z - 0.15))} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"><ZoomOut size={14} /></button>
              <button onClick={() => setZoom(z => Math.min(2.5, z + 0.15))} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"><ZoomIn size={14} /></button>
            </div>
          </div>
          <div className="min-h-[180px] bg-gray-50 rounded-xl flex items-center justify-center p-6">
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }} className="text-center text-gray-800 text-lg" dangerouslySetInnerHTML={{ __html: rendered }} />
          </div>
          {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
        </div>
      </div>

      {/* Handwritten work upload */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Upload size={14} /> Upload Coretan / Foto Jawaban</h3>
        <label className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 cursor-pointer inline-flex">
          <Upload size={16} /> Unggah Foto Lembar Kerja
          <input type="file" accept="image/*" className="hidden" onChange={onFile} />
        </label>
        {uploaded && (
          <div className="mt-4 rounded-xl overflow-hidden border border-gray-200">
            <img src={uploaded.data} alt={uploaded.name} className="w-full max-h-[420px] object-contain bg-gray-50" />
            <div className="px-3 py-2 text-xs text-gray-500 bg-white border-t border-gray-100 whitespace-nowrap overflow-hidden">📄 {uploaded.name}</div>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">Foto penurunan rumus akan dapat diperbesar & dikoreksi langsung oleh guru.</p>
      </div>
    </div>
  );
};