import { useState, useMemo } from 'react';
import { X, Plus, Trash2, Timer, User, CheckCircle2, Coffee, Wrench } from 'lucide-react';
import type { Wash, Operator, WashItem } from '@/lib/types';
import { uuid } from '@/lib/data';

interface LiquidationModalProps {
  wash: Wash;
  operators: Operator[];
  onClose: () => void;
  onConfirm: (data: {
    price: number;
    tip: number;  
    operatorId: string | null;
    operatorName: string;
    items: WashItem[];
    completedAt: string;
    durationSeconds: number;
  }) => Promise<void>;
}

const QUICK_SERVICES = [
  { name: 'servicio de motor', amount: 10000 },
  { name: 'Encerado', amount: 10000 },
  { name: 'Chasis', amount: 10000 },
  { name: 'Limpieza interior', amount: 8000 },
  { name: 'Siliconado llantas', amount: 5000 },
  { name: 'Pulido faros', amount: 12000 },
];

export default function LiquidationModal({ wash, operators, onClose, onConfirm }: LiquidationModalProps) {
  const [basePrice, setBasePrice] = useState(wash.price);
  const [tip, setTip] = useState(0);
  const [selectedOperatorId, setSelectedOperatorId] = useState(wash.operator_id ?? '');
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [customName, setCustomName] = useState('');
  const [customAmount, setCustomAmount] = useState(0);
  const [customServices, setCustomServices] = useState<{ id: string; name: string; amount: number }[]>([]);
  const [consumoName, setConsumoName] = useState('');
  const [consumoAmount, setConsumoAmount] = useState(0);
  const [consumos, setConsumos] = useState<{ id: string; name: string; amount: number }[]>([]);

  const [saving, setSaving] = useState(false);

  const elapsedSeconds = wash.started_at
    ? Math.floor((Date.now() - new Date(wash.started_at).getTime()) / 1000)
    : 0;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const operatorName = operators.find((o) => o.id === selectedOperatorId)?.name ?? wash.operator_name ?? '';

  const toggleService = (key: string) => {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const addCustomService = () => {
    if (!customName.trim() || customAmount <= 0) return;
    setCustomServices((prev) => [...prev, { id: uuid(), name: customName.trim(), amount: customAmount }]);
    setCustomName('');
    setCustomAmount(0);
  };

  const removeCustomService = (id: string) => {
    setCustomServices((prev) => prev.filter((s) => s.id !== id));
  };

  const addConsumo = () => {
    if (!consumoName.trim() || consumoAmount <= 0) return;
    setConsumos((prev) => [...prev, { id: uuid(), name: consumoName.trim(), amount: consumoAmount }]);
    setConsumoName('');
    setConsumoAmount(0);
  };

  const removeConsumo = (id: string) => {
    setConsumos((prev) => prev.filter((c) => c.id !== id));
  };

  const totalAdicionales = useMemo(() => {
    let sum = 0;
    for (const key of selectedServices) {
      const svc = QUICK_SERVICES.find((s) => s.name === key);
      if (svc) sum += svc.amount;
    }
    for (const s of customServices) sum += s.amount;
    return sum;
  }, [selectedServices, customServices]);

  const totalConsumos = useMemo(() => consumos.reduce((s, c) => s + c.amount, 0), [consumos]);

  const grandTotal = basePrice + totalAdicionales + totalConsumos + tip;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const sanitizeAmount = (val: number) => Math.max(0, Math.floor(Number(val) || 0));
      const items: WashItem[] = [];

      for (const key of selectedServices) {
        const svc = QUICK_SERVICES.find((s) => s.name === key);
        if (svc) {
          items.push({
            id: uuid(),
            wash_id: wash.id,
            business_id: wash.business_id,
            name: svc.name.trim(),
            amount: sanitizeAmount(svc.amount),
            category: 'servicio',
            created_at: new Date().toISOString(),
          });
        }
      }

      for (const s of customServices) {
        if (s.name.trim() && s.amount > 0) {
          items.push({
            id: s.id,
            wash_id: wash.id,
            business_id: wash.business_id,
            name: s.name.trim(),
            amount: sanitizeAmount(s.amount),
            category: 'servicio',
            created_at: new Date().toISOString(),
          });
        }
      }

      for (const c of consumos) {
        if (c.name.trim() && c.amount > 0) {
          items.push({
            id: c.id,
            wash_id: wash.id,
            business_id: wash.business_id,
            name: c.name.trim(),
            amount: sanitizeAmount(c.amount),
            category: 'consumo',
            created_at: new Date().toISOString(),
          });
        }
      }

      const now = new Date().toISOString();
      const duration = wash.started_at
        ? Math.floor((new Date(now).getTime() - new Date(wash.started_at).getTime()) / 1000)
        : 0;

      await onConfirm({
        price: sanitizeAmount(basePrice),
        tip: sanitizeAmount(tip),
        operatorId: selectedOperatorId || null,
        operatorName: operatorName.trim(),
        items,
        completedAt: now,
        durationSeconds: duration,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-cyan-200 w-full max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E2E8F0] px-5 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Cerrar / Liquidar {wash.plate ? `— ${wash.plate}` : `— #${wash.ticket_number}`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{wash.category_name} · Ticket #{wash.ticket_number}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Duration + Operator */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl p-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <Timer className="w-3.5 h-3.5" /> Tiempo total
              </div>
              <div className="text-xl font-bold text-blue-600 tabular-nums">{formatDuration(elapsedSeconds)}</div>
            </div>
            <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl p-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <User className="w-3.5 h-3.5" /> servicior responsable
              </div>
              <select
                value={selectedOperatorId}
                onChange={(e) => setSelectedOperatorId(e.target.value)}
                className="w-full bg-slate-100 text-sm font-medium text-slate-900 rounded-lg px-2 py-1.5 focus:outline-none border border-[#E2E8F0]"
              >
                <option value="">Sin Especialista</option>
                {operators.filter((o) => o.active).map((op) => (
                  <option key={op.id} value={op.id}>{op.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Base price */}
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block font-medium">Precio base del servicio</label>
            <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl p-3 flex items-center gap-2">
              <span className="text-slate-500 text-sm">$</span>
              <input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="w-full bg-transparent text-lg font-bold text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Quick service chips */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-600" /> Servicios adicionales
            </h3>
            <div className="flex flex-wrap gap-2">
              {QUICK_SERVICES.map((svc) => {
                const isSel = selectedServices.has(svc.name);
                return (
                  <button
                    key={svc.name}
                    onClick={() => toggleService(svc.name)}
                    className={`action-control px-3 py-2 rounded-xl text-sm font-medium border border-blue-200/80 ${
                      isSel
                        ? 'bg-gradient-to-br from-blue-100 via-white to-slate-50 text-blue-700'
                        : 'action-surface text-slate-500'
                    }`}
                  >
                    + {svc.name} ${svc.amount.toLocaleString('es-CO')}
                  </button>
                );
              })}
            </div>

            {/* Custom service input */}
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Techo, asientos, aros..."
                className="flex-1 bg-white border border-[#E2E8F0] shadow-sm rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-200"
              />
              <div className="flex items-center gap-1 bg-white border border-[#E2E8F0] shadow-sm rounded-xl px-3">
                <span className="text-slate-500 text-sm">$</span>
                <input
                  type="number"
                  value={customAmount || ''}
                  onChange={(e) => setCustomAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-20 bg-transparent text-sm font-medium text-slate-900 focus:outline-none"
                />
              </div>
              <button
                onClick={addCustomService}
                disabled={!customName.trim() || customAmount <= 0}
                className="action-control action-surface px-3 py-2 border border-blue-200/80 text-blue-600 rounded-xl disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Custom services list */}
            {customServices.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {customServices.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-cyan-50 border border-cyan-200 rounded-lg px-3 py-2">
                    <span className="text-sm text-slate-600">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-blue-600">${s.amount.toLocaleString('es-CO')}</span>
                      <button onClick={() => removeCustomService(s.id)} className="p-1 rounded hover:bg-slate-100">
                        <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Consumos (cafeteria/tienda) */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-2">
              <Coffee className="w-4 h-4 text-amber-600" /> Consumo adicional (cafetería/tienda)
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={consumoName}
                onChange={(e) => setConsumoName(e.target.value)}
                placeholder="Otro ítem..."
                className="flex-1 bg-white border border-[#E2E8F0] shadow-sm rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-200"
              />
              <div className="flex items-center gap-1 bg-white border border-[#E2E8F0] shadow-sm rounded-xl px-3">
                <span className="text-slate-500 text-sm">$</span>
                <input
                  type="number"
                  value={consumoAmount || ''}
                  onChange={(e) => setConsumoAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-20 bg-transparent text-sm font-medium text-slate-900 focus:outline-none"
                />
              </div>
              <button
                onClick={addConsumo}
                disabled={!consumoName.trim() || consumoAmount <= 0}
                className="action-control px-3 py-2 bg-gradient-to-br from-amber-50 via-white to-slate-50 border border-blue-200/80 text-amber-600 rounded-xl disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {consumos.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {consumos.map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <span className="text-sm text-slate-600">{c.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-amber-600">${c.amount.toLocaleString('es-CO')}</span>
                      <button onClick={() => removeConsumo(c.id)} className="p-1 rounded hover:bg-slate-100">
                        <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tip input */}
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block font-medium">Propina (opcional)</label>
            <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl p-3 flex items-center gap-2">
              <span className="text-slate-500 text-sm">$</span>
              <input
                type="number"
                value={tip || ''}
                onChange={(e) => setTip(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-transparent text-lg font-bold text-emerald-600 focus:outline-none placeholder-slate-400"
              />
            </div>
            <div className="flex gap-2 mt-2">
              {[0, 1000, 2000, 5000].map((t) => (
                <button
                  key={t}
                  onClick={() => setTip(t)}
                  className={`action-control flex-1 py-2 rounded-lg text-sm font-medium border border-blue-200/80 ${
                    tip === t ? 'bg-gradient-to-br from-emerald-50 via-white to-slate-50 text-emerald-600' : 'action-surface text-slate-500'
                  }`}
                >
                  {t === 0 ? 'Sin propina' : `+${t.toLocaleString('es-CO')}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer: total + confirm */}
        <div className="sticky bottom-0 bg-white border-t border-[#E2E8F0] px-5 py-4 rounded-b-3xl space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Precio base</span>
              <span>${basePrice.toLocaleString('es-CO')}</span>
            </div>
            {totalAdicionales > 0 && (
              <div className="flex justify-between text-xs text-blue-600">
                <span>Servicios adicionales</span>
                <span>+${totalAdicionales.toLocaleString('es-CO')}</span>
              </div>
            )}
            {totalConsumos > 0 && (
              <div className="flex justify-between text-xs text-amber-600">
                <span>Consumos</span>
                <span>+${totalConsumos.toLocaleString('es-CO')}</span>
              </div>
            )}
            {tip > 0 && (
              <div className="flex justify-between text-xs text-emerald-600">
                <span>Propina</span>
                <span>+${tip.toLocaleString('es-CO')}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
              <span className="text-sm font-semibold text-slate-600">Total calculado</span>
              <span className="text-2xl font-bold text-emerald-600">${grandTotal.toLocaleString('es-CO')}</span>
            </div>
          </div>

          <button
            onClick={handleConfirm}
            disabled={saving}
            className="action-control w-full py-3.5 bg-gradient-to-br from-emerald-600 to-green-500 border border-blue-200/80 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            {saving ? 'Guardando...' : 'Confirmar y Finalizar'}
          </button>
        </div>
      </div>
    </div>
  );
}