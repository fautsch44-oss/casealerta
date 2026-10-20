export type Lang = 'es' | 'en';
export type Kind = 'ok' | 'act' | 'good' | 'bad';

export type Form = {
  code: string;
  slug: string;
  name_en: string;
  name_es: string;
  short_en: string;
  short_es: string;
  what_en: string;
  what_es: string;
  group: string;
  has_card: boolean;
  has_interview: 'often' | 'sometimes' | 'rarely';
  has_biometrics: boolean;
  milestones_en: string[];
  milestones_es: string[];
  typical_months_min: number | null;
  typical_months_max: number | null;
  range_source: string | null;
  official_url: string;
  popularity: number;
};

export type QA = { q: string; a: string };

export type Status = {
  code: string;
  slug_en: string;
  title_es: string;
  slug_es: string;
  kind: Kind;
  stage: string;
  meaning_en: string;
  meaning_es: string;
  next_en: string[];
  next_es: string[];
  mistakes_en: string[];
  mistakes_es: string[];
  wait_en: string;
  wait_es: string;
  faq_en: QA[];
  faq_es: QA[];
  applies_to: string[];
  card_only: boolean;
  interview_only: boolean;
};

export type Note = { en: string; es: string };
export type NotesByForm = Record<string, Record<string, Note>>; // form slug → status slug_en → note

export type NewsItem = {
  slug_es: string;
  slug_en: string;
  type: 'news' | 'guide';
  date: string;
  updated?: string;
  title_es: string;
  title_en: string;
  desc_es: string;
  desc_en: string;
  body_es: string[];
  body_en: string[];
  sources: { t: string; u: string }[];
};
