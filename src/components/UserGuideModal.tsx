import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Car,
  Wrench,
  Disc,
  CalendarDays,
  Cloud,
  FolderSync,
  Smartphone,
  CheckCircle2,
  Trash2,
  Plus,
  RefreshCw,
  Copy,
  ChevronRight,
  ShieldCheck,
  Download,
  Upload,
  AlertTriangle,
  Monitor,
  Command,
  Building2,
  Save,
  Folder,
  Printer,
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<string>('veicoli');
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [activeSection, isOpen]);

  if (!isOpen) return null;

  const sections = [
    { id: 'veicoli', label: '1. Parco Auto & Veicoli', icon: Car, color: 'text-blue-400' },
    { id: 'interventi', label: '2. Interventi & Tagliandi', icon: Wrench, color: 'text-amber-400' },
    { id: 'gomme', label: '3. Registro Pneumatici', icon: Disc, color: 'text-teal-400' },
    { id: 'scadenze', label: '4. Scadenze & Google Calendar', icon: CalendarDays, color: 'text-purple-400' },
    { id: 'backup', label: '5. Cartella DriverCheck & Backup', icon: Cloud, color: 'text-emerald-400' },
    { id: 'catalogo', label: '6. Menu Comune & Lavorazioni', icon: FolderSync, color: 'text-orange-400' },
    { id: 'officine', label: '7. Officine & Specialisti', icon: Building2, color: 'text-cyan-400' },
    { id: 'eliminazione', label: '8. Eliminazione Parco Auto', icon: Trash2, color: 'text-rose-400' },
    { id: 'installazione', label: '9. Installazione Smartphone', icon: Smartphone, color: 'text-teal-400' },
    { id: 'desktop', label: '10. Versione PC & Desktop', icon: Monitor, color: 'text-indigo-400' },
    { id: 'stampa', label: '11. Stampa & Report PDF', icon: Printer, color: 'text-teal-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#0f172a] text-white rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 px-5 py-4 border-b border-slate-700/80 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Guida all'Uso DriverCheck</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">v1.2</span>
              </h2>
              <p className="text-xs text-slate-300">
                Manuale pratico per la gestione completa del tuo parco auto
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#0b1120] border-b border-slate-800 px-3 py-2 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-white' : sec.color} />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          
          {/* SECTION: VEICOLI */}
          {activeSection === 'veicoli' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-[#142033] border border-blue-500/30 flex items-start gap-3">
                <Car className="text-blue-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Aggiunta e Gestione Veicoli</h3>
                  <p className="text-xs text-slate-300">
                    Ogni volta che premi il tasto <strong>"Aggiungi Veicolo"</strong> viene aperto un <strong>modello completamente vuoto</strong>, privo di dati pregressi o importi predefiniti, pronto per l'inserimento della tua nuova vettura.
                  </p>
                </div>
              </div>

              {/* Novità Tasti Superiori */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-600/40 text-xs text-blue-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white">
                  <Save size={15} className="text-blue-400" />
                  <span>Tasti di Azione Esclusivamente nella Riga Superiore (Salva, Copia, Elimina):</span>
                </div>
                <p className="text-slate-300">
                  Sia nella <strong>Scheda Tecnica Veicolo</strong>, sia nella lista del <strong>Parco Macchine</strong> e nella finestra <strong>Aggiungi Veicolo</strong>, tutti i pulsanti operativi sono posizionati <strong>esclusivamente in alto a destra</strong>:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-700/60">
                    <strong className="text-emerald-400 flex items-center gap-1 mb-0.5">
                      <Save size={12} /> Salva
                    </strong>
                    Memorizza istantaneamente tutte le modifiche tecniche, scadenze, officine e allegati.
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-700/60">
                    <strong className="text-blue-300 flex items-center gap-1 mb-0.5">
                      <Copy size={12} /> Copia
                    </strong>
                    Duplica la vettura creando una nuova scheda veicolo già precompilata nel tuo parco auto.
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-700/60">
                    <strong className="text-rose-400 flex items-center gap-1 mb-0.5">
                      <Trash2 size={12} /> Elimina
                    </strong>
                    Cancellazione diretta e sicura con finestra di conferma integrata senza popup di sistema.
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider text-slate-400">Cosa puoi registrare per ogni auto:</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <li className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <strong className="text-white block mb-0.5">Dati Targa & Intestatario</strong>
                    Targa in maiuscolo, nome proprietario, data e luogo di nascita, residenza e recapito telefonico.
                  </li>
                  <li className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <strong className="text-white block mb-0.5">Caratteristiche Tecniche</strong>
                    Marca, modello, cilindrata, alimentazione (Benzina, Diesel, GPL, Metano, Ibrida, Elettrica) e anno di acquisto.
                  </li>
                  <li className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <strong className="text-white block mb-0.5">Foto del Veicolo</strong>
                    Carica direttamente la foto della macchina scattata con la fotocamera o dalla galleria.
                  </li>
                  <li className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <strong className="text-white block mb-0.5">Officina & Specialisti</strong>
                    Memorizza i contatti di Meccanico, Gommista, Carrozziere, Elettrauto e Centro Revisioni.
                  </li>
                </ul>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-800/40 text-xs text-blue-200">
                <strong>Suggerimento:</strong> Nel cruscotto in alto puoi cambiare veicolo attivo in qualunque momento dal selettore rapido, oppure aggiornare i chilometri correnti con un solo tocco sul tasto <strong>"Aggiorna KM"</strong>.
              </div>
            </div>
          )}

          {/* SECTION: INTERVENTI */}
          {activeSection === 'interventi' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-[#2a1e12] border border-amber-500/30 flex items-start gap-3">
                <Wrench className="text-amber-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Registro Manutenzioni & Tagliandi</h3>
                  <p className="text-xs text-slate-300">
                    Registra qualsiasi intervento meccanico, tagliando periodico o spesa straordinaria collegata alla tua auto.
                  </p>
                </div>
              </div>

              {/* Novità Tasti Superiori Interventi */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/60 to-orange-950/60 border border-amber-600/40 text-xs text-amber-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-white">
                  <Save size={15} className="text-amber-400" />
                  <span>Tasti Salva, Copia Scheda ed Elimina Solo nella Riga Superiore:</span>
                </div>
                <p className="text-slate-300">
                  Per <strong>Manutenzione</strong>, <strong>Registro Gomme</strong>, <strong>Pagamenti</strong> e <strong>Altri Interventi</strong>, tutti i comandi (<strong>Salva</strong>, <strong>Copia Scheda</strong>, <strong>Elimina</strong>) sono collocati <strong>esclusivamente nell'intestazione superiore</strong>. La parte inferiore è priva di pulsanti duplicati, lasciando ampio spazio a note, costi e allegati.
                </p>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <strong className="text-white block">1. Catalogo con Ordinamento A-Z</strong>
                  <p className="text-slate-300">
                    Tutte le lavorazioni e le categorie sono automaticamente ordinate in ordine alfabetico (A-Z) per trovare immediatamente l'intervento cercato (es. Cambio Olio, Filtri, Freni, Cinghia Distribuzione).
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <strong className="text-white block">2. Tasto "Copia Scheda" (Duplicazione Autonoma)</strong>
                  <p className="text-slate-300">
                    Per ripetere una manutenzione frequente (es. tagliando annuale o cambio filtri), premi <strong>"Copia"</strong> nella barra superiore: clona tutti i dati del tagliando precedente permettendoti di salvare una <em>nuova scheda indipendente</em> aggiornando solo data e chilometraggio.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <strong className="text-white block">3. Note, Fatture e Ricevute (Foto & PDF)</strong>
                  <p className="text-slate-300">
                    Puoi specificare costi, officina di esecuzione, note e scansionare o allegare documenti fiscali sia come foto che in formato PDF.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-700/50 space-y-1 text-emerald-200">
                  <strong className="text-white block">4. Stato Pagamento, Acconti Multipli & Saldo Automatico</strong>
                  <p className="text-slate-200">
                    In ogni intervento (Manutenzione, Gomme, Altri Interventi) puoi selezionare con un tocco:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 text-xs text-slate-300">
                    <li><strong>Pagato Tutto (Saldato):</strong> l'intero importo è stato saldato e il saldo rimanente è 0 €.</li>
                    <li><strong>Acconto / Parziale:</strong> puoi registrare diversi acconti con data e note; l'app calcola in tempo reale il saldo residuo da pagare.</li>
                    <li><strong>Da Pagare:</strong> l'intervento è registrato ma la spesa è in attesa di versamento.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: GOMME */}
          {activeSection === 'gomme' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-[#0f2424] border border-teal-500/30 flex items-start gap-3">
                <Disc className="text-teal-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Registro Pneumatici & Pressioni</h3>
                  <p className="text-xs text-slate-300">
                    Monitora lo stato delle gomme, le misure omologate a libretto e le pressioni consigliate per asse.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                <p>
                  <strong>• Misure pneumatici:</strong> Salva le dimensioni (es. 205/55 R16 91V) per averle sempre a portata di mano al momento del cambio gomme.
                </p>
                <p>
                  <strong>• Pressioni bar/psi:</strong> Registra la pressione ottimale per asse anteriore e posteriore sia a pieno carico che normale.
                </p>
                <p>
                  <strong>• Storico cambi stagionali:</strong> Segna la data del cambio tra pneumatici estivi e invernali per tenere traccia dei chilometri percorsi con ciascun treno di gomme.
                </p>
              </div>
            </div>
          )}

          {/* SECTION: SCADENZE */}
          {activeSection === 'scadenze' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-[#231535] border border-purple-500/30 flex items-start gap-3">
                <CalendarDays className="text-purple-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Scadenze Auto & Google Calendar</h3>
                  <p className="text-xs text-slate-300">
                    DriverCheck gestisce le tre scadenze obbligatorie di ogni veicolo con calcolo normativo automatico.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <strong className="text-white block mb-0.5">Bollo Auto (Regola Pagabile Entro)</strong>
                  Il bollo auto scade nell'ultimo giorno del mese di scadenza e <strong>è pagabile senza sanzioni entro la fine del mese successivo</strong>. DriverCheck calcola automaticamente questa data e la inserisce chiaramente nella scheda e su Google Calendar!
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <strong className="text-white block mb-0.5">Revisione Periodica</strong>
                  4 anni dopo la prima immatricolazione, successivamente ogni 2 anni entro la fine del mese.
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <strong className="text-white block mb-0.5">Assicurazione RCA</strong>
                  Frequenza annuale o semestrale con data di scadenza e compagnia.
                </div>
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/50 text-amber-200 space-y-1">
                  <strong className="text-white block mb-0.5">Regola Scadenza Pagamenti & Ricalcolo Automatico</strong>
                  <p className="text-slate-200">
                    Non è possibile registrare un pagamento come saldato se la data di scadenza è futura rispetto alla data attuale: non puoi registrare un pagamento prima che sia effettivamente scaduto.
                  </p>
                  <p className="text-slate-300">
                    Quando la scadenza è giunta o superata (<strong>data scadenza ≤ data attuale</strong>), la casella di controllo viene abilitata: puoi apporre il check, allegare il file della ricevuta/quietanza e salvare. Il sistema archivia il pagamento saldato nello Storico e <strong>ricalcola in automatico la nuova scadenza futura</strong>, aggiornando la scheda tecnica del veicolo e predisponendo la nuova scadenza successiva in attesa.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-700/50 text-indigo-200">
                  <strong className="text-white block mb-1">Sincronizzazione su Google Calendar "Scadenze Auto"</strong>
                  Dalla sezione Impostazioni o dal pulsante <strong>"Sincronizza Scadenze"</strong>, l'app crea in automatico un calendario dedicato <em>"Scadenze Auto"</em> sul tuo account Google con promemoria a 30 e 7 giorni prima di ogni scadenza!
                </div>
              </div>
            </div>
          )}

          {/* SECTION: BACKUP DRIVE & LOCALE */}
          {activeSection === 'backup' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-[#0f271c] border border-emerald-500/30 flex items-start gap-3">
                <Cloud className="text-emerald-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Cartella DriverCheck & Backup Bilaterale (Cloud & Locale)</h3>
                  <p className="text-xs text-slate-300">
                    I tuoi dati sono sempre protetti e duplicati in sicurezza sia sul cloud di Google Drive che nella memoria locale del dispositivo.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Folder size={15} />
                    <span>Cartella Dedicata /DriverCheck su Google Drive:</span>
                  </div>
                  <p className="text-slate-300">
                    L'app crea e gestisce in automatico una cartella specifica denominata <strong>DriverCheck</strong> all'interno del tuo Google Drive. Tutti i backup completi (Parco Auto e Menu Comune) e tutti i file importati o esportati (.xlsx, .csv, .json) vengono archiviati direttamente al suo interno, senza disperdersi nel Drive personale.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <strong className="text-white block mb-0.5">Archiviazione Locale & Offline con Cartella DriverCheck</strong>
                  <p className="text-slate-300">
                    Grazie al supporto integrato di archiviazione locale (IndexedDB e File System Access API), i tuoi backup rimangono disponibili sul telefono o PC anche senza connessione internet. Ogni importazione effettuata viene memorizzata automaticamente sia in locale che su Google Drive.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <strong className="text-white block mb-0.5">Tasto "Salva su Dispositivo + Google Drive"</strong>
                  <p className="text-slate-300">
                    Con un solo clic, l'app genera e scarica il file JSON di ripristino sul telefono/PC e contemporaneamente carica una copia cloud sicura su Google Drive nella cartella DriverCheck.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: CATALOGO & MENU COMUNE */}
          {activeSection === 'catalogo' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-[#2e190e] border border-orange-500/30 flex items-start gap-3">
                <FolderSync className="text-orange-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Menu Comune Lavorazioni & Backup Dedicato</h3>
                  <p className="text-xs text-slate-300">
                    Gestisci, personalizza e conserva il catalogo condiviso delle attività di manutenzione, tagliandi e officine.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                {/* Tasti Superiori nel Catalogo */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-orange-950/60 to-amber-950/60 border border-orange-600/40 text-xs text-orange-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Save size={15} className="text-orange-400" />
                    <span>Tasti Superiori di Azione (Salva, Copia, Elimina):</span>
                  </div>
                  <p className="text-slate-300">
                    Nelle finestre modali del catalogo comune (Lavorazioni, Categorie e Sottocategorie), tutti i comandi operativi si trovano unicamente nella riga superiore:
                  </p>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    <li>• <strong className="text-white">Salva</strong>: crea la nuova attività o memorizza le modifiche apportate.</li>
                    <li>• <strong className="text-white">Copia</strong>: presente nelle schede lavorazione, duplica istantaneamente la lavorazione consentendoti di crearne una nuova con un solo tocco.</li>
                    <li>• <strong className="text-white">Elimina</strong>: rimuove la lavorazione, categoria o sottocategoria dal catalogo comune previa conferma.</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <ShieldCheck size={15} />
                    <span>Visibilità Esclusiva di BACKUP_COMPLETO_MENUCOMUNE:</span>
                  </div>
                  <p className="text-slate-300">
                    Il file di backup integrale del catalogo comune (lavorazioni, categorie, sottocategorie ed officine) è visibile e ripristinabile <strong>esclusivamente nella sezione "Importa / Ripristina Dati ➔ 2. Menu Comune"</strong>. Questo isolamento garantisce che i dati del parco auto e quelli del catalogo non possano mai sovrapporsi accidentalmente.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <strong className="text-white block mb-0.5">• Esportazione & Importazione su Drive o Locale</strong>
                  <p className="text-slate-300">
                    Puoi esportare l'intero catalogo o singole categorie in formato JSON o Excel sul tuo Google Drive nella cartella DriverCheck o scaricarle direttamente sul disco fisso.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: OFFICINE & SPECIALISTI */}
          {activeSection === 'officine' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-[#0e2233] border border-cyan-500/30 flex items-start gap-3">
                <Building2 className="text-cyan-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Officine & Specialisti di Fiducia</h3>
                  <p className="text-xs text-slate-300">
                    Memorizza e gestisci l'anagrafica di meccanici, gommisti, carrozzieri, elettrauto e centri revisione.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-600/40 text-xs text-cyan-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Save size={15} className="text-cyan-400" />
                    <span>Tasti Superiori di Azione (Salva, Copia, Elimina):</span>
                  </div>
                  <p className="text-slate-300">
                    La finestra modale per inserire o gestire un'officina o specialista include i comandi unicamente in cima:
                  </p>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    <li>• <strong className="text-white">Salva</strong>: registra la nuova officina o memorizza recapiti, referenti e indirizzi aggiornati.</li>
                    <li>• <strong className="text-white">Copia</strong>: duplica la scheda dell'officina corrente per creare un'altra sede o specialista simile senza reinserire i dettagli.</li>
                    <li>• <strong className="text-white">Elimina</strong>: rimuove l'officina dall'anagrafica con richiesta di conferma sicura.</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <strong className="text-white block mb-0.5">Associazione Diretta ai Veicoli</strong>
                  <p className="text-slate-300">
                    Le officine salvate sono disponibili automaticamente nei menu a tendina e nei selettori rapidi durante la creazione di nuovi interventi, registrazioni gomme e nella scheda tecnica di ogni auto.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: ELIMINAZIONE */}
          {activeSection === 'eliminazione' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-[#2d1118] border border-rose-500/30 flex items-start gap-3">
                <Trash2 className="text-rose-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Eliminazione Parco Auto & Gestione Dati</h3>
                  <p className="text-xs text-slate-300">
                    Come cancellare un singolo veicolo o azzerare completamente l'intero parco auto.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <strong className="text-white block mb-1">Tasto "Elimina Tutto il Parco Auto"</strong>
                  <p className="text-slate-300 mb-2">
                    Si trova nella scheda <strong>Impostazioni</strong> sotto la sezione <em>"Gestione Parco Auto & Dati"</em>.
                  </p>
                  <p className="text-slate-400">
                    Premendo questo pulsante, si apre una finestra di sicurezza per confermare l'eliminazione definitiva di tutti i veicoli salvati e dei relativi interventi storici.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/40 text-rose-200">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <AlertTriangle size={15} className="text-rose-400" />
                    <span>Consiglio di Sicurezza:</span>
                  </div>
                  Prima di eliminare il parco auto, effettua sempre un backup con il tasto <strong>"Salva su Dispositivo + Google Drive"</strong>: potrai ripristinarlo in qualsiasi momento se necessario!
                </div>
              </div>
            </div>
          )}

          {/* SECTION: INSTALLAZIONE */}
          {activeSection === 'installazione' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-[#112431] border border-cyan-500/30 flex items-start gap-3">
                <Smartphone className="text-cyan-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Installazione su Schermata Home (Desktop & Mobile)</h3>
                  <p className="text-xs text-slate-300">
                    Aggiungi DriverCheck sulla schermata del tuo smartphone o sul desktop del PC con l'icona ufficiale verde neon.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <strong className="text-white block mb-1">Android (Chrome / Samsung Internet)</strong>
                  Tocca i tre puntini in alto a destra nel browser e seleziona <strong>"Aggiungi a schermata Home"</strong> o <strong>"Installa app"</strong>. L'icona verde neon di DriverCheck apparirà tra le app del tuo telefono.
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <strong className="text-white block mb-1">iPhone / iPad (Safari)</strong>
                  Tocca il pulsante di condivisione in basso (icona quadrato con freccia verso l'alto) e seleziona <strong>"Aggiungi alla schermata Home"</strong>.
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <strong className="text-white block mb-1">PC / Mac (Chrome, Edge)</strong>
                  Clicca sull'icona di installazione nella barra degli indirizzi del browser oppure vai nel menu del browser e clicca <strong>"Installa DriverCheck..."</strong> per avere l'app sul desktop.
                </div>
              </div>
            </div>
          )}

          {/* SECTION: DESKTOP & PC */}
          {activeSection === 'desktop' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-[#171c35] border border-indigo-500/40 flex items-start gap-3">
                <Monitor className="text-indigo-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Versione Desktop & Schermo Intero per PC</h3>
                  <p className="text-xs text-slate-300">
                    DriverCheck include una modalità Desktop estesa con supporto per monitor 16:9 widescreen, scorciatoie da tastiera e collegamento diretto su Windows.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <strong className="text-white block">1. Modalità Schermo Intero (Tasto Widescreen in alto)</strong>
                  <p className="text-slate-300">
                    Premi il tasto <strong>"🖥️ Vista PC"</strong> nella barra superiore per espandere istantaneamente la visuale su tutto lo schermo del tuo monitor PC, sfruttando la griglia a più colonne per tabelle, veicoli e grafici.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <strong className="text-white block">2. Scarica Collegamento Desktop Windows (.url)</strong>
                  <p className="text-slate-300">
                    Dalla finestra <em>"Installa DriverCheck"</em> seleziona la scheda <em>"Versione PC / Desktop"</em> e clicca su <strong>"Scarica Scorciatoia Desktop (.URL)"</strong>. Trascinala sul desktop per aprire l'app con un doppio clic.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <strong className="text-white block">3. Scorciatoie da Tastiera PC</strong>
                  <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <li className="p-2 rounded-lg bg-[#141e2e] border border-slate-800 text-center">
                      <span className="block font-mono font-bold text-white">1</span>
                      <span className="text-[10px] text-slate-400">Riepilogo</span>
                    </li>
                    <li className="p-2 rounded-lg bg-[#141e2e] border border-slate-800 text-center">
                      <span className="block font-mono font-bold text-white">2</span>
                      <span className="text-[10px] text-slate-400">Cronologia</span>
                    </li>
                    <li className="p-2 rounded-lg bg-[#141e2e] border border-slate-800 text-center">
                      <span className="block font-mono font-bold text-white">3</span>
                      <span className="text-[10px] text-slate-400">Parco Auto</span>
                    </li>
                    <li className="p-2 rounded-lg bg-[#141e2e] border border-slate-800 text-center">
                      <span className="block font-mono font-bold text-white">4</span>
                      <span className="text-[10px] text-slate-400">Impostazioni</span>
                    </li>
                  </ul>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Premi <strong>Esc</strong> sulla tastiera per chiudere velocemente qualsiasi scheda o finestra aperta.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: STAMPA & REPORT A4 */}
          {activeSection === 'stampa' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-[#0e252a] border border-teal-500/40 flex items-start gap-3">
                <Printer className="text-teal-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Stampa Schede & Report A4 (PDF e Carta)</h3>
                  <p className="text-xs text-slate-300">
                    Genera documenti completi del parco auto pronti per la stampa o l'archiviazione digitale in formato PDF.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <strong className="text-white block">1. Orientamento Foglio: Verticale (Portrait) & Orizzontale (Landscape)</strong>
                  <p className="text-slate-300">
                    Scegli con un clic tra orientamento <strong>Verticale</strong> (formato classico standard da raccoglitore) oppure <strong>Orizzontale</strong> (panoramico a tabelle larghe, ideale per visualizzare comodamente molte colonne e importi).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <strong className="text-white block">2. Ordinamento Cronologico per Data Unificato</strong>
                  <p className="text-slate-300">
                    Tutti gli interventi registrati (manutenzioni, tagliandi, gomme, riparazioni, altri interventi) vengono unificati in un'unica sequenza ordinata per data, con la possibilità di scegliere tra ordinamento decrescente (dal più recente) o crescente (dal più vecchio).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <strong className="text-white block">3. Sezioni Distinte: Pagamenti SALDATI e Pagamenti DA SALDARE</strong>
                  <p className="text-slate-300">
                    Nel menu di configurazione puoi spuntare separatamente:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-400 mt-1">
                    <li><strong>Pagamenti SALDATI:</strong> tutte le ricevute, quietanze, bolli, revisioni e assicurazioni già pagate.</li>
                    <li><strong>Pagamenti DA SALDARE:</strong> quadro completo delle scadenze future imminenti da pagare e degli interventi eseguiti con saldo residuo/acconto da corrispondere.</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <strong className="text-white block">4. Nome del Proprietario</strong>
                  <p className="text-slate-300">
                    L'intestazione e l'elenco auto includono sempre, oltre a marca, modello e targa, il <strong>nome completo del proprietario</strong> e i relativi contatti telefonici e di residenza.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0b1120] border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Hai dubbi? Consulta la guida in qualsiasi momento dal pulsante <strong>(?)</strong> in alto
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-md"
          >
            Ho Capito, Chiudi
          </button>
        </div>

      </div>
    </div>
  );
};
