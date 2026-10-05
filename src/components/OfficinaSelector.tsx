import React, { useState, useMemo, useEffect } from 'react';
import { Building2, Plus, Check, Wrench, Landmark, Shield, X, Trash2 } from 'lucide-react';
import { AnagraficaOfficina, TipoOfficinaSpecialista } from '../types';

interface OfficinaSelectorProps {
  value: string;
  onChange: (val: string) => void;
  officineSalvate: string[];
  officineAnagrafica?: AnagraficaOfficina[];
  defaultTipo?: TipoOfficinaSpecialista;
  label?: string;
  sublabel?: string;
  placeholder?: string;
  accentColor?: 'blue' | 'cyan' | 'purple' | 'orange' | 'emerald';
  iconType?: 'officina' | 'ente' | 'assicurazione';
  addNewLabel?: string;
  onDeleteOfficina?: (nome: string) => void;
  onAddNewOfficina?: (nome: string, tipo?: TipoOfficinaSpecialista) => void;
  onSelectOfficinaDetails?: (details: { nome: string; telefono?: string; referente?: string; indirizzo?: string }) => void;
}

export const OfficinaSelector: React.FC<OfficinaSelectorProps> = ({
  value,
  onChange,
  officineSalvate,
  officineAnagrafica,
  defaultTipo,
  label = 'Officina / Centro Assistenza',
  sublabel,
  placeholder = 'Nome officina o specialista...',
  accentColor = 'blue',
  iconType = 'officina',
  addNewLabel = '+ Inserisci nuova',
  onDeleteOfficina,
  onAddNewOfficina,
  onSelectOfficinaDetails,
}) => {
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  // Deduplicazione insensibile a maiuscole/minuscole per evitare duplicati come FERA / fera
  const uniqueSalvate = useMemo(() => {
    const map = new Map<string, string>();
    officineSalvate.forEach((o) => {
      const clean = o?.trim();
      if (clean && clean.length > 1) {
        const key = clean.toLowerCase();
        if (!map.has(key)) {
          map.set(key, clean);
        }
      }
    });
    return Array.from(map.values());
  }, [officineSalvate]);

  // Controlla se il valore digitato corrisponde ad un'officina registrata nell'anagrafica comune
  const matchedAnagrafica = useMemo(() => {
    if (!value?.trim() || !officineAnagrafica) return null;
    const cleanVal = value.trim().toLowerCase();
    return (
      officineAnagrafica.find((o) => o.nome?.trim().toLowerCase() === cleanVal) || null
    );
  }, [value, officineAnagrafica]);

  // Se l'utente digita il nome esatto di un'officina esistente, sincronizza i dettagli
  useEffect(() => {
    if (matchedAnagrafica && onSelectOfficinaDetails) {
      onSelectOfficinaDetails({
        nome: matchedAnagrafica.nome,
        telefono: matchedAnagrafica.telefono,
        referente: matchedAnagrafica.referente,
        indirizzo: matchedAnagrafica.indirizzo,
      });
    }
  }, [matchedAnagrafica]);

  const isAlreadyInMenuComune = Boolean(matchedAnagrafica);

  const getBorderAccent = () => {
    if (accentColor === 'cyan') return 'focus:border-cyan-400 border-cyan-800/60';
    if (accentColor === 'purple') return 'focus:border-purple-400 border-purple-800/60';
    if (accentColor === 'orange') return 'focus:border-orange-400 border-orange-800/60';
    if (accentColor === 'emerald') return 'focus:border-emerald-400 border-emerald-800/60';
    return 'focus:border-blue-400 border-slate-700/80';
  };

  const getPillActiveBg = () => {
    if (accentColor === 'cyan') return 'bg-cyan-500 text-black border-cyan-400 font-bold';
    if (accentColor === 'purple') return 'bg-purple-600 text-white border-purple-400 font-bold';
    if (accentColor === 'orange') return 'bg-orange-500 text-white border-orange-400 font-bold';
    if (accentColor === 'emerald') return 'bg-emerald-600 text-white border-emerald-400 font-bold';
    return 'bg-blue-600 text-white border-blue-400 font-bold';
  };

  const renderIcon = (size: number = 13, className: string = 'text-slate-400') => {
    if (iconType === 'ente') return <Landmark size={size} className={className} />;
    if (iconType === 'assicurazione') return <Shield size={size} className={className} />;
    return <Building2 size={size} className={className} />;
  };

  const defaultSublabel = () => {
    if (sublabel) return sublabel;
    if (iconType === 'ente') return 'Seleziona dagli enti di riscossione:';
    if (iconType === 'assicurazione') return 'Seleziona dalle compagnie assicurative:';
    return 'Seleziona dalle officine e specialisti salvati:';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          {renderIcon(13, 'text-slate-400')}
          <span>{label}</span>
        </label>

        {uniqueSalvate.length > 0 && (
          <span className="text-[9px] text-slate-400 font-medium">
            {uniqueSalvate.length}{' '}
            {iconType === 'ente'
              ? uniqueSalvate.length === 1 ? 'ente salvato' : 'enti salvati'
              : iconType === 'assicurazione'
              ? uniqueSalvate.length === 1 ? 'compagnia salvata' : 'compagnie salvate'
              : uniqueSalvate.length === 1 ? 'officina salvata' : 'officine salvate'}
          </span>
        )}
      </div>

      {/* Pillole rapide con pulsante elimina integrato */}
      {uniqueSalvate.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">
            {defaultSublabel()}
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
            {uniqueSalvate.map((off) => {
              const isSelected = value.trim().toLowerCase() === off.toLowerCase();
              return (
                <div
                  key={off}
                  className={`inline-flex items-center rounded-xl text-xs border transition-all ${
                    isSelected
                      ? getPillActiveBg()
                      : 'bg-[#152033] hover:bg-[#1e2d47] text-slate-300 border-slate-700/80 hover:text-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(off);
                      setIsCustomMode(false);
                      setConfirmDelete(null);
                      if (officineAnagrafica && onSelectOfficinaDetails) {
                        const match = officineAnagrafica.find(
                          (o) => o.nome?.trim().toLowerCase() === off.trim().toLowerCase()
                        );
                        if (match) {
                          onSelectOfficinaDetails({
                            nome: match.nome,
                            telefono: match.telefono,
                            referente: match.referente,
                            indirizzo: match.indirizzo,
                          });
                        }
                      }
                    }}
                    className="px-2.5 py-1 flex items-center gap-1.5 cursor-pointer"
                    title={`Seleziona "${off}"`}
                  >
                    {renderIcon(12, isSelected ? 'text-inherit' : 'text-slate-400')}
                    <span className="truncate max-w-[150px]">{off}</span>
                    {isSelected && <Check size={12} strokeWidth={3} className="shrink-0" />}
                  </button>

                  {/* Pulsante Elimina Officina / Ente (✕) */}
                  {onDeleteOfficina && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (confirmDelete === off) {
                          onDeleteOfficina(off);
                          setConfirmDelete(null);
                          if (isSelected) onChange('');
                        } else {
                          setConfirmDelete(off);
                        }
                      }}
                      className={`px-1.5 py-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer shrink-0 border-l ${
                        isSelected ? 'border-white/20' : 'border-slate-800'
                      }`}
                      title={confirmDelete === off ? 'Clicca di nuovo per confermare l\'eliminazione' : `Elimina "${off}"`}
                    >
                      {confirmDelete === off ? (
                        <span className="text-[9px] bg-rose-600 text-white px-1 py-0.2 rounded font-bold animate-pulse">
                          Elimina?
                        </span>
                      ) : (
                        <X size={12} />
                      )}
                    </button>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setIsCustomMode(true);
                onChange('');
                setConfirmDelete(null);
              }}
              className="px-2.5 py-1 rounded-xl text-xs flex items-center gap-1 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 transition-colors cursor-pointer"
            >
              <Plus size={12} />
              <span>{addNewLabel}</span>
            </button>
          </div>
        </div>
      )}

      {/* Campo di testo per inserire o modificare l'officina/ente */}
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-[#172233] border rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 font-medium focus:outline-none ${getBorderAccent()}`}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs px-1"
            title="Cancella"
          >
            ✕
          </button>
        )}
      </div>

      {/* Badge di riconoscimento officina dal Menu Comune */}
      {matchedAnagrafica && (
        <div className="flex items-center justify-between p-2 rounded-xl bg-blue-950/40 border border-blue-500/40 text-xs animate-in fade-in">
          <div className="flex items-center gap-1.5 min-w-0">
            <Check size={13} className="text-blue-400 shrink-0" />
            <span className="text-blue-200 text-[11px] truncate">
              Riconosciuta nel Menu Comune: <strong>{matchedAnagrafica.nome}</strong> ({matchedAnagrafica.tipo})
              {matchedAnagrafica.telefono ? ` • Tel: ${matchedAnagrafica.telefono}` : ''}
              {matchedAnagrafica.referente ? ` • Rif: ${matchedAnagrafica.referente}` : ''}
            </span>
          </div>
        </div>
      )}

      {/* Suggerimento e tasto rapido per aggiungere la nuova officina al Menu Comune */}
      {onAddNewOfficina && value.trim().length > 1 && !isAlreadyInMenuComune && (
        <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs animate-in fade-in">
          <span className="text-emerald-300 text-[11px] truncate mr-2">
            Non ancora nel Menu Comune: "<strong>{value.trim()}</strong>" {defaultTipo ? `(${defaultTipo})` : ''}
          </span>
          <button
            type="button"
            onClick={() => {
              onAddNewOfficina(value.trim(), defaultTipo);
              setSavedFeedback(`✓ "${value.trim()}" aggiunta al Menu Comune!`);
              setTimeout(() => setSavedFeedback(null), 3500);
            }}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-sm shrink-0"
          >
            <Plus size={12} />
            <span>Salva nel Menu Comune</span>
          </button>
        </div>
      )}

      {savedFeedback && (
        <div className="p-2 rounded-xl bg-teal-950/80 border border-teal-500/60 text-teal-300 text-[11px] font-semibold flex items-center gap-1.5 animate-in fade-in">
          <Check size={13} className="text-teal-400 shrink-0" />
          <span>{savedFeedback}</span>
        </div>
      )}

      <p className="text-[10px] text-slate-400 italic">
        {iconType === 'ente'
          ? 'Puoi selezionare un ente o scriverne uno nuovo. Per eliminare un elemento clicca sulla ✕.'
          : iconType === 'assicurazione'
          ? 'Puoi selezionare una compagnia o scriverne una nuova. Per eliminare un elemento clicca sulla ✕.'
          : 'Puoi selezionare un\'officina salvata o scriverne una nuova. Per eliminare un\'officina clicca sulla ✕.'}
      </p>
    </div>
  );
};
