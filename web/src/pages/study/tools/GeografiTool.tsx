import React, { useState } from 'react';
import { Globe2, Mountain, Waves, MapPin, CloudSun, TreePine, Home } from 'lucide-react';
import type { SubjectDef } from '../registry';

const REGIONS = [
  { id: 'jawa', name: 'Pulau Jawa', icon: Mountain, desc: 'Pulau paling padat di Indonesia dengan gunung api aktif (Merapi, Semeru).', x: 55, y: 55 },
  { id: 'sumatra', name: 'Pulau Sumatra', icon: TreePine, desc: 'Membentang dari barat laut ke tenggara; pegunungan Bukit Barisan.', x: 28, y: 35 },
  { id: 'kalimantan', name: 'Pulau Kalimantan', icon: Home, desc: 'Pulau terbesar di Indonesia; berbatasan langsung dengan Malaysia.', x: 52, y: 30 },
  { id: 'sulawesi', name: 'Pulau Sulawesi', icon: Waves, desc: 'Bentuk memanjang seperti huruf K; laut dalam dan taman laut.', x: 72, y: 40 },
  { id: 'papua', name: 'Pulau Papua', icon: CloudSun, desc: 'Pulau timur dengan puncak Jayawijaya yang bersalju (Puncak Jaya).', x: 88, y: 50 },
  { id: 'bali', name: 'Bali & Nusa Tenggara', icon: Globe2, desc: 'Busur kepulauan kecil dengan gunung api & pantai tropis.', x: 68, y: 62 },
];

export const geografiTool = ({ subject }: { subject: SubjectDef }) => {
  const [active, setActive] = useState(REGIONS[0]);

  return (
    <div className="max-w-5xl">
      <div className="grid md:grid-cols-[1fr_280px] gap-4">
        <div className="border border-gray-200 rounded-2xl bg-white p-4">
          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Globe2 size={16} style={{ color: subject.color }} /> Peta Kepulauan Indonesia — Klik wilayah</h4>
          <div className="rounded-xl overflow-hidden relative" style={{ background: subject.tint, minHeight: 340 }}>
            <svg viewBox="0 0 100 70" className="w-full h-full" preserveAspectRatio="none">
              <path d="M5,40 Q12,35 18,38 Q24,41 28,36 Q34,32 40,36 Q46,40 52,38 Q58,36 62,40 Q68,44 74,42 Q80,40 85,44 Q92,48 96,44" fill="none" stroke="#9ca3af" strokeWidth="0.6" strokeDasharray="2 2" />
              {REGIONS.map((r) => (
                <g key={r.id} onClick={() => setActive(r)} style={{ cursor: 'pointer' }}>
                  <circle cx={r.x} cy={r.y} r="3" fill={active.id === r.id ? subject.color : '#d1d5db'} stroke="#fff" strokeWidth="0.6" />
                </g>
              ))}
            </svg>
          </div>
        </div>
        <div>
          <div className="border border-gray-200 rounded-2xl bg-white p-4 sticky top-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: subject.tint, color: subject.color }}>
              {active.id === 'jawa' ? <Mountain size={20} /> : active.id === 'sumatra' ? <TreePine size={20} /> : active.id === 'bali' ? <Globe2 size={20} /> : active.id === 'papua' ? <CloudSun size={20} /> : active.id === 'sulawesi' ? <Waves size={20} /> : <Home size={20} />}
            </div>
            <h4 className="text-sm font-bold text-gray-900 mb-2">{active.name}</h4>
            <p className="text-sm text-gray-600 leading-relaxed">{active.desc}</p>
            <div className="mt-4 space-y-1.5 text-sm">
              {REGIONS.map((r) => (
                <button key={r.id} onClick={() => setActive(r)}
                  className={`flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-lg transition-colors ${active.id === r.id ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}>
                  <MapPin size={14} style={{ color: active.id === r.id ? subject.color : '#d1d5db' }} />
                  <span className="text-xs text-gray-700">{r.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};