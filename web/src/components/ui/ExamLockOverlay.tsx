import React from 'react';
import { Lock, ShieldAlert, WifiOff, Maximize2, AlertTriangle, CheckCircle2, UserCheck } from 'lucide-react';

interface ExamLockOverlayProps {
  message: string | null;
  violations: number;
  awaySeconds: number;
  offline: boolean;
  permanentlyLocked: boolean;
  maxViolations: number;
  onResume: () => void;
}

export const ExamLockOverlay = ({ message, violations, awaySeconds, offline, permanentlyLocked, maxViolations, onResume }: ExamLockOverlayProps) => {
  return (
    <div className="fixed inset-0 z-[100] bg-gray-950 flex items-center justify-center p-6 select-none" style={{ userSelect: 'none' }}>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5 ${permanentlyLocked ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
          {permanentlyLocked ? <Lock size={30} /> : <Maximize2 size={30} />}
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-3">
          {permanentlyLocked ? 'Ujian Terkunci' : 'Mode Ujian Terkunci'}
        </h2>
        <div className="flex items-center justify-center gap-2 mb-4">
          <ShieldAlert size={16} className="text-amber-500" />
          <p className="text-sm font-medium text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5">
            Pengawasan aktif — {violations} pelanggaran tercatat
          </p>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed mb-5">
          {permanentlyLocked
            ? 'Batas pelanggaran telah tercapai. Ujian Anda dikunci oleh sistem pengawasan dan tidak dikumpulkan otomatis. Hubungi admin sekolah untuk membuka kunci.'
            : message || 'Anda meninggalkan layar ujian. Tetap di halaman ini hingga ujian selesai.'}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6 text-left">
          <div className="rounded-xl border border-gray-200 p-3">
            <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Pelanggaran</div>
            <div className="text-lg font-extrabold text-gray-900">{violations} / {maxViolations}</div>
          </div>
          <div className="rounded-xl border border-gray-200 p-3">
            <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Keluar halaman</div>
            <div className="text-lg font-extrabold text-gray-900">{awaySeconds}s</div>
          </div>
        </div>

        {offline && !permanentlyLocked && (
          <div className="flex items-center gap-2 mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <WifiOff size={16} /> Koneksi terputus. Periksa koneksi internet Anda.
          </div>
        )}

        {permanentlyLocked ? (
          <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm mb-5">
            <UserCheck size={16} /> Hanya admin sekolah yang dapat membuka kunci ujian ini.
          </div>
        ) : (
          <button
            onClick={onResume}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-lg shadow-primary-600/25 transition-all"
          >
            <Maximize2 size={16} /> Kembali ke Ujian (Layar Penuh)
          </button>
        )}

        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-gray-400">
          <CheckCircle2 size={14} className="text-green-500" />
          Aktivitas Anda dicatat. Dilarang pindah tab/aplikasi, membuka notifikasi, atau membelah layar.
        </div>
      </div>
    </div>
  );
};
