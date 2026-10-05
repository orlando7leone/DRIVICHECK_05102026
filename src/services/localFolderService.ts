/**
 * localFolderService.ts
 * Gestione della cartella locale "DriverCheck" sia tramite IndexedDB per archiviazione e consultazione
 * persistente nell'app, sia tramite File System Access API (quando supportata dal browser) per
 * memorizzazione diretta nella cartella DriverCheck sul disco fisso del dispositivo.
 */

export interface LocalBackupFile {
  id: string;
  name: string;
  timestamp: string;
  size: number;
  format: 'xlsx' | 'csv' | 'json';
  category: 'parco_auto' | 'menu_comune';
  content?: Blob | string;
}

const DB_NAME = 'DriverCheck_Storage';
const DB_VERSION = 1;
const STORE_NAME = 'drivercheck_folder';
const HANDLE_STORE_NAME = 'fs_handles';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e: any) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(HANDLE_STORE_NAME)) {
        db.createObjectStore(HANDLE_STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

/**
 * Salva un file nella cartella locale DriverCheck (IndexedDB + File System su disco se collegato)
 */
export const saveFileToLocalDriverCheckFolder = async (params: {
  name: string;
  content: Blob | string | Uint8Array;
  format: 'xlsx' | 'csv' | 'json';
  category?: 'parco_auto' | 'menu_comune';
}): Promise<LocalBackupFile> => {
  const db = await openDB();

  let blob: Blob;
  if (params.content instanceof Blob) {
    blob = params.content;
  } else if (params.content instanceof Uint8Array) {
    blob = new Blob([params.content as any], {
      type:
        params.format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : params.format === 'csv'
          ? 'text/csv'
          : 'application/json',
    });
  } else {
    blob = new Blob([params.content as any], {
      type: params.format === 'csv' ? 'text/csv' : 'application/json',
    });
  }

  // Identifica categoria
  let category: 'parco_auto' | 'menu_comune' = params.category || 'parco_auto';
  const lowerName = params.name.toLowerCase();
  if (
    lowerName.includes('menucomune') ||
    lowerName.includes('menu_comune') ||
    lowerName.includes('catalogo') ||
    lowerName.includes('lavorazion') ||
    lowerName.includes('officin')
  ) {
    category = 'menu_comune';
  }

  const record: LocalBackupFile = {
    id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: params.name,
    timestamp: new Date().toISOString(),
    size: blob.size,
    format: params.format,
    category,
    content: blob,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const putReq = store.put(record);
    putReq.onsuccess = () => resolve();
    putReq.onerror = () => reject(putReq.error);
  });

  // Se è collegata una vera cartella locale su disco (Chrome/Edge), salva anche lì direttamente
  try {
    await saveDirectlyToConnectedDirectory(params.name, blob);
  } catch (err) {
    console.warn('Scrittura opzionale in directory su disco non riuscita o non collegata:', err);
  }

  return record;
};

/**
 * Elenca tutti i file presenti nella cartella locale DriverCheck
 */
export const listLocalDriverCheckFiles = async (): Promise<LocalBackupFile[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const files: LocalBackupFile[] = req.result || [];
        // Ordina dal più recente
        files.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(files);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Errore lettura file cartella locale DriverCheck:', err);
    return [];
  }
};

/**
 * Recupera il contenuto di un file dalla cartella locale
 */
export const getLocalDriverCheckFile = async (id: string): Promise<LocalBackupFile | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
};

/**
 * Elimina un file dalla cartella locale DriverCheck
 */
export const deleteLocalDriverCheckFile = async (id: string): Promise<boolean> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
};

/**
 * Scarica sul computer un file presente nella cartella locale DriverCheck
 */
export const downloadLocalDriverCheckFile = async (id: string): Promise<void> => {
  const file = await getLocalDriverCheckFile(id);
  if (!file || !file.content) throw new Error('File non trovato nella cartella locale');

  const blob = file.content instanceof Blob ? file.content : new Blob([file.content]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ============================================================
// SUPPORTO FILE SYSTEM ACCESS API (Salvataggio diretto su disco)
// ============================================================

export const isFileSystemAccessSupported = (): boolean => {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
};

/**
 * Permette all'utente di selezionare o creare la cartella "DriverCheck" sul proprio disco fisso
 */
export const connectLocalDirectory = async (): Promise<string> => {
  if (!isFileSystemAccessSupported()) {
    throw new Error('Il tuo browser non supporta la selezione diretta di cartelle su disco.');
  }

  // @ts-ignore
  const dirHandle = await window.showDirectoryPicker({
    id: 'drivercheck_folder',
    mode: 'readwrite',
  });

  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(HANDLE_STORE_NAME);
    const req = store.put({ key: 'dir_handle', handle: dirHandle, name: dirHandle.name });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  return dirHandle.name;
};

export const getConnectedDirectoryName = async (): Promise<string | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(HANDLE_STORE_NAME, 'readonly');
      const store = tx.objectStore(HANDLE_STORE_NAME);
      const req = store.get('dir_handle');
      req.onsuccess = () => {
        resolve(req.result?.name || null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

export const disconnectLocalDirectory = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(HANDLE_STORE_NAME);
    const req = store.delete('dir_handle');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

const getStoredDirectoryHandle = async (): Promise<any | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(HANDLE_STORE_NAME, 'readonly');
      const store = tx.objectStore(HANDLE_STORE_NAME);
      const req = store.get('dir_handle');
      req.onsuccess = () => resolve(req.result?.handle || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

export const saveDirectlyToConnectedDirectory = async (
  filename: string,
  blob: Blob
): Promise<boolean> => {
  const dirHandle = await getStoredDirectoryHandle();
  if (!dirHandle) return false;

  try {
    // Verifica permessi
    if (dirHandle.requestPermission) {
      const perm = await dirHandle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return false;
    }
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (err) {
    console.warn('Impossibile scrivere direttamente nel directory handle:', err);
    return false;
  }
};
