import React from 'react';
import {
  X,
  Wrench,
  Disc,
  FileEdit,
  ShieldCheck,
  FolderSync,
} from 'lucide-react';

interface FabSpeedDialProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (
    action: 'manutenzione' | 'registro_gomme' | 'altri_interventi' | 'registro_pagamenti'
  ) => void;
  onOpenDataTransfer?: () => void;
}

export const FabSpeedDial: React.FC<FabSpeedDialProps> = ({
  isOpen,
  onClose,
  onSelectAction,
  onOpenDataTransfer,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm flex flex-col justify-end items-center pb-24 animate-in fade-in duration-150">
      
      {/* Speed Dial Actions */}
      <div className="flex flex-col items-center gap-2.5 mb-2 w-full max-w-xs px-4">
        
        {/* Manutenzione */}
        <button
          onClick={() => {
            onSelectAction('manutenzione');
            onClose();
          }}
          className="flex items-center justify-between w-full group animate-in slide-in-from-bottom-2 duration-150 cursor-pointer"
        >
          <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold shadow-lg border border-orange-400/40">
            Manutenzione
          </span>
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform">
            <Wrench size={20} />
          </div>
        </button>

        {/* Registro Gomme */}
        <button
          onClick={() => {
            onSelectAction('registro_gomme');
            onClose();
          }}
          className="flex items-center justify-between w-full group animate-in slide-in-from-bottom-3 duration-200 cursor-pointer"
        >
          <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-xs font-bold shadow-lg border border-cyan-400/40">
            Registro Gomme
          </span>
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-cyan-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition-transform">
            <Disc size={20} />
          </div>
        </button>

        {/* Altri Interventi */}
        <button
          onClick={() => {
            onSelectAction('altri_interventi');
            onClose();
          }}
          className="flex items-center justify-between w-full group animate-in slide-in-from-bottom-4 duration-250 cursor-pointer"
        >
          <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-lg border border-purple-400/40">
            Altri Interventi
          </span>
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-105 transition-transform">
            <FileEdit size={20} />
          </div>
        </button>

        {/* Registro Pagamenti (Revisione, Bollo, Assicurazione) */}
        <button
          onClick={() => {
            onSelectAction('registro_pagamenti');
            onClose();
          }}
          className="flex items-center justify-between w-full group animate-in slide-in-from-bottom-5 duration-300 cursor-pointer"
        >
          <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-lg border border-emerald-400/40">
            Registro Pagamenti (Revisione, Bollo, Assic.)
          </span>
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform">
            <ShieldCheck size={20} />
          </div>
        </button>

        {/* Esporta / Importa Hub */}
        {onOpenDataTransfer && (
          <button
            onClick={() => {
              onClose();
              onOpenDataTransfer();
            }}
            className="flex items-center justify-between w-full group animate-in slide-in-from-bottom-6 duration-350 cursor-pointer pt-1"
          >
            <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg border border-blue-400/40">
              Esporta & Importa Dati
            </span>
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
              <FolderSync size={20} />
            </div>
          </button>
        )}

      </div>

      {/* Close button that sits over the FAB */}
      <button
        onClick={onClose}
        className="w-14 h-14 rounded-full bg-slate-800 border border-slate-600 text-white flex items-center justify-center shadow-2xl hover:bg-slate-700 transition-colors cursor-pointer"
      >
        <X size={26} />
      </button>

    </div>
  );
};
