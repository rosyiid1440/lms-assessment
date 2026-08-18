import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { Library, Landmark, ScrollText, Plus, Search, Loader2, Clock, MapPin, User2, BookOpenText, BookOpen } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';
import { Modal } from '../../components/ui/Modal';

type Tab = 'timeline' | 'dalil' | 'simulation';

export const IslamicMedia = () => {
  const { user } = useAuthStore();
  const isTeacher = user?.role?.slug === 'teacher' || user?.role?.slug === 'admin';
  const [tab, setTab] = useState<Tab>('timeline');
  const [events, setEvents] = useState<any[]>([]);
  const [dalils, setDalils] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState<'timeline' | 'dalil'>('timeline');
  const [saving, setSaving] = useState(false);
  const [sim, setSim] = useState(1);

  const [timelineForm, setTimelineForm] = useState({ title: '', year: 570, periodLabel: '', description: '', figure: '', location: '' });
  const [dalilForm, setDalilForm] = useState({ source: '', arabic: '', latin: '', translation: '', tafsir: '', theme: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const [e, d] = await Promise.all([api.get('/pai/timeline'), api.get('/pai/dalil')]);
      setEvents(e.data || []); setDalils(d.data || []);
    } catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addTimeline = async () => {
    if (!timelineForm.title || !timelineForm.year) return alert('Judul dan tahun wajib');
    setSaving(true);
    try { await api.post('/pai/timeline', timelineForm); setShowAdd(false); setTimelineForm({ title: '', year: 570, periodLabel: '', description: '', figure: '', location: '' }); fetchAll(); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal menambah'); } finally { setSaving(false); }
  };
  const addDalil = async () => {
    if (!dalilForm.source || !dalilForm.arabic || !dalilForm.translation) return alert('Sumber, arab, dan terjemah wajib');
    setSaving(true);
    try { await api.post('/pai/dalil', dalilForm); setShowAdd(false); setDalilForm({ source: '', arabic: '', latin: '', translation: '', tafsir: '', theme: '' }); fetchAll(); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal menambah'); } finally { setSaving(false); }
  };

  const filteredDalils = useMemo(() => {
    if (!q.trim()) return dalils;
    const t = q.toLowerCase();
    return dalils.filter((d) => (d.theme || '').toLowerCase().includes(t) || (d.source || '').toLowerCase().includes(t) || (d.translation || '').toLowerCase().includes(t) || (d.arabic || '').toLowerCase().includes(t));
  }, [dalils, q]);

  const themes = useMemo(() => Array.from(new Set(dalils.map((d) => d.theme).filter(Boolean))), [dalils]);

  if (loading) return <div className="max-w-7xl mx-auto p-6"><SkeletonList /></div>;
  if (error) return <div className="max-w-7xl mx-auto p-6"><ErrorState message="Gagal memuat pustaka." onRetry={fetchAll} /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 px-4">
      <BackButton to="/dashboard/study/pai" label="Kembali ke PAI" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2"><Library size={28} className="text-amber-600" /> Pustaka Media Interaktif</h2>
          <p className="text-sm text-gray-600 mt-1">Timeline Sejarah Islam, database dalil & tafsir, dan simulasi ibadah.</p>
        </div>
        {isTeacher && (
          <button onClick={() => { setAdding(tab === 'timeline' ? 'timeline' : 'dalil'); setShowAdd(true); }} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"><Plus size={16} /> Tambah {tab === 'timeline' ? 'Peristiwa' : 'Dalil'}</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm w-fit">
        <button onClick={() => setTab('timeline')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold ${tab === 'timeline' ? 'bg-amber-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}><Landmark size={15} /> Timeline SKI</button>
        <button onClick={() => setTab('dalil')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold ${tab === 'dalil' ? 'bg-amber-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}><BookOpenText size={15} /> Database Dalil</button>
        <button onClick={() => setTab('simulation')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold ${tab === 'simulation' ? 'bg-amber-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}><BookOpen size={15} /> Simulasi Ibadah</button>
      </div>

      {tab === 'timeline' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {events.length === 0 && <EmptyState title="Belum ada peristiwa sejarah." description="" />}
          <div className="relative border-l-2 border-amber-200 ml-3 space-y-6">
            {events.map((ev) => (
              <div key={ev.id} className="relative pl-6">
                <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-amber-500 ring-4 ring-amber-100" />
                <div className="text-xs font-bold text-amber-600 flex items-center gap-1.5"><Clock size={12} /> {ev.year} · {ev.periodLabel}</div>
                <h4 className="font-semibold text-gray-900 text-sm mt-0.5">{ev.title}</h4>
                {ev.figure && <div className="text-xs text-gray-600 flex items-center gap-1 mt-1"><User2 size={12} className="text-gray-400" /> {ev.figure}{ev.location ? ` · ${ev.location}` : ''}</div>}
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{ev.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'dalil' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari dalil, tema, atau terjemah…" className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl" />
          </div>
          {themes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {themes.map((t) => <button key={t} onClick={() => setQ(t)} className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100">{t}</button>)}
            </div>
          )}
          {filteredDalils.length === 0 && <EmptyState title="Tidak ada dalil yang cocok." description="" />}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDalils.map((d) => (
              <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{d.source}</span>
                  {d.theme && <span className="text-xs text-gray-400">{d.theme}</span>}
                </div>
                <p dir="rtl" className="text-lg font-semibold text-gray-900 text-right leading-relaxed">{d.arabic}</p>
                {d.latin && <p className="text-sm italic text-gray-500">{d.latin}</p>}
                <p className="text-sm text-gray-700 leading-relaxed">“{d.translation}”</p>
                {d.tafsir && <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">{d.tafsir}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'simulation' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5"><BookOpenText size={14} /> Simulasi Panduan Ibadah</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-5">
            {[
              { n: 1, l: 'Sholat Dhuha', e: '🌅' },
              { n: 2, l: 'Sholat Tahajud', e: '🌙' },
              { n: 3, l: 'Zakat Fitrah', e: '💛' },
              { n: 4, l: 'Puasa Sunnah', e: '📿' },
            ].map((s) => (
              <button key={s.n} onClick={() => setSim(s.n)} className={`p-3 rounded-xl border text-sm font-semibold text-center ${sim === s.n ? 'bg-amber-600 text-white border-amber-600' : 'border-gray-200 text-gray-600 hover:bg-amber-50'}`}>{s.e} {s.l}</button>
            ))}
          </div>
          <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-2">
            {sim === 1 && <>
              <h4 className="font-bold text-gray-900">Simulasi: Sholat Dhuha (2–12 rakaat)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {['Niat', 'Takbiratul ihram', 'Al-Fatihah', 'Surat pendek', 'Rukuk', 'Sujud', 'Duduk', 'Salam', 'Doa'].map((s, i) => <div key={s} className="bg-white rounded-lg px-3 py-2 flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">{i + 1}</span>{s}</div>)}
              </div>
              <p className="text-xs text-amber-700">Waktu terbaik: setelah matahari naik ± seukuran tombak (± 15–20 menit setelah syuruq).</p>
            </>}
            {sim === 2 && <>
              <h4 className="font-bold text-gray-900">Simp: Sholat Tahajud (2 rakaat+, paruh malam)</h4>
              <p className="text-sm text-gray-600">Ibadah sunnah paling dianjurkan setelah tidur. Minimal 2 rakaat, dikerjakan pada sepertiga malam terakhir.</p>
            </>}
            {sim === 3 && <>
              <h4 className="font-bold text-gray-900">Simp: Zakat Fitrah</h4>
              <p className="text-sm text-gray-600">Wajib dikeluarkan menjelang Idul Fitri. Ukuran: 1 sha (± 2,5–3 kg beras/pokok makanan). Diterimakan kepada 8 golongan asnaf.</p>
            </>}
            {sim === 4 && <>
              <h4 className="font-bold text-gray-900">Simp: Puasa Sunnah</h4>
              <p className="text-sm text-gray-600">Contoh: Puasa Senin Kamis, Ayyamul Bidh. Berniat sebelum terbit fajar, menahan lapar & haus hingga maghrib.</p>
            </>}
          </div>
        </div>
      )}

      {showAdd && (
        <Modal isOpen={showAdd} title={adding === 'timeline' ? 'Tambah Peristiwa Sejarah' : 'Tambah Dalil'} onClose={() => setShowAdd(false)}>
          {adding === 'timeline' ? (
            <div className="space-y-3">
              <input value={timelineForm.title} onChange={(e) => setTimelineForm({ ...timelineForm, title: e.target.value })} placeholder="Judul peristiwa" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
              <div className="flex gap-2">
                <input type="number" value={timelineForm.year} onChange={(e) => setTimelineForm({ ...timelineForm, year: parseInt(e.target.value) || 0 })} placeholder="Tahun" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl" />
                <input value={timelineForm.periodLabel} onChange={(e) => setTimelineForm({ ...timelineForm, periodLabel: e.target.value })} placeholder="Periode" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl" />
              </div>
              <input value={timelineForm.figure} onChange={(e) => setTimelineForm({ ...timelineForm, figure: e.target.value })} placeholder="Tokoh" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
              <input value={timelineForm.location} onChange={(e) => setTimelineForm({ ...timelineForm, location: e.target.value })} placeholder="Lokasi" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
              <textarea value={timelineForm.description} onChange={(e) => setTimelineForm({ ...timelineForm, description: e.target.value })} placeholder="Deskripsi" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={3} />
              <button onClick={addTimeline} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl text-sm font-semibold">{saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Simpan</button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input value={dalilForm.source} onChange={(e) => setDalilForm({ ...dalilForm, source: e.target.value })} placeholder="Sumber (QS… / HR…)" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl" />
                <input value={dalilForm.theme} onChange={(e) => setDalilForm({ ...dalilForm, theme: e.target.value })} placeholder="Tema" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl" />
              </div>
              <textarea dir="rtl" value={dalilForm.arabic} onChange={(e) => setDalilForm({ ...dalilForm, arabic: e.target.value })} placeholder="Teks Arab" className="w-full text-right px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={2} />
              <input value={dalilForm.latin} onChange={(e) => setDalilForm({ ...dalilForm, latin: e.target.value })} placeholder="Latin (opsional)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
              <textarea value={dalilForm.translation} onChange={(e) => setDalilForm({ ...dalilForm, translation: e.target.value })} placeholder="Terjemahan" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={2} />
              <textarea value={dalilForm.tafsir} onChange={(e) => setDalilForm({ ...dalilForm, tafsir: e.target.value })} placeholder="Tafsir (opsional)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={2} />
              <button onClick={addDalil} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl text-sm font-semibold">{saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Simpan</button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};