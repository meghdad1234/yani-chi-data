export type Term = { w: string; ok: boolean };

export type Extra = {
  syn: Term[];
  ant: Term[];
  rel: Term[];
  der: Term[];
  hyper: Term[];
  hypo: Term[];
  forms: { f: string; t: string[] }[];
  org: { t: string; l: string; w: string | null } | null;
  chain: string[];
  desc: { l: string; n: string; w: string }[];
};

export type Sense = { gloss: string; tags: string[]; examples: { fa: string; en: string }[] };

export type Entry = {
  word: string;
  pos: string | null;
  roman: string | null;
  ipa: string | null;
  etymology: string | null;
  senses: Sense[];
  extra: Extra | null;
};
