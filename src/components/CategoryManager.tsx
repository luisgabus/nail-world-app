import { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Car, Bike, Truck, X, Pencil } from 'lucide-react';
import type { VehicleCategory } from '@/lib/types';
import { uuid } from '@/lib/data';

interface Props {
  categories: VehicleCategory[];
  businessId: string;
  onBack: () => void;
  onSave: (cat: VehicleCategory) => Promise<VehicleCategory>;
  onDelete: (id: string) => Promise<void>;
}

const ICON_OPTIONS = [
  { key: 'car', label: 'Manicura', Icon: Car },
  { key: 'bike', label: 'Pedicura', Icon: Bike },
  { key: 'truck', label: 'Semipermante', Icon: Truck },
];

export function CategoryManager({ categories, businessId, onBack, onSave, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VehicleCategory | null>(null);
  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState(0);
  const [icon, setIcon] = useState('car');
  const [sortOrder, setSortOrder] = useState(0);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setBasePrice(0);
    setIcon('car');
    setSortOrder(categories.length);
    setShowForm(true);
  };

  const openEdit = (cat: VehicleCategory) => {
    setEditing(cat);
    setName(cat.name);
    setBasePrice(cat.base_price);
    setIcon(cat.icon);
    setSortOrder(cat.sort_order);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const cat: VehicleCategory = {
      id: editing?.id ?? uuid(),
      business_id: businessId,
      name: name.trim(),
      base_price: basePrice,
      icon,
      sort_order: sortOrder,
      active: editing?.active ?? true,
      created_at: editing?.created_at ?? new Date().toISOString(),
    };
    await onSave(cat);
    setShowForm(false);
    onBack();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="sticky top-0 z-30 bg-white backdrop-blur-xl border-b border-[#E2E8F0] px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-100 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Categorías de clientes</h1>
      </header>

      <main className="px-4 py-4 pb-24">
        <button
          onClick={openAdd}
          className="action-control w-full py-3 mb-4 bg-gradient-to-br from-blue-600 to-blue-500 border border-blue-200/80 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Agregar Categoría
        </button>

        <div className="space-y-2">
          {categories.map((cat) => {
            const IconEntry = ICON_OPTIONS.find((i) => i.key === cat.icon);
            const Icon = IconEntry?.Icon ?? Car;
            return (
              <div key={cat.id} className="flex items-center gap-3 p-3 bg-white border border-[#E2E8F0] shadow-sm rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{cat.name}</div>
                  <div className="text-xs text-slate-500">
                    ${cat.base_price.toLocaleString('es-CO')} · Orden {cat.sort_order}
                  </div>
                </div>
                <button
                  onClick={() => openEdit(cat)}
                  className="action-control action-surface p-2 rounded-lg border border-blue-200/80 text-slate-500"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => { await onDelete(cat.id); onBack(); }}
                  className="action-control p-2 rounded-lg bg-gradient-to-br from-red-50 via-white to-slate-50 border border-blue-200/80 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          {categories.length === 0 && (
            <p className="text-center text-slate-500 py-8 text-sm">No hay categorías registradas</p>
          )}
        </div>
      </main>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? 'Editar' : 'Nueva'} Categoría</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="text-sm font-medium text-slate-600 mb-1 block">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Manicura, Pedicura..."
              className="w-full px-4 py-3 mb-3 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-200"
              autoFocus
            />

            <label className="text-sm font-medium text-slate-600 mb-1 block">Precio base</label>
            <input
              type="number"
              value={basePrice}
              onChange={(e) => setBasePrice(Number(e.target.value))}
              className="w-full px-4 py-3 mb-3 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-blue-200"
            />

            <label className="text-sm font-medium text-slate-600 mb-2 block">Ícono</label>
            <div className="flex gap-2 mb-3">
              {ICON_OPTIONS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setIcon(key)}
                  className={`action-control flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border border-blue-200/80 ${
                    icon === key ? 'bg-gradient-to-br from-blue-100 via-white to-slate-50' : 'action-surface'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${icon === key ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>

            <label className="text-sm font-medium text-slate-600 mb-1 block">Orden (menor = primero)</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full px-4 py-3 mb-4 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-blue-200"
            />

            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="action-control w-full py-3 bg-gradient-to-br from-blue-600 to-blue-500 border border-blue-200/80 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
