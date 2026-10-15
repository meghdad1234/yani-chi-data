// دانلود دامپ واژه‌های فارسی از Kaikki (برگرفته از ویکی‌واژه) و ذخیرهٔ فشردهٔ تکه‌تکه در data/fa
// نسخهٔ ۲: علاوه بر معنی و ریشه، مترادف، متضاد، واژه‌های مرتبط، صورت‌های دستوری، مسیر ریشه و گسترش واژه در زبان‌های دیگر
// اجرا: node scripts/fetch_kaikki.mjs   (تست محلی: INPUT_FILE=sample.jsonl node scripts/fetch_kaikki.mjs)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import readline from 'node:readline';
import { Readable } from 'node:stream';

const SRC = process.env.KAIKKI_URL ||
  'https://kaikki.org/dictionary/Persian/kaikki.org-dictionary-Persian.jsonl';
const OUT = process.env.OUT_DIR || 'data/fa';
const SHARD_SIZE = 5000;

const ORIGIN_T = new Set(['bor', 'bor+', 'lbor', 'slbor', 'ubor', 'der', 'der+', 'uder', 'inh', 'inh+', 'calque', 'clq', 'pclq']);
const SKIP_FORM_TAGS = new Set(['romanization', 'table-tags', 'inflection-template', 'class', 'canonical']);

const uniq = (arr) => [...new Set(arr)];
const str = (v) => (typeof v === 'string' ? v.trim() : '');

function termList(...lists) {
  const out = [];
  for (const l of lists) {
    for (const it of Array.isArray(l) ? l : []) {
      const w = typeof it === 'string' ? it.trim() : str(it && it.word);
      if (w && w.length <= 60) out.push(w);
    }
  }
  return uniq(out).slice(0, 24);
}

function parseEty(e) {
  const chain = [];
  let org = null;
  for (const t of Array.isArray(e.etymology_templates) ? e.etymology_templates : []) {
    if (!t || !ORIGIN_T.has(t.name)) continue;
    const a = t.args || {};
    const src = str(a['2']);
    if (!src) continue;
    const w = str(a['3']) || str(a['4']);
    if (!org && str(a['1']) === 'fa') org = { t: t.name.replace('+', ''), l: src, w: w || null };
    if (!chain.includes(src)) chain.push(src);
  }
  return { org, chain: chain.slice(0, 6) };
}

function descList(e) {
  const out = [];
  const walk = (list, depth) => {
    for (const d of Array.isArray(list) ? list : []) {
      if (!d || typeof d !== 'object') continue;
      const w = str(d.word);
      const l = str(d.lang_code);
      if (w && l) out.push({ l, n: str(d.lang), w });
      if (depth < 2) walk(d.descendants, depth + 1);
    }
  };
  walk(e.descendants, 0);
  return out.slice(0, 12);
}

function formList(e) {
  const out = [];
  for (const f of Array.isArray(e.forms) ? e.forms : []) {
    const form = str(f && f.form);
    const tags = Array.isArray(f && f.tags) ? f.tags.map(String) : [];
    if (!form || form === e.word || form === '-' || tags.some((t) => SKIP_FORM_TAGS.has(t))) continue;
    out.push({ f: form, t: tags.slice(0, 3) });
  }
  return out.slice(0, 12);
}

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
const stats = { syn: 0, ant: 0, rel: 0, der: 0, hyper: 0, hypo: 0, forms: 0, org: 0, desc: 0 };
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

  const per = (key) => e.senses.map((s) => s[key]);
  const x = {};
  const syn = termList(e.synonyms, ...per('synonyms'));
  const ant = termList(e.antonyms, ...per('antonyms'));
  const rel = termList(e.related, ...per('related'));
  const der = termList(e.derived);
  const hyper = termList(e.hypernyms, ...per('hypernyms'));
  const hypo = termList(e.hyponyms, ...per('hyponyms'), e.coordinate_terms);
  const forms = formList(e);
  const { org, chain } = parseEty(e);
  const desc = descList(e);
  if (syn.length) { x.syn = syn; stats.syn++; }
  if (ant.length) { x.ant = ant; stats.ant++; }
  if (rel.length) { x.rel = rel; stats.rel++; }
  if (der.length) { x.der = der; stats.der++; }
  if (hyper.length) { x.hyper = hyper; stats.hyper++; }
  if (hypo.length) { x.hypo = hypo; stats.hypo++; }
  if (forms.length) { x.forms = forms; stats.forms++; }
  if (org) { x.org = org; stats.org++; }
  if (chain.length) x.chain = chain;
  if (desc.length) { x.desc = desc; stats.desc++; }

  const rec = { w: e.word, pos: e.pos || null, roman, ipa, et: e.etymology_text || null, s: senses };
  if (Object.keys(x).length) rec.x = x;
  buf.push(JSON.stringify(rec));
  total++;
  if (buf.length >= SHARD_SIZE) flush();
}
flush();

fs.writeFileSync(path.join(OUT, 'meta.json'),
  JSON.stringify({ source: SRC, entries: total, shards: shard, stats }, null, 2) + '\n');
console.log(`انجام شد: ${total} مدخل در ${shard} فایل`);
console.log('آمار فیلدهای غنی:', JSON.stringify(stats));
