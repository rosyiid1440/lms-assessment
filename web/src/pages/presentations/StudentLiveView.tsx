import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/axios';
import { init } from 'pptx-preview';
import { Loader2, XCircle, MonitorPlay, Tv } from 'lucide-react';

export const StudentLiveView = () => {
  const { shareCode } = useParams<{ shareCode: string }>();
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewer = useRef<any>(null);
  const [pres, setPres] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const loadedRef = useRef(false);
  const currentSlideRef = useRef<number | null>(null);

  // Load pptx once a presentation is found.
  const ensureLoaded = useCallback(async (p: any) => {
    if (viewer.current || loadedRef.current || !viewerRef.current) return;
    loadedRef.current = true;
    try {
      const resp = await fetch(p.fileUrl);
      if (!resp.ok) throw new Error('File tidak dapat dimuat');
      const buffer = await resp.arrayBuffer();
      viewerRef.current.innerHTML = '';
      const v = init(viewerRef.current, { width: 960, height: 540 });
      const timeout = new Promise<any>((_, rej) => setTimeout(() => rej(new Error('Gagal merender presentasi.')), 30000));
      await Promise.race([v.load(buffer), timeout]);
      viewer.current = v;
      setReady(true);
      const initialIdx = p.currentSlide || 0;
      v.renderSingleSlide(initialIdx);
      currentSlideRef.current = initialIdx;
    } catch (err: any) {
      setError(err.message || 'Gagal memuat presentasi');
    }
  }, []);

  // Poll the live endpoint for the current teacher-controlled slide.
  useEffect(() => {
    if (!shareCode) return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await api.get(`/live/${shareCode}`);
        if (stop) return;
        setPres(res.data);
        setLoading(false);
        setError('');
        await ensureLoaded(res.data);
        const idx = res.data.currentSlide || 0;
        if (viewer.current && idx !== currentSlideRef.current) {
          viewer.current.renderSingleSlide(idx);
          currentSlideRef.current = idx;
        }
      } catch (err: any) {
        if (stop) return;
        const status = err?.response?.status;
        if (status === 410) {
          setError(err?.response?.data?.error || 'Presentasi sudah diakhiri.');
        } else if (status === 404) {
          setError('Presentasi tidak ditemukan.');
        } else {
          // transient error; keep polling
        }
        setLoading(false);
      }
    };
    tick();
    const interval = setInterval(tick, 2000);
    return () => { stop = true; clearInterval(interval); viewer.current?.destroy(); };
  }, [shareCode, ensureLoaded]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-3 text-gray-300">
        <Loader2 className="w-9 h-9 animate-spin text-primary-400" />
        <p className="text-sm">Menghubungkan ke presentasi...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <XCircle className="w-14 h-14 text-red-500" />
        <p className="text-xl font-bold text-white">Presentasi Tidak Tersedia</p>
        <p className="text-sm text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Minimal top bar — viewer only, no controls */}
      <header className="bg-gray-900/80 backdrop-blur px-4 py-3 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-2 text-gray-200 min-w-0">
          <MonitorPlay size={18} className="text-primary-400 flex-shrink-0" />
          <span className="font-bold truncate">{pres?.title || 'Presentasi'}</span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 flex-shrink-0">
          <Tv size={16} /> Live
        </span>
      </header>

      {/* Slide stage (read-only) */}
      <main className="flex-1 flex items-center justify-center p-3 md:p-8 overflow-hidden">
        <div className="relative w-full max-w-6xl bg-black rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9' }}>
          {!ready && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
              <Loader2 className="w-7 h-7 animate-spin" />
              <span className="text-sm">Menunggu slide guru...</span>
            </div>
          )}
          <div ref={viewerRef} className="absolute inset-0" style={{ visibility: ready ? 'visible' : 'hidden' }} />
        </div>
      </main>

      <footer className="px-4 py-2.5 text-center text-xs text-gray-500">
        Presentasi dikendalikan oleh guru. Silakan menonton.
      </footer>
    </div>
  );
};