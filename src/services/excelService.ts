import * as XLSX from 'xlsx';
import { Veicolo, InterventoRecord, CategoriaManutenzione, AnagraficaOfficina } from '../types';
import { getDriverCheckTimestamp } from './storageService';

// Nomi colonne conformi al layout Excel mostrato
export const VEHICLE_EXCEL_HEADERS = [
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
  'Compagnia Assicurativa',
  'KM Attuali',
  'Dimensioni Gomme',
  'Pressione Anteriore',
  'Pressione Posteriore',
  'Officina Venditrice',
  'Telefono Officina',
];

export const RECORD_EXCEL_HEADERS = [
  'Tipo Record',
  'Targa',
  'Marca',
  'Modello',
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
];

// Intestazione esatta richiesta per la Sezione Pagamenti & Scadenze
export const PAGAMENTI_EXCEL_HEADERS = [
  'Tipo Record',
  'Targa',
  'Marca',
  'Modello',
  'Data Pagamento',
  'KM',
  'Tipologia Intervento',
  'Titolo di Pagamento',
  'Costo (€)',
  'Compagnia',
  'Tipologia di Pagamento',
  'Note',
  'Promemoria Attivo',
  'Data Promemoria',
  'KM Promemoria',
];

/**
 * Genera il Workbook Excel (.xlsx) multi-foglio nativo SheetJS.
 * Ciascun foglio contiene:
 * 1. Dati anagrafici del veicolo (in alto)
 * 2. Righe di spaziatura
 * 3. Tabella delle Lavorazioni & Manutenzioni
 * 4. Righe di spaziatura
 * 5. Tabella dei Pagamenti con le 15 colonne esatte richieste
 */
export const createFleetExcelWorkbook = (
  veicoli: Veicolo[],
  records: InterventoRecord[],
  officineAnagrafica?: AnagraficaOfficina[],
  catalogo?: CategoriaManutenzione[]
): XLSX.WorkBook => {
  const wb = XLSX.utils.book_new();

  const usedSheetNames = new Set<string>();

  if (veicoli.length > 0) {
    veicoli.forEach((v, index) => {
    // 1. Dati del veicolo
    const vehicleRow: any[] = [
      'VEICOLO',
      v.targa || '',
      v.marca || '',
      v.modello || '',
      v.cilindrata ? String(v.cilindrata) : '',
      v.alimentazione || 'DIESEL',
      v.annoAcquisto || (v as any).anno ? String(v.annoAcquisto || (v as any).anno) : '',
      v.proprietario || '',
      v.cellulare || '',
      v.residenteIn || (v as any).residenza || '',
      v.scadenzaBollo || '',
      v.importoBollo !== undefined ? Number(v.importoBollo).toFixed(2) : '',
      v.scadenzaRevisione || '',
      v.scadenzaAssicurazione || '',
      v.importoAssicurazione !== undefined ? Number(v.importoAssicurazione).toFixed(2) : '',
      v.compagniaAssicurazione || (v as any).compagniaAssicurativa || '',
      v.kmAttuali !== undefined ? Number(v.kmAttuali) : '',
      v.dimensioniGomme || (v as any).gommeDimensioni || '',
      v.pressioneAnteriore || (v as any).gommePressioneAnt || '',
      v.pressionePosteriore || (v as any).gommePressionePost || '',
      v.officina || (v as any).officinaVenditrice || '',
      v.telefonoOfficina || '',
    ];

    // Interventi del veicolo corrente
    const vehicleRecords = records.filter((r) => r.veicoloId === v.id);

    // Separa Lavorazioni da Pagamenti
    const lavorazioniRecords = vehicleRecords.filter(
      (r) => r.tipo !== 'Pagamento Scadenza' && !r.registroPagamento
    );

    const pagamentiRecords = vehicleRecords.filter(
      (r) => r.tipo === 'Pagamento Scadenza' || !!r.registroPagamento
    );

    // Ordina cronologicamente decrescente
    lavorazioniRecords.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    pagamentiRecords.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    // 2. Righe Lavorazioni
    const lavorazioniRows: any[][] = lavorazioniRecords.map((r) => {
      const lavsText = (r.lavorazioniSelezionate || []).map((l) => l.nome).join(' | ');
      return [
        'INTERVENTO',
        v.targa,
        v.marca,
        v.modello,
        r.data || '',
        r.km !== undefined ? Number(r.km) : '',
        r.tipo || 'Manutenzione',
        r.titolo || 'Intervento',
        r.costo !== undefined ? Number(r.costo).toFixed(2) : '0.00',
        r.officina || '',
        lavsText,
        r.note || '',
        r.haPromemoria ? 'SI' : 'NO',
        r.dataPromemoria || '',
        r.kmPromemoria !== undefined ? Number(r.kmPromemoria) : '',
      ];
    });

    // 3. Righe Pagamenti Scadenze (15 colonne esatte richieste dall'utente)
    const pagamentiRows: any[][] = pagamentiRecords.map((r) => {
      const tipoScadenza = r.registroPagamento?.tipoPagamento || 'Bollo';
      const enteOCompagnia = r.registroPagamento?.enteOCompagnia || r.officina || '';
      const tipologiaDiPagamento = r.registroPagamento?.tipoPagamento || (r.lavorazioniSelezionate && r.lavorazioniSelezionate[0]?.nome) || 'Bollo';
      
      const notePag = [
        r.registroPagamento?.dataScadenza ? `Scadenza: ${r.registroPagamento.dataScadenza}` : '',
        r.registroPagamento?.numeroPolizza ? `Polizza: ${r.registroPagamento.numeroPolizza}` : '',
        r.note
      ].filter(Boolean).join(' - ');

      const costoFormatted = r.costo !== undefined
        ? Number(r.costo).toFixed(2)
        : (r.registroPagamento?.importo !== undefined ? Number(r.registroPagamento.importo).toFixed(2) : '0.00');

      return [
        'PAGAMENTO',
        v.targa,
        v.marca,
        v.modello,
        r.data || r.registroPagamento?.dataPagamento || '',
        r.km !== undefined ? Number(r.km) : '',
        'Pagamento Scadenza',
        r.titolo || `Pagamento ${tipoScadenza}`,
        costoFormatted,
        enteOCompagnia,
        tipologiaDiPagamento,
        notePag,
        r.haPromemoria ? 'SI' : 'NO',
        r.dataPromemoria || r.registroPagamento?.prossimaScadenza || r.registroPagamento?.dataScadenza || '',
        r.kmPromemoria !== undefined ? Number(r.kmPromemoria) : '',
      ];
    });

    // Assembla la struttura con righe vuote di spaziatura
    const sheetData: any[][] = [];

    // SEZIONE 1: DATI VEICOLO
    sheetData.push(VEHICLE_EXCEL_HEADERS);
    sheetData.push(vehicleRow);

    // Spaziatura tra dati veicolo e lavorazioni (7 righe vuote)
    for (let s = 0; s < 7; s++) {
      sheetData.push([]);
    }

    // SEZIONE 2: LAVORAZIONI & MANUTENZIONI
    sheetData.push(RECORD_EXCEL_HEADERS);
    if (lavorazioniRows.length > 0) {
      sheetData.push(...lavorazioniRows);
    } else {
      sheetData.push(['NESSUNA LAVORAZIONE REGISTRATA PER QUESTA AUTO']);
    }

    // Spaziatura tra lavorazioni e pagamenti (3 righe vuote)
    for (let s = 0; s < 3; s++) {
      sheetData.push([]);
    }

    // SEZIONE 3: PAGAMENTI & SCADENZE (Nuova Intestazione a 15 Colonne esatte)
    sheetData.push(PAGAMENTI_EXCEL_HEADERS);
    if (pagamentiRows.length > 0) {
      sheetData.push(...pagamentiRows);
    } else {
      sheetData.push(['NESSUN PAGAMENTO REGISTRATO PER QUESTA AUTO']);
    }

    // Crea foglio Excel
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Larghezza colonne ottimizzata
    ws['!cols'] = [
      { wch: 14 }, // A: Tipo Record
      { wch: 12 }, // B: Targa
      { wch: 16 }, // C: Marca
      { wch: 22 }, // D: Modello
      { wch: 14 }, // E: Data Pagamento / Cilindrata
      { wch: 15 }, // F: KM / Alimentazione
      { wch: 20 }, // G: Tipologia Intervento
      { wch: 24 }, // H: Titolo di Pagamento / Proprietario
      { wch: 14 }, // I: Costo (€) / Cellulare
      { wch: 22 }, // J: Compagnia / Residenza
      { wch: 24 }, // K: Tipologia di Pagamento
      { wch: 32 }, // L: Note
      { wch: 18 }, // M: Promemoria Attivo
      { wch: 18 }, // N: Data Promemoria
      { wch: 18 }, // O: KM Promemoria
      { wch: 22 }, // P: Compagnia
      { wch: 14 }, // Q: KM Attuali
      { wch: 16 }, // R: Gomme
      { wch: 14 }, // S: Pressione Ant
      { wch: 14 }, // T: Pressione Post
      { wch: 20 }, // U: Officina Venditrice
      { wch: 18 }, // V: Telefono Officina
    ];

    // Nome del foglio: targa del veicolo (max 31 caratteri consentiti da Excel)
    let sheetName = (v.targa || `Auto_${index + 1}`)
      .replace(/[\\/?*[\]:]/g, '_')
      .trim()
      .substring(0, 31);

    if (!sheetName) sheetName = `Auto_${index + 1}`;
    let counter = 2;
    const baseName = sheetName;
    while (usedSheetNames.has(sheetName.toUpperCase())) {
      sheetName = `${baseName.substring(0, 28)}_${counter}`;
      counter++;
    }
    usedSheetNames.add(sheetName.toUpperCase());

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
  }

  // 4. Foglio dedicato per l'Anagrafica Officine & Specialisti (da Menu Comune e Veicoli Modificati)
  const mapOfficine = new Map<string, {
    tipo: string;
    nome: string;
    telefono: string;
    referente: string;
    indirizzoNote: string;
    autoCollegate: Set<string>;
  }>();

  // Inserisci officine da anagrafica comune
  (officineAnagrafica || []).forEach((o) => {
    if (o.nome?.trim()) {
      const key = o.nome.trim().toLowerCase();
      mapOfficine.set(key, {
        tipo: o.tipo || 'Meccanico',
        nome: o.nome.trim(),
        telefono: o.telefono || '',
        referente: o.referente || '',
        indirizzoNote: [o.indirizzo, o.citta, o.note].filter(Boolean).join(' - '),
        autoCollegate: new Set<string>(),
      });
    }
  });

  // Arricchisci con officine e specialisti collegati a ciascuna auto
  veicoli.forEach((v) => {
    if (v.officina?.trim()) {
      const key = v.officina.trim().toLowerCase();
      const existing = mapOfficine.get(key);
      if (existing) {
        if (!existing.telefono && v.telefonoOfficina) existing.telefono = v.telefonoOfficina;
        if (!existing.referente && v.rifOfficina) existing.referente = v.rifOfficina;
        existing.autoCollegate.add(v.targa);
      } else {
        mapOfficine.set(key, {
          tipo: 'Meccanico',
          nome: v.officina.trim(),
          telefono: v.telefonoOfficina || '',
          referente: v.rifOfficina || '',
          indirizzoNote: 'Dati da scheda veicolo',
          autoCollegate: new Set<string>([v.targa]),
        });
      }
    }
    if (v.specialisti && Array.isArray(v.specialisti)) {
      v.specialisti.forEach((s) => {
        if (s.nome?.trim()) {
          const key = s.nome.trim().toLowerCase();
          const existing = mapOfficine.get(key);
          if (existing) {
            if (!existing.telefono && s.telefono) existing.telefono = s.telefono;
            if (!existing.referente && s.referente) existing.referente = s.referente;
            if (!existing.indirizzoNote && s.indirizzo) existing.indirizzoNote = s.indirizzo;
            existing.autoCollegate.add(v.targa);
          } else {
            mapOfficine.set(key, {
              tipo: s.tipo || 'Specialista',
              nome: s.nome.trim(),
              telefono: s.telefono || '',
              referente: s.referente || '',
              indirizzoNote: s.indirizzo || s.note || '',
              autoCollegate: new Set<string>([v.targa]),
            });
          }
        }
      });
    }
  });

  const officineHeaders = [
    'TIPOLOGIA',
    'NOME OFFICINA / RAGIONE SOCIALE',
    'TELEFONO',
    'REFERENTE',
    'INDIRIZZO / NOTE',
    'AUTO COLLEGATE (TARGHE)',
  ];

  const officineRows: any[][] = [officineHeaders];
  if (mapOfficine.size > 0) {
    Array.from(mapOfficine.values()).forEach((off) => {
      officineRows.push([
        off.tipo,
        off.nome,
        off.telefono,
        off.referente,
        off.indirizzoNote,
        Array.from(off.autoCollegate).join(', ') || 'Menu Comune',
      ]);
    });
  } else {
    officineRows.push(['NESSUNA OFFICINA O SPECIALISTA SALVATO']);
  }

  const wsOfficine = XLSX.utils.aoa_to_sheet(officineRows);
  wsOfficine['!cols'] = [
    { wch: 18 }, // Tipologia
    { wch: 28 }, // Nome
    { wch: 18 }, // Telefono
    { wch: 20 }, // Referente
    { wch: 32 }, // Indirizzo / Note
    { wch: 26 }, // Auto Collegate
  ];
  XLSX.utils.book_append_sheet(wb, wsOfficine, 'Officine_Specialisti');

  // 5. Foglio dedicato per il Catalogo Lavorazioni del Menu Comune
  if (catalogo && catalogo.length > 0) {
    const catalogHeaders = [
      'CATEGORIA',
      'ICONA',
      'SOTTOCATEGORIA',
      'NOME LAVORAZIONE',
      'DESCRIZIONE / NOTE',
      'TAG',
    ];
    const catalogRows: any[][] = [catalogHeaders];
    catalogo.forEach((cat) => {
      if (cat.sottocategorie && Array.isArray(cat.sottocategorie)) {
        cat.sottocategorie.forEach((sub) => {
          if (sub.lavorazioni && Array.isArray(sub.lavorazioni)) {
            sub.lavorazioni.forEach((lav) => {
              catalogRows.push([
                cat.nome || '',
                cat.iconName || 'Wrench',
                sub.nome || '',
                lav.nome || '',
                lav.iconName || cat.iconName || 'Wrench',
                lav.coloreIcona || '',
              ]);
            });
          }
        });
      }
    });

    const wsCatalog = XLSX.utils.aoa_to_sheet(catalogRows);
    wsCatalog['!cols'] = [
      { wch: 24 }, // Categoria
      { wch: 14 }, // Icona
      { wch: 24 }, // Sottocategoria
      { wch: 32 }, // Nome Lavorazione
      { wch: 38 }, // Descrizione / Note
      { wch: 22 }, // Tag
    ];
    XLSX.utils.book_append_sheet(wb, wsCatalog, 'Catalogo_Lavorazioni');
  }

  if (wb.SheetNames.length === 0) {
    const wsEmpty = XLSX.utils.aoa_to_sheet([['Nessun dato selezionato per l\'esportazione']]);
    XLSX.utils.book_append_sheet(wb, wsEmpty, 'Info');
  }

  return wb;
};

/**
 * Esporta il workbook come Uint8Array per invio a Google Drive o API
 */
export const exportFleetToExcelWorkbook = (
  veicoli: Veicolo[],
  records: InterventoRecord[],
  officineAnagrafica?: AnagraficaOfficina[],
  catalogo?: CategoriaManutenzione[]
): Uint8Array => {
  const wb = createFleetExcelWorkbook(veicoli, records, officineAnagrafica, catalogo);
  const u8 = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(u8);
};

/**
 * Scarica sul computer o smartphone il file Excel .xlsx multi-foglio.
 * Usa XLSX.writeFile nativo per garantire la compatibilità al 100% con Microsoft Excel su PC / Windows / Mac.
 */
export const downloadFleetExcelFile = (
  veicoli: Veicolo[],
  records: InterventoRecord[],
  officineAnagrafica?: AnagraficaOfficina[],
  customFilename?: string,
  catalogo?: CategoriaManutenzione[]
): void => {
  const wb = createFleetExcelWorkbook(veicoli, records, officineAnagrafica, catalogo);
  const filename = customFilename || `DriverCheck_Veicoli_${getDriverCheckTimestamp()}.xlsx`;
  XLSX.writeFile(wb, filename, { bookType: 'xlsx' });
};

/**
 * Importa da un file Excel (.xlsx o .xls) sia con struttura multi-foglio (1 foglio per macchina)
 * sia con foglio singolo, riconoscendo automaticamente i veicoli, gli interventi, le officine e il catalogo.
 */
export const importFleetFromExcel = (
  buffer: ArrayBuffer | Uint8Array
): {
  veicoli: Veicolo[];
  records: InterventoRecord[];
  officine?: AnagraficaOfficina[];
  catalogo?: CategoriaManutenzione[];
} => {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const vehiclesMap = new Map<string, Veicolo>();
  const recordsList: InterventoRecord[] = [];
  const officineList: AnagraficaOfficina[] = [];
  const catalogMap = new Map<string, CategoriaManutenzione>();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    // Converti il foglio in matrice 2D di stringhe/valori
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rows.length === 0) continue;

    // Riconoscimento speciale: Foglio Officine e Specialisti
    if (sheetName.toLowerCase().includes('officin') || sheetName.toLowerCase().includes('specialist')) {
      for (let rIdx = 1; rIdx < rows.length; rIdx++) {
        const row = rows[rIdx];
        if (!row || row.length < 2) continue;
        const tipoVal = String(row[0] || '').trim();
        const nomeVal = String(row[1] || '').trim();
        if (!nomeVal || nomeVal.toUpperCase().includes('NESSUNA OFFICINA') || nomeVal.toUpperCase().includes('NOME OFFICINA')) {
          continue;
        }
        const telVal = String(row[2] || '').trim();
        const refVal = String(row[3] || '').trim();
        const indVal = String(row[4] || '').trim();

        officineList.push({
          id: `off-${Date.now()}-${officineList.length}-${Math.random().toString(36).substr(2, 4)}`,
          nome: nomeVal,
          tipo: (tipoVal as any) || 'Meccanico',
          telefono: telVal,
          referente: refVal,
          indirizzo: indVal,
          dataAggiunta: new Date().toISOString(),
        });
      }
      continue;
    }

    // Riconoscimento speciale: Foglio Catalogo Lavorazioni
    if (sheetName.toLowerCase().includes('catalogo') || sheetName.toLowerCase().includes('lavorazion')) {
      for (let rIdx = 1; rIdx < rows.length; rIdx++) {
        const row = rows[rIdx];
        if (!row || row.length < 4) continue;
        const catNome = String(row[0] || '').trim();
        const iconaVal = String(row[1] || 'Wrench').trim();
        const subNome = String(row[2] || '').trim();
        const lavNome = String(row[3] || '').trim();
        const descVal = String(row[4] || '').trim();
        const tagVal = String(row[5] || '').trim();

        if (!catNome || !subNome || !lavNome) continue;

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
            coloreIcona: tagVal || undefined,
          });
        }
      }
      continue;
    }

    let currentVehicleId = '';
    let readingSection: 'vehicle' | 'lavorazioni' | 'pagamenti' | 'none' = 'none';

    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      if (!row || row.length === 0) continue;

      const firstCell = String(row[0] || '').trim().toUpperCase();
      const secondCell = String(row[1] || '').trim().toUpperCase();

      // Riconoscimento intestazione Veicolo
      if (firstCell === 'TIPO RECORD' && secondCell === 'TARGA' && String(row[4] || '').toUpperCase().includes('CILINDRATA')) {
        readingSection = 'vehicle';
        continue;
      }

      // Riconoscimento intestazione Lavorazioni o Pagamenti
      if (firstCell === 'TIPO RECORD' && secondCell === 'TARGA' && (String(row[4] || '').toUpperCase().includes('DATA') || String(row[7] || '').toUpperCase().includes('PAGAMENTO'))) {
        const isPagHeader = String(row[7] || '').toUpperCase().includes('PAGAMENTO') || String(row[10] || '').toUpperCase().includes('PAGAMENTO');
        if (isPagHeader) {
          readingSection = 'pagamenti';
        } else {
          const sampleType = String(rows[rIdx + 1]?.[6] || rows[rIdx + 1]?.[0] || '').toLowerCase();
          if (sampleType.includes('pagament') || sampleType.includes('scadenz')) {
            readingSection = 'pagamenti';
          } else {
            readingSection = 'lavorazioni';
          }
        }
        continue;
      }

      // Riga dati Veicolo
      if (firstCell === 'VEICOLO') {
        const targa = String(row[1] || '').trim().toUpperCase();
        if (targa) {
          const vId = `v-${targa.replace(/[^A-Z0-9]/g, '') || Date.now()}`;
          currentVehicleId = vId;

          const rawAlim = String(row[5] || '').toUpperCase();
          const validAlims = ['DIESEL', 'BENZINA', 'IBRIDA', 'ELETTRICA', 'GPL', 'METANO'];
          const alimentazione = validAlims.includes(rawAlim) ? (rawAlim as any) : 'DIESEL';

          const veicolo: Veicolo = {
            id: vId,
            targa,
            proprietario: String(row[7] || '').trim(),
            natoIlA: '',
            residenteIn: String(row[9] || '').trim(),
            viaCorsoPiazza: '',
            cellulare: String(row[8] || '').trim(),
            marca: String(row[2] || 'Generica').trim(),
            modello: String(row[3] || 'Auto').trim(),
            cilindrata: String(row[4] || '').trim(),
            alimentazione,
            annoAcquisto: String(row[6] || '').trim(),
            importoBollo: row[11] ? parseFloat(String(row[11]).replace(',', '.')) || 0 : 0,
            scadenzaBollo: String(row[10] || '').trim(),
            scadenzaRevisione: String(row[12] || '').trim(),
            scadenzaAssicurazione: String(row[13] || '').trim() || undefined,
            importoAssicurazione: row[14] ? parseFloat(String(row[14]).replace(',', '.')) || undefined : undefined,
            compagniaAssicurazione: String(row[15] || '').trim() || undefined,
            officina: String(row[20] || '').trim(),
            rifOfficina: '',
            telefonoOfficina: String(row[21] || '').trim(),
            dimensioniGomme: String(row[17] || '').trim(),
            pressioneAnteriore: String(row[18] || '').trim(),
            pressionePosteriore: String(row[19] || '').trim(),
            kmAttuali: row[16] ? parseInt(String(row[16]), 10) || 0 : 0,
          };

          vehiclesMap.set(targa, veicolo);
        }
        continue;
      }

      // Riga dati Intervento / Lavorazione / Pagamento
      if (firstCell === 'INTERVENTO' || firstCell === 'PAGAMENTO') {
        const targa = String(row[1] || '').trim().toUpperCase();
        let targetVehicleId = currentVehicleId;

        if (targa && vehiclesMap.has(targa)) {
          targetVehicleId = vehiclesMap.get(targa)!.id;
        } else if (targa && !currentVehicleId) {
          // Se il veicolo non era stato definito in precedenza, crealo con i dati minimi
          targetVehicleId = `v-${targa.replace(/[^A-Z0-9]/g, '')}`;
          vehiclesMap.set(targa, {
            id: targetVehicleId,
            targa,
            proprietario: '',
            natoIlA: '',
            residenteIn: '',
            viaCorsoPiazza: '',
            cellulare: '',
            marca: String(row[2] || 'Generica').trim(),
            modello: String(row[3] || 'Auto').trim(),
            cilindrata: '',
            alimentazione: 'DIESEL',
            annoAcquisto: '',
            importoBollo: 0,
            scadenzaBollo: '',
            scadenzaRevisione: '',
            officina: '',
            rifOfficina: '',
            telefonoOfficina: '',
            dimensioniGomme: '',
            pressioneAnteriore: '',
            pressionePosteriore: '',
            kmAttuali: row[5] ? parseInt(String(row[5]), 10) || 0 : 0,
          });
        }

        if (!targetVehicleId) continue;

        const dataStr = String(row[4] || '').trim();
        const kmVal = row[5] ? parseInt(String(row[5]), 10) || 0 : 0;
        const tipoVal = String(row[6] || '').trim();
        const titoloVal = String(row[7] || 'Intervento').trim();
        const costoVal = row[8] ? parseFloat(String(row[8]).replace(',', '.')) || 0 : 0;
        const offVal = String(row[9] || '').trim();
        const lavsVal = String(row[10] || '').trim();
        const noteVal = String(row[11] || '').trim();
        const promAttivo = String(row[12] || '').toUpperCase() === 'SI';
        const promData = String(row[13] || '').trim() || undefined;
        const promKm = row[14] ? parseInt(String(row[14]), 10) || undefined : undefined;

        const isPagamento =
          readingSection === 'pagamenti' ||
          tipoVal.toLowerCase().includes('pagament') ||
          titoloVal.toLowerCase().includes('bollo') ||
          titoloVal.toLowerCase().includes('revisione') ||
          titoloVal.toLowerCase().includes('assicuraz');

        const lavList = lavsVal
          ? lavsVal.split('|').map((s) => ({
              lavorazioneId: `lav-${Math.random().toString(36).substr(2, 6)}`,
              nome: s.trim(),
              categoria: isPagamento ? 'Scadenze' : 'Manutenzione',
              sottocategoria: 'Generale',
            }))
          : [];

        let registroPagamento: any = undefined;
        if (isPagamento) {
          let tipoScadenza: 'Bollo' | 'Revisione' | 'Assicurazione' = 'Bollo';
          const lowerText = `${titoloVal} ${lavsVal}`.toLowerCase();
          if (lowerText.includes('revision')) tipoScadenza = 'Revisione';
          else if (lowerText.includes('assicuraz')) tipoScadenza = 'Assicurazione';

          registroPagamento = {
            tipoPagamento: tipoScadenza,
            dataPagamento: dataStr,
            dataScadenza: promData || dataStr,
            prossimaScadenza: promData,
            importo: costoVal,
            enteOCompagnia: offVal,
            note: noteVal,
            pagato: true,
          };
        }

        const rItem: InterventoRecord = {
          id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          veicoloId: targetVehicleId,
          data: dataStr || new Date().toISOString().split('T')[0],
          km: kmVal,
          tipo: (isPagamento ? 'Pagamento Scadenza' : tipoVal || 'Manutenzione') as any,
          titolo: titoloVal,
          costo: costoVal,
          officina: offVal,
          lavorazioniSelezionate: lavList,
          note: noteVal,
          haPromemoria: promAttivo,
          dataPromemoria: promData,
          kmPromemoria: promKm,
          registroPagamento,
          createdAt: new Date().toISOString(),
        };

        recordsList.push(rItem);
      }
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
