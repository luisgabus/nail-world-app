import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, Clock, AlertTriangle, Users, Package,
  LogOut, DollarSign, Calendar, ChevronDown, ChevronUp, Plus, Minus,
  ArrowLeft, Boxes, Receipt, Wallet, ChevronRight, History,
  CreditCard, Smartphone, Banknote, QrCode, CheckCircle2,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import {
  fetchWashesByDateRange, fetchOperators, fetchInventoryItems,
  saveInventoryItem, deleteInventoryItem, addInventoryMovement,
  fetchInventoryMovements, fetchDailyClosures, uuid,
  fetchPaymentConfig,
} from '@/lib/data';
import type { Wash, Operator, InventoryItem, InventoryMovement, DailyClosure, PaymentConfig } from '@/lib/types';
import { getSubscriptionState, planLabel, statusLabel } from '@/lib/subscription';
import { SyncIndicator } from './SyncIndicator';
import { HistoryView } from './HistoryView';
import { OperatorPerformanceView } from './OperatorPerformanceView';

type OwnerTab = 'dashboard' | 'liquidation' | 'losses' | 'inventory' | 'history' | 'operators' | 'subscription';

function washTotal(w: Wash): number {
  return (w.total_price ?? (w.price + (w.additional_total ?? 0))) || w.price;
}

export function OwnerView() {
  const { business, setBusiness, setRole } = useApp();
  const [tab, setTab] = useState<OwnerTab>('dashboard');
  const [washes, setWashes] = useState<Wash[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [showDates, setShowDates] = useState(false);
  const [closures, setClosures] = useState<DailyClosure[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const subState = business ? getSubscriptionState(business) : null;

  const loadData = useCallback(async () => {
    if (!business) return;
    const [ws, ops, cls, config] = await Promise.all([
      fetchWashesByDateRange(business.id, startDate, endDate),
      fetchOperators(business.id),
      fetchDailyClosures(business.id),
      fetchPaymentConfig(),
    ]);
    setWashes(ws);
    setOperators(ops);
    setClosures(cls);
    setPaymentConfig(config);
  }, [business, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = () => {
    setBusiness(null);
    setRole(null);
  };

  // Metrics
  const completed = washes.filter((w) => w.status === 'completado');
  const desisted = washes.filter((w) => w.status === 'desistido');
  const totalRevenue = completed.reduce((s, w) => s + washTotal(w), 0);
  const totalTips = completed.reduce((s, w) => s + w.tip, 0);
  const totalLosses = desisted.reduce((s, w) => s + w.potential_loss, 0);
  const avgDuration = completed.filter((w) => w.duration_seconds).length > 0
    ? Math.round(completed.filter((w) => w.duration_seconds).reduce((s, w) => s + (w.duration_seconds ?? 0), 0) / completed.filter((w) => w.duration_seconds).length)
    : 0;

  // Revenue by category
  const revenueByCategory = new Map<string, { count: number; revenue: number }>();
  for (const w of completed) {
    const entry = revenueByCategory.get(w.category_name) ?? { count: 0, revenue: 0 };
    entry.count++;
    entry.revenue += washTotal(w) + w.tip;
    revenueByCategory.set(w.category_name, entry);
  }

  // Loss by reason
  const lossByReason = new Map<string, { count: number; loss: number }>();
  for (const w of desisted) {
    const reason = w.cancellation_reason ?? 'Sin motivo';
    const entry = lossByReason.get(reason) ?? { count: 0, loss: 0 };
    entry.count++;
    entry.loss += w.potential_loss;
    lossByReason.set(reason, entry);
  }

  // Liquidation by operator
  const commissionRate = business?.commission_rate ?? 0.40;
  const liquidation = new Map<string, { name: string; count: number; revenue: number; commission: number; tips: number }>();
  for (const w of completed) {
    const name = w.operator_name || 'Sin Especialista';
    const entry = liquidation.get(name) ?? { name, count: 0, revenue: 0, commission: 0, tips: 0 };
    entry.count++;
    entry.revenue += washTotal(w);
    entry.tips += w.tip;
    liquidation.set(name, entry);
  }
  for (const entry of liquidation.values()) {
    entry.commission = Math.round(entry.revenue * commissionRate);
  }

  // Hourly distribution (for congestion analysis)
  const hourly = new Array(24).fill(0);
  for (const w of washes) {
    const hour = new Date(w.created_at).getHours();
    hourly[hour]++;
  }
  const maxHourly = Math.max(...hourly, 1);

  const maxCatRevenue = Math.max(...[...revenueByCategory.values()].map((v) => v.revenue), 1);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white backdrop-blur-xl border-b border-[#E2E8F0] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">{business?.name}</h1>
              <p className="text-xs text-slate-500">Modo Dueño · Panel de Control</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SyncIndicator />
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-100 transition-all"
            >
              <LogOut className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Date range selector */}
      <div className="px-4 py-3">
        <button
          onClick={() => setShowDates(!showDates)}
          className="w-full flex items-center justify-between p-3 bg-white border border-[#E2E8F0] shadow-sm rounded-xl text-sm"
        >
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            {startDate === endDate ? `Hoy (${startDate})` : `${startDate} → ${endDate}`}
          </span>
          {showDates ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>
        {showDates && (
          <div className="flex gap-2 mt-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 text-sm focus:outline-none focus:border-rose-200"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 text-sm focus:outline-none focus:border-rose-200"
            />
          </div>
        )}
      </div>

      {/* Subscription banner */}
      {subState && (subState.isWarning || subState.isGrace || subState.isBlocked) && (
        <div className={`mx-4 mb-2 p-3 rounded-xl border ${subState.bannerBg} ${subState.borderColor} flex items-center gap-2`}>
          <AlertTriangle className={`w-4 h-4 shrink-0 ${subState.bannerColor}`} />
          <span className={`text-sm font-medium ${subState.bannerColor}`}>{subState.label}</span>
        </div>
      )}

      {/* Tab navigation */}
      <nav className="px-4 flex gap-2 overflow-x-auto pb-2">
        {([
          { key: 'dashboard', label: 'Resumen', Icon: TrendingUp },
          { key: 'liquidation', label: 'Liquidación', Icon: Users },
          { key: 'losses', label: 'Pérdidas', Icon: AlertTriangle },
          { key: 'inventory', label: 'Inventario', Icon: Package },
          { key: 'history', label: 'Historial', Icon: History },
          { key: 'operators', label: 'Especialistas', Icon: Users },
          { key: 'subscription', label: 'Suscripción', Icon: CreditCard },
        ] as { key: OwnerTab; label: string; Icon: typeof TrendingUp }[]).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              tab === key
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20'
                : 'bg-white border border-[#E2E8F0] text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </nav>

      <main className="px-4 py-4 pb-24">
        {/* DASHBOARD TAB */}
        {tab === 'dashboard' && (
          <div className="space-y-4 animate-fadeIn">
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3">
              <KPICard label="Ingresos" value={`$${totalRevenue.toLocaleString('es-CO')}`} Icon={DollarSign} color="from-emerald-600 to-green-500" />
              <KPICard label="Propinas" value={`$${totalTips.toLocaleString('es-CO')}`} Icon={TrendingUp} color="from-rose-600 to-rose-500" />
              <KPICard label="servicios" value={completed.length.toString()} Icon={Receipt} color="from-rose-600 to-indigo-500" />
              <KPICard label="Desistidos" value={desisted.length.toString()} Icon={AlertTriangle} color="from-red-600 to-rose-500" />
            </div>

            {/* Revenue by category chart */}
            <section className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-slate-600 mb-3">Ingresos por categoría</h3>
              <div className="space-y-3">
                {[...revenueByCategory.entries()].sort((a, b) => b[1].revenue - a[1].revenue).map(([name, data]) => (
                  <div key={name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{name} ({data.count})</span>
                      <span className="font-semibold text-emerald-600">${data.revenue.toLocaleString('es-CO')}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-500"
                        style={{ width: `${(data.revenue / maxCatRevenue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {revenueByCategory.size === 0 && (
                  <p className="text-center text-slate-500 text-sm py-4">Sin datos en este período</p>
                )}
              </div>
            </section>

            {/* Hourly congestion chart */}
            <section className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-500" /> Distribución por hora (congestión)
              </h3>
              <div className="flex items-end gap-0.5 h-24">
                {hourly.map((count, hour) => (
                  <div key={hour} className="flex-1 flex flex-col items-center justify-end group relative">
                    <div
                      className={`w-full rounded-t transition-all duration-300 ${
                        count > 0 ? 'bg-gradient-to-t from-rose-600 to-rose-500' : 'bg-slate-100'
                      }`}
                      style={{ height: `${(count / maxHourly) * 100}%`, minHeight: count > 0 ? '4px' : '2px' }}
                    />
                    {count > 0 && (
                      <span className="absolute -top-5 text-[10px] text-rose-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                        {count}
                      </span>
                    )}
                    {hour % 3 === 0 && <span className="text-[8px] text-slate-500 mt-1">{hour}h</span>}
                  </div>
                ))}
              </div>
            </section>

            {/* Avg duration */}
            <section className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" /> Tiempo promedio de atención
              </h3>
              <p className="text-3xl font-bold text-slate-900">
                {Math.floor(avgDuration / 60)}m <span className="text-lg text-slate-500">{avgDuration % 60}s</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">Basado en {completed.length} servicios completados</p>
            </section>
          </div>
        )}

        {/* LIQUIDATION TAB */}
        {tab === 'liquidation' && (
          <div className="space-y-3 animate-fadeIn">
            <h3 className="text-sm font-semibold text-slate-600">Liquidación diaria por servicio</h3>
            {[...liquidation.values()].sort((a, b) => b.revenue - a.revenue).map((liq) => (
              <div key={liq.name} className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                      <Users className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{liq.name}</div>
                      <div className="text-xs text-slate-500">{liq.count} servicios</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-slate-100 rounded-lg p-2">
                    <div className="text-xs text-slate-500">Servicios</div>
                    <div className="font-bold text-emerald-600">${liq.revenue.toLocaleString('es-CO')}</div>
                  </div>
                  <div className="bg-slate-100 rounded-lg p-2">
                    <div className="text-xs text-slate-500">Comisión ({Math.round(commissionRate * 100)}%)</div>
                    <div className="font-bold text-amber-600">${liq.commission.toLocaleString('es-CO')}</div>
                  </div>
                  <div className="bg-slate-100 rounded-lg p-2">
                    <div className="text-xs text-slate-500">Propinas</div>
                    <div className="font-bold text-rose-500">${liq.tips.toLocaleString('es-CO')}</div>
                  </div>
                  <div className="col-span-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200 rounded-lg p-2 flex justify-between items-center">
                    <span className="text-sm font-medium text-amber-700">Total a liquidar</span>
                    <span className="font-bold text-lg text-amber-600">${(liq.commission + liq.tips).toLocaleString('es-CO')}</span>
                  </div>
                </div>
              </div>
            ))}
            {liquidation.size === 0 && (
              <p className="text-center text-slate-500 py-8 text-sm">Sin datos en este período</p>
            )}
          </div>
        )}

        {/* LOSSES TAB */}
        {tab === 'losses' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-sm font-semibold text-red-700">Pérdidas por desistimientos</h3>
              </div>
              <p className="text-3xl font-bold text-red-600">${totalLosses.toLocaleString('es-CO')}</p>
              <p className="text-xs text-slate-500 mt-1">{desisted.length} desistimientos en el período</p>
            </div>

            <section className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-slate-600 mb-3">Pérdidas por motivo</h3>
              <div className="space-y-3">
                {[...lossByReason.entries()].sort((a, b) => b[1].loss - a[1].loss).map(([reason, data]) => (
                  <div key={reason}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{reason} ({data.count}x)</span>
                      <span className="font-semibold text-red-600">${data.loss.toLocaleString('es-CO')}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-rose-400 rounded-full"
                        style={{ width: `${totalLosses > 0 ? (data.loss / totalLosses) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
                {lossByReason.size === 0 && (
                  <p className="text-center text-slate-500 text-sm py-4">Sin desistimientos en este período</p>
                )}
              </div>
            </section>

            {/* Desisted washes list */}
            <section>
              <h3 className="text-sm font-semibold text-slate-600 mb-2">Detalle de desistimientos</h3>
              <div className="space-y-2">
                {desisted.map((w) => (
                  <div key={w.id} className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">#{w.ticket_number} · {w.category_name}</div>
                      <div className="text-xs text-slate-500">{w.cancellation_reason}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-red-600">-${w.potential_loss.toLocaleString('es-CO')}</div>
                      <div className="text-[10px] text-slate-500">{new Date(w.created_at).toLocaleDateString('es-CO')}</div>
                    </div>
                  </div>
                ))}
                {desisted.length === 0 && (
                  <p className="text-center text-slate-500 py-4 text-sm">Sin desistimientos</p>
                )}
              </div>
            </section>
          </div>
        )}

        {/* INVENTORY TAB */}
        {tab === 'inventory' && (
          <InventoryManager businessId={business!.id} />
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <HistoryView closures={closures} />
        )}

        {/* OPERATORS PERFORMANCE TAB */}
        {tab === 'operators' && (
          <OperatorPerformanceView washes={washes} />
        )}

        {/* SUBSCRIPTION TAB */}
        {tab === 'subscription' && business && subState && (
          <div className="space-y-4 animate-fadeIn">
            {/* Status banner */}
            <div className={`p-4 rounded-2xl border ${subState.bannerBg} ${subState.borderColor}`}>
              <div className="flex items-center gap-3">
                {subState.isBlocked ? (
                  <AlertTriangle className={`w-6 h-6 ${subState.bannerColor}`} />
                ) : subState.isGrace || subState.isWarning ? (
                  <Clock className={`w-6 h-6 ${subState.bannerColor}`} />
                ) : (
                  <CheckCircle2 className={`w-6 h-6 ${subState.bannerColor}`} />
                )}
                <div>
                  <div className={`font-bold ${subState.bannerColor}`}>{subState.label}</div>
                  {business.next_billing_date && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      Vence el {new Date(business.next_billing_date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Plan info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-4">
                <div className="text-xs text-slate-500 mb-1">Plan actual</div>
                <div className="text-xl font-bold text-rose-500">{planLabel(business.plan_type)}</div>
              </div>
              <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-4">
                <div className="text-xs text-slate-500 mb-1">Estado</div>
                <div className={`text-xl font-bold ${
                  business.subscription_status === 'active' ? 'text-emerald-600'
                  : business.subscription_status === 'grace' ? 'text-orange-600'
                  : 'text-red-600'
                }`}>{statusLabel(business.subscription_status)}</div>
              </div>
            </div>

            {/* Pricing */}
            {paymentConfig && (
              <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-rose-500" /> Tarifas disponibles
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 text-center">
                    <div className="text-xs text-rose-500/70">Plan Mensual</div>
                    <div className="text-2xl font-bold text-rose-500">${paymentConfig.monthly_price.toLocaleString('es-CO')}</div>
                    <div className="text-[10px] text-slate-500">por mes</div>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                    <div className="text-xs text-rose-500/70">Plan Anual</div>
                    <div className="text-2xl font-bold text-rose-500">${paymentConfig.annual_price.toLocaleString('es-CO')}</div>
                    <div className="text-[10px] text-slate-500">por año (ahorra 25%)</div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment methods */}
            {paymentConfig && (
              <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-4 space-y-4">
                <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" /> Cómo pagar tu suscripción
                </h3>

                {paymentConfig.nequi_number && (
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <Smartphone className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-slate-500">Nequi / Daviplata</div>
                      <div className="text-sm font-bold text-slate-900">{paymentConfig.nequi_number}</div>
                    </div>
                  </div>
                )}

                {paymentConfig.bank_account && (
                  <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl p-3">
                    <Banknote className="w-5 h-5 text-rose-500 shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-slate-500">Cuenta bancaria</div>
                      <div className="text-sm font-bold text-slate-900">{paymentConfig.bank_account}</div>
                      {paymentConfig.bank_holder && <div className="text-xs text-slate-500">Titular: {paymentConfig.bank_holder}</div>}
                    </div>
                  </div>
                )}

                {paymentConfig.breb_key && (
                  <div className="flex items-center gap-3 bg-cyan-50 border border-cyan-200 rounded-xl p-3">
                    <Smartphone className="w-5 h-5 text-rose-500 shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-slate-500">Bre-B / Interoperable</div>
                      <div className="text-sm font-bold text-slate-900">{paymentConfig.breb_key}</div>
                    </div>
                  </div>
                )}

                {paymentConfig.qr_image_url && (
                  <div className="flex flex-col items-center gap-2 bg-white border border-[#E2E8F0] shadow-sm rounded-xl p-4">
                    <QrCode className="w-5 h-5 text-slate-500" />
                    <img src={paymentConfig.qr_image_url} alt="Código QR de pago" className="w-40 h-40 rounded-xl object-contain bg-white p-2" />
                    <span className="text-xs text-slate-500">Escanea el código QR para pagar</span>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Instrucciones
              </h3>
              <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside">
                <li>Realiza el pago por uno de los medios indicados arriba.</li>
                <li>Envía el comprobante de pago al administrador.</li>
                <li>El administrador activará tu renovación desde el panel de control.</li>
                <li>Tu suscripción se renovará automáticamente por el periodo contratado.</li>
              </ol>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ============ Inventory Manager ============
function InventoryManager({ businessId }: { businessId: string }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustType, setAdjustType] = useState<'in' | 'out' | 'adjust'>('in');
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('unidades');
  const [newQty, setNewQty] = useState(0);
  const [newMin, setNewMin] = useState(0);

  const load = useCallback(async () => {
    const [items, movs] = await Promise.all([
      fetchInventoryItems(businessId),
      fetchInventoryMovements(businessId),
    ]);
    setItems(items);
    setMovements(movs);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const item: InventoryItem = {
      id: uuid(),
      business_id: businessId,
      name: newName.trim(),
      unit: newUnit,
      quantity: newQty,
      min_quantity: newMin,
      created_at: new Date().toISOString(),
    };
    await saveInventoryItem(item);
    if (newQty > 0) {
      await addInventoryMovement({
        id: uuid(),
        item_id: item.id,
        business_id: businessId,
        type: 'in',
        quantity: newQty,
        note: 'Stock inicial',
        created_at: new Date().toISOString(),
      });
    }
    setNewName(''); setNewUnit('unidades'); setNewQty(0); setNewMin(0);
    setShowAdd(false);
    await load();
  };

  const handleAdjust = async () => {
    if (!adjustItem || adjustQty === 0) return;
    let newQty = adjustItem.quantity;
    if (adjustType === 'in') newQty += adjustQty;
    else if (adjustType === 'out') newQty -= adjustQty;
    else newQty = adjustQty;

    await saveInventoryItem({ ...adjustItem, quantity: newQty });
    await addInventoryMovement({
      id: uuid(),
      item_id: adjustItem.id,
      business_id: businessId,
      type: adjustType,
      quantity: adjustQty,
      note: adjustType === 'adjust' ? `Ajuste a ${newQty}` : '',
      created_at: new Date().toISOString(),
    });
    setAdjustItem(null); setAdjustQty(0); setAdjustType('in');
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteInventoryItem(id);
    await load();
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <button
        onClick={() => setShowAdd(true)}
        className="action-control w-full py-3 bg-gradient-to-br from-rose-600 to-rose-500 border border-rose-200/80 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" /> Agregar Insumo
      </button>

      <div className="space-y-2">
        {items.map((item) => {
          const low = item.quantity <= item.min_quantity;
          return (
            <div key={item.id} className={`p-3 rounded-2xl border ${low ? 'bg-red-50 border-red-200' : 'bg-white border-[#E2E8F0]'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${low ? 'bg-red-50' : 'bg-rose-50'}`}>
                    <Boxes className={`w-5 h-5 ${low ? 'text-red-600' : 'text-rose-500'}`} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.quantity} {item.unit} · Min: {item.min_quantity}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setAdjustItem(item); setAdjustType('in'); setAdjustQty(0); }} className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-all">
                    <Plus className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setAdjustItem(item); setAdjustType('out'); setAdjustQty(0); }} className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-all">
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {low && <p className="text-xs text-red-600 mt-2">Stock bajo</p>}
            </div>
          );
        })}
        {items.length === 0 && <p className="text-center text-slate-500 py-8 text-sm">Sin insumos registrados</p>}
      </div>

      {/* Recent movements */}
      {movements.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-600 mb-2">Movimientos recientes</h3>
          <div className="space-y-1">
            {movements.slice(0, 15).map((m) => (
              <div key={m.id} className="flex items-center gap-2 p-2 bg-white rounded-lg text-xs">
                <span className={`px-1.5 py-0.5 rounded font-mono ${m.type === 'in' ? 'bg-emerald-50 text-emerald-600' : m.type === 'out' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-500'}`}>
                  {m.type === 'in' ? '+' : m.type === 'out' ? '-' : '='}
                </span>
                <span className="text-slate-600 flex-1">{m.quantity}</span>
                <span className="text-slate-500">{new Date(m.created_at).toLocaleDateString('es-CO')}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Nuevo Insumo</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-slate-900">X</button>
            </div>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre" className="w-full px-4 py-3 mb-2 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-200" autoFocus />
            <div className="flex gap-2 mb-2">
              <input type="text" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="Unidad" className="flex-1 px-4 py-3 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-200" />
              <input type="number" value={newQty} onChange={(e) => setNewQty(Number(e.target.value))} placeholder="Cantidad" className="w-24 px-4 py-3 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-rose-200" />
            </div>
            <input type="number" value={newMin} onChange={(e) => setNewMin(Number(e.target.value))} placeholder="Stock mínimo" className="w-full px-4 py-3 mb-4 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-200" />
            <button onClick={handleAdd} disabled={!newName.trim()} className="action-control w-full py-3 bg-gradient-to-br from-rose-600 to-rose-500 border border-rose-200/80 text-white font-semibold rounded-xl disabled:opacity-50">Guardar</button>
          </div>
        </div>
      )}

      {/* Adjust modal */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{adjustItem.name}</h2>
              <button onClick={() => setAdjustItem(null)} className="text-slate-500 hover:text-slate-900">X</button>
            </div>
            <p className="text-sm text-slate-500 mb-3">Stock actual: {adjustItem.quantity} {adjustItem.unit}</p>
            <div className="flex gap-2 mb-3">
              {(['in', 'out', 'adjust'] as const).map((t) => (
                <button key={t} onClick={() => setAdjustType(t)} className={`action-control flex-1 py-2 rounded-lg text-sm font-medium border border-rose-200/80 ${adjustType === t ? 'bg-gradient-to-br from-rose-100 via-white to-slate-50 text-rose-500' : 'action-surface text-slate-500'}`}>
                  {t === 'in' ? 'Entrada' : t === 'out' ? 'Salida' : 'Ajuste'}
                </button>
              ))}
            </div>
            <input type="number" value={adjustQty} onChange={(e) => setAdjustQty(Number(e.target.value))} placeholder="Cantidad" className="w-full px-4 py-3 mb-4 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-rose-200" autoFocus />
            <button onClick={handleAdjust} disabled={adjustQty === 0} className="action-control w-full py-3 bg-gradient-to-br from-rose-600 to-rose-500 border border-rose-200/80 text-white font-semibold rounded-xl disabled:opacity-50">Confirmar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({ label, value, Icon, color }: { label: string; value: string; Icon: typeof DollarSign; color: string }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-4 shadow-lg`}>
      <Icon className="w-5 h-5 text-white/70 mb-2" />
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-white/70 mt-0.5">{label}</div>
    </div>
  );
}
