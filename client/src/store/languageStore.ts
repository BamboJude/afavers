import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations, type Lang } from '../i18n/translations';

interface LanguageStore {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

export const useLanguage = create<LanguageStore>()(
  persist(
    (set, get) => ({
      lang: 'en',
      setLang: (lang) => set({ lang }),
      t: (key: string) => {
        const { lang } = get();
        return translations[lang][key] ?? translations['en'][key] ?? key;
      },
    }),
    { name: 'lang-preference' }
  )
);
