import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/axios';
import { useNavigate } from 'react-router-dom';
import { Search, Mic, Headphones, BookOpen, PenLine, SpellCheck, Layers, ArrowRight, CheckCircle2, Clock, Trophy } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { StudentPageHeader } from '../../components/ui/StudentPageHeader';

const SKILLS: Record<string, { label: string; icon: any; gradient: string }> = {
  SPEAKING: { label: 'Speaking', icon: Mic, gradient: 'from-blue-500 to-indigo-600' },
  LISTENING: { label: 'Listening', icon: Headphones, gradient: 'from-violet-500 to-purple-600' },
  READING: { label: 'Reading', icon: BookOpen, gradient: 'from-teal-500 to-emerald-600' },
  WRITING: { label: 'Writing', icon: PenLine, gradient: 'from-orange-500 to-amber-600' },
  GRAMMAR: { label: 'Grammar', icon: SpellCheck, gradient: 'from-rose-500 to-pink-600' },
  VOCABULARY: { label: 'Vocabulary', icon: Layers, gradient: 'from-indigo-500 to-blue-600' },
};

export const StudentEltList = () => {
  const [activities, setActivities] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [aRes, pRes] = await Promise.all([api.get('/elt/activities'), api.get('/elt/progress')]);
      setActivities(aRes.data.data || []);
      setProgress(pRes.data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = activities.filter((a) => {
    const matchesSearch = !searchTerm || a.title.toLowerCase().includes(searchTerm.toLowerCase()) || (a.courseName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !filter || a.skillType === filter;
    return matchesSearch && matchesFilter;
  });

  const skillsBar = progress?.skills ? Object.entries(progress.skills) : [];

  if (error) return <ErrorState message="Gagal memuat aktivitas ELT." onRetry={fetchAll} />;

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 pb-12">
      <StudentPageHeader icon={Layers} title="English Learning" description="Latihan Speaking, Listening, Reading, Writing, Grammar, dan Vocabulary." />

      {/* Progress overview */}
      {progress?.skills && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Trophy size={14} /> Kemajuan per Skill</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {skillsBar.map(([key, v]: any) => {
              const s = SKILLS[key];
              const pct = v.total > 0 ? Math.round((v.done / v.total) * 100) : 0;
              return (
                <div key={key} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    {s ? <s.icon size={14} className="text-primary-600" /> : null}
                    <span className="text-xs font-bold text-gray-600">{s?.label || key}</span>
                  </div>
                  <p className="text-lg font-extrabold text-gray-900">{v.done}<span className="text-sm text-gray-400 font-medium">/{v.total}</span></p>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari aktivitas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm transition-all bg-white"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Semua Skill</option>
          {Object.entries(SKILLS).map(([key, s]) => (
            <option key={key} value={key}>{s.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <SkeletonList count={3} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Belum ada aktivitas"
          description={searchTerm || filter ? "Tidak ada aktivitas yang cocok." : "Guru belum membuat aktivitas ELT untuk kursus Anda."}
          className="py-24"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((a) => {
            const s = SKILLS[a.skillType] || { label: a.skillType, icon: Layers, gradient: 'from-gray-500 to-gray-600' };
            const done = !!a.myAttempt;
            return (
              <div
                key={a.id}
                className="group flex flex-col bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden transform hover:-translate-y-1 cursor-pointer"
                onClick={() => navigate(`/dashboard/student/elt/${a.id}`)}
              >
                <div className={`h-24 bg-gradient-to-br ${s.gradient} p-5 relative`}>
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="relative z-10 flex justify-between items-start">
                    <div className="flex items-center gap-2 text-white/90 text-[10px] font-extrabold uppercase tracking-wider">
                      <s.icon size={14} /> {s.label}
                    </div>
                    {done ? (
                      <span className="flex items-center gap-1 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-green-500/90 text-white rounded-md">
                        <CheckCircle2 size={12} /> Selesai
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white rounded-md">
                        <Clock size={12} /> Belum
                      </span>
                    )}
                  </div>
                </div>
                <div className="px-5 pt-5 pb-4 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-gray-900 leading-snug line-clamp-2 mb-3">{a.title}</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-gray-100 text-gray-600 rounded-md">{a.activityType.replace(/_/g, ' ')}</span>
                    {a.cefrLevel && <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-teal-50 text-teal-700 rounded-md">CEFR {a.cefrLevel}</span>}
                    <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-gray-50 text-gray-500 rounded-md">{a.courseName}</span>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    {a.myAttempt?.finalGrade != null ? (
                      <span className="text-sm font-bold text-primary-700">Nilai: {a.myAttempt.finalGrade}</span>
                    ) : a.myAttempt ? (
                      <span className="text-sm font-medium text-gray-500">Menunggu dinilai</span>
                    ) : (
                      <span className="text-sm text-gray-400">Belum dikerjakan</span>
                    )}
                    <button className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                      {a.myAttempt ? 'Lihat' : 'Kerjakan'} <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
