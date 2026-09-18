import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Car, Bike, Truck, Plus, User, Clock, CheckCircle2, XCircle,
  Receipt, RotateCcw, LogOut, AlertTriangle, Timer, Printer,
  ChevronRight, Users, Settings, TrendingUp, Wallet, Lock,
  MessageCircle, Trash2, ShoppingCart, Camera, Percent,
  Play, Square, HandCoins, Clock3, Gift, Search, Sparkles,
  Banknote, Smartphone, CreditCard, FileText, ClipboardList, Pencil
} from 'lucide-react';
import { useApp } from '@/lib/store';
import {
  fetchOperators, fetchCategories, fetchWashes, saveWash, getNextTicketNumber,
  saveOperator, deleteOperator, saveCategory, deleteCategory, uuid,
  saveDailyClosure, fetchLastClosure, fetchExpenses, saveExpense, deleteExpense,
  fetchOperatorAdvances, saveOperatorAdvance, deleteOperatorAdvance, settleAdvances,
  updateWashStatus, subscribeToWashes, saveWashItems, lookupPlateHistory, type PlateHistory
} from '@/lib/data';
import { getSubscriptionState } from '@/lib/subscription';
import { printTicket, ticketTip, computeTicketTotal } from '@/lib/ticket';
import { updateBusiness } from '@/lib/data';
import type { Operator, VehicleCategory, Wash, WashStatus, OperatorLiquidationEntry, Expense } from '@/lib/types';
import { EXPENSE_CATEGORIES, expenseCategoryLabel, WASH_PAYMENT_METHODS, washPaymentMethodLabel } from '@/lib/types';

// Importación del gestor de servicios de Nail World
import { ServiceManager } from './ServiceManager';

export function OwnerView() {
  const { business, setBusiness, setRole } = useApp();
  // Permitimos 'services' dentro del tipo del estado de pestañas
  const [tab, setTab] = useState<string>('dashboard');
  const [washes, setWashes] = useState<Wash[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [showDates, setShowDates] = useState(false);
  const [closures, setClosures] = useState<any[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<any | null>(null);
  const subState = business ? getSubscriptionState(business) : null;

  const loadData = useCallback(async () => {
    if (!business) return;
    const [w, o] = await Promise.all([
      fetchWashes(business.id),
      fetchOperators(business.id)
    ]);
    setWashes(w);
    setOperators(o);
  }, [business]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Arreglo de pestañas de navegación con 'Servicios' incluido
  const TABS = [
    { id: 'dashboard', label: 'Resumen', icon: TrendingUp },
    { id: 'services', label: 'Servicios', icon: Sparkles },
    { id: 'liquidation', label: 'Liquidación', icon: Receipt },
    { id: 'losses', label: 'Pérdidas', icon: AlertTriangle },
    { id: 'inventory', label: 'Inventario', icon: ShoppingCart },
    { id: 'history', label: 'Historial', icon: Clock },
    { id: 'operators', label: 'Especialistas', icon: Users },
    { id: 'subscription', label: 'Suscripción', icon: CreditCard },
  ];

  if (!business) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Encabezado del Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{business.name}</h1>
          <p className="text-sm text-slate-500">Modo Dueño · Panel de Control</p>
        </div>
      </div>

      {/* Menú de Navegación (Tabs) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`action-control action-surface border font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Contenido según la pestaña activa */}
      <div className="space-y-6">
        {/* Pestaña de Servicios */}
        {tab === 'services' && (
          <ServiceManager businessId={business.id} />
        )}

        {/* Otras pestañas (Resumen, Inventario, Especialistas, etc.) */}
        {tab === 'dashboard' && (
          <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200">
            <p className="text-slate-600">Vista general de ingresos y turnos.</p>
          </div>
        )}

        {/* ... resto de las vistas de tu OwnerView ... */}
      </div>
    </div>
  );
}