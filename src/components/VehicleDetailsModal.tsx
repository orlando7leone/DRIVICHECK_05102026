import React, { useState } from 'react';
import { Veicolo, SpecialistaOfficina, AllegatoDocumento, AnagraficaOfficina } from '../types';
import { compressImageFile } from '../utils/imageOptimizer';
import { ReceiptInvoiceUpload } from './ReceiptInvoiceUpload';
import { OfficinaSelector } from './OfficinaSelector';
import {
  formatCurrency,
  formatKm,
  formatDateIt,
  getDaysUntil,
  computeBolloPagabileEntro,
  computeNextDeadlineDate,
  openGoogleCalendarEvent,
  openWhatsAppReminder,
  openSmsReminder,
} from '../services/storageService';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  User,
  Car,
  Calendar,
  Building2,
  Disc,
  Phone,
  Clock,
  AlertCircle,
  Save,
  Gauge,
  Shield,
  CalendarPlus,
  Camera,
  ImageIcon,
  Upload,
  Wrench,
  Sparkles,
  Check,
  RefreshCw,
  X,
  Copy,
} from 'lucide-react';

interface VehicleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  veicolo: Veicolo;
  onSaveVehicle: (updated: Veicolo) => void;
  onDeleteVehicle?: (veicoloId: string) => void;
  onDuplicateVehicle?: (veicolo: Veicolo) => void;
  initialEditing?: boolean;
  officineSalvate?: string[];
  officineAnagrafica?: AnagraficaOfficina[];
  onAddNewOfficina?: (nome: string, tipo?: any, telefono?: string, referente?: string, indirizzo?: string) => void;
  onDeleteOfficina?: (nome: string) => void;
}

export const VehicleDetailsModal: React.FC<VehicleDetailsModalProps> = ({
  isOpen,
  onClose,
  veicolo,
  onSaveVehicle,
  onDeleteVehicle,
  onDuplicateVehicle,
  initialEditing = false,
  officineSalvate = [],
  officineAnagrafica = [],
  onAddNewOfficina,
  onDeleteOfficina,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(initialEditing);
  const [formData, setFormData] = useState<Veicolo>(veicolo);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [calendarAlert, setCalendarAlert] = useState<string | null>(null);

  // Sync state when veicolo or open state changes
  React.useEffect(() => {
    if (isOpen && veicolo) {
      setFormData(veicolo);
      setIsEditing(initialEditing ?? false);
      setCalendarAlert(null);
      setConfirmDelete(false);
    }
  }, [isOpen, veicolo, initialEditing]);

  if (!isOpen || !veicolo) return null;

  const handleChange = (field: keyof Veicolo, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSpecialistChange = (
    tipo: 'Gommista' | 'Carrozziere' | 'Elettrauto' | 'Centro Revisioni',
    key: 'nome' | 'telefono' | 'indirizzo' | 'note',
    val: string
  ) => {
    setFormData((prev) => {
      const existing = prev.specialisti ? [...prev.specialisti] : [];
      const idx = existing.findIndex((s) => s.tipo === tipo);
      if (idx >= 0) {
        existing[idx] = { ...existing[idx], [key]: val };
      } else {
        existing.push({ tipo, nome: '', telefono: '', [key]: val });
      }
      return { ...prev, specialisti: existing };
    });
  };

  const getSpecialist = (tipo: 'Gommista' | 'Carrozziere' | 'Elettrauto' | 'Centro Revisioni'): SpecialistaOfficina => {
    const list = isEditing ? formData.specialisti || [] : veicolo.specialisti || [];
    return list.find((s) => s.tipo === tipo) || { tipo, nome: '', telefono: '' };
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressingPhoto(true);
      try {
        const compressedBase64 = await compressImageFile(file, 800, 0.72);
        setFormData((prev) => ({ ...prev, immagine: compressedBase64 }));
      } catch (err) {
        console.error('Errore compressione foto veicolo:', err);
      } finally {
        setIsCompressingPhoto(false);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveVehicle(formData);
    setIsEditing(false);
  };

  const daysBollo = veicolo?.scadenzaBollo ? getDaysUntil(veicolo.scadenzaBollo) : 999;
  const daysRevisione = veicolo?.scadenzaRevisione ? getDaysUntil(veicolo.scadenzaRevisione) : 999;
  const daysAssicurazione = veicolo?.scadenzaAssicurazione
    ? getDaysUntil(veicolo.scadenzaAssicurazione)
    : 999;

  // Bollo pagabile entro display
  const bolloPagabileEntro = veicolo?.pagabileEntroBollo || (veicolo?.scadenzaBollo ? computeBolloPagabileEntro(veicolo.scadenzaBollo) : '');

  const handleCalendarExport = (tipo: 'Bollo' | 'Revisione' | 'Assicurazione') => {
    setCalendarAlert(null);
    let targetDate = '';
    let title = '';
    let description = '';

    if (tipo === 'Bollo') {
      targetDate = isEditing ? formData.scadenzaBollo : veicolo.scadenzaBollo;
      title = `Scadenza Bollo Auto: ${veicolo.marca} ${veicolo.modello} (${veicolo.targa})`;
      description = `Pagamento Bollo Auto per ${veicolo.targa}. Pagabile entro: ${bolloPagabileEntro}. Importo: ${formatCurrency(veicolo.importoBollo || 0)}`;
    } else if (tipo === 'Revisione') {
      targetDate = isEditing ? formData.scadenzaRevisione : veicolo.scadenzaRevisione;
      title = `Scadenza Revisione: ${veicolo.marca} ${veicolo.modello} (${veicolo.targa})`;
      description = `Scadenza revisione ministeriale obbligatoria per ${veicolo.targa}. Frequenza: ${veicolo.frequenzaRevisione || 'Auto Biennale'}`;
    } else {
      targetDate = isEditing ? (formData.scadenzaAssicurazione || '') : (veicolo.scadenzaAssicurazione || '');
      title = `Rinnovo Assicurazione RCA: ${veicolo.marca} ${veicolo.modello} (${veicolo.targa})`;
      description = `Rinnovo polizza RCA per ${veicolo.targa} - Compagnia: ${veicolo.compagniaAssicurazione || 'N/D'}. Rata: ${formatCurrency(veicolo.importoAssicurazione || 0)}`;
    }

    if (!targetDate || targetDate.trim() === '') {
      setIsEditing(true);
      setCalendarAlert(`Data Scadenza ${tipo} non indicata. È stata attivata la modalità Modifica: compila il campo della data e clicca "Salva" per poterla aggiungere a Google Calendar.`);
      return;
    }

    openGoogleCalendarEvent({
      title,
      description,
      startDate: targetDate,
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[95vh] flex flex-col bg-[#111827] text-white rounded-t-3xl sm:rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 to-[#1e293b] px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Scheda Tecnica Veicolo
              </h2>
              <p className="text-xs text-emerald-400 font-mono font-bold tracking-wider">
                {veicolo.marca} {veicolo.modello} • {veicolo.targa}
                {veicolo.proprietario && <span> • {veicolo.proprietario}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {!isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-colors cursor-pointer active:scale-95"
                  title="Modifica scheda veicolo"
                >
                  <Pencil size={14} />
                  <span>Modifica</span>
                </button>

                {onDuplicateVehicle && (
                  <button
                    type="button"
                    onClick={() => {
                      onDuplicateVehicle(veicolo);
                      onClose();
                    }}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer active:scale-95"
                    title="Duplica veicolo nel parco macchine"
                  >
                    <Copy size={14} />
                    <span>Copia</span>
                  </button>
                )}

                {onDeleteVehicle && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer active:scale-95 shadow-sm"
                    title="Elimina veicolo"
                  >
                    <Trash2 size={14} />
                    <span>Elimina</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(veicolo);
                    setIsEditing(false);
                  }}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 border border-slate-700"
                  title="Annulla modifiche"
                >
                  <X size={14} />
                  <span>Annulla</span>
                </button>

                {onDuplicateVehicle && (
                  <button
                    type="button"
                    onClick={() => {
                      onDuplicateVehicle(formData);
                      onClose();
                    }}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer active:scale-95"
                    title="Duplica scheda veicolo nel parco"
                  >
                    <Copy size={14} />
                    <span>Copia</span>
                  </button>
                )}

                {onDeleteVehicle && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer active:scale-95 shadow-sm"
                    title="Elimina veicolo"
                  >
                    <Trash2 size={14} />
                    <span>Elimina</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSave}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer active:scale-95"
                  title="Salva modifiche scheda veicolo"
                >
                  <Save size={14} />
                  <span>Salva</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Scrollable details form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* FOTO DEL VEICOLO CON POSSIBILITÀ DI INSERIMENTO / MODIFICA (Punto 5) */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-md">
            {isCompressingPhoto && (
              <div className="absolute inset-0 bg-black/75 z-10 flex flex-col items-center justify-center text-white">
                <RefreshCw size={24} className="animate-spin text-blue-400 mb-1.5" />
                <span className="text-xs font-bold">Ottimizzazione foto in corso...</span>
              </div>
            )}
            <img
              src={isEditing ? formData.immagine || veicolo.immagine || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80' : veicolo.immagine || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'}
              alt={veicolo.marca}
              className="w-full h-44 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">{veicolo.marca} {veicolo.modello}</h3>
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-black/60 px-2 py-0.5 rounded border border-emerald-500/40">
                    {veicolo.targa}
                  </span>
                </div>

                {/* Pulsanti Fotocamera e Galleria */}
                <div className="flex items-center gap-1.5">
                  <label
                    title="Scatta foto con la fotocamera"
                    className="px-2.5 py-1.5 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-lg border border-blue-400/40 cursor-pointer transition-all active:scale-95"
                  >
                    <Camera size={13} />
                    <span>Fotocamera</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  <label
                    title="Scegli immagine dalla galleria"
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-lg border border-emerald-400/40 cursor-pointer transition-all active:scale-95"
                  >
                    <ImageIcon size={13} />
                    <span>Galleria</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Status / Deadlines banner */}
          <div className="grid grid-cols-3 gap-2">
            <div className={`p-2.5 rounded-2xl border ${
              daysBollo <= 30
                ? 'bg-amber-950/30 border-amber-600/60 text-amber-200'
                : 'bg-[#152031] border-slate-800 text-slate-200'
            }`}>
              <div className="flex items-center justify-between text-[9px] uppercase font-bold tracking-wider text-slate-400">
                <span>Bollo</span>
                <Clock size={11} className={daysBollo <= 30 ? 'text-amber-400' : 'text-blue-400'} />
              </div>
              <div className="text-xs font-bold mt-1 text-white truncate">
                {formatDateIt(veicolo.scadenzaBollo)}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                {daysBollo > 0 ? `${daysBollo} gg` : 'Scaduto'}
              </div>
            </div>

            <div className={`p-2.5 rounded-2xl border ${
              daysRevisione <= 30
                ? 'bg-rose-950/30 border-rose-600/60 text-rose-200'
                : 'bg-[#152031] border-slate-800 text-slate-200'
            }`}>
              <div className="flex items-center justify-between text-[9px] uppercase font-bold tracking-wider text-slate-400">
                <span>Revisione</span>
                <AlertCircle size={11} className={daysRevisione <= 30 ? 'text-rose-400' : 'text-emerald-400'} />
              </div>
              <div className="text-xs font-bold mt-1 text-white truncate">
                {formatDateIt(veicolo.scadenzaRevisione)}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                {daysRevisione > 0 ? `${daysRevisione} gg` : 'Scaduta'}
              </div>
            </div>

            <div className={`p-2.5 rounded-2xl border ${
              daysAssicurazione <= 30
                ? 'bg-emerald-950/30 border-emerald-600/60 text-emerald-200'
                : 'bg-[#152031] border-slate-800 text-slate-200'
            }`}>
              <div className="flex items-center justify-between text-[9px] uppercase font-bold tracking-wider text-emerald-400">
                <span>Assicuraz.</span>
                <Shield size={11} className={daysAssicurazione <= 30 ? 'text-emerald-400' : 'text-teal-400'} />
              </div>
              <div className="text-xs font-bold mt-1 text-white truncate">
                {veicolo.scadenzaAssicurazione ? formatDateIt(veicolo.scadenzaAssicurazione) : 'N/D'}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                {daysAssicurazione > 0 && daysAssicurazione < 999 ? `${daysAssicurazione} gg` : 'N/D'}
              </div>
            </div>
          </div>

          {/* SEZIONE 1: DATI PROPRIETARIO */}
          <div className="p-4 rounded-2xl bg-[#141e2e] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800/80 text-blue-400 text-xs font-bold uppercase tracking-wider">
              <User size={15} /> Dati Proprietario
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Proprietario</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.proprietario}
                    onChange={(e) => handleChange('proprietario', e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white mt-1"
                  />
                ) : (
                  <p className="text-xs font-semibold text-white mt-0.5">{veicolo.proprietario || 'Non indicato'}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nato il / A</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.natoIlA}
                    onChange={(e) => handleChange('natoIlA', e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white mt-1"
                  />
                ) : (
                  <p className="text-xs font-semibold text-white mt-0.5">{veicolo.natoIlA || 'Non indicato'}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Residente in</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.residenteIn}
                    onChange={(e) => handleChange('residenteIn', e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white mt-1"
                  />
                ) : (
                  <p className="text-xs font-semibold text-white mt-0.5">{veicolo.residenteIn || 'Non indicato'}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Via / Corso / Piazza</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.viaCorsoPiazza}
                    onChange={(e) => handleChange('viaCorsoPiazza', e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white mt-1"
                  />
                ) : (
                  <p className="text-xs font-semibold text-white mt-0.5">{veicolo.viaCorsoPiazza || 'Non indicato'}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Cellulare</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.cellulare}
                    onChange={(e) => handleChange('cellulare', e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white mt-1"
                  />
                ) : (
                  <p className="text-xs font-semibold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                    <Phone size={13} /> {veicolo.cellulare || 'Non indicato'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SEZIONE 2: DATI VEICOLO & DATI TECNICI */}
          <div className="p-4 rounded-2xl bg-[#141e2e] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800/80 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Car size={15} /> Dati Veicolo
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Targa</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.targa}
                    onChange={(e) => handleChange('targa', e.target.value.toUpperCase())}
                    className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono mt-1"
                  />
                ) : (
                  <p className="text-xs font-bold font-mono text-white mt-0.5">{veicolo.targa}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Marca</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.marca}
                    onChange={(e) => handleChange('marca', e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white mt-1"
                  />
                ) : (
                  <p className="text-xs font-semibold text-white mt-0.5">{veicolo.marca}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Modello</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.modello}
                    onChange={(e) => handleChange('modello', e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white mt-1"
                  />
                ) : (
                  <p className="text-xs font-semibold text-white mt-0.5">{veicolo.modello}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Cilindrata / Potenza</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.cilindrata}
                    onChange={(e) => handleChange('cilindrata', e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white mt-1"
                  />
                ) : (
                  <p className="text-xs font-semibold text-white mt-0.5">{veicolo.cilindrata || 'Non indicata'}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Alimentazione</label>
                {isEditing ? (
                  <select
                    value={formData.alimentazione}
                    onChange={(e) => handleChange('alimentazione', e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white mt-1"
                  >
                    <option value="DIESEL">DIESEL</option>
                    <option value="BENZINA">BENZINA</option>
                    <option value="IBRIDA">IBRIDA</option>
                    <option value="ELETTRICA">ELETTRICA</option>
                    <option value="GPL">GPL</option>
                    <option value="METANO">METANO</option>
                  </select>
                ) : (
                  <p className="text-xs font-semibold text-blue-300 mt-0.5">{veicolo.alimentazione}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Anno di acquisto</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.annoAcquisto}
                    onChange={(e) => handleChange('annoAcquisto', e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white mt-1"
                  />
                ) : (
                  <p className="text-xs font-semibold text-white mt-0.5">{veicolo.annoAcquisto || 'Non indicato'}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Chilometraggio Attuale</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.kmAttuali}
                    onChange={(e) => handleChange('kmAttuali', Number(e.target.value))}
                    className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white mt-1 font-bold"
                  />
                ) : (
                  <p className="text-xs font-bold text-white mt-0.5">{formatKm(veicolo.kmAttuali)}</p>
                )}
              </div>
            </div>
          </div>

          {/* SEZIONE 3: GESTIONE SCADENZE CON FREQUENZE E GOOGLE CALENDAR (Punti 3, 4, 6) */}
          <div className="p-4 rounded-2xl bg-[#141e2e] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <Calendar size={15} /> Scadenze, Frequenze e Promemoria
              </div>
              <span className="text-[10px] text-blue-400 font-mono">Google Calendar Sync</span>
            </div>

            {calendarAlert && (
              <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-500 text-xs text-amber-200 flex items-center justify-between gap-2 animate-in fade-in">
                <span>{calendarAlert}</span>
                <button
                  type="button"
                  onClick={() => setCalendarAlert(null)}
                  className="text-amber-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* 1. BOLLO AUTO */}
            <div className="p-3 rounded-xl bg-[#0c1322] border border-amber-600/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">Bollo Auto (Annuale)</span>
                <button
                  type="button"
                  onClick={() => handleCalendarExport('Bollo')}
                  className="px-2 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600 border border-blue-500/50 text-blue-300 hover:text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <CalendarPlus size={12} />
                  <span>Google Calendar</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-400 block">Scadenza Bollo</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.scadenzaBollo}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleChange('scadenzaBollo', val);
                        handleChange('pagabileEntroBollo', computeBolloPagabileEntro(val));
                      }}
                      className="w-full bg-[#152033] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white mt-0.5"
                    />
                  ) : (
                    <span className="font-bold text-white block">{formatDateIt(veicolo.scadenzaBollo)}</span>
                  )}
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase text-amber-300 block">Pagabile Entro</label>
                  {isEditing ? (
                    <input
                      type="text"
                      placeholder="es. Tutto Settembre"
                      value={formData.pagabileEntroBollo || ''}
                      onChange={(e) => handleChange('pagabileEntroBollo', e.target.value)}
                      className="w-full bg-[#152033] border border-amber-600/70 rounded-lg px-2.5 py-1 text-xs text-amber-200 font-semibold mt-0.5"
                    />
                  ) : (
                    <span className="font-bold text-amber-300 block">{bolloPagabileEntro || 'N/D'}</span>
                  )}
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-400 block">Importo Bollo (€)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={formData.importoBollo || ''}
                      onChange={(e) => handleChange('importoBollo', parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#152033] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white mt-0.5"
                    />
                  ) : (
                    <span className="font-bold text-white block">{formatCurrency(veicolo.importoBollo || 0)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. REVISIONE MINISTERIALE */}
            <div className="p-3 rounded-xl bg-[#0c1322] border border-rose-600/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-300">Revisione Ministeriale</span>
                <button
                  type="button"
                  onClick={() => handleCalendarExport('Revisione')}
                  className="px-2 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600 border border-blue-500/50 text-blue-300 hover:text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <CalendarPlus size={12} />
                  <span>Google Calendar</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-400 block">Data Scadenza Revisione</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.scadenzaRevisione}
                      onChange={(e) => handleChange('scadenzaRevisione', e.target.value)}
                      className="w-full bg-[#152033] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white mt-0.5"
                    />
                  ) : (
                    <span className="font-bold text-white block">{formatDateIt(veicolo.scadenzaRevisione)}</span>
                  )}
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-400 block">Frequenza Scadenza</label>
                  {isEditing ? (
                    <select
                      value={formData.frequenzaRevisione || 'Auto (Normale)'}
                      onChange={(e) => handleChange('frequenzaRevisione', e.target.value)}
                      className="w-full bg-[#152033] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white mt-0.5"
                    >
                      <option value="Auto (Normale)">Auto (Normale) - Ogni 2 anni</option>
                      <option value="Nuova Immatricolazione">Nuova Immatricolazione - 4 anni</option>
                      <option value="Speciale">Speciale / Taxi / NCC - Ogni anno</option>
                    </select>
                  ) : (
                    <span className="font-semibold text-slate-300 block">
                      {veicolo.frequenzaRevisione || 'Auto (Normale) - Ogni 2 anni'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 3. ASSICURAZIONE */}
            <div className="p-3 rounded-xl bg-[#0c1322] border border-emerald-600/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300">Assicurazione RCA</span>
                <button
                  type="button"
                  onClick={() => handleCalendarExport('Assicurazione')}
                  className="px-2 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600 border border-blue-500/50 text-blue-300 hover:text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <CalendarPlus size={12} />
                  <span>Google Calendar</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-400 block">Scadenza Polizza</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.scadenzaAssicurazione || ''}
                      onChange={(e) => handleChange('scadenzaAssicurazione', e.target.value)}
                      className="w-full bg-[#152033] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white mt-0.5"
                    />
                  ) : (
                    <span className="font-bold text-white block">
                      {formatDateIt(veicolo.scadenzaAssicurazione) || 'Non indicata'}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-400 block">Frequenza Pagamento</label>
                  {isEditing ? (
                    <select
                      value={formData.frequenzaAssicurazione || 'Annuale'}
                      onChange={(e) => handleChange('frequenzaAssicurazione', e.target.value)}
                      className="w-full bg-[#152033] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white mt-0.5"
                    >
                      <option value="Annuale">Annuale (pagamento unico)</option>
                      <option value="Semestrale">Semestrale (2 rate)</option>
                      <option value="Trimestrale">Trimestrale (4 rate)</option>
                      <option value="Mensile">Mensile (12 rate)</option>
                    </select>
                  ) : (
                    <span className="font-semibold text-slate-300 block">
                      {veicolo.frequenzaAssicurazione || 'Semestrale (2 rate)'}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-400 block">Importo Rata (€)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={formData.importoAssicurazione || ''}
                      onChange={(e) => handleChange('importoAssicurazione', parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#152033] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white mt-0.5"
                    />
                  ) : (
                    <span className="font-bold text-white block">
                      {veicolo.importoAssicurazione ? formatCurrency(veicolo.importoAssicurazione) : 'Non indicato'}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-400 block">Compagnia Assicurativa</label>
                  {isEditing ? (
                    <input
                      type="text"
                      placeholder="es. Allianz, UnipolSai, Generali..."
                      value={formData.compagniaAssicurazione || ''}
                      onChange={(e) => handleChange('compagniaAssicurazione', e.target.value)}
                      className="w-full bg-[#152033] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white mt-0.5"
                    />
                  ) : (
                    <span className="font-semibold text-slate-300 block">
                      {veicolo.compagniaAssicurazione || 'Non indicata'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SEZIONE 4: OFFICINE E SPECIALISTI DI FIDUCIA (Punto 8) */}
          <div className="p-4 rounded-2xl bg-[#141e2e] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800/80 text-orange-400 text-xs font-bold uppercase tracking-wider">
              <Building2 size={15} /> Officina & Specialisti di Fiducia
            </div>

            {/* 1. Meccanico principale */}
            <div className="p-3 rounded-xl bg-[#0c1322] border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
                  <Wrench size={13} /> Meccanico / Officina Principale
                </span>
                {veicolo.telefonoOfficina && !isEditing && (
                  <a
                    href={`tel:${veicolo.telefonoOfficina}`}
                    className="text-emerald-400 text-[11px] font-bold flex items-center gap-1 hover:underline"
                  >
                    <Phone size={12} /> Chiama
                  </a>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2.5">
                  <OfficinaSelector
                    value={formData.officina || ''}
                    onChange={(val) => handleChange('officina', val)}
                    officineSalvate={(() => {
                      const sameType = (officineAnagrafica || [])
                        .filter((o) => o.tipo === 'Meccanico')
                        .map((o) => o.nome.trim());
                      const otherTypes = (officineAnagrafica || [])
                        .filter((o) => o.tipo !== 'Meccanico')
                        .map((o) => o.nome.trim());
                      const remaining = (officineSalvate || []).filter(
                        (s) => !sameType.includes(s) && !otherTypes.includes(s)
                      );
                      return [...sameType, ...otherTypes, ...remaining];
                    })()}
                    officineAnagrafica={officineAnagrafica}
                    onDeleteOfficina={onDeleteOfficina}
                    onAddNewOfficina={(nome) =>
                      onAddNewOfficina?.(
                        nome,
                        'Meccanico',
                        formData.telefonoOfficina,
                        formData.rifOfficina
                      )
                    }
                    onSelectOfficinaDetails={(details) => {
                      handleChange('officina', details.nome);
                      if (details.telefono) handleChange('telefonoOfficina', details.telefono);
                      if (details.referente) handleChange('rifOfficina', details.referente);
                    }}
                    label="Nome Officina / Ragione Sociale"
                    placeholder="Nome meccanico o seleziona dal Menu Comune..."
                    accentColor="orange"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-400 block">Referente</label>
                      <input
                        type="text"
                        placeholder="Nome referente"
                        value={formData.rifOfficina || ''}
                        onChange={(e) => handleChange('rifOfficina', e.target.value)}
                        className="w-full bg-[#152033] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-400 block">Telefono</label>
                      <input
                        type="tel"
                        placeholder="Numero telefono"
                        value={formData.telefonoOfficina || ''}
                        onChange={(e) => handleChange('telefonoOfficina', e.target.value)}
                        className="w-full bg-[#152033] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-semibold mt-0.5"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 block">Nome Officina</label>
                    <span className="font-bold text-white block">{veicolo.officina || 'Non indicata'}</span>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 block">Referente</label>
                    <span className="font-semibold text-slate-300 block">{veicolo.rifOfficina || 'N/D'}</span>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 block">Telefono</label>
                    <span className="font-semibold text-emerald-400 block">{veicolo.telefonoOfficina || 'N/D'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Specialisti: Gommista, Carrozziere, Elettrauto, Centro Revisioni */}
            {(['Gommista', 'Carrozziere', 'Elettrauto', 'Centro Revisioni'] as const).map((specTipo) => {
              const spec = getSpecialist(specTipo);
              const tabAccent =
                specTipo === 'Gommista'
                  ? 'cyan'
                  : specTipo === 'Carrozziere'
                  ? 'purple'
                  : specTipo === 'Elettrauto'
                  ? 'emerald'
                  : 'blue';

              return (
                <div key={specTipo} className="p-3 rounded-xl bg-[#0c1322] border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{specTipo}</span>
                    {spec.telefono && !isEditing && (
                      <a
                        href={`tel:${spec.telefono}`}
                        className="text-emerald-400 text-[11px] font-bold flex items-center gap-1 hover:underline"
                      >
                        <Phone size={12} /> Chiama
                      </a>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2.5">
                      <OfficinaSelector
                        value={spec.nome || ''}
                        onChange={(val) => handleSpecialistChange(specTipo, 'nome', val)}
                        officineSalvate={(() => {
                          const sameType = (officineAnagrafica || [])
                            .filter((o) => o.tipo === specTipo)
                            .map((o) => o.nome.trim());
                          const otherTypes = (officineAnagrafica || [])
                            .filter((o) => o.tipo !== specTipo)
                            .map((o) => o.nome.trim());
                          const remaining = (officineSalvate || []).filter(
                            (s) => !sameType.includes(s) && !otherTypes.includes(s)
                          );
                          return [...sameType, ...otherTypes, ...remaining];
                        })()}
                        officineAnagrafica={officineAnagrafica}
                        onDeleteOfficina={onDeleteOfficina}
                        onAddNewOfficina={(nome) =>
                          onAddNewOfficina?.(
                            nome,
                            specTipo,
                            spec.telefono,
                            spec.referente,
                            spec.indirizzo
                          )
                        }
                        onSelectOfficinaDetails={(details) => {
                          handleSpecialistChange(specTipo, 'nome', details.nome);
                          if (details.telefono) handleSpecialistChange(specTipo, 'telefono', details.telefono);
                          if (details.referente) handleSpecialistChange(specTipo, 'referente' as any, details.referente);
                        }}
                        label={`Nome ${specTipo} / Ditta`}
                        placeholder={`Nome del ${specTipo.toLowerCase()} o seleziona dal Menu Comune...`}
                        accentColor={tabAccent}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-400 block">Telefono</label>
                          <input
                            type="tel"
                            placeholder="Numero cellulare o fisso"
                            value={spec.telefono || ''}
                            onChange={(e) => handleSpecialistChange(specTipo, 'telefono', e.target.value)}
                            className="w-full bg-[#152033] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white mt-0.5"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-400 block">Indirizzo / Note</label>
                          <input
                            type="text"
                            placeholder="Via o note aggiuntive"
                            value={spec.indirizzo || ''}
                            onChange={(e) => handleSpecialistChange(specTipo, 'indirizzo', e.target.value)}
                            className="w-full bg-[#152033] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white mt-0.5"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <label className="text-[9px] font-bold uppercase text-slate-400 block">Nome / Ditta</label>
                        <span className="font-semibold text-white block">{spec.nome || 'Non indicato'}</span>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold uppercase text-slate-400 block">Telefono</label>
                        <span className="font-semibold text-emerald-400 block">{spec.telefono || 'N/D'}</span>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold uppercase text-slate-400 block">Indirizzo / Note</label>
                        <span className="font-normal text-slate-400 block">{spec.indirizzo || 'N/D'}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* SEZIONE 5: PNEUMATICI E PRESSIONI */}
          <div className="p-4 rounded-2xl bg-[#141e2e] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800/80 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Disc size={15} /> Pneumatici e Pressioni Consigliate
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Misura Gomme</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.dimensioniGomme}
                    onChange={(e) => handleChange('dimensioniGomme', e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white mt-1"
                  />
                ) : (
                  <p className="text-xs font-semibold text-white mt-0.5">{veicolo.dimensioniGomme || 'Non indicata'}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Pressione Anteriore</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.pressioneAnteriore}
                    onChange={(e) => handleChange('pressioneAnteriore', e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white mt-1"
                  />
                ) : (
                  <p className="text-xs font-semibold text-white mt-0.5">{veicolo.pressioneAnteriore || '2.4 bar'}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Pressione Posteriore</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.pressionePosteriore}
                    onChange={(e) => handleChange('pressionePosteriore', e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white mt-1"
                  />
                ) : (
                  <p className="text-xs font-semibold text-white mt-0.5">{veicolo.pressionePosteriore || '2.2 bar'}</p>
                )}
              </div>
            </div>
          </div>

          {/* SEZIONE 6: DOCUMENTI & ALLEGATI VEICOLO (Libretto, Polizza, PDF, Foto) */}
          <div className="p-4 rounded-2xl bg-[#141e2e] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Shield size={15} /> Documenti & Allegati Veicolo (PDF e Foto)
              </span>
              <span className="text-[10px] text-slate-400">
                Libretto di Circolazione, Polizza, Certificati
              </span>
            </div>

            <ReceiptInvoiceUpload
              allegati={isEditing ? (formData.allegati || []) : (veicolo.allegati || [])}
              onAllegatiChange={(items) => {
                if (isEditing) {
                  setFormData((prev) => ({ ...prev, allegati: items }));
                } else {
                  // Salvataggio immediato anche in modalità visualizzazione!
                  const updatedVehicle = { ...veicolo, allegati: items };
                  onSaveVehicle(updatedVehicle);
                }
              }}
              label="Allega documenti veicolo (Libretto PDF, Polizza, Foto documenti)"
            />
          </div>

          {/* Delete confirmation modal */}
          {confirmDelete && onDeleteVehicle && (
            <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-600 text-white space-y-3">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <AlertCircle size={16} /> Conferma eliminazione veicolo
              </h4>
              <p className="text-xs text-rose-200">
                Sei sicuro di voler eliminare definitivamente <strong>{veicolo.marca} {veicolo.modello} ({veicolo.targa})</strong>? Questa azione non può essere annullata.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-bold"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteVehicle(veicolo.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold"
                >
                  Elimina Definitivamente
                </button>
              </div>
            </div>
          )}

        </form>
      </div>
    </div>
  );
};
