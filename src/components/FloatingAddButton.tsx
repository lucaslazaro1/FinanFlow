import React from 'react';
import { triggerHaptic } from '../hooks/useFinanceStore';

interface FloatingAddButtonProps {
  onClick: () => void;
}

export const FloatingAddButton: React.FC<FloatingAddButtonProps> = ({ onClick }) => {
  return (
    <button
      id="fab-agregar"
      onClick={() => {
        triggerHaptic('medium');
        onClick();
      }}
      className="fixed z-50 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-transform"
      style={{
        position: 'fixed',
        bottom: '95px',
        right: '20px',
        width: '48px',
        height: '48px',
      }}
      aria-label="Anotar gasto"
    >
      <svg className="w-6 h-6 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </button>
  );
};
