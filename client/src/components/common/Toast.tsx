import { useToastStore } from '../../store/toastStore';

const TYPE_STYLES = {
  success: 'bg-gray-900 text-white',
  error:   'bg-red-600 text-white',
  info:    'bg-gray-700 text-white',
};

const TYPE_ICONS = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
};

export const ToastContainer = () => {
  const { toasts, remove } = useToastStore();
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-6 z-[200] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium animate-fade-in pointer-events-auto ${TYPE_STYLES[toast.type]}`}
        >
          <span className="text-xs opacity-70">{TYPE_ICONS[toast.type]}</span>
          <span>{toast.message}</span>
          <button
            onClick={() => remove(toast.id)}
            className="opacity-50 hover:opacity-100 transition ml-1 text-xs leading-none"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
