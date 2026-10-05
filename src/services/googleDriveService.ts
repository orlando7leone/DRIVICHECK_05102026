import { getAccessToken, clearGoogleToken, isGoogleTokenExpired } from './firebaseAuth';
import { AppDataBackup, DriveBackupFileInfo, CategoriaManutenzione, AnagraficaOfficina } from '../types';
import {
  getDriverCheckTimestamp,
  exportVehiclesAndRecordsToCsv,
  importVehiclesAndRecordsFromCsv,
  exportCatalogToCsv,
  importCatalogFromCsv,
  exportOfficineToCsv,
  importOfficineFromCsv,
} from './storageService';
import { exportFleetToExcelWorkbook, importFleetFromExcel } from './excelService';

// ==========================================
// FUNZIONI GENERALI LISTING GOOGLE DRIVE & GESTIONE CARTELLA DRIVERCHECK
// ==========================================

export interface DriveCategorizedBackups {
  all: DriveBackupFileInfo[];
  veicoli: DriveBackupFileInfo[];
  catalogo: DriveBackupFileInfo[];
  officine: DriveBackupFileInfo[];
}

/**
 * Verifica o crea la cartella 'DriverCheck' su Google Drive nella root dell'utente.
 * Ritorna l'ID della cartella Google Drive in cui memorizzare tutte le esportazioni e backup.
 */
export const getOrCreateDriverCheckFolder = async (token: string): Promise<string> => {
  try {
    // 1. Cerca se la cartella DriverCheck o DRIVECHECK esiste già
    const q = "mimeType = 'application/vnd.google-apps.folder' and (name = 'DriverCheck' or name = 'DRIVECHECK') and trashed = false";
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=5`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }
  } catch (err) {
    console.warn('Controllo cartella DriverCheck su Drive:', err);
  }

  // 2. Se non esiste, crea la cartella 'DriverCheck'
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'DriverCheck',
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Cartella archiviazione automatica per esportazioni e backup DriverCheck',
    }),
  });

  if (createRes.ok) {
    const folderData = await createRes.json();
    return folderData.id;
  }

  throw new Error(`Impossibile creare la cartella DriverCheck su Google Drive: ${createRes.status}`);
};

/**
 * Riconosce in modo rigoroso se un file appartiene all'ambito "Menu Comune"
 * (Lavorazioni, Catalogo, Officine e Backup Completo Menu Comune)
 */
export const isMenuComuneFileName = (filename: string): boolean => {
  const name = (filename || '').toLowerCase();
  const normalized = name.replace(/[^a-z0-9]/g, '');
  return (
    normalized.includes('menucomune') ||
    normalized.includes('backupcompletomenucomune') ||
    name.includes('menucomune') ||
    name.includes('menu_comune') ||
    name.includes('menu comune') ||
    name.includes('lavorazion') ||
    name.includes('catalogo') ||
    name.includes('officin')
  );
};

export const listDriveBackupFiles = async (): Promise<DriveBackupFileInfo[]> => {
  if (isGoogleTokenExpired()) {
    throw new Error('SESSION_EXPIRED: Sessione Google Drive scaduta. Clicca su "Rinnova Connessione Drive" per riattivare l\'accesso.');
  }

  const token = await getAccessToken();
  if (!token) throw new Error('Token Google non disponibile. Effettua prima l\'accesso.');

  const folderId = await getOrCreateDriverCheckFolder(token).catch(() => null);

  // Helper per identificare rigorosamente ed esclusivamente i file generati da DriverCheck
  const isDriverCheckFile = (f: { name?: string; mimeType?: string }) => {
    const name = (f.name || '').toLowerCase();
    const isNameMatch = name.includes('drivercheck');
    const isSupportedExt =
      name.endsWith('.json') ||
      name.endsWith('.xlsx') ||
      name.endsWith('.csv') ||
      name.endsWith('.xls') ||
      f.mimeType === 'application/json' ||
      f.mimeType === 'text/csv' ||
      f.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return (isNameMatch || !!folderId) && isSupportedExt;
  };

  // Cerca sia dentro la cartella DriverCheck, sia nella root se hanno 'DriverCheck' nel nome
  const queryParts = ["trashed = false", "not mimeType = 'application/vnd.google-apps.folder'"];
  if (folderId) {
    queryParts.push(`('${folderId}' in parents or name contains 'DriverCheck' or name contains 'drivercheck')`);
  } else {
    queryParts.push("(name contains 'DriverCheck' or name contains 'drivercheck')");
  }

  const queryStr = queryParts.join(' and ');
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryStr)}&fields=files(id,name,modifiedTime,size,mimeType,parents)&orderBy=modifiedTime%20desc&pageSize=100`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    clearGoogleToken();
    throw new Error('SESSION_EXPIRED: Sessione Google scaduta. Clicca su "Riconnetti Google Drive" per riattivare l\'accesso.');
  }

  let files: DriveBackupFileInfo[] = [];

  if (response.ok) {
    const result = await response.json();
    const rawFiles: any[] = result.files || [];
    // Filtra rigidamente solo i file di DriverCheck
    files = rawFiles.filter(isDriverCheckFile);
  }

  // Fallback se la ricerca con contains restituisce 0 file
  if (files.length === 0) {
    const fallbackUrl = `https://www.googleapis.com/drive/v3/files?q=trashed%3Dfalse&fields=files(id,name,modifiedTime,size,mimeType)&orderBy=modifiedTime%20desc&pageSize=100`;
    const fallbackRes = await fetch(fallbackUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (fallbackRes.status === 401) {
      clearGoogleToken();
      throw new Error('SESSION_EXPIRED: Sessione Google scaduta. Clicca su "Riconnetti Google Drive".');
    }

    if (fallbackRes.ok) {
      const fallbackResult = await fallbackRes.json();
      const allFiles: any[] = fallbackResult.files || [];

      // Filtra ESCLUSIVAMENTE i file di DriverCheck
      files = allFiles.filter(isDriverCheckFile);
    }
  }

  return files;
};

export const deleteBackupFromGoogleDrive = async (fileId: string): Promise<boolean> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Token Google non disponibile. Effettua l\'accesso.');

  const deleteRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (deleteRes.status === 401) {
    clearGoogleToken();
    throw new Error('SESSION_EXPIRED: Sessione Google scaduta.');
  }

  if (!deleteRes.ok && deleteRes.status !== 204 && deleteRes.status !== 404) {
    throw new Error(`Errore eliminazione backup da Drive: ${deleteRes.status}`);
  }

  return true;
};

// ==========================================
// 1. PARCO AUTO (VEICOLI & INTERVENTI) SU DRIVE
// ==========================================

export const saveBackupToGoogleDrive = async (
  data: AppDataBackup,
  format: 'json' | 'csv' | 'xlsx' = 'json',
  customFilename?: string
): Promise<{ id: string; name: string; modifiedTime: string }> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Token Google non disponibile. Effettua l\'accesso.');

  const timestamp = getDriverCheckTimestamp();
  const ext = format === 'xlsx' ? 'xlsx' : format === 'csv' ? 'csv' : 'json';
  let newBackupFilename = customFilename
    ? (customFilename.toLowerCase().endsWith(`.${ext}`) ? customFilename : `${customFilename}.${ext}`)
    : `DriverCheck_Veicoli_${timestamp}.${ext}`;
  let mimeType = 'application/json';
  let fileContent: string | Uint8Array = JSON.stringify(data, null, 2);

  if (format === 'csv') {
    mimeType = 'text/csv';
    fileContent = '\ufeff' + exportVehiclesAndRecordsToCsv(data.veicoli, data.record, data.officineAnagrafica, data.catalogoPersonalizzato);
  } else if (format === 'xlsx') {
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    fileContent = exportFleetToExcelWorkbook(data.veicoli, data.record, data.officineAnagrafica, data.catalogoPersonalizzato);
  }

  // 1. Crea metadati file nella cartella DriverCheck
  const folderId = await getOrCreateDriverCheckFolder(token).catch(() => null);

  const metaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: newBackupFilename,
      mimeType,
      parents: folderId ? [folderId] : undefined,
      description: `Backup DriverCheck parco auto (${data.veicoli.length} veicoli) salvato il ${new Date().toLocaleString('it-IT')}`,
    }),
  });

  if (metaRes.status === 401) {
    clearGoogleToken();
    throw new Error('SESSION_EXPIRED: Sessione Google scaduta. Effettua nuovamente l\'accesso.');
  }

  if (!metaRes.ok) {
    const errText = await metaRes.text();
    throw new Error(`Errore creazione file su Drive: ${metaRes.status} - ${errText}`);
  }

  const createdFile = await metaRes.json();
  const fileId = createdFile.id;

  // 2. Carica contenuto
  const uploadRes = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mimeType,
      },
      body: fileContent as any,
    }
  );

  if (uploadRes.status === 401) {
    clearGoogleToken();
    throw new Error('SESSION_EXPIRED: Sessione Google scaduta.');
  }

  if (!uploadRes.ok) {
    const uploadErr = await uploadRes.text();
    throw new Error(`Errore caricamento dati su Drive: ${uploadRes.status} - ${uploadErr}`);
  }

  return {
    id: fileId,
    name: newBackupFilename,
    modifiedTime: new Date().toISOString(),
  };
};

export const listDriveVehicleBackupFiles = async (): Promise<DriveBackupFileInfo[]> => {
  const all = await listDriveBackupFiles();
  return all.filter((f) => {
    const name = (f.name || '').toLowerCase();
    if (!name.includes('drivercheck')) return false;
    // REQUISITO: BACKUP_COMPLETO_MENUCOMUNE e ogni file Menu Comune
    // NON devono essere visibili qui, ma SOLO su Importa -> Menu Comune!
    return !isMenuComuneFileName(name);
  });
};

export const listDriveMenuComuneBackupFiles = async (): Promise<DriveBackupFileInfo[]> => {
  const all = await listDriveBackupFiles();
  return all.filter((f) => {
    const name = (f.name || '').toLowerCase();
    if (!name.includes('drivercheck')) return false;
    // REQUISITO: BACKUP_COMPLETO_MENUCOMUNE e i file di lavorazioni/catalogo/officine
    // sono visibili SOLO nel Menu Comune!
    return isMenuComuneFileName(name);
  });
};

export const listDriveAllCategorizedFiles = async (): Promise<DriveCategorizedBackups> => {
  const allFiles = await listDriveBackupFiles();
  const driverCheckFiles = allFiles.filter((f) => (f.name || '').toLowerCase().includes('drivercheck'));
  const officine = driverCheckFiles.filter((f) => (f.name || '').toLowerCase().includes('officin'));
  const catalogo = driverCheckFiles.filter((f) => isMenuComuneFileName(f.name || ''));
  const veicoli = driverCheckFiles.filter((f) => !isMenuComuneFileName(f.name || ''));

  return {
    all: driverCheckFiles,
    veicoli,
    catalogo,
    officine,
  };
};

export const restoreBackupFromGoogleDriveById = async (fileId: string): Promise<{
  backupInfo: DriveBackupFileInfo;
  data: AppDataBackup;
}> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Token Google non disponibile. Effettua l\'accesso.');

  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,modifiedTime,size,mimeType`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (metaRes.status === 401) {
    clearGoogleToken();
    throw new Error('SESSION_EXPIRED: Sessione Google scaduta.');
  }

  const backupInfo: DriveBackupFileInfo = metaRes.ok
    ? await metaRes.json()
    : { id: fileId, name: 'Backup Google Drive' };

  const downloadRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (downloadRes.status === 401) {
    clearGoogleToken();
    throw new Error('SESSION_EXPIRED: Sessione Google scaduta.');
  }

  if (!downloadRes.ok) {
    throw new Error(`Errore download backup da Drive: ${downloadRes.status}`);
  }

  const isXlsx =
    (backupInfo.name || '').toLowerCase().endsWith('.xlsx') ||
    (backupInfo.name || '').toLowerCase().endsWith('.xls') ||
    backupInfo.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const isCsv = (backupInfo.name || '').toLowerCase().endsWith('.csv') || backupInfo.mimeType === 'text/csv';

  let data: AppDataBackup;
  if (isXlsx) {
    const arrayBuffer = await downloadRes.arrayBuffer();
    const parsed = importFleetFromExcel(arrayBuffer);
    data = {
      version: '1.0.0',
      timestamp: backupInfo.modifiedTime || new Date().toISOString(),
      veicoli: parsed.veicoli || [],
      record: parsed.records || [],
      catalogoPersonalizzato: parsed.catalogo && parsed.catalogo.length > 0 ? parsed.catalogo : undefined,
      officineAnagrafica: parsed.officine && parsed.officine.length > 0 ? parsed.officine : undefined,
    };
  } else if (isCsv) {
    const rawText = await downloadRes.text();
    const parsed = importVehiclesAndRecordsFromCsv(rawText);
    data = {
      version: '1.0.0',
      timestamp: backupInfo.modifiedTime || new Date().toISOString(),
      veicoli: parsed.veicoli || [],
      record: parsed.records || [],
      catalogoPersonalizzato: parsed.catalogo && parsed.catalogo.length > 0 ? parsed.catalogo : undefined,
      officineAnagrafica: parsed.officine && parsed.officine.length > 0 ? parsed.officine : undefined,
    };
  } else {
    const rawText = await downloadRes.text();
    try {
      data = JSON.parse(rawText);
    } catch {
      // Fallback CSV se il parsing JSON fallisce
      const parsed = importVehiclesAndRecordsFromCsv(rawText);
      data = {
        version: '1.0.0',
        timestamp: backupInfo.modifiedTime || new Date().toISOString(),
        veicoli: parsed.veicoli || [],
        record: parsed.records || [],
        catalogoPersonalizzato: parsed.catalogo && parsed.catalogo.length > 0 ? parsed.catalogo : undefined,
        officineAnagrafica: parsed.officine && parsed.officine.length > 0 ? parsed.officine : undefined,
      };
    }
  }

  const hasValidData =
    (Array.isArray(data.veicoli) && data.veicoli.length > 0) ||
    (Array.isArray(data.record) && data.record.length > 0) ||
    (Array.isArray(data.catalogoPersonalizzato) && data.catalogoPersonalizzato.length > 0) ||
    (Array.isArray(data.officineAnagrafica) && data.officineAnagrafica.length > 0) ||
    isMenuComuneFileName(backupInfo.name || '');

  if (!hasValidData) {
    throw new Error('Il file di backup non contiene una struttura dati valida per DriverCheck.');
  }

  if (!data.veicoli) data.veicoli = [];
  if (!data.record) data.record = [];

  return { backupInfo, data };
};

// ==========================================
// 2. LAVORAZIONI SU GOOGLE DRIVE
// ==========================================

export const saveCatalogToGoogleDrive = async (
  catalogo: CategoriaManutenzione[],
  format: 'json' | 'csv' = 'json'
): Promise<{ id: string; name: string; modifiedTime: string }> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Token Google non disponibile. Effettua l\'accesso.');

  const timestamp = getDriverCheckTimestamp();
  const isCsv = format === 'csv';
  const filename = isCsv
    ? `DriverCheck_Lavorazioni_${timestamp}.csv`
    : `DriverCheck_Lavorazioni_${timestamp}.json`;

  const mimeType = isCsv ? 'text/csv' : 'application/json';
  const fileContent = isCsv
    ? exportCatalogToCsv(catalogo)
    : JSON.stringify(catalogo, null, 2);

  const folderId = await getOrCreateDriverCheckFolder(token).catch(() => null);

  // 1. Crea metadati file nella cartella DriverCheck
  const metaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: filename,
      mimeType,
      parents: folderId ? [folderId] : undefined,
      description: `Catalogo lavorazioni DriverCheck (${catalogo.length} categorie) salvato il ${new Date().toLocaleString('it-IT')}`,
    }),
  });

  if (metaRes.status === 401) {
    clearGoogleToken();
    throw new Error('SESSION_EXPIRED: Sessione Google scaduta.');
  }

  if (!metaRes.ok) {
    const errText = await metaRes.text();
    throw new Error(`Errore creazione file lavorazioni su Drive: ${metaRes.status} - ${errText}`);
  }

  const createdFile = await metaRes.json();
  const fileId = createdFile.id;

  // 2. Carica payload
  const uploadRes = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `${mimeType}; charset=UTF-8`,
      },
      body: isCsv ? '\ufeff' + fileContent : fileContent,
    }
  );

  if (uploadRes.status === 401) {
    clearGoogleToken();
    throw new Error('SESSION_EXPIRED: Sessione Google scaduta.');
  }

  if (!uploadRes.ok) {
    const uploadErr = await uploadRes.text();
    throw new Error(`Errore caricamento lavorazioni su Drive: ${uploadRes.status} - ${uploadErr}`);
  }

  return {
    id: fileId,
    name: filename,
    modifiedTime: new Date().toISOString(),
  };
};

export const listDriveCatalogFiles = async (): Promise<DriveBackupFileInfo[]> => {
  const all = await listDriveBackupFiles();
  return all.filter((f) => {
    const name = (f.name || '').toLowerCase();
    return name.includes('drivercheck') && (name.includes('lavorazion') || name.includes('catalogo'));
  });
};

export const restoreCatalogFromGoogleDriveById = async (
  fileId: string
): Promise<{ catalogo: CategoriaManutenzione[]; fileName: string }> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Token Google non disponibile. Effettua l\'accesso.');

  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,modifiedTime,mimeType`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (metaRes.status === 401) {
    clearGoogleToken();
    throw new Error('SESSION_EXPIRED: Sessione Google scaduta.');
  }

  let fileName = 'Lavorazioni';
  let mimeType = 'application/json';
  if (metaRes.ok) {
    const meta = await metaRes.json();
    fileName = meta.name || 'Lavorazioni';
    mimeType = meta.mimeType || 'application/json';
  }

  const contentRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (contentRes.status === 401) {
    clearGoogleToken();
    throw new Error('SESSION_EXPIRED: Sessione Google scaduta.');
  }

  if (!contentRes.ok) {
    throw new Error(`Errore download lavorazioni da Drive: ${contentRes.status}`);
  }

  const rawText = await contentRes.text();
  const isCsv = fileName.toLowerCase().endsWith('.csv') || mimeType === 'text/csv';

  let parsedCatalogo: CategoriaManutenzione[] | null = null;

  if (isCsv) {
    parsedCatalogo = importCatalogFromCsv(rawText);
  } else {
    try {
      const json = JSON.parse(rawText);
      if (Array.isArray(json)) {
        parsedCatalogo = json;
      } else if (json.catalogo && Array.isArray(json.catalogo)) {
        parsedCatalogo = json.catalogo;
      } else if (json.catalogoPersonalizzato && Array.isArray(json.catalogoPersonalizzato)) {
        parsedCatalogo = json.catalogoPersonalizzato;
      }
    } catch {
      parsedCatalogo = importCatalogFromCsv(rawText);
    }
  }

  if (!parsedCatalogo || !Array.isArray(parsedCatalogo)) {
    throw new Error('Il file selezionato non contiene una struttura valida di categorie e lavorazioni.');
  }

  return { catalogo: parsedCatalogo, fileName };
};

// ==========================================
// 3. OFFICINE SU GOOGLE DRIVE
// ==========================================

export const saveOfficineToGoogleDrive = async (
  officine: AnagraficaOfficina[],
  format: 'json' | 'csv' = 'json'
): Promise<{ id: string; name: string; modifiedTime: string }> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Token Google non disponibile. Effettua l\'accesso.');

  const timestamp = getDriverCheckTimestamp();
  const isCsv = format === 'csv';
  const filename = isCsv
    ? `DriverCheck_Officine_${timestamp}.csv`
    : `DriverCheck_Officine_${timestamp}.json`;

  const mimeType = isCsv ? 'text/csv' : 'application/json';
  const fileContent = isCsv
    ? exportOfficineToCsv(officine)
    : JSON.stringify(officine, null, 2);

  const folderId = await getOrCreateDriverCheckFolder(token).catch(() => null);

  const metaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: filename,
      mimeType,
      parents: folderId ? [folderId] : undefined,
      description: `Anagrafica officine e specialisti DriverCheck (${officine.length} salvate) il ${new Date().toLocaleString('it-IT')}`,
    }),
  });

  if (metaRes.status === 401) {
    clearGoogleToken();
    throw new Error('SESSION_EXPIRED: Sessione Google scaduta.');
  }

  if (!metaRes.ok) {
    throw new Error(`Errore creazione file officine su Drive: ${metaRes.status}`);
  }

  const metaData = await metaRes.json();
  const fileId = metaData.id;

  const uploadRes = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `${mimeType}; charset=UTF-8`,
      },
      body: isCsv ? '\ufeff' + fileContent : fileContent,
    }
  );

  if (uploadRes.status === 401) {
    clearGoogleToken();
    throw new Error('SESSION_EXPIRED: Sessione Google scaduta.');
  }

  if (!uploadRes.ok) {
    throw new Error(`Errore caricamento dati officine su Drive: ${uploadRes.status}`);
  }

  return {
    id: fileId,
    name: filename,
    modifiedTime: new Date().toISOString(),
  };
};

export const listDriveOfficineFiles = async (): Promise<DriveBackupFileInfo[]> => {
  const all = await listDriveBackupFiles();
  return all.filter((f) => {
    const name = (f.name || '').toLowerCase();
    return name.includes('drivercheck') && name.includes('officin');
  });
};

export const restoreOfficineFromGoogleDriveById = async (
  fileId: string
): Promise<{ officine: AnagraficaOfficina[]; fileName: string }> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Token Google non disponibile. Effettua l\'accesso.');

  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,modifiedTime,mimeType`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (metaRes.status === 401) {
    clearGoogleToken();
    throw new Error('SESSION_EXPIRED: Sessione Google scaduta.');
  }

  let fileName = 'Officine';
  let mimeType = 'application/json';
  if (metaRes.ok) {
    const meta = await metaRes.json();
    fileName = meta.name || 'Officine';
    mimeType = meta.mimeType || 'application/json';
  }

  const contentRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (contentRes.status === 401) {
    clearGoogleToken();
    throw new Error('SESSION_EXPIRED: Sessione Google scaduta.');
  }

  if (!contentRes.ok) {
    throw new Error(`Errore download officine da Drive: ${contentRes.status}`);
  }

  const rawText = await contentRes.text();
  const isCsv = fileName.toLowerCase().endsWith('.csv') || mimeType === 'text/csv';

  let parsedOfficine: AnagraficaOfficina[] | null = null;
  if (isCsv) {
    parsedOfficine = importOfficineFromCsv(rawText);
  } else {
    try {
      const json = JSON.parse(rawText);
      if (Array.isArray(json)) {
        parsedOfficine = json;
      } else if (json.officine && Array.isArray(json.officine)) {
        parsedOfficine = json.officine;
      }
    } catch {
      parsedOfficine = importOfficineFromCsv(rawText);
    }
  }

  if (!parsedOfficine || !Array.isArray(parsedOfficine)) {
    throw new Error('Il file selezionato non contiene una lista valida di officine.');
  }

  return { officine: parsedOfficine, fileName };
};

/**
 * Carica qualsiasi file (Blob, ArrayBuffer o stringa) direttamente nella cartella DriverCheck su Google Drive
 */
export const uploadRawFileToDriverCheckFolder = async (
  filename: string,
  content: Blob | string | Uint8Array | ArrayBuffer,
  mimeType?: string
): Promise<DriveBackupFileInfo> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Token Google non disponibile. Effettua l\'accesso.');

  const folderId = await getOrCreateDriverCheckFolder(token).catch(() => null);

  let finalMime = mimeType;
  if (!finalMime) {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.xlsx')) finalMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (lower.endsWith('.csv')) finalMime = 'text/csv';
    else finalMime = 'application/json';
  }

  const metaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: filename,
      mimeType: finalMime,
      parents: folderId ? [folderId] : undefined,
      description: `File DriverCheck importato e archiviato il ${new Date().toLocaleString('it-IT')}`,
    }),
  });

  if (metaRes.status === 401) {
    clearGoogleToken();
    throw new Error('SESSION_EXPIRED: Sessione Google scaduta.');
  }

  if (!metaRes.ok) {
    const errText = await metaRes.text();
    throw new Error(`Errore creazione file su Drive: ${metaRes.status} - ${errText}`);
  }

  const createdFile = await metaRes.json();
  const fileId = createdFile.id;

  const bodyData = content instanceof ArrayBuffer ? new Blob([content]) : content;

  const uploadRes = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': finalMime,
      },
      body: bodyData as any,
    }
  );

  if (uploadRes.status === 401) {
    clearGoogleToken();
    throw new Error('SESSION_EXPIRED: Sessione Google scaduta.');
  }

  if (!uploadRes.ok) {
    const uploadErr = await uploadRes.text();
    throw new Error(`Errore caricamento dati su Drive: ${uploadRes.status} - ${uploadErr}`);
  }

  return {
    id: fileId,
    name: filename,
    modifiedTime: new Date().toISOString(),
  };
};
