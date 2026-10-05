import React from 'react';
import { AccontoIntervento } from '../types';
import { Plus, Trash2, CheckCircle2, Clock, AlertCircle, Coins, CreditCard } from 'lucide-react';
import { formatCurrency } from '../services/storageService';

interface PaymentStatusSectionProps {
  totalAmount: number;
  statoPagamento: 'saldato' | 'parziale' | 'da_pagare';
  onChangeStato: (stato: 'saldato' | 'parziale' | 'da_pagare') => void;
  acconti: AccontoIntervento[];
  onChangeAcconti: (acconti: AccontoIntervento[]) => void;
  saldoRimanente: number;
  accentColor?: 'blue' | 'purple' | 'cyan' | 'emerald';
}

export const PaymentStatusSection: React.FC<PaymentStatusSectionProps> = ({
  totalAmount,
  statoPagamento,
  onChangeStato,
  acconti,
  onChangeAcconti,
  saldoRimanente,
  accentColor = 'blue',
}) => {
  const totAcconti = acconti.reduce((sum, a) => sum + (Number(a.importo) || 0), 0);
  const calculatedSaldo = Math.max(0, totalAmount - totAcconti);

  const handleAddAcconto = () => {
    const today = new Date().toISOString().slice(0, 10);
    // Suggerisci l'importo rimanente per comodità dell'utente
    const initialImp = calculatedSaldo > 0 ? calculatedSaldo : 0;
    const newAcconto: AccontoIntervento = {
      id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      importo: initialImp,
      data: today,
      note: `Acconto ${acconti.length + 1}`,
    };
    onChangeAcconti([...acconti, newAcconto]);
  };

  const handleUpdateAcconto = (id: string, field: keyof AccontoIntervento, value: any) => {
    const updated = acconti.map((a) => (a.id === id ? { ...a, [field]: value } : a));
    onChangeAcconti(updated);
  };

  const handleRemoveAcconto = (id: string) => {
    const filtered = acconti.filter((a) => a.id !== id);
    onChangeAcconti(filtered);
  };

  return (
    <div className="p-4 rounded-2xl bg-[#141e2e] border border-slate-800 space-y-3">
      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <CreditCard size={15} className="text-emerald-400" />
          <span>Stato Pagamento Intervento & Saldo</span>
        </span>
        <span className="text-[10px] text-slate-400 font-mono">
          Totale: <strong className="text-white">{formatCurrency(totalAmount || 0)}</strong>
        </span>
      </div>

      {/* 3 Opzioni di Stato: Pagato Tutto, Acconto/Parziale, Da Pagare */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onChangeStato('saldato')}
          className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
            statoPagamento === 'saldato'
              ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-md scale-[1.02]'
              : 'bg-[#101726] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <CheckCircle2 size={16} className={statoPagamento === 'saldato' ? 'text-emerald-400' : 'text-slate-500'} />
          <span className="leading-tight text-center">Pagato Tutto</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeStato('parziale')}
          className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
            statoPagamento === 'parziale'
              ? 'bg-amber-950/60 border-amber-500 text-amber-300 shadow-md scale-[1.02]'
              : 'bg-[#101726] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <Clock size={16} className={statoPagamento === 'parziale' ? 'text-amber-400' : 'text-slate-500'} />
          <span className="leading-tight text-center">Acconto / Parz.</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeStato('da_pagare')}
          className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
            statoPagamento === 'da_pagare'
              ? 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-md scale-[1.02]'
              : 'bg-[#101726] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <AlertCircle size={16} className={statoPagamento === 'da_pagare' ? 'text-rose-400' : 'text-slate-500'} />
          <span className="leading-tight text-center">Da Saldare</span>
        </button>
      </div>

      {/* DETTAGLIO ACCONTI & CALCOLO SALDO AUTOMATICO */}
      {statoPagamento === 'parziale' && (
        <div className="space-y-3 pt-2 border-t border-slate-800/80 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
              <Coins size={14} />
              <span>Acconti Versati</span>
            </span>
            <button
              type="button"
              onClick={handleAddAcconto}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-600/30 hover:bg-amber-600 text-amber-200 hover:text-white border border-amber-500/40 flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
            >
              <Plus size={13} />
              <span>Aggiungi Acconto</span>
            </button>
          </div>

          {acconti.length === 0 ? (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
              Nessun acconto inserito. Clicca su <strong>"Aggiungi Acconto"</strong> per inserire il primo versamento.
            </div>
          ) : (
            <div className="space-y-2">
              {acconti.map((acc, idx) => (
                <div
                  key={acc.id}
                  className="p-2.5 rounded-xl bg-[#0f1728] border border-slate-800 flex flex-wrap sm:flex-nowrap items-center gap-2"
                >
                  <span className="text-[10px] font-mono font-bold text-slate-400 w-5 shrink-0">
                    #{idx + 1}
                  </span>
                  
                  {/* Importo Acconto */}
                  <div className="w-28 shrink-0">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Importo € *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={acc.importo === 0 ? '' : acc.importo}
                      onChange={(e) => handleUpdateAcconto(acc.id, 'importo', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full bg-[#182336] border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-emerald-300 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>

                  {/* Data Versamento */}
                  <div className="w-32 shrink-0">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Data</label>
                    <input
                      type="date"
                      value={acc.data}
                      onChange={(e) => handleUpdateAcconto(acc.id, 'data', e.target.value)}
                      className="w-full bg-[#182336] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Note / Modalità */}
                  <div className="flex-1 min-w-[120px]">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Metodo / Note</label>
                    <input
                      type="text"
                      value={acc.note || ''}
                      onChange={(e) => handleUpdateAcconto(acc.id, 'note', e.target.value)}
                      placeholder="es. Bonifico, Contanti, Assegno..."
                      className="w-full bg-[#182336] border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Elimina Acconto */}
                  <button
                    type="button"
                    onClick={() => handleRemoveAcconto(acc.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer self-end mb-0.5"
                    title="Rimuovi acconto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* RIEPILOGO AUTOMATICO SALDO */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-600/40 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Totale Spesa</span>
              <span className="font-mono font-bold text-white text-sm">{formatCurrency(totalAmount || 0)}</span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 uppercase font-bold block">Tot. Acconti</span>
              <span className="font-mono font-bold text-emerald-300 text-sm">{formatCurrency(totAcconti)}</span>
            </div>
            <div>
              <span className="text-[10px] text-amber-400 uppercase font-bold block">Quanto Rimane</span>
              <span className={`font-mono font-black text-sm ${calculatedSaldo <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {calculatedSaldo <= 0 ? '0,00 € (Saldato)' : formatCurrency(calculatedSaldo)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* STATO DA SALDARE */}
      {statoPagamento === 'da_pagare' && (
        <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/50 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-rose-300">
            <AlertCircle size={15} className="shrink-0" />
            <span>Nessun acconto registrato. L'intero importo risulta in sospeso da saldare.</span>
          </div>
          <span className="font-mono font-black text-rose-400 text-sm shrink-0 ml-2">
            Saldo: {formatCurrency(totalAmount || 0)}
          </span>
        </div>
      )}

      {/* STATO SALDATO */}
      {statoPagamento === 'saldato' && totalAmount > 0 && (
        <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between text-xs animate-in fade-in">
          <span className="text-emerald-300 flex items-center gap-1.5 font-medium">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>Intervento interamente pagato e saldato</span>
          </span>
          <span className="font-mono font-bold text-emerald-400 text-xs">
            Saldo: 0,00 €
          </span>
        </div>
      )}
    </div>
  );
};
