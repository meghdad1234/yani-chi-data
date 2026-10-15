export type InfoData = {
  word: string;
  roman: string | null;
  ipa: string | null;
  posLabel: string | null;
  glosses: string[];
  etymology: string | null;
  origin?: string | null;
};

const FONT = "Vazirmatn, Tahoma, 'Segoe UI', 'Noto Sans Arabic', Arial, sans-serif";
const TEAL = "#1f7a6d";
const DEEP = "#0f4c46";
const INK = "#16312d";

export const INFO_W = 1080;
export const INFO_H = 1350;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrap(text: string, max: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  let consumed = 0;
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (next.length > max && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    } else {
      cur = next;
    }
    consumed++;
  }
  let truncated = false;
  if (lines.length < maxLines && cur) {
    lines.push(cur);
  } else if (lines.length >= maxLines) {
    truncated = true;
  }
  if (!truncated && consumed < words.length) truncated = true;
  if (truncated && lines.length) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/[.,;:\s]+$/, "") + "…";
  }
  return lines.slice(0, maxLines);
}

export function buildInfographicSvg(d: InfoData): string {
  const hasOrigin = !!(d.origin && d.origin.trim());
  const hasEty = !!(d.etymology && d.etymology.trim());
  const hasBlock = hasOrigin || hasEty;
  const glossBudget = hasBlock ? 3 : 6;

  const glossLines: string[] = [];
  const multi = d.glosses.length > 1;
  d.glosses.slice(0, 4).forEach((g, i) => {
    const room = glossBudget - glossLines.length;
    if (room <= 0) return;
    const lines = wrap((multi ? `${i + 1}. ` : "") + g, 34, Math.min(2, room));
    glossLines.push(...lines);
  });

  const etyLines = hasEty ? wrap(d.etymology as string, 46, hasOrigin ? 2 : 3) : [];
  const phon = [d.roman, d.ipa].filter(Boolean).join("    ");
  const wordSize = Math.max(70, Math.min(210, Math.floor(820 / Math.max(1, d.word.length * 0.5))));
  const posW = d.posLabel ? Math.max(150, d.posLabel.length * 26 + 70) : 0;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${INFO_W}" height="${INFO_H}" viewBox="0 0 ${INFO_W} ${INFO_H}" direction="ltr" role="img" aria-label="${esc("تصویر اشتراک‌گذاری واژهٔ " + d.word)}">`,
  );
  parts.push(
    `<defs>` +
      `<linearGradient id="igbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7f4ec"/><stop offset="1" stop-color="#d6e9e4"/></linearGradient>` +
      `<linearGradient id="ighead" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${DEEP}"/><stop offset="1" stop-color="${TEAL}"/></linearGradient>` +
      `</defs>`,
  );
  parts.push(`<rect width="${INFO_W}" height="${INFO_H}" fill="url(#igbg)"/>`);
  parts.push(`<circle cx="1010" cy="140" r="270" fill="${TEAL}" opacity="0.08"/>`);
  parts.push(`<circle cx="50" cy="1300" r="240" fill="${TEAL}" opacity="0.09"/>`);
  parts.push(`<rect x="66" y="72" width="948" height="1230" rx="56" fill="#0f4c46" opacity="0.07"/>`);
  parts.push(`<rect x="60" y="60" width="960" height="1230" rx="56" fill="#ffffff" stroke="#cfe3de" stroke-width="3"/>`);
  parts.push(
    `<text x="780" y="1150" text-anchor="middle" font-size="760" font-weight="700" fill="${TEAL}" opacity="0.045" font-family="${FONT}">؟</text>`,
  );

  parts.push(`<path d="M60 116 A56 56 0 0 1 116 60 H964 A56 56 0 0 1 1020 116 V215 H60 Z" fill="url(#ighead)"/>`);
  parts.push(`<circle cx="920" cy="138" r="42" fill="#ffffff"/>`);
  parts.push(
    `<text x="920" y="156" text-anchor="middle" font-size="56" font-weight="700" fill="${TEAL}" font-family="${FONT}">؟</text>`,
  );
  parts.push(
    `<text x="862" y="156" text-anchor="end" font-size="54" font-weight="700" fill="#ffffff" font-family="${FONT}">یعنی‌چی؟</text>`,
  );
  parts.push(
    `<text x="116" y="150" text-anchor="start" font-size="30" fill="#ffffff" opacity="0.85" font-family="${FONT}">yani-chi.ir</text>`,
  );

  parts.push(
    `<text x="540" y="410" text-anchor="middle" font-size="${wordSize}" font-weight="700" fill="${INK}" font-family="${FONT}">${esc(d.word)}</text>`,
  );
  parts.push(`<rect x="480" y="440" width="120" height="8" rx="4" fill="${TEAL}"/>`);

  if (phon) {
    parts.push(
      `<text x="540" y="515" text-anchor="middle" font-size="40" fill="#5b6b68" font-family="${FONT}">${esc(phon)}</text>`,
    );
  }
  if (d.posLabel) {
    parts.push(`<rect x="${540 - posW / 2}" y="545" width="${posW}" height="58" rx="29" fill="#e3f0ec"/>`);
    parts.push(
      `<text x="540" y="585" text-anchor="middle" font-size="30" font-weight="700" fill="${TEAL}" font-family="${FONT}">${esc(d.posLabel)}</text>`,
    );
  }

  parts.push(
    `<text x="540" y="672" text-anchor="middle" font-size="30" font-weight="700" fill="${TEAL}" font-family="${FONT}">معنی</text>`,
  );
  glossLines.forEach((line, i) => {
    parts.push(
      `<text x="540" y="${735 + i * 56}" text-anchor="middle" font-size="46" fill="${INK}" font-family="${FONT}">${esc(line)}</text>`,
    );
  });

  if (hasBlock) {
    parts.push(`<line x1="180" y1="905" x2="900" y2="905" stroke="#d9e6e2" stroke-width="3"/>`);
    parts.push(
      `<text x="540" y="955" text-anchor="middle" font-size="30" font-weight="700" fill="${TEAL}" font-family="${FONT}">ریشهٔ واژه</text>`,
    );
    let y = 1008;
    if (hasOrigin) {
      parts.push(
        `<text x="540" y="${y}" text-anchor="middle" font-size="40" font-weight="700" fill="${INK}" font-family="${FONT}">${esc(d.origin as string)}</text>`,
      );
      y += 48;
    }
    etyLines.forEach((line, i) => {
      parts.push(
        `<text x="540" y="${y + i * 42}" text-anchor="middle" font-size="31" fill="#44544f" font-family="${FONT}">${esc(line)}</text>`,
      );
    });
  }

  parts.push(`<rect x="330" y="1160" width="420" height="76" rx="38" fill="${TEAL}"/>`);
  parts.push(
    `<text x="540" y="1211" text-anchor="middle" font-size="42" font-weight="700" fill="#ffffff" font-family="${FONT}">yani-chi.ir</text>`,
  );
  parts.push(
    `<text x="540" y="1268" text-anchor="middle" font-size="24" fill="#7a8a86" font-family="${FONT}">منبع: ویکی‌واژه · CC BY-SA 4.0</text>`,
  );

  parts.push(`</svg>`);
  return parts.join("");
}
