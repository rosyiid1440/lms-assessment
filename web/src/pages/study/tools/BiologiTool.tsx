import React, { useState } from 'react';
import { Dna, Eye, Heart, Brain, Bone, Activity } from 'lucide-react';
import type { SubjectDef } from '../registry';

const Filter = ({ size = 24, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
);

const ORGANS = [
  { id: 'otak', label: 'Otak', icon: Brain, desc: 'Pusat pengendali tubuh. Mengatur kesadaran, berpikir, & gerakan.' },
  { id: 'jantung', label: 'Jantung', icon: Heart, desc: 'Memompa darah ke seluruh tubuh. Terdiri dari 4 ruang: 2 atrium & 2 ventrikel.' },
  { id: 'paru', label: 'Paru-paru', icon: Filter, desc: 'Organ pernapasan. Pertukaran O₂ dan CO₂ terjadi di alveolus.' },
  { id: 'lambung', label: 'Lambung', icon: Activity, desc: 'Mencerna makanan dengan asam lambung & enzim pepsin.' },
  { id: 'tulang', label: 'Tulang', icon: Bone, desc: 'Rangka tubuh. Memberi bentuk, melindungi organ, & tempat perlekatan otot.' },
  { id: 'ginjal', label: 'Ginjal', icon: Filter, desc: 'Menyaring darah & membuang zat sisa melalui urin.' },
  { id: 'mata', label: 'Mata', icon: Eye, desc: 'Organ penglihatan. Cahaya difokuskan oleh lensa ke retina.' },
];

const QUIZ = [
  { q: 'Organ manakah yang berfungsi memompa darah?', opts: ['Paru-paru', 'Jantung', 'Ginjal', 'Lambung'], a: 1 },
  { q: 'Pertukaran oksigen dan karbon dioksida terjadi di...', opts: ['Bronkus', 'Trakea', 'Alveolus', 'Laring'], a: 2 },
  { q: 'Unit dasar pewarisan sifat disebut...', opts: ['Gen', 'Sel', 'Kromosom DNA', 'Nukleus'], a: 0 },
  { q: 'Organ yang menyaring darah adalah...', opts: ['Hati', 'Ginjal', 'Pankreas', 'Limpa'], a: 1 },
];

export const biologiTool = ({ subject }: { subject: SubjectDef }) => {
  const [organ, setOrgan] = useState(ORGANS[1]);
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [ans, setAns] = useState<number | null>(null);

  const answer = (i: number) => {
    setAns(i);
    if (i === QUIZ[qi].a) setScore((s) => s + 1);
    setTimeout(() => {
      if (qi + 1 < QUIZ.length) setQi(qi + 1);
      else setDone(true);
      setAns(null);
    }, 1200);
  };

  return (
    <div className="max-w-5xl">
      <div className="grid md:grid-cols-[340px_1fr] gap-4 mb-8">
        {/* Body outline selector */}
        <div className="border border-gray-200 rounded-2xl bg-white p-4">
          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Dna size={16} style={{ color: subject.color }} /> Anatomi Tubuh</h4>
          <div className="grid grid-cols-2 gap-2">
            {ORGANS.map((o) => (
              <button key={o.id} onClick={() => setOrgan(o)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-colors ${organ.id === o.id ? 'bg-green-50 border-green-300' : 'border-gray-100 hover:bg-gray-50'}`}>
                <o.icon size={20} style={{ color: subject.color }} />
                <span className="text-xs font-medium text-gray-700">{o.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="h-56 rounded-2xl flex flex-col items-center justify-center p-6 text-center" style={{ background: subject.tint }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: subject.color }}>
              <organ.icon size={30} className="text-white" />
            </div>
            <h5 className="text-lg font-bold text-gray-900">{organ.label}</h5>
            <p className="text-sm text-gray-600 max-w-md mt-2 leading-relaxed">{organ.desc}</p>
          </div>
        </div>
      </div>

      {/* Quiz mini */}
      <div className="border border-gray-200 rounded-2xl bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-gray-900">Kuis Cepat</h4>
          <span className="text-xs text-gray-400">Skor: {score}/{QUIZ.length}</span>
        </div>
        {done ? (
          <div className="text-center py-6">
            <p className="text-lg font-bold" style={{ color: subject.color }}>Selesai! Skor {score}/{QUIZ.length}</p>
            <button onClick={() => { setQi(0); setScore(0); setDone(false); }} className="mt-3 px-4 py-2 rounded-lg border text-sm text-gray-600">Ulangi</button>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-800 mb-3">{qi + 1}. {QUIZ[qi].q}</p>
            <div className="grid gap-2 md:grid-cols-2 pl-1">
              {QUIZ[qi].opts.map((o, i) => (
                <button key={i} onClick={() => answer(i)}
                  className={`px-4 py-2.5 rounded-xl border text-sm text-left transition-colors ${ans !== null ? (i === QUIZ[qi].a ? 'border-green-300 bg-green-50' : 'opacity-50') : 'hover:border-gray-300'}`}>
                  {String.fromCharCode(65 + i)}. {o}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};