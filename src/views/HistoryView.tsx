import React, { useState, useMemo } from 'react';
import { Veicolo, InterventoRecord, TipoRecord, TipoPagamentoScadenza } from '../types';
import {
  formatCurrency,
  formatKm,
  formatDateIt,
  downloadFleetCalendarIcs,
  computeBolloPagabileEntro,
  getEffectiveUpcomingDeadline,
} from '../services/storageService';
import {
  Wrench,
  Fuel,
  Hammer,
  MoreHorizontal,
  Bell,
  Search,
  SlidersHorizontal,
  Plus,
  Calendar,
  ChevronRight,
  Filter,
  Disc,
  FileEdit,
  ShieldCheck,
  CreditCard,
  X,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Download,
  Shield,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Coins,
  Clock,
  Receipt,
  Trash2,
} from 'lucide-react';

interface HistoryViewProps {
  veicolo: Veicolo | undefined;
  record: InterventoRecord[];
  onSelectRecord: (record: InterventoRecord) => void;
  onOpenNewRecord: (mode?: 'manutenzione' | 'gomme' | 'altri_interventi') => void;
  onOpenRegistroPagamenti?: (tipo?: TipoPagamentoScadenza, mode?: 'current_card' | 'new_payment' | 'history_record', tab?: 'nuovo' | 'storico') => void;
  onDeleteVehicleDeadline?: (veicoloId: string, tipo: TipoPagamentoScadenza) => void;
  onOpenGoogleSync?: () => void;
}

type FilterHistoryType = 'Tutti gli Interventi' | 'Manutenzione' | 'Gomme' | 'Pagamenti' | 'Altri Interventi';
type PagamentiSubFilter = 'Tutti' | 'Bollo' | 'Revisione' | 'Assicurazione';

export const HistoryView: React.FC<HistoryViewProps> = ({
  veicolo,
  record,
  onSelectRecord,
  onOpenNewRecord,
  onOpenRegistroPagamenti,
  onDeleteVehicleDeadline,
  onOpenGoogleSync,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterHistoryType>('Tutti gli Interventi');
  const [pagamentiSubFilter, setPagamentiSubFilter] = useState<PagamentiSubFilter>('Tutti');
  const [selectedYear, setSelectedYear] = useState<string>('Tutti');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState<boolean>(false);
  const [isScadenzeMenuOpen, setIsScadenzeMenuOpen] = useState<boolean>(true);
  const [deadlineToDelete, setDeadlineToDelete] = useState<{ veicoloId: string; tipo: TipoPagamentoScadenza; label: string } | null>(null);

  const filtersSectionRef = React.useRef<HTMLDivElement>(null);
  const scadenzeSectionRef = React.useRef<HTMLDivElement>(null);

  // Scorrimento fluido all'inizio del sottomenu attivato
  const scrollToSubmenuSection = (targetRef: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      if (targetRef.current) {
        targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  const pagamentiCounts = useMemo(() => {
    if (!veicolo) return { bollo: 0, revisione: 0, assicurazione: 0, tutti: 0 };
    const pagRecs = record.filter((r) => r.veicoloId === veicolo.id && (r.tipo === 'Pagamento Scadenza' || !!r.registroPagamento));
    let bollo = 0;
    let revisione = 0;
    let assicurazione = 0;
    pagRecs.forEach((r) => {
      const t = r.registroPagamento?.tipoPagamento;
      const titleLow = (r.titolo || '').toLowerCase();
      if (t === 'Bollo' || titleLow.includes('bollo')) bollo++;
      else if (t === 'Revisione' || titleLow.includes('revision')) revisione++;
      else if (t === 'Assicurazione' || titleLow.includes('assicura') || titleLow.includes('rca')) assicurazione++;
    });
    return {
      tutti: pagRecs.length,
      bollo,
      revisione,
      assicurazione,
    };
  }, [record, veicolo]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    record
      .filter((r) => !veicolo || r.veicoloId === veicolo.id)
      .filter((r) => {
        if (activeFilter === 'Tutti gli Interventi') return true;
        if (activeFilter === 'Manutenzione') return r.tipo === 'Manutenzione' || r.tipo === 'Riparazione';
        if (activeFilter === 'Gomme') return r.tipo === 'Gomme' || !!r.registroGomme;
        if (activeFilter === 'Pagamenti') {
          const isPag = r.tipo === 'Pagamento Scadenza' || !!r.registroPagamento;
          if (!isPag) return false;
          if (pagamentiSubFilter === 'Tutti') return true;
          const t = r.registroPagamento?.tipoPagamento;
          const titleLow = (r.titolo || '').toLowerCase();
          if (pagamentiSubFilter === 'Bollo') return t === 'Bollo' || titleLow.includes('bollo');
          if (pagamentiSubFilter === 'Revisione') return t === 'Revisione' || titleLow.includes('revision');
          if (pagamentiSubFilter === 'Assicurazione') return t === 'Assicurazione' || titleLow.includes('assicura') || titleLow.includes('rca');
          return true;
        }
        if (activeFilter === 'Altri Interventi') return r.tipo === 'Altri Interventi' || r.tipo === 'Altro';
        return true;
      })
      .forEach((r) => {
        if (r.data) {
          const y = r.data.slice(0, 4);
          if (y && !isNaN(Number(y))) years.add(y);
        }
      });
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear);
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [record, veicolo, activeFilter, pagamentiSubFilter]);

  // Schede in attesa (non ancora pagate) per la sezione Prossime Scadenze
  const pendingBollo = useMemo(() => {
    if (!veicolo) return null;
    return record.find(
      (r) => r.veicoloId === veicolo.id && r.registroPagamento?.tipoPagamento === 'Bollo' && r.registroPagamento?.pagato === false
    );
  }, [record, veicolo]);

  const pendingRevisione = useMemo(() => {
    if (!veicolo) return null;
    return record.find(
      (r) => r.veicoloId === veicolo.id && r.registroPagamento?.tipoPagamento === 'Revisione' && r.registroPagamento?.pagato === false
    );
  }, [record, veicolo]);

  const pendingAssicurazione = useMemo(() => {
    if (!veicolo) return null;
    return record.find(
      (r) => r.veicoloId === veicolo.id && r.registroPagamento?.tipoPagamento === 'Assicurazione' && r.registroPagamento?.pagato === false
    );
  }, [record, veicolo]);

  // Calcolo scadenze effettive più prossime:
  // "LA SCADENZA FUTURA DEVE LEGGERE QUELLA PRECEDENTE PUNTO.3 ED INSERIRLA AL PUNTO 1"
  const effBollo = useMemo(() => {
    return getEffectiveUpcomingDeadline(veicolo, 'Bollo', record);
  }, [veicolo, record]);

  const effRevisione = useMemo(() => {
    return getEffectiveUpcomingDeadline(veicolo, 'Revisione', record);
  }, [veicolo, record]);

  const effAssicurazione = useMemo(() => {
    return getEffectiveUpcomingDeadline(veicolo, 'Assicurazione', record);
  }, [veicolo, record]);

  const filteredRecords = useMemo(() => {
    return record
      .filter((r) => {
        if (!veicolo) return true;
        return r.veicoloId === veicolo.id;
      })
      .filter((r) => {
        if (activeFilter === 'Tutti gli Interventi') return true;
        if (activeFilter === 'Manutenzione') return r.tipo === 'Manutenzione' || r.tipo === 'Riparazione';
        if (activeFilter === 'Gomme') return r.tipo === 'Gomme' || !!r.registroGomme;
        if (activeFilter === 'Pagamenti') {
          const isPag = r.tipo === 'Pagamento Scadenza' || !!r.registroPagamento;
          if (!isPag) return false;
          if (pagamentiSubFilter === 'Tutti') return true;
          const t = r.registroPagamento?.tipoPagamento;
          const titleLow = (r.titolo || '').toLowerCase();
          if (pagamentiSubFilter === 'Bollo') {
            return t === 'Bollo' || titleLow.includes('bollo');
          }
          if (pagamentiSubFilter === 'Revisione') {
            return t === 'Revisione' || titleLow.includes('revision');
          }
          if (pagamentiSubFilter === 'Assicurazione') {
            return t === 'Assicurazione' || titleLow.includes('assicura') || titleLow.includes('rca');
          }
          return true;
        }
        if (activeFilter === 'Altri Interventi') return r.tipo === 'Altri Interventi' || r.tipo === 'Altro';
        return true;
      })
      .filter((r) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          r.titolo.toLowerCase().includes(q) ||
          (r.descrizione && r.descrizione.toLowerCase().includes(q)) ||
          (r.officina && r.officina.toLowerCase().includes(q)) ||
          r.lavorazioniSelezionate.some((l) => l.nome.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [record, veicolo, activeFilter, pagamentiSubFilter, searchQuery]);

  // Raggruppamento per Anno
  const recordsByYear = useMemo(() => {
    const years = selectedYear === 'Tutti' ? availableYears : [selectedYear];
    return years
      .map((year) => {
        const yearRecs = filteredRecords.filter((r) => r.data && r.data.startsWith(year));
        const totalCost = yearRecs.reduce((acc, r) => acc + (r.costo || 0), 0);
        return {
          year,
          records: yearRecs,
          totalCost,
        };
      })
      .filter((g) => selectedYear !== 'Tutti' || g.records.length > 0);
  }, [availableYears, selectedYear, filteredRecords]);

  const activeRemindersCount = useMemo(() => {
    return record.filter((r) => (!veicolo || r.veicoloId === veicolo.id) && r.haPromemoria).length;
  }, [record, veicolo]);

  // Click su "+ Nuovo" in base alla categoria attiva
  const handleHeaderNewClick = () => {
    if (activeFilter === 'Manutenzione') {
      onOpenNewRecord('manutenzione');
    } else if (activeFilter === 'Gomme') {
      onOpenNewRecord('gomme');
    } else if (activeFilter === 'Pagamenti') {
      onOpenRegistroPagamenti?.('Bollo');
    } else if (activeFilter === 'Altri Interventi') {
      onOpenNewRecord('altri_interventi');
    } else {
      // Su Tutti gli Interventi: permette di scegliere tra manutenzione, gomme, pagamenti o altri interventi
      setIsChoiceModalOpen(true);
    }
  };

  const getNewButtonConfig = () => {
    if (activeFilter === 'Manutenzione') {
      return {
        label: '+ Manutenzione',
        bg: 'from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-900/40',
        icon: <Wrench size={14} />,
      };
    }
    if (activeFilter === 'Gomme') {
      return {
        label: '+ Registra Gomme',
        bg: 'from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 shadow-cyan-900/40',
        icon: <Disc size={14} />,
      };
    }
    if (activeFilter === 'Pagamenti') {
      return {
        label: '+ Registra Pagamento',
        bg: 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/40',
        icon: <CreditCard size={14} />,
      };
    }
    if (activeFilter === 'Altri Interventi') {
      return {
        label: '+ Altro Intervento',
        bg: 'from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-900/40',
        icon: <FileEdit size={14} />,
      };
    }
    return {
      label: '+ Nuovo',
      bg: 'from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-900/30',
      icon: <Plus size={15} />,
    };
  };

  const btnConfig = getNewButtonConfig();

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-200">
      
      {/* Header with car photo banner */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-xl bg-gradient-to-t from-[#0e1624] via-[#141e30] to-[#1c2a44] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Cronologia
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs">
              <span className="font-mono font-bold text-blue-400">
                {veicolo ? `${veicolo.marca} ${veicolo.modello} • ${veicolo.targa}` : 'Tutti i veicoli'}
              </span>
              {veicolo?.proprietario && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-300 font-medium flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-0.5 rounded-lg border border-slate-700/60 shadow-sm">
                    <span className="text-slate-400 font-normal">Proprietario:</span>
                    <strong className="text-white font-bold">{veicolo.proprietario}</strong>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeRemindersCount > 0 && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-sm">
                <Bell size={13} className="text-amber-400" />
                <span>{activeRemindersCount}</span>
              </div>
            )}

            <button
              onClick={handleHeaderNewClick}
              className={`px-3.5 py-1.5 rounded-xl bg-gradient-to-r ${btnConfig.bg} text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer`}
            >
              {btnConfig.icon}
              <span>{btnConfig.label}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MENU PROSSIME SCADENZE: Bollo Auto, Revisione, Assicurazione */}
      {veicolo && (
        <div ref={scadenzeSectionRef} className="rounded-3xl border border-slate-800/90 bg-[#101726] shadow-xl overflow-hidden scroll-mt-4">
          {/* Menu Header */}
          <div className="p-4 bg-gradient-to-r from-[#141e30] to-[#111929] border-b border-slate-800/80 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                const next = !isScadenzeMenuOpen;
                setIsScadenzeMenuOpen(next);
                if (next) {
                  scrollToSubmenuSection(scadenzeSectionRef);
                }
              }}
              className="flex items-center gap-2.5 text-left cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <CalendarDays size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <span>Prossime Scadenze Veicolo</span>
                  {isScadenzeMenuOpen ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                </h3>
                <p className="text-[10px] text-slate-400">
                  Bollo Auto • Revisione • Assicurazione
                </p>
              </div>
            </button>

            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
              <button
                type="button"
                onClick={() => onOpenRegistroPagamenti?.(undefined, undefined, 'storico')}
                className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white border border-emerald-500/50 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Apri lo storico di tutti i pagamenti effettuati per questo veicolo"
              >
                <CreditCard size={13} />
                <span>Storico Pagamenti Saldati ({record.filter((r) => (!veicolo || r.veicoloId === veicolo.id) && (r.tipo === 'Pagamento Scadenza' || !!r.registroPagamento) && r.registroPagamento?.pagato !== false).length})</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenGoogleSync?.()}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md shadow-blue-950/40 transition-all cursor-pointer"
                title="Sincronizza automaticamente con Google Calendar 'Scadenze Auto'"
              >
                <CalendarDays size={13} />
                <span>Google Calendar</span>
              </button>

              <button
                type="button"
                onClick={() => downloadFleetCalendarIcs([veicolo])}
                className="p-1.5 rounded-xl bg-[#1c293d] hover:bg-[#253752] text-blue-300 hover:text-white border border-blue-900/60 transition-all cursor-pointer"
                title="Scarica file .ics 'Scadenze Auto'"
              >
                <Download size={15} />
              </button>
            </div>
          </div>

          {/* Collapsible Content */}
          {isScadenzeMenuOpen && (
            <div className="p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3">
              
              {/* 1. SCADENZA BOLLO */}
              {(() => {
                const effectiveScadenza = effBollo.dataScadenza;
                const hasBollo = !!(effBollo.dataScadenza || veicolo.scadenzaBollo || effBollo.existingPendingRecord || effBollo.previousPaidRecord);
                const effectiveImporto = effBollo.importo;

                return (
                  <div className="p-3.5 rounded-2xl bg-[#162133] border border-amber-500/40 relative flex flex-col justify-between space-y-2.5 shadow-md">
                    <div>
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                          <CreditCard size={13} />
                          <span>Scadenza Bollo</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          {hasBollo && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-700/60 font-mono">
                              {effectiveImporto > 0 ? formatCurrency(effectiveImporto) : 'Attivo'}
                            </span>
                          )}
                          {hasBollo && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeadlineToDelete({ veicoloId: veicolo.id, tipo: 'Bollo', label: 'Scadenza Bollo' });
                              }}
                              className="p-1 rounded-lg bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800 transition-colors cursor-pointer"
                              title="Elimina scheda scadenza bollo"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="text-sm sm:text-base font-black text-white font-mono">
                            {effectiveScadenza ? formatDateIt(effectiveScadenza) : 'Non impostata'}
                          </div>
                          {hasBollo && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800/80 flex items-center gap-1">
                              <Clock size={10} className="text-amber-400" />
                              <span>In Attesa</span>
                            </span>
                          )}
                        </div>

                        {effectiveScadenza && (
                          <div className="text-[11px] text-amber-300 font-semibold">
                            Pagabile entro: <strong>{effBollo.pagabileEntro || computeBolloPagabileEntro(effectiveScadenza)}</strong>
                          </div>
                        )}

                        <div className="text-[10px] text-slate-400 pt-0.5">
                          Scheda indipendente • Check pagamento non attivo
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenRegistroPagamenti?.('Bollo', 'current_card')}
                      className="w-full py-2 px-3 rounded-xl bg-amber-600/30 hover:bg-amber-600 text-amber-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-amber-500/40 transition-colors cursor-pointer"
                    >
                      <CreditCard size={13} />
                      <span>{hasBollo ? '💳 Registra Pagamento / Salda' : 'Imposta Scadenza Bollo'}</span>
                    </button>
                  </div>
                );
              })()}

              {/* 2. SCADENZA REVISIONE */}
              {(() => {
                const effectiveScadenza = effRevisione.dataScadenza;
                const hasRev = !!(effRevisione.dataScadenza || veicolo.scadenzaRevisione || effRevisione.existingPendingRecord || effRevisione.previousPaidRecord);
                const effectiveCosto = effRevisione.importo;
                const effectiveFreq = effRevisione.frequenza;

                return (
                  <div className="p-3.5 rounded-2xl bg-[#162133] border border-rose-500/40 relative flex flex-col justify-between space-y-2.5 shadow-md">
                    <div>
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                          <FileCheck size={13} />
                          <span>Scadenza Revisione</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 border border-rose-700/60 font-mono">
                            {formatCurrency(effectiveCosto)}
                          </span>
                          {hasRev && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeadlineToDelete({ veicoloId: veicolo.id, tipo: 'Revisione', label: 'Scadenza Revisione' });
                              }}
                              className="p-1 rounded-lg bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800 transition-colors cursor-pointer"
                              title="Elimina scheda scadenza revisione"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="text-sm sm:text-base font-black text-white font-mono">
                            {effectiveScadenza ? formatDateIt(effectiveScadenza) : 'Non impostata'}
                          </div>
                          {hasRev && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-950 text-rose-300 border border-rose-800/80 flex items-center gap-1">
                              <Clock size={10} className="text-rose-400" />
                              <span>In Attesa</span>
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400">
                          Frequenza: <strong className="text-slate-300">{effectiveFreq}</strong>
                        </div>

                        <div className="text-[10px] text-slate-400 pt-0.5">
                          Scheda indipendente • Check revisione non attivo
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenRegistroPagamenti?.('Revisione', 'current_card')}
                      className="w-full py-2 px-3 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-rose-500/40 transition-colors cursor-pointer"
                    >
                      <FileCheck size={13} />
                      <span>{hasRev ? '💳 Registra Revisione / Salda' : 'Imposta Scadenza Revisione'}</span>
                    </button>
                  </div>
                );
              })()}

              {/* 3. SCADENZA ASSICURAZIONE */}
              {(() => {
                const effectiveScadenza = effAssicurazione.dataScadenza;
                const hasAssic = !!(effAssicurazione.dataScadenza || veicolo.scadenzaAssicurazione || effAssicurazione.existingPendingRecord || effAssicurazione.previousPaidRecord);
                const effectiveImporto = effAssicurazione.importo;
                const effectiveCompagnia = effAssicurazione.enteOCompagnia;
                const effectivePolizza = effAssicurazione.numeroPolizza;

                return (
                  <div className="p-3.5 rounded-2xl bg-[#162133] border border-emerald-500/40 relative flex flex-col justify-between space-y-2.5 shadow-md">
                    <div>
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <Shield size={13} />
                          <span>Scadenza Assicurazione</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          {effectiveCompagnia && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                              {effectiveCompagnia}
                            </span>
                          )}
                          {hasAssic && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeadlineToDelete({ veicoloId: veicolo.id, tipo: 'Assicurazione', label: 'Scadenza Assicurazione' });
                              }}
                              className="p-1 rounded-lg bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800 transition-colors cursor-pointer"
                              title="Elimina scheda scadenza assicurazione"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="text-sm sm:text-base font-black text-white font-mono">
                            {effectiveScadenza ? formatDateIt(effectiveScadenza) : 'Non indicata'}
                          </div>
                          {hasAssic && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800/80 flex items-center gap-1">
                              <Clock size={10} className="text-emerald-400" />
                              <span>In Attesa</span>
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400">
                          Rata: <strong className="text-slate-300">{effectiveImporto > 0 ? `${formatCurrency(effectiveImporto)} (${effAssicurazione.frequenza})` : 'N/D'}</strong>
                          {effectivePolizza && <span className="ml-1 text-[10px] text-slate-400 font-mono">• Polizza: {effectivePolizza}</span>}
                        </div>

                        <div className="text-[10px] text-slate-400 pt-0.5">
                          Scheda indipendente • Check rinnovo non attivo
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenRegistroPagamenti?.('Assicurazione', 'current_card')}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-500/40 transition-colors cursor-pointer"
                    >
                      <Shield size={13} />
                      <span>{hasAssic ? '💳 Registra Assicurazione / Salda' : 'Imposta Assicurazione'}</span>
                    </button>
                  </div>
                );
              })()}

            </div>
          )}
        </div>
      )}

      {/* Sezione Filtri e Timeline Interventi */}
      <div ref={filtersSectionRef} className="space-y-3 scroll-mt-4">
        {/* Filter Chips Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(['Tutti gli Interventi', 'Manutenzione', 'Gomme', 'Pagamenti', 'Altri Interventi'] as const).map((filtro) => {
            const isSelected = activeFilter === filtro;
            return (
              <button
                key={filtro}
                onClick={() => {
                  setActiveFilter(filtro);
                  scrollToSubmenuSection(filtersSectionRef);
                }}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-900/30'
                    : 'bg-[#152033] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {filtro}
              </button>
            );
          })}
        </div>

        {/* Sottomenu Filtri Pagamenti (Bollo, Revisione, Assicurazione) filtrabili anche per anno */}
        {activeFilter === 'Pagamenti' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-1.5 rounded-2xl bg-[#0e1626] border border-emerald-900/50 shadow-sm animate-in fade-in duration-150">
            <span className="text-[10px] uppercase font-black text-emerald-400 px-2 shrink-0 flex items-center gap-1.5">
              <Filter size={12} />
              <span>Filtra Pagamento:</span>
            </span>
            {[
              { id: 'Tutti' as const, label: 'Tutti i Pagamenti', icon: CreditCard, count: pagamentiCounts.tutti },
              { id: 'Bollo' as const, label: 'Bollo Auto', icon: CreditCard, count: pagamentiCounts.bollo },
              { id: 'Revisione' as const, label: 'Revisione MCTC', icon: FileCheck, count: pagamentiCounts.revisione },
              { id: 'Assicurazione' as const, label: 'Assicurazione RCA', icon: Shield, count: pagamentiCounts.assicurazione },
            ].map((sub) => {
              const isSel = pagamentiSubFilter === sub.id;
              const Icon = sub.icon;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    setPagamentiSubFilter(sub.id);
                    scrollToSubmenuSection(filtersSectionRef);
                  }}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isSel
                      ? sub.id === 'Bollo'
                        ? 'bg-amber-600 border-amber-400 text-white shadow-md shadow-amber-950/40'
                        : sub.id === 'Revisione'
                        ? 'bg-rose-600 border-rose-400 text-white shadow-md shadow-rose-950/40'
                        : sub.id === 'Assicurazione'
                        ? 'bg-emerald-600 border-emerald-400 text-white shadow-md shadow-emerald-950/40'
                        : 'bg-emerald-600 border-emerald-400 text-white shadow-md shadow-emerald-950/40'
                      : 'bg-[#141e30] border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <Icon size={12} />
                  <span>{sub.label}</span>
                  {sub.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isSel ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {sub.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Cerca lavorazione, componente, officina..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#152033] border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3 text-slate-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Barra Filtro per Anno */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => {
              setSelectedYear('Tutti');
              scrollToSubmenuSection(filtersSectionRef);
            }}
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
              onClick={() => {
                setSelectedYear(yr);
                scrollToSubmenuSection(filtersSectionRef);
              }}
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
      </div>

      {/* Records Timeline List grouped by year */}
      {recordsByYear.length === 0 ? (
        <div className="text-center py-16 px-4 bg-[#111927] border border-slate-800/80 rounded-3xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-400 mb-3">
            <Filter size={24} />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Nessun intervento trovato</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
            {searchQuery
              ? `Nessun risultato corrisponde a "${searchQuery}".`
              : activeFilter !== 'Tutti gli Interventi'
              ? `Nessun intervento registrato in "${activeFilter}"${selectedYear !== 'Tutti' ? ` per l'anno ${selectedYear}` : ''}.`
              : selectedYear !== 'Tutti'
              ? `Nessun intervento registrato per l'anno ${selectedYear}.`
              : 'Non ci sono ancora interventi registrati per questo veicolo.'}
          </p>
          <button
            onClick={handleHeaderNewClick}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
          >
            + Registra Primo Intervento
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {recordsByYear.map((yearGroup) => (
            <div key={yearGroup.year} className="space-y-3">
              {/* Header Anno con totali, acconti e saldo rimanente */}
              {(() => {
                const yrAcconti = yearGroup.records.reduce(
                  (acc, r) => acc + (r.acconti || []).reduce((sum, a) => sum + (Number(a.importo) || 0), 0),
                  0
                );
                const yrRimanenza = yearGroup.records.reduce((acc, r) => {
                  const totAcc = (r.acconti || []).reduce((sum, a) => sum + (Number(a.importo) || 0), 0);
                  const rim =
                    r.saldoRimanente !== undefined
                      ? r.saldoRimanente
                      : r.statoPagamento === 'parziale'
                      ? Math.max(0, (r.costo || 0) - totAcc)
                      : r.statoPagamento === 'da_pagare'
                      ? (r.costo || 0)
                      : 0;
                  return acc + rim;
                }, 0);

                return (
                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-[#121c2d] to-[#152238] border border-slate-800 shadow-sm flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-black font-mono bg-blue-950 text-blue-300 px-2.5 py-0.5 rounded-lg border border-blue-800/80 shadow-sm">
                        Anno {yearGroup.year}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {yearGroup.records.length} {yearGroup.records.length === 1 ? 'intervento' : 'interventi'}
                      </span>
                    </div>

                    <div className="text-right flex items-center gap-3 flex-wrap justify-end">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">Totale Anno:</span>
                        <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono">
                          {formatCurrency(yearGroup.totalCost)}
                        </span>
                      </div>

                      {yrAcconti > 0 && (
                        <div className="flex items-center gap-1 bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-800/50 text-[11px] font-mono">
                          <span className="text-[9px] uppercase font-bold text-amber-400">Acconti:</span>
                          <span className="text-amber-300 font-bold">{formatCurrency(yrAcconti)}</span>
                        </div>
                      )}

                      {yrRimanenza > 0 && (
                        <div className="flex items-center gap-1 bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-800/50 text-[11px] font-mono">
                          <span className="text-[9px] uppercase font-bold text-rose-400">Rimanenza:</span>
                          <span className="text-rose-300 font-bold">{formatCurrency(yrRimanenza)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Interventi dell'anno */}
              <div className="space-y-3">
                {yearGroup.records.map((r) => {
                  const isGomme = r.tipo === 'Gomme' || !!r.registroGomme;
                  const isAltri = r.tipo === 'Altri Interventi' || r.tipo === 'Altro';
                  const isPagamento = r.tipo === 'Pagamento Scadenza' || !!r.registroPagamento;
                  const tipoPagamento = r.registroPagamento?.tipoPagamento;

                  // Gestione Acconti e Rimanenza
                  const totAcconti = (r.acconti || []).reduce(
                    (sum, a) => sum + (Number(a.importo) || 0),
                    0
                  );
                  const hasAcconti = totAcconti > 0;
                  const computedRimanenza =
                    r.saldoRimanente !== undefined
                      ? r.saldoRimanente
                      : r.statoPagamento === 'parziale'
                      ? Math.max(0, (r.costo || 0) - totAcconti)
                      : r.statoPagamento === 'da_pagare'
                      ? (r.costo || 0)
                      : 0;
                  const hasRimanenza = computedRimanenza > 0;

                  return (
                    <div
                      key={r.id}
                      onClick={() => onSelectRecord(r)}
                      className="p-4 rounded-3xl bg-[#141e2e] border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-md group relative overflow-hidden"
                    >
                      {/* Visual side accent bar */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                          isPagamento
                            ? tipoPagamento === 'Bollo'
                              ? 'bg-amber-500'
                              : tipoPagamento === 'Revisione'
                              ? 'bg-rose-500'
                              : 'bg-emerald-500'
                            : isGomme
                            ? 'bg-cyan-500'
                            : isAltri
                            ? 'bg-purple-500'
                            : 'bg-orange-500'
                        }`}
                      />

                      <div className="flex items-start justify-between gap-3 pl-2">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          
                          {/* Top Row: Date, KM & Badges */}
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="font-mono text-slate-400 flex items-center gap-1 font-semibold">
                              <Calendar size={13} className="text-slate-500" />
                              {formatDateIt(r.data)}
                            </span>
                            {r.km > 0 && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className="font-bold text-white font-mono bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700/60 text-[11px]">
                                  {formatKm(r.km)}
                                </span>
                              </>
                            )}

                            {/* Pill Badge */}
                            {isPagamento ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                    tipoPagamento === 'Bollo'
                                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                                      : tipoPagamento === 'Revisione'
                                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                                      : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  }`}
                                >
                                  {tipoPagamento === 'Bollo' && <CreditCard size={11} />}
                                  {tipoPagamento === 'Revisione' && <FileCheck size={11} />}
                                  {tipoPagamento === 'Assicurazione' && <Shield size={11} />}
                                  <span>{tipoPagamento || 'Pagamento'}</span>
                                </span>

                                {r.registroPagamento?.pagato === false ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-600 flex items-center gap-1 font-mono">
                                    <Clock size={11} className="text-amber-400" />
                                    <span>In Attesa</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-600 flex items-center gap-1 font-mono">
                                    <CheckCircle2 size={11} className="text-emerald-400" />
                                    <span>Saldato</span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                                    isGomme
                                      ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                                      : isAltri
                                      ? 'bg-purple-950 text-purple-300 border-purple-800'
                                      : 'bg-orange-950 text-orange-300 border-orange-800'
                                  }`}
                                >
                                  {isGomme ? 'Gomme' : isAltri ? 'Altri Interventi' : 'Manutenzione'}
                                </span>

                                {/* Badge Stato Pagamento Intervento */}
                                {r.statoPagamento === 'parziale' || hasAcconti ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-600 flex items-center gap-1 font-mono">
                                    <Clock size={11} className="text-amber-400" />
                                    <span>Acconto / Parziale</span>
                                  </span>
                                ) : r.statoPagamento === 'da_pagare' ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-600 flex items-center gap-1 font-mono">
                                    <AlertCircle size={11} className="text-rose-400" />
                                    <span>Da Saldare</span>
                                  </span>
                                ) : r.statoPagamento === 'saldato' ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-600 flex items-center gap-1 font-mono">
                                    <CheckCircle2 size={11} className="text-emerald-400" />
                                    <span>Saldato</span>
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </div>

                          {/* Titolo Intervento */}
                          <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                            {r.titolo}
                          </h3>

                          {/* Scadenza impostata per i pagamenti */}
                          {r.registroPagamento?.dataScadenza && (
                            <div className="text-[11px] text-blue-300 flex items-center gap-1.5 font-medium">
                              <Clock size={12} className="text-blue-400 shrink-0" />
                              <span>Scadenza: <strong>{formatDateIt(r.registroPagamento.dataScadenza)}</strong></span>
                              {r.registroPagamento.pagabileEntro && (
                                <span className="text-amber-300 font-normal">({r.registroPagamento.pagabileEntro})</span>
                              )}
                            </div>
                          )}

                          {/* Descrizione (per Altri Interventi o note) */}
                          {r.descrizione && (
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {r.descrizione}
                            </p>
                          )}

                          {/* Officina o Ente/Compagnia */}
                          {(r.officina || r.registroPagamento?.enteOCompagnia) && (
                            <p className="text-[11px] text-slate-400 font-medium">
                              Presso: <span className="text-slate-300">{r.officina || r.registroPagamento?.enteOCompagnia}</span>
                              {r.registroPagamento?.numeroPolizza && (
                                <span className="text-slate-400 ml-1.5 font-mono text-[10px]">Polizza: {r.registroPagamento.numeroPolizza}</span>
                              )}
                            </p>
                          )}

                          {/* Micro-lavorazioni pills (se presenti) */}
                          {r.lavorazioniSelezionate && r.lavorazioniSelezionate.length > 0 && !isGomme && !isPagamento && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {r.lavorazioniSelezionate.slice(0, 3).map((lav) => (
                                <span
                                  key={lav.lavorazioneId}
                                  className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/50"
                                >
                                  {lav.nome}
                                </span>
                              ))}
                              {r.lavorazioniSelezionate.length > 3 && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-400">
                                  +{r.lavorazioniSelezionate.length - 3} altre
                                </span>
                              )}
                            </div>
                          )}

                          {/* Box Riepilogo Acconti e Rimanenza sulla scheda dell'intervento */}
                          {(hasAcconti || hasRimanenza || r.statoPagamento === 'parziale' || r.statoPagamento === 'da_pagare') && (
                            <div className="mt-2.5 p-2.5 rounded-2xl bg-[#0e1625] border border-slate-800/90 shadow-sm space-y-2">
                              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {hasAcconti && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-950/60 border border-amber-700/60 text-amber-200">
                                      <Coins size={13} className="text-amber-400 shrink-0" />
                                      <span>
                                        Acconto: <strong className="font-mono text-amber-300">{formatCurrency(totAcconti)}</strong>
                                      </span>
                                    </div>
                                  )}

                                  {hasRimanenza && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-950/60 border border-rose-700/60 text-rose-200">
                                      <AlertCircle size={13} className="text-rose-400 shrink-0" />
                                      <span>
                                        Rimanenza: <strong className="font-mono text-rose-300">{formatCurrency(computedRimanenza)}</strong>
                                      </span>
                                    </div>
                                  )}

                                  {r.statoPagamento === 'saldato' && !hasRimanenza && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-200">
                                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                      <span>Saldato interamente</span>
                                    </div>
                                  )}
                                </div>

                                {r.acconti && r.acconti.length > 0 && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {r.acconti.length} {r.acconti.length === 1 ? 'acconto versato' : 'acconti versati'}
                                  </span>
                                )}
                              </div>

                              {/* Dettaglio singoli acconti (se presenti) */}
                              {r.acconti && r.acconti.length > 0 && (
                                <div className="space-y-1 pt-1.5 border-t border-slate-800">
                                  {r.acconti.map((acc, idx) => (
                                    <div
                                      key={acc.id || idx}
                                      className="flex items-center justify-between text-[11px] bg-[#121c2c] px-2.5 py-1 rounded-lg border border-slate-800/80"
                                    >
                                      <span className="text-slate-300 truncate">
                                        {acc.note || `Acconto ${idx + 1}`} ({formatDateIt(acc.data)})
                                      </span>
                                      <span className="font-mono font-bold text-amber-300 shrink-0 ml-2">
                                        {formatCurrency(acc.importo)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                        </div>

                        {/* Right Column: Cost, Acconti, Rimanenza and Arrow */}
                        <div className="flex flex-col items-end justify-between self-stretch shrink-0 min-w-[95px] sm:min-w-[130px]">
                          <div className="text-right space-y-1">
                            <div className="flex items-center justify-end gap-1">
                              {(hasAcconti || hasRimanenza || r.statoPagamento === 'parziale' || r.statoPagamento === 'da_pagare') && (
                                <span className="text-[9px] uppercase font-bold text-slate-400">Tot:</span>
                              )}
                              <span className="text-xs sm:text-sm font-black text-emerald-400 block font-mono">
                                {r.costo > 0 ? formatCurrency(r.costo) : 'Gratuito / N/D'}
                              </span>
                            </div>

                            {/* Acconto visualizzato nella colonna destra */}
                            {hasAcconti && (
                              <div className="flex items-center justify-end gap-1 text-[11px] font-mono text-amber-300 font-bold bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-800/60">
                                <span className="text-[8px] uppercase font-semibold text-amber-400">Acc:</span>
                                <span>{formatCurrency(totAcconti)}</span>
                              </div>
                            )}

                            {/* Rimanenza visualizzata nella colonna destra */}
                            {hasRimanenza && (
                              <div className="flex items-center justify-end gap-1 text-[11px] font-mono text-rose-300 font-bold bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-800/60">
                                <span className="text-[8px] uppercase font-semibold text-rose-400">Rim:</span>
                                <span>{formatCurrency(computedRimanenza)}</span>
                              </div>
                            )}
                          </div>

                          <div className="w-7 h-7 rounded-full bg-slate-800/60 group-hover:bg-blue-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-colors mt-auto">
                            <ChevronRight size={15} />
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Choice Modal quando si è su "Tutti gli Interventi" e si clicca "+ Nuovo" */}
      {isChoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[#111927] border border-slate-800 rounded-3xl p-5 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Scegli Tipo Intervento</h3>
                <p className="text-xs text-slate-400">Cosa desideri registrare?</p>
              </div>
              <button
                type="button"
                onClick={() => setIsChoiceModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Opzione 1: Manutenzione & Tagliandi */}
              <button
                type="button"
                onClick={() => {
                  setIsChoiceModalOpen(false);
                  onOpenNewRecord('manutenzione');
                }}
                className="w-full p-3.5 rounded-2xl bg-[#172233] hover:bg-[#1e2e45] border border-orange-500/40 hover:border-orange-500 flex items-center gap-3.5 text-left transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Wrench size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-white block">Manutenzione & Tagliandi</span>
                  <span className="text-[11px] text-slate-400 block truncate">Tagliando, filtri, cambio olio, freni, distribuzione...</span>
                </div>
              </button>

              {/* Opzione 2: Registro Gomme */}
              <button
                type="button"
                onClick={() => {
                  setIsChoiceModalOpen(false);
                  onOpenNewRecord('gomme');
                }}
                className="w-full p-3.5 rounded-2xl bg-[#172233] hover:bg-[#1e2e45] border border-cyan-500/40 hover:border-cyan-500 flex items-center gap-3.5 text-left transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Disc size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-white block">Registro Gomme</span>
                  <span className="text-[11px] text-slate-400 block truncate">Sostituzione gomme, inversione, equilibratura, convergenza...</span>
                </div>
              </button>

              {/* Opzione 3: Altri Interventi */}
              <button
                type="button"
                onClick={() => {
                  setIsChoiceModalOpen(false);
                  onOpenNewRecord('altri_interventi');
                }}
                className="w-full p-3.5 rounded-2xl bg-[#172233] hover:bg-[#1e2e45] border border-purple-500/40 hover:border-purple-500 flex items-center gap-3.5 text-left transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileEdit size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-white block">Altri Interventi (Rapido)</span>
                  <span className="text-[11px] text-slate-400 block truncate">Riparazioni rapide, carrozzeria, lampadine, controlli vari...</span>
                </div>
              </button>

              {/* Opzione 4: Registro Pagamenti Scadenze */}
              <button
                type="button"
                onClick={() => {
                  setIsChoiceModalOpen(false);
                  onOpenRegistroPagamenti?.('Bollo', 'new_payment');
                }}
                className="w-full p-3.5 rounded-2xl bg-[#172233] hover:bg-[#1e2e45] border border-emerald-500/40 hover:border-emerald-500 flex items-center gap-3.5 text-left transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <CreditCard size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-white block">Registro Pagamenti & Scadenze</span>
                  <span className="text-[11px] text-slate-400 block truncate">Bollo auto, revisione MCTC, assicurazione RCA...</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal In-App Eliminazione Scheda Scadenza (senza window.confirm) */}
      {deadlineToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setDeadlineToDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#141e2e] border border-rose-500/50 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-white">
                Elimina Scheda
              </h3>
              <p className="text-xs text-slate-300">
                Sei sicuro di voler eliminare la scheda <strong>{deadlineToDelete.label}</strong> per il veicolo <strong className="font-mono text-blue-400">{veicolo?.targa}</strong>?
              </p>
              <p className="text-[11px] text-amber-300/90 font-medium bg-amber-950/40 p-2 rounded-xl border border-amber-800/40 text-left">
                💡 Se sono presenti pagamenti saldati nello storico, verrà ripristinata automaticamente la scadenza più prossima leggendo il Punto 3 della quietanza precedente.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeadlineToDelete(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  const { veicoloId, tipo } = deadlineToDelete;
                  setDeadlineToDelete(null);
                  onDeleteVehicleDeadline?.(veicoloId, tipo);
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-rose-900/40"
              >
                Sì, Elimina
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
