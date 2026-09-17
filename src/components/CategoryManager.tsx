import { useState } from 'react';
import { ArrowLeft, Plus, Sparkles, Trash2, Pencil } from 'lucide-react';
import type { VehicleCategory } from '@/lib/types';
import { uuid } from '@/lib/data';

interface CategoryManagerProps {
  categories: VehicleCategory[];
  businessId: string;
  onBack: () => void;
  onSave: (category: VehicleCategory) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function CategoryManager({
  categories,
  businessId,
  onBack,
  onSave,
  onDelete,
}: CategoryManagerProps) {
  const [editingCategory, setEditingCategory] = useState<VehicleCategory | null>(null);
  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState(0);
  const [orderIndex, setOrderIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleEdit = (cat: VehicleCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setBasePrice(cat.base_price || 0);
    setOrderIndex(cat.order_index || 0);
  };

  const handleNew = () => {
    setEditingCategory({
      id: uuid(),
      business_id: businessId,
      name: '',
      base_price: 15000,
      icon: 'sparkles',
      order_index: categories.length,
      active: true,
    });
    setName('');
    setBasePrice(15000);
    setOrderIndex(categories.length);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !editingCategory || saving) return;

    setSaving(true);
    try {
      await onSave({
        ...editingCategory,
        name: name.trim(),
        base_price: Number(basePrice) || 0,
        icon: 'sparkles',
        order_index: Number(orderIndex) || 0,
      });
      setEditingCategory(null);
    } catch (err: any) {
      console.error('Error al guardar categoría:', err);
      alert(`Supabase rechazó el guardado: ${err?.message || 'Verifica permisos de RLS'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este servicio?')) return;
    try {
      await onDelete(id);
    } catch (err: any) {
      alert(`No se pudo eliminar: ${err?.message || 'Verifica permisos de RLS'}`);
    }
  };

  const sortedCategories = [...categories].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

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
        <h1 className="text-lg font-bold">Categorías de Servicios</h1>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        {!editingCategory ? (
          <>
            <button
              onClick={handleNew}
              className="action-control w-full py-3.5 bg-rose-500 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-600 transition-all shadow-sm"
            >
              <Plus className="w-5 h-5" /> Agregar Categoría
            </button>

            <div className="space-y-3">
              {sortedCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{cat.name}</h3>
                      <p className="text-xs text-slate-500">
                        ${cat.base_price.toLocaleString('es-CO')} · Orden {cat.order_index}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(cat)}
                      className="p-2 rounded-xl bg-slate-50 border border-[#E2E8F0] hover:bg-slate-100 text-slate-600 transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-2 rounded-xl bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {sortedCategories.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No hay categorías registradas. Presiona "Agregar Categoría" para crear la primera.
                </div>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-[#E2E8F0] shadow-sm rounded-3xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {categories.some((c) => c.id === editingCategory.id) ? 'Editar Servicio' : 'Nuevo Servicio'}
            </h2>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Nombre del servicio</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Manicura Semipermanente..."
                className="w-full px-4 py-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-slate-900 text-sm focus:outline-none focus:border-rose-500"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Precio Base ($)</label>
              <input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-slate-900 text-sm focus:outline-none focus:border-rose-500 font-bold"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Orden de visualización</label>
              <input
                type="number"
                value={orderIndex}
                onChange={(e) => setOrderIndex(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-slate-900 text-sm focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="action-control action-surface flex-1 py-3 border border-rose-200/80 text-slate-600 font-medium rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="action-control flex-1 py-3 bg-rose-500 text-white font-semibold rounded-xl hover:bg-rose-600 transition-all disabled:opacity-50"
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