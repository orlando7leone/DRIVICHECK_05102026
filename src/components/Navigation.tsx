import React from 'react';
import {
  PieChart,
  ListFilter,
  Car,
  Settings,
  Plus,
} from 'lucide-react';

export type TabType = 'riepilogo' | 'cronologia' | 'garage' | 'imposta';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenFab: () => void;
  isFabOpen: boolean;
  isDesktopMode?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  onOpenFab,
  isFabOpen,
  isDesktopMode,
}) => {
  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-40 bg-[#0d1420]/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1.5 transition-all shadow-2xl ${
      isDesktopMode ? 'max-w-6xl xl:max-w-7xl mx-auto' : 'max-w-md mx-auto sm:max-w-lg md:max-w-xl'
    }`}>
      <div className="flex items-center justify-around relative">
        
        {/* Tab 1: Riepilogo */}
        <button
          onClick={() => onTabChange('riepilogo')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'riepilogo' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PieChart size={20} className={activeTab === 'riepilogo' ? 'scale-110 transition-transform' : ''} />
          <span className="text-[10px] mt-1">Riepilogo</span>
        </button>

        {/* Tab 2: Cronologia */}
        <button
          onClick={() => onTabChange('cronologia')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'cronologia' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListFilter size={20} className={activeTab === 'cronologia' ? 'scale-110 transition-transform' : ''} />
          <span className="text-[10px] mt-1">Cronologia</span>
        </button>

        {/* Center Floating Action Button (+) */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            onClick={onOpenFab}
            className={`w-14 h-14 rounded-full bg-gradient-to-tr from-blue-700 via-blue-500 to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 border-4 border-[#0d1420] transition-transform active:scale-95 ${
              isFabOpen ? 'rotate-45' : 'hover:scale-105'
            }`}
            title="Nuovo intervento o azione"
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
        </div>

        {/* Tab 4: Garage */}
        <button
          onClick={() => onTabChange('garage')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'garage' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Car size={20} className={activeTab === 'garage' ? 'scale-110 transition-transform' : ''} />
          <span className="text-[10px] mt-1">Garage</span>
        </button>

        {/* Tab 5: Imposta */}
        <button
          onClick={() => onTabChange('imposta')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'imposta' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings size={20} className={activeTab === 'imposta' ? 'scale-110 transition-transform' : ''} />
          <span className="text-[10px] mt-1">Imposta</span>
        </button>

      </div>
    </nav>
  );
};
