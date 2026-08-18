import React, { useState } from 'react';
import { BookA, Type, SpellCheck, PenTool } from 'lucide-react';
import type { SubjectDef } from '../registry';

const EYD_RULES: [string, string][] = [
  ['di kenal', 'dikenal'],
  ['di atas', 'di atas'],
  ['kerjakan lah', 'kerjakanlah'],
  ['di sertai', 'disertai'],
  ['di ganti', 'diganti'],
  ['ber makan', 'bermakan'],
  ['di jalan', 'di jalan'],
];

const CHECK_OK = [
  'Kami belajar bahasa Indonesia hari ini.',
  'Buku itu diletakkan di atas meja.',
  'Kita harus saling menghargai.',
  'Pemerintah mengambil kebijakan baru.',
];

const WIKU = [
  { id: '1', kata: 'Amanah', arti: 'Dapat dipercaya; sesuai janji. Salah satu sifat wajib rasul.' },
  { id: '2', kata: 'Fenomena', arti: 'Kejadian yang dapat diamati; gejala.' },
  { id: '3', kata: 'Imajinasi', arti: 'Gambaran mental; daya khayal.' },
  { id: '4', kata: 'Komprehensif', arti: 'Menyeluruh; luas cakupannya.' },
  { id: '5', kata: 'Mengapresiasi', arti: 'Menghargai dan menilai.' },
  { id: '6', kata: 'Revitalisasi', arti: 'Proses menghidupkan/meremajakan kembali.' },
];

export const bahasaIndonesiaTool = ({ subject }: { subject: SubjectDef }) => {
  const [text, setText] = useState('Kami berjuang di sertai semangat yang tinggi.');
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [card, setCard] = useState(0);

  const check = () => {
    let issues: string[] = [];
    EYD_RULES.forEach(([bad]) => {
      if (bad !== 'di atas' && text.toLowerCase().includes(bad.toLowerCase())) issues.push(`"${bad}"`);
    });
    if (!issues.length) setResult({ ok: true, msg: 'Tidak ditemukan kesalahan umum yang dikenal.' });
    else setResult({ ok: false, msg: `Ada kemungkinan kesalahan: ${issues.join(', ')}` });
  };

  const useExample = (t: string) => setText(t);

  return (
    <div className="max-w-4xl">
      <div className="border border-gray-200 rounded-2xl bg-white p-5 mb-6">
        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><SpellCheck size={16} style={{ color: subject.color }} /> Pemeriksa Ejaan (sederhana)</h4>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        <div className="flex gap-2 mt-3">
          <button onClick={check} className="px-4 py-2 rounded-lg text-white text-sm font-bold" style={{ background: subject.color }}>Periksa</button>
          <button onClick={() => setText(CHECK_OK[Math.floor(Math.random() * CHECK_OK.length)])} className="px-3 py-2 rounded-lg border text-sm text-gray-600">Contoh</button>
        </div>
        {result && (
          <p className={`mt-3 text-sm font-medium ${result.ok ? 'text-green-600' : 'text-red-600'}`}>
            {result.ok ? '✓' : '⚠'} {result.msg}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-3">Catatan: pemeriksa sederhana ini mengenali pola umum imbuhan di-/ke- dan gabungan kata.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-2xl bg-white p-5">
          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><BookA size={16} style={{ color: subject.color }} /> kosakata / glosarium</h4>
          <div className="space-y-2">
            {WIKU.map((w) => (
              <div key={w.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: subject.tint, color: subject.color }}>
                  <Type size={15} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{w.kata}</p>
                  <p className="text-xs text-gray-600">{w.arti}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-gray-200 rounded-2xl bg-white p-5">
          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><PenTool size={16} style={{ color: subject.color }} /> Kerangka Menulis</h4>
          <p className="text-xs text-gray-500 mb-3">Draf paragraf deskripsi yang dapat Anda kembangkan:</p>
          <div className="rounded-xl p-4" style={{ background: subject.tint }}>
            <p className="text-sm text-gray-800 italic leading-relaxed">
              &quot;Halaman sekolah kami selalu ramai pada pagi hari. Pohon-pohon rindang menaungi para siswa yang sedang bercakap, sementara suara lonceng berbunyi tiga kali menandai dimulainya pelajaran pertama.&quot;
            </p>
          </div>
          <div className="mt-4 space-y-1.5">
            <p className="text-xs font-bold text-gray-700">Langkah menulis deskripsi:</p>
            {['1. Tentukan objek & kesan utama', '2. Gunakan panca indra', '3. Susun dari umum ke khusus', '4. Pilih diksi yang kuat'].map((s) => (
              <p key={s} className="text-xs text-gray-500">• {s}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};