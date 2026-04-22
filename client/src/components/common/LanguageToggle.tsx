import { useLanguage } from '../../store/languageStore';

export const LanguageToggle = () => {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="flex gap-0 border border-gray-200 rounded-lg overflow-hidden text-xs font-semibold">
      <button
        onClick={() => setLang('en')}
        className={`px-2.5 py-1.5 transition ${
          lang === 'en'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-500 hover:bg-gray-50'
        }`}
        title={t('switchEnglish')}
      >
        EN
      </button>
      <div className="w-px bg-gray-200" />
      <button
        onClick={() => setLang('de')}
        className={`px-2.5 py-1.5 transition ${
          lang === 'de'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-500 hover:bg-gray-50'
        }`}
        title={t('switchGerman')}
      >
        DE
      </button>
    </div>
  );
};
