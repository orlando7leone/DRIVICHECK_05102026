import React, { useState, useMemo, useEffect } from 'react';
import { CategoriaManutenzione, SottocategoriaManutenzione, LavorazioneItem } from '../types';
import { DEFAULT_CATALOG } from '../data/defaultCatalog';
import { DynamicIcon } from './DynamicIcon';
import {
  FolderSync,
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Layers,
  Wrench,
  Check,
  RotateCcw,
  Palette,
  FolderPlus,
  List,
  Network,
  ShieldCheck,
  Tag,
  Filter,
  AlertCircle,
  Save,
  Copy,
} from 'lucide-react';

interface LavorazioniManagementSectionProps {
  catalogo: CategoriaManutenzione[];
  onUpdateCatalogo: (catalogo: CategoriaManutenzione[]) => void;
  onResetCatalog?: () => void;
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
  '#f59e0b', // Amber
  '#eab308', // Yellow
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#64748b', // Slate
];

export const LavorazioniManagementSection: React.FC<LavorazioniManagementSectionProps> = ({
  catalogo,
  onUpdateCatalogo,
  onResetCatalog,
}) => {
  // Modalità di visualizzazione: 'elenco' (stile Officine & Specialisti) o 'albero' (gerarchico)
  const [viewMode, setViewMode] = useState<'elenco' | 'albero'>('elenco');

  // Ricerca e filtri
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all');
  const [filterOrigin, setFilterOrigin] = useState<'tutte' | 'default' | 'personalizzate'>('tutte');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Modali Aggiungi / Modifica Lavorazione
  const [isLavorazioneModalOpen, setIsLavorazioneModalOpen] = useState(false);
  const [editingLavorazioneId, setEditingLavorazioneId] = useState<string | null>(null);
  const [lavorazioneForm, setLavorazioneForm] = useState<{
    nome: string;
    categoriaId: string;
    sottocategoriaId: string;
    iconName: string;
    coloreIcona: string;
  }>({
    nome: '',
    categoriaId: '',
    sottocategoriaId: '',
    iconName: 'Wrench',
    coloreIcona: '#f59e0b',
  });

  // Modal Aggiungi / Modifica Categoria
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<{
    nome: string;
    iconName: string;
  }>({
    nome: '',
    iconName: 'Wrench',
  });

  // Modal Aggiungi / Modifica Sottocategoria
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [subcategoryForm, setSubcategoryForm] = useState<{
    categoriaId: string;
    nome: string;
  }>({
    categoriaId: '',
    nome: '',
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Dialog di conferma
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Espandi di default tutte le categorie all'avvio
  useEffect(() => {
    if (catalogo.length > 0 && Object.keys(expandedCategories).length === 0) {
      const initial: Record<string, boolean> = {};
      catalogo.forEach((c) => {
        initial[c.id] = true;
      });
      setExpandedCategories(initial);
    }
  }, [catalogo]);

  // ID predefiniti di fabbrica
  const defaultLavIds = useMemo(() => {
    const set = new Set<string>();
    DEFAULT_CATALOG.forEach((c) => {
      c.sottocategorie.forEach((s) => {
        s.lavorazioni.forEach((l) => set.add(l.id));
      });
    });
    return set;
  }, []);

  // Lista piatta di tutte le lavorazioni (per vista a elenco identica a Officine & Specialisti)
  const allLavorazioniFlat = useMemo(() => {
    const list: {
      lav: LavorazioneItem;
      cat: CategoriaManutenzione;
      sub: SottocategoriaManutenzione;
      isDefault: boolean;
    }[] = [];
    catalogo.forEach((cat) => {
      cat.sottocategorie.forEach((sub) => {
        sub.lavorazioni.forEach((lav) => {
          list.push({
            lav,
            cat,
            sub,
            isDefault: defaultLavIds.has(lav.id),
          });
        });
      });
    });
    return list;
  }, [catalogo, defaultLavIds]);

  // Conteggi statistici
  const totalLavorazioni = allLavorazioniFlat.length;
  const countDefault = useMemo(() => allLavorazioniFlat.filter((item) => item.isDefault).length, [allLavorazioniFlat]);
  const countCustom = totalLavorazioni - countDefault;

  const totalSottocategorie = useMemo(() => {
    return catalogo.reduce((acc, c) => acc + c.sottocategorie.length, 0);
  }, [catalogo]);

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // ==========================================
  // GESTIONE LAVORAZIONI
  // ==========================================
  const handleOpenAddLavorazione = (initialCatId?: string, initialSubId?: string) => {
    setEditingLavorazioneId(null);
    const catId = initialCatId || catalogo[0]?.id || '';
    const cat = catalogo.find((c) => c.id === catId) || catalogo[0];
    const subId = initialSubId || cat?.sottocategorie[0]?.id || '';
    setLavorazioneForm({
      nome: '',
      categoriaId: catId,
      sottocategoriaId: subId,
      iconName: 'Wrench',
      coloreIcona: '#f59e0b',
    });
    setIsLavorazioneModalOpen(true);
  };

  const handleOpenEditLavorazione = (
    lav: LavorazioneItem,
    catId: string,
    subId: string
  ) => {
    setEditingLavorazioneId(lav.id);
    setLavorazioneForm({
      nome: lav.nome,
      categoriaId: catId,
      sottocategoriaId: subId,
      iconName: lav.iconName || 'Wrench',
      coloreIcona: lav.coloreIcona || '#f59e0b',
    });
    setIsLavorazioneModalOpen(true);
  };

  const handleSaveLavorazione = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lavorazioneForm.nome.trim()) {
      setFeedback({ type: 'error', text: 'Inserisci il nome della lavorazione.' });
      return;
    }
    if (!lavorazioneForm.categoriaId || !lavorazioneForm.sottocategoriaId) {
      setFeedback({ type: 'error', text: 'Seleziona una categoria e una sottocategoria valide.' });
      return;
    }

    const trimmedNome = lavorazioneForm.nome.trim().toUpperCase();
    const isEdit = !!editingLavorazioneId;

    // Rimuovi prima la lavorazione modificata da qualsiasi categoria/sottocategoria
    const cleanedCatalog = catalogo.map((cat) => ({
      ...cat,
      sottocategorie: cat.sottocategorie.map((sub) => ({
        ...sub,
        lavorazioni: isEdit
          ? sub.lavorazioni.filter((l) => l.id !== editingLavorazioneId)
          : [...sub.lavorazioni],
      })),
    }));

    // Inserisci nella categoria e sottocategoria scelte dall'utente
    const updatedCatalog = cleanedCatalog.map((cat) => {
      if (cat.id !== lavorazioneForm.categoriaId) return cat;
      return {
        ...cat,
        sottocategorie: cat.sottocategorie.map((sub) => {
          if (sub.id !== lavorazioneForm.sottocategoriaId) return sub;
          const newItem: LavorazioneItem = {
            id: editingLavorazioneId || `lav-custom-${Date.now()}`,
            nome: trimmedNome,
            categoriaId: cat.id,
            sottocategoriaId: sub.id,
            iconName: lavorazioneForm.iconName || 'Wrench',
            coloreIcona: lavorazioneForm.coloreIcona || '#f59e0b',
          };
          const list = [...sub.lavorazioni, newItem];
          list.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
          return {
            ...sub,
            lavorazioni: list,
          };
        }),
      };
    });

    onUpdateCatalogo(updatedCatalog);
    setIsLavorazioneModalOpen(false);
    setFeedback({
      type: 'success',
      text: isEdit
        ? `✓ Lavorazione "${trimmedNome}" modificata con successo!`
        : `✓ Nuova lavorazione "${trimmedNome}" aggiunta al catalogo comune!`,
    });
  };

  const handleDeleteLavorazione = (lav: LavorazioneItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminare questa lavorazione?',
      description: `La lavorazione "${lav.nome}" verrà rimossa dal catalogo comune. Potrai ripristinarla in qualsiasi momento cliccando su "Ripristina Default".`,
      onConfirm: () => {
        const updated = catalogo.map((cat) => ({
          ...cat,
          sottocategorie: cat.sottocategorie.map((sub) => ({
            ...sub,
            lavorazioni: sub.lavorazioni.filter((l) => l.id !== lav.id),
          })),
        }));
        onUpdateCatalogo(updated);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setFeedback({
          type: 'info',
          text: `Lavorazione "${lav.nome}" eliminata dal catalogo.`,
        });
      },
    });
  };

  // ==========================================
  // GESTIONE SOTTOCATEGORIE
  // ==========================================
  const handleOpenAddSubcategory = (initialCatId?: string) => {
    setEditingSubcategoryId(null);
    setSubcategoryForm({
      categoriaId: initialCatId || catalogo[0]?.id || '',
      nome: '',
    });
    setIsSubcategoryModalOpen(true);
  };

  const handleOpenEditSubcategory = (sub: SottocategoriaManutenzione, catId: string) => {
    setEditingSubcategoryId(sub.id);
    setSubcategoryForm({
      categoriaId: catId,
      nome: sub.nome,
    });
    setIsSubcategoryModalOpen(true);
  };

  const handleSaveSubcategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcategoryForm.nome.trim()) {
      setFeedback({ type: 'error', text: 'Inserisci il nome della sottocategoria.' });
      return;
    }
    const trimmedNome = subcategoryForm.nome.trim();
    const isEdit = !!editingSubcategoryId;

    let subToMove: SottocategoriaManutenzione | undefined;
    if (isEdit) {
      for (const cat of catalogo) {
        const found = cat.sottocategorie.find((s) => s.id === editingSubcategoryId);
        if (found) {
          subToMove = {
            ...found,
            nome: trimmedNome,
            categoriaId: subcategoryForm.categoriaId,
            // Aggiorna anche la categoriaId di tutte le lavorazioni interne
            lavorazioni: found.lavorazioni.map((l) => ({
              ...l,
              categoriaId: subcategoryForm.categoriaId,
            })),
          };
          break;
        }
      }
    }

    // Rimuovi la vecchia sottocategoria se in modifica
    const withoutSub = catalogo.map((cat) => ({
      ...cat,
      sottocategorie: isEdit
        ? cat.sottocategorie.filter((s) => s.id !== editingSubcategoryId)
        : [...cat.sottocategorie],
    }));

    // Inserisci nella categoria di destinazione
    const updated = withoutSub.map((cat) => {
      if (cat.id !== subcategoryForm.categoriaId) return cat;
      const newSub: SottocategoriaManutenzione = isEdit && subToMove
        ? subToMove
        : {
            id: `sub-custom-${Date.now()}`,
            categoriaId: cat.id,
            nome: trimmedNome,
            lavorazioni: [],
          };
      return {
        ...cat,
        sottocategorie: [...cat.sottocategorie, newSub],
      };
    });

    onUpdateCatalogo(updated);
    setIsSubcategoryModalOpen(false);
    setFeedback({
      type: 'success',
      text: isEdit
        ? `✓ Sottocategoria "${trimmedNome}" modificata con successo!`
        : `✓ Sottocategoria "${trimmedNome}" creata con successo!`,
    });
  };

  const handleDeleteSubcategory = (cat: CategoriaManutenzione, sub: SottocategoriaManutenzione) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminare questa sottocategoria?',
      description: `La sottocategoria "${sub.nome}" contiene ${sub.lavorazioni.length} lavorazioni. Tutte le lavorazioni al suo interno verranno rimosse.`,
      onConfirm: () => {
        const updated = catalogo.map((c) => {
          if (c.id !== cat.id) return c;
          return {
            ...c,
            sottocategorie: c.sottocategorie.filter((s) => s.id !== sub.id),
          };
        });
        onUpdateCatalogo(updated);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setFeedback({
          type: 'info',
          text: `Sottocategoria "${sub.nome}" e le sue lavorazioni sono state eliminate.`,
        });
      },
    });
  };

  // ==========================================
  // GESTIONE CATEGORIE
  // ==========================================
  const handleOpenAddCategory = () => {
    setEditingCategoryId(null);
    setCategoryForm({
      nome: '',
      iconName: 'Wrench',
    });
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: CategoriaManutenzione) => {
    setEditingCategoryId(cat.id);
    setCategoryForm({
      nome: cat.nome,
      iconName: cat.iconName || 'Wrench',
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.nome.trim()) {
      setFeedback({ type: 'error', text: 'Inserisci il nome della categoria.' });
      return;
    }
    const trimmedNome = categoryForm.nome.trim();
    const isEdit = !!editingCategoryId;

    let updated: CategoriaManutenzione[];
    if (isEdit) {
      updated = catalogo.map((c) =>
        c.id === editingCategoryId
          ? { ...c, nome: trimmedNome, iconName: categoryForm.iconName }
          : c
      );
    } else {
      const nextNum = catalogo.length + 1;
      const prefixedName = trimmedNome.match(/^\d+\./) ? trimmedNome : `${nextNum}. ${trimmedNome}`;
      const newCatId = `cat-custom-${Date.now()}`;
      const newCat: CategoriaManutenzione = {
        id: newCatId,
        numero: nextNum,
        nome: prefixedName,
        iconName: categoryForm.iconName || 'Wrench',
        sottocategorie: [
          {
            id: `sub-${newCatId}-1`,
            categoriaId: newCatId,
            nome: 'Lavorazioni Generali',
            lavorazioni: [],
          },
        ],
      };
      updated = [...catalogo, newCat];
    }

    onUpdateCatalogo(updated);
    setIsCategoryModalOpen(false);
    setFeedback({
      type: 'success',
      text: isEdit
        ? `✓ Categoria "${trimmedNome}" modificata!`
        : `✓ Nuova categoria "${trimmedNome}" creata con successo!`,
    });
  };

  const handleDeleteCategory = (cat: CategoriaManutenzione) => {
    const lavCount = cat.sottocategorie.reduce((acc, s) => acc + s.lavorazioni.length, 0);
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminare questa intera categoria?',
      description: `Stai per eliminare "${cat.nome}" che comprende ${cat.sottocategorie.length} sottocategorie e ${lavCount} lavorazioni.`,
      onConfirm: () => {
        const updated = catalogo.filter((c) => c.id !== cat.id);
        onUpdateCatalogo(updated);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setFeedback({
          type: 'info',
          text: `Categoria "${cat.nome}" eliminata.`,
        });
      },
    });
  };

  // Filtraggio lista piatta per vista ELENCO (esattamente come in Officine & Specialisti)
  const filteredFlatLavorazioni = useMemo(() => {
    let list = allLavorazioniFlat;

    // Filtro per tipologia di origine: tutte, solo default, solo personalizzate
    if (filterOrigin === 'default') {
      list = list.filter((item) => item.isDefault);
    } else if (filterOrigin === 'personalizzate') {
      list = list.filter((item) => !item.isDefault);
    }

    // Filtro per categoria selezionata
    if (selectedCatFilter !== 'all') {
      list = list.filter((item) => item.cat.id === selectedCatFilter);
    }

    // Ricerca testuale
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.lav.nome.toLowerCase().includes(q) ||
          item.cat.nome.toLowerCase().includes(q) ||
          item.sub.nome.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allLavorazioniFlat, filterOrigin, selectedCatFilter, searchQuery]);

  // Filtraggio gerarchico per vista ALBERO
  const filteredCatalogTree = useMemo(() => {
    let cats = catalogo;
    if (selectedCatFilter !== 'all') {
      cats = cats.filter((c) => c.id === selectedCatFilter);
    }

    if (!searchQuery.trim()) {
      return cats;
    }

    const q = searchQuery.toLowerCase().trim();
    return cats
      .map((cat) => {
        const catMatch = cat.nome.toLowerCase().includes(q);
        const filteredSubs = cat.sottocategorie
          .map((sub) => {
            const subMatch = sub.nome.toLowerCase().includes(q);
            const filteredLavs = sub.lavorazioni.filter(
              (l) =>
                catMatch ||
                subMatch ||
                l.nome.toLowerCase().includes(q)
            );
            return { ...sub, lavorazioni: filteredLavs };
          })
          .filter((sub) => sub.lavorazioni.length > 0 || catMatch);

        return { ...cat, sottocategorie: filteredSubs };
      })
      .filter((cat) => cat.sottocategorie.length > 0);
  }, [catalogo, selectedCatFilter, searchQuery]);

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl flex items-start gap-2.5 text-xs border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-600/70 text-emerald-200'
              : feedback.type === 'error'
              ? 'bg-rose-950/40 border-rose-600/70 text-rose-200'
              : 'bg-blue-950/40 border-blue-600/70 text-blue-200'
          }`}
        >
          {feedback.type === 'success' && <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />}
          {feedback.type === 'error' && <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />}
          {feedback.type === 'info' && <FolderSync size={16} className="text-blue-400 shrink-0 mt-0.5" />}
          <div className="flex-1 font-medium">{feedback.text}</div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white font-bold ml-2 cursor-pointer">
            ×
          </button>
        </div>
      )}

      {/* CARD PRINCIPALE GESTIONE LAVORAZIONI */}
      <div className="rounded-3xl bg-[#141e2e] border border-slate-800 shadow-xl p-4 sm:p-5 space-y-4">
        
        {/* Header con pulsanti azione */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <FolderSync size={18} className="text-orange-400" />
              <span>Catalogo Comune Lavorazioni & Manutenzione</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualizza, modifica o elimina tutte le lavorazioni (anche quelle di default) e aggiungi nuove categorie e sottocategorie
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onResetCatalog && (
              <button
                type="button"
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Ripristinare il catalogo predefinito di fabbrica?',
                    description:
                      'Tutte le categorie e le 133 lavorazioni predefinite verranno riportate allo stato originale standard.',
                    onConfirm: () => {
                      onResetCatalog();
                      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                      setFeedback({
                        type: 'info',
                        text: 'Catalogo originale di default ripristinato con successo.',
                      });
                    },
                  })
                }
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Ripristina lavorazioni standard"
              >
                <RotateCcw size={13} />
                <span>Ripristina Default</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenAddCategory}
              className="px-3 py-1.5 rounded-xl bg-[#1c293d] hover:bg-[#253752] text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Aggiungi una nuova categoria principale"
            >
              <FolderPlus size={13} className="text-orange-400" />
              <span>+ Categoria</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddSubcategory()}
              className="px-3 py-1.5 rounded-xl bg-[#1c293d] hover:bg-[#253752] text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Aggiungi una nuova sottocategoria"
            >
              <Layers size={13} className="text-amber-400" />
              <span>+ Sottocategoria</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddLavorazione()}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-950/40 cursor-pointer"
            >
              <Plus size={14} />
              <span>+ Nuova Lavorazione</span>
            </button>
          </div>
        </div>

        {/* Barra Statistiche e Selettore Modalità di Visualizzazione */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1">
          <div className="p-2.5 rounded-2xl bg-[#0b111c] border border-slate-800/80 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Lavorazioni Totali</span>
            <span className="text-base font-black text-white font-mono">{totalLavorazioni}</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#0b111c] border border-slate-800/80 text-center">
            <span className="text-[10px] uppercase font-bold text-blue-400 block">Predefinite (Default)</span>
            <span className="text-base font-black text-blue-400 font-mono">{countDefault}</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#0b111c] border border-slate-800/80 text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Personalizzate</span>
            <span className="text-base font-black text-emerald-400 font-mono">{countCustom}</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#0b111c] border border-slate-800/80 text-center">
            <span className="text-[10px] uppercase font-bold text-amber-400 block">Categorie & Sotto</span>
            <span className="text-base font-black text-amber-300 font-mono">
              {catalogo.length} / {totalSottocategorie}
            </span>
          </div>
        </div>

        {/* Switcher Modalità: Elenco Diretto (stile Officine & Specialisti) vs Struttura ad Albero */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 bg-[#0b111c] p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('elenco')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'elenco'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List size={13} />
              <span>Elenco Lavorazioni ({totalLavorazioni})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('albero')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'albero'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Network size={13} />
              <span>Struttura Categorie ({catalogo.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:block">
            Tocca la matita <Pencil size={11} className="inline text-slate-300 mx-0.5" /> su qualsiasi lavorazione per modificarla
          </div>
        </div>

        {/* Barra di Ricerca */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca per nome lavorazione, categoria o sottocategoria (es. OLIO, FRENI, CANDELE)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0e1625] border border-slate-800 rounded-2xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-2.5 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtri Rapidi di Origine: Tutte | Solo Default | Solo Personalizzate */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mr-1">
            <Filter size={11} /> Origine:
          </span>
          <button
            type="button"
            onClick={() => setFilterOrigin('tutte')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterOrigin === 'tutte'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-[#0d1422] hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            Tutte ({totalLavorazioni})
          </button>
          <button
            type="button"
            onClick={() => setFilterOrigin('default')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              filterOrigin === 'default'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-[#0d1422] hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <ShieldCheck size={12} className={filterOrigin === 'default' ? 'text-white' : 'text-blue-400'} />
            <span>Predefinite di Default ({countDefault})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterOrigin('personalizzate')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              filterOrigin === 'personalizzate'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-[#0d1422] hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Sparkles size={12} className={filterOrigin === 'personalizzate' ? 'text-white' : 'text-emerald-400'} />
            <span>Personalizzate ({countCustom})</span>
          </button>
        </div>

        {/* Pillole Filtro per Categoria */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <Tag size={11} /> Categoria:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => setSelectedCatFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                selectedCatFilter === 'all'
                  ? 'bg-orange-600 text-white border-orange-500 shadow-md'
                  : 'bg-[#0d1422] text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              Tutte le Categorie ({totalLavorazioni})
            </button>
            {catalogo.map((cat) => {
              const catLavCount = cat.sottocategorie.reduce((acc, s) => acc + s.lavorazioni.length, 0);
              const isSelected = selectedCatFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCatFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-orange-600 text-white border-orange-500 shadow-md'
                      : 'bg-[#0d1422] text-slate-400 hover:text-white border-slate-800'
                  }`}
                >
                  <DynamicIcon name={cat.iconName || 'Wrench'} size={13} />
                  <span>{cat.nome}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-slate-300 font-mono">
                    {catLavCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================== */}
        {/* VISTA 1: ELENCO LAVORAZIONI DIRETTO (IDENTICA A OFFICINE)      */}
        {/* ============================================================== */}
        {viewMode === 'elenco' && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>
                Visualizzazione di <strong>{filteredFlatLavorazioni.length}</strong> lavorazioni
                {filterOrigin !== 'tutte' && ` (${filterOrigin})`}
                {selectedCatFilter !== 'all' && ` nella categoria selezionata`}
              </span>
              <button
                type="button"
                onClick={() => handleOpenAddLavorazione()}
                className="text-orange-400 hover:underline font-bold text-xs cursor-pointer"
              >
                + Inserisci Nuova Lavorazione
              </button>
            </div>

            {filteredFlatLavorazioni.length === 0 ? (
              <div className="text-center py-10 bg-[#0e1625] rounded-2xl border border-slate-800/80 space-y-2">
                <FolderSync size={32} className="mx-auto text-slate-600" />
                <p className="text-xs text-slate-400">Nessuna lavorazione corrisponde ai filtri selezionati.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCatFilter('all');
                    setFilterOrigin('tutte');
                  }}
                  className="text-xs text-orange-400 hover:underline font-semibold"
                >
                  Azzera tutti i filtri
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredFlatLavorazioni.map(({ lav, cat, sub, isDefault }) => (
                  <div
                    key={lav.id}
                    className="p-3 sm:p-3.5 rounded-2xl bg-[#0e1625] hover:bg-[#121c2e] border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors group"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      {/* Icona Colorata Lavorazione */}
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-white/10 mt-0.5 sm:mt-0"
                        style={{
                          backgroundColor: `${lav.coloreIcona || '#f59e0b'}20`,
                          color: lav.coloreIcona || '#f59e0b',
                        }}
                      >
                        <DynamicIcon
                          name={lav.iconName || 'Wrench'}
                          size={18}
                          color={lav.coloreIcona || '#f59e0b'}
                        />
                      </div>

                      {/* Dettagli e Badge Lavorazione */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Badge Default vs Personalizzata */}
                          {isDefault ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                              <ShieldCheck size={11} />
                              <span>Default (Predefinita)</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <Sparkles size={11} />
                              <span>Personalizzata</span>
                            </span>
                          )}

                          {/* Badge Categoria */}
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60 truncate max-w-[200px]">
                            {cat.nome}
                          </span>

                          {/* Badge Sottocategoria */}
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#172338] text-amber-300 border border-amber-500/30 truncate max-w-[200px]">
                            {sub.nome}
                          </span>
                        </div>

                        {/* Nome Lavorazione */}
                        <div className="text-sm font-black text-white tracking-wide">
                          {lav.nome}
                        </div>
                      </div>
                    </div>

                    {/* Azioni Modifica / Elimina */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleOpenEditLavorazione(lav, cat.id, sub.id)}
                        className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Modifica nome, categoria, icona o colore di questa lavorazione"
                      >
                        <Pencil size={13} className="text-orange-400" />
                        <span>Modifica</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteLavorazione(lav)}
                        className="p-1.5 rounded-xl hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-900/50 transition-colors cursor-pointer"
                        title="Elimina questa lavorazione dal catalogo comune"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* VISTA 2: STRUTTURA AD ALBERO (CATEGORIE -> SOTTOCATEGORIE)     */}
        {/* ============================================================== */}
        {viewMode === 'albero' && (
          <div className="space-y-4 pt-2">
            {filteredCatalogTree.length === 0 ? (
              <div className="text-center py-10 bg-[#0e1625] rounded-2xl border border-slate-800/80 space-y-2">
                <FolderSync size={32} className="mx-auto text-slate-600" />
                <p className="text-xs text-slate-400">Nessuna categoria trovata con i filtri impostati.</p>
              </div>
            ) : (
              filteredCatalogTree.map((cat) => {
                const isExpanded = expandedCategories[cat.id] !== false;
                const catLavCount = cat.sottocategorie.reduce((acc, s) => acc + s.lavorazioni.length, 0);

                return (
                  <div
                    key={cat.id}
                    className="rounded-2xl bg-[#0b111c] border border-slate-800 overflow-hidden shadow-lg"
                  >
                    {/* CATEGORIA HEADER */}
                    <div className="p-3 sm:p-3.5 bg-gradient-to-r from-[#111c2e] via-[#142138] to-[#0d1524] border-b border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCategoryExpand(cat.id)}
                        className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/30">
                          <DynamicIcon name={cat.iconName || 'Wrench'} size={16} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-black text-white truncate flex items-center gap-2">
                            <span>{cat.nome}</span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-orange-300 border border-slate-700">
                              {catLavCount} lavorazioni
                            </span>
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            {cat.sottocategorie.length} sottocategorie
                          </span>
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenAddSubcategory(cat.id)}
                          className="px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 border border-slate-700 cursor-pointer"
                          title="Aggiungi nuova sottocategoria a questa categoria"
                        >
                          <Plus size={12} />
                          <span className="hidden sm:inline">Sottocategoria</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditCategory(cat)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Modifica nome o icona della categoria"
                        >
                          <Pencil size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1.5 rounded-xl hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Elimina categoria"
                        >
                          <Trash2 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleCategoryExpand(cat.id)}
                          className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* SOTTOCATEGORIE & LAVORAZIONI CONTENT */}
                    {isExpanded && (
                      <div className="p-3 sm:p-4 space-y-4">
                        {cat.sottocategorie.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-500 bg-[#0e1625] rounded-xl border border-slate-800">
                            Nessuna sottocategoria in questa categoria.
                            <button
                              type="button"
                              onClick={() => handleOpenAddSubcategory(cat.id)}
                              className="text-orange-400 font-semibold ml-2 hover:underline"
                            >
                              + Crea una sottocategoria
                            </button>
                          </div>
                        ) : (
                          cat.sottocategorie.map((sub) => (
                            <div
                              key={sub.id}
                              className="rounded-2xl bg-[#0e1726] border border-slate-800/90 overflow-hidden"
                            >
                              {/* Header Sottocategoria */}
                              <div className="px-3.5 py-2.5 bg-[#121c2e] border-b border-slate-800 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Layers size={14} className="text-amber-400 shrink-0" />
                                  <h5 className="text-xs font-bold text-slate-200 truncate">
                                    {sub.nome}
                                  </h5>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    ({sub.lavorazioni.length})
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddLavorazione(cat.id, sub.id)}
                                    className="px-2 py-0.5 rounded-lg bg-orange-600/30 hover:bg-orange-600/50 text-orange-300 border border-orange-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                    title="Aggiungi lavorazione a questa sottocategoria"
                                  >
                                    <Plus size={11} />
                                    <span>+ Lavorazione</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditSubcategory(sub, cat.id)}
                                    className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 cursor-pointer"
                                    title="Modifica sottocategoria (nome o categoria madre)"
                                  >
                                    <Pencil size={12} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSubcategory(cat, sub)}
                                    className="p-1 rounded-lg hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 cursor-pointer"
                                    title="Elimina sottocategoria"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>

                              {/* Elenco Lavorazioni in Griglia */}
                              <div className="p-2 sm:p-2.5">
                                {sub.lavorazioni.length === 0 ? (
                                  <div className="p-3 text-center text-xs text-slate-500">
                                    Nessuna lavorazione inserita. Tocca <strong>"+ Lavorazione"</strong> per aggiungerne una.
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                                    {sub.lavorazioni.map((lav) => {
                                      const isDefault = defaultLavIds.has(lav.id);
                                      return (
                                        <div
                                          key={lav.id}
                                          className="p-2.5 rounded-xl bg-[#142033] hover:bg-[#18263c] border border-slate-800/80 flex items-center justify-between gap-2 transition-all group"
                                        >
                                          <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <div
                                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-white/10"
                                              style={{
                                                backgroundColor: `${lav.coloreIcona || '#f59e0b'}20`,
                                                color: lav.coloreIcona || '#f59e0b',
                                              }}
                                            >
                                              <DynamicIcon
                                                name={lav.iconName || 'Wrench'}
                                                size={14}
                                                color={lav.coloreIcona || '#f59e0b'}
                                              />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <span className="text-xs font-bold text-white block truncate leading-tight">
                                                {lav.nome}
                                              </span>
                                              <span className="text-[9px] flex items-center gap-1 mt-0.5">
                                                {isDefault ? (
                                                  <span className="text-blue-400 font-medium">Default</span>
                                                ) : (
                                                  <span className="text-emerald-400 font-semibold">Personalizzata</span>
                                                )}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Azioni Modifica / Elimina */}
                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              type="button"
                                              onClick={() => handleOpenEditLavorazione(lav, cat.id, sub.id)}
                                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                              title="Modifica lavorazione (nome, categoria, icona)"
                                            >
                                              <Pencil size={12} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteLavorazione(lav)}
                                              className="p-1.5 rounded-lg hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                              title="Elimina lavorazione"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* ========================================================= */}
      {/* MODAL AGGIUNGI / MODIFICA LAVORAZIONE                     */}
      {/* ========================================================= */}
      {isLavorazioneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#101928] border border-slate-700/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-[#172338] to-[#121c2d] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                  <Wrench size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">
                    {editingLavorazioneId ? 'Modifica Lavorazione' : 'Nuova Lavorazione'}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {editingLavorazioneId
                      ? (defaultLavIds.has(editingLavorazioneId)
                          ? 'Modifica questa lavorazione predefinita di default'
                          : 'Modifica questa lavorazione personalizzata')
                      : 'Aggiungi una nuova attività al catalogo comune'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsLavorazioneModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Annulla"
                >
                  <X size={16} />
                </button>

                {editingLavorazioneId && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLavorazioneId(null);
                        setLavorazioneForm((prev) => ({
                          ...prev,
                          nome: `${prev.nome} (COPIA)`,
                        }));
                      }}
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer active:scale-95"
                      title="Copia e duplica questa lavorazione"
                    >
                      <Copy size={14} />
                      <span>Copia</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const item = allLavorazioniFlat.find((l) => l.lav.id === editingLavorazioneId);
                        if (item) {
                          setIsLavorazioneModalOpen(false);
                          handleDeleteLavorazione(item.lav);
                        }
                      }}
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer active:scale-95 shadow-sm"
                      title="Elimina lavorazione"
                    >
                      <Trash2 size={14} />
                      <span>Elimina</span>
                    </button>
                  </>
                )}

                <button
                  type="submit"
                  form="lavorazione-form"
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-950/40 transition-colors cursor-pointer active:scale-95"
                  title={editingLavorazioneId ? 'Salva modifiche lavorazione' : 'Crea nuova lavorazione'}
                >
                  <Save size={14} />
                  <span>Salva</span>
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form id="lavorazione-form" onSubmit={handleSaveLavorazione} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Avviso lavorazione di default */}
              {editingLavorazioneId && defaultLavIds.has(editingLavorazioneId) && (
                <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-600/40 text-blue-200 text-xs flex items-center gap-2">
                  <ShieldCheck size={16} className="text-blue-400 shrink-0" />
                  <span>
                    Stai modificando una lavorazione di default: puoi rinominarla, cambiarne categoria, sottocategoria, icona o colore.
                  </span>
                </div>
              )}

              {/* Nome Lavorazione */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 block">
                  Nome Lavorazione *
                </label>
                <input
                  type="text"
                  required
                  placeholder="es. SOSTITUZIONE TERMOSTATO, LAVAGGIO CAMBIO..."
                  value={lavorazioneForm.nome}
                  onChange={(e) => setLavorazioneForm({ ...lavorazioneForm, nome: e.target.value })}
                  className="w-full bg-[#172233] border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white uppercase font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Scelta Categoria */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                    Categoria di Appartenenza *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLavorazioneModalOpen(false);
                      handleOpenAddCategory();
                    }}
                    className="text-[10px] text-orange-400 hover:underline font-semibold"
                  >
                    + Nuova Categoria
                  </button>
                </div>
                <select
                  value={lavorazioneForm.categoriaId}
                  onChange={(e) => {
                    const newCatId = e.target.value;
                    const cat = catalogo.find((c) => c.id === newCatId);
                    const firstSubId = cat?.sottocategorie[0]?.id || '';
                    setLavorazioneForm({
                      ...lavorazioneForm,
                      categoriaId: newCatId,
                      sottocategoriaId: firstSubId,
                    });
                  }}
                  className="w-full bg-[#172233] border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-medium focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  {catalogo.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scelta Sottocategoria */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                    Sottocategoria *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLavorazioneModalOpen(false);
                      handleOpenAddSubcategory(lavorazioneForm.categoriaId);
                    }}
                    className="text-[10px] text-orange-400 hover:underline font-semibold"
                  >
                    + Nuova Sottocategoria
                  </button>
                </div>
                <select
                  value={lavorazioneForm.sottocategoriaId}
                  onChange={(e) =>
                    setLavorazioneForm({ ...lavorazioneForm, sottocategoriaId: e.target.value })
                  }
                  className="w-full bg-[#172233] border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-medium focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  {catalogo
                    .find((c) => c.id === lavorazioneForm.categoriaId)
                    ?.sottocategorie.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                </select>
              </div>

              {/* Scelta Icona */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 block">
                  Icona Rappresentativa
                </label>
                <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-[#0d1422] rounded-2xl border border-slate-800 scrollbar-thin">
                  {AVAILABLE_ICONS.map((iconName) => {
                    const isSelected = lavorazioneForm.iconName === iconName;
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setLavorazioneForm({ ...lavorazioneForm, iconName })}
                        className={`p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-orange-600 text-white border border-orange-400 scale-105'
                            : 'bg-[#152033] text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title={iconName}
                      >
                        <DynamicIcon name={iconName} size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scelta Colore Icona */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 block flex items-center gap-1.5">
                  <Palette size={12} />
                  <span>Colore Icona</span>
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {AVAILABLE_COLORS.map((col) => {
                    const isSelected = lavorazioneForm.coloreIcona === col;
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setLavorazioneForm({ ...lavorazioneForm, coloreIcona: col })}
                        style={{ backgroundColor: col }}
                        className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-transform cursor-pointer border ${
                          isSelected ? 'scale-125 border-white ring-2 ring-white/50' : 'border-black/30'
                        }`}
                      >
                        {isSelected && <Check size={12} className="text-black font-black" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Anteprima Live */}
              <div className="p-3 rounded-2xl bg-[#090f19] border border-slate-800/80 space-y-1">
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block">
                  Anteprima nel catalogo
                </span>
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/10"
                    style={{
                      backgroundColor: `${lavorazioneForm.coloreIcona}20`,
                      color: lavorazioneForm.coloreIcona,
                    }}
                  >
                    <DynamicIcon
                      name={lavorazioneForm.iconName}
                      size={16}
                      color={lavorazioneForm.coloreIcona}
                    />
                  </div>
                  <span className="text-xs font-bold text-white uppercase">
                    {lavorazioneForm.nome || 'NOME DELLA LAVORAZIONE'}
                  </span>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL AGGIUNGI / MODIFICA CATEGORIA                       */}
      {/* ========================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#101928] border border-slate-700/80 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 my-auto">
            <div className="p-4 bg-gradient-to-r from-[#172338] to-[#121c2d] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus size={16} className="text-orange-400" />
                <h4 className="text-sm font-bold text-white leading-tight">
                  {editingCategoryId ? 'Modifica Categoria' : 'Nuova Categoria'}
                </h4>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Annulla"
                >
                  <X size={16} />
                </button>

                {editingCategoryId && (
                  <button
                    type="button"
                    onClick={() => {
                      const catToDelete = catalogo.find((c) => c.id === editingCategoryId);
                      setIsCategoryModalOpen(false);
                      if (catToDelete) {
                        handleDeleteCategory(catToDelete);
                      }
                    }}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer active:scale-95 shadow-sm"
                    title="Elimina categoria"
                  >
                    <Trash2 size={14} />
                    <span>Elimina</span>
                  </button>
                )}

                <button
                  type="submit"
                  form="category-form"
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-950/40 transition-colors cursor-pointer active:scale-95"
                  title={editingCategoryId ? 'Salva modifiche categoria' : 'Crea nuova categoria'}
                >
                  <Save size={14} />
                  <span>Salva</span>
                </button>
              </div>
            </div>

            <form id="category-form" onSubmit={handleSaveCategory} className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 block">
                  Nome Categoria *
                </label>
                <input
                  type="text"
                  required
                  placeholder="es. ACCESSORI, MODIFICHE, CARROZZERIA..."
                  value={categoryForm.nome}
                  onChange={(e) => setCategoryForm({ ...categoryForm, nome: e.target.value })}
                  className="w-full bg-[#172233] border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-bold focus:outline-none focus:border-orange-500 uppercase"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 block">
                  Icona Categoria
                </label>
                <div className="grid grid-cols-7 gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-[#0d1422] rounded-2xl border border-slate-800 scrollbar-thin">
                  {AVAILABLE_ICONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, iconName })}
                      className={`p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        categoryForm.iconName === iconName
                          ? 'bg-orange-600 text-white border border-orange-400 scale-105'
                          : 'bg-[#152033] text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title={iconName}
                    >
                      <DynamicIcon name={iconName} size={16} />
                    </button>
                  ))}
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL AGGIUNGI / MODIFICA SOTTOCATEGORIA                  */}
      {/* ========================================================= */}
      {isSubcategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#101928] border border-slate-700/80 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 my-auto">
            <div className="p-4 bg-gradient-to-r from-[#172338] to-[#121c2d] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-amber-400" />
                <h4 className="text-sm font-bold text-white leading-tight">
                  {editingSubcategoryId ? 'Modifica Sottocategoria' : 'Nuova Sottocategoria'}
                </h4>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSubcategoryModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Annulla"
                >
                  <X size={16} />
                </button>

                {editingSubcategoryId && (
                  <button
                    type="button"
                    onClick={() => {
                      const catOwner = catalogo.find((c) => c.id === subcategoryForm.categoriaId);
                      const subToDelete = catOwner?.sottocategorie.find((s) => s.id === editingSubcategoryId);
                      setIsSubcategoryModalOpen(false);
                      if (catOwner && subToDelete) {
                        handleDeleteSubcategory(catOwner, subToDelete);
                      }
                    }}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer active:scale-95 shadow-sm"
                    title="Elimina sottocategoria"
                  >
                    <Trash2 size={14} />
                    <span>Elimina</span>
                  </button>
                )}

                <button
                  type="submit"
                  form="subcategory-form"
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-950/40 transition-colors cursor-pointer active:scale-95"
                  title={editingSubcategoryId ? 'Salva modifiche sottocategoria' : 'Crea nuova sottocategoria'}
                >
                  <Save size={14} />
                  <span>Salva</span>
                </button>
              </div>
            </div>

            <form id="subcategory-form" onSubmit={handleSaveSubcategory} className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 block">
                  Categoria di Appartenenza
                </label>
                <select
                  value={subcategoryForm.categoriaId}
                  onChange={(e) =>
                    setSubcategoryForm({ ...subcategoryForm, categoriaId: e.target.value })
                  }
                  className="w-full bg-[#172233] border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-medium focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  {catalogo.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 block">
                  Nome Sottocategoria *
                </label>
                <input
                  type="text"
                  required
                  placeholder="es. Scarico e Catalizzatore, Sensori Ausiliari..."
                  value={subcategoryForm.nome}
                  onChange={(e) =>
                    setSubcategoryForm({ ...subcategoryForm, nome: e.target.value })
                  }
                  className="w-full bg-[#172233] border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-medium focus:outline-none focus:border-orange-500"
                />
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DIALOG CONFERMA OPERAZIONI CRITICHE                      */}
      {/* ========================================================= */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121c2e] border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-amber-400">
              <AlertTriangle size={20} />
              <h4 className="text-sm font-bold text-white">{confirmDialog.title}</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmDialog.description}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
