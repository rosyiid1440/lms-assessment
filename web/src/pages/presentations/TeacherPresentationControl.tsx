import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/axios';
import { init } from 'pptx-preview';
import { BackButton } from '../../components/ui/BackButton';
import { ChevronLeft, ChevronRight, Copy, Check, MonitorPlay, Share2, Radio, Loader2, XCircle } from 'lucide-react';

export const TeacherPresentationControl = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const viewerRef = useRef<HTMLDivElement>(null);
  const [pres, setPres] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [slideCount, setSlideCount] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const viewer = useRef<any>(null);
  const presRef = useRef<any>(null);
  const loadedRef = useRef(false);

  const renderSlide = useCallback((viewer: any, index: number) => {
    try {
      viewer.renderSingleSlide(index);
      setCurrentSlide(index);
    } catch (e) {
      console.error('renderSingleSlide error', e);
    }
  }, []);

  const loadPptx = useCallback(async (p: any, isCancelled: () => boolean) => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    try {
      const resp = await fetch(p.fileUrl);
      if (!resp.ok) throw new Error('File tidak dapat dimuat');
      const buffer = await resp.arrayBuffer();
      
      if (isCancelled() || !viewerRef.current) {
        loadedRef.current = false; // Reset so the next effect can load it
        return;
      }
      
      // Clear any stale wrappers before creating a fresh viewer.
      viewerRef.current.innerHTML = '';
      viewer.current?.destroy?.();
      viewer.current = null;
      
      const v = init(viewerRef.current, { width: 960, height: 540 });
      // Timeout so the spinner never hangs forever on pathological files.
      const timeout = new Promise<any>((_, rej) => setTimeout(() => rej(new Error('Gagal merender presentasi: file terlalu besar atau tidak didukung.')), 30000));
      await Promise.race([v.load(buffer), timeout]);
      
      if (isCancelled()) {
        loadedRef.current = false;
        try { v.destroy(); } catch {}
        return;
      }
      
      const total = v.slideCount || 1;
      viewer.current = v;
      setSlideCount(total);
      try {
        await api.post(`/presentations/${p.id}/slide-count`, { slideCount: total });
      } catch {}
      setReady(true);
      renderSlide(v, p.currentSlide || 0);
    } catch (err: any) {
      if (!isCancelled()) {
        setError(err.message || 'Gagal memuat presentasi');
      }
      loadedRef.current = false;
    }
  }, [renderSlide]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/presentations/${id}`);
        if (cancelled) return;
        setPres(res.data);
        presRef.current = res.data;
        await loadPptx(res.data, () => cancelled);
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.error || 'Presentasi tidak ditemukan');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (viewer.current) {
        try { viewer.current.destroy(); } catch {}
        viewer.current = null;
      }
    };
  }, [id, loadPptx]);

  const [localSliderValue, setLocalSliderValue] = useState<number | null>(null);
  const debounceTimer = useRef<any>(null);

  const sendControl = async (action: 'next' | 'prev' | 'goto', slide?: number) => {
    if (!pres || !ready) return;
    const nextIndex =
      action === 'prev' ? Math.max(0, currentSlide - 1) :
      action === 'goto' ? Math.max(0, Math.min(slide ?? 0, slideCount - 1)) :
      Math.min(currentSlide + 1, slideCount - 1);

    // Debounce the entire render and server call so dragging the slider doesn't spam heavy PPTX renders
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    // Immediate visual update for the slider text without blocking the main thread with rendering
    if (action === 'goto') setLocalSliderValue(nextIndex);

    debounceTimer.current = setTimeout(async () => {
      // Execute the heavy DOM render once dragging stops/pauses
      if (viewer.current) renderSlide(viewer.current, nextIndex);
      setLocalSliderValue(null);

      try {
        const res = await api.post(`/presentations/${pres.id}/control`, { action: action === 'goto' ? 'goto' : action, slide: action === 'goto' ? nextIndex : undefined });
        const serverIndex = res.data.currentSlide;
        if (viewer.current && serverIndex !== nextIndex) renderSlide(viewer.current, serverIndex);
      } catch (err: any) {
        alert(err?.response?.data?.error || 'Gagal mengontrol slide');
      }
    }, 200);
  };

  const handleEnd = async () => {
    if (!pres) return;
    if (!window.confirm('Akhiri presentasi ini? Siswa tidak akan bisa mengakses link lagi.')) return;
    try {
      await api.post(`/presentations/${pres.id}/end`);
      navigate('/dashboard/teacher/presentations');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Gagal mengakhiri presentasi');
    }
  };

  const handleCopy = async () => {
    const link = `${window.location.origin}/live/${pres.shareCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert(link);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <p className="text-sm text-gray-500">Memuat presentasi...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="font-bold text-gray-900 mb-2">Gagal Memuat Presentasi</p>
        <p className="text-sm text-gray-500 mb-6">{error}</p>
        <button onClick={() => navigate('/dashboard/teacher/presentations')} className="px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl">Kembali</button>
      </div>
    );
  }

  const shareLink = pres ? `${window.location.origin}/live/${pres.shareCode}` : '';

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      <BackButton to="/dashboard/teacher/presentations" label="Kembali ke Presentasi" />

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <MonitorPlay className="text-primary-600" size={22} /> {pres?.title || 'Presentasi'}
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">Anda mengendalikan slide. Siswa hanya menonton.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            {copied ? 'Tautan Tersalin!' : 'Salin Link Siswa'}
          </button>
          <button
            onClick={handleEnd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 text-sm font-bold rounded-xl hover:bg-red-100 transition-colors"
          >
            <Radio size={16} /> Akhiri
          </button>
        </div>
      </div>

      {pres && pres.shareCode && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <Share2 size={16} className="text-blue-500 flex-shrink-0" />
          <span className="text-xs md:text-sm text-blue-700 font-medium truncate">{shareLink}</span>
        </div>
      )}

      {/* Slide stage */}
      <div className="bg-gray-900 rounded-2xl p-3 md:p-6 shadow-2xl">
        <div className="relative w-full bg-black rounded-xl overflow-hidden flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
          {!ready && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400 z-10">
              <Loader2 className="w-7 h-7 animate-spin" />
              <span className="text-sm">Merender slide...</span>
            </div>
          )}
          <div ref={viewerRef} className="absolute inset-0 w-full h-full" style={{ visibility: ready ? 'visible' : 'hidden' }} />
        </div>

        {/* Controls */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => sendControl('prev')}
              disabled={!ready || currentSlide <= 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-gray-800 text-sm font-bold rounded-xl hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} /> Sebelumnya
            </button>
            <button
              onClick={() => sendControl('next')}
              disabled={!ready || currentSlide >= slideCount - 1}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Berikutnya <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-300 font-semibold">
              Slide {ready ? (localSliderValue !== null ? localSliderValue + 1 : currentSlide + 1) : '-'} / {slideCount || '-'}
            </span>
            <input
              type="range"
              min={1}
              max={Math.max(1, slideCount)}
              value={ready ? (localSliderValue !== null ? localSliderValue + 1 : currentSlide + 1) : 1}
              onChange={(e) => {
                setLocalSliderValue(parseInt(e.target.value) - 1);
                sendControl('goto', parseInt(e.target.value) - 1);
              }}
              className="w-40 accent-primary-500"
            />
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400">
        Kirim link di atas ke siswa. Mereka akan melihat slide yang Anda tampilkan secara real-time tanpa perlu login.
      </p>
    </div>
  );
};