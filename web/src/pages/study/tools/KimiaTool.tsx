import React, { useMemo, useState } from 'react';
import { FlaskConical, Search } from 'lucide-react';
import type { SubjectDef } from '../registry';

interface Element {
  z: number; sym: string; name: string; mass: number; group: number; period: number; cat: string; color: string;
}

const CELL: Element[] = [
  { z: 1, sym: 'H', name: 'Hidrogen', mass: 1.008, group: 1, period: 1, cat: 'Nonlogam', color: '#f87171' },
  { z: 2, sym: 'He', name: 'Helium', mass: 4.003, group: 18, period: 1, cat: 'Gas Mulia', color: '#a78bfa' },
  { z: 3, sym: 'Li', name: 'Litium', mass: 6.94, group: 1, period: 2, cat: 'Logam Alkali', color: '#fbbf24' },
  { z: 4, sym: 'Be', name: 'Berilium', mass: 9.012, group: 2, period: 2, cat: 'Logam Alkali Tanah', color: '#fda4af' },
  { z: 5, sym: 'B', name: 'Boron', mass: 10.81, group: 13, period: 2, cat: 'Metaloid', color: '#34d399' },
  { z: 6, sym: 'C', name: 'Karbon', mass: 12.011, group: 14, period: 2, cat: 'Nonlogam', color: '#f87171' },
  { z: 7, sym: 'N', name: 'Nitrogen', mass: 14.007, group: 15, period: 2, cat: 'Nonlogam', color: '#f87171' },
  { z: 8, sym: 'O', name: 'Oksigen', mass: 15.999, group: 16, period: 2, cat: 'Nonlogam', color: '#f87171' },
  { z: 9, sym: 'F', name: 'Fluorin', mass: 18.998, group: 17, period: 2, cat: 'Halogen', color: '#fb923c' },
  { z: 10, sym: 'Ne', name: 'Neon', mass: 20.180, group: 18, period: 2, cat: 'Gas Mulia', color: '#a78bfa' },
  { z: 11, sym: 'Na', name: 'Natrium', mass: 22.990, group: 1, period: 3, cat: 'Logam Alkali', color: '#fbbf24' },
  { z: 12, sym: 'Mg', name: 'Magnesium', mass: 24.305, group: 2, period: 3, cat: 'Logam Alkali Tanah', color: '#fda4af' },
  { z: 13, sym: 'Al', name: 'Aluminium', mass: 26.982, group: 13, period: 3, cat: 'Logam Post-transisi', color: '#93c5fd' },
  { z: 14, sym: 'Si', name: 'Silikon', mass: 28.085, group: 14, period: 3, cat: 'Metaloid', color: '#34d399' },
  { z: 15, sym: 'P', name: 'Fosfor', mass: 30.974, group: 15, period: 3, cat: 'Nonlogam', color: '#f87171' },
  { z: 16, sym: 'S', name: 'Belerang', mass: 32.06, group: 16, period: 3, cat: 'Nonlogam', color: '#f87171' },
  { z: 17, sym: 'Cl', name: 'Klor', mass: 35.45, group: 17, period: 3, cat: 'Halogen', color: '#fb923c' },
  { z: 18, sym: 'Ar', name: 'Argon', mass: 39.948, group: 18, period: 3, cat: 'Gas Mulia', color: '#a78bfa' },
  { z: 19, sym: 'K', name: 'Kalium', mass: 39.098, group: 1, period: 4, cat: 'Logam Alkali', color: '#fbbf24' },
  { z: 20, sym: 'Ca', name: 'Kalsium', mass: 40.078, group: 2, period: 4, cat: 'Logam Alkali Tanah', color: '#fda4af' },
  { z: 24, sym: 'Cr', name: 'Kromium', mass: 51.996, group: 6, period: 4, cat: 'Logam Transisi', color: '#c4b5fd' },
  { z: 26, sym: 'Fe', name: 'Besi', mass: 55.845, group: 8, period: 4, cat: 'Logam Transisi', color: '#c4b5fd' },
  { z: 29, sym: 'Cu', name: 'Tembaga', mass: 63.546, group: 11, period: 4, cat: 'Logam Transisi', color: '#c4b5fd' },
  { z: 30, sym: 'Zn', name: 'Seng', mass: 65.38, group: 12, period: 4, cat: 'Logam Transisi', color: '#c4b5fd' },
  { z: 35, sym: 'Br', name: 'Bromin', mass: 79.904, group: 17, period: 4, cat: 'Halogen', color: '#fb923c' },
  { z: 36, sym: 'Kr', name: 'Kripton', mass: 83.798, group: 18, period: 4, cat: 'Gas Mulia', color: '#a78bfa' },
  { z: 47, sym: 'Ag', name: 'Perak', mass: 107.87, group: 11, period: 5, cat: 'Logam Transisi', color: '#c4b5fd' },
  { z: 50, sym: 'Sn', name: 'Timah', mass: 118.71, group: 14, period: 5, cat: 'Logam Post-transisi', color: '#93c5fd' },
  { z: 53, sym: 'I', name: 'Iodin', mass: 126.90, group: 17, period: 5, cat: 'Halogen', color: '#fb923c' },
];

const elementById = (z: number, sym = '') => CELL.find((e) => e.z === z || e.sym === sym);

const MOLASSESS = [
  { name: 'Air (H₂O)', mass: 18.015 },
  { name: 'Karbon dioksida (CO₂)', mass: 44.01 },
  { name: 'Natrium klorida (NaCl)', mass: 58.44 },
  { name: 'Glukosa (C₆H₁₂O₆)', mass: 180.16 },
  { name: 'Asam sulfat (H₂SO₄)', mass: 98.08 },
  { name: 'Amonia (NH₃)', mass: 17.03 },
];

export const kimiaTool = ({ subject }: { subject: SubjectDef }) => {
  const [selected, setSelected] = useState<Element>(CELL[1]); // He
  const [q, setQ] = useState('');
  const [massInput, setMassInput] = useState('');
  const [mol, setMol] = useState<number | null>(null);
  const [compound, setCompound] = useState(MOLASSESS[0]);

  const shown = useMemo(() => CELL.filter((e) => !q || e.sym.toLowerCase().includes(q.toLowerCase()) || e.name.toLowerCase().includes(q.toLowerCase())), [q]);

  const countMol = () => {
    const m = parseFloat(massInput);
    if (!m || m <= 0) return;
    setMol(m / compound.mass);
  };

  return (
    <div className="max-w-5xl">
      {/* Pengonversi mol */}
      <div className="mb-6 border border-gray-200 rounded-2xl p-5 bg-white">
        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><FlaskConical size={16} style={{ color: subject.color }} /> Kalkulator Mol</h4>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-500">Zat</label>
            <select value={compound.name} onChange={(e) => setCompound(MOLASSESS.find((m) => m.name === e.target.value) || MOLASSESS[0])} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
              {MOLASSESS.map((m) => <option key={m.name} value={m.name}>{m.name} (Mr = {m.mass})</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-gray-500">Massa (gram)</label>
            <input value={massInput} onChange={(e) => setMassInput(e.target.value)} type="number" placeholder="mis. 36" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <button onClick={countMol} className="px-4 py-2 rounded-lg text-white text-sm font-bold" style={{ background: subject.color }}>Hitung</button>
        </div>
        {mol !== null && (
          <div className="mt-4 p-3 rounded-xl" style={{ background: subject.tint }}>
            <p className="text-sm text-gray-800">n = m / Mr = <b>{massInput} / {compound.mass}</b> = <b className="font-bold" style={{ color: subject.color }}>{mol.toFixed(3)} mol</b></p>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-[1fr_280px] gap-4">
        {/* Periodic table */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900">Tabel Periodik Interaktif</h4>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari unsur..." className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs w-40" />
            </div>
          </div>
          <div className="border border-gray-200 rounded-2xl p-4 bg-white">
            <div className="grid" style={{ gridTemplateColumns: 'repeat(18, minmax(0,1fr))', gap: 3 }}>
              {Array.from({ length: 18 * 5 }).map((_, i) => {
                const period = Math.floor(i / 18) + 1;
                const group = (i % 18) + 1;
                const e = CELL.find((x) => x.period === period && x.group === group);
                if (!e) return <div key={i} />;
                const isSel = selected?.z === e.z;
                return (
                  <button key={i} onClick={() => setSelected(e)} title={`${e.name} (${e.sym})`}
                    className={`aspect-square rounded-md text-center flex items-center justify-center p-0.5 transition-transform ${isSel ? 'ring-2 ring-offset-1 scale-110' : 'hover:scale-110'}`}
                    style={{ background: e.color, color: '#1f2937', ['--tw-ring-color' as any]: subject.color }}>
                    <span className="text-[10px] font-bold leading-none">{e.sym}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detail card */}
        <div>
          <div className="border border-gray-200 rounded-2xl p-5 bg-white sticky top-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold mb-3" style={{ background: selected.color, color: '#1f2937' }}>{selected.sym}</div>
            <h4 className="text-sm font-bold text-gray-900">{selected.name}</h4>
            <div className="space-y-2 mt-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Nomor atom</span><b>{selected.z}</b></div>
              <div className="flex justify-between"><span className="text-gray-400">Massa atom</span><b>{selected.mass} u</b></div>
              <div className="flex justify-between"><span className="text-gray-400">Golongan</span><b>{selected.group}</b></div>
              <div className="flex justify-between"><span className="text-gray-400">Periode</span><b>{selected.period}</b></div>
              <div className="flex justify-between"><span className="text-gray-400">Kategori</span><b>{selected.cat}</b></div>
            </div>
            {elementById(selected.z) && (
              <p className="mt-4 text-xs text-gray-500 leading-relaxed">
                {selected.name} (simbol <b>{selected.sym}</b>, Z = {selected.z}). {selected.cat} pada golongan {selected.group}, periode {selected.period}. Digunakan luas dalam kimia dan kehidupan sehari-hari.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};