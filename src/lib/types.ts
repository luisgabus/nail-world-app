export type WashStatus = 'en_espera' | 'en_servicio' | 'listo' | 'completado' | 'desistido';

export type PlanType = 'trial' | 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'grace' | 'suspended';

export interface Business {
  id: string;
  codigo: string;
  name: string;
  owner_pin: string;
  admin_name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  commission_rate: number;
  loyalty_enabled: boolean;
  loyalty_threshold: number;
  loyalty_reward_type: 'free' | 'discount';
  loyalty_discount_percent: number;
  plan_type: PlanType;
  subscription_status: SubscriptionStatus;
  next_billing_date: string | null;
  grace_end_date: string | null;
  updated_at: string;
  created_at: string;
}

export interface PaymentConfig {
  id: number;
  monthly_price: number;
  annual_price: number;
  nequi_number: string;
  bank_account: string;
  bank_holder: string;
  qr_image_url: string | null;
  breb_key: string;
  updated_at: string;
}

export interface SubscriptionChange {
  id: string;
  business_id: string;
  old_plan: string | null;
  new_plan: string | null;
  old_status: string | null;
  new_status: string | null;
  changed_by: string;
  note: string | null;
  created_at: string;
}

export interface AdminProfile {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export type WorkerRole = 'socio' | 'encargada' | 'servicio';
export type PaymentMethod = 'nequi' | 'daviplata' | 'efectivo';

export interface Operator {
  id: string;
  business_id: string;
  name: string;
  active: boolean;
  role: WorkerRole;
  phone: string | null;
  address: string | null;
  document_id: string | null;
  document_photo_url: string | null;
  payment_method: PaymentMethod | null;
  payment_account: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  on_shift_today: boolean;
  created_at: string;
}

export interface VehicleCategory {
  id: string;
  business_id: string;
  name: string;
  base_price: number;
  icon: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export type WashPaymentMethod = 'efectivo' | 'nequi_daviplata' | 'tarjeta' | 'credito';

export const WASH_PAYMENT_METHODS: { value: WashPaymentMethod; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'nequi_daviplata', label: 'Nequi / Daviplata' },
  { value: 'tarjeta', label: 'Tarjeta / Datáfono' },
  { value: 'credito', label: 'Crédito (Convenio)' },
];

export function washPaymentMethodLabel(pm: string | null | undefined): string {
  return WASH_PAYMENT_METHODS.find((m) => m.value === pm)?.label ?? 'Sin especificar';
}

export interface Wash {
  id: string;
  business_id: string;
  category_id: string | null;
  category_name: string;
  operator_id: string | null;
  operator_name: string;
  price: number;
  tip: number;
  status: WashStatus;
  cancellation_reason: string | null;
  potential_loss: number;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  ticket_number: number;
  customer_name: string | null;
  customer_phone: string | null;
  plate: string | null;
  photo_url: string | null;
  additional_total: number;
  total_price: number;
  additionals_detail: { name: string; amount: number; category: string }[];
  payment_method: WashPaymentMethod | null;
  created_at: string;
}

export interface WashItem {
  id: string;
  wash_id: string;
  business_id: string;
  name: string;
  amount: number;
  category: 'servicio' | 'consumo';
  created_at: string;
}

export type ExpenseCategory = 'insumos' | 'alimentacion' | 'mantenimiento' | 'servicios';

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'insumos', label: 'Insumos / Químicos' },
  { value: 'alimentacion', label: 'Alimentación / Refrigerios' },
  { value: 'mantenimiento', label: 'Mantenimiento / Repuestos' },
  { value: 'servicios', label: 'Servicios / Varios' },
];

export function expenseCategoryLabel(cat: string | null | undefined): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label ?? 'Sin categoría';
}

export interface Expense {
  id: string;
  business_id: string;
  description: string;
  amount: number;
  category: ExpenseCategory | null;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  business_id: string;
  name: string;
  unit: string;
  quantity: number;
  min_quantity: number;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  item_id: string;
  business_id: string;
  type: 'in' | 'out' | 'adjust';
  quantity: number;
  note: string | null;
  created_at: string;
}

export interface OperatorAdvance {
  id: string;
  business_id: string;
  operator_id: string;
  operator_name: string;
  amount: number;
  concept: string;
  paid_in_cash: boolean;
  settled: boolean;
  created_at: string;
}

export interface OperatorLiquidationEntry {
  operator_id: string | null;
  operator_name: string;
  washes: number;
  revenue: number;
  commission: number;
  tips: number;
  advances: number;
  total: number;
}

export interface DailyClosure {
  id: string;
  business_id: string;
  closure_date: string;
  total_revenue: number;
  total_tips: number;
  total_desisted: number;
  total_washes: number;
  total_desisted_count: number;
  operator_liquidation: OperatorLiquidationEntry[];
  total_expenses: number;
  commission_rate: number;
  total_commission: number;
  net_cash: number;
  cash_total: number;
  digital_total: number;
  credit_total: number;
  advances_total: number;
  counted_cash: number;
  cash_difference: number;
  opening_fund: number;
  operator_paid_cash: boolean;
  created_at: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface PendingOperation {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  record_id: string;
  payload: Record<string, unknown>;
  created_at: string;
}
