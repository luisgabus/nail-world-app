import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Sparkles, Pencil } from 'lucide-react';
import { fetchAdditionalServices, saveAdditionalService, deleteAdditionalService, uuid } from '@/lib/data';
import type { AdditionalService } from '@/lib/types';

export function ServiceManager({ businessId }: { businessId: string }) {
  const [services, setServices] = useState<AdditionalService[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');

  const load = useCallback(async () => {
    const data = await fetchAdditionalServices(businessId);
    setServices(data || []);
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  const openAddModal = () => {
    setEditingId(null);
    setNewName('');
    setNewPrice('');
    setShowModal(true);
  };

  const openEditModal = (service: AdditionalService) => {
    setEditingId(service.id);
    setNewName(service.name);
    setNewPrice((service.price || 0).toString());
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!newName.trim() || !newPrice) return;
    
    const item = {
      id: editingId || uuid(),
      business_id: businessId,
      name: newName.trim(),
      price: parseInt(newPrice.toString().replace(/\D/g, ''), 10) || 0,
    } as AdditionalService;
    
    await saveAdditionalService(item);
    setShowModal(false);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás segura de eliminar este servicio adicional?')) {
      await deleteAdditionalService(id);
      await load();
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <button
        onClick={openAddModal}
        className="action-control w-full py-3 bg-gradient-to-br from-rose-600 to-rose-500 border border-rose-200/80 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" /> Agregar Servicio Adicional
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {services.map((service) => (
          <div key={service.id} className="p-4 rounded-2xl bg-white border border-[#E2E8F0] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <div className="font-semibold text-slate-800">{service.name}</div>
                <div className="text-sm font-bold text-emerald-600">
                  ${(service.price || 0).toLocaleString('es-CO')}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <button 
                onClick={() => openEditModal(service)}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all"
                title="Editar adicional"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleDelete(service.id)}
                className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all"
                title="Eliminar adicional"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {services.length === 0 && (
          <div className="col-span-full text-center text-slate-500 py-8 text-sm bg-white rounded-2xl border border-dashed border-slate-300">
            No hay servicios adicionales registrados. Agrega el primero arriba.
          </div>
        )}
      </div>

      {/* Modal para agregar / editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">
                {editingId ? 'Editar Adicional' : 'Nuevo Adicional'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-900">X</button>
            </div>
            
            <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">Nombre del adicional</label>
            <input 
              type="text" 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)} 
              placeholder="Ej: Nail Art / Piedras" 
              className="w-full px-4 py-3 mb-3 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-rose-200" 
              autoFocus 
            />
            
            <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">Precio</label>
            <input 
              type="number" 
              value={newPrice} 
              onChange={(e) => setNewPrice(e.target.value)} 
              placeholder="Ej: 15000" 
              className="w-full px-4 py-3 mb-5 bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-rose-200" 
            />
            
            <button 
              onClick={handleSave} 
              disabled={!newName.trim() || !newPrice} 
              className="action-control w-full py-3 bg-gradient-to-br from-rose-600 to-rose-500 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              {editingId ? 'Actualizar Adicional' : 'Guardar Adicional'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}