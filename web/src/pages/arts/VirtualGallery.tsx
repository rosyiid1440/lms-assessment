import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { GalleryHorizontal, Plus, Upload, Trash2, PencilLine, MousePointer2, Type, RotateCcw, ImagePlus, LayoutGrid, Package, BookOpen } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';
import { Modal } from '../../components/ui/Modal';

const MEDIUM_META: Record<string, string> = {
  LUKISAN: 'Lukisan', DESAIN_GRAFIS: 'Desain Grafis', KRIYA: 'Kriya', FOTOGRAFI: 'Fotografi', MAKEUP: 'Tata Rias', OTHER: 'Lainnya',
};

// ---------- Virtual 3D-style gallery room ----------
export const VirtualGalleryRoom = ({ artworks }: { artworks: any[] }) => {
  const [showDetail, setShowDetail] = useState<any>(null);
  const visible = (artworks || []).filter((a) => a.status !== 'DRAFT');
  if (visible.length === 0) return <EmptyState title="Galeri kosong" description="Belum ada karya yang dipamerkan." />;
  return (
    <div className="space-y-4">
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-amber-900 via-stone-800 to-slate-900 p-6 md:p-8" style={{ perspective: '1200px' }}>
        <div className="text-center mb-5">
          <h4 className="text-amber-200 font-bold text-lg">🖼️ Ruang Pameran Virtual</h4>
          <p className="text-white/60 text-xs">Klik dinding untuk "berkeliling" & melihat karya dari dekat</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4" style={{ transformStyle: 'preserve-3d' }}>
          {visible.map((a, i) => (
            <button key={a.id} onClick={() => setShowDetail(a)} className="group text-left rounded-xl bg-white/5 p-2 border border-white/10 hover:border-amber-300/60 transition transform hover:scale-105 hover:-translate-y-1" style={{ transform: i % 2 ? 'rotateY(2deg)' : 'rotateY(-2deg)' }}>
              <div className="aspect-square rounded-lg overflow-hidden bg-black/40 mb-2 flex items-center justify-center">
                {a.imageFileUrl ? <img src={a.imageFileUrl} alt={a.title} className="w-full h-full object-cover" /> : <Package size={36} className="text-white/30" />}
              </div>
              <div className="text-white/90 text-xs font-semibold truncate">{a.title}</div>
              <div className="text-white/50 text-[10px]">{MEDIUM_META[a.medium] || a.medium}</div>
            </button>
          ))}
        </div>
      </div>
      {showDetail && (
        <Modal isOpen={!!showDetail} title={showDetail.title} onClose={() => setShowDetail(null)} width="max-w-3xl">
          <div className="aspect-video rounded-xl overflow-hidden bg-gray-100"><img src={showDetail.imageFileUrl} alt={showDetail.title} className="w-full h-full object-contain" /></div>
          <p className="text-sm text-gray-600 mt-3">{showDetail.description || 'Tanpa deskripsi.'}</p>
          <div className="flex gap-2 mt-3 flex-wrap"><span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full">{MEDIUM_META[showDetail.medium] || showDetail.medium}</span><span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{showDetail.semester || 'Tanpa semester'}</span></div>
        </Modal>
      )}
    </div>
  );
};

// ---------- Annotation editor (teacher draws over artwork) ----------
const VirtualRoom = ({ gallery }: { gallery: any[] }) => <VirtualGalleryRoom artworks={gallery} />;

export const AnnotationEditor = ({ artwork, onSaved }: { artwork: any; onSaved: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [mode, setMode] = useState<'arrow' | 'stroke' | 'text'>('arrow');
  const [color, setColor] = useState('#ef4444');
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState<[number, number] | null>(null);
  const [shapes, setShapes] = useState<any[]>([]);
  const [textState, setTextState] = useState({ modal: false, val: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => { await fetchAnnotations(); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAnnotations = useCallback(async () => {
    try {
      const res = await api.get(`/arts/artworks/${artwork.id}/annotations`);
      const all = (res.data || []).flatMap((a: any) => a.data || []);
      setShapes(all);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artwork.id]);

  const redraw = () => {
    const canvas = canvasRef.current, img = imgRef.current;
    if (!canvas || !img || !img.naturalWidth) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    shapes.forEach((s) => {
      ctx.strokeStyle = s.color || color;
      ctx.fillStyle = s.color || color;
      ctx.lineWidth = 2.5;
      if (s.type === 'arrow' && s.points?.length >= 2) {
        const [[x1, y1], [x2, y2]] = s.points;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        const angle = Math.atan2(y2 - y1, x2 - x1); const len = 10;
        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - len * Math.cos(angle - 0.4), y2 - len * Math.sin(angle - 0.4)); ctx.lineTo(x2 - len * Math.cos(angle + 0.4), y2 - len * Math.sin(angle + 0.4)); ctx.closePath(); ctx.fill();
      } else if (s.type === 'stroke' && s.points?.length >= 2) {
        ctx.beginPath(); ctx.moveTo(s.points[0][0], s.points[0][1]); for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i][0], s.points[i][1]); ctx.stroke();
      } else if (s.type === 'text' && s.x !== undefined && s.y !== undefined) {
        ctx.font = 'bold 15px sans-serif';
        const bw = ctx.measureText(s.text).width; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(s.x - 3, s.y - 14, bw + 6, 20);
        ctx.fillStyle = s.color || color; ctx.fillText(s.text, s.x, s.y + 4);
      }
    });
  };

  useEffect(() => { redraw(); }, [shapes, color]); // eslint-disable-line react-hooks/exhaustive-deps

  const normToCanvas = (e: React.MouseEvent): [number, number] => {
    const rect = ((e.target as HTMLElement).closest('canvas'))!.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };

  const onMouseDown = (e: React.MouseEvent) => { if (mode === 'text') { setStart(normToCanvas(e)); setTextState({ modal: true, val: '' }); return; } setDrawing(true); setStart(normToCanvas(e)); };
  const onMouseMove = (e: React.MouseEvent) => { if (!drawing || !start) return; const p = normToCanvas(e); setShapes([...shapes.slice(0, -1), mode === 'arrow' ? { type: 'arrow', points: [start, p], color } : { type: 'stroke', points: [...(shapes[shapes.length - 1]?.points || [start]), p], color }]); };
  const onMouseUp = () => setDrawing(false);

  const addText = () => {
    if (start && textState.val) { setShapes([...shapes, { type: 'text', x: start[0], y: start[1], text: textState.val, color }]); }
    setTextState((s) => ({ ...s, modal: false }));
  };

  const save = async () => {
    setSaving(true);
    try { await api.post(`/arts/artworks/${artwork.id}/annotations`, { data: shapes }); onSaved(); alert('Anotasi tersimpan!'); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal menyimpan'); } finally { setSaving(false); }
  };

  const setTextModal = (v: boolean) => setTextState((s) => ({ ...s, modal: v }));

  return (
    <div className="space-y-3">
      {!artwork.imageFileUrl && <EmptyState title="Belum ada gambar" description="Siswa belum mengunggah gambar karya." />}
      {artwork.imageFileUrl && (
        <>
          <div className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-xl p-2">
            <button onClick={() => setMode('arrow')} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${mode === 'arrow' ? 'bg-amber-600 text-white' : 'text-gray-600 hover:bg-amber-50'}`}><MousePointer2 size={14} /> Panah</button>
            <button onClick={() => setMode('stroke')} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${mode === 'stroke' ? 'bg-amber-600 text-white' : 'text-gray-600 hover:bg-amber-50'}`}><PencilLine size={14} /> Coret</button>
            <button onClick={() => setMode('text')} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${mode === 'text' ? 'bg-amber-600 text-white' : 'text-gray-600 hover:bg-amber-50'}`}><Type size={14} /> Catatan</button>
            <div className="flex items-center gap-1 ml-1">
              {['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'].map((c) => <button key={c} onClick={() => setColor(c)} className="w-5 h-5 rounded-full border-2" style={{ background: c, borderColor: color === c ? '#111' : 'transparent' }} />)}
            </div>
            <button onClick={() => { setShapes([]); redraw(); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-red-50 hover:text-red-600"><RotateCcw size={14} /> Bersihkan</button>
            <button onClick={save} disabled={saving} className="ml-auto flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">{saving ? 'Menyimpan…' : 'Simpan Anotasi'}</button>
          </div>
          <div className="relative">
            <div className="relative inline-block max-w-full">
              <img ref={imgRef} src={artwork.imageFileUrl} alt={artwork.title} onLoad={redraw} className={`max-w-full rounded-xl ${mode === 'text' ? 'cursor-text' : 'cursor-crosshair'}`} />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full rounded-xl"
                onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} />
            </div>
          </div>
        </>
      )}
      <Modal isOpen={textState.modal} title="Catatan anotasi" onClose={() => setTextState((s) => ({ ...s, modal: false }))}>
        <div className="space-y-3">
          <input value={textState.val} onChange={(e) => setTextState((s) => ({ ...s, val: e.target.value }))} placeholder="Tulis catatan untuk menempel di gambar…" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
          <button onClick={addText} className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl text-sm font-semibold">Tempel Catatan</button>
        </div>
      </Modal>
    </div>
  );
};

export const VirtualGallery = () => {
  const { user } = useAuthStore();
  const isTeacher = user?.role?.slug === 'teacher' || user?.role?.slug === 'admin';
  const [artworks, setArtworks] = useState<any[]>([]);
  const [exhibitions, setExhibitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<'gallery' | 'portfolio' | 'annotate'>('gallery');
  const [annotating, setAnnotating] = useState<any>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showEx, setShowEx] = useState(false);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<any>(null);

  const [form, setForm] = useState({ title: '', description: '', medium: 'LUKISAN', semester: '' });
  const [exForm, setExForm] = useState({ title: '', description: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const [a, e] = await Promise.all([api.get('/arts/artworks'), api.get('/arts/exhibitions')]);
      setArtworks(a.data || []); setExhibitions(e.data || []);
    } catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const upload = async () => {
    if (!form.title) return alert('Judul wajib');
    setSaving(true);
    try {
      const fd = new FormData(); fd.append('title', form.title); fd.append('description', form.description); fd.append('medium', form.medium); fd.append('semester', form.semester);
      if (file) fd.append('image', file);
      await api.post('/arts/artworks', fd);
      setShowUpload(false); setForm({ title: '', description: '', medium: 'LUKISAN', semester: '' }); setFile(null); fetchAll();
    } catch (e: any) { alert(e?.response?.data?.error || 'Gagal'); } finally { setSaving(false); }
  };

  const createEx = async () => {
    if (!exForm.title) return alert('Judul wajib');
    setSaving(true);
    try { const ids = artworks.map((a) => a.id); await api.post('/arts/exhibitions', { ...exForm, artworkIds: ids }); setShowEx(false); await fetchAll(); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal'); } finally { setSaving(false); }
  };

  const deleteArt = async (id: string) => { if (!confirm('Hapus karya?')) return; try { await api.delete(`/arts/artworks/${id}`); fetchAll(); } catch { alert('Gagal'); } };

  if (loading) return <div className="max-w-6xl mx-auto p-6"><SkeletonList /></div>;
  if (error) return <div className="max-w-6xl mx-auto p-6"><ErrorState message="Gagal memuat galeri." onRetry={fetchAll} /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4">
      <BackButton to="/dashboard/study/seni-budaya" label="Kembali ke Seni Budaya" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2"><GalleryHorizontal size={28} className="text-rose-600" /> Galeri Virtual & E-Portfolio</h2><p className="text-sm text-gray-600 mt-1">Pamerkan karya seni rupa, beri anotasi visual, dan susun portofolio berkelanjutan.</p></div>
        {!isTeacher && <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"><Upload size={16} /> Unggah Karya</button>}
        {isTeacher && <button onClick={() => setShowEx(true)} className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"><Plus size={16} /> Buat Pam.</button>}
      </div>

      <div className="flex gap-2 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm w-fit flex-wrap">
        <button onClick={() => setTab('gallery')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold ${tab === 'gallery' ? 'bg-rose-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}><LayoutGrid size={15} /> Galeri Virtual</button>
        <button onClick={() => setTab('portfolio')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold ${tab === 'portfolio' ? 'bg-rose-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}><BookOpen size={15} /> E-Portfolio</button>
        {isTeacher && <button onClick={() => setTab('annotate')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold ${tab === 'annotate' ? 'bg-rose-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}><PencilLine size={15} /> Anotasi</button>}
      </div>

      {tab === 'gallery' && (
        <div className="space-y-4">
          {exhibitions.length === 0 && artworks.length === 0 && <EmptyState title="Belum ada galeri" description="Unggah karya atau buat pameran untuk memulai." />}
          {exhibitions.map((ex) => <div key={ex.id}><h3 className="font-semibold text-gray-900 mb-2">{ex.title}</h3><p className="text-xs text-gray-400 mb-3">{ex.description || ''}</p><VirtualRoom gallery={artworks.filter((a) => (ex.artworkIds || []).includes(a.id))} /></div>)}
          {exhibitions.length === 0 && <VirtualRoom gallery={artworks} />}
        </div>
      )}

      {tab === 'portfolio' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><BookOpen size={14} /> E-Portfolio Karyaku</h3>
          {artworks.length === 0 && <EmptyState title="Belum ada karya" description="Unggah karya pertamamu untuk memulai portofolio." />}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {artworks.map((a) => (
              <div key={a.id} className="rounded-xl border border-gray-100 overflow-hidden group">
                <div className="aspect-square bg-gray-50 overflow-hidden"><img src={a.imageFileUrl} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition" /></div>
                <div className="p-3">
                  <div className="text-sm font-semibold text-gray-900 flex justify-between items-start gap-1">{a.title}<span className={`text-[10px] px-1.5 py-0.5 rounded-full ${a.status === 'APPROVED' ? 'bg-green-100 text-green-700' : a.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{a.status}</span></div>
                  <div className="text-xs text-gray-500 mt-0.5">{MEDIUM_META[a.medium] || a.medium} · {a.semester || '-'}</div>
                  <div className="flex gap-2 mt-2">
                    {isTeacher && <button onClick={() => { setAnnotating(a); setTab('annotate'); }} className="flex-1 text-center bg-violet-50 text-violet-700 text-xs py-1 rounded-lg hover:bg-violet-100">Anotasi</button>}
                    <button onClick={() => deleteArt(a.id)} className="flex-1 text-center bg-red-50 text-red-600 text-xs py-1 rounded-lg hover:bg-red-100">Hapus</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'annotate' && (
        <div>
          {isTeacher && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Pilih karya untuk dianotasi</label>
              <select value={annotating?.id || ''} onChange={(e) => setAnnotating(artworks.find((a) => a.id === e.target.value))} className="w-full md:w-72 px-3 py-2 text-sm border border-gray-200 rounded-xl">
                <option value="">Pilih karya…</option>
                {artworks.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </div>
          )}
          {annotating ? <AnnotationEditor key={annotating.id} artwork={annotating} onSaved={fetchAll} /> : isTeacher ? <EmptyState title="Pilih karya" description="Pilih karya di atas untuk mulai menganotasi." /> : <EmptyState title="Tidak ada" description="Hanya guru yang dapat memberikan anotasi." />}
        </div>
      )}

      {showUpload && (
        <Modal isOpen={showUpload} title="Unggah Karya" onClose={() => setShowUpload(false)}>
          <div className="space-y-3">
            <div className="flex items-center gap-2 border border-dashed border-gray-300 rounded-xl p-4 cursor-pointer">
              <label className="flex items-center gap-2 text-sm text-gray-600"><ImagePlus size={18} className="text-rose-600" /> {file ? file.name : 'Pilih gambar karya'} <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0])} /></label>
            </div>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Judul karya" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <select value={form.medium} onChange={(e) => setForm({ ...form, medium: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl">{Object.entries(MEDIUM_META).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <input value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} placeholder="Semester (cth: Genap 2026)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi / pesan karya" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={2} />
            <button onClick={upload} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-sm font-semibold">{saving ? 'Mengunggah…' : <Upload size={16} />} Unggah</button>
          </div>
        </Modal>
      )}

      {showEx && (
        <Modal isOpen={showEx} title="Buat Pameran" onClose={() => setShowEx(false)}>
          <div className="space-y-3">
            <input value={exForm.title} onChange={(e) => setExForm({ ...exForm, title: e.target.value })} placeholder="Judul pameran" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <textarea value={exForm.description} onChange={(e) => setExForm({ ...exForm, description: e.target.value })} placeholder="Deskripsi" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={2} />
            <p className="text-xs text-gray-400">Akan menampilkan semua karya yang tersedia ({artworks.length}).</p>
            <button onClick={createEx} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-sm font-semibold"><Plus size={16} /> Buat</button>
          </div>
        </Modal>
      )}
    </div>
  );
};