import { supabase } from './supabase';
import { dbGetAll, dbGet, dbPut, dbPutMany, dbDelete, dbCount, openDB, type StoreName } from './offline-db';
import { enqueueOperation, isOnline } from './sync';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  Business,
  Operator,
  VehicleCategory,
  Wash,
  WashItem,
  InventoryItem,
  InventoryMovement,
  DailyClosure,
  Expense,
  OperatorAdvance,
  PaymentConfig,
  SubscriptionChange,
  AdminProfile,
} from './types';

function uuid(): string {
  return crypto.randomUUID();
}

// ============ Business ============

export async function fetchBusinessByCodigo(codigo: string): Promise<Business | null> {
  if (isOnline()) {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', codigo.toUpperCase())
      .maybeSingle();
    if (error) {
      console.error('fetchBusinessByCodigo:', error.message);
      return null;
    }
    if (data) {
      await dbPut('businesses', data as Business);
      return data as Business;
    }
    return null;
  }
  const all = await dbGetAll<Business>('businesses');
  return all.find((b) => b.codigo === codigo.toUpperCase()) ?? null;
}

export async function updateBusiness(business: Business): Promise<Business> {
  await dbPut('businesses', business);
  if (isOnline()) {
    const { error } = await supabase.from('businesses').upsert(business);
    if (error) {
      console.error('updateBusiness error:', error.message);
      await enqueueOperation('businesses', 'update', business.id, business as unknown as Record<string, unknown>);
    }
  } else {
    await enqueueOperation('businesses', 'update', business.id, business as unknown as Record<string, unknown>);
  }
  return business;
}

export async function createBusiness(codigo: string, name: string): Promise<Business | null> {
  const newBiz = {
    id: codigo.toUpperCase(),
    name,
    owner_pin: '1234',
  };
  if (isOnline()) {
    const { data, error } = await supabase
      .from('businesses')
      .insert(newBiz)
      .select('*')
      .single();
    if (error) {
      console.error('createBusiness:', error.message);
      return null;
    }
    await dbPut('businesses', data as Business);
    return data as Business;
  }
  return null;
}

export interface NewBusinessInput {
  codigo: string;
  name: string;
  admin_name: string;
  email: string;
  phone?: string | null;
  city: string;
  address: string;
  plan_type: 'trial' | 'monthly' | 'annual';
}

const PLAN_DAYS: Record<NewBusinessInput['plan_type'], number> = {
  trial: 7,
  monthly: 30,
  annual: 365,
};

/** Creates a business with contact info, status 'active' and a billing date derived from the plan. */
export async function createBusinessFull(input: NewBusinessInput): Promise<Business> {
  const billing = new Date();
  billing.setDate(billing.getDate() + PLAN_DAYS[input.plan_type]);

  const payload = {
    id: input.codigo.trim().toUpperCase(),
    name: input.name.trim(),
    admin_name: input.admin_name.trim() || null,
    email: input.email.trim() || null,
    phone: input.phone?.trim() ? input.phone.trim() : null,
    city: input.city.trim() || null,
    address: input.address.trim() || null,
    owner_pin: '1234',
    plan_type: input.plan_type,
    subscription_status: 'active',
    next_billing_date: billing.toISOString(),
    grace_end_date: null,
  };

  const { data, error } = await supabase
    .from('businesses')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  await dbPut('businesses', data as Business);
  return data as Business;
}

/** Updates only basic business info. Never touches plan, status or billing dates. */
export async function updateBusinessInfo(
  businessId: string,
  info: {
    name: string;
    admin_name?: string | null;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
    address?: string | null;
  },
): Promise<Business> {
  const payload = {
    name: info.name.trim(),
    admin_name: info.admin_name?.trim() ? info.admin_name.trim() : null,
    email: info.email?.trim() ? info.email.trim() : null,
    phone: info.phone?.trim() ? info.phone.trim() : null,
    city: info.city?.trim() ? info.city.trim() : null,
    address: info.address?.trim() ? info.address.trim() : null,
  };
  const { data, error } = await supabase
    .from('businesses')
    .update(payload)
    .eq('id', businessId)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  await dbPut('businesses', data as Business);
  return data as Business;
}

// ============ Operators ============

export async function fetchOperators(businessId: string): Promise<Operator[]> {
  if (isOnline()) {
    const { data, error } = await supabase
      .from('operators')
      .select('*')
      .eq('business_id', businessId)
      .order('name');
    if (!error && data) {
      return data as Operator[];
    }
  }
  const local = await dbGetAll<Operator>('operators');
  return local.filter((o) => o.business_id === businessId).sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveOperator(op: Operator): Promise<Operator> {
  await dbPut('operators', op);
  if (isOnline()) {
    const { error } = await supabase.from('operators').upsert(op);
    if (error) await enqueueOperation('operators', 'insert', op.id, op as unknown as Record<string, unknown>);
  } else {
    await enqueueOperation('operators', 'insert', op.id, op as unknown as Record<string, unknown>);
  }
  return op;
}

export async function deleteOperator(id: string): Promise<void> {
  await dbDelete('operators', id);
  if (isOnline()) {
    const { error } = await supabase.from('operators').delete().eq('id', id);
    if (error) await enqueueOperation('operators', 'delete', id, {});
  } else {
    await enqueueOperation('operators', 'delete', id, {});
  }
}

// ============ Plate Lookup (Loyalty / Fidelity) ============

export interface PlateHistory {
  plate: string;
  visitCount: number;
  lastCategory?: VehicleCategory;
  customerName: string | null;
  customerPhone: string | null;
  categoryName: string | null;
  categoryId: string | null;
  categoryBasePrice: number | null;
}

export async function lookupPlateHistory(businessId: string, plate: string): Promise<PlateHistory | null> {
  const normalizedPlate = plate.trim().toUpperCase().replace(/\s/g, '');
  if (!normalizedPlate) return null;

  let historyWashes: Wash[] = [];
  if (isOnline()) {
    const { data, error } = await supabase
      .from('washes')
      .select('*')
      .eq('business_id', businessId)
      .ilike('plate', normalizedPlate)
      .order('created_at', { ascending: false });
    if (!error && data) {
      historyWashes = data as Wash[];
    }
  }
  if (historyWashes.length === 0) {
    const local = await dbGetAll<Wash>('washes');
    historyWashes = local
      .filter((w) => w.business_id === businessId && w.plate?.toUpperCase().replace(/\s/g, '') === normalizedPlate)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  if (historyWashes.length === 0) return null;

  const lastWash = historyWashes[0];
  return {
    plate: normalizedPlate,
    visitCount: historyWashes.length,
    customerName: lastWash.customer_name,
    customerPhone: lastWash.customer_phone,
    categoryName: lastWash.category_name,
    categoryId: lastWash.category_id,
    categoryBasePrice: lastWash.price,
  };
}

// ============ Vehicle Categories ============

export async function fetchCategories(businessId: string): Promise<VehicleCategory[]> {
  if (isOnline()) {
    const { data, error } = await supabase
      .from('vehicle_categories')
      .select('*')
      .eq('business_id', businessId)
      .order('sort_order');
    if (!error && data) {
      return data as VehicleCategory[];
    }
  }
  const local = await dbGetAll<VehicleCategory>('vehicle_categories');
  return local
    .filter((c) => c.business_id === businessId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function saveCategory(cat: VehicleCategory): Promise<VehicleCategory> {
  await dbPut('vehicle_categories', cat);
  if (isOnline()) {
    const { error } = await supabase.from('vehicle_categories').upsert(cat);
    if (error) await enqueueOperation('vehicle_categories', 'insert', cat.id, cat as unknown as Record<string, unknown>);
  } else {
    await enqueueOperation('vehicle_categories', 'insert', cat.id, cat as unknown as Record<string, unknown>);
  }
  return cat;
}

export async function deleteCategory(id: string): Promise<void> {
  await dbDelete('vehicle_categories', id);
  if (isOnline()) {
    const { error } = await supabase.from('vehicle_categories').delete().eq('id', id);
    if (error) await enqueueOperation('vehicle_categories', 'delete', id, {});
  } else {
    await enqueueOperation('vehicle_categories', 'delete', id, {});
  }
}

// ============ Washes ============

function getLocalDayRange(date: string): { start: string; end: string } {
  const start = new Date(date + 'T00:00:00');
  const end = new Date(date + 'T23:59:59.999');
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function fetchWashes(businessId: string, date?: string): Promise<Wash[]> {
  if (isOnline()) {
    let query = supabase.from('washes').select('*').eq('business_id', businessId);
    if (date) {
      const { start, end } = getLocalDayRange(date);
      query = query.gte('created_at', start).lte('created_at', end);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error && data) {
      const remote = data as Wash[];
      const local = await dbGetAll<Wash>('washes');
      const remoteIds = new Set(remote.map((w) => w.id));
      const localOnly = local.filter((w) => w.business_id === businessId && !remoteIds.has(w.id));
      let result = [...remote, ...localOnly];
      if (date) {
        result = result.filter((w) => w.created_at.startsWith(date));
      }
      return result.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
  }
  const local = await dbGetAll<Wash>('washes');
  let result = local.filter((w) => w.business_id === businessId);
  if (date) {
    result = result.filter((w) => w.created_at.startsWith(date));
  }
  return result.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function fetchWashesByDateRange(businessId: string, startDate: string, endDate: string): Promise<Wash[]> {
  if (isOnline()) {
    const { start, end } = getLocalDayRange(startDate);
    const endRange = getLocalDayRange(endDate).end;
    const { data, error } = await supabase
      .from('washes')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', start)
      .lte('created_at', endRange)
      .order('created_at', { ascending: false });
    if (!error && data) return data as Wash[];
  }
  const local = await dbGetAll<Wash>('washes');
  return local
    .filter((w) => w.business_id === businessId && w.created_at >= startDate && w.created_at <= endDate + 'T23:59:59')
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function saveWash(wash: Wash): Promise<Wash> {
  await dbPut('washes', wash);
  if (isOnline()) {
    const payload = { ...wash };
    const { error } = await supabase.from('washes').upsert(payload);
    if (error) {
      console.error('saveWash upsert error:', error.message);
      await enqueueOperation('washes', 'insert', wash.id, payload as unknown as Record<string, unknown>);
      throw new Error(error.message);
    }
  } else {
    await enqueueOperation('washes', 'insert', wash.id, wash as unknown as Record<string, unknown>);
  }
  return wash;
}

export async function updateWashStatus(
  washId: string,
  status: Wash['status'],
  extra?: Partial<Wash>,
): Promise<void> {
  const updates: Record<string, unknown> = { status, ...extra };
  // Merge with existing local record to avoid overwriting with a partial object
  const existing = await dbGet<Wash>('washes', washId);
  if (existing) {
    await dbPut('washes', { ...existing, ...updates } as Wash);
  } else {
    await dbPut('washes', { id: washId, ...updates } as Wash);
  }
  if (isOnline()) {
    const { error } = await supabase.from('washes').update(updates).eq('id', washId);
    if (error) {
      console.error('updateWashStatus error:', error.message);
      await enqueueOperation('washes', 'update', washId, updates);
    }
  } else {
    await enqueueOperation('washes', 'update', washId, updates);
  }
}

export function subscribeToWashes(
  businessId: string,
  onChange: () => void,
): RealtimeChannel {
  return supabase
    .channel(`washes:${businessId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'washes', filter: `business_id=eq.${businessId}` },
      () => onChange(),
    )
    .subscribe();
}

export async function getNextTicketNumber(businessId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const washes = await fetchWashes(businessId, today);
  if (washes.length === 0) return 1;
  return Math.max(...washes.map((w) => w.ticket_number)) + 1;
}

// ============ Inventory ============

export async function fetchInventoryItems(businessId: string): Promise<InventoryItem[]> {
  if (isOnline()) {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('business_id', businessId)
      .order('name');
    if (!error && data) return data as InventoryItem[];
  }
  const local = await dbGetAll<InventoryItem>('inventory_items');
  return local.filter((i) => i.business_id === businessId).sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveInventoryItem(item: InventoryItem): Promise<InventoryItem> {
  await dbPut('inventory_items', item);
  if (isOnline()) {
    const { error } = await supabase.from('inventory_items').upsert(item);
    if (error) await enqueueOperation('inventory_items', 'insert', item.id, item as unknown as Record<string, unknown>);
  } else {
    await enqueueOperation('inventory_items', 'insert', item.id, item as unknown as Record<string, unknown>);
  }
  return item;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await dbDelete('inventory_items', id);
  if (isOnline()) {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    if (error) await enqueueOperation('inventory_items', 'delete', id, {});
  } else {
    await enqueueOperation('inventory_items', 'delete', id, {});
  }
}

export async function addInventoryMovement(movement: InventoryMovement): Promise<void> {
  await dbPut('inventory_movements', movement);
  if (isOnline()) {
    const { error } = await supabase.from('inventory_movements').insert(movement);
    if (error) await enqueueOperation('inventory_movements', 'insert', movement.id, movement as unknown as Record<string, unknown>);
  } else {
    await enqueueOperation('inventory_movements', 'insert', movement.id, movement as unknown as Record<string, unknown>);
  }
}

export async function fetchInventoryMovements(businessId: string): Promise<InventoryMovement[]> {
  if (isOnline()) {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error && data) return data as InventoryMovement[];
  }
  const local = await dbGetAll<InventoryMovement>('inventory_movements');
  return local
    .filter((m) => m.business_id === businessId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 100);
}

// ============ Seeding ============

const DEFAULT_CATEGORIES = [
  { name: 'Manicura tradicional', base_price: 25000, icon: 'Sparkles', sort_order: 0 },
  { name: 'Pedicura tradicional', base_price: 25000, icon: 'Sparkles', sort_order: 1 },
  { name: 'Semipermanente', base_price: 50000, icon: 'Sparkles', sort_order: 2 },
  { name: 'Acrilicas', base_price: 100000, icon: 'Sparkles', sort_order: 3 },
];

export async function seedDefaultCategories(businessId: string): Promise<void> {
  const existing = await fetchCategories(businessId);
  if (existing.length > 0) return;

  for (const cat of DEFAULT_CATEGORIES) {
    const newCat: VehicleCategory = {
      id: uuid(),
      business_id: businessId,
      name: cat.name,
      base_price: cat.base_price,
      icon: cat.icon,
      sort_order: cat.sort_order,
      active: true,
      created_at: new Date().toISOString(),
    };
    await saveCategory(newCat);
  }
}

export async function seedDefaultOperators(businessId: string): Promise<void> {
  const existing = await fetchOperators(businessId);
  if (existing.length > 0) return;

  const defaults = ['servicio 1', 'servicio 2', 'servicio 3'];
  for (let i = 0; i < defaults.length; i++) {
    const op: Operator = {
      id: uuid(),
      business_id: businessId,
      name: defaults[i],
      active: true,
      role: 'servicio',
      phone: null,
      address: null,
      document_id: null,
      document_photo_url: null,
      payment_method: null,
      payment_account: null,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      on_shift_today: false,
      created_at: new Date().toISOString(),
    };
    await saveOperator(op);
  }
}

export async function seedDefaultInventory(businessId: string): Promise<void> {
  const existing = await fetchInventoryItems(businessId);
  if (existing.length > 0) return;

  const defaults = [
    { name: 'Shampoo Automotriz', unit: 'litros', quantity: 20, min_quantity: 5 },
    { name: 'Cera Pulidora', unit: 'unidades', quantity: 10, min_quantity: 3 },
    { name: 'Jabón servicio', unit: 'kilos', quantity: 15, min_quantity: 4 },
    { name: 'Paños Microfibra', unit: 'unidades', quantity: 50, min_quantity: 10 },
  { name: 'Desengrasante', unit: 'litros', quantity: 8, min_quantity: 3 },
  ];

  for (const item of defaults) {
    const inv: InventoryItem = {
      id: uuid(),
      business_id: businessId,
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
      min_quantity: item.min_quantity,
      created_at: new Date().toISOString(),
    };
    await saveInventoryItem(inv);
  }
}

// ============ Wash Items (additional services & consumables) ============

export async function fetchWashItems(washId: string): Promise<WashItem[]> {
  if (isOnline()) {
    const { data, error } = await supabase
      .from('wash_items')
      .select('*')
      .eq('wash_id', washId)
      .order('created_at', { ascending: true });
    if (!error && data) return data as WashItem[];
  }
  const local = await dbGetAll<WashItem>('wash_items');
  return local
    .filter((i) => i.wash_id === washId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function saveWashItems(items: WashItem[]): Promise<void> {
  if (items.length === 0) return;
  await dbPutMany('wash_items', items);
  if (isOnline()) {
    const { error } = await supabase.from('wash_items').insert(items);
    if (error) {
      console.error('saveWashItems error:', error.message);
      for (const item of items) {
        await enqueueOperation('wash_items', 'insert', item.id, item as unknown as Record<string, unknown>);
      }
    }
  } else {
    for (const item of items) {
      await enqueueOperation('wash_items', 'insert', item.id, item as unknown as Record<string, unknown>);
    }
  }
}

// ============ Expenses ============

export async function fetchExpenses(businessId: string, date?: string): Promise<Expense[]> {
  if (isOnline()) {
    let query = supabase.from('expenses').select('*').eq('business_id', businessId);
    if (date) {
      const start = new Date(date + 'T00:00:00');
      const end = new Date(date + 'T23:59:59');
      query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error && data) return data as Expense[];
  }
  const local = await dbGetAll<Expense>('expenses');
  let result = local.filter((e) => e.business_id === businessId);
  if (date) {
    result = result.filter((e) => e.created_at.startsWith(date));
  }
  return result.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function saveExpense(expense: Expense): Promise<Expense> {
  await dbPut('expenses', expense);
  if (isOnline()) {
    const { error } = await supabase.from('expenses').upsert(expense);
    if (error) await enqueueOperation('expenses', 'insert', expense.id, expense as unknown as Record<string, unknown>);
  } else {
    await enqueueOperation('expenses', 'insert', expense.id, expense as unknown as Record<string, unknown>);
  }
  return expense;
}

export async function deleteExpense(id: string): Promise<void> {
  await dbDelete('expenses', id);
  if (isOnline()) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) await enqueueOperation('expenses', 'delete', id, {});
  } else {
    await enqueueOperation('expenses', 'delete', id, {});
  }
}

// ============ Operator Advances (Vales / Adelantos) ============

export async function fetchOperatorAdvances(businessId: string, date?: string): Promise<OperatorAdvance[]> {
  if (isOnline()) {
    let query = supabase.from('operator_advances').select('*').eq('business_id', businessId);
    if (date) {
      const start = new Date(date + 'T00:00:00');
      const end = new Date(date + 'T23:59:59');
      query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error && data) return data as OperatorAdvance[];
  }
  const local = await dbGetAll<OperatorAdvance>('operator_advances');
  let result = local.filter((a) => a.business_id === businessId);
  if (date) {
    result = result.filter((a) => a.created_at.startsWith(date));
  }
  return result.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function fetchUnsettledAdvances(operatorId: string): Promise<OperatorAdvance[]> {
  if (isOnline()) {
    const { data, error } = await supabase
      .from('operator_advances')
      .select('*')
      .eq('operator_id', operatorId)
      .eq('settled', false)
      .order('created_at', { ascending: true });
    if (!error && data) return data as OperatorAdvance[];
  }
  const local = await dbGetAll<OperatorAdvance>('operator_advances');
  return local
    .filter((a) => a.operator_id === operatorId && !a.settled)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function saveOperatorAdvance(advance: OperatorAdvance): Promise<OperatorAdvance> {
  await dbPut('operator_advances', advance);
  if (isOnline()) {
    const { error } = await supabase.from('operator_advances').upsert(advance);
    if (error) await enqueueOperation('operator_advances', 'insert', advance.id, advance as unknown as Record<string, unknown>);
  } else {
    await enqueueOperation('operator_advances', 'insert', advance.id, advance as unknown as Record<string, unknown>);
  }
  return advance;
}

export async function deleteOperatorAdvance(id: string): Promise<void> {
  await dbDelete('operator_advances', id);
  if (isOnline()) {
    const { error } = await supabase.from('operator_advances').delete().eq('id', id);
    if (error) await enqueueOperation('operator_advances', 'delete', id, {});
  } else {
    await enqueueOperation('operator_advances', 'delete', id, {});
  }
}

export async function settleAdvances(advanceIds: string[]): Promise<void> {
  if (advanceIds.length === 0) return;
  for (const id of advanceIds) {
    const existing = await dbGet<OperatorAdvance>('operator_advances', id);
    if (existing) {
      const settled = { ...existing, settled: true };
      await dbPut('operator_advances', settled);
    }
  }
  if (isOnline()) {
    const { error } = await supabase
      .from('operator_advances')
      .update({ settled: true })
      .in('id', advanceIds);
    if (error) {
      for (const id of advanceIds) {
        await enqueueOperation('operator_advances', 'update', id, { settled: true });
      }
    }
  } else {
    for (const id of advanceIds) {
      await enqueueOperation('operator_advances', 'update', id, { settled: true });
    }
  }
}

// ============ Daily Closures ============

export async function saveDailyClosure(closure: DailyClosure): Promise<DailyClosure> {
  await dbPut('daily_closures', closure);
  if (isOnline()) {
    const { error } = await supabase.from('daily_closures').upsert(closure);
    if (error) {
      console.error('saveDailyClosure error:', error.message);
      await enqueueOperation('daily_closures', 'insert', closure.id, closure as unknown as Record<string, unknown>);
    }
  } else {
    await enqueueOperation('daily_closures', 'insert', closure.id, closure as unknown as Record<string, unknown>);
  }
  return closure;
}

export async function fetchDailyClosures(businessId: string): Promise<DailyClosure[]> {
  if (isOnline()) {
    const { data, error } = await supabase
      .from('daily_closures')
      .select('*')
      .eq('business_id', businessId)
      .order('closure_date', { ascending: false });
    if (!error && data) {
      return data as DailyClosure[];
    }
  }
  const local = await dbGetAll<DailyClosure>('daily_closures');
  return local
    .filter((c) => c.business_id === businessId)
    .sort((a, b) => b.closure_date.localeCompare(a.closure_date));
}

export async function fetchLastClosure(businessId: string): Promise<DailyClosure | null> {
  const all = await fetchDailyClosures(businessId);
  return all.length > 0 ? all[0] : null;
}

// ============ SuperAdmin: Business Management ============

export async function fetchAllBusinesses(): Promise<Business[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchAllBusinesses:', error.message);
    return [];
  }
  return (data ?? []) as Business[];
}

export async function updateBusinessSubscription(params: {
  businessId: string;
  planType?: string;
  subscriptionStatus?: string;
  nextBillingDate?: string | null;
  graceEndDate?: string | null;
  changedBy?: string;
  note?: string;
}): Promise<void> {
  const rpcParams: Record<string, unknown> = {
    p_business_id: params.businessId,
    p_changed_by: params.changedBy ?? 'admin',
  };
  if (params.planType !== undefined) rpcParams.p_plan_type = params.planType;
  if (params.subscriptionStatus !== undefined) rpcParams.p_subscription_status = params.subscriptionStatus;
  if (params.nextBillingDate !== undefined) rpcParams.p_next_billing_date = params.nextBillingDate;
  if (params.graceEndDate !== undefined) rpcParams.p_grace_end_date = params.graceEndDate;
  if (params.note !== undefined) rpcParams.p_note = params.note;

  const { error } = await supabase.rpc('update_business_subscription', rpcParams);
  if (error) throw new Error(error.message);
}

export async function fetchSubscriptionChanges(businessId: string): Promise<SubscriptionChange[]> {
  const { data, error } = await supabase
    .from('subscription_changes')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchSubscriptionChanges:', error.message);
    return [];
  }
  return (data ?? []) as SubscriptionChange[];
}

// ============ SuperAdmin: Payment Config ============

export async function fetchPaymentConfig(): Promise<PaymentConfig | null> {
  const { data, error } = await supabase
    .from('payment_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    console.error('fetchPaymentConfig:', error.message);
    return null;
  }
  return data as PaymentConfig | null;
}

export async function updatePaymentConfig(config: Partial<PaymentConfig>): Promise<void> {
  const { error } = await supabase
    .from('payment_config')
    .upsert({ id: 1, ...config }, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

// ============ SuperAdmin: Admin Profile ============

export async function fetchAdminProfile(): Promise<AdminProfile | null> {
  const { data, error } = await supabase
    .from('admin_profiles')
    .select('*')
    .maybeSingle();
  if (error) {
    console.error('fetchAdminProfile:', error.message);
    return null;
  }
  return data as AdminProfile | null;
}

export { uuid };
