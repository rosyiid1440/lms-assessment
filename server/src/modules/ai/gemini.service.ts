// ---------------------------------------------------------
// GEMINI AI SERVICE — Modul Ajar (Kurikulum Merdeka)
// Wraps Google Gemini REST API with safe fallback when the
// API key is missing or the request fails.
// ---------------------------------------------------------

interface GeminiOpts {
  systemPrompt?: string;
  userPrompt: string;
  /** Ask Gemini to return strict JSON matching `jsonSchema`. */
  asJson?: boolean;
  temperature?: number;
}

export interface GeminiModuleResponse {
  complete: boolean;
  data: any;
  metaFields?: string[];
}

export type GeminiProvider = 'api' | 'web2';

const PROVIDER_DEFAULTS: Record<GeminiProvider, { model: string; baseUrl: string; fallback: string[] }> = {
  // Google official REST API (uses GEMINI_API_KEY).
  api: {
    model: 'gemini-2.5-flash',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    fallback: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-1.5-flash'],
  },
  // Local gemini-web2api proxy (uses gemini.google.com web, no key required).
  web2: {
    model: 'gemini-3.6-flash',
    baseUrl: 'http://localhost:8081/v1beta',
    fallback: ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-lite', 'gemini-auto'],
  },
};

export class GeminiAiService {
  private readonly provider: GeminiProvider;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fallbackModels: string[];

  constructor() {
    this.provider = (process.env.GEMINI_PROVIDER || 'api') as GeminiProvider;
    const def = PROVIDER_DEFAULTS[this.provider] || PROVIDER_DEFAULTS.api;
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = process.env.GEMINI_MODEL || def.model;
    this.baseUrl = (process.env.GEMINI_API_URL || def.baseUrl).replace(/\/$/, '');
    this.fallbackModels = def.fallback;
  }

  get providerName(): GeminiProvider {
    return this.provider;
  }

  get modelName(): string {
    return this.model;
  }

  /** AI is usable without a key only through the local web2 proxy. */
  get enabled(): boolean {
    return this.provider === 'web2' || !!this.apiKey;
  }

  private buildPrompt(opts: GeminiOpts): string {
    const parts: string[] = [];
    if (opts.systemPrompt) {
      parts.push(`[SISTEM INSTRUKSI]\n${opts.systemPrompt}\n`);
    }
    parts.push(`[PERMINTAAN PENGGUNA]\n${opts.userPrompt}\n`);
    if (opts.asJson) {
      parts.push(
        'PENTING: Balas HANYA dengan satu objek JSON yang valid, tanpa teks lain, tanpa blok ```markdown```. ' +
        'Semua kunci string. Gunakan nilai kosong "" hanya jika tidak relevan. Bahasa Indonesia formal.'
      );
    }
    return parts.join('\n\n');
  }

  async generateText(opts: GeminiOpts): Promise<string> {
    if (!this.enabled) {
      throw new Error('AI belum aktif. Tambahkan GEMINI_API_KEY pada server/.env atau set GEMINI_PROVIDER=web2 untuk memakai proxy lokal gemini-web2api.');
    }

    const temperature = opts.temperature ?? (opts.asJson ? 0.3 : 0.7);
    const maxTokens = 4096;

    // Try the configured model first, then fall back to other widely available
    // models for the active provider (handles deprecated/renamed models & throttling).
    const candidates = [this.model, ...this.fallbackModels.filter((m) => m !== this.model)];

    let lastError: Error | null = null;
    for (const model of candidates) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        // Official API needs the key header; the web2 proxy ignores it but tolerates it.
        if (this.apiKey) headers['x-goog-api-key'] = this.apiKey;
        const response = await fetch(`${this.baseUrl}/models/${model}:generateContent`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            contents: [{ parts: [{ text: this.buildPrompt(opts) }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
              ...(opts.asJson ? { responseMimeType: 'application/json' } : {}),
            },
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          const err = new Error(`Gemini error ${response.status}: ${body.slice(0, 300)}`);
          // 404 = model not available for this key/version; try next candidate.
          if (response.status === 404) {
            lastError = err;
            continue;
          }
          throw err;
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
        return text;
      } catch (e: any) {
        if (e instanceof Error && /404|NOT_FOUND/i.test(e.message)) {
          lastError = e;
          continue;
        }
        throw e;
      }
    }

    throw lastError || new Error('Semua model Gemini yang tersedia tidak dapat memproses permintaan');
  }

  async generateJson<T>(opts: GeminiOpts): Promise<T> {
    const raw = await this.generateText({ ...opts, asJson: true });
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(cleaned) as T;
  }

  /** Convenience: system prompt + user prompt, strict JSON output. */
  async generateJson2<T>(systemPrompt: string, userPrompt: string, temperature = 0.3): Promise<T> {
    return this.generateJson<T>({ systemPrompt, userPrompt, temperature });
  }

  /** Structured helpers used by the route handler below. */
}

// ---- Shared prompt builders (kept together for maintainability) ----

export function buildModuleGenerationSystemPrompt(): string {
  return `
Anda adalah asisten ahli penyusun Modul Ajar Kurikulum Merdeka sesuai
Panduan Pembelajaran dan Asesmen Kemendikbudristek (Permendikbudristek No. 16/2022)
dan Keputusan BSKAAP No. 033/H/KR/2022.

Tugas Anda: menghasilkan komponen-komponen Modul Ajar secara lengkap, konsisten,
dan siap dipakai guru. Selalu gunakan bahasa Indonesia, formal, terstruktur, dan JIKA
memungkinkan gunakan Taksonomi Bloom (C1–C6) pada Tujuan Pembelajaran. Jika pengguna
menyebut konten/materi dan tingkat (fase/kelas), sesuaikan kompetensi, kegiatan, dan
asesmen agar berjenjang (mudah → kompleks).

Skema output JSON:
{
  "kompetensiAwal": string,
  "profilPelajarPancasila": [{ "dimensi": string, "indikator": string }],
  "saranaPrasarana": string,
  "targetPesertaDidik": string,
  "modelPembelajaran": string,
  "tujuanPembelajaran": string,
  "pemahamanBermakna": string,
  "pertanyaanPemantik": string,
  "kegiatanPembelajaran": [{ "pertemuan": number, "pendahuluan": string, "inti": string, "penutup": string }],
  "asesmen": { "diagnostik": string, "formatif": string, "sumatif": string },
  "pengayaanRemedial": string,
  "refleksiGuru": string,
  "refleksiPesertaDidik": string,
  "lkpd": string,
  "bahanBacaan": string,
  "glosarium": string,
  "daftarPustaka": string
}
`;
}

export function buildTpAtpPrompt(): string {
  return `Anda adalah ahli Kurikulum Merdeka. Saat pengguna memberikan Fase, Mata Pelajaran, dan
Elemen/Capaian Pembelajaran (CP), uraikan CP tersebut menjadi beberapa Tujuan Pembelajaran (TP)
menggunakan Taksonomi Bloom dan rekomendasikan urutan ATP dari yang paling dasar hingga kompleks.

Balas dengan JSON:
{
  "tujuanPembelajaran": string (daftar TP terurut, tiap baris diawali "TP.n. "),
  "atp": string (uraian singkat urutan ATP),
  "capaianPembelajaran": string (CP yang digunakan sebagai dasar)
}`;
}

export function buildAssessmentPrompt(): string {
  return `Kamu adalah ahli perancang asesmen Kurikulum Merdeka. Berdasarkan topik dan fase/mata pelajaran,
buatlah asesmen yang lengkap: diagnostik (pembelajaran), formatif, dan sumatif. Sertakan kisi-kisi,
butir soal (HOTS dan LOTS), dan kunci/pedoman singkat.

Balas dengan JSON:
{
  "diagnostik": string,
  "formatif": string,
  "sumatif": string,
  "rubrik": string
}`;
}

export function buildQuestionBankPrompt(): string {
  return `Kamu adalah ahli pembuat soal Kurikulum Merdeka. Buatlah butir soal dari topik yang diberikan
sesuai tipe dan jumlah yang diminta. Tulis soal dalam Bahasa Indonesia.

Jenis tipe soal yang didukung:
- "PILIHAN_GANDA": options berbentuk array objek { id: "A"|"B"|"C"|"D"|"E", text: string }. jawabanBenar = id pilihan.
- "BENAR_SALAH": options array ["Benar","Salah"]. jawabanBenar = "Benar" atau "Salah".
- "ISIAN": jawabanBenar = teks singkat.
- "ESAI": jawabanBenar = pedoman/kunci singkat.
- "MENJODOHKAN": option1Col = array teks kiri, option2Col = array teks kanan, answer = array berisi jawaban kanan sejajar option1Col (pairing sama panjang).
- "URUTAN": answer = { sequence: [langkah urut benar] }.

Setiap soal diberi: prompt (pertanyaan), tipe, tingkat kesulitan (MUDAH/SEDANG/SULIT), bloomLevel (C1..C6),
dan "penjelasan" singkat.

Balas dengan JSON:
{
  "questions": [
    {
      "prompt": string,
      "type": string,
      "difficulty": "MUDAH"|"SEDANG"|"SULIT",
      "bloomLevel": "C1"|"C2"|"C3"|"C4"|"C5"|"C6",
      "options": array|null,
      "option1Col": array|null,
      "option2Col": array|null,
      "answer": any,
      "penjelasan": string
    }
  ]
}`;
}