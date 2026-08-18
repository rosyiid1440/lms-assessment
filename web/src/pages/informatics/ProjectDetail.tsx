import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/axios';
import { Upload, GitBranch, FileCode2, Plus, X, Send, Users, FolderGit2 } from 'lucide-react';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { BackButton } from '../../components/ui/BackButton';
import { useAuthStore } from '../../stores/authStore';

const FULL_ROLE = ['teacher', 'admin', 'super_admin'];

export const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const isTeacher = FULL_ROLE.includes(user?.role?.slug || '');
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [files, setFiles] = useState<{ name: string; content: string }[]>([{ name: 'main.py', content: '' }]);
  const [githubUrl, setGithubUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [saving, setSaving] = useState(false);
  const [gradeForms, setGradeForms] = useState<Record<string, any>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchP = useCallback(async () => {
    setLoading(true); setError(false);
    try { const res = await api.get(`/informatics/projects/${id}`); setProject(res.data);
      if (res.data.mySubmission) { setFiles(res.data.mySubmission.files || files); setGithubUrl(res.data.mySubmission.githubUrl || ''); setBranch(res.data.mySubmission.branch || ''); }
    } catch (e) { setError(true); } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchP(); }, [fetchP]);

  const addFile = () => setFiles([...files, { name: '', content: '' }]);
  const setFile = (i: number, patch: any) => setFiles(files.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  const removeFile = (i: number) => setFiles(files.filter((_, idx) => idx !== i));

  const readUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const idx = files.findIndex(x => x.name === f.name);
      if (idx >= 0) setFile(idx, { content: String(reader.result) });
      else setFiles([...files, { name: f.name, content: String(reader.result) }]);
    };
    reader.readAsText(f);
    e.target.value = '';
  };

  const submit = async () => {
    setSaving(true);
    try {
      await api.post(`/informatics/projects/${id}/submit`, {
        files: files.filter(f => f.name && f.content),
        githubUrl: githubUrl.trim() || undefined,
        branch: branch.trim() || undefined,
      });
      fetchP();
      alert('Pengumpulan berhasil!');
    } catch (e: any) { alert(e?.response?.data?.error || 'Gagal mengumpulkan.'); } finally { setSaving(false); }
  };

  const renderView = (f: any, c: string) => {
    const _ = c && f; return f;
  };

  const grade = async (submissionId: string) => {
    const g = gradeForms[submissionId] || {};
    try { await api.post(`/informatics/projects/${id}/grade`, { submissionId, score: g.score, feedback: g.feedback });
      fetchP(); } catch (e: any) { alert(e?.response?.data?.error || 'Gagal menilai.'); }
  };

  if (loading) return <div className="max-w-5xl mx-auto space-y-6"><BackButton to="/dashboard/study/informatika" label="Kembali ke Informatika" /><SkeletonCard /></div>;
  if (error || !project) return <ErrorState message="Proyek tidak ditemukan." onRetry={fetchP} />;

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-12">
      <BackButton to="/dashboard/study/informatika" label="Kembali ke Informatika" />
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2"><FolderGit2 size={26} className="text-orange-500" /> {project.title}</h2>
        <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{project.description}</p>
        <div className="flex gap-2 mt-3">
          <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-gray-100 text-gray-600 rounded-md">Skor Max: {project.maxScore}</span>
          {project.groupGit && <span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-gray-100 text-gray-600 rounded-md flex items-center gap-1"><GitBranch size={11} /> Git didukung</span>}
        </div>
      </div>

      {/* Student: submission form */}
      {!isTeacher && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-extrabold text-gray-900">Kumpulkan Proyek</h3>
          <div className="space-y-2">
            {files.map((f, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex gap-2">
                  <input value={f.name} onChange={(e) => setFile(i, { name: e.target.value })} placeholder="nama file (cth: app.py)" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono" />
                  <button onClick={() => removeFile(i)} className="px-2 text-gray-400 hover:text-red-500"><X size={16} /></button>
                </div>
                <textarea value={f.content} onChange={(e) => setFile(i, { content: e.target.value })} rows={5} placeholder="Isi file..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={addFile} className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl"><Plus size={15} /> Tambah File</button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl"><Upload size={15} /> Upload File</button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={readUpload} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="URL repository GitHub/GitLab (opsional)" className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
            <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Branch (cth: main)" className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
          </div>
          <button onClick={submit} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-60">
            <Send size={16} /> {saving ? 'Mengumpulkan...' : 'Kumpulkan Proyek'}
          </button>
          {project.mySubmission?.status && <p className="text-xs text-gray-500">Status: {project.mySubmission.status} {project.mySubmission.score != null && `· Nilai: ${project.mySubmission.score}`}</p>}
        </div>
      )}

      {/* Teacher: submissions + grading */}
      {isTeacher && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-gray-900 items-center gap-2"><Users className="inline text-primary-600 mr-1" size={18} /> Pengumpulan ({project.data?.length || 0})</h3>
          </div>
          {project.data?.length === 0 && <p className="text-sm text-gray-400 px-5 py-8 text-center">Belum ada pengumpulan.</p>}
          <div className="divide-y divide-gray-100">
            {project.data?.map((s: any) => (
              <div key={s.id} className="px-5 py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-900">{s.studentName}</p>
                  <span className="text-xs text-gray-400">{s.submittedAt ? new Date(s.submittedAt).toLocaleString('id-ID') : '-'}</span>
                </div>
                {s.githubUrl && <p className="text-xs text-blue-600 flex items-center gap-1"><GitBranch size={12} /> {s.githubUrl}</p>}
                {Array.isArray(s.files) && (
                  <div className="space-y-1 mt-1">
                    {s.files.slice(0, 3).map((f: any, i: number) => (
                      <details key={i} className="bg-gray-50 rounded-lg px-3 py-1.5">
                        <summary className="text-xs font-bold text-gray-600 cursor-pointer flex items-center gap-1"><FileCode2 size={12} /> {f.name}</summary>
                        <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap mt-2 max-h-40 overflow-auto">{f.content}</pre>
                      </details>
                    ))}
                    {s.files.length > 3 && <p className="text-xs text-gray-400">+{s.files.length - 3} file lainnya</p>}
                  </div>
                )}
                {s.feedback && <p className="bg-primary-50 text-primary-800 text-sm rounded-lg px-3 py-2"><b>Feedback:</b> {s.feedback}</p>}
                <div className="flex gap-2 pt-1">
                  <input type="number" value={gradeForms[s.id]?.score ?? ''} onChange={(e) => setGradeForms({ ...gradeForms, [s.id]: { ...gradeForms[s.id], score: e.target.value } })} placeholder="Nilai" className="w-24 px-2 py-1.5 text-sm border border-gray-200 rounded-lg" />
                  <input value={gradeForms[s.id]?.feedback ?? ''} onChange={(e) => setGradeForms({ ...gradeForms, [s.id]: { ...gradeForms[s.id], feedback: e.target.value } })} placeholder="Feedback..." className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg" />
                  <button onClick={() => grade(s.id)} className="px-3 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700">Nilai</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};