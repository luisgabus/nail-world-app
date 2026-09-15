import { useState, useMemo } from 'react';
import {
  Wallet, Calendar, ChevronRight, X, Users, TrendingUp,
  DollarSign, Car, HandCoins, ShoppingCart,
} from 'lucide-react';
import type { DailyClosure } from '@/lib/types';

type RangePreset = 'today' | 'week' | 'month' | 'custom';

function startOfDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getRange(preset: RangePreset): { start: string; end: string } {
  const now = new Date();
  const end = startOfDay(now);
  if (preset === 'today') return { start: end, end };
  if (preset === 'week') {
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    return { start: startOfDay(monday), end };
  }
  if (preset === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: startOfDay(first), end };
  }
  return { start: end, end };
}

export function HistoryView({ closures }: { closures: DailyClosure[] }) {
  const [preset, setPreset] = useState<RangePreset>('month');
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [detail, setDetail] = useState<DailyClosure | null>(null);

  const { start, end } = useMemo(() => {
    if (preset === 'custom' && startInput && endInput) {
      return { start: startInput, end: endInput };
    }
    return getRange(preset);
  }, [preset, startInput, endInput]);

  const filtered = useMemo(() => {
    return closures
      .filter((c) => c.closure_date >= start && c.closure_date <= end)
      .sort((a, b) => b.closure_date.localeCompare(a.closure_date));
  }, [closures, start, end]);

  // KPIs
  const kpis = useMemo(() => {
    let grossRevenue = 0;
    let netCash = 0;
    let operatorPay = 0;
    let totalVehicles = 0;
    for (const c of filtered) {
      grossRevenue += c.total_revenue;
      netCash += c.net_cash;
      totalVehicles += c.total_washes;
      const commission = c.total_commission ?? c.operator_liquidation.reduce((s, l) => s + (l.commission ?? 0), 0);
      operatorPay += commission + c.total_tips;
    }
    return { grossRevenue, netCash, operatorPay, totalVehicles };
  }, [filtered]);

  const presets: { key: RangePreset; label: string }[] = [
    { key: 'today', label: 'Hoy' },
    { key: 'week', label: 'Esta Semana' },
    { key: 'month', label: 'Este Mes' },
    { key: 'custom', label: 'Personalizado' },
  ];

  return (
    <div className="space-y-4 animate-fadeIn">
      <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
        <Wallet className="w-4 h-4 text-amber-600" /> Historial de Cierres y Reportes
      </h3>

      {/* Date range filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                preset === p.key
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20'
                  : 'bg-white border border-[#E2E8F0] text-slate-500 hover:bg-slate-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 mb-1 block">Fecha Inicio</label>
              <input
                type="date"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 text-sm focus:outline-none focus:border-amber-200"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 mb-1 block">Fecha Fin</label>
              <input
                type="date"
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 text-sm focus:outline-none focus:border-amber-200"
              />
            </div>
          </div>
        )}
        <p className="text-[10px] text-slate-500 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {start === end ? start : `${start} → ${end}`} · {filtered.length} cierre(s)
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="Ingresos Brutos Total"
          value={`$${kpis.grossRevenue.toLocaleString('es-CO')}`}
          Icon={DollarSign}
          color="from-emerald-600 to-green-500"
        />
        <KpiCard
          label="Ganancia Neta Salón"
          value={`$${kpis.netCash.toLocaleString('es-CO')}`}
          Icon={TrendingUp}
          color="from-amber-600 to-orange-500"
        />
        <KpiCard
          label="Comisiones + Propinas"
          value={`$${kpis.operatorPay.toLocaleString('es-CO')}`}
          Icon={HandCoins}
          color="from-rose-600 to-rose-500"
        />
        <KpiCard
          label="Servicios Atendidos"
          value={kpis.totalVehicles.toString()}
          Icon={Car}
          color="from-purple-600 to-indigo-500"
        />
      </div>

      {/* Closures list */}
      <div className="space-y-2">
        {filtered.map((c) => {
          const operatorTotal = (c.total_commission ?? c.operator_liquidation.reduce((s, l) => s + (l.commission ?? 0), 0)) + c.total_tips;
          return (
            <div
              key={c.id}
              className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">
                      {new Date(c.closure_date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                    <div className="text-xs text-slate-500">{c.total_washes} servicios</div>
                  </div>
                </div>
                <button
                  onClick={() => setDetail(c)}
                  className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 text-xs font-medium hover:bg-amber-100 transition-all flex items-center gap-1"
                >
                  Ver Detalle <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Inline metrics row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-100 rounded-lg p-2">
                  <div className="text-[10px] text-slate-500">Ingresos Brutos</div>
                  <div className="font-bold text-emerald-600">${c.total_revenue.toLocaleString('es-CO')}</div>
                </div>
                <div className="bg-slate-100 rounded-lg p-2">
                  <div className="text-[10px] text-slate-500">Gastos</div>
                  <div className="font-bold text-orange-600">${(c.total_expenses ?? 0).toLocaleString('es-CO')}</div>
                </div>
                <div className="bg-slate-100 rounded-lg p-2">
                  <div className="text-[10px] text-slate-500">Liquidación Op.</div>
                  <div className="font-bold text-rose-500">${operatorTotal.toLocaleString('es-CO')}</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                  <div className="text-[10px] text-amber-600/70">Saldo Neto</div>
                  <div className="font-bold text-amber-600">${c.net_cash.toLocaleString('es-CO')}</div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Wallet className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No hay cierres en este período</p>
            <p className="text-slate-500 text-xs mt-1">Los cierres realizados desde el Modo Piso aparecerán aquí</p>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detail && (
        <ClosureDetailModal closure={detail} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}

// ============ Closure Detail Modal ============
function ClosureDetailModal({ closure, onClose }: { closure: DailyClosure; onClose: () => void }) {
  const commission = closure.total_commission ?? closure.operator_liquidation.reduce((s, l) => s + (l.commission ?? 0), 0);
  const operatorPay = commission + closure.total_tips;
  const rate = closure.commission_rate ?? 0.40;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-amber-200 p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Detalle del Cierre</h2>
              <p className="text-sm text-slate-500">
                {new Date(closure.closure_date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-100 transition-all">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Financial summary */}
        <div className="space-y-2 mb-5">
          <div className="flex justify-between items-center text-sm py-2 border-b border-slate-100">
            <span className="text-slate-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" /> Ingresos Totales (Cobrados)
            </span>
            <span className="font-bold text-emerald-600">${closure.total_revenue.toLocaleString('es-CO')}</span>
          </div>
          <div className="flex justify-between items-center text-sm py-2 border-b border-slate-100">
            <span className="text-slate-600 flex items-center gap-2">
              <Car className="w-4 h-4 text-rose-500" /> Servicios Atendidos
            </span>
            <span className="font-bold text-rose-500">{closure.total_washes}</span>
          </div>
          <div className="flex justify-between items-center text-sm py-2 border-b border-slate-100">
            <span className="text-slate-600 flex items-center gap-2">
              <HandCoins className="w-4 h-4 text-amber-600" /> Pago Especialistas ({Math.round(rate * 100)}% + propinas)
            </span>
            <span className="font-bold text-amber-600">-${operatorPay.toLocaleString('es-CO')}</span>
          </div>
          <div className="flex justify-between items-center text-sm py-2 border-b border-slate-100">
            <span className="text-slate-600 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-orange-600" /> Gastos del Turno
            </span>
            <span className="font-bold text-orange-600">-${(closure.total_expenses ?? 0).toLocaleString('es-CO')}</span>
          </div>
          {closure.total_desisted > 0 && (
            <div className="flex justify-between items-center text-sm py-2 border-b border-slate-100">
              <span className="text-slate-600">Desistidos (info)</span>
              <span className="font-bold text-red-600">${closure.total_desisted.toLocaleString('es-CO')}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl px-3 mt-2">
            <span className="text-sm font-medium text-amber-700">Saldo Neto (Ganancia salón)</span>
            <span className="text-xl font-bold text-amber-600">${closure.net_cash.toLocaleString('es-CO')}</span>
          </div>
          <p className="text-[10px] text-slate-500 text-center">Las propinas entran a caja y salen directo a especialistas; no afectan la utilidad del Salón.</p>
        </div>

        {/* Operator liquidation breakdown */}
        {closure.operator_liquidation.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-600" /> Liquidación por Especialista
            </h3>
            <div className="space-y-2">
              {closure.operator_liquidation.map((liq) => {
                const liqCommission = liq.commission ?? Math.round(liq.revenue * rate);
                return (
                  <div key={liq.operator_id ?? 'none'} className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                          <Users className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{liq.operator_name}</div>
                          <div className="text-[10px] text-slate-500">{liq.washes} servicios</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-amber-600">${(liqCommission + liq.tips).toLocaleString('es-CO')}</div>
                        <div className="text-[10px] text-slate-500">Total a liquidar</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                      <div className="bg-slate-100 rounded-lg p-1.5 text-center">
                        <div className="text-[9px] text-slate-500">Servicios</div>
                        <div className="font-semibold text-emerald-600">${liq.revenue.toLocaleString('es-CO')}</div>
                      </div>
                      <div className="bg-slate-100 rounded-lg p-1.5 text-center">
                        <div className="text-[9px] text-slate-500">Comisión</div>
                        <div className="font-semibold text-amber-600">${liqCommission.toLocaleString('es-CO')}</div>
                      </div>
                      <div className="bg-slate-100 rounded-lg p-1.5 text-center">
                        <div className="text-[9px] text-slate-500">Propinas</div>
                        <div className="font-semibold text-rose-500">${liq.tips.toLocaleString('es-CO')}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="text-[10px] text-slate-500 text-right mt-4">
          Cerrado el {new Date(closure.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
        </div>
      </div>
    </div>
  );
}

// ============ KPI Card ============
function KpiCard({ label, value, Icon, color }: { label: string; value: string; Icon: typeof DollarSign; color: string }) {
  return (
    <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-3">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-2`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="text-lg font-bold text-slate-900">{value}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
