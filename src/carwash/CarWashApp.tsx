import { useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useApp, AppProvider } from '@/lib/store';
import { supabase } from '@/lib/supabase'; // <-- AGREGA ESTA LÍNEA OBLIGATORIAMENTE
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

// Puente de conexión real a Supabase con escudo de contraseña y protección de espacios
  const handleLogin = async (businessId: string, selectedRole: 'owner' | 'reception', password: string) => {
    try {
      // Limpiamos espacios accidentales al inicio o al final
      const cleanId = businessId.trim();
      const cleanPassword = password.trim();

      // 1. Consultar el negocio cruzando el ID/Nombre y la contraseña exacta
      const { data: biz, error: dbError } = await supabase
        .from('businesses')
        .select('*')
        // Envolvemos el valor en comillas dobles para que el intérprete lea espacios correctamente
        .or(`codigo.ilike."${cleanId}",name.ilike."${cleanId}`)
        .eq('access_password', cleanPassword) // <-- EL ESCUDO
        .limit(1)
        .maybeSingle();

      if (dbError || !biz) {
        alert('Credenciales incorrectas. Verifica el código de tu negocio y la contraseña.');
        return;
      }

      // 2. ESCUDO DE SEGMENTACIÓN: Validar que pertenezca a Nail World
      if (biz.demo_selected && biz.demo_selected !== 'Nail World') { // Verifica que el texto coincida con lo que guardas en la BD
        alert('Este negocio está registrado para CarWash. Por favor ingresa en su plataforma correspondiente.');
        return;
      }

      // 3. Conceder acceso
      setBusiness(biz);
      setRole(selectedRole);
      
    } catch (err) {
      alert('Ocurrió un error al verificar las credenciales. Intenta nuevamente.');
    }
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

export default function CarWashApp() {
  return (
    <AppProvider>
      <AppContent />
      <ToastContainer />
    </AppProvider>
  );
}