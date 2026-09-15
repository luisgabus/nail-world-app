import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  RefreshCw, AlertCircle, Eye, LogOut, ArrowLeft, 
  Save, Building2, User, KeyRound, ShieldAlert 
} from 'lucide-react';

// Tipos estrictos
type AdminView = 'login' | 'dashboard' | 'business_detail' | 'pricing';
type SubscriptionStatus = 'active' | 'suspended' | 'trial' | 'expired';
type PlanType = 'monthly' | 'annual';

interface Business {
  id: string;
  codigo: string;
  name: string;
  subdomain: string;
  email: string;
  phone?: string;
  city?: string;
  address?: string;
  plan_type: PlanType;
  subscription_status: SubscriptionStatus;
  created_at: string;
  next_billing_date?: string;
  qr_image_url?: string;
}

interface PlatformPricing {
  id?: string;
  monthly_price: number;
  annual_price: number;
  nequi_number: string;
  bank_account: string;
  bank_name: string;
  account_type: string;
  holder_name: string;
  holder_id: string;
}

// Utilidades seguras
function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addMonthsClamped(date: Date, months: number): Date {
  const result = new Date(date);
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, lastDay));
  return result;
}

function isSafeHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function SuperAdminApp() {
  const [view, setView] = useState<AdminView>('login');
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Estado de sesión
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Datos
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [changesLoading, setChangesLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Notificaciones
  const [toastMessage, setToastMessage] = useState('');
  const timeoutRef = useRef<number | null>(null);
  const detailRequestRef = useRef(0);
  const initialized = useRef(false);

  const [pricing, setPricing] = useState<PlatformPricing>({
    monthly_price: 30000,
    annual_price: 300000,
    nequi_number: '',
    bank_account: '',
    bank_name: '',
    account_type: 'Ahorros',
    holder_name: '',
    holder_id: ''
  });

  const notify = useCallback((message: string) => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    setToastMessage(message);
    timeoutRef.current = window.setTimeout(() => setToastMessage(''), 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const fetchBusinesses = async (): Promise<Business[]> => {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const [bizs, configResponse] = await Promise.all([
        fetchBusinesses(),
        supabase.from('payment_config').select('*').maybeSingle()
      ]);
      setBusinesses(bizs);
      if (configResponse.data) setPricing(configResponse.data);
    } catch (err: any) {
      setDashboardError(err instanceof Error ? err.message : 'Fallo en la sincronización del panel.');
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const validateAndSetupAdminSession = async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('admin_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || profile?.role !== 'superadmin') {
      setAuthError('Credenciales insuficientes. Violación de acceso detectada.');
      await supabase.auth.signOut();
      setView('login');
      return false;
    }
    setView('dashboard');
    await loadDashboard();
    return true;
  };

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session) {
          await validateAndSetupAdminSession(session.user.id);
        } else {
          setView('login');
        }
      } catch (err) {
        if (!cancelled) setView('login');
      } finally {
        if (!cancelled) setLoading(false);
        initialized.current = true;
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (['SIGNED_OUT', 'USER_DELETED'].includes(event) || (!session && event === 'TOKEN_REFRESHED')) {
        setView('login');
        setBusinesses([]);
        setSelectedBusiness(null);
        return;
      }
      if (event === 'SIGNED_IN' && session && initialized.current) {
        setLoading(true);
        await validateAndSetupAdminSession(session.user.id);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadDashboard]);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) {
        await validateAndSetupAdminSession(data.session.user.id);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Fallo en la autenticación.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error('Error durante la desconexión:', err);
    } finally {
      setView('login');
      setEmail('');
      setPassword('');
      setBusinesses([]);
      setSelectedBusiness(null);
    }
  };

  const openBusinessDetail = async (biz: Business) => {
    const requestId = ++detailRequestRef.current;
    setSelectedBusiness(biz);
    setView('business_detail');
    setChangesLoading(true);
    try {
      // Simulación de carga de historial para la estructura
      if (requestId === detailRequestRef.current) {
         // setChanges(historial)
      }
    } catch (err) {
       // Manejo de error
    } finally {
      if (requestId === detailRequestRef.current) setChangesLoading(false);
    }
  };

  const handleRenew = async (months: number) => {
    if (!selectedBusiness || actionLoading) return;
    setActionLoading(true);
    
    try {
      const baseDate = parseDate(selectedBusiness.next_billing_date) || new Date();
      const newDate = addMonthsClamped(baseDate, months);
      
      const { data, error } = await supabase
        .from('businesses')
        .update({ next_billing_date: newDate.toISOString(), subscription_status: 'active' })
        .eq('id', selectedBusiness.id)
        .select()
        .single();
        
      if (error) throw error;
      setSelectedBusiness(data);
      notify('Renovación procesada con éxito.');
    } catch (err: any) {
      notify(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && view === 'login') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-xl p-8 border border-slate-700 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Núcleo SuperAdmin</h1>
            <p className="text-slate-400 text-sm">Protocolo de acceso restringido</p>
          </div>
          {authError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400 text-sm">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}
          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Identidad Operativa (Correo)</label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Secuencia de Seguridad</label>
              <div className="relative">
                <KeyRound className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-rose-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Inicializar Sesión'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {toastMessage}
        </div>
      )}
      
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-rose-400" />
          <h1 className="text-xl font-bold">Panel Central Administrativo</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setView('pricing')}
            className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Matriz de Pagos
          </button>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
            title="Desconexión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {view === 'dashboard' && (
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-white">Negocios Activos ({businesses.length})</h2>
            <button
              onClick={loadDashboard}
              disabled={dashboardLoading}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${dashboardLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {dashboardError && (
             <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 text-sm">
               <AlertCircle className="w-5 h-5" /> {dashboardError}
             </div>
          )}
          {dashboardLoading ? (
             <div className="py-20 flex flex-col items-center justify-center text-slate-400">
               <RefreshCw className="w-8 h-8 animate-spin text-rose-500 mb-3" />
             </div>
          ) : businesses.length === 0 ? (
             <div className="py-20 text-center bg-slate-800/50 rounded-xl border border-slate-700/50 text-slate-400">
               El registro está vacío.
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {businesses.map((b) => (
                <div key={b.id} onClick={() => openBusinessDetail(b)} className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-rose-500/50 transition-colors cursor-pointer">
                  <h3 className="text-lg font-medium text-white">{b.name}</h3>
                  <p className="text-sm text-slate-400 font-mono mb-4">{b.codigo}</p>
                  <div className="flex justify-between items-center border-t border-slate-700/50 pt-3">
                     <span className={`text-xs px-2 py-1 rounded-full ${b.subscription_status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {b.subscription_status}
                     </span>
                     <Eye className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {view === 'business_detail' && selectedBusiness && (
        <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
          <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" /> Retornar
          </button>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">{selectedBusiness.name}</h2>
            <div className="flex gap-4">
              <button 
                onClick={() => handleRenew(1)} 
                disabled={actionLoading}
                className="px-4 py-2 bg-primary hover:bg-rose-500 text-white text-sm rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                Renovar 1 Mes
              </button>
            </div>
            {changesLoading && <p className="text-sm text-slate-400 mt-4">Analizando registros históricos...</p>}
          </div>
        </main>
      )}
    </div>
  );
}