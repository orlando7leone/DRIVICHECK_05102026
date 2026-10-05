import React, { useState } from 'react';
import { Veicolo } from '../types';
import { formatKm } from '../services/storageService';
import { Gauge, X, Check, ArrowRight } from 'lucide-react';

interface UpdateKmModalProps {
  isOpen: boolean;
  onClose: () => void;
  veicolo: Veicolo;
  onUpdateKm: (nuoviKm: number) => void;
}

export const UpdateKmModal: React.FC<UpdateKmModalProps> = ({
  isOpen,
  onClose,
  veicolo,
  onUpdateKm,
}) => {
  const [kmInput, setKmInput] = useState<string>(veicolo?.kmAttuali?.toString() || '');

  React.useEffect(() => {
    setKmInput(veicolo?.kmAttuali?.toString() || '');
  }, [veicolo, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(kmInput);
    if (!isNaN(val) && val >= 0) {
      onUpdateKm(val);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-[#131b26] border border-slate-700/80 rounded-3xl p-5 text-white shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Gauge size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold">Aggiorna Chilometraggio</h3>
              <p className="text-xs text-slate-400 font-mono">{veicolo.marca} • {veicolo.targa}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-3 bg-[#0d1420] rounded-2xl border border-slate-800 text-xs">
          <span className="text-slate-400">Chilometraggio precedente:</span>
          <span className="font-bold text-white ml-1.5">{formatKm(veicolo.kmAttuali)}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Nuovo valore contachilometri
            </label>
            <div className="relative">
              <input
                type="number"
                required
                autoFocus
                value={kmInput}
                onChange={(e) => setKmInput(e.target.value)}
                placeholder="es. 202500"
                className="w-full bg-[#1b2637] border border-slate-700 rounded-2xl px-4 py-3 text-lg font-black text-white focus:outline-none focus:border-blue-500"
              />
              <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400 uppercase">
                KM
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-900/30 flex items-center justify-center gap-1.5"
            >
              <Check size={16} />
              Aggiorna
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
