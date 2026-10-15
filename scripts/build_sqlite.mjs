// ساخت دیتابیس SQLite از فایل‌های data/fa (بدون نیاز به npm؛ فقط Node 22)
// اجرا: node scripts/build_sqlite.mjs data/fa /var/www/yani-chi-db/yani.db
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { normFa } from './lib.mjs';

const [dir = 'data/fa', out = 'out/yani.db'] = process.argv.slice(2);
const files = fs.readdirSync(dir).filter((f) => /^fa-\d+\.jsonl\.gz$/.test(f)).sort();
if (!files.length) throw new Error(`فایل داده‌ای در ${dir} پیدا نشد`);

fs.mkdirSync(path.dirname(out), { recursive: true });
const tmp = out + '.tmp';
for (const p of [tmp, tmp + '-journal', tmp + '-wal', tmp + '-shm']) fs.rmSync(p, { force: true });

const db = new DatabaseSync(tmp);
db.exec(`
  CREATE TABLE entries (
    id INTEGER PRIMARY KEY,
    lang TEXT NOT NULL DEFAULT 'fa',
    word TEXT NOT NULL,
    norm TEXT NOT NULL,
    pos TEXT, roman TEXT, ipa TEXT, etymology TEXT,
    senses TEXT NOT NULL,
    origin TEXT,
    extra TEXT
  );
  CREATE TABLE meta (k TEXT PRIMARY KEY, v TEXT);
`);
const ins = db.prepare(
  'INSERT INTO entries (lang, word, norm, pos, roman, ipa, etymology, senses, origin, extra) VALUES (?,?,?,?,?,?,?,?,?,?)');

let n = 0;
db.exec('BEGIN');
for (const f of files) {
  const text = zlib.gunzipSync(fs.readFileSync(path.join(dir, f))).toString('utf8');
  for (const line of text.split('\n')) {
    if (!line) continue;
    const e = JSON.parse(line);
    const x = e.x || null;
    ins.run('fa', e.w, normFa(e.w), e.pos, e.roman, e.ipa, e.et, JSON.stringify(e.s),
      x && x.org ? x.org.l : null, x ? JSON.stringify(x) : null);
    n++;
  }
}
db.exec('COMMIT');
db.exec('CREATE INDEX idx_entries_lang_norm ON entries (lang, norm)');
db.exec('CREATE INDEX idx_entries_origin ON entries (lang, origin)');
db.prepare('INSERT INTO meta VALUES (?,?)').run('entries', String(n));
db.prepare('INSERT INTO meta VALUES (?,?)').run('built_at', new Date().toISOString());
db.close();

fs.renameSync(tmp, out); // جایگزینی اتمی؛ برنامهٔ در حال اجرا هیچ‌وقت فایل نیمه‌کاره نمی‌بیند
console.log(`دیتابیس ساخته شد: ${n} مدخل → ${out}`);
