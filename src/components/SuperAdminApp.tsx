import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, CheckCircle, AlertCircle, Eye, LogOut, ArrowLeft, Save, Building2, User, KeyRound, ShieldAlert, Power, Calendar, CreditCard, Phone } from 'lucide-react';

type AdminView = 'login' | 'dashboard' | 'business_detail' | 'pricing';

interface Business {
  id: string;
  name: string;
  subdomain: string;
  created_at: string;
  subscription_status?: 'active' | 'suspended' | 'trial';
  suspension_reason?: string;
  plan_type?: 'mensual' | 'anual';
  expiration_date?: string;
  owner_name?: string;
  owner_phone?: string;
  owner_email?: string;
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

// Función utilitaria para ofuscar datos (Punto 2.2 de tu auditoría)
export function maskFinancialData(data: string | null | undefined): string {
  if (!data || data.length < 5) return data || '';
  return `**** **** **** ${data.slice(-4)}`;
}

export function SuperAdminApp() {
  const [view, setView] = useState<AdminView>('login');
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
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

  // --- NUEVOS ESTADOS DECLARADOS AQUÍ ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 9;

  // ESTADOS DEL KILL SWITCH Y AUDITORÍA
  const [suspensionModal, setSuspensionModal] = useState<{
    isOpen: boolean;
    targetStatus: 'active' | 'suspended';
    reason: string;
  } | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  const viewRef = useRef<AdminView>('login');
  viewRef.current = view;

  const fetchBusinesses = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('businesses')
        .select('*', { count: 'exact' });

      if (searchTerm.trim()) {
        query = query.or(`name.ilike.%${searchTerm.trim()}%,subdomain.ilike.%${searchTerm.trim()}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('subscription_status', statusFilter);
      }

      if (planFilter !== 'all') {
        query = query.eq('plan_type', planFilter);
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error: fetchError } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (fetchError) throw fetchError;

      setBusinesses(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching businesses:', err);
      setError('Error al cargar los negocios. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, planFilter, page]);

  const fetchPricing = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('platform_settings')
        .select('*')
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching pricing:', fetchError);
      } else if (data) {
        setPricing(data);
      }
    } catch (err: any) {
      console.error('Error loading settings:', err);
    }
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('admin_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile?.role === 'superadmin') {
          setView('dashboard');
          await Promise.all([fetchBusinesses(), fetchPricing()]);
        } else {
          setError('No tienes permisos de SuperAdmin.');
          await supabase.auth.signOut();
          setView('login');
        }
      } else {
        setView('login');
      }
    } catch (err: any) {
      console.error('Session check error:', err);
      setView('login');
    } finally {
      setLoading(false);
    }
  }, [fetchBusinesses, fetchPricing]);

  useEffect(() => {
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && viewRef.current === 'login') {
        checkSession();
      } else if (event === 'SIGNED_OUT' && !session) {
        setView('login');
        setBusinesses([]);
        setSelectedBusiness(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkSession]);

  useEffect(() => {
    if (view === 'dashboard') {
      fetchBusinesses();
    }
  }, [fetchBusinesses, view]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      if (data.session) {
        const { data: profile } = await supabase
          .from('admin_profiles')
          .select('role')
          .eq('id', data.session.user.id)
          .single();

        if (profile?.role === 'superadmin') {
          setView('dashboard');
          await Promise.all([fetchBusinesses(), fetchPricing()]);
        } else {
          setError('Esta cuenta no tiene privilegios de Administrador del Sistema.');
          await supabase.auth.signOut();
        }
      }
    } catch (err: any) {
      console.error('Error interno en login de superadmin:', err);
      setError('Correo o contraseña inválidos. Por favor, verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.error('Error interno al ejecutar el cierre global:', err);
    } finally {
      setView('login');
    }
  };

  const handleSavePricing = async (updatedPricing: PlatformPricing) => {
    try {
      setSavingSection('pricing');
      const { error: saveError } = await supabase.from('platform_settings').upsert(updatedPricing);
      if (saveError) throw saveError;
      
      setPricing(updatedPricing);
      alert('Configuración guardada exitosamente.');
      setView('dashboard');
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSavingSection(null);
    }
  };

  // FUNCIÓN DE EJECUCIÓN CON AUDITORÍA (Punto 3 del Kill Switch)
  const executeSubscriptionChange = async () => {
    if (!suspensionModal || !selectedBusiness) return;
    
    setSavingSection('subscription');
    try {
      const { error: updateError } = await supabase
        .from('businesses')
        .update({ subscription_status: suspensionModal.targetStatus })
        .eq('id', selectedBusiness.id);
        
      if (updateError) throw updateError;

      const { data: { user } } = await supabase.auth.getUser();

      const { error: auditError } = await supabase
        .from('audit_subscription_changes')
        .insert({
          business_id: selectedBusiness.id,
          action: suspensionModal.targetStatus === 'suspended' ? 'suspend' : 'reactivate',
          admin_id: user?.id,
          reason: suspensionModal.reason.trim() || 'Sin justificación proporcionada'
        });

      if (auditError) console.error('Error silencioso en auditoría:', auditError);

      alert(`Negocio ${suspensionModal.targetStatus === 'suspended' ? 'suspendido' : 'reactivado'} correctamente`);
      
      const finalBusiness = { ...selectedBusiness, subscription_status: suspensionModal.targetStatus };
      setSelectedBusiness(finalBusiness);
      setBusinesses(prev => prev.map(b => b.id === finalBusiness.id ? finalBusiness : b));
      
      setSuspensionModal(null);
      
    } catch (err) {
      console.error('Error en cambio de suscripción:', err);
      alert('Error crítico al modificar el estado del negocio');
    } finally {
      setSavingSection(null);
    }
  };

  const handleUpdateBusiness = async (updates: Partial<Business>, changeReason?: string) => {
    if (!selectedBusiness) return;

    const mergedData = { ...selectedBusiness, ...updates };

    // --- VALIDACIONES DE COHERENCIA DE FECHAS ---
    if (mergedData.expiration_date) {
      const expDate = new Date(mergedData.expiration_date);
      const now = new Date();
      const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

      // Validar estado activo
      if (mergedData.subscription_status === 'active' && expDate <= now) {
        alert('Error: Un negocio activo debe tener una fecha de vencimiento futura.');
        return;
      }

      // Coherencia para Plan Mensual: advertir si excede los 45 días
      if (mergedData.plan_type === 'mensual' && diffDays > 45) {
        const confirmMensual = window.confirm(
          `Atención: Has asignado un plan Mensual pero la fecha vence en ${diffDays} días (más de 45 días). ¿Deseas guardar esta configuración?`
        );
        if (!confirmMensual) return;
      }

      // Coherencia para Plan Anual: advertir si difiere significativamente de 1 año (300 - 400 días)
      if (mergedData.plan_type === 'anual' && (diffDays < 300 || diffDays > 400)) {
        const confirmAnual = window.confirm(
          `Atención: Has asignado un plan Anual pero el período configurado es de ${diffDays} días. ¿Deseas guardar esta configuración?`
        );
        if (!confirmAnual) return;
      }
    }

    try {
      setLoading(true);

      // 1. Actualizar el registro del negocio
      const { data: updatedData, error: updateError } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', selectedBusiness.id)
        .select()
        .single();

      if (updateError) throw updateError;

      const finalBusiness = updatedData || mergedData;

      // 2. Registrar el evento en la tabla de historial
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('business_subscription_history').insert({
        business_id: finalBusiness.id,
        plan_type: finalBusiness.plan_type || 'mensual',
        status: finalBusiness.subscription_status || 'trial',
        start_date: new Date().toISOString(),
        end_date: finalBusiness.expiration_date,
        changed_by: user?.id,
        reason: changeReason || 'Modificación directa de plan/fecha desde el panel SuperAdmin'
      });

      setSelectedBusiness(finalBusiness);
      setBusinesses(prev => prev.map(b => b.id === finalBusiness.id ? finalBusiness : b));

      alert('Suscripción y fecha de corte actualizadas e independizadas en el historial.');
    } catch (err: any) {
      console.error('Error al actualizar negocio:', err);
      alert('Error al guardar en la base de datos: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch(status) {
      case 'active': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'suspended': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'trial': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch(status) {
      case 'active': return 'Activo';
      case 'suspended': return 'Suspendido';
      case 'trial': return 'Prueba';
      default: return 'Desconocido';
    }
  };

  if (loading && view === 'login') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-xl p-8 border border-slate-700 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Plataforma SuperAdmin</h1>
            <p className="text-slate-400 text-sm">Ingresa con tus credenciales administrativas</p>
          </div>
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400 text-sm">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Correo Electrónico</label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="admin@plataforma.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña</label>
              <div className="relative">
                <KeyRound className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="••••••••" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col relative">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-bold">Panel SuperAdmin</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setView('pricing')} className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
            Configuración de Pagos
          </button>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors" title="Cerrar Sesión">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {view === 'dashboard' && (
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Negocios Registrados</h2>
              <p className="text-sm text-slate-400">Total encontrados: {totalCount}</p>
            </div>
            <button onClick={fetchBusinesses} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
            <div className="md:col-span-2 relative">
              <input
                type="text"
                placeholder="Buscar por nombre o subdominio..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">Todos los Estados</option>
                <option value="trial">En Prueba</option>
                <option value="active">Activos</option>
                <option value="suspended">Suspendidos</option>
              </select>
            </div>

            <div>
              <select
                value={planFilter}
                onChange={(e) => {
                  setPlanFilter(e.target.value);
                  setPage(0);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">Todos los Planes</option>
                <option value="mensual">Mensual</option>
                <option value="anual">Anual</option>
              </select>
            </div>
          </div>

          {businesses.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-800">
              <p className="text-slate-400">No se encontraron negocios con los criterios seleccionados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {businesses.map((b) => (
                <div 
                  key={b.id} 
                  onClick={() => { setSelectedBusiness(b); setView('business_detail'); }}
                  className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-blue-500/50 transition-all cursor-pointer flex flex-col justify-between group shadow-lg"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors mb-1">{b.name}</h3>
                      <p className="text-sm text-slate-400 font-mono">{b.subdomain}</p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-medium border rounded-full ${getStatusColor(b.subscription_status)}`}>
                      {getStatusLabel(b.subscription_status || 'trial')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-700/50 text-xs text-slate-400">
                    <span>Plan: <strong className="text-slate-300 capitalize">{b.plan_type || 'mensual'}</strong></span>
                    <Eye className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalCount > PAGE_SIZE && (
            <div className="flex justify-between items-center pt-4 border-t border-slate-800 text-sm text-slate-400">
              <span>
                Mostrando {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(prev => prev - 1)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 rounded border border-slate-700 text-slate-200 transition-colors"
                >
                  Anterior
                </button>
                <button
                  disabled={(page + 1) * PAGE_SIZE >= totalCount}
                  onClick={() => setPage(prev => prev + 1)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 rounded border border-slate-700 text-slate-200 transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </main>
      )}

      {view === 'business_detail' && selectedBusiness && (
        <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
          <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" /> Volver al panel
          </button>
          
<div className="grid gap-6 grid-cols-1 md:grid-cols-3">
            <div className="md:col-span-3 bg-slate-800 border border-slate-700 rounded-xl p-6 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{selectedBusiness.name}</h2>
                <div className="flex gap-4 text-sm text-slate-400">
                  <span>ID: <code className="text-slate-300">{selectedBusiness.id.split('-')[0]}...</code></span>
                  <span>Subdominio: <code className="text-slate-300">{selectedBusiness.subdomain}</code></span>
                  <span>Alta: <code className="text-slate-300">{new Date(selectedBusiness.created_at).toLocaleDateString('es-CO')}</code></span>
                </div>
              </div>
              
              {/* BOTÓN KILL SWITCH ACTUALIZADO */}
              <button 
                onClick={() => setSuspensionModal({
                  isOpen: true,
                  targetStatus: selectedBusiness.subscription_status === 'suspended' ? 'active' : 'suspended',
                  reason: ''
                })}
                disabled={loading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedBusiness.subscription_status === 'suspended' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                }`}
              >
                <Power className="w-4 h-4" />
                {selectedBusiness.subscription_status === 'suspended' ? 'Reactivar Servicio' : 'Suspender Servicio'}
              </button>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-400" /> Estado de la Suscripción
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Plan Actual</label>
                  <select 
                    value={selectedBusiness.plan_type || 'mensual'}
                    onChange={(e) => {
                      const newPlan = e.target.value as 'mensual' | 'anual';
                      const newExp = new Date();
                      newExp.setDate(newExp.getDate() + (newPlan === 'anual' ? 365 : 30));
                      handleUpdateBusiness({ plan_type: newPlan, expiration_date: newExp.toISOString() });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
                  >
                    <option value="mensual">Mensual (+30 días)</option>
                    <option value="anual">Anual (+365 días)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Estado</label>
                  <select 
                    value={selectedBusiness.subscription_status || 'trial'}
                    onChange={(e) => {
                      const newStatus = e.target.value as 'active' | 'suspended' | 'trial';
                      const newExp = new Date();
                      if (newStatus === 'trial') {
                        newExp.setDate(newExp.getDate() + 15);
                      } else if (newStatus === 'active') {
                        newExp.setDate(newExp.getDate() + (selectedBusiness.plan_type === 'anual' ? 365 : 30));
                      }
                      handleUpdateBusiness({ 
                        subscription_status: newStatus,
                        ...(newStatus !== 'suspended' && { expiration_date: newExp.toISOString() })
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
                  >
                    <option value="trial">Período de Prueba</option>
                    <option value="active">Activo</option>
                    <option value="suspended">Suspendido (Moroso)</option>
                  </select>
                </div>

                {selectedBusiness.subscription_status === 'suspended' && (
                  <div className="col-span-2 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-400">
                      <strong>Motivo actual:</strong> {selectedBusiness.suspension_reason || 'Suspensión manual o motivo no especificado'}
                    </p>
                  </div>
                )}

                <div className="col-span-2 bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
                  <label className="block text-xs font-medium text-blue-400 mb-2">
                    ⚡ Calcular / Extender Vencimiento:
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => {
                        const newExp = new Date();
                        newExp.setDate(newExp.getDate() + 30);
                        handleUpdateBusiness({ expiration_date: newExp.toISOString(), subscription_status: 'active' });
                      }}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 py-1.5 px-3 rounded border border-slate-700 transition-colors">
                      +1 Mes (+30d)
                    </button>
                    <button type="button" onClick={() => {
                        const newExp = new Date();
                        newExp.setDate(newExp.getDate() + 365);
                        handleUpdateBusiness({ expiration_date: newExp.toISOString(), subscription_status: 'active', plan_type: 'anual' });
                      }}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 py-1.5 px-3 rounded border border-slate-700 transition-colors">
                      +1 Año (+365d)
                    </button>
                    <button type="button" onClick={() => {
                        const newExp = new Date();
                        newExp.setDate(newExp.getDate() + 15);
                        handleUpdateBusiness({ expiration_date: newExp.toISOString(), subscription_status: 'trial' });
                      }}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 py-1.5 px-3 rounded border border-slate-700 transition-colors">
                      +15d Prueba
                    </button>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Fecha de Corte Personalizada
                  </label>
                  <input 
                    type="date"
                    value={selectedBusiness.expiration_date ? selectedBusiness.expiration_date.split('T')[0] : ''}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      handleUpdateBusiness({ expiration_date: new Date(e.target.value).toISOString() });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" /> Contacto Principal
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Nombre del Titular</label>
                  <input 
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={selectedBusiness.owner_name || ''}
                    onBlur={(e) => handleUpdateBusiness({ owner_name: e.target.value })}
                    onChange={(e) => setSelectedBusiness({...selectedBusiness, owner_name: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Teléfono / WhatsApp</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text"
                      placeholder="Ej. 3001234567"
                      value={selectedBusiness.owner_phone || ''}
                      onBlur={(e) => handleUpdateBusiness({ owner_phone: e.target.value })}
                      onChange={(e) => setSelectedBusiness({...selectedBusiness, owner_phone: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN VISUAL DEL HISTORIAL DE CAMBIOS */}
            <div className="md:col-span-3 bg-slate-800 border border-slate-700 rounded-xl p-6 mt-2">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" /> Historial de Cambios de Suscripción
              </h3>
              <SubscriptionHistoryList businessId={selectedBusiness.id} />
            </div>

          </div>
        </main>
      )}

      {view === 'pricing' && (
        <PaymentConfigEditor 
          initialPricing={pricing} 
          onSave={handleSavePricing} 
          isSaving={savingSection === 'pricing'} 
          onCancel={() => setView('dashboard')} 
        />
      )}

      {/* COMPONENTE MODAL DE AUDITORÍA (Renderizado en la raíz del contenedor) */}
      {suspensionModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className={`p-4 border-b ${suspensionModal.targetStatus === 'suspended' ? 'bg-rose-900/20 border-rose-900/50' : 'bg-emerald-900/20 border-emerald-900/50'}`}>
              <h3 className={`text-lg font-bold ${suspensionModal.targetStatus === 'suspended' ? 'text-rose-400' : 'text-emerald-400'}`}>
                {suspensionModal.targetStatus === 'suspended' ? 'Advertencia de Suspensión' : 'Confirmar Reactivación'}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-slate-300">
                {suspensionModal.targetStatus === 'suspended' 
                  ? 'Estás a punto de cortar el acceso de este negocio a la plataforma. Los operarios y administradores locales no podrán ingresar al sistema hasta que sea reactivado.'
                  : 'El negocio recuperará el acceso total e inmediato a la plataforma.'}
              </p>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Motivo de la acción (Auditoría)
                </label>
                <input
                  type="text"
                  value={suspensionModal.reason}
                  onChange={(e) => setSuspensionModal({ ...suspensionModal, reason: e.target.value })}
                  placeholder={suspensionModal.targetStatus === 'suspended' ? 'Ej. Falta de pago, violación de términos...' : 'Ej. Pago recibido, regularización...'}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="p-4 bg-slate-900/50 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setSuspensionModal(null)}
                className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executeSubscriptionChange}
                disabled={savingSection === 'subscription'}
                className={`px-4 py-2 text-white rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  suspensionModal.targetStatus === 'suspended' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {savingSection === 'subscription' && (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                )}
                Confirmar Acción
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

interface PaymentConfigEditorProps {
  initialPricing: PlatformPricing;
  onSave: (pricing: PlatformPricing) => void;
  onCancel: () => void;
  loading?: boolean;
  isSaving?: boolean;
}

function PaymentConfigEditor({ initialPricing, onSave, onCancel, loading, isSaving }: PaymentConfigEditorProps) {
  const [formData, setFormData] = useState<PlatformPricing>(initialPricing);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name.includes('price') ? Number(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full">
      <button onClick={onCancel} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Volver al Dashboard
      </button>

      <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-4">Configuración de Precios y Pagos</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Precio Mensual ($)</label>
            <input type="number" name="monthly_price" value={formData.monthly_price} onChange={handleChange} required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Precio Anual ($)</label>
            <input type="number" name="annual_price" value={formData.annual_price} onChange={handleChange} required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
          </div>
        </div>

        <div className="border-t border-slate-700 pt-4 space-y-4">
          <h3 className="text-md font-semibold text-slate-200">Datos Bancarios para Recaudos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Número de Nequi</label>
              <input type="text" name="nequi_number" value={formData.nequi_number} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Banco</label>
              <input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Tipo de Cuenta</label>
              <select name="account_type" value={formData.account_type} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                <option value="Ahorros">Ahorros</option>
                <option value="Corriente">Corriente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Número de Cuenta</label>
              <input type="text" name="bank_account" value={formData.bank_account} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Nombre Titular</label>
              <input type="text" name="holder_name" value={formData.holder_name} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Identificación Titular (NIT/CC)</label>
              <input type="text" name="holder_id" value={formData.holder_id} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-200 transition-colors">Cancelar</button>
          <button type="submit" disabled={isSaving || loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50">
            {(isSaving || loading) ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </main>
  );
}

// SUBCOMPONENTE DE HISTORIAL DE SUSCRIPCIONES
function SubscriptionHistoryList({ businessId }: { businessId: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setLoadingHistory(true);
      const { data } = await supabase
        .from('business_subscription_history')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      
      setHistory(data || []);
      setLoadingHistory(false);
    }
    loadHistory();
  }, [businessId]);

  if (loadingHistory) return <p className="text-sm text-slate-400">Cargando historial...</p>;
  if (history.length === 0) return <p className="text-sm text-slate-500">No hay registros previos en el historial.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-700">
          <tr>
            <th className="p-2">Fecha Cambio</th>
            <th className="p-2">Plan</th>
            <th className="p-2">Estado</th>
            <th className="p-2">Vencimiento</th>
            <th className="p-2">Detalle / Motivo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {history.map((item) => (
            <tr key={item.id}>
              <td className="p-2 whitespace-nowrap">{new Date(item.created_at).toLocaleDateString()}</td>
              <td className="p-2 capitalize font-medium">{item.plan_type}</td>
              <td className="p-2 capitalize">{item.status}</td>
              <td className="p-2 whitespace-nowrap">
                {item.end_date ? new Date(item.end_date).toLocaleDateString() : 'N/A'}
              </td>
              <td className="p-2 text-slate-400">{item.reason || 'Sin motivo especificado'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}