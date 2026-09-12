import React, { useState } from 'react';
import { User, Phone, Car, Tag, CheckCircle2, ArrowRight } from 'lucide-react';

export const ClientRegistration = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    vehicleType: 'Sedán',
    plate: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Lógica para enviar a Supabase / backend
    setSubmitted(true);
  };

  return (
    <section className="w-full bg-[#0B0F17] text-white py-16 px-4 border-t border-slate-800">
      <div className="max-w-3xl mx-auto text-center mb-10">
        <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold tracking-wide border border-emerald-500/20 mb-3">
          Autogestión de Clientes
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
          Alta de Nuevo Cliente
        </h2>
        <p className="text-slate-400 text-sm sm:text-base">
          Registra tus datos y los de tu cliente para agilizar el ingreso y recibir atención prioritaria.
        </p>
      </div>

      <div className="max-w-xl mx-auto bg-[#131926] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {submitted ? (
          <div className="text-center py-12 flex flex-col items-center justify-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4 animate-bounce" />
            <h3 className="text-2xl font-bold text-white mb-2">¡Registro Exitoso!</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-sm">
              Tus datos han sido ingresados correctamente al sistema. Ya puedes solicitar tu servicio en recepción.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setFormData({ fullName: '', phone: '', vehicleType: 'Sedán', plate: '' });
              }}
              className="text-xs text-slate-400 hover:text-white underline transition-colors"
            >
              Registrar otro servicio
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Nombre Completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-[#0B0F17] border border-slate-700/80 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Teléfono / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="tel"
                    required
                    placeholder="300 000 0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#0B0F17] border border-slate-700/80 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Nombre de Cliente
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="ABC 123"
                    value={formData.plate}
                    onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                    className="w-full bg-[#0B0F17] border border-slate-700/80 rounded-xl py-3 pl-11 pr-4 text-sm text-white uppercase placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
<label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
  Servicio Principal
</label>
<div className="relative">
  <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
  <select
    value={formData.vehicleType}
    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
    className="w-full bg-[#0B0F17] border border-slate-700/80 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
  >
    <option value="Manicure Tradicional">Manicure Tradicional</option>
    <option value="Pedicure Tradicional">Pedicure Tradicional</option>
    <option value="Acrilicas / Gel">Uñas Acrílicas / Gel</option>
    <option value="Spa Manos y Pies">Spa de Manos y Pies</option>
  </select>
</div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center space-x-2 transition-all duration-200 shadow-lg shadow-indigo-600/20 active:scale-[0.99]"
            >
              <span>Completar Registro</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </section>
  );
};
