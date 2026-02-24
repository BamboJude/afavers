import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export const DemoBanner = () => {
  const isDemo = useAuthStore((s) => s.isDemo);
  const navigate = useNavigate();

  if (!isDemo) return null;

  return (
    <div className="bg-amber-400 text-amber-900 text-sm font-medium text-center py-2 px-4 flex items-center justify-center gap-3 flex-wrap">
      <span>Demo mode — explore with sample data. Nothing is saved permanently.</span>
      <button
        onClick={() => navigate('/register')}
        className="underline font-semibold hover:text-amber-700 transition whitespace-nowrap"
      >
        Create your free account →
      </button>
    </div>
  );
};
