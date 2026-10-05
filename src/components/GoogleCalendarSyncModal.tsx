import React, { useState } from 'react';
import { Veicolo } from '../types';
import {
  googleSignIn,
  getAccessToken,
  getCurrentUser,
  syncVehicleDeadlinesToGoogleCalendar,
  SyncResult,
} from '../services/googleCalendarService';
import { formatDateIt, computeBolloPagabileEntro, formatCurrency } from '../services/storageService';
import {
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  CreditCard,
  FileCheck,
  Shield,
  ExternalLink,
  User,
  RefreshCw,
} from 'lucide-react';

interface GoogleCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  veicolo: Veicolo | undefined;
}

export const GoogleCalendarSyncModal: React.FC<GoogleCalendarSyncModalProps> = ({
  isOpen,
  onClose,
  veicolo,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [currentAccount, setCurrentAccount] = useState<string | null>(() => getCurrentUser()?.email || null);

  if (!isOpen || !veicolo) return null;

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let token = await getAccessToken();

      // Se non autenticato o per sicurezza, avvia popup
      if (!token) {
        const signinRes = await googleSignIn(true);
        token = signinRes.accessToken;
        setCurrentAccount(signinRes.user.email);
      }

      if (!token) {
        throw new Error('Accesso a Google non completato. Riprova.');
      }

      const syncRes = await syncVehicleDeadlinesToGoogleCalendar(token, veicolo);
      setResult(syncRes);
    } catch (err: any) {
      console.error('Errore sincronizzazione Google Calendar:', err);
      // Se errore di permessi o 401/403, forziamo ri-autenticazione con popup
      if (
        err?.message?.includes('401') ||
        err?.message?.includes('403') ||
        err?.message?.includes('Permessi') ||
        err?.message?.includes('token')
      ) {
        try {
          const fresh = await googleSignIn(true);
          setCurrentAccount(fresh.user.email);
          const syncRes = await syncVehicleDeadlinesToGoogleCalendar(fresh.accessToken, veicolo);
          setResult(syncRes);
          return;
        } catch (innerErr: any) {
          setError(innerErr?.message || 'Errore di autorizzazione con Google Calendar. Riconnetti il tuo account.');
        }
      } else {
        setError(err?.message || 'Impossibile sincronizzare le scadenze con Google Calendar');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await googleSignIn(true);
      setCurrentAccount(res.user.email);
    } catch (e: any) {
      setError(e?.message || 'Errore durante il cambio account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#111927] border border-slate-800 rounded-3xl shadow-2xl text-white overflow-hidden">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 text-white flex items-center justify-center shrink-0">
              <CalendarDays size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Sincronizza Google Calendar
              </h3>
              <p className="text-xs text-blue-100 font-mono mt-0.5">
                Calendario "Scadenze Auto"
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          
          {/* Account Google attivo con opzione Cambia Account */}
          <div className="p-3 rounded-2xl bg-[#162133] border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <User size={15} className="text-blue-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-slate-400 block">Account Google:</span>
                <span className="font-bold text-white font-mono truncate block">
                  {currentAccount || 'Nessun account connesso'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSwitchAccount}
              className="px-2.5 py-1 rounded-xl bg-blue-950 hover:bg-blue-900 border border-blue-800 text-blue-300 hover:text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
              title="Cambia account Google o rinnova autorizzazioni"
            >
              <RefreshCw size={11} />
              <span>Cambia</span>
            </button>
          </div>

          {/* Info vettura */}
          <div className="px-3 py-2 rounded-xl bg-[#0d1422] border border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Veicolo:</span>
            <span className="font-bold text-white font-mono">
              {veicolo.marca} {veicolo.modello} • {veicolo.targa}
            </span>
          </div>

          {result ? (
            /* Schermata di successo */
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500 space-y-3 animate-in zoom-in-95">
              <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
                <CheckCircle2 size={20} />
                <span>Sincronizzazione completata!</span>
              </div>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                Tutte le scadenze disponibili sono state create nel calendario dedicato <strong>"{result.calendarName}"</strong> del tuo account Google con promemoria a 30 giorni e 7 giorni prima.
              </p>

              <div className="pt-2 border-t border-emerald-800/60 flex items-center justify-between text-[11px] text-emerald-300">
                <span>Eventi salvati su Google Calendar:</span>
                <span className="font-bold font-mono text-white">{result.eventsAdded + result.eventsUpdated}</span>
              </div>

              {result.eventsSkipped && result.eventsSkipped.length > 0 && (
                <div className="pt-2 border-t border-emerald-800/60 text-[10px] text-amber-300/90">
                  <span className="font-bold">Nota:</span> {result.eventsSkipped.join(', ')} non inserite perché la data non è ancora compilata nella scheda veicolo.
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink size={13} />
                  <span>Apri Google Calendar</span>
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Chiudi
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Descrizione scadenze da sincronizzare */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Scadenze per {veicolo.targa}:
                </span>
                
                <div className="space-y-2">
                  {/* Bollo */}
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    veicolo.scadenzaBollo
                      ? 'bg-[#141e2e] border-amber-500/40 text-white'
                      : 'bg-[#101722] border-slate-800 text-slate-400 opacity-60'
                  }`}>
                    <div className="flex items-center gap-2">
                      <CreditCard size={15} className="text-amber-400" />
                      <div>
                        <span className="font-bold block">Bollo Auto</span>
                        <span className="text-[10px] text-amber-300">
                          {veicolo.scadenzaBollo
                            ? `Scade il ${formatDateIt(veicolo.scadenzaBollo)} • Pagabile entro: ${computeBolloPagabileEntro(veicolo.scadenzaBollo)}`
                            : 'Data non impostata'}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">Annuale</span>
                  </div>

                  {/* Revisione */}
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    veicolo.scadenzaRevisione
                      ? 'bg-[#141e2e] border-rose-500/40 text-white'
                      : 'bg-[#101722] border-slate-800 text-slate-400 opacity-60'
                  }`}>
                    <div className="flex items-center gap-2">
                      <FileCheck size={15} className="text-rose-400" />
                      <div>
                        <span className="font-bold block">Revisione Ministeriale</span>
                        <span className="text-[10px] text-rose-300">
                          {veicolo.scadenzaRevisione ? `Scade il ${formatDateIt(veicolo.scadenzaRevisione)}` : 'Data non impostata'}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">Ogni 2 anni</span>
                  </div>

                  {/* Assicurazione */}
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    veicolo.scadenzaAssicurazione
                      ? 'bg-[#141e2e] border-emerald-500/40 text-white'
                      : 'bg-[#101722] border-slate-800 text-slate-400 opacity-60'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Shield size={15} className="text-emerald-400" />
                      <div>
                        <span className="font-bold block">Assicurazione RCA</span>
                        <span className="text-[10px] text-emerald-300">
                          {veicolo.scadenzaAssicurazione
                            ? `Scade il ${formatDateIt(veicolo.scadenzaAssicurazione)} (${veicolo.compagniaAssicurazione || 'N/D'})`
                            : 'Data non impostata (compilabile nella scheda)'}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">{veicolo.frequenzaAssicurazione || 'Semestrale'}</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500 text-xs text-rose-200 flex items-center gap-2 animate-in fade-in">
                  <AlertCircle size={16} className="text-rose-400 shrink-0" />
                  <span className="flex-1">{error}</span>
                </div>
              )}

              {/* Bottoni di azione */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSync}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-950 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Creazione e invio su Google Calendar...</span>
                    </>
                  ) : (
                    <>
                      <CalendarDays size={18} />
                      <span>Invia al calendario "Scadenze Auto"</span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-center text-slate-400 leading-tight">
                  Seleziona l'account Google su cui desideri creare il calendario "Scadenze Auto" e conferma le autorizzazioni.
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
