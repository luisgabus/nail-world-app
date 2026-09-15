import React, { useState } from 'react';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (businessId: string, role: 'owner' | 'reception') => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [businessId, setBusinessId] = useState('');
  const [submittingRole, setSubmittingRole] = useState<'owner' | 'reception' | null>(null);

  const handleLogin = (role: 'owner' | 'reception') => {
    if (!businessId.trim()) {
      alert('Por favor ingresa el ID del Negocio');
      return;
    }
    setSubmittingRole(role);
    setTimeout(() => {
      onLogin(businessId.trim().toUpperCase(), role);
      setSubmittingRole(null);
    }, 400);
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <p className="text-center text-xs text-slate-500 pt-4">
            Demo: usa <span className="font-mono text-rose-400 font-bold">NAIL01</span> para entrar
          </p>
        </form>

      </div>
    </div>
  );
}