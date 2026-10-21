import { useState } from 'react';
import { ArrowLeft, Plus, User, Phone, MapPin, CreditCard, Wallet, AlertTriangle, Trash2, Pencil, Check, X, Upload } from 'lucide-react';
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
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

const handleEdit = (op: Operator) => {
    setEditingOperator(op);
    setName(op.name);
    setRole(op.role === 'recepcion' ? 'recepcion' : 'servicio');
    setActive(op.active !== false);
    setPhone(op.phone || '');
    setAddress(op.address || '');
    setDocumentId(op.document_id || '');
    setPaymentMethod(op.payment_method ? op.payment_method.charAt(0).toUpperCase() + op.payment_method.slice(1) : '');
    setAccountNumber(op.payment_account || '');
    setEmergencyName(op.emergency_contact_name || '');
    setEmergencyPhone(op.emergency_contact_phone || '');
  };

  const handleNew = () => {
    setEditingOperator({
      id: uuid(),
      business_id: businessId,
      name: '',
      role: 'servicio',
      active: true,
      // Propiedades opcionales se inician en null
      phone: null,
      address: null,
      document_id: null,
      document_photo_url: null,
      payment_method: null,
      payment_account: null,
      emergency_contact_name: null,
      emergency_contact_phone: null
    } as any); // Usamos as any para sortear el created_at si TypeScript se queja temporalmente
    
    setName('');
    setRole('servicio');
    setActive(true);
    setPhone('');
    setAddress('');
    setDocumentId('');
    setPaymentMethod('');
    setAccountNumber('');
    setEmergencyName('');
    setEmergencyPhone('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !editingOperator || saving) return;

    setSaving(true);
    try {
      await onSave({
        ...editingOperator,
        name: name.trim(),
        role: role,
        active: active,
        phone: phone.trim() || null,
        address: address.trim() || null,
        document_id: documentId.trim() || null,
        payment_method: paymentMethod ? (paymentMethod.toLowerCase() as any) : null,
        payment_account: accountNumber.trim() || null,
        emergency_contact_name: emergencyName.trim() || null,
        emergency_contact_phone: emergencyPhone.trim() || null
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
              className="action-control w-full py-3.5 bg-primary text-white font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-500 transition-all shadow-sm"
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

<div className="space-y-6 overflow-y-auto max-h-[70vh] p-1">
  
  {/* Foto de Perfil */}
  <div className="flex flex-col items-center gap-3">
    <div className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 bg-slate-50 overflow-hidden">
      <User className="w-8 h-8" />
    </div>
    <button type="button" className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
      <Upload className="w-4 h-4" /> Cargar documento
    </button>
  </div>

  {/* 1. Información Personal */}
  <div className="space-y-3">
    <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-2">
      <User className="w-4 h-4" /> Información Personal
    </div>
    
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre Completo</label>
      <input 
        type="text" 
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej: Camila Restrepo" 
        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 text-sm" 
        required
      />
    </div>
    
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">Teléfono</label>
      <div className="relative">
        <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input 
          type="tel" 
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Ej: 300 123 4567" 
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 text-sm" 
        />
      </div>
    </div>

    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">Dirección</label>
      <div className="relative">
        <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input 
          type="text" 
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Ej: Calle 123 #45-67" 
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 text-sm" 
        />
      </div>
    </div>

    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">Cédula / DNI</label>
      <div className="relative">
        <CreditCard className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input 
          type="text" 
          value={documentId}
          onChange={(e) => setDocumentId(e.target.value)}
          placeholder="Ej: 1.030.456.789" 
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 text-sm" 
        />
      </div>
    </div>
  </div>

  {/* 2. Información de Pago */}
  <div className="space-y-3 pt-4 border-t border-slate-100">
    <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-2">
      <Wallet className="w-4 h-4" /> Información de Pago
    </div>
    
    <label className="block text-xs font-semibold text-slate-500 mb-1">Método de Pago Preferido</label>
    <div className="grid grid-cols-3 gap-2">
      <button 
        type="button" 
        onClick={() => setPaymentMethod('Nequi')}
        className={`py-2 text-xs font-medium rounded-lg transition-all ${paymentMethod === 'Nequi' ? 'border border-rose-200 bg-rose-50 text-rose-600' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
      >
        Nequi
      </button>
      <button 
        type="button" 
        onClick={() => setPaymentMethod('Daviplata')}
        className={`py-2 text-xs font-medium rounded-lg transition-all ${paymentMethod === 'Daviplata' ? 'border border-rose-200 bg-rose-50 text-rose-600' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
      >
        Daviplata
      </button>
      <button 
        type="button" 
        onClick={() => setPaymentMethod('Efectivo')}
        className={`py-2 text-xs font-medium rounded-lg transition-all ${paymentMethod === 'Efectivo' ? 'border border-rose-200 bg-rose-50 text-rose-600' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
      >
        Efectivo
      </button>
    </div>

    <div className="mt-2">
      <label className="block text-xs font-semibold text-slate-500 mb-1">Número de Cuenta / Teléfono</label>
      <input 
        type="text" 
        value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)}
        placeholder="Ej: 300 123 4567" 
        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 text-sm" 
      />
    </div>
  </div>

  {/* 3. Contacto de Emergencia */}
  <div className="space-y-3 pt-4 border-t border-slate-100">
    <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 mb-2">
      <AlertTriangle className="w-4 h-4" /> Contacto de Emergencia
    </div>
    
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre del Contacto</label>
      <input 
        type="text" 
        value={emergencyName}
        onChange={(e) => setEmergencyName(e.target.value)}
        placeholder="Ej: María Pérez" 
        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm" 
      />
    </div>
    
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">Teléfono del Contacto</label>
      <input 
        type="tel" 
        value={emergencyPhone}
        onChange={(e) => setEmergencyPhone(e.target.value)}
        placeholder="Ej: 300 987 6543" 
        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm" 
      />
    </div>
  </div>

  {/* 4. Rol y Estado */}
  <div className="space-y-3 pt-4 border-t border-slate-100">
    <label className="block text-xs font-semibold text-slate-500 mb-1">Rol en el negocio</label>
    <div className="grid grid-cols-2 gap-2">
      <button 
        type="button" 
        onClick={() => setRole('servicio')}
        className={`py-2 text-xs font-medium rounded-lg transition-all ${role === 'servicio' ? 'border border-rose-200 bg-rose-50 text-rose-600' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
      >
        Especialista (Servicios)
      </button>
      <button 
        type="button" 
        onClick={() => setRole('recepcion')}
        className={`py-2 text-xs font-medium rounded-lg transition-all ${role === 'recepcion' ? 'border border-rose-200 bg-rose-50 text-rose-600' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
      >
        Recepción / Caja
      </button>
    </div>
    
    <div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg mt-3 bg-slate-50">
      <span className="text-sm font-medium text-slate-700">Estado activo</span>
      <button
        type="button"
        onClick={() => setActive(!active)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  </div>

</div>

{/* Botones de Acción */}
<div className="flex gap-3 pt-4 border-t border-slate-100 mt-2">
  <button 
    type="button" 
    onClick={() => setEditingOperator(null)} 
    className="w-full py-2.5 text-sm font-medium border border-rose-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
  >
    Cancelar
  </button>
  <button 
    type="submit" 
    disabled={saving || !name.trim()} 
    className="w-full py-2.5 text-sm font-medium bg-[#D99AAB] text-white rounded-xl hover:bg-[#c48898] transition-colors disabled:opacity-50"
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