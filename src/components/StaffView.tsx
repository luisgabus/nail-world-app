import { useState } from 'react';
import { ArrowLeft, Plus, User, Trash2, Pencil, Check, X } from 'lucide-react';
import type { Operator } from '@/lib/types';
import { uuid } from '@/lib/data';

interface StaffViewProps {
  operators: Operator[];
  businessId: string;
  onBack: () => void;
  onSave: (operator: Operator) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function StaffView({
  operators,
  businessId,
  onBack,
  onSave,
  onDelete,
}: StaffViewProps) {
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'servicio' | 'recepcion'>('servicio');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleEdit = (op: Operator) => {
    setEditingOperator(op);
    setName(op.name);
    setRole(op.role || 'servicio');
    setActive(op.active);
  };

  const handleNew = () => {
    setEditingOperator({
      id: uuid(),
      business_id: businessId,
      name: '',
      role: 'servicio',
      active: true,
      created_at: new Date().toISOString(),
    });
    setName('');
    setRole('servicio');
    setActive(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !editingOperator || saving) return;

    setSaving(true);
    try {
      await onSave({
        ...editingOperator,
        name: name.trim(),
        role,
        active,
      });
      setEditingOperator(null);
    } catch (err) {
      console.error('Error al guardar especialista:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white backdrop-blur-xl border-b border-[#E2E8F0] px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-100 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-lg font-bold">Gestión del Personal y Especialistas</h1>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        {!editingOperator ? (
          <>
            <button
              onClick={handleNew}
              className="action-control w-full py-3.5 bg-blue-600 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-500 transition-all shadow-sm"
            >
              <Plus className="w-5 h-5" /> Agregar Especialista
            </button>

            <div className="space-y-3">
              {operators.map((op) => (
                <div
                  key={op.id}
                  className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${op.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900">{op.name}</h3>
                        {!op.active && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">Inactivo</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Rol: {op.role === 'recepcion' ? 'Recepción / Caja' : 'Especialista de Servicio'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(op)}
                      className="p-2 rounded-xl bg-slate-50 border border-[#E2E8F0] hover:bg-slate-100 text-slate-600 transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(op.id)}
                      className="p-2 rounded-xl bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {operators.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No hay especialistas registrados. Presiona "Agregar Especialista" para crear el primero.
                </div>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-[#E2E8F0] shadow-sm rounded-3xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {operators.some((o) => o.id === editingOperator.id) ? 'Editar Especialista' : 'Nuevo Especialista'}
            </h2>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Nombre completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Camila Restrepo"
                className="w-full px-4 py-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-500"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Rol en el negocio</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('servicio')}
                  className={`py-3 px-3 rounded-xl text-sm font-medium border transition-all ${
                    role === 'servicio'
                      ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                      : 'bg-slate-50 border-[#E2E8F0] text-slate-600'
                  }`}
                >
                  Especialista (Servicios)
                </button>
                <button
                  type="button"
                  onClick={() => setRole('recepcion')}
                  className={`py-3 px-3 rounded-xl text-sm font-medium border transition-all ${
                    role === 'recepcion'
                      ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                      : 'bg-slate-50 border-[#E2E8F0] text-slate-600'
                  }`}
                >
                  Recepción / Caja
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-50 border border-[#E2E8F0] rounded-xl p-3">
              <span className="text-sm text-slate-700 font-medium">Estado activo</span>
              <button
                type="button"
                onClick={() => setActive(!active)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingOperator(null)}
                className="action-control action-surface flex-1 py-3 border border-blue-200/80 text-slate-600 font-medium rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="action-control flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-500 transition-all disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}