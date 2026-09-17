import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Car, Bike, Truck, Plus, User, Clock, CheckCircle2, XCircle,
  Receipt, RotateCcw, LogOut, AlertTriangle, Timer, Printer,
  ChevronRight, Users, Settings, TrendingUp, Wallet, Lock,
  MessageCircle, Trash2, ShoppingCart,
  Camera, Percent,
  Play, Square, HandCoins, Clock3,
  Gift, Search, Sparkles,
  Banknote, Smartphone, CreditCard, FileText, ClipboardList, Pencil,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import {
  fetchOperators, fetchCategories, fetchWashes, saveWash, getNextTicketNumber,
  saveOperator, deleteOperator, saveCategory, deleteCategory, uuid,
  saveDailyClosure, fetchLastClosure,
  fetchExpenses, saveExpense, deleteExpense,
  fetchOperatorAdvances, saveOperatorAdvance, deleteOperatorAdvance, settleAdvances,
  updateWashStatus, subscribeToWashes, saveWashItems,
  lookupPlateHistory, type PlateHistory,
} from '@/lib/data';
import { getSubscriptionState } from '@/lib/subscription';
import { printTicket, ticketTip, computeTicketTotal } from '@/lib/ticket';
import { updateBusiness } from '@/lib/data';
import type { Operator, VehicleCategory, Wash, WashStatus, OperatorLiquidationEntry, Expense, ExpenseCategory, WashItem, OperatorAdvance, WashPaymentMethod } from '@/lib/types';
import { EXPENSE_CATEGORIES, expenseCategoryLabel, WASH_PAYMENT_METHODS, washPaymentMethodLabel } from '@/lib/types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { SyncIndicator } from './SyncIndicator';
import { OperatorManager } from './OperatorManager';
import { StaffView } from './StaffView';
import { CategoryManager } from './CategoryManager';
import { PlateScannerModal } from './PlateScannerModal';
import LiquidationModal from './LiquidationModal';

type View = 'main' | 'operators' | 'categories' | 'staff';

const ACTIVE_STATUSES: WashStatus[] = ['en_espera', 'en_servicio', 'listo'];

function minutesBetween(from: string, to: string): number {
  return Math.max(0, Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 60000));
}

function statusLabel(s: WashStatus): string {
  switch (s) {
    case 'en_espera': return 'En Espera';
    case 'en_servicio': return 'En servicio';
    case 'listo': return 'Listo';
    case 'completado': return 'Completado';
    case 'desistido': return 'Desistido';
  }
}

function statusLabelForWash(w: Wash): string {
  if (w.status === 'en_espera' && w.operator_id) return 'En Cola';
  return statusLabel(w.status);
}

function washTotal(w: Wash): number {
  return (w.total_price ?? (w.price + (w.additional_total ?? 0))) || w.price;
}

function statusColor(s: WashStatus): string {
  switch (s) {
    case 'en_espera': return 'text-amber-700 bg-amber-100';
    case 'en_servicio': return 'text-emerald-700 bg-emerald-100';
    case 'listo': return 'text-rose-700 bg-rose-100';
    case 'completado': return 'text-emerald-700 bg-emerald-100';
    case 'desistido': return 'text-red-700 bg-red-100';
  }
}

function cardTint(s: WashStatus): string {
  switch (s) {
    case 'en_espera': return 'bg-amber-50/70 border-amber-200';
    case 'en_servicio': return 'bg-emerald-50/70 border-emerald-200';
    case 'listo': return 'bg-rose-50/70 border-rose-200';
    default: return 'bg-white border-[#E2E8F0]';
  }
}

export function AdminView() {
  const { business, setBusiness, setRole, showToast } = useApp();
  const subState = business ? getSubscriptionState(business) : null;
  const [view, setView] = useState<View>('main');
  const [operators, setOperators] = useState<Operator[]>([]);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [washes, setWashes] = useState<Wash[]>([]);
  const [reassignTarget, setReassignTarget] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [price, setPrice] = useState(0);
  const [ticketModal, setTicketModal] = useState<Wash | null>(null);
  const [cierreModal, setCierreModal] = useState(false);
  const [cierreConfirm, setCierreConfirm] = useState(false);
  const [cierreSaving, setCierreSaving] = useState(false);
  const [lastClosureTime, setLastClosureTime] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesModal, setExpensesModal] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState(0);
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory | null>(null);
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [plate, setPlate] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [desistidoTarget, setDesistidoTarget] = useState<Wash | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [liquidationTarget, setLiquidationTarget] = useState<Wash | null>(null);
  const [commissionModal, setCommissionModal] = useState(false);
  const [commissionInput, setCommissionInput] = useState(40);
  const [isCustomEditing, setIsCustomEditing] = useState(false);
  const [commissionSaving, setCommissionSaving] = useState(false);
  const [localCommissionRate, setLocalCommissionRate] = useState<number>(0.40);

  useEffect(() => {
    if (business?.commission_rate !== undefined) {
      setLocalCommissionRate(business.commission_rate);
    }
  }, [business?.commission_rate]);
  const [, forceTick] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [plateHistory, setPlateHistory] = useState<PlateHistory | null>(null);
  const [plateLooking, setPlateLooking] = useState(false);
  const [loyaltyModal, setLoyaltyModal] = useState(false);
  const [loyaltySaving, setLoyaltySaving] = useState(false);
  const [deliverTarget, setDeliverTarget] = useState<Wash | null>(null);
  const [deliverPaymentMethod, setDeliverPaymentMethod] = useState<WashPaymentMethod | null>(null);
  const [deliverSaving, setDeliverSaving] = useState(false);
  const [advances, setAdvances] = useState<OperatorAdvance[]>([]);
  const [advancesModal, setAdvancesModal] = useState(false);
  const [advanceOperator, setAdvanceOperator] = useState<Operator | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [advanceConcept, setAdvanceConcept] = useState('');
  const [advancePaidInCash, setAdvancePaidInCash] = useState(true);
  const [advanceSaving, setAdvanceSaving] = useState(false);
  const [liquidationView, setLiquidationView] = useState(false);
  const [countedCash, setCountedCash] = useState(0);
  const [openingFund, setOpeningFund] = useState(0);
  const [operatorsPaidCash, setOperatorsPaidCash] = useState(false);

  const loadData = useCallback(async () => {
    if (!business) return;
    const [ops, cats, ws, lastClosure, exps, advs] = await Promise.all([
      fetchOperators(business.id),
      fetchCategories(business.id),
      fetchWashes(business.id, new Date().toISOString().slice(0, 10)),
      fetchLastClosure(business.id),
      fetchExpenses(business.id, new Date().toISOString().slice(0, 10)),
      fetchOperatorAdvances(business.id, new Date().toISOString().slice(0, 10)),
    ]);
    setOperators(ops);
    setCategories(cats);
    setWashes(ws);
    setLastClosureTime(lastClosure?.created_at ?? null);
    setExpenses(exps);
    setAdvances(advs);
  }, [business]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription
  useEffect(() => {
    if (!business) return;
    channelRef.current = subscribeToWashes(business.id, () => loadData());
    return () => {
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  }, [business, loadData]);

  // Cronometro tick every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => forceTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Plate lookup: search history when plate changes (debounced)
  useEffect(() => {
    if (!plate.trim() || !business) {
      setPlateHistory(null);
      return;
    }
    const normalized = plate.trim().toUpperCase().replace(/\s/g, '');
    if (normalized.length < 3) {
      setPlateHistory(null);
      return;
    }
    setPlateLooking(true);
    const timeout = setTimeout(async () => {
      const history = await lookupPlateHistory(business.id, normalized);
      setPlateHistory(history);
      setPlateLooking(false);
      if (history) {
        if (history.customerName) setCustomerName(history.customerName);
        if (history.customerPhone) setCustomerPhone(history.customerPhone);
        if (history.categoryId) {
          const cat = categories.find((c) => c.id === history.categoryId);
          if (cat) {
            setSelectedCategory(cat);
            setPrice(cat.base_price);
          }
        }
      }
    }, 500);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plate, business]);

  const handleSaveLoyalty = async (config: {
    loyalty_enabled: boolean;
    loyalty_threshold: number;
    loyalty_reward_type: 'free' | 'discount';
    loyalty_discount_percent: number;
  }) => {
    if (!business || loyaltySaving) return;
    setLoyaltySaving(true);
    try {
      const updated = { ...business, ...config };
      await updateBusiness(updated);
      setBusiness(updated);
      setLoyaltyModal(false);
      showToast('Configuración de fidelización guardada', 'success');
    } catch (err) {
      console.error('Error saving loyalty config:', err);
      showToast('Error al guardar configuración', 'error');
    } finally {
      setLoyaltySaving(false);
    }
  };

  const handleCategorySelect = (cat: VehicleCategory) => {
    setSelectedCategory(cat);
    setPrice(cat.base_price);
  };

  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setSelectedCategory(null);
    setSelectedOperator(null);
    setPrice(0);
    setCustomerName('');
    setCustomerPhone('');
    setPlate('');
    setPhotoUrl(null);
  };

  const handleRegister = async () => {
    if (!business || !selectedCategory || saving || !plate.trim()) return;
    if (subState?.isBlocked) {
      showToast('Suscripción suspendida. No se pueden registrar nuevos turnos.', 'error');
      return;
    }

    setSaving(true);
    try {
      const ticketNumber = await getNextTicketNumber(business.id);
      const now = new Date().toISOString();

      const wash: Wash = {
        id: uuid(),
        business_id: business.id,
        category_id: selectedCategory.id,
        category_name: selectedCategory.name,
        operator_id: selectedOperator?.id ?? null,
        operator_name: selectedOperator?.name ?? '',
        price,
        tip: 0,
        status: 'en_espera',
        cancellation_reason: null,
        potential_loss: 0,
        customer_name: customerName.trim() || null,
        customer_phone: customerPhone.trim() || null,
        plate: plate.trim().toUpperCase().replace(/\s/g, '') || null,
        photo_url: photoUrl,
        started_at: null,
        completed_at: null,
        duration_seconds: null,
        additional_total: 0,
        total_price: 0,
        additionals_detail: [],
        payment_method: null,
        ticket_number: ticketNumber,
        created_at: now,
      };

      await saveWash(wash);
      resetForm();
      await loadData();
      showToast('Turno ingresado en cola', 'success');
    } catch (err) {
      console.error('Error registering wash:', err);
      showToast('Error al registrar el turno. Intenta de nuevo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReassignOperator = async (w: Wash, op: Operator) => {
    setReassignTarget(null);
    if (op.id === w.operator_id) return;
    try {
      setWashes((prev) => prev.map((x) => (x.id === w.id ? { ...x, operator_id: op.id, operator_name: op.name } : x)));
      await updateWashStatus(w.id, w.status, { operator_id: op.id, operator_name: op.name });
      await loadData();
      showToast(`Servicio #${w.ticket_number} reasignado a ${op.name}`, 'success');
    } catch (err) {
      console.error('Error reassigning operator:', err);
      showToast('Error al reasignar el especialista', 'error');
      await loadData();
    }
  };

const handleStartWash = async (w: Wash) => {
    if (!w.operator_id) {
      showToast('Debes asignar una especialista antes de iniciar el servicio.', 'error');
      return;
    }
    if (busyOperatorIds.has(w.operator_id)) {
      showToast(`La especialista ${w.operator_name} debe finalizar su servicio actual antes de iniciar este servicio.`, 'error');
      return;
    }
    try {
      const now = new Date().toISOString();
      await updateWashStatus(w.id, 'en_servicio', { started_at: now });
      await loadData();
      showToast('Servicio iniciado', 'success');
    } catch (err) {
      console.error('Error starting wash:', err);
      showToast('Error al iniciar el servicio', 'error');
    }
  };

  const handleFinishWash = (w: Wash) => {
    setLiquidationTarget(w);
  };

  const handleConfirmLiquidation = async (data: {
    price: number;
    tip: number;
    operatorId: string | null;
    operatorName: string;
    items: WashItem[];
    completedAt: string;
    durationSeconds: number;
  }) => {
    if (!liquidationTarget) return;
    try {
      const additionalTotal = data.items.reduce((s, i) => s + i.amount, 0);
      const totalPrice = data.price + additionalTotal;
      const additionalsDetail = data.items.map((i) => ({
        name: i.name,
        amount: i.amount,
        category: i.category,
      }));

      await updateWashStatus(liquidationTarget.id, 'listo', {
        completed_at: data.completedAt,
        duration_seconds: data.durationSeconds,
        price: data.price,
        tip: data.tip,
        operator_id: data.operatorId,
        operator_name: data.operatorName,
        additional_total: additionalTotal,
        total_price: totalPrice,
        additionals_detail: additionalsDetail,
      });

      if (data.items.length > 0) {
        await saveWashItems(data.items);
      }

      setLiquidationTarget(null);
      await loadData();
      showToast('Servicio finalizado y liquidado correctamente', 'success');
    } catch (err) {
      console.error('Error finishing wash:', err);
      showToast('Error al finalizar el servicio', 'error');
    }
  };

  const handleDeliverWash = (w: Wash) => {
    setDeliverTarget(w);
    setDeliverPaymentMethod(null);
  };

  const handleConfirmDeliver = async () => {
    if (!deliverTarget || !deliverPaymentMethod || deliverSaving) return;
    setDeliverSaving(true);
    try {
      await updateWashStatus(deliverTarget.id, 'completado', {
        payment_method: deliverPaymentMethod,
      });
      const completedWash = { ...deliverTarget, status: 'completado' as const, payment_method: deliverPaymentMethod };
      setDeliverTarget(null);
      setDeliverPaymentMethod(null);
      await loadData();
      setTicketModal(completedWash);
      showToast('Servicio cobrado con éxito', 'success');
    } catch (err) {
      console.error('Error delivering wash:', err);
      showToast('Error al procesar el cobro', 'error');
    } finally {
      setDeliverSaving(false);
    }
  };

  const handleConfirmDesistido = async () => {
    if (!desistidoTarget || !cancellationReason.trim()) return;
    try {
      await updateWashStatus(desistidoTarget.id, 'desistido', {
        cancellation_reason: cancellationReason.trim(),
        potential_loss: desistidoTarget.price,
      });
      setDesistidoTarget(null);
      setCancellationReason('');
      await loadData();
      showToast('Desistido registrado', 'info');
    } catch (err) {
      console.error('Error marking desistido:', err);
      showToast('Error al registrar desistido', 'error');
    }
  };

  const handleLogout = () => {
    setBusiness(null);
    setRole(null);
  };

  const handleAddExpense = async () => {
    if (!business || !expenseDesc.trim() || expenseAmount <= 0 || expenseSaving) return;
    setExpenseSaving(true);
    try {
      const expense: Expense = {
        id: uuid(),
        business_id: business.id,
        description: expenseDesc.trim(),
        amount: expenseAmount,
        category: expenseCategory,
        created_at: new Date().toISOString(),
      };
      await saveExpense(expense);
      setExpenseDesc('');
      setExpenseAmount(0);
      setExpenseCategory(null);
      await loadData();
      showToast('Gasto registrado correctamente', 'success');
    } catch (err) {
      console.error('Error saving expense:', err);
      showToast('Error al registrar el gasto', 'error');
    } finally {
      setExpenseSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteExpense(id);
      await loadData();
      showToast('Gasto eliminado', 'info');
    } catch (err) {
      console.error('Error deleting expense:', err);
      showToast('Error al eliminar el gasto', 'error');
    }
  };

  const handleAddAdvance = async () => {
    if (!business || !advanceOperator || advanceAmount <= 0 || !advanceConcept.trim() || advanceSaving) return;
    setAdvanceSaving(true);
    try {
      const advance: OperatorAdvance = {
        id: uuid(),
        business_id: business.id,
        operator_id: advanceOperator.id,
        operator_name: advanceOperator.name,
        amount: advanceAmount,
        concept: advanceConcept.trim(),
        paid_in_cash: advancePaidInCash,
        settled: false,
        created_at: new Date().toISOString(),
      };
      await saveOperatorAdvance(advance);
      setAdvanceOperator(null);
      setAdvanceAmount(0);
      setAdvanceConcept('');
      setAdvancePaidInCash(true);
      await loadData();
      showToast('Vale/adelanto registrado', 'success');
    } catch (err) {
      console.error('Error saving advance:', err);
      showToast('Error al registrar adelanto', 'error');
    } finally {
      setAdvanceSaving(false);
    }
  };

  const handleDeleteAdvance = async (id: string) => {
    try {
      await deleteOperatorAdvance(id);
      await loadData();
      showToast('Adelanto eliminado', 'info');
    } catch (err) {
      console.error('Error deleting advance:', err);
      showToast('Error al eliminar adelanto', 'error');
    }
  };

  const handlePayOperator = async (operatorId: string) => {
    const unsettled = advances.filter((a) => a.operator_id === operatorId && !a.settled);
    if (unsettled.length === 0) return;
    try {
      await settleAdvances(unsettled.map((a) => a.id));
      await loadData();
      showToast('Vales saldados', 'success');
    } catch (err) {
      console.error('Error settling advances:', err);
      showToast('Error al saldar vales', 'error');
    }
  };

  const handlePhotoCaptured = (capturedPhoto: string) => {
    setPhotoUrl(capturedPhoto);
    setScannerOpen(false);
    showToast('Foto de soporte adjuntada', 'success');
  };

const buildReadyWhatsAppUrl = (w: Wash): string | null => {
    if (!w.customer_phone) return null;
    const phone = w.customer_phone.replace(/[^0-9]/g, '');
    if (!phone) return null;
    const fullName = w.customer_name ? `Sra. ${w.customer_name}` : 'Estimada cliente';
    const opName = w.operator_name || 'su especialista';
    const msg = `¡Hola! ${fullName} ✨💅\n\nLe informamos que su especialista ${opName} ya está lista para atenderla.\n\n¡Por favor pase a la estación de servicio!`;
    return `https://wa.me/57${phone}?text=${encodeURIComponent(msg)}`;
  };

  // Operators currently washing
  const busyOperatorIds = new Set(
    washes
      .filter((w) => w.status === 'en_servicio' && w.operator_id)
      .map((w) => w.operator_id!)
  );

  // Washes since the last closure
  const shiftWashes = lastClosureTime
    ? washes.filter((w) => w.created_at > lastClosureTime)
    : washes;

  const shiftCompleted = shiftWashes.filter((w) => w.status === 'completado');
  const shiftDesisted = shiftWashes.filter((w) => w.status === 'desistido');
  const shiftPending = shiftWashes.filter((w) => ACTIVE_STATUSES.includes(w.status));
  const shiftRevenue = shiftCompleted.reduce((s, w) => s + washTotal(w), 0);
  const shiftTips = shiftCompleted.reduce((s, w) => s + w.tip, 0);
  const shiftLosses = shiftDesisted.reduce((s, w) => s + w.potential_loss, 0);

  const commissionRate = localCommissionRate;

  const operatorLiquidation: OperatorLiquidationEntry[] = (() => {
    const map = new Map<string, OperatorLiquidationEntry>();
    for (const w of shiftCompleted) {
      const key = w.operator_id ?? 'none';
      const currentOp = w.operator_id ? operators.find((o) => o.id === w.operator_id) : undefined;
      const entry = map.get(key) ?? {
        operator_id: w.operator_id,
        operator_name: currentOp?.name || w.operator_name || 'Sin Especialista',
        washes: 0, revenue: 0, commission: 0, tips: 0, advances: 0, total: 0,
      };
      if (currentOp?.name) entry.operator_name = currentOp.name;
      entry.washes++;
      entry.revenue += washTotal(w);
      entry.tips += w.tip;
      map.set(key, entry);
    }
    for (const entry of map.values()) {
      entry.commission = Math.round(entry.revenue * commissionRate);
      const opAdvances = advances
        .filter((a) => a.operator_id === entry.operator_id && !a.settled)
        .reduce((s, a) => s + a.amount, 0);
      entry.advances = opAdvances;
      entry.total = entry.commission + entry.tips - opAdvances;
    }
    const orderIndex = (id: string | null) => {
      if (!id) return Number.MAX_SAFE_INTEGER;
      const i = operators.findIndex((o) => o.id === id);
      return i === -1 ? Number.MAX_SAFE_INTEGER - 1 : i;
    };
    return [...map.values()].sort((a, b) => {
      const byOrder = orderIndex(a.operator_id) - orderIndex(b.operator_id);
      if (byOrder !== 0) return byOrder;
      return a.operator_name.localeCompare(b.operator_name, 'es');
    });

  })();

  const totalCommission = operatorLiquidation.reduce((s, l) => s + l.commission, 0);
  const totalOperatorPay = totalCommission + shiftTips;
  const shiftExpenses = expenses
    .filter((e) => !lastClosureTime || e.created_at > lastClosureTime)
    .reduce((s, e) => s + e.amount, 0);
  const shiftAdvances = advances
    .filter((a) => !lastClosureTime || a.created_at > lastClosureTime)
    .reduce((s, a) => s + a.amount, 0);
  const shiftAdvancesCash = advances
    .filter((a) => (!lastClosureTime || a.created_at > lastClosureTime) && a.paid_in_cash)
    .reduce((s, a) => s + a.amount, 0);

  // Payment method breakdown
  const cashRevenue = shiftCompleted
    .filter((w) => !w.payment_method || w.payment_method === 'efectivo')
    .reduce((s, w) => s + washTotal(w), 0);
  const digitalRevenue = shiftCompleted
    .filter((w) => w.payment_method === 'nequi_daviplata' || w.payment_method === 'tarjeta')
    .reduce((s, w) => s + washTotal(w), 0);
  const creditRevenue = shiftCompleted
    .filter((w) => w.payment_method === 'credito')
    .reduce((s, w) => s + washTotal(w), 0);

  const netCash = shiftRevenue - totalOperatorPay - shiftExpenses - shiftAdvancesCash;
  const netOperatorPay = Math.max(0, totalOperatorPay - shiftAdvancesCash);
  const expectedCash = operatorsPaidCash
    ? openingFund + cashRevenue - shiftExpenses - shiftAdvancesCash - netOperatorPay
    : openingFund + cashRevenue - shiftExpenses - shiftAdvancesCash;
  const cashDifference = countedCash - expectedCash;

  const handleCierreCaja = async () => {
    if (!business || cierreSaving) return;
    setCierreSaving(true);
    try {
      const closure = {
        id: uuid(),
        business_id: business.id,
        closure_date: new Date().toISOString().slice(0, 10),
        total_revenue: shiftRevenue,
        total_tips: shiftTips,
        total_desisted: shiftLosses,
        total_washes: shiftCompleted.length,
        total_desisted_count: shiftDesisted.length,
        operator_liquidation: operatorLiquidation,
        total_expenses: shiftExpenses,
        commission_rate: commissionRate,
        total_commission: totalCommission,
        net_cash: netCash,
        cash_total: cashRevenue,
        digital_total: digitalRevenue,
        credit_total: creditRevenue,
        advances_total: shiftAdvances,
        counted_cash: countedCash,
        cash_difference: cashDifference,
        opening_fund: openingFund,
        operator_paid_cash: operatorsPaidCash,
        created_at: new Date().toISOString(),
      };
      await saveDailyClosure(closure);
      showToast('Cierre de caja realizado correctamente', 'success');
      setCierreModal(false);
      setCierreConfirm(false);
      await loadData();
    } catch (err) {
      console.error('Cierre de caja error:', err);
      showToast('Error al realizar el cierre de caja', 'error');
    } finally {
      setCierreSaving(false);
    }
  };

  const todayStats = {
    total: shiftWashes.length,
    completed: shiftCompleted.length,
    desisted: shiftDesisted.length,
    pending: shiftPending.length,
    revenue: shiftRevenue,
    losses: shiftLosses,
    tips: shiftTips,
  };

  const iconMap: Record<string, typeof Sparkles> = {
    car: Sparkles,
    bike: Sparkles,
    truck: Sparkles,
    sparkles: Sparkles,
  };

  if (view === 'operators') {
    return (
      <OperatorManager
        operators={operators}
        businessId={business!.id}
        onBack={() => { setView('main'); loadData(); }}
        onSave={saveOperator}
        onDelete={deleteOperator}
      />
    );
  }

  if (view === 'staff') {
    return (
      <StaffView
        operators={operators}
        businessId={business!.id}
        onBack={() => { setView('main'); loadData(); }}
        onSave={saveOperator}
        onDelete={deleteOperator}
      />
    );
  }

  if (view === 'categories') {
    return (
<CategoryManager
    categories={categories}
    businessId={business!.id}
    onBack={() => { setView('main'); loadData(); }}
    onSave={async (cat) => { await saveCategory(cat); await loadData(); }}
    onDelete={async (id) => { await deleteCategory(id); await loadData(); }}
  />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white backdrop-blur-xl border-b border-[#E2E8F0] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-rose-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">{business?.name}</h1>
              <p className="text-xs text-slate-500">Modo Recepción · {new Date().toLocaleDateString('es-CO')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SyncIndicator />
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-100 transition-all"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Stats bar */}
      <div className="px-4 py-3 grid grid-cols-4 gap-2">
        <StatChip label="Hoy" value={todayStats.total.toString()} icon={<Clock className="w-3.5 h-3.5" />} color="text-rose-500" />
        <StatChip label="Cobrados" value={todayStats.completed.toString()} icon={<CheckCircle2 className="w-3.5 h-3.5" />} color="text-emerald-600" />
        <StatChip label="Pendientes" value={todayStats.pending.toString()} icon={<Clock3 className="w-3.5 h-3.5" />} color="text-amber-600" />
        <StatChip label="Ingresos" value={`${(todayStats.revenue / 1000).toFixed(0)}k`} icon={<TrendingUp className="w-3.5 h-3.5" />} color="text-rose-500" />
      </div>

      {/* Subscription banner */}
      {subState && (subState.isWarning || subState.isGrace || subState.isBlocked) && (
        <div className={`mx-4 mb-2 p-3 rounded-xl border ${subState.bannerBg} ${subState.borderColor} flex items-center gap-2`}>
          <AlertTriangle className={`w-4 h-4 shrink-0 ${subState.bannerColor}`} />
          <span className={`text-sm font-medium ${subState.bannerColor}`}>{subState.label}</span>
        </div>
      )}

      {/* Main content */}
      <main className="px-4 pb-24 space-y-4 max-w-full overflow-x-hidden">
        {/* Quick config buttons */}
        <div className="flex flex-nowrap overflow-x-auto scrollbar-none w-full gap-2 [&>*]:shrink-0">
          <button
            onClick={() => setView('staff')}
            className="action-control action-surface flex-1 flex items-center justify-center gap-2 py-3 border border-rose-200/80 rounded-xl text-sm font-medium text-slate-600"
          >
            <Users className="w-4 h-4" /> Personal
          </button>
          <button
            onClick={() => setView('categories')}
            className="action-control action-surface flex-1 flex items-center justify-center gap-2 py-3 border border-rose-200/80 rounded-xl text-sm font-medium text-slate-600"
          >
            <Settings className="w-4 h-4" /> Categorías
          </button>
          <button
            onClick={() => { setCommissionInput(Math.round(commissionRate * 100)); setCommissionModal(true); }}
            className="action-control flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-br from-purple-50 via-white to-slate-50 border border-rose-200/80 rounded-xl text-sm font-medium text-purple-600"
          >
            <Percent className="w-4 h-4" /> {Math.round(commissionRate * 100)}
          </button>
          <button
            onClick={() => setLoyaltyModal(true)}
            className={`action-control flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-rose-200/80 text-sm font-medium ${
              business?.loyalty_enabled
                ? 'bg-gradient-to-br from-amber-50 via-white to-slate-50 text-amber-600'
                : 'action-surface text-slate-500'
            }`}
          >
            <Gift className="w-4 h-4" /> Fidel.
          </button>
          <button
            onClick={() => setExpensesModal(true)}
            className="action-control flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-br from-orange-50 via-white to-slate-50 border border-rose-200/80 rounded-xl text-sm font-medium text-orange-600"
          >
            <ShoppingCart className="w-4 h-4" /> Gastos
          </button>
          <button
            onClick={() => setAdvancesModal(true)}
            className="action-control flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-br from-rose-50 via-white to-slate-50 border border-rose-200/80 rounded-xl text-sm font-medium text-rose-600"
          >
            <Wallet className="w-4 h-4" /> Vales
          </button>
          <button
            onClick={() => setLiquidationView(true)}
            className="action-control flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-br from-indigo-50 via-white to-slate-50 border border-rose-200/80 rounded-xl text-sm font-medium text-indigo-600"
          >
            <ClipboardList className="w-4 h-4" /> Liquidar
          </button>
          <button
            onClick={() => setCierreModal(true)}
            className="action-control flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-br from-amber-50 via-white to-slate-50 border border-rose-200/80 rounded-xl text-sm font-medium text-amber-600"
          >
            <Wallet className="w-4 h-4" /> Cierre
          </button>
        </div>

        {/* ===== Active Board: Turnos en progreso ===== */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
            <Timer className="w-4 h-4 text-amber-600" />
            Turnos Activos
            {shiftPending.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-xs font-bold">
                {shiftPending.length}
              </span>
            )}
          </h2>
          <div className="space-y-2">
            {shiftPending.length === 0 && (
              <div className="text-center py-6 text-slate-500 text-sm bg-white border border-[#E2E8F0] shadow-sm rounded-xl">
                No hay turnos activos. Registra un nuevo servicio abajo.
              </div>
            )}
            {shiftPending.map((w) => {
              const now = new Date().toISOString();
              const elapsedMin = w.status === 'en_espera'
                ? minutesBetween(w.created_at, now)
                : w.status === 'en_servicio' && w.started_at
                  ? minutesBetween(w.started_at, now)
                  : w.status === 'listo' && w.started_at && w.completed_at
                    ? minutesBetween(w.started_at, w.completed_at)
                    : 0;
              const waUrl = w.status === 'listo' ? buildWhatsAppUrl(w) : null;
              return (
                <div
                  key={w.id}
                  className={`p-3 border shadow-sm rounded-xl space-y-2 ${cardTint(w.status)}`}
                >
                  {/* Row 1: identity + status + timer */}
                  <div className="flex items-center gap-2">
                    {w.photo_url && (
                      <img src={w.photo_url} alt="Foto" className="w-10 h-10 rounded-lg object-cover border border-[#E2E8F0]" />
                    )}
                    <span className="font-bold text-sm">#{w.ticket_number}</span>
                    {w.plate && <span className="text-xs font-mono font-bold text-rose-500 bg-cyan-50 px-1.5 py-0.5 rounded">{w.plate}</span>}
                    <span className="text-sm text-slate-600 truncate flex-1">{w.category_name}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(w.status)}`}>
                      {statusLabelForWash(w)}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {elapsedMin} min
                    </span>
                  </div>
                  {/* Row 2: operator + price */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="relative">
                      {(w.status === 'en_espera' || w.status === 'en_servicio') ? (
                        <button
                          onClick={() => setReassignTarget(reassignTarget === w.id ? null : w.id)}
                          className="action-control action-surface flex items-center gap-1.5 px-1.5 py-1 -ml-1.5 rounded-lg border border-rose-200/80 text-slate-500"
                        >
                          <span>{w.operator_name || 'Sin especialista'} · {new Date(w.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                          <Pencil className="w-3 h-3 text-rose-500" />
                        </button>
                      ) : (
                        <span>{w.operator_name || 'Sin especialista'} · {new Date(w.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                      {reassignTarget === w.id && (
                        <div className="absolute z-40 mt-1 left-0 w-56 max-h-64 overflow-y-auto bg-white border border-[#E2E8F0] shadow-sm rounded-xl shadow-2xl p-1">
                          <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-500">Reasignar especialista</div>
                          {operators.filter((o) => o.active).map((op) => (
                            <button
                              key={op.id}
                              onClick={() => handleReassignOperator(w, op)}
                              className={`action-control action-surface w-full text-left px-2 py-2 rounded-lg border border-rose-200/80 text-xs ${op.id === w.operator_id ? 'text-rose-700 font-semibold' : 'text-slate-600'}`}
                            >
                              {op.name}
                            </button>
                          ))}
                          {operators.filter((o) => o.active).length === 0 && (
                            <div className="px-2 py-2 text-xs text-slate-500">No hay especialistas activas</div>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-sm text-slate-900">${washTotal(w).toLocaleString('es-CO')}</span>
                  </div>

{/* Row 3: action buttons */}
                  <div className="flex gap-2 mt-4">
                    {w.status === 'en_espera' && (
                      <>
                        <button
                          onClick={() => handleStartWash(w)}
                          className="action-control action-surface flex-1 py-2.5 border border-blue-200/80 font-semibold rounded-lg flex items-center justify-center gap-1.5 text-sm text-blue-600"
                        >
                          <Play className="w-4 h-4" /> Iniciar
                        </button>
                        {w.customer_phone && (
                          <a
                            href={w.operator_id ? (buildReadyWhatsAppUrl(w) || '#') : '#'}
                            target={w.operator_id ? "_blank" : "_self"}
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              if (!w.operator_id) {
                                e.preventDefault();
                                showToast('Asigna una especialista (lápiz azul) para poder avisarle a la cliente.', 'warning');
                              }
                            }}
                            className="action-control flex-1 py-2.5 bg-gradient-to-br from-green-500 to-emerald-600 border border-green-600/80 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 text-sm"
                          >
                            <MessageCircle className="w-4 h-4" /> Avisar
                          </a>
                        )}
                        <button
                          onClick={() => { setDesistidoTarget(w); setCancellationReason(''); }}
                          className="action-control px-3 py-2.5 bg-gradient-to-br from-red-50 via-white to-slate-50 border border-red-200/80 text-red-600 font-medium rounded-lg flex items-center justify-center gap-1.5 text-sm"
                          title="Cancelar turno"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    
                    {w.status === 'en_servicio' && (
                      <button
                        onClick={() => handleFinishWash(w)}
                        className="action-control action-surface flex-1 py-2.5 border border-rose-200/80 text-rose-500 font-semibold rounded-lg flex items-center justify-center gap-1.5 text-sm"
                      >
                        <Square className="w-4 h-4" /> Finalizar servicio
                      </button>
                    )}
                    
                    {w.status === 'listo' && (
                      <>
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="action-control flex-1 py-2.5 bg-gradient-to-br from-green-500 to-emerald-600 border border-rose-200/80 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 text-sm animate-fadeIn"
                          >
                            <MessageCircle className="w-4 h-4" /> Avisar por WhatsApp
                          </a>
                        )}
                        <button
                          onClick={() => handleDeliverWash(w)}
                          className="action-control flex-1 py-2.5 bg-gradient-to-br from-emerald-50 via-white to-slate-50 border border-rose-200/80 text-emerald-600 font-semibold rounded-lg flex items-center justify-center gap-1.5 text-sm"
                        >
                          <HandCoins className="w-4 h-4" /> Cobrar Servicio
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => setTicketModal(w)}
                      className="action-control action-surface px-3 py-2.5 border border-rose-200/80 text-slate-500 rounded-lg"
                    >
                      <Receipt className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
        </section>

        {/* ===== Registration form ===== */}
        <div className="border-t border-[#E2E8F0] pt-4 space-y-4">
          <h2 className="text-sm font-bold text-slate-600 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" /> Registrar Nuevo Turno
          </h2>

          {/* Step 1: Category */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center font-bold">1</span>
              Selecciona el servicio
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.filter((c) => c.active).map((cat) => {
                const Icon = iconMap[cat.icon] ?? Sparkles;
                const isSelected = selectedCategory?.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat)}
                    className={`relative p-4 rounded-2xl border transition-all duration-200 active:scale-95 active:shadow-sm ${
                      isSelected
                        ? 'border-rose-400 bg-gradient-to-br from-rose-50/80 via-white to-slate-50 shadow-md shadow-rose-900/10 hover:shadow-lg hover:shadow-rose-900/15 hover:-translate-y-1 hover:border-rose-400'
                        : 'border border-rose-200/80 bg-gradient-to-br from-rose-50/80 via-white to-slate-50 shadow-md shadow-rose-900/10 hover:shadow-lg hover:shadow-rose-900/15 hover:border-rose-400 hover:-translate-y-1'
                    }`}
                  >
                    <Icon className={`w-8 h-8 mb-2 ${isSelected ? 'text-rose-500' : 'text-slate-500'}`} />
                    <div className="text-sm font-semibold">{cat.name}</div>
                    <div className="text-xs text-slate-500">${cat.base_price.toLocaleString('es-CO')}</div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 2: Operator */}
          {selectedCategory && (
            <section className="animate-fadeIn">
              <h3 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center font-bold">2</span>
                Selecciona la especialista
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {operators.filter((o) => o.active).map((op) => {
                  const isSelected = selectedOperator?.id === op.id;
                  const isBusy = busyOperatorIds.has(op.id);
                  return (
                    <button
                      key={op.id}
                      onClick={() => setSelectedOperator(op)}
                      className={`action-control flex items-center gap-2 p-3 rounded-xl border border-rose-200/80 ${
                        isSelected
                          ? 'bg-gradient-to-br from-emerald-50 via-white to-slate-50 text-emerald-700'
                          : 'action-surface text-slate-700'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSelected ? 'bg-emerald-400 text-slate-900' : isBusy ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                        <User className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium truncate">{op.name}{isBusy && <span className="text-amber-600 text-xs ml-1">(En servicio)</span>}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Step 3: Price */}
          {selectedCategory && (
            <section className="animate-fadeIn">
              <h3 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center font-bold">3</span>
                Ajusta precio del servicio
              </h3>
              <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-4">
                <label className="text-xs text-slate-500 mb-1 block">Precio del servicio</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full bg-transparent text-2xl font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </section>
          )}

          {/* Step 4: identificación */}
          {selectedCategory && (
            <section className="animate-fadeIn">
              <h3 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center font-bold">4</span>
                Identificación del cliente <span className="text-red-600 text-xs">*</span>
              </h3>
              <div className="flex gap-2">
                <div className="flex-1 bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-3 relative">
                  <input
                    type="text"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase().replace(/\s/g, ''))}
                    placeholder="Ej: 1088123456"
                    maxLength={15}
                    className="w-full bg-transparent text-lg font-mono font-bold text-rose-500 focus:outline-none placeholder-slate-400 tracking-wider"
                  />
                  {plateLooking && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Search className="w-4 h-4 text-slate-500 animate-pulse" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setScannerOpen(true)}
                  className="action-control action-surface px-4 border border-rose-200/80 rounded-2xl text-rose-500 flex items-center gap-2"
                  title="Tomar foto de soporte"
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-sm font-medium hidden sm:inline">Foto</span>
                </button>
              </div>
              {plateHistory && (
                <div className="mt-2 flex items-center gap-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200 rounded-xl p-3 animate-fadeIn">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-amber-600">Visita #{plateHistory.visitCount + 1}</div>
                    <div className="text-xs text-slate-500">
                      Cliente recurrente · {plateHistory.visitCount} visita{plateHistory.visitCount !== 1 ? 's' : ''} previa{plateHistory.visitCount !== 1 ? 's' : ''}
                      {business?.loyalty_enabled && plateHistory.visitCount + 1 >= business.loyalty_threshold && (
                        <span className="text-emerald-600 font-bold ml-1">· Premio disponible!</span>
                      )}
                    </div>
                  </div>
                  {business?.loyalty_enabled && plateHistory.visitCount + 1 >= business.loyalty_threshold && (
                    <div className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold flex items-center gap-1">
                      <Gift className="w-3 h-3" /> Premio
                    </div>
                  )}
                </div>
              )}
              {photoUrl && (
                <div className="mt-2 flex items-center gap-3 bg-cyan-50 border border-cyan-200 rounded-xl p-2">
                  <img src={photoUrl} alt="Foto de soporte" className="w-14 h-14 rounded-lg object-cover" />
                  <span className="text-xs text-rose-500 font-medium">Foto de soporte adjunta</span>
                  <button
                    onClick={() => setPhotoUrl(null)}
                    className="ml-auto p-1.5 rounded-lg bg-white hover:bg-slate-100 transition-all"
                  >
                    <XCircle className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Step 5: Customer info */}
          {selectedCategory && (
            <section className="animate-fadeIn">
              <h3 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center font-bold">5</span>
                Datos del cliente (opcional)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-3">
                  <label className="text-xs text-slate-500 mb-1 block">Nombre del cliente</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="w-full bg-transparent text-sm font-medium text-slate-900 focus:outline-none placeholder-slate-400"
                  />
                </div>
                <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-3">
                  <label className="text-xs text-slate-500 mb-1 block">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Ej: 573001234567"
                    className="w-full bg-transparent text-sm font-medium text-slate-900 focus:outline-none placeholder-slate-400"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Step 6: Register button */}
          {selectedCategory && (
            <section className="animate-fadeIn">
              <button
                onClick={handleRegister}
                disabled={!selectedCategory || saving || !plate.trim() || subState?.isBlocked}
                className="action-control w-full py-5 bg-gradient-to-br from-emerald-600 to-green-500 border border-rose-200/80 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <CheckCircle2 className="w-6 h-6" />
                {subState?.isBlocked ? 'Suscripción suspendida' : saving ? 'Guardando...' : 'Registrar e Ingresar'}
              </button>
            </section>
          )}
        </div>

        {/* ===== Completed/desisted washes this shift ===== */}
        <section className="border-t border-[#E2E8F0] pt-4">
          <h2 className="text-sm font-semibold text-slate-500 mb-2">Historial del Turno</h2>
          <div className="space-y-2">
            {shiftWashes.filter((w) => !ACTIVE_STATUSES.includes(w.status)).slice(0, 10).map((w) => (
              <div
                key={w.id}
                className="flex items-center gap-3 p-3 bg-white border border-[#E2E8F0] shadow-sm rounded-xl"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusColor(w.status)}`}>
                  {w.status === 'completado' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">#{w.ticket_number}</span>
                    <span className="text-sm text-slate-600">{w.category_name}</span>
                    {w.plate && <span className="text-xs font-mono font-bold text-rose-500 bg-cyan-50 px-1.5 py-0.5 rounded">{w.plate}</span>}
                  </div>
                  <div className="text-xs text-slate-500">
                    {w.operator_name || 'Sin Especialista'} · {new Date(w.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm">${washTotal(w).toLocaleString('es-CO')}</div>
                  {w.tip > 0 && <div className="text-xs text-emerald-600">+${w.tip.toLocaleString('es-CO')}</div>}
                </div>
                <button
                  onClick={() => setTicketModal(w)}
                  className="p-2 rounded-lg bg-white hover:bg-slate-100 transition-all"
                >
                  <Receipt className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            ))}
            {shiftWashes.filter((w) => !ACTIVE_STATUSES.includes(w.status)).length === 0 && (
              <div className="text-center py-4 text-slate-500 text-sm">
                No hay servicios completados en este turno
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Desistido Modal */}
      {desistidoTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-red-200 p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Registrar Cancelación</h2>
                <p className="text-sm text-slate-500">#{desistidoTarget.ticket_number} · {desistidoTarget.plate ?? 'Sin identificación'}</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-slate-500">Pérdida potencial calculada</p>
              <p className="text-2xl font-bold text-red-600">${desistidoTarget.price.toLocaleString('es-CO')}</p>
            </div>

            <label className="text-sm font-medium text-slate-600 mb-2 block">Motivo de cancelación</label>
            <textarea
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Ej: Cliente se fue por demora..."
              className="w-full px-4 py-3 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-200 resize-none"
              rows={3}
              autoFocus
            />

            <div className="flex flex-wrap gap-2 mt-2">
              {['Demora / Congestión', 'Cambio de idea', 'Cliente canceló el servicio', 'Problema técnico'].map((r) => (
                <button
                  key={r}
                  onClick={() => setCancellationReason(r)}
                  className="action-control action-surface px-3 py-1.5 text-xs border border-rose-200/80 rounded-lg text-slate-500"
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setDesistidoTarget(null); setCancellationReason(''); }}
                className="action-control action-surface flex-1 py-3 border border-rose-200/80 text-slate-600 font-medium rounded-xl"
              >
                Volver
              </button>
              <button
                onClick={handleConfirmDesistido}
                disabled={!cancellationReason.trim()}
                className="action-control flex-1 py-3 bg-gradient-to-br from-red-500 to-red-600 border border-rose-200/80 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {ticketModal && business && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Ticket #{ticketModal.ticket_number}</h2>
              <p className="text-sm text-slate-500">{statusLabel(ticketModal.status)}</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-sm font-mono text-slate-800">
              <div className="flex justify-between"><span>Negocio:</span><span className="font-semibold">{business.name}</span></div>
              <div className="flex justify-between"><span>Servicio:</span><span className="font-semibold">{ticketModal.category_name}</span></div>
              <div className="flex justify-between"><span>Identificación:</span><span className="font-semibold">{ticketModal.plate ?? 'N/A'}</span></div>
              <div className="flex justify-between"><span>Especialista:</span><span className="font-semibold">{ticketModal.operator_name || 'N/A'}</span></div>
              <div className="flex justify-between"><span>Costo base:</span><span>${ticketModal.price.toLocaleString('es-CO')}</span></div>
              {(ticketModal.additionals_detail ?? []).map((d, i) => (
                <div key={i} className="flex justify-between text-slate-500"><span>+ {d.name}:</span><span>${d.amount.toLocaleString('es-CO')}</span></div>
              ))}
              {ticketTip(ticketModal) > 0 && <div className="flex justify-between"><span>Propina:</span><span className="text-emerald-600">${ticketTip(ticketModal).toLocaleString('es-CO')}</span></div>}
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold"><span>TOTAL:</span><span>${computeTicketTotal(ticketModal).toLocaleString('es-CO')}</span></div>
              {ticketModal.status === 'completado' && (
                <div className="flex justify-between text-sm mt-1.5"><span className="text-slate-500">Medio de Pago:</span><span className="font-semibold text-slate-700">{washPaymentMethodLabel(ticketModal.payment_method)}</span></div>
              )}
              {ticketModal.status === 'desistido' && ticketModal.cancellation_reason && (
                <div className="text-red-600 text-xs mt-2">Cancelado: {ticketModal.cancellation_reason}</div>
              )}
              {business.loyalty_enabled && ticketModal.plate && (() => {
                const completedForPlate = washes.filter(
                  (w) => w.plate === ticketModal.plate && (w.status === 'completado' || w.status === 'listo')
                ).length;
                const isRewardVisit = completedForPlate > 0 && completedForPlate % business.loyalty_threshold === 0;
                if (isRewardVisit) {
                  return (
                    <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-xs flex items-center gap-2">
                      <Gift className="w-4 h-4" />
                      <span className="font-bold">¡Premio de Fidelización!</span>
                      <span>
                        {business.loyalty_reward_type === 'free'
                          ? 'Esta visita es un servicio sin costo.'
                          : `Descuento del ${business.loyalty_discount_percent}% aplicado.`}
                      </span>
                    </div>
                  );
                }
                const remaining = business.loyalty_threshold - (completedForPlate % business.loyalty_threshold);
                if (remaining > 0 && remaining < business.loyalty_threshold) {
                  return (
                    <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                      <Gift className="w-3 h-3" />
                      Te faltan {remaining} servicio{remaining !== 1 ? 's' : ''} para tu premio.
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setTicketModal(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-all"
              >
                Cerrar
              </button>
              <button
                onClick={() => printTicket(ticketModal, business)}
                className="flex-1 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-rose-500 transition-all flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cierre de Caja Modal */}
      {cierreModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-amber-200 p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Cierre de Caja</h2>
                <p className="text-sm text-slate-500">Resumen del turno actual</p>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div className="text-xs text-emerald-600/70">Ingresos Totales (Cobrados)</div>
                <div className="text-lg font-bold text-emerald-600">${shiftRevenue.toLocaleString('es-CO')}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{shiftCompleted.length} cobrados</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="text-xs text-amber-600/70">Pago Total especialista</div>
                <div className="text-lg font-bold text-amber-600">${totalOperatorPay.toLocaleString('es-CO')}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{Math.round(commissionRate * 100)}% comisión + propinas</div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                <div className="text-xs text-orange-600/70">Gastos del Turno</div>
                <div className="text-lg font-bold text-orange-600">${shiftExpenses.toLocaleString('es-CO')}</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <div className="text-xs text-red-600/70">Cancelados</div>
                <div className="text-lg font-bold text-red-600">${shiftLosses.toLocaleString('es-CO')}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{shiftDesisted.length} servicios</div>
              </div>
            </div>

            {/* Pending services (not counted in totals) */}
            {shiftPending.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
                  <Clock3 className="w-4 h-4 text-amber-600" /> Servicios Pendientes por Cobrar
                </h3>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {shiftPending.map((w) => (
                    <div key={w.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-slate-600">#{w.ticket_number}</span>
                        {w.plate && <span className="font-mono font-bold text-rose-500 bg-cyan-50 px-1.5 py-0.5 rounded">{w.plate}</span>}
                        <span className="text-slate-500 truncate">{w.category_name}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusColor(w.status)}`}>{statusLabelForWash(w)}</span>
                      </div>
                      <span className="font-bold text-amber-600 ml-2">${washTotal(w).toLocaleString('es-CO')}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">No suman al total recaudado. Permanecen activos para el siguiente turno.</p>
              </div>
            )}

            {/* Registered expenses */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-orange-600" /> Gastos del Turno
                </h3>
                <span className="text-sm font-bold text-orange-600">${shiftExpenses.toLocaleString('es-CO')}</span>
              </div>
              <div className="space-y-1.5">
                {expenses
                  .filter((e) => !lastClosureTime || e.created_at > lastClosureTime)
                  .slice(0, 5)
                  .map((e) => (
                    <div key={e.id} className="flex items-center justify-between bg-white border border-[#E2E8F0] shadow-sm rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0 flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 truncate">{e.description}</span>
                        {e.category && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-orange-50 text-orange-600 shrink-0">{expenseCategoryLabel(e.category)}</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-orange-600 ml-2">${e.amount.toLocaleString('es-CO')}</span>
                    </div>
                  ))}
                {expenses.filter((e) => !lastClosureTime || e.created_at > lastClosureTime).length === 0 && (
                  <p className="text-center text-slate-500 text-xs py-2">Sin gastos registrados</p>
                )}
              </div>
            </div>

            {/* Operator liquidation */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" /> Liquidación de especialista
              </h3>
              <div className="space-y-2">
                {operatorLiquidation.map((liq) => (
                  <div key={liq.operator_id ?? 'none'} className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{liq.operator_name}</div>
                        <div className="text-xs text-slate-500">{liq.washes} servicios · ${liq.commission.toLocaleString('es-CO')} comisión + ${liq.tips.toLocaleString('es-CO')} prop.</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-amber-600">${liq.total.toLocaleString('es-CO')}</div>
                        {liq.advances > 0 && <div className="text-xs text-rose-600">-${liq.advances.toLocaleString('es-CO')} vales</div>}
                      </div>
                    </div>
                    {liq.advances > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
                        <span>Comisión + Propinas</span>
                        <span>${(liq.commission + liq.tips).toLocaleString('es-CO')}</span>
                      </div>
                    )}
                    {liq.advances > 0 && (
                      <div className="text-xs text-slate-500 flex justify-between">
                        <span>- Vales/Adelantos</span>
                        <span className="text-rose-600">-${liq.advances.toLocaleString('es-CO')}</span>
                      </div>
                    )}
                  </div>
                ))}
                {operatorLiquidation.length === 0 && (
                  <p className="text-center text-slate-500 text-sm py-3">Sin servicios cobrados en este turno</p>
                )}
              </div>
            </div>

            {/* Wash detail list */}
            {shiftCompleted.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-600 mb-2">Servicios cobrados del turno</h3>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {shiftCompleted.map((w) => (
                    <div key={w.id} className="flex items-center justify-between bg-white border border-[#E2E8F0] shadow-sm rounded-lg px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-slate-600">#{w.ticket_number}</span>
                        {w.plate && <span className="font-mono font-bold text-rose-500 bg-cyan-50 px-1.5 py-0.5 rounded">{w.plate}</span>}
                        <span className="text-slate-500 truncate">{w.category_name}</span>
                      </div>
                      <span className="font-bold text-emerald-600 ml-2">${washTotal(w).toLocaleString('es-CO')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Net total */}
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200 rounded-xl p-4 mb-4 space-y-2">
              <div className="text-xs font-semibold text-slate-500 mb-1">Desglose por Medio de Pago</div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5 text-emerald-600" /> Efectivo</span>
                <span className="font-semibold text-emerald-600">${cashRevenue.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-rose-500" /> Nequi/Daviplata + Tarjeta</span>
                <span className="font-semibold text-rose-500">${digitalRevenue.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-amber-600" /> Crédito (Convenio)</span>
                <span className="font-semibold text-amber-600">${creditRevenue.toLocaleString('es-CO')}</span>
              </div>
              <div className="border-t border-amber-200 pt-2 flex justify-between items-center text-sm">
                <span className="text-slate-600">Ingresos Totales</span>
                <span className="font-semibold text-emerald-600">${shiftRevenue.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">- Pago especialista ({Math.round(commissionRate * 100)}% + propinas)</span>
                <span className="font-semibold text-amber-600">-${totalOperatorPay.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">- Gastos del Turno</span>
                <span className="font-semibold text-orange-600">-${shiftExpenses.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">- Vales/Adelantos en efectivo</span>
                <span className="font-semibold text-rose-600">-${shiftAdvancesCash.toLocaleString('es-CO')}</span>
              </div>
              <div className="border-t border-amber-200 pt-2 flex justify-between items-center">
                <span className="text-sm font-medium text-amber-700">Saldo Neto en Caja (Ganancia Salón)</span>
                <span className="text-2xl font-bold text-amber-600">${netCash.toLocaleString('es-CO')}</span>
              </div>
              <p className="text-[10px] text-slate-500">Las propinas entran a caja y salen directo a especialista; no afectan la utilidad del Salón.</p>
            </div>

            {/* Cash arqueo */}
            <div className="bg-slate-100 border border-[#E2E8F0] rounded-xl p-4 mb-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-600" /> Arqueo de Caja
              </h3>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Fondo inicial de caja (efectivo con el que arrancó el turno)</label>
                <input
                  type="number"
                  value={openingFund}
                  onChange={(e) => setOpeningFund(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full px-4 py-2.5 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 text-sm font-bold focus:outline-none focus:border-emerald-200"
                />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">+ Efectivo recaudado</span>
                <span className="font-semibold text-emerald-600">${cashRevenue.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">- Gastos del turno (efectivo)</span>
                <span className="font-semibold text-orange-600">-${shiftExpenses.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">- Vales/Adelantos en efectivo</span>
                <span className="font-semibold text-rose-600">-${shiftAdvancesCash.toLocaleString('es-CO')}</span>
              </div>
              <label className="flex items-center justify-between cursor-pointer bg-slate-800/30 border border-slate-100 rounded-xl p-3">
                <span className="text-sm text-slate-600">¿Pagó especialista en efectivo del turno?</span>
                <button
                  type="button"
                  onClick={() => setOperatorsPaidCash(!operatorsPaidCash)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${operatorsPaidCash ? 'bg-emerald-500' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${operatorsPaidCash ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </label>
              {operatorsPaidCash && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span className="pl-2">Comisiones + Propinas</span>
                    <span>${totalOperatorPay.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span className="pl-2">- Vales/Adelantos ya entregados</span>
                    <span>-${shiftAdvancesCash.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">- Pago especialista neto pendiente</span>
                    <span className="font-semibold text-amber-600">-${netOperatorPay.toLocaleString('es-CO')}</span>
                  </div>
                </div>
              )}
              <div className="border-t border-[#E2E8F0] pt-2 flex justify-between items-center text-sm">
                <span className="text-slate-600 font-medium">= Efectivo esperado en caja</span>
                <span className="font-bold text-emerald-600 text-lg">${expectedCash.toLocaleString('es-CO')}</span>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Efectivo contado (billetes y monedas)</label>
                <input
                  type="number"
                  value={countedCash}
                  onChange={(e) => setCountedCash(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 text-lg font-bold focus:outline-none focus:border-emerald-200"
                />
              </div>
              {countedCash > 0 && (
                <div className={`flex justify-between items-center text-sm p-3 rounded-xl border ${
                  cashDifference === 0
                    ? 'bg-emerald-50 border-emerald-200'
                    : cashDifference > 0
                    ? 'bg-cyan-50 border-cyan-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <span className="text-slate-600">{cashDifference === 0 ? 'Cuadre exacto' : cashDifference > 0 ? 'Sobrante' : 'Faltante'}</span>
                  <span className={`font-bold ${
                    cashDifference === 0
                      ? 'text-emerald-600'
                      : cashDifference > 0
                      ? 'text-rose-500'
                      : 'text-red-600'
                  }`}>
                    {cashDifference > 0 ? '+' : ''}${cashDifference.toLocaleString('es-CO')}
                  </span>
                </div>
              )}
            </div>

            {/* Confirmation step */}
            {!cierreConfirm ? (
              <div className="flex gap-3">
                <button
                  onClick={() => setCierreModal(false)}
                  className="action-control action-surface flex-1 py-3 border border-rose-200/80 text-slate-600 font-medium rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setCierreConfirm(true)}
                  disabled={shiftWashes.length === 0}
                  className="action-control flex-1 py-3 bg-gradient-to-br from-amber-400 to-amber-500 border border-rose-200/80 text-slate-900 font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" /> Cerrar Caja
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                  <p className="text-sm text-red-700">Al confirmar, el turno se reiniciará. Los servicios pendientes permanecen activos.</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCierreConfirm(false)}
                    className="action-control action-surface flex-1 py-3 border border-rose-200/80 text-slate-600 font-medium rounded-xl"
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleCierreCaja}
                    disabled={cierreSaving}
                    className="action-control flex-1 py-3 bg-gradient-to-br from-red-500 to-red-600 border border-rose-200/80 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {cierreSaving ? 'Guardando...' : 'Confirmar Cierre'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Commission Modal */}
      {commissionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Comisión de Especialistas</h3>
                <p className="text-xs text-slate-500">Porcentaje pagado a Especialistas</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="mt-3 space-y-3">
                <div className="flex gap-2">
                  {[30, 40, 50, 60].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setCommissionInput(p);
                        setIsCustomEditing(false);
                      }}
                      className={`action-control flex-1 py-2 rounded-lg text-sm font-medium border border-rose-200/80 transition-all ${
                        !isCustomEditing && commissionInput === p 
                          ? 'bg-gradient-to-br from-purple-50 via-white to-slate-50 text-purple-600 border-purple-300 shadow-sm' 
                          : 'action-surface text-slate-500'
                      }`}
                    >
                      {p}%
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setIsCustomEditing(true)}
                    className={`action-control flex-1 py-2 px-1 rounded-lg text-sm font-medium border border-rose-200/80 flex items-center justify-center gap-1 transition-all ${
                      isCustomEditing || ![30, 40, 50, 60].includes(commissionInput)
                        ? 'bg-gradient-to-br from-purple-50 via-white to-slate-50 text-purple-600 border-purple-300 shadow-sm' 
                        : 'action-surface text-slate-500'
                    }`}
                    title="Personalizar valor"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>{isCustomEditing || ![30, 40, 50, 60].includes(commissionInput) ? `${commissionInput}%` : 'Editar'}</span>
                  </button>
                </div>

                {isCustomEditing && (
                  <div className="flex items-center justify-center gap-2 bg-slate-50/50 p-2 rounded-lg border border-slate-200/80">
                    <span className="text-xs text-slate-500 font-medium">Valor personalizado (%):</span>
                    <input
                      type="number"
                      value={commissionInput}
                      onChange={(e) => setCommissionInput(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      autoFocus
                    />
                  </div>
                )}

                <p className="text-[11px] text-slate-500">
                  El Salón retiene el {100 - commissionInput}% sobre los servicios. Las propinas son 100% para las Especialistas.
                </p>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setCommissionModal(false)}
                  className="action-control action-surface flex-1 py-3 border border-rose-200/80 text-slate-600 font-medium rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!business || commissionSaving) return;
                    setCommissionSaving(true);
                    try {
                      const updated = { ...business, commission_rate: commissionInput / 100 };
                      await updateBusiness(updated);
                      setLocalCommissionRate(commissionInput / 100);
                      setBusiness(updated);
                      setCommissionModal(false);
                      showToast('Comisión actualizada', 'success');
                    } catch (err) {
                      console.error('Error updating commission:', err);
                      showToast('Error al actualizar comisión', 'error');
                    } finally {
                      setCommissionSaving(false);
                    }
                  }}
                  disabled={commissionSaving}
                  className="action-control flex-1 py-3 bg-gradient-to-br from-purple-500 to-purple-600 border border-rose-200/80 text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {commissionSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plate Scanner Modal */}
      {scannerOpen && (
        <PlateScannerModal
          onClose={() => setScannerOpen(false)}
          onPhotoCaptured={handlePhotoCaptured}
        />
      )}

      {/* Liquidation Modal */}
      {liquidationTarget && (
        <LiquidationModal
          wash={liquidationTarget}
          operators={operators}
          onClose={() => setLiquidationTarget(null)}
          onConfirm={handleConfirmLiquidation}
        />
      )}

      {/* Expenses Modal */}
      {expensesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-orange-200 p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Gastos del Día</h2>
                <p className="text-sm text-slate-500">Registra gastos operativos del turno</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Descripción</label>
                <input
                  type="text"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="Ej: Insumos de uñas, tintes..."
                  className="w-full px-4 py-3 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 text-sm focus:outline-none focus:border-orange-200 placeholder-slate-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Categoría</label>
                <div className="grid grid-cols-2 gap-2">
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setExpenseCategory(cat.value)}
                      className={`action-control py-2.5 px-3 rounded-xl text-sm font-medium border border-rose-200/80 ${
                        expenseCategory === cat.value
                          ? 'bg-gradient-to-br from-orange-50 via-white to-slate-50 text-orange-700'
                          : 'action-surface text-slate-500'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Monto</label>
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 text-lg font-bold focus:outline-none focus:border-orange-200"
                />
              </div>
              <button
                onClick={handleAddExpense}
                disabled={!expenseDesc.trim() || expenseAmount <= 0 || expenseSaving}
                className="action-control w-full py-3 bg-gradient-to-br from-orange-500 to-orange-600 border border-rose-200/80 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {expenseSaving ? 'Guardando...' : 'Agregar Gasto'}
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <h3 className="text-sm font-semibold text-slate-600">Gastos de hoy</h3>
              {expenses.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-4">No hay gastos registrados</p>
              ) : (
                expenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between bg-white border border-[#E2E8F0] shadow-sm rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{e.description}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        {e.category && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-orange-50 text-orange-600">{expenseCategoryLabel(e.category)}</span>
                        )}
                        {new Date(e.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-orange-600 text-sm">${e.amount.toLocaleString('es-CO')}</span>
                      <button
                        onClick={() => handleDeleteExpense(e.id)}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {expenses.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-orange-700">Total Gastos</span>
                  <span className="text-xl font-bold text-orange-600">${expenses.reduce((s, e) => s + e.amount, 0).toLocaleString('es-CO')}</span>
                </div>
              </div>
            )}

            <button
              onClick={() => { setExpensesModal(false); setExpenseDesc(''); setExpenseAmount(0); setExpenseCategory(null); }}
              className="action-control action-surface w-full py-3 border border-rose-200/80 text-slate-600 font-medium rounded-xl"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Loyalty Config Modal */}
      {loyaltyModal && business && (
        <LoyaltyConfigModal
          business={business}
          saving={loyaltySaving}
          onSave={handleSaveLoyalty}
          onClose={() => setLoyaltyModal(false)}
        />
      )}

      {/* Deliver & Payment Method Modal */}
      {deliverTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-emerald-200 p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <HandCoins className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Cobrar Servicio</h2>
                <p className="text-sm text-slate-500">#{deliverTarget.ticket_number} · {deliverTarget.category_name}</p>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl p-3 mb-4 flex justify-between items-center">
              <span className="text-sm text-slate-600">Total a cobrar</span>
              <span className="text-2xl font-bold text-emerald-600">${washTotal(deliverTarget).toLocaleString('es-CO')}</span>
            </div>

            <label className="text-xs text-slate-500 mb-2 block">Medio de Pago</label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {WASH_PAYMENT_METHODS.map((pm) => {
                const Icon = pm.value === 'efectivo' ? Banknote : pm.value === 'nequi_daviplata' ? Smartphone : pm.value === 'tarjeta' ? CreditCard : FileText;
                return (
                  <button
                    key={pm.value}
                    onClick={() => setDeliverPaymentMethod(pm.value)}
                    className={`action-control py-3 px-3 rounded-xl text-sm font-medium border border-rose-200/80 flex items-center gap-2 ${
                      deliverPaymentMethod === pm.value
                        ? 'bg-gradient-to-br from-emerald-50 via-white to-slate-50 text-emerald-700'
                        : 'action-surface text-slate-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {pm.label}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setDeliverTarget(null); setDeliverPaymentMethod(null); }}
                className="action-control action-surface flex-1 py-3 border border-rose-200/80 text-slate-600 font-medium rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeliver}
                disabled={!deliverPaymentMethod || deliverSaving}
                className="action-control flex-1 py-3 bg-gradient-to-br from-emerald-500 to-emerald-600 border border-rose-200/80 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {deliverSaving ? 'Guardando...' : 'Confirmar Cobro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advances (Vales/Adelantos) Modal */}
      {advancesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-rose-200 p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Vales y Adelantos</h2>
                <p className="text-sm text-slate-500">Adelantos a especialista</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Especialista</label>
                <div className="grid grid-cols-2 gap-2">
                  {operators.filter((o) => o.active && o.role === 'servicio').map((op) => (
                    <button
                      key={op.id}
                      onClick={() => setAdvanceOperator(op)}
                      className={`action-control py-2.5 px-3 rounded-xl text-sm font-medium border border-rose-200/80 ${
                        advanceOperator?.id === op.id
                          ? 'bg-gradient-to-br from-rose-50 via-white to-slate-50 text-rose-700'
                          : 'action-surface text-slate-500'
                      }`}
                    >
                      {op.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Concepto</label>
                <input
                  type="text"
                  value={advanceConcept}
                  onChange={(e) => setAdvanceConcept(e.target.value)}
                  placeholder="Ej: Adelanto del día, almuerzo..."
                  className="w-full px-4 py-3 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 text-sm focus:outline-none focus:border-rose-200 placeholder-slate-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Monto</label>
                <input
                  type="number"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 text-lg font-bold focus:outline-none focus:border-rose-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Origen del dinero</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAdvancePaidInCash(true)}
                    className={`action-control py-2.5 rounded-xl text-sm font-medium border border-rose-200/80 ${
                      advancePaidInCash
                        ? 'bg-gradient-to-br from-emerald-50 via-white to-slate-50 text-emerald-700'
                        : 'action-surface text-slate-500'
                    }`}
                  >
                    <Banknote className="w-4 h-4 inline mr-1" /> Efectivo (Caja)
                  </button>
                  <button
                    onClick={() => setAdvancePaidInCash(false)}
                    className={`action-control py-2.5 rounded-xl text-sm font-medium border border-rose-200/80 ${
                      !advancePaidInCash
                        ? 'action-surface text-rose-700'
                        : 'action-surface text-slate-500'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 inline mr-1" /> Digital
                  </button>
                </div>
              </div>
              <button
                onClick={handleAddAdvance}
                disabled={!advanceOperator || advanceAmount <= 0 || !advanceConcept.trim() || advanceSaving}
                className="action-control w-full py-3 bg-gradient-to-br from-rose-500 to-rose-600 border border-rose-200/80 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {advanceSaving ? 'Guardando...' : 'Registrar Adelanto'}
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <h3 className="text-sm font-semibold text-slate-600">Adelantos de hoy</h3>
              {advances.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-4">No hay adelantos registrados</p>
              ) : (
                advances.map((a) => (
                  <div key={a.id} className="flex items-center justify-between bg-white border border-[#E2E8F0] shadow-sm rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{a.operator_name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        {a.concept}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${a.paid_in_cash ? 'bg-emerald-50 text-emerald-600' : 'bg-cyan-50 text-rose-500'}`}>
                          {a.paid_in_cash ? 'Efectivo' : 'Digital'}
                        </span>
                        {a.settled && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">Saldado</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-rose-600 text-sm">${a.amount.toLocaleString('es-CO')}</span>
                      {!a.settled && (
                        <button
                          onClick={() => handleDeleteAdvance(a.id)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {advances.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-rose-700">Total Adelantos</span>
                  <span className="text-xl font-bold text-rose-600">${advances.reduce((s, a) => s + a.amount, 0).toLocaleString('es-CO')}</span>
                </div>
              </div>
            )}

            <button
              onClick={() => { setAdvancesModal(false); setAdvanceOperator(null); setAdvanceAmount(0); setAdvanceConcept(''); setAdvancePaidInCash(true); }}
              className="action-control action-surface w-full py-3 border border-rose-200/80 text-slate-600 font-medium rounded-xl"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Operator Liquidation Screen */}
      {liquidationView && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md overflow-y-auto">
          <div className="max-w-md mx-auto p-4 min-h-full">
            <div className="flex items-center gap-3 mb-5 sticky top-0 bg-slate-900/40 backdrop-blur-xl py-3 -mx-4 px-4 z-10 border-b border-[#E2E8F0]">
              <button
                onClick={() => setLiquidationView(false)}
                className="p-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-100 transition-all"
              >
                <LogOut className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-600" /> Liquidación de Especialistas
              </h2>
            </div>

            {operatorLiquidation.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay servicios cobrados en este turno</p>
              </div>
            ) : (
              <div className="space-y-4">
                {operatorLiquidation.map((liq) => {
                  const opAdvances = advances.filter((a) => a.operator_id === liq.operator_id && !a.settled);
                  return (
                    <div key={liq.operator_id ?? 'none'} className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                          <User className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-slate-900">{liq.operator_name}</div>
                          <div className="text-xs text-slate-500">{liq.washes} servicios completados</div>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Comisiones ({Math.round(commissionRate * 100)}%)</span>
                          <span className="font-medium text-emerald-600">${liq.commission.toLocaleString('es-CO')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Propinas</span>
                          <span className="font-medium text-rose-500">${liq.tips.toLocaleString('es-CO')}</span>
                        </div>
                        {liq.advances > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">- Vales/Adelantos</span>
                            <span className="font-medium text-rose-600">-${liq.advances.toLocaleString('es-CO')}</span>
                          </div>
                        )}
                        <div className="border-t border-[#E2E8F0] pt-1.5 flex justify-between">
                          <span className="font-semibold text-slate-900">Neto a Pagar</span>
                          <span className="text-xl font-bold text-amber-600">${liq.total.toLocaleString('es-CO')}</span>
                        </div>
                      </div>

                      {opAdvances.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                          <div className="text-xs text-slate-500 mb-1">Adelantos pendientes:</div>
                          {opAdvances.map((a) => (
                            <div key={a.id} className="flex justify-between text-xs">
                              <span className="text-slate-500">{a.concept}</span>
                              <span className="text-rose-600">${a.amount.toLocaleString('es-CO')}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => handlePayOperator(liq.operator_id!)}
                        disabled={opAdvances.length === 0}
                        className="action-control w-full mt-4 py-3 bg-gradient-to-br from-indigo-500 to-rose-600 border border-rose-200/80 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {opAdvances.length > 0 ? 'Pagar y Saldar Vales' : 'Vales ya saldados'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl px-2 py-2 text-center">
      <div className={`flex items-center justify-center gap-1 ${color}`}>
        {icon}
        <span className="text-base font-bold">{value}</span>
      </div>
      <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function LoyaltyConfigModal({
  business, saving, onSave, onClose,
}: {
  business: { loyalty_enabled: boolean; loyalty_threshold: number; loyalty_reward_type: 'free' | 'discount'; loyalty_discount_percent: number };
  saving: boolean;
  onSave: (config: { loyalty_enabled: boolean; loyalty_threshold: number; loyalty_reward_type: 'free' | 'discount'; loyalty_discount_percent: number }) => void;
  onClose: () => void;
}) {
  const [enabled, setEnabled] = useState(business.loyalty_enabled);
  const [threshold, setThreshold] = useState(business.loyalty_threshold);
  const [rewardType, setRewardType] = useState<'free' | 'discount'>(business.loyalty_reward_type);
  const [discountPercent, setDiscountPercent] = useState(business.loyalty_discount_percent);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-amber-200 p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
            <Gift className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Fidelización</h2>
            <p className="text-sm text-slate-500">Programa de premios por recurrencia</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white border border-[#E2E8F0] shadow-sm rounded-xl p-3">
            <div>
              <div className="text-sm font-medium text-slate-900">Activar programa</div>
              <div className="text-xs text-slate-500">Premia a clientes recurrentes</div>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative w-12 h-6 rounded-full transition-all ${enabled ? 'bg-amber-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${enabled ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>

          {enabled && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl p-4">
                <label className="text-xs text-slate-500 mb-2 block">Servicios necesarios para premio</label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-transparent text-3xl font-bold text-slate-900 focus:outline-none text-center"
                />
                <div className="flex gap-2 mt-3">
                  {[5, 10, 15, 20].map((t) => (
                    <button
                      key={t}
                      onClick={() => setThreshold(t)}
                      className={`action-control flex-1 py-2 rounded-lg text-sm font-medium border border-rose-200/80 ${
                        threshold === t ? 'bg-gradient-to-br from-amber-50 via-white to-slate-50 text-amber-600' : 'action-surface text-slate-500'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-2 block">Tipo de premio</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRewardType('free')}
                    className={`action-control py-3 rounded-xl text-sm font-medium border border-rose-200/80 ${
                      rewardType === 'free'
                        ? 'bg-gradient-to-br from-emerald-50 via-white to-slate-50 text-emerald-600'
                        : 'action-surface text-slate-500'
                    }`}
                  >
                    Servicio Gratis
                  </button>
                  <button
                    onClick={() => setRewardType('discount')}
                    className={`action-control py-3 rounded-xl text-sm font-medium border border-rose-200/80 ${
                      rewardType === 'discount'
                        ? 'action-surface text-rose-500'
                        : 'action-surface text-slate-500'
                    }`}
                  >
                    Descuento
                  </button>
                </div>
              </div>

              {rewardType === 'discount' && (
                <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl p-4 animate-fadeIn">
                  <label className="text-xs text-slate-500 mb-2 block">Porcentaje de descuento (%)</label>
                  <input
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-full bg-transparent text-3xl font-bold text-slate-900 focus:outline-none text-center"
                  />
                  <div className="flex gap-2 mt-3">
                    {[10, 20, 30, 50].map((p) => (
                      <button
                        key={p}
                        onClick={() => setDiscountPercent(p)}
                        className={`action-control flex-1 py-2 rounded-lg text-sm font-medium border border-rose-200/80 ${
                          discountPercent === p ? 'bg-gradient-to-br from-rose-100 via-white to-slate-50 text-rose-500' : 'action-surface text-slate-500'
                        }`}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-slate-500">
                  {rewardType === 'free'
                    ? `Al completar ${threshold} servicios, la siguiente visita será un servicio sin costo.`
                    : `Al completar ${threshold} servicios, la siguiente visita tendrá ${discountPercent}% de descuento.`}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="action-control action-surface flex-1 py-3 border border-rose-200/80 text-slate-600 font-medium rounded-xl"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave({ loyalty_enabled: enabled, loyalty_threshold: threshold, loyalty_reward_type: rewardType, loyalty_discount_percent: discountPercent })}
            disabled={saving}
            className="action-control flex-1 py-3 bg-gradient-to-br from-amber-400 to-amber-500 border border-rose-200/80 text-slate-900 font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Gift className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}