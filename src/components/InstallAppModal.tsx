import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Download,
  Smartphone,
  Monitor,
  CheckCircle2,
  Copy,
  ExternalLink,
  X,
  Share2,
  MoreVertical,
  Layers,
  Sparkles,
  Command,
  Laptop,
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'desktop' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  const [downloadedShortcut, setDownloadedShortcut] = useState(false);

  if (!isOpen) return null;

  const getShareableUrl = () => {
    if (typeof window === 'undefined') return '';
    let url = window.location.href;
    if (url.includes('ais-dev-')) {
      url = url.replace('ais-dev-', 'ais-pre-');
    }
    try {
      const parsed = new URL(url);
      return `${parsed.origin}/`;
    } catch {
      return url;
    }
  };

  const shareableUrl = getShareableUrl();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadWindowsShortcut = () => {
    const shortcutContent = `[InternetShortcut]\r\nURL=${shareableUrl}\r\nIconIndex=0\r\nIconFile=${shareableUrl}favicon.ico\r\nHotKey=0\r\n`;
    const blob = new Blob([shortcutContent], { type: 'application/x-mswinurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DriveCheck_Desktop.url';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadedShortcut(true);
    setTimeout(() => setDownloadedShortcut(false), 3000);
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#111827] border border-slate-700/80 rounded-3xl p-5 text-white shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-emerald-500/50 shadow-lg shadow-emerald-950/80 shrink-0">
              <img src="/drivecheck_icon.png" alt="DriveCheck Icona" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Installa DriverCheck</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">PC & Mobile</span>
              </h3>
              <p className="text-xs text-emerald-400 font-medium">Icona verde neon per Desktop & Smartphone</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selector: PC/Desktop vs Smartphone */}
        <div className="grid grid-cols-2 gap-2 bg-[#0c1322] p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('desktop')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'desktop'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor size={15} />
            <span>Versione PC / Desktop</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mobile')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'mobile'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone size={15} />
            <span>Smartphone (Android/iOS)</span>
          </button>
        </div>

        {/* Status: Already Installed? */}
        {isInstalled && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-600/70 text-emerald-200 text-xs flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span>L'applicazione è già installata sul tuo dispositivo in modalità standalone!</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* SEZIONE 1: VERSIONE PC / DESKTOP (WINDOWS & MAC)                */}
        {/* ============================================================== */}
        {activeTab === 'desktop' && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            
            {/* Opzione 1: Installazione come App PC Windows/Mac */}
            <div className="p-4 rounded-2xl bg-[#142033] border border-blue-500/40 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                <Laptop size={16} className="text-blue-400" />
                <span>1. Installa come Applicazione PC (Chrome, Edge)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Apre DriverCheck in una finestra nativa indipendente a tutto schermo, con icona nella <strong>barra delle applicazioni di Windows</strong> e nel menu Start.
              </p>

              {isInstallable ? (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-950 cursor-pointer"
                >
                  <Download size={15} />
                  <span>Installa DriverCheck su questo PC</span>
                </button>
              ) : (
                <div className="p-2.5 rounded-xl bg-[#0e1726] border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>
                    Clicca sull'icona <strong>"Installa"</strong> presente nella barra degli indirizzi del browser in alto a destra (oppure menu del browser <strong>⋮</strong> &gt; <em>"Installa DriverCheck"</em>).
                  </span>
                </div>
              )}
            </div>

            {/* Opzione 2: Scarica Collegamento Desktop Windows (.url) */}
            <div className="p-4 rounded-2xl bg-[#0f2420] border border-emerald-500/40 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <Download size={16} className="text-emerald-400" />
                <span>2. Scarica Collegamento Rapido per il Desktop</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Scarica subito il file di collegamento <code>DriveCheck_Desktop.url</code>: ti basterà trascinarlo sul tuo desktop di Windows per aprire il programma con un doppio clic.
              </p>

              <button
                type="button"
                onClick={handleDownloadWindowsShortcut}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 cursor-pointer"
              >
                {downloadedShortcut ? (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Scorciatoia Scaricata sul PC!</span>
                  </>
                ) : (
                  <>
                    <Download size={15} />
                    <span>Scarica Scorciatoia Desktop (.URL)</span>
                  </>
                )}
              </button>
            </div>

            {/* Scorciatoie da Tastiera PC */}
            <div className="p-3.5 rounded-2xl bg-[#0e1726] border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Command size={14} className="text-blue-400" />
                <span>Scorciatoie da Tastiera su PC:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div className="p-2 rounded-lg bg-[#141e2e] border border-slate-800 flex items-center justify-between">
                  <span>Tasto <strong>1</strong></span>
                  <span className="text-slate-200">Riepilogo</span>
                </div>
                <div className="p-2 rounded-lg bg-[#141e2e] border border-slate-800 flex items-center justify-between">
                  <span>Tasto <strong>2</strong></span>
                  <span className="text-slate-200">Cronologia</span>
                </div>
                <div className="p-2 rounded-lg bg-[#141e2e] border border-slate-800 flex items-center justify-between">
                  <span>Tasto <strong>3</strong></span>
                  <span className="text-slate-200">Parco Auto</span>
                </div>
                <div className="p-2 rounded-lg bg-[#141e2e] border border-slate-800 flex items-center justify-between">
                  <span>Tasto <strong>4</strong></span>
                  <span className="text-slate-200">Impostazioni</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* SEZIONE 2: VERSIONE SMARTPHONE (ANDROID / IOS)                  */}
        {/* ============================================================== */}
        {activeTab === 'mobile' && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {/* GUIDA PASSO PASSO ANDROID */}
            <div className="p-4 rounded-2xl bg-[#152033] border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                <Smartphone size={16} /> Su Android (Chrome o Samsung Internet)
              </div>

              <ol className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Apri il browser <strong>Google Chrome</strong> sul tuo telefono Android.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Tocca i <strong>tre puntini (⋮)</strong> in alto a destra nel menu di Chrome.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Seleziona <strong>"Aggiungi a schermata Home"</strong> oppure <strong>"Installa app"</strong>.
                  </span>
                </li>
              </ol>
            </div>

            {/* GUIDA PASSO PASSO IPHONE (SAFARI) */}
            <div className="p-4 rounded-2xl bg-[#1f1b2e] border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
                <Share2 size={16} /> Su iPhone / iPad (Safari)
              </div>

              <ol className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Apri questo link con <strong>Safari</strong> sul tuo iPhone.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Tocca il tasto di <strong>Condivisione (icona quadrato con freccia in su)</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Scorri verso il basso e tocca <strong>"Aggiungi alla schermata Home"</strong>.
                  </span>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Link Condivisibile */}
        <div className="p-3.5 rounded-2xl bg-[#0c1322] border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Share2 size={13} className="text-blue-400" /> Link di Accesso:
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950/50 border border-blue-700/50 cursor-pointer transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  <span className="text-emerald-400">Copiato!</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copia link</span>
                </>
              )}
            </button>
          </div>

          <div className="p-2.5 rounded-xl bg-[#141e2e] border border-slate-700/60 font-mono text-[11px] text-blue-300 break-all select-all">
            {shareableUrl}
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
        >
          Ho Capito, Chiudi
        </button>

      </div>
    </div>
  );
};
