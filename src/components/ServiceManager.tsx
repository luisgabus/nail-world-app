import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { fetchCategories, saveCategory, deleteCategory, uuid } from '@/lib/data';
import type { VehicleCategory } from '@/lib/types';

export function ServiceManager({ businessId }: { businessId: string }) {
  const [services, setServices] = useState<VehicleCategory[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');

  const load = useCallback(async () => {
    const data = await fetchCategories(businessId);
    setServices(data || []);
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!newName.trim() || !newPrice) return;
    
    // Forzamos la inyección del precio dinámicamente
    const item = {
      id: uuid(),
      business_id: businessId,
      name: newName.trim(),
      price: parseInt(newPrice.replace(/\D/g, ''), 10) || 0,
      icon: 'sparkles',
    } as VehicleCategory & { price?: number };
    
    await saveCategory(item);
    setNewName('');
    setNewPrice('');
    setShowAdd(false);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás segura de eliminar este servicio?')) {
      await deleteCategory(id);
      await load();
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <button
        onClick={() => setShowAdd(true)}
        className="action-control w-full py-3 bg-gradient-to-br from-rose-600 to-rose-500 border border-rose-200/80 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" /> Agregar Nuevo Servicio
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {services.map((service: any) => (
          <div key={service.id} className="p-4 rounded-2xl bg-white border border-[#E2E8F0] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <div className="font-semibold text-slate-800">{service.name}</div>
                <div className="text-sm font-bold text-emerald-600">
                  {/* Aquí está la corrección: (service.price || 0) previene el colapso */}
                  ${(service.price || 0).toLocaleString('es-CO')}
                </div>
              </div>
            </div>
            <button 
              onClick={() => handleDelete(service.id)}
              className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all"
              title="Eliminar servicio"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {services.length === 0 && (
          <div className="col-span-full text-center text-slate-500 py-8 text-sm bg-white rounded-2xl border border-dashed border-slate-300">
            No hay servicios registrados. Agrega tu primer servicio arriba.
          </div>
        )}
      </div>

      {/* Modal para agregar */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Nuevo Servicio</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-slate-900">X</button>
            </div>
            
            <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">Nombre del servicio</label>
            <input 
              type="text" 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)} 
              placeholder="Ej: Manicura Semipermanente" 
              className="w-full px-4 py-3 mb-3 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-rose-200" 
              autoFocus 
            />
            
            <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">Precio</label>
            <input 
              type="number" 
              value={newPrice} 
              onChange={(e) => setNewPrice(e.target.value)} 
              placeholder="Ej: 35000" 
              className="w-full px-4 py-3 mb-5 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-rose-200" 
            />
            
            <button 
              onClick={handleAdd} 
              disabled={!newName.trim() || !newPrice} 
              className="action-control w-full py-3 bg-gradient-to-br from-rose-600 to-rose-500 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              Guardar Servicio
            </button>
          </div>
        </div>
      )}
    </div>
  );
}