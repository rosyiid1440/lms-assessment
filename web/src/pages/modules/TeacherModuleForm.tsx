import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/axios';
import { ArrowLeft, Loader2, Save, Send, Plus, Trash2, FileText, User, BookOpen, ListChecks, Paperclip, Sparkles, Wand2, CheckSquare, AlertCircle, X } from 'lucide-react';

interface PPPItem { dimensi: string; indikator: string; }
interface KegiatanItem { pertemuan: string; pendahuluan: string; inti: string; penutup: string; }

const EMPTY = {
  title: '', penyusun: '', institusi: '', tahunPenyusunan: '', jenjang: '', kelas: '',
  mataPelajaran: '', alokasiWaktu: '', jumlahPertemuan: '',
  kompetensiAwal: '', saranaPrasarana: '', targetPesertaDidik: '', modelPembelajaran: '',
  tujuanPembelajaran: '', pemahamanBermakna: '', pertanyaanPemantik: '',
  pengayaanRemedial: '', refleksiGuru: '', refleksiPesertaDidik: '',
  lkpd: '', bahanBacaan: '', glosarium: '', daftarPustaka: '',
  diagnostik: '', formatif: '', sumatif: ''
};

const DIMENSI_PROFIL = [
  'Beriman, Bertakwa kepada Tuhan YME',
  'Berkebinekaan Global',
  'Bergotong Royong',
  'Mandiri',
  'Bernalar Kritis',
  'Kreatif'
];

const Section = ({ icon: Icon, title, subtitle, children }: any) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-5 md:px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="px-5 md:px-7 py-6">{children}</div>
  </div>
);

const Field = ({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-semibold text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-gray-400">{hint}</p>}
  </div>
);

const inputCls = "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white shadow-sm transition-all placeholder:text-gray-400";

export const TeacherModuleForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({ ...EMPTY });
  const [ppp, setPpp] = useState<PPPItem[]>([{ dimensi: '', indikator: '' }]);
  const [kegiatan, setKegiatan] = useState<KegiatanItem[]>([{ pertemuan: '1', pendahuluan: '', inti: '', penutup: '' }]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadModule = useCallback(async () => {
    try {
      const res = await api.get(`/teaching-modules/${id}`);
      const m = res.data;
      setForm({
        ...EMPTY,
        title: m.title || '', penyusun: m.penyusun || '', tahunPenyusunan: m.tahunPenyusunan || '',
        jenjang: m.jenjang || '', kelas: m.kelas || '', mataPelajaran: m.mataPelajaran || '',
        alokasiWaktu: m.alokasiWaktu || '', jumlahPertemuan: m.jumlahPertemuan || '',
        kompetensiAwal: m.kompetensiAwal || '', saranaPrasarana: m.saranaPrasarana || '',
        targetPesertaDidik: m.targetPesertaDidik || '', modelPembelajaran: m.modelPembelajaran || '',
        tujuanPembelajaran: m.tujuanPembelajaran || '', pemahamanBermakna: m.pemahamanBermakna || '',
        pertanyaanPemantik: m.pertanyaanPemantik || '', pengayaanRemedial: m.pengayaanRemedial || '',
        refleksiGuru: m.refleksiGuru || '', refleksiPesertaDidik: m.refleksiPesertaDidik || '',
        lkpd: m.lkpd || '', bahanBacaan: m.bahanBacaan || '', glosarium: m.glosarium || '',
        daftarPustaka: m.daftarPustaka || '',
        diagnostik: m.asesmen?.diagnostik || '', formatif: m.asesmen?.formatif || '', sumatif: m.asesmen?.sumatif || ''
      });
      if (Array.isArray(m.profilPelajarPancasila) && m.profilPelajarPancasila.length) setPpp(m.profilPelajarPancasila);
      if (Array.isArray(m.kegiatanPembelajaran) && m.kegiatanPembelajaran.length) setKegiatan(m.kegiatanPembelajaran);
    } catch (e) {
      setError('Gagal memuat modul ajar.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEdit) loadModule();
  }, [isEdit, loadModule]);

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [aiBusy, setAiBusy] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [tpAtpResult, setTpAtpResult] = useState<any>(null);

  const checkAi = useCallback(async () => {
    try {
      const res = await api.get('/ai/status');
      setAiEnabled(res.data.enabled);
    } catch (e) {
      setAiEnabled(false);
    }
  }, []);

  useEffect(() => {
    checkAi();
  }, [checkAi]);

  // ---- AI Handlers ----
  const fillFromModule = (d: any) => {
    setForm((f) => ({
      ...f,
      kompetensiAwal: d.kompetensiAwal ?? f.kompetensiAwal,
      saranaPrasarana: d.saranaPrasarana ?? f.saranaPrasarana,
      targetPesertaDidik: d.targetPesertaDidik ?? f.targetPesertaDidik,
      modelPembelajaran: d.modelPembelajaran ?? f.modelPembelajaran,
      tujuanPembelajaran: d.tujuanPembelajaran ?? f.tujuanPembelajaran,
      pemahamanBermakna: d.pemahamanBermakna ?? f.pemahamanBermakna,
      pertanyaanPemantik: d.pertanyaanPemantik ?? f.pertanyaanPemantik,
      pengayaanRemedial: d.pengayaanRemedial ?? f.pengayaanRemedial,
      refleksiGuru: d.refleksiGuru ?? f.refleksiGuru,
      refleksiPesertaDidik: d.refleksiPesertaDidik ?? f.refleksiPesertaDidik,
      lkpd: d.lkpd ?? f.lkpd,
      bahanBacaan: d.bahanBacaan ?? f.bahanBacaan,
      glosarium: d.glosarium ?? f.glosarium,
      daftarPustaka: d.daftarPustaka ?? f.daftarPustaka,
      diagnostik: d.asesmen?.diagnostik ?? f.diagnostik,
      formatif: d.asesmen?.formatif ?? f.formatif,
      sumatif: d.asesmen?.sumatif ?? f.sumatif,
    }));
    if (Array.isArray(d.profilPelajarPancasila) && d.profilPelajarPancasila.length) {
      setPpp(d.profilPelajarPancasila);
    }
    if (Array.isArray(d.kegiatanPembelajaran) && d.kegiatanPembelajaran.length) {
      setKegiatan(d.kegiatanPembelajaran.map((k: any, i: number) => ({
        pertemuan: String(k.pertemuan || i + 1),
        pendahuluan: k.pendahuluan || '',
        inti: k.inti || '',
        penutup: k.penutup || ''
      })));
    }
  };

  const generateModule = async () => {
    if (!form.mataPelajaran.trim() || !form.kelas.trim() || !form.title.trim()) {
      setAiError('Isi dulu judul, mata pelajaran, dan kelas/fase agar AI dapat menyusun modul.');
      return;
    }
    setAiBusy('module');
    setAiError(null);
    try {
      const res = await api.post('/ai/module/generate', {
        mataPelajaran: form.mataPelajaran,
        jenjang: form.jenjang,
        kelas: form.kelas,
        tema: form.title,
        jumlahPertemuan: form.jumlahPertemuan || 2,
      });
      fillFromModule(res.data);
      setAiPanelOpen(false);
    } catch (e: any) {
      setAiError(e?.response?.data?.error || 'AI gagal menyusun modul. Coba lagi.');
    } finally {
      setAiBusy('');
    }
  };

  const generateTpAtp = async () => {
    setAiBusy('tp');
    setAiError(null);
    setTpAtpResult(null);
    try {
      const res = await api.post('/ai/tp-atp', {
        mataPelajaran: form.mataPelajaran,
        jenjang: form.jenjang,
        kelas: form.kelas,
        elemen: form.title,
        capaianPembelajaran: form.kompetensiAwal || form.title,
      });
      setTpAtpResult(res.data);
      if (res.data.tujuanPembelajaran) set('tujuanPembelajaran', res.data.tujuanPembelajaran);
    } catch (e: any) {
      setAiError(e?.response?.data?.error || 'AI gagal menyusun TP/ATP. Coba lagi.');
    } finally {
      setAiBusy('');
    }
  };

  const generateAssessment = async () => {
    if (!form.title.trim()) { setAiError('Isi judul/tema modul terlebih dahulu.'); return; }
    setAiBusy('assessment');
    setAiError(null);
    try {
      const res = await api.post('/ai/assessment', {
        mataPelajaran: form.mataPelajaran,
        jenjang: form.jenjang,
        kelas: form.kelas,
        tema: form.title,
      });
      set('diagnostik', res.data.diagnostik ?? form.diagnostik);
      set('formatif', res.data.formatif ?? form.formatif);
      set('sumatif', res.data.sumatif ?? form.sumatif);
    } catch (e: any) {
      setAiError(e?.response?.data?.error || 'AI gagal membuat asesmen. Coba lagi.');
    } finally {
      setAiBusy('');
    }
  };

  const save = async (status: string) => {
    if (!form.title.trim()) { setError('Judul modul ajar wajib diisi.'); return; }
    setSaving(status);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        penyusun: form.penyusun, institusi: form.institusi,
        tahunPenyusunan: form.tahunPenyusunan, jenjang: form.jenjang, kelas: form.kelas,
        mataPelajaran: form.mataPelajaran, alokasiWaktu: form.alokasiWaktu,
        jumlahPertemuan: form.jumlahPertemuan || null,
        kompetensiAwal: form.kompetensiAwal, saranaPrasarana: form.saranaPrasarana,
        targetPesertaDidik: form.targetPesertaDidik, modelPembelajaran: form.modelPembelajaran,
        tujuanPembelajaran: form.tujuanPembelajaran, pemahamanBermakna: form.pemahamanBermakna,
        pertanyaanPemantik: form.pertanyaanPemantik, pengayaanRemedial: form.pengayaanRemedial,
        refleksiGuru: form.refleksiGuru, refleksiPesertaDidik: form.refleksiPesertaDidik,
        lkpd: form.lkpd, bahanBacaan: form.bahanBacaan, glosarium: form.glosarium,
        daftarPustaka: form.daftarPustaka,
        profilPelajarPancasila: ppp.filter((p) => p.dimensi || p.indikator),
        kegiatanPembelajaran: kegiatan.filter((k) => k.pendahuluan || k.inti || k.penutup),
        asesmen: {
          diagnostik: form.diagnostik, formatif: form.formatif, sumatif: form.sumatif
        },
        status
      };
      if (isEdit) {
        await api.put(`/teaching-modules/${id}`, payload);
      } else {
        await api.post('/teaching-modules', payload);
      }
      navigate('/dashboard/teacher/modules');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Gagal menyimpan modul ajar.');
    } finally {
      setSaving('');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-primary-600" size={28} /></div>;
  }

  const saveBtn = (label: string, status: string, primary = false) => (
    <button
      type="button"
      onClick={() => save(status)}
      disabled={!!saving}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all disabled:opacity-50 active:scale-[0.98] ${
        primary
          ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/20'
          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
      }`}
    >
      {saving === status ? <Loader2 size={16} className="animate-spin" /> : status === 'DRAFT' ? <Save size={16} /> : <Send size={16} />}
      {label}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <div className="flex flex-col gap-4">
        <button onClick={() => navigate('/dashboard/teacher/modules')} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors self-start">
          <ArrowLeft size={16} /> Kembali ke Daftar
        </button>
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            {isEdit ? 'Edit Modul Ajar' : 'Buat Modul Ajar Baru'}
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Sesuaikan komponen dengan Panduan Pembelajaran & Asesmen Kurikulum Merdeka
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {aiEnabled === true && (
        <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 rounded-2xl shadow-lg shadow-indigo-500/20 text-white overflow-hidden">
          <div className="px-5 md:px-7 py-4">
            <button type="button" onClick={() => setAiPanelOpen((o) => !o)} className="w-full flex items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold tracking-tight flex items-center gap-2">Asisten AI Modul Ajar <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Gemini</span></h3>
                  <p className="text-sm text-indigo-100 mt-0.5">Susun modul lengkap, TP/ATP, dan asesmen secara otomatis</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-white/15 px-3 py-1.5 rounded-xl">{aiPanelOpen ? 'Tutup' : 'Buka Panel'}</span>
            </button>

            {aiPanelOpen && (
              <div className="mt-5 pt-5 border-t border-white/15 space-y-5">
                {aiError && (
                  <div className="flex items-start gap-2 text-sm bg-red-500/20 border border-red-300/40 rounded-xl px-4 py-3">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{aiError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button type="button" onClick={generateModule} disabled={!!aiBusy} className="p-4 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-colors text-left disabled:opacity-50">
                    <Wand2 size={20} className="mb-2 text-violet-200" />
                    <div className="font-bold text-sm">Generator Modul Lengkap</div>
                    <div className="text-xs text-indigo-100 mt-1">Semua komponen: kompetensi, PPP, kegiatan, asesmen, LKPD</div>
                    {aiBusy === 'module' && <div className="flex items-center gap-2 mt-2 text-xs font-semibold"><Loader2 className="animate-spin" size={14} /> Menyusun modul...</div>}
                  </button>
                  <button type="button" onClick={generateTpAtp} disabled={!!aiBusy} className="p-4 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-colors text-left disabled:opacity-50">
                    <CheckSquare size={20} className="mb-2 text-emerald-200" />
                    <div className="font-bold text-sm">Generator TP / ATP</div>
                    <div className="text-xs text-indigo-100 mt-1">Urai CP menjadi Tujuan Pembelajaran & alur urutannya</div>
                    {aiBusy === 'tp' && <div className="flex items-center gap-2 mt-2 text-xs font-semibold"><Loader2 className="animate-spin" size={14} /> Menyusun TP/ATP...</div>}
                  </button>
                  <button type="button" onClick={generateAssessment} disabled={!!aiBusy} className="p-4 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-colors text-left disabled:opacity-50">
                    <FileText size={20} className="mb-2 text-sky-200" />
                    <div className="font-bold text-sm">Generator Asesmen</div>
                    <div className="text-xs text-indigo-100 mt-1">Diagnostik, formatif, dan sumatif (LOTS & HOTS)</div>
                    {aiBusy === 'assessment' && <div className="flex items-center gap-2 mt-2 text-xs font-semibold"><Loader2 className="animate-spin" size={14} /> Membuat asesmen...</div>}
                  </button>
                </div>

                {tpAtpResult && (
                  <div className="bg-white/10 border border-white/20 rounded-xl p-4 text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-sm">Hasil TP/ATP</div>
                      <button type="button" onClick={() => setTpAtpResult(null)} className="text-indigo-200 hover:text-white"><X size={16} /></button>
                    </div>
                    <p className="text-xs text-indigo-100 whitespace-pre-wrap max-h-60 overflow-y-auto">{tpAtpResult.atp || tpAtpResult.tujuanPembelajaran || 'Hasil sudah diterapkan ke kolom Tujuan Pembelajaran.'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {aiEnabled === false && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>Fitur AI belum aktif. Tambahkan <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">GEMINI_API_KEY</code> di <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">server/.env</code> lalu restart backend untuk mengaktifkan generator otomatis.</span>
        </div>
      )}

      {/* A. Identitas / Informasi Umum */}
      <Section icon={User} title="A. Identitas Modul" subtitle="Informasi umum tentang modul ajar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <Field label="Judul Modul Ajar" required>
              <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="cth. Elemen Perubahan Iklim dan Dampaknya" />
            </Field>
          </div>
          <Field label="Nama Penyusun"><input className={inputCls} value={form.penyusun} onChange={(e) => set('penyusun', e.target.value)} placeholder="Nama guru" /></Field>
          <Field label="Institusi"><input className={inputCls} value={form.institusi} onChange={(e) => set('institusi', e.target.value)} placeholder="Nama sekolah" /></Field>
          <Field label="Tahun Penyusunan"><input className={inputCls} value={form.tahunPenyusunan} onChange={(e) => set('tahunPenyusunan', e.target.value)} placeholder="2024" /></Field>
          <Field label="Jenjang"><input className={inputCls} value={form.jenjang} onChange={(e) => set('jenjang', e.target.value)} placeholder="SMA" /></Field>
          <Field label="Mata Pelajaran"><input className={inputCls} value={form.mataPelajaran} onChange={(e) => set('mataPelajaran', e.target.value)} placeholder="cth. Kimia / Fisika" /></Field>
          <Field label="Kelas / Fase"><input className={inputCls} value={form.kelas} onChange={(e) => set('kelas', e.target.value)} placeholder="cth. X / Fase E" /></Field>
          <Field label="Alokasi Waktu"><input className={inputCls} value={form.alokasiWaktu} onChange={(e) => set('alokasiWaktu', e.target.value)} placeholder="cth. 2 x 45 menit" /></Field>
          <Field label="Jumlah Pertemuan"><input type="number" min="1" className={inputCls} value={form.jumlahPertemuan} onChange={(e) => set('jumlahPertemuan', e.target.value)} placeholder="cth. 3" /></Field>
        </div>
      </Section>

      {/* Kompetensi Awal + Informasi Umum */}
      <Section icon={FileText} title="B. Kompetensi & Informasi Umum" subtitle="Kompetensi awal, profil pelajar Pancasila, sarana, target, dan model">
        <div className="space-y-4">
          <Field label="Kompetensi Awal" hint="Pengetahuan/keterampilan yang sudah dimiliki peserta didik sebelum belajar">
            <textarea rows={3} className={inputCls} value={form.kompetensiAwal} onChange={(e) => set('kompetensiAwal', e.target.value)} />
          </Field>

          <Field label="Profil Pelajar Pancasila" hint="Dimensi yang dikembangkan dalam modul ajar ini">
            {ppp.map((p, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_auto] gap-2 mb-2">
                <select className={inputCls} value={p.dimensi} onChange={(e) => { const n = [...ppp]; n[i].dimensi = e.target.value; setPpp(n); }}>
                  <option value="">Pilih Dimensi</option>
                  {DIMENSI_PROFIL.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <input className={inputCls} value={p.indikator} onChange={(e) => { const n = [...ppp]; n[i].indikator = e.target.value; setPpp(n); }} placeholder="Indikator / deskripsi pencapaian" />
                <button type="button" onClick={() => setPpp(ppp.filter((_, x) => x !== i))} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl flex-shrink-0"><Trash2 size={16} /></button>
              </div>
            ))}
            <button type="button" onClick={() => setPpp([...ppp, { dimensi: '', indikator: '' }])} className="mt-1 text-sm font-bold text-primary-600 hover:text-primary-700">+ Tambah Dimensi</button>
          </Field>

          <Field label="Sarana dan Prasarana"><textarea rows={2} className={inputCls} value={form.saranaPrasarana} onChange={(e) => set('saranaPrasarana', e.target.value)} placeholder="cth. LCD, buku paket, internet" /></Field>
          <Field label="Target Peserta Didik"><textarea rows={2} className={inputCls} value={form.targetPesertaDidik} onChange={(e) => set('targetPesertaDidik', e.target.value)} placeholder="Jumlah dan karakteristik peserta didik (reguler, kesulitan belajar, cerdas istimewa)" /></Field>
          <Field label="Model Pembelajaran"><textarea rows={2} className={inputCls} value={form.modelPembelajaran} onChange={(e) => set('modelPembelajaran', e.target.value)} placeholder="cth. Project Based Learning, Discovery Learning, Problem Based Learning" /></Field>
        </div>
      </Section>

      {/* Komponen Inti */}
      <Section icon={ListChecks} title="C. Komponen Inti" subtitle="Tujuan, pemahaman bermakna, pemantik, kegiatan, asesmen, pengayaan, refleksi">
        <div className="space-y-4">
          <Field label="Tujuan Pembelajaran"><textarea rows={3} className={inputCls} value={form.tujuanPembelajaran} onChange={(e) => set('tujuanPembelajaran', e.target.value)} placeholder="Capaian perilaku yang ingin dicapai, gunakan kata kerja operasional (KKO)" /></Field>
          <Field label="Pemahaman Bermakna"><textarea rows={2} className={inputCls} value={form.pemahamanBermakna} onChange={(e) => set('pemahamanBermakna', e.target.value)} /></Field>
          <Field label="Pertanyaan Pemantik"><textarea rows={2} className={inputCls} value={form.pertanyaanPemantik} onChange={(e) => set('pertanyaanPemantik', e.target.value)} placeholder="cth. Mengapa fenomena ini terjadi di lingkungan sekitar?" /></Field>

          {/* Kegiatan Pembelajaran */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Kegiatan Pembelajaran <span className="text-red-500">*</span></label>
            <div className="space-y-3">
              {kegiatan.map((k, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400">Pertemuan</span>
                      <input className={`${inputCls} w-20`} value={k.pertemuan} onChange={(e) => { const n = [...kegiatan]; n[i].pertemuan = e.target.value; setKegiatan(n); }} />
                    </div>
                    <button type="button" onClick={() => setKegiatan(kegiatan.filter((_, x) => x !== i))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Pendahuluan</label>
                    <textarea rows={2} className={inputCls} value={k.pendahuluan} onChange={(e) => { const n = [...kegiatan]; n[i].pendahuluan = e.target.value; setKegiatan(n); }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Inti</label>
                    <textarea rows={3} className={inputCls} value={k.inti} onChange={(e) => { const n = [...kegiatan]; n[i].inti = e.target.value; setKegiatan(n); }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Penutup</label>
                    <textarea rows={2} className={inputCls} value={k.penutup} onChange={(e) => { const n = [...kegiatan]; n[i].penutup = e.target.value; setKegiatan(n); }} />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setKegiatan([...kegiatan, { pertemuan: String(kegiatan.length + 1), pendahuluan: '', inti: '', penutup: '' }])} className="mt-2 text-sm font-bold text-primary-600 hover:text-primary-700">+ Tambah Pertemuan</button>
          </div>

          {/* Asesmen */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Asesmen</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Diagnostik Awal"><textarea rows={3} className={inputCls} value={form.diagnostik} onChange={(e) => set('diagnostik', e.target.value)} /></Field>
              <Field label="Formatif"><textarea rows={3} className={inputCls} value={form.formatif} onChange={(e) => set('formatif', e.target.value)} /></Field>
              <Field label="Sumatif"><textarea rows={3} className={inputCls} value={form.sumatif} onChange={(e) => set('sumatif', e.target.value)} /></Field>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Pengayaan & Remedial"><textarea rows={2} className={inputCls} value={form.pengayaanRemedial} onChange={(e) => set('pengayaanRemedial', e.target.value)} /></Field>
            <Field label="Refleksi Guru"><textarea rows={2} className={inputCls} value={form.refleksiGuru} onChange={(e) => set('refleksiGuru', e.target.value)} /></Field>
          </div>
          <Field label="Refleksi Peserta Didik"><textarea rows={2} className={inputCls} value={form.refleksiPesertaDidik} onChange={(e) => set('refleksiPesertaDidik', e.target.value)} /></Field>
        </div>
      </Section>

      {/* Lampiran */}
      <Section icon={Paperclip} title="D. Lampiran" subtitle="LKPD, bahan bacaan, glosarium, dan daftar pustaka">
        <div className="space-y-4">
          <Field label="Lembar Kerja Peserta Didik (LKPD)"><textarea rows={3} className={inputCls} value={form.lkpd} onChange={(e) => set('lkpd', e.target.value)} /></Field>
          <Field label="Bahan Bacaan Guru & Peserta Didik"><textarea rows={3} className={inputCls} value={form.bahanBacaan} onChange={(e) => set('bahanBacaan', e.target.value)} /></Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Glosarium"><textarea rows={3} className={inputCls} value={form.glosarium} onChange={(e) => set('glosarium', e.target.value)} /></Field>
            <Field label="Daftar Pustaka"><textarea rows={3} className={inputCls} value={form.daftarPustaka} onChange={(e) => set('daftarPustaka', e.target.value)} /></Field>
          </div>
        </div>
      </Section>

      {/* Sticky Footer Actions */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-gray-200 px-4 md:px-8 py-3 z-30">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
          {!isEdit && saveBtn('Simpan Draft', 'DRAFT')}
          {isEdit && saveBtn('Simpan Perubahan', 'DRAFT')}
          {isEdit && saveBtn('Terbitkan', 'PUBLISHED', true)}
          {!isEdit && saveBtn('Simpan & Terbitkan', 'PUBLISHED', true)}
        </div>
      </div>
    </div>
  );
};