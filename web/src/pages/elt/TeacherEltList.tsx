import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/axios';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Mic, Headphones, BookOpen, PenLine, SpellCheck, Layers, MessageSquare, Users, ArrowRight, Search, MoreVertical } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';

const SKILLS = [
  { key: 'SPEAKING', label: 'Speaking', icon: Mic, color: 'text-blue-600 bg-blue-50' },
  { key: 'LISTENING', label: 'Listening', icon: Headphones, color: 'text-violet-600 bg-violet-50' },
  { key: 'READING', label: 'Reading', icon: BookOpen, color: 'text-teal-600 bg-teal-50' },
  { key: 'WRITING', label: 'Writing', icon: PenLine, color: 'text-orange-600 bg-orange-50' },
  { key: 'GRAMMAR', label: 'Grammar', icon: SpellCheck, color: 'text-rose-600 bg-rose-50' },
  { key: 'VOCABULARY', label: 'Vocabulary', icon: Layers, color: 'text-indigo-600 bg-indigo-50' },
];

const ACTIVITY_TYPES: Record<string, { key: string; label: string; desc: string }[]> = {
  SPEAKING: [
    { key: 'VOICE_RECORDING', label: 'Voice Recording', desc: 'Siswa merekam audio (read-aloud / monolog)' },
    { key: 'PRONUNCIATION_AI', label: 'Pronunciation AI', desc: 'Latihan pengucapan dengan skor' },
  ],
  LISTENING: [
    { key: 'LISTENING_VIDEO', label: 'Video + Subtitle', desc: 'Pemutar media + transkrip interaktif' },
    { key: 'LISTENING_TRANSCRIPT', label: 'Interactive Transcript', desc: 'Transkrip kata-per-kata yang bisa diklik' },
  ],
  READING: [
    { key: 'READING_PASSAGE', label: 'Reading Passage', desc: 'Bacaan dengan glosarium kata' },
  ],
  WRITING: [
    { key: 'WRITING_ESSAY', label: 'Essay / Paragraph', desc: 'Menulis esai atau paragraf' },
    { key: 'GRAMMAR_SPELL', label: 'Grammar & Spell Check', desc: 'Menulis + cek tata bahasa & ejaan' },
  ],
  GRAMMAR: [
    { key: 'GRAMMAR_SPELL', label: 'Grammar Check', desc: 'Menulis dengan cek tata bahasa' },
    { key: 'CLOZE_TEST', label: 'Cloze Test', desc: 'Isi rumpang (fill in the blank)' },
  ],
  VOCABULARY: [
    { key: 'VOCAB_FLASHCARD', label: 'Flashcards', desc: 'Kartu digital untuk hafalan kata' },
    { key: 'VOCAB_QUIZ', label: 'Vocabulary Quiz', desc: 'Kuis kosakata gamified' },
  ],
  COLLABORATIVE: [
    { key: 'DISCUSSION', label: 'Discussion Board', desc: 'Forum benang (threaded) - teks atau suara' },
    { key: 'PEER_REVIEW', label: 'Peer Review', desc: 'Siswa mereview tulisan/tugas teman' },
  ],
};

const COLLAB_SKILLS = ['SPEAKING', 'READING', 'WRITING'];

const SKILL_GRADIENTS: Record<string, string> = {
  SPEAKING: 'from-blue-500 to-indigo-600',
  LISTENING: 'from-violet-500 to-purple-600',
  READING: 'from-teal-500 to-emerald-600',
  WRITING: 'from-orange-500 to-amber-600',
  GRAMMAR: 'from-rose-500 to-pink-600',
  VOCABULARY: 'from-indigo-500 to-blue-600',
};

export const TeacherEltList = () => {
  const [activities, setActivities] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Form state
  const [form, setForm] = useState<any>({
    courseId: '', title: '', instructions: '', skillType: 'SPEAKING', activityType: 'VOICE_RECORDING',
    cefrLevel: '', passage: '', mediaUrl: '', transcript: '', prompt: '', minWords: 50,
  });

  const fetchCourses = useCallback(async () => {
    try {
      const res = await api.get('/courses?limit=100');
      setCourses(res.data.data || []);
    } catch { /* ignore */ }
  }, []);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (selectedCourse) params.set('courseId', selectedCourse);
      if (searchTerm) params.set('q', searchTerm);
      const res = await api.get(`/elt/activities?${params.toString()}`);
      setActivities(res.data.data || []);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, searchTerm]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    fetchActivities();
    const handleClickOutside = () => setMenuOpen(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [fetchActivities]);

  const handleCreate = async () => {
    if (!form.courseId || !form.title.trim() || !form.skillType || !form.activityType) {
      alert('Kursus, judul, skill, dan jenis aktivitas wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const config: any = {};
      if (form.activityType === 'VOICE_RECORDING' || form.activityType === 'PRONUNCIATION_AI') {
        config.prompt = form.prompt;
      }
      if (form.activityType === 'LISTENING_VIDEO' || form.activityType === 'LISTENING_TRANSCRIPT') {
        config.mediaUrl = form.mediaUrl;
        config.transcript = form.transcript;
      }
      if (form.activityType === 'READING_PASSAGE') {
        config.passage = form.passage;
      }
      if (form.activityType === 'WRITING_ESSAY' || form.activityType === 'GRAMMAR_SPELL') {
        config.prompt = form.prompt;
        config.minWords = parseInt(form.minWords) || 0;
      }
      await api.post('/elt/activities', {
        courseId: form.courseId,
        title: form.title,
        instructions: form.instructions,
        skillType: form.skillType,
        activityType: form.activityType,
        cefrLevel: form.cefrLevel || undefined,
        config,
      });
      setShowForm(false);
      setForm({ courseId: selectedCourse, title: '', instructions: '', skillType: 'SPEAKING', activityType: 'VOICE_RECORDING', cefrLevel: '', passage: '', mediaUrl: '', transcript: '', prompt: '', minWords: 50 });
      fetchActivities();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Gagal membuat aktivitas.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/elt/activities/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchActivities();
    } catch (err) {
      alert('Gagal menghapus aktivitas.');
    } finally {
      setDeleting(false);
    }
  };

  const skillInfo = (key: string) => SKILLS.find((s) => s.key === key) || { key, label: key, icon: Layers, color: 'text-gray-600 bg-gray-50' };
  const SkillIcon = (key: string) => { const s = skillInfo(key); return <s.icon size={16} />; };

  if (error) return <ErrorState message="Gagal memuat data aktivitas ELT." onRetry={fetchActivities} />;

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 pb-12">
      <BackButton to="/dashboard/study/bahasa-inggris" label="Kembali ke Bahasa Inggris" />

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">English Learning Activities</h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Melatih 6 keterampilan: Speaking, Listening, Reading, Writing, Grammar & Vocabulary — plus diskusi dan peer review.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-500/20 active:scale-[0.98] transition-all"
        >
          <Plus size={18} /> Buat Aktivitas
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari judul aktivitas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm transition-all bg-white"
          />
        </div>
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Semua Kursus</option>
          {courses.map((c: any) => (
            <option key={c.id} value={c.id}>{c.subject?.name} — {c.class?.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <SkeletonList count={3} />
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Belum ada aktivitas ELT"
          description="Buat aktivitas bahasa Inggris pertama untuk melatih keterampilan siswa."
          action={
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 transition-colors">
              <Plus size={18} /> Buat Aktivitas
            </button>
          }
          className="py-24"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {activities.map((a) => {
            const si = skillInfo(a.skillType);
            const gradient = SKILL_GRADIENTS[a.skillType] || 'from-gray-500 to-gray-600';
            return (
              <div
                key={a.id}
                className="group flex flex-col bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden transform hover:-translate-y-1"
              >
                <div className={`h-24 bg-gradient-to-br ${gradient} p-5 relative cursor-pointer`} onClick={() => navigate(`/dashboard/teacher/elt/${a.id}`)}>
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="relative z-10 flex justify-between items-start">
                    <div className="flex items-center gap-2 text-white/90 text-[10px] font-extrabold uppercase tracking-wider">
                      {SkillIcon(a.skillType)} {si.label}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === a.id ? null : a.id); }}
                      className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <MoreVertical size={18} />
                    </button>
                    {menuOpen === a.id && (
                      <div className="absolute right-0 top-8 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 py-1.5 overflow-hidden">
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/teacher/elt/${a.id}`); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <ArrowRight size={16} /> Lihat / Nilai
                        </button>
                        <div className="h-px bg-gray-100 my-1"></div>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(a); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                          <Trash2 size={16} /> Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 pt-5 pb-4 flex-1 flex flex-col cursor-pointer" onClick={() => navigate(`/dashboard/teacher/elt/${a.id}`)}>
                  <h3 className="text-lg font-bold text-gray-900 leading-snug line-clamp-2 mb-3">{a.title}</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-gray-100 text-gray-600 rounded-md">
                      {a.activityType.replace(/_/g, ' ')}
                    </span>
                    {a.cefrLevel && (
                      <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-teal-50 text-teal-700 rounded-md">
                        CEFR {a.cefrLevel}
                      </span>
                    )}
                    <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-gray-50 text-gray-500 rounded-md">
                      {a.courseName}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-auto">
                    <span className="flex items-center gap-1.5"><Users size={14} /> {a._count?.attempts ?? 0} pengiriman</span>
                    <span className="flex items-center gap-1.5"><Layers size={14} /> {a._count?.items ?? 0} item</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Buat Aktivitas ELT" width="max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Kursus</label>
            <select
              value={form.courseId}
              onChange={(e) => setForm({ ...form, courseId: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Pilih kursus...</option>
              {courses.map((c: any) => (
                <option key={c.id} value={c.id}>{c.subject?.name} — {c.class?.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Judul</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="cth: Read Aloud — My Daily Routine"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Skill</label>
            <div className="grid grid-cols-3 gap-2">
              {SKILLS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    const types = ACTIVITY_TYPES[s.key];
                    const firstType = types[0].key;
                    setForm({ ...form, skillType: s.key, activityType: firstType });
                  }}
                  className={`px-2 py-2 text-xs font-bold rounded-xl border transition-colors ${form.skillType === s.key ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  <s.icon size={14} className="inline mr-1" /> {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Jenis Aktivitas</label>
            <div className="space-y-2">
              {ACTIVITY_TYPES[form.skillType]?.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setForm({ ...form, activityType: t.key })}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${form.activityType === t.key ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <p className="text-sm font-bold text-gray-800">{t.label}</p>
                  <p className="text-xs text-gray-500">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Instruksi</label>
            <textarea
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              rows={3}
              placeholder="Jelaskan tugas kepada siswa..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {(form.activityType === 'VOICE_RECORDING' || form.activityType === 'PRONUNCIATION_AI' || form.activityType === 'WRITING_ESSAY' || form.activityType === 'GRAMMAR_SPELL') && (
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Prompt / Topik</label>
              <textarea
                value={form.prompt}
                onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                rows={3}
                placeholder={form.activityType === 'VOICE_RECORDING' ? 'cth: Bacalah paragraf berikut dengan lantang...' : 'cth: Tulis sebuah paragraf tentang hobi Anda...'}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}

          {form.activityType === 'READING_PASSAGE' && (
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Bacaan (Passage)</label>
              <textarea
                value={form.passage}
                onChange={(e) => setForm({ ...form, passage: e.target.value })}
                rows={5}
                placeholder="Tempel teks bacaan di sini..."
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}

          {(form.activityType === 'LISTENING_VIDEO' || form.activityType === 'LISTENING_TRANSCRIPT') && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">URL Media (audio/video)</label>
                <input
                  type="text"
                  value={form.mediaUrl}
                  onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
                  placeholder="https://example.com/audio.mp3"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Transkrip</label>
                <textarea
                  value={form.transcript}
                  onChange={(e) => setForm({ ...form, transcript: e.target.value })}
                  rows={4}
                  placeholder="Transkrip kata-per-kata untuk transkrip interaktif..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Level CEFR (opsional)</label>
            <select
              value={form.cefrLevel}
              onChange={(e) => setForm({ ...form, cefrLevel: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Tidak ada</option>
              {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan Aktivitas'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              Batal
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Aktivitas?"
        description={`Aktivitas "${deleteTarget?.title}" beserta semua pengiriman siswa akan dihapus.`}
        confirmText="Hapus"
        isLoading={deleting}
      />
    </div>
  );
};
