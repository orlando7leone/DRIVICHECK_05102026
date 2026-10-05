import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Veicolo, InterventoRecord, TipoPagamentoScadenza, RegistroPagamentoData, AllegatoDocumento, AnagraficaOfficina } from '../types';
import { ReceiptInvoiceUpload } from './ReceiptInvoiceUpload';
import { OfficinaSelector } from './OfficinaSelector';
import {
  formatCurrency,
  formatDateIt,
  generateDeadlineMessage,
  openGoogleCalendarEvent,
  downloadIcsFile,
  computeNextDeadlineDate,
  computeBolloPagabileEntro,
  computeFutureDeadlinesSeries,
  getEffectiveUpcomingDeadline,
  downloadFleetCalendarIcs,
  downloadRevisioniCalendarIcs,
  downloadAssicurazioniCalendarIcs,
  downloadBolloCalendarIcs,
  openWhatsAppReminder,
  openSmsReminder,
} from '../services/storageService';
import {
  X,
  ArrowLeft,
  Shield,
  FileCheck,
  CreditCard,
  Calendar,
  Save,
  Check,
  CalendarPlus,
  Send,
  Download,
  AlertCircle,
  Sparkles,
  Clock,
  ArrowRight,
  Repeat,
  CheckCircle2,
  Plus,
  History,
  Trash2,
  Pencil,
  Receipt,
  FileText,
  Copy,
} from 'lucide-react';

interface RegistroPagamentiModalProps {
  isOpen: boolean;
  onClose: () => void;
  veicolo: Veicolo;
  onSaveRecord: (record: InterventoRecord) => void;
  onUpdateVehicleDeadline?: (
    veicoloId: string,
    tipo: TipoPagamentoScadenza,
    nuovaScadenza: string,
    importo?: number,
    compagnia?: string
  ) => void;
  onDeleteVehicleDeadline?: (veicoloId: string, tipo: TipoPagamentoScadenza) => void;
  editingRecord?: InterventoRecord | null;
  initialTipoPagamento?: TipoPagamentoScadenza;
  initialMode?: 'current_card' | 'new_payment' | 'history_record';
  initialTab?: 'nuovo' | 'storico';
  officineSalvate?: string[];
  officineAnagrafica?: AnagraficaOfficina[];
  onAddNewOfficina?: (nome: string, tipo?: any) => void;
  entiRiscossione?: string[];
  compagnieAssicurative?: string[];
  onAddEnteRiscossione?: (ente: string) => void;
  onAddCompagniaAssicurativa?: (compagnia: string) => void;
  allRecords?: InterventoRecord[];
  onDeleteRecord?: (recordId: string) => void;
  isCopyMode?: boolean;
}

// Converte in formato ISO YYYY-MM-DD per gli input HTML di tipo date
const toIsoDate = (val: string): string => {
  if (!val) return '';
  const clean = val.trim();
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${y}-${m}-${d}`;
    }
  }
  return clean;
};

export const RegistroPagamentiModal: React.FC<RegistroPagamentiModalProps> = ({
  isOpen,
  onClose,
  veicolo,
  onSaveRecord,
  onUpdateVehicleDeadline,
  onDeleteVehicleDeadline,
  editingRecord,
  initialTipoPagamento = 'Bollo',
  initialMode = 'current_card',
  initialTab = 'nuovo',
  officineSalvate = [],
  officineAnagrafica = [],
  onAddNewOfficina,
  entiRiscossione = [],
  compagnieAssicurative = [],
  onAddEnteRiscossione,
  onAddCompagniaAssicurativa,
  allRecords = [],
  onDeleteRecord,
  isCopyMode = false,
}) => {
  const modalScrollRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<'nuovo' | 'storico'>(initialTab);
  const [isCurrentCardMode, setIsCurrentCardMode] = useState<boolean>(!isCopyMode && initialMode === 'current_card');
  const [isLocalCopy, setIsLocalCopy] = useState<boolean>(isCopyMode);
  const [filterStorico, setFilterStorico] = useState<'Tutti' | TipoPagamentoScadenza>('Tutti');
  const [currentEditingRecord, setCurrentEditingRecord] = useState<InterventoRecord | null>(isCopyMode ? null : (editingRecord || null));
  const [tipoPagamento, setTipoPagamento] = useState<TipoPagamentoScadenza>(initialTipoPagamento);
  const [dataPagamento, setDataPagamento] = useState<string>('');
  const [dataScadenza, setDataScadenza] = useState<string>('');
  const [futuraScadenza, setFuturaScadenza] = useState<string>('');
  const [pagabileEntroBollo, setPagabileEntroBollo] = useState<string>('');
  const [modalitaAssicurazione, setModalitaAssicurazione] = useState<string>('Annuale (pagamento unico)');
  const [frequenzaRevisione, setFrequenzaRevisione] = useState<string>('Auto (Normale)');
  const [importo, setImporto] = useState<string>('');
  const [enteOCompagnia, setEnteOCompagnia] = useState<string>('');
  const [numeroPolizza, setNumeroPolizza] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [fotoRicevutaUrl, setFotoRicevutaUrl] = useState<string>('');
  const [allegati, setAllegati] = useState<AllegatoDocumento[]>([]);
  const [aggiornaScadenzaAuto, setAggiornaScadenzaAuto] = useState<boolean>(true);
  const [ripetiAnniSuccessivi, setRipetiAnniSuccessivi] = useState<boolean>(true);
  const [pagamentoEffettuato, setPagamentoEffettuato] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Stato per feedback ed errori visibili all'utente
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Scroll to top quando il modal o il tab si apre
  useEffect(() => {
    if (isOpen && modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
  }, [isOpen, activeTab]);

  // Centri Revisioni sincronizzati con il Menu Comune e le officine salvate
  const centriRevisioniSalvati = useMemo(() => {
    const list = new Set<string>();
    // 1. Centri Revisioni specifici registrati nel Menu Comune
    (officineAnagrafica || [])
      .filter((o) => o.tipo === 'Centro Revisioni')
      .forEach((o) => list.add(o.nome.trim()));
    // 2. Officine salvate che contengono 'revision', 'mctc' o 'collaud'
    (officineSalvate || []).forEach((o) => {
      const lower = o.toLowerCase();
      if (lower.includes('revision') || lower.includes('mctc') || lower.includes('collaud')) {
        list.add(o.trim());
      }
    });
    // 3. Centri predefiniti autorizzati MCTC
    [
      'Centro Revisioni Autorizzato MCTC',
      'Motorizzazione Civile (MCTC)',
      'Centro Revisioni DEKRA',
      'Centro Collaudi e Revisioni Ministeriali',
    ].forEach((c) => list.add(c));
    // 4. Tutte le officine presenti nel Menu Comune
    (officineAnagrafica || []).forEach((o) => list.add(o.nome.trim()));
    // 5. Tutte le officine salvate generali
    (officineSalvate || []).forEach((o) => list.add(o.trim()));
    return Array.from(list).filter(Boolean);
  }, [officineAnagrafica, officineSalvate]);

  const currentFrequenza = useMemo(() => {
    return tipoPagamento === 'Assicurazione'
      ? modalitaAssicurazione
      : tipoPagamento === 'Revisione'
      ? frequenzaRevisione
      : 'Annuale';
  }, [tipoPagamento, modalitaAssicurazione, frequenzaRevisione]);

  // Verifica se il veicolo ha già una scadenza salvata per la tipologia corrente
  const hasCurrentVehicleDeadline = useMemo(() => {
    if (!veicolo) return false;
    if (tipoPagamento === 'Bollo') return !!veicolo.scadenzaBollo;
    if (tipoPagamento === 'Revisione') return !!veicolo.scadenzaRevisione;
    if (tipoPagamento === 'Assicurazione') return !!veicolo.scadenzaAssicurazione;
    return false;
  }, [veicolo, tipoPagamento]);

  // Carica i dati attuali della scheda veicolo (per visualizzare e aggiornare la scheda attuale)
  const loadCurrentVehicleData = (tipo: TipoPagamentoScadenza) => {
    setTipoPagamento(tipo);
    setIsCurrentCardMode(true);
    setValidationError(null);
    setPagamentoEffettuato(false); // MAI spuntato di default nelle prossime scadenze!

    const today = new Date().toISOString().slice(0, 10);
    setDataPagamento(today);
    setNote('');
    setFotoRicevutaUrl('');
    setAllegati([]);

    // Determina la scadenza effettiva per questa tipologia:
    // "LA SCADENZA FUTURA DEVE LEGGERE QUELLA PRECEDENTE PUNTO.3 ED INSERIRLA AL PUNTO 1"
    const eff = getEffectiveUpcomingDeadline(veicolo, tipo, allRecords || []);

    if (eff.existingPendingRecord) {
      setCurrentEditingRecord(eff.existingPendingRecord);
      if (eff.existingPendingRecord.note) setNote(eff.existingPendingRecord.note);
    } else {
      setCurrentEditingRecord(null);
    }

    setPagamentoEffettuato(false);
    setEnteOCompagnia(eff.enteOCompagnia);
    setNumeroPolizza(eff.numeroPolizza || '');
    setImporto(eff.importo > 0 ? eff.importo.toString() : '');

    // 1. Data Scadenza Originale (letta da Punto 3 della quietanza precedente se saldata!)
    const baseScad = toIsoDate(eff.dataScadenza);
    setDataScadenza(baseScad);

    // 3. Nuova Scadenza Futura
    const nextScad = toIsoDate(eff.prossimaScadenza);
    setFuturaScadenza(nextScad);

    if (tipo === 'Bollo') {
      setPagabileEntroBollo(eff.pagabileEntro || computeBolloPagabileEntro(baseScad));
    } else if (tipo === 'Revisione') {
      setFrequenzaRevisione(eff.frequenza);
      setPagabileEntroBollo('');
    } else if (tipo === 'Assicurazione') {
      setModalitaAssicurazione(eff.frequenza);
      setPagabileEntroBollo('');
    }
  };

  const handleCopyPaymentCard = () => {
    setIsLocalCopy(true);
    setCurrentEditingRecord(null);
    setIsCurrentCardMode(false);
    setDataPagamento(new Date().toISOString().slice(0, 10));
    setSuccessMessage('📋 Scheda copiata! Puoi modificare i dati e cliccare su Salva per creare una nuova registrazione indipendente.');
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const resetToEmptyPayment = () => {
    const today = new Date().toISOString().slice(0, 10);
    setDataPagamento(today);
    setDataScadenza(today);
    const nextScad = computeNextDeadlineDate(today, currentFrequenza);
    setFuturaScadenza(nextScad);
    setPagabileEntroBollo(computeBolloPagabileEntro(today));
    setImporto('');
    setEnteOCompagnia('');
    setNumeroPolizza('');
    setFotoRicevutaUrl('');
    setAllegati([]);
    setNote('');
    setPagamentoEffettuato(false); // MAI spuntato di default per i nuovi pagamenti!
    setIsCurrentCardMode(false);
    setCurrentEditingRecord(null);
  };

  // Lista di tutti i pagamenti registrati per questo veicolo
  const veicoloPayments = useMemo(() => {
    if (!allRecords || !veicolo) return [];
    return allRecords
      .filter((r) => r.veicoloId === veicolo.id && (r.tipo === 'Pagamento Scadenza' || !!r.registroPagamento))
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [allRecords, veicolo]);

  const filteredPayments = useMemo(() => {
    if (filterStorico === 'Tutti') return veicoloPayments;
    return veicoloPayments.filter(
      (p) => p.registroPagamento?.tipoPagamento === filterStorico || p.titolo.toLowerCase().includes(filterStorico.toLowerCase())
    );
  }, [veicoloPayments, filterStorico]);

  // Inizializza i campi quando il modal si apre o quando cambia editingRecord / initialMode
  useEffect(() => {
    if (!isOpen || !veicolo) return;

    setValidationError(null);
    setSuccessMessage(null);
    setDeleteConfirmId(null);
    setIsLocalCopy(!!isCopyMode);

    if (initialTab) {
      setActiveTab(initialTab);
    } else {
      setActiveTab('nuovo');
    }

    if (initialMode === 'current_card') {
      // APERTURA DA SEZIONE PROSSIME SCADENZE:
      // Questa sezione è INDIPENDENTE dai pagamenti già saldati nello storico.
      // Il check NON deve essere già attivo!
      setIsCurrentCardMode(true);
      const targetTipo = initialTipoPagamento || 'Bollo';
      setTipoPagamento(targetTipo);
      loadCurrentVehicleData(targetTipo);
    } else if (editingRecord && initialMode === 'history_record') {
      // MODIFICA DI UN RECORD SPECIFICO DELLO STORICO PAGAMENTI
      setIsCurrentCardMode(false);
      setCurrentEditingRecord(editingRecord);
      const reg = editingRecord.registroPagamento;
      if (reg) {
        setTipoPagamento(reg.tipoPagamento);
        setDataPagamento(isCopyMode ? new Date().toISOString().slice(0, 10) : toIsoDate(reg.dataPagamento || editingRecord.data));
        const originalScad = toIsoDate(reg.dataScadenza);
        setDataScadenza(originalScad);
        const freq = reg.frequenza || (reg.tipoPagamento === 'Assicurazione' ? modalitaAssicurazione : reg.tipoPagamento === 'Revisione' ? frequenzaRevisione : 'Annuale');
        const nextScad = reg.prossimaScadenza
          ? toIsoDate(reg.prossimaScadenza)
          : computeNextDeadlineDate(originalScad, freq);
        setFuturaScadenza(nextScad);
        setImporto(reg.importo ? reg.importo.toString() : editingRecord.costo.toString());
        setEnteOCompagnia(reg.enteOCompagnia || '');
        setNumeroPolizza(reg.numeroPolizza || '');
        setNote(reg.note || editingRecord.note || '');
        setPagamentoEffettuato(reg.pagato !== undefined ? reg.pagato : true);
        if (reg.frequenza) {
          if (reg.tipoPagamento === 'Assicurazione') setModalitaAssicurazione(reg.frequenza);
          if (reg.tipoPagamento === 'Revisione') setFrequenzaRevisione(reg.frequenza);
        }
        if (reg.pagabileEntro) {
          setPagabileEntroBollo(reg.pagabileEntro);
        } else if (reg.tipoPagamento === 'Bollo' && reg.dataScadenza) {
          setPagabileEntroBollo(computeBolloPagabileEntro(reg.dataScadenza));
        }
      } else {
        setDataPagamento(isCopyMode ? new Date().toISOString().slice(0, 10) : toIsoDate(editingRecord.data));
        setDataScadenza(toIsoDate(editingRecord.data));
        setFuturaScadenza(computeNextDeadlineDate(toIsoDate(editingRecord.data), currentFrequenza));
        setImporto(editingRecord.costo ? editingRecord.costo.toString() : '');
        setPagamentoEffettuato(true);
      }
      setFotoRicevutaUrl(editingRecord.fotoRicevutaUrl || '');
      if (editingRecord.allegati && editingRecord.allegati.length > 0) {
        setAllegati(editingRecord.allegati);
      } else if (editingRecord.fotoRicevutaUrl) {
        setAllegati([{
          id: `att-edit-${Date.now()}`,
          nome: editingRecord.fotoRicevutaUrl.toLowerCase().includes('.pdf') ? 'Documento_Quietanza.pdf' : 'Ricevuta.jpg',
          url: editingRecord.fotoRicevutaUrl,
          tipo: editingRecord.fotoRicevutaUrl.toLowerCase().includes('.pdf') ? 'pdf' : 'image',
          dataCaricamento: editingRecord.createdAt || new Date().toISOString(),
        }]);
      } else {
        setAllegati([]);
      }
    } else if (isCopyMode && editingRecord) {
      setIsCurrentCardMode(false);
      setCurrentEditingRecord(null);
      const reg = editingRecord.registroPagamento;
      if (reg) {
        setTipoPagamento(reg.tipoPagamento);
        setDataPagamento(new Date().toISOString().slice(0, 10));
        setDataScadenza(toIsoDate(reg.dataScadenza));
        setFuturaScadenza(computeNextDeadlineDate(toIsoDate(reg.dataScadenza), reg.frequenza || 'Annuale'));
        setImporto(reg.importo ? reg.importo.toString() : '');
        setEnteOCompagnia(reg.enteOCompagnia || '');
        setNumeroPolizza(reg.numeroPolizza || '');
        setPagamentoEffettuato(false); // Check NON attivo!
      }
    } else {
      const targetTipo = initialTipoPagamento || 'Bollo';
      setTipoPagamento(targetTipo);
      setIsCurrentCardMode(false);
      resetToEmptyPayment();
    }
  }, [isOpen, editingRecord?.id, veicolo?.id, initialMode, initialTipoPagamento, initialTab, isCopyMode]);

  // Funzione per il pulsante "+ Nuovo" nel Registro Pagamenti
  const handleResetForNewPayment = () => {
    setCurrentEditingRecord(null);
    setIsCurrentCardMode(false);
    setActiveTab('nuovo');
    resetToEmptyPayment();
    setValidationError(null);
    setSuccessMessage('Modulo pronto per inserire un nuovo pagamento.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Funzione per copiare i valori attuali della scheda auto se si è in modalità nuovo pagamento
  const handlePrecompileFromVehicle = () => {
    loadCurrentVehicleData(tipoPagamento);
    setSuccessMessage('Dati correnti del veicolo caricati.');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  // Cambio tipo di pagamento (Bollo / Revisione / Assicurazione)
  const handleTipoChange = (newTipo: TipoPagamentoScadenza) => {
    setTipoPagamento(newTipo);
    setValidationError(null);
    if (isCurrentCardMode) {
      loadCurrentVehicleData(newTipo);
    } else if (!currentEditingRecord) {
      resetToEmptyPayment();
    }
  };

  // Elimina la scheda scadenza dal veicolo (es. elimina bollo, revisione, assicurazione)
  const handleDeleteCurrentVehicleCard = () => {
    if (!onDeleteVehicleDeadline || !veicolo) return;
    onDeleteVehicleDeadline(veicolo.id, tipoPagamento);
    setSuccessMessage(`✓ Scheda ${tipoPagamento} eliminata dal veicolo.`);
    setTimeout(() => {
      onClose();
    }, 700);
  };

  // Carica un record esistente per modificarlo
  const handleEditExistingPayment = (item: InterventoRecord) => {
    setCurrentEditingRecord(item);
    setIsCurrentCardMode(false);
    setIsLocalCopy(false);
    setActiveTab('nuovo');
    const reg = item.registroPagamento;
    if (reg) {
      setTipoPagamento(reg.tipoPagamento);
      setDataPagamento(toIsoDate(reg.dataPagamento || item.data));
      const originalScad = toIsoDate(reg.dataScadenza);
      setDataScadenza(originalScad);
      const freq = reg.frequenza || (reg.tipoPagamento === 'Assicurazione' ? modalitaAssicurazione : reg.tipoPagamento === 'Revisione' ? frequenzaRevisione : 'Annuale');
      const nextScad = reg.prossimaScadenza
        ? toIsoDate(reg.prossimaScadenza)
        : computeNextDeadlineDate(originalScad, freq);
      setFuturaScadenza(nextScad);
      setImporto(reg.importo ? reg.importo.toString() : item.costo.toString());
      setEnteOCompagnia(reg.enteOCompagnia || '');
      setNumeroPolizza(reg.numeroPolizza || '');
      setNote(reg.note || item.note || '');
      setPagamentoEffettuato(reg.pagato !== undefined ? reg.pagato : true);
      if (reg.pagabileEntro) setPagabileEntroBollo(reg.pagabileEntro);
    } else {
      setDataPagamento(toIsoDate(item.data));
      setDataScadenza(toIsoDate(item.data));
      setFuturaScadenza(computeNextDeadlineDate(toIsoDate(item.data), currentFrequenza));
      setImporto(item.costo ? item.costo.toString() : '');
      setNote(item.note || '');
    }
    setFotoRicevutaUrl(item.fotoRicevutaUrl || '');
    if (item.allegati && item.allegati.length > 0) {
      setAllegati(item.allegati);
    } else if (item.fotoRicevutaUrl) {
      setAllegati([{
        id: `att-hist-${Date.now()}`,
        nome: item.fotoRicevutaUrl.toLowerCase().includes('.pdf') ? 'Documento_Quietanza.pdf' : 'Ricevuta.jpg',
        url: item.fotoRicevutaUrl,
        tipo: item.fotoRicevutaUrl.toLowerCase().includes('.pdf') ? 'pdf' : 'image',
        dataCaricamento: item.createdAt || new Date().toISOString(),
      }]);
    } else {
      setAllegati([]);
    }
    setSuccessMessage(`Modifica pagamento del ${formatDateIt(item.data)}`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Elimina un pagamento dallo storico
  const handleDeletePayment = (id: string) => {
    if (onDeleteRecord) {
      onDeleteRecord(id);
      setDeleteConfirmId(null);
      setSuccessMessage('Pagamento eliminato dallo storico.');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // 1. Quando l'utente modifica la data di scadenza originale:
  // Calcola AUTOMATICAMENTE la futura data di scadenza (senza dover cliccare su applica!)
  const handleDataScadenzaOriginaleChange = (newScadenza: string) => {
    const iso = toIsoDate(newScadenza);
    setDataScadenza(iso);
    const next = computeNextDeadlineDate(iso, currentFrequenza);
    if (next) {
      setFuturaScadenza(next);
      if (tipoPagamento === 'Bollo') {
        setPagabileEntroBollo(computeBolloPagabileEntro(iso));
      }
    }
  };

  // 2. Nella stessa cella, l'utente può inserire o modificare la data in manuale
  const handleFuturaScadenzaChange = (newFutura: string) => {
    const iso = toIsoDate(newFutura);
    setFuturaScadenza(iso);
  };

  // 3. Quando l'utente modifica la data di pagamento effettivo:
  // La data di pagamento può essere diversa dalla scadenza e NON altera la scadenza originale o futura!
  const handleDataPagamentoChange = (newDate: string) => {
    const iso = toIsoDate(newDate);
    setDataPagamento(iso);
  };

  const handleModalitaAssicChange = (val: string) => {
    setModalitaAssicurazione(val);
    const base = dataScadenza || new Date().toISOString().slice(0, 10);
    const next = computeNextDeadlineDate(base, val);
    if (next) setFuturaScadenza(next);
  };

  const handleFrequenzaRevChange = (val: string) => {
    setFrequenzaRevisione(val);
    const base = dataScadenza || new Date().toISOString().slice(0, 10);
    const next = computeNextDeadlineDate(base, val);
    if (next) setFuturaScadenza(next);
  };

  // Proiezione scadenze future
  const futureDeadlines = useMemo(() => {
    const base = futuraScadenza || dataScadenza;
    return computeFutureDeadlinesSeries(base, tipoPagamento, currentFrequenza, 3);
  }, [futuraScadenza, dataScadenza, tipoPagamento, currentFrequenza]);

  // Regola di ricorrenza per Google Calendar: ricorrenza ogni anno come richiesto
  const recurrenceRRule = useMemo(() => {
    if (!ripetiAnniSuccessivi) return undefined;
    return 'RRULE:FREQ=YEARLY';
  }, [ripetiAnniSuccessivi]);

  const calendarTitle = `🚗 [${veicolo.targa}] Scadenza ${tipoPagamento}: ${veicolo.marca} ${veicolo.modello}`;
  const calendarDesc = `Promemoria scadenza ${tipoPagamento} per ${veicolo.proprietario || 'veicolo'} - Targa: ${veicolo.targa}. ${
    tipoPagamento === 'Bollo' && pagabileEntroBollo ? `Pagabile entro: ${pagabileEntroBollo}.` : ''
  } Importo: ${importo ? `${importo} €` : 'N/D'}. Note: ${enteOCompagnia || ''} ${numeroPolizza ? `Polizza: ${numeroPolizza}` : ''}`;

  // Salvataggio sicuro e garantito nel database e nello stato
  const handleSaveProcess = () => {
    setValidationError(null);

    const dataPagamentoFinale = dataPagamento.trim() || new Date().toISOString().slice(0, 10);
    const dataScadenzaOriginaleFinale = dataScadenza.trim();
    const futuraScadenzaFinale =
      futuraScadenza.trim() || computeNextDeadlineDate(dataScadenzaOriginaleFinale, currentFrequenza);

    if (!dataScadenzaOriginaleFinale) {
      setValidationError('Inserisci una data di scadenza valida.');
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const currentYearMonth = todayStr.slice(0, 7);
    const scadYearMonth = dataScadenzaOriginaleFinale.slice(0, 7);

    // Regola Scadenza: consentito quando siamo nello stesso mese della scadenza o in un mese successivo
    if (pagamentoEffettuato && scadYearMonth > currentYearMonth) {
      setValidationError(
        `Impossibile registrare il pagamento: la scadenza (${formatDateIt(
          dataScadenzaOriginaleFinale
        )}) è in un mese futuro rispetto a quello attuale. È possibile registrare il pagamento a partire dal mese della scadenza.`
      );
      return;
    }

    const costoNumerico = parseFloat(importo) || (tipoPagamento === 'Bollo' ? (veicolo.importoBollo || 0) : 0);
    const finalTitle = pagamentoEffettuato
      ? `Pagamento ${tipoPagamento} (Saldato) - ${enteOCompagnia || veicolo.targa}`
      : `Scadenza ${tipoPagamento} (In attesa) - ${veicolo.targa}`;

    const registroPagamento: RegistroPagamentoData = {
      tipoPagamento,
      dataPagamento: dataPagamentoFinale,
      dataScadenza: dataScadenzaOriginaleFinale,
      prossimaScadenza: futuraScadenzaFinale,
      importo: costoNumerico,
      frequenza: currentFrequenza,
      pagabileEntro:
        tipoPagamento === 'Bollo'
          ? (pagabileEntroBollo || computeBolloPagabileEntro(pagamentoEffettuato ? futuraScadenzaFinale : dataScadenzaOriginaleFinale))
          : undefined,
      enteOCompagnia: enteOCompagnia.trim() || undefined,
      numeroPolizza: numeroPolizza.trim() || undefined,
      note: note.trim() || undefined,
      pagato: pagamentoEffettuato,
    };

    const isNew = isCopyMode || isLocalCopy || !currentEditingRecord;

    try {
      if (isCurrentCardMode && pagamentoEffettuato) {
        // ============================================================
        // 1. STATO PAGAMENTO EFFETTUATO DA SEZIONE PROSSIME SCADENZE:
        //    A) Registra questo pagamento nello Storico Pagamenti (Saldato)
        //    B) Crea AUTOMATICAMENTE la NUOVA SCHEDA per la successiva scadenza (In Attesa, check NON attivo)
        //       con gli stessi dati (importo, frequenza, ente/compagnia, polizza)
        //    C) Aggiorna la scadenza del veicolo alla nuova scadenza futura
        // ============================================================
        const completedRecordId = isNew ? `rec-pag-${Date.now()}` : currentEditingRecord.id;
        const completedTitle = `Pagamento ${tipoPagamento} (Saldato) - ${enteOCompagnia || veicolo.targa}`;

        const completedRegistro: RegistroPagamentoData = {
          tipoPagamento,
          dataPagamento: dataPagamentoFinale,
          dataScadenza: dataScadenzaOriginaleFinale,
          prossimaScadenza: futuraScadenzaFinale,
          importo: costoNumerico,
          frequenza: currentFrequenza,
          pagabileEntro:
            tipoPagamento === 'Bollo'
              ? (pagabileEntroBollo || computeBolloPagabileEntro(dataScadenzaOriginaleFinale))
              : undefined,
          enteOCompagnia: enteOCompagnia.trim() || undefined,
          numeroPolizza: numeroPolizza.trim() || undefined,
          note: note.trim() || undefined,
          pagato: true,
        };

        const completedRecordToSave: InterventoRecord = {
          id: completedRecordId,
          veicoloId: veicolo.id,
          tipo: 'Pagamento Scadenza',
          titolo: completedTitle,
          data: dataPagamentoFinale,
          km: veicolo.kmAttuali || 0,
          costo: costoNumerico,
          officina: tipoPagamento === 'Revisione' && enteOCompagnia.trim() ? enteOCompagnia.trim() : undefined,
          lavorazioniSelezionate: [
            {
              lavorazioneId: `lav-pag-${tipoPagamento.toLowerCase()}`,
              nome: `${tipoPagamento.toUpperCase()}`,
              categoria: '4. CARROZZERIA, COMFORT E SERVIZI EXTRA',
              sottocategoria: 'Registro Scadenze e Pagamenti',
            },
          ],
          registroPagamento: completedRegistro,
          fotoRicevutaUrl: allegati[0]?.url || fotoRicevutaUrl || undefined,
          allegati: allegati.length > 0 ? allegati : undefined,
          haPromemoria: false,
          note: `Scadenza saldata: ${formatDateIt(dataScadenzaOriginaleFinale)} • Versamento effettuato il: ${formatDateIt(dataPagamentoFinale)} • Nuova scadenza: ${formatDateIt(futuraScadenzaFinale)} ${
            completedRegistro.pagabileEntro ? `• Pagabile entro: ${completedRegistro.pagabileEntro}` : ''
          } • Ente/Compagnia: ${enteOCompagnia || 'N/D'}`,
          createdAt: isNew ? new Date().toISOString() : (currentEditingRecord?.createdAt || new Date().toISOString()),
        };

        // Salva la ricevuta / pagamento effettuato nello Storico Pagamenti
        onSaveRecord(completedRecordToSave);

        // Se è una revisione con centro revisioni, sincronizza subito nel Menu Comune
        if (tipoPagamento === 'Revisione' && enteOCompagnia.trim() && onAddNewOfficina) {
          onAddNewOfficina(enteOCompagnia.trim(), 'Centro Revisioni');
        }

        // B) CREA LA NUOVA SCHEDA PER LA PROSSIMA SCADENZA (IN ATTESA, CHECK DISATTIVO)
        //    Identica alla corrente (costo, frequenza, ente/compagnia, polizza) ma con:
        //    dataScadenza = futuraScadenzaFinale, pagato = false, check non attivo, nessun allegato quietanza vecchio
        const nextSubsequentDeadline = computeNextDeadlineDate(futuraScadenzaFinale, currentFrequenza);
        const newPendingRecordId = `rec-pag-${Date.now() + 50}`;
        const newPendingTitle = `Scadenza ${tipoPagamento} (In attesa) - ${veicolo.targa}`;

        const newPendingRegistro: RegistroPagamentoData = {
          tipoPagamento,
          dataPagamento: '',
          dataScadenza: futuraScadenzaFinale,
          prossimaScadenza: nextSubsequentDeadline,
          importo: costoNumerico,
          frequenza: currentFrequenza,
          pagabileEntro:
            tipoPagamento === 'Bollo'
              ? computeBolloPagabileEntro(futuraScadenzaFinale)
              : undefined,
          enteOCompagnia: enteOCompagnia.trim() || undefined,
          numeroPolizza: numeroPolizza.trim() || undefined,
          note: undefined,
          pagato: false, // IN ATTESA! Check non attivo!
        };

        const newPendingRecordToSave: InterventoRecord = {
          id: newPendingRecordId,
          veicoloId: veicolo.id,
          tipo: 'Pagamento Scadenza',
          titolo: newPendingTitle,
          data: futuraScadenzaFinale,
          km: veicolo.kmAttuali || 0,
          costo: costoNumerico,
          officina: tipoPagamento === 'Revisione' && enteOCompagnia.trim() ? enteOCompagnia.trim() : undefined,
          lavorazioniSelezionate: [
            {
              lavorazioneId: `lav-pag-${tipoPagamento.toLowerCase()}`,
              nome: `${tipoPagamento.toUpperCase()}`,
              categoria: '4. CARROZZERIA, COMFORT E SERVIZI EXTRA',
              sottocategoria: 'Registro Scadenze e Pagamenti',
            },
          ],
          registroPagamento: newPendingRegistro,
          haPromemoria: true,
          dataPromemoria: futuraScadenzaFinale,
          note: `Prossima scadenza: ${formatDateIt(futuraScadenzaFinale)} • In attesa di pagamento • Ente/Compagnia: ${enteOCompagnia || 'N/D'}`,
          createdAt: new Date().toISOString(),
        };

        // Inserisce la nuova scheda in attesa nelle Prossime Scadenze
        onSaveRecord(newPendingRecordToSave);

        // C) Aggiorna la scadenza nella scheda del veicolo
        if (aggiornaScadenzaAuto && onUpdateVehicleDeadline) {
          onUpdateVehicleDeadline(
            veicolo.id,
            tipoPagamento,
            futuraScadenzaFinale,
            costoNumerico,
            enteOCompagnia.trim()
          );
        }

        setSuccessMessage(
          `✓ Pagamento registrato come SALDATO nello Storico! Creata nuova scheda indipendente per la Prossima Scadenza (${formatDateIt(futuraScadenzaFinale)}) con stato 'In attesa' e check disattivo.`
        );
        setTimeout(() => {
          onClose();
        }, 1200);
      } else if (isCurrentCardMode && !pagamentoEffettuato) {
        // ============================================================
        // 2. STATO IN ATTESA DI PAGAMENTO (Modifica o Registra Scheda Prossima Scadenza):
        //    Aggiorna i dati della scadenza (senza creare pagamenti saldati fittizi nello storico)
        // ============================================================
        const pendingRecordId = isNew ? `rec-pag-${Date.now()}` : currentEditingRecord.id;
        const pendingTitle = `Scadenza ${tipoPagamento} (In attesa) - ${veicolo.targa}`;

        const pendingRegistro: RegistroPagamentoData = {
          tipoPagamento,
          dataPagamento: '',
          dataScadenza: dataScadenzaOriginaleFinale,
          prossimaScadenza: futuraScadenzaFinale,
          importo: costoNumerico,
          frequenza: currentFrequenza,
          pagabileEntro:
            tipoPagamento === 'Bollo'
              ? (pagabileEntroBollo || computeBolloPagabileEntro(dataScadenzaOriginaleFinale))
              : undefined,
          enteOCompagnia: enteOCompagnia.trim() || undefined,
          numeroPolizza: numeroPolizza.trim() || undefined,
          note: note.trim() || undefined,
          pagato: false,
        };

        const pendingRecordToSave: InterventoRecord = {
          id: pendingRecordId,
          veicoloId: veicolo.id,
          tipo: 'Pagamento Scadenza',
          titolo: pendingTitle,
          data: dataScadenzaOriginaleFinale,
          km: veicolo.kmAttuali || 0,
          costo: costoNumerico,
          officina: tipoPagamento === 'Revisione' && enteOCompagnia.trim() ? enteOCompagnia.trim() : undefined,
          lavorazioniSelezionate: [
            {
              lavorazioneId: `lav-pag-${tipoPagamento.toLowerCase()}`,
              nome: `${tipoPagamento.toUpperCase()}`,
              categoria: '4. CARROZZERIA, COMFORT E SERVIZI EXTRA',
              sottocategoria: 'Registro Scadenze e Pagamenti',
            },
          ],
          registroPagamento: pendingRegistro,
          haPromemoria: true,
          dataPromemoria: dataScadenzaOriginaleFinale,
          note: `Scadenza: ${formatDateIt(dataScadenzaOriginaleFinale)} • In attesa di pagamento • Ente/Compagnia: ${enteOCompagnia || 'N/D'}`,
          createdAt: isNew ? new Date().toISOString() : (currentEditingRecord?.createdAt || new Date().toISOString()),
        };

        onSaveRecord(pendingRecordToSave);

        if (tipoPagamento === 'Revisione' && enteOCompagnia.trim() && onAddNewOfficina) {
          onAddNewOfficina(enteOCompagnia.trim(), 'Centro Revisioni');
        }

        if (aggiornaScadenzaAuto && onUpdateVehicleDeadline) {
          onUpdateVehicleDeadline(
            veicolo.id,
            tipoPagamento,
            dataScadenzaOriginaleFinale,
            costoNumerico,
            enteOCompagnia.trim()
          );
        }

        setSuccessMessage(
          `✓ Scheda Prossima Scadenza ${tipoPagamento} aggiornata (stato: in attesa di pagamento, check disattivo).`
        );
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        // ============================================================
        // 3. MODIFICA DI UN RECORD STORICO O NUOVO RECORD MANUALE:
        //    Modifica ESCLUSIVAMENTE questo record nello storico (completamente indipendente dalle scadenze future del veicolo!)
        // ============================================================
        const targetId = isNew ? `rec-pag-${Date.now()}` : currentEditingRecord!.id;
        const targetTitle = pagamentoEffettuato
          ? `Pagamento ${tipoPagamento} (Saldato) - ${enteOCompagnia || veicolo.targa}`
          : `Scadenza ${tipoPagamento} (In attesa) - ${veicolo.targa}`;

        const updatedRegistro: RegistroPagamentoData = {
          tipoPagamento,
          dataPagamento: pagamentoEffettuato ? dataPagamentoFinale : '',
          dataScadenza: dataScadenzaOriginaleFinale,
          prossimaScadenza: futuraScadenzaFinale,
          importo: costoNumerico,
          frequenza: currentFrequenza,
          pagabileEntro:
            tipoPagamento === 'Bollo'
              ? (pagabileEntroBollo || computeBolloPagabileEntro(dataScadenzaOriginaleFinale))
              : undefined,
          enteOCompagnia: enteOCompagnia.trim() || undefined,
          numeroPolizza: numeroPolizza.trim() || undefined,
          note: note.trim() || undefined,
          pagato: pagamentoEffettuato,
        };

        const updatedRecordToSave: InterventoRecord = {
          id: targetId,
          veicoloId: veicolo.id,
          tipo: 'Pagamento Scadenza',
          titolo: targetTitle,
          data: pagamentoEffettuato ? dataPagamentoFinale : dataScadenzaOriginaleFinale,
          km: veicolo.kmAttuali || 0,
          costo: costoNumerico,
          officina: tipoPagamento === 'Revisione' && enteOCompagnia.trim() ? enteOCompagnia.trim() : undefined,
          lavorazioniSelezionate: [
            {
              lavorazioneId: `lav-pag-${tipoPagamento.toLowerCase()}`,
              nome: `${tipoPagamento.toUpperCase()}`,
              categoria: '4. CARROZZERIA, COMFORT E SERVIZI EXTRA',
              sottocategoria: 'Registro Scadenze e Pagamenti',
            },
          ],
          registroPagamento: updatedRegistro,
          fotoRicevutaUrl: allegati[0]?.url || fotoRicevutaUrl || undefined,
          allegati: allegati.length > 0 ? allegati : undefined,
          haPromemoria: !pagamentoEffettuato,
          dataPromemoria: !pagamentoEffettuato ? dataScadenzaOriginaleFinale : undefined,
          note: note.trim() || undefined,
          createdAt: isNew ? new Date().toISOString() : (currentEditingRecord?.createdAt || new Date().toISOString()),
        };

        onSaveRecord(updatedRecordToSave);

        if (tipoPagamento === 'Revisione' && enteOCompagnia.trim() && onAddNewOfficina) {
          onAddNewOfficina(enteOCompagnia.trim(), 'Centro Revisioni');
        }

        setSuccessMessage(`✓ Registrazione salvata nello Storico Pagamenti (indipendente dalle future scadenze).`);
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err: any) {
      console.error('Errore salvataggio registro pagamenti:', err);
      setValidationError(`Errore durante il salvataggio: ${err?.message || 'Riprova'}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/85 backdrop-blur-sm sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[95vh] flex flex-col bg-[#111827] text-white rounded-t-3xl sm:rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-blue-700 px-5 py-4 flex items-center justify-between text-white shadow-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {isLocalCopy || isCopyMode
                  ? `Nuova Copia: ${tipoPagamento}`
                  : (isCurrentCardMode || currentEditingRecord)
                  ? `Modifica Pagamento: ${tipoPagamento}`
                  : 'Registro Pagamenti'}
              </h2>
              <p className="text-xs text-emerald-200 font-mono">
                {veicolo.marca} {veicolo.modello} • <span className="font-bold">{veicolo.targa}</span>
                {veicolo.proprietario && (
                  <span className="text-emerald-100 font-sans font-medium"> • Proprietario: {veicolo.proprietario}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {(isCurrentCardMode || currentEditingRecord) && !isLocalCopy && !isCopyMode && (
              <button
                type="button"
                onClick={handleCopyPaymentCard}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm active:scale-95"
                title="Copia scheda (crea nuova scheda modificabile)"
              >
                <Copy size={14} />
                <span>Copia</span>
              </button>
            )}

            {/* Elimina scheda */}
            {!isLocalCopy && !isCopyMode && (
              currentEditingRecord && onDeleteRecord ? (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Eliminare definitivamente questa registrazione di ${tipoPagamento}?`)) {
                      onDeleteRecord(currentEditingRecord.id);
                      onClose();
                    }
                  }}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer active:scale-95 shadow-sm"
                  title="Elimina scheda"
                >
                  <Trash2 size={14} />
                  <span>Elimina</span>
                </button>
              ) : isCurrentCardMode && hasCurrentVehicleDeadline && onDeleteVehicleDeadline ? (
                <button
                  type="button"
                  onClick={handleDeleteCurrentVehicleCard}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer active:scale-95 shadow-sm"
                  title={`Elimina scheda ${tipoPagamento}`}
                >
                  <Trash2 size={14} />
                  <span>Elimina</span>
                </button>
              ) : null
            )}

            <button
              type="button"
              onClick={handleSaveProcess}
              className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer active:scale-95"
              title="Salva scheda pagamento"
            >
              <Save size={15} />
              <span>Salva</span>
            </button>
          </div>
        </div>

        {/* Banner identificativo per Copia o Modifica */}
        {(isLocalCopy || isCopyMode) ? (
          <div className="px-4 py-2.5 bg-emerald-950/80 border-b border-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Copy size={15} className="text-emerald-400" />
              <span className="text-xs font-bold text-white">Nuova Scheda Copiata (al salva crea una nuova registrazione indipendente)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 border border-emerald-600">Nuovo ID</span>
          </div>
        ) : isCurrentCardMode ? (
          <div className="px-4 py-2.5 bg-gradient-to-r from-amber-950/70 via-[#152033] to-blue-950/70 border-b border-amber-800/60 flex items-center justify-between">
            <span className="text-xs text-amber-200 font-semibold flex items-center gap-1.5">
              <Clock size={13} className="text-amber-400" />
              <span>Scheda Prossima Scadenza: <strong>{tipoPagamento}</strong> • Stato in attesa (Check non attivo)</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/80 text-amber-300 border border-amber-600">In Attesa</span>
          </div>
        ) : currentEditingRecord ? (
          <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">Modifica pagamento storico (indipendente dalle scadenze future)</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">Storico</span>
          </div>
        ) : null}

        {/* Main Tab Navigation: Nuovo/Modifica Pagamento vs Storico Pagamenti */}
        <div className="flex border-b border-slate-800 bg-[#0d1422] px-4 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('nuovo')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'nuovo'
                ? 'border-emerald-500 text-emerald-300 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isCurrentCardMode || currentEditingRecord ? (
              <>
                <Pencil size={14} className={activeTab === 'nuovo' ? 'text-emerald-400' : 'text-slate-500'} />
                <span>Modifica Pagamento</span>
              </>
            ) : (
              <>
                <Plus size={14} className={activeTab === 'nuovo' ? 'text-emerald-400' : 'text-slate-500'} />
                <span>Nuovo Pagamento</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('storico')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'storico'
                ? 'border-emerald-500 text-emerald-300 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History size={14} className={activeTab === 'storico' ? 'text-emerald-400' : 'text-slate-500'} />
            <span>Storico Pagamenti</span>
            {veicoloPayments.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono">
                {veicoloPayments.length}
              </span>
            )}
          </button>
        </div>

        {/* Feedback messaggi di errore o successo */}
        {validationError && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-rose-950/80 border border-rose-500 text-xs text-rose-200 flex items-center gap-2 shrink-0">
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500 text-xs text-emerald-200 flex items-center gap-2 shrink-0">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 1. SEZIONE STORICO PAGAMENTI EFFETTUATI */}
        {activeTab === 'storico' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Filter buttons & + Nuovo CTA */}
            <div className="flex items-center justify-between gap-1 flex-wrap pb-1">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
                {(['Tutti', 'Bollo', 'Revisione', 'Assicurazione'] as const).map((tipo) => {
                  const isSelected = filterStorico === tipo;
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setFilterStorico(tipo)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-400 text-white shadow-sm'
                          : 'bg-[#152033] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tipo}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleResetForNewPayment}
                className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer"
              >
                <Plus size={13} />
                <span>+ Nuovo Pagamento</span>
              </button>
            </div>

            {/* Lista dei pagamenti */}
            {filteredPayments.length === 0 ? (
              <div className="text-center py-14 px-4 bg-[#0d1422] border border-slate-800 rounded-3xl space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400">
                  <CreditCard size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Nessun pagamento registrato</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-0.5">
                    {filterStorico !== 'Tutti'
                      ? `Nessun pagamento registrato per "${filterStorico}".`
                      : 'Non ci sono ancora pagamenti registrati per questo veicolo.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetForNewPayment}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
                >
                  + Inserisci Primo Pagamento
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredPayments.map((p) => {
                  const reg = p.registroPagamento;
                  const tipo = reg?.tipoPagamento || 'Bollo';
                  const isDeleting = deleteConfirmId === p.id;

                  return (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-2xl bg-[#141e2e] border border-slate-800 hover:border-slate-700 transition-all shadow-md relative overflow-hidden space-y-2"
                    >
                      {/* Left accent bar */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                          tipo === 'Bollo'
                            ? 'bg-amber-500'
                            : tipo === 'Revisione'
                            ? 'bg-rose-500'
                            : 'bg-emerald-500'
                        }`}
                      />

                      <div className="flex items-start justify-between gap-3 pl-1.5">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                tipo === 'Bollo'
                                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                                  : tipo === 'Revisione'
                                  ? 'bg-rose-950 text-rose-300 border-rose-800'
                                  : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              }`}
                            >
                              {tipo === 'Bollo' && <CreditCard size={11} />}
                              {tipo === 'Revisione' && <FileCheck size={11} />}
                              {tipo === 'Assicurazione' && <Shield size={11} />}
                              <span>{tipo}</span>
                            </span>

                            {/* STATO DEL PAGAMENTO: Saldato vs In Attesa */}
                            {reg?.pagato !== false ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600 flex items-center gap-1 font-mono">
                                <CheckCircle2 size={11} className="text-emerald-400" />
                                <span>Saldato</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-600 flex items-center gap-1 font-mono">
                                <Clock size={11} className="text-amber-400" />
                                <span>In Attesa</span>
                              </span>
                            )}

                            <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                              <Calendar size={12} className="text-slate-500" />
                              {reg?.pagato !== false ? 'Pagato il:' : 'Data:'} <strong>{formatDateIt(p.data)}</strong>
                            </span>
                          </div>

                          <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                            {p.titolo}
                          </h4>

                          {reg?.dataScadenza && (
                            <div className="text-[11px] text-blue-300 flex items-center gap-1 font-medium">
                              <Clock size={12} className="text-blue-400 shrink-0" />
                              <span>Scadenza: <strong>{formatDateIt(reg.dataScadenza)}</strong></span>
                              {reg.pagabileEntro && (
                                <span className="text-amber-300 font-normal">({reg.pagabileEntro})</span>
                              )}
                            </div>
                          )}

                          {reg?.prossimaScadenza && (
                            <div className="text-[11px] text-emerald-300 flex items-center gap-1 font-medium">
                              <Sparkles size={12} className="text-emerald-400 shrink-0" />
                              <span>Rinnovata fino al: <strong>{formatDateIt(reg.prossimaScadenza)}</strong></span>
                            </div>
                          )}

                          {(reg?.enteOCompagnia || p.officina) && (
                            <p className="text-[11px] text-slate-400">
                              {tipo === 'Assicurazione' ? 'Compagnia: ' : tipo === 'Bollo' ? 'Canale / Ente: ' : 'Presso: '}
                              <strong className="text-slate-300">{reg?.enteOCompagnia || p.officina}</strong>
                              {reg?.numeroPolizza && (
                                <span className="text-slate-400 ml-1.5 font-mono text-[10px]">Polizza: {reg.numeroPolizza}</span>
                              )}
                            </p>
                          )}

                          {p.note && (
                            <p className="text-[11px] text-slate-400 italic">
                              "{p.note}"
                            </p>
                          )}
                        </div>

                        {/* Cost & action buttons */}
                        <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                          <span className="text-sm font-black text-emerald-400 font-mono">
                            {p.costo > 0 ? formatCurrency(p.costo) : '0,00 €'}
                          </span>

                          <div className="flex items-center gap-1.5 mt-2">
                            <button
                              type="button"
                              onClick={() => handleEditExistingPayment(p)}
                              className="p-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-800 transition-colors cursor-pointer"
                              title="Modifica questo pagamento"
                            >
                              <Pencil size={13} />
                            </button>

                            {isDeleting ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeletePayment(p.id)}
                                  className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                                >
                                  Conferma
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-1.5 py-1 rounded-lg bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                                >
                                  Annulla
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(p.id)}
                                className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800 transition-colors cursor-pointer"
                                title="Elimina dallo storico"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Miniatura ricevuta */}
                      {p.fotoRicevutaUrl && (
                        <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                            <Receipt size={12} /> Ricevuta allegata
                          </span>
                          <a
                            href={p.fotoRicevutaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-400 hover:underline font-bold"
                          >
                            Visualizza Ricevuta ↗
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. SEZIONE FORM: NUOVO / MODIFICA PAGAMENTO */}
        {activeTab === 'nuovo' && (
          <>
            {/* Se siamo in MODIFICA (scheda attuale o record esistente), mostra SOLO la scheda corrispondente */}
            {(isCurrentCardMode || currentEditingRecord) ? (
              <div className="p-3.5 bg-[#0d1422] border-b border-slate-800 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 ${
                    tipoPagamento === 'Bollo'
                      ? 'bg-amber-600'
                      : tipoPagamento === 'Revisione'
                      ? 'bg-rose-600'
                      : 'bg-emerald-600'
                  }`}>
                    {tipoPagamento === 'Bollo' && <CreditCard size={18} />}
                    {tipoPagamento === 'Revisione' && <FileCheck size={18} />}
                    {tipoPagamento === 'Assicurazione' && <Shield size={18} />}
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                      <span>Modifica Scheda: {tipoPagamento}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                        Solo Questa Scheda
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Stai modificando esclusivamente i dati e le scadenze di {tipoPagamento}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetForNewPayment}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
                  title="Inserisci un nuovo pagamento pulito"
                >
                  <Plus size={12} />
                  <span>+ Nuovo</span>
                </button>
              </div>
            ) : (
              /* Se siamo in NUOVO PAGAMENTO, mostra la scelta delle 3 tipologie */
              <div className="grid grid-cols-3 gap-1.5 p-3 bg-[#0d1422] border-b border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => handleTipoChange('Bollo')}
                  className={`py-2 px-2 rounded-2xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    tipoPagamento === 'Bollo'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                      : 'bg-[#152033] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CreditCard size={16} />
                  <span>Bollo Auto</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTipoChange('Revisione')}
                  className={`py-2 px-2 rounded-2xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    tipoPagamento === 'Revisione'
                      ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md'
                      : 'bg-[#152033] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCheck size={16} />
                  <span>Revisione</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTipoChange('Assicurazione')}
                  className={`py-2 px-2 rounded-2xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    tipoPagamento === 'Assicurazione'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                      : 'bg-[#152033] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Shield size={16} />
                  <span>Assicurazione</span>
                </button>
              </div>
            )}

            {/* Helper per copiare i dati della scheda auto */}
            <div className="px-4 py-2 bg-[#101726] border-b border-slate-800/80 flex items-center justify-between text-xs shrink-0">
              <span className="text-slate-300 text-[11px] font-semibold flex items-center gap-1.5">
                {isCurrentCardMode ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Scheda Attuale: <strong>{tipoPagamento}</strong></span>
                  </>
                ) : currentEditingRecord ? (
                  <span>Stai modificando un pagamento esistente</span>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    <span>Nuovo Pagamento ({tipoPagamento})</span>
                  </>
                )}
              </span>

              {isCurrentCardMode ? (
                <button
                  type="button"
                  onClick={handleResetForNewPayment}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  title="Inserisci un nuovo pagamento pulito"
                >
                  <Plus size={12} />
                  <span>+ Nuovo Pagamento</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePrecompileFromVehicle}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  title="Copia la scadenza e i costi attuali salvati nella scheda veicolo"
                >
                  <Sparkles size={12} className="text-blue-400" />
                  <span>Copia dati attuali auto</span>
                </button>
              )}
            </div>

            {/* Scrollable Form Content */}
            <div ref={modalScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* CASELLA DI SPUNTA: PAGAMENTO EFFETTUATO / SALDATO (Abilitato nello stesso mese della scadenza o mesi successivi) */}
          {(() => {
            const todayStr = new Date().toISOString().slice(0, 10);
            const scadStr = dataScadenza.trim();
            const currentYearMonth = todayStr.slice(0, 7);
            const scadYearMonth = scadStr.slice(0, 7);
            // Abilitato se siamo nello stesso mese della scadenza o in un mese successivo
            const isPayableSameMonthOrPast = Boolean(scadYearMonth && scadYearMonth <= currentYearMonth);
            const isCurrentMonth = scadYearMonth === currentYearMonth;

            return (
              <div
                onClick={() => {
                  if (!pagamentoEffettuato && !isPayableSameMonthOrPast) {
                    setValidationError(
                      `Non puoi registrare questo pagamento come saldato: la data di scadenza (${formatDateIt(
                        scadStr
                      )}) è in un mese futuro. È possibile registrare il pagamento solo a partire dal mese della scadenza.`
                    );
                    return;
                  }
                  setValidationError(null);
                  setPagamentoEffettuato(!pagamentoEffettuato);
                }}
                className={`p-3.5 rounded-2xl border transition-all select-none ${
                  !isPayableSameMonthOrPast
                    ? 'bg-[#121927] border-slate-800 text-slate-400 cursor-not-allowed opacity-90'
                    : pagamentoEffettuato
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md cursor-pointer'
                    : 'bg-[#152033] border-amber-500/60 text-amber-200 hover:bg-[#1a2942] cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        !isPayableSameMonthOrPast
                          ? 'bg-slate-800 text-slate-500'
                          : pagamentoEffettuato
                          ? 'bg-emerald-500 text-black shadow-sm'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      }`}
                    >
                      <Check size={18} strokeWidth={3} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold block">
                          {pagamentoEffettuato
                            ? '✓ Pagamento Effettuato (Saldato)'
                            : !isPayableSameMonthOrPast
                            ? '🔒 Mese futuro (Check non ancora attivo)'
                            : isCurrentMonth
                            ? '🔔 Scadenza di Questo Mese (Clicca per spuntare Saldato)'
                            : '🔔 Scadenza Raggiunta (Clicca per spuntare Saldato)'}
                        </span>
                        {!isPayableSameMonthOrPast && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                            Scade il {formatDateIt(scadStr)}
                          </span>
                        )}
                        {isCurrentMonth && !pagamentoEffettuato && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                            Mese corrente
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {pagamentoEffettuato
                          ? 'Spuntato: salva con ricevuta e ricalcola la nuova scadenza per aggiornare la scheda auto.'
                          : !isPayableSameMonthOrPast
                          ? `Non puoi registrare il pagamento prima del mese di scadenza. Il check si abiliterà automaticamente nel mese della scadenza.`
                          : 'Siamo nel mese della scadenza: puoi spuntare per registrare il pagamento, allegare la ricevuta e ricalcolare la nuova scadenza.'}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center border shrink-0 ${
                      pagamentoEffettuato
                        ? 'bg-emerald-500 border-emerald-400 text-black'
                        : !isPayableSameMonthOrPast
                        ? 'border-slate-700 bg-slate-800/50'
                        : 'border-amber-400'
                    }`}
                  >
                    {pagamentoEffettuato && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>
              </div>
            );
          })()}
          
          {/* Sezione Date: Data Scadenza Originale, Data Pagamento Effettivo, Nuova Scadenza Futura */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-[#0f1726] border border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. Data Scadenza Originale */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-1 flex items-center justify-between">
                  <span>1. Data Scadenza Originale *</span>
                  <span className="text-[9px] text-slate-400 font-normal">Da rinnovare</span>
                </label>
                <input
                  type="date"
                  value={dataScadenza}
                  onChange={(e) => handleDataScadenzaOriginaleChange(e.target.value)}
                  className="w-full bg-[#172233] border border-amber-500/80 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 font-bold"
                />
              </div>

              {/* 2. Data Pagamento Effettivo */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 mb-1 flex items-center justify-between">
                  <span>2. Data Pagamento Effettivo</span>
                  <span className="text-[9px] text-slate-400 font-normal">Data versamento</span>
                </label>
                <input
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => handleDataPagamentoChange(e.target.value)}
                  className="w-full bg-[#172233] border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            {/* 3. Nuova Scadenza Futura (calcolo automatico da data scadenza originale, ma modificabile a mano nella stessa cella!) */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-500/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-emerald-400" />
                  <span>3. Nuova Scadenza Futura (Automatica o Manuale)</span>
                </label>
                <span className="text-[10px] text-emerald-400 font-bold font-mono">
                  {tipoPagamento === 'Bollo' && '+1 Anno Auto'}
                  {tipoPagamento === 'Revisione' && '+2 Anni Auto'}
                  {tipoPagamento === 'Assicurazione' && modalitaAssicurazione}
                </span>
              </div>

              <input
                type="date"
                value={futuraScadenza}
                onChange={(e) => handleFuturaScadenzaChange(e.target.value)}
                className="w-full bg-[#172233] border border-emerald-500 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-emerald-300 font-black focus:outline-none focus:border-emerald-300 shadow-inner"
              />
              <p className="text-[10px] text-slate-400">
                💡 Calcolata automaticamente dalla data di scadenza originale. Puoi comunque modificarla o inserire una data diversa manualmente in questa stessa cella.
              </p>
            </div>
          </div>

          {/* SPECIFICO BOLLO: CALCOLO AUTOMATICO "PAGABILE ENTRO" */}
          {tipoPagamento === 'Bollo' && (
            <div className="p-3.5 rounded-2xl bg-[#141e2e] border border-amber-500/50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                  PAGABILE ENTRO (Normativa ACI)
                </label>
                <span className="text-[10px] text-amber-300/80 font-mono">
                  Mese successivo alla scadenza
                </span>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  value={pagabileEntroBollo}
                  onChange={(e) => setPagabileEntroBollo(e.target.value)}
                  placeholder="es. Tutto Maggio 2026"
                  className="w-full bg-[#1a2538] border border-amber-500/70 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-amber-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="p-2 rounded-xl bg-[#0a101b] border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                <span>
                  💡 Calcolato: <strong>{computeBolloPagabileEntro(pagamentoEffettuato ? (futuraScadenza || dataScadenza) : dataScadenza)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setPagabileEntroBollo(computeBolloPagabileEntro(pagamentoEffettuato ? (futuraScadenza || dataScadenza) : dataScadenza))}
                  className="px-2 py-0.5 rounded-lg bg-amber-600/30 hover:bg-amber-600 text-amber-200 hover:text-white font-bold text-[10px] border border-amber-500/40 cursor-pointer"
                >
                  Aggiorna
                </button>
              </div>
            </div>
          )}

          {/* SPECIFICO ASSICURAZIONE: MODALITÀ DI PAGAMENTO */}
          {tipoPagamento === 'Assicurazione' && (
            <div className="p-3.5 rounded-2xl bg-[#152033] border border-purple-500/40 space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">
                MODALITÀ DI PAGAMENTO
              </label>
              <select
                value={modalitaAssicurazione}
                onChange={(e) => handleModalitaAssicChange(e.target.value)}
                className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-white focus:outline-none focus:border-purple-400 cursor-pointer"
              >
                <option value="Annuale (pagamento unico)">Annuale (pagamento unico - ogni 12 mesi)</option>
                <option value="Semestrale (2 rate)">Semestrale (2 rate - ogni 6 mesi)</option>
                <option value="Trimestrale (4 rate)">Trimestrale (4 rate - ogni 3 mesi)</option>
                <option value="Mensile (12 rate)">Mensile (12 rate - ogni mese)</option>
              </select>
              <p className="text-[11px] text-purple-300/80 italic">
                Inserisci l'importo di ogni rata nel campo Costo
              </p>
            </div>
          )}

          {/* SPECIFICO REVISIONE: FREQUENZA */}
          {tipoPagamento === 'Revisione' && (
            <div className="p-3.5 rounded-2xl bg-[#152033] border border-amber-500/40 space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
                FREQUENZA / TIPO DI VEICOLO
              </label>
              <select
                value={frequenzaRevisione}
                onChange={(e) => handleFrequenzaRevChange(e.target.value)}
                className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="Auto (Normale)">🚗 Auto (Normale) - Biennale (ogni 2 anni)</option>
                <option value="Nuova Immatricolazione">✨ Nuova Immatricolazione (dopo 4 anni)</option>
                <option value="Taxi / NCC / Ambulanza">🚕 Taxi / NCC / Ambulanza (annuale)</option>
                <option value="Autocarro >35q">🚛 Autocarro o speciale (annuale)</option>
              </select>
            </div>
          )}

          {/* Importo Pagato */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
              Importo Pagato (€)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={importo}
                onChange={(e) => setImporto(e.target.value)}
                className="w-full bg-[#172233] border border-slate-700 rounded-2xl px-3.5 py-2.5 text-sm sm:text-base font-black text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute right-4 top-3 text-xs font-bold text-emerald-400">
                EUR (€)
              </span>
            </div>
          </div>

          {/* Selettore rigorosamente separato: SOLO Enti di Riscossione per Bollo, SOLO Compagnie per Assicurazione, SOLO Centri Revisioni per Revisione */}
          <OfficinaSelector
            value={enteOCompagnia}
            onChange={(val) => setEnteOCompagnia(val)}
            defaultTipo={tipoPagamento === 'Revisione' ? 'Centro Revisioni' : undefined}
            officineSalvate={
              tipoPagamento === 'Assicurazione'
                ? (compagnieAssicurative && compagnieAssicurative.length > 0
                    ? Array.from(new Set([...compagnieAssicurative, 'Allianz', 'Generali', 'UnipolSai', 'Prima', 'Zurich', 'Linear', 'AXA', 'Reale Mutua', 'Vittoria Assicurazioni']))
                    : ['Allianz', 'Generali', 'UnipolSai', 'Prima', 'Zurich', 'Linear', 'AXA'])
                : tipoPagamento === 'Bollo'
                ? (entiRiscossione && entiRiscossione.length > 0
                    ? Array.from(new Set([...entiRiscossione, 'ACI / Regione', 'PagoPA', 'Tabaccheria / Mooney', 'Poste Italiane', 'Agenzia delle Entrate Riscossione', 'App IO', 'Banca / Home Banking', 'Sito Web Regione / ACI Space']))
                    : ['ACI / Regione', 'PagoPA', 'Tabaccheria / Mooney', 'Poste Italiane', 'Agenzia delle Entrate Riscossione', 'App IO'])
                : centriRevisioniSalvati
            }
            officineAnagrafica={tipoPagamento === 'Revisione' ? officineAnagrafica : undefined}
            onAddNewOfficina={
              tipoPagamento === 'Revisione' && onAddNewOfficina
                ? (nome, tipo) => onAddNewOfficina(nome, tipo || 'Centro Revisioni')
                : undefined
            }
            onSelectOfficinaDetails={(details) => {
              setEnteOCompagnia(details.nome);
            }}
            label={
              tipoPagamento === 'Assicurazione'
                ? 'Compagnia Assicurativa'
                : tipoPagamento === 'Bollo'
                ? 'Ente di Riscossione / Canale di Pagamento'
                : 'Centro Revisioni Autorizzato MCTC'
            }
            sublabel={
              tipoPagamento === 'Assicurazione'
                ? 'Seleziona dalle compagnie assicurative:'
                : tipoPagamento === 'Bollo'
                ? 'Seleziona dagli enti di riscossione:'
                : 'Seleziona dal centro revisioni autorizzato o officina:'
            }
            iconType={
              tipoPagamento === 'Assicurazione'
                ? 'assicurazione'
                : 'ente'
            }
            addNewLabel={
              tipoPagamento === 'Assicurazione'
                ? '+ Inserisci nuova compagnia'
                : tipoPagamento === 'Bollo'
                ? '+ Inserisci nuovo ente di riscossione'
                : '+ Salva Centro Revisioni nel Menu Comune'
            }
            placeholder={
              tipoPagamento === 'Assicurazione'
                ? 'Nome compagnia assicurativa (es. Allianz, Generali, Prima...)'
                : tipoPagamento === 'Bollo'
                ? 'es. ACI, PagoPA, Agenzia Entrate, Tabaccheria...'
                : 'Nome centro revisioni autorizzato MCTC o Motorizzazione...'
            }
            accentColor={tipoPagamento === 'Bollo' ? 'orange' : tipoPagamento === 'Revisione' ? 'blue' : 'purple'}
          />

          {/* Numero Polizza se assicurazione */}
          {tipoPagamento === 'Assicurazione' && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                Numero di Polizza (Opzionale)
              </label>
              <input
                type="text"
                placeholder="es. POL-892183921"
                value={numeroPolizza}
                onChange={(e) => setNumeroPolizza(e.target.value)}
                className="w-full bg-[#172233] border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          )}

          {/* GESTIONE SCADENZE FUTURE & TIMELINE */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#131f33] to-[#0c1322] border border-emerald-500/40 space-y-3 shadow-md">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <Calendar size={15} />
                <span>Gestione Scadenze Future (Timeline)</span>
              </div>
              <span className="text-[10px] text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 rounded-full font-bold">
                {currentFrequenza}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {pagamentoEffettuato ? (
                <div className="space-y-2">
                  {/* Quietanza che si sta saldando */}
                  <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-600/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-emerald-300 block font-bold uppercase">
                        ✓ Scadenza Attuale Saldata:
                      </span>
                      <strong className="text-white text-xs sm:text-sm font-mono">
                        {formatDateIt(dataScadenza)}
                      </strong>
                      <span className="text-[11px] text-emerald-300/90 block mt-0.5">
                        Versamento registrato: {formatDateIt(dataPagamento || new Date().toISOString().slice(0, 10))}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500 text-black font-extrabold flex items-center gap-1 shadow-sm">
                      <Check size={12} strokeWidth={3} />
                      <span>Saldato</span>
                    </span>
                  </div>

                  {/* 1ª Nuova Scadenza Futura generata per il prossimo rinnovo (Punto 3 -> Punto 1) */}
                  <div className="p-2.5 rounded-xl bg-[#09101d] border border-blue-500/50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-blue-300 block font-bold uppercase">
                        1ª Nuova Prossima Scadenza (Successiva):
                      </span>
                      <strong className="text-white text-xs sm:text-sm font-mono">
                        {formatDateIt(futuraScadenza)}
                      </strong>
                      {tipoPagamento === 'Bollo' && (
                        <span className="text-[11px] text-amber-300 block font-medium mt-0.5">
                          ➔ Pagabile entro: {computeBolloPagabileEntro(futuraScadenza)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40">
                      Prossimo Rinnovo
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* 1ª Prossima Scadenza da saldare (In attesa) */}
                  <div className="p-2.5 rounded-xl bg-[#09101d] border border-amber-500/50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-amber-300 block font-bold uppercase">
                        1ª Prossima Scadenza da Saldare:
                      </span>
                      <strong className="text-white text-xs sm:text-sm font-mono">
                        {formatDateIt(dataScadenza)}
                      </strong>
                      {tipoPagamento === 'Bollo' && pagabileEntroBollo && (
                        <span className="text-[11px] text-amber-300 block font-medium mt-0.5">
                          ➔ Pagabile entro: {pagabileEntroBollo}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                      In Attesa
                    </span>
                  </div>

                  {/* 2ª Nuova Scadenza Futura al rinnovo successivo */}
                  {futuraScadenza && (
                    <div className="p-2.5 rounded-xl bg-[#0d1524] border border-slate-700/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          2ª Nuova Scadenza Futura (al successivo saldo):
                        </span>
                        <strong className="text-slate-200 text-xs sm:text-sm font-mono">
                          {formatDateIt(futuraScadenza)}
                        </strong>
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-lg bg-slate-800 text-slate-300 font-medium">
                        Futura (+1 ciclo)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Cicli successivi futuri */}
              {futureDeadlines.length > 0 && (
                <div className="pt-1 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Scadenze degli anni successivi calcolate automaticamente:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {futureDeadlines.map((f) => (
                      <div
                        key={f.ciclo}
                        className="p-2 rounded-xl bg-[#0f1726] border border-slate-800 text-[11px]"
                      >
                        <span className="text-[9px] text-slate-400 block font-bold uppercase">
                          {f.etichetta}
                        </span>
                        <strong className="text-slate-200 block mt-0.5">
                          {formatDateIt(f.dataScadenza)}
                        </strong>
                        {f.pagabileEntro && (
                          <span className="text-[9px] text-amber-300/90 block truncate">
                            {f.pagabileEntro}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* INTEGRAZIONE GOOGLE CALENDAR */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121c2e] to-[#0c1322] border border-blue-500/40 space-y-3 shadow-md">
            <div className="flex items-center justify-between text-blue-400 text-xs font-bold uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <CalendarPlus size={16} />
                <span>Google Calendar (Promemoria & Ricorrenza)</span>
              </div>
              <span className="text-[10px] text-blue-300 font-mono">Notifiche Attive</span>
            </div>

            {/* Toggle Ripetizione Anni Successivi */}
            <div className="p-2.5 rounded-xl bg-[#09101d] border border-blue-900/60 flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ripetiAnniSuccessivi}
                  onChange={(e) => setRipetiAnniSuccessivi(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded bg-[#1e293b] border-slate-700 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-white block">
                    Ripeti l'evento anche per gli anni successivi
                  </span>
                  <span className="text-[10px] text-blue-300">
                    Ricorrenza annuale (+1 anno)
                  </span>
                </div>
              </label>
              <Repeat size={16} className={ripetiAnniSuccessivi ? 'text-blue-400' : 'text-slate-600'} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  openGoogleCalendarEvent({
                    title: calendarTitle,
                    description: calendarDesc,
                    startDate: dataScadenza,
                    recurrence: recurrenceRRule,
                  })
                }
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                title="Apre Google Calendar con ricorrenza impostata"
              >
                <CalendarPlus size={15} />
                <span>Aggiungi a Google Calendar</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  downloadIcsFile({
                    title: calendarTitle,
                    description: calendarDesc,
                    startDate: dataScadenza,
                    rrule: recurrenceRRule ? recurrenceRRule.replace('RRULE:', '') : undefined,
                  })
                }
                className="py-2.5 px-3 rounded-xl bg-[#1c293d] hover:bg-[#253752] text-white font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 shadow-md cursor-pointer transition-all"
                title="Scarica file .ics con promemoria"
              >
                <Download size={14} className="text-blue-400" />
                <span>Scarica File (.ICS)</span>
              </button>
            </div>

            {/* Calendario specifico con ricorrenza ogni anno (.ics) */}
            {tipoPagamento === 'Revisione' && (
              <button
                type="button"
                onClick={() => downloadRevisioniCalendarIcs([veicolo])}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600/30 to-orange-600/30 hover:from-amber-600/40 hover:to-orange-600/40 text-amber-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-amber-500/40 transition-colors cursor-pointer"
              >
                <Calendar size={14} className="text-amber-400" />
                <span>📅 Calendario "Revisioni Auto" (.ics con ricorrenza ogni anno)</span>
              </button>
            )}

            {tipoPagamento === 'Assicurazione' && (
              <button
                type="button"
                onClick={() => downloadAssicurazioniCalendarIcs([veicolo])}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/40 hover:to-teal-600/40 text-emerald-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-emerald-500/40 transition-colors cursor-pointer"
              >
                <Shield size={14} className="text-emerald-400" />
                <span>🛡️ Calendario "Assicurazione Auto" (.ics con ricorrenza ogni anno)</span>
              </button>
            )}

            {tipoPagamento === 'Bollo' && (
              <button
                type="button"
                onClick={() => downloadBolloCalendarIcs([veicolo])}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600/30 to-yellow-600/30 hover:from-amber-600/40 hover:to-yellow-600/40 text-amber-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-amber-500/40 transition-colors cursor-pointer"
              >
                <CreditCard size={14} className="text-amber-400" />
                <span>💳 Calendario "Bollo Auto" (.ics con ricorrenza ogni anno)</span>
              </button>
            )}
          </div>

          {/* Checkbox per aggiornamento automatico scadenza veicolo */}
          <div
            onClick={() => setAggiornaScadenzaAuto(!aggiornaScadenzaAuto)}
            className="p-3 rounded-2xl bg-[#141e2e] border border-slate-800 flex items-center justify-between cursor-pointer hover:bg-[#182538] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-5 h-5 rounded-lg flex items-center justify-center border ${
                  aggiornaScadenzaAuto
                    ? 'bg-emerald-500 border-emerald-400 text-white'
                    : 'border-slate-700'
                }`}
              >
                {aggiornaScadenzaAuto && <Check size={14} strokeWidth={3} />}
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  Aggiorna scadenza nella scheda del veicolo
                </span>
                <span className="text-[10px] text-slate-400">
                  Imposta la nuova data ({formatDateIt(dataScadenza)}) per {tipoPagamento} su {veicolo.targa}
                </span>
              </div>
            </div>
          </div>

          {/* Scansiona ricevuta o fattura/quietanza */}
          <ReceiptInvoiceUpload
            value={fotoRicevutaUrl}
            allegati={allegati}
            onChange={(val) => setFotoRicevutaUrl(val)}
            onAllegatiChange={(items) => setAllegati(items)}
            label="Scansiona quietanza, bollettino o ricevuta (Foto o PDF)"
          />

          {/* Note */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
              Note Aggiuntive
            </label>
            <textarea
              rows={2}
              placeholder="es. Pagato con carta, ricevuta conservata..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-[#172233] border border-slate-700 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        </>
      )}
      </div>
    </div>
  );
};
