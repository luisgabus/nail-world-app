import { useState } from 'react';
import { ArrowLeft, Plus, Trash2, User, X } from 'lucide-react';
import type { Operator } from '@/lib/types';
import { uuid } from '@/lib/data';

interface Props {
  operators: Operator[];
  businessId: string;
  onBack: () => void;
  onSave: (op: Operator) => Promise<Operator>;
  onDelete: (id: string) => Promise<void>;
}

export function OperatorManager({ operators, businessId, onBack, onSave, onDelete }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const op: Operator = {
      id: uuid(),
      business_id: businessId,
      name: newName.trim(),
      active: true,
      role: 'Especialista',
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
    await onSave(op);
    setNewName('');
    setShowAdd(false);
    onBack();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="sticky top-0 z-30 bg-white backdrop-blur-xl border-b border-[#E2E8F0] px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-100 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Gestión de Especialistas</h1>
      </header>

      <main className="px-4 py-4 pb-24">
        <button
          onClick={() => setShowAdd(true)}
          className="action-control w-full py-3 mb-4 bg-gradient-to-br from-rose-600 to-rose-500 border border-rose-200/80 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Agregar Especialista
        </button>

        <div className="space-y-2">
          {operators.map((op) => (
            <div key={op.id} className="flex items-center gap-3 p-3 bg-white border border-[#E2E8F0] shadow-sm rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <User className="w-5 h-5 text-rose-500" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{op.name}</div>
                <div className="text-xs text-slate-500">{op.active ? 'Activo' : 'Inactivo'}</div>
              </div>
              <button
                onClick={async () => { await onDelete(op.id); onBack(); }}
                className="action-control p-2 rounded-lg bg-gradient-to-br from-red-50 via-white to-slate-50 border border-rose-200/80 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {operators.length === 0 && (
            <p className="text-center text-slate-500 py-8 text-sm">No hay especialistas registrados</p>
          )}
        </div>
      </main>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Nueva especialista</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Nombre del especialista"
              className="w-full px-4 py-3 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-200"
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="action-control w-full mt-4 py-3 bg-gradient-to-br from-rose-600 to-rose-500 border border-rose-200/80 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
