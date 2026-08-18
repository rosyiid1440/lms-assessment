import React, { useState } from 'react';
import { Landmark, ChevronRight, ChevronLeft } from 'lucide-react';
import type { SubjectDef } from '../registry';

const EVENTS = [
  { id: '1', year: 'Abad VII', periodLabel: 'Hindu-Buddha', title: 'Kedatangan Agama Hindu ke Nusantara', desc: 'Kontak dagang dengan India membawa pengaruh Hindu-Buddha, ditandai berdirinya kerajaan Tarumanegara & Kutai.' },
  { id: '2', year: 'Abad XIII', periodLabel: 'Islam', title: 'Perkembangan Islam di Nusantara', desc: 'Islam menyebar lewat jalur perdagangan; berdirinya kerajaan Samudera Pasai, lalu Demak.' },
  { id: '3', year: '1602', periodLabel: 'Kolonial', title: 'Berdirinya VOC', desc: 'Perusahaan dagang Belanda memonopoli rempah dan membangun penguasaan di tanah jajahan.' },
  { id: '4', year: '1908', periodLabel: 'Pergerakan', title: 'Lahirnya Budi Utomo', desc: 'Tonggak kebangkitan nasional; perjuangan beralih dari kedaerahan menuju kesatuan bangsa.' },
  { id: '5', year: '1928', periodLabel: 'Pergerakan', title: 'Sumpah Pemuda', desc: 'Ikrar satu tanah air, satu bangsa, satu bahasa pada Kongres Pemuda II.' },
  { id: '6', year: '1945', periodLabel: 'Merdeka', title: 'Proklamasi Kemerdekaan', desc: '58 Agustus 1945, Soekarno-Hatta membacakan teks proklamasi kemerdekaan RI.' },
  { id: '7', year: '1971', periodLabel: 'Reformasi', title: 'Keruntuhan Orde Baru', desc: 'Krisis moneter 1997-98 melahirkan gerakan reformasi dan pergantian pemerintahan.' },
];

const QUIZ = [
  { q: 'Organisasi yang menjadi tonggak kebangkitan nasional (1908)?', opts: ['BPUPKI', 'Budi Utomo', 'Muhammadiyah', 'PNI'], a: 1 },
  { q: 'Kerajaan maritim Islam pertama di Nusantara adalah...', opts: ['Demak', 'Banten', 'Samudera Pasai', 'Cirebon'], a: 2 },
  { q: 'Peristiwa Sumpah Pemuda terjadi pada tahun...', opts: ['1908', '1928', '1945', '1920'], a: 1 },
  { q: 'Lembaga dagang Belanda yang memonopoli rempah...', opts: ['EIC', 'VOC', 'BIM', 'KNIL'], a: 1 },
];

export const sejarahTool = ({ subject }: { subject: SubjectDef }) => {
  const [idx, setIdx] = useState(0);
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [ans, setAns] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const answer = (i: number) => {
    setAns(i);
    if (i === QUIZ[qi].a) setScore((s) => s + 1);
    setTimeout(() => { if (qi + 1 < QUIZ.length) setQi(qi + 1); else setDone(true); setAns(null); }, 1200);
  };

  return (
    <div className="max-w-4xl">
      <div className="border border-gray-200 rounded-2xl bg-white p-4 mb-8">
        <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><Landmark size={16} style={{ color: subject.color }} /> Linimasa Peristiwa</h4>
        <div className="grid md:grid-cols-[1fr_260px] gap-4 items-start">
          <div className="relative pl-6 border-l-2 border-gray-200 space-y-4">
            {EVENTS.map((ev) => (
              <div key={ev.id} className="relative">
                <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: subject.color }} />
                <div className={`border rounded-xl p-3 transition-colors ${idx === Number(ev.id) - 1 ? 'bg-amber-50 border-amber-200' : 'border-gray-100'}`}>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full" style={{ background: subject.tint, color: subject.color }}>{ev.year}</span>
                  <span className="text-[11px] text-gray-400 ml-2">{ev.periodLabel}</span>
                  <h5 className="text-sm font-bold text-gray-900 mt-1.5">{ev.title}</h5>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{ev.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border border-gray-100 rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Bacalah linimasa, lalu uji pemahaman di kuis cepat berikut.</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0} className="p-2 rounded-lg border border-gray-200 bg-white disabled:opacity-40"><ChevronLeft size={16} /></button>
              <button onClick={() => setIdx(Math.min(EVENTS.length - 1, idx + 1))} disabled={idx === EVENTS.length - 1} className="p-2 rounded-lg border border-gray-200 bg-white disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-2xl bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-gray-900">Kuis Kronologi</h4>
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