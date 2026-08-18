import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Network, Cpu, BarChart2, Play, Pause, RotateCcw, ChevronRight } from 'lucide-react';

type Tab = 'terminal' | 'algo';

const FILES: Record<string, string> = {
  'home/': '',
  'home/welcome.txt': 'Selamat datang di Simulasi Terminal!\nTulis perintah seperti di Linux.',
  'home/data.txt': '5\n3\n8\n1\n9\n2\n7',
};

// --- Virtual terminal (CLI simulator) ---
const TerminalSim = () => {
  const [history, setHistory] = useState<string[]>([
    '╭─ Simulasi Terminal Linux (readonly sandbox)',
    '│   coba: ls • pwd • cat welcome.txt • help • tree',
    '╰─────────────────────────────────────────────',
  ]);
  const [cmd, setCmd] = useState('');
  const [cwd, setCwd] = useState('home');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);

  const run = (raw: string) => {
    const input = raw.trim();
    const parts = input.split(/\s+/);
    const c = parts[0].toLowerCase();
    const arg = parts[1];
    const lines = [`$ ${input}`];
    const add = (s: string) => { s.split('\n').forEach(l => lines.push(l)); };

    try {
      if (c === 'help') add('Perintah: ls • cat <file> • pwd • echo <teks> • tree • clear • whoami • date • help\n');
      else if (c === 'ls') add(`total ${Object.keys(FILES).filter(f => f.startsWith(cwd)).length}\n${Object.keys(FILES).filter(f => f.includes('/') && !f.includes('/news')).filter(f => f !== 'home/student' && f.startsWith(cwd)).map(f => f.slice(cwd.length + 1)).join('\n') || '(kosong)'}\n`);
      else if (c === 'pwd') add(`/${cwd}`);
      else if (c === 'whoami') add('student@sman1');
      else if (c === 'tree') add(Object.keys(FILES).map(f => ' ' + f.replace(/\//g, '  ').replace('home', 'home/')).join('\n'));
      else if (c === 'cat') {
        const key = `${cwd}/${arg}`; 
        add(FILES[key] || FILES[arg] || `cat: ${arg}: No such file`);
      }
      else if (c === 'cwd') add(cwd);
      else if (c === 'echo') add(arg || '');
      else if (c === 'ifconfig') add(`eth0: inet 192.168.1.10  netmask 255.255.255.0  broadcast 192.168.1.255`);
      else if (c === 'ping') add(`PING ${arg || '8.8.8.8'} (${arg || '8.8.8.8'}) 56(84) bytes of data.\n64 bytes from 8.8.8.8: icmp_seq=1 ttl=117 time=12.3 ms`);
      else if (c === 'ip') add('1: lo: <LOOPBACK>  inet 127.0.0.1/8\n2: eth0: <BROADCAST>  inet 192.168.1.10/24');
      else if (c === 'route') add('Kernel IP routing table\nDestination     Gateway   Genmask\n192.168.1.0  *  255.255.255.0\n0.0.0.0  192.168.1.1  0.0.0.0');
      else if (c === '') { /* noop */ }
      else add(`${c}: command not found`);
    } catch (e: any) { add('error: ' + e.message); }
    setHistory([...history, ...lines]);
    setCmd('');
  };

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 bg-gray-800 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-red-500" />
        <span className="w-3 h-3 rounded-full bg-yellow-500" />
        <span className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-xs text-gray-400 ml-2">student@sman1: ~/{cwd}</span>
      </div>
      <div className="p-4 font-mono text-sm text-green-300 h-64 overflow-y-auto">
        {history.map((l, i) => <pre key={i} className="whitespace-pre-wrap">{l}</pre>)}
        <div className="flex items-center gap-1">
          <span className="text-green-400">$</span>
          <ChevronRight size={14} className="text-green-500" />
          <input
            value={cmd} onChange={(e) => setCmd(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run(cmd)}
            autoFocus className="bg-transparent outline-none flex-1 text-green-200"
            placeholder="ketik 'help'"
          />
        </div>
        <div ref={endRef} />
      </div>
    </div>
  );
};

// --- Algorithm visualizer (Sorting + Searching) ---
const AlgorithmVisualizer = () => {
  const [arr, setArr] = useState<number[]>([38, 27, 43, 3, 9, 82, 10]);
  const [active, setActive] = useState<number[]>([]);
  const [sorted, setSorted] = useState(false);
  const [playingStep, setPlayingStep] = useState(false);
  const timerRef = useRef<any>(null);

  const shuffle = () => {
    setSorted(false); setActive([]);
    setArr([...arr].sort(() => Math.random() - 0.5));
  };

  const bubble = async () => {
    setSorted(false);
    const a = [...arr];
    let n = a.length;
    setPlayingStep(true);
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        setActive([j, j + 1]);
        if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; setArr([...a]); }
        await new Promise(r => setTimeout(r, 400));
      }
    }
    setActive([]); setSorted(true); setPlayingStep(false);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const max = Math.max(...arr, 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="font-bold text-gray-800">Visualisasi Sorting (Bubble Sort)</h3>
        <div className="flex gap-2">
          <button onClick={bubble} disabled={playingStep} className="px-3 py-1.5 text-xs font-bold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">▶ Animasikan</button>
          <button onClick={shuffle} className="px-3 py-1.5 text-xs font-bold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">↻ Acak</button>
        </div>
      </div>
      <div className="flex items-end gap-1 h-48">
        {arr.map((v, i) => (
          <div key={i} style={{ height: `${(v / max) * 100}%` }} className={`flex-1 min-w-2 rounded-t transition-all duration-300 ${active.includes(i) ? 'bg-red-400' : sorted ? 'bg-green-400' : 'bg-primary-500'}`} />
        ))}
      </div>
      {sorted && <p className="text-center text-xs text-green-600 mt-3 font-bold">Array terurut! Kompleksitas: O(n²)</p>}
    </div>
  );
};

export const VirtualLab = () => {
  const [tab, setTab] = useState<Tab>('terminal');
  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-12">
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Laboratorium Virtual</h2>
        <p className="text-sm text-gray-500 mt-1 font-medium">Simulasi CLI / jaringan untuk memahami sistem operasi & komunikasi jaringan, plus visualisasi algoritma.</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('terminal')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors ${tab === 'terminal' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}><TerminalIcon size={16} /> Terminal / CLI</button>
        <button onClick={() => setTab('algo')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors ${tab === 'algo' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}><BarChart2 size={16} /> Visualisasi Algoritma</button>
      </div>

      <div className="pt-2">
        {tab === 'terminal' && <TerminalSim />}
        {tab === 'algo' && <AlgorithmVisualizer />}
      </div>
    </div>
  );
};