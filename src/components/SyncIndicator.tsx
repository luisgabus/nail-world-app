import { RefreshCw, Wifi, WifiOff, CloudOff, CheckCircle2, Loader2 } from 'lucide-react';
import { useApp } from '@/lib/store';

export function SyncIndicator() {
  const { syncStatus, pendingCount, triggerSync } = useApp();

  const config = {
    idle: { icon: CheckCircle2, color: 'text-emerald-600', label: 'Sincronizado' },
    syncing: { icon: Loader2, color: 'text-blue-600', label: 'Sincronizando...' },
    offline: { icon: CloudOff, color: 'text-amber-600', label: 'Sin conexión' },
    error: { icon: CloudOff, color: 'text-red-600', label: 'Error de sync' },
  };

  const { icon: Icon, color, label } = config[syncStatus];

  return (
    <button
      onClick={triggerSync}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-100 transition-all"
      title="Click para sincronizar"
    >
      <Icon className={`w-4 h-4 ${color} ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
      <span className="text-xs font-medium text-slate-600 hidden sm:inline">{label}</span>
      {pendingCount > 0 && (
        <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-mono">
          {pendingCount}
        </span>
      )}
      <RefreshCw className="w-3 h-3 text-slate-500" />
    </button>
  );
}
