import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { SUBJECTS, RumpunOrder } from './registry';
import type { SubjectDef } from './registry';

export const StudyIndex = () => {
  return (
    <div className="min-h-full">
      {/* Hero */}
      <div className="rounded-3xl overflow-hidden mb-6" style={{ background: 'linear-gradient(120deg,#4338ca 0%,#7c3aed 60%,#a21caf 100%)' }}>
        <div className="p-6 md:p-10 text-white relative">
          <div className="absolute right-0 top-0 opacity-10 text-[120px] leading-none">☄</div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-2">Platform Belajar</p>
          <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Aplikasi Penunjang Pembelajaran</h1>
          <p className="text-white/85 text-sm md:text-base max-w-2xl">
            Pilih salah satu mata pelajaran, lalu buka aplikasi belajarnya. Setiap mapel memiliki
            perangkat belajar yang berbeda — dari simulasi dan lab virtual hingga kartu hafalan.
          </p>
        </div>
      </div>

      {/* Per rumpun */}
      {RumpunOrder.filter((r) => SUBJECTS.some((s) => s.rumpun === r)).map((rumpun) => (
        <section key={rumpun} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-5 rounded-full bg-primary-600" />
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{rumpun}</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {SUBJECTS.filter((s) => s.rumpun === rumpun).map((s) => (
              <SubjectCard key={s.key} subject={s} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

const SubjectCard = ({ subject }: { subject: SubjectDef }) => {
  const Icon = subject.icon;

  return (
    <Link
      to={subject.hubRoute}
      className="group border border-gray-200 rounded-2xl bg-white p-5 hover:shadow-lg hover:border-gray-300 hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: subject.tint, color: subject.color }}>
          <Icon size={22} />
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <CheckCircle2 size={13} className="text-green-500" />
          <span>Buka</span>
        </div>
      </div>
      <h3 className="text-sm font-bold text-gray-900" style={{ color: subject.color }}>{subject.label}</h3>
      <p className="text-xs text-gray-500 mt-1 mb-3 leading-relaxed">{subject.tagline}</p>

      {/* Aplikasi khas mapel */}
      <div className="space-y-1.5 mb-3">
        {subject.apps.slice(0, 3).map((a) => (
          <div key={a.label} className="flex items-center gap-2 text-xs text-gray-600">
            <a.icon size={14} style={{ color: subject.color }} className="flex-shrink-0" />
            <span className="truncate">{a.label}</span>
          </div>
        ))}
        {subject.apps.length > 3 && (
          <p className="text-[11px] text-gray-400 pl-6">+{subject.apps.length - 3} aplikasi lainnya</p>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs font-semibold border-t border-gray-100 pt-3" style={{ color: subject.color }}>
        Buka aplikasi <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
};