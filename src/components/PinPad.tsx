import { useState, useEffect, useRef } from 'react';
import { Lock, X, Delete } from 'lucide-react';

interface PinPadProps {
  title: string;
  expectedPin: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PinPad({ title, expectedPin, onSuccess, onCancel }: PinPadProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Limpiar temporizador al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleDigit = (d: string) => {
    if (pin.length >= expectedPin.length) return;
    
    const newPin = pin + d;
    setPin(newPin);
    setError(false);

    if (newPin.length === expectedPin.length) {
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        if (newPin === expectedPin) {
          onSuccess();
        } else {
          setError(true);
          setPin('');
        }
      }, 150);
    }
  };

  const handleBackspace = () => {
    if (pin.length === 0) return;
    setPin((p) => p.slice(0, -1));
    setError(false);
  };

  // Soporte para teclado físico
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, expectedPin]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          </div>
          <button 
            type="button" 
            onClick={onCancel} 
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 mb-8">
          {Array.from({ length: expectedPin.length }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                error
                  ? 'bg-red-500 animate-pulse scale-110'
                  : i < pin.length
                  ? 'bg-primary scale-110 shadow-sm shadow-blue-500/50'
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-red-600 text-sm mb-4 font-medium animate-bounce">
            PIN incorrecto, intenta de nuevo
          </p>
        )}

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigit(d)}
              className="action-control action-surface aspect-square border border-slate-200 rounded-2xl text-2xl font-semibold text-slate-800 hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center select-none"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={onCancel}
            className="action-control action-surface aspect-square border border-slate-200 rounded-2xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center text-xs font-semibold select-none"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="action-control action-surface aspect-square border border-slate-200 rounded-2xl text-2xl font-semibold text-slate-800 hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center select-none"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            disabled={pin.length === 0}
            className="action-control action-surface aspect-square border border-slate-200 rounded-2xl text-slate-700 hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center disabled:opacity-40 disabled:active:scale-100 select-none"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}