import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang } from '../services/types';
import { DEFAULT_LANG, DICTIONARIES, LANGS, type TextKey } from './dictionaries';

const STORAGE_KEY = 'kb_lang';

export type Translate = (key: TextKey | string, vars?: Record<string, string | number>) => string;

export function translator(lang: Lang): Translate {
  const dict = DICTIONARIES[lang] ?? DICTIONARIES[DEFAULT_LANG];
  return (key, vars = {}) => {
    const text = (dict as Record<string, string>)[key] ?? (DICTIONARIES[DEFAULT_LANG] as Record<string, string>)[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''));
  };
}

export function hasText(key: string): boolean {
  return key in DICTIONARIES[DEFAULT_LANG];
}

function readStoredLang(): Lang {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return LANGS.includes(value as Lang) ? (value as Lang) : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

interface I18nValue {
  lang: Lang;
  t: Translate;
  setLang(lang: Lang): void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children, initial }: { children: ReactNode; initial?: Lang }) {
  const [lang, setLangState] = useState<Lang>(() => initial ?? readStoredLang());
  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable — keep it for this page only */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const value = useMemo(() => ({ lang, t: translator(lang), setLang }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n outside I18nProvider');
  return value;
}
