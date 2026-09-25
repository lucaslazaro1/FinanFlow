import React, { useRef } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  RotateCcw, 
  Trash2, 
  ShieldCheck, 
  Coins, 
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { triggerHaptic } from '../hooks/useFinanceStore';

interface BackupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencySymbol: string;
  onSetCurrency: (symbol: string) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonStr: string) => boolean;
  onResetToDefault: () => void;
  onClearAll: () => void;
  onStartCleanSlate: () => void;
  onOpenInstallGuide: () => void;
}

export const BackupSettingsModal: React.FC<BackupSettingsModalProps> = ({
  isOpen,
  onClose,
  currencySymbol,
  onSetCurrency,
  onExportBackup,
  onImportBackup,
  onResetToDefault,
  onClearAll,
  onStartCleanSlate,
  onOpenInstallGuide,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCleanSlateConfirm, setShowCleanSlateConfirm] = React.useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = onImportBackup(content);
        if (success) {
          alert('¡Copia de seguridad restaurada correctamente!');
          onClose();
        } else {
          alert('El archivo seleccionado no tiene el formato válido de FinanFlow.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteCleanSlate = () => {
    onStartCleanSlate();
    setShowCleanSlateConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div 
        className="relative w-full max-w-md bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-2xl p-5 pb-safe z-10 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Ajustes & Configuración</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 mt-4">
          {/* Símbolo de Moneda */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Símbolo de Moneda Principal
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['$', 'ARS $', 'US$', '€'].map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onSetCurrency(sym);
                  }}
                  className={`ios-active py-2 rounded-xl text-xs font-bold border transition ${
                    currencySymbol === sym
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          {/* iPhone PWA Guide Button */}
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Smartphone size={16} className="text-indigo-400 shrink-0" />
                <span className="text-xs font-bold text-white truncate">Instalar en tu iPhone</span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenInstallGuide();
                }}
                className="ios-active whitespace-nowrap text-xs font-semibold text-blue-400 hover:text-blue-300 transition shrink-0"
              >
                Ver cómo &rarr;
              </button>
            </div>
            <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
              Úsalo a pantalla completa como una app nativa desde tu pantalla de inicio en Safari con guardado offline permanente.
            </p>
          </div>

          {/* MODO PRODUCCIÓN: INICIAR EN LIMPIO */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-rose-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <Trash2 size={15} />
                <span>Modo Producción / Iniciar en Limpio</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Borra todos los movimientos de prueba, saldos ficticios y datos mock. Deja los balances en $0 para que cargues tus ingresos, servicios y tarjetas reales desde cero.
            </p>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                setShowCleanSlateConfirm(true);
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-red-500/40 bg-red-950/20 hover:bg-red-900/30 text-rose-300 font-semibold text-[11px] sm:text-xs flex items-center justify-center gap-2 text-center transition active:scale-95"
            >
              <svg className="w-4 h-4 shrink-0 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/>
              </svg>
              <span className="whitespace-nowrap">Borrar datos de demo e iniciar de cero</span>
            </button>
          </div>

          {/* Backup Export / Import */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Copia de Seguridad (JSON)
            </label>
            <p className="text-[11px] text-slate-400">
              Tus datos están guardados de forma 100% privada y persistente en tu dispositivo. Exporta una copia periódica como resguardo.
            </p>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={onExportBackup}
                className="ios-active flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-950 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/5 transition"
              >
                <Download size={14} className="text-emerald-400" />
                <span>Exportar JSON</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="ios-active flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-950 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/5 transition"
              >
                <Upload size={14} className="text-indigo-400" />
                <span>Restaurar JSON</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Reset / Demo options */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (confirm('¿Restablecer datos a los ejemplos de muestra? Se sobrescribirán tus cambios.')) {
                  onResetToDefault();
                  onClose();
                }
              }}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
            >
              <RotateCcw size={12} />
              <span>Cargar datos de ejemplo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm('¿Borrar TODOS los datos de este mes?')) {
                  onClearAll();
                  onClose();
                }
              }}
              className="text-xs text-slate-500 hover:text-rose-400 flex items-center gap-1 transition"
            >
              <Trash2 size={12} />
              <span>Limpiar mes actual</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Clean Slate */}
      {showCleanSlateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-5 shadow-2xl text-center space-y-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <Trash2 size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">
                ¿Borrar datos de demo e iniciar de cero?
              </h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Esta acción eliminará todos los movimientos ficticios, gastos fijos y tarjetas de prueba.
                <br /><br />
                Todos los balances quedarán en <strong className="text-emerald-400">$0</strong> y la app lista para que comiences a registrar tus finanzas reales de forma permanente.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCleanSlateConfirm(false)}
                className="ios-active flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs border border-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteCleanSlate}
                className="ios-active flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950"
              >
                Sí, Iniciar de Cero
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
