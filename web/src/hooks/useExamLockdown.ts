import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/axios';

export type ViolationType = 'tab' | 'app' | 'split' | 'fullscreen' | 'network';

export interface LockdownOptions {
  attemptId: string | undefined;
  maxViolations?: number;
  warnViolations?: number;
  awaySecondsLimit?: number;
  heartbeatIntervalMs?: number;
  onLocked?: () => void;
}

interface LockState {
  locked: boolean;
  permanentlyLocked: boolean;
  lockMessage: string | null;
  violations: number;
  fullscreen: boolean;
  offline: boolean;
  awaySeconds: number;
}

const enterFullscreen = () => {
  const el = document.documentElement as any;
  const req = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el) ?? el.msRequestFullscreen?.bind(el);
  if (req) req().catch(() => {});
};

const isFullscreen = () => !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;

/**
 * ExamBro-style kiosk lockdown.
 * Locks the whole screen the instant the student leaves the exam (blur,
 * tab/app switch, notification shade, Android split-screen, fullscreen exit),
 * and only unlocks via an explicit "resume" action. Reports every violation to
 * the proctoring endpoint, tracks cumulative time-away, sends heartbeats, and
 * PERMANENTLY LOCKS the attempt (server-side, admin-unlock-only) after repeated
 * violations — it never auto-submits.
 */
export const useExamLockdown = (options: LockdownOptions) => {
  const { attemptId, maxViolations = 3, awaySecondsLimit = 60, heartbeatIntervalMs = 20000, onLocked } = options;

  const [state, setState] = useState<LockState>({
    locked: false,
    permanentlyLocked: false,
    lockMessage: null,
    violations: 0,
    fullscreen: false,
    offline: !navigator.onLine,
    awaySeconds: 0,
  });

  const stateRef = useRef(state);
  stateRef.current = state;
  const attemptIdRef = useRef(attemptId);
  attemptIdRef.current = attemptId;
  const onLockedRef = useRef(onLocked);
  onLockedRef.current = onLocked;

  const hiddenSinceRef = useRef<number | null>(null);
  const lastViolationSentAtRef = useRef(0);

  const report = useCallback((type: ViolationType) => {
    const aid = attemptIdRef.current;
    if (!aid) return;
    const payload: Record<string, number> = {};
    if (type === 'tab' || type === 'app' || type === 'split') payload.tabSwitches = 1;
    if (type === 'fullscreen') payload.fullscreenExits = 1;
    if (type === 'network') payload.networkDisconnects = 1;
    api.post(`/assessment/attempts/${aid}/proctoring`, payload).catch(() => {});
  }, []);

  const setLocked = useCallback((message: string, type: ViolationType) => {
    setState((prev) => {
      const violations = prev.violations + 1;
      // Throttle reporting to 2s to avoid spamming on blur storms
      if (Date.now() - lastViolationSentAtRef.current > 2000) {
        lastViolationSentAtRef.current = Date.now();
        report(type);
      }
      return { ...prev, locked: true, lockMessage: message, violations };
    });
  }, [report]);

  // Escalate: report every violation, and when the threshold is crossed,
  // permanently lock the attempt server-side (NO auto-submit). Only the school
  // admin can unlock it.
  useEffect(() => {
    if (state.permanentlyLocked) return;
    if (state.violations >= maxViolations) {
      setState((prev) => ({ ...prev, locked: true, permanentlyLocked: true }));
      const aid = attemptIdRef.current;
      if (aid) {
        api.post(`/assessment/attempts/${aid}/lock`).catch(() => {});
      }
      onLockedRef.current?.();
    }
  }, [state.violations, state.permanentlyLocked, maxViolations]);

  // Away-time accumulation (permanent lock if student stays away too long)
  useEffect(() => {
    if (state.locked) return;
    const interval = setInterval(() => {
      if (document.hidden || document.visibilityState === 'hidden' || !document.hasFocus()) {
        hiddenSinceRef.current = hiddenSinceRef.current ?? Date.now();
        const away = Math.round((Date.now() - hiddenSinceRef.current) / 1000);
        setState((prev) => {
          const total = prev.awaySeconds + 1;
          return { ...prev, awaySeconds: total };
        });
        if (away >= awaySecondsLimit) {
          setState((prev) => ({ ...prev, locked: true, permanentlyLocked: true }));
          const aid = attemptIdRef.current;
          if (aid) {
            api.post(`/assessment/attempts/${aid}/lock`).catch(() => {});
          }
          onLockedRef.current?.();
        }
      } else {
        hiddenSinceRef.current = null;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [state.locked, awaySecondsLimit]);

  const resume = useCallback(() => {
    if (stateRef.current.permanentlyLocked) return;
    setState((prev) => ({ ...prev, locked: false, lockMessage: null }));
    enterFullscreen();
  }, []);

  // ---- Lockdown event listeners ----
  useEffect(() => {
    if (!attemptId) return;

    const onFullscreenChange = () => {
      const fs = isFullscreen();
      setState((prev) => ({ ...prev, fullscreen: fs }));
      if (!fs) {
        setLocked('Anda meninggalkan mode layar penuh. Kembali ke ujian untuk melanjutkan.', 'fullscreen');
        setTimeout(enterFullscreen, 200);
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        hiddenSinceRef.current = hiddenSinceRef.current ?? Date.now();
        setLocked('Anda berpindah dari layar ujian (tab/aplikasi lain). Kembali untuk melanjutkan.', 'tab');
        enterFullscreen();
      }
    };

    const onBlur = () => {
      // Fires on Android when notification shade is pulled, app switcher, etc.
      setLocked('Anda meninggalkan layar ujian (notifikasi/aplikasi lain). Kembali untuk melanjutkan.', 'app');
      enterFullscreen();
    };

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const aspect = w / h;
      const sw = window.screen.width;
      // Split-screen / windowed detection: aspect swung OR width far below screen width
      if (!isFullscreen() || Math.abs(aspect - (sw / window.screen.height)) > 0.25 || w < sw * 0.55) {
        setLocked('Deteksi layar terbagi (split-screen). Gunakan satu layar penuh untuk ujian.', 'split');
        enterFullscreen();
      }
    };

    const onOnline = () => setState((prev) => ({ ...prev, offline: false }));
    const onOffline = () => {
      setState((prev) => ({ ...prev, offline: true }));
      setLocked('Koneksi internet terputus. Pastikan koneksi stabil.', 'network');
    };

    const onContextMenu = (e: Event) => e.preventDefault();
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      const blocked =
        k === 'F11' || k === 'Escape' ||
        (e.ctrlKey && k.toLowerCase() === 'w') ||
        (e.ctrlKey && k.toLowerCase() === 't') ||
        (e.ctrlKey && k.toLowerCase() === 'n') ||
        (e.ctrlKey && k.toLowerCase() === 'r') ||
        (e.ctrlKey && k.toLowerCase() === 'p') ||
        (e.ctrlKey && k.toLowerCase() === 's') ||
        (e.ctrlKey && k.toLowerCase() === 'a') ||
        (e.ctrlKey && k.toLowerCase() === 'u') ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k.toLowerCase())) ||
        (e.metaKey && (k.toLowerCase() === 'w' || k.toLowerCase() === 't' || k.toLowerCase() === 'n' || k.toLowerCase() === 'q')) ||
        k === 'F12';
      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
        if (k === 'F11' || k === 'Escape') {
          setLocked('Tombol keluar layar penuh diblokir.', 'fullscreen');
          enterFullscreen();
        }
      }
    };
    const onCopy = (e: Event) => e.preventDefault();
    const onCut = (e: Event) => e.preventDefault();
    const onPaste = (e: Event) => e.preventDefault();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('resize', onResize);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [attemptId, setLocked]);

  // ---- Heartbeat + periodic fullscreen re-assert ----
  useEffect(() => {
    if (!attemptId) return;
    const beat = setInterval(() => {
      const aid = attemptIdRef.current;
      if (aid) api.post(`/assessment/attempts/${aid}/proctoring`, {}).catch(() => {});
      if (!isFullscreen()) {
        setState((prev) => ({ ...prev, fullscreen: false }));
        enterFullscreen();
      }
    }, heartbeatIntervalMs);
    return () => clearInterval(beat);
  }, [attemptId, heartbeatIntervalMs]);

  // Block back navigation
  useEffect(() => {
    if (!attemptId) return;
    window.history.pushState(null, '', window.location.href);
    const onPop = () => window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [attemptId]);

  return { ...state, resume };
};
