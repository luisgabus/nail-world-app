import React, { useState } from 'react';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase'; 
import { useApp } from '@/lib/store';

export function LoginScreen() {
  const { setBusiness, setRole } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Por favor ingresa tu correo y contraseña');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // 1. Autenticación con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (authError) throw new Error('Credenciales incorrectas. Verifica tu correo y contraseña.');
      if (!authData.user) throw new Error('Error al generar la sesión.');

      // 2. Obtener el negocio asociado mediante el owner_auth_id
      const { data: businessData, error: bizError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_auth_id', authData.user.id)
        .single();

      if (bizError || !businessData) {
        throw new Error('No se encontró un negocio asociado a este usuario.');
      }

      // 3. Establecemos el negocio y asignamos el rol de 'owner' de manera directa
      setBusiness(businessData);
      setRole('admin');

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
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
        <form onSubmit={handleLogin} className="space-y-4">
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
                disabled={loading}
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
                disabled={loading}
              />
            </div>
          </div>

          {/* Manejo de errores visuales */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {/* Botón Único de Acceso */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-rose-400 hover:bg-rose-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Ingresar al Panel
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