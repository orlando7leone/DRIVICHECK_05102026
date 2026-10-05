import React, { useState, useEffect } from 'react';
import {
  Camera,
  Image as ImageIcon,
  FileText,
  X,
  Eye,
  CheckCircle2,
  RefreshCw,
  Plus,
  Download,
  ExternalLink,
  AlertCircle,
  File,
} from 'lucide-react';
import { compressImageFile } from '../utils/imageOptimizer';
import { AllegatoDocumento } from '../types';

interface ReceiptInvoiceUploadProps {
  value?: string; // Retrocompatibilità: singola URL immagine
  allegati?: AllegatoDocumento[]; // Multipli allegati (immagini + PDF)
  onChange?: (primaryUrl: string) => void;
  onAllegatiChange?: (allegati: AllegatoDocumento[]) => void;
  label?: string;
}

export const ReceiptInvoiceUpload: React.FC<ReceiptInvoiceUploadProps> = ({
  value = '',
  allegati = [],
  onChange,
  onAllegatiChange,
  label = 'Scansiona ricevuta, fattura o documento (Foto e PDF)',
}) => {
  // Lista interna degli allegati
  const [items, setItems] = useState<AllegatoDocumento[]>(() => {
    if (allegati && allegati.length > 0) return allegati;
    if (value) {
      const isPdf = value.startsWith('data:application/pdf') || value.toLowerCase().includes('.pdf');
      return [
        {
          id: `att-${Date.now()}`,
          nome: isPdf ? 'Fattura_Ricevuta.pdf' : 'Ricevuta_Foto.jpg',
          url: value,
          tipo: isPdf ? 'pdf' : 'image',
          dataCaricamento: new Date().toISOString(),
        },
      ];
    }
    return [];
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [previewItem, setPreviewItem] = useState<AllegatoDocumento | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Sincronizza se i props esterni cambiano
  useEffect(() => {
    if (allegati && allegati.length > 0) {
      setItems(allegati);
    } else if (value && items.length === 0) {
      const isPdf = value.startsWith('data:application/pdf') || value.toLowerCase().includes('.pdf');
      setItems([
        {
          id: `att-init`,
          nome: isPdf ? 'Fattura_Ricevuta.pdf' : 'Ricevuta_Foto.jpg',
          url: value,
          tipo: isPdf ? 'pdf' : 'image',
          dataCaricamento: new Date().toISOString(),
        },
      ]);
    } else if (!value && (!allegati || allegati.length === 0) && items.length > 0) {
      setItems([]);
    }
  }, [value, allegati]);

  const notifyChange = (updated: AllegatoDocumento[]) => {
    setItems(updated);
    if (onAllegatiChange) {
      onAllegatiChange(updated);
    }
    if (onChange) {
      // Per retrocompatibilità, imposta l'URL del primo allegato
      onChange(updated[0]?.url || '');
    }
  };

  // Lettura e ottimizzazione file (immagini o PDF)
  const processFiles = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;
    setIsProcessing(true);
    setWarningMessage(null);

    const newAttachments: AllegatoDocumento[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const isPdf =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      try {
        if (isPdf) {
          // Controllo dimensione PDF (massimo 4MB per conservare spazio in memoria)
          if (file.size > 4 * 1024 * 1024) {
            setWarningMessage(
              `Il file "${file.name}" supera i 4MB (${(file.size / 1024 / 1024).toFixed(1)}MB). Si consiglia un PDF compresso.`
            );
          }

          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Errore lettura PDF'));
            reader.readAsDataURL(file);
          });

          newAttachments.push({
            id: `att-pdf-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            nome: file.name,
            url: base64Data,
            tipo: 'pdf',
            dimensione: file.size,
            dataCaricamento: new Date().toISOString(),
          });
        } else {
          // Immagine: comprimi e ridimensiona per performance e memoria
          const compressed = await compressImageFile(file, 900, 0.72);
          newAttachments.push({
            id: `att-img-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            nome: file.name || `Foto_${items.length + i + 1}.jpg`,
            url: compressed,
            tipo: 'image',
            dimensione: file.size,
            dataCaricamento: new Date().toISOString(),
          });
        }
      } catch (err: any) {
        console.error('Errore elaborazione allegato:', err);
      }
    }

    setIsProcessing(false);
    if (newAttachments.length > 0) {
      notifyChange([...items, ...newAttachments]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = items.filter((item) => item.id !== id);
    notifyChange(updated);
  };

  const handleDownloadAttachment = (item: AllegatoDocumento) => {
    const a = document.createElement('a');
    a.href = item.url;
    a.download = item.nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-2.5">
      {/* Intestazione Sezione */}
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
          {label}
        </label>
        {items.length > 0 && (
          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
            <CheckCircle2 size={12} /> {items.length} {items.length === 1 ? 'allegato inserito' : 'allegati inseriti'}
          </span>
        )}
      </div>

      {warningMessage && (
        <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
          <AlertCircle size={15} className="text-amber-400 shrink-0" />
          <span>{warningMessage}</span>
        </div>
      )}

      {isProcessing && (
        <div className="p-3 rounded-2xl bg-blue-950/40 border border-blue-500/40 text-blue-200 text-xs flex items-center justify-center gap-2">
          <RefreshCw size={15} className="animate-spin text-blue-400" />
          <span>Caricamento e ottimizzazione allegati in corso...</span>
        </div>
      )}

      {/* LISTA DEGLI ALLEGATI ESISTENTI */}
      {items.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {items.map((item, idx) => {
              const isPdf = item.tipo === 'pdf';
              return (
                <div
                  key={item.id || idx}
                  onClick={() => setPreviewItem(item)}
                  className="p-2.5 rounded-2xl bg-[#0e1625] hover:bg-[#131e33] border border-slate-700/80 flex items-center justify-between gap-2.5 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Icona o Miniatura */}
                    {isPdf ? (
                      <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex flex-col items-center justify-center shrink-0">
                        <FileText size={20} />
                        <span className="text-[8px] font-bold uppercase mt-0.5 tracking-wider">PDF</span>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/60 border border-slate-700 shrink-0 relative">
                        <img
                          src={item.url}
                          alt={item.nome}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center">
                          <Eye size={14} className="text-white opacity-80" />
                        </div>
                      </div>
                    )}

                    {/* Dettagli File */}
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-white block truncate group-hover:text-blue-300 transition-colors">
                        {item.nome}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className={`font-mono font-bold px-1.5 py-0.2 rounded text-[9px] ${isPdf ? 'bg-rose-950 text-rose-300' : 'bg-blue-950 text-blue-300'}`}>
                          {isPdf ? 'Documento PDF' : 'Immagine'}
                        </span>
                        {item.dimensione && (
                          <span>{(item.dimensione / 1024).toFixed(0)} KB</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Pulsante Eliminazione */}
                  <button
                    type="button"
                    onClick={(e) => handleRemoveItem(item.id, e)}
                    className="p-1.5 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                    title="Rimuovi allegato"
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTENITORE PULSANTI AGGIUNTA (FOTOCAMERA, GALLERIA, PDF) */}
      <div className="border border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-2.5 bg-[#0d1522]/70 flex flex-wrap items-center justify-around gap-2 text-xs text-slate-300 transition-colors">
        {/* Scansiona Foto con Fotocamera */}
        <label className="flex items-center gap-2 cursor-pointer hover:text-blue-400 transition-colors py-1.5 px-3 rounded-xl hover:bg-slate-800/60">
          <Camera size={16} className="text-blue-400" />
          <span className="font-semibold text-xs">Fotocamera</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleInputChange}
            className="hidden"
          />
        </label>

        <div className="w-px h-5 bg-slate-800 hidden sm:block" />

        {/* Allega più immagini o file dalla galleria */}
        <label className="flex items-center gap-2 cursor-pointer hover:text-purple-400 transition-colors py-1.5 px-3 rounded-xl hover:bg-slate-800/60">
          <ImageIcon size={16} className="text-purple-400" />
          <span className="font-semibold text-xs">Immagini (Multiple)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleInputChange}
            className="hidden"
          />
        </label>

        <div className="w-px h-5 bg-slate-800 hidden sm:block" />

        {/* Allega Documenti PDF */}
        <label className="flex items-center gap-2 cursor-pointer hover:text-rose-400 transition-colors py-1.5 px-3 rounded-xl hover:bg-slate-800/60">
          <FileText size={16} className="text-rose-400" />
          <span className="font-semibold text-xs">Documento PDF</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            multiple
            onChange={handleInputChange}
            className="hidden"
          />
        </label>
      </div>

      {/* MODALE DI ANTEPRIMA A TUTTO SCHERMO (Foto o PDF) */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-3 sm:p-5 animate-in fade-in duration-150">
          {/* Header Anteprima */}
          <div className="flex items-center justify-between pb-3 text-white border-b border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              {previewItem.tipo === 'pdf' ? (
                <FileText size={18} className="text-rose-400 shrink-0" />
              ) : (
                <ImageIcon size={18} className="text-blue-400 shrink-0" />
              )}
              <span className="text-xs sm:text-sm font-bold truncate">
                {previewItem.nome}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDownloadAttachment(previewItem)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md"
                title="Scarica file sul dispositivo"
              >
                <Download size={14} />
                <span>Scarica</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer ml-1"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Corpo Visualizzatore */}
          <div className="flex-1 flex items-center justify-center overflow-auto p-2">
            {previewItem.tipo === 'pdf' ? (
              <div className="w-full h-full max-w-4xl flex flex-col items-center justify-center bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl p-2">
                <object
                  data={previewItem.url}
                  type="application/pdf"
                  className="w-full h-full rounded-xl"
                >
                  <div className="p-8 text-center space-y-3">
                    <FileText size={48} className="text-rose-400 mx-auto" />
                    <p className="text-sm font-bold text-white">{previewItem.nome}</p>
                    <p className="text-xs text-slate-400">
                      Il browser non supporta l'anteprima integrata del PDF.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDownloadAttachment(previewItem)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      <Download size={15} />
                      <span>Scarica e Apri PDF</span>
                    </button>
                  </div>
                </object>
              </div>
            ) : (
              <img
                src={previewItem.url}
                alt={previewItem.nome}
                className="max-h-[82vh] max-w-full object-contain rounded-2xl border border-slate-800 shadow-2xl"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
