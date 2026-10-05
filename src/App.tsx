import React, { useState, useEffect, useMemo } from 'react';
import { Veicolo, InterventoRecord, CategoriaManutenzione, AppDataBackup, TipoPagamentoScadenza, AnagraficaOfficina, TipoOfficinaSpecialista } from './types';
import {
  loadStoredVeicoli,
  saveStoredVeicoli,
  loadStoredRecord,
  saveStoredRecord,
  loadStoredCatalog,
  saveStoredCatalog,
  loadStoredOfficine,
  saveStoredOfficine,
  loadStoredEntiRiscossione,
  saveStoredEntiRiscossione,
  loadStoredCompagnieAssicurative,
  saveStoredCompagnieAssicurative,
  getStoredSelectedVehicleId,
  saveStoredSelectedVehicleId,
  formatKm,
  formatDateIt,
  computeBolloPagabileEntro,
  getEffectiveUpcomingDeadline,
} from './services/storageService';
import { DEFAULT_CATALOG } from './data/defaultCatalog';
import { DEFAULT_ENTI_RISCOSSIONE, DEFAULT_COMPAGNIE_ASSICURAZIONE } from './data/defaultAnagrafiche';
import { Navigation, TabType } from './components/Navigation';
import { FabSpeedDial } from './components/FabSpeedDial';
import { NewRecordModal } from './components/NewRecordModal';
import { RecordDetailsModal } from './components/RecordDetailsModal';
import { VehicleDetailsModal } from './components/VehicleDetailsModal';
import { AddVehicleModal } from './components/AddVehicleModal';
import { UpdateKmModal } from './components/UpdateKmModal';
import { RegistroGommeModal } from './components/RegistroGommeModal';
import { RegistroPagamentiModal } from './components/RegistroPagamentiModal';
import { InstallAppModal } from './components/InstallAppModal';
import { GoogleCalendarSyncModal } from './components/GoogleCalendarSyncModal';
import { DataTransferModal } from './components/DataTransferModal';
import { PrintReportModal } from './components/PrintReportModal';
import { UserGuideModal } from './components/UserGuideModal';
import { SummaryView } from './views/SummaryView';
import { HistoryView } from './views/HistoryView';
import { GarageView } from './views/GarageView';
import { SettingsView } from './views/SettingsView';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { Car, ChevronDown, Download, Smartphone, WifiOff, BookOpen, Monitor, Laptop, Plus, FolderSync, Printer, MoreVertical, RefreshCw } from 'lucide-react';

export default function App() {
  const isOnline = useOnlineStatus();
  const [isRefreshingCache, setIsRefreshingCache] = useState(false);
  const [veicoli, setVeicoli] = useState<Veicolo[]>(() => loadStoredVeicoli());
  const [record, setRecord] = useState<InterventoRecord[]>(() => loadStoredRecord());
  const [catalogo, setCatalogo] = useState<CategoriaManutenzione[]>(() => loadStoredCatalog());
  const [officineAnagrafica, setOfficineAnagrafica] = useState<AnagraficaOfficina[]>(() => loadStoredOfficine());
  const [entiRiscossione, setEntiRiscossione] = useState<string[]>(() => loadStoredEntiRiscossione());
  const [compagnieAssicurative, setCompagnieAssicurative] = useState<string[]>(() => loadStoredCompagnieAssicurative());
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(() =>
    getStoredSelectedVehicleId(veicoli)
  );

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const saved = localStorage.getItem('cartracker_active_tab') as TabType;
      if (saved && ['garage', 'cronologia', 'riepilogo', 'imposta'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'garage';
  });

  useEffect(() => {
    try {
      localStorage.setItem('cartracker_active_tab', activeTab);
    } catch {}
    // Quando si naviga tra i menu, la pagina si apre sempre dall'alto e non a metà pagina
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, [activeTab]);

  const [isFabOpen, setIsFabOpen] = useState<boolean>(false);

  // Modals state
  const [isNewRecordOpen, setIsNewRecordOpen] = useState<boolean>(false);
  const [recordModalMode, setRecordModalMode] = useState<'manutenzione' | 'gomme' | 'altri_interventi'>('manutenzione');
  const [isRegistroGommeOpen, setIsRegistroGommeOpen] = useState<boolean>(false);
  const [isRegistroPagamentiOpen, setIsRegistroPagamentiOpen] = useState<boolean>(false);
  const [registroPagamentiTipo, setRegistroPagamentiTipo] = useState<TipoPagamentoScadenza>('Bollo');
  const [registroPagamentiMode, setRegistroPagamentiMode] = useState<'current_card' | 'new_payment' | 'history_record'>('current_card');
  const [registroPagamentiInitialTab, setRegistroPagamentiInitialTab] = useState<'nuovo' | 'storico'>('nuovo');
  const [editingRecord, setEditingRecord] = useState<InterventoRecord | null>(null);
  const [editingGommeRecord, setEditingGommeRecord] = useState<InterventoRecord | null>(null);
  const [editingPagamentoRecord, setEditingPagamentoRecord] = useState<InterventoRecord | null>(null);
  const [isRecordCopyMode, setIsRecordCopyMode] = useState<boolean>(false);
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState<InterventoRecord | null>(null);
  const [isRecordDetailsOpen, setIsRecordDetailsOpen] = useState<boolean>(false);
  const [isVehicleDetailsOpen, setIsVehicleDetailsOpen] = useState<boolean>(false);
  const [vehicleDetailsInitialEdit, setVehicleDetailsInitialEdit] = useState<boolean>(false);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState<boolean>(false);
  const [isUpdateKmOpen, setIsUpdateKmOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isGoogleSyncModalOpen, setIsGoogleSyncModalOpen] = useState<boolean>(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState<boolean>(false);
  const [isDataTransferModalOpen, setIsDataTransferModalOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Modalità Schermo: Desktop / PC (Widescreen) vs Mobile (Compatto)
  const [isDesktopMode, setIsDesktopMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('drivercheck_layout_mode');
      if (saved === 'desktop') return true;
      if (saved === 'mobile') return false;
      return typeof window !== 'undefined' && window.innerWidth >= 900;
    } catch {
      return false;
    }
  });

  const toggleDesktopMode = () => {
    setIsDesktopMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('drivercheck_layout_mode', next ? 'desktop' : 'mobile');
      } catch {}
      return next;
    });
  };

  // Pulizia forzata cache del browser e aggiornamento istantaneo dell'applicazione
  const handleForceRefreshApp = async () => {
    setIsRefreshingCache(true);
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
    } catch (e) {
      console.warn('Errore pulizia cache:', e);
    }
    // Ricarica senza cache
    window.location.reload();
  };

  // Verifica versione applicazione per invalidare vecchie cache
  const CURRENT_APP_VERSION = '2.5.0';
  useEffect(() => {
    try {
      const storedVersion = localStorage.getItem('drivecheck_app_version');
      if (storedVersion !== CURRENT_APP_VERSION) {
        localStorage.setItem('drivecheck_app_version', CURRENT_APP_VERSION);
        if ('caches' in window) {
          caches.keys().then((keys) => {
            keys.forEach((k) => caches.delete(k));
          });
        }
      }
    } catch {}
  }, []);

  // Scorciatoie da tastiera per PC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }
      if (e.key === '1') setActiveTab('riepilogo');
      if (e.key === '2') setActiveTab('cronologia');
      if (e.key === '3') setActiveTab('garage');
      if (e.key === '4') setActiveTab('imposta');
      if (e.key === 'Escape') {
        setIsNewRecordOpen(false);
        setIsRecordDetailsOpen(false);
        setIsVehicleDetailsOpen(false);
        setIsAddVehicleOpen(false);
        setIsUpdateKmOpen(false);
        setIsInstallModalOpen(false);
        setIsGoogleSyncModalOpen(false);
        setIsDataTransferModalOpen(false);
        setIsUserGuideOpen(false);
        setIsRegistroGommeOpen(false);
        setIsRegistroPagamentiOpen(false);
        setIsFabOpen(false);
        setIsVehicleDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Quando si naviga tra i menu/schede, apri la pagina sempre dall'alto (scrollTop = 0)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, [activeTab]);

  // Vehicle selector dropdown in top bar
  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState<boolean>(false);

  // Sync to local storage
  useEffect(() => {
    saveStoredVeicoli(veicoli);
  }, [veicoli]);

  useEffect(() => {
    saveStoredRecord(record);
  }, [record]);

  useEffect(() => {
    saveStoredCatalog(catalogo);
  }, [catalogo]);

  useEffect(() => {
    saveStoredOfficine(officineAnagrafica);
  }, [officineAnagrafica]);

  // Scroll to top automatico ad ogni cambio di tab o navigazione
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeTab]);

  useEffect(() => {
    if (selectedVehicleId) {
      saveStoredSelectedVehicleId(selectedVehicleId);
    }
  }, [selectedVehicleId]);

  const currentVehicle = veicoli.find((v) => v.id === selectedVehicleId) || veicoli[0];

  // Sincronizzazione automatica completa e bidirezionale:
  // Assicura che TUTTE le officine, gommisti, carrozzieri, elettrauto e centri revisione
  // inseriti nei veicoli (officina abituale e specialisti) e in qualsiasi intervento/quietanza di pagamento
  // siano SEMPRE presenti nell'anagrafica del Menu Comune con tipologia, telefono, referente e indirizzo corretti!
  const syncAllOfficine = (
    currentOfficine: AnagraficaOfficina[],
    currentVeicoli: Veicolo[],
    currentRecords: InterventoRecord[]
  ): AnagraficaOfficina[] => {
    let updated = [...currentOfficine];
    let hasChanges = false;

    const upsertOfficina = (
      nome: string,
      tipo?: TipoOfficinaSpecialista,
      telefono?: string,
      referente?: string,
      indirizzo?: string
    ) => {
      const trimmed = nome?.trim();
      if (!trimmed || trimmed.length < 2) return;
      const matchIndex = updated.findIndex(
        (o) => o.nome.toLowerCase().trim() === trimmed.toLowerCase()
      );
      if (matchIndex >= 0) {
        const curr = updated[matchIndex];
        const nextPhone = telefono?.trim() || curr.telefono || '';
        const nextRef = referente?.trim() || curr.referente || '';
        const nextInd = indirizzo?.trim() || curr.indirizzo || '';
        let nextTipo = curr.tipo;
        if (tipo && (curr.tipo === 'Meccanico' || curr.tipo === 'Altro' || !curr.tipo)) {
          nextTipo = tipo;
        } else if (tipo) {
          nextTipo = tipo;
        }

        if (
          nextPhone !== curr.telefono ||
          nextRef !== curr.referente ||
          nextInd !== curr.indirizzo ||
          nextTipo !== curr.tipo
        ) {
          updated[matchIndex] = {
            ...curr,
            telefono: nextPhone,
            referente: nextRef,
            indirizzo: nextInd,
            tipo: nextTipo,
          };
          hasChanges = true;
        }
      } else {
        const nuova: AnagraficaOfficina = {
          id: `off-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          nome: trimmed,
          tipo: tipo || 'Meccanico',
          telefono: telefono?.trim() || '',
          referente: referente?.trim() || '',
          indirizzo: indirizzo?.trim() || '',
          dataAggiunta: new Date().toISOString(),
        };
        updated = [nuova, ...updated];
        hasChanges = true;
      }
    };

    // 1. Veicoli: officina abituale e specialisti
    currentVeicoli.forEach((v) => {
      if (v.officina?.trim()) {
        upsertOfficina(v.officina, 'Meccanico', v.telefonoOfficina, v.rifOfficina);
      }
      if (v.specialisti && Array.isArray(v.specialisti)) {
        v.specialisti.forEach((s) => {
          if (s.nome?.trim()) {
            upsertOfficina(s.nome, s.tipo, s.telefono, s.referente, s.indirizzo);
          }
        });
      }
    });

    // 2. Interventi e quietanze: officina, gommista, centro revisioni
    currentRecords.forEach((r) => {
      if (r.officina?.trim()) {
        const tipoGuess: TipoOfficinaSpecialista =
          r.tipo === 'Gomme' || (r.titolo || '').toLowerCase().includes('gomm')
            ? 'Gommista'
            : r.registroPagamento?.tipoPagamento === 'Revisione' ||
              (r.tipo as string) === 'Revisione' ||
              (r.titolo || '').toLowerCase().includes('revision')
            ? 'Centro Revisioni'
            : (r.titolo || '').toLowerCase().includes('carrozz')
            ? 'Carrozziere'
            : (r.titolo || '').toLowerCase().includes('elettr')
            ? 'Elettrauto'
            : 'Meccanico';
        upsertOfficina(r.officina, tipoGuess);
      }
      if (
        r.registroPagamento?.tipoPagamento === 'Revisione' &&
        r.registroPagamento.enteOCompagnia?.trim()
      ) {
        upsertOfficina(r.registroPagamento.enteOCompagnia, 'Centro Revisioni');
      }
    });

    return updated;
  };

  // Sincronizzazione automatica all'avvio e ad ogni variazione di veicoli o record
  useEffect(() => {
    if (veicoli.length > 0 || record.length > 0) {
      setOfficineAnagrafica((prev) => {
        const synced = syncAllOfficine(prev, veicoli, record);
        if (synced.length !== prev.length || JSON.stringify(synced) !== JSON.stringify(prev)) {
          saveStoredOfficine(synced);
          return synced;
        }
        return prev;
      });
    }
  }, [veicoli, record]);

  // Sincronizzazione automatica schede in attesa (Bollo, Revisione, Assicurazione):
  // Assicura che per ogni veicolo siano sempre visibili tutte le 3 scadenze con lo stato "In attesa"
  // (schede indipendenti non ancora saldate)
  useEffect(() => {
    if (veicoli.length === 0) return;

    const newPendingRecords: InterventoRecord[] = [];

    veicoli.forEach((v) => {
      const tipi: TipoPagamentoScadenza[] = ['Bollo', 'Revisione', 'Assicurazione'];
      tipi.forEach((tipo) => {
        // Verifica se esiste già una scheda in attesa per questo veicolo e tipologia
        const hasPending = record.some(
          (r) =>
            r.veicoloId === v.id &&
            (r.tipo === 'Pagamento Scadenza' || !!r.registroPagamento) &&
            r.registroPagamento?.tipoPagamento === tipo &&
            r.registroPagamento?.pagato === false
        );

        if (!hasPending) {
          const hasConfiguredDeadline =
            tipo === 'Bollo'
              ? !!v.scadenzaBollo
              : tipo === 'Revisione'
              ? !!v.scadenzaRevisione
              : !!v.scadenzaAssicurazione;

          const eff = getEffectiveUpcomingDeadline(v, tipo, record);

          if ((hasConfiguredDeadline || eff.previousPaidRecord) && eff.dataScadenza) {
            // Verifica che questa data non sia già stata registrata come saldata nello storico
            const isAlreadyPaid = record.some(
              (r) =>
                r.veicoloId === v.id &&
                (r.tipo === 'Pagamento Scadenza' || !!r.registroPagamento) &&
                r.registroPagamento?.tipoPagamento === tipo &&
                r.registroPagamento?.dataScadenza === eff.dataScadenza &&
                r.registroPagamento?.pagato === true
            );

            if (!isAlreadyPaid) {
              const pendingRecord: InterventoRecord = {
                id: `rec-pag-pending-${tipo.toLowerCase()}-${v.id}`,
                veicoloId: v.id,
                tipo: 'Pagamento Scadenza',
                titolo: `Scadenza ${tipo} (In attesa) - ${v.targa}`,
                data: eff.dataScadenza,
                km: v.kmAttuali || 0,
                costo: eff.importo,
                officina: tipo === 'Revisione' && eff.enteOCompagnia ? eff.enteOCompagnia : undefined,
                lavorazioniSelezionate: [
                  {
                    lavorazioneId: `lav-pag-${tipo.toLowerCase()}`,
                    nome: `${tipo.toUpperCase()}`,
                    categoria: '4. CARROZZERIA, COMFORT E SERVIZI EXTRA',
                    sottocategoria: 'Registro Scadenze e Pagamenti',
                  },
                ],
                registroPagamento: {
                  tipoPagamento: tipo,
                  dataPagamento: '',
                  dataScadenza: eff.dataScadenza,
                  prossimaScadenza: eff.prossimaScadenza,
                  importo: eff.importo,
                  frequenza: eff.frequenza,
                  pagabileEntro: eff.pagabileEntro,
                  enteOCompagnia: eff.enteOCompagnia || undefined,
                  numeroPolizza: eff.numeroPolizza || undefined,
                  pagato: false,
                },
                haPromemoria: true,
                dataPromemoria: eff.dataScadenza,
                note: `Scadenza: ${formatDateIt(eff.dataScadenza)} • In attesa di pagamento • Ente/Compagnia: ${eff.enteOCompagnia || 'N/D'}`,
                createdAt: new Date().toISOString(),
              };

              newPendingRecords.push(pendingRecord);
            }
          }
        }
      });
    });

    if (newPendingRecords.length > 0) {
      setRecord((prev) => [...newPendingRecords, ...prev]);
    }
  }, [veicoli, record]);

  // Elenco cumulativo di tutte le officine, gommisti, centri revisione e specialisti salvati dal Menu Comune, dai veicoli e da tutti gli interventi
  const officineSalvate = useMemo(() => {
    const list = new Set<string>();
    // 1. Tutte le officine dal Menu Comune (anagrafica officine per tutto il parco auto)
    officineAnagrafica.forEach((o) => {
      if (o.nome?.trim()) list.add(o.nome.trim());
    });
    // 2. Officine e specialisti associati ai veicoli
    veicoli.forEach((v) => {
      if (v.officina?.trim()) list.add(v.officina.trim());
      if (v.specialisti && Array.isArray(v.specialisti)) {
        v.specialisti.forEach((s) => {
          if (s.nome?.trim()) list.add(s.nome.trim());
        });
      }
    });
    // 3. Officine registrate in tutti gli interventi (manutenzioni, gomme, centri revisione)
    record.forEach((r) => {
      if (r.officina?.trim()) {
        list.add(r.officina.trim());
      }
      if (
        r.registroPagamento?.tipoPagamento === 'Revisione' &&
        r.registroPagamento.enteOCompagnia?.trim()
      ) {
        list.add(r.registroPagamento.enteOCompagnia.trim());
      }
    });
    return Array.from(list).filter(Boolean);
  }, [officineAnagrafica, veicoli, record]);

  const handleUpdateOfficine = (nuove: AnagraficaOfficina[]) => {
    setOfficineAnagrafica(nuove);
    saveStoredOfficine(nuove);
  };

  // Aggiunge una nuova officina all'anagrafica del Menu Comune e la salva su storage
  const handleAddNewOfficina = (
    nome: string,
    tipo?: any,
    telefono?: string,
    referente?: string,
    indirizzo?: string
  ) => {
    const trimmed = nome?.trim();
    if (!trimmed || trimmed.length < 2) return;
    setOfficineAnagrafica((prev) => {
      const matchIndex = prev.findIndex(
        (o) => o.nome.toLowerCase().trim() === trimmed.toLowerCase()
      );
      if (matchIndex >= 0) {
        // Se già presente, aggiorna eventuali recapiti se specificati
        const current = prev[matchIndex];
        const updated = [...prev];
        updated[matchIndex] = {
          ...current,
          telefono: telefono !== undefined ? telefono : current.telefono,
          referente: referente !== undefined ? referente : current.referente,
          indirizzo: indirizzo !== undefined ? indirizzo : current.indirizzo,
          tipo: tipo || current.tipo,
        };
        saveStoredOfficine(updated);
        return updated;
      }
      const nuova: AnagraficaOfficina = {
        id: `off-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        nome: trimmed,
        tipo: tipo || 'Meccanico',
        telefono: telefono || '',
        referente: referente || '',
        indirizzo: indirizzo || '',
        dataAggiunta: new Date().toISOString(),
      };
      const updated = [nuova, ...prev];
      saveStoredOfficine(updated);
      return updated;
    });
  };

  // Elimina un'officina dal Menu Comune (anagrafica officine)
  const handleDeleteOfficina = (nome: string) => {
    const trimmed = nome?.trim().toLowerCase();
    if (!trimmed) return;
    setOfficineAnagrafica((prev) => {
      const updated = prev.filter((o) => o.nome.toLowerCase().trim() !== trimmed);
      saveStoredOfficine(updated);
      return updated;
    });
  };

  const handleAddEnteRiscossione = (nuovoEnte: string) => {
    const trimmed = nuovoEnte.trim();
    if (!trimmed) return;
    setEntiRiscossione((prev) => {
      if (prev.some((e) => e.toLowerCase() === trimmed.toLowerCase())) return prev;
      const updated = [trimmed, ...prev];
      saveStoredEntiRiscossione(updated);
      return updated;
    });
  };

  const handleAddCompagniaAssicurativa = (nuovaCompagnia: string) => {
    const trimmed = nuovaCompagnia.trim();
    if (!trimmed) return;
    setCompagnieAssicurative((prev) => {
      if (prev.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return prev;
      const updated = [trimmed, ...prev];
      saveStoredCompagnieAssicurative(updated);
      return updated;
    });
  };

  // Sincronizzazione automatica e immediata delle officine dal veicolo al Menu Comune
  const syncOfficineFromVehicle = (v: Veicolo) => {
    setOfficineAnagrafica((prev) => {
      const synced = syncAllOfficine(prev, [v, ...veicoli], record);
      saveStoredOfficine(synced);
      return synced;
    });
  };

  // Handler: Save or Update Record
  const handleSaveRecord = (newOrUpdated: InterventoRecord) => {
    setRecord((prev) => {
      const exists = prev.some((r) => r.id === newOrUpdated.id);
      if (exists) {
        return prev.map((r) => (r.id === newOrUpdated.id ? newOrUpdated : r));
      }
      return [newOrUpdated, ...prev];
    });

    // Se l'intervento contiene un'officina o un centro revisioni, aggiorna il Menu Comune se non ancora presente
    if (newOrUpdated.officina?.trim()) {
      const defaultTipo =
        newOrUpdated.tipo === 'Gomme' || (newOrUpdated.titolo || '').toLowerCase().includes('gomm')
          ? 'Gommista'
          : newOrUpdated.registroPagamento?.tipoPagamento === 'Revisione' || (newOrUpdated.titolo || '').toLowerCase().includes('revision')
          ? 'Centro Revisioni'
          : 'Meccanico';
      handleAddNewOfficina(newOrUpdated.officina.trim(), defaultTipo);
    } else if (
      newOrUpdated.registroPagamento?.tipoPagamento === 'Revisione' &&
      newOrUpdated.registroPagamento.enteOCompagnia?.trim()
    ) {
      handleAddNewOfficina(newOrUpdated.registroPagamento.enteOCompagnia.trim(), 'Centro Revisioni');
    }

    // Auto-update car KM if record KM is higher
    if (currentVehicle && newOrUpdated.km > currentVehicle.kmAttuali) {
      handleUpdateVehicleKm(newOrUpdated.km);
    }
  };

  const handleDeleteRecord = (recordId: string) => {
    const deletedRec = record.find((r) => r.id === recordId);
    const newRecords = record.filter((r) => r.id !== recordId);
    setRecord(newRecords);

    // Se è stato eliminato un pagamento da storico, ricalcola la scadenza più prossima per il veicolo
    if (deletedRec && (deletedRec.tipo === 'Pagamento Scadenza' || !!deletedRec.registroPagamento)) {
      const tipo = deletedRec.registroPagamento?.tipoPagamento;
      const veicId = deletedRec.veicoloId;
      const targetVehicle = veicoli.find((v) => v.id === veicId);
      if (tipo && targetVehicle) {
        const eff = getEffectiveUpcomingDeadline(targetVehicle, tipo, newRecords);
        if (eff.dataScadenza) {
          handleUpdateVehicleDeadline(veicId, tipo, eff.dataScadenza, eff.importo, eff.enteOCompagnia);
        }
      }
    }
  };

  const handleUpdateVehicleKm = (nuoviKm: number) => {
    if (!currentVehicle) return;
    setVeicoli((prev) =>
      prev.map((v) => (v.id === currentVehicle.id ? { ...v, kmAttuali: nuoviKm } : v))
    );
  };

  const handleSaveVehicle = (updatedVehicle: Veicolo) => {
    setVeicoli((prev) =>
      prev.map((v) => (v.id === updatedVehicle.id ? updatedVehicle : v))
    );
    // Sincronizza subito con il Menu Comune
    syncOfficineFromVehicle(updatedVehicle);
  };

  const handleAddVehicle = (newVehicle: Veicolo) => {
    setVeicoli((prev) => [...prev, newVehicle]);
    setSelectedVehicleId(newVehicle.id);
    // Sincronizza subito con il Menu Comune
    syncOfficineFromVehicle(newVehicle);
  };

  const handleDuplicateVehicle = (baseVehicle: Veicolo) => {
    const newId = `veh-${Date.now()}`;
    const duplicated: Veicolo = {
      ...baseVehicle,
      id: newId,
      targa: `${baseVehicle.targa}-COPIA`,
      modello: `${baseVehicle.modello} (Copia)`,
    };
    setVeicoli((prev) => [...prev, duplicated]);
    setSelectedVehicleId(newId);
    setVehicleDetailsInitialEdit(true);
    setIsVehicleDetailsOpen(true);
  };

  const handleDeleteVehicle = (veicoloId: string) => {
    setVeicoli((prev) => {
      const remaining = prev.filter((v) => v.id !== veicoloId);
      if (remaining.length > 0) {
        setSelectedVehicleId(remaining[0].id);
      } else {
        setSelectedVehicleId('');
      }
      return remaining;
    });
    setRecord((prev) => prev.filter((r) => r.veicoloId !== veicoloId));
  };

  const handleDeleteAllVehicles = () => {
    setVeicoli([]);
    setRecord([]);
    setSelectedVehicleId('');
  };

  const handleRestoreAllData = (backup: AppDataBackup, mode: 'overwrite' | 'merge' = 'overwrite') => {
    if (mode === 'overwrite') {
      // Se il backup contiene vetture, sovrascrivi parco veicoli e interventi
      if (backup.veicoli && Array.isArray(backup.veicoli) && backup.veicoli.length > 0) {
        setVeicoli(backup.veicoli);
        setSelectedVehicleId(backup.veicoloSelezionatoId || backup.veicoli[0].id);
        if (backup.record && Array.isArray(backup.record)) {
          setRecord(backup.record);
        }
      }
      // Sovrascrivi catalogo se presente nel backup
      if (backup.catalogoPersonalizzato && Array.isArray(backup.catalogoPersonalizzato) && backup.catalogoPersonalizzato.length > 0) {
        setCatalogo(backup.catalogoPersonalizzato);
        saveStoredCatalog(backup.catalogoPersonalizzato);
      }
      // Sovrascrivi officine se presenti nel backup
      if (backup.officineAnagrafica && Array.isArray(backup.officineAnagrafica) && backup.officineAnagrafica.length > 0) {
        setOfficineAnagrafica(backup.officineAnagrafica);
        saveStoredOfficine(backup.officineAnagrafica);
      }
      if (backup.entiRiscossione && Array.isArray(backup.entiRiscossione) && backup.entiRiscossione.length > 0) {
        setEntiRiscossione(backup.entiRiscossione);
        saveStoredEntiRiscossione(backup.entiRiscossione);
      }
      if (backup.compagnieAssicurative && Array.isArray(backup.compagnieAssicurative) && backup.compagnieAssicurative.length > 0) {
        setCompagnieAssicurative(backup.compagnieAssicurative);
        saveStoredCompagnieAssicurative(backup.compagnieAssicurative);
      }
    } else {
      // Modalità 'merge': aggiungi veicoli e interventi senza cancellare quelli presenti
      if (backup.veicoli && Array.isArray(backup.veicoli) && backup.veicoli.length > 0) {
        setVeicoli((prevVeicoli) => {
          const updated = [...prevVeicoli];
          backup.veicoli.forEach((incoming) => {
            const existingIndex = updated.findIndex(
              (v) =>
                v.id === incoming.id ||
                v.targa.trim().toLowerCase() === incoming.targa.trim().toLowerCase()
            );
            if (existingIndex >= 0) {
              // Aggiorna dati del veicolo esistente mantenendo il chilometraggio più aggiornato
              updated[existingIndex] = {
                ...updated[existingIndex],
                ...incoming,
                kmAttuali: Math.max(updated[existingIndex].kmAttuali || 0, incoming.kmAttuali || 0),
              };
            } else {
              // Aggiungi nuovo veicolo al parco
              updated.push(incoming);
            }
          });
          return updated;
        });
      }

      if (backup.record && Array.isArray(backup.record) && backup.record.length > 0) {
        setRecord((prevRecords) => {
          const existingIds = new Set(prevRecords.map((r) => r.id));
          const newRecords = backup.record.filter((incoming) => {
            if (existingIds.has(incoming.id)) return false;
            const isDuplicate = prevRecords.some(
              (r) =>
                r.veicoloId === incoming.veicoloId &&
                r.data === incoming.data &&
                r.km === incoming.km &&
                r.titolo.trim().toLowerCase() === incoming.titolo.trim().toLowerCase()
            );
            return !isDuplicate;
          });
          return [...newRecords, ...prevRecords];
        });
      }

      // Merge intelligente e capillare del Catalogo Lavorazioni (Categorie -> Sottocategorie -> Lavorazioni)
      if (backup.catalogoPersonalizzato && Array.isArray(backup.catalogoPersonalizzato) && backup.catalogoPersonalizzato.length > 0) {
        const incomingCatalog = backup.catalogoPersonalizzato;
        setCatalogo((prevCatalog) => {
          const merged = [...prevCatalog];
          incomingCatalog.forEach((incomingCat) => {
            const existCatIndex = merged.findIndex(
              (c) => c.nome.trim().toLowerCase() === incomingCat.nome.trim().toLowerCase()
            );
            if (existCatIndex < 0) {
              // Categoria completamente nuova
              merged.push(incomingCat);
            } else {
              // Categoria già presente: unisci sottocategorie e attività/lavorazioni interne
              const curCat = merged[existCatIndex];
              const curSubcats = [...curCat.sottocategorie];
              (incomingCat.sottocategorie || []).forEach((inSub) => {
                const subIdx = curSubcats.findIndex(
                  (s) => s.nome.trim().toLowerCase() === inSub.nome.trim().toLowerCase()
                );
                if (subIdx < 0) {
                  curSubcats.push(inSub);
                } else {
                  const curSub = curSubcats[subIdx];
                  const curLavs = [...curSub.lavorazioni];
                  (inSub.lavorazioni || []).forEach((inLav) => {
                    if (!curLavs.some((l) => l.nome.trim().toLowerCase() === inLav.nome.trim().toLowerCase())) {
                      curLavs.push(inLav);
                    }
                  });
                  curSubcats[subIdx] = { ...curSub, lavorazioni: curLavs };
                }
              });
              merged[existCatIndex] = { ...curCat, sottocategorie: curSubcats };
            }
          });
          saveStoredCatalog(merged);
          return merged;
        });
      }

      // Merge dell'Anagrafica Officine & Specialisti
      if (backup.officineAnagrafica && Array.isArray(backup.officineAnagrafica) && backup.officineAnagrafica.length > 0) {
        const incomingList = backup.officineAnagrafica;
        setOfficineAnagrafica((prevOfficine) => {
          const merged = [...prevOfficine];
          incomingList.forEach((incomingOff) => {
            const matchIndex = merged.findIndex(
              (o) => o.nome.trim().toLowerCase() === incomingOff.nome.trim().toLowerCase()
            );
            if (matchIndex >= 0) {
              const cur = merged[matchIndex];
              merged[matchIndex] = {
                ...cur,
                telefono: incomingOff.telefono || cur.telefono,
                referente: incomingOff.referente || cur.referente,
                indirizzo: incomingOff.indirizzo || cur.indirizzo,
                tipo: incomingOff.tipo || cur.tipo,
              };
            } else {
              merged.push(incomingOff);
            }
          });
          saveStoredOfficine(merged);
          return merged;
        });
      }
    }

    // Assicura che le officine di tutti i veicoli ripristinati siano sempre sincronizzate nel Menu Comune
    if (backup.veicoli && Array.isArray(backup.veicoli)) {
      setTimeout(() => {
        backup.veicoli.forEach((v) => syncOfficineFromVehicle(v));
      }, 100);
    }
  };

  const handleResetCatalog = () => {
    setCatalogo(DEFAULT_CATALOG);
  };

  const handleUpdateVehicleDeadline = (
    veicoloId: string,
    tipo: TipoPagamentoScadenza,
    nuovaScadenza: string,
    importo?: number,
    compagnia?: string
  ) => {
    setVeicoli((prev) =>
      prev.map((v) => {
        if (v.id !== veicoloId) return v;
        if (tipo === 'Bollo') {
          return {
            ...v,
            scadenzaBollo: nuovaScadenza,
            pagabileEntroBollo: computeBolloPagabileEntro(nuovaScadenza),
            importoBollo: importo !== undefined && importo > 0 ? importo : v.importoBollo,
          };
        } else if (tipo === 'Revisione') {
          return { ...v, scadenzaRevisione: nuovaScadenza };
        } else if (tipo === 'Assicurazione') {
          return {
            ...v,
            scadenzaAssicurazione: nuovaScadenza,
            importoAssicurazione:
              importo !== undefined && importo > 0 ? importo : v.importoAssicurazione,
            compagniaAssicurazione: compagnia || v.compagniaAssicurazione,
          };
        }
        return v;
      })
    );
  };

  const handleDeleteVehicleDeadline = (veicoloId: string, tipo: TipoPagamentoScadenza) => {
    const targetVehicle = veicoli.find((v) => v.id === veicoloId);
    // 1. Rimuove la scheda in attesa corrente
    const remainingRecords = record.filter(
      (r) =>
        !(
          r.veicoloId === veicoloId &&
          r.registroPagamento?.tipoPagamento === tipo &&
          r.registroPagamento?.pagato === false
        )
    );

    // 2. Se esistono pagamenti saldati nello storico, ripristina la scadenza più prossima leggendo il Punto 3
    if (targetVehicle) {
      const eff = getEffectiveUpcomingDeadline(targetVehicle, tipo, remainingRecords);
      if (eff.previousPaidRecord && eff.dataScadenza) {
        setVeicoli((prev) =>
          prev.map((v) => {
            if (v.id !== veicoloId) return v;
            if (tipo === 'Bollo') {
              return {
                ...v,
                scadenzaBollo: eff.dataScadenza,
                pagabileEntroBollo: eff.pagabileEntro || computeBolloPagabileEntro(eff.dataScadenza),
                importoBollo: eff.importo > 0 ? eff.importo : v.importoBollo,
              };
            } else if (tipo === 'Revisione') {
              return {
                ...v,
                scadenzaRevisione: eff.dataScadenza,
              };
            } else if (tipo === 'Assicurazione') {
              return {
                ...v,
                scadenzaAssicurazione: eff.dataScadenza,
                importoAssicurazione: eff.importo > 0 ? eff.importo : v.importoAssicurazione,
                compagniaAssicurazione: eff.enteOCompagnia || v.compagniaAssicurazione,
              };
            }
            return v;
          })
        );

        // Ricrea la scheda in attesa per la scadenza più prossima ripristinata
        const restoredRecord: InterventoRecord = {
          id: `rec-pag-${Date.now()}`,
          veicoloId,
          tipo: 'Pagamento Scadenza',
          titolo: `Scadenza ${tipo} (In attesa) - ${targetVehicle.targa}`,
          data: eff.dataScadenza,
          km: targetVehicle.kmAttuali || 0,
          costo: eff.importo,
          officina: undefined,
          lavorazioniSelezionate: [
            {
              lavorazioneId: `lav-pag-${tipo.toLowerCase()}`,
              nome: `${tipo.toUpperCase()}`,
              categoria: '4. CARROZZERIA, COMFORT E SERVIZI EXTRA',
              sottocategoria: 'Registro Scadenze e Pagamenti',
            },
          ],
          registroPagamento: {
            tipoPagamento: tipo,
            dataPagamento: '',
            dataScadenza: eff.dataScadenza,
            prossimaScadenza: eff.prossimaScadenza,
            importo: eff.importo,
            frequenza: eff.frequenza,
            pagabileEntro: eff.pagabileEntro,
            enteOCompagnia: eff.enteOCompagnia || undefined,
            numeroPolizza: eff.numeroPolizza || undefined,
            pagato: false,
          },
          haPromemoria: true,
          dataPromemoria: eff.dataScadenza,
          note: `Scadenza ripristinata: ${formatDateIt(eff.dataScadenza)} • In attesa di pagamento`,
          createdAt: new Date().toISOString(),
        };

        setRecord([restoredRecord, ...remainingRecords]);
        return;
      }
    }

    // Se non ci sono pagamenti saldati precedenti, azzera la scadenza
    setVeicoli((prev) =>
      prev.map((v) => {
        if (v.id !== veicoloId) return v;
        if (tipo === 'Bollo') {
          return {
            ...v,
            scadenzaBollo: '',
            pagabileEntroBollo: '',
            importoBollo: 0,
          };
        } else if (tipo === 'Revisione') {
          return {
            ...v,
            scadenzaRevisione: '',
          };
        } else if (tipo === 'Assicurazione') {
          return {
            ...v,
            scadenzaAssicurazione: '',
            importoAssicurazione: 0,
            compagniaAssicurazione: '',
          };
        }
        return v;
      })
    );
    setRecord(remainingRecords);
  };

  const handleFabAction = (
    action: 'manutenzione' | 'registro_gomme' | 'altri_interventi' | 'registro_pagamenti'
  ) => {
    if (action === 'manutenzione') {
      setRecordModalMode('manutenzione');
      setEditingRecord(null);
      setIsNewRecordOpen(true);
    } else if (action === 'registro_gomme') {
      setRecordModalMode('gomme');
      setEditingRecord(null);
      setIsNewRecordOpen(true);
    } else if (action === 'altri_interventi') {
      setRecordModalMode('altri_interventi');
      setEditingRecord(null);
      setIsNewRecordOpen(true);
    } else if (action === 'registro_pagamenti') {
      setRegistroPagamentiTipo('Bollo');
      setRegistroPagamentiMode('new_payment');
      setEditingPagamentoRecord(null);
      setIsRegistroPagamentiOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#090e17] text-slate-100 flex justify-center font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Container Viewport (Mobile o Desktop Widescreen PC) */}
      <div
        className={`w-full ${
          isDesktopMode ? 'max-w-6xl xl:max-w-7xl px-2 sm:px-6' : 'max-w-md md:max-w-xl'
        } min-h-screen bg-[#0d1420] border-x border-slate-900/60 flex flex-col relative shadow-2xl mx-auto transition-all duration-300`}
      >
        
        {/* Top Status Bar with DriveCheck Branding & Desktop Navigation */}
        <header className="sticky top-0 z-40 bg-[#0d1420]/95 backdrop-blur-md px-3.5 sm:px-5 py-2.5 sm:py-3 border-b border-slate-800/80 flex items-center justify-between shadow-lg gap-2 no-print">
          {/* Logo & Branding */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center shadow-lg shadow-emerald-950/60 p-0.5 overflow-hidden">
              <img src="/drivecheck_icon.png" alt="DriveCheck" className="w-full h-full object-cover rounded-lg" />
            </div>
            <div>
              <span className="text-sm font-black tracking-wider uppercase bg-gradient-to-r from-emerald-400 via-green-300 to-teal-300 bg-clip-text text-transparent block leading-tight">
                DriveCheck
              </span>
              <span className="text-[9px] text-emerald-400/80 font-mono block">
                {isDesktopMode ? 'Modalità Desktop PC (Widescreen)' : 'Gestione Parco & Scadenze'}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Tabs (visibili solo in modalità Desktop su schermi grandi) */}
          {isDesktopMode && (
            <div className="hidden md:flex items-center gap-1 bg-[#090f19] p-1 rounded-2xl border border-slate-800/90 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('riepilogo')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'riepilogo'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                Riepilogo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('cronologia')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'cronologia'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                Cronologia ({record.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('garage')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'garage'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                Parco Auto ({veicoli.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('imposta')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'imposta'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                Impostazioni
              </button>
            </div>
          )}

          {/* Action Buttons: Desktop & Mobile Responsive */}
          <div className="shrink-0 relative">
            {/* 1. DESKTOP / TABLET (schermi md e superiori) */}
            <div className="hidden md:flex items-center gap-1.5 sm:gap-2">
              {/* Tasto Cambio Modalità: PC vs Smartphone */}
              <button
                onClick={toggleDesktopMode}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isDesktopMode
                    ? 'bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border-indigo-500/50 shadow-sm'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
                }`}
                title={isDesktopMode ? 'Passa a visualizzazione Mobile Smartphone' : 'Passa a visualizzazione Desktop PC a schermo intero'}
              >
                {isDesktopMode ? (
                  <>
                    <Monitor size={14} className="text-indigo-400" />
                    <span>Vista PC</span>
                  </>
                ) : (
                  <>
                    <Smartphone size={14} className="text-emerald-400" />
                    <span>Vista Mobile</span>
                  </>
                )}
              </button>

              {/* Comando Rapido: Esporta / Importa */}
              <button
                onClick={() => setIsDataTransferModalOpen(true)}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400/40 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-950 transition-all cursor-pointer active:scale-95"
                title="Centro Esportazioni, Importazioni & Backup Dati (Excel, CSV, Drive)"
              >
                <FolderSync size={13} />
                <span>Esporta / Importa</span>
              </button>

              {/* Comando Rapido: Stampa Report */}
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-teal-300 hover:text-white border border-teal-500/40 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Stampa Scheda o Parco Macchine"
              >
                <Printer size={13} />
                <span>Stampa</span>
              </button>

              {/* Aggiorna Grafica & Svuota Cache PC */}
              <button
                type="button"
                onClick={handleForceRefreshApp}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Ricarica l'applicazione e forza l'aggiornamento della grafica su PC"
              >
                <RefreshCw size={13} className={isRefreshingCache ? 'animate-spin' : ''} />
                <span>Aggiorna Grafica</span>
              </button>

              <button
                onClick={() => setIsUserGuideOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-teal-300 hover:text-white border border-teal-500/40 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Guida all'Uso DriverCheck"
              >
                <BookOpen size={13} />
                <span>Guida</span>
              </button>

              <button
                onClick={() => setIsInstallModalOpen(true)}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-all cursor-pointer"
                title="Scarica / Installa app su PC o Smartphone"
              >
                <Download size={13} />
                <span>{isDesktopMode ? 'Installa PC' : 'Installa App'}</span>
              </button>

              {/* Tasto 3 Puntini Menu Rapido Desktop */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`p-1.5 rounded-xl border text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
                  isMobileMenuOpen
                    ? 'bg-slate-700 text-white border-slate-500 shadow-md'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/80'
                }`}
                title="Menu con i 3 puntini (Altre opzioni)"
                aria-label="Menu opzioni"
              >
                <MoreVertical size={16} />
              </button>
            </div>

            {/* 2. MOBILE (schermi piccoli: compatto, mai fuori schermo!) */}
            <div className="flex md:hidden items-center gap-1.5">
              {/* Tasto Esporta/Dati Principale */}
              <button
                onClick={() => setIsDataTransferModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400/40 text-xs font-bold flex items-center gap-1 shadow-md shadow-blue-950 active:scale-95 cursor-pointer"
                title="Centro Esporta / Importa & Backup"
              >
                <FolderSync size={13} />
                <span>Esporta</span>
              </button>

              {/* Tasto Altro / Menu Rapido 3 puntini */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`p-1.5 rounded-xl border text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
                  isMobileMenuOpen
                    ? 'bg-slate-700 text-white border-slate-500 shadow-md'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/80'
                }`}
                title="Altre funzioni del menu (3 puntini)"
                aria-label="Altre opzioni"
              >
                <MoreVertical size={16} />
              </button>
            </div>

            {/* Menu a comparsa con tutte le opzioni (accessibile da mobile e da PC desktop) */}
            {isMobileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <div className="absolute right-0 top-11 z-50 w-60 bg-[#111827] border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                    <span>Menu 3 Puntini</span>
                    <span className="text-[9px] text-emerald-400 font-mono">DriverCheck</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsPrintModalOpen(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Printer size={15} className="text-teal-400" />
                    <span>Stampa Schede & Report</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleForceRefreshApp();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-amber-300 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw size={15} className={`text-amber-400 ${isRefreshingCache ? 'animate-spin' : ''}`} />
                    <span>Aggiorna Grafica & Cache</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      toggleDesktopMode();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      {isDesktopMode ? (
                        <>
                          <Smartphone size={15} className="text-emerald-400" />
                          <span>Vista Smartphone (Mobile)</span>
                        </>
                      ) : (
                        <>
                          <Monitor size={15} className="text-indigo-400" />
                          <span>Vista Desktop PC (Widescreen)</span>
                        </>
                      )}
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {isDesktopMode ? 'Attiva PC' : 'Attiva Mobile'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsDataTransferModalOpen(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <FolderSync size={15} className="text-blue-400" />
                    <span>Centro Esporta / Importa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsUserGuideOpen(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <BookOpen size={15} className="text-blue-400" />
                    <span>Guida all'Uso DriverCheck</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsInstallModalOpen(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-emerald-300 hover:text-emerald-200 hover:bg-emerald-950/40 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Download size={15} className="text-emerald-400" />
                    <span>Installa App / PC</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Offline Banner Indicator */}
        {!isOnline && (
          <div className="bg-amber-600/95 text-white px-3.5 py-2 text-xs flex items-center gap-2.5 border-b border-amber-500 shadow-md">
            <WifiOff size={16} className="shrink-0 text-amber-200 animate-pulse" />
            <div className="flex-1 text-[11px] leading-tight">
              <strong className="block text-white">Modalità Offline attiva</strong>
              I dati che inserisci vengono salvati localmente sul dispositivo e saranno sincronizzabili sul cloud non appena riavrai connessione.
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className={`flex-1 px-3 sm:px-4 pt-3 pb-28 ${isPrintModalOpen ? 'no-print' : ''}`}>
          {activeTab === 'riepilogo' && (
            <SummaryView
              veicolo={currentVehicle}
              veicoli={veicoli}
              record={record}
              catalogo={catalogo}
              onOpenNewRecord={() => {
                setRecordModalMode('manutenzione');
                setEditingRecord(null);
                setIsRecordCopyMode(false);
                setIsNewRecordOpen(true);
              }}
              onOpenRegistroGomme={() => {
                setRecordModalMode('gomme');
                setEditingRecord(null);
                setIsRecordCopyMode(false);
                setIsNewRecordOpen(true);
              }}
              onOpenAltriInterventi={() => {
                setRecordModalMode('altri_interventi');
                setEditingRecord(null);
                setIsRecordCopyMode(false);
                setIsNewRecordOpen(true);
              }}
              onOpenRegistroPagamenti={(tipo) => {
                const targetTipo = tipo || 'Bollo';
                setRegistroPagamentiTipo(targetTipo);
                setRegistroPagamentiMode('current_card');
                setRegistroPagamentiInitialTab('nuovo');
                setIsRecordCopyMode(false);
                const pending = record.find(
                  (r) =>
                    r.veicoloId === currentVehicle?.id &&
                    r.registroPagamento?.tipoPagamento === targetTipo &&
                    r.registroPagamento?.pagato === false
                );
                setEditingPagamentoRecord(pending || null);
                setIsRegistroPagamentiOpen(true);
              }}
              onOpenUpdateKm={() => setIsUpdateKmOpen(true)}
              onOpenVehicleDetails={() => setIsVehicleDetailsOpen(true)}
              onOpenDataTransferModal={() => setIsDataTransferModalOpen(true)}
              onOpenPrintModal={() => setIsPrintModalOpen(true)}
              onSwitchTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'cronologia' && (
            <HistoryView
              veicolo={currentVehicle}
              record={record}
              onSelectRecord={(rec) => {
                setSelectedRecordForDetails(rec);
                setIsRecordDetailsOpen(true);
              }}
              onOpenNewRecord={(mode) => {
                setEditingRecord(null);
                setIsRecordCopyMode(false);
                setRecordModalMode(mode || 'manutenzione');
                setIsNewRecordOpen(true);
              }}
              onOpenRegistroPagamenti={(tipo, mode, tab) => {
                const targetTipo = tipo || 'Bollo';
                setRegistroPagamentiTipo(targetTipo);
                const actualMode = mode || 'current_card';
                setRegistroPagamentiMode(actualMode);
                setRegistroPagamentiInitialTab(tab || 'nuovo');
                setIsRecordCopyMode(false);
                if (actualMode === 'current_card') {
                  const pending = record.find(
                    (r) =>
                      r.veicoloId === currentVehicle?.id &&
                      r.registroPagamento?.tipoPagamento === targetTipo &&
                      r.registroPagamento?.pagato === false
                  );
                  setEditingPagamentoRecord(pending || null);
                } else {
                  setEditingPagamentoRecord(null);
                }
                setIsRegistroPagamentiOpen(true);
              }}
              onDeleteVehicleDeadline={handleDeleteVehicleDeadline}
              onOpenGoogleSync={() => setIsGoogleSyncModalOpen(true)}
            />
          )}

          {activeTab === 'garage' && (
            <GarageView
              veicoli={veicoli}
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={(id) => setSelectedVehicleId(id)}
              onOpenVehicleDetails={(isEditMode) => {
                setVehicleDetailsInitialEdit(!!isEditMode);
                setIsVehicleDetailsOpen(true);
              }}
              onOpenAddVehicle={() => setIsAddVehicleOpen(true)}
              onOpenUpdateKm={() => setIsUpdateKmOpen(true)}
              onDeleteVehicle={handleDeleteVehicle}
              onDuplicateVehicle={handleDuplicateVehicle}
            />
          )}

          {activeTab === 'imposta' && (
            <SettingsView
              veicoli={veicoli}
              record={record}
              catalogo={catalogo}
              officineAnagrafica={officineAnagrafica}
              onUpdateOfficine={handleUpdateOfficine}
              selectedVehicleId={selectedVehicleId}
              onRestoreAllData={handleRestoreAllData}
              onResetCatalog={handleResetCatalog}
              onUpdateCatalogo={(nuovo) => setCatalogo(nuovo)}
              onOpenInstallModal={() => setIsInstallModalOpen(true)}
              onOpenExportModal={() => setIsDataTransferModalOpen(true)}
              onOpenDataTransferModal={() => setIsDataTransferModalOpen(true)}
              onOpenPrintModal={() => setIsPrintModalOpen(true)}
              onDeleteAllVehicles={handleDeleteAllVehicles}
              onOpenUserGuide={() => setIsUserGuideOpen(true)}
              isDesktopMode={isDesktopMode}
              onToggleDesktopMode={toggleDesktopMode}
              onForceRefreshApp={handleForceRefreshApp}
            />
          )}
        </main>

        {/* Speed Dial Overlay */}
        <div className="no-print">
          <FabSpeedDial
            isOpen={isFabOpen}
            onClose={() => setIsFabOpen(false)}
            onSelectAction={handleFabAction}
            onOpenDataTransfer={() => setIsDataTransferModalOpen(true)}
          />

          {/* Bottom Navigation */}
          <Navigation
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              setIsFabOpen(false);
            }}
            onOpenFab={() => setIsFabOpen(!isFabOpen)}
            isFabOpen={isFabOpen}
            isDesktopMode={isDesktopMode}
          />
        </div>

        {/* New / Edit Record Modal */}
        {currentVehicle && (
          <NewRecordModal
            isOpen={isNewRecordOpen}
            onClose={() => {
              setIsNewRecordOpen(false);
              setEditingRecord(null);
              setIsRecordCopyMode(false);
            }}
            veicolo={currentVehicle}
            catalogo={catalogo}
            onUpdateCatalogo={(nuovo) => setCatalogo(nuovo)}
            onSaveRecord={handleSaveRecord}
            editingRecord={editingRecord}
            initialMode={recordModalMode}
            officineSalvate={officineSalvate}
            officineAnagrafica={officineAnagrafica}
            onAddNewOfficina={handleAddNewOfficina}
            onDeleteOfficina={handleDeleteOfficina}
            isCopyMode={isRecordCopyMode}
            onDeleteRecord={handleDeleteRecord}
          />
        )}

        {/* Registro Gomme Modal */}
        {currentVehicle && (
          <RegistroGommeModal
            isOpen={isRegistroGommeOpen}
            onClose={() => {
              setIsRegistroGommeOpen(false);
              setEditingGommeRecord(null);
              setIsRecordCopyMode(false);
            }}
            veicolo={currentVehicle}
            onSaveRecord={handleSaveRecord}
            editingRecord={editingGommeRecord}
            officineSalvate={officineSalvate}
            officineAnagrafica={officineAnagrafica}
            onAddNewOfficina={handleAddNewOfficina}
            onDeleteOfficina={handleDeleteOfficina}
            isCopyMode={isRecordCopyMode}
            onDeleteRecord={handleDeleteRecord}
          />
        )}

        {/* Registro Pagamenti (Revisione, Bollo, Assicurazione) Modal */}
        {currentVehicle && (
          <RegistroPagamentiModal
            isOpen={isRegistroPagamentiOpen}
            onClose={() => {
              setIsRegistroPagamentiOpen(false);
              setEditingPagamentoRecord(null);
              setIsRecordCopyMode(false);
            }}
            veicolo={currentVehicle}
            onSaveRecord={handleSaveRecord}
            onUpdateVehicleDeadline={handleUpdateVehicleDeadline}
            onDeleteVehicleDeadline={handleDeleteVehicleDeadline}
            editingRecord={editingPagamentoRecord}
            initialTipoPagamento={registroPagamentiTipo}
            initialMode={registroPagamentiMode}
            initialTab={registroPagamentiInitialTab}
            officineSalvate={officineSalvate}
            officineAnagrafica={officineAnagrafica}
            onAddNewOfficina={handleAddNewOfficina}
            entiRiscossione={entiRiscossione}
            compagnieAssicurative={compagnieAssicurative}
            onAddEnteRiscossione={handleAddEnteRiscossione}
            onAddCompagniaAssicurativa={handleAddCompagniaAssicurativa}
            allRecords={record}
            onDeleteRecord={handleDeleteRecord}
            isCopyMode={isRecordCopyMode}
          />
        )}

        {/* Record Details Modal */}
        <RecordDetailsModal
          isOpen={isRecordDetailsOpen}
          onClose={() => {
            setIsRecordDetailsOpen(false);
            setSelectedRecordForDetails(null);
          }}
          record={selectedRecordForDetails}
          veicolo={currentVehicle}
          onEdit={(rec) => {
            setIsRecordDetailsOpen(false);
            setIsRecordCopyMode(false); // Modifica: aggiorna questa scheda attuale!
            if (rec.tipo === 'Gomme' || !!rec.registroGomme) {
              setEditingGommeRecord(rec);
              setIsRegistroGommeOpen(true);
            } else if (rec.tipo === 'Pagamento Scadenza' || !!rec.registroPagamento) {
              setEditingPagamentoRecord(rec);
              setRegistroPagamentiTipo(rec.registroPagamento?.tipoPagamento || 'Bollo');
              const isPending = rec.registroPagamento?.pagato === false;
              setRegistroPagamentiMode(isPending ? 'current_card' : 'history_record');
              setRegistroPagamentiInitialTab('nuovo');
              setIsRegistroPagamentiOpen(true);
            } else if (rec.tipo === 'Altri Interventi' || rec.tipo === 'Altro') {
              setRecordModalMode('altri_interventi');
              setEditingRecord(rec);
              setIsNewRecordOpen(true);
            } else {
              setRecordModalMode('manutenzione');
              setEditingRecord(rec);
              setIsNewRecordOpen(true);
            }
          }}
          onCopy={(rec) => {
            setIsRecordDetailsOpen(false);
            setIsRecordCopyMode(true); // Copia: duplica i dati e al salvataggio crea una NUOVA scheda!
            if (rec.tipo === 'Gomme' || !!rec.registroGomme) {
              setEditingGommeRecord(rec);
              setIsRegistroGommeOpen(true);
            } else if (rec.tipo === 'Pagamento Scadenza' || !!rec.registroPagamento) {
              setEditingPagamentoRecord(rec);
              setRegistroPagamentiTipo(rec.registroPagamento?.tipoPagamento || 'Bollo');
              setRegistroPagamentiMode('new_payment');
              setIsRegistroPagamentiOpen(true);
            } else if (rec.tipo === 'Altri Interventi' || rec.tipo === 'Altro') {
              setRecordModalMode('altri_interventi');
              setEditingRecord(rec);
              setIsNewRecordOpen(true);
            } else {
              setRecordModalMode('manutenzione');
              setEditingRecord(rec);
              setIsNewRecordOpen(true);
            }
          }}
          onDelete={handleDeleteRecord}
        />

        {/* Vehicle Details Modal (Scheda Tecnica) */}
        {currentVehicle && (
          <VehicleDetailsModal
            isOpen={isVehicleDetailsOpen}
            onClose={() => setIsVehicleDetailsOpen(false)}
            veicolo={currentVehicle}
            onSaveVehicle={handleSaveVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            onDuplicateVehicle={handleDuplicateVehicle}
            initialEditing={vehicleDetailsInitialEdit}
            officineSalvate={officineSalvate}
            officineAnagrafica={officineAnagrafica}
            onAddNewOfficina={handleAddNewOfficina}
            onDeleteOfficina={handleDeleteOfficina}
          />
        )}

        {/* Add Vehicle Modal */}
        <AddVehicleModal
          isOpen={isAddVehicleOpen}
          onClose={() => setIsAddVehicleOpen(false)}
          onAddVehicle={handleAddVehicle}
          officineSalvate={officineSalvate}
          officineAnagrafica={officineAnagrafica}
          onAddNewOfficina={handleAddNewOfficina}
          onDeleteOfficina={handleDeleteOfficina}
        />

        {/* Update KM Modal */}
        {currentVehicle && (
          <UpdateKmModal
            isOpen={isUpdateKmOpen}
            onClose={() => setIsUpdateKmOpen(false)}
            veicolo={currentVehicle}
            onUpdateKm={handleUpdateVehicleKm}
          />
        )}

        {/* Install PWA Modal */}
        <InstallAppModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
        />

        {/* Google Calendar Sync Modal */}
        <GoogleCalendarSyncModal
          isOpen={isGoogleSyncModalOpen}
          onClose={() => setIsGoogleSyncModalOpen(false)}
          veicolo={currentVehicle}
        />

        {/* Centro Esportazioni, Importazioni & Backup Modal (Unificato e Completo) */}
        <DataTransferModal
          isOpen={isDataTransferModalOpen}
          onClose={() => setIsDataTransferModalOpen(false)}
          veicoli={veicoli}
          record={record}
          catalogo={catalogo}
          officineAnagrafica={officineAnagrafica}
          onRestoreAllData={handleRestoreAllData}
          onUpdateCatalogo={(nuovo) => setCatalogo(nuovo)}
          onResetCatalog={handleResetCatalog}
          onUpdateOfficine={(nuove) => {
            setOfficineAnagrafica(nuove);
            saveStoredOfficine(nuove);
          }}
          onOpenPrintModal={() => setIsPrintModalOpen(true)}
        />

        {/* Stampa Report & Schede Veicoli */}
        <PrintReportModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          veicoli={veicoli}
          record={record}
          defaultSelectedVehicleId={selectedVehicleId}
        />

        {/* User Guide Modal */}
        <UserGuideModal
          isOpen={isUserGuideOpen}
          onClose={() => setIsUserGuideOpen(false)}
        />

      </div>
    </div>
  );
}
