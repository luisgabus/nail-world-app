import { useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useApp, AppProvider } from '@/lib/store';
import { ClientRegistration } from '@/components/ClientRegistration';
import { LoginScreen } from '@/components/LoginScreen';
import { AdminView } from '@/components/AdminView';
import { OwnerView } from '@/components/OwnerView';
import { PinPad } from '@/components/PinPad';
import { ToastContainer } from '@/components/Toast';
import { SuperAdminApp } from '@/components/SuperAdminApp';

function AppContent() {
  const { business, role, setRole } = useApp();
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const location = useLocation();
  const isAdminRoute = location.pathname === '/admin';

  // 1. Si no hay empresa o rol seleccionado, ir a Login (incluso si está en /admin)
  if (!business || !role) {
    return <LoginScreen />;
  }

  // 2. Si la ruta es /admin y el usuario ya está autenticado, renderizar SuperAdminApp
  if (isAdminRoute) {
    return <SuperAdminApp />;
  }

  // 3. Vista de Administrador / Recepción / Operador
  if (role === 'admin' || role === 'reception') {
    return <AdminView />;
  }

  // 4. Vista de Propietario con validación de PIN
  if (role === 'owner') {
    if (!pinUnlocked) {
      if (!business.owner_pin) {
        // Si no hay PIN configurado en la empresa, regresa a Login por seguridad
        return <LoginScreen />;
      }
      return (
        <PinPad
          title="PIN del Dueño"
          expectedPin={business.owner_pin}
          onSuccess={() => setPinUnlocked(true)}
          onCancel={() => setRole(null)}
        />
      );
    }
    return <OwnerView />;
  }

  // Fallback de seguridad
  return <LoginScreen />;
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
      <ToastContainer />
    </AppProvider>
  );
}