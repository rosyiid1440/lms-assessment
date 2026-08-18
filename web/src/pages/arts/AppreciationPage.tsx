import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { Compass, Map, Globe2, Plus, Loader2, MapPin, Landmark, Music4, Palette, Building2, ExternalLink, PlayCircle } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';
import { Modal } from '../../components/ui/Modal';

const CAT_ICON: Record<string, { label: string; icon: any; color: string }> = {
  TARI: { label: 'Tarian', icon: Music4, color: 'bg-pink-100 text-pink-700' },
  ALAT_MUSIK: { label: 'Alat Musik', icon: Music4, color: 'bg-indigo-100 text-indigo-700' },
  BATIK: { label: 'Motif Batik', icon: Palette, color: 'bg-amber-100 text-amber-700' },
  SITUS: { label: 'Situs Budaya', icon: Landmark, color: 'bg-emerald-100 text-emerald-700' },
};

// Simple SVG map with clickable province dots (approximate coordinates)
const REGION_POINTS: { name: string; x: number; y: number }[] = [
  { name: 'Aceh', x: 18, y: 10 },
  { name: 'Sumatera Barat', x: 26, y: 30 },
  { name: 'Sumatera Utara', x: 24, y: 20 },
  { name: 'Riau', x: 33, y: 30 },
  { name: 'Jambi', x: 34, y: 38 },
  { name: 'Sumatera Selatan', x: 36, y: 46 },
  { name: 'Lampung', x: 38, y: 55 },
  { name: 'Bengkulu', x: 31, y: 42 },
  { name: 'DKI Jakarta', x: 45, y: 58 },
  { name: 'Jawa Barat', x: 45, y: 62 },
  { name: 'Jawa Tengah', x: 52, y: 62 },
  { name: 'Jawa Timur', x: 60, y: 62 },
  { name: 'DI Yogyakarta', x: 53, y: 67 },
  { name: 'Bali', x: 67, y: 68 },
  { name: 'NTB', x: 72, y: 70 },
  { name: 'NTT', x: 80, y: 74 },
  { name: 'Kalimantan Barat', x: 42, y: 40 },
  { name: 'Kalimantan Tengah', x: 50, y: 48 },
  { name: 'Kalimantan Selatan', x: 56, y: 55 },
  { name: 'Kalimantan Timur', x: 58, y: 40 },
  { name: 'Sulawesi Selatan', x: 72, y: 52 },
  { name: 'Sulawesi Barat', x: 70, y: 44 },
  { name: 'Sulawesi Tengah', x: 68, y: 38 },
  { name: 'Sulawesi Utara', x: 72, y: 28 },
  { name: 'Maluku', x: 86, y: 48 },
  { name: 'Papua', x: 88, y: 40 },
];

const CULTURAL_SEED = [
  { name: 'Tari Saman', region: 'Aceh', latitude: 4.6951, longitude: 96.7494, category: 'TARI', description: 'Tari tradisional dari Suku Gayo, dikenal dengan gerakan cepat dan kompak.' },
  { name: 'Tari Piring', region: 'Sumatera Barat', latitude: -0.7399, longitude: 100.3026, category: 'TARI', description: 'Tarian memegang piring dengan gerakan dinamis khas Minangkabau.' },
  { name: 'Angklung', region: 'Jawa Barat', latitude: -6.9147, longitude: 107.6098, category: 'ALAT_MUSIK', description: 'Alat musik bambu khas Sunda yang digetarkan untuk menghasilkan nada.' },
  { name: 'Gamelan', region: 'Jawa Tengah', latitude: -7.5506, longitude: 110.8283, category: 'ALAT_MUSIK', description: 'Ensembel musik tradisional Jawa dengan saron, gong, dan kendang.' },
  { name: 'Batik Sidomukti', region: 'Yogyakarta', latitude: -7.8014, longitude: 110.3648, category: 'BATIK', description: 'Motif batik klasik Yogyakarta untuk acara pernikahan.' },
  { name: 'Tari Kecak', region: 'Bali', latitude: -8.5069, longitude: 115.2625, category: 'TARI', description: 'Tari ritual dengan iringan "cak" dari puluhan penari.' },
  { name: 'Batik Mega Mendung', region: 'Jawa Barat', latitude: -6.5654, longitude: 108.3733, category: 'BATIK', description: 'Motif awan khas Cirebon dengan warna lembut.' },
  { name: 'Sasando', region: 'NTT', latitude: -10.1772, longitude: 123.6070, category: 'ALAT_MUSIK', description: 'Alat musik petik berdawai dari Pulau Rote.' },
  { name: 'Tari Pajoge', region: 'Sulawesi Selatan', latitude: -5.1477, longitude: 119.4327, category: 'TARI', description: 'Tarian pergaulan Bugis-Makassar yang energik.' },
  { name: 'Candi Borobudur', region: 'Jawa Tengah', latitude: -7.6079, longitude: 110.2038, category: 'SITUS', description: 'Candi Buddha terbesar di dunia dengan relief seni yang kaya.' },
  { name: 'Tari Andun', region: 'Bengkulu', latitude: -3.7928, longitude: 102.2608, category: 'TARI', description: 'Tari pergaulan khas Bengkulu dengan gerakan luwes.' },
  { name: 'Batik Sasirangan', region: 'Kalimantan Selatan', latitude: -3.3186, longitude: 114.5944, category: 'BATIK', description: 'Kain khas Banjar dengan motif garis-garis.' },
];

export const AppreciationPage = () => {
  const { user } = useAuthStore();
  const isTeacher = user?.role?.slug === 'teacher' || user?.role?.slug === 'admin';
  const [tours, setTours] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<'tours' | 'map'>('tours');
  const [activeTour, setActiveTour] = useState<any>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [showTour, setShowTour] = useState(false);
  const [showSite, setShowSite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tourForm, setTourForm] = useState({ title: '', description: '', embedUrl: '', location: '' });
  const [siteForm, setSiteForm] = useState({ name: '', region: '', latitude: '', longitude: '', category: 'SITUS', description: '', imageUrl: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const [t, s] = await Promise.all([api.get('/arts/tours'), api.get('/arts/sites')]);
      setTours(t.data || []);
      const sitesData = s.data || [];
      setSites(sitesData.length ? sitesData : CULTURAL_SEED);
    } catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const regions = useMemo(() => Array.from(new Set(sites.map((s) => s.region))), [sites]);
  const filtered = selectedRegion ? sites.filter((s) => s.region === selectedRegion) : sites;

  const createTour = async () => {
    if (!tourForm.title || !tourForm.embedUrl) return alert('Judul dan URL wajib');
    setSaving(true);
    try { await api.post('/arts/tours', tourForm); setShowTour(false); setTourForm({ title: '', description: '', embedUrl: '', location: '' }); fetchAll(); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal'); } finally { setSaving(false); }
  };

  const createSite = async () => {
    if (!siteForm.name || !siteForm.region) return alert('Nama dan daerah wajib');
    setSaving(true);
    try { await api.post('/arts/sites', siteForm); setShowSite(false); setSiteForm({ name: '', region: '', latitude: '', longitude: '', category: 'SITUS', description: '', imageUrl: '' }); fetchAll(); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal'); } finally { setSaving(false); }
  };

  if (loading) return <div className="max-w-6xl mx-auto p-6"><SkeletonList /></div>;
  if (error) return <div className="max-w-6xl mx-auto p-6"><ErrorState message="Gagal memuat apresiasi." onRetry={fetchAll} /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4">
      <BackButton to="/dashboard/study/seni-budaya" label="Kembali ke Seni Budaya" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2"><Compass size={28} className="text-emerald-600" /> Apresiasi & Tur Virtual</h2><p className="text-sm text-gray-600 mt-1">Jelajahi museum & situs budaya dunia, dan peta budaya Nusantara.</p></div>
        <div className="flex gap-2">
          {isTeacher && <>
            <button onClick={() => setShowTour(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"><Globe2 size={16} /> Tur</button>
            <button onClick={() => setShowSite(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"><MapPin size={16} /> Titik Budaya</button>
          </>}
        </div>
      </div>

      <div className="flex gap-2 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm w-fit">
        <button onClick={() => setTab('tours')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold ${tab === 'tours' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}><Globe2 size={15} /> Tur Virtual</button>
        <button onClick={() => setTab('map')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold ${tab === 'map' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}><Map size={15} /> Peta Budaya</button>
      </div>

      {tab === 'tours' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tours.length === 0 && <div className="md:col-span-3"><EmptyState title="Belum ada tur virtual" description="Guru dapat menambahkan tur museum & situs budaya." /></div>}
          {tours.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group cursor-pointer" onClick={() => setActiveTour(t)}>
              <div className="aspect-video bg-gray-100 flex items-center justify-center">{t.coverImageUrl ? <img src={t.coverImageUrl} alt={t.title} className="w-full h-full object-cover" /> : <PlayCircle size={40} className="text-emerald-300" />}</div>
              <div className="p-4">
                <div className="font-semibold text-gray-900 text-sm">{t.title}</div>
                {t.location && <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {t.location}</div>}
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description || ''}</p>
                <button className="mt-2 text-emerald-600 text-xs font-semibold flex items-center gap-1"><ExternalLink size={12} /> Mulai tur</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Nusantara map */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Map size={14} /> Peta Budaya Nusantara</h3>
            <div className="flex flex-wrap gap-1.5 mb-4">
              <button onClick={() => setSelectedRegion('')} className={`px-2 py-1 rounded-full text-xs font-semibold ${selectedRegion === '' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-emerald-50'}`}>Semua</button>
              {regions.map((r) => <button key={r} onClick={() => setSelectedRegion(r)} className={`px-2 py-1 rounded-full text-xs font-semibold ${selectedRegion === r ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-emerald-50'}`}>{r}</button>)}
            </div>
            <div className="relative bg-gradient-to-br from-amber-50 to-emerald-50 rounded-2xl overflow-hidden" style={{ minHeight: 380 }}>
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                {/* decorative grid */}
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((v) => <line key={`v${v}`} x1={v} y1={0} x2={v} y2={100} stroke="#e5e7eb" strokeWidth="0.2" />)}
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((v) => <line key={`h${v}`} x1={0} y1={v} x2={100} y2={v} stroke="#e5e7eb" strokeWidth="0.2" />)}
              </svg>
              <div className="absolute inset-0">
                {REGION_POINTS.map((p) => {
                  const hasSite = filtered.some((s) => s.region === p.name);
                  const anySite = sites.some((s) => s.region === p.name);
                  if (!anySite) return null;
                  const active = hasSite && selectedRegion;
                  return (
                    <button key={p.name} onClick={() => setSelectedRegion(active ? '' : p.name)} className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${active ? 'w-6 h-6 bg-emerald-600 ring-4 ring-emerald-200' : 'w-4 h-4 bg-amber-500 ring-2 ring-white hover:bg-emerald-500'} transition-all`} style={{ left: `${p.x}%`, top: `${p.y}%` }} title={p.name} />
                  );
                })}
              </div>
              <div className="absolute bottom-3 right-3 text-[10px] text-gray-400 bg-white/80 rounded-lg px-2 py-1">Peta konseptual — klik titik untuk memilih daerah</div>
            </div>
          </div>
          {/* Site list */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 max-h-[480px] overflow-y-auto">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Landmark size={14} /> {selectedRegion || 'Semua Budaya'}</h3>
            {filtered.length === 0 && <EmptyState title="Tidak ada" description="Pilih daerah lain." />}
            {filtered.map((s) => {
              const meta = CAT_ICON[s.category] || CAT_ICON.SITUS;
              const Icon = meta.icon;
              return (
                <div key={s.id || s.name} className="p-3 rounded-xl border border-gray-100 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.color}`}><Icon size={15} /></span>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{s.name}</div>
                      <div className="text-[10px] text-gray-400">{s.region} · {meta.label}</div>
                    </div>
                  </div>
                  {s.description && <p className="text-xs text-gray-500 leading-relaxed">{s.description}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTour && (
        <Modal isOpen={!!activeTour} title={activeTour.title} onClose={() => setActiveTour(null)} width="max-w-4xl">
          <div className="aspect-video rounded-xl overflow-hidden bg-black">
            <iframe src={activeTour.embedUrl} title={activeTour.title} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
          {activeTour.location && <div className="text-xs text-gray-400 mt-2 flex items-center gap-1"><MapPin size={12} /> {activeTour.location}</div>}
          <p className="text-sm text-gray-600 mt-2">{activeTour.description || 'Jelajahi tur virtual ini.'}</p>
        </Modal>
      )}

      {showTour && (
        <Modal isOpen={showTour} title="Tambahkan Tur Virtual" onClose={() => setShowTour(false)}>
          <div className="space-y-3">
            <input value={tourForm.title} onChange={(e) => setTourForm({ ...tourForm, title: e.target.value })} placeholder="Judul (cth: Tur Candi Borobudur)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <input value={tourForm.embedUrl} onChange={(e) => setTourForm({ ...tourForm, embedUrl: e.target.value })} placeholder="URL embed (Google Arts & Culture, YouTube 360…)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <input value={tourForm.location} onChange={(e) => setTourForm({ ...tourForm, location: e.target.value })} placeholder="Lokasi (cth: Magelang, Jawa Tengah)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <textarea value={tourForm.description} onChange={(e) => setTourForm({ ...tourForm, description: e.target.value })} placeholder="Deskripsi" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={2} />
            <button onClick={createTour} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold">{saving ? <Loader2 size={16} className="animate-spin" /> : <Globe2 size={16} />} Simpan</button>
          </div>
        </Modal>
      )}

      {showSite && (
        <Modal isOpen={showSite} title="Tambah Titik Budaya" onClose={() => setShowSite(false)}>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input value={siteForm.name} onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })} placeholder="Nama (cth: Tari Saman)" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl" />
              <input value={siteForm.region} onChange={(e) => setSiteForm({ ...siteForm, region: e.target.value })} placeholder="Daerah (Aceh)" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            </div>
            <select value={siteForm.category} onChange={(e) => setSiteForm({ ...siteForm, category: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl">{Object.keys(CAT_ICON).map((k) => <option key={k} value={k}>{CAT_ICON[k].label}</option>)}</select>
            <div className="flex gap-2">
              <input value={siteForm.latitude} onChange={(e) => setSiteForm({ ...siteForm, latitude: e.target.value })} placeholder="Latitude" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl" />
              <input value={siteForm.longitude} onChange={(e) => setSiteForm({ ...siteForm, longitude: e.target.value })} placeholder="Longitude" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            </div>
            <textarea value={siteForm.description} onChange={(e) => setSiteForm({ ...siteForm, description: e.target.value })} placeholder="Deskripsi" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={2} />
            <button onClick={createSite} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold"><MapPin size={16} /> Simpan</button>
          </div>
        </Modal>
      )}
    </div>
  );
};