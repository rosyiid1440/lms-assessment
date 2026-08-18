import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { Calendar, CheckCircle2, Circle, Flame, Target, Trophy, Plus, Loader2, Send, Heart, Star } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';
import { Modal } from '../../components/ui/Modal';

const IBADAH_META: Record<string, { label: string; emoji: string; color: string }> = {
  FARDHU: { label: 'Wajib', emoji: '🕌', color: 'bg-emerald-100 text-emerald-700' },
  SUNNAH: { label: 'Sunnah', emoji: '🌙', color: 'bg-indigo-100 text-indigo-700' },
  QURAN: { label: 'Al-Qur\u2019an', emoji: '📖', color: 'bg-amber-100 text-amber-700' },
  SADAQAH: { label: 'Sedekah', emoji: '🤲', color: 'bg-rose-100 text-rose-700' },
  OTHER: { label: 'Lainnya', emoji: '✨', color: 'bg-gray-100 text-gray-700' },
};

const FARDHU_TEMPLATES = ['Sholat Shubuh', 'Sholat Dzuhur', 'Sholat Ashar', 'Sholat Maghrib', 'Sholat Isya'];
const SUNNAH_TEMPLATES = ['Sholat Dhuha', 'Sholat Tahajud', 'Sholat Rawatib', 'Puasa Sunnah', 'Dzikir Pagi', 'Dzikir Petang'];

const todayKey = () => new Date().toISOString().slice(0, 10);

export const IbadahJournal = () => {
  const { user } = useAuthStore();
  const isTeacher = user?.role?.slug === 'teacher' || user?.role?.slug === 'admin';
  const [logs, setLogs] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [date, setDate] = useState(todayKey());
  const [showAdd, setShowAdd] = useState(false);
  const [newLog, setNewLog] = useState({ ibadahType: 'SUNNAH', label: '', done: true, note: '' });
  const [showGoal, setShowGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', type: 'SUNNAH', targetCount: 7 });
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const [l, g] = await Promise.all([api.get('/pai/ibadah/logs'), api.get('/pai/ibadah/goals')]);
      setLogs(l.data || []); setGoals(g.data || []);
    } catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addLog = async () => {
    if (!newLog.label) return alert('Nama ibadah wajib');
    setSaving(true);
    try { await api.post('/pai/ibadah/logs', newLog); setShowAdd(false); setNewLog({ ibadahType: 'SUNNAH', label: '', done: true, note: '' }); fetchAll(); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal menambah'); } finally { setSaving(false); }
  };

  const addGoal = async () => {
    if (!newGoal.title) return alert('Judul target wajib');
    setSaving(true);
    try { await api.post('/pai/ibadah/goals', newGoal); setShowGoal(false); setNewGoal({ title: '', type: 'SUNNAH', targetCount: 7 }); fetchAll(); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal'); } finally { setSaving(false); }
  };

  const stats = useMemo(() => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6); weekAgo.setHours(0, 0, 0, 0);
    const weekLogs = logs.filter((l) => new Date(l.journalDate) >= weekAgo && l.done);
    const streak = (() => {
      let days = 0; const seen = new Set(logs.filter((l) => l.done).map((l) => new Date(l.journalDate).toISOString().slice(0, 10)));
      const d = new Date();
      while (seen.has(d.toISOString().slice(0, 10))) { days++; d.setDate(d.getDate() - 1); }
      return days;
    })();
    return {
      todayDone: logs.filter((l) => new Date(l.journalDate).toISOString().slice(0, 10) === todayKey() && l.done).length,
      weekCount: weekLogs.length,
      streak,
      total: logs.filter((l) => l.done).length,
    };
  }, [logs]);

  const dayLogs = logs.filter((l) => new Date(l.journalDate).toISOString().slice(0, 10) === date);
  const goalProgress = (g: any) => Math.min(100, Math.round((g.achievedCount / g.targetCount) * 100));

  if (loading) return <div className="max-w-5xl mx-auto p-6"><SkeletonList /></div>;
  if (error) return <div className="max-w-5xl mx-auto p-6"><ErrorState message="Gagal memuat jurnal." onRetry={fetchAll} /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 px-4">
      <BackButton to="/dashboard/study/pai" label="Kembali ke PAI" />
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2"><Heart size={28} className="text-rose-500" /> Jurnal Ibadah Harian</h2>
        <p className="text-sm text-gray-600 mt-1">Catat ibadah harianmu, kejar streak & capai target ibadah mingguan.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="text-3xl font-extrabold text-emerald-600">{stats.todayDone}</div>
          <div className="text-xs text-gray-500 mt-1">Ibadah Hari Ini</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="text-3xl font-extrabold text-indigo-600">{stats.weekCount}</div>
          <div className="text-xs text-gray-500 mt-1">Pekan Ini</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="text-3xl font-extrabold text-amber-500 flex items-center justify-center gap-1"><Flame size={22} />{stats.streak}</div>
          <div className="text-xs text-gray-500 mt-1">Streak (hari)</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="text-3xl font-extrabold text-rose-500">{stats.total}</div>
          <div className="text-xs text-gray-500 mt-1">Total Ibadah</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Daily log */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Calendar size={14} /> Catatan Harian</h3>
            <input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} className="px-2 py-1 text-xs border border-gray-200 rounded-lg" />
          </div>
          {!isTeacher && (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-xl text-sm font-semibold w-full justify-center"><Plus size={16} /> Tambah Catatan</button>
          )}
          {dayLogs.length === 0 && <EmptyState title="Belum ada catatan ibadah pada tanggal ini." description="" />}
          <div className="space-y-2">
            {dayLogs.map((l) => {
              const m = IBADAH_META[l.ibadahType] || IBADAH_META.OTHER;
              return (
                <div key={l.id} className={`flex items-center gap-3 p-3 rounded-xl border ${l.done ? 'border-emerald-100 bg-emerald-50/50' : 'border-gray-100'}`}>
                  <span className="text-lg">{m.emoji}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-sm">{l.label}</div>
                    <div className="text-xs text-gray-500">{m.label} · {new Date(l.journalDate).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                    {l.note && <div className="text-xs text-gray-600 mt-0.5 italic">{l.note}</div>}
                  </div>
                  {l.done ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Circle size={20} className="text-gray-300" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Goals */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Target size={14} /> Target Ibadah</h3>
            <button onClick={() => setShowGoal(true)} className="text-rose-600 hover:text-rose-700"><Plus size={18} /></button>
          </div>
          {goals.length === 0 && <EmptyState title="Buat target ibadah mingguanmu (cth: sholat dhuha 7x)." description="" />}
          <div className="space-y-3">
            {goals.map((g) => {
              const pct = goalProgress(g);
              const done = pct >= 100;
              return (
                <div key={g.id} className="p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">{IBADAH_META[g.type]?.emoji} {g.title}</div>
                    {done && <Trophy size={16} className="text-amber-500" />}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{g.achievedCount}/{g.targetCount} · {g.period === 'WEEK' ? 'mingguan' : 'bulanan'} · +{g.rewardPoints} poin</div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                    <div className={`h-2 rounded-full ${done ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {goals.length > 0 && (
            <div className="text-center">
              <button onClick={() => { if (confirm('Kirim laporan ibadah kepada orang tua?')) alert('Laporan ibadah terkirim!'); }} className="inline-flex items-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-semibold"><Send size={14} /> Laporan Orang Tua</button>
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <Modal isOpen={showAdd} title="Tambah Catatan Ibadah" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <select value={newLog.ibadahType} onChange={(e) => setNewLog({ ...newLog, ibadahType: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl">
              {Object.entries(IBADAH_META).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </select>
            <input value={newLog.label} onChange={(e) => setNewLog({ ...newLog, label: e.target.value })} placeholder="Nama ibadah (cth: Sholat Dhuha)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <textarea value={newLog.note} onChange={(e) => setNewLog({ ...newLog, note: e.target.value })} placeholder="Catatan (opsional)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" rows={2} />
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={newLog.done} onChange={(e) => setNewLog({ ...newLog, done: e.target.checked })} /> Selesai dikerjakan</label>
            <button onClick={addLog} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-sm font-semibold">{saving ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} />} Simpan</button>
          </div>
        </Modal>
      )}

      {showGoal && (
        <Modal isOpen={showGoal} title="Target Ibadah Baru" onClose={() => setShowGoal(false)}>
          <div className="space-y-3">
            <input value={newGoal.title} onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })} placeholder="cth: Sholat Dhuha 7x seminggu" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <select value={newGoal.type} onChange={(e) => setNewGoal({ ...newGoal, type: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl">
              {Object.entries(IBADAH_META).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </select>
            <input type="number" value={newGoal.targetCount} onChange={(e) => setNewGoal({ ...newGoal, targetCount: parseInt(e.target.value) || 1 })} placeholder="Jumlah target" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <button onClick={addGoal} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold">{saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Simpan</button>
          </div>
        </Modal>
      )}
    </div>
  );
};
