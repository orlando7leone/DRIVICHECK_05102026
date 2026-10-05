import React, { useState } from 'react';
import { AnagraficaOfficina, TipoOfficinaSpecialista } from '../types';
import { DEFAULT_OFFICINE } from '../data/defaultAnagrafiche';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Wrench,
  Disc,
  Zap,
  Hammer,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Phone,
  MapPin,
  User,
  FileText,
  Filter,
  AlertCircle,
  RefreshCw,
  Save,
  Copy,
} from 'lucide-react';

interface OfficineManagementSectionProps {
  officine: AnagraficaOfficina[];
  onUpdateOfficine: (officine: AnagraficaOfficina[]) => void;
  onResetOfficine?: () => void;
}

const TIPO_SPECIALISTA_LIST: TipoOfficinaSpecialista[] = [
  'Meccanico',
  'Gommista',
  'Carrozziere',
  'Elettrauto',
  'Centro Revisioni',
  'Altro',
];

export const OfficineManagementSection: React.FC<OfficineManagementSectionProps> = ({
  officine,
  onUpdateOfficine,
  onResetOfficine,
}) => {
  const [filterType, setFilterType] = useState<'Tutti' | TipoOfficinaSpecialista>('Tutti');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal Aggiungi / Modifica
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    nome: string;
    tipo: TipoOfficinaSpecialista;
    telefono: string;
    referente: string;
    indirizzo: string;
    citta: string;
    note: string;
  }>({
    nome: '',
    tipo: 'Meccanico',
    telefono: '',
    referente: '',
    indirizzo: '',
    citta: '',
    note: '',
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Dialog di conferma eliminazione
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    modeOptions?: boolean;
    onConfirmMerge?: () => void;
    onConfirmOverwrite?: () => void;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
  });

  const getTipoBadge = (tipo: TipoOfficinaSpecialista) => {
    switch (tipo) {
      case 'Meccanico':
        return { label: 'Meccanico', icon: Wrench, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'Gommista':
        return { label: 'Gommista', icon: Disc, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
      case 'Carrozziere':
        return { label: 'Carrozziere', icon: Hammer, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      case 'Elettrauto':
        return { label: 'Elettrauto', icon: Zap, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
      case 'Centro Revisioni':
        return { label: 'Centro Revisioni', icon: Search, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      default:
        return { label: 'Altro', icon: Building2, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      nome: '',
      tipo: filterType !== 'Tutti' ? filterType : 'Meccanico',
      telefono: '',
      referente: '',
      indirizzo: '',
      citta: '',
      note: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (off: AnagraficaOfficina) => {
    setEditingId(off.id);
    setFormData({
      nome: off.nome,
      tipo: off.tipo,
      telefono: off.telefono || '',
      referente: off.referente || '',
      indirizzo: off.indirizzo || '',
      citta: off.citta || '',
      note: off.note || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) return;

    if (editingId) {
      // Modifica esistente
      const updated = officine.map((o) =>
        o.id === editingId
          ? {
              ...o,
              nome: formData.nome.trim(),
              tipo: formData.tipo,
              telefono: formData.telefono.trim(),
              referente: formData.referente.trim(),
              indirizzo: formData.indirizzo.trim(),
              citta: formData.citta.trim(),
              note: formData.note.trim(),
            }
          : o
      );
      onUpdateOfficine(updated);
      setFeedback({ type: 'success', text: `✓ Officina "${formData.nome.trim()}" aggiornata con successo!` });
    } else {
      // Nuova officina
      const newOff: AnagraficaOfficina = {
        id: `off-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        nome: formData.nome.trim(),
        tipo: formData.tipo,
        telefono: formData.telefono.trim(),
        referente: formData.referente.trim(),
        indirizzo: formData.indirizzo.trim(),
        citta: formData.citta.trim(),
        note: formData.note.trim(),
      };
      onUpdateOfficine([newOff, ...officine]);
      setFeedback({ type: 'success', text: `✓ Nuova officina "${formData.nome.trim()}" aggiunta!` });
    }

    setIsModalOpen(false);
  };

  const handleDeleteOfficina = (off: AnagraficaOfficina) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminare questa officina?',
      description: `Rimuovere "${off.nome}" dall'anagrafica comune del parco auto? I record storici già salvati non verranno modificati.`,
      onConfirm: () => {
        const updated = officine.filter((o) => o.id !== off.id);
        onUpdateOfficine(updated);
        setFeedback({ type: 'info', text: `Officina "${off.nome}" rimossa dall'elenco.` });
        setConfirmDialog({ isOpen: false, title: '', description: '', onConfirm: () => {} });
      },
    });
  };

  // Filtra officine per ricerca e tipo
  const filteredOfficine = officine.filter((o) => {
    if (filterType !== 'Tutti' && o.tipo !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.nome.toLowerCase().includes(q) ||
        (o.citta && o.citta.toLowerCase().includes(q)) ||
        (o.referente && o.referente.toLowerCase().includes(q)) ||
        (o.telefono && o.telefono.includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toast feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl flex items-center justify-between gap-2.5 text-xs animate-in slide-in-from-top-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-600/70 text-emerald-200'
              : feedback.type === 'error'
              ? 'bg-rose-950/40 border-rose-600/70 text-rose-200'
              : 'bg-blue-950/40 border-blue-600/70 text-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            ) : feedback.type === 'error' ? (
              <AlertTriangle size={16} className="text-rose-400 shrink-0" />
            ) : (
              <Building2 size={16} className="text-blue-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-black/30 rounded-lg text-slate-400 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Riquadro Principale Anagrafica Officine */}
      <div className="rounded-3xl bg-[#141e2e] border border-slate-800 shadow-xl p-4 space-y-4">
        {/* Header con pulsante Aggiungi e Ripristina predefinito */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
              <Building2 size={16} /> 2. Officine & Specialisti del Parco Auto
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Anagrafica condivisa comune: Meccanici, Carrozzerie, Elettrauto, Gommisti e Centri Revisioni
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onResetOfficine && (
              <button
                type="button"
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Ripristinare le officine predefinite?',
                    description: 'Verranno ripristinate le officine standard iniziali.',
                    onConfirm: () => {
                      onResetOfficine();
                      setConfirmDialog({ isOpen: false, title: '', description: '', onConfirm: () => {} });
                      setFeedback({ type: 'info', text: 'Elenco officine predefinito ripristinato.' });
                    },
                  })
                }
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold px-2 py-1"
              >
                Predefinite
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-900/40 cursor-pointer transition-all"
            >
              <Plus size={15} />
              <span>+ Inserisci Nuova</span>
            </button>
          </div>
        </div>

        {/* Barra di Ricerca e Filtri per Tipologia */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Cerca officina per nome, città, referente o telefono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d1522] border border-slate-800 rounded-2xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          {/* Filtro Tipologie Specialista */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mr-1">
              <Filter size={11} /> Filtra:
            </span>
            <button
              type="button"
              onClick={() => setFilterType('Tutti')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'Tutti'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              Tutte ({officine.length})
            </button>

            {TIPO_SPECIALISTA_LIST.map((tipo) => {
              const count = officine.filter((o) => o.tipo === tipo).length;
              const isSelected = filterType === tipo;
              const badge = getTipoBadge(tipo);
              const Icon = badge.icon;
              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setFilterType(tipo)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  <Icon size={12} className={isSelected ? 'text-white' : 'text-slate-400'} />
                  <span>{tipo}</span>
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Elenco Officine & Specialisti Salvati */}
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {filteredOfficine.length === 0 ? (
            <div className="p-8 text-center bg-[#0d1522] rounded-2xl border border-slate-800/80 text-xs text-slate-400 space-y-2">
              <Building2 size={28} className="mx-auto text-slate-600" />
              <p>Nessuna officina trovata con i filtri selezionati.</p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-xs font-semibold cursor-pointer"
              >
                Aggiungi ora una nuova officina
              </button>
            </div>
          ) : (
            filteredOfficine.map((off) => {
              const badge = getTipoBadge(off.tipo);
              const Icon = badge.icon;
              return (
                <div
                  key={off.id}
                  className="p-3.5 rounded-2xl bg-[#0e1625] hover:bg-[#121c2e] border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${badge.color}`}>
                        <Icon size={11} />
                        <span>{badge.label}</span>
                      </span>
                      <span className="text-sm font-bold text-white truncate">{off.nome}</span>
                    </div>

                    <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                      {off.telefono && (
                        <a
                          href={`tel:${off.telefono}`}
                          className="flex items-center gap-1 text-blue-400 hover:underline"
                        >
                          <Phone size={12} />
                          <span>{off.telefono}</span>
                        </a>
                      )}
                      {off.referente && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <User size={12} />
                          <span>Ref: {off.referente}</span>
                        </span>
                      )}
                      {(off.indirizzo || off.citta) && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <MapPin size={12} />
                          <span>{[off.indirizzo, off.citta].filter(Boolean).join(', ')}</span>
                        </span>
                      )}
                    </div>

                    {off.note && (
                      <p className="text-[11px] text-slate-400 italic line-clamp-1 pt-0.5">
                        "{off.note}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(off)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Modifica officina"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteOfficina(off)}
                      className="p-2 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 border border-rose-800/40 transition-colors cursor-pointer"
                      title="Elimina officina"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODALE INSERISCI / MODIFICA OFFICINA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#101927] border border-slate-700 w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 leading-tight">
                <Building2 size={16} className="text-blue-400 shrink-0" />
                <span>{editingId ? 'Modifica Officina / Specialista' : 'Nuova Officina / Specialista'}</span>
              </h4>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Annulla"
                >
                  <X size={16} />
                </button>

                {editingId && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setFormData((prev) => ({
                          ...prev,
                          nome: `${prev.nome} (Copia)`,
                        }));
                      }}
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer active:scale-95"
                      title="Duplica questa officina"
                    >
                      <Copy size={14} />
                      <span>Copia</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const offToDelete = officine.find((o) => o.id === editingId);
                        setIsModalOpen(false);
                        if (offToDelete) {
                          handleDeleteOfficina(offToDelete);
                        }
                      }}
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer active:scale-95 shadow-sm"
                      title="Elimina officina"
                    >
                      <Trash2 size={14} />
                      <span>Elimina</span>
                    </button>
                  </>
                )}

                <button
                  type="submit"
                  form="officina-form"
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer active:scale-95"
                  title={editingId ? 'Salva modifiche officina' : 'Crea nuova officina'}
                >
                  <Save size={14} />
                  <span>Salva</span>
                </button>
              </div>
            </div>

            <form id="officina-form" onSubmit={handleSaveModal} className="space-y-3">
              {/* Nome */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Nome Officina / Specialista *
                </label>
                <input
                  type="text"
                  required
                  placeholder="es. FERA, Patamia, Autofficina Rossi..."
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full bg-[#172233] border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              {/* Tipologia */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Tipologia Specialista
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoOfficinaSpecialista })}
                  className="w-full bg-[#172233] border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 font-medium"
                >
                  {TIPO_SPECIALISTA_LIST.map((t) => (
                    <option key={t} value={t} className="bg-[#101927]">
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Telefono e Referente */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Telefono
                  </label>
                  <input
                    type="tel"
                    placeholder="es. 02 1234567"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full bg-[#172233] border border-slate-700 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Referente
                  </label>
                  <input
                    type="text"
                    placeholder="es. Mario"
                    value={formData.referente}
                    onChange={(e) => setFormData({ ...formData, referente: e.target.value })}
                    className="w-full bg-[#172233] border border-slate-700 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* Indirizzo e Città */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Indirizzo
                  </label>
                  <input
                    type="text"
                    placeholder="es. Via Roma 10"
                    value={formData.indirizzo}
                    onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
                    className="w-full bg-[#172233] border border-slate-700 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Città
                  </label>
                  <input
                    type="text"
                    placeholder="es. Milano"
                    value={formData.citta}
                    onChange={(e) => setFormData({ ...formData, citta: e.target.value })}
                    className="w-full bg-[#172233] border border-slate-700 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Note aggiuntive
                </label>
                <textarea
                  rows={2}
                  placeholder="Orari, convenzioni, specializzazioni..."
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full bg-[#172233] border border-slate-700 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Dialog Conferma Eliminazione / Ripristino */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#101927] border border-slate-700 w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-white">{confirmDialog.title}</h4>
            <p className="text-xs text-slate-300 leading-relaxed">{confirmDialog.description}</p>
            {confirmDialog.modeOptions ? (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={confirmDialog.onConfirmMerge}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Aggiungi / Unisci alle Esistenti</span>
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirmOverwrite}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={14} />
                  <span>Sostituisci Tutto l'Elenco</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDialog({ isOpen: false, title: '', description: '', onConfirm: () => {} })}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold cursor-pointer"
                >
                  Annulla
                </button>
              </div>
            ) : (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmDialog({ isOpen: false, title: '', description: '', onConfirm: () => {} })}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
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
