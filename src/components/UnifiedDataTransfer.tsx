import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Veicolo,
  InterventoRecord,
  CategoriaManutenzione,
  AnagraficaOfficina,
  AppDataBackup,
  DriveBackupFileInfo,
} from '../types';
import * as XLSX from 'xlsx';
import {
  downloadFleetExcelFile,
  importFleetFromExcel,
  createFleetExcelWorkbook,
} from '../services/excelService';
import {
  exportVehiclesAndRecordsToCsv,
  downloadVehiclesCsvFile,
  downloadJsonBackupFile,
  exportFullBackupJson,
  importVehiclesAndRecordsFromCsv,
  formatDateTimeIt,
  getDriverCheckTimestamp,
  importCatalogFromCsv,
  exportCatalogToCsv,
  downloadCatalogCsvFile,
} from '../services/storageService';
import {
  saveBackupToGoogleDrive,
  listDriveBackupFiles,
  listDriveVehicleBackupFiles,
  listDriveMenuComuneBackupFiles,
  restoreBackupFromGoogleDriveById,
  deleteBackupFromGoogleDrive,
  listDriveCatalogFiles,
  restoreCatalogFromGoogleDriveById,
  isMenuComuneFileName,
  uploadRawFileToDriverCheckFolder,
} from '../services/googleDriveService';
import {
  LocalBackupFile,
  saveFileToLocalDriverCheckFolder,
  listLocalDriverCheckFiles,
  deleteLocalDriverCheckFile,
  downloadLocalDriverCheckFile,
  getLocalDriverCheckFile,
  connectLocalDirectory,
  getConnectedDirectoryName,
  isFileSystemAccessSupported,
} from '../services/localFolderService';
import { DEFAULT_CATALOG } from '../data/defaultCatalog';
import {
  getAccessToken,
  isGoogleTokenExpired,
  reconnectGoogleDrive,
  getStoredAccessToken,
  auth,
} from '../services/firebaseAuth';
import {
  Download,
  Upload,
  Cloud,
  HardDrive,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  CheckSquare,
  Square,
  ArrowRight,
  ArrowLeft,
  CloudUpload,
  CloudDownload,
  HelpCircle,
  AlertCircle,
  Database,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Wrench,
  RotateCcw,
  Folder,
  FolderCheck,
  FolderOpen,
} from 'lucide-react';

export interface ExportContentConfig {
  datiMacchina: boolean;
  manutenzioni: boolean;
  pagamenti: boolean;
  officine: boolean;
  catalogoLavorazioni: boolean;
}

/**
 * Genera il nome file dettagliato per esportazioni parziali o complete:
 * contiene le sezioni selezionate (es. Manutenzioni, Pagamenti, DatiAuto, Lavorazioni) e la targa/auto
 * per evitare di generare file con nomi generici identici!
 */
export const getDescriptiveExportFilename = (
  exportVehicles: Veicolo[],
  allVehicles: Veicolo[],
  contentConfig: ExportContentConfig,
  format: 'xlsx' | 'csv' | 'json'
): string => {
  const timestamp = getDriverCheckTimestamp();

  // 1. Parte del testo che descrive il contenuto (Cosa sto esportando)
  const isAllContent =
    contentConfig.datiMacchina &&
    contentConfig.manutenzioni &&
    contentConfig.pagamenti &&
    contentConfig.officine &&
    contentConfig.catalogoLavorazioni;

  let contentText = '';
  if (isAllContent) {
    contentText = 'BackupCompleto';
  } else {
    const parts: string[] = [];
    if (contentConfig.datiMacchina) parts.push('DatiAuto');
    if (contentConfig.manutenzioni) parts.push('Manutenzioni');
    if (contentConfig.pagamenti) parts.push('Pagamenti');
    if (contentConfig.officine) parts.push('Officine');
    if (contentConfig.catalogoLavorazioni) parts.push('CatalogoLavorazioni');
    contentText = parts.length > 0 ? parts.join('_') : 'Parziale';
  }

  // 2. Parte del testo che descrive l'auto (Quale auto sto esportando)
  let vehicleText = '';
  if (exportVehicles.length === 0) {
    vehicleText = 'MenuComune';
  } else if (allVehicles.length > 0 && exportVehicles.length === allVehicles.length) {
    vehicleText = 'TutteAuto';
  } else if (exportVehicles.length === 1) {
    const v = exportVehicles[0];
    const cleanPlate = (v.targa || v.modello || 'Auto')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .trim();
    vehicleText = cleanPlate || 'AutoSingola';
  } else if (exportVehicles.length <= 3) {
    const plates = exportVehicles
      .map((v) => (v.targa || v.modello || 'Auto').replace(/[^a-zA-Z0-9_-]/g, '').trim())
      .filter(Boolean)
      .join('_');
    vehicleText = plates.length > 0 && plates.length <= 25 ? plates : `${exportVehicles.length}Auto`;
  } else {
    vehicleText = `${exportVehicles.length}Auto`;
  }

  // Inizia sempre con DriverCheck_ per il riconoscimento automatico da parte del sistema
  return `DriverCheck_${contentText}_${vehicleText}_${timestamp}.${format}`;
};

interface UnifiedDataTransferProps {
  veicoli: Veicolo[];
  record: InterventoRecord[];
  catalogo: CategoriaManutenzione[];
  officineAnagrafica?: AnagraficaOfficina[];
  selectedVehicleId?: string;
  onRestoreAllData: (data: AppDataBackup, mode?: 'overwrite' | 'merge') => void;
  onUpdateCatalogo?: (catalogo: CategoriaManutenzione[]) => void;
  onResetCatalog?: () => void;
  onUpdateOfficine?: (officine: AnagraficaOfficina[]) => void;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export const UnifiedDataTransfer: React.FC<UnifiedDataTransferProps> = ({
  veicoli,
  record,
  catalogo,
  officineAnagrafica = [],
  selectedVehicleId,
  onRestoreAllData,
  onUpdateCatalogo,
  onResetCatalog,
  onUpdateOfficine,
  isEmbedded = false,
}) => {
  // Modalità principale: 'esporta' oppure 'importa'
  const [mainTab, setMainTab] = useState<'esporta' | 'importa'>('esporta');

  // Sottomenu importazione: 'veicoli' (Parco auto & Dati) oppure 'lavorazioni' (Menu Comune - Lavorazioni)
  const [importSubTab, setImportSubTab] = useState<'veicoli' | 'lavorazioni'>('veicoli');

  const mainTransferNavRef = useRef<HTMLDivElement>(null);
  const importSubNavRef = useRef<HTMLDivElement>(null);

  const scrollToSubmenuNav = (ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      if (ref.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  // Passo della procedura di esportazione: 1 (Cosa esportare) o 2 (Dove salvare & formato)
  const [exportStep, setExportStep] = useState<1 | 2>(1);

  // 1. Auto selezionate per l'esportazione (persistente)
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cartracker_export_selected_vehicles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter((id: string) => veicoli.some((v) => v.id === id));
          if (valid.length > 0) return valid;
        }
      }
    } catch {}
    return veicoli.map((v) => v.id);
  });

  // 2. Contenuti da esportare (spuntabili con opzione Tutto)
  const [contentConfig, setContentConfig] = useState<ExportContentConfig>({
    datiMacchina: true,
    manutenzioni: true,
    pagamenti: true,
    officine: true,
    catalogoLavorazioni: true,
  });

  // 3. Dove salvare (Passo 2)
  const [saveDestination, setSaveDestination] = useState<'locale' | 'drive' | 'simultaneo'>('locale');

  // 4. Formato del file (Passo 2)
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'json'>('xlsx');

  // Stato Google Drive - File Veicoli
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isDriveSessionExpired, setIsDriveSessionExpired] = useState(false);
  const [isRenewingSession, setIsRenewingSession] = useState(false);
  const [driveFilesList, setDriveFilesList] = useState<DriveBackupFileInfo[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);

  // Stato Google Drive - File Menu Comune (Lavorazioni, Catalogo, Officine & BackupCompleto_MenuComune)
  const [driveCatalogFilesList, setDriveCatalogFilesList] = useState<DriveBackupFileInfo[]>([]);
  const [isLoadingCatalogFiles, setIsLoadingCatalogFiles] = useState(false);

  // Stato Cartella Locale DriverCheck
  const [localFolderFiles, setLocalFolderFiles] = useState<LocalBackupFile[]>([]);
  const [isLoadingLocalFiles, setIsLoadingLocalFiles] = useState(false);
  const [connectedDirectoryName, setConnectedDirectoryName] = useState<string | null>(null);

  // Feedback Operazioni
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Dialogo Conferma Ripristino Dati Parco Auto & Menu Comune
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    itemCountText: string;
    dataToRestore: AppDataBackup | null;
  } | null>(null);

  // Dialogo Conferma Ripristino Catalogo Lavorazioni
  const [catalogConfirmDialog, setCatalogConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    catalogData: CategoriaManutenzione[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const catalogFileInputRef = useRef<HTMLInputElement>(null);

  // Controlla stato Drive e carica file della cartella locale all'avvio
  useEffect(() => {
    checkDriveStatus();
    loadLocalFiles();
  }, []);

  const loadLocalFiles = async () => {
    setIsLoadingLocalFiles(true);
    try {
      const files = await listLocalDriverCheckFiles();
      setLocalFolderFiles(files);
      const dirName = await getConnectedDirectoryName();
      setConnectedDirectoryName(dirName);
    } catch (e) {
      console.warn('Errore lettura file cartella locale DriverCheck:', e);
    } finally {
      setIsLoadingLocalFiles(false);
    }
  };

  const checkDriveStatus = async () => {
    const token = getStoredAccessToken();
    const user = auth.currentUser;
    const expired = isGoogleTokenExpired();

    if (token && user && !expired) {
      setIsDriveConnected(true);
      setUserEmail(user.email || null);
      setIsDriveSessionExpired(false);
      loadDriveFiles();
      loadDriveCatalogFiles();
    } else if (token && expired) {
      setIsDriveConnected(true);
      setUserEmail(user?.email || null);
      setIsDriveSessionExpired(true);
    } else {
      setIsDriveConnected(false);
      setIsDriveSessionExpired(false);
      setUserEmail(null);
    }
  };

  const handleRenewDriveSession = async () => {
    setIsRenewingSession(true);
    setFeedback(null);
    try {
      const res = await reconnectGoogleDrive();
      setIsDriveSessionExpired(false);
      setIsDriveConnected(true);
      setUserEmail(res.user?.email || null);
      setFeedback({ type: 'success', text: '✓ Connessione a Google Drive rinnovata!' });
      await loadDriveFiles();
      await loadDriveCatalogFiles();
    } catch (err: any) {
      setFeedback({ type: 'error', text: `Errore rinnovo sessione: ${err.message}` });
    } finally {
      setIsRenewingSession(false);
    }
  };

  // Carica file backup Parco Auto su Google Drive (rigorosamente ESCLUSO Menu Comune)
  const loadDriveFiles = async () => {
    setIsLoadingDriveFiles(true);
    try {
      const files = await listDriveVehicleBackupFiles();
      setDriveFilesList(files || []);
      setIsDriveSessionExpired(false);
    } catch (err: any) {
      if (err.message && err.message.includes('SESSION_EXPIRED')) {
        setIsDriveSessionExpired(true);
      } else {
        console.error('Errore caricamento lista file Drive:', err);
      }
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  // Carica file Menu Comune su Google Drive (include BACKUP_COMPLETO_MENUCOMUNE, Lavorazioni, Catalogo, Officine)
  const loadDriveCatalogFiles = async () => {
    setIsLoadingCatalogFiles(true);
    try {
      const files = await listDriveMenuComuneBackupFiles();
      setDriveCatalogFilesList(files || []);
      setIsDriveSessionExpired(false);
    } catch (err: any) {
      if (err.message && err.message.includes('SESSION_EXPIRED')) {
        setIsDriveSessionExpired(true);
      } else {
        console.error('Errore caricamento lista Menu Comune Drive:', err);
      }
    } finally {
      setIsLoadingCatalogFiles(false);
    }
  };

  // ============================================================
  // GESTIONE SELEZIONE AUTO
  // ============================================================
  const toggleVehicle = (id: string) => {
    setSelectedVehicleIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem('cartracker_export_selected_vehicles', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const selectAllVehicles = () => {
    const all = veicoli.map((v) => v.id);
    setSelectedVehicleIds(all);
    try {
      localStorage.setItem('cartracker_export_selected_vehicles', JSON.stringify(all));
    } catch {}
  };

  const deselectAllVehicles = () => {
    setSelectedVehicleIds([]);
    try {
      localStorage.setItem('cartracker_export_selected_vehicles', JSON.stringify([]));
    } catch {}
  };

  const selectCurrentVehicleOnly = () => {
    const target = selectedVehicleId || veicoli[0]?.id;
    if (target) {
      const single = [target];
      setSelectedVehicleIds(single);
      try {
        localStorage.setItem('cartracker_export_selected_vehicles', JSON.stringify(single));
      } catch {}
    }
  };

  // ============================================================
  // GESTIONE SPUNTE CONTENUTO (COSA ESPORTARE)
  // ============================================================
  const isAllContentSelected = useMemo(() => {
    return (
      contentConfig.datiMacchina &&
      contentConfig.manutenzioni &&
      contentConfig.pagamenti &&
      contentConfig.officine &&
      contentConfig.catalogoLavorazioni
    );
  }, [contentConfig]);

  const toggleAllContent = () => {
    if (isAllContentSelected) {
      setContentConfig({
        datiMacchina: false,
        manutenzioni: false,
        pagamenti: false,
        officine: true,
        catalogoLavorazioni: true,
      });
    } else {
      setContentConfig({
        datiMacchina: true,
        manutenzioni: true,
        pagamenti: true,
        officine: true,
        catalogoLavorazioni: true,
      });
    }
  };

  const toggleContentItem = (key: keyof ExportContentConfig) => {
    setContentConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ============================================================
  // CALCOLO DATI FILTRATI IN BASE ALLE SPUNTE
  // ============================================================
  const exportVehicles = useMemo(() => {
    const set = new Set(selectedVehicleIds);
    return veicoli.filter((v) => set.has(v.id));
  }, [veicoli, selectedVehicleIds]);

  const canProceedToStep2 = useMemo(() => {
    const hasVehiclesData = exportVehicles.length > 0 && (contentConfig.datiMacchina || contentConfig.manutenzioni || contentConfig.pagamenti);
    const hasMenuComuneData = contentConfig.officine || contentConfig.catalogoLavorazioni;
    return hasVehiclesData || hasMenuComuneData;
  }, [exportVehicles, contentConfig]);

  const exportRecords = useMemo(() => {
    const vehicleSet = new Set(exportVehicles.map((v) => v.id));
    return record.filter((r) => {
      if (!vehicleSet.has(r.veicoloId)) return false;
      const isPagamento = r.tipo === 'Pagamento Scadenza' || !!r.registroPagamento;
      if (isPagamento && !contentConfig.pagamenti) return false;
      if (!isPagamento && !contentConfig.manutenzioni) return false;
      return true;
    });
  }, [record, exportVehicles, contentConfig]);

  const exportOfficine = useMemo(() => {
    if (!contentConfig.officine) return [];
    return officineAnagrafica;
  }, [officineAnagrafica, contentConfig.officine]);

  const exportCatalogo = useMemo(() => {
    if (!contentConfig.catalogoLavorazioni) return [];
    return catalogo;
  }, [catalogo, contentConfig.catalogoLavorazioni]);

  const getExportBackupPayload = (): AppDataBackup => ({
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    veicoli: exportVehicles,
    record: exportRecords,
    catalogoPersonalizzato: exportCatalogo,
    officineAnagrafica: exportOfficine,
    veicoloSelezionatoId: selectedVehicleId,
  });

  // Calcolo nome file dettagliato dinamico (evita nomi identici quando l'export è parziale)
  const computedFilename = useMemo(() => {
    return getDescriptiveExportFilename(exportVehicles, veicoli, contentConfig, exportFormat);
  }, [exportVehicles, veicoli, contentConfig, exportFormat]);

  // ============================================================
  // ESECUZIONE ESPORTAZIONE (PASSO 2)
  // ============================================================
  const handleExecuteExport = async () => {
    setActionLoading('exporting');
    setFeedback(null);
    try {
      const payload = getExportBackupPayload();
      const exportCategory: 'parco_auto' | 'menu_comune' = exportVehicles.length === 0 ? 'menu_comune' : 'parco_auto';

      // 1. SALVATAGGIO SU DISPOSITIVO (LOCALE) CON NOME FILE DESCRITTIVO
      if (saveDestination === 'locale' || saveDestination === 'simultaneo') {
        if (exportFormat === 'xlsx') {
          downloadFleetExcelFile(
            exportVehicles,
            exportRecords,
            exportOfficine,
            computedFilename,
            contentConfig.catalogoLavorazioni ? catalogo : undefined
          );
        } else if (exportFormat === 'csv') {
          const csvStr = exportVehiclesAndRecordsToCsv(
            exportVehicles,
            exportRecords,
            exportOfficine,
            contentConfig.catalogoLavorazioni ? catalogo : undefined
          );
          downloadVehiclesCsvFile(csvStr, computedFilename);
        } else {
          const jsonStr = exportFullBackupJson(
            exportVehicles,
            exportRecords,
            contentConfig.catalogoLavorazioni ? catalogo : [],
            selectedVehicleId,
            exportOfficine
          );
          downloadJsonBackupFile(jsonStr, computedFilename);
        }
      }

      // 1.B Memorizza SEMPRE una copia nella Cartella Locale DriverCheck (IndexedDB + Cartella su disco se collegata)
      try {
        if (exportFormat === 'xlsx') {
          const wb = createFleetExcelWorkbook(exportVehicles, exportRecords, exportOfficine, contentConfig.catalogoLavorazioni ? catalogo : undefined);
          const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
          await saveFileToLocalDriverCheckFolder({
            name: computedFilename,
            content: wbout,
            format: 'xlsx',
            category: exportCategory,
          });
        } else if (exportFormat === 'csv') {
          const csvStr = exportVehiclesAndRecordsToCsv(
            exportVehicles,
            exportRecords,
            exportOfficine,
            contentConfig.catalogoLavorazioni ? catalogo : undefined
          );
          await saveFileToLocalDriverCheckFolder({
            name: computedFilename,
            content: csvStr,
            format: 'csv',
            category: exportCategory,
          });
        } else {
          const jsonStr = exportFullBackupJson(
            exportVehicles,
            exportRecords,
            contentConfig.catalogoLavorazioni ? catalogo : [],
            selectedVehicleId,
            exportOfficine
          );
          await saveFileToLocalDriverCheckFolder({
            name: computedFilename,
            content: jsonStr,
            format: 'json',
            category: exportCategory,
          });
        }
        await loadLocalFiles();
      } catch (locErr) {
        console.warn('Archiviazione nella cartella locale non riuscita:', locErr);
      }

      // 2. SALVATAGGIO SU GOOGLE DRIVE CON NOME FILE DESCRITTIVO (Nella cartella DriverCheck)
      if (saveDestination === 'drive' || saveDestination === 'simultaneo') {
        if (!isDriveConnected || isDriveSessionExpired) {
          await handleRenewDriveSession();
        }
        const driveRes = await saveBackupToGoogleDrive(payload, exportFormat, computedFilename);
        await loadDriveFiles();
        await loadDriveCatalogFiles();
        const targetSummary = exportVehicles.length > 0
          ? `${exportVehicles.length} auto`
          : `Menu Comune (${[contentConfig.catalogoLavorazioni && 'Lavorazioni', contentConfig.officine && 'Officine'].filter(Boolean).join(' + ')})`;

        if (saveDestination === 'simultaneo') {
          setFeedback({
            type: 'success',
            text: `✓ Esportazione completata con successo sia nella CARTELLA LOCALE che nella CARTELLA GOOGLE DRIVE /DriverCheck: "${driveRes.name}" (${targetSummary})!`,
          });
        } else {
          setFeedback({
            type: 'success',
            text: `✓ File salvato con successo nella CARTELLA GOOGLE DRIVE /DriverCheck: "${driveRes.name}" (${targetSummary})!`,
          });
        }
      } else {
        const targetSummary = exportVehicles.length > 0
          ? `${exportVehicles.length} auto`
          : `Menu Comune (${[contentConfig.catalogoLavorazioni && 'Lavorazioni', contentConfig.officine && 'Officine'].filter(Boolean).join(' + ')})`;

        setFeedback({
          type: 'success',
          text: `✓ File ${exportFormat.toUpperCase()} scaricato e memorizzato nella cartella locale DriverCheck: "${computedFilename}" (${targetSummary})!`,
        });
      }
    } catch (err: any) {
      if (err.message && err.message.includes('SESSION_EXPIRED')) {
        setIsDriveSessionExpired(true);
        setFeedback({
          type: 'error',
          text: 'Sessione Google Drive scaduta. Clicca su "Rinnova Connessione Drive".',
        });
      } else {
        setFeedback({ type: 'error', text: `Errore durante l'esportazione: ${err.message}` });
      }
    } finally {
      setActionLoading(null);
    }
  };

  // ============================================================
  // IMPORTAZIONE DA FILE LOCALE (CON RIGIDO FILTRO DRIVERCHECK)
  // ============================================================
  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();

    // FILTRO RIGOROSO: Accetta ESCLUSIVAMENTE file generati da DriverCheck
    const isDriverCheckName = fileName.includes('drivercheck');
    if (!isDriverCheckName) {
      setFeedback({
        type: 'error',
        text: `File non valido: "${file.name}". Per la massima sicurezza seleziona esclusivamente un file generato da DriverCheck (il cui nome include "DriverCheck", es. DriverCheck_...).`,
      });
      e.target.value = '';
      return;
    }

    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCsv = fileName.endsWith('.csv');
    const isJson = fileName.endsWith('.json');

    const reader = new FileReader();

    if (isExcel) {
      reader.onload = async (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const parsed = importFleetFromExcel(buffer);
          if (
            parsed.veicoli.length === 0 &&
            parsed.records.length === 0 &&
            (!parsed.catalogo || parsed.catalogo.length === 0) &&
            (!parsed.officine || parsed.officine.length === 0)
          ) {
            setFeedback({ type: 'error', text: 'Nessun veicolo, officina o catalogo valido riconosciuto nel file Excel.' });
            return;
          }

          const catCount = parsed.catalogo?.reduce(
            (acc, c) => acc + (c.sottocategorie || []).reduce((sacc, sc) => sacc + (sc.lavorazioni || []).length, 0),
            0
          ) || 0;
          const offCount = parsed.officine?.length || 0;
          const isOnlyMenuComune = parsed.veicoli.length === 0;

          // Memorizza SEMPRE nella Cartella Locale DriverCheck
          try {
            await saveFileToLocalDriverCheckFolder({
              name: file.name,
              content: new Blob([buffer]),
              format: 'xlsx',
              category: isOnlyMenuComune ? 'menu_comune' : 'parco_auto',
            });
            await loadLocalFiles();
          } catch (errSave) {
            console.warn('Archiviazione locale Excel:', errSave);
          }

          // Se Google Drive è connesso, memorizza anche nella Cartella Drive /DriverCheck
          if (isDriveConnected && !isDriveSessionExpired) {
            try {
              await uploadRawFileToDriverCheckFolder(file.name, buffer);
              await loadDriveFiles();
              await loadDriveCatalogFiles();
            } catch (errDrive) {
              console.warn('Archiviazione Drive Excel:', errDrive);
            }
          }

          setConfirmDialog({
            isOpen: true,
            title: isOnlyMenuComune ? 'Importa Menu Comune da File Excel DriverCheck' : 'Ripristina da File Excel DriverCheck',
            description: `File: "${file.name}". Scegli come integrare i dati nel tuo archivio:`,
            itemCountText: isOnlyMenuComune
              ? `Archivio Generale Menu Comune: ${catCount} Lavorazioni/Attività Catalogo${offCount > 0 ? `, ${offCount} Officine/Specialisti` : ''} (Parco auto non toccato)`
              : `${parsed.veicoli.length} Veicoli, ${parsed.records.length} Lavorazioni/Pagamenti${offCount > 0 ? `, ${offCount} Officine` : ''}${catCount > 0 ? `, ${catCount} Lavorazioni Catalogo` : ''}`,
            dataToRestore: {
              version: '1.0.0',
              timestamp: new Date().toISOString(),
              veicoli: parsed.veicoli,
              record: parsed.records,
              catalogoPersonalizzato: parsed.catalogo && parsed.catalogo.length > 0 ? parsed.catalogo : undefined,
              officineAnagrafica: parsed.officine && parsed.officine.length > 0 ? parsed.officine : undefined,
            },
          });
        } catch (err: any) {
          setFeedback({ type: 'error', text: `Errore lettura Excel: ${err.message}` });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = async (event) => {
        try {
          const text = event.target?.result as string;

          if (isCsv) {
            const csvResult = importVehiclesAndRecordsFromCsv(text);
            if (
              csvResult.veicoli.length === 0 &&
              csvResult.records.length === 0 &&
              (!csvResult.catalogo || csvResult.catalogo.length === 0) &&
              (!csvResult.officine || csvResult.officine.length === 0)
            ) {
              // Riconoscimento automatico: file CSV di Lavorazioni / Catalogo
              const catParsed = importCatalogFromCsv(text);
              if (catParsed && catParsed.length > 0 && catParsed[0]?.sottocategorie) {
                const totalItems = catParsed.reduce((acc, c) => acc + c.sottocategorie.reduce((sacc, sc) => sacc + sc.lavorazioni.length, 0), 0);

                // Memorizza nella Cartella Locale DriverCheck
                try {
                  await saveFileToLocalDriverCheckFolder({
                    name: file.name,
                    content: text,
                    format: 'csv',
                    category: 'menu_comune',
                  });
                  await loadLocalFiles();
                } catch (e) {
                  console.warn('Salvataggio locale CSV:', e);
                }

                // Memorizza nella Cartella Google Drive /DriverCheck
                if (isDriveConnected && !isDriveSessionExpired) {
                  try {
                    await uploadRawFileToDriverCheckFolder(file.name, text, 'text/csv');
                    await loadDriveCatalogFiles();
                  } catch (e) {
                    console.warn('Salvataggio Drive CSV:', e);
                  }
                }

                setCatalogConfirmDialog({
                  isOpen: true,
                  title: 'Importa Catalogo Lavorazioni DriverCheck',
                  description: `File: "${file.name}". Riconosciute ${catParsed.length} categorie e ${totalItems} lavorazioni per il Menu Comune.`,
                  catalogData: catParsed,
                });
                return;
              }
              setFeedback({ type: 'error', text: 'Nessun veicolo, officina o catalogo lavorazioni riconosciuto nel file CSV.' });
              return;
            }

            const catCsvCount = csvResult.catalogo?.reduce(
              (acc, c) => acc + (c.sottocategorie || []).reduce((sacc, sc) => sacc + (sc.lavorazioni || []).length, 0),
              0
            ) || 0;
            const offCsvCount = csvResult.officine?.length || 0;
            const isOnlyMenuComune = csvResult.veicoli.length === 0;

            // Memorizza nella Cartella Locale DriverCheck
            try {
              await saveFileToLocalDriverCheckFolder({
                name: file.name,
                content: text,
                format: 'csv',
                category: isOnlyMenuComune ? 'menu_comune' : 'parco_auto',
              });
              await loadLocalFiles();
            } catch (errSave) {
              console.warn('Archiviazione locale CSV:', errSave);
            }

            // Se Google Drive è connesso, memorizza anche su Drive /DriverCheck
            if (isDriveConnected && !isDriveSessionExpired) {
              try {
                await uploadRawFileToDriverCheckFolder(file.name, text, 'text/csv');
                await loadDriveFiles();
                await loadDriveCatalogFiles();
              } catch (errDrive) {
                console.warn('Archiviazione Drive CSV:', errDrive);
              }
            }

            const parsedData: AppDataBackup = {
              version: '1.0.0',
              timestamp: new Date().toISOString(),
              veicoli: csvResult.veicoli,
              record: csvResult.records,
              catalogoPersonalizzato: csvResult.catalogo && csvResult.catalogo.length > 0 ? csvResult.catalogo : undefined,
              officineAnagrafica: csvResult.officine && csvResult.officine.length > 0 ? csvResult.officine : undefined,
            };

            setConfirmDialog({
              isOpen: true,
              title: isOnlyMenuComune ? 'Importa Menu Comune da CSV DriverCheck' : 'Importa da Tabella CSV DriverCheck',
              description: `File: "${file.name}". Scegli come integrare i dati nel tuo archivio:`,
              itemCountText: isOnlyMenuComune
                ? `Archivio Generale Menu Comune: ${catCsvCount} Lavorazioni Catalogo${offCsvCount > 0 ? `, ${offCsvCount} Officine/Specialisti` : ''} (Parco auto non toccato)`
                : `${parsedData.veicoli.length} Veicoli, ${parsedData.record.length} Lavorazioni/Pagamenti${offCsvCount > 0 ? `, ${offCsvCount} Officine` : ''}${catCsvCount > 0 ? `, ${catCsvCount} Lavorazioni Catalogo` : ''}`,
              dataToRestore: parsedData,
            });
            return;
          }

          if (isJson) {
            const jsonParsed = JSON.parse(text);

            // Riconoscimento automatico: file JSON di Catalogo Lavorazioni
            if (!jsonParsed.veicoli && (Array.isArray(jsonParsed) || jsonParsed.catalogo || jsonParsed.catalogoPersonalizzato)) {
              const catArray = Array.isArray(jsonParsed) ? jsonParsed : (jsonParsed.catalogo || jsonParsed.catalogoPersonalizzato);
              if (Array.isArray(catArray) && catArray.length > 0 && catArray[0]?.sottocategorie) {
                const totalItems = catArray.reduce((acc: number, c: any) => acc + (c.sottocategorie || []).reduce((sacc: number, sc: any) => sacc + (sc.lavorazioni?.length || 0), 0), 0);

                // Memorizza nella Cartella Locale DriverCheck
                try {
                  await saveFileToLocalDriverCheckFolder({
                    name: file.name,
                    content: text,
                    format: 'json',
                    category: 'menu_comune',
                  });
                  await loadLocalFiles();
                } catch (e) {
                  console.warn('Salvataggio locale JSON:', e);
                }

                // Memorizza nella Cartella Google Drive /DriverCheck
                if (isDriveConnected && !isDriveSessionExpired) {
                  try {
                    await uploadRawFileToDriverCheckFolder(file.name, text, 'application/json');
                    await loadDriveCatalogFiles();
                  } catch (e) {
                    console.warn('Salvataggio Drive JSON:', e);
                  }
                }

                setCatalogConfirmDialog({
                  isOpen: true,
                  title: 'Ripristina Catalogo Lavorazioni DriverCheck',
                  description: `File: "${file.name}". Riconosciute ${catArray.length} categorie e ${totalItems} lavorazioni per il Menu Comune.`,
                  catalogData: catArray,
                });
                return;
              }
            }

            const countV = jsonParsed.veicoli?.length || 0;
            const countR = jsonParsed.record?.length || 0;
            const catCount = jsonParsed.catalogoPersonalizzato?.reduce((acc: number, c: any) => acc + (c.sottocategorie || []).reduce((sacc: number, sc: any) => sacc + (sc.lavorazioni?.length || 0), 0), 0) || 0;
            const offCount = jsonParsed.officineAnagrafica?.length || 0;

            if (countV === 0 && countR === 0 && catCount === 0 && offCount === 0) {
              setFeedback({ type: 'error', text: 'Struttura backup non valida: nessun dato valido trovato nel file.' });
              return;
            }

            const isOnlyMenuComune = countV === 0;

            // Memorizza nella Cartella Locale DriverCheck
            try {
              await saveFileToLocalDriverCheckFolder({
                name: file.name,
                content: text,
                format: 'json',
                category: isOnlyMenuComune ? 'menu_comune' : 'parco_auto',
              });
              await loadLocalFiles();
            } catch (errSave) {
              console.warn('Archiviazione locale JSON:', errSave);
            }

            // Se Google Drive è connesso, memorizza anche su Drive /DriverCheck
            if (isDriveConnected && !isDriveSessionExpired) {
              try {
                await uploadRawFileToDriverCheckFolder(file.name, text, 'application/json');
                await loadDriveFiles();
                await loadDriveCatalogFiles();
              } catch (errDrive) {
                console.warn('Archiviazione Drive JSON:', errDrive);
              }
            }

            setConfirmDialog({
              isOpen: true,
              title: isOnlyMenuComune ? 'Importa Menu Comune da JSON DriverCheck' : 'Ripristina da Backup JSON DriverCheck',
              description: `File: "${file.name}". Scegli come integrare i dati nel tuo archivio:`,
              itemCountText: isOnlyMenuComune
                ? `Archivio Generale Menu Comune: ${catCount} Lavorazioni Catalogo${offCount > 0 ? `, ${offCount} Officine/Specialisti` : ''} (Parco auto non toccato)`
                : `${countV} Veicoli, ${countR} Lavorazioni/Pagamenti${offCount > 0 ? `, ${offCount} Officine` : ''}${catCount > 0 ? `, ${catCount} Lavorazioni Catalogo` : ''}`,
              dataToRestore: jsonParsed,
            });
          }
        } catch (err: any) {
          setFeedback({ type: 'error', text: `Errore elaborazione file: ${err.message}` });
        }
      };
      reader.readAsText(file);
    }

    e.target.value = '';
  };

  // ============================================================
  // GESTIONE IMPORTAZIONE MENU COMUNE - LAVORAZIONI
  // ============================================================
  const executeCatalogRestore = (mode: 'merge' | 'overwrite') => {
    if (!catalogConfirmDialog?.catalogData || !onUpdateCatalogo) return;
    const incoming = catalogConfirmDialog.catalogData;

    if (mode === 'overwrite') {
      onUpdateCatalogo(incoming);
      setCatalogConfirmDialog(null);
      setFeedback({
        type: 'success',
        text: `✓ Catalogo Lavorazioni sostituito con successo (${incoming.length} categorie caricate nel Menu Comune)!`,
      });
    } else {
      // Merge intelligente
      const existing = [...catalogo];
      incoming.forEach((inCat) => {
        const catIdx = existing.findIndex(
          (c) => c.nome.toLowerCase().trim() === inCat.nome.toLowerCase().trim()
        );
        if (catIdx < 0) {
          existing.push(inCat);
        } else {
          const curCat = existing[catIdx];
          const curSubcats = [...curCat.sottocategorie];
          inCat.sottocategorie.forEach((inSub) => {
            const subIdx = curSubcats.findIndex(
              (s) => s.nome.toLowerCase().trim() === inSub.nome.toLowerCase().trim()
            );
            if (subIdx < 0) {
              curSubcats.push(inSub);
            } else {
              const curSub = curSubcats[subIdx];
              const curLavs = [...curSub.lavorazioni];
              inSub.lavorazioni.forEach((inLav) => {
                if (!curLavs.some((l) => l.nome.toLowerCase().trim() === inLav.nome.toLowerCase().trim())) {
                  curLavs.push(inLav);
                }
              });
              curSubcats[subIdx] = { ...curSub, lavorazioni: curLavs };
            }
          });
          existing[catIdx] = { ...curCat, sottocategorie: curSubcats };
        }
      });
      onUpdateCatalogo(existing);
      setCatalogConfirmDialog(null);
      setFeedback({
        type: 'success',
        text: `✓ Lavorazioni e categorie del file unite con successo al Menu Comune!`,
      });
    }
  };

  const handleCatalogFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCsv = fileName.endsWith('.csv') || file.type === 'text/csv';
    const isJson = fileName.endsWith('.json');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const parsed = importFleetFromExcel(buffer);
          const catCount = parsed.catalogo?.reduce(
            (acc, c) => acc + (c.sottocategorie || []).reduce((sacc, sc) => sacc + (sc.lavorazioni || []).length, 0),
            0
          ) || 0;
          const offCount = parsed.officine?.length || 0;

          if (catCount === 0 && offCount === 0) {
            setFeedback({ type: 'error', text: 'Nessuna lavorazione o officina del Menu Comune trovata nel file Excel.' });
            return;
          }

          // Memorizza nella cartella locale DriverCheck
          try {
            await saveFileToLocalDriverCheckFolder({
              name: file.name,
              content: new Blob([buffer]),
              format: 'xlsx',
              category: 'menu_comune',
            });
            await loadLocalFiles();
          } catch (errSave) {
            console.warn('Archiviazione locale Excel:', errSave);
          }

          // Se Google Drive è connesso, memorizza anche nella cartella Drive /DriverCheck
          if (isDriveConnected && !isDriveSessionExpired) {
            try {
              await uploadRawFileToDriverCheckFolder(file.name, buffer);
              await loadDriveCatalogFiles();
            } catch (errDrive) {
              console.warn('Archiviazione Drive Excel Menu Comune:', errDrive);
            }
          }

          setConfirmDialog({
            isOpen: true,
            title: 'Importa Menu Comune da File Excel DriverCheck',
            description: `File: "${file.name}". Scegli se unire o sostituire le impostazioni del Menu Comune:`,
            itemCountText: `Archivio Generale Menu Comune: ${catCount} Lavorazioni/Attività Catalogo${offCount > 0 ? `, ${offCount} Officine/Specialisti` : ''} (Parco auto non toccato)`,
            dataToRestore: {
              version: '1.0.0',
              timestamp: new Date().toISOString(),
              veicoli: [], // Parco auto intatto
              record: [],
              catalogoPersonalizzato: parsed.catalogo && parsed.catalogo.length > 0 ? parsed.catalogo : undefined,
              officineAnagrafica: parsed.officine && parsed.officine.length > 0 ? parsed.officine : undefined,
            },
          });
        } catch (err: any) {
          setFeedback({ type: 'error', text: `Errore lettura Excel: ${err.message}` });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const text = event.target?.result as string;
          let parsedCatalogo: CategoriaManutenzione[] | null = null;
          let parsedOfficine: AnagraficaOfficina[] | undefined = undefined;

          if (isCsv) {
            parsedCatalogo = importCatalogFromCsv(text);
          } else if (isJson) {
            const json = JSON.parse(text);
            if (Array.isArray(json)) {
              parsedCatalogo = json;
            } else {
              if (json.catalogo && Array.isArray(json.catalogo)) parsedCatalogo = json.catalogo;
              if (json.catalogoPersonalizzato && Array.isArray(json.catalogoPersonalizzato)) parsedCatalogo = json.catalogoPersonalizzato;
              if (json.officineAnagrafica && Array.isArray(json.officineAnagrafica)) parsedOfficine = json.officineAnagrafica;
            }
          }

          const catCount = parsedCatalogo?.reduce((acc, c) => acc + (c.sottocategorie || []).reduce((sacc, sc) => sacc + (sc.lavorazioni || []).length, 0), 0) || 0;
          const offCount = parsedOfficine?.length || 0;

          if (catCount === 0 && offCount === 0) {
            throw new Error('Il file non contiene una struttura valida di lavorazioni o officine per il Menu Comune.');
          }

          // Memorizza nella cartella locale DriverCheck
          try {
            await saveFileToLocalDriverCheckFolder({
              name: file.name,
              content: text,
              format: isCsv ? 'csv' : 'json',
              category: 'menu_comune',
            });
            await loadLocalFiles();
          } catch (errSave) {
            console.warn('Archiviazione locale CSV/JSON:', errSave);
          }

          // Se Google Drive è connesso, memorizza anche su Drive /DriverCheck
          if (isDriveConnected && !isDriveSessionExpired) {
            try {
              await uploadRawFileToDriverCheckFolder(file.name, text, isCsv ? 'text/csv' : 'application/json');
              await loadDriveCatalogFiles();
            } catch (errDrive) {
              console.warn('Archiviazione Drive CSV/JSON Menu Comune:', errDrive);
            }
          }

          setConfirmDialog({
            isOpen: true,
            title: 'Importa Menu Comune DriverCheck',
            description: `File: "${file.name}". Scegli come integrare i dati nel Menu Comune:`,
            itemCountText: `Archivio Generale Menu Comune: ${catCount} Lavorazioni/Attività Catalogo${offCount > 0 ? `, ${offCount} Officine/Specialisti` : ''} (Parco auto non toccato)`,
            dataToRestore: {
              version: '1.0.0',
              timestamp: new Date().toISOString(),
              veicoli: [],
              record: [],
              catalogoPersonalizzato: parsedCatalogo || undefined,
              officineAnagrafica: parsedOfficine || undefined,
            },
          });
        } catch (err: any) {
          setFeedback({
            type: 'error',
            text: `Errore lettura file Menu Comune: ${err.message}`,
          });
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  // Ripristino Menu Comune da Google Drive (Cartella DriverCheck: BACKUP_COMPLETO_MENUCOMUNE, Lavorazioni, Catalogo, Officine)
  const handleRestoreMenuComuneFromDrive = async (fileItem: DriveBackupFileInfo) => {
    setActionLoading(`restore-menu-${fileItem.id}`);
    try {
      const res = await restoreBackupFromGoogleDriveById(fileItem.id);
      const catCount = (res.data.catalogoPersonalizzato || []).reduce(
        (acc, c) => acc + (c.sottocategorie || []).reduce((sacc, sc) => sacc + (sc.lavorazioni || []).length, 0),
        0
      );
      const offCount = res.data.officineAnagrafica?.length || 0;

      // Memorizza nella cartella locale DriverCheck come da richiesta
      try {
        await saveFileToLocalDriverCheckFolder({
          name: fileItem.name,
          content: JSON.stringify(res.data, null, 2),
          format: fileItem.name.toLowerCase().endsWith('.xlsx') ? 'xlsx' : fileItem.name.toLowerCase().endsWith('.csv') ? 'csv' : 'json',
          category: 'menu_comune',
        });
        await loadLocalFiles();
      } catch (saveErr) {
        console.warn('Archiviazione locale importazione Menu Comune da Drive:', saveErr);
      }

      setConfirmDialog({
        isOpen: true,
        title: `Ripristina Menu Comune da Google Drive: "${fileItem.name}"`,
        description: `File salvato nella cartella Google Drive /DriverCheck il ${
          fileItem.modifiedTime ? formatDateTimeIt(fileItem.modifiedTime) : 'N/D'
        }. Scegli la modalità di ripristino per il Menu Comune:`,
        itemCountText: `Archivio Generale Menu Comune: ${catCount} Lavorazioni/Attività Catalogo${
          offCount > 0 ? `, ${offCount} Officine/Specialisti` : ''
        } (Parco auto non toccato)`,
        dataToRestore: {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          veicoli: [], // Parco auto non toccato
          record: [],
          catalogoPersonalizzato: res.data.catalogoPersonalizzato && res.data.catalogoPersonalizzato.length > 0 ? res.data.catalogoPersonalizzato : undefined,
          officineAnagrafica: res.data.officineAnagrafica && res.data.officineAnagrafica.length > 0 ? res.data.officineAnagrafica : undefined,
        },
      });
    } catch (err: any) {
      if (err.message && err.message.includes('SESSION_EXPIRED')) {
        setIsDriveSessionExpired(true);
        setFeedback({ type: 'error', text: 'Sessione Google Drive scaduta. Clicca su "Rinnova Connessione Drive".' });
      } else {
        setFeedback({ type: 'error', text: `Errore ripristino Menu Comune da Drive: ${err.message}` });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCatalogFromDrive = async (fileItem: DriveBackupFileInfo) => {
    if (!window.confirm(`Eliminare definitivamente dal tuo Google Drive il backup "${fileItem.name}"?`)) {
      return;
    }
    setActionLoading(`delete-cat-${fileItem.id}`);
    try {
      await deleteBackupFromGoogleDrive(fileItem.id);
      setFeedback({ type: 'info', text: `File "${fileItem.name}" rimosso da Google Drive.` });
      setDriveCatalogFilesList((prev) => prev.filter((f) => f.id !== fileItem.id));
    } catch (err: any) {
      setFeedback({ type: 'error', text: `Errore eliminazione file da Drive: ${err.message}` });
    } finally {
      setActionLoading(null);
    }
  };

  // Ripristino da Cartella Locale DriverCheck
  const handleRestoreFromLocalFolder = async (fileItem: LocalBackupFile) => {
    setActionLoading(`restore-local-${fileItem.id}`);
    try {
      const fullFile = await getLocalDriverCheckFile(fileItem.id);
      if (!fullFile || !fullFile.content) {
        throw new Error('Contenuto del file non trovato nella cartella locale.');
      }

      if (fileItem.format === 'xlsx') {
        const arrayBuffer = await (fullFile.content instanceof Blob
          ? fullFile.content.arrayBuffer()
          : new Blob([fullFile.content]).arrayBuffer());
        const parsed = importFleetFromExcel(arrayBuffer);
        const catCount = parsed.catalogo?.reduce(
          (acc, c) => acc + (c.sottocategorie || []).reduce((sacc, sc) => sacc + (sc.lavorazioni || []).length, 0),
          0
        ) || 0;
        const offCount = parsed.officine?.length || 0;
        const isOnlyMenuComune = parsed.veicoli.length === 0;

        setConfirmDialog({
          isOpen: true,
          title: isOnlyMenuComune
            ? 'Importa Menu Comune da Cartella Locale DriverCheck'
            : 'Ripristina da Cartella Locale DriverCheck',
          description: `File: "${fileItem.name}" salvato localmente il ${formatDateTimeIt(fileItem.timestamp)}. Scegli la modalità di ripristino:`,
          itemCountText: isOnlyMenuComune
            ? `Archivio Generale Menu Comune: ${catCount} Lavorazioni Catalogo${offCount > 0 ? `, ${offCount} Officine/Specialisti` : ''} (Parco auto non toccato)`
            : `${parsed.veicoli.length} Veicoli, ${parsed.records.length} Lavorazioni/Pagamenti${offCount > 0 ? `, ${offCount} Officine` : ''}${catCount > 0 ? `, ${catCount} Lavorazioni Catalogo` : ''}`,
          dataToRestore: {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            veicoli: parsed.veicoli,
            record: parsed.records,
            catalogoPersonalizzato: parsed.catalogo && parsed.catalogo.length > 0 ? parsed.catalogo : undefined,
            officineAnagrafica: parsed.officine && parsed.officine.length > 0 ? parsed.officine : undefined,
          },
        });
      } else if (fileItem.format === 'csv') {
        const text = await (fullFile.content instanceof Blob
          ? fullFile.content.text()
          : String(fullFile.content));
        const csvResult = importVehiclesAndRecordsFromCsv(text);
        const catCsvCount = csvResult.catalogo?.reduce(
          (acc, c) => acc + (c.sottocategorie || []).reduce((sacc, sc) => sacc + (sc.lavorazioni || []).length, 0),
          0
        ) || 0;
        const offCsvCount = csvResult.officine?.length || 0;
        const isOnlyMenuComune = csvResult.veicoli.length === 0;

        setConfirmDialog({
          isOpen: true,
          title: isOnlyMenuComune
            ? 'Importa Menu Comune da Cartella Locale DriverCheck'
            : 'Ripristina da Cartella Locale DriverCheck',
          description: `File: "${fileItem.name}" salvato localmente il ${formatDateTimeIt(fileItem.timestamp)}. Scegli come integrare i dati:`,
          itemCountText: isOnlyMenuComune
            ? `Archivio Generale Menu Comune: ${catCsvCount} Lavorazioni Catalogo${offCsvCount > 0 ? `, ${offCsvCount} Officine/Specialisti` : ''} (Parco auto non toccato)`
            : `${csvResult.veicoli.length} Veicoli, ${csvResult.records.length} Lavorazioni/Pagamenti${offCsvCount > 0 ? `, ${offCsvCount} Officine` : ''}${catCsvCount > 0 ? `, ${catCsvCount} Lavorazioni Catalogo` : ''}`,
          dataToRestore: {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            veicoli: csvResult.veicoli,
            record: csvResult.records,
            catalogoPersonalizzato: csvResult.catalogo && csvResult.catalogo.length > 0 ? csvResult.catalogo : undefined,
            officineAnagrafica: csvResult.officine && csvResult.officine.length > 0 ? csvResult.officine : undefined,
          },
        });
      } else {
        const text = await (fullFile.content instanceof Blob
          ? fullFile.content.text()
          : String(fullFile.content));
        const jsonParsed = JSON.parse(text);
        const countV = jsonParsed.veicoli?.length || 0;
        const countR = jsonParsed.record?.length || 0;
        const catCount = jsonParsed.catalogoPersonalizzato?.reduce((acc: number, c: any) => acc + (c.sottocategorie || []).reduce((sacc: number, sc: any) => sacc + (sc.lavorazioni?.length || 0), 0), 0) || 0;
        const offCount = jsonParsed.officineAnagrafica?.length || 0;
        const isOnlyMenuComune = countV === 0;

        setConfirmDialog({
          isOpen: true,
          title: isOnlyMenuComune
            ? 'Importa Menu Comune da Cartella Locale DriverCheck'
            : 'Ripristina da Cartella Locale DriverCheck',
          description: `File: "${fileItem.name}" salvato localmente il ${formatDateTimeIt(fileItem.timestamp)}. Scegli come integrare i dati:`,
          itemCountText: isOnlyMenuComune
            ? `Archivio Generale Menu Comune: ${catCount} Lavorazioni Catalogo${offCount > 0 ? `, ${offCount} Officine/Specialisti` : ''} (Parco auto non toccato)`
            : `${countV} Veicoli, ${countR} Lavorazioni/Pagamenti${offCount > 0 ? `, ${offCount} Officine` : ''}${catCount > 0 ? `, ${catCount} Lavorazioni Catalogo` : ''}`,
          dataToRestore: jsonParsed,
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: `Errore ripristino file locale: ${err.message}` });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteLocalFile = async (id: string, name: string) => {
    if (!window.confirm(`Eliminare definitivamente il file "${name}" dalla cartella locale DriverCheck?`)) {
      return;
    }
    await deleteLocalDriverCheckFile(id);
    await loadLocalFiles();
    setFeedback({ type: 'info', text: `File "${name}" rimosso dalla cartella locale DriverCheck.` });
  };

  const handleConnectLocalDirectory = async () => {
    try {
      const name = await connectLocalDirectory();
      setConnectedDirectoryName(name);
      setFeedback({
        type: 'success',
        text: `✓ Cartella "${name}" collegata con successo sul tuo computer! I file esportati verranno salvati anche direttamente in questa cartella.`,
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setFeedback({ type: 'error', text: `Errore selezione cartella: ${err.message}` });
      }
    }
  };

  // Ripristino da Google Drive
  const handleRestoreFromDrive = async (fileItem: DriveBackupFileInfo) => {
    setActionLoading(`restore-${fileItem.id}`);
    try {
      const res = await restoreBackupFromGoogleDriveById(fileItem.id);
      const countV = res.data.veicoli?.length || 0;
      const countR = res.data.record?.length || 0;

      // Memorizza nella cartella locale DriverCheck come da requisito
      try {
        await saveFileToLocalDriverCheckFolder({
          name: fileItem.name,
          content: JSON.stringify(res.data, null, 2),
          format: fileItem.name.toLowerCase().endsWith('.xlsx') ? 'xlsx' : fileItem.name.toLowerCase().endsWith('.csv') ? 'csv' : 'json',
          category: 'parco_auto',
        });
        await loadLocalFiles();
      } catch (saveErr) {
        console.warn('Archiviazione locale da Drive:', saveErr);
      }

      setConfirmDialog({
        isOpen: true,
        title: 'Ripristina da Google Drive',
        description: `File: "${fileItem.name}" salvato su Drive il ${
          fileItem.modifiedTime ? formatDateTimeIt(fileItem.modifiedTime) : 'N/D'
        }.`,
        itemCountText: `${countV} Veicoli, ${countR} Lavorazioni/Pagamenti`,
        dataToRestore: res.data,
      });
    } catch (err: any) {
      if (err.message && err.message.includes('SESSION_EXPIRED')) {
        setIsDriveSessionExpired(true);
        setFeedback({ type: 'error', text: 'Sessione scaduta. Clicca su "Rinnova Connessione Drive".' });
      } else {
        setFeedback({ type: 'error', text: `Errore ripristino da Drive: ${err.message}` });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDriveBackup = async (fileItem: DriveBackupFileInfo) => {
    if (!window.confirm(`Eliminare definitivamente dal tuo Google Drive il backup "${fileItem.name}"?`)) {
      return;
    }
    setActionLoading(`delete-${fileItem.id}`);
    try {
      await deleteBackupFromGoogleDrive(fileItem.id);
      setFeedback({ type: 'info', text: `File "${fileItem.name}" rimosso da Google Drive.` });
      setDriveFilesList((prev) => prev.filter((f) => f.id !== fileItem.id));
    } catch (err: any) {
      setFeedback({ type: 'error', text: `Errore eliminazione file: ${err.message}` });
    } finally {
      setActionLoading(null);
    }
  };

  const executeRestore = (mode: 'merge' | 'overwrite') => {
    if (!confirmDialog?.dataToRestore) return;
    const isOnlyMenuComune = !confirmDialog.dataToRestore.veicoli || confirmDialog.dataToRestore.veicoli.length === 0;
    onRestoreAllData(confirmDialog.dataToRestore, mode);
    setConfirmDialog(null);
    setFeedback({
      type: 'success',
      text: isOnlyMenuComune
        ? mode === 'merge'
          ? '✓ Categorie del Menu Comune e Officine unite con successo alle tue categorie attuali! (Parco auto intatto)'
          : '✓ Categorie del Menu Comune e Officine sostituite con successo! (Parco auto intatto)'
        : mode === 'merge'
          ? '✓ Dati uniti e integrati con successo nel database!'
          : '✓ Database sovrascritto e ripristinato con successo!',
    });
  };

  return (
    <div className={`space-y-4 ${isEmbedded ? '' : 'p-4'}`}>
      {/* FEEDBACK MESSAGGIO */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl flex items-start gap-2.5 text-xs animate-in slide-in-from-top-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/70 text-emerald-200'
              : feedback.type === 'error'
              ? 'bg-rose-950/70 border-rose-500/70 text-rose-200'
              : 'bg-blue-950/70 border-blue-500/70 text-blue-200'
          }`}
        >
          {feedback.type === 'success' && <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />}
          {feedback.type === 'error' && <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />}
          {feedback.type === 'info' && <AlertCircle size={16} className="text-blue-400 shrink-0 mt-0.5" />}
          <div className="flex-1 font-medium">{feedback.text}</div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* STATO GOOGLE DRIVE */}
      <div className="p-3.5 rounded-2xl bg-[#111927] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Cloud size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-xs">Google Drive</span>
              {isDriveSessionExpired ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 border border-amber-600/70 text-amber-300 flex items-center gap-1">
                  <AlertTriangle size={10} /> Sessione da rinnovare
                </span>
              ) : isDriveConnected ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 border border-emerald-600/70 text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 size={10} /> Connesso e Pronto
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                  Non connesso
                </span>
              )}
            </div>
            {userEmail && (
              <span className="text-[10px] text-slate-400 block truncate max-w-[280px]">
                {userEmail}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isDriveSessionExpired || !isDriveConnected ? (
            <button
              type="button"
              disabled={isRenewingSession}
              onClick={handleRenewDriveSession}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
            >
              <RefreshCw size={12} className={isRenewingSession ? 'animate-spin' : ''} />
              <span>{isRenewingSession ? 'Rinnovo in corso...' : 'Rinnova Connessione Drive'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={loadDriveFiles}
              disabled={isLoadingDriveFiles}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              title="Aggiorna lista file su Drive"
            >
              <RefreshCw size={12} className={isLoadingDriveFiles ? 'animate-spin' : ''} />
              <span>Ricarica Drive</span>
            </button>
          )}
        </div>
      </div>

      {/* SELETTORE MODALITA': ESPORTA vs IMPORTA */}
      <div ref={mainTransferNavRef} className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#0b111c] border border-slate-800 text-xs font-bold scroll-mt-4">
        <button
          type="button"
          onClick={() => {
            setMainTab('esporta');
            scrollToSubmenuNav(mainTransferNavRef);
          }}
          className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mainTab === 'esporta'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Download size={15} />
          <span>Esporta Parco Auto</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMainTab('importa');
            scrollToSubmenuNav(mainTransferNavRef);
          }}
          className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mainTab === 'importa'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Upload size={15} />
          <span>Importa / Ripristina Dati</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* SEZIONE 1: ESPORTAZIONE A 2 SCHERMATE (FLOW INTUITIVO)        */}
      {/* ============================================================== */}
      {mainTab === 'esporta' && (
        <div className="space-y-4">
          
          {/* PASSO 1: AUTO DA ESPORTARE & COSA ESPORTARE */}
          {exportStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Box 1: Auto da Esportare (Elenco con caselle di spunta) */}
              <div className="p-4 rounded-3xl bg-[#141e2e] border border-slate-800 shadow-xl space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-2">
                      <Layers size={15} /> 1. Auto da Esportare (Opzionale)
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Scegli quali vetture includere. Se desideri esportare solo il Menu Comune, puoi deselezionarle tutte.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 border border-blue-600/60 text-blue-300 font-mono">
                      {selectedVehicleIds.length} di {veicoli.length} auto
                    </span>
                    <button
                      type="button"
                      onClick={selectAllVehicles}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 cursor-pointer"
                    >
                      Tutte
                    </button>
                    <button
                      type="button"
                      onClick={selectCurrentVehicleOnly}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 cursor-pointer"
                    >
                      Solo Corrente
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllVehicles}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                        selectedVehicleIds.length === 0
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                      }`}
                      title="Deseleziona tutte le auto per esportare solo il Menu Comune (Lavorazioni e Officine)"
                    >
                      Deseleziona Tutte (Solo Menu Comune)
                    </button>
                  </div>
                </div>

                {selectedVehicleIds.length === 0 && (
                  <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-white font-bold">Nessuna auto selezionata:</strong>
                      <span className="text-[11px] text-amber-200/90 leading-relaxed block mt-0.5">
                        L'esportazione si concentrerà esclusivamente sull'archivio generale del <strong>Punto 3 (Menu Comune: Lavorazioni e/o Officine)</strong> senza legarsi ad alcuna vettura.
                      </span>
                    </div>
                  </div>
                )}

                {veicoli.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Nessun veicolo presente nel parco auto. Puoi comunque esportare il Menu Comune al Punto 3 sottostante.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {veicoli.map((v) => {
                      const isSelected = selectedVehicleIds.includes(v.id);
                      const isCurrent = v.id === selectedVehicleId;
                      const countRecs = record.filter((r) => r.veicoloId === v.id).length;

                      return (
                        <div
                          key={v.id}
                          onClick={() => toggleVehicle(v.id)}
                          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-950/40 border-blue-500/70 text-white shadow-sm'
                              : 'bg-[#0f1728] border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="text-blue-400 shrink-0">
                              {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono font-bold">
                                  {v.targa}
                                </span>
                                <span className="text-xs font-bold text-white truncate">
                                  {v.marca} {v.modello}
                                </span>
                                {isCurrent && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                                    Corrente
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                {countRecs} {countRecs === 1 ? 'intervento/pagamento' : 'interventi/pagamenti'} registrati
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Box 2: Dati Specifici delle Auto Selezionate */}
              <div className="p-4 rounded-3xl bg-[#141e2e] border border-slate-800 shadow-xl space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                      <Sparkles size={15} /> 2. Dati Specifici del Parco Macchine ({selectedVehicleIds.length} Auto)
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Seleziona i dati storici e tecnici da includere per le vetture scelte al Punto 1:
                    </p>
                  </div>
                </div>

                {selectedVehicleIds.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-[#0b101c] border border-slate-800 text-center text-xs text-slate-400">
                    Nessuna auto selezionata al Punto 1: questi dati (Scheda Tecnica, Storico Manutenzioni e Pagamenti) non saranno inclusi nel file.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    {/* Dati Macchina / Scheda Tecnica */}
                    <div
                      onClick={() => toggleContentItem('datiMacchina')}
                      className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                        contentConfig.datiMacchina
                          ? 'bg-emerald-950/30 border-emerald-500/60 text-white'
                          : 'bg-[#0f1728] border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="text-emerald-400 mt-0.5 shrink-0">
                        {contentConfig.datiMacchina ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>
                      <div>
                        <strong className="block text-white text-xs">Dati Macchina & Tecnica</strong>
                        <span className="text-[11px] text-slate-400 leading-snug block mt-0.5">
                          Targa, telaio, proprietario, scadenze, km, gomme e dettagli tecnici.
                        </span>
                      </div>
                    </div>

                    {/* Manutenzioni & Lavorazioni Eseguite */}
                    <div
                      onClick={() => toggleContentItem('manutenzioni')}
                      className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                        contentConfig.manutenzioni
                          ? 'bg-emerald-950/30 border-emerald-500/60 text-white'
                          : 'bg-[#0f1728] border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="text-emerald-400 mt-0.5 shrink-0">
                        {contentConfig.manutenzioni ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>
                      <div>
                        <strong className="block text-white text-xs">Storico Manutenzioni</strong>
                        <span className="text-[11px] text-slate-400 leading-snug block mt-0.5">
                          Interventi eseguiti, tagliandi, pezzi sostituiti, date e relativi costi (€).
                        </span>
                      </div>
                    </div>

                    {/* Pagamenti & Scadenze */}
                    <div
                      onClick={() => toggleContentItem('pagamenti')}
                      className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                        contentConfig.pagamenti
                          ? 'bg-emerald-950/30 border-emerald-500/60 text-white'
                          : 'bg-[#0f1728] border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="text-emerald-400 mt-0.5 shrink-0">
                        {contentConfig.pagamenti ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>
                      <div>
                        <strong className="block text-white text-xs">Pagamenti & Scadenze</strong>
                        <span className="text-[11px] text-slate-400 leading-snug block mt-0.5">
                          Registro bollo, assicurazione, polizze, enti di riscossione e promemoria.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Box 3: Esportazioni Menu Comune (Archivio Generale Indipendente dalle Auto) */}
              <div className="p-4 rounded-3xl bg-[#141e2e] border border-amber-500/40 shadow-xl space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                      <Layers size={15} /> 3. Esportazioni Menu Comune (Archivio Generale Indipendente)
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Archivio generale che esula dal parco macchine: puoi esportarlo insieme alle auto o da solo anche con 0 auto selezionate:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {/* Catalogo Lavorazioni Menu Comune */}
                  <div
                    onClick={() => toggleContentItem('catalogoLavorazioni')}
                    className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                      contentConfig.catalogoLavorazioni
                        ? 'bg-amber-950/40 border-amber-500 text-white shadow-md'
                        : 'bg-[#0f1728] border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-amber-400 mt-0.5 shrink-0">
                      {contentConfig.catalogoLavorazioni ? <CheckSquare size={16} /> : <Square size={16} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="block text-white text-xs font-bold">Catalogo Lavorazioni & Categorie</strong>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                          {catalogo.reduce((acc, c) => acc + c.sottocategorie.reduce((sacc, sc) => sacc + sc.lavorazioni.length, 0), 0)} attività ({catalogo.length} categorie)
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 leading-snug block mt-1">
                        Tutte le categorie, sottocategorie e attività del catalogo comune (tagliandi, distribuzione, freni, controlli, ecc.).
                      </span>
                    </div>
                  </div>

                  {/* Officine & Specialisti */}
                  <div
                    onClick={() => toggleContentItem('officine')}
                    className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                      contentConfig.officine
                        ? 'bg-amber-950/40 border-amber-500 text-white shadow-md'
                        : 'bg-[#0f1728] border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-amber-400 mt-0.5 shrink-0">
                      {contentConfig.officine ? <CheckSquare size={16} /> : <Square size={16} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="block text-white text-xs font-bold">Officine & Specialisti</strong>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                          {officineAnagrafica.length} contatti anagrafica
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 leading-snug block mt-1">
                        Rubrica completa con tipologia, referente, telefono e indirizzo di meccanici, carrozzieri, gommisti ed elettrauto.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tasto Avanti al Passo 2 */}
              <button
                type="button"
                onClick={() => setExportStep(2)}
                disabled={!canProceedToStep2}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-950 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>
                  {selectedVehicleIds.length > 0
                    ? `Avanti: Scegli Dove Salvare e Formato (${selectedVehicleIds.length} Auto${contentConfig.catalogoLavorazioni || contentConfig.officine ? ' + Menu Comune' : ''})`
                    : `Avanti: Scegli Dove Salvare (Solo Menu Comune: ${[contentConfig.catalogoLavorazioni && 'Lavorazioni', contentConfig.officine && 'Officine'].filter(Boolean).join(' + ')})`}
                </span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* PASSO 2: DOVE SALVARE & FORMATO (SCHERMATA 2) */}
          {exportStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Tasto Ritorno al Passo 1 */}
              <button
                type="button"
                onClick={() => setExportStep(1)}
                className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1.5 cursor-pointer px-1"
              >
                <ArrowLeft size={14} />
                <span>Torna al Passo 1 (Modifica auto e dati da esportare)</span>
              </button>

              {/* Badge Riepilogativo del Passo 1 */}
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-400 font-medium">Stai esportando:</span>
                  <span className="px-2 py-0.5 rounded-lg bg-blue-950 border border-blue-600/60 text-blue-300 font-bold font-mono">
                    {selectedVehicleIds.length} auto
                  </span>
                  <span className="text-slate-400 font-medium">Dati inclusi:</span>
                  {contentConfig.datiMacchina && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 text-[10px]">
                      Scheda Tecnica
                    </span>
                  )}
                  {contentConfig.manutenzioni && (
                    <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-600/50 text-cyan-300 text-[10px]">
                      Manutenzioni
                    </span>
                  )}
                  {contentConfig.pagamenti && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-600/50 text-purple-300 text-[10px]">
                      Pagamenti
                    </span>
                  )}
                  {contentConfig.officine && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-600/50 text-amber-300 text-[10px]">
                      Officine
                    </span>
                  )}
                </div>
              </div>

              {/* SCELTA 1: DOVE DESIDERI SALVARE? (Locale vs Google Drive vs Simultaneo) */}
              <div className="p-4 rounded-3xl bg-[#141e2e] border border-slate-800 shadow-xl space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                  <HardDrive size={15} /> 1. Dove Desideri Salvare?
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Salva Locale */}
                  <div
                    onClick={() => setSaveDestination('locale')}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                      saveDestination === 'locale'
                        ? 'bg-amber-950/40 border-amber-500 text-white shadow-md'
                        : 'bg-[#0f1728] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <HardDrive size={16} />
                      </div>
                      <span className={`w-3.5 h-3.5 rounded-full border ${saveDestination === 'locale' ? 'bg-amber-500 border-amber-400' : 'border-slate-700'}`} />
                    </div>
                    <strong className="block text-xs text-white">Dispositivo (Locale)</strong>
                    <span className="text-[11px] text-slate-400 leading-snug block mt-0.5">
                      Scarica il file direttamente sul tuo PC, Mac o Smartphone.
                    </span>
                  </div>

                  {/* Salva Google Drive */}
                  <div
                    onClick={() => setSaveDestination('drive')}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                      saveDestination === 'drive'
                        ? 'bg-blue-950/40 border-blue-500 text-white shadow-md'
                        : 'bg-[#0f1728] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                        <Cloud size={16} />
                      </div>
                      <span className={`w-3.5 h-3.5 rounded-full border ${saveDestination === 'drive' ? 'bg-blue-500 border-blue-400' : 'border-slate-700'}`} />
                    </div>
                    <strong className="block text-xs text-white">Google Drive (Cloud)</strong>
                    <span className="text-[11px] text-slate-400 leading-snug block mt-0.5">
                      Salva nella cartella del tuo account Google Drive sincronizzato.
                    </span>
                  </div>

                  {/* Salva Simultaneo */}
                  <div
                    onClick={() => setSaveDestination('simultaneo')}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                      saveDestination === 'simultaneo'
                        ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
                        : 'bg-[#0f1728] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <CloudUpload size={16} />
                      </div>
                      <span className={`w-3.5 h-3.5 rounded-full border ${saveDestination === 'simultaneo' ? 'bg-emerald-500 border-emerald-400' : 'border-slate-700'}`} />
                    </div>
                    <strong className="block text-xs text-white">Locale + Drive (Insieme)</strong>
                    <span className="text-[11px] text-slate-400 leading-snug block mt-0.5">
                      Doppio salvataggio: scarica sul dispositivo e carica su Drive in un colpo solo.
                    </span>
                  </div>
                </div>
              </div>

              {/* SCELTA 2: FORMATO DEL FILE */}
              <div className="p-4 rounded-3xl bg-[#141e2e] border border-slate-800 shadow-xl space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                  <FileSpreadsheet size={15} /> 2. Scegli il Formato del File
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Excel Multi-Foglio */}
                  <div
                    onClick={() => setExportFormat('xlsx')}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                      exportFormat === 'xlsx'
                        ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
                        : 'bg-[#0f1728] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs">
                        .XLSX
                      </span>
                      <span className={`w-3.5 h-3.5 rounded-full border ${exportFormat === 'xlsx' ? 'bg-emerald-500 border-emerald-400' : 'border-slate-700'}`} />
                    </div>
                    <strong className="block text-xs text-white">Excel Multi-Foglio</strong>
                    <span className="text-[11px] text-slate-400 leading-snug block mt-0.5">
                      1 foglio per ciascuna auto + tabella interventi, pagamenti e foglio officine.
                    </span>
                  </div>

                  {/* CSV */}
                  <div
                    onClick={() => setExportFormat('csv')}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                      exportFormat === 'csv'
                        ? 'bg-blue-950/40 border-blue-500 text-white shadow-md'
                        : 'bg-[#0f1728] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300 font-mono font-bold text-xs">
                        .CSV
                      </span>
                      <span className={`w-3.5 h-3.5 rounded-full border ${exportFormat === 'csv' ? 'bg-blue-500 border-blue-400' : 'border-slate-700'}`} />
                    </div>
                    <strong className="block text-xs text-white">Tabella CSV Universale</strong>
                    <span className="text-[11px] text-slate-400 leading-snug block mt-0.5">
                      Compatibile con Microsoft Excel, LibreOffice e Fogli Google.
                    </span>
                  </div>

                  {/* JSON Backup Completo */}
                  <div
                    onClick={() => setExportFormat('json')}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                      exportFormat === 'json'
                        ? 'bg-purple-950/40 border-purple-500 text-white shadow-md'
                        : 'bg-[#0f1728] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono font-bold text-xs">
                        .JSON
                      </span>
                      <span className={`w-3.5 h-3.5 rounded-full border ${exportFormat === 'json' ? 'bg-purple-500 border-purple-400' : 'border-slate-700'}`} />
                    </div>
                    <strong className="block text-xs text-white">Backup JSON Completo</strong>
                    <span className="text-[11px] text-slate-400 leading-snug block mt-0.5">
                      Formato nativo perfetto per ripristinare il 100% dei dati dell'app in un attimo.
                    </span>
                  </div>
                </div>
              </div>

              {/* BOX ANTEPRIMA NOME FILE DESCRITTIVO DINAMICO */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-500/40 space-y-1.5 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                    <FileText size={13} />
                    <span>Nome del file generato:</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    ✓ Dettagliato & Univoco
                  </span>
                </div>
                <div className="font-mono text-xs text-white font-bold break-all bg-[#0a101b] px-3.5 py-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2 shadow-inner">
                  <span className="text-emerald-400">{computedFilename}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Il titolo contiene le sezioni spuntate e l'auto selezionata per non generare file identici e riconoscerne subito il contenuto.
                </p>
              </div>

              {/* PULSANTE PRINCIPALE DI ESPORTAZIONE */}
              <button
                type="button"
                onClick={handleExecuteExport}
                disabled={actionLoading !== null}
                className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-950/60 cursor-pointer transition-all disabled:opacity-50 active:scale-98"
              >
                {actionLoading === 'exporting' ? (
                  <>
                    <RefreshCw size={17} className="animate-spin" />
                    <span>Elaborazione ed Esportazione in corso...</span>
                  </>
                ) : (
                  <>
                    {saveDestination === 'drive' ? (
                      <CloudUpload size={18} />
                    ) : saveDestination === 'simultaneo' ? (
                      <CloudUpload size={18} />
                    ) : (
                      <Download size={18} />
                    )}
                    <span>
                      {selectedVehicleIds.length > 0
                        ? (saveDestination === 'drive'
                            ? `Salva su Google Drive (${exportFormat.toUpperCase()}) - ${selectedVehicleIds.length} Auto`
                            : saveDestination === 'simultaneo'
                            ? `Salva Simultaneo su Dispositivo + Drive (${exportFormat.toUpperCase()}) - ${selectedVehicleIds.length} Auto`
                            : `Scarica File Locale (${exportFormat.toUpperCase()}) - ${selectedVehicleIds.length} Auto`)
                        : (saveDestination === 'drive'
                            ? `Salva su Google Drive (${exportFormat.toUpperCase()}) - Solo Menu Comune`
                            : saveDestination === 'simultaneo'
                            ? `Salva Simultaneo su Dispositivo + Drive (${exportFormat.toUpperCase()}) - Solo Menu Comune`
                            : `Scarica File Locale (${exportFormat.toUpperCase()}) - Solo Menu Comune`)}
                    </span>
                  </>
                )}
              </button>

            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* SEZIONE 2: IMPORTAZIONE & RIPRISTINO                           */}
      {/* ============================================================== */}
      {mainTab === 'importa' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* SELETTORE SOTTOMENU IMPORTAZIONI: 1. PARCO AUTO vs 2. MENU COMUNE */}
          <div ref={importSubNavRef} className="grid grid-cols-2 gap-2 bg-[#0c1322] p-1.5 rounded-2xl border border-slate-800 shadow-md scroll-mt-4">
            <button
              type="button"
              onClick={() => {
                setImportSubTab('veicoli');
                scrollToSubmenuNav(importSubNavRef);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                importSubTab === 'veicoli'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Database size={14} />
              <span>1. Dati & Parco Auto</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setImportSubTab('lavorazioni');
                scrollToSubmenuNav(importSubNavRef);
                if (isDriveConnected && !isDriveSessionExpired) {
                  loadDriveCatalogFiles();
                }
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                importSubTab === 'lavorazioni'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Wrench size={14} />
              <span>2. Menu Comune (Lavorazioni & Officine)</span>
            </button>
          </div>

          {/* SOTTOMENU A: IMPORTAZIONE PARCO AUTO & DATI GENERALI */}
          {importSubTab === 'veicoli' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Card 1: Carica File dal Dispositivo */}
              <div className="p-5 rounded-3xl bg-[#141e2e] border-2 border-dashed border-blue-500/50 hover:border-blue-400 shadow-xl text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                  <Upload size={28} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Carica Backup DriverCheck da Smartphone o PC
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    Supporta i file salvati da <strong>DriverCheck</strong> in formato Excel <strong>.xlsx</strong>, <strong>.csv</strong> o backup <strong>.json</strong>.
                  </p>
                </div>

                <div className="pt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.json"
                    onChange={handleLocalFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-950 cursor-pointer inline-flex items-center gap-2 active:scale-95 transition-transform"
                  >
                    <HardDrive size={16} />
                    <span>Seleziona File dal Dispositivo</span>
                  </button>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1 font-mono bg-slate-800 px-2 py-0.5 rounded">.XLSX</span>
                  <span className="flex items-center gap-1 font-mono bg-slate-800 px-2 py-0.5 rounded">.CSV</span>
                  <span className="flex items-center gap-1 font-mono bg-slate-800 px-2 py-0.5 rounded">.JSON</span>
                </div>
              </div>

              {/* Card 2: Cartella Locale DriverCheck (File Parco Auto salvati/importati) */}
              <div className="p-4 rounded-3xl bg-[#141e2e] border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Folder className="text-emerald-400" size={17} />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        Cartella Locale DriverCheck • Parco Auto
                      </h3>
                      <span className="text-[10px] text-slate-400">
                        Memorizzazione automatica delle esportazioni e importazioni locali
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isFileSystemAccessSupported() && (
                      <button
                        type="button"
                        onClick={handleConnectLocalDirectory}
                        className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        title="Collega una cartella fisica del tuo PC (es. Documenti/DriverCheck)"
                      >
                        <FolderOpen size={12} className="text-emerald-400" />
                        <span>{connectedDirectoryName ? `📁 ${connectedDirectoryName}` : 'Collega Cartella PC'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={loadLocalFiles}
                      disabled={isLoadingLocalFiles}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={12} className={isLoadingLocalFiles ? 'animate-spin' : ''} />
                      <span>Aggiorna</span>
                    </button>
                  </div>
                </div>

                {isLoadingLocalFiles ? (
                  <div className="py-6 text-center text-slate-400 space-y-2">
                    <RefreshCw size={20} className="animate-spin text-emerald-400 mx-auto" />
                    <p className="text-xs">Lettura cartella locale DriverCheck...</p>
                  </div>
                ) : localFolderFiles.filter((f) => f.category === 'parco_auto' && !isMenuComuneFileName(f.name)).length === 0 ? (
                  <div className="py-6 text-center space-y-2 rounded-2xl bg-[#0e1625] border border-slate-800 p-4">
                    <Folder className="text-slate-600 mx-auto" size={28} />
                    <p className="text-xs font-bold text-white">Nessun backup parco auto nella cartella locale</p>
                    <p className="text-[11px] text-slate-400">
                      Ogni file esportato o importato verrà memorizzato automaticamente qui nella cartella DriverCheck.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {localFolderFiles
                      .filter((f) => f.category === 'parco_auto' && !isMenuComuneFileName(f.name))
                      .map((fileItem) => {
                        const isXlsx = fileItem.format === 'xlsx';
                        const isCsv = fileItem.format === 'csv';

                        return (
                          <div
                            key={fileItem.id}
                            className="p-3 rounded-2xl bg-[#0e1625] hover:bg-[#121c2d] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span
                                className={`w-9 h-9 rounded-xl font-bold font-mono text-[10px] flex items-center justify-center shrink-0 border ${
                                  isXlsx
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : isCsv
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                    : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                }`}
                              >
                                {isXlsx ? 'XLSX' : isCsv ? 'CSV' : 'JSON'}
                              </span>

                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold text-white block truncate">
                                  {fileItem.name}
                                </span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <span>Salvato il: {formatDateTimeIt(fileItem.timestamp)}</span>
                                  {fileItem.size && <span>• {(fileItem.size / 1024).toFixed(0)} KB</span>}
                                  <span className="text-emerald-400 font-semibold">• Locale DriverCheck</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleRestoreFromLocalFolder(fileItem)}
                                disabled={actionLoading !== null}
                                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                              >
                                <Upload size={13} />
                                <span>Ripristina</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => downloadLocalDriverCheckFile(fileItem.id)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Scarica file sul dispositivo"
                              >
                                <Download size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteLocalFile(fileItem.id, fileItem.name)}
                                className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Elimina dalla cartella locale"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Card 3: File di Backup Parco Auto su Google Drive (Cartella: /DriverCheck) */}
              <div className="p-4 rounded-3xl bg-[#141e2e] border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Cloud size={16} className="text-blue-400" />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        Backup Parco Auto su Google Drive (Cartella: /DriverCheck)
                      </h3>
                      <span className="text-[10px] text-slate-400">
                        Rigidamente riservato ai dati dei veicoli (i file Menu Comune sono nella scheda dedicata)
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {driveFilesList.length} file trovati
                  </span>
                </div>

                {isLoadingDriveFiles ? (
                  <div className="py-8 text-center text-slate-400 space-y-2">
                    <RefreshCw size={22} className="animate-spin text-blue-400 mx-auto" />
                    <p className="text-xs">Ricerca file Parco Auto nella cartella /DriverCheck...</p>
                  </div>
                ) : driveFilesList.length === 0 ? (
                  <div className="py-8 text-center space-y-2.5 rounded-2xl bg-[#0e1625] border border-slate-800 p-5">
                    <Cloud size={32} className="text-slate-600 mx-auto" />
                    <p className="text-xs font-bold text-white">Nessun backup parco auto trovato nella cartella /DriverCheck</p>
                    <p className="text-[11px] text-slate-400">
                      Usa la scheda "Esporta Parco Auto" per salvare il tuo primo backup su Drive.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {driveFilesList.map((fileItem) => {
                      const isXlsx = fileItem.name.toLowerCase().endsWith('.xlsx');
                      const isCsv = fileItem.name.toLowerCase().endsWith('.csv');

                      return (
                        <div
                          key={fileItem.id}
                          className="p-3 rounded-2xl bg-[#0e1625] hover:bg-[#121c2d] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span
                              className={`w-9 h-9 rounded-xl font-bold font-mono text-[10px] flex items-center justify-center shrink-0 border ${
                                isXlsx
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : isCsv
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                  : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              }`}
                            >
                              {isXlsx ? 'XLSX' : isCsv ? 'CSV' : 'JSON'}
                            </span>

                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold text-white block truncate">
                                {fileItem.name}
                              </span>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                {fileItem.modifiedTime && (
                                  <span>Salvato il: {formatDateTimeIt(fileItem.modifiedTime)}</span>
                                )}
                                {fileItem.size && (
                                  <span>• {(Number(fileItem.size) / 1024).toFixed(0)} KB</span>
                                )}
                                <span className="text-blue-400 font-semibold">• Drive /DriverCheck</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRestoreFromDrive(fileItem)}
                              disabled={actionLoading !== null}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <CloudDownload size={13} />
                              <span>Ripristina</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteDriveBackup(fileItem)}
                              disabled={actionLoading !== null}
                              className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Elimina da Drive"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SOTTOMENU B: IMPORTAZIONI RELATIVE AL MENU COMUNE (LAVORAZIONI & OFFICINE & BACKUP COMPLETO MENU COMUNE) */}
          {importSubTab === 'lavorazioni' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Card 1: Importa Menu Comune da File Locale (Excel, CSV o JSON) */}
              <div className="p-5 rounded-3xl bg-[#141e2e] border-2 border-dashed border-orange-500/50 hover:border-orange-400 shadow-xl text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center mx-auto">
                  <Wrench size={28} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Importa Menu Comune da File (.xlsx, .csv, .json)
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    Carica file di <strong>BACKUP_COMPLETO_MENUCOMUNE</strong>, lavorazioni o officine salvati in precedenza. Il parco auto resta intatto!
                  </p>
                </div>

                <div className="pt-2">
                  <input
                    ref={catalogFileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.json,text/csv,application/json"
                    onChange={handleCatalogFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => catalogFileInputRef.current?.click()}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm shadow-xl shadow-orange-950 cursor-pointer inline-flex items-center gap-2 active:scale-95 transition-transform"
                  >
                    <Upload size={16} />
                    <span>Scegli File Menu Comune (.xlsx, .csv, .json)</span>
                  </button>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2 text-[10px] text-slate-400">
                  <span className="font-mono bg-slate-800 px-2 py-0.5 rounded">.XLSX (Multi-Foglio)</span>
                  <span className="font-mono bg-slate-800 px-2 py-0.5 rounded">.CSV (Tabelle)</span>
                  <span className="font-mono bg-slate-800 px-2 py-0.5 rounded">.JSON (Dati Completi)</span>
                </div>
              </div>

              {/* Card 2: Cartella Locale DriverCheck (File Menu Comune & Backup Completo Menu Comune) */}
              <div className="p-4 rounded-3xl bg-[#141e2e] border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Folder className="text-orange-400" size={17} />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        Cartella Locale DriverCheck • Menu Comune & Lavorazioni
                      </h3>
                      <span className="text-[10px] text-slate-400">
                        Archivio dei file di BACKUP_COMPLETO_MENUCOMUNE e Lavorazioni salvati localmente
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={loadLocalFiles}
                    disabled={isLoadingLocalFiles}
                    className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={12} className={isLoadingLocalFiles ? 'animate-spin' : ''} />
                    <span>Aggiorna</span>
                  </button>
                </div>

                {isLoadingLocalFiles ? (
                  <div className="py-6 text-center text-slate-400 space-y-2">
                    <RefreshCw size={20} className="animate-spin text-orange-400 mx-auto" />
                    <p className="text-xs">Lettura file Menu Comune dalla cartella locale...</p>
                  </div>
                ) : localFolderFiles.filter((f) => f.category === 'menu_comune' || isMenuComuneFileName(f.name)).length === 0 ? (
                  <div className="py-6 text-center space-y-2 rounded-2xl bg-[#0e1625] border border-slate-800 p-4">
                    <Folder className="text-slate-600 mx-auto" size={28} />
                    <p className="text-xs font-bold text-white">Nessun file Menu Comune nella cartella locale</p>
                    <p className="text-[11px] text-slate-400">
                      I file di backup del Menu Comune salvati appariranno automaticamente qui.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {localFolderFiles
                      .filter((f) => f.category === 'menu_comune' || isMenuComuneFileName(f.name))
                      .map((fileItem) => {
                        const isXlsx = fileItem.format === 'xlsx';
                        const isCsv = fileItem.format === 'csv';

                        return (
                          <div
                            key={fileItem.id}
                            className="p-3 rounded-2xl bg-[#0e1625] hover:bg-[#121c2d] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span
                                className={`w-9 h-9 rounded-xl font-bold font-mono text-[10px] flex items-center justify-center shrink-0 border ${
                                  isXlsx
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : isCsv
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                    : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                                }`}
                              >
                                {isXlsx ? 'XLSX' : isCsv ? 'CSV' : 'JSON'}
                              </span>

                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold text-white block truncate">
                                  {fileItem.name}
                                </span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <span>Salvato il: {formatDateTimeIt(fileItem.timestamp)}</span>
                                  {fileItem.size && <span>• {(fileItem.size / 1024).toFixed(0)} KB</span>}
                                  <span className="text-orange-400 font-semibold">• Menu Comune Locale</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleRestoreFromLocalFolder(fileItem)}
                                disabled={actionLoading !== null}
                                className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                              >
                                <Upload size={13} />
                                <span>Ripristina</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => downloadLocalDriverCheckFile(fileItem.id)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Scarica file sul dispositivo"
                              >
                                <Download size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteLocalFile(fileItem.id, fileItem.name)}
                                className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Elimina dalla cartella locale"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Card 3: Backup Menu Comune salvati su Google Drive (Cartella: /DriverCheck) */}
              <div className="p-4 rounded-3xl bg-[#141e2e] border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Cloud size={16} className="text-orange-400" />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        Backup Menu Comune su Google Drive (Cartella: /DriverCheck)
                      </h3>
                      <span className="text-[10px] text-slate-400">
                        Include BACKUP_COMPLETO_MENUCOMUNE, Lavorazioni, Catalogo e Officine
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={loadDriveCatalogFiles}
                    disabled={isLoadingCatalogFiles}
                    className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={12} className={isLoadingCatalogFiles ? 'animate-spin' : ''} />
                    <span>Aggiorna</span>
                  </button>
                </div>

                {isLoadingCatalogFiles ? (
                  <div className="py-8 text-center text-slate-400 space-y-2">
                    <RefreshCw size={22} className="animate-spin text-orange-400 mx-auto" />
                    <p className="text-xs">Ricerca file Menu Comune nella cartella /DriverCheck...</p>
                  </div>
                ) : driveCatalogFilesList.length === 0 ? (
                  <div className="py-8 text-center space-y-2.5 rounded-2xl bg-[#0e1625] border border-slate-800 p-5">
                    <Cloud size={32} className="text-slate-600 mx-auto" />
                    <p className="text-xs font-bold text-white">Nessun backup Menu Comune trovato nella cartella /DriverCheck</p>
                    <p className="text-[11px] text-slate-400">
                      I file di backup esportati dal Menu Comune appariranno qui automaticamente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {driveCatalogFilesList.map((fileItem) => {
                      const isXlsx = fileItem.name.toLowerCase().endsWith('.xlsx');
                      const isCsv = fileItem.name.toLowerCase().endsWith('.csv');

                      return (
                        <div
                          key={fileItem.id}
                          className="p-3 rounded-2xl bg-[#0e1625] hover:bg-[#121c2d] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span
                              className={`w-9 h-9 rounded-xl font-bold font-mono text-[10px] flex items-center justify-center shrink-0 border ${
                                isXlsx
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : isCsv
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                  : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                              }`}
                            >
                              {isXlsx ? 'XLSX' : isCsv ? 'CSV' : 'JSON'}
                            </span>

                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold text-white block truncate">
                                {fileItem.name}
                              </span>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                {fileItem.modifiedTime && (
                                  <span>Salvato il: {formatDateTimeIt(fileItem.modifiedTime)}</span>
                                )}
                                {fileItem.size && (
                                  <span>• {(Number(fileItem.size) / 1024).toFixed(0)} KB</span>
                                )}
                                <span className="text-orange-400 font-semibold">• Drive /DriverCheck</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRestoreMenuComuneFromDrive(fileItem)}
                              disabled={actionLoading !== null}
                              className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <CloudDownload size={13} />
                              <span>Ripristina</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteCatalogFromDrive(fileItem)}
                              disabled={actionLoading !== null}
                              className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Elimina da Drive"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Card 4: Ripristina Catalogo Standard di Fabbrica */}
              <div className="p-4 rounded-3xl bg-[#0d1522] border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <RotateCcw size={14} className="text-amber-400" />
                    <span>Ripristina Catalogo Predefinito di Fabbrica</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Reimposta le categorie standard (Manutenzione Ordinaria, Freni, Cinghie, Gomme, ecc.).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Reimpostare il catalogo lavorazioni ai valori predefiniti? Le lavorazioni personalizzate verranno ripristinate.')) {
                      onUpdateCatalogo?.(DEFAULT_CATALOG);
                      setFeedback({ type: 'success', text: '✓ Catalogo lavorazioni ripristinato ai valori predefiniti di fabbrica!' });
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold shrink-0 cursor-pointer"
                >
                  Ripristina Default
                </button>
              </div>

            </div>
          )}

        </div>
      )}

      {/* DIALOGO DI CONFERMA RIPRISTINO DATI PARCO AUTO */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#111927] border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Database size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">{confirmDialog.title}</h3>
                <p className="text-xs text-slate-300 mt-1">{confirmDialog.description}</p>
                <div className="mt-2 p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400 font-semibold">
                  {confirmDialog.itemCountText}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-slate-400 block uppercase">
                Scegli la modalità di ripristino:
              </span>

              {/* Opzione 1: Aggiungi / Unisci */}
              <button
                type="button"
                onClick={() => executeRestore('merge')}
                className="w-full p-3 rounded-2xl bg-[#14233c] hover:bg-[#1a2f52] border border-blue-500/40 text-left transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <strong className="block text-xs text-blue-300">
                    {!confirmDialog.dataToRestore?.veicoli || confirmDialog.dataToRestore.veicoli.length === 0
                      ? 'Unisci Categorie e Contatti Esistenti'
                      : 'Aggiungi / Unisci ai Dati Esistenti'}
                  </strong>
                  <span className="text-[10px] text-slate-300 block mt-0.5">
                    {!confirmDialog.dataToRestore?.veicoli || confirmDialog.dataToRestore.veicoli.length === 0
                      ? 'Conserva le tue categorie e officine attuali e unisce quelle del file (il parco auto non viene toccato).'
                      : 'Conserva i veicoli che hai già e aggiunge solo le nuove vetture, interventi e lavorazioni.'}
                  </span>
                </div>
                <ArrowRight size={15} className="text-blue-400 shrink-0 ml-2" />
              </button>

              {/* Opzione 2: Sovrascrivi */}
              <button
                type="button"
                onClick={() => executeRestore('overwrite')}
                className="w-full p-3 rounded-2xl bg-[#2e1d1f] hover:bg-[#3d2427] border border-rose-500/40 text-left transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <strong className="block text-xs text-rose-300">
                    {!confirmDialog.dataToRestore?.veicoli || confirmDialog.dataToRestore.veicoli.length === 0
                      ? 'Sovrascrivi Solo Categorie & Officine (Auto Intatte)'
                      : 'Sovrascrivi Tutto il Database'}
                  </strong>
                  <span className="text-[10px] text-slate-300 block mt-0.5">
                    {!confirmDialog.dataToRestore?.veicoli || confirmDialog.dataToRestore.veicoli.length === 0
                      ? 'Sostituisce il catalogo lavorazioni e la rubrica officine con i dati del file. Il tuo parco auto rimane intatto.'
                      : "Sostituisce completamente l'attuale archivio con i dati presenti in questo file."}
                  </span>
                </div>
                <ArrowRight size={15} className="text-rose-400 shrink-0 ml-2" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setConfirmDialog(null)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* DIALOGO DI CONFERMA RIPRISTINO CATALOGO LAVORAZIONI */}
      {catalogConfirmDialog && catalogConfirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#111927] border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                <Wrench size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">{catalogConfirmDialog.title}</h3>
                <p className="text-xs text-slate-300 mt-1">{catalogConfirmDialog.description}</p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-slate-400 block uppercase">
                Scegli la modalità di ripristino per il Menu Comune:
              </span>

              {/* Opzione 1: Aggiungi / Unisci alle lavorazioni esistenti */}
              <button
                type="button"
                onClick={() => executeCatalogRestore('merge')}
                className="w-full p-3 rounded-2xl bg-[#2a1e12] hover:bg-[#3d2b1a] border border-orange-500/40 text-left transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <strong className="block text-xs text-orange-300">Unisci al Catalogo Esistente</strong>
                  <span className="text-[10px] text-slate-300 block mt-0.5">
                    Conserva le tue lavorazioni attuali e aggiunge le nuove categorie e interventi dal file.
                  </span>
                </div>
                <ArrowRight size={15} className="text-orange-400 shrink-0 ml-2" />
              </button>

              {/* Opzione 2: Sostituisci tutto il catalogo */}
              <button
                type="button"
                onClick={() => executeCatalogRestore('overwrite')}
                className="w-full p-3 rounded-2xl bg-[#2e1d1f] hover:bg-[#3d2427] border border-rose-500/40 text-left transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <strong className="block text-xs text-rose-300">Sostituisci Tutto il Catalogo</strong>
                  <span className="text-[10px] text-slate-300 block mt-0.5">
                    Sostituisce completamente le attuali lavorazioni con quelle del file.
                  </span>
                </div>
                <ArrowRight size={15} className="text-rose-400 shrink-0 ml-2" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setCatalogConfirmDialog(null)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
