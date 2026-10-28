import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { useApp, AppProvider } from '@/lib/store';
import { LoginScreen } from '@/components/LoginScreen';
import { AdminView } from '@/components/AdminView';
import { OwnerView } from '@/components/OwnerView';
import { PinPad } from '@/components/PinPad';
import { ToastContainer } from '@/components/Toast';
import { SuperAdminApp } from '../components/SuperAdminApp';

function AppContent() {
  const { business, role, setRole } = useApp();
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);

  // --- ESCUDO ANTI-ZOMBIES Y KILL SWITCH EN TIEMPO REAL ---
  useEffect(() => {
    if (business?.subscription_status === 'suspended') {
      setIsSuspended(true);
    } else {
      setIsSuspended(false);
    }

    if (business?.id) {
      const channel = supabase
        .channel('business_status_monitor')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'businesses',
          filter: `id=eq.${business.id}`
        }, (payload) => {
          if (payload.new.subscription_status === 'suspended') {
            setIsSuspended(true);
          } else if (payload.new.subscription_status === 'active') {
            setIsSuspended(false);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [business]);

  if (isSuspended) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl border border-red-500/30 text-center max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2">Servicio Suspendido</h1>
          <p className="text-slate-400 mb-6 text-sm">
            El acceso operativo a esta plataforma ha sido temporalmente restringido. Por favor, regulariza el estado de la cuenta para recuperar el servicio inmediatamente.
          </p>
          <button
            onClick={() => {
              setRole(null); 
              window.location.reload(); 
            }}
            className="w-full py-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 font-semibold rounded-xl transition-colors border border-red-500/30"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

 // 1. Si no hay empresa o rol activo, ir a la pantalla de correo/contraseña
  if (!business || !role) {
    return <LoginScreen />;
  }

  // 2. Si el sistema intenta abrir el Modo Dueño, activamos el filtro interno (PIN)
  if (role === 'owner') {
    if (!pinUnlocked) {
      if (!business.owner_pin) {
        // Si el negocio aún no tiene PIN configurado en BD, pasa directo
        return <OwnerView />;
      }
      return (
        <PinPad
          title="PIN del Dueño"
          expectedPin={business.owner_pin}
          onSuccess={() => setPinUnlocked(true)}
          onCancel={() => {
            // LA CLAVE: Si cancela el PIN, no lo echa de la app, lo devuelve al Piso
            setRole('admin'); 
          }}
        />
      );
    }
    return <OwnerView />;
  }

  // 3. El Modo Piso (AdminView) es la vista base por defecto para el rol 'admin'
  return <AdminView />;

  return <LoginScreen />;
}

export default function App({ incomingBusinessId }: { incomingBusinessId?: string }) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isSuperAdminRoute, setIsSuperAdminRoute] = useState(false);

useEffect(() => {
    setIsMounted(true);
    
    // 1. Verificación robusta para aislar el SuperAdmin
    if (window.location.pathname.startsWith('/admin')) {
      setIsSuperAdminRoute(true);
      return; 
    }
    
    // 2. Extraer el ID directamente de la URL (si el botón de la Landing Page lo envía por ahí)
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get('id') || params.get('tenant') || params.get('business');
    const finalBusinessId = incomingBusinessId || urlId;
    
    // 3. Lógica normal de salones
    if (finalBusinessId) {
      localStorage.setItem('gabsoft_tenant_id', finalBusinessId);
      setTenantId(finalBusinessId);
      // Limpiamos la URL para que se vea profesional y limpia
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const stored = localStorage.getItem('gabsoft_tenant_id');
      if (stored) setTenantId(stored);
    }
  }, [incomingBusinessId]);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
      </div>
    );
  }

  // =================================================================
  // EXCEPCIÓN SUPERADMIN: Renderizado aislado y seguro
  // =================================================================
if (isSuperAdminRoute) {
    return (
      <AppProvider>
        <SuperAdminApp />
        <ToastContainer />
      </AppProvider>
    );
  }

  if (!tenantId) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4 text-center">
        <ShieldAlert className="w-16 h-16 text-slate-600 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Acceso Inválido</h2>
        <p className="text-slate-400 mb-6 max-w-sm text-sm">
          No se ha especificado un identificador de negocio válido. Por favor, ingresa desde el enlace oficial.
        </p>
        <a href="https://gabsoftx.com" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl">
          Volver al Inicio
        </a>
      </div>
    );
  }

  return (
    <AppProvider>
      <AppContent />
      <ToastContainer />
    </AppProvider>
  );
}