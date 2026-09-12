import { useState, useEffect, type FormEvent } from 'react';
import { Car, Wifi, WifiOff, Loader2, ArrowRight } from 'lucide-react';
import { useApp } from '@/lib/store';
import { fetchBusinessByCodigo, createBusiness, seedDefaultCategories, seedDefaultOperators, seedDefaultInventory } from '@/lib/data';
import { isOnline } from '@/lib/sync';

export function LoginScreen() {
  const { setBusiness, setRole } = useApp();
  const [businessId, setBusinessId] = useState('');
  const [submittingRole, setSubmittingRole] = useState<'admin' | 'owner' | null>(null);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const update = () => setOnline(isOnline());
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const handleLogin = async (selectedRole: 'admin' | 'owner') => {
    if (submittingRole) return;
    
    const codigo = businessId.trim().toUpperCase();
    if (!codigo) {
      setError('Ingresa el ID del negocio');
      return;
    }

    setSubmittingRole(selectedRole);
    setError('');

    try {
      let biz = await fetchBusinessByCodigo(codigo);
      let isNew = false;

      if (!biz) {
        if (!isOnline()) {
          setError('Sin conexión. No se puede crear el negocio offline.');
          setSubmittingRole(null);
          return;
        }
        
        biz = await createBusiness(codigo, 'Lavadero Demo');
        if (!biz) {
          setError('No se pudo crear el negocio. Intenta de nuevo.');
          setSubmittingRole(null);
          return;
        }
        isNew = true;
      }

      // Inicializar datos predeterminados solo si el negocio es recién creado
      if (isNew) {
        await Promise.all([
          seedDefaultCategories(biz.id),
          seedDefaultOperators(biz.id),
          seedDefaultInventory(biz.id),
        ]);
      }

      setBusiness(biz);
      setRole(selectedRole);
    } catch (err) {
      setError('Ocurrió un error al iniciar sesión. Intenta nuevamente.');
    } finally {
      setSubmittingRole(null);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleLogin('admin');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-500 shadow-lg shadow-blue-500/30 mb-4">
            <Car className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">CarWash Pro</h1>
          <p className="text-slate-500 mt-2 text-sm">Gestión inteligente de lavaderos</p>
        </div>

        {/* Card */}
        <div className="bg-white backdrop-blur-xl rounded-3xl border border-[#E2E8F0] p-6 shadow-2xl">
          {/* Connection indicator */}
          <div className="flex items-center justify-end gap-2 mb-4">
            {online ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <Wifi className="w-3.5 h-3.5" /> En línea
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                <WifiOff className="w-3.5 h-3.5" /> Sin conexión (modo offline)
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Input */}
            <label htmlFor="businessId" className="block text-sm font-medium text-slate-600 mb-2">
              ID del Negocio
            </label>
            <input
              id="businessId"
              type="text"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              placeholder="Ej: LAV01"
              className="w-full px-4 py-4 text-lg font-mono uppercase tracking-wider bg-white border border-[#E2E8F0] shadow-sm rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-200 focus:ring-2 focus:ring-blue-500/20 transition-all"
              autoFocus
              disabled={!!submittingRole}
            />

            {error && (
              <p className="text-red-600 text-sm mt-3 animate-pulse">{error}</p>
            )}

            {/* Buttons */}
            <div className="mt-6 space-y-3">
              <button
                type="submit"
                disabled={!!submittingRole}
                className="action-control w-full py-4 bg-gradient-to-br from-blue-600 to-blue-500 border border-blue-200/80 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
              >
                {submittingRole === 'admin' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Ingresar como Piso
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => handleLogin('owner')}
                disabled={!!submittingRole}
                className="action-control action-surface w-full py-4 border border-blue-200/80 text-slate-700 font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
              >
                {submittingRole === 'owner' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Ingresar como Dueño
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            Demo: usa <span className="font-mono text-blue-600 font-bold">LAV01</span> para entrar
          </p>
        </div>
      </div>
    </div>
  );
}