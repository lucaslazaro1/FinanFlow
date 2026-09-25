import React, { useState, useEffect, useRef } from 'react';
import { X, Check, CreditCard as CardIcon, Banknote, Sparkles, Layers } from 'lucide-react';
import { CATEGORIES, CategoryId, PaymentMethod, CreditCard, Currency } from '../types/finance';
import { CategoryIcon } from './CategoryIcon';
import { triggerHaptic } from '../hooks/useFinanceStore';
import { filterNumericInput, handleNumericKeyDown } from '../utils/format';

interface QuickExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (payload: {
    amount: number;
    category: CategoryId;
    paymentMethod: PaymentMethod;
    creditCardId?: string;
    note?: string;
    currency?: Currency;
    installmentInfo?: {
      current: number;
      total: number;
      installmentAmount: number;
      totalAmount?: number;
    };
  }) => void;
  onAddInstallmentPurchase?: (payload: {
    creditCardId: string;
    description: string;
    totalAmount: number;
    installmentAmount: number;
    totalInstallments: number;
    category?: CategoryId;
    currency?: Currency;
  }) => void;
  creditCards: CreditCard[];
  currencySymbol: string;
}

export const QuickExpenseModal: React.FC<QuickExpenseModalProps> = ({
  isOpen,
  onClose,
  onAddExpense,
  onAddInstallmentPurchase,
  creditCards,
  currencySymbol,
}) => {
  const [amountStr, setAmountStr] = useState<string>('');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [category, setCategory] = useState<CategoryId>('supermercado');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_debit');
  const [selectedCardId, setSelectedCardId] = useState<string>(creditCards[0]?.id || '');
  const [note, setNote] = useState<string>('');
  const [showNoteInput, setShowNoteInput] = useState<boolean>(false);
  
  // Installments state
  const [isInstallments, setIsInstallments] = useState<boolean>(false);
  const [totalInstallments, setTotalInstallments] = useState<number>(3);
  const [installmentInputMode, setInstallmentInputMode] = useState<'total' | 'installment'>('total');

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmountStr('');
      setCurrency('ARS');
      setNote('');
      setShowNoteInput(false);
      setIsInstallments(false);
      setTotalInstallments(3);
      setInstallmentInputMode('total');
      if (creditCards.length > 0 && !selectedCardId) {
        setSelectedCardId(creditCards[0].id);
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, creditCards, selectedCardId]);

  if (!isOpen) return null;

  const handleQuickAddAmount = (addValue: number) => {
    triggerHaptic('light');
    const current = parseFloat(amountStr) || 0;
    setAmountStr(String(current + addValue));
  };

  const parsedAmount = parseFloat(amountStr.replace(/[^0-9.]/g, '')) || 0;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!parsedAmount || parsedAmount <= 0) {
      inputRef.current?.focus();
      return;
    }

    if (paymentMethod === 'credit_card' && isInstallments && onAddInstallmentPurchase) {
      const calcTotal = installmentInputMode === 'total' 
        ? parsedAmount 
        : Math.round(parsedAmount * totalInstallments);
      const calcInstallment = installmentInputMode === 'total' 
        ? Math.round(parsedAmount / totalInstallments) 
        : parsedAmount;

      const desc = note.trim() || CATEGORIES.find(c => c.id === category)?.label || 'Compra en cuotas';

      onAddInstallmentPurchase({
        creditCardId: selectedCardId || (creditCards[0]?.id || ''),
        description: desc,
        totalAmount: calcTotal,
        installmentAmount: calcInstallment,
        totalInstallments,
        category,
        currency,
      });

      onAddExpense({
        amount: calcInstallment,
        category,
        paymentMethod: 'credit_card',
        creditCardId: selectedCardId || (creditCards[0]?.id || ''),
        note: `${desc} (Cuota 1 de ${totalInstallments})`,
        currency,
        installmentInfo: {
          current: 1,
          total: totalInstallments,
          installmentAmount: calcInstallment,
          totalAmount: calcTotal,
        },
      });
    } else {
      onAddExpense({
        amount: parsedAmount,
        category,
        paymentMethod,
        creditCardId: paymentMethod === 'credit_card' ? selectedCardId : undefined,
        note: note.trim() || undefined,
        currency,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Click outside to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal sheet */}
      <div 
        className="relative w-full max-w-lg bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] sm:max-h-[85vh] flex flex-col z-10 pb-safe animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mt-3 mb-1 sm:hidden flex-shrink-0" />

        {/* Modal Header */}
        <div className="px-5 pt-2 pb-2 flex items-center justify-between flex-shrink-0 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Gasto Rápido (&lt; 5s)
            </span>
          </div>
          <button
            onClick={onClose}
            className="ios-active p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 py-1 space-y-1">
          {/* Currency Selector [ ARS (Pesos) | USD (Dólares) ] */}
          <div className="flex justify-center px-5 pt-1 pb-1">
          <div className="flex p-0.5 rounded-xl bg-slate-950/80 border border-white/10 w-full max-w-xs">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setCurrency('ARS');
              }}
              className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition ${
                currency === 'ARS' 
                  ? 'bg-emerald-500 text-slate-950 shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ARS (Pesos)
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setCurrency('USD');
              }}
              className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition ${
                currency === 'USD' 
                  ? 'bg-amber-400 text-slate-950 shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              USD (Dólares)
            </button>
          </div>
        </div>

        {/* Amount Input with Native Keyboard */}
        <div className="px-5 py-2 text-center">
          <label className="text-[11px] font-medium text-slate-400 block mb-1">
            {currency === 'USD' 
              ? (isInstallments && installmentInputMode === 'installment' ? 'Monto de cada cuota en USD' : 'Monto en dólares (USD)') 
              : (isInstallments && installmentInputMode === 'installment' ? 'Monto de cada cuota en pesos' : 'Ingresá el monto')}
          </label>
          <div className="relative inline-flex items-center justify-center w-full">
            <span className={`text-3xl sm:text-4xl font-light mr-2 ${currency === 'USD' ? 'text-amber-400 font-bold text-2xl sm:text-3xl' : 'text-slate-400'}`}>
              {currency === 'USD' ? 'US$' : currencySymbol}
            </span>
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={amountStr}
              onChange={(e) => {
                const val = filterNumericInput(e.target.value);
                setAmountStr(val);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                  return;
                }
                handleNumericKeyDown(e);
              }}
              className="w-48 sm:w-64 text-4xl sm:text-5xl font-extrabold tracking-tight text-white bg-transparent text-left focus:outline-none placeholder:text-slate-700"
              autoFocus
            />
          </div>

          {/* Quick preset amount chips for ultra-fast taps */}
          <div className="flex items-center justify-center gap-1.5 mt-3 overflow-x-auto no-scrollbar py-1">
            {(currency === 'USD' ? [5, 10, 20, 50, 100] : [1000, 2000, 5000, 10000, 20000]).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickAddAmount(val)}
                className="ios-active flex-shrink-0 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
              >
                +{currency === 'USD' ? `${val}` : val >= 1000 ? `${val / 1000}k` : val}
              </button>
            ))}
            {amountStr && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setAmountStr('');
                }}
                className="ios-active flex-shrink-0 px-2 py-1 text-xs font-semibold rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/20"
              >
                Borrar
              </button>
            )}
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="px-5 py-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
            Método de Pago
          </label>
          <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-1 rounded-2xl border border-white/5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setPaymentMethod('cash_debit');
                setIsInstallments(false);
              }}
              className={`ios-active flex flex-col items-center justify-center py-2.5 px-3 rounded-xl transition ${
                paymentMethod === 'cash_debit'
                  ? (currency === 'USD' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950 font-bold' : 'bg-emerald-600 text-white shadow-md shadow-emerald-950')
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Banknote size={16} />
                <span>{currency === 'USD' ? 'Caja / Efectivo USD' : 'Efectivo / Débito'}</span>
              </div>
              <span className={`text-[10px] mt-0.5 ${paymentMethod === 'cash_debit' ? (currency === 'USD' ? 'text-slate-900 font-semibold' : 'text-emerald-100') : 'text-slate-400'}`}>
                {currency === 'USD' ? 'Resta del disponible USD' : 'Resta de tu disponible hoy'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setPaymentMethod('credit_card');
              }}
              className={`ios-active flex flex-col items-center justify-center py-2.5 px-3 rounded-xl transition ${
                paymentMethod === 'credit_card'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <CardIcon size={16} />
                <span>Tarjeta de Crédito</span>
              </div>
              <span className={`text-[10px] mt-0.5 ${paymentMethod === 'credit_card' ? 'text-indigo-100' : 'text-slate-400'}`}>
                {currency === 'USD' ? 'Suma a consumos en USD' : 'Suma al resumen (no descuenta hoy)'}
              </span>
            </button>
          </div>

          {/* If credit card selected and multiple cards exist, pick card */}
          {paymentMethod === 'credit_card' && creditCards.length > 0 && (
            <div className="mt-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <span className="text-[11px] text-slate-400 flex-shrink-0">Tarjeta:</span>
              {creditCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedCardId(card.id);
                  }}
                  className={`ios-active flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition flex-shrink-0 ${
                    selectedCardId === card.id
                      ? 'border-indigo-400 bg-indigo-500/20 text-white font-bold'
                      : 'border-white/5 bg-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span>{card.name}</span>
                  <span className="text-[10px] text-slate-300">(*{card.lastDigits})</span>
                </button>
              ))}
            </div>
          )}

          {/* Sección de Compras en Cuotas (Opción activa en Tarjeta de Crédito) */}
          {paymentMethod === 'credit_card' && (
            <div className="mt-2.5 p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/25">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isInstallments}
                    onChange={(e) => {
                      triggerHaptic('light');
                      setIsInstallments(e.target.checked);
                    }}
                    className="w-4 h-4 rounded border-slate-700 text-indigo-500 focus:ring-indigo-400 bg-slate-900"
                  />
                  <span className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                    <Layers size={13} className="text-indigo-400" />
                    <span>¿Es una compra en cuotas?</span>
                  </span>
                </label>
                {isInstallments && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {totalInstallments} cuotas
                  </span>
                )}
              </div>

              {isInstallments && (
                <div className="mt-3 space-y-2.5 pt-2.5 border-t border-indigo-500/20 animate-fade-in">
                  {/* Selector de modo de ingreso: Monto Total o Monto por Cuota */}
                  <div className="flex p-0.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setInstallmentInputMode('total');
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition ${
                        installmentInputMode === 'total' 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      El monto es TOTAL
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setInstallmentInputMode('installment');
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition ${
                        installmentInputMode === 'installment' 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      El monto es POR CUOTA
                    </button>
                  </div>

                  {/* Selector de cantidad de cuotas */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                      Total de cuotas de la compra
                    </label>
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                      {[2, 3, 6, 9, 12, 18, 24].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setTotalInstallments(n);
                          }}
                          className={`ios-active px-3 py-1.5 rounded-xl text-xs font-extrabold border transition ${
                            totalInstallments === n
                              ? 'bg-indigo-500 border-indigo-400 text-slate-950 shadow-sm'
                              : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resumen dinámico del cálculo */}
                  {parsedAmount > 0 && (
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-indigo-500/30 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">
                          {installmentInputMode === 'total' ? 'Cuota del período actual:' : 'Total estimado de la compra:'}
                        </span>
                        <span className="font-extrabold text-white text-sm">
                          {currency === 'USD' ? 'US$' : currencySymbol}{' '}
                          {new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(
                            installmentInputMode === 'total' 
                              ? Math.round(parsedAmount / totalInstallments)
                              : parsedAmount * totalInstallments
                          )}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-indigo-300 font-bold block text-xs">
                          Cuota 1 de {totalInstallments}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {installmentInputMode === 'total' 
                            ? `${totalInstallments} cuotas fijas`
                            : `Total: ${currency === 'USD' ? 'US$' : currencySymbol} ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(parsedAmount * totalInstallments)}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fast Category Grid */}
        <div className="px-5 py-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
            Categoría
          </label>
          <div className="grid grid-cols-5 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setCategory(cat.id);
                }}
                className={`ios-active flex flex-col items-center p-2 rounded-2xl border transition ${
                  category === cat.id
                    ? 'border-emerald-500/80 bg-emerald-500/10 text-white'
                    : 'border-white/5 bg-white/[0.02] text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 transition"
                  style={{
                    backgroundColor: category === cat.id ? cat.color : 'rgba(255, 255, 255, 0.05)',
                    color: category === cat.id ? '#090d16' : cat.color,
                  }}
                >
                  <CategoryIcon categoryId={cat.id} size={20} />
                </div>
                <span className="text-[10px] font-medium text-center line-clamp-1 leading-tight">
                  {cat.label.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Optional Note Accordion */}
        <div className="px-5 py-2">
          {!showNoteInput ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowNoteInput(true);
              }}
              className="text-xs text-slate-400 hover:text-emerald-400 transition"
            >
              + Agregar nota o concepto (opcional)
            </button>
          ) : (
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400">Nota / Detalle de la compra</label>
              <input
                type="text"
                placeholder={isInstallments ? "Ej: Smart TV 55, Pasajes, etc." : "Ej: Supermercado Coto, Café..."}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>
        </div>

        {/* Confirm Ultra-Fast Submit Button */}
        <div className="p-4 sm:p-5 pt-3 border-t border-white/10 bg-slate-900/95 backdrop-blur flex-shrink-0 z-20">
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={parsedAmount <= 0}
            className={`ios-active w-full py-3.5 px-4 rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition ${
              parsedAmount > 0
                ? (isInstallments 
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-indigo-500/25 hover:brightness-110'
                    : currency === 'USD' 
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-amber-500/25 hover:brightness-110'
                      : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 shadow-emerald-500/25 hover:brightness-110')
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Check size={18} className="stroke-[3]" />
            <span>
              {isInstallments 
                ? `Guardar Compra en ${totalInstallments} Cuotas` 
                : currency === 'USD' 
                  ? 'Guardar Gasto en USD' 
                  : 'Guardar Gasto al Instante'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
