import React from 'react';
import { X, Share, PlusSquare, Smartphone, Check } from 'lucide-react';

interface IOSInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSInstallGuideModal: React.FC<IOSInstallGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div 
        className="relative w-full max-w-sm bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-2xl p-6 pb-safe z-10 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto -mt-2 mb-3 sm:hidden" />

        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Smartphone size={18} />
            </div>
            <h3 className="text-sm font-bold text-white">Instalar en tu iPhone</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 mt-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Convierte esta web en una aplicación nativa para tu pantalla de inicio en solo 2 pasos:
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Share size={18} />
              </div>
              <div className="text-xs">
                <strong className="text-white block font-semibold">1. Toca "Compartir" en Safari</strong>
                <p className="text-slate-400 mt-0.5">
                  Presiona el ícono del cuadrado con flecha hacia arriba en la barra inferior de Safari.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <PlusSquare size={18} />
              </div>
              <div className="text-xs">
                <strong className="text-white block font-semibold">2. "Agregar a pantalla de inicio"</strong>
                <p className="text-slate-400 mt-0.5">
                  Desliza hacia abajo en las opciones y pulsa <strong>Agregar a pantalla de inicio</strong> (Add to Home Screen).
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
            <Check size={16} className="flex-shrink-0 text-emerald-400" />
            <span>Se abrirá a pantalla completa sin marcos de navegador y con carga ultrarrápida.</span>
          </div>

          <button
            onClick={onClose}
            className="ios-active w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
