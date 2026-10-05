import React, { useState, useEffect, useRef } from 'react';
import { Veicolo, InterventoRecord, CategoriaManutenzione, AppDataBackup, DriveBackupFileInfo, AnagraficaOfficina } from '../types';
import { OfficineManagementSection } from '../components/OfficineManagementSection';
import { LavorazioniManagementSection } from '../components/LavorazioniManagementSection';
import { UnifiedDataTransfer } from '../components/UnifiedDataTransfer';
import { DEFAULT_OFFICINE } from '../data/defaultAnagrafiche';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  getCurrentUser,
  reconnectGoogleDrive,
  isGoogleTokenExpired,
} from '../services/firebaseAuth';
import {
  saveBackupToGoogleDrive,
  restoreBackupFromGoogleDriveById,
  listDriveBackupFiles,
  listDriveVehicleBackupFiles,
  listDriveCatalogFiles,
  listDriveOfficineFiles,
  listDriveAllCategorizedFiles,
  DriveCategorizedBackups,
  deleteBackupFromGoogleDrive,
  saveCatalogToGoogleDrive,
  restoreCatalogFromGoogleDriveById,
  saveOfficineToGoogleDrive,
  restoreOfficineFromGoogleDriveById,
} from '../services/googleDriveService';
import {
  syncVehicleDeadlinesToGoogleCalendar,
  CalendarSyncSettings,
  DEFAULT_CALENDAR_SETTINGS,
} from '../services/googleCalendarService';
import {
  exportFullBackupJson,
  downloadJsonBackupFile,
  downloadVehiclesJsonFile,
  downloadVehiclesCsvFile,
  exportVehiclesAndRecordsToCsv,
  importVehiclesAndRecordsFromCsv,
  exportRecordsToCsv,
  exportMultiVehicleRecordsToCsv,
  exportSelectedVehiclesJson,
  downloadCsvFile,
  exportCatalogJson,
  downloadCatalogJsonFile,
  downloadCatalogCsvFile,
  exportCatalogToCsv,
  importCatalogFromCsv,
  exportOfficineJson,
  downloadOfficineJsonFile,
  downloadOfficineCsvFile,
  exportOfficineToCsv,
  importOfficineFromCsv,
  formatDateIt,
  formatDateTimeIt,
  formatCurrency,
  getDriverCheckTimestamp,
} from '../services/storageService';
import { DEFAULT_CATALOG } from '../data/defaultCatalog';
import { downloadFleetExcelFile, importFleetFromExcel } from '../services/excelService';
import { User } from 'firebase/auth';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  Trash2,
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  LogOut,
  Sliders,
  Globe,
  Moon,
  Bell,
  HelpCircle,
  BookOpen,
  FileText,
  Info,
  Car,
  Smartphone,
  HardDrive,
  Wifi,
  FolderDown,
  FolderUp,
  FolderSync,
  CalendarDays,
  ExternalLink,
  CheckSquare,
  Square,
  Layers,
  Check,
  Calendar,
  Settings,
  Monitor,
  Laptop,
  ChevronRight,
  Plus,
  Clock,
  Mail,
  Wrench,
  Building2,
  Printer,
} from 'lucide-react';

interface SettingsViewProps {
  veicoli: Veicolo[];
  record: InterventoRecord[];
  catalogo: CategoriaManutenzione[];
  officineAnagrafica?: AnagraficaOfficina[];
  onUpdateOfficine?: (officine: AnagraficaOfficina[]) => void;
  selectedVehicleId: string;
  onRestoreAllData: (data: AppDataBackup, mode?: 'overwrite' | 'merge') => void;
  onResetCatalog: () => void;
  onUpdateCatalogo?: (catalogo: CategoriaManutenzione[]) => void;
  onOpenInstallModal?: () => void;
  onOpenExportModal?: () => void;
  onDeleteAllVehicles?: () => void;
  onOpenUserGuide?: () => void;
  onOpenPrintModal?: () => void;
  onOpenDataTransferModal?: () => void;
  isDesktopMode?: boolean;
  onToggleDesktopMode?: () => void;
  onForceRefreshApp?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  veicoli,
  record,
  catalogo,
  officineAnagrafica = [],
  onUpdateOfficine,
  selectedVehicleId,
  onRestoreAllData,
  onResetCatalog,
  onUpdateCatalogo,
  onOpenInstallModal,
  onOpenExportModal,
  onDeleteAllVehicles,
  onOpenUserGuide,
  onOpenPrintModal,
  onOpenDataTransferModal,
  isDesktopMode,
  onToggleDesktopMode,
  onForceRefreshApp,
}) => {
  const [isRefreshingCache, setIsRefreshingCache] = useState(false);

  const handleInternalRefresh = async () => {
    setIsRefreshingCache(true);
    if (onForceRefreshApp) {
      onForceRefreshApp();
      return;
    }
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch (e) {
      console.warn('Errore pulizia cache:', e);
    }
    window.location.reload();
  };
  // SOTTOMENU IMPOSTAZIONI: 'dati' | 'catalogo' | 'calendar' | 'info'
  const [activeSubmenu, setActiveSubmenu] = useState<'dati' | 'catalogo' | 'calendar' | 'info'>('dati');
  // SOTTOMENU COMUNE PARCO MACCHINE: 'lavorazioni' | 'officine'
  const [subMenuComune, setSubMenuComune] = useState<'lavorazioni' | 'officine'>('lavorazioni');

  const submenuBarRef = useRef<HTMLDivElement>(null);
  const commonMenuRef = useRef<HTMLDivElement>(null);

  // Scorrimento fluido all'inizio del sottomenu attivato
  const scrollToSubmenu = () => {
    setTimeout(() => {
      if (submenuBarRef.current) {
        submenuBarRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  const scrollToCommonMenu = () => {
    setTimeout(() => {
      if (commonMenuRef.current) {
        commonMenuRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  // Quando si naviga tra i sottomenu, avvia la visualizzazione sempre dall'inizio del sottomenu
  useEffect(() => {
    scrollToSubmenu();
  }, [activeSubmenu]);

  useEffect(() => {
    scrollToCommonMenu();
  }, [subMenuComune]);

  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser());
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // File di backup Google Drive organizzati per categoria: TUTTI, VEICOLI, CATALOGO, OFFICINE
  const [driveAllFilesList, setDriveAllFilesList] = useState<DriveBackupFileInfo[]>([]);
  const [driveVehicleFilesList, setDriveVehicleFilesList] = useState<DriveBackupFileInfo[]>([]);
  const [driveCatalogFilesList, setDriveCatalogFilesList] = useState<DriveBackupFileInfo[]>([]);
  const [driveOfficineFilesList, setDriveOfficineFilesList] = useState<DriveBackupFileInfo[]>([]);
  const [driveFilterTab, setDriveFilterTab] = useState<'all' | 'veicoli' | 'catalogo' | 'officine'>('all');
  const [isLoadingVehicleFiles, setIsLoadingVehicleFiles] = useState<boolean>(false);
  const [isLoadingCatalogFiles, setIsLoadingCatalogFiles] = useState<boolean>(false);
  const [isSavingCatalogToDrive, setIsSavingCatalogToDrive] = useState<boolean>(false);
  const [isDriveSessionExpired, setIsDriveSessionExpired] = useState<boolean>(false);
  const [isRenewingDrive, setIsRenewingDrive] = useState<boolean>(false);

  const [driveBackupInfo, setDriveBackupInfo] = useState<DriveBackupFileInfo | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // SELEZIONE AUTO DA ESPORTARE / SALVARE
  const [exportSelectedIds, setExportSelectedIds] = useState<string[]>(() => veicoli.map((v) => v.id));

  // GOOGLE CALENDAR: Selezione auto da sincronizzare (di default l'auto corrente!)
  const [calendarSelectedIds, setCalendarSelectedIds] = useState<string[]>(() => {
    if (selectedVehicleId && veicoli.some((v) => v.id === selectedVehicleId)) {
      return [selectedVehicleId];
    }
    return veicoli.length > 0 ? [veicoli[0].id] : [];
  });
  const [isSyncingCalendar, setIsSyncingCalendar] = useState<boolean>(false);

  // Aggiorna di default l'auto corrente per il calendario quando cambia il veicolo selezionato
  useEffect(() => {
    if (selectedVehicleId && veicoli.some((v) => v.id === selectedVehicleId)) {
      setCalendarSelectedIds((prev) => (prev.length === 0 ? [selectedVehicleId] : prev));
    }
  }, [selectedVehicleId]);

  // Aggiorna veicoli esportati se cambia il parco
  useEffect(() => {
    setExportSelectedIds(veicoli.map((v) => v.id));
  }, [veicoli]);

  // Impostazioni Sveglie & Promemoria Google Calendar
  const [calendarSettings, setCalendarSettings] = useState<CalendarSyncSettings>(() => {
    try {
      const saved = localStorage.getItem('drivecheck_calendar_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_CALENDAR_SETTINGS;
  });

  const updateCalendarSetting = (key: keyof CalendarSyncSettings, val: any) => {
    setCalendarSettings((prev) => {
      const updated = { ...prev, [key]: val };
      try {
        localStorage.setItem('drivecheck_calendar_settings', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Modale di conferma per azioni distruttive o ripristino
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType:
      | 'restore_drive_file'
      | 'restore_drive'
      | 'delete_drive'
      | 'delete_catalog_drive'
      | 'delete_officine_drive'
      | 'restore_local'
      | 'reset_catalog'
      | 'import_catalog'
      | 'delete_all_vehicles'
      | 'restore_drive_catalog'
      | 'restore_drive_officine';
    payload?: any;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionType: 'restore_drive',
  });

  const selectedVehicle = veicoli.find((v) => v.id === selectedVehicleId) || veicoli[0];

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        if (isGoogleTokenExpired()) {
          setIsDriveSessionExpired(true);
        } else {
          setIsDriveSessionExpired(false);
        }
        checkDriveBackup();
      },
      () => {
        setCurrentUser(null);
        setDriveBackupInfo(null);
        setDriveAllFilesList([]);
        setDriveVehicleFilesList([]);
        setDriveCatalogFilesList([]);
        setDriveOfficineFilesList([]);
        setDriveError(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Caricamento unificato e categorizzato dei file su Google Drive
  const checkDriveBackup = async () => {
    setIsLoadingVehicleFiles(true);
    setIsLoadingCatalogFiles(true);
    setDriveError(null);
    try {
      if (isGoogleTokenExpired()) {
        setIsDriveSessionExpired(true);
        return;
      }
      const token = await getAccessToken();
      if (!token) return;

      const res = await listDriveAllCategorizedFiles();
      setDriveAllFilesList(res.all);
      setDriveVehicleFilesList(res.veicoli);
      setDriveCatalogFilesList(res.catalogo);
      setDriveOfficineFilesList(res.officine);
      setIsDriveSessionExpired(false);
      if (res.veicoli.length > 0) {
        setDriveBackupInfo(res.veicoli[0]);
      } else {
        setDriveBackupInfo(null);
      }
    } catch (e: any) {
      console.warn('Controllo backup Drive:', e);
      if (e.message?.includes('SESSION_EXPIRED') || e.message?.includes('401')) {
        setIsDriveSessionExpired(true);
      }
      setDriveError(e.message || 'Errore durante la ricerca dei backup su Google Drive');
    } finally {
      setIsLoadingVehicleFiles(false);
      setIsLoadingCatalogFiles(false);
    }
  };

  const handleRenewDriveSession = async () => {
    setIsRenewingDrive(true);
    setFeedbackMessage(null);
    try {
      const res = await reconnectGoogleDrive();
      setCurrentUser(res.user);
      setIsDriveSessionExpired(false);
      await checkDriveBackup();
      setFeedbackMessage({
        type: 'success',
        text: '✓ Connessione a Google Drive rinnovata con successo! Elenco backup aggiornato.',
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `Errore rinnovo sessione: ${err.message}`,
      });
    } finally {
      setIsRenewingDrive(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setFeedbackMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setIsDriveSessionExpired(false);
        setFeedbackMessage({
          type: 'success',
          text: `Accesso eseguito come ${res.user.email}. Google Drive pronto.`,
        });
        await checkDriveBackup();
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `Accesso Google annullato o non riuscito: ${err.message}`,
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logout();
      setCurrentUser(null);
      setDriveBackupInfo(null);
      setDriveAllFilesList([]);
      setDriveVehicleFilesList([]);
      setDriveCatalogFilesList([]);
      setDriveOfficineFilesList([]);
      setFeedbackMessage({
        type: 'info',
        text: 'Account Google disconnesso.',
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `Errore disconnessione: ${err.message}`,
      });
    }
  };

  // ==========================================
  // GESTIONE SELEZIONE AUTO DA ESPORTARE / SALVARE
  // ==========================================
  const toggleExportVehicle = (id: string) => {
    setExportSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllExportVehicles = () => {
    setExportSelectedIds(veicoli.map((v) => v.id));
  };

  const handleSelectCurrentExportVehicleOnly = () => {
    if (selectedVehicleId && veicoli.some((v) => v.id === selectedVehicleId)) {
      setExportSelectedIds([selectedVehicleId]);
    } else if (veicoli.length > 0) {
      setExportSelectedIds([veicoli[0].id]);
    }
  };

  const handleDeselectAllExportVehicles = () => {
    setExportSelectedIds([]);
  };

  // ==========================================
  // SALVATAGGIO DISPOSITIVO E GOOGLE DRIVE (JSON E CSV)
  // ==========================================
  const handleSaveVehiclesToDrive = async (format: 'json' | 'csv' = 'json') => {
    let activeToken = await getAccessToken();
    if (!currentUser || !activeToken || isGoogleTokenExpired()) {
      try {
        const loginRes = await googleSignIn(false);
        setCurrentUser(loginRes.user);
        activeToken = loginRes.accessToken;
        setIsDriveSessionExpired(false);
      } catch (authErr: any) {
        setFeedbackMessage({
          type: 'error',
          text: `Accesso Google necessario: ${authErr.message}`,
        });
        return;
      }
    }

    const selectedVehicles = veicoli.filter((v) => exportSelectedIds.includes(v.id));
    if (selectedVehicles.length === 0) {
      setFeedbackMessage({
        type: 'error',
        text: 'Seleziona almeno un veicolo da includere nel salvataggio',
      });
      return;
    }

    setIsSyncing(true);
    setFeedbackMessage(null);
    try {
      const setIds = new Set(exportSelectedIds);
      const recordsToExport = record.filter((r) => setIds.has(r.veicoloId));
      const backupData: AppDataBackup = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        veicoli: selectedVehicles,
        record: recordsToExport,
        catalogoPersonalizzato: catalogo,
        veicoloSelezionatoId: selectedVehicleId,
      };

      const saved = await saveBackupToGoogleDrive(backupData, format);
      setDriveBackupInfo(saved);
      setIsDriveSessionExpired(false);
      await checkDriveBackup();
      setFeedbackMessage({
        type: 'success',
        text: `✓ File salvato su Google Drive in ${format.toUpperCase()}: "${saved.name}" (${selectedVehicles.length} auto)!`,
      });
    } catch (err: any) {
      if (err.message?.includes('SESSION_EXPIRED') || err.message?.includes('401')) {
        setIsDriveSessionExpired(true);
      }
      setFeedbackMessage({
        type: 'error',
        text: `Errore salvataggio Drive: ${err.message}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportVehiclesLocal = (format: 'json' | 'csv' = 'csv') => {
    const selectedVehicles = veicoli.filter((v) => exportSelectedIds.includes(v.id));
    if (selectedVehicles.length === 0) {
      setFeedbackMessage({
        type: 'error',
        text: 'Seleziona almeno un veicolo da esportare',
      });
      return;
    }

    const setIds = new Set(exportSelectedIds);
    const recordsToExport = record.filter((r) => setIds.has(r.veicoloId));
    const timestamp = getDriverCheckTimestamp();

    if (format === 'csv') {
      const csvStr = exportVehiclesAndRecordsToCsv(selectedVehicles, recordsToExport);
      const filename = `DriverCheck_Veicoli_${timestamp}.csv`;
      downloadVehiclesCsvFile(csvStr, filename);
      setFeedbackMessage({
        type: 'success',
        text: `✓ Scaricato "${filename}" con ${selectedVehicles.length} veicoli e ${recordsToExport.length} interventi per Excel e Fogli Google!`,
      });
    } else {
      const backupData: AppDataBackup = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        veicoli: selectedVehicles,
        record: recordsToExport,
        catalogoPersonalizzato: catalogo,
        veicoloSelezionatoId: selectedVehicleId,
      };
      const filename = `DriverCheck_Veicoli_${timestamp}.json`;
      downloadVehiclesJsonFile(JSON.stringify(backupData, null, 2), filename);
      setFeedbackMessage({
        type: 'success',
        text: `✓ Scaricato backup JSON "${filename}" (${selectedVehicles.length} auto)!`,
      });
    }
  };

  const handleSaveToDeviceAndDrive = async () => {
    let activeToken = await getAccessToken();
    if (!currentUser || !activeToken || isGoogleTokenExpired()) {
      try {
        const loginRes = await googleSignIn(false);
        setCurrentUser(loginRes.user);
        activeToken = loginRes.accessToken;
        setIsDriveSessionExpired(false);
      } catch (authErr: any) {
        setFeedbackMessage({
          type: 'error',
          text: `Accesso Google necessario: ${authErr.message}`,
        });
        return;
      }
    }

    const selectedVehicles = veicoli.filter((v) => exportSelectedIds.includes(v.id));
    if (selectedVehicles.length === 0) {
      setFeedbackMessage({
        type: 'error',
        text: 'Seleziona almeno un veicolo da includere nel salvataggio',
      });
      return;
    }

    setIsSyncing(true);
    setFeedbackMessage(null);

    try {
      const setIds = new Set(exportSelectedIds);
      const recordsToExport = record.filter((r) => setIds.has(r.veicoloId));
      const backupData: AppDataBackup = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        veicoli: selectedVehicles,
        record: recordsToExport,
        catalogoPersonalizzato: catalogo,
        veicoloSelezionatoId: selectedVehicleId,
      };
      const timestamp = getDriverCheckTimestamp();

      // 1. Download locale CSV & JSON
      const csvStr = exportVehiclesAndRecordsToCsv(selectedVehicles, recordsToExport);
      downloadVehiclesCsvFile(csvStr, `DriverCheck_Veicoli_${timestamp}.csv`);
      downloadVehiclesJsonFile(JSON.stringify(backupData, null, 2), `DriverCheck_Veicoli_${timestamp}.json`);

      // 2. Salva su Google Drive in entrambi i formati (JSON e CSV)
      const savedJson = await saveBackupToGoogleDrive(backupData, 'json');
      const savedCsv = await saveBackupToGoogleDrive(backupData, 'csv');

      setIsDriveSessionExpired(false);
      await checkDriveBackup();

      setFeedbackMessage({
        type: 'success',
        text: `✓ Salvataggio completato sia su DISPOSITIVO che su GOOGLE DRIVE in formato JSON e CSV ("${savedJson.name}" e "${savedCsv.name}")!`,
      });
    } catch (err: any) {
      if (err.message?.includes('SESSION_EXPIRED') || err.message?.includes('401')) {
        setIsDriveSessionExpired(true);
      }
      setFeedbackMessage({
        type: 'error',
        text: `File scaricati sul dispositivo. Errore caricamento Drive: ${err.message}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // ==========================================
  // CATALOGO: ESPORTA SU GOOGLE DRIVE
  // ==========================================
  const handleExportCatalogToDrive = async () => {
    let activeToken = await getAccessToken();
    if (!currentUser || !activeToken) {
      try {
        const loginRes = await googleSignIn(true);
        setCurrentUser(loginRes.user);
        activeToken = loginRes.accessToken;
      } catch (authErr: any) {
        setFeedbackMessage({
          type: 'error',
          text: `Accesso Google necessario: ${authErr.message}`,
        });
        return;
      }
    }

    setIsSavingCatalogToDrive(true);
    setFeedbackMessage(null);
    try {
      let savedCatalogFile: { id: string; name: string; modifiedTime: string };
      try {
        savedCatalogFile = await saveCatalogToGoogleDrive(catalogo);
      } catch (driveErr: any) {
        if (driveErr.message?.includes('SESSION_EXPIRED') || driveErr.message?.includes('401')) {
          const fresh = await googleSignIn(true);
          setCurrentUser(fresh.user);
          savedCatalogFile = await saveCatalogToGoogleDrive(catalogo);
        } else {
          throw driveErr;
        }
      }

      const newCatalogItem: DriveBackupFileInfo = {
        id: savedCatalogFile.id,
        name: savedCatalogFile.name,
        modifiedTime: savedCatalogFile.modifiedTime,
      };

      setDriveCatalogFilesList((prev) => [newCatalogItem, ...prev.filter((f) => f.id !== newCatalogItem.id)]);

      setFeedbackMessage({
        type: 'success',
        text: `✓ Catalogo interventi salvato con successo su Google Drive: "${savedCatalogFile.name}" (${catalogo.length} categorie e tutte le relative lavorazioni esportate)!`,
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `Errore salvataggio catalogo su Drive: ${err.message}`,
      });
    } finally {
      setIsSavingCatalogToDrive(false);
    }
  };

  // Esecuzione azioni di conferma (con supporto Sovrascrivi o Aggiungi / Unisci)
  const handleExecuteConfirmAction = async (restoreMode: 'overwrite' | 'merge' = 'overwrite') => {
    const { actionType, payload } = confirmDialog;
    setConfirmDialog({ ...confirmDialog, isOpen: false });

    if (actionType === 'restore_drive_file') {
      setIsSyncing(true);
      try {
        const { data, backupInfo } = await restoreBackupFromGoogleDriveById(payload.id);
        onRestoreAllData(data, restoreMode);
        setDriveBackupInfo(backupInfo);
        const modeLabel = restoreMode === 'merge' ? 'aggiunti/uniti ai dati presenti' : 'ripristinati sostituendo i precedenti';
        setFeedbackMessage({
          type: 'success',
          text: `✓ File "${backupInfo.name}" ${modeLabel} con successo! (${data.veicoli?.length || 0} veicoli, ${data.record?.length || 0} interventi)`,
        });
      } catch (e: any) {
        setFeedbackMessage({
          type: 'error',
          text: `Errore ripristino da Drive: ${e.message}`,
        });
      } finally {
        setIsSyncing(false);
      }
    } else if (actionType === 'delete_drive') {
      setIsSyncing(true);
      try {
        await deleteBackupFromGoogleDrive(payload);
        setDriveVehicleFilesList((prev) => prev.filter((f) => f.id !== payload));
        setFeedbackMessage({
          type: 'success',
          text: 'Backup rimosso da Google Drive con successo.',
        });
      } catch (e: any) {
        setFeedbackMessage({
          type: 'error',
          text: `Errore eliminazione backup: ${e.message}`,
        });
      } finally {
        setIsSyncing(false);
      }
    } else if (actionType === 'delete_catalog_drive') {
      setIsSyncing(true);
      try {
        await deleteBackupFromGoogleDrive(payload);
        setDriveCatalogFilesList((prev) => prev.filter((f) => f.id !== payload));
        setFeedbackMessage({
          type: 'success',
          text: 'Backup del catalogo rimosso da Google Drive con successo.',
        });
      } catch (e: any) {
        setFeedbackMessage({
          type: 'error',
          text: `Errore eliminazione catalogo: ${e.message}`,
        });
      } finally {
        setIsSyncing(false);
      }
    } else if (actionType === 'delete_officine_drive') {
      setIsSyncing(true);
      try {
        await deleteBackupFromGoogleDrive(payload);
        setDriveOfficineFilesList((prev) => prev.filter((f) => f.id !== payload));
        setDriveAllFilesList((prev) => prev.filter((f) => f.id !== payload));
        setFeedbackMessage({
          type: 'success',
          text: 'Backup delle officine rimosso da Google Drive con successo.',
        });
      } catch (e: any) {
        setFeedbackMessage({
          type: 'error',
          text: `Errore eliminazione officine da Drive: ${e.message}`,
        });
      } finally {
        setIsSyncing(false);
      }
    } else if (actionType === 'restore_drive_officine') {
      if (onUpdateOfficine && payload) {
        onUpdateOfficine(payload);
      }
      setFeedbackMessage({
        type: 'success',
        text: `✓ Anagrafica officine importata con successo da Google Drive (${payload.length} officine ripristinate)!`,
      });
    } else if (actionType === 'restore_drive_catalog') {
      if (onUpdateCatalogo && payload) {
        onUpdateCatalogo(payload);
      }
      setFeedbackMessage({
        type: 'success',
        text: `✓ Catalogo importato con successo da Google Drive (${payload.length} categorie e tutte le lavorazioni ripristinate)!`,
      });
    } else if (actionType === 'restore_local') {
      onRestoreAllData(payload, restoreMode);
      const modeLabel = restoreMode === 'merge' ? 'aggiunti/uniti a quelli già presenti' : 'ripristinati sovrascrivendo i precedenti';
      setFeedbackMessage({
        type: 'success',
        text: `✓ Dati dal file locale ${modeLabel} con successo! (${payload.veicoli?.length || 0} veicoli)`,
      });
    } else if (actionType === 'reset_catalog') {
      onResetCatalog();
      setFeedbackMessage({
        type: 'info',
        text: 'Catalogo originale delle lavorazioni ripristinato.',
      });
    } else if (actionType === 'import_catalog') {
      if (onUpdateCatalogo) {
        onUpdateCatalogo(payload);
      }
      setFeedbackMessage({
        type: 'success',
        text: `Catalogo importato con successo (${payload.length} categorie)!`,
      });
    } else if (actionType === 'delete_all_vehicles') {
      if (onDeleteAllVehicles) {
        onDeleteAllVehicles();
      }
      setFeedbackMessage({
        type: 'info',
        text: 'Tutti i veicoli del parco auto e i relativi interventi sono stati eliminati.',
      });
    }
  };

  // Richiesta ripristino di uno specifico file di catalogo da Drive
  const handleRequestRestoreCatalogFile = async (file: DriveBackupFileInfo) => {
    setIsLoadingCatalogFiles(true);
    try {
      const { catalogo: downloadedCatalog, fileName } = await restoreCatalogFromGoogleDriveById(file.id);
      setConfirmDialog({
        isOpen: true,
        title: 'Ripristinare questo catalogo da Google Drive?',
        description: `Verranno caricate ${downloadedCatalog.length} categorie e tutte le relative lavorazioni dal file "${fileName}" (salvato il ${file.modifiedTime ? formatDateIt(file.modifiedTime.slice(0, 10)) : 'N/D'}).`,
        actionType: 'restore_drive_catalog',
        payload: downloadedCatalog,
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `Errore caricamento file catalogo: ${err.message}`,
      });
    } finally {
      setIsLoadingCatalogFiles(false);
    }
  };

  // Richiesta ripristino di uno specifico file di officine da Drive
  const handleRequestRestoreOfficineFile = async (file: DriveBackupFileInfo) => {
    setIsLoadingCatalogFiles(true);
    try {
      const { officine: downloadedOfficine, fileName } = await restoreOfficineFromGoogleDriveById(file.id);
      setConfirmDialog({
        isOpen: true,
        title: 'Ripristinare anagrafica officine da Google Drive?',
        description: `Verranno caricate ${downloadedOfficine.length} officine dal file "${fileName}" (salvato il ${file.modifiedTime ? formatDateIt(file.modifiedTime.slice(0, 10)) : 'N/D'}).`,
        actionType: 'restore_drive_officine',
        payload: downloadedOfficine,
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `Errore caricamento file officine da Drive: ${err.message}`,
      });
    } finally {
      setIsLoadingCatalogFiles(false);
    }
  };

  // ==========================================
  // GOOGLE CALENDAR: SINCRONIZZAZIONE VEICOLI SELEZIONATI
  // ==========================================
  const toggleCalendarVehicle = (id: string) => {
    setCalendarSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllCalendarVehicles = () => {
    setCalendarSelectedIds(veicoli.map((v) => v.id));
  };

  const handleSelectCurrentCalendarVehicleOnly = () => {
    if (selectedVehicleId) {
      setCalendarSelectedIds([selectedVehicleId]);
    } else if (veicoli.length > 0) {
      setCalendarSelectedIds([veicoli[0].id]);
    }
  };

  const handleDeselectAllCalendarVehicles = () => {
    setCalendarSelectedIds([]);
  };

  const handleSyncSelectedVehiclesToCalendar = async () => {
    const vehiclesToSync = veicoli.filter((v) => calendarSelectedIds.includes(v.id));
    if (vehiclesToSync.length === 0) {
      setFeedbackMessage({
        type: 'error',
        text: 'Seleziona almeno un veicolo da sincronizzare su Google Calendar.',
      });
      return;
    }

    setIsSyncingCalendar(true);
    setFeedbackMessage(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const res = await googleSignIn(true);
        token = res.accessToken;
        setCurrentUser(res.user);
      }

      if (!token) {
        throw new Error('Accesso Google non completato.');
      }

      let totalAdded = 0;
      let totalUpdated = 0;
      let calendarName = 'Scadenze Auto';

      for (const v of vehiclesToSync) {
        const syncRes = await syncVehicleDeadlinesToGoogleCalendar(token, v, calendarSettings);
        totalAdded += syncRes.eventsAdded;
        totalUpdated += syncRes.eventsUpdated;
        calendarName = syncRes.calendarName;
      }

      setFeedbackMessage({
        type: 'success',
        text: `✓ Calendario Google "${calendarName}" sincronizzato con successo (${totalAdded + totalUpdated} scadenze per ${vehiclesToSync.length} ${vehiclesToSync.length === 1 ? 'veicolo' : 'veicoli'})!`,
      });
    } catch (err: any) {
      console.error('Errore sincronizzazione calendario:', err);
      if (err?.message?.includes('Permessi') || err?.message?.includes('401') || err?.message?.includes('403')) {
        try {
          const fresh = await googleSignIn(true);
          setCurrentUser(fresh.user);
          setFeedbackMessage({
            type: 'info',
            text: 'Autorizzazioni Google Calendar aggiornate! Clicca di nuovo per sincronizzare.',
          });
          return;
        } catch (innerErr: any) {
          setFeedbackMessage({
            type: 'error',
            text: `Errore autorizzazione Google Calendar: ${innerErr?.message || innerErr}`,
          });
          return;
        }
      }

      setFeedbackMessage({
        type: 'error',
        text: `Errore sincronizzazione: ${err.message}`,
      });
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // Esportazione ed importazione locale
  const handleExportCatalog = () => {
    const json = exportCatalogJson(catalogo);
    downloadCatalogJsonFile(json);
    setFeedbackMessage({
      type: 'success',
      text: 'File JSON del catalogo scaricato con successo sul tuo dispositivo!',
    });
  };

  const handleImportCatalogFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!Array.isArray(parsed) || !parsed[0]?.sottocategorie) {
          throw new Error('Il file non contiene un catalogo valido di categorie e lavorazioni');
        }
        setConfirmDialog({
          isOpen: true,
          title: 'Importare il catalogo degli interventi?',
          description: `Verranno importate ${parsed.length} categorie di interventi. Il catalogo attuale verrà aggiornato.`,
          actionType: 'import_catalog',
          payload: parsed,
        });
      } catch (err: any) {
        setFeedbackMessage({
          type: 'error',
          text: `Errore caricamento catalogo: ${err.message}`,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportJson = () => {
    const filename = `DriverCheck_Veicoli_${getDriverCheckTimestamp()}.json`;
    const jsonStr = exportFullBackupJson(veicoli, record, catalogo, selectedVehicleId, officineAnagrafica);
    downloadJsonBackupFile(jsonStr, filename);
  };

  const handleLocalFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let parsed: AppDataBackup;

        if (isCsv) {
          const res = importVehiclesAndRecordsFromCsv(text);
          if (res.veicoli.length === 0 && res.records.length === 0) {
            throw new Error('Nessun veicolo o intervento valido trovato nel file CSV.');
          }
          parsed = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            veicoli: res.veicoli,
            record: res.records,
            catalogoPersonalizzato: catalogo,
            veicoloSelezionatoId: res.veicoli[0]?.id || selectedVehicleId,
          };
        } else {
          const json = JSON.parse(text);
          if (!json.veicoli || !Array.isArray(json.veicoli)) {
            throw new Error('Formato backup JSON non valido: array veicoli non trovato.');
          }
          parsed = json;
        }

        setConfirmDialog({
          isOpen: true,
          title: `Ripristinare il file "${file.name}"?`,
          description: `Il file contiene ${parsed.veicoli.length} veicoli e ${parsed.record?.length || 0} interventi. Puoi scegliere se aggiungere questi dati a quelli già presenti oppure sovrascrivere l'archivio.`,
          actionType: 'restore_local',
          payload: parsed,
        });
      } catch (err: any) {
        setFeedbackMessage({
          type: 'error',
          text: `Errore lettura file: ${err.message}`,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportSelectedCsv = () => {
    const selectedVehicles = veicoli.filter((v) => exportSelectedIds.includes(v.id));
    if (selectedVehicles.length === 0) {
      setFeedbackMessage({
        type: 'error',
        text: 'Seleziona almeno un veicolo da esportare',
      });
      return;
    }

    const setIds = new Set(exportSelectedIds);
    const recordsToExport = record.filter((r) => setIds.has(r.veicoloId));
    const csvStr = exportVehiclesAndRecordsToCsv(selectedVehicles, recordsToExport);
    const timestamp = getDriverCheckTimestamp();
    const filename = `DriverCheck_Veicoli_${timestamp}.csv`;

    downloadVehiclesCsvFile(csvStr, filename);
    setFeedbackMessage({
      type: 'success',
      text: `✓ Esportati ${selectedVehicles.length} veicoli e ${recordsToExport.length} interventi in "${filename}" per Excel e Fogli Google`,
    });
  };

  const handleExportSelectedJson = () => {
    const selectedVehicles = veicoli.filter((v) => exportSelectedIds.includes(v.id));
    if (selectedVehicles.length === 0) {
      setFeedbackMessage({
        type: 'error',
        text: 'Seleziona almeno un veicolo da esportare',
      });
      return;
    }

    const filename = `DriverCheck_Veicoli_${getDriverCheckTimestamp()}.json`;
    const jsonStr = exportSelectedVehiclesJson(selectedVehicles, record, catalogo);
    downloadJsonBackupFile(jsonStr, filename);
    setFeedbackMessage({
      type: 'success',
      text: `✓ Backup JSON "${filename}" salvato con ${selectedVehicles.length} veicoli`,
    });
  };

  const requestDeleteAllVehicles = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminare TUTTO il Parco Auto?',
      description: `Attenzione: verranno rimossi tutti i veicoli salvati (${veicoli.length} auto) e l'intero archivio storico degli interventi e scadenze. Questa operazione è definitiva e irreversibile. Si raccomanda di effettuare prima un backup completo.`,
      actionType: 'delete_all_vehicles',
    });
  };

  const handleDownloadWindowsDesktopShortcut = () => {
    let url = typeof window !== 'undefined' ? window.location.href : '';
    if (url.includes('ais-dev-')) {
      url = url.replace('ais-dev-', 'ais-pre-');
    }
    const origin = url ? new URL(url).origin : '';
    const shortcutContent = `[InternetShortcut]\r\nURL=${origin}/\r\nIconIndex=0\r\nIconFile=${origin}/favicon.ico\r\nHotKey=0\r\n`;
    const blob = new Blob([shortcutContent], { type: 'application/x-mswinurl' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = 'DriveCheck_Desktop.url';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);

    setFeedbackMessage({
      type: 'success',
      text: '✓ Scorciatoia DriveCheck_Desktop.url scaricata! Trascinala sul desktop del PC.',
    });
  };

  return (
    <div className="space-y-4 pb-28 animate-in fade-in duration-200">
      
      {/* Title Header */}
      <div className="pt-2 pb-1">
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-between">
          <span>Impostazioni & Configurazione</span>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {veicoli.length} veicoli
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Account Google, catalogo lavorazioni, anagrafica officine e preferenze
        </p>
      </div>

      {/* SOTTOMENU DI NAVIGAZIONE A SCHEDE */}
      <div ref={submenuBarRef} className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#0e1726] p-1.5 rounded-2xl border border-slate-800 shadow-lg scroll-mt-4">
        {/* Tab 1: Centro Esportazioni & Backup */}
        <button
          type="button"
          onClick={() => setActiveSubmenu('dati')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubmenu === 'dati'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FolderSync size={14} className={activeSubmenu === 'dati' ? 'text-white' : 'text-blue-400'} />
          <span className="truncate">Centro Esportazioni & Backup</span>
        </button>

        {/* Tab 2: Menu Comune (Lavorazioni & Officine) */}
        <button
          type="button"
          onClick={() => setActiveSubmenu('catalogo')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubmenu === 'catalogo'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-900/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FolderSync size={14} className={activeSubmenu === 'catalogo' ? 'text-white' : 'text-orange-400'} />
          <span className="truncate">Menu Comune</span>
        </button>

        {/* Tab 3: Google Calendar */}
        <button
          type="button"
          onClick={() => setActiveSubmenu('calendar')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubmenu === 'calendar'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <CalendarDays size={14} className={activeSubmenu === 'calendar' ? 'text-white' : 'text-purple-400'} />
          <span className="truncate">Calendar</span>
        </button>

        {/* Tab 4: Guida & Info */}
        <button
          type="button"
          onClick={() => setActiveSubmenu('info')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubmenu === 'info'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-900/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <BookOpen size={14} className={activeSubmenu === 'info' ? 'text-white' : 'text-teal-400'} />
          <span className="truncate">Guida & App</span>
        </button>
      </div>

      {/* Feedback Toast Banner */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-2xl flex items-start gap-2.5 text-xs animate-in slide-in-from-top-2 border ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-600/70 text-emerald-200'
              : feedbackMessage.type === 'error'
              ? 'bg-rose-950/40 border-rose-600/70 text-rose-200'
              : 'bg-blue-950/40 border-blue-600/70 text-blue-200'
          }`}
        >
          {feedbackMessage.type === 'success' && <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />}
          {feedbackMessage.type === 'error' && <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />}
          {feedbackMessage.type === 'info' && <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />}
          <div className="flex-1 font-medium">{feedbackMessage.text}</div>
          <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-white font-bold ml-2 cursor-pointer">
            ×
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* SOTTOMENU 1: DATI & PARCO AUTO                                 */}
      {/* ============================================================== */}
      {activeSubmenu === 'dati' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* CENTRO UNIFICATO ESPORTAZIONI & RIPRISTINO A 2 SCHERMATE (SENZA DUPLICAZIONI) */}
          <div className="rounded-3xl bg-[#141e2e] border border-slate-800 shadow-xl overflow-hidden p-2 sm:p-4">
            <UnifiedDataTransfer
              veicoli={veicoli}
              record={record}
              catalogo={catalogo}
              officineAnagrafica={officineAnagrafica}
              selectedVehicleId={selectedVehicleId}
              onRestoreAllData={onRestoreAllData}
              onUpdateCatalogo={onUpdateCatalogo}
              onResetCatalog={onResetCatalog}
              onUpdateOfficine={onUpdateOfficine}
              isEmbedded={true}
            />
          </div>

          {/* Card: ELIMINA TUTTO IL PARCO AUTO */}
          <div className="rounded-3xl bg-[#181524] border border-rose-950/60 shadow-xl overflow-hidden p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-rose-900/40">
              <div className="flex items-center gap-2">
                <Trash2 className="text-rose-400" size={17} />
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                  Gestione Parco Auto & Dati
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-900/60 border border-rose-700/60 text-rose-200 font-mono">
                {veicoli.length} auto nel parco
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Cancella tutti i dati e i veicoli salvati per ricominciare da zero con un parco pulito.
            </p>

            <button
              type="button"
              onClick={requestDeleteAllVehicles}
              disabled={veicoli.length === 0}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={15} />
              <span>Elimina Tutto il Parco Auto</span>
            </button>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* SOTTOMENU 2: MENU COMUNE PARCO MACCHINE (1. LAVORAZIONI & 2. OFFICINE) */}
      {/* ============================================================== */}
      {activeSubmenu === 'catalogo' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* SELETTORE DEI DUE SOTTOMENU COMUNI */}
          <div ref={commonMenuRef} className="grid grid-cols-2 gap-2 bg-[#0a101b] p-1.5 rounded-2xl border border-slate-800 shadow-md scroll-mt-4">
            <button
              type="button"
              onClick={() => setSubMenuComune('lavorazioni')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                subMenuComune === 'lavorazioni'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Wrench size={14} />
              <span>1. Lavorazioni ({catalogo.reduce((acc, c) => acc + c.sottocategorie.reduce((sacc, sc) => sacc + sc.lavorazioni.length, 0), 0)})</span>
            </button>

            <button
              type="button"
              onClick={() => setSubMenuComune('officine')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                subMenuComune === 'officine'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Building2 size={14} />
              <span>2. Officine & Specialisti ({officineAnagrafica.length})</span>
            </button>
          </div>

          {/* SOTTOMENU 1: LAVORAZIONI E CATEGORIE COMUNI */}
          {subMenuComune === 'lavorazioni' && (
            <LavorazioniManagementSection
              catalogo={catalogo}
              onUpdateCatalogo={onUpdateCatalogo || (() => {})}
              onResetCatalog={onResetCatalog}
            />
          )}

          {/* SOTTOMENU 2: OFFICINE, CARROZZERIA, ELETTRAUTO, GOMMISTA */}
          {subMenuComune === 'officine' && (
            <OfficineManagementSection
              officine={officineAnagrafica}
              onUpdateOfficine={onUpdateOfficine || (() => {})}
              onResetOfficine={() => onUpdateOfficine && onUpdateOfficine(DEFAULT_OFFICINE)}
            />
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* SOTTOMENU 3: GOOGLE CALENDAR (FOTO 3 - SCELTA AUTO)             */}
      {/* ============================================================== */}
      {activeSubmenu === 'calendar' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          <div className="rounded-3xl bg-[#141e2e] border border-slate-800 shadow-xl overflow-hidden">
            
            {/* Header Calendar */}
            <div className="p-4 bg-gradient-to-r from-indigo-950 via-[#192437] to-[#121c2d] border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                <CalendarDays size={16} /> Google Calendar: "Scadenze Auto"
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/60 border border-indigo-700 text-indigo-200 font-mono">
                Sincronizzazione
              </span>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Invia in automatico tutte le scadenze del tuo parco auto (<strong>Bollo Auto</strong> con dicitura <em>Pagabile entro</em>, <strong>Revisione</strong> ed <strong>Assicurazione RCA</strong>) nel calendario Google dedicato <strong>"Scadenze Auto"</strong> con promemoria a 30 e 7 giorni.
              </p>

              {/* SELEZIONE AUTO DA SINCRONIZZARE (FOTO 3) */}
              <div className="p-3.5 rounded-2xl bg-[#0b111c] border border-slate-800/90 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Car size={15} className="text-indigo-400" />
                    <span>Scegli quali auto sincronizzare</span>
                  </div>

                  {/* Pulsanti rapidi selezione */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectCurrentCalendarVehicleOnly}
                      className="px-2.5 py-1 rounded-lg bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-300 text-[10px] font-semibold border border-indigo-700/50 cursor-pointer"
                    >
                      Solo Auto Corrente
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllCalendarVehicles}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700 cursor-pointer"
                    >
                      Tutte ({veicoli.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllCalendarVehicles}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-semibold border border-slate-700 cursor-pointer"
                    >
                      Deseleziona
                    </button>
                  </div>
                </div>

                {veicoli.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Nessun veicolo presente nel parco auto.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {veicoli.map((v) => {
                      const isChecked = calendarSelectedIds.includes(v.id);
                      const isCurrent = v.id === selectedVehicleId;
                      return (
                        <div
                          key={v.id}
                          onClick={() => toggleCalendarVehicle(v.id)}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-indigo-950/40 border-indigo-600/70 text-white'
                              : 'bg-[#101726] border-slate-800/80 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="text-indigo-400 shrink-0">
                              {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-white text-xs font-mono font-bold">
                                  {v.targa}
                                </span>
                                <span className="text-xs font-bold text-slate-200 truncate">
                                  {v.marca} {v.modello}
                                </span>
                                {isCurrent && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                    Corrente
                                  </span>
                                )}
                              </div>

                              <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                                {v.scadenzaBollo && <span>Bollo: {formatDateIt(v.scadenzaBollo)}</span>}
                                {v.scadenzaRevisione && <span>Rev: {formatDateIt(v.scadenzaRevisione)}</span>}
                                {v.scadenzaAssicurazione && <span>RCA: {formatDateIt(v.scadenzaAssicurazione)}</span>}
                                {!v.scadenzaBollo && !v.scadenzaRevisione && !v.scadenzaAssicurazione && (
                                  <span className="text-amber-400/80">Nessuna scadenza inserita</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CONFIGURAZIONE SVEGLIE E PROMEMORIA GOOGLE CALENDAR */}
              <div className="p-3.5 rounded-2xl bg-[#0b111c] border border-slate-800/90 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <Bell size={15} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Impostazioni Sveglia & Promemoria
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Scegli come e quando ricevere gli avvisi sonori e le notifiche
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700 text-indigo-300 font-mono font-bold">
                    Sveglie Attive
                  </span>
                </div>

                {/* Tipo di notifica */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-300 block">
                    Modalità di avviso:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      calendarSettings.usePopup
                        ? 'bg-indigo-950/40 border-indigo-500/70 text-white shadow-sm'
                        : 'bg-[#101726] border-slate-800 text-slate-400'
                    }`}>
                      <input
                        type="checkbox"
                        checked={calendarSettings.usePopup}
                        onChange={(e) => updateCalendarSetting('usePopup', e.target.checked)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <div className="text-xs">
                        <span className="font-bold flex items-center gap-1.5 text-white">
                          <Bell size={13} className="text-indigo-400" /> Sveglia / Notifica Push
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Suona con allarme e notifica sul cellulare tramite Google Calendar
                        </span>
                      </div>
                    </label>

                    <label className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      calendarSettings.useEmail
                        ? 'bg-indigo-950/40 border-indigo-500/70 text-white shadow-sm'
                        : 'bg-[#101726] border-slate-800 text-slate-400'
                    }`}>
                      <input
                        type="checkbox"
                        checked={calendarSettings.useEmail}
                        onChange={(e) => updateCalendarSetting('useEmail', e.target.checked)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <div className="text-xs">
                        <span className="font-bold flex items-center gap-1.5 text-white">
                          <Mail size={13} className="text-purple-400" /> Promemoria via Email
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Ricevi una email di avviso sulla tua casella Gmail
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Scelta orizzonti temporali promemoria */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-300 block">
                    Quando far suonare la sveglia / inviare il promemoria:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <label className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer text-xs transition-all ${
                      calendarSettings.remind30Days ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200 font-bold' : 'bg-[#101726] border-slate-800 text-slate-400'
                    }`}>
                      <input
                        type="checkbox"
                        checked={calendarSettings.remind30Days}
                        onChange={(e) => updateCalendarSetting('remind30Days', e.target.checked)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span>⏰ 30 giorni prima</span>
                    </label>

                    <label className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer text-xs transition-all ${
                      calendarSettings.remind15Days ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200 font-bold' : 'bg-[#101726] border-slate-800 text-slate-400'
                    }`}>
                      <input
                        type="checkbox"
                        checked={calendarSettings.remind15Days}
                        onChange={(e) => updateCalendarSetting('remind15Days', e.target.checked)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span>⏰ 15 giorni prima</span>
                    </label>

                    <label className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer text-xs transition-all ${
                      calendarSettings.remind7Days ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200 font-bold' : 'bg-[#101726] border-slate-800 text-slate-400'
                    }`}>
                      <input
                        type="checkbox"
                        checked={calendarSettings.remind7Days}
                        onChange={(e) => updateCalendarSetting('remind7Days', e.target.checked)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span>⏰ 7 giorni prima</span>
                    </label>

                    <label className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer text-xs transition-all ${
                      calendarSettings.remind1Day ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200 font-bold' : 'bg-[#101726] border-slate-800 text-slate-400'
                    }`}>
                      <input
                        type="checkbox"
                        checked={calendarSettings.remind1Day}
                        onChange={(e) => updateCalendarSetting('remind1Day', e.target.checked)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span>⏰ 1 giorno prima</span>
                    </label>

                    <label className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer text-xs transition-all ${
                      calendarSettings.remindSameDay ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200 font-bold' : 'bg-[#101726] border-slate-800 text-slate-400'
                    }`}>
                      <input
                        type="checkbox"
                        checked={calendarSettings.remindSameDay}
                        onChange={(e) => updateCalendarSetting('remindSameDay', e.target.checked)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span>⏰ Il giorno stesso</span>
                    </label>
                  </div>
                </div>

                {/* Orario Sveglia Personalizzato */}
                <div className="p-3 rounded-xl bg-[#111927] border border-slate-800 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-amber-400 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-white block">
                          Orario della sveglia / promemoria sul telefono:
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Scegli l'ora esatta in cui suonerà la notifica sul cellulare
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={calendarSettings.oraSveglia || '09:00'}
                        onChange={(e) => updateCalendarSetting('oraSveglia', e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-sm text-center focus:border-indigo-500 focus:outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Pulsanti rapidi orario */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-400 font-semibold mr-1">Orari consigliati:</span>
                    {['08:00', '08:30', '09:00', '10:00', '14:00', '18:00', '20:00'].map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => updateCalendarSetting('oraSveglia', time)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                          calendarSettings.oraSveglia === time
                            ? 'bg-amber-500 text-black shadow-sm'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#0f172a] border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span>
                    La sveglia e i promemoria suoneranno alle <strong>{calendarSettings.oraSveglia || '09:00'}</strong> sul tuo smartphone tramite Google Calendar.
                  </span>
                </div>
              </div>

              {/* SPIEGAZIONE CHIARA SOVRASCRITTURA / AGGIUNTA CALENDARIO */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-indigo-300 font-bold">
                  <Info size={16} className="shrink-0" />
                  <span>Come funziona la sincronizzazione su Google Calendar?</span>
                </div>
                <div className="text-[11px] text-slate-300 space-y-1.5 leading-relaxed pl-6">
                  <p>
                    • <strong className="text-white">Nessun duplicato:</strong> Il calendario <strong>"Scadenze Auto"</strong> non viene mai cancellato né ricreato. Se esiste già, viene riutilizzato quello presente.
                  </p>
                  <p>
                    • <strong className="text-white">Aggiornamento sul posto (sovrascrittura):</strong> Se sincronizzi un'auto già presente, i suoi eventi vengono <strong>aggiornati e sovrascritti</strong> con i nuovi orari della sveglia, nuove date o importi, senza creare doppioni.
                  </p>
                  <p>
                    • <strong className="text-white">Aggiunta automatica:</strong> Le nuove auto e scadenze vengono <strong>aggiunte allo stesso calendario esistente</strong>, lasciando intatti tutti gli altri eventi.
                  </p>
                </div>
              </div>

              {/* Pulsanti Azione Sincronizzazione */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleSyncSelectedVehiclesToCalendar}
                  disabled={isSyncingCalendar || calendarSelectedIds.length === 0}
                  className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSyncingCalendar ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Sincronizzazione in corso...</span>
                    </>
                  ) : (
                    <>
                      <CalendarDays size={16} />
                      <span>
                        Sincronizza {calendarSelectedIds.length} {calendarSelectedIds.length === 1 ? 'auto selezionata' : 'auto selezionate'} su "Scadenze Auto"
                      </span>
                    </>
                  )}
                </button>

                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700/60"
                >
                  <ExternalLink size={14} />
                  <span>Apri Google Calendar</span>
                </a>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* SOTTOMENU 4: GUIDA ALL'USO, PWA & INFORMAZIONI                 */}
      {/* ============================================================== */}
      {activeSubmenu === 'info' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Card Modalità Schermo: Desktop PC vs Smartphone */}
          <div className="rounded-3xl bg-[#141e2e] border border-slate-800 shadow-xl overflow-hidden p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Monitor size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Modalità Schermo: Desktop PC vs Mobile
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Scegli la larghezza dell'interfaccia (compatta per smartphone o estesa per PC)
                  </p>
                </div>
              </div>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                isDesktopMode
                  ? 'bg-indigo-950/70 border-indigo-700 text-indigo-300'
                  : 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
              }`}>
                {isDesktopMode ? 'Vista PC Attiva' : 'Vista Mobile'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              In modalità <strong>Desktop PC (Widescreen)</strong> l'applicazione sfrutta appieno lo spazio dei monitor orizzontali (16:9), mostrando schede espanse, tabelle a più colonne, scorciatoie da tastiera (tasti 1, 2, 3, 4 ed Esc) e la barra di navigazione rapida in alto.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {onToggleDesktopMode && (
                <button
                  type="button"
                  onClick={onToggleDesktopMode}
                  className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer border ${
                    isDesktopMode
                      ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                      : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white border-indigo-500/40 shadow-indigo-950'
                  }`}
                >
                  {isDesktopMode ? (
                    <>
                      <Smartphone size={15} className="text-emerald-400" />
                      <span>Passa a Vista Mobile Smartphone</span>
                    </>
                  ) : (
                    <>
                      <Monitor size={15} className="text-indigo-300" />
                      <span>Attiva Vista Desktop PC a Schermo Intero</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadWindowsDesktopShortcut}
                className="py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 cursor-pointer"
              >
                <Download size={15} />
                <span>Scarica Scorciatoia Desktop Windows (.url)</span>
              </button>
            </div>
          </div>

          {/* Card Guida all'Uso */}
          {onOpenUserGuide && (
            <div className="rounded-3xl bg-[#141e2e] border border-slate-800 shadow-xl overflow-hidden p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Guida all'Utilizzo DriverCheck</h3>
                  <p className="text-xs text-slate-400">Manuale pratico con tutti i passaggi dell'applicazione</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Scopri come aggiungere veicoli con modello vuoto, gestire il registro pneumatici, configurare il bollo con la regola del mese successivo, salvare su Google Drive e installare l'app.
              </p>

              <button
                type="button"
                onClick={onOpenUserGuide}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-950/40 cursor-pointer transition-all"
              >
                <BookOpen size={16} />
                <span>Apri la Guida all'Uso Completa</span>
              </button>
            </div>
          )}

          {/* Card Installazione PWA su Smartphone & Desktop */}
          {onOpenInstallModal && (
            <div className="rounded-3xl bg-[#141e2e] border border-slate-800 shadow-xl overflow-hidden p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden border border-emerald-500/50 shadow-lg shadow-emerald-950/80 shrink-0">
                  <img src="/drivecheck_icon.png" alt="DriveCheck Icona" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Installazione su Telefono / Desktop</h3>
                  <p className="text-xs text-emerald-400 font-medium">Icona verde neon per schermata Home</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Aggiungi il collegamento a DriverCheck sulla schermata Home del tuo smartphone Android, iPhone o sul desktop del PC per aprirla a schermo intero come una vera app.
              </p>

              <button
                type="button"
                onClick={onOpenInstallModal}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-950/40 cursor-pointer transition-all"
              >
                <Smartphone size={16} />
                <span>Istruzioni per Installare l'Icona</span>
              </button>
            </div>
          )}

          {/* Preferenze App */}
          <div className="rounded-3xl bg-[#141e2e] border border-slate-800 shadow-xl divide-y divide-slate-800/80">
            <div className="p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-slate-300">
                <Globe size={16} className="text-blue-400" />
                <span>Lingua dell'applicazione</span>
              </div>
              <span className="font-bold text-white">Italiano</span>
            </div>

            <div className="p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-slate-300">
                <Moon size={16} className="text-indigo-400" />
                <span>Tema dell'applicazione</span>
              </div>
              <span className="font-bold text-blue-400">Scuro (Android)</span>
            </div>

            <div className="p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-slate-300">
                <Sliders size={16} className="text-amber-400" />
                <span>Unità di misura e valuta</span>
              </div>
              <span className="font-bold text-white">Chilometro (km) • Euro (€)</span>
            </div>
          </div>

          {/* Card Aggiornamento Grafica & Svuota Cache (PC & Mobile) */}
          <div className="rounded-3xl bg-[#141e2e] border border-amber-500/40 shadow-xl overflow-hidden p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <RefreshCw size={20} className={isRefreshingCache ? 'animate-spin' : ''} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Aggiornamento Grafica & Svuota Cache (PC & Telefono)
                  </h3>
                  <p className="text-[11px] text-amber-300/90 font-medium">
                    Risolve il problema della grafica non aggiornata su PC
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                v2.5.0
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              I browser su computer (come Google Chrome o Microsoft Edge) tendono a memorizzare nella memoria locale (cache) i file dell'applicazione. Se dal cellulare vedi la grafica aggiornata ma dal PC vedi ancora la grafica vecchia, premi il pulsante qui sotto per pulire istantaneamente la cache del browser e ricaricare l'ultimissima versione.
            </p>

            <div className="p-3 rounded-2xl bg-[#0b111c] border border-slate-800 space-y-1.5 text-[11px] text-slate-400">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <Laptop size={14} className="text-indigo-400" />
                <span>Scorciatoia da tastiera per PC Windows / Mac:</span>
              </div>
              <p className="pl-5">
                Puoi forzare l'aggiornamento immediato in qualsiasi momento premendo sulla tastiera:
                <br />
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 font-mono font-bold text-[11px] inline-block mt-1 mr-1">
                  Ctrl + F5
                </kbd>
                oppure
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 font-mono font-bold text-[11px] inline-block mt-1 ml-1">
                  Ctrl + Shift + R
                </kbd>
              </p>
            </div>

            <button
              type="button"
              onClick={handleInternalRefresh}
              disabled={isRefreshingCache}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={16} className={isRefreshingCache ? 'animate-spin' : ''} />
              <span>
                {isRefreshingCache ? 'Pulizia cache in corso...' : 'Svuota Cache e Aggiorna Grafica Ora'}
              </span>
            </button>
          </div>

        </div>
      )}

      {/* MODALE DI CONFERMA / RIPRISTINO CON SCELTA: AGGIUNGI (MERGE) o SOVRASCRIVI */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#1e293b] border border-slate-700 rounded-3xl p-5 text-white shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle size={22} />
              </div>
              <h4 className="text-sm font-bold text-white leading-tight">
                {confirmDialog.title}
              </h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#0f172a] p-3 rounded-2xl border border-slate-800">
              {confirmDialog.description}
            </p>

            {/* SE È UN'OPERAZIONE DI RIPRISTINO DATI AUTO: OFFRI SCELTA TRA AGGIUNGI (MERGE) E SOVRASCRIVI */}
            {confirmDialog.actionType === 'restore_drive_file' || confirmDialog.actionType === 'restore_local' ? (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Come desideri importare i dati?
                </p>

                {/* Opzione 1: Aggiungi / Unisci ai dati presenti */}
                <button
                  type="button"
                  onClick={() => handleExecuteConfirmAction('merge')}
                  className="w-full p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-between shadow-lg shadow-blue-950 cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <Plus size={16} className="text-white" />
                    </div>
                    <div>
                      <span className="block font-bold text-white leading-tight">Aggiungi / Unisci ai dati presenti</span>
                      <span className="block text-[10px] text-blue-200">Conserva i veicoli attuali e unisce i nuovi interventi</span>
                    </div>
                  </div>
                  <ChevronRight size={15} className="shrink-0 text-blue-200" />
                </button>

                {/* Opzione 2: Sovrascrivi tutto */}
                <button
                  type="button"
                  onClick={() => handleExecuteConfirmAction('overwrite')}
                  className="w-full p-3 rounded-2xl bg-[#0f172a] hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/50 text-white font-bold text-xs flex items-center justify-between shadow-md cursor-pointer text-left transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                      <RefreshCw size={15} />
                    </div>
                    <div>
                      <span className="block font-bold text-rose-300 leading-tight">Sovrascrivi tutto</span>
                      <span className="block text-[10px] text-slate-400">Sostituisce completamente l'archivio attuale</span>
                    </div>
                  </div>
                  <ChevronRight size={15} className="shrink-0 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer mt-1"
                >
                  Annulla
                </button>
              </div>
            ) : (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteConfirmAction('overwrite')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer ${
                    confirmDialog.actionType === 'delete_drive' ||
                    confirmDialog.actionType === 'delete_catalog_drive' ||
                    confirmDialog.actionType === 'delete_all_vehicles'
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950'
                      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-950'
                  }`}
                >
                  Conferma
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
