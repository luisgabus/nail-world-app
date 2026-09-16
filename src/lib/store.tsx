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
  role: 'admin' | 'owner' | 'reception' | null;
  syncStatus: SyncStatus;
  pendingCount: number;
  toasts: Toast[];
  setBusiness: (b: Business | null) => void;
  setRole: (r: 'admin' | 'owner' | 'reception' | null) => void;
  triggerSync: () => void;
  showToast: (message: string, type?: Toast['type']) => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppState | null>(null);

const STORAGE_KEY = 'nail_world_session';

interface StoredSession {
  business: Business;
  role: 'admin' | 'owner' | 'reception';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [business, setBusinessState] = useState<Business | null>(null);
  const [role, setRoleState] = useState<'admin' | 'owner' | 'reception' | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

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

  useEffect(() => {
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
        ['admin', 'owner', 'reception'].includes((session as StoredSession).role)
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

  useEffect(() => {
    if (business && role) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ business, role }));
    } else if (!business || !role) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [business, role]);

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

  const setRole = useCallback((r: 'admin' | 'owner' | 'reception' | null) => {
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