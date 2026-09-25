import React from 'react';
import { X, Calendar, Clock, CreditCard as CardIcon, Banknote, Layers, FileText, CheckCircle2 } from 'lucide-react';
import { Expense, CreditCard, InstallmentPurchase, CATEGORIES } from '../types/finance';
import { CategoryIcon } from './CategoryIcon';
import { formatCurrency, formatFullDateTimeSpanish } from '../utils/format';
import { triggerHaptic } from '../hooks/useFinanceStore';

interface MovementDetailModalProps {
  expense: Expense | null;
  onClose: () => void;
  creditCards: CreditCard[];
  installmentPurchases?: InstallmentPurchase[];
  currencySymbol: string;
}

export const MovementDetailModal: React.FC<MovementDetailModalProps> = ({
  expense,
  onClose,
  creditCards,
  installmentPurchases = [],
}) => {
  if (!expense) return null;

  const isCredit = expense.paymentMethod === 'credit_card';
  const isUSD = expense.currency === 'USD';
  const card = expense.creditCardId ? creditCards.find(c => c.id === expense.creditCardId) : null;
  const categoryDef = CATEGORIES.find(c => c.id === expense.category) || CATEGORIES[CATEGORIES.length - 1];

  // Helper to extract installment information if present
  let installmentData = expense.installmentInfo;
  if (!installmentData) {
    // Check note for patterns like (Cuota 1 de 6) or (Cuota 1/6)
    const match = expense.note?.match(/cuota\s*(\d+)\s*(?:de|\/)\s*(\d+)/i);
    if (match) {
      const cur = parseInt(match[1], 10);
      const tot = parseInt(match[2], 10);
      if (cur && tot) {
        installmentData = {
          current: cur,
          total: tot,
          installmentAmount: expense.amount,
          totalAmount: expense.amount * tot,
        };
      }
    }
  }

  // Check matching installment purchase from list if still not found
  if (!installmentData && isCredit && expense.creditCardId) {
    const matchedInst = installmentPurchases.find(
      ip => ip.creditCardId === expense.creditCardId &&
        (expense.note?.toLowerCase().includes(ip.description.toLowerCase()) ||
         ip.description.toLowerCase().includes(expense.note?.toLowerCase() || ''))
    );
    if (matchedInst) {
      installmentData = {
        current: matchedInst.currentInstallment,
        total: matchedInst.totalInstallments,
        installmentAmount: matchedInst.installmentAmount,
        totalAmount: matchedInst.totalAmount,
      };
    }
  }

  const { dateStr, timeStr } = formatFullDateTimeSpanish(expense.createdAt, expense.date);

  const displayTitle = expense.note?.trim() || (
    isCredit 
      ? `Consumo con Tarjeta ${card?.name ? card.name : ''}` 
      : isUSD 
        ? `Gasto en USD (${categoryDef.label})` 
        : `Gasto en ${categoryDef.label}`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      {/* Click outside to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal sheet */}
      <div 
        className="relative w-full max-w-lg bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col z-10 pb-safe animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mt-3 mb-1 sm:hidden flex-shrink-0" />

        {/* Modal Header */}
        <div className="px-5 pt-3 pb-3 flex items-center justify-between border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs uppercase tracking-wider font-bold text-slate-300">
              Detalle de Movimiento
            </span>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="ios-active p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
            aria-label="Cerrar detalle"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body with smooth vertical scroll */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4 min-h-0">
          {/* Main Title & Amount Highlight Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-950/80 border border-white/10 text-center relative overflow-hidden shadow-inner">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 mb-2">
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: categoryDef.color }} 
              />
              <span className="text-[11px] font-semibold text-slate-300">
                {categoryDef.label}
              </span>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                isUSD ? 'bg-amber-400/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {isUSD ? 'USD' : 'ARS'}
              </span>
            </div>

            {/* Concepto / Título completo sin truncar */}
            <h3 className="text-base sm:text-lg font-extrabold text-white break-words px-2 leading-snug">
              {displayTitle}
            </h3>

            {/* Monto formateado */}
            <div className="mt-2 flex items-baseline justify-center gap-1.5">
              <span className={`text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums ${
                isUSD ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                -{formatCurrency(expense.amount, expense.currency || 'ARS')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isCredit 
                ? 'Consumo cargado al resumen de tarjeta de crédito' 
                : isUSD 
                  ? 'Descontado de tu caja / disponible en dólares' 
                  : 'Descontado de tu disponible en efectivo / débito'}
            </p>
          </div>

          {/* Cuotas breakdown if applicable */}
          {installmentData && (
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-300">
                  <Layers size={18} className="text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Compra en Cuotas
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 text-xs font-extrabold">
                  Cuota {installmentData.current} de {installmentData.total}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-indigo-500/20 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">Valor por cuota</span>
                  <span className="font-extrabold text-white text-sm">
                    {formatCurrency(installmentData.installmentAmount, expense.currency || 'ARS')}
                  </span>
                </div>
                {installmentData.totalAmount && (
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Total de la compra</span>
                    <span className="font-bold text-indigo-200 text-sm">
                      {formatCurrency(installmentData.totalAmount, expense.currency || 'ARS')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="space-y-2.5">
            {/* Payment Method */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isCredit ? 'bg-indigo-500/15 text-indigo-400' : isUSD ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
                }`}>
                  {isCredit ? <CardIcon size={18} /> : <Banknote size={18} />}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Método de Pago
                  </span>
                  <p className="text-xs font-bold text-white">
                    {isCredit 
                      ? (card ? `${card.name} (*${card.lastDigits})` : 'Tarjeta de Crédito')
                      : (isUSD ? 'Caja / Efectivo USD' : 'Efectivo / Débito')}
                  </p>
                  {isCredit && card?.bankName && (
                    <span className="text-[10px] text-slate-400">
                      Banco {card.bankName}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {isCredit ? 'Crédito' : isUSD ? 'Dólares' : 'Contado'}
              </span>
            </div>

            {/* Category */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition"
                  style={{
                    backgroundColor: categoryDef.bgLight || 'rgba(255, 255, 255, 0.08)',
                    color: categoryDef.color,
                  }}
                >
                  <CategoryIcon categoryId={expense.category} size={18} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Categoría Asignada
                  </span>
                  <p className="text-xs font-bold text-white">
                    {categoryDef.label}
                  </p>
                </div>
              </div>
            </div>

            {/* Exact Date & Time */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                  <Calendar size={18} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Fecha de Registro
                  </span>
                  <p className="text-xs font-bold text-white">
                    {dateStr}
                  </p>
                </div>
              </div>
              <div className="text-right flex items-center gap-1.5 text-slate-400">
                <Clock size={13} className="text-slate-500" />
                <span className="text-xs font-mono text-slate-300 font-medium">
                  {timeStr}
                </span>
              </div>
            </div>

            {/* Additional Notes or Details */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
              <div className="flex items-center gap-2 mb-1 text-slate-400">
                <FileText size={14} />
                <span className="text-[10px] uppercase font-semibold tracking-wider">
                  Notas / Observaciones
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed break-words pl-6">
                {expense.note?.trim() ? expense.note : 'Sin notas adicionales ingresadas.'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer with Close Button */}
        <div className="p-4 sm:p-5 pt-3 border-t border-white/10 bg-slate-900/95 backdrop-blur flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="ios-active w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs tracking-wider uppercase transition border border-white/10 flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>Cerrar Detalle</span>
          </button>
        </div>
      </div>
    </div>
  );
};
