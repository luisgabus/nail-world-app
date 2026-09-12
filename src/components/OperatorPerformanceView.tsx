import { useState, useMemo } from 'react';
import {
  Users, Car, DollarSign, Clock, Trophy, TrendingUp,
} from 'lucide-react';
import type { Wash } from '@/lib/types';

type PeriodPreset = 'week' | 'month';
type SortMode = 'revenue' | 'cars';

function startOfDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getRange(preset: PeriodPreset): { start: string; end: string } {
  const now = new Date();
  const end = startOfDay(now);
  if (preset === 'week') {
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    return { start: startOfDay(monday), end };
  }
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: startOfDay(first), end };
}

function washTotal(w: Wash): number {
  return (w.total_price ?? (w.price + (w.additional_total ?? 0))) || w.price;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

interface OperatorStats {
  name: string;
  cars: number;
  revenue: number;
  totalDuration: number;
  avgDuration: number;
  avgTicket: number;
}

export function OperatorPerformanceView({ washes }: { washes: Wash[] }) {
  const [preset, setPreset] = useState<PeriodPreset>('week');
  const [sortMode, setSortMode] = useState<SortMode>('revenue');

  const { start, end } = useMemo(() => getRange(preset), [preset]);

  const completedInRange = useMemo(() => {
    return washes.filter((w) => {
      if (w.status !== 'completado') return false;
      const date = w.created_at.slice(0, 10);
      return date >= start && date <= end;
    });
  }, [washes, start, end]);

  // KPIs
  const kpis = useMemo(() => {
    const totalCars = completedInRange.length;
    const totalRevenue = completedInRange.reduce((s, w) => s + washTotal(w), 0);
    const withDuration = completedInRange.filter((w) => w.duration_seconds);
    const totalDuration = withDuration.reduce((s, w) => s + (w.duration_seconds ?? 0), 0);
    const avgDuration = withDuration.length > 0 ? Math.round(totalDuration / withDuration.length) : 0;
    return { totalCars, totalRevenue, avgDuration };
  }, [completedInRange]);

  // Per-operator stats
  const ranking = useMemo(() => {
    const map = new Map<string, OperatorStats>();
    for (const w of completedInRange) {
      const name = w.operator_name || 'Sin Especialista';
      const entry = map.get(name) ?? { name, cars: 0, revenue: 0, totalDuration: 0, avgDuration: 0, avgTicket: 0 };
      entry.cars++;
      entry.revenue += washTotal(w);
      if (w.duration_seconds) entry.totalDuration += w.duration_seconds;
      map.set(name, entry);
    }
    const list = [...map.values()];
    for (const entry of list) {
      entry.avgDuration = entry.cars > 0 ? Math.round(entry.totalDuration / entry.cars) : 0;
      entry.avgTicket = entry.cars > 0 ? Math.round(entry.revenue / entry.cars) : 0;
    }
    list.sort((a, b) => sortMode === 'revenue' ? b.revenue - a.revenue : b.cars - a.cars);
    return list;
  }, [completedInRange, sortMode]);

  const presets: { key: PeriodPreset; label: string }[] = [
    { key: 'week', label: 'Esta Semana' },
    { key: 'month', label: 'Este Mes' },
  ];

  const medalColors = ['from-amber-400 to-yellow-500', 'from-slate-300 to-slate-300', 'from-orange-400 to-amber-600'];

  return (
    <div className="space-y-4 animate-fadeIn">
      <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
        <Users className="w-4 h-4 text-amber-600" /> Rendimiento de Especialistas
      </h3>

      {/* Period selector */}
      <div className="flex gap-2">
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
              preset === p.key
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20'
                : 'bg-white border border-[#E2E8F0] text-slate-500 hover:bg-slate-100'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center mb-2">
            <Car className="w-4 h-4 text-white" />
          </div>
          <div className="text-lg font-bold text-slate-900">{kpis.totalCars}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Carros Total</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-green-500 flex items-center justify-center mb-2">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <div className="text-lg font-bold text-slate-900">${kpis.totalRevenue.toLocaleString('es-CO')}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Ingresos Total</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-orange-500 flex items-center justify-center mb-2">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div className="text-lg font-bold text-slate-900">{formatDuration(kpis.avgDuration)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Min/carro Prom.</div>
        </div>
      </div>

      {/* Sort toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Ordenar por:</span>
        <button
          onClick={() => setSortMode('revenue')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
            sortMode === 'revenue'
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : 'bg-white text-slate-500 border border-[#E2E8F0]'
          }`}
        >
          <DollarSign className="w-3 h-3" /> Ingresos
        </button>
        <button
          onClick={() => setSortMode('cars')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
            sortMode === 'cars'
              ? 'bg-blue-50 text-blue-600 border border-blue-200'
              : 'bg-white text-slate-500 border border-[#E2E8F0]'
          }`}
        >
          <Car className="w-3 h-3" /> Carros
        </button>
      </div>

      {/* Ranking */}
      <div className="space-y-3">
        {ranking.map((op, idx) => {
          const rank = idx + 1;
          const medalGradient = rank <= 3 ? medalColors[rank - 1] : 'from-slate-600 to-slate-200';
          return (
            <div
              key={op.name}
              className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${medalGradient} flex items-center justify-center font-bold text-white text-sm`}>
                    {rank <= 3 ? <Trophy className="w-5 h-5" /> : `#${rank}`}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{op.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {rank <= 3 ? `Puesto #${rank}` : `Puesto #${rank}`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-600">${op.revenue.toLocaleString('es-CO')}</div>
                  <div className="text-[10px] text-slate-500">Ingresos generados</div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-100 rounded-lg p-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 mb-1">
                    <Car className="w-3 h-3" /> Carros
                  </div>
                  <div className="font-bold text-blue-600">{op.cars}</div>
                </div>
                <div className="bg-slate-100 rounded-lg p-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 mb-1">
                    <TrendingUp className="w-3 h-3" /> $/carro
                  </div>
                  <div className="font-bold text-emerald-600">${op.avgTicket.toLocaleString('es-CO')}</div>
                </div>
                <div className="bg-slate-100 rounded-lg p-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 mb-1">
                    <Clock className="w-3 h-3" /> Min/carro
                  </div>
                  <div className="font-bold text-amber-600">{formatDuration(op.avgDuration)}</div>
                </div>
              </div>
            </div>
          );
        })}

        {ranking.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Sin datos en este período</p>
            <p className="text-slate-500 text-xs mt-1">Los servicios completados aparecerán aquí</p>
          </div>
        )}
      </div>
    </div>
  );
}
