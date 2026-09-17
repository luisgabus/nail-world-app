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
  const { business, role, setRole, setBusiness } = useApp();
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const location = useLocation();
  const isAdminRoute = location.pathname === '/admin';

  // Puente de conexión: Crea un negocio válido para romper el bucle
  const handleLogin = (businessId: string, selectedRole: 'owner' | 'reception') => {
    // Simulamos los datos del negocio para que el Store lo acepte como válido
    const mockBusiness = {
      id: businessId,
      name: 'Nail World Demo',
      owner_pin: '1234'
    } as any; 
    
    setBusiness(mockBusiness);
    setRole(selectedRole);
  };

  // 1. Si no hay empresa o rol seleccionado, ir a Login PASANDO la función handleLogin
  if (!business || !role) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // 2. Si la ruta es /admin y el usuario ya está autenticado
  if (isAdminRoute) {
    return <SuperAdminApp />;
  }

  // 3. Vista de Administrador / Recepción
  if (role === 'admin' || role === 'reception') {
    return <AdminView />;
  }

  // 4. Vista de Propietario con validación de PIN
  if (role === 'owner') {
    if (!pinUnlocked) {
      if (!business.owner_pin) {
        return <LoginScreen onLogin={handleLogin} />;
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

  return <LoginScreen onLogin={handleLogin} />;
} 