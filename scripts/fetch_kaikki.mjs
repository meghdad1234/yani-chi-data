// دانلود دامپ واژه‌های فارسی از Kaikki (برگرفته از ویکی‌واژه) و ذخیرهٔ فشردهٔ تکه‌تکه در data/fa
// اجرا: node scripts/fetch_kaikki.mjs   (برای تست محلی: INPUT_FILE=sample.jsonl node scripts/fetch_kaikki.mjs)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import readline from 'node:readline';
import { Readable } from 'node:stream';

const SRC = process.env.KAIKKI_URL ||
  'https://kaikki.org/dictionary/Persian/kaikki.org-dictionary-Persian.jsonl';
const OUT = process.env.OUT_DIR || 'data/fa';
const SHARD_SIZE = 5000;

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) {
  if (/^fa-\d+\.jsonl\.gz$/.test(f)) fs.unlinkSync(path.join(OUT, f));
}

let input;
if (process.env.INPUT_FILE) {
  input = fs.createReadStream(process.env.INPUT_FILE);
} else {
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`دانلود ناموفق: HTTP ${res.status}`);
  input = Readable.fromWeb(res.body);
}

let buf = [];
let shard = 0;
let total = 0;
const flush = () => {
  if (!buf.length) return;
  const name = path.join(OUT, `fa-${String(shard++).padStart(4, '0')}.jsonl.gz`);
  fs.writeFileSync(name, zlib.gzipSync(buf.join('\n') + '\n', { level: 9 }));
  buf = [];
};

const rl = readline.createInterface({ input, crlfDelay: Infinity });
for await (const line of rl) {
  if (!line.trim()) continue;
  let e;
  try { e = JSON.parse(line); } catch { continue; }
  if (!e.word || !Array.isArray(e.senses)) continue;

  const senses = e.senses.slice(0, 12).map((s) => ({
    g: (s.glosses || []).join(' — '),
    t: s.tags || [],
    ex: (s.examples || []).slice(0, 2).map((x) => ({ fa: x.text || '', en: x.english || '' })),
  })).filter((s) => s.g);
  if (!senses.length) continue;

  const roman = (e.forms || []).find((f) => (f.tags || []).includes('romanization'))?.form || null;
  const ipa = (e.sounds || []).find((s) => s.ipa)?.ipa || null;

  buf.push(JSON.stringify({ w: e.word, pos: e.pos || null, roman, ipa, et: e.etymology_text || null, s: senses }));
  total++;
  if (buf.length >= SHARD_SIZE) flush();
}
flush();

fs.writeFileSync(path.join(OUT, 'meta.json'),
  JSON.stringify({ source: SRC, entries: total, shards: shard }, null, 2) + '\n');
console.log(`انجام شد: ${total} مدخل در ${shard} فایل`);
