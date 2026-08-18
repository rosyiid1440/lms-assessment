import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { ClipboardCheck, Plus, Trash2, Star, Loader2, Send, Award, LayoutList } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';
import { Modal } from '../../components/ui/Modal';

const BRANCH_META: Record<string, { label: string; emoji: string; dims: { key: string; label: string }[] }> = {
  TARI: { label: 'Tari', emoji: '💃', dims: [{ key: 'wiraga', label: 'Wiraga (Gerak)' }, { key: 'wirama', label: 'Wirama (Irama)' }, { key: 'wirasa', label: 'Wirasa (Ekspresi)' }, { key: 'wirupa', label: 'Wirupa (Penampilan)' }] },
  SENI_RUPA: { label: 'Seni Rupa', emoji: '🎨', dims: [{ key: 'komposisi', label: 'Komposisi' }, { key: 'teknik', label: 'Teknik' }, { key: 'kreativitas', label: 'Kreativitas' }, { key: 'pesan', label: 'Pesan' }] },
  TEATER: { label: 'Teater', emoji: '🎭', dims: [{ key: 'vokal', label: 'Vokal' }, { key: 'penghayatan', label: 'Penghayatan' }, { key: 'blocking', label: 'Blocking' }, { key: 'gestur', label: 'Gestur' }] },
  MUSIK: { label: 'Musik', emoji: '🎵', dims: [{ key: 'nada', label: 'Keakuratan Nada' }, { key: 'ritme', label: 'Ritme' }, { key: 'ekspresi', label: 'Ekspresi' }, { key: 'teknik', label: 'Teknik' }] },
};

const DAIE_FIELDS = [
  { key: 'description', label: 'Deskripsi', hint: 'Deskripsikan apa yang kamu lihat/dengar secara objektif' },
  { key: 'formalAnalysis', label: 'Analisis Formal', hint: 'Analisis elemen seni: komposisi, warna, gerak, irama' },
  { key: 'interpretation', label: 'Interpretasi', hint: 'Apa pesan / makna yang ingin disampaikan karya?' },
  { key: 'evaluation', label: 'Evaluasi', hint: 'Berikan penilaian dan saran konstruktif' },
];

export const RubricPage = () => {
  const { user } = useAuthStore();
  const isTeacher = user?.role?.slug === 'teacher' || user?.role?.slug === 'admin';
  const [artworks, setArtworks] = useState<any[]>([]);
  const [performances, setPerformances] = useState<any[]>([]);
  const [rubrics, setRubrics] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showRubric, setShowRubric] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rubricForm, setRubricForm] = useState({ title: '', branch: 'TARI' });
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [reviewWork, setReviewWork] = useState<any>(null);
  const [reviewScores, setReviewScores] = useState<Record<string, number>>({});
  const [daie, setDaie] = useState<Record<string, string>>({});
  const [gradeTarget, setGradeTarget] = useState<any>(null);
  const [gradeScores, setGradeScores] = useState<Record<string, number>>({});
  const [gradeFeedback, setGradeFeedback] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const [a, p, r, rv, g] = await Promise.all([api.get('/arts/artworks'), api.get('/arts/performances'), api.get('/arts/rubrics'), api.get('/arts/reviews'), api.get('/arts/grades')]);
      setArtworks(a.data || []); setPerformances(p.data || []); setRubrics(r.data || []); setReviews(rv.data || []); setGrades(g.data || []);
    } catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createRubric = async () => {
    if (!rubricForm.title) return alert('Judul wajib');
    const dims = BRANCH_META[rubricForm.branch].dims.map((d) => ({ ...d, maxScore: 25 }));
    setSaving(true);
    try { await api.post('/arts/rubrics', { ...rubricForm, dimensions: dims }); setShowRubric(false); setRubricForm({ title: '', branch: 'TARI' }); fetchAll(); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal'); } finally { setSaving(false); }
  };

  const startReview = (work: any, isPerf: boolean) => {
    setReviewWork(work); setReviewTarget(isPerf ? 'performance' : 'artwork');
    setReviewScores({}); setDaie({});
  };

  const submitReview = async () => {
    if (!reviewWork) return;
    setSaving(true);
    try {
      const payload: any = { ...daie, scores: reviewScores };
      if (reviewTarget === 'performance') payload.performanceId = reviewWork.id; else payload.artworkId = reviewWork.id;
      const rubric = rubrics.find((r) => r.branch === (reviewWork.medium ? 'SENI_RUPA' : 'TARI'));
      if (rubric) payload.rubricId = rubric.id;
      await api.post('/arts/reviews', payload);
      setReviewTarget(null); setReviewWork(null); fetchAll(); alert('Kritik & apresiasi terkirim!');
    } catch (e: any) { alert(e?.response?.data?.error || 'Gagal'); } finally { setSaving(false); }
  };

  const submitGrade = async () => {
    if (!gradeTarget) return;
    setSaving(true);
    try {
      const total = Object.values(gradeScores).reduce((a, b) => a + (b || 0), 0);
      const payload: any = { studentId: gradeTarget.studentId, scores: gradeScores, score: total, feedback: gradeFeedback };
      const rubric = rubrics.find((r) => r.branch === (gradeTarget.medium ? 'SENI_RUPA' : 'TARI'));
      if (rubric) payload.rubricId = rubric.id;
      if (gradeTarget.medium) payload.artworkId = gradeTarget.id; else payload.performanceId = gradeTarget.id;
      await api.post('/arts/grades', payload);
      setGradeTarget(null); setGradeScores({}); setGradeFeedback(''); fetchAll(); alert('Nilai tersimpan!');
    } catch (e: any) { alert(e?.response?.data?.error || 'Gagal'); } finally { setSaving(false); }
  };

  const dimsFor = (work: any) => {
    const branch = work.medium ? 'SENI_RUPA' : (work.category || 'TARI');
    return BRANCH_META[branch]?.dims || BRANCH_META.TARI.dims;
  };

  if (loading) return <div className="max-w-6xl mx-auto p-6"><SkeletonList /></div>;
  if (error) return <div className="max-w-6xl mx-auto p-6"><ErrorState message="Gagal memuat rubrik." onRetry={fetchAll} /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4">
      <BackButton to="/dashboard/study/seni-budaya" label="Kembali ke Seni Budaya" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2"><ClipboardCheck size={28} className="text-violet-600" /> Penilaian Rubrik & Peer Review</h2><p className="text-sm text-gray-600 mt-1">Rubrik multidimensi per cabang seni + papan apresiasi lintas siswa (DAIE).</p></div>
        {isTeacher && <button onClick={() => setShowRubric(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"><Plus size={16} /> Rubrik</button>}
      </div>

      {/* Rubrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rubrics.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">{BRANCH_META[r.branch]?.emoji} {r.title}</h4>
              {isTeacher && <button onClick={async () => { if (confirm('Hapus rubrik?')) { await api.delete(`/arts/rubrics/${r.id}`); fetchAll(); } }} className="text-gray-300 hover:text-red-500"><Trash2 size={15} /></button>}
            </div>
            <div className="text-xs text-violet-600 font-semibold">{BRANCH_META[r.branch]?.label}</div>
            <div className="space-y-1.5">
              {(r.dimensions || []).map((d: any) => <div key={d.key} className="flex justify-between text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5"><span>{d.label}</span><span className="text-gray-400">{d.maxScore} poin</span></div>)}
            </div>
          </div>
        ))}
        {rubrics.length === 0 && <div className="md:col-span-2"><EmptyState title="Belum ada rubrik" description="Buat rubrik otomatis sesuai cabang seni." /></div>}
      </div>

      {/* Peer review board */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Star size={14} /> Papan Apresiasi (Peer Review)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-bold text-gray-500 mb-2">🎨 Karya Seni Rupa</div>
            <div className="space-y-2">
              {artworks.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-2 rounded-xl border border-gray-100">
                  <img src={a.imageFileUrl} alt={a.title} className="w-10 h-10 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-gray-900 truncate">{a.title}</div><div className="text-xs text-gray-400">{a.studentId}</div></div>
                  {a.studentId !== user?.id && !isTeacher && <button onClick={() => startReview(a, false)} className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg hover:bg-amber-100 font-semibold">Apresiasi</button>}
                  {isTeacher && <button onClick={() => { setGradeTarget(a); setGradeScores({}); setGradeFeedback(''); }} className="text-xs bg-violet-50 text-violet-700 px-2.5 py-1 rounded-lg hover:bg-violet-100 font-semibold">Nilai</button>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 mb-2">🎭 Pertunjukan</div>
            <div className="space-y-2">
              {performances.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl border border-gray-100">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">{BRANCH_META[p.category]?.emoji || '🎵'}</div>
                  <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-gray-900 truncate">{p.title}</div><div className="text-xs text-gray-400">{p.studentId}</div></div>
                  {p.studentId !== user?.id && !isTeacher && <button onClick={() => startReview(p, true)} className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg hover:bg-amber-100 font-semibold">Apresiasi</button>}
                  {isTeacher && <button onClick={() => { setGradeTarget(p); setGradeScores({}); setGradeFeedback(''); }} className="text-xs bg-violet-50 text-violet-700 px-2.5 py-1 rounded-lg hover:bg-violet-100 font-semibold">Nilai</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
        {reviews.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1.5"><LayoutList size={12} /> {reviews.length} apresiasi telah masuk</div>
            <div className="space-y-2">
              {reviews.slice(0, 5).map((r) => (
                <div key={r.id} className="p-3 rounded-xl bg-amber-50/60 text-sm text-gray-700"><span className="font-semibold text-gray-900">#{r.reviewerId}</span> — {r.evaluation || r.description || 'Apresiasi'}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent grades */}
      {isTeacher && grades.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Award size={14} /> Nilai Terbaru</h3>
          {grades.slice(0, 5).map((g) => <div key={g.id} className="flex justify-between text-sm text-gray-700 border-b border-gray-50 pb-1.5"><span>#{g.studentId}</span><span className="font-bold text-violet-600">{g.score ?? '-'}</span></div>)}
        </div>
      )}

      {showRubric && (
        <Modal isOpen={showRubric} title="Buat Rubrik" onClose={() => setShowRubric(false)}>
          <div className="space-y-3">
            <input value={rubricForm.title} onChange={(e) => setRubricForm({ ...rubricForm, title: e.target.value })} placeholder="Judul rubrik" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <select value={rubricForm.branch} onChange={(e) => setRubricForm({ ...rubricForm, branch: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl">{Object.entries(BRANCH_META).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}</select>
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              Dimensi otomatis: {BRANCH_META[rubricForm.branch].dims.map((d) => d.label).join(' · ')}
            </div>
            <button onClick={createRubric} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold">{saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Buat</button>
          </div>
        </Modal>
      )}

      {reviewWork && (
        <Modal isOpen={!!reviewWork} title={`Apresiasi: ${reviewWork.title}`} onClose={() => setReviewWork(null)} width="max-w-2xl">
          <div className="space-y-3">
            {DAIE_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-xs font-bold text-gray-500">{f.label} <span className="font-normal text-gray-400">— {f.hint}</span></label>
                <textarea value={daie[f.key] || ''} onChange={(e) => setDaie({ ...daie, [f.key]: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={2} />
              </div>
            ))}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Penilaian dimensi (rubrik)</label>
              <div className="space-y-2">
                {dimsFor(reviewWork).map((d) => (
                  <div key={d.key} className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 flex-1">{d.label}</span>
                    <input type="number" min={0} max={25} value={reviewScores[d.key] || ''} onChange={(e) => setReviewScores({ ...reviewScores, [d.key]: parseInt(e.target.value) || 0 })} className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-lg" />
                    <span className="text-xs text-gray-400">/25</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={submitReview} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-semibold">{saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Kirim Apresiasi</button>
          </div>
        </Modal>
      )}

      {gradeTarget && (
        <Modal isOpen={!!gradeTarget} title={`Nilai: ${gradeTarget.title}`} onClose={() => setGradeTarget(null)} width="max-w-2xl">
          <div className="space-y-3">
            <div className="text-xs text-gray-500">Siswa: #{gradeTarget.studentId}</div>
            <div className="space-y-2">
              {dimsFor(gradeTarget).map((d) => (
                <div key={d.key} className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 flex-1">{d.label}</span>
                  <input type="number" min={0} max={25} value={gradeScores[d.key] || ''} onChange={(e) => setGradeScores({ ...gradeScores, [d.key]: parseInt(e.target.value) || 0 })} className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-lg" />
                  <span className="text-xs text-gray-400">/25</span>
                </div>
              ))}
            </div>
            <textarea value={gradeFeedback} onChange={(e) => setGradeFeedback(e.target.value)} placeholder="Umpan balik guru" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={2} />
            <button onClick={submitGrade} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold">{saving ? <Loader2 size={16} className="animate-spin" /> : <Award size={16} />} Simpan Nilai</button>
          </div>
        </Modal>
      )}
    </div>
  );
};