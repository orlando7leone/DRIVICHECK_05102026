import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('cartracker_garage_viewmode');
      // Se la quota è stata superata, ripulisci stringhe immagini pesanti
      const rawVeicoli = localStorage.getItem('drivecheck_veicoli') || localStorage.getItem('cartracker_veicoli');
      if (rawVeicoli) {
        try {
          const parsed = JSON.parse(rawVeicoli);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.map((v: any) => {
              if (v && v.immagine && v.immagine.length > 200000) {
                return { ...v, immagine: undefined };
              }
              return v;
            });
            localStorage.setItem('drivecheck_veicoli', JSON.stringify(cleaned));
          }
        } catch {}
      }
    } catch {}
    this.setState({ hasError: false, error: null });
    window.location.hash = '';
    window.location.reload();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#090e17] text-white flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#111927] border border-rose-500/50 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Ripristino Schermata</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Si è verificato un problema momentaneo di visualizzazione. Nessun dato è andato perduto.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Home size={15} />
                <span>Torna alla Home</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw size={15} />
                <span>Ricarica</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
