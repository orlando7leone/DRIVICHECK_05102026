import React, { useState } from 'react';
import { InterventoRecord, Veicolo, AllegatoDocumento } from '../types';
import { formatCurrency, formatKm, formatDateIt } from '../services/storageService';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Gauge,
  Calendar,
  Building2,
  Bell,
  CheckCircle2,
  FileText,
  X,
  AlertTriangle,
  Copy,
  Download,
  Eye,
  Image as ImageIcon,
} from 'lucide-react';

interface RecordDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: InterventoRecord | null;
  veicolo: Veicolo | undefined;
  onEdit: (record: InterventoRecord) => void;
  onCopy?: (record: InterventoRecord) => void;
  onDelete: (recordId: string) => void;
}

export const RecordDetailsModal: React.FC<RecordDetailsModalProps> = ({
  isOpen,
  onClose,
  record,
  veicolo,
  onEdit,
  onCopy,
  onDelete,
}) => {
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [activeAttachmentPreview, setActiveAttachmentPreview] = useState<AllegatoDocumento | null>(null);

  // Normalizza gli allegati (compatibilità allegati array + fotoRicevutaUrl singola)
  const attachmentsList: AllegatoDocumento[] = React.useMemo(() => {
    if (!record) return [];
    if (record.allegati && record.allegati.length > 0) {
      return record.allegati;
    }
    if (record.fotoRicevutaUrl) {
      const isPdf =
        record.fotoRicevutaUrl.startsWith('data:application/pdf') ||
        record.fotoRicevutaUrl.toLowerCase().includes('.pdf');
      return [
        {
          id: `att-legacy-${record.id}`,
          nome: isPdf ? 'Documento_Allegato.pdf' : 'Ricevuta_Foto.jpg',
          url: record.fotoRicevutaUrl,
          tipo: isPdf ? 'pdf' : 'image',
          dataCaricamento: record.createdAt,
        },
      ];
    }
    return [];
  }, [record]);

  if (!isOpen || !record) return null;

  const handleDelete = () => {
    onDelete(record.id);
    setConfirmDelete(false);
    onClose();
  };

  const handleDownloadFile = (att: AllegatoDocumento) => {
    const a = document.createElement('a');
    a.href = att.url;
    a.download = att.nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopy = () => {
    if (onCopy) {
      onCopy(record);
    } else {
      onEdit(record);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col bg-[#111827] text-white rounded-t-3xl sm:rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Top blue bar */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-lg font-bold">Dettagli</h2>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => onEdit(record)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-bold active:scale-95"
              title="Modifica scheda attuale"
            >
              <Pencil size={14} />
              <span>Modifica</span>
            </button>

            <button
              onClick={handleCopy}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/30 hover:bg-emerald-500 text-white border border-emerald-400/40 flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-bold active:scale-95"
              title="Copia scheda (crea nuova scheda modificabile)"
            >
              <Copy size={14} />
              <span>Copia</span>
            </button>

            <button
              onClick={() => setConfirmDelete(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer active:scale-95 shadow-sm"
              title="Elimina record"
            >
              <Trash2 size={14} />
              <span>Elimina</span>
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Main Card */}
          <div className="p-5 rounded-2xl bg-[#172033] border border-slate-800 shadow-lg space-y-4">
            
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-white leading-snug">
                {record.titolo}
              </h3>

              <div className="text-right shrink-0">
                <span className="text-xl font-black text-blue-400 block">
                  {formatCurrency(record.costo)}
                </span>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-950/80 border border-amber-600/70 text-amber-300">
                  {record.tipo}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Calendar size={14} className="text-blue-400" />
              <span>{formatDateIt(record.data)}</span>
              {veicolo && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-300 font-medium">{veicolo.marca} {veicolo.modello} ({veicolo.targa})</span>
                </>
              )}
            </div>

            {/* Box: CHILOMETRAGGIO REGISTRATO */}
            <div className="p-3.5 rounded-xl bg-[#0e1624] border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block">
                  Chilometraggio Registrato
                </span>
                <div className="flex items-center gap-2 text-white font-bold text-base mt-0.5">
                  <Gauge size={18} className="text-blue-400" />
                  <span>{formatKm(record.km)}</span>
                </div>
              </div>
            </div>

            {/* Box: STATO PAGAMENTO & SALDO */}
            {(record.statoPagamento || (record.acconti && record.acconti.length > 0)) && (
              <div className={`p-3.5 rounded-xl border space-y-2 ${
                record.statoPagamento === 'saldato'
                  ? 'bg-emerald-950/30 border-emerald-700/50'
                  : record.statoPagamento === 'parziale'
                  ? 'bg-amber-950/30 border-amber-700/50'
                  : 'bg-rose-950/30 border-rose-700/50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                    Stato Pagamento
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    record.statoPagamento === 'saldato'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : record.statoPagamento === 'parziale'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    {record.statoPagamento === 'saldato'
                      ? '✓ Saldato Interamente'
                      : record.statoPagamento === 'parziale'
                      ? '⏳ Acconto / Parziale'
                      : '⚠️ Da Saldare'}
                  </span>
                </div>

                {record.statoPagamento === 'parziale' && record.acconti && record.acconti.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-300 block">
                      Acconti Versati ({record.acconti.length}):
                    </span>
                    <div className="space-y-1">
                      {record.acconti.map((acc, idx) => (
                        <div key={acc.id || idx} className="flex items-center justify-between text-xs bg-[#0b1019] px-2.5 py-1.5 rounded-lg border border-slate-800">
                          <span className="text-slate-300">{acc.note || `Acconto ${idx + 1}`} ({formatDateIt(acc.data)})</span>
                          <span className="font-mono font-bold text-amber-300">{formatCurrency(acc.importo)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {record.saldoRimanente !== undefined && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs font-bold">
                    <span className="text-slate-300">Saldo Rimanente da Pagare:</span>
                    <span className={`font-mono text-sm ${record.saldoRimanente > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {formatCurrency(record.saldoRimanente)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Officina */}
            {record.officina && (
              <div className="p-3.5 rounded-xl bg-[#0e1624] border border-slate-800">
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block mb-1">
                  Officina / Esecutore
                </span>
                <div className="flex items-center gap-2 text-sm text-slate-200 font-medium">
                  <Building2 size={16} className="text-amber-400" />
                  <span>{record.officina}</span>
                </div>
              </div>
            )}

            {/* Descrizione (per Altri Interventi) */}
            {record.descrizione && (
              <div className="p-3.5 rounded-xl bg-[#0e1624] border border-slate-800">
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block mb-1">
                  Descrizione Intervento
                </span>
                <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {record.descrizione}
                </p>
              </div>
            )}

            {/* Registro Gomme Dettagli */}
            {record.registroGomme && (
              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-700/50 space-y-2">
                <span className="text-[10px] font-bold tracking-wider uppercase text-cyan-300 block">
                  Dettagli Registro Gomme
                </span>
                {record.registroGomme.marca && (
                  <div className="text-xs text-white">
                    Marca Pneumatici: <strong className="text-cyan-200">{record.registroGomme.marca}</strong>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {record.registroGomme.sostituzioneAnteriori && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-cyan-900/60 border border-cyan-600 text-cyan-200">
                      ✓ Sost. Gomme Anteriori
                    </span>
                  )}
                  {record.registroGomme.sostituzionePosteriori && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-cyan-900/60 border border-cyan-600 text-cyan-200">
                      ✓ Sost. Gomme Posteriori
                    </span>
                  )}
                  {record.registroGomme.inversione && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-900/60 border border-blue-600 text-blue-200">
                      ✓ Inversione
                    </span>
                  )}
                  {record.registroGomme.equilibratura && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-900/60 border border-indigo-600 text-indigo-200">
                      ✓ Equilibratura
                    </span>
                  )}
                  {record.registroGomme.convergenza && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-teal-900/60 border border-teal-600 text-teal-200">
                      ✓ Convergenza
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Registro Pagamento Dettagli */}
            {record.registroPagamento && (
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-700/50 space-y-2">
                <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-300 block">
                  Dettagli Pagamento e Scadenza
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tipo Scadenza:</span>
                    <strong className="text-white">{record.registroPagamento.tipoPagamento}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Data Pagamento:</span>
                    <strong className="text-white">{formatDateIt(record.registroPagamento.dataPagamento || record.data)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Nuova Scadenza:</span>
                    <strong className="text-emerald-300">{formatDateIt(record.registroPagamento.dataScadenza)}</strong>
                  </div>
                  {record.registroPagamento.pagabileEntro && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">Pagabile Entro:</span>
                      <strong className="text-amber-300">{record.registroPagamento.pagabileEntro}</strong>
                    </div>
                  )}
                  {record.registroPagamento.enteOCompagnia && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">Ente / Compagnia:</span>
                      <strong className="text-white">{record.registroPagamento.enteOCompagnia}</strong>
                    </div>
                  )}
                  {record.registroPagamento.numeroPolizza && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">Polizza:</span>
                      <strong className="text-white font-mono">{record.registroPagamento.numeroPolizza}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Lavorazioni dettagliate */}
            {record.lavorazioniSelezionate && record.lavorazioniSelezionate.length > 0 && !record.registroGomme && (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  Lavorazioni incluse ({record.lavorazioniSelezionate.length})
                </span>
                <div className="space-y-1.5">
                  {record.lavorazioniSelezionate.map((lav, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-[#111a2b] border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-slate-200">{lav.nome}</span>
                      <span className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">
                        {lav.sottocategoria}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Promemoria Info */}
            {record.haPromemoria && (
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/50 flex items-start gap-3">
                <Bell size={18} className="text-amber-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-amber-300 block">Promemoria attivo</span>
                  <span className="text-slate-300">
                    Prossima scadenza: {record.dataPromemoria ? formatDateIt(record.dataPromemoria) : 'N/D'}
                    {record.kmPromemoria ? ` oppure a ${formatKm(record.kmPromemoria)}` : ''}
                  </span>
                </div>
              </div>
            )}

            {/* Note */}
            {record.note && (
              <div className="p-3.5 rounded-xl bg-[#0e1624] border border-slate-800">
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block mb-1">
                  Note
                </span>
                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {record.note}
                </p>
              </div>
            )}

            {/* Allegati: Foto e Documenti PDF */}
            {attachmentsList.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block">
                    Ricevute & Documenti Allegati ({attachmentsList.length})
                  </span>
                  <span className="text-[10px] text-blue-400 font-semibold">
                    Tocca per visualizzare
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attachmentsList.map((att, idx) => {
                    const isPdf = att.tipo === 'pdf' || att.nome.toLowerCase().endsWith('.pdf') || att.url.startsWith('data:application/pdf');
                    return (
                      <div
                        key={att.id || idx}
                        onClick={() => setActiveAttachmentPreview(att)}
                        className="p-2.5 rounded-2xl bg-[#0e1625] hover:bg-[#131e33] border border-slate-700/80 flex items-center justify-between gap-2.5 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {isPdf ? (
                            <div className="w-11 h-11 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex flex-col items-center justify-center shrink-0">
                              <FileText size={18} />
                              <span className="text-[7px] font-bold uppercase mt-0.5">PDF</span>
                            </div>
                          ) : (
                            <div className="w-11 h-11 rounded-xl overflow-hidden bg-black/60 border border-slate-700 shrink-0 relative">
                              <img
                                src={att.url}
                                alt={att.nome}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center">
                                <Eye size={13} className="text-white opacity-80" />
                              </div>
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-white block truncate group-hover:text-blue-300 transition-colors">
                              {att.nome}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className={`font-mono font-bold px-1.5 py-0.2 rounded text-[9px] ${isPdf ? 'bg-rose-950 text-rose-300' : 'bg-blue-950 text-blue-300'}`}>
                                {isPdf ? 'Documento PDF' : 'Immagine'}
                              </span>
                              {att.dimensione && (
                                <span>{(att.dimensione / 1024).toFixed(0)} KB</span>
                              )}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadFile(att);
                          }}
                          className="p-1.5 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                          title="Scarica allegato"
                        >
                          <Download size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Allegati */}

          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {confirmDelete && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#1e293b] p-5 rounded-2xl border border-slate-700 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Eliminare questo record?</h4>
                  <p className="text-xs text-slate-400">Questa operazione non può essere annullata.</p>
                </div>
              </div>

              <div className="p-3 bg-[#0f172a] rounded-xl text-xs text-slate-300">
                <p className="font-semibold text-white">{record.titolo}</p>
                <p className="text-slate-400 mt-0.5">{formatDateIt(record.data)} • {formatCurrency(record.costo)}</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Annulla
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Elimina definitivamente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Anteprima Allegato Fullscreen / PDF */}
        {activeAttachmentPreview && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col p-3 sm:p-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 text-white border-b border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                {activeAttachmentPreview.tipo === 'pdf' || activeAttachmentPreview.nome.toLowerCase().endsWith('.pdf') ? (
                  <FileText size={18} className="text-rose-400 shrink-0" />
                ) : (
                  <ImageIcon size={18} className="text-blue-400 shrink-0" />
                )}
                <span className="text-xs sm:text-sm font-bold truncate">
                  {activeAttachmentPreview.nome}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadFile(activeAttachmentPreview)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md"
                  title="Scarica allegato sul dispositivo"
                >
                  <Download size={14} />
                  <span>Scarica</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveAttachmentPreview(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer ml-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center overflow-auto p-2">
              {activeAttachmentPreview.tipo === 'pdf' || activeAttachmentPreview.nome.toLowerCase().endsWith('.pdf') || activeAttachmentPreview.url.startsWith('data:application/pdf') ? (
                <div className="w-full h-full max-w-4xl flex flex-col items-center justify-center bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl p-2">
                  <object
                    data={activeAttachmentPreview.url}
                    type="application/pdf"
                    className="w-full h-full rounded-xl min-h-[450px]"
                  >
                    <div className="p-8 text-center space-y-3">
                      <FileText size={48} className="text-rose-400 mx-auto" />
                      <p className="text-sm font-bold text-white">{activeAttachmentPreview.nome}</p>
                      <p className="text-xs text-slate-400">
                        Anteprima PDF non supportata dal browser. Clicca su Scarica per aprirlo.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDownloadFile(activeAttachmentPreview)}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-lg"
                      >
                        <Download size={15} />
                        Scarica Documento PDF
                      </button>
                    </div>
                  </object>
                </div>
              ) : (
                <img
                  src={activeAttachmentPreview.url}
                  alt={activeAttachmentPreview.nome}
                  className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
                />
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
