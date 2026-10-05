import React, { useState, useMemo } from 'react';
import { Veicolo, SpecialistaOfficina, AnagraficaOfficina } from '../types';
import { computeBolloPagabileEntro, computeNextDeadlineDate } from '../services/storageService';
import { compressImageFile } from '../utils/imageOptimizer';
import { OfficinaSelector } from './OfficinaSelector';
import {
  X,
  Plus,
  Car,
  User,
  Building2,
  Disc,
  ArrowLeft,
  Check,
  Camera,
  Upload,
  Shield,
  Calendar,
  Phone,
  Wrench,
  AlertCircle,
  ImageIcon,
  RefreshCw,
  Save,
} from 'lucide-react';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVehicle: (nuovoVeicolo: Veicolo) => void;
  officineSalvate?: string[];
  officineAnagrafica?: AnagraficaOfficina[];
  onAddNewOfficina?: (nome: string, tipo?: any, telefono?: string, referente?: string) => void;
  onDeleteOfficina?: (nome: string) => void;
}

const getBlankVehicleForm = (): Partial<Veicolo> => ({
  targa: '',
  proprietario: '',
  natoIlA: '',
  residenteIn: '',
  viaCorsoPiazza: '',
  cellulare: '',
  marca: '',
  modello: '',
  cilindrata: '',
  alimentazione: 'DIESEL',
  annoAcquisto: '',
  importoBollo: 0,
  scadenzaBollo: '',
  pagabileEntroBollo: '',
  scadenzaRevisione: '',
  frequenzaRevisione: 'Auto (Normale)',
  scadenzaAssicurazione: '',
  frequenzaAssicurazione: 'Annuale',
  importoAssicurazione: 0,
  compagniaAssicurazione: '',
  notificaMessaggioAttiva: true,
  officina: '',
  rifOfficina: '',
  telefonoOfficina: '',
  specialisti: [
    { tipo: 'Meccanico', nome: '', telefono: '', referente: '' },
    { tipo: 'Gommista', nome: '', telefono: '', referente: '' },
    { tipo: 'Carrozziere', nome: '', telefono: '', referente: '' },
    { tipo: 'Elettrauto', nome: '', telefono: '', referente: '' },
    { tipo: 'Centro Revisioni', nome: '', telefono: '', referente: '' },
  ],
  dimensioniGomme: '',
  pressioneAnteriore: '',
  pressionePosteriore: '',
  kmAttuali: 0,
  immagine: '',
  note: '',
});

export const AddVehicleModal: React.FC<AddVehicleModalProps> = ({
  isOpen,
  onClose,
  onAddVehicle,
  officineSalvate = [],
  officineAnagrafica = [],
  onAddNewOfficina,
  onDeleteOfficina,
}) => {
  const [formData, setFormData] = useState<Partial<Veicolo>>(getBlankVehicleForm);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);

  const [activeSpecialistTab, setActiveSpecialistTab] = useState<
    'Meccanico' | 'Gommista' | 'Carrozziere' | 'Elettrauto' | 'Centro Revisioni'
  >('Meccanico');

  // Resetta SEMPRE il form a un modello completamente vuoto ogni volta che si apre
  React.useEffect(() => {
    if (isOpen) {
      setFormData(getBlankVehicleForm());
      setActiveSpecialistTab('Meccanico');
    }
  }, [isOpen]);

  const handleClose = () => {
    setFormData(getBlankVehicleForm());
    onClose();
  };

  if (!isOpen) return null;

  const handleChange = (field: keyof Veicolo, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleScadenzaBolloChange = (val: string) => {
    setFormData((prev) => {
      const pagEntro = computeBolloPagabileEntro(val);
      return {
        ...prev,
        scadenzaBollo: val,
        pagabileEntroBollo: pagEntro,
      };
    });
  };

  const handleSpecialistChange = (
    tipo: 'Meccanico' | 'Gommista' | 'Carrozziere' | 'Elettrauto' | 'Centro Revisioni',
    key: 'nome' | 'telefono' | 'referente' | 'indirizzo',
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

  const getSpecialist = (
    tipo: 'Meccanico' | 'Gommista' | 'Carrozziere' | 'Elettrauto' | 'Centro Revisioni'
  ) => {
    return (
      formData.specialisti?.find((s) => s.tipo === tipo) || {
        tipo,
        nome: '',
        telefono: '',
      }
    );
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.marca || !formData.modello || !formData.targa) return;

    const newVehicle: Veicolo = {
      id: `veh-${Date.now()}`,
      targa: (formData.targa || '').toUpperCase().trim(),
      proprietario: formData.proprietario?.trim() || '',
      natoIlA: formData.natoIlA?.trim() || '',
      residenteIn: formData.residenteIn?.trim() || '',
      viaCorsoPiazza: formData.viaCorsoPiazza?.trim() || '',
      cellulare: formData.cellulare?.trim() || '',
      marca: formData.marca.trim(),
      modello: formData.modello.trim(),
      cilindrata: formData.cilindrata?.trim() || '',
      alimentazione: formData.alimentazione || 'DIESEL',
      annoAcquisto: formData.annoAcquisto?.trim() || new Date().getFullYear().toString(),
      importoBollo: Number(formData.importoBollo) || 0,
      scadenzaBollo: formData.scadenzaBollo || '',
      pagabileEntroBollo: formData.pagabileEntroBollo?.trim() || undefined,
      scadenzaRevisione: formData.scadenzaRevisione || '',
      frequenzaRevisione: formData.frequenzaRevisione,
      scadenzaAssicurazione: formData.scadenzaAssicurazione || '',
      frequenzaAssicurazione: formData.frequenzaAssicurazione,
      importoAssicurazione: Number(formData.importoAssicurazione) || 0,
      compagniaAssicurazione: formData.compagniaAssicurazione?.trim() || '',
      notificaMessaggioAttiva: formData.notificaMessaggioAttiva !== false,
      officina: formData.officina?.trim() || '',
      rifOfficina: formData.rifOfficina?.trim() || '',
      telefonoOfficina: formData.telefonoOfficina?.trim() || '',
      specialisti: formData.specialisti,
      dimensioniGomme: formData.dimensioniGomme?.trim() || 'Standard',
      pressioneAnteriore: formData.pressioneAnteriore?.trim() || '2.4 bar',
      pressionePosteriore: formData.pressionePosteriore?.trim() || '2.2 bar',
      kmAttuali: Number(formData.kmAttuali) || 0,
      immagine:
        formData.immagine ||
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
      note: formData.note?.trim() || '',
    };

    onAddVehicle(newVehicle);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[95vh] flex flex-col bg-[#111827] text-white rounded-t-3xl sm:rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-teal-700 px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Aggiungi Veicolo al Parco</h2>
              <p className="text-[11px] text-blue-200">Dati completi, foto, scadenze e officine</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-colors"
              title="Annulla"
            >
              <X size={18} />
            </button>
            <button
              type="submit"
              form="add-vehicle-form"
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer active:scale-95"
              title="Salva veicolo nel parco"
            >
              <Save size={15} />
              <span>Salva</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form id="add-vehicle-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* FOTO DEL VEICOLO */}
          <div className="p-4 rounded-2xl bg-[#152031] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Camera size={15} /> Foto del Veicolo
            </div>

            <div className="flex items-center gap-4">
              <div className="w-24 h-20 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0 relative flex items-center justify-center">
                {isCompressingPhoto ? (
                  <div className="flex flex-col items-center justify-center p-2 text-center text-blue-400">
                    <RefreshCw size={20} className="animate-spin mb-1" />
                    <span className="text-[9px] font-bold">Ottimizzazione...</span>
                  </div>
                ) : formData.immagine ? (
                  <img
                    src={formData.immagine}
                    alt="Foto Veicolo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Car size={32} className="text-slate-600" />
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <span className="text-xs font-bold text-white block">
                  Scatta o carica una foto
                </span>
                <p className="text-[11px] text-slate-400">
                  Visualizzata nel parco auto, nella scheda e nella cronologia.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95">
                    <Camera size={14} />
                    <span>Fotocamera</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95">
                    <ImageIcon size={14} />
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

          {/* GRUPPO 1: PROPRIETARIO */}
          <div className="p-4 rounded-2xl bg-[#152031] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800 text-blue-400 text-xs font-bold uppercase tracking-wider">
              <User size={15} /> 1. Dati Proprietario
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Proprietario *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome e Cognome"
                  value={formData.proprietario}
                  onChange={(e) => handleChange('proprietario', e.target.value)}
                  className="w-full bg-[#0d1522] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1 font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nato il / A</label>
                <input
                  type="text"
                  placeholder="es. 15/06/1982 a Roma"
                  value={formData.natoIlA}
                  onChange={(e) => handleChange('natoIlA', e.target.value)}
                  className="w-full bg-[#0d1522] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Residente in</label>
                <input
                  type="text"
                  placeholder="es. Milano (MI)"
                  value={formData.residenteIn}
                  onChange={(e) => handleChange('residenteIn', e.target.value)}
                  className="w-full bg-[#0d1522] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Via / Corso / Piazza</label>
                <input
                  type="text"
                  placeholder="es. Via Garibaldi, 12"
                  value={formData.viaCorsoPiazza}
                  onChange={(e) => handleChange('viaCorsoPiazza', e.target.value)}
                  className="w-full bg-[#0d1522] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Cellulare (per promemoria)</label>
                <input
                  type="tel"
                  placeholder="es. 333 1234567"
                  value={formData.cellulare}
                  onChange={(e) => handleChange('cellulare', e.target.value)}
                  className="w-full bg-[#0d1522] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1 font-mono font-bold text-emerald-300"
                />
              </div>
            </div>
          </div>

          {/* GRUPPO 2: DATI VEICOLO */}
          <div className="p-4 rounded-2xl bg-[#152031] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Car size={15} /> 2. Dati Veicolo
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Marca *</label>
                <input
                  type="text"
                  required
                  placeholder="es. Fiat, Audi, BMW, Volkswagen..."
                  value={formData.marca}
                  onChange={(e) => handleChange('marca', e.target.value)}
                  className="w-full bg-[#0d1522] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1 font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Modello *</label>
                <input
                  type="text"
                  required
                  placeholder="es. Panda, Golf, Qashqai..."
                  value={formData.modello}
                  onChange={(e) => handleChange('modello', e.target.value)}
                  className="w-full bg-[#0d1522] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1 font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Targa *</label>
                <input
                  type="text"
                  required
                  placeholder="es. AA 123 BB"
                  value={formData.targa}
                  onChange={(e) => handleChange('targa', e.target.value)}
                  className="w-full bg-[#0d1522] border border-slate-700 rounded-xl px-3 py-2 text-xs text-blue-400 font-mono font-black focus:outline-none focus:border-blue-500 mt-1 uppercase"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Cilindrata</label>
                <input
                  type="text"
                  placeholder="es. 1.6 TDI 115cv"
                  value={formData.cilindrata}
                  onChange={(e) => handleChange('cilindrata', e.target.value)}
                  className="w-full bg-[#0d1522] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Alimentazione</label>
                <select
                  value={formData.alimentazione}
                  onChange={(e) => handleChange('alimentazione', e.target.value)}
                  className="w-full bg-[#0d1522] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1 font-semibold cursor-pointer"
                >
                  <option value="DIESEL">DIESEL</option>
                  <option value="BENZINA">BENZINA</option>
                  <option value="IBRIDA">IBRIDA</option>
                  <option value="ELETTRICA">ELETTRICA</option>
                  <option value="GPL">GPL</option>
                  <option value="METANO">METANO</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Anno Acquisto</label>
                <input
                  type="text"
                  placeholder="es. 2021"
                  value={formData.annoAcquisto}
                  onChange={(e) => handleChange('annoAcquisto', e.target.value)}
                  className="w-full bg-[#0d1522] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">KM Attuali</label>
                <input
                  type="number"
                  placeholder="es. 125000"
                  value={formData.kmAttuali || ''}
                  onChange={(e) => handleChange('kmAttuali', Number(e.target.value))}
                  className="w-full bg-[#0d1522] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1 font-bold"
                />
              </div>
            </div>
          </div>

          {/* GRUPPO 3: SCADENZE REGOLAMENTARI & PERIODICITÀ */}
          <div className="p-4 rounded-2xl bg-[#152031] border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Calendar size={15} /> 3. Scadenze, Frequenze & Pagamento
            </div>

            {/* SEZIONE BOLLO AUTO */}
            <div className="p-3.5 rounded-xl bg-[#0c1322] border border-amber-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">Bollo Auto (Annuale)</span>
                <span className="text-[10px] text-slate-400">Tassa Regionale di Possesso</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">Scadenza Bollo</label>
                  <input
                    type="date"
                    value={formData.scadenzaBollo}
                    onChange={(e) => handleScadenzaBolloChange(e.target.value)}
                    className="w-full bg-[#152033] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 mt-1 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-amber-300 uppercase block">Pagabile Entro (Menu)</label>
                  <input
                    type="text"
                    placeholder="es. Tutto Settembre 2026"
                    value={formData.pagabileEntroBollo}
                    onChange={(e) => handleChange('pagabileEntroBollo', e.target.value)}
                    className="w-full bg-[#152033] border border-amber-500/50 rounded-xl px-3 py-2 text-xs text-amber-200 font-semibold focus:outline-none focus:border-amber-400 mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">Importo Bollo (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="es. 220"
                    value={formData.importoBollo || ''}
                    onChange={(e) => handleChange('importoBollo', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#152033] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 mt-1"
                  />
                </div>
              </div>
            </div>

            {/* SEZIONE REVISIONE MCTC */}
            <div className="p-3.5 rounded-xl bg-[#0c1322] border border-rose-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-300">Revisione Ministeriale MCTC</span>
                <span className="text-[10px] text-slate-400">Controllo Obbligatorio</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">Scadenza Revisione</label>
                  <input
                    type="date"
                    value={formData.scadenzaRevisione}
                    onChange={(e) => handleChange('scadenzaRevisione', e.target.value)}
                    className="w-full bg-[#152033] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400 mt-1 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-rose-300 uppercase block">Frequenza Revisione</label>
                  <select
                    value={formData.frequenzaRevisione || 'Auto (Normale)'}
                    onChange={(e) => handleChange('frequenzaRevisione', e.target.value)}
                    className="w-full bg-[#152033] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400 mt-1 font-semibold cursor-pointer"
                  >
                    <option value="Auto (Normale)">🚗 Auto Normale (Ogni 2 anni)</option>
                    <option value="Nuova Immatricolazione">✨ Nuova Auto (Dopo 4 anni)</option>
                    <option value="Speciale">🚕 Taxi / Autocarro / Noleggio (Ogni anno)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SEZIONE ASSICURAZIONE */}
            <div className="p-3.5 rounded-xl bg-[#0c1322] border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300">Polizza Assicurativa RCA</span>
                <span className="text-[10px] text-slate-400">Copertura e Rata</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">Scadenza Assicurazione</label>
                  <input
                    type="date"
                    value={formData.scadenzaAssicurazione}
                    onChange={(e) => handleChange('scadenzaAssicurazione', e.target.value)}
                    className="w-full bg-[#152033] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 mt-1 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-emerald-300 uppercase block">Frequenza Rate</label>
                  <select
                    value={formData.frequenzaAssicurazione || 'Semestrale'}
                    onChange={(e) => handleChange('frequenzaAssicurazione', e.target.value)}
                    className="w-full bg-[#152033] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 mt-1 font-semibold cursor-pointer"
                  >
                    <option value="Semestrale">Semestrale (2 rate l'anno - ogni 6 mesi)</option>
                    <option value="Annuale">Annuale (1 rata unica - ogni 12 mesi)</option>
                    <option value="Trimestrale">Trimestrale (4 rate l'anno - ogni 3 mesi)</option>
                    <option value="Mensile">Mensile (12 rate l'anno - ogni mese)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">Costo / Rata (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="es. 380"
                    value={formData.importoAssicurazione || ''}
                    onChange={(e) => handleChange('importoAssicurazione', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#152033] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">Compagnia Assicurativa</label>
                  <input
                    type="text"
                    placeholder="es. Generali, Allianz, UnipolSai, Prima..."
                    value={formData.compagniaAssicurazione}
                    onChange={(e) => handleChange('compagniaAssicurazione', e.target.value)}
                    className="w-full bg-[#152033] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 mt-1 font-medium"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* GRUPPO 4: OFFICINE & SPECIALISTI MULTIPLI (Meccanico, Gommista, Carrozziere, Elettrauto, Revisioni) */}
          <div className="p-4 rounded-2xl bg-[#152031] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800 text-orange-400 text-xs font-bold uppercase tracking-wider">
              <Building2 size={15} /> 4. Officine & Specialisti di Fiducia
            </div>

            {/* Tabs Specialisti */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
              {(['Meccanico', 'Gommista', 'Carrozziere', 'Elettrauto', 'Centro Revisioni'] as const).map((spec) => (
                <button
                  type="button"
                  key={spec}
                  onClick={() => setActiveSpecialistTab(spec)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                    activeSpecialistTab === spec
                      ? 'bg-orange-600 border-orange-500 text-white shadow-sm'
                      : 'bg-[#0d1522] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>

            {/* Specialista selezionato */}
            {(() => {
              const spec = getSpecialist(activeSpecialistTab);

              // Filtra officine salvate dal Menu Comune per questa categoria
              const relevantSalvate = (() => {
                const sameType = (officineAnagrafica || [])
                  .filter((o) => o.tipo === activeSpecialistTab)
                  .map((o) => o.nome.trim());
                const otherTypes = (officineAnagrafica || [])
                  .filter((o) => o.tipo !== activeSpecialistTab)
                  .map((o) => o.nome.trim());
                const remaining = (officineSalvate || []).filter(
                  (s) => !sameType.includes(s) && !otherTypes.includes(s)
                );
                return [...sameType, ...otherTypes, ...remaining];
              })();

              const tabAccent =
                activeSpecialistTab === 'Gommista'
                  ? 'cyan'
                  : activeSpecialistTab === 'Carrozziere'
                  ? 'purple'
                  : activeSpecialistTab === 'Elettrauto'
                  ? 'emerald'
                  : activeSpecialistTab === 'Centro Revisioni'
                  ? 'blue'
                  : 'orange';

              return (
                <div className="p-3.5 rounded-xl bg-[#0c1322] border border-slate-800 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-orange-300">
                    <span>Scheda {activeSpecialistTab}</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Collegata al Menu Comune Officine
                    </span>
                  </div>

                  {/* Selettore con elenco officine salvate e pulsante elimina */}
                  <OfficinaSelector
                    value={spec.nome}
                    onChange={(val) => {
                      handleSpecialistChange(activeSpecialistTab, 'nome', val);
                      if (activeSpecialistTab === 'Meccanico') {
                        handleChange('officina', val);
                      }
                    }}
                    officineSalvate={relevantSalvate}
                    officineAnagrafica={officineAnagrafica}
                    onDeleteOfficina={onDeleteOfficina}
                    onAddNewOfficina={(nome) =>
                      onAddNewOfficina?.(
                        nome,
                        activeSpecialistTab,
                        spec.telefono,
                        spec.referente
                      )
                    }
                    onSelectOfficinaDetails={(details) => {
                      handleSpecialistChange(activeSpecialistTab, 'nome', details.nome);
                      if (details.telefono) {
                        handleSpecialistChange(activeSpecialistTab, 'telefono', details.telefono);
                      }
                      if (details.referente) {
                        handleSpecialistChange(activeSpecialistTab, 'referente', details.referente);
                      }
                      if (activeSpecialistTab === 'Meccanico') {
                        handleChange('officina', details.nome);
                        if (details.telefono) handleChange('telefonoOfficina', details.telefono);
                        if (details.referente) handleChange('rifOfficina', details.referente);
                      }
                    }}
                    label={`Nome ${activeSpecialistTab} / Ragione Sociale`}
                    placeholder={`Nome del ${activeSpecialistTab.toLowerCase()} o seleziona dal Menu Comune...`}
                    accentColor={tabAccent}
                  />

                  {/* Recapiti aggiuntivi: Telefono e Referente */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-800/60">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">Telefono / Cellulare</label>
                      <input
                        type="tel"
                        placeholder="es. 0961 742110 o 333..."
                        value={spec.telefono}
                        onChange={(e) => {
                          handleSpecialistChange(activeSpecialistTab, 'telefono', e.target.value);
                          if (activeSpecialistTab === 'Meccanico') {
                            handleChange('telefonoOfficina', e.target.value);
                          }
                        }}
                        className="w-full bg-[#152033] border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-semibold focus:outline-none focus:border-orange-400 mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">
                        {activeSpecialistTab === 'Meccanico' ? 'Referente / Capo Officina' : 'Contatto / Note'}
                      </label>
                      <input
                        type="text"
                        placeholder="Nome referente"
                        value={spec.referente || ''}
                        onChange={(e) => {
                          handleSpecialistChange(activeSpecialistTab, 'referente', e.target.value);
                          if (activeSpecialistTab === 'Meccanico') {
                            handleChange('rifOfficina', e.target.value);
                          }
                        }}
                        className="w-full bg-[#152033] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-400 mt-1"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* GRUPPO 5: PNEUMATICI */}
          <div className="p-4 rounded-2xl bg-[#152031] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Disc size={15} /> 5. Dimensioni Gomme e Pressioni
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Dimensioni Gomme</label>
                <input
                  type="text"
                  placeholder="es. 205/55 R16 91V"
                  value={formData.dimensioniGomme}
                  onChange={(e) => handleChange('dimensioniGomme', e.target.value)}
                  className="w-full bg-[#0d1522] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 mt-1 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Pressione Anteriore</label>
                <input
                  type="text"
                  placeholder="es. 2.4 bar"
                  value={formData.pressioneAnteriore}
                  onChange={(e) => handleChange('pressioneAnteriore', e.target.value)}
                  className="w-full bg-[#0d1522] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Pressione Posteriore</label>
                <input
                  type="text"
                  placeholder="es. 2.2 bar"
                  value={formData.pressionePosteriore}
                  onChange={(e) => handleChange('pressionePosteriore', e.target.value)}
                  className="w-full bg-[#0d1522] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 mt-1"
                />
              </div>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
