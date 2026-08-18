import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/axios';
import { Search, RefreshCw, Lock, Unlock, Users, CheckCircle2, PlayCircle, Clock, ShieldAlert } from 'lucide-react';

interface MonitorRow {
  studentId: string;
  fullName: string;
  nis: string;
  state: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'LOCKED';
  attemptId: string | null;
  attemptNumber: number | null;
  status: string | null;
  proctoringStatus: string;
  startedAt: string | null;
  submittedAt: string | null;
  expectedEndTime: string | null;
  lockedAt: string | null;
  tabSwitches: number;
  fullscreenExits: number;
  networkDisconnects: number;
}

interface MonitorData {
  assessmentId: string;
  classId: string | null;
  summary: { total: number; notStarted: number; inProgress: number; submitted: number; locked: number };
  students: MonitorRow[];
}

const stateBadge = (s: string) => {
  const map: Record<string, string> = {
    NOT_STARTED: 'bg-gray-100 text-gray-600',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    SUBMITTED: 'bg-green-100 text-green-700',
    LOCKED: 'bg-red-100 text-red-700',
  };
  const label: Record<string, string> = {
    NOT_STARTED: 'Belum',
    IN_PROGRESS: 'Sedang',
    SUBMITTED: 'Selesai',
    LOCKED: 'Terkunci',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${map[s] || 'bg-gray-100 text-gray-600'}`}>
      {s === 'LOCKED' && <Lock size={11} />}
      {s === 'IN_PROGRESS' && <PlayCircle size={11} />}
      {s === 'SUBMITTED' && <CheckCircle2 size={11} />}
      {s === 'NOT_STARTED' && <Clock size={11} />}
      {label[s] || s}
    </span>
  );
};

export const ExamMonitor = () => {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [monitor, setMonitor] = useState<MonitorData | null>(null);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/assessment/assessments', {
        params: { page: meta.page, limit: meta.limit, search: search || undefined, status: 'RUNNING' },
      });
      setAssessments(res.data.data?.data ?? []);
      setMeta(res.data.data?.meta ?? meta);
    } catch {
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  }, [meta.page, meta.limit, search]);

  useEffect(() => { fetchAssessments(); }, [fetchAssessments]);

  const fetchMonitor = useCallback(async (id: string) => {
    setMonitorLoading(true);
    setSelected(id);
    try {
      const res = await api.get(`/assessment/assessments/${id}/monitor`);
      setMonitor(res.data.data);
    } catch (e: any) {
      showToast(e.response?.data?.detail || 'Gagal memuat monitor ujian', 'error');
    } finally {
      setMonitorLoading(false);
    }
  }, []);

  const unlockAttempt = async (attemptId: string) => {
    try {
      await api.post(`/assessment/attempts/${attemptId}/unlock`);
      showToast('Kunci dibuka. Siswa dapat melanjutkan ujian.');
      if (selected) fetchMonitor(selected);
    } catch (e: any) {
      showToast(e.response?.data?.detail || 'Gagal membuka kunci', 'error');
    }
  };

  const fmtTime = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Monitoring Ujian</h2>
          <p className="text-sm text-gray-500 mt-1">Pantau progres siswa, buka kunci siswa yang terkunci</p>
        </div>
        <button onClick={() => { if (selected) fetchMonitor(selected); }} disabled={!selected}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw size={16} /> Segarkan
        </button>
      </div>

      {/* Assessment selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 mb-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input value={search} onChange={e => { setSearch(e.target.value); setMeta({ ...meta, page: 1 }); }} placeholder="Cari ujian..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {assessments.map((a) => (
            <button key={a.id} onClick={() => fetchMonitor(a.id)}
              className={`text-left rounded-xl border p-4 transition-all ${selected === a.id ? 'border-primary-600 ring-2 ring-primary-100 bg-primary-50/50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
              <div className="text-sm font-semibold text-gray-900 truncate">{a.title}</div>
              <div className="text-xs text-gray-500 mt-1">{a.classId ? `Kelas khusus` : 'Umum'} • {a.attemptCount} percobaan</div>
              <div className="text-[10px] font-bold text-primary-600 uppercase tracking-wider mt-2">Klik untuk monitor</div>
            </button>
          ))}
          {!loading && assessments.length === 0 && (
            <div className="col-span-full text-sm text-gray-400 text-center py-8">Tidak ada ujian berstatus RUNNING.</div>
          )}
        </div>
      </div>

      {/* Monitor detail */}
      {selected && monitor && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-gray-900">Progres Siswa</h3>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full px-2.5 py-1"><Users size={12} /> {monitor.summary.total} siswa</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full px-2.5 py-1"><Clock size={12} /> {monitor.summary.notStarted} belum</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full px-2.5 py-1"><PlayCircle size={12} /> {monitor.summary.inProgress} sedang</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 rounded-full px-2.5 py-1"><CheckCircle2 size={12} /> {monitor.summary.submitted} selesai</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 rounded-full px-2.5 py-1"><Lock size={12} /> {monitor.summary.locked} terkunci</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                  <th className="pb-2 pr-3">Nama</th>
                  <th className="pb-2 pr-3">NIS</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Mulai</th>
                  <th className="pb-2 pr-3">Selesai</th>
                  <th className="pb-2 pr-3">Pelanggaran</th>
                  <th className="pb-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {monitor.students.map((r) => (
                  <tr key={r.studentId} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-2.5 pr-3 font-medium text-gray-900">{r.fullName}</td>
                    <td className="py-2.5 pr-3 text-gray-500">{r.nis}</td>
                    <td className="py-2.5 pr-3">{stateBadge(r.state)}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{fmtTime(r.startedAt)}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{fmtTime(r.submittedAt)}</td>
                    <td className="py-2.5 pr-3">
                      {r.state === 'LOCKED' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                          <ShieldAlert size={12} /> {r.tabSwitches + r.fullscreenExits + r.networkDisconnects} (tab {r.tabSwitches})
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">{r.tabSwitches + r.fullscreenExits + r.networkDisconnects}</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      {r.state === 'LOCKED' && r.attemptId ? (
                        <button onClick={() => unlockAttempt(r.attemptId!)} disabled={monitorLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50">
                          <Unlock size={13} /> Buka Kunci
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {monitor.students.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-sm text-gray-400">
                    Tidak ada siswa terdaftar di kelas ujian ini.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!selected && !loading && (
        <div className="text-center py-16 text-sm text-gray-400">
          Pilih salah satu ujian untuk melihat monitoring siswa.
        </div>
      )}
    </div>
  );
};
