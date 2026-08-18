import React, { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../../lib/axios';
import { Search, Plus, Presentation, FileText, MoreVertical, Trash2, Link2, Copy, Check, CalendarDays, MonitorPlay, ArrowRight, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

export const TeacherPresentationList = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (searchTerm) params.set('q', searchTerm);
      const res = await api.get(`/presentations?${params.toString()}`);
      setItems(res.data.data || []);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchItems();
    const handleClickOutside = () => setMenuOpen(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [fetchItems]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/\.(ppt|pptx)$/i.test(file.name)) {
      alert('Hanya file PowerPoint (.ppt / .pptx) yang diperbolehkan.');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', file.name.replace(/\.(ppt|pptx)$/i, ''));
      const res = await api.post('/presentations', fd);
      const created = res.data;
      setItems((prev) => [created, ...prev]);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Gagal mengunggah presentasi.');
    } finally {
      setUploading(false);
    }
  };

  const handleCopy = async (shareCode: string) => {
    const link = `${window.location.origin}/live/${shareCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(shareCode);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      alert(link);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/presentations/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchItems();
    } catch (err) {
      alert('Gagal menghapus presentasi.');
    } finally {
      setDeleting(false);
    }
  };

  if (error) return <ErrorState message="Gagal memuat data presentasi." onRetry={fetchItems} />;

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 pb-12">
      <BackButton to="/dashboard" label="Back to Dashboard" />

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Live Presentasi</h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Unggah materi PowerPoint lalu bagikan tautan ke siswa. Siswa dapat menonton tanpa login, hanya guru yang mengontrol slide.
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-500/20 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {uploading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Mengunggah...
            </>
          ) : (
            <>
              <Plus size={18} /> Unggah PPT
            </>
          )}
        </button>
        <input ref={fileInputRef} type="file" accept=".ppt,.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation" className="hidden" onChange={handleUpload} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari judul presentasi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm transition-all bg-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <SkeletonList count={3} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={MonitorPlay}
          title="Belum ada presentasi"
          description={searchTerm
            ? "Tidak ada presentasi yang cocok dengan pencarian Anda."
            : "Unggah file PowerPoint untuk mulai membagikan materi secara live kepada siswa."}
          action={
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 transition-colors"
            >
              <Plus size={18} /> Unggah Presentasi
            </button>
          }
          className="py-24"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((p) => (
            <div
              key={p.id}
              className="group flex flex-col bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden transform hover:-translate-y-1"
            >
              <div className="h-28 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 p-5 relative cursor-pointer" onClick={() => navigate(`/dashboard/teacher/presentations/${p.id}/control`)}>
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div className="relative z-10 flex justify-between items-start">
                  <div className="flex items-center gap-2 text-white/90 text-[10px] font-extrabold uppercase tracking-wider">
                    <Presentation size={14} /> Presentasi
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === p.id ? null : p.id); }}
                    className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <MoreVertical size={18} />
                  </button>
                  {menuOpen === p.id && (
                    <div className="absolute right-0 top-8 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 py-1.5 overflow-hidden">
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/teacher/presentations/${p.id}/control`); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <Play size={16} /> Mulai / Kontrol
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleCopy(p.shareCode); }} className="w-full text-left px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-2">
                        {copied === p.shareCode ? <Check size={16} /> : <Copy size={16} />} Salin Tautan Siswa
                      </button>
                      <div className="h-px bg-gray-100 my-1"></div>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                        <Trash2 size={16} /> Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 pt-5 pb-4 flex-1 flex flex-col cursor-pointer" onClick={() => navigate(`/dashboard/teacher/presentations/${p.id}/control`)}>
                <h3 className="text-lg font-bold text-gray-900 leading-snug line-clamp-2 mb-3">{p.title}</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-md ${p.isLive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {p.isLive ? 'Live' : 'Selesai'}
                  </span>
                  {p.slideCount > 0 ? (
                    <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-gray-100 text-gray-600 rounded-md">
                      {p.slideCount} slide
                    </span>
                  ) : null}
                </div>
                <div className="space-y-2 text-sm text-gray-500 mt-auto">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{p.originalName || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays size={14} className="text-gray-400 flex-shrink-0" />
                    <span>{new Date(p.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 p-3 flex justify-between items-center bg-gray-50/50">
                <button onClick={() => handleCopy(p.shareCode)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-600 transition-colors">
                  <Link2 size={14} /> {copied === p.shareCode ? 'Tersalin!' : 'Salin Tautan'}
                </button>
                <button onClick={() => navigate(`/dashboard/teacher/presentations/${p.id}/control`)} className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                  Present <ArrowRight size={14} />
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
        title="Hapus Presentasi?"
        description={`Presentasi "${deleteTarget?.title}" akan dihapus. Link live akan langsung tidak aktif.`}
        confirmText="Hapus"
        isLoading={deleting}
      />
    </div>
  );
};