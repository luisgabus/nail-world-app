import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Business, SyncStatus } from './types';
import { subscribeToSync, initSyncWatcher, syncNow } from './sync';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppState {
  business: Business | null;
  role: 'admin' | 'owner' | null;
  syncStatus: SyncStatus;
  pendingCount: number;
  toasts: Toast[];
  setBusiness: (b: Business | null) => void;
  setRole: (r: 'admin' | 'owner' | null) => void;
  triggerSync: () => void;
  showToast: (message: string, type?: Toast['type']) => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppState | null>(null);

const STORAGE_KEY = 'nail_world_session';

interface StoredSession {
  business: Business;
  role: 'admin' | 'owner';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [business, setBusinessState] = useState<Business | null>(null);
  const [role, setRoleState] = useState<'admin' | 'owner' | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Función helper segura para IDs de Toast
  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 9);
  };

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  }, [dismissToast]);

  // 1. Cargar sesión inicial al montar con validación defensiva y limpieza de legado
  useEffect(() => {
    // Eliminar la sesión obsoleta si existe en el navegador del usuario
    localStorage.removeItem('carwash_session');

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const session = JSON.parse(stored) as unknown;
      if (
        typeof session === 'object' &&
        session !== null &&
        'business' in session &&
        'role' in session &&
        (session as StoredSession).business &&
        typeof (session as StoredSession).business === 'object' &&
        ['admin', 'owner'].includes((session as StoredSession).role)
      ) {
        const validSession = session as StoredSession;
        setBusinessState(validSession.business);
        setRoleState(validSession.role);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // 2. Persistencia centralizada de sesión en localStorage
  useEffect(() => {
    if (business && role) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ business, role }));
    } else if (!business || !role) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [business, role]);

  // 3. Sincronización del watcher
  useEffect(() => {
    const unsub = subscribeToSync((status, count) => {
      setSyncStatus(status);
      setPendingCount(count);
    });
    const currentBusinessId = business?.id ?? null;
    initSyncWatcher(() => currentBusinessId);
    return unsub;
  }, [business?.id]);

  const setBusiness = useCallback((b: Business | null) => {
    setBusinessState(b);
    if (!b) setRoleState(null);
  }, []);

  const setRole = useCallback((r: 'admin' | 'owner' | null) => {
    setRoleState(r);
  }, []);

  const triggerSync = useCallback(() => {
    if (business) syncNow(business.id);
  }, [business]);

  return (
    <AppContext.Provider
      value={{
        business,
        role,
        syncStatus,
        pendingCount,
        toasts,
        setBusiness,
        setRole,
        triggerSync,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe ser usado dentro de un AppProvider');
  return ctx;
}