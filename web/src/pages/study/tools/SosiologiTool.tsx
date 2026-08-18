import React, { useState } from 'react';
import { Users, MessageCircle } from 'lucide-react';
import type { SubjectDef } from '../registry';

const CASES = [
  { id: '1', title: 'Masyarakat Digital', desc: 'Dua kelompok siswa berbeda pendapat tentang penggunaan media sosial. Satu kelompok mendukung kebebasan berekspresi penuh, yang lain menuntut filter ketat.', opts: ['Mengabaikan', 'Menghormati perbedaan pendapat & mencari kompromi', 'Membenarkan satu kelompok', 'Melaporkan semua'], best: 1 },
  { id: '2', title: 'Stratifikasi Sosial', desc: 'Anak seorang pedagang kecil kesulitan bergabung dengan kelompok siswa dari kalangan ekonomi atas di sekolahnya.', opts: ['Membiarkan', 'Mendorongnya bergabung atas dasar kesetaraan', 'Menghindarinya', 'Menyalahkan situasi'], best: 1 },
  { id: '3', title: 'Perubahan Sosial', desc: 'Peralihan dari ekonomi agraris ke industri mengubah struktur keluarga di desa. Banyak pemuda merantau ke kota.', opts: ['Menolak semua perubahan', 'Menganalisis dampak & adaptasi terhadap perubahan', 'Menyuruh semua kembali ke desa', 'Mengabaikan gejala'], best: 1 },
  { id: '4', title: 'Kelompok Sosial', desc: 'Terbentuk gangs di sekolah yang mengeksklusifkan siswa lain. Bagaimana sikap yang sehat?', opts: ['Ikut bergabung', 'Membangun inklusi & mencegah pengucilan', 'Memusuhi mereka', 'Menghindar'], best: 1 },
];

const PERSPECTIVES = [
  { name: 'E. Durkheim', idea: 'Solidaritas sosial & fakta sosial', color: '#2563eb' },
  { name: 'Max Weber', idea: 'Tindakan sosial bermakna', color: '#9333ea' },
  { name: 'K. Marx', idea: 'Konflik & kelas sosial', color: '#dc2626' },
  { name: 'Talcott P.', idea: 'Struktur & fungsi (struktural fungsional)', color: '#059669' },
];

export const sosiologiTool = ({ subject }: { subject: SubjectDef }) => {
  const [ci, setCi] = useState(0);
  const [result, setResult] = useState<string | null>(null);

  const pick = (i: number) => {
    const c = CASES[ci];
    if (i === c.best) setResult('Tanggapan baik — analisis sosiologis yang sehat.');
    else setResult('Coba kaitkan dengan nilai empati dan fungsi sosial.');
  };

  return (
    <div className="max-w-4xl">
      <div className="border border-gray-200 rounded-2xl bg-white p-5 mb-6">
        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><MessageCircle size={16} style={{ color: subject.color }} /> Studi Kasus Interaksi Sosial</h4>
        <div className="flex gap-2 mb-4">
          {CASES.map((c, i) => (
            <button key={c.id} onClick={() => { setCi(i); setResult(null); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${ci === i ? 'bg-pink-50 text-pink-700' : 'text-gray-500 hover:bg-gray-50'}`}>Kasus {i + 1}</button>
          ))}
        </div>
        <div className="rounded-2xl p-5" style={{ background: subject.tint }}>
          <h5 className="text-base font-bold text-gray-900 mb-2">{CASES[ci].title}</h5>
          <p className="text-sm text-gray-700 leading-relaxed">{CASES[ci].desc}</p>
        </div>
        <div className="mt-4 space-y-2">
          {CASES[ci].opts.map((o, i) => (
            <button key={i} onClick={() => pick(i)} className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 text-sm hover:border-gray-400 transition-colors">
              {String.fromCharCode(65 + i)}. {o}
            </button>
          ))}
        </div>
        {result && <p className="mt-3 text-sm font-medium" style={{ color: subject.color }}>{result}</p>}
      </div>

      <div className="border border-gray-200 rounded-2xl bg-white p-5">
        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Users size={16} style={{ color: subject.color }} /> Tokoh & Teori Sosiologi</h4>
        <div className="grid md:grid-cols-2 gap-3">
          {PERSPECTIVES.map((p) => (
            <div key={p.name} className="flex items-start gap-3 rounded-xl border border-gray-100 p-3 hover:shadow-sm transition-shadow">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: p.color }}>{p.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.idea}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};