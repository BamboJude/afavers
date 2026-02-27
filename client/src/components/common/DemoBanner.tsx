import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../store/languageStore';

export const DemoBanner = () => {
  const isDemo = useAuthStore((s) => s.isDemo);
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (!isDemo) return null;

  return (
    <div className="bg-amber-400 text-amber-900 text-sm font-medium text-center py-2 px-4 flex items-center justify-center gap-3 flex-wrap">
      <span>{t('demoBannerMsg')}</span>
      <button
        onClick={() => navigate('/register')}
        className="underline font-semibold hover:text-amber-700 transition whitespace-nowrap"
      >
        {t('createFreeAccount')}
      </button>
    </div>
  );
};
