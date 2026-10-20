import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { strings, type Lang } from './strings';

const KEY = 'casealerta.lang';

type Ctx = { lang: Lang; t: (typeof strings)['es']; setLang: (l: Lang) => Promise<void>; ready: boolean };
const LangContext = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = (await AsyncStorage.getItem(KEY)) as Lang | null;
      if (saved === 'es' || saved === 'en') setLangState(saved);
      else setLangState(getLocales()[0]?.languageCode === 'en' ? 'en' : 'es');
      setReady(true);
    })();
  }, []);

  const setLang = useCallback(async (l: Lang) => {
    setLangState(l);
    await AsyncStorage.setItem(KEY, l);
  }, []);

  const value = useMemo(() => ({ lang, t: strings[lang], setLang, ready }), [lang, setLang, ready]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useT() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('LangProvider missing');
  return ctx;
}
