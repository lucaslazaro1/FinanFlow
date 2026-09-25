import React, { useState } from 'react';
import { Settings2, Download, Smartphone, ChevronDown, Check, Calendar, History, ArrowLeft, RotateCcw, X, Eye, EyeOff } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { FinanFlowLogo } from './FinanFlowLogo';
import { formatPeriodSpanish } from '../utils/format';
import { triggerHaptic } from '../hooks/useFinanceStore';

interface HeaderProps {
  currentPeriodKey: string;
  selectedPeriod: string;
  periodsIndex: string[];
  isViewingHistory: boolean;
  onSelectPeriod: (period: string) => void;
  onReturnToCurrentPeriod: () => void;
  onOpenSettings: () => void;
  onOpenInstallGuide: () => void;
  privacyMode?: boolean;
  onTogglePrivacyMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentPeriodKey,
  selectedPeriod,
  periodsIndex,
  isViewingHistory,
  onSelectPeriod,
  onReturnToCurrentPeriod,
  onOpenSettings, 
  onOpenInstallGuide,
  privacyMode = false,
  onTogglePrivacyMode,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  const formattedSelectedMonth = formatPeriodSpanish(selectedPeriod);

  // Generate a list of the last 12 months so user can select any past month
  const candidateMonths = React.useMemo(() => {
    const list: string[] = [];
    const now = new Date();
    
    // Last 12 months
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      list.push(key);
    }
    
    // Add any existing indexed periods that might be older
    periodsIndex.forEach(p => {
      if (!list.includes(p)) {
        list.push(p);
      }
    });

    return list.sort().reverse();
  }, [periodsIndex]);

  return (
    <>
      <header className="sticky top-0 z-30 w-full pt-safe bg-slate-950/85 backdrop-blur-xl border-b border-white/5 transition-all">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          {/* Brand & Interactive Month Selector */}
          <div className="flex items-center gap-2.5">
            <FinanFlowLogo size={32} />
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold tracking-tight text-white leading-none font-sans">
                  Finan<span className="text-emerald-400">Flow</span>
                </h1>
                {isViewingHistory && (
                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 animate-pulse">
                    Histórico
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-0.5">
                {/* Month Dropdown Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setShowMonthDropdown(true);
                  }}
                  className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white font-semibold capitalize tracking-tight group px-1.5 py-0.5 rounded-lg hover:bg-white/10 transition"
                  title="Cambiar o consultar mes anterior"
                >
                  <span>{formattedSelectedMonth}</span>
                  <ChevronDown size={12} className="text-slate-400 group-hover:text-emerald-400 transition-transform" />
                </button>

                {/* Privacy Mode Toggle */}
                {onTogglePrivacyMode && (
                  <button
                    type="button"
                    onClick={onTogglePrivacyMode}
                    className={`p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition flex items-center justify-center ${
                      privacyMode ? 'text-amber-400 hover:text-amber-300 bg-amber-500/15' : ''
                    }`}
                    title={privacyMode ? "Montos ocultos (Toca para mostrar)" : "Modo Privacidad (Toca para ocultar montos)"}
                    aria-label="Alternar Modo Privacidad"
                  >
                    {privacyMode ? <EyeOff size={13} className="text-amber-400" /> : <Eye size={13} />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action icons: Month Reset / Return if history + Install App + Settings */}
          <div className="flex items-center gap-1.5">
            {isViewingHistory && (
              <button
                type="button"
                onClick={onReturnToCurrentPeriod}
                className="ios-active flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 transition mr-0.5"
                title="Volver al mes actual"
              >
                <RotateCcw size={12} />
                <span className="hidden sm:inline">Mes actual</span>
                <span className="sm:hidden">Actual</span>
              </button>
            )}

            {!isInstalled && (
              <>
                {isInstallable ? (
                  <button
                    onClick={install}
                    className="ios-active flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition hover:bg-emerald-500/25"
                  >
                    <Download size={13} />
                    <span>Instalar</span>
                  </button>
                ) : (
                  <button
                    onClick={onOpenInstallGuide}
                    className="ios-active flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-medium transition hover:bg-white/10"
                    title="Instalar en iPhone"
                  >
                    <Smartphone size={13} className="text-emerald-400" />
                    <span className="hidden sm:inline">PWA iPhone</span>
                    <span className="sm:hidden">App</span>
                  </button>
                )}
              </>
            )}

            <button
              onClick={onOpenSettings}
              className="ios-active p-2 rounded-full text-slate-400 hover:text-slate-100 hover:bg-white/5 transition"
              aria-label="Ajustes y Copia de Seguridad"
            >
              <Settings2 size={19} />
            </button>
          </div>
        </div>
      </header>

      {/* Month Selector Sheet / Modal */}
      {showMonthDropdown && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowMonthDropdown(false)} />
          
          <div 
            className="relative w-full max-w-sm bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col z-10 pb-safe animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
            
            <div className="px-5 pt-3 pb-3 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Seleccionar Período</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMonthDropdown(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick button to return to current month if in history */}
            {isViewingHistory && (
              <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 px-5">
                <button
                  type="button"
                  onClick={() => {
                    onReturnToCurrentPeriod();
                    setShowMonthDropdown(false);
                  }}
                  className="ios-active w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <RotateCcw size={14} className="stroke-[2.5]" />
                  <span>Volver al Mes Actual ({formatPeriodSpanish(currentPeriodKey)})</span>
                </button>
              </div>
            )}

            {/* Months List */}
            <div className="p-3 space-y-1.5 overflow-y-auto max-h-[60vh]">
              {candidateMonths.map((period) => {
                const isCurrent = period === currentPeriodKey;
                const isSelected = period === selectedPeriod;
                const hasSavedData = periodsIndex.includes(period);
                const periodLabel = formatPeriodSpanish(period);

                return (
                  <button
                    key={period}
                    type="button"
                    onClick={() => {
                      onSelectPeriod(period);
                      setShowMonthDropdown(false);
                    }}
                    className={`ios-active w-full flex items-center justify-between p-3 rounded-2xl transition border ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-white font-bold'
                        : 'bg-white/[0.03] border-white/5 text-slate-300 hover:bg-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        isCurrent 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-white/5 text-slate-400'
                      }`}>
                        {isCurrent ? <Calendar size={16} /> : <History size={16} />}
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold capitalize">{periodLabel}</span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Actual
                            </span>
                          )}
                          {!isCurrent && hasSavedData && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/5 text-slate-400">
                              Historial
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {isCurrent ? 'Período en curso' : 'Modo consulta histórica'}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                        <Check size={14} className="stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
