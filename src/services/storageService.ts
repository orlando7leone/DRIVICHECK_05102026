import { Veicolo, InterventoRecord, CategoriaManutenzione, AppDataBackup, AnagraficaOfficina, TipoPagamentoScadenza } from '../types';
import { INITIAL_VEHICLES, INITIAL_RECORDS } from '../data/sampleData';
import { DEFAULT_CATALOG } from '../data/defaultCatalog';
import {
  DEFAULT_OFFICINE,
  DEFAULT_ENTI_RISCOSSIONE,
  DEFAULT_COMPAGNIE_ASSICURAZIONE,
} from '../data/defaultAnagrafiche';

const STORAGE_KEYS = {
  VEICOLI: 'drivecheck_veicoli',
  RECORD: 'drivecheck_record',
  CATALOGO: 'drivecheck_catalogo',
  OFFICINE: 'drivecheck_officine_anagrafica',
  ENTI_RISCOSSIONE: 'drivecheck_enti_riscossione',
  COMPAGNIE_ASSICURAZIONE: 'drivecheck_compagnie_assicurative',
  SELECTED_VEHICLE: 'drivecheck_selected_vehicle_id',
  SETTINGS: 'drivecheck_settings',
  // Backwards compatibility legacy keys
  LEGACY_VEICOLI: 'cartracker_veicoli',
  LEGACY_RECORD: 'cartracker_record',
  LEGACY_CATALOGO: 'cartracker_catalogo',
  LEGACY_SELECTED: 'cartracker_selected_vehicle_id',
};

export const loadStoredVeicoli = (): Veicolo[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VEICOLI) || localStorage.getItem(STORAGE_KEYS.LEGACY_VEICOLI);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.VEICOLI, JSON.stringify(INITIAL_VEHICLES));
      return INITIAL_VEHICLES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Errore caricamento veicoli da localStorage', e);
    return INITIAL_VEHICLES;
  }
};

export const saveStoredVeicoli = (veicoli: Veicolo[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.VEICOLI, JSON.stringify(veicoli));
  } catch (e: any) {
    console.warn('Avviso: Quota localStorage saturata, salvataggio sicuro veicoli:', e);
    try {
      // In caso di saturazione quota, alleggerisci le immagini non compresse
      const safeVeicoli = veicoli.map((v) => {
        if (v.immagine && v.immagine.length > 200000) {
          return { ...v, immagine: undefined };
        }
        return v;
      });
      localStorage.setItem(STORAGE_KEYS.VEICOLI, JSON.stringify(safeVeicoli));
    } catch (innerErr) {
      console.error('Errore critico salvataggio veicoli:', innerErr);
    }
  }
};

export const loadStoredRecord = (): InterventoRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECORD) || localStorage.getItem(STORAGE_KEYS.LEGACY_RECORD);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.RECORD, JSON.stringify(INITIAL_RECORDS));
      return INITIAL_RECORDS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Errore caricamento record da localStorage', e);
    return INITIAL_RECORDS;
  }
};

export const saveStoredRecord = (record: InterventoRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.RECORD, JSON.stringify(record));
  } catch (e: any) {
    console.warn('Avviso: Quota localStorage per record saturata:', e);
    try {
      const safeRecord = record.map((r) => {
        if (r.fotoRicevutaUrl && r.fotoRicevutaUrl.length > 200000) {
          return { ...r, fotoRicevutaUrl: undefined };
        }
        return r;
      });
      localStorage.setItem(STORAGE_KEYS.RECORD, JSON.stringify(safeRecord));
    } catch (innerErr) {
      console.error('Errore critico salvataggio record:', innerErr);
    }
  }
};

export const loadStoredCatalog = (): CategoriaManutenzione[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATALOGO) || localStorage.getItem(STORAGE_KEYS.LEGACY_CATALOGO);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CATALOGO, JSON.stringify(DEFAULT_CATALOG));
      return DEFAULT_CATALOG;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Errore caricamento catalogo', e);
    return DEFAULT_CATALOG;
  }
};

export const saveStoredCatalog = (catalog: CategoriaManutenzione[]) => {
  localStorage.setItem(STORAGE_KEYS.CATALOGO, JSON.stringify(catalog));
};

export const loadStoredOfficine = (): AnagraficaOfficina[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFICINE);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.OFFICINE, JSON.stringify(DEFAULT_OFFICINE));
      return DEFAULT_OFFICINE;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_OFFICINE;
  } catch (e) {
    console.error('Errore caricamento officine', e);
    return DEFAULT_OFFICINE;
  }
};

export const saveStoredOfficine = (officine: AnagraficaOfficina[]) => {
  localStorage.setItem(STORAGE_KEYS.OFFICINE, JSON.stringify(officine));
};

export const loadStoredEntiRiscossione = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ENTI_RISCOSSIONE);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ENTI_RISCOSSIONE, JSON.stringify(DEFAULT_ENTI_RISCOSSIONE));
      return DEFAULT_ENTI_RISCOSSIONE;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_ENTI_RISCOSSIONE;
  } catch {
    return DEFAULT_ENTI_RISCOSSIONE;
  }
};

export const saveStoredEntiRiscossione = (enti: string[]) => {
  localStorage.setItem(STORAGE_KEYS.ENTI_RISCOSSIONE, JSON.stringify(enti));
};

export const loadStoredCompagnieAssicurative = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPAGNIE_ASSICURAZIONE);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.COMPAGNIE_ASSICURAZIONE, JSON.stringify(DEFAULT_COMPAGNIE_ASSICURAZIONE));
      return DEFAULT_COMPAGNIE_ASSICURAZIONE;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_COMPAGNIE_ASSICURAZIONE;
  } catch {
    return DEFAULT_COMPAGNIE_ASSICURAZIONE;
  }
};

export const saveStoredCompagnieAssicurative = (compagnie: string[]) => {
  localStorage.setItem(STORAGE_KEYS.COMPAGNIE_ASSICURAZIONE, JSON.stringify(compagnie));
};

export const exportOfficineJson = (officine: AnagraficaOfficina[]): string => {
  return JSON.stringify(officine, null, 2);
};

export const downloadOfficineJsonFile = (jsonString: string, customFilename?: string) => {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = customFilename || `DriverCheck_Officine_${getDriverCheckTimestamp()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadOfficineCsvFile = (csvContent: string, customFilename?: string) => {
  downloadCsvFile(csvContent, customFilename || `DriverCheck_Officine_${getDriverCheckTimestamp()}.csv`);
};

export const exportOfficineToCsv = (officine: AnagraficaOfficina[]): string => {
  const headers = ['Nome', 'Tipologia', 'Telefono', 'Referente', 'Indirizzo', 'Citta', 'Note'].join(';');
  const rows = officine.map((o) =>
    [
      `"${(o.nome || '').replace(/"/g, '""')}"`,
      `"${o.tipo || 'Meccanico'}"`,
      `"${(o.telefono || '').replace(/"/g, '""')}"`,
      `"${(o.referente || '').replace(/"/g, '""')}"`,
      `"${(o.indirizzo || '').replace(/"/g, '""')}"`,
      `"${(o.citta || '').replace(/"/g, '""')}"`,
      `"${(o.note || '').replace(/"/g, '""')}"`,
    ].join(';')
  );
  return [headers, ...rows].join('\r\n');
};

export const importOfficineFromCsv = (csvText: string): AnagraficaOfficina[] => {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return [];

  const list: AnagraficaOfficina[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;
    const nome = row[0]?.trim();
    if (!nome) continue;

    const tipo = (row[1]?.trim() || 'Meccanico') as any;
    list.push({
      id: `off-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
      nome,
      tipo,
      telefono: row[2]?.trim() || '',
      referente: row[3]?.trim() || '',
      indirizzo: row[4]?.trim() || '',
      citta: row[5]?.trim() || '',
      note: row[6]?.trim() || '',
    });
  }
  return list;
};

export const getStoredSelectedVehicleId = (veicoli: Veicolo[]): string => {
  const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_VEHICLE) || localStorage.getItem(STORAGE_KEYS.LEGACY_SELECTED);
  if (stored && veicoli.some(v => v.id === stored)) {
    return stored;
  }
  return veicoli[0]?.id || '';
};

export const saveStoredSelectedVehicleId = (id: string) => {
  localStorage.setItem(STORAGE_KEYS.SELECTED_VEHICLE, id);
};

export const exportFullBackupJson = (
  veicoli: Veicolo[],
  record: InterventoRecord[],
  catalogo: CategoriaManutenzione[],
  selectedVehicleId?: string,
  officineAnagrafica?: AnagraficaOfficina[],
  entiRiscossione?: string[],
  compagnieAssicurative?: string[]
): string => {
  const backup: AppDataBackup = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    veicoli,
    record,
    catalogoPersonalizzato: catalogo,
    officineAnagrafica: officineAnagrafica || loadStoredOfficine(),
    entiRiscossione: entiRiscossione || loadStoredEntiRiscossione(),
    compagnieAssicurative: compagnieAssicurative || loadStoredCompagnieAssicurative(),
    veicoloSelezionatoId: selectedVehicleId,
  };
  return JSON.stringify(backup, null, 2);
};

// Genera il timestamp formattato YYYY-MM-DD_HH-mm per file chiari (data-ora)
export const getDriverCheckTimestamp = (): string => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  return `${yyyy}-${mm}-${dd}_${hh}-${min}`;
};

// Helper universale per analizzare righe CSV gestendo virgolette e delimitatori (; o ,)
export const parseCsvRows = (csvText: string): string[][] => {
  const clean = csvText.replace(/^\ufeff/, '').trim();
  if (!clean) return [];
  const firstLine = clean.split(/\r\n|\n|\r/)[0] || '';
  const delimiter = firstLine.includes(';') ? ';' : ',';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.length > 0 && currentRow.some((f) => f.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((f) => f.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
};

export const downloadJsonBackupFile = (jsonString: string, customFilename?: string) => {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = customFilename || `DriverCheck_Veicoli_${getDriverCheckTimestamp()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadVehiclesJsonFile = (jsonString: string, customFilename?: string) => {
  downloadJsonBackupFile(jsonString, customFilename || `DriverCheck_Veicoli_${getDriverCheckTimestamp()}.json`);
};

export const downloadVehiclesCsvFile = (csvContent: string, customFilename?: string) => {
  downloadCsvFile(csvContent, customFilename || `DriverCheck_Veicoli_${getDriverCheckTimestamp()}.csv`);
};

// Esportazione completa Parco Auto (Veicoli + Storico Interventi + Officine + Catalogo) in formato CSV
export const exportVehiclesAndRecordsToCsv = (
  veicoli: Veicolo[],
  records: InterventoRecord[],
  officine?: AnagraficaOfficina[],
  catalogo?: CategoriaManutenzione[]
): string => {
  const vehicleMap = new Map<string, Veicolo>();
  veicoli.forEach((v) => vehicleMap.set(v.id, v));

  const headers = [
    'Tipo Record',
    'Targa',
    'Marca',
    'Modello',
    'Cilindrata',
    'Alimentazione',
    'Anno Acquisto',
    'Proprietario',
    'Cellulare',
    'Residenza',
    'Scadenza Bollo',
    'Importo Bollo',
    'Scadenza Revisione',
    'Scadenza Assicurazione',
    'Importo Assicurazione',
    'Compagnia Assicurazione',
    'KM Attuali',
    'Dimensioni Gomme',
    'Pressione Anteriore',
    'Pressione Posteriore',
    'Officina Veicolo',
    'Telefono Officina',
    'Data Intervento',
    'KM Intervento',
    'Tipologia Intervento',
    'Titolo Intervento',
    'Costo (€)',
    'Officina Intervento',
    'Lavorazioni Eseguite',
    'Note',
    'Promemoria Attivo',
    'Data Promemoria',
    'KM Promemoria',
  ].join(';');

  const rows: string[] = [];

  // Righe Veicoli
  veicoli.forEach((v) => {
    rows.push(
      [
        'VEICOLO',
        `"${(v.targa || '').replace(/"/g, '""')}"`,
        `"${(v.marca || '').replace(/"/g, '""')}"`,
        `"${(v.modello || '').replace(/"/g, '""')}"`,
        `"${(v.cilindrata || '').replace(/"/g, '""')}"`,
        v.alimentazione || 'DIESEL',
        v.annoAcquisto || '',
        `"${(v.proprietario || '').replace(/"/g, '""')}"`,
        `"${(v.cellulare || '').replace(/"/g, '""')}"`,
        `"${(v.residenteIn || '').replace(/"/g, '""')}"`,
        v.scadenzaBollo || '',
        (v.importoBollo || 0).toFixed(2),
        v.scadenzaRevisione || '',
        v.scadenzaAssicurazione || '',
        (v.importoAssicurazione || 0).toFixed(2),
        `"${(v.compagniaAssicurazione || '').replace(/"/g, '""')}"`,
        v.kmAttuali || 0,
        `"${(v.dimensioniGomme || '').replace(/"/g, '""')}"`,
        `"${(v.pressioneAnteriore || '').replace(/"/g, '""')}"`,
        `"${(v.pressionePosteriore || '').replace(/"/g, '""')}"`,
        `"${(v.officina || '').replace(/"/g, '""')}"`,
        `"${(v.telefonoOfficina || '').replace(/"/g, '""')}"`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        `"${(v.note || '').replace(/"/g, '""')}"`,
        '',
        '',
        '',
      ].join(';')
    );
  });

  // Righe Officine e Specialisti
  if (officine && officine.length > 0) {
    officine.forEach((o) => {
      rows.push(
        [
          'OFFICINA',
          '',
          `"${(o.tipo || 'Meccanico').replace(/"/g, '""')}"`,
          `"${(o.nome || '').replace(/"/g, '""')}"`,
          '',
          '',
          '',
          `"${(o.referente || '').replace(/"/g, '""')}"`,
          `"${(o.telefono || '').replace(/"/g, '""')}"`,
          `"${(o.citta || '').replace(/"/g, '""')}"`,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          `"${(o.nome || '').replace(/"/g, '""')}"`,
          `"${(o.telefono || '').replace(/"/g, '""')}"`,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          `"${([o.indirizzo, o.note].filter(Boolean).join(' - ')).replace(/"/g, '""')}"`,
          '',
          '',
          '',
        ].join(';')
      );
    });
  }

  // Righe Interventi
  records.forEach((r) => {
    const v = vehicleMap.get(r.veicoloId);
    const lavs = (r.lavorazioniSelezionate || []).map((l) => l.nome).join(' | ');
    rows.push(
      [
        'INTERVENTO',
        `"${(v?.targa || '').replace(/"/g, '""')}"`,
        `"${(v?.marca || '').replace(/"/g, '""')}"`,
        `"${(v?.modello || '').replace(/"/g, '""')}"`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        r.data || '',
        r.km || 0,
        r.tipo || 'manutenzione',
        `"${(r.titolo || '').replace(/"/g, '""')}"`,
        (r.costo || 0).toFixed(2),
        `"${(r.officina || '').replace(/"/g, '""')}"`,
        `"${lavs.replace(/"/g, '""')}"`,
        `"${(r.note || '').replace(/"/g, '""')}"`,
        r.haPromemoria ? 'SI' : 'NO',
        r.dataPromemoria || '',
        r.kmPromemoria ? r.kmPromemoria.toString() : '',
      ].join(';')
    );
  });

  // Righe Catalogo Lavorazioni Menu Comune
  if (catalogo && catalogo.length > 0) {
    catalogo.forEach((c) => {
      if (c.sottocategorie && Array.isArray(c.sottocategorie)) {
        c.sottocategorie.forEach((sc) => {
          if (sc.lavorazioni && Array.isArray(sc.lavorazioni)) {
            sc.lavorazioni.forEach((lav) => {
              rows.push(
                [
                  'CATALOGO',
                  '',
                  `"${(c.nome || '').replace(/"/g, '""')}"`,
                  `"${(sc.nome || '').replace(/"/g, '""')}"`,
                  '',
                  '',
                  `"${(c.iconName || 'Wrench').replace(/"/g, '""')}"`,
                  `"${(lav.nome || '').replace(/"/g, '""')}"`,
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  `"${(lav.iconName || c.iconName || 'Wrench').replace(/"/g, '""')}"`,
                  `"${(lav.coloreIcona || '').replace(/"/g, '""')}"`,
                ].join(';')
              );
            });
          }
        });
      }
    });
  }

  return [headers, ...rows].join('\r\n');
};

// Importazione Parco Auto da file CSV (supporta sia file completi con VEICOLO/INTERVENTO/OFFICINA che file storici tabellari)
export const importVehiclesAndRecordsFromCsv = (
  csvText: string
): { veicoli: Veicolo[]; records: InterventoRecord[]; officine: AnagraficaOfficina[]; catalogo?: CategoriaManutenzione[] } => {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return { veicoli: [], records: [], officine: [] };

  const headerRow = rows[0].map((h) => h.trim().toLowerCase());
  const colIndex = (names: string[]) => {
    return headerRow.findIndex((h) => names.some((n) => h.includes(n.toLowerCase())));
  };

  const idxTipoRecord = colIndex(['tipo record']);
  const idxTarga = colIndex(['targa']);
  const idxMarca = colIndex(['marca']);
  const idxModello = colIndex(['modello']);
  const idxCilindrata = colIndex(['cilindrata']);
  const idxAlimentazione = colIndex(['alimentazione']);
  const idxAnnoAcquisto = colIndex(['anno acquisto', 'anno']);
  const idxProprietario = colIndex(['proprietario']);
  const idxCellulare = colIndex(['cellulare', 'telefono']);
  const idxResidenza = colIndex(['residenza', 'residente']);
  const idxScadBollo = colIndex(['scadenza bollo', 'bollo']);
  const idxImpBollo = colIndex(['importo bollo']);
  const idxScadRevisione = colIndex(['scadenza revisione', 'revisione']);
  const idxScadAssicurazione = colIndex(['scadenza assicurazione', 'assicurazione']);
  const idxImpAssicurazione = colIndex(['importo assicurazione']);
  const idxCompagnia = colIndex(['compagnia']);
  const idxKmAttuali = colIndex(['km attuali', 'km']);
  const idxDimGomme = colIndex(['dimensioni gomme', 'gomme']);
  const idxPressAnt = colIndex(['pressione anteriore']);
  const idxPressPost = colIndex(['pressione posteriore']);
  const idxOffVeicolo = colIndex(['officina veicolo', 'officina abituale']);
  const idxTelOfficina = colIndex(['telefono officina']);

  // Colonne intervento
  const idxDataInt = colIndex(['data intervento', 'data']);
  const idxKmInt = colIndex(['km intervento']);
  const idxTipologiaInt = colIndex(['tipologia intervento', 'tipologia', 'tipo']);
  const idxTitoloInt = colIndex(['titolo intervento', 'titolo']);
  const idxCostoInt = colIndex(['costo']);
  const idxOffInt = colIndex(['officina intervento', 'officina / specialista', 'officina']);
  const idxLavInt = colIndex(['lavorazioni eseguite', 'lavorazioni']);
  const idxNote = colIndex(['note']);
  const idxPromemoria = colIndex(['promemoria']);
  const idxDataProm = colIndex(['data promemoria', 'scadenza promemoria']);
  const idxKmProm = colIndex(['km promemoria']);

  const vehiclesMap = new Map<string, Veicolo>();
  const recordsList: InterventoRecord[] = [];
  const officineList: AnagraficaOfficina[] = [];
  const catalogMap = new Map<string, CategoriaManutenzione>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const val = (idx: number) => (idx >= 0 && idx < row.length ? row[idx].trim() : '');
    const tipoRecord = idxTipoRecord >= 0 ? val(idxTipoRecord).toUpperCase() : '';
    const targa = (idxTarga >= 0 ? val(idxTarga) : '').toUpperCase();

    // Riconoscimento riga OFFICINA
    if (tipoRecord === 'OFFICINA') {
      const offNome = val(idxModello) || val(idxOffVeicolo) || val(idxOffInt);
      const offTipo = (val(idxMarca) || 'Meccanico') as any;
      const offTel = val(idxTelOfficina) || val(idxCellulare);
      const offRef = val(idxProprietario);
      const offCitta = val(idxResidenza);
      const offNote = val(idxNote);

      if (offNome && offNome.length >= 2) {
        officineList.push({
          id: `off-${Date.now()}-${officineList.length}`,
          nome: offNome,
          tipo: offTipo,
          telefono: offTel || '',
          referente: offRef || '',
          indirizzo: offNote || '',
          citta: offCitta || '',
          note: '',
        });
      }
      continue;
    }

    // Riconoscimento riga CATALOGO LAVORAZIONI
    if (tipoRecord === 'CATALOGO') {
      const catNome = val(idxMarca) || val(2);
      const subNome = val(idxModello) || val(3);
      const iconaVal = val(6) || 'Wrench';
      const lavNome = val(idxProprietario) || val(7);
      const lavColore = val(26);
      if (catNome && subNome && lavNome) {
        let cat = catalogMap.get(catNome.toLowerCase());
        if (!cat) {
          const catId = `cat-${Date.now()}-${catalogMap.size}`;
          cat = {
            id: catId,
            nome: catNome,
            numero: catalogMap.size + 1,
            iconName: iconaVal || 'Wrench',
            sottocategorie: [],
          };
          catalogMap.set(catNome.toLowerCase(), cat);
        }
        const currentCat = cat;
        let sub = currentCat.sottocategorie.find((s) => s.nome.toLowerCase() === subNome.toLowerCase());
        if (!sub) {
          const subId = `sub-${Date.now()}-${currentCat.sottocategorie.length}`;
          sub = {
            id: subId,
            nome: subNome,
            categoriaId: currentCat.id,
            lavorazioni: [],
          };
          currentCat.sottocategorie.push(sub);
        }
        const currentSub = sub;
        if (!currentSub.lavorazioni.some((l) => l.nome.toLowerCase() === lavNome.toLowerCase())) {
          currentSub.lavorazioni.push({
            id: `lav-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            nome: lavNome,
            categoriaId: currentCat.id,
            sottocategoriaId: currentSub.id,
            iconName: iconaVal || 'Wrench',
            coloreIcona: lavColore || undefined,
          });
        }
      }
      continue;
    }

    if (!targa && !val(idxTitoloInt)) continue;

    const effectiveTarga = targa || 'SENZA_TARGA';

    // Crea o recupera veicolo
    if (!vehiclesMap.has(effectiveTarga)) {
      const vId = `v-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const v: Veicolo = {
        id: vId,
        targa: effectiveTarga,
        marca: idxMarca >= 0 && val(idxMarca) ? val(idxMarca) : 'Generico',
        modello: idxModello >= 0 ? val(idxModello) : '',
        cilindrata: idxCilindrata >= 0 ? val(idxCilindrata) : '',
        alimentazione: (idxAlimentazione >= 0 && val(idxAlimentazione) ? val(idxAlimentazione) : 'DIESEL') as any,
        annoAcquisto: idxAnnoAcquisto >= 0 ? val(idxAnnoAcquisto) : '',
        proprietario: idxProprietario >= 0 ? val(idxProprietario) : '',
        cellulare: idxCellulare >= 0 ? val(idxCellulare) : '',
        residenteIn: idxResidenza >= 0 ? val(idxResidenza) : '',
        viaCorsoPiazza: '',
        natoIlA: '',
        scadenzaBollo: idxScadBollo >= 0 ? val(idxScadBollo) : '',
        importoBollo: idxImpBollo >= 0 ? parseFloat(val(idxImpBollo).replace(',', '.')) || 0 : 0,
        scadenzaRevisione: idxScadRevisione >= 0 ? val(idxScadRevisione) : '',
        scadenzaAssicurazione: idxScadAssicurazione >= 0 ? val(idxScadAssicurazione) : '',
        importoAssicurazione: idxImpAssicurazione >= 0 ? parseFloat(val(idxImpAssicurazione).replace(',', '.')) || 0 : 0,
        compagniaAssicurazione: idxCompagnia >= 0 ? val(idxCompagnia) : '',
        kmAttuali: idxKmAttuali >= 0 ? parseInt(val(idxKmAttuali), 10) || 0 : 0,
        dimensioniGomme: idxDimGomme >= 0 ? val(idxDimGomme) : '',
        pressioneAnteriore: idxPressAnt >= 0 ? val(idxPressAnt) : '',
        pressionePosteriore: idxPressPost >= 0 ? val(idxPressPost) : '',
        officina: idxOffVeicolo >= 0 ? val(idxOffVeicolo) : '',
        rifOfficina: '',
        telefonoOfficina: idxTelOfficina >= 0 ? val(idxTelOfficina) : '',
        note: tipoRecord === 'VEICOLO' && idxNote >= 0 ? val(idxNote) : '',
      };
      vehiclesMap.set(effectiveTarga, v);
    } else if (tipoRecord === 'VEICOLO') {
      const existing = vehiclesMap.get(effectiveTarga)!;
      if (idxMarca >= 0 && val(idxMarca)) existing.marca = val(idxMarca);
      if (idxModello >= 0 && val(idxModello)) existing.modello = val(idxModello);
      if (idxCilindrata >= 0 && val(idxCilindrata)) existing.cilindrata = val(idxCilindrata);
      if (idxAlimentazione >= 0 && val(idxAlimentazione)) existing.alimentazione = val(idxAlimentazione) as any;
      if (idxAnnoAcquisto >= 0 && val(idxAnnoAcquisto)) existing.annoAcquisto = val(idxAnnoAcquisto);
      if (idxProprietario >= 0 && val(idxProprietario)) existing.proprietario = val(idxProprietario);
      if (idxScadBollo >= 0 && val(idxScadBollo)) existing.scadenzaBollo = val(idxScadBollo);
      if (idxScadRevisione >= 0 && val(idxScadRevisione)) existing.scadenzaRevisione = val(idxScadRevisione);
      if (idxScadAssicurazione >= 0 && val(idxScadAssicurazione)) existing.scadenzaAssicurazione = val(idxScadAssicurazione);
    }

    const currentV = vehiclesMap.get(effectiveTarga)!;

    const intData = idxDataInt >= 0 ? val(idxDataInt) : '';
    const intTitolo = idxTitoloInt >= 0 ? val(idxTitoloInt) : '';
    if (tipoRecord === 'INTERVENTO' || (!tipoRecord && (intData || intTitolo))) {
      const lavsRaw = idxLavInt >= 0 ? val(idxLavInt) : '';
      const lavList = lavsRaw
        ? lavsRaw.split('|').map((s) => ({
            lavorazioneId: `lav-${Math.random().toString(36).substr(2, 6)}`,
            nome: s.trim(),
            categoria: 'Manutenzione',
            sottocategoria: 'Generale',
          }))
        : [];

      const r: InterventoRecord = {
        id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        veicoloId: currentV.id,
        data: intData || new Date().toISOString().split('T')[0],
        km: (idxKmInt >= 0 ? parseInt(val(idxKmInt), 10) : idxKmAttuali >= 0 ? parseInt(val(idxKmAttuali), 10) : 0) || 0,
        tipo: (idxTipologiaInt >= 0 && val(idxTipologiaInt) ? val(idxTipologiaInt) : 'manutenzione') as any,
        titolo: intTitolo || 'INTERVENTO MANUTENZIONE',
        costo: idxCostoInt >= 0 ? parseFloat(val(idxCostoInt).replace(',', '.')) || 0 : 0,
        officina: idxOffInt >= 0 ? val(idxOffInt) : '',
        lavorazioniSelezionate: lavList,
        note: idxNote >= 0 ? val(idxNote) : '',
        haPromemoria: idxPromemoria >= 0 ? val(idxPromemoria).toUpperCase() === 'SI' : false,
        dataPromemoria: idxDataProm >= 0 ? val(idxDataProm) : undefined,
        kmPromemoria: idxKmProm >= 0 && val(idxKmProm) ? parseInt(val(idxKmProm), 10) : undefined,
        createdAt: new Date().toISOString(),
      };
      recordsList.push(r);
    }
  }

  const catalogList = Array.from(catalogMap.values());

  return {
    veicoli: Array.from(vehiclesMap.values()),
    records: recordsList,
    officine: officineList,
    catalogo: catalogList.length > 0 ? catalogList : undefined,
  };
};

export const exportRecordsToCsv = (veicolo: Veicolo | undefined, record: InterventoRecord[]): string => {
  const header = ['ID', 'Data', 'KM', 'Tipo', 'Titolo', 'Costo (€)', 'Officina', 'Lavorazioni', 'Note'].join(';');
  const rows = record.map(r => {
    const lavs = r.lavorazioniSelezionate.map(l => l.nome).join(' | ');
    const note = (r.note || '').replace(/"/g, '""');
    return [
      r.id,
      r.data,
      r.km,
      r.tipo,
      `"${r.titolo.replace(/"/g, '""')}"`,
      r.costo.toFixed(2),
      `"${(r.officina || '').replace(/"/g, '""')}"`,
      `"${lavs}"`,
      `"${note}"`,
    ].join(';');
  });
  return [header, ...rows].join('\r\n');
};

// Esportazione CSV multi-veicolo (seleziona più veicoli o tutto il parco macchine)
export const exportMultiVehicleRecordsToCsv = (
  veicoliList: Veicolo[],
  records: InterventoRecord[]
): string => {
  const vehicleMap = new Map<string, Veicolo>();
  veicoliList.forEach((v) => vehicleMap.set(v.id, v));

  const header = [
    'Targa',
    'Marca',
    'Modello',
    'Data Intervento',
    'KM',
    'Tipologia',
    'Titolo Intervento',
    'Costo (€)',
    'Officina / Specialista',
    'Lavorazioni Eseguite',
    'Note',
    'Promemoria Attivo',
    'Data Scadenza Promemoria',
    'KM Promemoria',
  ].join(';');

  const rows = records.map((r) => {
    const v = vehicleMap.get(r.veicoloId);
    const targa = v ? v.targa : 'N/D';
    const marca = v ? v.marca : 'N/D';
    const modello = v ? v.modello : 'N/D';
    const lavs = (r.lavorazioniSelezionate || []).map((l) => l.nome).join(' | ');
    const note = (r.note || '').replace(/"/g, '""');
    const titolo = (r.titolo || '').replace(/"/g, '""');
    const officina = (r.officina || '').replace(/"/g, '""');
    const promemoria = r.haPromemoria ? 'SI' : 'NO';
    const dataPromemoria = r.dataPromemoria || '';
    const kmPromemoria = r.kmPromemoria ? r.kmPromemoria.toString() : '';

    return [
      `"${targa}"`,
      `"${marca}"`,
      `"${modello}"`,
      r.data,
      r.km,
      r.tipo,
      `"${titolo}"`,
      (r.costo || 0).toFixed(2),
      `"${officina}"`,
      `"${lavs}"`,
      `"${note}"`,
      promemoria,
      dataPromemoria,
      kmPromemoria,
    ].join(';');
  });

  return [header, ...rows].join('\r\n');
};

// Esportazione JSON per selezione di veicoli (multi-veicolo o singolo o intero parco)
export const exportSelectedVehiclesJson = (
  veicoliSelezionati: Veicolo[],
  allRecords: InterventoRecord[],
  catalogo: CategoriaManutenzione[]
): string => {
  const selectedVehicleIds = new Set(veicoliSelezionati.map((v) => v.id));
  const filteredRecords = allRecords.filter((r) => selectedVehicleIds.has(r.veicoloId));
  const backup: AppDataBackup = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    veicoli: veicoliSelezionati,
    record: filteredRecords,
    catalogoPersonalizzato: catalogo,
  };
  return JSON.stringify(backup, null, 2);
};

export const downloadCsvFile = (csvContent: string, filename: string) => {
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.startsWith('DriverCheck_') ? filename : `DriverCheck_${filename}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val);
};

export const formatKm = (km: number): string => {
  return new Intl.NumberFormat('it-IT').format(km) + ' km';
};

export const formatDateIt = (dateStr?: string): string => {
  if (!dateStr) return '--/--/----';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

export const formatDateTimeIt = (isoString?: string): string => {
  if (!isoString) return 'N/D';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} alle ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
};

export const getDaysUntil = (dateStr: string): number => {
  if (!dateStr) return 999;
  const target = new Date(dateStr).getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  const diffTime = target - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const generateDeadlineMessage = (
  veicolo: Veicolo,
  scadenzaTipo: 'Bollo' | 'Revisione' | 'Assicurazione' | 'Scadenze',
  dataScadenza: string,
  importo?: number
): string => {
  const nome = veicolo.proprietario ? `Gentile ${veicolo.proprietario}` : 'Gentile cliente';
  const importoStr = importo && importo > 0 ? ` per un importo stimato di ${formatCurrency(importo)}` : '';
  const ggRimasti = getDaysUntil(dataScadenza);
  const tempoMsg = ggRimasti > 0 ? `(tra ${ggRimasti} giorni)` : '(SCADUTO)';

  return (
    `🔔 *PROMEMORIA SCADENZA VEICOLO - DriverCheck*\n\n` +
    `${nome},\n` +
    `ti ricordiamo che la scadenza *${scadenzaTipo.toUpperCase()}* per la tua vettura:\n` +
    `🚗 *${veicolo.marca} ${veicolo.modello}* (Targa: *${veicolo.targa}*)\n` +
    `è fissata per il: *${formatDateIt(dataScadenza)}* ${tempoMsg}${importoStr}.\n\n` +
    `Ti invitiamo a provvedere al rinnovo entro i termini di legge per evitare sanzioni.`
  );
};

export const createGoogleCalendarUrl = (options: {
  title: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  recurrence?: string; // e.g. 'RRULE:FREQ=YEARLY'
}): string => {
  const cleanStart = options.startDate.replace(/-/g, '');
  let endFormatted = cleanStart;
  try {
    const d = new Date(options.startDate);
    d.setDate(d.getDate() + 1);
    endFormatted = d.toISOString().slice(0, 10).replace(/-/g, '');
  } catch {}

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: options.title,
    dates: `${cleanStart}/${endFormatted}`,
    details: options.description,
    location: 'Calendario Manutenzione Auto',
  });

  if (options.recurrence) {
    params.set('recur', options.recurrence);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

export const openGoogleCalendarEvent = (options: {
  title: string;
  description: string;
  startDate: string;
  recurrence?: string;
}) => {
  if (!options.startDate) return;
  const url = createGoogleCalendarUrl(options);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const downloadIcsFile = (options: {
  title: string;
  description: string;
  startDate: string;
  rrule?: string;
}) => {
  const cleanDate = options.startDate.replace(/-/g, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DriveCheck//Manutenzione Auto//IT',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Manutenzione Auto',
    'X-WR-CALDESC:Scadenze veicoli e manutenzioni DriveCheck',
    'BEGIN:VEVENT',
    `SUMMARY:${options.title}`,
    `DESCRIPTION:${options.description}`,
    `DTSTART;VALUE=DATE:${cleanDate}`,
    `DTEND;VALUE=DATE:${cleanDate}`,
    options.rrule ? `RRULE:${options.rrule}` : '',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-P30D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Promemoria Scadenza (30 giorni prima)',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-P7D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Promemoria Scadenza Imminente (7 giorni prima)',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DriverCheck_${cleanDate}_${getDriverCheckTimestamp()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export interface FutureDeadlineItem {
  ciclo: number;
  dataScadenza: string;
  pagabileEntro?: string;
  etichetta: string;
}

// Calcola la catena di scadenze future consecutive
export const computeFutureDeadlinesSeries = (
  baseDate: string,
  tipo: 'Bollo' | 'Revisione' | 'Assicurazione',
  frequenza: string = 'Annuale',
  count: number = 4
): FutureDeadlineItem[] => {
  if (!baseDate) return [];
  const results: FutureDeadlineItem[] = [];
  let currentDate = baseDate;

  for (let i = 1; i <= count; i++) {
    const nextDate = computeNextDeadlineDate(currentDate, frequenza);
    if (!nextDate) break;

    let pagEntro: string | undefined;
    if (tipo === 'Bollo') {
      pagEntro = computeBolloPagabileEntro(nextDate);
    }

    let etichetta = `Scadenza ${i}° ciclo futuro`;
    if (tipo === 'Bollo') {
      etichetta = `Bollo ${nextDate.slice(0, 4)}`;
    } else if (tipo === 'Revisione') {
      etichetta = `Revisione ${nextDate.slice(0, 4)}`;
    } else if (tipo === 'Assicurazione') {
      etichetta = `Rata ${frequenza} (${formatDateIt(nextDate)})`;
    }

    results.push({
      ciclo: i,
      dataScadenza: nextDate,
      pagabileEntro: pagEntro,
      etichetta,
    });

    currentDate = nextDate;
  }

  return results;
};

// Genera e scarica il file completo .ics per creare/popolare il calendario "Manutenzione Auto" su Google Calendar
export const downloadFleetCalendarIcs = (veicoli: Veicolo[], includeFutureCycles: boolean = true) => {
  const events: string[] = [];

  veicoli.forEach((v) => {
    // 1. Bollo
    if (v.scadenzaBollo) {
      const cleanBollo = v.scadenzaBollo.replace(/-/g, '');
      const pagEntro = v.pagabileEntroBollo || computeBolloPagabileEntro(v.scadenzaBollo);
      events.push(
        'BEGIN:VEVENT',
        `UID:bollo-${v.id}-${cleanBollo}@drivecheck.app`,
        `SUMMARY:🚗 [${v.targa}] Scadenza Bollo Auto (${v.marca} ${v.modello})`,
        `DESCRIPTION:Veicolo: ${v.marca} ${v.modello} (${v.targa})\\nProprietario: ${v.proprietario || 'N/D'}\\nScadenza Bollo: ${formatDateIt(v.scadenzaBollo)}\\n${pagEntro ? 'Pagabile entro: ' + pagEntro + '\\n' : ''}Importo: ${v.importoBollo ? v.importoBollo + ' €' : 'N/D'}`,
        `DTSTART;VALUE=DATE:${cleanBollo}`,
        `DTEND;VALUE=DATE:${cleanBollo}`,
        'RRULE:FREQ=YEARLY',
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-P30D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Promemoria Scadenza Bollo (30 giorni prima)',
        'END:VALARM',
        'BEGIN:VALARM',
        'TRIGGER:-P7D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Promemoria Scadenza Bollo (7 giorni prima)',
        'END:VALARM',
        'BEGIN:VALARM',
        'TRIGGER:-P1D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Sveglia Scadenza Bollo (1 giorno prima)',
        'END:VALARM',
        'END:VEVENT'
      );
    }

    // 2. Revisione
    if (v.scadenzaRevisione) {
      const cleanRev = v.scadenzaRevisione.replace(/-/g, '');
      events.push(
        'BEGIN:VEVENT',
        `UID:revisione-${v.id}-${cleanRev}@drivecheck.app`,
        `SUMMARY:🔧 [${v.targa}] Scadenza Revisione MCTC (${v.marca} ${v.modello})`,
        `DESCRIPTION:Veicolo: ${v.marca} ${v.modello} (${v.targa})\\nProprietario: ${v.proprietario || 'N/D'}\\nScadenza Revisione: ${formatDateIt(v.scadenzaRevisione)}\\nFrequenza: ${v.frequenzaRevisione || 'Biennale'}\\nOfficina/Centro: ${v.officina || 'N/D'}`,
        `DTSTART;VALUE=DATE:${cleanRev}`,
        `DTEND;VALUE=DATE:${cleanRev}`,
        'RRULE:FREQ=YEARLY;INTERVAL=2',
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-P30D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Promemoria Scadenza Revisione (30 giorni prima)',
        'END:VALARM',
        'BEGIN:VALARM',
        'TRIGGER:-P7D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Promemoria Scadenza Revisione (7 giorni prima)',
        'END:VALARM',
        'BEGIN:VALARM',
        'TRIGGER:-P1D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Sveglia Scadenza Revisione (1 giorno prima)',
        'END:VALARM',
        'END:VEVENT'
      );
    }

    // 3. Assicurazione
    if (v.scadenzaAssicurazione) {
      const cleanAssic = v.scadenzaAssicurazione.replace(/-/g, '');
      const isSemestrale = (v.frequenzaAssicurazione || '').toLowerCase().includes('semestral');
      const rrule = isSemestrale ? 'RRULE:FREQ=MONTHLY;INTERVAL=6' : 'RRULE:FREQ=YEARLY';
      events.push(
        'BEGIN:VEVENT',
        `UID:assicurazione-${v.id}-${cleanAssic}@drivecheck.app`,
        `SUMMARY:🛡️ [${v.targa}] Scadenza Assicurazione (${v.marca} ${v.modello})`,
        `DESCRIPTION:Veicolo: ${v.marca} ${v.modello} (${v.targa})\\nCompagnia: ${v.compagniaAssicurazione || 'N/D'}\\nFrequenza: ${v.frequenzaAssicurazione || 'Semestrale'}\\nImporto rata: ${v.importoAssicurazione ? v.importoAssicurazione + ' €' : 'N/D'}`,
        `DTSTART;VALUE=DATE:${cleanAssic}`,
        `DTEND;VALUE=DATE:${cleanAssic}`,
        rrule,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-P30D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Promemoria Scadenza Assicurazione (30 giorni prima)',
        'END:VALARM',
        'BEGIN:VALARM',
        'TRIGGER:-P7D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Promemoria Scadenza Assicurazione (7 giorni prima)',
        'END:VALARM',
        'BEGIN:VALARM',
        'TRIGGER:-P1D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Sveglia Scadenza Assicurazione (1 giorno prima)',
        'END:VALARM',
        'END:VEVENT'
      );
    }
  });

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DriveCheck//Scadenze Auto//IT',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Scadenze Auto',
    'X-WR-CALDESC:Scadenze Auto - Bollo, Revisione e Assicurazione',
    'X-WR-TIMEZONE:Europe/Rome',
    ...events,
    'END:VCALENDAR',
  ];

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DriverCheck_Scadenze_${getDriverCheckTimestamp()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportCatalogJson = (catalog: CategoriaManutenzione[]): string => {
  return JSON.stringify(catalog, null, 2);
};

export const downloadCatalogJsonFile = (jsonString: string, customFilename?: string) => {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = customFilename || `DriverCheck_Lavorazioni_${getDriverCheckTimestamp()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadCatalogCsvFile = (csvContent: string, customFilename?: string) => {
  downloadCsvFile(csvContent, customFilename || `DriverCheck_Lavorazioni_${getDriverCheckTimestamp()}.csv`);
};

export const exportCatalogToCsv = (catalogo: CategoriaManutenzione[]): string => {
  const headers = [
    'Numero Categoria',
    'Nome Categoria',
    'Icona Categoria',
    'Nome Sottocategoria',
    'Nome Lavorazione',
    'Icona Lavorazione',
    'Colore Icona',
  ].join(';');

  const rows: string[] = [];
  catalogo.forEach((cat) => {
    cat.sottocategorie.forEach((sub) => {
      sub.lavorazioni.forEach((lav) => {
        rows.push(
          [
            cat.numero,
            `"${(cat.nome || '').replace(/"/g, '""')}"`,
            cat.iconName || 'Wrench',
            `"${(sub.nome || '').replace(/"/g, '""')}"`,
            `"${(lav.nome || '').replace(/"/g, '""')}"`,
            lav.iconName || 'Wrench',
            lav.coloreIcona || '#f59e0b',
          ].join(';')
        );
      });
    });
  });

  return [headers, ...rows].join('\r\n');
};

export const importCatalogFromCsv = (csvText: string): CategoriaManutenzione[] => {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return [];

  const catMap = new Map<string, CategoriaManutenzione>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 5) continue;
    const numCat = parseInt(row[0], 10) || 1;
    const nomeCat = row[1]?.trim();
    const iconCat = row[2]?.trim() || 'Wrench';
    const nomeSub = row[3]?.trim();
    const nomeLav = row[4]?.trim()?.toUpperCase();
    const iconLav = row[5]?.trim() || 'Wrench';
    const colLav = row[6]?.trim() || '#f59e0b';

    if (!nomeCat || !nomeSub || !nomeLav) continue;

    if (!catMap.has(nomeCat)) {
      const catId = `cat-${catMap.size + 1}`;
      catMap.set(nomeCat, {
        id: catId,
        numero: numCat || catMap.size + 1,
        nome: nomeCat,
        iconName: iconCat,
        sottocategorie: [],
      });
    }

    const cat = catMap.get(nomeCat)!;
    let sub = cat.sottocategorie.find((s) => s.nome.toLowerCase() === nomeSub.toLowerCase());
    if (!sub) {
      sub = {
        id: `sub-${cat.id}-${cat.sottocategorie.length + 1}`,
        categoriaId: cat.id,
        nome: nomeSub,
        lavorazioni: [],
      };
      cat.sottocategorie.push(sub);
    }

    sub.lavorazioni.push({
      id: `lav-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      nome: nomeLav,
      categoriaId: cat.id,
      sottocategoriaId: sub.id,
      iconName: iconLav,
      coloreIcona: colLav,
    });
  }

  return Array.from(catMap.values());
};

// Calcolo automatico prossima scadenza in base a frequenza
export const computeNextDeadlineDate = (
  baseDate: string,
  frequenza: string = 'Annuale'
): string => {
  if (!baseDate) return '';
  let isoDate = baseDate;
  if (baseDate.includes('/')) {
    const parts = baseDate.split('/');
    if (parts.length === 3) {
      isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '';

  const freqLower = frequenza.toLowerCase();

  if (freqLower.includes('semestral') || freqLower.includes('6')) {
    d.setMonth(d.getMonth() + 6);
  } else if (freqLower.includes('trimestral') || freqLower.includes('3')) {
    d.setMonth(d.getMonth() + 3);
  } else if (freqLower.includes('mensil') || freqLower.includes('1 mese')) {
    d.setMonth(d.getMonth() + 1);
  } else if (freqLower.includes('normale') || freqLower.includes('2 anni') || freqLower.includes('biennal')) {
    d.setFullYear(d.getFullYear() + 2);
  } else if (freqLower.includes('nuova') || freqLower.includes('4 anni')) {
    d.setFullYear(d.getFullYear() + 4);
  } else {
    // Default 1 anno
    d.setFullYear(d.getFullYear() + 1);
  }
  return d.toISOString().slice(0, 10);
};

// Calcolo "Pagabile entro" per il Bollo (legge il mese della scadenza ed inserisce il mese successivo, es. 30/04/2026 -> Tutto Maggio 2026)
export const computeBolloPagabileEntro = (scadenzaStr: string): string => {
  if (!scadenzaStr || typeof scadenzaStr !== 'string') return '';
  const trimmed = scadenzaStr.trim();
  if (!trimmed) return '';

  let year = new Date().getFullYear();
  let month = -1;

  // Normalizza trattini e punti in slash
  const clean = trimmed.replace(/-/g, '/').replace(/\./g, '/');
  const parts = clean.split('/').map((p) => parseInt(p, 10)).filter((n) => !isNaN(n));

  if (parts.length === 3) {
    if (parts[0] > 1000) {
      // Formato YYYY/MM/DD (es. 2026/04/30)
      year = parts[0];
      month = parts[1] - 1;
    } else {
      // Formato DD/MM/YYYY (es. 30/04/2026)
      month = parts[1] - 1;
      year = parts[2];
    }
  } else if (parts.length === 2) {
    if (parts[1] > 1000) {
      // MM/YYYY (es. 04/2026)
      month = parts[0] - 1;
      year = parts[1];
    } else if (parts[0] > 1000) {
      // YYYY/MM (es. 2026/04)
      year = parts[0];
      month = parts[1] - 1;
    }
  }

  // Fallback con Date parser
  if (month < 0 || month > 11) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      month = d.getMonth();
      year = d.getFullYear();
    } else {
      return '';
    }
  }

  // Calcola il mese successivo per il pagamento
  let nextMonthIndex = month + 1;
  let nextYear = year;
  if (nextMonthIndex > 11) {
    nextMonthIndex = 0;
    nextYear += 1;
  }

  const mesiItaliani = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  return `Tutto ${mesiItaliani[nextMonthIndex]} ${nextYear}`;
};

export interface EffectiveUpcomingDeadlineResult {
  dataScadenza: string; // Punto 1: Data Scadenza Originale (letta da Punto 3 della precedente quietanza se saldata!)
  prossimaScadenza: string; // Punto 3: Nuova Scadenza Futura (+1 anno / +2 anni / frequenza)
  pagabileEntro?: string;
  importo: number;
  enteOCompagnia: string;
  numeroPolizza?: string;
  frequenza: string;
  isFromPreviousPaymentPoint3: boolean; // Indica che è stata letta dal Punto 3 della quietanza precedente
  previousPaidRecord?: InterventoRecord;
  existingPendingRecord?: InterventoRecord;
}

// Determina in modo intelligente la prossima scadenza effettiva per il veicolo:
// Legge il Punto 3 (prossimaScadenza) della quietanza precedentemente saldata e lo inserisce al Punto 1
export const getEffectiveUpcomingDeadline = (
  veicolo: Veicolo | undefined,
  tipo: TipoPagamentoScadenza,
  allRecords: InterventoRecord[]
): EffectiveUpcomingDeadlineResult => {
  const today = new Date().toISOString().slice(0, 10);
  if (!veicolo) {
    return {
      dataScadenza: today,
      prossimaScadenza: computeNextDeadlineDate(today, 'Annuale'),
      importo: 0,
      enteOCompagnia: '',
      frequenza: 'Annuale',
      isFromPreviousPaymentPoint3: false,
    };
  }

  // 1. Cerca tutte le quietanze già saldate nello storico per questo tipo e veicolo (ordinate dalla più recente)
  const paidRecords = (allRecords || [])
    .filter(
      (r) =>
        r.veicoloId === veicolo.id &&
        (r.tipo === 'Pagamento Scadenza' || !!r.registroPagamento) &&
        r.registroPagamento?.tipoPagamento === tipo &&
        r.registroPagamento?.pagato !== false
    )
    .sort((a, b) => {
      const dateA = a.registroPagamento?.dataScadenza || a.data || '';
      const dateB = b.registroPagamento?.dataScadenza || b.data || '';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

  const latestPaid = paidRecords[0];

  // 2. Cerca se esiste una scheda già in attesa (non pagata)
  const existingPending = (allRecords || []).find(
    (r) =>
      r.veicoloId === veicolo.id &&
      (r.tipo === 'Pagamento Scadenza' || !!r.registroPagamento) &&
      r.registroPagamento?.tipoPagamento === tipo &&
      r.registroPagamento?.pagato === false
  );

  // 3. Valori predefiniti in base al tipo di pagamento
  let defaultFreq = 'Annuale';
  let defaultCost = 0;
  let defaultEnte = '';
  let defaultPolizza = '';
  let vehicleScad = '';

  if (tipo === 'Bollo') {
    defaultFreq = 'Annuale';
    defaultCost = veicolo.importoBollo || 0;
    defaultEnte = 'ACI / Regione';
    vehicleScad = veicolo.scadenzaBollo || '';
  } else if (tipo === 'Revisione') {
    defaultFreq = veicolo.frequenzaRevisione || 'Auto Biennale';
    defaultCost = 79.02;
    defaultEnte = 'Centro Revisioni Autorizzato MCTC';
    vehicleScad = veicolo.scadenzaRevisione || '';
  } else if (tipo === 'Assicurazione') {
    defaultFreq = veicolo.frequenzaAssicurazione || 'Annuale';
    defaultCost = veicolo.importoAssicurazione || 0;
    defaultEnte = veicolo.compagniaAssicurazione || 'Allianz';
    vehicleScad = veicolo.scadenzaAssicurazione || '';
  }

  const effectiveFreq =
    existingPending?.registroPagamento?.frequenza ||
    latestPaid?.registroPagamento?.frequenza ||
    defaultFreq;

  const effectiveCost =
    existingPending?.costo !== undefined && existingPending.costo > 0
      ? existingPending.costo
      : latestPaid?.costo !== undefined && latestPaid.costo > 0
      ? latestPaid.costo
      : defaultCost;

  const effectiveEnte =
    existingPending?.registroPagamento?.enteOCompagnia ||
    latestPaid?.registroPagamento?.enteOCompagnia ||
    defaultEnte;

  const effectivePolizza =
    existingPending?.registroPagamento?.numeroPolizza ||
    latestPaid?.registroPagamento?.numeroPolizza ||
    defaultPolizza;

  // 4. REGOLA:
  // "LA SCADENZA FUTURA DEVE LEGGERE QUELLA PRECEDENTE PUNTO.3 ED INSERIRLA AL PUNTO 1"
  let dataScadenzaFinale = '';
  let isFromPrevious = false;

  const latestPaidDate = latestPaid ? (latestPaid.registroPagamento?.dataScadenza || latestPaid.data) : '';
  const latestPaidPunto3 = latestPaid?.registroPagamento?.prossimaScadenza || (latestPaidDate ? computeNextDeadlineDate(latestPaidDate, effectiveFreq) : '');

  const pendingDate = existingPending ? (existingPending.registroPagamento?.dataScadenza || existingPending.data) : '';

  if (latestPaid && latestPaidPunto3) {
    // Esiste un pagamento saldato precedente nello storico.
    if (pendingDate && pendingDate > latestPaidDate) {
      // Se la scheda in attesa ha già una data successiva a quella saldata -> è la prossima valida
      dataScadenzaFinale = pendingDate;
    } else {
      // Altrimenti legge il Punto 3 della quietanza precedente e lo inserisce al Punto 1!
      dataScadenzaFinale = latestPaidPunto3;
      isFromPrevious = true;
    }
  } else {
    // Nessun pagamento saldato nello storico
    if (pendingDate) {
      dataScadenzaFinale = pendingDate;
    } else if (vehicleScad) {
      dataScadenzaFinale = vehicleScad;
    } else {
      dataScadenzaFinale = today;
    }
  }

  // 5. Calcolo Punto 3 (Nuova Scadenza Futura) a partire dal nuovo Punto 1
  const prossimaScadenzaFinale =
    existingPending?.registroPagamento?.prossimaScadenza && !isFromPrevious
      ? existingPending.registroPagamento.prossimaScadenza
      : computeNextDeadlineDate(dataScadenzaFinale, effectiveFreq);

  const pagabileEntroFinale =
    tipo === 'Bollo'
      ? computeBolloPagabileEntro(dataScadenzaFinale)
      : undefined;

  return {
    dataScadenza: dataScadenzaFinale,
    prossimaScadenza: prossimaScadenzaFinale,
    pagabileEntro: pagabileEntroFinale,
    importo: effectiveCost,
    enteOCompagnia: effectiveEnte,
    numeroPolizza: effectivePolizza || undefined,
    frequenza: effectiveFreq,
    isFromPreviousPaymentPoint3: isFromPrevious,
    previousPaidRecord: latestPaid,
    existingPendingRecord: existingPending,
  };
};

// Genera e scarica il calendario dedicato "Revisioni Auto" (.ics) per Google Calendar con ricorrenza ogni anno
export const downloadRevisioniCalendarIcs = (veicoli: Veicolo[]) => {
  const events: string[] = [];

  veicoli.forEach((v) => {
    if (v.scadenzaRevisione) {
      let dataIso = v.scadenzaRevisione.trim();
      if (dataIso.includes('/')) {
        const parts = dataIso.split('/');
        if (parts.length === 3) {
          dataIso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      const cleanStart = dataIso.replace(/-/g, '');

      events.push(
        'BEGIN:VEVENT',
        `UID:rev-${v.id}-${cleanStart}@drivercheck.app`,
        `SUMMARY:🔧 [${v.targa}] Revisione Auto MCTC (${v.marca} ${v.modello})`,
        `DESCRIPTION:Revisione Ministeriale MCTC obbligatoria per:\\nVeicolo: ${v.marca} ${v.modello} (${v.targa})\\nProprietario: ${v.proprietario || 'N/D'}\\nScadenza: ${formatDateIt(dataIso)}\\nCentro Revisioni: ${v.officina || 'Centro MCTC Autorizzato'}\\nRicorrenza: Ogni anno (Annuale)`,
        `DTSTART;VALUE=DATE:${cleanStart}`,
        `DTEND;VALUE=DATE:${cleanStart}`,
        'RRULE:FREQ=YEARLY',
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-P30D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Promemoria Revisione Auto: mancano 30 giorni',
        'END:VALARM',
        'BEGIN:VALARM',
        'TRIGGER:-P7D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Promemoria Revisione Auto: mancano 7 giorni',
        'END:VALARM',
        'END:VEVENT'
      );
    }
  });

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DriverCheck//Revisioni Auto//IT',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Revisioni Auto',
    'X-WR-CALDESC:Calendario Revisioni Ministeriali MCTC dei Veicoli (Ricorrenza Annuale)',
    'X-WR-TIMEZONE:Europe/Rome',
    ...events,
    'END:VCALENDAR',
  ];

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DriverCheck_Revisioni_${getDriverCheckTimestamp()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Genera e scarica il calendario dedicato "Assicurazione Auto" (.ics) per Google Calendar con ricorrenza ogni anno
export const downloadAssicurazioniCalendarIcs = (veicoli: Veicolo[]) => {
  const events: string[] = [];

  veicoli.forEach((v) => {
    if (v.scadenzaAssicurazione) {
      let dataIso = v.scadenzaAssicurazione.trim();
      if (dataIso.includes('/')) {
        const parts = dataIso.split('/');
        if (parts.length === 3) {
          dataIso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      const cleanStart = dataIso.replace(/-/g, '');

      events.push(
        'BEGIN:VEVENT',
        `UID:assic-${v.id}-${cleanStart}@drivercheck.app`,
        `SUMMARY:🛡️ [${v.targa}] Rinnovo Assicurazione RCA (${v.marca} ${v.modello})`,
        `DESCRIPTION:Rinnovo Polizza Assicurativa RCA per:\\nVeicolo: ${v.marca} ${v.modello} (${v.targa})\\nCompagnia: ${v.compagniaAssicurazione || 'N/D'}\\nScadenza: ${formatDateIt(dataIso)}\\nImporto: ${v.importoAssicurazione ? `${v.importoAssicurazione} €` : 'N/D'}\\nRicorrenza: Ogni anno (Annuale)`,
        `DTSTART;VALUE=DATE:${cleanStart}`,
        `DTEND;VALUE=DATE:${cleanStart}`,
        'RRULE:FREQ=YEARLY',
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-P30D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Promemoria Assicurazione: mancano 30 giorni alla scadenza',
        'END:VALARM',
        'BEGIN:VALARM',
        'TRIGGER:-P7D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Promemoria Assicurazione: mancano 7 giorni alla scadenza',
        'END:VALARM',
        'END:VEVENT'
      );
    }
  });

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DriverCheck//Assicurazione Auto//IT',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Assicurazione Auto',
    'X-WR-CALDESC:Calendario Scadenze Assicurazioni Auto (Ricorrenza Annuale)',
    'X-WR-TIMEZONE:Europe/Rome',
    ...events,
    'END:VCALENDAR',
  ];

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DriverCheck_Assicurazione_${getDriverCheckTimestamp()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Genera e scarica il calendario dedicato "Bollo Auto" (.ics) per Google Calendar con ricorrenza ogni anno
export const downloadBolloCalendarIcs = (veicoli: Veicolo[]) => {
  const events: string[] = [];

  veicoli.forEach((v) => {
    if (v.scadenzaBollo) {
      let dataIso = v.scadenzaBollo.trim();
      if (dataIso.includes('/')) {
        const parts = dataIso.split('/');
        if (parts.length === 3) {
          dataIso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      const cleanStart = dataIso.replace(/-/g, '');

      events.push(
        'BEGIN:VEVENT',
        `UID:bollo-${v.id}-${cleanStart}@drivercheck.app`,
        `SUMMARY:💳 [${v.targa}] Scadenza Bollo Auto (${v.marca} ${v.modello})`,
        `DESCRIPTION:Tassa Automobilistica Bollo per:\\nVeicolo: ${v.marca} ${v.modello} (${v.targa})\\nScadenza: ${formatDateIt(dataIso)}\\nPagabile entro: ${computeBolloPagabileEntro(dataIso)}\\nImporto: ${v.importoBollo ? `${v.importoBollo} €` : 'N/D'}\\nRicorrenza: Ogni anno (Annuale)`,
        `DTSTART;VALUE=DATE:${cleanStart}`,
        `DTEND;VALUE=DATE:${cleanStart}`,
        'RRULE:FREQ=YEARLY',
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-P30D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Promemoria Bollo Auto: mancano 30 giorni',
        'END:VALARM',
        'BEGIN:VALARM',
        'TRIGGER:-P7D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Promemoria Bollo Auto: mancano 7 giorni',
        'END:VALARM',
        'END:VEVENT'
      );
    }
  });

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DriverCheck//Bollo Auto//IT',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Bollo Auto',
    'X-WR-CALDESC:Calendario Scadenze Bollo Auto (Ricorrenza Annuale)',
    'X-WR-TIMEZONE:Europe/Rome',
    ...events,
    'END:VCALENDAR',
  ];

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DriverCheck_Bollo_${getDriverCheckTimestamp()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const openWhatsAppReminder = (
  cellulare: string,
  messaggio: string
) => {
  const cleanPhone = cellulare.replace(/[^0-9]/g, '');
  const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messaggio)}`;
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const openSmsReminder = (
  cellulare: string,
  messaggio: string
) => {
  const cleanPhone = cellulare.replace(/[^0-9]/g, '');
  const url = `sms:${cleanPhone}?body=${encodeURIComponent(messaggio)}`;
  const a = document.createElement('a');
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
