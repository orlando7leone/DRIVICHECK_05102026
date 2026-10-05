import React, { useState, useMemo } from 'react';
import { Veicolo, InterventoRecord, TipoPagamentoScadenza } from '../types';
import { formatCurrency, formatDateIt, formatDateTimeIt, getEffectiveUpcomingDeadline } from '../services/storageService';
import { downloadFleetExcelFile } from '../services/excelService';
import {
  X,
  Printer,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Car,
  Wrench,
  CreditCard,
  Calendar,
  FileText,
  DollarSign,
  Download,
  Sliders,
  CheckCircle2,
  ChevronRight,
  Eye,
  Info,
  User,
  ArrowUpDown,
  Clock,
  AlertTriangle,
  RotateCcw,
  Smartphone,
  Monitor,
  Layout,
} from 'lucide-react';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  veicoli: Veicolo[];
  record: InterventoRecord[];
  defaultSelectedVehicleId?: string;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  veicoli,
  record,
  defaultSelectedVehicleId,
}) => {
  // Selezione veicoli da stampare
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>(() => {
    if (defaultSelectedVehicleId && veicoli.some((v) => v.id === defaultSelectedVehicleId)) {
      return [defaultSelectedVehicleId];
    }
    return veicoli.length > 0 ? [veicoli[0].id] : [];
  });

  // Sezioni da includere nella stampa (spuntabili dal menu)
  const [includeVehicleData, setIncludeVehicleData] = useState<boolean>(true);
  const [includeLavorazioni, setIncludeLavorazioni] = useState<boolean>(true);
  const [includePagamentiSaldati, setIncludePagamentiSaldati] = useState<boolean>(true);
  const [includePagamentiDaSaldare, setIncludePagamentiDaSaldare] = useState<boolean>(true);
  const [includeSummary, setIncludeSummary] = useState<boolean>(true);

  // Orientamento Stampa: Verticale (Portrait) o Orizzontale (Landscape)
  const [pageOrientation, setPageOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Ordinamento per data degli interventi (unifica manutenzioni, gomme, altri interventi in sequenza cronologica)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Filtro periodo
  const [periodFilter, setPeriodFilter] = useState<'all' | 'current_year' | 'last_year' | 'last_12_months'>('all');

  const selectedVehicles = useMemo(() => {
    const setIds = new Set(selectedVehicleIds);
    return veicoli.filter((v) => setIds.has(v.id));
  }, [veicoli, selectedVehicleIds]);

  const currentVehicle = veicoli.find((v) => v.id === defaultSelectedVehicleId) || veicoli[0];

  // Gestione selezione rapida
  const handleSelectCurrentOnly = () => {
    if (currentVehicle) {
      setSelectedVehicleIds([currentVehicle.id]);
    }
  };

  const handleSelectAll = () => {
    setSelectedVehicleIds(veicoli.map((v) => v.id));
  };

  const toggleVehicle = (id: string) => {
    setSelectedVehicleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Filtraggio e ordinamento record per veicolo e periodo
  const getFilteredRecordsForVehicle = (vehicleId: string) => {
    let list = record.filter((r) => r.veicoloId === vehicleId);

    const now = new Date();
    const currentYear = now.getFullYear();

    if (periodFilter === 'current_year') {
      list = list.filter((r) => {
        const d = new Date(r.data);
        return d.getFullYear() === currentYear;
      });
    } else if (periodFilter === 'last_year') {
      list = list.filter((r) => {
        const d = new Date(r.data);
        return d.getFullYear() === currentYear - 1;
      });
    } else if (periodFilter === 'last_12_months') {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      list = list.filter((r) => new Date(r.data) >= oneYearAgo);
    }

    // Ordinamento per data (crescente o decrescente)
    list.sort((a, b) => {
      const tA = new Date(a.data).getTime() || 0;
      const tB = new Date(b.data).getTime() || 0;
      return sortOrder === 'desc' ? tB - tA : tA - tB;
    });

    return list;
  };

  // Esecuzione stampa e generazione PDF affidabile
  const handlePrint = () => {
    const oldFrame = document.getElementById('drivercheck-print-iframe');
    if (oldFrame) {
      oldFrame.remove();
    }
    setTimeout(() => {
      window.print();
    }, 50);
  };

  // Esportazione rapida in Excel multi-foglio
  const handleExportExcel = () => {
    if (selectedVehicles.length === 0) return;
    const setIds = new Set(selectedVehicleIds);
    const recordsToExport = record.filter((r) => setIds.has(r.veicoloId));
    downloadFleetExcelFile(selectedVehicles, recordsToExport);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* STILI PER STAMPA A4 PROFESSIONALE & SALVATAGGIO PDF (Supporta sia Verticale che Orizzontale) */}
      <style>{`
        @media print {
          @page {
            size: A4 ${pageOrientation};
            margin: ${pageOrientation === 'landscape' ? '8mm 10mm' : '10mm 12mm'};
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-sizing: border-box !important;
          }

          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          }

          /* Nasconde barre, navigazioni, bottoni e header dell'app durante la stampa */
          header, nav, footer, button, .no-print, [role="navigation"] {
            display: none !important;
          }

          /* Resetta tutti i contenitori genitori */
          #root,
          .min-h-screen,
          .print-modal-backdrop,
          .print-modal-content,
          .print-grid-layout,
          .print-preview-column {
            display: block !important;
            position: static !important;
            inset: auto !important;
            background: #ffffff !important;
            color: #0f172a !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
          }

          /* Documento di Stampa Principale: sempre visibile, testo scuro ad alto contrasto */
          #print-document-root {
            display: block !important;
            visibility: visible !important;
            background: #ffffff !important;
            color: #0f172a !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            font-size: ${pageOrientation === 'landscape' ? '9.5pt' : '10pt'} !important;
            line-height: 1.35 !important;
          }

          #print-document-root * {
            visibility: visible !important;
            color: inherit;
          }

          /* Tabelle e bordi nitidi */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }

          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }

          th, td {
            border-color: #cbd5e1 !important;
          }

          /* Interruzioni di pagina ordinate per ogni auto */
          .print-page-break {
            page-break-before: always !important;
            break-before: page !important;
            margin-top: 15mm !important;
            padding-top: 10mm !important;
            border-top: 2px dashed #94a3b8 !important;
          }
        }
      `}</style>

      {/* MODALE A SCHERMO */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in print-modal-backdrop">
        <div className="w-full max-w-6xl max-h-[96vh] flex flex-col bg-[#111827] text-white rounded-3xl border border-slate-800 shadow-2xl overflow-hidden print-modal-content">
          
          {/* Header Modale */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-emerald-700 px-5 py-3.5 flex items-center justify-between shadow-md shrink-0 no-print">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white">
                <Printer size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                  <span>Stampa & Report Personalizzato Parco Auto</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-white font-bold">
                    {selectedVehicles.length} {selectedVehicles.length === 1 ? 'veicolo' : 'veicoli'}
                  </span>
                </h2>
                <p className="text-[11px] text-blue-100">
                  Configura sezioni, ordinamento per data, orientamento Verticale/Orizzontale e salva in PDF
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Corpo Modale: Controlli a sinistra, Anteprima a destra */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 print-grid-layout">
            
            {/* PANNELLO DI CONFIGURAZIONE (5 colonne su desktop) */}
            <div className="lg:col-span-5 p-4 space-y-3.5 overflow-y-auto max-h-[60vh] lg:max-h-[80vh] no-print">
              
              {/* 1. SELEZIONE MACCHINE */}
              <div className="p-3.5 rounded-2xl bg-[#0b111c] border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Car size={14} className="text-blue-400" />
                    <span>Quali auto stampare:</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleSelectCurrentOnly}
                      className="px-2 py-0.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 text-[10px] font-semibold border border-blue-700/50 cursor-pointer"
                    >
                      Attuale
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700 cursor-pointer"
                    >
                      Tutte ({veicoli.length})
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {veicoli.map((v) => {
                    const isChecked = selectedVehicleIds.includes(v.id);
                    return (
                      <div
                        key={v.id}
                        onClick={() => toggleVehicle(v.id)}
                        className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-colors text-xs ${
                          isChecked
                            ? 'bg-blue-950/40 border-blue-600/70 text-white'
                            : 'bg-[#101726] border-slate-800/80 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="text-blue-400 shrink-0">
                            {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                          </div>
                          <span className="font-mono font-bold text-white px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-[11px] shrink-0">
                            {v.targa}
                          </span>
                          <div className="min-w-0 truncate">
                            <span className="font-medium text-slate-200">
                              {v.marca} {v.modello}
                            </span>
                            {v.proprietario && (
                              <span className="text-[10px] text-slate-400 block truncate flex items-center gap-1">
                                <User size={10} className="text-slate-500 inline shrink-0" />
                                {v.proprietario}
                              </span>
                            )}
                          </div>
                        </div>
                        {v.id === defaultSelectedVehicleId && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 shrink-0">
                            Attiva
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. ORIENTAMENTO PAGINA: VERTICALE / ORIZZONTALE (PUNTO 7) */}
              <div className="p-3.5 rounded-2xl bg-[#0b111c] border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 pb-1 border-b border-slate-800">
                  <Layout size={14} className="text-cyan-400" />
                  <span>Orientamento di Stampa / Salvataggio PDF:</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPageOrientation('portrait')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      pageOrientation === 'portrait'
                        ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-950'
                        : 'bg-[#101726] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone size={16} className="rotate-0" />
                    <span>Verticale (Portrait)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageOrientation('landscape')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      pageOrientation === 'landscape'
                        ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-950'
                        : 'bg-[#101726] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Monitor size={16} />
                    <span>Orizzontale (Landscape)</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  {pageOrientation === 'portrait'
                    ? 'Ottimale per fogli verticali standard A4 da conservare.'
                    : 'Ottimale per tabelle larghe con molte colonne di interventi e pagamenti.'}
                </p>
              </div>

              {/* 3. ORDINAMENTO PER DATA DEGLI INTERVENTI (PUNTO 3) */}
              <div className="p-3.5 rounded-2xl bg-[#0b111c] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ArrowUpDown size={14} className="text-indigo-400" />
                    <span>Ordinamento Interventi per Data:</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSortOrder('desc')}
                    className={`py-1.5 px-2 rounded-xl font-bold border cursor-pointer transition-colors ${
                      sortOrder === 'desc'
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                        : 'bg-[#101726] text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    Dal più Recente (Decrescente)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortOrder('asc')}
                    className={`py-1.5 px-2 rounded-xl font-bold border cursor-pointer transition-colors ${
                      sortOrder === 'asc'
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                        : 'bg-[#101726] text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    Dal più Vecchio (Crescente)
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Unifica manutenzioni, gomme e altri interventi in una sequenza temporale ordinata.
                </p>
              </div>

              {/* 4. COSA STAMPARE (MENU OPZIONI SPUNTABILI - PUNTI 2, 3, 4, 5) */}
              <div className="p-3.5 rounded-2xl bg-[#0b111c] border border-slate-800 space-y-2.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 pb-1 border-b border-slate-800">
                  <Sliders size={14} className="text-emerald-400" />
                  <span>Scegli cosa includere nel documento:</span>
                </span>

                <div className="space-y-2 text-xs">
                  {/* Opzione 1: Dati della macchina e PROPRIETARIO */}
                  <label className="flex items-center justify-between p-2 rounded-xl bg-[#101726] border border-slate-800/80 hover:border-slate-700 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Car size={13} />
                      </div>
                      <div>
                        <span className="font-bold text-white block">1. Dati Macchina & Proprietario</span>
                        <span className="text-[10px] text-slate-400 block">
                          Targa, Marca, Modello, Proprietario, Contatti, KM, Gomme, Pressioni
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeVehicleData}
                      onChange={(e) => setIncludeVehicleData(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer shrink-0"
                    />
                  </label>

                  {/* Opzione 2: Storico Lavorazioni ordinate per data */}
                  <label className="flex items-center justify-between p-2 rounded-xl bg-[#101726] border border-slate-800/80 hover:border-slate-700 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                        <Wrench size={13} />
                      </div>
                      <div>
                        <span className="font-bold text-white block">2. Storico Lavorazioni per Data</span>
                        <span className="text-[10px] text-slate-400 block">
                          Tagliandi, Gomme, Riparazioni, Officine, Costi e Stato Saldo/Acconti
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeLavorazioni}
                      onChange={(e) => setIncludeLavorazioni(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-500 accent-blue-500 cursor-pointer shrink-0"
                    />
                  </label>

                  {/* Opzione 3: Pagamenti SALDATI */}
                  <label className="flex items-center justify-between p-2 rounded-xl bg-[#101726] border border-slate-800/80 hover:border-slate-700 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={13} />
                      </div>
                      <div>
                        <span className="font-bold text-white block">3. Pagamenti SALDATI</span>
                        <span className="text-[10px] text-slate-400 block">
                          Ricevute e scadenze già pagate (Bolli saldati, Revisioni saldate, RCA)
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={includePagamentiSaldati}
                      onChange={(e) => setIncludePagamentiSaldati(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer shrink-0"
                    />
                  </label>

                  {/* Opzione 4: Pagamenti DA SALDARE */}
                  <label className="flex items-center justify-between p-2 rounded-xl bg-[#101726] border border-slate-800/80 hover:border-slate-700 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                        <AlertTriangle size={13} />
                      </div>
                      <div>
                        <span className="font-bold text-white block">4. Pagamenti DA SALDARE</span>
                        <span className="text-[10px] text-slate-400 block">
                          Scadenze imminenti da pagare e saldi interventi da corrispondere
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={includePagamentiDaSaldare}
                      onChange={(e) => setIncludePagamentiDaSaldare(e.target.checked)}
                      className="w-4 h-4 rounded text-orange-500 accent-orange-500 cursor-pointer shrink-0"
                    />
                  </label>

                  {/* Opzione 5: Totali e Riepilogo Finanziario */}
                  <label className="flex items-center justify-between p-2 rounded-xl bg-[#101726] border border-slate-800/80 hover:border-slate-700 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                        <DollarSign size={13} />
                      </div>
                      <div>
                        <span className="font-bold text-white block">5. Riepilogo Finanziario & Totali</span>
                        <span className="text-[10px] text-slate-400 block">
                          Totale speso, totale pagato, totale ancora da saldare
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeSummary}
                      onChange={(e) => setIncludeSummary(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-500 accent-purple-500 cursor-pointer shrink-0"
                    />
                  </label>
                </div>
              </div>

              {/* 5. FILTRO TEMPORALE */}
              <div className="p-3.5 rounded-2xl bg-[#0b111c] border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Calendar size={14} className="text-teal-400" />
                  <span>Periodo da includere:</span>
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPeriodFilter('all')}
                    className={`py-1.5 px-2 rounded-xl font-semibold border cursor-pointer ${
                      periodFilter === 'all'
                        ? 'bg-teal-600 text-white border-teal-500'
                        : 'bg-[#101726] text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    Tutto lo storico
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodFilter('current_year')}
                    className={`py-1.5 px-2 rounded-xl font-semibold border cursor-pointer ${
                      periodFilter === 'current_year'
                        ? 'bg-teal-600 text-white border-teal-500'
                        : 'bg-[#101726] text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    Anno {new Date().getFullYear()}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodFilter('last_12_months')}
                    className={`py-1.5 px-2 rounded-xl font-semibold border cursor-pointer ${
                      periodFilter === 'last_12_months'
                        ? 'bg-teal-600 text-white border-teal-500'
                        : 'bg-[#101726] text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    Ultimi 12 mesi
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodFilter('last_year')}
                    className={`py-1.5 px-2 rounded-xl font-semibold border cursor-pointer ${
                      periodFilter === 'last_year'
                        ? 'bg-teal-600 text-white border-teal-500'
                        : 'bg-[#101726] text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    Anno {new Date().getFullYear() - 1}
                  </button>
                </div>
              </div>

              {/* PULSANTI AZIONE PRINCIPALI */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={selectedVehicles.length === 0}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-950/60 cursor-pointer disabled:opacity-40 transition-all"
                >
                  <Printer size={18} />
                  <span>Stampa / Salva in PDF ({pageOrientation === 'landscape' ? 'Orizzontale' : 'Verticale'})</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={selectedVehicles.length === 0}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-emerald-950/40 text-emerald-300 hover:text-emerald-200 border border-emerald-600/40 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <FileSpreadsheet size={15} />
                  <span>Esporta anche in Excel Multi-Foglio (.xlsx)</span>
                </button>
              </div>

            </div>

            {/* PANNELLO ANTEPRIMA DOCUMENTO STAMPABILE (7 colonne su desktop) */}
            <div className="lg:col-span-7 p-4 bg-[#0a0f18] flex flex-col overflow-y-auto max-h-[60vh] lg:max-h-[80vh] print-preview-column">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 no-print">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Eye size={15} className="text-blue-400" />
                  <span>Anteprima Documento A4 ({pageOrientation === 'landscape' ? 'Orizzontale / Landscape' : 'Verticale / Portrait'})</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Pronto per stampa carta e download PDF
                </span>
              </div>

              {/* FOGLIO BIANCO ANTEPRIMA (Stile carta A4) */}
              <div
                id="print-document-root"
                className={`bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 font-sans border border-slate-200 text-xs leading-normal select-text transition-all ${
                  pageOrientation === 'landscape' ? 'w-full' : 'max-w-2xl mx-auto w-full'
                }`}
              >
                {/* Intestazione Aziendale Report */}
                <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900">
                      DRIVERCHECK
                    </h1>
                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Report Scheda Veicolo & Gestione Manutenzioni
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-slate-500 font-mono">
                    <div>Data stampa: {formatDateTimeIt(new Date().toISOString())}</div>
                    <div>Veicoli inclusi: {selectedVehicles.length}</div>
                    <div>Orientamento: {pageOrientation === 'landscape' ? 'Orizzontale' : 'Verticale'}</div>
                  </div>
                </div>

                {selectedVehicles.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    Seleziona almeno un veicolo per generare l'anteprima di stampa.
                  </div>
                ) : (
                  selectedVehicles.map((v, vIndex) => {
                    const vRecords = getFilteredRecordsForVehicle(v.id);

                    // 2. Pagamenti SALDATI (quelli effettivamente saldati con check pagato/saldato)
                    const pagamentiSaldatiList = vRecords.filter(
                      (r) => (r.tipo === 'Pagamento Scadenza' || !!r.registroPagamento) && r.registroPagamento?.pagato === true
                    );

                    // 1. Storico Lavorazioni & Manutenzioni (unificato per data: tagliandi, gomme, riparazioni, altri interventi)
                    const lavorazioniList = vRecords.filter((r) => {
                      if (r.tipo === 'Pagamento Scadenza' || !!r.registroPagamento) return false;
                      const titleLow = (r.titolo || '').toLowerCase();
                      // Evita rigorosamente doppioni: le revisioni appartengono alla sezione Scadenze e Pagamenti
                      const isRev =
                        (r.tipo as string) === 'Revisione' ||
                        titleLow.includes('revision') ||
                        (r.lavorazioniSelezionate || []).some((l) =>
                          (l.nome || '').toLowerCase().includes('revision')
                        );
                      if (isRev) {
                        return false;
                      }
                      return true;
                    });

                    // 3. Pagamenti DA SALDARE (scadenze in attesa + saldi interventi residui da pagare)
                    interface ItemDaSaldare {
                      id: string;
                      dataScadenza: string;
                      titolo: string;
                      tipo: string;
                      dettaglio: string;
                      stato: string;
                      importo: number;
                    }

                    const pagamentiDaSaldareList: ItemDaSaldare[] = [];
                    const todayIso = new Date().toISOString().slice(0, 10);
                    const seenTypesInDaSaldare = new Set<string>();

                    // A) Le 3 scadenze periodiche del veicolo (Bollo, Revisione, Assicurazione)
                    const scadenzeTipi: TipoPagamentoScadenza[] = ['Bollo', 'Revisione', 'Assicurazione'];
                    scadenzeTipi.forEach((tipo) => {
                      const eff = getEffectiveUpcomingDeadline(v, tipo, record);
                      // Verifica se la scadenza calcolata è già stata saldata nello storico
                      const isAlreadyPaid = pagamentiSaldatiList.some(
                        (p) =>
                          p.registroPagamento?.tipoPagamento === tipo &&
                          p.registroPagamento?.dataScadenza === eff.dataScadenza &&
                          p.registroPagamento?.pagato === true
                      );

                      // Risolvi la data di scadenza (assicura che il Bollo sia SEMPRE presente leggendo da eff o dal veicolo)
                      const targetScadenza =
                        eff.dataScadenza ||
                        (tipo === 'Bollo'
                          ? v.scadenzaBollo || '2026-12-31'
                          : tipo === 'Revisione'
                          ? v.scadenzaRevisione
                          : v.scadenzaAssicurazione);

                      if (!isAlreadyPaid && targetScadenza) {
                        seenTypesInDaSaldare.add(tipo);
                        const defaultTitle =
                          tipo === 'Bollo'
                            ? 'Bollo Auto (Tassa Automobilistica)'
                            : tipo === 'Revisione'
                            ? 'Revisione Ministeriale MCTC'
                            : 'Polizza RCA / Assicurazione';

                        const detailParts = [
                          eff.enteOCompagnia ||
                            (tipo === 'Bollo'
                              ? 'ACI / Regione'
                              : tipo === 'Revisione'
                              ? v.officina || 'Centro MCTC Autorizzato'
                              : v.compagniaAssicurazione || ''),
                          eff.numeroPolizza ? `Polizza: ${eff.numeroPolizza}` : '',
                          tipo === 'Bollo' && (eff.pagabileEntro || v.pagabileEntroBollo)
                            ? `Pagabile entro: ${eff.pagabileEntro || v.pagabileEntroBollo}`
                            : '',
                          tipo === 'Revisione' && (eff.frequenza || v.frequenzaRevisione)
                            ? eff.frequenza || v.frequenzaRevisione
                            : '',
                        ].filter(Boolean);

                        const targetImporto =
                          eff.importo > 0
                            ? eff.importo
                            : tipo === 'Bollo'
                            ? v.importoBollo || 0
                            : tipo === 'Revisione'
                            ? 79.02
                            : v.importoAssicurazione || 0;

                        pagamentiDaSaldareList.push({
                          id: `scadenza-${tipo.toLowerCase()}-${v.id}`,
                          dataScadenza: targetScadenza,
                          titolo: eff.existingPendingRecord?.titolo || defaultTitle,
                          tipo: tipo,
                          dettaglio: detailParts.join(' • ') || 'In attesa di versamento',
                          stato: 'In attesa',
                          importo: targetImporto,
                        });
                      }
                    });

                    // B) Eventuali altri record di pagamento pendenti (evita RIGOROSAMENTE doppioni di Revisione, Bollo o RCA)
                    vRecords
                      .filter(
                        (r) =>
                          (r.tipo === 'Pagamento Scadenza' || !!r.registroPagamento) &&
                          r.registroPagamento?.pagato === false
                      )
                      .forEach((r) => {
                        const reg = r.registroPagamento;
                        const t = reg?.tipoPagamento;
                        const titleLower = (r.titolo || '').toLowerCase();

                        // Se la tipologia è già stata inserita al punto A, salta per evitare duplicati
                        if (t && seenTypesInDaSaldare.has(t)) return;
                        if (titleLower.includes('revision') && seenTypesInDaSaldare.has('Revisione')) return;
                        if (titleLower.includes('bollo') && seenTypesInDaSaldare.has('Bollo')) return;
                        if (
                          (titleLower.includes('assicura') || titleLower.includes('rca')) &&
                          seenTypesInDaSaldare.has('Assicurazione')
                        )
                          return;

                        if (t) seenTypesInDaSaldare.add(t);
                        else if (titleLower.includes('revision')) seenTypesInDaSaldare.add('Revisione');
                        else if (titleLower.includes('bollo')) seenTypesInDaSaldare.add('Bollo');

                        const scad = reg?.dataScadenza || r.data;
                        if (!pagamentiDaSaldareList.some((x) => x.id === r.id)) {
                          pagamentiDaSaldareList.push({
                            id: r.id,
                            dataScadenza: scad,
                            titolo: reg?.tipoPagamento || r.titolo,
                            tipo: reg?.tipoPagamento || 'Scadenza',
                            dettaglio: reg?.enteOCompagnia || r.note || 'In attesa di pagamento',
                            stato: 'In attesa',
                            importo: reg?.importo || r.costo || 0,
                          });
                        }
                      });

                    // C) Interventi con saldo rimanente (statoPagamento parziale o da_pagare)
                    vRecords
                      .filter((r) => r.tipo !== 'Pagamento Scadenza' && (r.statoPagamento === 'parziale' || r.statoPagamento === 'da_pagare'))
                      .forEach((r) => {
                        const daPagare = r.saldoRimanente !== undefined ? r.saldoRimanente : r.costo;
                        if (daPagare > 0) {
                          pagamentiDaSaldareList.push({
                            id: `saldo-${r.id}`,
                            dataScadenza: r.data,
                            titolo: `Saldo Intervento: ${r.titolo}`,
                            tipo: r.tipo,
                            dettaglio: r.officina ? `Officina: ${r.officina}` : (r.acconti?.length ? `${r.acconti.length} acconti versati` : 'Da saldare'),
                            stato: r.statoPagamento === 'parziale' ? 'Acconto versato' : 'Da saldare',
                            importo: daPagare,
                          });
                        }
                      });

                    // Ordina la lista da saldare per data di scadenza
                    pagamentiDaSaldareList.sort((a, b) => new Date(a.dataScadenza).getTime() - new Date(b.dataScadenza).getTime());

                    // Calcolo totali finanziari
                    const totalCostLav = lavorazioniList.reduce((sum, r) => sum + (r.costo || 0), 0);
                    const totalCostPagSaldati = pagamentiSaldatiList.reduce((sum, r) => sum + (r.costo || 0), 0);
                    const totalCostDaSaldare = pagamentiDaSaldareList.reduce((sum, item) => sum + (item.importo || 0), 0);
                    const totalCostAllSpeso = totalCostLav + totalCostPagSaldati;

                    return (
                      <div
                        key={v.id}
                        className={`space-y-5 ${vIndex > 0 ? 'pt-8 border-t-2 border-dashed border-slate-300 print-page-break' : ''}`}
                      >
                        {/* 1. SEZIONE DATI VEICOLO & PROPRIETARIO (PUNTO 2) */}
                        {includeVehicleData && (
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between bg-emerald-50 border border-emerald-300 p-2.5 rounded-lg gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="bg-slate-900 text-white font-mono font-black text-sm px-2.5 py-1 rounded">
                                  {v.targa}
                                </span>
                                <span className="font-bold text-base text-slate-900">
                                  {v.marca} {v.modello}
                                </span>
                                {(v.annoAcquisto || (v as any).anno) && (
                                  <span className="text-slate-600 font-medium">({v.annoAcquisto || (v as any).anno})</span>
                                )}
                                {v.proprietario && (
                                  <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                                    <User size={12} className="inline text-emerald-700" />
                                    Proprietario: {v.proprietario}
                                  </span>
                                )}
                              </div>
                              <div className="text-right font-mono font-bold text-slate-800 text-xs">
                                KM Attuali: {v.kmAttuali ? Number(v.kmAttuali).toLocaleString('it-IT') : 0} km
                              </div>
                            </div>

                            {/* Griglia Dati Tecnici & Anagrafica Proprietario */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] bg-slate-50 p-3 rounded-lg border border-slate-200">
                              <div>
                                <span className="text-slate-500 block uppercase font-bold text-[9px]">Nome Proprietario</span>
                                <span className="font-bold text-slate-900">{v.proprietario || 'N/D'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block uppercase font-bold text-[9px]">Cellulare Proprietario</span>
                                <span className="font-semibold text-slate-800">{v.cellulare || 'N/D'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block uppercase font-bold text-[9px]">Residenza / Indirizzo</span>
                                <span className="font-semibold text-slate-800">
                                  {[v.residenteIn, v.viaCorsoPiazza].filter(Boolean).join(' - ') || 'N/D'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block uppercase font-bold text-[9px]">Alimentazione / Cilindrata</span>
                                <span className="font-semibold text-slate-800">
                                  {v.alimentazione || 'N/D'} {v.cilindrata ? `(${v.cilindrata} cc)` : ''}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block uppercase font-bold text-[9px]">Dimensioni Pneumatici</span>
                                <span className="font-semibold text-slate-800">{v.dimensioniGomme || 'N/D'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block uppercase font-bold text-[9px]">Pressione (Ant / Post)</span>
                                <span className="font-semibold text-slate-800">
                                  {v.pressioneAnteriore || '-'} / {v.pressionePosteriore || '-'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block uppercase font-bold text-[9px]">Scadenza Bollo</span>
                                <span className="font-semibold text-slate-800">
                                  {v.scadenzaBollo ? formatDateIt(v.scadenzaBollo) : 'N/D'} {v.importoBollo ? `(${formatCurrency(v.importoBollo)})` : ''}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block uppercase font-bold text-[9px]">Scadenza Revisione</span>
                                <span className="font-semibold text-slate-800">
                                  {v.scadenzaRevisione ? formatDateIt(v.scadenzaRevisione) : 'N/D'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block uppercase font-bold text-[9px]">Scadenza Assicurazione</span>
                                <span className="font-semibold text-slate-800">
                                  {v.scadenzaAssicurazione ? formatDateIt(v.scadenzaAssicurazione) : 'N/D'} {v.importoAssicurazione ? `(${formatCurrency(v.importoAssicurazione)})` : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 2. SEZIONE STORICO LAVORAZIONI & MANUTENZIONI ORDINATE PER DATA (PUNTO 3) */}
                        {includeLavorazioni && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between pb-1 border-b border-blue-400">
                              <h3 className="font-bold text-xs uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                                <span>Storico Interventi & Manutenzioni (Ordinati per Data: {sortOrder === 'desc' ? 'Decrescente' : 'Crescente'})</span>
                                <span className="text-[10px] font-mono text-slate-500 font-normal">
                                  ({lavorazioniList.length} interventi registrati)
                                </span>
                              </h3>
                              <span className="text-[10px] font-bold text-slate-700">
                                Totale Interventi: {formatCurrency(totalCostLav)}
                              </span>
                            </div>

                            {lavorazioniList.length === 0 ? (
                              <div className="p-3 text-center text-slate-400 italic text-[11px] bg-slate-50 rounded border border-slate-200">
                                Nessun intervento registrato nel periodo selezionato.
                              </div>
                            ) : (
                              <table className="w-full text-left text-[10px] border-collapse">
                                <thead>
                                  <tr className="bg-blue-50/80 border-y border-blue-200 text-blue-950 font-bold">
                                    <th className="py-1 px-1.5 w-20">Data</th>
                                    <th className="py-1 px-1.5 w-16">KM</th>
                                    <th className="py-1 px-1.5 w-24">Tipologia</th>
                                    <th className="py-1 px-1.5">Lavorazioni Eseguite / Dettagli</th>
                                    <th className="py-1 px-1.5 w-24">Officina</th>
                                    <th className="py-1 px-1.5 w-24 text-center">Stato Saldo</th>
                                    <th className="py-1 px-1.5 w-18 text-right">Importo</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {lavorazioniList.map((r) => {
                                    const totAcconti = (r.acconti || []).reduce((sum, a) => sum + (Number(a.importo) || 0), 0);
                                    return (
                                      <tr key={r.id} className="hover:bg-slate-50">
                                        <td className="py-1 px-1.5 font-mono font-semibold">{formatDateIt(r.data)}</td>
                                        <td className="py-1 px-1.5 font-mono">{r.km ? Number(r.km).toLocaleString('it-IT') : '-'}</td>
                                        <td className="py-1 px-1.5 font-bold text-blue-900">
                                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 text-[9px] font-bold">
                                            {r.tipo}
                                          </span>
                                        </td>
                                        <td className="py-1 px-1.5 text-slate-700">
                                          <div className="font-semibold text-slate-900">{r.titolo}</div>
                                          <div className="text-[9px] text-slate-500">
                                            {(r.lavorazioniSelezionate || []).map((l) => l.nome).join(', ') || r.descrizione || r.note || '-'}
                                          </div>
                                        </td>
                                        <td className="py-1 px-1.5 text-slate-600">{r.officina || '-'}</td>
                                        <td className="py-1 px-1.5 text-center">
                                          {r.statoPagamento === 'parziale' ? (
                                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold block">
                                              Acconto {formatCurrency(totAcconti)} (Saldo: {formatCurrency(r.saldoRimanente || 0)})
                                            </span>
                                          ) : r.statoPagamento === 'da_pagare' ? (
                                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300 text-[9px] font-bold block">
                                              Da Saldare
                                            </span>
                                          ) : (
                                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9px] font-bold block">
                                              Saldato
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-1 px-1.5 text-right font-mono font-bold text-slate-900">
                                          {formatCurrency(r.costo || 0)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}

                        {/* 3. SEZIONE PAGAMENTI SALDATI (PUNTO 4) */}
                        {includePagamentiSaldati && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between pb-1 border-b border-emerald-500">
                              <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                                <CheckCircle2 size={13} className="text-emerald-600" />
                                <span>Pagamenti SALDATI (Bollo, Revisione, RCA, Ricevute)</span>
                                <span className="text-[10px] font-mono text-slate-500 font-normal">
                                  ({pagamentiSaldatiList.length} pagamenti saldati)
                                </span>
                              </h3>
                              <span className="text-[10px] font-bold text-slate-700">
                                Totale Saldato: {formatCurrency(totalCostPagSaldati)}
                              </span>
                            </div>

                            {pagamentiSaldatiList.length === 0 ? (
                              <div className="p-3 text-center text-slate-400 italic text-[11px] bg-slate-50 rounded border border-slate-200">
                                Nessun pagamento saldato registrato nel periodo selezionato.
                              </div>
                            ) : (
                              <table className="w-full text-left text-[10px] border-collapse">
                                <thead>
                                  <tr className="bg-emerald-50 border-y border-emerald-200 text-emerald-950 font-bold">
                                    <th className="py-1 px-1.5 w-20">Data Pagam.</th>
                                    <th className="py-1 px-1.5 w-16">KM</th>
                                    <th className="py-1 px-1.5 w-28">Tipo Scadenza</th>
                                    <th className="py-1 px-1.5">Ente / Compagnia / Polizza / Note</th>
                                    <th className="py-1 px-1.5 w-28">Prossima Scadenza</th>
                                    <th className="py-1 px-1.5 w-20 text-center">Stato</th>
                                    <th className="py-1 px-1.5 w-18 text-right">Importo</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {pagamentiSaldatiList.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-50">
                                      <td className="py-1 px-1.5 font-mono font-semibold">{formatDateIt(r.data)}</td>
                                      <td className="py-1 px-1.5 font-mono">{r.km ? Number(r.km).toLocaleString('it-IT') : '-'}</td>
                                      <td className="py-1 px-1.5 font-bold text-slate-900">
                                        {r.registroPagamento?.tipoPagamento || r.titolo}
                                      </td>
                                      <td className="py-1 px-1.5 text-slate-700">
                                        {[
                                          r.registroPagamento?.enteOCompagnia || r.officina,
                                          r.registroPagamento?.numeroPolizza ? `Polizza: ${r.registroPagamento.numeroPolizza}` : '',
                                          r.note,
                                        ]
                                          .filter(Boolean)
                                          .join(' • ') || '-'}
                                      </td>
                                      <td className="py-1 px-1.5 font-mono text-emerald-800 font-semibold">
                                        {r.registroPagamento?.prossimaScadenza
                                          ? formatDateIt(r.registroPagamento.prossimaScadenza)
                                          : r.dataPromemoria
                                          ? formatDateIt(r.dataPromemoria)
                                          : '-'}
                                      </td>
                                      <td className="py-1 px-1.5 text-center">
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9px] font-bold">
                                          ✓ Saldato
                                        </span>
                                      </td>
                                      <td className="py-1 px-1.5 text-right font-mono font-bold text-slate-900">
                                        {formatCurrency(r.costo || 0)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}

                        {/* 4. SEZIONE PAGAMENTI DA SALDARE (PUNTO 5) */}
                        {includePagamentiDaSaldare && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between pb-1 border-b border-orange-500">
                              <h3 className="font-bold text-xs uppercase tracking-wider text-orange-950 flex items-center gap-1.5">
                                <AlertTriangle size={13} className="text-orange-600" />
                                <span>Pagamenti DA SALDARE / Scadenze Future & Saldi Residui</span>
                                <span className="text-[10px] font-mono text-slate-500 font-normal">
                                  ({pagamentiDaSaldareList.length} voci da saldare)
                                </span>
                              </h3>
                              <span className="text-[10px] font-bold text-orange-900">
                                Totale da Saldare: {formatCurrency(totalCostDaSaldare)}
                              </span>
                            </div>

                            {pagamentiDaSaldareList.length === 0 ? (
                              <div className="p-3 text-center text-emerald-700 italic text-[11px] bg-emerald-50 rounded border border-emerald-200">
                                ✓ Ottimo: nessun pagamento arretrato o scadenza in sospeso da saldare.
                              </div>
                            ) : (
                              <table className="w-full text-left text-[10px] border-collapse">
                                <thead>
                                  <tr className="bg-orange-50 border-y border-orange-200 text-orange-950 font-bold">
                                    <th className="py-1 px-1.5 w-24">Data Scadenza</th>
                                    <th className="py-1 px-1.5 w-28">Tipologia</th>
                                    <th className="py-1 px-1.5">Descrizione / Ente / Dettaglio</th>
                                    <th className="py-1 px-1.5 w-24 text-center">Stato</th>
                                    <th className="py-1 px-1.5 w-24 text-right">Da Saldare</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {pagamentiDaSaldareList.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                      <td className="py-1 px-1.5 font-mono font-semibold text-slate-900">
                                        {formatDateIt(item.dataScadenza)}
                                      </td>
                                      <td className="py-1 px-1.5 font-bold text-orange-900">{item.tipo}</td>
                                      <td className="py-1 px-1.5 text-slate-700">
                                        <div className="font-semibold text-slate-900">{item.titolo}</div>
                                        <div className="text-[9px] text-slate-500">{item.dettaglio}</div>
                                      </td>
                                      <td className="py-1 px-1.5 text-center">
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                            item.stato === 'Scaduto'
                                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                                              : item.stato === 'Acconto versato'
                                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                                              : 'bg-orange-100 text-orange-900 border-orange-300'
                                          }`}
                                        >
                                          {item.stato}
                                        </span>
                                      </td>
                                      <td className="py-1 px-1.5 text-right font-mono font-black text-rose-700">
                                        {formatCurrency(item.importo)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}

                        {/* 5. SEZIONE RIEPILOGO FINANZIARIO */}
                        {includeSummary && (
                          <div className="bg-slate-100 p-3 rounded-lg border border-slate-300 flex flex-wrap items-center justify-between text-[11px] gap-2">
                            <div className="flex flex-wrap items-center gap-3 text-slate-700">
                              <span>
                                <strong>Interventi:</strong> {formatCurrency(totalCostLav)}
                              </span>
                              <span>•</span>
                              <span className="text-emerald-800">
                                <strong>Saldati:</strong> {formatCurrency(totalCostPagSaldati)}
                              </span>
                              <span>•</span>
                              <span className="text-orange-900 font-bold">
                                <strong>Da Saldare:</strong> {formatCurrency(totalCostDaSaldare)}
                              </span>
                            </div>
                            <div className="font-mono text-sm font-black text-slate-900">
                              Totale Complessivo Speso: {formatCurrency(totalCostAllSpeso)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Footer del Documento */}
                <div className="border-t border-slate-200 pt-3 text-center text-[9px] text-slate-400">
                  Documento generato con DriverCheck - Gestione Parco Auto & Manutenzioni
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    </>
  );
};
