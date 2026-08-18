import React, { useState } from 'react';
import { api } from '../../lib/axios';
import { Play, RotateCcw, Sparkles, Loader2, Code2, FileCode, Eye, Copy } from 'lucide-react';

const STARTERS: Record<string, string> = {
  PYTHON: '# Selamat datang di Informatika Lab!\nprint("Hello, world!")',
  JAVASCRIPT: '// Console Editor\nconsole.log("Hello, world!");\nconst x = 2 + 3;\nconsole.log("x =", x);',
  CPP: '#include <iostream>\nusing namespace std;\nint main(){ cout << "Hello, world!" << endl; return 0; }',
  JAVA: 'public class Main { public static void main(String[] args) { System.out.println("Hello!"); } }',
  HTML: '<!-- Web code renders in your browser -->',
  CSS: '/* CSS playground */\nbody { color: rebeccapurple; }',
  SQL: '-- SQL sandbox (SQLite bawaan). Tabel: students(id,name,class_name), grades(id,student_id,score)\nSELECT s.name, g.score\nFROM students s JOIN grades g ON g.student_id = s.id\nORDER BY g.score DESC;',
};

export const CodeEditor = () => {
  const [language, setLanguage] = useState('PYTHON');
  const [code, setCode] = useState(STARTERS.PYTHON);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<{ stdout: string; stderr: string; ms: number; timedOut: boolean } | null>(null);
  const [running, setRunning] = useState(false);
  const [review, setReview] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [copied, setCopied] = useState(false);

  const switchLang = (l: string) => { setLanguage(l); setCode(STARTERS[l]); setOutput(null); setReview(''); };

  const run = async () => {
    setRunning(true);
    setOutput(null);
    try {
      const res = await api.post('/informatics/run', { language, code, input });
      setOutput(res.data);
    } catch (e: any) { setOutput({ stdout: '', stderr: e?.response?.data?.error || 'Gagal menjalankan.', ms: 0, timedOut: false }); }
    finally { setRunning(false); }
  };

  const runReview = async () => {
    setReviewing(true); setReview('');
    try {
      const res = await api.post('/informatics/review', { language, code, focus: 'editor' });
      setReview(res.data.text || 'Review selesai.');
    } catch (e: any) { setReview(e?.response?.data?.error || 'AI review tidak tersedia.'); }
    finally { setReviewing(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(output?.stdout || ''); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch {}
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-12">
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Code Editor</h2>
        <p className="text-sm text-gray-500 mt-1 font-medium">Tulis dan jalankan kode langsung di browser (Python, JavaScript, C++, Java).</p>
      </div>

      {/* Language tabs */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(STARTERS).map((l) => (
          <button
            key={l}
            onClick={() => switchLang(l)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${language === l ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor */}
        <div className="bg-[#0f1117] rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#161923] border-b border-white/10">
            <div className="flex items-center gap-2">
              <Code2 size={15} className="text-primary-400" />
              <span className="text-xs font-bold text-gray-300">{language} file</span>
            </div>
            <button onClick={copy} disabled={!output} className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 disabled:opacity-40">
              <Copy size={12} /> {copied ? 'Tersalin' : 'Salin'}
            </button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="flex-1 bg-transparent text-[#d4d4d4] text-sm font-mono p-4 outline-none resize-y min-h-[320px] leading-relaxed"
            style={{ colorScheme: 'dark' }}
          />
        </div>

        {/* Output / console */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Output</span>
            {output && <span className="text-xs text-gray-400">{output.ms} ms</span>}
          </div>
          <div className="flex-1 p-4 bg-gray-900 text-green-400 font-mono text-sm min-h-[200px] whitespace-pre-wrap overflow-auto rounded-xl m-3">
            {output !== null && (<>
              {output.stdout && <p>{output.stdout}</p>}
              {output.stderr && <p className="text-red-400">{output.stderr || '(empty)'}</p>}
              {(output.timedOut) && <p className="text-yellow-400">Time Limit Exceeded.</p>}
              {!output.stdout && !output.stderr && !output.timedOut && <p className="text-gray-500 text-sm">Jalankan kode untuk melihat hasil.</p>}
            </>)}
          </div>

          {/* Input + actions */}
          <div className="px-4 pb-4 space-y-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Input program (opsional, dipisah newline)..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 font-mono"
            />
            <div className="flex gap-2">
              <button onClick={run} disabled={running} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-60">
                {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Jalankan (Run)
              </button>
              <button onClick={runReview} disabled={reviewing} className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 disabled:opacity-60">
                {reviewing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} AI Review
              </button>
            </div>
            {review && (
              <div className="bg-violet-50 text-violet-900 rounded-xl p-4 text-sm whitespace-pre-wrap">
                <p className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-2 flex items-center gap-1"><Sparkles size={12} /> AI Code Review</p>
                {review}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};