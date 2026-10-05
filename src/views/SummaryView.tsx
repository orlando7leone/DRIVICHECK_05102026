import React, { useState, useMemo } from 'react';
import { Veicolo, InterventoRecord, CategoriaManutenzione, TipoPagamentoScadenza } from '../types';
import { formatCurrency, formatKm, formatDateIt, getDaysUntil, generateDeadlineMessage, openWhatsAppReminder } from '../services/storageService';
import {
  Wrench,
  Disc,
  FileEdit,
  AlertTriangle,
  Gauge,
  Calendar,
  TrendingUp,
  ChevronRight,
  Plus,
  ArrowRight,
  Layers,
  Euro,
  Shield,
  MessageCircle,
  CreditCard,
  FolderSync,
  Printer,
} from 'lucide-react';

interface SummaryViewProps {
  veicolo: Veicolo | undefined;
  veicoli: Veicolo[];
  record: InterventoRecord[];
  catalogo: CategoriaManutenzione[];
  onOpenNewRecord: () => void;
  onOpenUpdateKm: () => void;
  onOpenVehicleDetails: () => void;
  onOpenRegistroGomme?: () => void;
  onOpenAltriInterventi?: () => void;
  onOpenRegistroPagamenti?: (tipo?: TipoPagamentoScadenza) => void;
  onOpenDataTransferModal?: () => void;
  onOpenPrintModal?: () => void;
  onSwitchTab: (tab: 'cronologia' | 'garage' | 'imposta') => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  veicolo,
  record,
  onOpenNewRecord,
  onOpenUpdateKm,
  onOpenVehicleDetails,
  onOpenRegistroGomme,
  onOpenAltriInterventi,
  onOpenRegistroPagamenti,
  onOpenDataTransferModal,
  onOpenPrintModal,
  onSwitchTab,
}) => {
  const [selectedYear, setSelectedYear] = useState<string>('Tutti');

  const vehicleRecords = useMemo(() => {
    if (!veicolo) return [];
    return record.filter((r) => r.veicoloId === veicolo.id);
  }, [record, veicolo]);

  // Anni disponibili per il veicolo
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    vehicleRecords.forEach((r) => {
      if (r.data) {
        const y = r.data.slice(0, 4);
        if (y && !isNaN(Number(y))) years.add(y);
      }
    });
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear);
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [vehicleRecords]);

  // Raggruppamento per ogni anno: Manutenzione, Gomme, Pagamenti, Altri Interventi
  const yearlyBreakdowns = useMemo(() => {
    return availableYears.map((year) => {
      const recsYear = vehicleRecords.filter((r) => r.data && r.data.startsWith(year));

      const manYear = recsYear.filter((r) => r.tipo === 'Manutenzione' || r.tipo === 'Riparazione');
      const manCost = manYear.reduce((acc, r) => acc + (r.costo || 0), 0);

      const gomYear = recsYear.filter((r) => r.tipo === 'Gomme' || !!r.registroGomme);
      const gomCost = gomYear.reduce((acc, r) => acc + (r.costo || 0), 0);

      const pagYear = recsYear.filter((r) => r.tipo === 'Pagamento Scadenza' || !!r.registroPagamento);
      const pagCost = pagYear.reduce((acc, r) => acc + (r.costo || 0), 0);
      const pagatiCount = pagYear.filter((r) => r.registroPagamento?.pagato !== false).length;
      const inAttesaCount = pagYear.filter((r) => r.registroPagamento?.pagato === false).length;

      const altYear = recsYear.filter(
        (r) => (r.tipo === 'Altri Interventi' || r.tipo === 'Riparazione') && !r.registroGomme && !r.registroPagamento
      );
      const altCost = altYear.reduce((acc, r) => acc + (r.costo || 0), 0);

      const totalCost = manCost + gomCost + pagCost + altCost;

      return {
        year,
        manutenzione: { count: manYear.length, cost: manCost },
        gomme: { count: gomYear.length, cost: gomCost },
        pagamenti: { count: pagYear.length, cost: pagCost, pagatiCount, inAttesaCount },
        altri: { count: altYear.length, cost: altCost },
        totale: totalCost,
        recordsCount: recsYear.length,
      };
    });
  }, [availableYears, vehicleRecords]);

  // Record attivi in base all'anno selezionato (o tutti)
  const displayRecords = useMemo(() => {
    if (selectedYear === 'Tutti') return vehicleRecords;
    return vehicleRecords.filter((r) => r.data && r.data.startsWith(selectedYear));
  }, [vehicleRecords, selectedYear]);

  // 1. Manutenzione
  const manutenzioneRecords = useMemo(() => {
    return displayRecords.filter(
      (r) => r.tipo === 'Manutenzione' || r.tipo === 'Riparazione'
    );
  }, [displayRecords]);

  const totaleManutenzione = useMemo(() => {
    return manutenzioneRecords.reduce((acc, r) => acc + (r.costo || 0), 0);
  }, [manutenzioneRecords]);

  const ultimoManutenzione = useMemo(() => {
    if (manutenzioneRecords.length === 0) return null;
    return [...manutenzioneRecords].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    )[0];
  }, [manutenzioneRecords]);

  // 2. Registro Gomme
  const gommeRecords = useMemo(() => {
    return displayRecords.filter((r) => r.tipo === 'Gomme' || !!r.registroGomme);
  }, [displayRecords]);

  const totaleGomme = useMemo(() => {
    return gommeRecords.reduce((acc, r) => acc + (r.costo || 0), 0);
  }, [gommeRecords]);

  const ultimoGomme = useMemo(() => {
    if (gommeRecords.length === 0) return null;
    return [...gommeRecords].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    )[0];
  }, [gommeRecords]);

  // 3. Altri Interventi (interventi meccanici, carrozzeria, riparazioni rapide)
  const altriInterventiRecords = useMemo(() => {
    return displayRecords.filter(
      (r) =>
        (r.tipo === 'Altri Interventi' || r.tipo === 'Riparazione') &&
        !r.registroGomme &&
        !r.registroPagamento
    );
  }, [displayRecords]);

  const totaleAltriInterventi = useMemo(() => {
    return altriInterventiRecords.reduce((acc, r) => acc + (r.costo || 0), 0);
  }, [altriInterventiRecords]);

  const ultimoAltri = useMemo(() => {
    if (altriInterventiRecords.length === 0) return null;
    return [...altriInterventiRecords].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    )[0];
  }, [altriInterventiRecords]);

  // 4. Pagamenti Scadenze (Bollo, Revisione, Assicurazione)
  const pagamentiRecords = useMemo(() => {
    return displayRecords.filter(
      (r) => r.tipo === 'Pagamento Scadenza' || !!r.registroPagamento
    );
  }, [displayRecords]);

  const totalePagamenti = useMemo(() => {
    return pagamentiRecords.reduce((acc, r) => acc + (r.costo || 0), 0);
  }, [pagamentiRecords]);

  const ultimoPagamento = useMemo(() => {
    if (pagamentiRecords.length === 0) return null;
    return [...pagamentiRecords].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    )[0];
  }, [pagamentiRecords]);

  // Totale Complessivo
  const totaleComplessivo = useMemo(() => {
    return totaleManutenzione + totaleGomme + totaleAltriInterventi + totalePagamenti;
  }, [totaleManutenzione, totaleGomme, totaleAltriInterventi, totalePagamenti]);

  const totaleAcconti = useMemo(() => {
    return displayRecords.reduce(
      (sum, r) => sum + (r.acconti || []).reduce((accSum, a) => accSum + (Number(a.importo) || 0), 0),
      0
    );
  }, [displayRecords]);

  const totaleRimanenza = useMemo(() => {
    return displayRecords.reduce((sum, r) => {
      const totAcc = (r.acconti || []).reduce((accSum, a) => accSum + (Number(a.importo) || 0), 0);
      const rim =
        r.saldoRimanente !== undefined
          ? r.saldoRimanente
          : r.statoPagamento === 'parziale'
          ? Math.max(0, (r.costo || 0) - totAcc)
          : r.statoPagamento === 'da_pagare'
          ? (r.costo || 0)
          : 0;
      return sum + rim;
    }, 0);
  }, [displayRecords]);

  const pctManutenzione =
    totaleComplessivo > 0
      ? Math.round((totaleManutenzione / totaleComplessivo) * 100)
      : 0;
  const pctGomme =
    totaleComplessivo > 0 ? Math.round((totaleGomme / totaleComplessivo) * 100) : 0;
  const pctAltri =
    totaleComplessivo > 0 ? Math.round((totaleAltriInterventi / totaleComplessivo) * 100) : 0;
  const pctPagamenti =
    totaleComplessivo > 0 ? Math.max(0, 100 - pctManutenzione - pctGomme - pctAltri) : 0;

  const daysBollo = veicolo ? getDaysUntil(veicolo.scadenzaBollo) : 999;
  const daysRevisione = veicolo ? getDaysUntil(veicolo.scadenzaRevisione) : 999;
  const daysAssicurazione = veicolo?.scadenzaAssicurazione
    ? getDaysUntil(veicolo.scadenzaAssicurazione)
    : 999;

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-200">
      {/* Title & Quick Info */}
      <div className="pt-2 pb-1 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Riepilogo Spese
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Importi parziali, totale complessivo e stato veicolo
          </p>
        </div>

        <button
          onClick={onOpenVehicleDetails}
          className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
        >
          <span>Scheda Auto</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {veicolo ? (
        <>
          {/* Barra Filtro per Anno */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => setSelectedYear('Tutti')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                selectedYear === 'Tutti'
                  ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                  : 'bg-[#152033] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Tutti gli Anni
            </button>
            {availableYears.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                  selectedYear === yr
                    ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                    : 'bg-[#152033] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Anno {yr}
              </button>
            ))}
          </div>

          {/* Main Top Cards: Cost and KM */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total Cost */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-[#1a2b42] to-[#121c2d] border border-blue-500/40 shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 flex items-center gap-1">
                  <TrendingUp size={12} /> {selectedYear === 'Tutti' ? 'Costo Complessivo' : `Costo Anno ${selectedYear}`}
                </span>
                <div className="text-xl sm:text-2xl font-black text-white mt-1">
                  {formatCurrency(totaleComplessivo)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {displayRecords.length}{' '}
                  {displayRecords.length === 1 ? 'registrazione' : 'registrazioni'}
                  {selectedYear !== 'Tutti' && ` nel ${selectedYear}`}
                </p>
              </div>

              {(totaleAcconti > 0 || totaleRimanenza > 0) && (
                <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] font-mono flex-wrap">
                  {totaleAcconti > 0 && (
                    <span className="text-amber-300 font-bold bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-800/60">
                      Acc: {formatCurrency(totaleAcconti)}
                    </span>
                  )}
                  {totaleRimanenza > 0 && (
                    <span className="text-rose-300 font-bold bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-800/60">
                      Rim: {formatCurrency(totaleRimanenza)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Current KM */}
            <div
              onClick={onOpenUpdateKm}
              className="p-4 rounded-3xl bg-gradient-to-br from-[#1a2b42] to-[#121c2d] border border-slate-800 shadow-xl cursor-pointer hover:border-blue-500/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                  <Gauge size={12} className="text-emerald-400" /> Chilometraggio
                </span>
                <span className="text-[9px] text-blue-400 font-bold">Modifica</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white mt-1">
                {formatKm(veicolo.kmAttuali)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                {veicolo.marca} • {veicolo.targa}
              </p>
            </div>
          </div>

          {/* Quick Action Commands: Centro Esporta / Importa & Stampa Scheda */}
          {(onOpenDataTransferModal || onOpenPrintModal) && (
            <div className="grid grid-cols-2 gap-2.5">
              {onOpenDataTransferModal && (
                <button
                  type="button"
                  onClick={onOpenDataTransferModal}
                  className="p-3 rounded-2xl bg-gradient-to-r from-blue-950/60 to-[#121c2d] hover:from-blue-900/60 hover:to-[#17253a] border border-blue-500/40 flex items-center justify-between text-left cursor-pointer transition-all shadow-md group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FolderSync size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">Esporta / Importa</span>
                      <span className="text-[10px] text-blue-200/70 block truncate">Excel, CSV, Drive</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-500 group-hover:text-blue-400 shrink-0" />
                </button>
              )}

              {onOpenPrintModal && (
                <button
                  type="button"
                  onClick={onOpenPrintModal}
                  className="p-3 rounded-2xl bg-gradient-to-r from-teal-950/60 to-[#121c2d] hover:from-teal-900/60 hover:to-[#17253a] border border-teal-500/40 flex items-center justify-between text-left cursor-pointer transition-all shadow-md group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Printer size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">Stampa Scheda</span>
                      <span className="text-[10px] text-teal-200/70 block truncate">Report e schede</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-500 group-hover:text-teal-400 shrink-0" />
                </button>
              )}
            </div>
          )}

          {/* Urgent Deadlines Alert Banner */}
          {(daysBollo <= 45 || daysRevisione <= 45 || daysAssicurazione <= 45) && (
            <div className="p-4 rounded-3xl bg-amber-950/30 border border-amber-600/60 shadow-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <AlertTriangle size={16} />
                  <span>Scadenze imminenti per {veicolo.targa}</span>
                </div>
                {veicolo.cellulare && (
                  <button
                    type="button"
                    onClick={() => {
                      const msg = generateDeadlineMessage(
                        veicolo,
                        'Scadenze',
                        daysBollo <= 45
                          ? veicolo.scadenzaBollo
                          : daysRevisione <= 45
                          ? veicolo.scadenzaRevisione
                          : veicolo.scadenzaAssicurazione || '',
                        veicolo.importoBollo
                      );
                      openWhatsAppReminder(veicolo.cellulare, msg);
                    }}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-lg"
                  >
                    <MessageCircle size={12} />
                    <span>Avviso WhatsApp</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {daysBollo <= 45 && (
                  <div className="p-2.5 rounded-xl bg-[#0e1624] border border-amber-800/60">
                    <span className="text-[10px] text-slate-400 block font-semibold">Bollo Auto:</span>
                    <strong className="text-amber-300 text-xs">{formatDateIt(veicolo.scadenzaBollo)}</strong>
                    <span className="text-[10px] text-slate-400 block mt-0.5">({daysBollo} gg rimasti)</span>
                  </div>
                )}
                {daysRevisione <= 45 && (
                  <div className="p-2.5 rounded-xl bg-[#0e1624] border border-rose-800/60">
                    <span className="text-[10px] text-slate-400 block font-semibold">Revisione MCTC:</span>
                    <strong className="text-rose-400 text-xs">{formatDateIt(veicolo.scadenzaRevisione)}</strong>
                    <span className="text-[10px] text-slate-400 block mt-0.5">({daysRevisione} gg rimasti)</span>
                  </div>
                )}
                {daysAssicurazione <= 45 && veicolo.scadenzaAssicurazione && (
                  <div className="p-2.5 rounded-xl bg-[#0e1624] border border-emerald-800/60">
                    <span className="text-[10px] text-emerald-400 block font-semibold">Assicurazione:</span>
                    <strong className="text-emerald-300 text-xs">{formatDateIt(veicolo.scadenzaAssicurazione)}</strong>
                    <span className="text-[10px] text-slate-400 block mt-0.5">({daysAssicurazione} gg rimasti)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SEZIONE: IMPORTI PARZIALI (Manutenzione, Registro Gomme, Altri Interventi) */}
          <div className="p-4 rounded-3xl bg-[#141e2e] border border-slate-800 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                <Layers size={15} />
                <span>Importi Parziali & Riepilogo Lavorazioni</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Totale: {formatCurrency(totaleComplessivo)}
              </span>
            </div>

            {/* Barra proporzionale di spesa */}
            {totaleComplessivo > 0 && (
              <div className="space-y-1.5">
                <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
                  {pctManutenzione > 0 && (
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500"
                      style={{ width: `${pctManutenzione}%` }}
                      title={`Manutenzione: ${pctManutenzione}%`}
                    />
                  )}
                  {pctGomme > 0 && (
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-teal-500"
                      style={{ width: `${pctGomme}%` }}
                      title={`Gomme: ${pctGomme}%`}
                    />
                  )}
                  {pctAltri > 0 && (
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                      style={{ width: `${pctAltri}%` }}
                      title={`Altri Interventi: ${pctAltri}%`}
                    />
                  )}
                  {pctPagamenti > 0 && (
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                      style={{ width: `${pctPagamenti}%` }}
                      title={`Pagamenti Scadenze: ${pctPagamenti}%`}
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 gap-x-2 gap-y-1 px-0.5">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Manutenzione ({pctManutenzione}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> Gomme ({pctGomme}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" /> Altri ({pctAltri}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Pagamenti ({pctPagamenti}%)
                  </span>
                </div>
              </div>
            )}

            {/* LISTA DEI 4 IMPORTI PARZIALI */}
            <div className="space-y-2.5">
              
              {/* 1. MANUTENZIONE */}
              <div
                onClick={() => onSwitchTab('cronologia')}
                className="p-3.5 rounded-2xl bg-[#0f1726] border border-orange-500/30 hover:border-orange-500/70 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                      <Wrench size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-orange-300 transition-colors">
                        Manutenzione
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {manutenzioneRecords.length}{' '}
                        {manutenzioneRecords.length === 1 ? 'intervento' : 'interventi'}
                        {ultimoManutenzione && ` • Ultimo: ${formatDateIt(ultimoManutenzione.data)}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm sm:text-base font-black text-amber-400 block font-mono">
                      {formatCurrency(totaleManutenzione)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {totaleComplessivo > 0 ? `${pctManutenzione}% del tot.` : '0%'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. REGISTRO GOMME */}
              <div
                onClick={() => onSwitchTab('cronologia')}
                className="p-3.5 rounded-2xl bg-[#0f1726] border border-cyan-500/30 hover:border-cyan-500/70 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                      <Disc size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                        Registro Gomme
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {gommeRecords.length}{' '}
                        {gommeRecords.length === 1 ? 'intervento' : 'interventi'}
                        {ultimoGomme && ` • Ultimo: ${formatDateIt(ultimoGomme.data)}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm sm:text-base font-black text-cyan-400 block font-mono">
                      {formatCurrency(totaleGomme)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {totaleComplessivo > 0 ? `${pctGomme}% del tot.` : '0%'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. ALTRI INTERVENTI (MECCANICI / RIPARAZIONI RAPIDE) */}
              <div
                onClick={() => onSwitchTab('cronologia')}
                className="p-3.5 rounded-2xl bg-[#0f1726] border border-purple-500/30 hover:border-purple-500/70 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                      <FileEdit size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                        <span>Altri Interventi</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                          Meccanici
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {altriInterventiRecords.length}{' '}
                        {altriInterventiRecords.length === 1 ? 'intervento' : 'interventi'}
                        {ultimoAltri && ` • Ultimo: ${formatDateIt(ultimoAltri.data)}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm sm:text-base font-black text-purple-400 block font-mono">
                      {formatCurrency(totaleAltriInterventi)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {totaleComplessivo > 0 ? `${pctAltri}% del tot.` : '0%'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. REGISTRO PAGAMENTI (SCADENZE BOLLO, REVISIONE, ASSICURAZIONE) */}
              <div
                onClick={() => onOpenRegistroPagamenti?.('Bollo')}
                className="p-3.5 rounded-2xl bg-[#0f1726] border border-emerald-500/30 hover:border-emerald-500/70 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                        <span>Registro Pagamenti</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                          Scadenze
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {pagamentiRecords.length}{' '}
                        {pagamentiRecords.length === 1 ? 'pagamento' : 'pagamenti'}
                        {ultimoPagamento && ` • Ultimo: ${formatDateIt(ultimoPagamento.data)}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm sm:text-base font-black text-emerald-400 block font-mono">
                      {formatCurrency(totalePagamenti)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {totaleComplessivo > 0 ? `${pctPagamenti}% del tot.` : '0%'}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* BOX TOTALE COMPLESSIVO SPESE */}
            <div className="pt-3 border-t border-slate-800 space-y-1 px-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Totale Complessivo
                </span>
                <span className="text-lg sm:text-xl font-black text-white font-mono">
                  {formatCurrency(totaleComplessivo)}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-1">
                <span>Interventi Meccanici: <strong className="text-slate-300 font-mono">{formatCurrency(totaleManutenzione + totaleGomme + totaleAltriInterventi)}</strong></span>
                <span>Scadenze & Tasse: <strong className="text-emerald-400 font-mono">{formatCurrency(totalePagamenti)}</strong></span>
              </div>
            </div>

          </div>

          {/* SEZIONE RAGGRUPPAMENTO PER ANNO: MANUTENZIONE, GOMME, PAGAMENTI, ALTRI INTERVENTI */}
          <div className="p-4 rounded-3xl bg-[#141e2e] border border-slate-800 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-400 uppercase tracking-wider">
                <Calendar size={15} />
                <span>Riepilogo Raggruppato per Anno</span>
              </div>
              <span className="text-[10px] text-slate-400">
                Manutenzione • Gomme • Pagamenti • Altri
              </span>
            </div>

            <div className="space-y-3">
              {yearlyBreakdowns.map((yb) => (
                <div
                  key={yb.year}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    selectedYear === yb.year
                      ? 'bg-[#18263a] border-blue-500 shadow-lg'
                      : 'bg-[#0f1726] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black font-mono bg-blue-950/80 text-blue-300 px-2 py-0.5 rounded-lg border border-blue-800">
                        Anno {yb.year}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {yb.recordsCount} {yb.recordsCount === 1 ? 'registrazione' : 'registrazioni'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Totale Anno:</span>
                      <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">
                        {formatCurrency(yb.totale)}
                      </span>
                    </div>
                  </div>

                  {/* 4 Categorie per l'anno: Manutenzione, Gomme, Pagamenti, Altri Interventi */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 text-xs">
                    {/* 1. Manutenzione */}
                    <div className="p-2.5 rounded-xl bg-[#141e2e] border border-orange-500/30 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-orange-400 font-bold text-[10px] uppercase">
                        <Wrench size={12} />
                        <span>Manutenzione</span>
                      </div>
                      <div className="mt-1">
                        <div className="text-xs sm:text-sm font-black text-white font-mono">
                          {formatCurrency(yb.manutenzione.cost)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {yb.manutenzione.count} {yb.manutenzione.count === 1 ? 'intervento' : 'interventi'}
                        </span>
                      </div>
                    </div>

                    {/* 2. Gomme */}
                    <div className="p-2.5 rounded-xl bg-[#141e2e] border border-cyan-500/30 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[10px] uppercase">
                        <Disc size={12} />
                        <span>Gomme</span>
                      </div>
                      <div className="mt-1">
                        <div className="text-xs sm:text-sm font-black text-white font-mono">
                          {formatCurrency(yb.gomme.cost)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {yb.gomme.count} {yb.gomme.count === 1 ? 'intervento' : 'interventi'}
                        </span>
                      </div>
                    </div>

                    {/* 3. Pagamenti Scadenze */}
                    <div className="p-2.5 rounded-xl bg-[#141e2e] border border-emerald-500/30 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] uppercase">
                        <CreditCard size={12} />
                        <span>Pagamenti</span>
                      </div>
                      <div className="mt-1">
                        <div className="text-xs sm:text-sm font-black text-white font-mono">
                          {formatCurrency(yb.pagamenti.cost)}
                        </div>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {yb.pagamenti.count} pag. ({yb.pagamenti.pagatiCount} saldati{yb.pagamenti.inAttesaCount > 0 ? `, ${yb.pagamenti.inAttesaCount} in attesa` : ''})
                        </span>
                      </div>
                    </div>

                    {/* 4. Altri Interventi */}
                    <div className="p-2.5 rounded-xl bg-[#141e2e] border border-purple-500/30 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-purple-400 font-bold text-[10px] uppercase">
                        <FileEdit size={12} />
                        <span>Altri</span>
                      </div>
                      <div className="mt-1">
                        <div className="text-xs sm:text-sm font-black text-white font-mono">
                          {formatCurrency(yb.altri.cost)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {yb.altri.count} {yb.altri.count === 1 ? 'intervento' : 'interventi'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Buttons for New Records */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <button
              onClick={onOpenNewRecord}
              className="p-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-md cursor-pointer transition-all"
            >
              <Wrench size={16} />
              <span>+ Manutenzione</span>
            </button>

            <button
              onClick={onOpenRegistroGomme || onOpenNewRecord}
              className="p-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-md cursor-pointer transition-all"
            >
              <Disc size={16} />
              <span>+ Gomme</span>
            </button>

            <button
              onClick={onOpenAltriInterventi || onOpenNewRecord}
              className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-md cursor-pointer transition-all"
            >
              <FileEdit size={16} />
              <span>+ Altri</span>
            </button>

            <button
              onClick={() => (onOpenRegistroPagamenti ? onOpenRegistroPagamenti('Bollo') : onOpenNewRecord())}
              className="p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-md cursor-pointer transition-all"
            >
              <CreditCard size={16} />
              <span>+ Scadenze</span>
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-slate-400">
          Nessun veicolo attivo. Aggiungine uno dal menu Garage.
        </div>
      )}
    </div>
  );
};
