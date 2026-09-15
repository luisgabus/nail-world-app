import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useApp } from '@/lib/store';

export function ToastContainer() {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? XCircle : Info;
        const bg = toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-primary';
        return (
          <div
            key={toast.id}
            className={`${bg} text-slate-900 rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 animate-slideUp pointer-events-auto max-w-md mx-auto`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            <button onClick={() => dismissToast(toast.id)} className="text-white/70 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
