import React, { useState } from 'react';
import { Dumbbell, HeartPulse, Timer, Activity } from 'lucide-react';
import type { SubjectDef } from '../registry';

const EXERCISES = [
  { name: 'Push-up', icon: Activity, desc: 'Melatih otot dada, bahu, dan trisep. Mulai 3 set × 10 repetisi.' },
  { name: 'Sit-up', icon: Activity, desc: 'Memperkuat otot perut. Jaga punggung agar tidak meregang berlebih.' },
  { name: 'Squat', icon: Activity, desc: 'Melatih otot kaki dan bokong. Posisi lutut di atas tumit.' },
  { name: 'Lari Interval', icon: Timer, desc: 'Latihan kardio: sprint 30 detik, jogging 60 detik, ulangi 6–8 kali.' },
  { name: 'Plank', icon: Timer, desc: 'Menstabilkan inti tubuh. Tahan 20–60 detik per set.' },
  { name: 'Sky Dive (jumping jack)', icon: HeartPulse, desc: 'Pemanasan kardio ringan untuk menaikkan detak jantung.' },
];

const calcBMI = (kg: number, cm: number) => kg / Math.pow(cm / 100, 2);

const bmiInfo = (b: number) => {
  if (b < 18.5) return { cat: 'Kurus', color: '#f59e0b', note: 'Idealnya tingkatkan asupan kalori & latihan kekuatan.' };
  if (b < 25) return { cat: 'Normal', color: '#16a34a', note: 'Pertahankan pola hidup sehat.' };
  if (b < 30) return { cat: 'Berlebih', color: '#f97316', note: 'Atur pola makan & rutin olahraga.' };
  return { cat: 'Obesitas', color: '#dc2626', note: 'Konsultasikan program penurunan dengan pendamping.' };
};

export const pjokTool = ({ subject }: { subject: SubjectDef }) => {
  const [kg, setKg] = useState('60');
  const [cm, setCm] = useState('165');
  const [bmi, setBmi] = useState<number | null>(null);

  const compute = () => {
    const w = parseFloat(kg), h = parseFloat(cm);
    if (!w || !h || h <= 0) return;
    setBmi(calcBMI(w, h));
  };

  const info = bmi ? bmiInfo(bmi) : null;

  return (
    <div className="max-w-5xl">
      <div className="border border-gray-200 rounded-2xl bg-white p-5 mb-6">
        <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><HeartPulse size={16} style={{ color: subject.color }} /> Kalkulator Indeks Massa Tubuh (IMT)</h4>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-gray-500">Berat badan (kg)</label>
            <input value={kg} onChange={(e) => setKg(e.target.value)} type="number" className="w-32 mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Tinggi badan (cm)</label>
            <input value={cm} onChange={(e) => setCm(e.target.value)} type="number" className="w-32 mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <button onClick={compute} className="px-4 py-2 rounded-lg text-white text-sm font-bold" style={{ background: subject.color }}>Hitung IMT</button>
        </div>
        {info && bmi !== null && (
          <div className="mt-4 p-4 rounded-xl" style={{ background: subject.tint }}>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-extrabold" style={{ color: info.color }}>{bmi.toFixed(1)}</span>
              <span className="text-sm font-bold px-2 py-1 rounded-full text-white" style={{ background: info.color }}>{info.cat}</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">IMT = berat / (tinggi m)² = {kg} / ({cm} cm)². {info.note}</p>
          </div>
        )}
      </div>

      <div className="border border-gray-200 rounded-2xl bg-white p-5">
        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Dumbbell size={16} style={{ color: subject.color }} /> Jenis Latihan & Manfaat</h4>
        <div className="grid md:grid-cols-3 gap-3">
          {EXERCISES.map((e) => (
            <div key={e.name} className="rounded-xl border border-gray-100 p-3 hover:shadow-sm transition-shadow">
              <e.icon size={18} style={{ color: subject.color }} className="mb-2" />
              <p className="text-sm font-semibold text-gray-900">{e.name}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{e.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
          <p className="text-xs text-gray-600"><b>Tips:</b> Lakukan pemanasan 5–10 menit sebelum latihan, jaga hidrasi, dan sesuaikan intensitas dengan kemampuan masing-masing.</p>
        </div>
      </div>
    </div>
  );
};