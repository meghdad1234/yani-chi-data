"use client";

import { useState } from "react";
import { buildInfographicSvg, INFO_W, INFO_H } from "../lib/infographic";
import { langName, posLabel, visibleTags } from "../lib/labels";
import type { Extra, Term } from "../lib/types";

export type WikiSense = { gloss: string; tags: string[]; examples?: { fa: string; en: string }[] };
export type WikiEntryLike = {
  word: string;
  pos: string | null;
  roman: string | null;
  ipa: string | null;
  etymology: string | null;
  senses: WikiSense[];
  extra?: Extra | null;
};

const SITE = "https://yani-chi.ir";

function isFormOnly(e: WikiEntryLike): boolean {
  return e.senses.length === 0 || e.senses.every((s) => s.tags.includes("form-of"));
}

function toPngBlob(svg: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = INFO_W;
      canvas.height = INFO_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, INFO_W, INFO_H);
      canvas.toBlob((b) => resolve(b), "image/png");
    };
    img.onerror = () => resolve(null);
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
}

function TermLinks({ terms }: { terms: Term[] }) {
  return (
    <span className="term-list">
      {terms.map((t, i) => (
        <span key={t.w + "-" + i}>
          {t.ok ? <a href={"/word/" + encodeURIComponent(t.w)}>{t.w}</a> : <span>{t.w}</span>}
          {i < terms.length - 1 ? "، " : ""}
        </span>
      ))}
    </span>
  );
}

function uniqTerms(...lists: Term[][]): Term[] {
  const seen = new Set<string>();
  const out: Term[] = [];
  for (const list of lists) {
    for (const t of list) {
      if (seen.has(t.w)) continue;
      seen.add(t.w);
      out.push(t);
    }
  }
  return out;
}

export default function WikiResult({
  entries,
  showPageLink = true,
}: {
  entries: WikiEntryLike[];
  showPageLink?: boolean;
}) {
  const [msg, setMsg] = useState("");
  if (!entries.length) return null;

  const main = entries.filter((e) => !isFormOnly(e));
  const forms = entries.filter((e) => isFormOnly(e));
  const primary = main[0] ?? entries[0];
  const pageUrl = `${SITE}/word/${encodeURIComponent(primary.word)}`;
  const fileName = `yani-chi-${primary.word}.png`;

  const glosses: string[] = [];
  for (const e of main.length ? main : [primary]) {
    for (const s of e.senses) {
      if (glosses.length >= 3) break;
      if (s.gloss && !glosses.includes(s.gloss)) glosses.push(s.gloss);
    }
    if (glosses.length >= 3) break;
  }

  const org = primary.extra?.org ?? null;
  const origin = org ? `از ${langName(org.l)}${org.w ? " · " + org.w : ""}` : null;

  const svg = buildInfographicSvg({
    word: primary.word,
    roman: primary.roman,
    ipa: primary.ipa,
    posLabel: posLabel(primary.pos),
    glosses,
    etymology: primary.etymology,
    origin,
  });
  const svgSrc = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

  async function download() {
    setMsg("");
    const blob = await toPngBlob(svg);
    if (!blob) {
      setMsg("ساخت تصویر ممکن نشد؛ دوباره تلاش کن.");
      return;
    }
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 3000);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setMsg("لینک کپی شد.");
    } catch {
      setMsg("اشتراک‌گذاری ممکن نشد.");
    }
  }

  async function share() {
    setMsg("");
    const nav = navigator as any;
    const title = `معنی «${primary.word}» | یعنی‌چی؟`;
    try {
      const blob = await toPngBlob(svg);
      if (blob && nav.canShare && nav.share) {
        const file = new File([blob], fileName, { type: "image/png" });
        if (nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], title, url: pageUrl });
          return;
        }
      }
      if (nav.share) {
        await nav.share({ title, url: pageUrl });
        return;
      }
      await copyLink();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      await copyLink();
    }
  }

  return (
    <div className="wiki-card">
      <span className="discovery-kicker">معنی و اطلاعات واژه از ویکی‌واژه</span>

      {main.map((entry, index) => {
        const examples = entry.senses.flatMap((s) => s.examples ?? []).filter((x) => x.fa).slice(0, 3);
        const pos = posLabel(entry.pos);
        const x = entry.extra ?? null;
        const rows: { label: string; terms: Term[] }[] = x
          ? [
              { label: "مترادف‌ها", terms: x.syn },
              { label: "متضادها", terms: x.ant },
              { label: "واژه‌های هم‌خانواده و مرتبط", terms: uniqTerms(x.der, x.rel) },
              { label: "مفهوم کلی‌تر", terms: x.hyper },
              { label: "نمونه‌ها و واژه‌های هم‌رده", terms: x.hypo },
            ].filter((r) => r.terms.length > 0)
          : [];
        return (
          <section className="wiki-entry" key={entry.word + "-" + index}>
            <div className="wiki-head">
              <strong className="wiki-word">{entry.word}</strong>
              {pos && <span className="wiki-tag">{pos}</span>}
              {entry.roman && <span className="wiki-latin">{entry.roman}</span>}
              {entry.ipa && <span className="wiki-latin">{entry.ipa}</span>}
            </div>

            {x?.org && (
              <p className="wiki-origin">
                <strong>ریشه: </strong>
                <span className="wiki-tagchip origin-chip">{langName(x.org.l)}</span>
                {x.org.w && <span className="wiki-latin"> {x.org.w}</span>}
                {x.chain.length > 1 && (
                  <span className="wiki-chain"> · مسیر: {x.chain.map((c) => langName(c)).join(" ← ")}</span>
                )}
              </p>
            )}

            <h4 className="wiki-section-title">معنی‌ها</h4>
            <ol className="wiki-senses">
              {entry.senses.map((sense, i) => (
                <li key={i}>
                  <span className="wiki-latin">{sense.gloss}</span>
                  {visibleTags(sense.tags).map((t, j) => (
                    <span className={t.latin ? "wiki-tagchip wiki-latin" : "wiki-tagchip"} key={j}>
                      {t.text}
                    </span>
                  ))}
                </li>
              ))}
            </ol>

            {rows.map((row) => (
              <p className="term-row" key={row.label}>
                <strong>{row.label}: </strong>
                <TermLinks terms={row.terms} />
              </p>
            ))}

            {x && x.forms.length > 0 && (
              <p className="term-row">
                <strong>صورت‌های دستوری: </strong>
                {x.forms.map((f, i) => {
                  const tg = visibleTags(f.t)
                    .map((t) => t.text)
                    .join("، ");
                  return (
                    <span key={f.f + "-" + i}>
                      {f.f}
                      {tg ? ` (${tg})` : ""}
                      {i < x.forms.length - 1 ? "، " : ""}
                    </span>
                  );
                })}
              </p>
            )}

            {entry.etymology && (
              <>
                <h4 className="wiki-section-title">ریشه‌شناسی (متن ویکی‌واژه)</h4>
                <p className="wiki-etymology wiki-ltr-block" dir="ltr">{entry.etymology}</p>
              </>
            )}

            {x && x.desc.length > 0 && (
              <>
                <h4 className="wiki-section-title">این واژه در زبان‌های دیگر</h4>
                <ul className="desc-list">
                  {x.desc.map((d, i) => (
                    <li key={d.l + d.w + i}>
                      <span>{langName(d.l, d.n)}: </span>
                      <span className="wiki-latin">{d.w}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {examples.length > 0 && (
              <>
                <h4 className="wiki-section-title">مثال‌ها</h4>
                {examples.map((ex, i) => (
                  <blockquote className="wiki-example" key={i}>
                    «{ex.fa}»{ex.en ? <span className="wiki-latin"> — {ex.en}</span> : null}
                  </blockquote>
                ))}
              </>
            )}

            <p className="wiki-source">
              <a
                href={`https://en.wiktionary.org/wiki/${encodeURIComponent(entry.word)}#Persian`}
                target="_blank"
                rel="noopener noreferrer"
              >
                منبع: ویکی‌واژه
              </a>
              {" · CC BY-SA 4.0"}
            </p>
          </section>
        );
      })}

      {forms.length > 0 && (
        <details className="wiki-forms">
          <summary>صورت‌های دیگر این نوشتار ({forms.length})</summary>
          {forms.map((entry, index) => (
            <div className="wiki-entry minor" key={entry.word + "-f-" + index}>
              {entry.senses.map((sense, i) => (
                <p key={i}>
                  <span className="wiki-latin">{sense.gloss}</span>
                </p>
              ))}
            </div>
          ))}
        </details>
      )}

      <div className="info-block">
        <h4 className="wiki-section-title">کارت اشتراک‌گذاری این واژه</h4>
        <div className="info-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={svgSrc} alt={`کارت اشتراک‌گذاری واژهٔ ${primary.word}`} width={INFO_W} height={INFO_H} />
        </div>
        <div className="info-actions">
          <button type="button" className="btn-primary" onClick={download}>
            دانلود تصویر (PNG)
          </button>
          <button type="button" className="btn-secondary" onClick={share}>
            اشتراک‌گذاری
          </button>
        </div>
        {msg && (
          <p className="word-footnote" role="status">
            {msg}
          </p>
        )}
        {showPageLink && (
          <a className="wiki-pagelink" href={"/word/" + encodeURIComponent(primary.word)}>
            مشاهدهٔ صفحهٔ اختصاصی این واژه ←
          </a>
        )}
      </div>
    </div>
  );
}
