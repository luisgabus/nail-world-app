import { supabase } from './supabase';
import { dbGetAll, dbPutMany, dbClear, dbCount, openDB, type StoreName } from './offline-db';
import type { SyncStatus, PendingOperation } from './types';

type Listener = (status: SyncStatus, pendingCount: number) => void;

let currentStatus: SyncStatus = 'idle';
let pendingCount = 0;
const listeners = new Set<Listener>();

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

export function getPendingCount(): number {
  return pendingCount;
}

export function subscribeToSync(listener: Listener): () => void {
  listeners.add(listener);
  listener(currentStatus, pendingCount);
  return () => listeners.delete(listener);
}

function notify() {
  for (const l of listeners) l(currentStatus, pendingCount);
}

export function isOnline(): boolean {
  return navigator.onLine;
}

async function refreshPendingCount() {
  pendingCount = await dbCount('pending_ops');
  notify();
}

export async function enqueueOperation(
  table: string,
  operation: 'insert' | 'update' | 'delete',
  recordId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const op: PendingOperation = {
    id: crypto.randomUUID(),
    table,
    operation,
    record_id: recordId,
    payload,
    created_at: new Date().toISOString(),
  };
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('pending_ops', 'readwrite');
    tx.objectStore('pending_ops').put(op);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  await refreshPendingCount();
}

const SYNC_TABLES: { table: string; store: StoreName }[] = [
  { table: 'businesses', store: 'businesses' },
  { table: 'operators', store: 'operators' },
  { table: 'categories', store: 'categories' },
  { table: 'washes', store: 'washes' },
  { table: 'inventory_items', store: 'inventory_items' },
  { table: 'inventory_movements', store: 'inventory_movements' },
  { table: 'daily_closures', store: 'daily_closures' },
];

export async function pullFromRemote(businessId: string): Promise<void> {
  for (const { table, store } of SYNC_TABLES) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('business_id', businessId);

    if (error) {
      console.error(`Pull error for ${table}:`, error.message);
      continue;
    }

    if (data && data.length > 0) {
      await dbClear(store);
      await dbPutMany(store, data as { id: string }[]);
    }
  }
}

export async function flushPending(): Promise<void> {
  const ops = await dbGetAll<PendingOperation>('pending_ops');
  if (ops.length === 0) return;

  const db = await openDB();
  const sorted = ops.sort((a, b) => a.created_at.localeCompare(b.created_at));
  const completed: string[] = [];

  for (const op of sorted) {
    try {
      if (op.operation === 'insert' || op.operation === 'update') {
        const { error } = await supabase.from(op.table).upsert(op.payload as Record<string, unknown>);
        if (error) {
          console.error(`Sync ${op.operation} ${op.table}:`, error.message);
          continue;
        }
      } else if (op.operation === 'delete') {
        const { error } = await supabase.from(op.table).delete().eq('id', op.record_id);
        if (error) {
          console.error(`Sync delete ${op.table}:`, error.message);
          continue;
        }
      }
      completed.push(op.id);
    } catch (err) {
      console.error('Sync op failed:', err);
      break;
    }
  }

  if (completed.length > 0) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('pending_ops', 'readwrite');
      for (const id of completed) tx.objectStore('pending_ops').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  await refreshPendingCount();
}

export async function syncNow(businessId: string): Promise<void> {
  if (!isOnline()) {
    currentStatus = 'offline';
    notify();
    return;
  }

  currentStatus = 'syncing';
  notify();

  try {
    await flushPending();
    await pullFromRemote(businessId);
    currentStatus = 'idle';
  } catch (err) {
    console.error('Sync failed:', err);
    currentStatus = 'error';
  }

  await refreshPendingCount();
}

let initialized = false;

export function initSyncWatcher(businessId: () => string | null) {
  if (initialized) return;
  initialized = true;

  const trySync = () => {
    const bid = businessId();
    if (bid && isOnline()) syncNow(bid);
    else {
      currentStatus = isOnline() ? 'idle' : 'offline';
      refreshPendingCount();
    }
  };

  window.addEventListener('online', trySync);
  window.addEventListener('offline', () => {
    currentStatus = 'offline';
    notify();
  });

  refreshPendingCount();
  trySync();
}
