import React, { useState } from 'react';
import { ShieldCheck, Scroll, Vote } from 'lucide-react';
import type { SubjectDef } from '../registry';

const SILA = [
  { no: 1, text: 'Ketuhanan Yang Maha Esa', simb: 'Bintang', desc: 'Setiap warga bebas memeluk agama, toleransi antarumat beragama.' },
  { no: 2, text: 'Kemanusiaan yang Adil dan Beradab', simb: 'Rantai', desc: 'Menjunjung harkat martabat manusia, keadilan dan peradaban.' },
  { no: 3, text: 'Persatuan Indonesia', simb: 'Pohon Beringin', desc: 'Nasionalisme, cinta tanah air, dan persatuan dalam keberagaman.' },
  { no: 4, text: 'Kerakyatan yang Dipimpin oleh Hikmat Kebijaksanaan dalam Permusyawaratan/Perwakilan', simb: 'Kepala Banteng', desc: 'Demokrasi, musyawarah untuk mufakat, menghargai pendapat.' },
  { no: 5, text: 'Keadilan Sosial bagi Seluruh Rakyat Indonesia', simb: 'Padi dan Kapas', desc: 'Kesejahteraan, keadilan sosial, pemerataan di seluruh lapisan.' },
];

const QUIZ = [
  { q: 'Sila ke-3 Pancasila dilambangkan dengan...', opts: ['Bintang', 'Rantai', 'Pohon Beringin', 'Padi dan Kapas'], a: 2 },
  { q: '&quot;Musyawarah untuk mufakat&quot; merupakan pengamalan sila ke-...', opts: ['2', '3', '4', '5'], a: 2 },
  { q: 'Sila pertama Pancasila berbunyi...', opts: ['Kemanusiaan yang adil dan beradab', 'Ketuhanan Yang Maha Esa', 'Persatuan Indonesia', 'Keadilan sosial'], a: 1 },
  { q: 'Rantai dalam lambang negara melambangkan sila ke-...', opts: ['1', '2', '3', '4'], a: 1 },
];

export const ppknTool = ({ subject }: { subject: SubjectDef }) => {
  const [si, setSi] = useState(0);
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
      <div className="grid md:grid-cols-[1fr_240px] gap-4 mb-6">
        <div className="border border-gray-200 rounded-2xl bg-white p-4">
          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><ShieldCheck size={16} style={{ color: subject.color }} /> Sila-sila Pancasila</h4>
          <div className="space-y-2">
            {SILA.map((s, i) => (
              <button key={s.no} onClick={() => setSi(i)} className={`w-full text-left p-3 rounded-xl border transition-colors ${si === i ? 'bg-rose-50 border-rose-200' : 'border-gray-100 hover:bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0" style={{ background: subject.color }}>{s.no}</span>
                  <span className="text-sm font-semibold text-gray-800">{s.text}</span>
                </div>
                {si === i && <p className="text-xs text-gray-600 mt-2">{s.desc}</p>}
              </button>
            ))}
          </div>
        </div>
        <div className="border border-gray-200 rounded-2xl bg-white p-4">
          <h4 className="text-sm font-bold text-gray-900 mb-3">Lambang Sila</h4>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-center text-[10px] font-bold text-white p-2 mx-auto" style={{ background: subject.color }}>
            {SILA[si].simb}
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center leading-relaxed">Lambang sila ke-{SILA[si].no}: {SILA[si].simb}</p>
        </div>
      </div>

      <div className="border border-gray-200 rounded-2xl bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Vote size={16} style={{ color: subject.color }} /> Kuis Pancasila</h4>
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
                  {String.fromCharCode(65 + i)}. {o.replace(/&quot;/g, '"').replace(/&amp;/g, '&')}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};