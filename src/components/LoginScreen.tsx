import React, { useState } from 'react';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
// IMPORTANTE: Asegúrate de que la ruta de importación de supabase coincida con la de tu proyecto
import { supabase } from '@/lib/supabase'; 

interface LoginScreenProps {
  // Mantenemos la firma original para no romper el componente padre
  onLogin?: (businessId: string, role: 'owner' | 'reception', password: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submittingRole, setSubmittingRole] = useState<'owner' | 'reception' | null>(null);
  const [error, setError] = useState('');

  const handleLogin = async (role: 'owner' | 'reception') => {
    if (!email.trim() || !password.trim()) {
      setError('Por favor ingresa tu correo y contraseña');
      return;
    }
    
    setSubmittingRole(role);
    setError('');
    
    try {
      // 1. Autenticación criptográfica con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (authError) throw new Error('Credenciales incorrectas. Verifica tu correo y contraseña.');
      if (!authData.user) throw new Error('Error al generar la sesión.');

      // 2. Obtener el negocio asociado (RLS garantiza que solo traiga el suyo)
      const { data: businessData, error: bizError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_auth_id', authData.user.id)
        .single();

      if (bizError || !businessData) {
        throw new Error('No se encontró un negocio asociado a este usuario.');
      }

      // 3. Enviamos el ID recuperado, el Rol y la Contraseña al componente padre
      if (typeof onLogin === 'function') {
        onLogin(businessData.id, role, password.trim());
      } 
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setSubmittingRole(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin('reception');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
        
        {/* Header / Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-400 text-white rounded-2xl shadow-lg shadow-rose-300/40 mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Nail World</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión inteligente de salones</p>
        </div>

        {/* Formulario Estructurado */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-600 mb-2">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full px-4 py-4 text-lg bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all shadow-sm"
                autoFocus
                disabled={!!submittingRole}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-600 mb-2">
                Contraseña de Acceso
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-4 text-lg bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all shadow-sm"
                disabled={!!submittingRole}
              />
            </div>
          </div>

          {/* Manejo de errores visuales */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {/* Botones */}
          <div className="space-y-3 pt-2">
            <button
              type="submit"
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

      </div>
    </div>
  );
}