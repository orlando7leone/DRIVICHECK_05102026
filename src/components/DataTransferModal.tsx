import React from 'react';
import {
  Veicolo,
  InterventoRecord,
  CategoriaManutenzione,
  AnagraficaOfficina,
  AppDataBackup,
} from '../types';
import { UnifiedDataTransfer } from './UnifiedDataTransfer';
import { X, FolderSync } from 'lucide-react';

interface DataTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  veicoli: Veicolo[];
  record: InterventoRecord[];
  catalogo: CategoriaManutenzione[];
  officineAnagrafica?: AnagraficaOfficina[];
  selectedVehicleId?: string;
  onRestoreAllData: (data: AppDataBackup, mode?: 'overwrite' | 'merge') => void;
  onUpdateCatalogo?: (catalogo: CategoriaManutenzione[]) => void;
  onResetCatalog?: () => void;
  onUpdateOfficine?: (officine: AnagraficaOfficina[]) => void;
  onOpenPrintModal?: () => void;
}

export const DataTransferModal: React.FC<DataTransferModalProps> = ({
  isOpen,
  onClose,
  veicoli,
  record,
  catalogo,
  officineAnagrafica = [],
  selectedVehicleId,
  onRestoreAllData,
  onUpdateCatalogo,
  onResetCatalog,
  onUpdateOfficine,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[94vh] flex flex-col bg-[#101726] text-white rounded-t-3xl sm:rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* HEADER MODALE */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 px-5 py-4 flex items-center justify-between text-white shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <FolderSync size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight flex items-center gap-2">
                Centro Esportazioni & Backup
              </h2>
              <p className="text-[11px] text-blue-100 opacity-90">
                Excel Multi-Foglio, CSV, JSON, Dispositivo & Google Drive
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer text-white"
            title="Chiudi"
          >
            <X size={18} />
          </button>
        </div>

        {/* CORPO CON PROCEDURA GUIDATA */}
        <div className="flex-1 overflow-y-auto p-4">
          <UnifiedDataTransfer
            veicoli={veicoli}
            record={record}
            catalogo={catalogo}
            officineAnagrafica={officineAnagrafica}
            selectedVehicleId={selectedVehicleId}
            onRestoreAllData={onRestoreAllData}
            onUpdateCatalogo={onUpdateCatalogo}
            onResetCatalog={onResetCatalog}
            onUpdateOfficine={onUpdateOfficine}
            onClose={onClose}
            isEmbedded={true}
          />
        </div>

      </div>
    </div>
  );
};
