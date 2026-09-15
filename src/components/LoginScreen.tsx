import { useState, useEffect, type FormEvent } from 'react';
import { Sparkles, Wifi, WifiOff, Loader2, ArrowRight } from 'lucide-react';
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
        
        biz = await createBusiness(codigo, 'Salón Demo');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-400 to-rose-400 shadow-lg shadow-rose-300/40 mb-4">
            <Sparkles className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Nail World</h1>
          <p className="text-slate-500 mt-2 text-sm">Gestión inteligente de salones</p>
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

<form onSubmit={handleSubmit} className="space-y-4">
  {/* Input */}
  <div>
    <label htmlFor="businessId" className="block text-sm font-medium text-slate-600 mb-2">
      ID del Negocio
    </label>
    <input
      id="businessId"
      type="text"
      value={businessId}
      onChange={(e) => setBusinessId(e.target.value)}
      placeholder="Ej: NAIL01"
      className="w-full px-4 py-4 text-lg font-mono uppercase tracking-wider bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all shadow-sm"
      autoFocus
      disabled={!!submittingRole}
    />
  </div>

  {/* Buttons */}
  <div className="space-y-3 pt-2">
    <button
      type="button"
      onClick={() => handleLogin('reception')}
      disabled={!!submittingRole}
      className="w-full py-4 bg-rose-400 hover:bg-rose-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
    >
      {submittingRole === 'reception' ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          Ingresar como Recepción
          <ArrowRight className="w-5 h-5" />
        </>
      )}
    </button>

    <button
      type="button"
      onClick={() => handleLogin('owner')}
      disabled={!!submittingRole}
      className="action-control action-surface w-full py-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-slate-700 font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
    >
      {submittingRole === 'owner' ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          Ingresar como Administrador
          <ArrowRight className="w-5 h-5" />
        </>
      )}
    </button>
  </div>
</form>

<p className="text-center text-xs text-slate-500 mt-6">
  Demo: usa <span className="font-mono text-rose-400 font-bold">NAIL01</span> para entrar
</p>