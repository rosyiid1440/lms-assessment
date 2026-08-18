import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/axios';
import { Search, Plus, BookOpen, FileText, MoreVertical, Pencil, Trash2, Clock, CalendarDays, Layers, Eye, Send, ArrowRight, BookMarked, School, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  REVIEW: 'bg-amber-100 text-amber-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-red-100 text-red-600'
};

export const TeacherModuleList = () => {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const fetchModules = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (searchTerm) params.set('q', searchTerm);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/teaching-modules?${params.toString()}`);
      setModules(res.data.data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchModules();
    const handleClickOutside = () => setMenuOpen(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [fetchModules]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/teaching-modules/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchModules();
    } catch (err) {
      alert('Gagal menghapus modul ajar.');
    } finally {
      setDeleting(false);
    }
  };

  const handleStatus = async (mod: any, status: string) => {
    try {
      await api.post(`/teaching-modules/${mod.id}/status`, { status });
      fetchModules();
    } catch (err) {
      alert('Gagal mengubah status.');
    }
  };

  if (error) return <ErrorState message="Gagal memuat data modul ajar." onRetry={fetchModules} />;

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 pb-12">
      <BackButton to="/dashboard" label="Back to Dashboard" />

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Modul Ajar</h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Susun modul ajar sesuai standar Kurikulum Merdeka untuk kelancaran administrasi pembelajaran
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/teacher/modules/new')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-500/20 active:scale-[0.98] transition-all"
        >
          <Plus size={18} /> Buat Modul Ajar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari judul, mata pelajaran, atau penyusun..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm transition-all bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sm:w-52 px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
        >
          <option value="">Semua Status</option>
          <option value="DRAFT">Draft</option>
          <option value="REVIEW">Review</option>
          <option value="PUBLISHED">Terbit</option>
          <option value="ARCHIVED">Arsip</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <SkeletonList count={3} />
        </div>
      ) : modules.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="Belum ada modul ajar"
          description={searchTerm || statusFilter
            ? "Tidak ada modul ajar yang cocok dengan pencarian atau filter Anda."
            : "Mulai susun modul ajar pertama Anda sesuai komponen Kurikulum Merdeka."}
          action={
            <button
              onClick={() => navigate('/dashboard/teacher/modules/new')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 transition-colors"
            >
              <Plus size={18} /> Buat Modul Ajar
            </button>
          }
          className="py-24"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {modules.map((mod) => (
            <div
              key={mod.id}
              className="group flex flex-col bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden transform hover:-translate-y-1"
            >
              {/* Cover */}
              <div className="h-28 bg-gradient-to-br from-indigo-600 via-blue-700 to-sky-800 p-5 relative cursor-pointer" onClick={() => navigate(`/dashboard/teacher/modules/${mod.id}`)}>
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div className="relative z-10 flex justify-between items-start">
                  <div className="flex items-center gap-2 text-white/90 text-[10px] font-extrabold uppercase tracking-wider">
                    <BookOpen size={14} /> Modul Ajar
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === mod.id ? null : mod.id); }}
                    className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {menuOpen === mod.id && (
                    <div className="absolute right-0 top-8 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 py-1.5 overflow-hidden">
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/teacher/modules/${mod.id}`); }} className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <Eye size={16} /> Lihat Detail
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/teacher/modules/${mod.id}/edit`); }} className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                        <Pencil size={16} /> Edit
                      </button>
                      {mod.status !== 'PUBLISHED' && (
                        <button onClick={(e) => { e.stopPropagation(); handleStatus(mod, 'PUBLISHED'); }} className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2">
                          <Send size={16} /> Terbitkan
                        </button>
                      )}
                      <div className="h-px bg-gray-100 my-1"></div>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(mod); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                        <Trash2 size={16} /> Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="px-5 pt-5 pb-4 flex-1 flex flex-col cursor-pointer" onClick={() => navigate(`/dashboard/teacher/modules/${mod.id}`)}>
                <h3 className="text-lg font-bold text-gray-900 leading-snug line-clamp-2 mb-3">{mod.title}</h3>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-md ${STATUS_STYLES[mod.status] || 'bg-gray-100 text-gray-600'}`}>
                    {mod.status}
                  </span>
                  {mod.mataPelajaran && (
                    <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-primary-50 text-primary-700 rounded-md">
                      {mod.mataPelajaran}
                    </span>
                  )}
                  {mod.kelas && (
                    <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-gray-100 text-gray-600 rounded-md">
                      {mod.kelas}
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-sm text-gray-500 mt-auto">
                  <div className="flex items-center gap-2">
                    <School size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{mod.jenjang || '-'} {mod.jumlahPertemuan ? `· ${mod.jumlahPertemuan} pertemuan` : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays size={14} className="text-gray-400 flex-shrink-0" />
                    <span>{new Date(mod.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 p-3 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <User size={14} className="text-gray-400" />
                  <span className="truncate">{mod.penyusun || mod.authorName || 'Anda'}</span>
                </div>
                <button onClick={() => navigate(`/dashboard/teacher/modules/${mod.id}`)} className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                  Detail <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Modul Ajar?"
        description={`Modul ajar "${deleteTarget?.title}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        isLoading={deleting}
      />
    </div>
  );
};
