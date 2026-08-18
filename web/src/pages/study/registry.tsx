import React from 'react';
import {
  Atom, FlaskConical, Dna, Globe2, LineChart, Landmark, Users, BookOpenCheck, Palette, Languages, Cpu, Sigma, BookA, Dumbbell, Sun, ShieldCheck,
  Dices, BarChart3, Film, Trophy, Boxes, MonitorPlay, ListOrdered, Mosque, HeartHandshake, MessagesSquare, Scale, Music, Compass, ClipboardCheck, Clapperboard, Target, Clock4, BookMarked, MapPin, LayoutGrid, Calculator, Activity, Feather,
} from 'lucide-react';

export type SubjectKey =
  | 'matematika' | 'fisika' | 'kimia' | 'biologi' | 'informatika'
  | 'sejarah' | 'geografi' | 'ekonomi' | 'sosiologi'
  | 'bahasa-indonesia' | 'bahasa-inggris'
  | 'pai' | 'ppkn'
  | 'seni-budaya' | 'pjok';

export interface AppDef {
  label: string;
  to: string;                        // full route (lab) or hub route + ?tab=
  icon: React.ComponentType<{ size?: number | string; className?: string; style?: React.CSSProperties }>;
  desc: string;
}

export interface SubjectDef {
  key: SubjectKey;
  label: string;
  rumpun: string;
  color: string;
  tint: string;
  tagline: string;
  description: string;
  icon: React.ComponentType<{ size?: number | string; className?: string; style?: React.CSSProperties }>;
  apps: AppDef[];                    // aplikasi khas mapel
  hasLab: boolean;
  labRoute?: string;   // existing dedicated lab if present
  hubRoute: string;    // internal subject hub route
}

export const RumpunOrder = ['MIPA', 'IPS', 'Bahasa', 'Agama & PPKn', 'Seni & Olahraga'];

const hub = (key: string, tab: string) => `/dashboard/study/${key}?tab=${tab}`;

export const SUBJECTS: SubjectDef[] = [
  // ============ MIPA ============
  {
    key: 'matematika', label: 'Matematika', rumpun: 'MIPA', icon: Sigma,
    color: '#2563eb', tint: '#eff6ff', tagline: 'Aljabar, kalkulus & geometri',
    description: 'Pahami konsep aljabar, fungsi, trigonometri hingga kalkulus lewat materi terstruktur, latihan soal, dan grafik interaktif.',
    apps: [
      { label: 'Grafik Fungsi', to: hub('matematika', 'simulasi'), icon: Calculator, desc: 'Plot persamaan y=f(x) interaktif' },
      { label: 'Materi', to: hub('matematika', 'materi'), icon: BookA, desc: 'Ringkasan konsep & rumus' },
      { label: 'Latihan Soal', to: hub('matematika', 'latihan'), icon: Target, desc: 'Kuis & bank soal' },
      { label: 'Kartu Rumus', to: hub('matematika', 'hafalan'), icon: BookMarked, desc: 'Hafalan rumus penting' },
    ],
    hasLab: false, hubRoute: '/dashboard/study/matematika',
  },
  {
    key: 'fisika', label: 'Fisika', rumpun: 'MIPA', icon: Atom,
    color: '#7c3aed', tint: '#f5f3ff', tagline: 'Fenomena alam & simulasi',
    description: 'Simulasi interaktif, virtual lab, dan soal parametrik fisika.',
    apps: [
      { label: 'Simulasi Interaktif', to: '/dashboard/physics/simulations', icon: Atom, desc: 'Eksperimen fisika virtual' },
      { label: 'Virtual Lab', to: '/dashboard/physics/virtual-lab', icon: FlaskConical, desc: 'Percobaan laboratorium' },
      { label: 'Editor Rumus', to: '/dashboard/physics/math-editor', icon: Sigma, desc: 'Tulis rumus LaTeX' },
      { label: 'Soal Parametrik', to: '/dashboard/physics/questions', icon: Dices, desc: 'Soal dengan variabel acak' },
      { label: 'Analisis Data', to: '/dashboard/physics/data-analysis', icon: BarChart3, desc: 'Statistik & best-fit' },
      { label: 'Video Kuis', to: '/dashboard/physics/video-notes', icon: Film, desc: 'Belajar via video interaktif' },
    ],
    hasLab: true, labRoute: '/dashboard/physics/simulations', hubRoute: '/dashboard/study/fisika',
  },
  {
    key: 'kimia', label: 'Kimia', rumpun: 'MIPA', icon: FlaskConical,
    color: '#0d9488', tint: '#f0fdfa', tagline: 'Struktur materi & reaksi',
    description: 'Tabel periodik interaktif, konsep mol, ikatan kimia, dan reaksi.',
    apps: [
      { label: 'Tabel Periodik', to: hub('kimia', 'simulasi'), icon: FlaskConical, desc: 'Jelajahi unsur & kalkulator mol' },
      { label: 'Materi', to: hub('kimia', 'materi'), icon: BookA, desc: 'Ringkasan konsep kimia' },
      { label: 'Latihan Soal', to: hub('kimia', 'latihan'), icon: Target, desc: 'Kuis struktur & reaksi' },
      { label: 'Kartu Istilah', to: hub('kimia', 'hafalan'), icon: BookMarked, desc: 'Hafalan istilah kimia' },
    ],
    hasLab: false, hubRoute: '/dashboard/study/kimia',
  },
  {
    key: 'biologi', label: 'Biologi', rumpun: 'MIPA', icon: Dna,
    color: '#16a34a', tint: '#f0fdf4', tagline: 'Makhluk hidup & ekosistem',
    description: 'Sel, genetika, anatomi, hingga ekosistem dengan latihan interaktif.',
    apps: [
      { label: 'Anatomi Interaktif', to: hub('biologi', 'simulasi'), icon: Activity, desc: 'Jelajahi sistem organ' },
      { label: 'Materi', to: hub('biologi', 'materi'), icon: BookA, desc: 'Ringkasan konsep biologi' },
      { label: 'Latihan Soal', to: hub('biologi', 'latihan'), icon: Target, desc: 'Kuis sel & jaringan' },
      { label: 'Kartu Sel', to: hub('biologi', 'hafalan'), icon: BookMarked, desc: 'Hafalan organel & fungsi' },
    ],
    hasLab: false, hubRoute: '/dashboard/study/biologi',
  },
  {
    key: 'informatika', label: 'Informatika', rumpun: 'MIPA', icon: Cpu,
    color: '#0891b2', tint: '#ecfeff', tagline: 'Berpikir komputasional',
    description: 'Code editor, coding challenges, projek teknis, dan virtual lab.',
    apps: [
      { label: 'Code Editor', to: '/dashboard/informatics/editor', icon: Cpu, desc: 'Editor kode online' },
      { label: 'Coding Challenges', to: '/dashboard/informatics/challenges', icon: Trophy, desc: 'Tantangan pemrograman' },
      { label: 'Projek Teknis', to: '/dashboard/informatics/projects', icon: Boxes, desc: 'Projek berbasis proyek' },
      { label: 'Virtual Lab', to: '/dashboard/informatics/lab', icon: MonitorPlay, desc: 'Lab komputasi interaktif' },
      { label: 'Leaderboard', to: '/dashboard/informatics/leaderboard', icon: ListOrdered, desc: 'Peringkat pemrogram' },
    ],
    hasLab: true, labRoute: '/dashboard/informatics/editor', hubRoute: '/dashboard/study/informatika',
  },
  // ============ IPS ============
  {
    key: 'sejarah', label: 'Sejarah', rumpun: 'IPS', icon: Landmark,
    color: '#b45309', tint: '#fffbeb', tagline: 'Peristiwa & peradaban',
    description: 'Linimasa peristiwa, tokoh, dan peradaban Indonesia dan dunia.',
    apps: [
      { label: 'Linimasa', to: hub('sejarah', 'timeline'), icon: Clock4, desc: 'Kronologi peristiwa' },
      { label: 'Kuis Kronologi', to: hub('sejarah', 'simulasi'), icon: Target, desc: 'Uji urutan peristiwa' },
      { label: 'Materi', to: hub('sejarah', 'materi'), icon: BookA, desc: 'Ringkasan peristiwa & tokoh' },
      { label: 'Latihan Soal', to: hub('sejarah', 'latihan'), icon: Dices, desc: 'Bank soal sejarah' },
    ],
    hasLab: false, hubRoute: '/dashboard/study/sejarah',
  },
  {
    key: 'geografi', label: 'Geografi', rumpun: 'IPS', icon: Globe2,
    color: '#ca8a04', tint: '#fefce8', tagline: 'Bumi, wilayah & lingkungan',
    description: 'Peta interaktif, wilayah, litosfer, hidrosfer, dan dinamika bumi.',
    apps: [
      { label: 'Peta Interaktif', to: hub('geografi', 'simulasi'), icon: MapPin, desc: 'Jelajahi kepulauan Indonesia' },
      { label: 'Materi', to: hub('geografi', 'materi'), icon: BookA, desc: 'Ringkasan konsep geografi' },
      { label: 'Latihan Soal', to: hub('geografi', 'latihan'), icon: Target, desc: 'Kuis litosfer & atmosfer' },
      { label: 'Linimasa', to: hub('geografi', 'timeline'), icon: Clock4, desc: 'Peristiwa kebumian' },
    ],
    hasLab: false, hubRoute: '/dashboard/study/geografi',
  },
  {
    key: 'ekonomi', label: 'Ekonomi', rumpun: 'IPS', icon: LineChart,
    color: '#059669', tint: '#ecfdf5', tagline: 'Permintaan, penawaran & pasar',
    description: 'Keseimbangan pasar, elastisitas, dan simulasi ekonomi.',
    apps: [
      { label: 'Simulasi Pasar', to: hub('ekonomi', 'simulasi'), icon: LineChart, desc: 'Geser kurva permintaan-penawaran' },
      { label: 'Materi', to: hub('ekonomi', 'materi'), icon: BookA, desc: 'Ringkasan konsep ekonomi' },
      { label: 'Latihan Soal', to: hub('ekonomi', 'latihan'), icon: Target, desc: 'Kuis keseimbangan pasar' },
      { label: 'Kartu Istilah', to: hub('ekonomi', 'hafalan'), icon: BookMarked, desc: 'Hafalan istilah ekonomi' },
    ],
    hasLab: false, hubRoute: '/dashboard/study/ekonomi',
  },
  {
    key: 'sosiologi', label: 'Sosiologi', rumpun: 'IPS', icon: Users,
    color: '#db2777', tint: '#fdf2f8', tagline: 'Masyarakat & interaksi sosial',
    description: 'Struktur sosial, kelompok, dan perubahan sosial dalam masyarakat.',
    apps: [
      { label: 'Studi Kasus', to: hub('sosiologi', 'simulasi'), icon: Users, desc: 'Analisis interaksi sosial' },
      { label: 'Materi', to: hub('sosiologi', 'materi'), icon: BookA, desc: 'Ringkasan konsep sosiologi' },
      { label: 'Latihan Soal', to: hub('sosiologi', 'latihan'), icon: Target, desc: 'Kuis dasar sosiologi' },
    ],
    hasLab: false, hubRoute: '/dashboard/study/sosiologi',
  },
  // ============ BAHASA ============
  {
    key: 'bahasa-indonesia', label: 'Bahasa Indonesia', rumpun: 'Bahasa', icon: BookA,
    color: '#dc2626', tint: '#fef2f2', tagline: 'Berkomunikasi & mengapresiasi',
    description: 'Kaidah kebahasaan, memahami bacaan, dan menulis.',
    apps: [
      { label: 'Pemeriksa EYD', to: hub('bahasa-indonesia', 'simulasi'), icon: Feather, desc: 'Cek ejaan & kaidah' },
      { label: 'Glosarium', to: hub('bahasa-indonesia', 'hafalan'), icon: BookMarked, desc: 'Kosakata & makna' },
      { label: 'Materi', to: hub('bahasa-indonesia', 'materi'), icon: BookA, desc: 'Kaidah kebahasaan' },
      { label: 'Latihan Soal', to: hub('bahasa-indonesia', 'latihan'), icon: Target, desc: 'Kuis pemahaman teks' },
    ],
    hasLab: false, hubRoute: '/dashboard/study/bahasa-indonesia',
  },
  {
    key: 'bahasa-inggris', label: 'Bahasa Inggris', rumpun: 'Bahasa', icon: Languages,
    color: '#4f46e5', tint: '#eef2ff', tagline: 'English learning',
    description: 'Modul ajar, kosakata, dan latihan bahasa Inggris.',
    apps: [
      { label: 'English Learning', to: '/dashboard/elt', icon: Languages, desc: 'Modul ajar & latihan ELT' },
    ],
    hasLab: true, labRoute: '/dashboard/elt', hubRoute: '/dashboard/study/bahasa-inggris',
  },
  // ============ AGAMA & PPKN ============
  {
    key: 'pai', label: 'Pendidikan Agama Islam', rumpun: 'Agama & PPKn', icon: BookOpenCheck,
    color: '#15803d', tint: '#f7fee7', tagline: 'Tahfidz, ibadah & akhlak',
    description: 'Tahfidz, jurnal ibadah, media islami, diskusi, dan asesmen karakter.',
    apps: [
      { label: 'Tahfidz & Murajaah', to: '/dashboard/pai/tahfidz', icon: Mosque, desc: 'Setoran hafalan' },
      { label: 'Jurnal Ibadah', to: '/dashboard/pai/ibadah', icon: HeartHandshake, desc: 'Catat amal harian' },
      { label: 'Pustaka Media', to: '/dashboard/pai/media', icon: Landmark, desc: 'Murottal & dalil' },
      { label: 'Diskusi & Q&A', to: '/dashboard/pai/discussion', icon: MessagesSquare, desc: 'Forum & tanya ustadz' },
      { label: 'Asesmen Karakter', to: '/dashboard/pai/assessment', icon: Scale, desc: 'Kasus moral & cerita' },
    ],
    hasLab: true, labRoute: '/dashboard/pai/tahfidz', hubRoute: '/dashboard/study/pai',
  },
  {
    key: 'ppkn', label: 'Pendidikan Pancasila', rumpun: 'Agama & PPKn', icon: ShieldCheck,
    color: '#e11d48', tint: '#fff1f2', tagline: 'Pancasila & kewarganegaraan',
    description: 'Nilai-nilai Pancasila, UUD 1945, dan wawasan kebangsaan.',
    apps: [
      { label: 'Kuis Pancasila', to: hub('ppkn', 'simulasi'), icon: ShieldCheck, desc: 'Uji sila & lambang negara' },
      { label: 'Materi', to: hub('ppkn', 'materi'), icon: BookA, desc: 'Nilai-nilai Pancasila' },
      { label: 'Latihan Soal', to: hub('ppkn', 'latihan'), icon: Target, desc: 'Kuis Pancasila & UUD' },
    ],
    hasLab: false, hubRoute: '/dashboard/study/ppkn',
  },
  // ============ SENI & OLAHRAGA ============
  {
    key: 'seni-budaya', label: 'Seni Budaya', rumpun: 'Seni & Olahraga', icon: Palette,
    color: '#a21caf', tint: '#fae8ff', tagline: 'Kreasi & apresiasi seni',
    description: 'Galeri virtual, studio performance, dan apresiasi budaya.',
    apps: [
      { label: 'Galeri Virtual', to: '/dashboard/arts/gallery', icon: Palette, desc: 'Pameran karya seni' },
      { label: 'Studio Performance', to: '/dashboard/arts/studio', icon: Music, desc: 'Rekaman & kritik' },
      { label: 'Apresiasi & Tur', to: '/dashboard/arts/appreciation', icon: Compass, desc: 'Tur budaya virtual' },
      { label: 'Rubrik & Peer', to: '/dashboard/arts/rubric', icon: ClipboardCheck, desc: 'Penilaian antarteman' },
      { label: 'Storyboard', to: '/dashboard/arts/storyboard', icon: Clapperboard, desc: 'Papan cerita kolaboratif' },
    ],
    hasLab: true, labRoute: '/dashboard/arts/gallery', hubRoute: '/dashboard/study/seni-budaya',
  },
  {
    key: 'pjok', label: 'PJOK', rumpun: 'Seni & Olahraga', icon: Dumbbell,
    color: '#9333ea', tint: '#faf5ff', tagline: 'Pendidikan jasmani & kesehatan',
    description: 'Olahraga, kesehatan, dan kebugaran jasmani.',
    apps: [
      { label: 'Kalkulator IMT', to: hub('pjok', 'simulasi'), icon: Calculator, desc: 'Hitung indeks massa tubuh' },
      { label: 'Materi', to: hub('pjok', 'materi'), icon: BookA, desc: 'Kebugaran & kesehatan' },
      { label: 'Latihan Soal', to: hub('pjok', 'latihan'), icon: Target, desc: 'Kuis kebugaran jasmani' },
    ],
    hasLab: false, hubRoute: '/dashboard/study/pjok',
  },
];

export const sunIcon = Sun;

export const subjectByKey = (key: string) => SUBJECTS.find((s) => s.key === key) || SUBJECTS[0];