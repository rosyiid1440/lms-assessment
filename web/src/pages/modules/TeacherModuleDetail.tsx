import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/axios';
import { ArrowLeft, Printer, Pencil, Loader2, User, FileText, ListChecks, Paperclip, School, CalendarDays, Clock, Users, Target, Layers, BookOpen, Trash2, Send, BookMarked, Sparkles, X, AlertCircle } from 'lucide-react';
import { ErrorState } from '../../components/ui/ErrorState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  REVIEW: 'bg-amber-100 text-amber-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-red-100 text-red-600'
};

const MetaItem = ({ icon: Icon, label, value }: any) => (
  value ? (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon size={16} className="text-gray-400 flex-shrink-0" />
      <span className="text-gray-500">{label}:</span>
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
  ) : null
);

const Block = ({ label, value }: { label: string; value?: string | null }) => (
  value ? (
    <div>
      <h4 className="text-sm font-bold text-gray-900 mb-1.5">{label}</h4>
      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  ) : null
);

const PrintSection = ({ icon: Icon, title, children }: any) => (
  <section className="print-block">
    <div className="flex items-center gap-2 mb-4">
      <Icon size={18} className="text-primary-600" />
      <h3 className="text-base md:text-lg font-extrabold text-gray-900">{title}</h3>
    </div>
    <div className="space-y-5">{children}</div>
  </section>
);

export const TeacherModuleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mod, setMod] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/ai/status').then((r) => setAiEnabled(r.data.enabled)).catch(() => setAiEnabled(false));
  }, []);

  useEffect(() => {
    fetchModule();
  }, [id]);

  const fetchModule = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get(`/teaching-modules/${id}`);
      setMod(res.data);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/teaching-modules/${id}`);
      navigate('/dashboard/teacher/modules');
    } catch (e) {
      alert('Gagal menghapus modul ajar.');
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const handlePublish = async () => {
    try {
      await api.post(`/teaching-modules/${id}/status`, { status: 'PUBLISHED' });
      fetchModule();
    } catch (e) {
      alert('Gagal menerbitkan modul ajar.');
    }
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatBusy) return;
    setChatInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setChatBusy(true);
    setAiError(null);
    try {
      const res = await api.post('/ai/chat', {
        moduleContext: {
          title: mod.title, mataPelajaran: mod.mataPelajaran, jenjang: mod.jenjang, kelas: mod.kelas,
          kompetensiAwal: mod.kompetensiAwal, tujuanPembelajaran: mod.tujuanPembelajaran,
          kegiatanPembelajaran: mod.kegiatanPembelajaran, asesmen: mod.asesmen,
          modelPembelajaran: mod.modelPembelajaran
        },
        message: text
      });
      setMessages((m) => [...m, { role: 'ai', text: res.data.text }]);
    } catch (e: any) {
      setAiError(e?.response?.data?.error || 'AI tidak dapat merespons. Coba lagi.');
    } finally {
      setChatBusy(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-primary-600" size={28} /></div>;
  if (error) return <ErrorState message="Gagal memuat modul ajar." onRetry={fetchModule} />;
  if (!mod) return null;

  const ppp = Array.isArray(mod.profilPelajarPancasila) ? mod.profilPelajarPancasila : [];
  const kegiatan = Array.isArray(mod.kegiatanPembelajaran) ? mod.kegiatanPembelajaran : [];
  const asesmen = mod.asesmen || {};

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* Toolbar */}
      <div className="print-hide">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => navigate('/dashboard/teacher/modules')} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> Kembali ke Daftar
          </button>
          <div className="flex items-center gap-2">
            {mod.status !== 'PUBLISHED' && (
              <button onClick={handlePublish} className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-sm transition-all">
                <Send size={15} /> Terbitkan
              </button>
            )}
            <button onClick={() => navigate(`/dashboard/teacher/modules/${mod.id}/edit`)} className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl shadow-sm transition-all">
              <Pencil size={15} /> Edit
            </button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm transition-all">
              <Printer size={15} /> Cetak
            </button>
            <button onClick={() => setDeleteOpen(true)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Hapus">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Document (print area) */}
      <div className="print-area bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Cover */}
        <div className="relative px-6 md:px-10 pt-8 md:pt-10 pb-8 border-b-4 border-primary-600 bg-gradient-to-b from-gray-50/80 to-white">
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-md ${STATUS_STYLES[mod.status] || 'bg-gray-100 text-gray-600'}`}>
              {mod.status}
            </span>
            {mod.mataPelajaran && <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-primary-50 text-primary-700 rounded-md">{mod.mataPelajaran}</span>}
            {mod.kelas && <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-gray-100 text-gray-600 rounded-md">{mod.kelas}</span>}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight mb-2">{mod.title}</h1>
          <p className="text-sm text-gray-500 font-medium mb-6">Modul Ajar — Kurikulum Merdeka</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
            <MetaItem icon={User} label="Penyusun" value={mod.penyusun} />
            <MetaItem icon={School} label="Institusi" value={mod.institusi} />
            <MetaItem icon={CalendarDays} label="Tahun" value={mod.tahunPenyusunan} />
            <MetaItem icon={Layers} label="Jenjang" value={mod.jenjang} />
            <MetaItem icon={BookOpen} label="Mata Pelajaran" value={mod.mataPelajaran} />
            <MetaItem icon={Target} label="Kelas / Fase" value={mod.kelas} />
            <MetaItem icon={Clock} label="Alokasi Waktu" value={mod.alokasiWaktu} />
            <MetaItem icon={Users} label="Pertemuan" value={mod.jumlahPertemuan ? `${mod.jumlahPertemuan} kali` : undefined} />
          </div>
        </div>

        <div className="px-6 md:px-10 py-8 space-y-10">
          {/* B. Kompetensi & Informasi Umum */}
          <PrintSection icon={FileText} title="B. Kompetensi & Informasi Umum">
            <Block label="Kompetensi Awal" value={mod.kompetensiAwal} />
            {ppp.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2">Profil Pelajar Pancasila</h4>
                <ul className="space-y-2">
                  {ppp.map((p: any, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                      <span><span className="font-semibold text-gray-800">{p.dimensi}</span>{p.indikator ? ` — ${p.indikator}` : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Block label="Sarana dan Prasarana" value={mod.saranaPrasarana} />
            <Block label="Target Peserta Didik" value={mod.targetPesertaDidik} />
            <Block label="Model Pembelajaran" value={mod.modelPembelajaran} />
          </PrintSection>

          {/* C. Komponen Inti */}
          <PrintSection icon={ListChecks} title="C. Komponen Inti">
            <Block label="Tujuan Pembelajaran" value={mod.tujuanPembelajaran} />
            <Block label="Pemahaman Bermakna" value={mod.pemahamanBermakna} />
            <Block label="Pertanyaan Pemantik" value={mod.pertanyaanPemantik} />

            {kegiatan.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-3">Kegiatan Pembelajaran</h4>
                <div className="space-y-4">
                  {kegiatan.map((k: any, i: number) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-4">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-primary-600 mb-3">Pertemuan {k.pertemuan}</div>
                      <div className="space-y-3">
                        <Block label="Pendahuluan" value={k.pendahuluan} />
                        <Block label="Inti" value={k.inti} />
                        <Block label="Penutup" value={k.penutup} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(asesmen.diagnostik || asesmen.formatif || asesmen.sumatif) && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-3">Asesmen</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4"><Block label="Diagnostik" value={asesmen.diagnostik} /></div>
                  <div className="bg-gray-50 rounded-xl p-4"><Block label="Formatif" value={asesmen.formatif} /></div>
                  <div className="bg-gray-50 rounded-xl p-4"><Block label="Sumatif" value={asesmen.sumatif} /></div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Block label="Pengayaan & Remedial" value={mod.pengayaanRemedial} />
              <Block label="Refleksi Guru" value={mod.refleksiGuru} />
            </div>
            <Block label="Refleksi Peserta Didik" value={mod.refleksiPesertaDidik} />
          </PrintSection>

          {/* D. Lampiran */}
          <PrintSection icon={Paperclip} title="D. Lampiran">
            <Block label="Lembar Kerja Peserta Didik (LKPD)" value={mod.lkpd} />
            <Block label="Bahan Bacaan Guru & Peserta Didik" value={mod.bahanBacaan} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Block label="Glosarium" value={mod.glosarium} />
              <Block label="Daftar Pustaka" value={mod.daftarPustaka} />
            </div>
          </PrintSection>
        </div>

        {/* Footer */}
        <div className="px-6 md:px-10 py-5 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            Dibuat oleh <span className="font-semibold text-gray-700">{mod.penyusun || mod.authorName || '—'}</span>
            {mod.authorEmail ? ` (${mod.authorEmail})` : ''}
          </div>
          <div className="text-xs text-gray-400">
            Terakhir diperbarui: {new Date(mod.updatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Modul Ajar?"
        description={`Modul ajar "${mod.title}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        isLoading={deleting}
      />

      {/* AI Copilot floating chat */}
      {aiEnabled === true && (
        <>
          {!copilotOpen && (
            <button
              onClick={() => setCopilotOpen(true)}
              className="print-hide fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 px-5 py-3.5 bg-gradient-to-br from-violet-600 to-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:-translate-y-0.5 transition-all"
            >
              <Sparkles size={18} /> Tanya AI Copilot
            </button>
          )}

          {copilotOpen && (
            <div className="print-hide fixed bottom-24 right-4 sm:right-6 z-40 w-[calc(100vw-2rem)] max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[70vh] animate-in slide-in-from-bottom-6 fade-in duration-200">
              <div className="px-4 py-3 bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles size={18} />
                  <div>
                    <div className="font-extrabold text-sm leading-tight">AI Copilot</div>
                    <div className="text-[10px] text-indigo-200">Perbaiki bagian modul ajar</div>
                  </div>
                </div>
                <button onClick={() => setCopilotOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={16} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/60 min-h-[200px]">
                {messages.length === 0 && (
                  <div className="text-xs text-gray-400 text-center py-6 leading-relaxed">
                    Contoh: "Buat kegiatan inti lebih interaktif",
                    <br />"Tambahkan permainan edukatif di bagian pendahuluan",
                    <br />"Buat soal HOTS untuk asesmen sumatif"
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-3.5 py-2.5 text-sm rounded-2xl whitespace-pre-wrap ${
                      m.role === 'user' ? 'bg-primary-600 text-white rounded-br-md' : 'bg-white border border-gray-200 text-gray-700 rounded-bl-md shadow-sm'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {chatBusy && (
                  <div className="flex justify-start">
                    <div className="px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-2xl text-gray-500 flex items-center gap-2">
                      <Loader2 className="animate-spin" size={14} /> AI sedang berpikir...
                    </div>
                  </div>
                )}
                {aiError && (
                  <div className="flex items-start gap-2 text-xs bg-red-50 border border-red-200 text-red-600 rounded-xl px-3 py-2.5">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {aiError}
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-gray-100 bg-white">
                <div className="flex items-end gap-2">
                  <textarea
                    rows={2}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                    placeholder="Tulis permintaan perbaikan..."
                    className="flex-1 px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  />
                  <button onClick={sendChat} disabled={chatBusy || !chatInput.trim()} className="p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 flex-shrink-0">
                    {chatBusy ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .print-hide { display: none !important; }
          .print-area { border: none !important; box-shadow: none !important; border-radius: 0 !important; }
          .print-block { break-inside: avoid; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
};