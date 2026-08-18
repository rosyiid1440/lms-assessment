import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { Plus, Search, Edit2, Trash2, Copy, RefreshCw, Save, X, Sparkles } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

const QUESTION_TYPES = [
  'MULTIPLE_CHOICE', 'MULTIPLE_RESPONSE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'NUMERIC',
  'MATCHING', 'ORDERING', 'FILL_BLANK', 'DATE',
];
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'HOTS'];
const BLOOM_LEVELS = ['C1_REMEMBERING', 'C2_UNDERSTANDING', 'C3_APPLYING', 'C4_ANALYZING', 'C5_EVALUATING', 'C6_CREATING'];
const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

const emptyQuestion = {
  type: 'MULTIPLE_CHOICE',
  difficulty: 'MEDIUM',
  bloomLevel: 'C2_UNDERSTANDING',
  status: 'DRAFT',
  prompt: '',
  explanation: '',
  points: 1,
  negativeMarking: 0,
  options: [{ key: 'a', label: '', isCorrect: false }],
  answer: { keys: [] },
};

export const QuestionBank = () => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>(emptyQuestion);
  const [isCategoryModal, setIsCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [confirm, setConfirm] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });
  const [saving, setSaving] = useState(false);
  const [isAiModal, setIsAiModal] = useState(false);
  const [aiForm, setAiForm] = useState({ mataPelajaran: '', jenjang: 'SMA', kelas: '', topik: '', tipe: 'PILIHAN_GANDA', jumlah: '5', kesulitan: 'SEDANG' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any[]>([]);
  const [aiSelected, setAiSelected] = useState<Record<number, boolean>>({});
  const [aiSaving, setAiSaving] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: meta.page, limit: meta.limit, sortBy: 'updatedAt', sortDir: 'desc' };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      if (difficultyFilter) params.difficulty = difficultyFilter;
      if (categoryFilter) params.categoryId = categoryFilter;
      const [q, c] = await Promise.all([
        api.get('/assessment/questions', { params }),
        api.get('/assessment/categories'),
      ]);
      setQuestions(q.data.data);
      setMeta(q.data.meta);
      setCategories(c.data.data || []);
    } catch {
      showToast('Gagal memuat data', 'error');
    } finally {
      setLoading(false);
    }
  }, [meta.page, search, typeFilter, difficultyFilter, categoryFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = () => { setIsEditing(false); setForm(emptyQuestion); setIsModalOpen(true); };
  const openEdit = (q: any) => {
    setIsEditing(true);
    setForm({
      ...q,
      options: q.options?.length ? q.options : undefined,
      answer: q.answer || { keys: [] },
      explanation: q.explanation || '',
      categoryId: q.categoryId || '',
    });
    setIsModalOpen(true);
  };

  const updateOption = (i: number, field: string, value: any) => {
    const options = [...(form.options || [])];
    options[i] = { ...options[i], [field]: value };
    setForm({ ...form, options });
  };

  const addOption = () => {
    const options = [...(form.options || [])];
    let maxCode = 96;
    options.forEach(o => {
      if (o.key && o.key.length === 1) maxCode = Math.max(maxCode, o.key.charCodeAt(0));
    });
    const nextKey = String.fromCharCode(maxCode + 1);
    options.push({ key: nextKey, label: '', isCorrect: false });
    setForm({ ...form, options });
  };

  const setOptionCorrect = (i: number, val: boolean) => {
    const options = [...(form.options || [])];
    if (form.type === 'MULTIPLE_CHOICE') {
      options.forEach((o, idx) => { options[idx] = { ...o, isCorrect: idx === i && val }; });
    } else {
      options[i] = { ...options[i], isCorrect: val };
    }
    const correct = options.filter(o => o.isCorrect).map(o => o.key);
    setForm({ ...form, options, answer: { ...(form.answer || {}), keys: correct } });
  };

  const saveQuestion = async () => {
    if (!form.prompt.trim()) { showToast('Prompt wajib diisi', 'error'); return; }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        type: form.type,
        difficulty: form.difficulty,
        bloomLevel: form.bloomLevel,
        status: form.status,
        prompt: form.prompt,
        explanation: form.explanation || null,
        points: Number(form.points) || 1,
        negativeMarking: Number(form.negativeMarking) || 0,
        categoryId: form.categoryId || null,
      };
      if (['MULTIPLE_CHOICE', 'MULTIPLE_RESPONSE', 'TRUE_FALSE'].includes(form.type)) {
        payload.options = form.options?.map((o: any) => ({ key: o.key, label: o.label, isCorrect: !!o.isCorrect }));
      }
      if (form.type === 'TRUE_FALSE') {
        payload.answer = { boolean: form.options?.find((o: any) => o.isCorrect)?.key === 'true' };
      } else if (['MULTIPLE_CHOICE', 'MULTIPLE_RESPONSE'].includes(form.type)) {
        payload.answer = { keys: form.options?.filter((o: any) => o.isCorrect).map((o: any) => o.key) };
      } else if (['SHORT_ANSWER', 'FILL_BLANK'].includes(form.type)) {
        payload.answer = { text: form.answer?.text || '', variants: form.answer?.text ? [form.answer.text] : [] };
      } else if (form.type === 'NUMERIC') {
        payload.answer = { number: Number(form.answer?.number) || 0, tolerance: Number(form.answer?.tolerance) || 0 };
      } else if (form.type === 'ESSAY') {
        payload.answer = null;
      }
      if (isEditing) {
        await api.put(`/assessment/questions/${form.id}`, payload);
        showToast('Soal diperbarui');
      } else {
        await api.post('/assessment/questions', payload);
        showToast('Soal dibuat');
      }
      setIsModalOpen(false);
      fetchAll();
    } catch (e: any) {
      showToast(e.response?.data?.errors?.[0]?.message || e.response?.data?.detail || 'Gagal menyimpan soal', 'error');
    } finally {
      setSaving(false);
    }
  };

  const AI_TYPE_TO_APP: Record<string, string> = {
    PILIHAN_GANDA: 'MULTIPLE_CHOICE',
    BENAR_SALAH: 'TRUE_FALSE',
    ISIAN: 'SHORT_ANSWER',
    ESAI: 'ESSAY',
    MENJODOHKAN: 'MATCHING',
    URUTAN: 'ORDERING',
  };

  const AI_DIFF_TO_APP: Record<string, string> = {
    MUDAH: 'EASY',
    SEDANG: 'MEDIUM',
    SULIT: 'HARD',
  };

  const AI_BLOOM_TO_APP: Record<string, string> = {
    C1: 'C1_REMEMBERING',
    C2: 'C2_UNDERSTANDING',
    C3: 'C3_APPLYING',
    C4: 'C4_ANALYZING',
    C5: 'C5_EVALUATING',
    C6: 'C6_CREATING',
  };

  const aiGenerate = async () => {
    if (!aiForm.topik.trim()) { showToast('Topik wajib diisi', 'error'); return; }
    setAiLoading(true);
    setAiResult([]);
    setAiSelected({});
    try {
      const res = await api.post('/ai/questions/generate', aiForm);
      const qs = res.data?.questions ?? [];
      setAiResult(qs);
      setAiSelected(Object.fromEntries(qs.map((_: any, i: number) => [i, true])));
    } catch (e: any) {
      showToast(e.response?.data?.error || 'AI gagal membuat soal', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const aiSaveSelected = async () => {
    const items = aiResult.filter((_, i) => aiSelected[i]);
    if (items.length === 0) { showToast('Pilih minimal satu soal', 'error'); return; }
    setAiSaving(true);
    let saved = 0;
    try {
      for (const q of items) {
        const type = AI_TYPE_TO_APP[q.type] || 'MULTIPLE_CHOICE';
        const payload: Record<string, any> = {
          type,
          difficulty: AI_DIFF_TO_APP[q.difficulty] || 'MEDIUM',
          bloomLevel: AI_BLOOM_TO_APP[q.bloomLevel] || 'C2_UNDERSTANDING',
          status: 'DRAFT',
          prompt: q.prompt,
          explanation: q.penjelasan || null,
          points: 1,
          negativeMarking: 0,
          categoryId: null,
        };
        if (type === 'MULTIPLE_CHOICE' && Array.isArray(q.options)) {
          payload.options = q.options.map((o: any) => ({ key: String(o.id).toLowerCase(), label: o.text, isCorrect: String(o.id) === String(q.answer) }));
          payload.answer = { keys: [String(q.answer).toLowerCase()] };
        } else if (type === 'TRUE_FALSE') {
          const isTrue = String(q.answer) === 'Benar';
          payload.options = [
            { key: 'true', label: 'Benar', isCorrect: isTrue },
            { key: 'false', label: 'Salah', isCorrect: !isTrue },
          ];
          payload.answer = { boolean: isTrue };
        } else if (type === 'SHORT_ANSWER') {
          payload.answer = { text: q.answer, variants: q.answer ? [String(q.answer)] : [] };
        } else if (type === 'ESSAY') {
          payload.answer = null;
        } else if (type === 'MATCHING' && Array.isArray(q.option1Col) && Array.isArray(q.option2Col)) {
          payload.answer = { pairs: q.option1Col.map((l: string, i: number) => ({ left: l, right: q.option2Col[i] ?? '' })) };
        } else if (type === 'ORDERING' && q.answer?.sequence) {
          payload.answer = { sequence: q.answer.sequence };
        }
        await api.post('/assessment/questions', payload);
        saved++;
      }
      showToast(`${saved} soal disimpan ke bank soal`);
      setIsAiModal(false);
      setAiResult([]);
      fetchAll();
    } catch (e: any) {
      showToast(e.response?.data?.errors?.[0]?.message || e.response?.data?.detail || 'Gagal menyimpan soal AI', 'error');
    } finally {
      setAiSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/assessment/questions/${confirm.id}`);
      showToast('Soal dihapus');
      setConfirm({ isOpen: false, id: '' });
      fetchAll();
    } catch (e: any) {
      showToast(e.response?.data?.detail || 'Gagal menghapus', 'error');
    }
  };

  const duplicate = async (id: string) => {
    try {
      await api.post(`/assessment/questions/${id}/duplicate`);
      showToast('Soal digandakan');
      fetchAll();
    } catch { showToast('Gagal menggandakan', 'error'); }
  };

  const toggleStatus = async (q: any) => {
    const next = q.status === 'PUBLISHED' ? 'ARCHIVED' : 'PUBLISHED';
    try {
      await api.post(`/assessment/questions/${q.id}/status`, { status: next });
      showToast(`Status ${next}`);
      fetchAll();
    } catch { showToast('Gagal ubah status', 'error'); }
  };

  const createCategory = async () => {
    if (!categoryName.trim()) return;
    try {
      await api.post('/assessment/categories', { name: categoryName });
      showToast('Kategori dibuat');
      setCategoryName('');
      setIsCategoryModal(false);
      fetchAll();
    } catch { showToast('Gagal buat kategori', 'error'); }
  };

  const importExport = async (e: any) => {
    e.preventDefault();
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const rows = JSON.parse(text);
      const res = await api.post('/assessment/questions/import', { rows });
      showToast(`${res.data.data?.imported ?? 0} soal diimpor`);
      fetchAll();
    } catch { showToast('Gagal impor (pastikan file JSON)', 'error'); }
    e.target.value = '';
  };

  const exportQuestions = async () => {
    try {
      const res = await api.get('/assessment/questions/export');
      const blob = new Blob([JSON.stringify(res.data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bank-soal.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch { showToast('Gagal ekspor', 'error'); }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      PUBLISHED: 'bg-green-100 text-green-700',
      ARCHIVED: 'bg-orange-100 text-orange-700',
    };
    return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${map[s] || 'bg-gray-100'}`}>{s}</span>;
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
          <h2 className="text-2xl font-bold text-gray-900">Bank Soal</h2>
          <p className="text-sm text-gray-500 mt-1">Kelola kategori, tag, dan soal</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsCategoryModal(true)} className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50">+ Kategori</button>
          <button onClick={exportQuestions} className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50">Ekspor</button>
          <label className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            Impor
            <input type="file" accept=".json" className="hidden" onChange={importExport} />
          </label>
          <button onClick={() => setIsAiModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-lg">
            <Sparkles size={16} /> Buat dengan AI
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg">
            <Plus size={16} /> Buat Soal
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input value={search} onChange={e => { setSearch(e.target.value); setMeta({ ...meta, page: 1 }); }} placeholder="Cari soal..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md" />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setMeta({ ...meta, page: 1 }); }} className="px-3 py-2 text-sm border border-gray-300 rounded-md">
          <option value="">Semua Tipe</option>
          {QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={difficultyFilter} onChange={e => { setDifficultyFilter(e.target.value); setMeta({ ...meta, page: 1 }); }} className="px-3 py-2 text-sm border border-gray-300 rounded-md">
          <option value="">Semua Kesulitan</option>
          {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setMeta({ ...meta, page: 1 }); }} className="px-3 py-2 text-sm border border-gray-300 rounded-md">
          <option value="">Semua Kategori</option>
          {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-semibold">Soal</th>
                <th className="px-6 py-3 font-semibold">Tipe</th>
                <th className="px-6 py-3 font-semibold">Kategori</th>
                <th className="px-6 py-3 font-semibold">Kesulitan</th>
                <th className="px-6 py-3 font-semibold">Bobot</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" /></td></tr>
              ) : questions.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">Belum ada soal</td></tr>
              ) : questions.map((q: any) => (
                <tr key={q.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 max-w-md line-clamp-2" dangerouslySetInnerHTML={{ __html: q.prompt }} />
                  </td>
                  <td className="px-6 py-4">{q.type}</td>
                  <td className="px-6 py-4">{q.categoryName || '-'}</td>
                  <td className="px-6 py-4">{q.difficulty}</td>
                  <td className="px-6 py-4">{q.points}</td>
                  <td className="px-6 py-4">{statusBadge(q.status)}</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(q)} className="text-gray-400 hover:text-primary-600 p-1" title="Edit"><Edit2 size={16} /></button>
                    <button onClick={() => duplicate(q.id)} className="text-gray-400 hover:text-blue-600 p-1 ml-1" title="Duplikat"><Copy size={16} /></button>
                    <button onClick={() => toggleStatus(q)} className="text-gray-400 hover:text-green-600 p-1 ml-1" title="Ubah status"><RefreshCw size={16} /></button>
                    <button onClick={() => setConfirm({ isOpen: true, id: q.id })} className="text-gray-400 hover:text-red-600 p-1 ml-1" title="Hapus"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-500">Total <span className="font-medium">{meta.total}</span> soal</div>
          <div className="flex gap-2">
            <button disabled={meta.page === 1} onClick={() => setMeta({ ...meta, page: meta.page - 1 })} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Prev</button>
            <button disabled={meta.page === meta.totalPages} onClick={() => setMeta({ ...meta, page: meta.page + 1 })} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* Question Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Edit Soal' : 'Buat Soal Baru'} width="max-w-4xl">
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipe</label>
              <select value={form.type} onChange={e => { setForm({ ...form, type: e.target.value, options: e.target.value === 'TRUE_FALSE' ? [{ key: 'true', label: 'Benar', isCorrect: false }, { key: 'false', label: 'Salah', isCorrect: false }] : form.options }); }} className="w-full px-3 py-2 border rounded-md text-sm">
                {QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Kesulitan</label>
              <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm">
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bloom</label>
              <select value={form.bloomLevel} onChange={e => setForm({ ...form, bloomLevel: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm">
                {BLOOM_LEVELS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Kategori</label>
              <select value={form.categoryId || ''} onChange={e => setForm({ ...form, categoryId: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm">
                <option value="">Tanpa kategori</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bobot Poin</label>
              <input type="number" value={form.points} onChange={e => setForm({ ...form, points: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Prompt / Pertanyaan *</label>
            <textarea value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })} rows={3}
              className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Tuliskan pertanyaan..." />
          </div>

          {(form.type === 'MULTIPLE_CHOICE' || form.type === 'MULTIPLE_RESPONSE' || form.type === 'TRUE_FALSE') && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Pilihan Jawaban</label>
              <div className="space-y-2">
                {form.options?.map((o: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="checkbox" checked={!!o.isCorrect} onChange={e => setOptionCorrect(i, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600" />
                    <span className="text-xs font-mono text-gray-500 w-5">{o.key}.</span>
                    <input value={o.label} onChange={e => updateOption(i, 'label', e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-md text-sm" placeholder={`Pilihan ${o.key}`} />
                    {form.type !== 'TRUE_FALSE' && <button onClick={() => setForm({ ...form, options: form.options.filter((_: any, idx: number) => idx !== i) })} className="text-gray-400 hover:text-red-500"><X size={16} /></button>}
                  </div>
                ))}
              </div>
              {form.type !== 'TRUE_FALSE' && (
                <button onClick={addOption} className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700">+ Tambah pilihan</button>
              )}
              <p className="text-xs text-gray-400 mt-2">Centang kotak untuk menandai jawaban benar{form.type === 'MULTIPLE_CHOICE' ? ' (hanya satu)' : ' (boleh lebih)'}.</p>
            </div>
          )}

          {['SHORT_ANSWER', 'FILL_BLANK'].includes(form.type) && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Jawaban Benar</label>
              <input value={form.answer?.text || ''} onChange={e => setForm({ ...form, answer: { ...form.answer, text: e.target.value } })}
                className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Jawaban teks (case-insensitive)" />
            </div>
          )}

          {form.type === 'NUMERIC' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Jawaban Numerik</label>
                <input type="number" value={form.answer?.number || ''} onChange={e => setForm({ ...form, answer: { ...form.answer, number: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Toleransi</label>
                <input type="number" value={form.answer?.tolerance || 0} onChange={e => setForm({ ...form, answer: { ...form.answer, tolerance: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-md text-sm" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Pembahasan</label>
            <textarea value={form.explanation || ''} onChange={e => setForm({ ...form, explanation: e.target.value })} rows={2}
              className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Penjelasan jawaban (opsional)" />
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Batal</button>
            <button onClick={saveQuestion} disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50">
              <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal isOpen={isCategoryModal} onClose={() => setIsCategoryModal(false)} title="Buat Kategori Baru">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nama Kategori</label>
            <input value={categoryName} onChange={e => setCategoryName(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Misal: Matematika" />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsCategoryModal(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Batal</button>
            <button onClick={createCategory} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg">Simpan</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirm.isOpen}
        onClose={() => setConfirm({ isOpen: false, id: '' })}
        onConfirm={handleDelete}
        title="Hapus Soal"
        description="Apakah Anda yakin ingin menghapus soal ini?"
        confirmText="Hapus"
      />

      {/* AI Wizard Modal */}
      <Modal isOpen={isAiModal} onClose={() => setIsAiModal(false)} title="Buat Soal dengan AI" width="max-w-4xl">
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mata Pelajaran</label>
              <input value={aiForm.mataPelajaran} onChange={e => setAiForm({ ...aiForm, mataPelajaran: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Matematika" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Jenjang</label>
              <select value={aiForm.jenjang} onChange={e => setAiForm({ ...aiForm, jenjang: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm">
                <option>SMA</option><option>SMP</option><option>SD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Kelas / Fase</label>
              <input value={aiForm.kelas} onChange={e => setAiForm({ ...aiForm, kelas: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Kelas 10 / Fase E" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Topik *</label>
              <input value={aiForm.topik} onChange={e => setAiForm({ ...aiForm, topik: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Misal: Sistem Persamaan Linear Dua Variabel" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipe Soal</label>
              <select value={aiForm.tipe} onChange={e => setAiForm({ ...aiForm, tipe: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm">
                <option value="PILIHAN_GANDA">Pilihan Ganda</option>
                <option value="BENAR_SALAH">Benar/Salah</option>
                <option value="ISIAN">Isian Singkat</option>
                <option value="ESAI">Esai</option>
                <option value="MENJODOHKAN">Menjodohkan</option>
                <option value="URUTAN">Urutan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Jumlah</label>
              <input type="number" min={1} max={20} value={aiForm.jumlah} onChange={e => setAiForm({ ...aiForm, jumlah: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Kesulitan</label>
              <select value={aiForm.kesulitan} onChange={e => setAiForm({ ...aiForm, kesulitan: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm">
                <option>MUDAH</option><option>SEDANG</option><option>SULIT</option>
              </select>
            </div>
          </div>

          <button onClick={aiGenerate} disabled={aiLoading || aiSaving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50">
            <Sparkles size={16} /> {aiLoading ? 'AI sedang membuat soal...' : 'Generate Soal'}
          </button>

          {aiResult.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">{aiResult.length} soal dibuat — centang untuk menyimpan</span>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                {aiResult.map((q: any, i: number) => (
                  <div key={i} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50/50">
                    <input type="checkbox" checked={!!aiSelected[i]} onChange={e => setAiSelected({ ...aiSelected, [i]: e.target.checked })} className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{q.prompt}</div>
                      <div className="text-xs text-gray-500 mt-1">{q.type} • {q.difficulty} • {q.bloomLevel}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
                <button onClick={aiSaveSelected} disabled={aiSaving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50">
                  <Save size={16} /> {aiSaving ? 'Menyimpan...' : 'Simpan Terpilih'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
