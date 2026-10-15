import fs from "node:fs";
import { normFa } from "./normFa";
import type { Entry, Extra, Sense, Term } from "./types";

export type { Entry, Extra, Sense, Term } from "./types";

type Db = { prepare(sql: string): { all(...a: unknown[]): any[] }; close(): void };
let db: Db | null = null;
let dbKey = "";
let indexable: { key: string; words: string[] } | null = null;

function getDb(): Db {
  const p = process.env.YANI_DB_PATH || "/var/www/yani-chi-db/yani.db";
  const st = fs.statSync(p);
  const key = `${st.ino}:${st.mtimeMs}:${st.size}`;
  if (!db || key !== dbKey) {
    try { db?.close(); } catch {}
    const { DatabaseSync } = (process as any).getBuiltinModule("node:sqlite");
    db = new DatabaseSync(p, { readOnly: true }) as Db;
    dbKey = key;
  }
  return db as Db;
}

function parseSenses(raw: string): Sense[] {
  try {
    const arr = JSON.parse(raw) as any[];
    return arr.map((s) => ({
      gloss: String(s.g ?? ""),
      tags: Array.isArray(s.t) ? s.t.map(String) : [],
      examples: Array.isArray(s.ex)
        ? s.ex.map((x: any) => ({ fa: String(x?.fa ?? ""), en: String(x?.en ?? "") }))
        : [],
    }));
  } catch {
    return [];
  }
}

type RawExtra = {
  syn?: string[];
  ant?: string[];
  rel?: string[];
  der?: string[];
  hyper?: string[];
  hypo?: string[];
  forms?: { f: string; t?: string[] }[];
  org?: { t: string; l: string; w: string | null } | null;
  chain?: string[];
  desc?: { l: string; n: string; w: string }[];
};

function parseRawExtra(raw: unknown): RawExtra | null {
  if (typeof raw !== "string" || !raw || raw === "null") return null;
  try {
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? (o as RawExtra) : null;
  } catch {
    return null;
  }
}

function existingSet(words: string[]): Set<string> {
  const norms = [...new Set(words.map(normFa).filter(Boolean))];
  if (!norms.length) return new Set();
  const placeholders = norms.map(() => "?").join(",");
  const rows = getDb()
    .prepare(`SELECT DISTINCT norm FROM entries WHERE lang = ? AND norm IN (${placeholders})`)
    .all("fa", ...norms);
  return new Set(rows.map((r) => String(r.norm)));
}

export function isFormOnly(e: Entry): boolean {
  return e.senses.length === 0 || e.senses.every((s) => s.tags.includes("form-of"));
}

export function lookupEntries(q: string): Entry[] {
  const norm = normFa(q);
  if (!norm) return [];
  const rows = getDb()
    .prepare("SELECT * FROM entries WHERE lang = ? AND norm = ? ORDER BY id LIMIT 10")
    .all("fa", norm);

  const raws = rows.map((r) => parseRawExtra(r.extra));
  const allTerms: string[] = [];
  for (const x of raws) {
    if (!x) continue;
    for (const list of [x.syn, x.ant, x.rel, x.der, x.hyper, x.hypo]) allTerms.push(...(list ?? []));
  }
  const exists = existingSet(allTerms);
  const toTerms = (list?: string[]): Term[] =>
    (list ?? []).map((w) => ({ w, ok: exists.has(normFa(w)) && normFa(w) !== norm }));

  const list: Entry[] = rows.map((r, i) => {
    const x = raws[i];
    const extra: Extra | null = x
      ? {
          syn: toTerms(x.syn),
          ant: toTerms(x.ant),
          rel: toTerms(x.rel),
          der: toTerms(x.der),
          hyper: toTerms(x.hyper),
          hypo: toTerms(x.hypo),
          forms: (x.forms ?? []).map((f) => ({ f: String(f.f), t: (f.t ?? []).map(String) })),
          org: x.org ?? null,
          chain: x.chain ?? [],
          desc: x.desc ?? [],
        }
      : null;
    return {
      word: String(r.word),
      pos: r.pos ?? null,
      roman: r.roman ?? null,
      ipa: r.ipa ?? null,
      etymology: r.etymology ?? null,
      senses: parseSenses(r.senses),
      extra,
    };
  });
  return [...list].sort((a, b) => Number(isFormOnly(a)) - Number(isFormOnly(b)));
}

// واژه‌هایی که صفحهٔ آن‌ها محتوای واقعی دارد (برای سایت‌مپ)
export function getIndexableWords(): string[] {
  const d = getDb();
  if (indexable && indexable.key === dbKey) return indexable.words;
  const rows = d.prepare("SELECT word, norm, senses FROM entries WHERE lang = ? ORDER BY id").all("fa");
  const seen = new Map<string, string>();
  for (const r of rows) {
    const senses = parseSenses(r.senses);
    const formOnly = senses.length === 0 || senses.every((s) => s.tags.includes("form-of"));
    if (!formOnly && /[\u0600-\u06FF]/.test(String(r.word)) && !seen.has(r.norm)) seen.set(r.norm, String(r.word));
  }
  const words = [...seen.values()];
  indexable = { key: dbKey, words };
  return words;
}
