import React, { useState, useMemo } from 'react';
import { CategoriaManutenzione, SottocategoriaManutenzione, LavorazioneItem } from '../types';
import { DEFAULT_CATALOG } from '../data/defaultCatalog';
import { DynamicIcon } from './DynamicIcon';
import {
  X,
  Search,
  Plus,
  Check,
  CheckCheck,
  Layers,
  Filter,
  Trash2,
  Pencil,
  Sparkles,
  ShieldCheck,
  FolderPlus,
  Palette,
  Wrench,
  Save,
  Copy,
} from 'lucide-react';

interface SelectedLavorazioneRef {
  lavorazioneId: string;
  nome: string;
  categoria: string;
  sottocategoria: string;
}

interface MaintenanceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogo: CategoriaManutenzione[];
  onUpdateCatalogo: (nuovoCatalogo: CategoriaManutenzione[]) => void;
  initialSelected: SelectedLavorazioneRef[];
  onConfirm: (selected: SelectedLavorazioneRef[]) => void;
}

const AVAILABLE_ICONS = [
  'Wrench',
  'Disc',
  'Droplet',
  'Droplets',
  'Zap',
  'Fan',
  'Filter',
  'Snowflake',
  'Cpu',
  'GitCommit',
  'Hammer',
  'Activity',
  'Shield',
  'Cog',
  'Fuel',
  'Flame',
  'Sparkles',
  'Gauge',
  'Battery',
  'Radio',
  'Compass',
  'Maximize2',
  'Link',
  'Box',
  'Repeat',
  'Target',
  'Wind',
  'Thermometer',
];

const AVAILABLE_COLORS = [
  '#f59e0b',
  '#eab308',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#64748b',
];

export const MaintenanceSelectorModal: React.FC<MaintenanceSelectorModalProps> = ({
  isOpen,
  onClose,
  catalogo,
  onUpdateCatalogo,
  initialSelected,
  onConfirm,
}) => {
  const [selectedItems, setSelectedItems] = useState<SelectedLavorazioneRef[]>(initialSelected || []);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sincronizza sempre le attività selezionate all'apertura
  React.useEffect(() => {
    if (isOpen) {
      setSelectedItems(initialSelected || []);
    }
  }, [isOpen, initialSelected]);

  // Active Category & Subcategory tabs
  const [activeCatIndex, setActiveCatIndex] = useState<number>(0);
  const [activeSubId, setActiveSubId] = useState<string>('');

  // Set degli ID predefiniti di fabbrica
  const defaultLavIds = useMemo(() => {
    const set = new Set<string>();
    DEFAULT_CATALOG.forEach((c) => {
      c.sottocategorie.forEach((s) => {
        s.lavorazioni.forEach((l) => set.add(l.id));
      });
    });
    return set;
  }, []);

  // Modal Aggiungi / Modifica Lavorazione
  const [editingLav, setEditingLav] = useState<{
    isOpen: boolean;
    id: string | null;
    nome: string;
    categoriaId: string;
    sottocategoriaId: string;
    iconName: string;
    coloreIcona: string;
    isDefault?: boolean;
  }>({
    isOpen: false,
    id: null,
    nome: '',
    categoriaId: '',
    sottocategoriaId: '',
    iconName: 'Wrench',
    coloreIcona: '#38bdf8',
  });

  // Modal Nuova Categoria
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatIcon, setNewCatIcon] = useState<string>('Wrench');

  // Modal Nuova Sottocategoria
  const [isAddingSubcategory, setIsAddingSubcategory] = useState<boolean>(false);
  const [newSubTargetCatId, setNewSubTargetCatId] = useState<string>('');
  const [newSubName, setNewSubName] = useState<string>('');

  const currentCategory = catalogo[activeCatIndex] || catalogo[0];
  const currentSubcategories = currentCategory?.sottocategorie || [];

  const effectiveActiveSub = useMemo(() => {
    if (activeSubId && currentSubcategories.some((s) => s.id === activeSubId)) {
      return activeSubId;
    }
    return currentSubcategories[0]?.id || '';
  }, [activeSubId, currentSubcategories]);

  const activeSubcategory = currentSubcategories.find((s) => s.id === effectiveActiveSub);

  // Filtered lavorazioni - ORDINATE IN ORDINE ALFABETICO (A-Z)
  const displayedLavorazioni = useMemo(() => {
    let list: { item: LavorazioneItem; catNome: string; subNome: string; catId: string; subId: string }[] = [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      catalogo.forEach((cat) => {
        cat.sottocategorie.forEach((sub) => {
          sub.lavorazioni.forEach((lav) => {
            if (
              lav.nome.toLowerCase().includes(q) ||
              cat.nome.toLowerCase().includes(q) ||
              sub.nome.toLowerCase().includes(q)
            ) {
              list.push({ item: lav, catNome: cat.nome, subNome: sub.nome, catId: cat.id, subId: sub.id });
            }
          });
        });
      });
    } else if (activeSubcategory && currentCategory) {
      list = activeSubcategory.lavorazioni.map((lav) => ({
        item: lav,
        catNome: currentCategory.nome,
        subNome: activeSubcategory.nome,
        catId: currentCategory.id,
        subId: activeSubcategory.id,
      }));
    }

    return list.sort((a, b) => a.item.nome.localeCompare(b.item.nome, 'it'));
  }, [searchQuery, catalogo, activeSubcategory, currentCategory]);

  const isSelected = (item: LavorazioneItem) => {
    return selectedItems.some(
      (s) =>
        s.lavorazioneId === item.id ||
        (s.nome && item.nome && s.nome.trim().toUpperCase() === item.nome.trim().toUpperCase())
    );
  };

  const toggleSelect = (
    item: LavorazioneItem,
    catNome: string,
    subNome: string
  ) => {
    if (isSelected(item)) {
      setSelectedItems((prev) =>
        prev.filter(
          (s) =>
            s.lavorazioneId !== item.id &&
            s.nome.trim().toUpperCase() !== item.nome.trim().toUpperCase()
        )
      );
    } else {
      setSelectedItems((prev) => [
        ...prev,
        {
          lavorazioneId: item.id,
          nome: item.nome,
          categoria: catNome,
          sottocategoria: subNome,
        },
      ]);
    }
  };

  // Gestione apertura Modifica Lavorazione (anche di DEFAULT!)
  const handleOpenEditLavorazione = (
    item: LavorazioneItem,
    catId: string,
    subId: string
  ) => {
    setEditingLav({
      isOpen: true,
      id: item.id,
      nome: item.nome,
      categoriaId: catId,
      sottocategoriaId: subId,
      iconName: item.iconName || 'Wrench',
      coloreIcona: item.coloreIcona || '#38bdf8',
      isDefault: defaultLavIds.has(item.id),
    });
  };

  // Gestione apertura Nuova Lavorazione
  const handleOpenAddLavorazione = () => {
    const targetCatId = currentCategory?.id || catalogo[0]?.id || '';
    const cat = catalogo.find((c) => c.id === targetCatId) || catalogo[0];
    const targetSubId = activeSubcategory?.id || cat?.sottocategorie[0]?.id || '';
    setEditingLav({
      isOpen: true,
      id: null,
      nome: '',
      categoriaId: targetCatId,
      sottocategoriaId: targetSubId,
      iconName: 'Wrench',
      coloreIcona: '#38bdf8',
      isDefault: false,
    });
  };

  // Salvataggio Lavorazione (nuova o modifica di default/personalizzata)
  const handleSaveLavorazione = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLav.nome.trim() || !editingLav.categoriaId || !editingLav.sottocategoriaId) return;

    const trimmedNome = editingLav.nome.trim().toUpperCase();
    const isEdit = !!editingLav.id;

    // Rimuovi la voce modificata da qualsiasi categoria
    const cleaned = catalogo.map((c) => ({
      ...c,
      sottocategorie: c.sottocategorie.map((s) => ({
        ...s,
        lavorazioni: isEdit
          ? s.lavorazioni.filter((l) => l.id !== editingLav.id)
          : [...s.lavorazioni],
      })),
    }));

    // Inserisci nella categoria/sottocategoria scelta
    const updated = cleaned.map((c) => {
      if (c.id !== editingLav.categoriaId) return c;
      return {
        ...c,
        sottocategorie: c.sottocategorie.map((s) => {
          if (s.id !== editingLav.sottocategoriaId) return s;
          const newItem: LavorazioneItem = {
            id: editingLav.id || `custom-lav-${Date.now()}`,
            nome: trimmedNome,
            categoriaId: c.id,
            sottocategoriaId: s.id,
            iconName: editingLav.iconName || 'Wrench',
            coloreIcona: editingLav.coloreIcona || '#38bdf8',
          };
          const list = [...s.lavorazioni, newItem];
          list.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
          return {
            ...s,
            lavorazioni: list,
          };
        }),
      };
    });

    onUpdateCatalogo(updated);

    // Se l'elemento modificato era selezionato, aggiorna anche la lista selezionata
    if (isEdit) {
      setSelectedItems((prev) =>
        prev.map((sel) =>
          sel.lavorazioneId === editingLav.id
            ? { ...sel, nome: trimmedNome }
            : sel
        )
      );
    }

    setEditingLav((prev) => ({ ...prev, isOpen: false }));
  };

  // Eliminazione Lavorazione (anche di default)
  const handleDeleteLavorazioneFromModal = (lavId: string) => {
    const updated = catalogo.map((c) => ({
      ...c,
      sottocategorie: c.sottocategorie.map((s) => ({
        ...s,
        lavorazioni: s.lavorazioni.filter((l) => l.id !== lavId),
      })),
    }));
    onUpdateCatalogo(updated);
    setSelectedItems((prev) => prev.filter((i) => i.lavorazioneId !== lavId));
    setEditingLav((prev) => ({ ...prev, isOpen: false }));
  };

  // Creazione nuova categoria
  const handleAddNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const nextNum = catalogo.length + 1;
    const catId = `cat-custom-${Date.now()}`;
    const initialSubId = `sub-${catId}-1`;
    const cleanName = newCatName.trim().toUpperCase();
    const finalName = cleanName.match(/^\d+\./) ? cleanName : `${nextNum}. ${cleanName}`;

    const newCat: CategoriaManutenzione = {
      id: catId,
      numero: nextNum,
      nome: finalName,
      iconName: newCatIcon || 'Wrench',
      sottocategorie: [
        {
          id: initialSubId,
          categoriaId: catId,
          nome: 'Lavorazioni Generali',
          lavorazioni: [],
        },
      ],
    };

    const updated = [...catalogo, newCat];
    onUpdateCatalogo(updated);
    setActiveCatIndex(catalogo.length);
    setActiveSubId(initialSubId);
    setNewCatName('');
    setIsAddingCategory(false);
  };

  // Creazione nuova sottocategoria
  const handleAddNewSubcategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() || !newSubTargetCatId) return;

    const subId = `sub-custom-${Date.now()}`;
    const cleanSubName = newSubName.trim();

    const updated = catalogo.map((c) => {
      if (c.id !== newSubTargetCatId) return c;
      const newSub: SottocategoriaManutenzione = {
        id: subId,
        categoriaId: c.id,
        nome: cleanSubName,
        lavorazioni: [],
      };
      return {
        ...c,
        sottocategorie: [...c.sottocategorie, newSub],
      };
    });

    onUpdateCatalogo(updated);
    setActiveSubId(subId);
    setNewSubName('');
    setIsAddingSubcategory(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col bg-[#111827] text-white rounded-t-3xl sm:rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header styling */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 px-5 py-3.5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[11px] font-extrabold tracking-widest uppercase text-orange-200 block">
              CARTRACKER PRO
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
              Seleziona attività di manutenzione
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Chiudi"
          >
            <X size={18} />
          </button>
        </div>

        {/* Subheader info and Quick Clear */}
        {selectedItems.length > 0 && (
          <div className="px-4 py-2 bg-[#141d2e] border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">
              <span className="text-blue-400 font-bold">{selectedItems.length}</span> attività selezionate
            </span>
            <button
              onClick={() => setSelectedItems([])}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 shrink-0 px-2 py-1 bg-rose-950/40 rounded-lg border border-rose-900/50 cursor-pointer"
            >
              <Trash2 size={13} /> Svuota selezione
            </button>
          </div>
        )}

        {/* Search input and Quick Actions */}
        <div className="px-4 py-2 bg-[#111827] border-b border-slate-800/80 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cerca lavorazione (es. Olio, Filtro, Freni, Candele)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e293b] border border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-1 flex-wrap text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Pencil size={11} className="text-orange-400" />
              Tocca la matita su qualsiasi lavorazione per modificarla
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenAddLavorazione}
                className="text-orange-400 hover:text-orange-300 font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <Plus size={12} /> Lavorazione
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewSubTargetCatId(currentCategory?.id || catalogo[0]?.id || '');
                  setIsAddingSubcategory(true);
                }}
                className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-0.5 cursor-pointer"
              >
                <Plus size={12} /> Sottocategoria
              </button>
              <button
                type="button"
                onClick={() => setIsAddingCategory(true)}
                className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-0.5 cursor-pointer"
              >
                <Plus size={12} /> Categoria
              </button>
            </div>
          </div>
        </div>

        {/* Categorie e Sottocategorie Tabs */}
        {!searchQuery && (
          <div className="bg-[#0f172a] border-b border-slate-800">
            {/* TIER 1: CATEGORIE PRINCIPALI */}
            <div className="px-3 pt-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Layers size={11} className="text-blue-400" /> Categorie ({catalogo.length})
                </span>
                <button
                  onClick={() => setIsAddingCategory(true)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5 font-medium cursor-pointer"
                >
                  <Plus size={12} /> Nuova categoria
                </button>
              </div>

              {/* Tabs bar categorie */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                {catalogo.map((cat, idx) => {
                  const isActive = idx === activeCatIndex;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveCatIndex(idx);
                        setActiveSubId(cat.sottocategorie[0]?.id || '');
                      }}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-900/30'
                          : 'bg-[#1e293b] border-slate-700/70 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                        isActive ? 'bg-white text-blue-700' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {cat.numero || idx + 1}
                      </span>
                      <span>{cat.nome.replace(/^\d+\.\s*/, '')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TIER 2: SOTTOCATEGORIE OF ACTIVE CATEGORY */}
            <div className="px-3 py-1.5 bg-[#0a0f1d] border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                  Sottocategorie di: {currentCategory?.nome}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNewSubTargetCatId(currentCategory?.id || '');
                    setIsAddingSubcategory(true);
                  }}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus size={11} /> Nuova sottocategoria
                </button>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {currentSubcategories.map((sub) => {
                  const isSubActive = sub.id === effectiveActiveSub;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setActiveSubId(sub.id)}
                      className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 border cursor-pointer ${
                        isSubActive
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                          : 'bg-[#182234] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {sub.nome} ({sub.lavorazioni.length})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TIER 3: GRID OF LAVORAZIONI */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {searchQuery && (
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-2">
              <Filter size={13} className="text-blue-400" />
              <span>Risultati per "{searchQuery}": {displayedLavorazioni.length} lavorazioni trovate</span>
            </div>
          )}

          {displayedLavorazioni.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <DynamicIcon name="AlertCircle" className="mx-auto mb-2 text-slate-600" size={32} />
              <p className="text-sm font-medium">Nessuna lavorazione trovata</p>
              <p className="text-xs text-slate-600 mt-1">Puoi aggiungerne una nuova con il pulsante qui sotto</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {displayedLavorazioni.map(({ item, catNome, subNome, catId, subId }) => {
                const selected = isSelected(item);
                const color = item.coloreIcona || '#38bdf8';
                const isDefault = defaultLavIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    className={`relative p-2 rounded-xl flex items-center justify-between gap-1.5 transition-all border group min-h-[50px] ${
                      selected
                        ? 'bg-[#18263e] border-blue-500 shadow-md shadow-blue-500/20 ring-1 ring-blue-500/50'
                        : 'bg-[#141d2e] border-slate-800/90 hover:bg-[#1a263c] text-slate-200'
                    }`}
                  >
                    {/* Area cliccabile principale per selezionare la lavorazione */}
                    <button
                      type="button"
                      onClick={() => toggleSelect(item, catNome, subNome)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
                    >
                      {/* Icona Colorata */}
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: `${color}20`,
                          borderColor: `${color}40`,
                        }}
                      >
                        <DynamicIcon
                          name={item.iconName || 'Wrench'}
                          size={15}
                          color={color}
                        />
                      </div>

                      {/* Nome e Indicatore Default */}
                      <div className="flex-1 min-w-0 pr-1">
                        <span className="text-[11px] sm:text-xs font-semibold leading-tight line-clamp-2 text-slate-100 block">
                          {item.nome}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isDefault ? (
                            <span className="text-[8px] text-blue-400 font-medium">Default</span>
                          ) : (
                            <span className="text-[8px] text-emerald-400 font-semibold">Personalizzata</span>
                          )}
                          {searchQuery && (
                            <span className="text-[8px] text-slate-400 truncate">
                              • {subNome}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Checkbox selezionato */}
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                          selected
                            ? 'bg-blue-500 border-blue-400 text-white'
                            : 'border-slate-700 bg-slate-800/40 text-transparent'
                        }`}
                      >
                        <Check size={11} strokeWidth={3} />
                      </div>
                    </button>

                    {/* Pulsante Modifica Rapida (Pencil) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditLavorazione(item, catId, subId);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-slate-700/60 transition-colors cursor-pointer shrink-0"
                      title="Modifica lavorazione (nome, categoria, icona o colore)"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                );
              })}

              {/* Add Custom Lavorazione Card */}
              {!searchQuery && (
                <button
                  type="button"
                  onClick={handleOpenAddLavorazione}
                  className="p-2.5 rounded-xl flex items-center gap-2.5 text-left border-2 border-dashed border-slate-700/80 hover:border-blue-400 bg-slate-900/40 hover:bg-blue-950/20 text-slate-300 hover:text-blue-300 transition-all min-h-[50px] cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-slate-300">
                    <Plus size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold block leading-tight">+ Nuova lavorazione</span>
                    <span className="text-[9px] text-slate-500 block">Aggiungi a questa categoria</span>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Selected items chip summary bar */}
        {selectedItems.length > 0 && (
          <div className="px-4 py-2 bg-[#0c1322] border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
            <span className="text-[10px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">
              Scelti ({selectedItems.length}):
            </span>
            {selectedItems.map((s) => (
              <span
                key={s.lavorazioneId}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-950 border border-blue-700 text-blue-300 shrink-0"
              >
                {s.nome}
                <button
                  onClick={() =>
                    setSelectedItems((prev) =>
                      prev.filter((i) => i.lavorazioneId !== s.lavorazioneId)
                    )
                  }
                  className="hover:text-white cursor-pointer"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Bottom CTA Bar */}
        <div className="p-4 bg-[#111827] border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-300">
            <span className="text-blue-400 text-sm font-bold">{selectedItems.length}</span> attività {selectedItems.length === 1 ? 'selezionata' : 'selezionate'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
            >
              Annulla
            </button>
            <button
              onClick={() => {
                onConfirm(selectedItems);
                onClose();
              }}
              disabled={selectedItems.length === 0}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-lg ${
                selectedItems.length > 0
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/40 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <CheckCheck size={16} />
              Aggiungi selezione ({selectedItems.length})
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MODAL INLINE: AGGIUNGI / MODIFICA LAVORAZIONE             */}
        {/* ========================================================= */}
        {editingLav.isOpen && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-30 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <form
              onSubmit={handleSaveLavorazione}
              className="w-full max-w-md bg-[#1e293b] p-5 rounded-2xl border border-slate-700 shadow-2xl space-y-3.5 my-auto"
            >
              <div className="flex justify-between items-center border-b border-slate-700/80 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                    <Wrench size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">
                      {editingLav.id ? 'Modifica Lavorazione' : 'Nuova Lavorazione'}
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      {editingLav.isDefault ? 'Lavorazione predefinita di default' : 'Attività personalizzata'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingLav((prev) => ({ ...prev, isOpen: false }))}
                    className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Annulla"
                  >
                    <X size={15} />
                  </button>

                  {editingLav.id && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLav((prev) => ({
                            ...prev,
                            id: null,
                            nome: `${prev.nome} (COPIA)`,
                          }));
                        }}
                        className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer active:scale-95"
                        title="Copia e duplica questa lavorazione"
                      >
                        <Copy size={13} />
                        <span>Copia</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteLavorazioneFromModal(editingLav.id!)}
                        className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer active:scale-95 shadow-sm"
                        title="Elimina lavorazione"
                      >
                        <Trash2 size={13} />
                        <span>Elimina</span>
                      </button>
                    </>
                  )}

                  <button
                    type="submit"
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1 transition-colors active:scale-95"
                    title={editingLav.id ? 'Salva modifiche' : 'Crea lavorazione'}
                  >
                    <Save size={13} />
                    <span>Salva</span>
                  </button>
                </div>
              </div>

              {/* Nome Lavorazione */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Nome Lavorazione *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Es. SOSTITUZIONE TERMOSTATO, LAVAGGIO CAMBIO..."
                  value={editingLav.nome}
                  onChange={(e) => setEditingLav({ ...editingLav, nome: e.target.value })}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white uppercase font-bold placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Categoria di Appartenenza
                </label>
                <select
                  value={editingLav.categoriaId}
                  onChange={(e) => {
                    const newCatId = e.target.value;
                    const cat = catalogo.find((c) => c.id === newCatId);
                    const firstSubId = cat?.sottocategorie[0]?.id || '';
                    setEditingLav({
                      ...editingLav,
                      categoriaId: newCatId,
                      sottocategoriaId: firstSubId,
                    });
                  }}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {catalogo.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sottocategoria */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Sottocategoria
                </label>
                <select
                  value={editingLav.sottocategoriaId}
                  onChange={(e) =>
                    setEditingLav({ ...editingLav, sottocategoriaId: e.target.value })
                  }
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {catalogo
                    .find((c) => c.id === editingLav.categoriaId)
                    ?.sottocategorie.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                </select>
              </div>

              {/* Icona */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Icona
                </label>
                <div className="grid grid-cols-7 gap-1 max-h-24 overflow-y-auto p-1 bg-[#0b111c] rounded-xl border border-slate-800 scrollbar-thin">
                  {AVAILABLE_ICONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setEditingLav({ ...editingLav, iconName })}
                      className={`p-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        editingLav.iconName === iconName
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#152033] text-slate-400 hover:text-white'
                      }`}
                    >
                      <DynamicIcon name={iconName} size={14} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Colore Icona */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Colore Icona
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {AVAILABLE_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setEditingLav({ ...editingLav, coloreIcona: col })}
                      style={{ backgroundColor: col }}
                      className={`w-5 h-5 rounded-full shrink-0 border ${
                        editingLav.coloreIcona === col ? 'ring-2 ring-white border-white' : 'border-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>

            </form>
          </div>
        )}

        {/* Modal: Add New Category */}
        {isAddingCategory && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex items-center justify-center p-4">
            <form
              onSubmit={handleAddNewCategory}
              className="w-full max-w-sm bg-[#1e293b] p-5 rounded-2xl border border-slate-700 shadow-2xl space-y-3"
            >
              <div className="flex justify-between items-center border-b border-slate-700/80 pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <FolderPlus size={16} className="text-amber-400" /> Nuova Categoria
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(false)}
                    className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                    title="Annulla"
                  >
                    <X size={15} />
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1 transition-colors active:scale-95"
                    title="Crea Categoria"
                  >
                    <Save size={13} />
                    <span>Salva</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase">Nome Categoria</label>
                <input
                  type="text"
                  required
                  placeholder="Es. ACCESSORI, MODIFICHE, CARROZZERIA..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 mt-1 uppercase"
                />
              </div>
            </form>
          </div>
        )}

        {/* Modal: Add New Subcategory */}
        {isAddingSubcategory && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex items-center justify-center p-4">
            <form
              onSubmit={handleAddNewSubcategory}
              className="w-full max-w-sm bg-[#1e293b] p-5 rounded-2xl border border-slate-700 shadow-2xl space-y-3"
            >
              <div className="flex justify-between items-center border-b border-slate-700/80 pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Layers size={16} className="text-amber-400" /> Nuova Sottocategoria
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAddingSubcategory(false)}
                    className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                    title="Annulla"
                  >
                    <X size={15} />
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1 transition-colors active:scale-95"
                    title="Crea Sottocategoria"
                  >
                    <Save size={13} />
                    <span>Salva</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase">Categoria Madre</label>
                <select
                  value={newSubTargetCatId}
                  onChange={(e) => setNewSubTargetCatId(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1"
                >
                  {catalogo.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase">Nome Sottocategoria</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Sospensioni Pneumatiche, Scarico..."
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 mt-1"
                />
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
