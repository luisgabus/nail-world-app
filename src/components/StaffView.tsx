import { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft, Plus, Trash2, User, X, Phone, MapPin, CreditCard,
  AlertTriangle, Camera, Users, UserCheck, UserX, Crown, Wallet,
  IdCard, Upload, Check,
} from 'lucide-react';
import type { Operator, WorkerRole, PaymentMethod } from '@/lib/types';
import { uuid } from '@/lib/data';

interface Props {
  operators: Operator[];
  businessId: string;
  onBack: () => void;
  onSave: (op: Operator) => Promise<Operator>;
  onDelete: (id: string) => Promise<void>;
}

const ROLE_CONFIG: Record<WorkerRole, { label: string; Icon: typeof Crown; color: string; bg: string }> = {
  socio: { label: 'Socios', Icon: Crown, color: 'text-amber-600', bg: 'from-amber-500/20 to-orange-500/20 border-amber-200' },
  encargada: { label: 'Encargadas', Icon: Wallet, color: 'text-blue-600', bg: 'from-cyan-500/20 to-blue-500/20 border-cyan-200' },
  lavador: { label: 'Lavadores', Icon: Users, color: 'text-emerald-600', bg: 'from-emerald-500/20 to-green-500/20 border-emerald-200' },
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  efectivo: 'Efectivo',
};

const emptyWorker = (businessId: string, role: WorkerRole): Operator => ({
  id: uuid(),
  business_id: businessId,
  name: '',
  active: true,
  role,
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
});

export function StaffView({ operators, businessId, onBack, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState<Operator | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [onShiftOnly, setOnShiftOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(() => {
    const roles: WorkerRole[] = ['socio', 'encargada', 'lavador'];
    const result: Record<WorkerRole, Operator[]> = { socio: [], encargada: [], lavador: [] };
    for (const op of operators) {
      const r = (op.role ?? 'lavador') as WorkerRole;
      if (!showInactive && !op.active && r === 'lavador') continue;
      if (onShiftOnly && !op.on_shift_today) continue;
      result[r]?.push(op);
    }
    return result;
  }, [operators, showInactive, onShiftOnly]);

  const handleNew = (role: WorkerRole) => {
    setEditing(emptyWorker(businessId, role));
    setIsNew(true);
  };

  const handleEdit = (op: Operator) => {
    setEditing({ ...op });
    setIsNew(false);
  };

  const handleSave = async () => {
    if (!editing || !editing.name.trim() || saving) return;
    setSaving(true);
    try {
      await onSave(editing);
      setEditing(null);
      setIsNew(false);
      onBack();
    } catch (err) {
      console.error('Error saving worker:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await onDelete(id);
    onBack();
  };

  const toggleActive = async (op: Operator) => {
    const updated = { ...op, active: !op.active };
    await onSave(updated);
    onBack();
  };

  const toggleOnShift = async (op: Operator) => {
    const updated = { ...op, on_shift_today: !op.on_shift_today };
    await onSave(updated);
    onBack();
  };

  const handleDocPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEditing({ ...editing, document_photo_url: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="sticky top-0 z-30 bg-white backdrop-blur-xl border-b border-[#E2E8F0] px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-100 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Personal</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setOnShiftOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              onShiftOnly
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-white text-slate-500 border border-[#E2E8F0]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> En turno hoy
          </button>
          <button
            onClick={() => setShowInactive((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              showInactive
                ? 'bg-slate-500/20 text-slate-600 border border-slate-500/30'
                : 'bg-white text-slate-500 border border-[#E2E8F0]'
            }`}
          >
            Inactivos
          </button>
        </div>
      </header>

      <main className="px-4 py-4 pb-24 space-y-6">
        {(['socio', 'encargada', 'lavador'] as WorkerRole[]).map((role) => {
          const cfg = ROLE_CONFIG[role];
          const list = grouped[role] ?? [];
          return (
            <section key={role}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={`text-sm font-bold flex items-center gap-2 ${cfg.color}`}>
                  <cfg.Icon className="w-4 h-4" /> {cfg.label}
                  <span className="text-slate-500 font-normal">({list.length})</span>
                </h2>
                <button
                  onClick={() => handleNew(role)}
                  className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:bg-slate-100 transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {list.map((op) => (
                  <div
                    key={op.id}
                    className={`p-3 rounded-2xl border bg-gradient-to-r ${cfg.bg} cursor-pointer hover:scale-[1.01] transition-all`}
                    onClick={() => handleEdit(op)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center ${cfg.color}`}>
                        {op.document_photo_url ? (
                          <img src={op.document_photo_url} alt="" className="w-full h-full rounded-xl object-cover" />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{op.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          {role === 'lavador' && (
                            <span className={op.active ? 'text-emerald-600' : 'text-slate-500'}>
                              {op.active ? 'Activo' : 'Inactivo'}
                            </span>
                          )}
                          {op.phone && <span>· {op.phone}</span>}
                          {op.on_shift_today && (
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold">En turno</span>
                          )}
                        </div>
                      </div>
                      {role === 'lavador' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleActive(op); }}
                          className={`p-2 rounded-lg transition-all ${op.active ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-500/20'}`}
                          title={op.active ? 'Desactivar' : 'Activar'}
                        >
                          {op.active ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                        </button>
                      )}
                      {role === 'lavador' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleOnShift(op); }}
                          className={`p-2 rounded-lg transition-all ${op.on_shift_today ? 'bg-cyan-50 text-blue-600 hover:bg-cyan-100' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                          title="En turno hoy"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(op.id); }}
                        className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {list.length === 0 && (
                  <div className="text-center py-6 text-slate-500 text-sm bg-white border border-[#E2E8F0] shadow-sm rounded-xl">
                    No hay {cfg.label.toLowerCase()} registrados
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </main>

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 w-full max-w-md shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 sticky top-0 bg-white -mx-6 px-6 -mt-6 pt-6 pb-3 z-10 border-b border-[#E2E8F0]">
              <h2 className="text-lg font-bold">
                {isNew ? `Nuevo ${ROLE_CONFIG[editing.role].label.slice(0, -1)}` : 'Ficha del Trabajador'}
              </h2>
              <button onClick={() => { setEditing(null); setIsNew(false); }} className="text-slate-500 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Document photo */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-[#E2E8F0] flex items-center justify-center overflow-hidden">
                  {editing.document_photo_url ? (
                    <img src={editing.document_photo_url} alt="Documento" className="w-full h-full object-cover" />
                  ) : (
                    <IdCard className="w-10 h-10 text-slate-500" />
                  )}
                </div>
                <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-xs text-slate-600 hover:bg-slate-100 transition-all cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  {editing.document_photo_url ? 'Cambiar foto' : 'Cargar documento'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleDocPhoto} />
                </label>
              </div>

              {/* Personal info */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Información Personal
                </h3>
                <div className="space-y-2">
                  <Field label="Nombre Completo" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} placeholder="Ej: Juan Pérez" />
                  <Field label="Teléfono" value={editing.phone ?? ''} onChange={(v) => setEditing({ ...editing, phone: v || null })} placeholder="Ej: 300 123 4567" icon={<Phone className="w-3.5 h-3.5" />} />
                  <Field label="Dirección" value={editing.address ?? ''} onChange={(v) => setEditing({ ...editing, address: v || null })} placeholder="Ej: Calle 123 #45-67" icon={<MapPin className="w-3.5 h-3.5" />} />
                  <Field label="Cédula / DNI" value={editing.document_id ?? ''} onChange={(v) => setEditing({ ...editing, document_id: v || null })} placeholder="Ej: 1.030.456.789" icon={<CreditCard className="w-3.5 h-3.5" />} />
                </div>
              </div>

              {/* Payment info */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" /> Información de Pago
                </h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block">Método de Pago Preferido</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['nequi', 'daviplata', 'efectivo'] as PaymentMethod[]).map((m) => (
                        <button
                          key={m}
                          onClick={() => setEditing({ ...editing, payment_method: editing.payment_method === m ? null : m })}
                          className={`action-control py-2 rounded-lg text-xs font-medium border border-blue-200/80 ${
                            editing.payment_method === m
                              ? 'bg-gradient-to-br from-emerald-50 via-white to-slate-50 text-emerald-600'
                              : 'action-surface text-slate-500'
                          }`}
                        >
                          {PAYMENT_LABELS[m]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Field
                    label="Número de Cuenta / Teléfono Nequi"
                    value={editing.payment_account ?? ''}
                    onChange={(v) => setEditing({ ...editing, payment_account: v || null })}
                    placeholder="Ej: 300 123 4567"
                  />
                </div>
              </div>

              {/* Emergency contact */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Contacto de Emergencia
                </h3>
                <div className="space-y-2">
                  <Field
                    label="Nombre del Contacto"
                    value={editing.emergency_contact_name ?? ''}
                    onChange={(v) => setEditing({ ...editing, emergency_contact_name: v || null })}
                    placeholder="Ej: María Pérez"
                  />
                  <Field
                    label="Teléfono del Contacto"
                    value={editing.emergency_contact_phone ?? ''}
                    onChange={(v) => setEditing({ ...editing, emergency_contact_phone: v || null })}
                    placeholder="Ej: 300 987 6543"
                  />
                </div>
              </div>

              {/* Role selector (for new workers) */}
              {isNew && (
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">Rol</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['socio', 'encargada', 'lavador'] as WorkerRole[]).map((r) => {
                      const cfg = ROLE_CONFIG[r];
                      return (
                        <button
                          key={r}
                          onClick={() => setEditing({ ...editing, role: r })}
                          className={`py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                            editing.role === r
                              ? `bg-gradient-to-r ${cfg.bg} ${cfg.color}`
                              : 'bg-white text-slate-500 border border-[#E2E8F0]'
                          }`}
                        >
                          <cfg.Icon className="w-3.5 h-3.5" /> {cfg.label.slice(0, -1)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Active toggle for lavadores */}
              {editing.role === 'lavador' && (
                <div className="flex items-center justify-between bg-white border border-[#E2E8F0] shadow-sm rounded-xl p-3">
                  <span className="text-sm text-slate-600">Estado del lavador</span>
                  <button
                    onClick={() => setEditing({ ...editing, active: !editing.active })}
                    className={`relative w-12 h-6 rounded-full transition-all ${editing.active ? 'bg-emerald-500' : 'bg-slate-200'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${editing.active ? 'left-6' : 'left-0.5'}`} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6 sticky bottom-0 bg-white -mx-6 px-6 -mb-6 pb-6 pt-3 border-t border-[#E2E8F0]">
              <button
                onClick={() => { setEditing(null); setIsNew(false); }}
                className="action-control action-surface flex-1 py-3 border border-blue-200/80 text-slate-600 font-medium rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!editing.name.trim() || saving}
                className="action-control flex-1 py-3 bg-gradient-to-br from-blue-600 to-blue-500 border border-blue-200/80 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl px-3 py-2">
      <label className="text-[11px] text-slate-500 mb-0.5 block">{label}</label>
      <div className="flex items-center gap-2">
        {icon && <span className="text-slate-500">{icon}</span>}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-slate-900 focus:outline-none placeholder-slate-400"
        />
      </div>
    </div>
  );
}
