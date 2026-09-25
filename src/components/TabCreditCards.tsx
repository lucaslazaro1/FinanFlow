import React, { useState } from 'react';
import { 
  CreditCard as CardIcon, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Edit3, 
  Sparkles, 
  X, 
  Trash2, 
  History, 
  RotateCcw, 
  Check, 
  Calendar, 
  CalendarPlus, 
  FileText, 
  DollarSign, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Clock,
  CalendarDays,
  CheckCheck,
  Settings2
} from 'lucide-react';
import { CreditCard, CardPayment, Currency, InstallmentPurchase } from '../types/finance';
import { 
  formatMoney, 
  formatCurrency, 
  filterNumericInput, 
  handleNumericKeyDown, 
  formatCardDisplayDate, 
  getDaysUntilDate,
  formatPeriodSpanish 
} from '../utils/format';
import { downloadDueCalendarEvent } from '../utils/calendar';
import { triggerHaptic } from '../hooks/useFinanceStore';

interface TabCreditCardsProps {
  creditCards: CreditCard[];
  trackedExpensesByCard: Record<string, number>;
  trackedExpensesUSDByCard?: Record<string, number>;
  installmentPurchases?: InstallmentPurchase[];
  currencySymbol: string;
  selectedPeriod?: string;
  onUpdateCard: (id: string, updates: Partial<CreditCard>) => void;
  onUpdateMinPayment: (cardId: string, newMin: number) => void;
  onAddCard: (card: Omit<CreditCard, 'id' | 'amountPaid'>) => void;
  onDeleteCard: (id: string) => void;
  onRecordCardPayment: (
    cardId: string, 
    amount: number, 
    deductFromAccount: boolean, 
    note?: string, 
    currency?: Currency
  ) => void;
  onDeleteCardPayment: (cardId: string, paymentId: string) => void;
  onEditCardPayment: (cardId: string, paymentId: string, newAmount: number, newNote?: string) => void;
  onSetCardAmountPaidDirect: (cardId: string, directAmount: number, currency?: Currency) => void;
  onResetCardPayments?: (cardId: string) => void;
  onReconcileCard: (cardId: string, newTotal: number, currency?: Currency) => void;
  onAddInstallmentPurchase?: (payload: {
    creditCardId: string;
    description: string;
    totalAmount: number;
    installmentAmount: number;
    totalInstallments: number;
    category?: any;
    currency?: Currency;
  }) => void;
  onUpdateInstallmentPurchase?: (id: string, updates: Partial<InstallmentPurchase>) => void;
  onDeleteInstallmentPurchase?: (id: string) => void;
  onAdvanceInstallmentPurchase?: (id: string) => void;
}

export const TabCreditCards: React.FC<TabCreditCardsProps> = ({
  creditCards,
  trackedExpensesByCard,
  trackedExpensesUSDByCard,
  installmentPurchases = [],
  currencySymbol,
  selectedPeriod,
  onUpdateCard,
  onUpdateMinPayment,
  onAddCard,
  onDeleteCard,
  onRecordCardPayment,
  onDeleteCardPayment,
  onEditCardPayment,
  onSetCardAmountPaidDirect,
  onResetCardPayments,
  onReconcileCard,
  onAddInstallmentPurchase,
  onUpdateInstallmentPurchase,
  onDeleteInstallmentPurchase,
  onAdvanceInstallmentPurchase,
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string>(creditCards[0]?.id || '');
  
  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showMinPaymentModal, setShowMinPaymentModal] = useState(false);
  const [showPaymentsHistoryModal, setShowPaymentsHistoryModal] = useState(false);
  const [showEditDatesModal, setShowEditDatesModal] = useState(false);
  const [showConfigureSummaryModal, setShowConfigureSummaryModal] = useState(false);
  const [showManageCardModal, setShowManageCardModal] = useState(false);
  const [showDeleteCardConfirmModal, setShowDeleteCardConfirmModal] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit card details state
  const [editCardName, setEditCardName] = useState('');
  const [editCardBankName, setEditCardBankName] = useState('');
  const [editCardLastDigits, setEditCardLastDigits] = useState('');
  const [editCardGradient, setEditCardGradient] = useState('');

  // Edit card dates form state (ISO string dates)
  const [editClosingDateStr, setEditClosingDateStr] = useState('');
  const [editDueDateStr, setEditDueDateStr] = useState('');

  // Configure month summary form state
  const [configStatementBalanceStr, setConfigStatementBalanceStr] = useState('');
  const [configStatementBalanceUSDStr, setConfigStatementBalanceUSDStr] = useState('');
  const [configMinPaymentStr, setConfigMinPaymentStr] = useState('');
  const [configClosingDateStr, setConfigClosingDateStr] = useState('');
  const [configDueDateStr, setConfigDueDateStr] = useState('');

  // Installment Purchases state
  const [showInstallmentsList, setShowInstallmentsList] = useState(false);
  const [showAddInstallmentModal, setShowAddInstallmentModal] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<InstallmentPurchase | null>(null);

  // New installment form state
  const [newInstDesc, setNewInstDesc] = useState('');
  const [newInstAmountStr, setNewInstAmountStr] = useState('');
  const [newInstCount, setNewInstCount] = useState('3');
  const [newInstCurrency, setNewInstCurrency] = useState<Currency>('ARS');
  const [newInstInputMode, setNewInstInputMode] = useState<'total' | 'installment'>('total');

  // Edit installment form state
  const [editInstDesc, setEditInstDesc] = useState('');
  const [editInstAmountStr, setEditInstAmountStr] = useState('');
  const [editInstCurrent, setEditInstCurrent] = useState('1');
  const [editInstTotal, setEditInstTotal] = useState('3');

  // Payment form state
  const [paymentCurrency, setPaymentCurrency] = useState<Currency>('ARS');
  const [paymentAmountStr, setPaymentAmountStr] = useState('');
  const [paymentNoteStr, setPaymentNoteStr] = useState('');
  const [deductFromCash, setDeductFromCash] = useState(true);

  // Edit min payment form state
  const [minPaymentAmountStr, setMinPaymentAmountStr] = useState('');

  // Reconcile form state
  const [reconcileCurrency, setReconcileCurrency] = useState<Currency>('ARS');
  const [reconcileAmountStr, setReconcileAmountStr] = useState('');

  // Direct manual amount paid form state
  const [directAmountPaidStr, setDirectAmountPaidStr] = useState('');
  const [directAmountPaidCurrency, setDirectAmountPaidCurrency] = useState<Currency>('ARS');
  const [showDirectEditForm, setShowDirectEditForm] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [confirmDeletePaymentId, setConfirmDeletePaymentId] = useState<string | null>(null);

  // Editing individual payment inside history
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentAmountStr, setEditPaymentAmountStr] = useState('');
  const [editPaymentNoteStr, setEditPaymentNoteStr] = useState('');

  // Add card form state
  const [newCardName, setNewCardName] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [newLastDigits, setNewLastDigits] = useState('');
  const [newStatement, setNewStatement] = useState('');
  const [newStatementUSD, setNewStatementUSD] = useState('');
  const [newMinPay, setNewMinPay] = useState('');
  const [newClosingDay, setNewClosingDay] = useState('20');
  const [newDueDay, setNewDueDay] = useState('10');
  const [newClosingDate, setNewClosingDate] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  // Helper to trigger toast
  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Currently focused card
  const activeCard = creditCards.find(c => c.id === selectedCardId) || creditCards[0];

  // Active card calculations
  const pendingToPay = activeCard ? Math.max(0, activeCard.statementBalance - activeCard.amountPaid) : 0;
  const pendingToPayUSD = activeCard ? Math.max(0, (activeCard.statementBalanceUSD || 0) - (activeCard.amountPaidUSD || 0)) : 0;
  const isCoveringMin = activeCard ? (activeCard.amountPaid >= activeCard.minPayment || activeCard.minPayment <= 0) : true;
  const isFullyPaid = activeCard ? (pendingToPay === 0 && activeCard.statementBalance > 0) : false;
  const isFullyPaidUSD = activeCard ? (pendingToPayUSD === 0 && (activeCard.statementBalanceUSD || 0) > 0) : false;

  // Closing day calculation and individual card closing alert (<= 2 days)
  const daysUntilClosing = activeCard ? getDaysUntilDate(activeCard.closingDate, activeCard.closingDay || 20) : null;
  const isClosingSoon = daysUntilClosing !== null && daysUntilClosing >= 0 && daysUntilClosing <= 2;

  // Due date calculation and individual card due alert (<= 3 days or overdue)
  const daysUntilDue = activeCard ? getDaysUntilDate(activeCard.dueDate, activeCard.dueDay || 10) : null;
  const isDueOverdue = daysUntilDue !== null && daysUntilDue < 0 && (pendingToPay > 0 || pendingToPayUSD > 0);
  const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 3 && (pendingToPay > 0 || pendingToPayUSD > 0);
  
  const trackedExpensesThisMonth = activeCard ? (trackedExpensesByCard[activeCard.id] || 0) : 0;
  const trackedExpensesUSDThisMonth = activeCard && trackedExpensesUSDByCard ? (trackedExpensesUSDByCard[activeCard.id] || 0) : 0;
  const cardPaymentsList = activeCard ? (activeCard.payments || []) : [];

  // Active installments for the selected card
  const activeCardInstallments = (installmentPurchases || []).filter(
    ip => ip.creditCardId === activeCard?.id && ip.currentInstallment <= ip.totalInstallments
  );
  const totalMonthlyInstallmentsARS = activeCardInstallments
    .filter(ip => (ip.currency || 'ARS') === 'ARS')
    .reduce((acc, ip) => acc + ip.installmentAmount, 0);
  const totalMonthlyInstallmentsUSD = activeCardInstallments
    .filter(ip => ip.currency === 'USD')
    .reduce((acc, ip) => acc + ip.installmentAmount, 0);

  // Period formatted name
  const formattedPeriodName = selectedPeriod ? formatPeriodSpanish(selectedPeriod) : 'Período Actual';

  // Helper to compute ISO default date for a card
  const getDefaultCardDateIso = (card: CreditCard, dayField: 'closingDay' | 'dueDay', fallbackDay: number) => {
    const day = card[dayField] || fallbackDay;
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    if (selectedPeriod) {
      const parts = selectedPeriod.split('-');
      if (parts.length >= 2) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
      }
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, 28)).padStart(2, '0')}`;
  };

  const handleOpenPayment = (presetCurrency: Currency = 'ARS', presetMode?: 'total' | 'min') => {
    if (!activeCard) return;
    triggerHaptic('light');
    setPaymentCurrency(presetCurrency);
    if (presetCurrency === 'ARS') {
      if (presetMode === 'total') {
        setPaymentAmountStr(String(pendingToPay));
      } else if (presetMode === 'min') {
        setPaymentAmountStr(String(activeCard.minPayment));
      } else {
        setPaymentAmountStr(pendingToPay > 0 ? String(pendingToPay) : '');
      }
    } else {
      setPaymentAmountStr(pendingToPayUSD > 0 ? String(pendingToPayUSD) : '');
    }
    setPaymentNoteStr('');
    setDeductFromCash(true);
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCard) return;
    const amountVal = parseFloat(paymentAmountStr.replace(/[^0-9.]/g, ''));
    if (isNaN(amountVal) || amountVal <= 0) return;

    onRecordCardPayment(activeCard.id, amountVal, deductFromCash, paymentNoteStr, paymentCurrency);
    setShowPaymentModal(false);
    setPaymentAmountStr('');
    setPaymentNoteStr('');
    showNotification(`¡Pago de ${formatCurrency(amountVal, paymentCurrency)} registrado!`);
  };

  const handleOpenEditMinPayment = () => {
    if (!activeCard) return;
    triggerHaptic('light');
    setMinPaymentAmountStr(String(activeCard.minPayment));
    setShowMinPaymentModal(true);
  };

  const handleConfirmEditMinPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCard) return;
    const val = parseFloat(minPaymentAmountStr.replace(/[^0-9.]/g, ''));
    if (isNaN(val)) return;

    onUpdateMinPayment(activeCard.id, val);
    setShowMinPaymentModal(false);
    showNotification('Pago mínimo actualizado.');
  };

  const handleOpenReconcile = (currency: Currency = 'ARS') => {
    if (!activeCard) return;
    triggerHaptic('light');
    setReconcileCurrency(currency);
    if (currency === 'USD') {
      setReconcileAmountStr(String(activeCard.statementBalanceUSD || ''));
    } else {
      setReconcileAmountStr(String(activeCard.statementBalance || ''));
    }
    setShowReconcileModal(true);
  };

  const handleConfirmReconcile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCard) return;
    const amountVal = parseFloat(reconcileAmountStr.replace(/[^0-9.]/g, ''));
    if (isNaN(amountVal)) return;

    onReconcileCard(activeCard.id, amountVal, reconcileCurrency);
    setShowReconcileModal(false);
    showNotification('Total del resumen actualizado.');
  };

  const handleOpenPaymentsHistory = (currency: Currency = 'ARS') => {
    if (!activeCard) return;
    triggerHaptic('light');
    setDirectAmountPaidCurrency(currency);
    setDirectAmountPaidStr(String(currency === 'USD' ? (activeCard.amountPaidUSD || 0) : activeCard.amountPaid));
    setShowDirectEditForm(false);
    setEditingPaymentId(null);
    setConfirmDeletePaymentId(null);
    setShowPaymentsHistoryModal(true);
  };

  const handleStartEditPayment = (p: CardPayment) => {
    triggerHaptic('light');
    setEditingPaymentId(p.id);
    setEditPaymentAmountStr(String(p.amount));
    setEditPaymentNoteStr(p.note || '');
    setConfirmDeletePaymentId(null);
  };

  const handleSaveEditPayment = (paymentId: string) => {
    if (!activeCard) return;
    const amountVal = parseFloat(editPaymentAmountStr.replace(/[^0-9.]/g, ''));
    if (isNaN(amountVal) || amountVal <= 0) return;

    onEditCardPayment(activeCard.id, paymentId, amountVal, editPaymentNoteStr);
    setEditingPaymentId(null);
    showNotification('Pago actualizado.');
  };

  const handleDeletePayment = (paymentId: string) => {
    if (!activeCard) return;
    triggerHaptic('medium');
    onDeleteCardPayment(activeCard.id, paymentId);
    setConfirmDeletePaymentId(null);
    showNotification('Pago eliminado.');
  };

  const handleSaveDirectAmountPaid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCard) return;
    const val = parseFloat(directAmountPaidStr.replace(/[^0-9.]/g, ''));
    if (isNaN(val) || val < 0) return;

    onSetCardAmountPaidDirect(activeCard.id, val, directAmountPaidCurrency);
    setShowDirectEditForm(false);
    showNotification('Monto abonado ajustado.');
  };

  const handleResetAmountPaid = () => {
    if (!activeCard) return;
    triggerHaptic('light');
    setShowResetConfirmModal(true);
  };

  const handleConfirmResetAmountPaid = () => {
    if (!activeCard) return;
    triggerHaptic('success');
    if (onResetCardPayments) {
      onResetCardPayments(activeCard.id);
    } else {
      onSetCardAmountPaidDirect(activeCard.id, 0, 'ARS');
      onSetCardAmountPaidDirect(activeCard.id, 0, 'USD');
    }
    setShowResetConfirmModal(false);
    setShowDirectEditForm(false);
    setDirectAmountPaidStr('0');
    showNotification('Pagos reiniciados a $0.');
  };

  // Open Edit Individual Dates Modal
  const handleOpenEditDates = () => {
    if (!activeCard) return;
    triggerHaptic('light');
    setEditClosingDateStr(activeCard.closingDate || getDefaultCardDateIso(activeCard, 'closingDay', 20));
    setEditDueDateStr(activeCard.dueDate || getDefaultCardDateIso(activeCard, 'dueDay', 10));
    setShowEditDatesModal(true);
  };

  // Confirm Edit Individual Dates
  const handleConfirmEditDates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCard) return;
    triggerHaptic('success');

    let closingDayVal = activeCard.closingDay || 20;
    let dueDayVal = activeCard.dueDay || 10;

    if (editClosingDateStr) {
      const parts = editClosingDateStr.split('-');
      if (parts.length === 3) {
        closingDayVal = parseInt(parts[2], 10);
      }
    }

    if (editDueDateStr) {
      const parts = editDueDateStr.split('-');
      if (parts.length === 3) {
        dueDayVal = parseInt(parts[2], 10);
      }
    }

    onUpdateCard(activeCard.id, {
      closingDate: editClosingDateStr || undefined,
      dueDate: editDueDateStr || undefined,
      closingDay: closingDayVal,
      dueDay: dueDayVal,
    });

    setShowEditDatesModal(false);
    showNotification(`Fechas de ${activeCard.name} actualizadas.`);
  };

  // Open Manage Card Modal (Edit name, digits, bank, delete)
  const handleOpenManageCard = () => {
    if (!activeCard) return;
    triggerHaptic('light');
    setEditCardName(activeCard.name);
    setEditCardBankName(activeCard.bankName);
    setEditCardLastDigits(activeCard.lastDigits);
    setEditCardGradient(activeCard.colorGradient);
    setShowDeleteCardConfirmModal(false);
    setShowManageCardModal(true);
  };

  // Save Card Name, Bank, Digits and Styling
  const handleSaveEditCardDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCard || !editCardName.trim()) return;
    triggerHaptic('success');

    onUpdateCard(activeCard.id, {
      name: editCardName.trim(),
      bankName: editCardBankName.trim() || activeCard.bankName,
      lastDigits: editCardLastDigits.trim() || activeCard.lastDigits,
      colorGradient: editCardGradient || activeCard.colorGradient,
    });

    setShowManageCardModal(false);
    showNotification(`Tarjeta ${editCardName.trim()} actualizada.`);
  };

  // Confirm Delete Card
  const handleConfirmDeleteCard = () => {
    if (!activeCard) return;
    triggerHaptic('medium');

    const cardNameToDelete = activeCard.name;
    const remainingCards = creditCards.filter(c => c.id !== activeCard.id);
    setSelectedCardId(remainingCards[0]?.id || '');
    onDeleteCard(activeCard.id);

    setShowDeleteCardConfirmModal(false);
    setShowManageCardModal(false);
    showNotification(`Tarjeta ${cardNameToDelete} eliminada.`);
  };

  // Open Configure Summary for New Month / Period
  const handleOpenConfigureSummary = () => {
    if (!activeCard) return;
    triggerHaptic('light');
    setConfigStatementBalanceStr(activeCard.statementBalance > 0 ? String(activeCard.statementBalance) : '');
    setConfigStatementBalanceUSDStr(activeCard.statementBalanceUSD ? String(activeCard.statementBalanceUSD) : '');
    setConfigMinPaymentStr(activeCard.minPayment > 0 ? String(activeCard.minPayment) : '');
    setConfigClosingDateStr(activeCard.closingDate || getDefaultCardDateIso(activeCard, 'closingDay', 20));
    setConfigDueDateStr(activeCard.dueDate || getDefaultCardDateIso(activeCard, 'dueDay', 10));
    setShowConfigureSummaryModal(true);
  };

  // Confirm Configure Summary for Period
  const handleConfirmConfigureSummary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCard) return;
    triggerHaptic('success');

    const statementVal = parseFloat(configStatementBalanceStr.replace(/[^0-9.]/g, '')) || 0;
    const statementUSDVal = parseFloat(configStatementBalanceUSDStr.replace(/[^0-9.]/g, '')) || 0;
    const minPayVal = parseFloat(configMinPaymentStr.replace(/[^0-9.]/g, '')) || 0;

    let closingDayVal = activeCard.closingDay || 20;
    let dueDayVal = activeCard.dueDay || 10;

    if (configClosingDateStr) {
      const parts = configClosingDateStr.split('-');
      if (parts.length === 3) {
        closingDayVal = parseInt(parts[2], 10);
      }
    }

    if (configDueDateStr) {
      const parts = configDueDateStr.split('-');
      if (parts.length === 3) {
        dueDayVal = parseInt(parts[2], 10);
      }
    }

    onUpdateCard(activeCard.id, {
      statementBalance: statementVal,
      statementBalanceUSD: statementUSDVal,
      minPayment: minPayVal,
      closingDate: configClosingDateStr || undefined,
      dueDate: configDueDateStr || undefined,
      closingDay: closingDayVal,
      dueDay: dueDayVal,
    });

    setShowConfigureSummaryModal(false);
    showNotification(`¡Resumen de ${formattedPeriodName} configurado con éxito!`);
  };

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardName.trim()) return;

    const statementVal = parseFloat(newStatement.replace(/[^0-9.]/g, '')) || 0;
    const statementUSDVal = parseFloat(newStatementUSD.replace(/[^0-9.]/g, '')) || 0;
    const minPayVal = parseFloat(newMinPay.replace(/[^0-9.]/g, '')) || 0;
    let closingDayVal = parseInt(newClosingDay, 10) || 20;
    let dueDayVal = parseInt(newDueDay, 10) || 10;

    if (newClosingDate) {
      const parts = newClosingDate.split('-');
      if (parts.length === 3) closingDayVal = parseInt(parts[2], 10);
    }
    if (newDueDate) {
      const parts = newDueDate.split('-');
      if (parts.length === 3) dueDayVal = parseInt(parts[2], 10);
    }

    const gradients = [
      'from-blue-700 via-indigo-800 to-slate-950',
      'from-purple-800 via-violet-900 to-neutral-950',
      'from-zinc-900 via-rose-950 to-neutral-950',
      'from-emerald-800 via-teal-900 to-slate-950',
    ];
    const randomGrad = gradients[creditCards.length % gradients.length];

    onAddCard({
      name: newCardName.trim(),
      bankName: newBankName.trim() || 'Banco',
      lastDigits: newLastDigits.trim() || '0000',
      statementBalance: statementVal,
      statementBalanceUSD: statementUSDVal,
      amountPaidUSD: 0,
      minPayment: minPayVal,
      closingDay: Math.min(31, Math.max(1, closingDayVal)),
      dueDay: Math.min(31, Math.max(1, dueDayVal)),
      closingDate: newClosingDate || undefined,
      dueDate: newDueDate || undefined,
      colorGradient: randomGrad,
      payments: [],
    });

    setNewCardName('');
    setNewBankName('');
    setNewLastDigits('');
    setNewStatement('');
    setNewStatementUSD('');
    setNewMinPay('');
    setNewClosingDay('20');
    setNewDueDay('10');
    setNewClosingDate('');
    setNewDueDate('');
    setShowAddCardModal(false);
    showNotification('Nueva tarjeta agregada.');
  };

  return (
    <div className="space-y-4 pb-24 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 inset-x-4 z-50 max-w-sm mx-auto p-3 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-xl flex items-center justify-center gap-2 animate-slide-down">
          <Check size={16} className="stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Tarjetas de Crédito
          </h2>
          <p className="text-xs text-slate-400 font-normal">
            Fechas independientes y resúmenes en ARS / USD
          </p>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light');
            setShowAddCardModal(true);
          }}
          className="ios-active inline-flex flex-row items-center justify-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-semibold rounded-xl shrink-0 bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition"
        >
          <Plus size={14} />
          <span>Nueva Tarjeta</span>
        </button>
      </div>

      {creditCards.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/40 rounded-3xl border border-white/5 space-y-3 my-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-2 border border-indigo-500/20">
            <CardIcon size={32} />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">No tienes tarjetas cargadas</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Carga tus tarjetas de crédito para conciliar tus resúmenes en ARS y USD, agendar fechas de vencimiento y evitar recargos punitorios.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowAddCardModal(true);
              }}
              className="ios-active px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950 inline-flex items-center gap-1.5 transition"
            >
              <Plus size={15} />
              <span>Agregar Mi Primera Tarjeta</span>
            </button>
          </div>
        </div>
      ) : activeCard ? (
        <>
          {/* Card Switcher Pills if > 1 card (with specific alert indicators) */}
          {creditCards.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {creditCards.map(c => {
            const cardPending = Math.max(0, c.statementBalance - c.amountPaid);
            const cardPendingUSD = Math.max(0, (c.statementBalanceUSD || 0) - (c.amountPaidUSD || 0));
            const cardDaysDue = getDaysUntilDate(c.dueDate, c.dueDay);
            const cardMinUnmet = c.statementBalance > 0 && c.amountPaid < c.minPayment;
            const cardHasDueAlert = (cardPending > 0 || cardPendingUSD > 0) && cardDaysDue !== null && cardDaysDue <= 3;
            const cardHasClosingAlert = getDaysUntilDate(c.closingDate, c.closingDay || 20) !== null && 
              getDaysUntilDate(c.closingDate, c.closingDay || 20)! >= 0 && 
              getDaysUntilDate(c.closingDate, c.closingDay || 20)! <= 2;

            return (
              <button
                key={c.id}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedCardId(c.id);
                }}
                className={`ios-active px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 transition border relative ${
                  activeCard.id === c.id
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-950'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <CardIcon size={13} />
                <span>{c.name}</span>
                <span className="text-[10px] opacity-70">(*{c.lastDigits})</span>

                {/* Specific card alert dot */}
                {(cardHasDueAlert || cardMinUnmet) && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
                {!cardHasDueAlert && !cardMinUnmet && cardHasClosingAlert && (
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Visual Sleek Credit Card Display (Apple Wallet aesthetic) */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-tr ${activeCard.colorGradient} p-6 border border-white/15 shadow-2xl text-white`}>
        {/* Sleek metallic chip & Contactless */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-7 rounded-md bg-gradient-to-tr from-amber-300 via-yellow-200 to-amber-500 border border-amber-600/40 relative overflow-hidden shadow-inner">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-amber-900/30" />
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-amber-900/30" />
            </div>
            <span className="text-[10px] tracking-widest uppercase font-semibold text-slate-300/80">
              {activeCard.bankName}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold tracking-wider uppercase text-white/90">
              {activeCard.name}
            </span>
            <button
              type="button"
              onClick={handleOpenManageCard}
              className="ios-active p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition shadow-sm border border-white/10"
              title="Gestionar tarjeta (Editar / Eliminar)"
            >
              <Settings2 size={13} />
            </button>
          </div>
        </div>

        {/* Card Number & Last digits */}
        <div className="mt-6 flex items-center gap-3 font-mono text-sm sm:text-base tracking-widest text-slate-200">
          <span>••••</span>
          <span>••••</span>
          <span>••••</span>
          <span className="font-bold text-white">{activeCard.lastDigits}</span>
        </div>

        {/* Card Footer: Due Date, Closing Date & Pending Balances in ARS and USD */}
        <div className="mt-5 flex items-end justify-between pt-3 border-t border-white/10 gap-2">
          <div className="flex flex-col gap-1.5 min-w-0">
            {/* Clickable Header for Dates */}
            <div 
              onClick={handleOpenEditDates}
              className="flex items-center gap-1.5 cursor-pointer group w-fit"
              title="Haz clic para editar fechas individuales de esta tarjeta"
            >
              <span className="text-[10px] uppercase font-semibold text-slate-300 tracking-wider group-hover:text-white transition">
                Fechas del Resumen
              </span>
              <span className="text-slate-300 group-hover:text-white p-0.5 rounded transition">
                <Edit3 size={11} />
              </span>
            </div>

            {/* Clickable Date Text & Agendar Button */}
            <div className="flex flex-col gap-1.5">
              <p 
                onClick={handleOpenEditDates}
                className="text-xs font-medium text-white tracking-wide cursor-pointer hover:underline whitespace-nowrap"
                title="Editar fechas de cierre y vencimiento"
              >
                Cierre: {formatCardDisplayDate(activeCard.closingDate, activeCard.closingDay || 20)} | Vence: {formatCardDisplayDate(activeCard.dueDate, activeCard.dueDay || 10, true, activeCard.closingDay || 20)}
              </p>
              <button
                type="button"
                onClick={() => downloadDueCalendarEvent({
                  title: `Tarjeta ${activeCard.name} (*${activeCard.lastDigits})`,
                  dueDateIso: activeCard.dueDate,
                  dueDay: activeCard.dueDay,
                  amount: pendingToPay,
                  currency: 'ARS',
                  additionalNote: pendingToPayUSD > 0 ? `Saldo USD: ${formatCurrency(pendingToPayUSD, 'USD')}` : undefined
                })}
                className="ios-active inline-flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg w-fit font-semibold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition shadow-sm"
                title="Agendar vencimiento en calendario nativo (.ics)"
              >
                <CalendarPlus size={11} className="text-emerald-400 shrink-0" />
                <span>Agendar (.ics)</span>
              </button>
            </div>

            {/* Aviso visual sutil si la fecha de cierre está próxima (<= 2 días) */}
            {isClosingSoon && (
              <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-400/20 border border-amber-400/35 text-amber-200 text-[11px] font-bold shadow-sm animate-pulse backdrop-blur-sm w-fit">
                <Clock size={12} className="text-amber-300 flex-shrink-0" />
                <span>
                  {daysUntilClosing === 0 
                    ? `⚠️ El resumen de ${activeCard.name} cierra HOY` 
                    : daysUntilClosing === 1
                    ? `⚠️ El resumen de ${activeCard.name} cierra MAÑANA`
                    : `⚠️ El resumen de ${activeCard.name} cierra en 2 días`}
                </span>
              </div>
            )}
          </div>

          <div className="text-right flex-shrink-0">
            <span className="text-[10px] uppercase font-semibold text-slate-300 tracking-wider">
              Saldo Pendiente
            </span>
            <p className="text-2xl font-extrabold text-white tracking-tight tabular-nums">
              {formatMoney(pendingToPay, currencySymbol)}
            </p>
            {(pendingToPayUSD > 0 || (activeCard.statementBalanceUSD || 0) > 0) && (
              <p className="text-sm font-extrabold text-amber-300 tracking-tight tabular-nums mt-0.5">
                + {formatCurrency(pendingToPayUSD, 'USD')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 🚨 ALERTA DE VENCIMIENTO INMINENTE O VENCIDA */}
      {(isDueOverdue || isDueSoon) && (
        <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col gap-2.5 shadow-lg animate-slide-down ${
          isDueOverdue ? 'bg-rose-500/20 border-rose-500/40 text-rose-200' : 'bg-amber-500/20 border-amber-500/40 text-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
              isDueOverdue ? 'bg-rose-500/30 text-rose-300' : 'bg-amber-500/30 text-amber-300'
            }`}>
              <AlertTriangle size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-sm font-bold tracking-tight">
                {isDueOverdue
                  ? `🚨 ¡Resumen Vencido! ${activeCard.name}`
                  : daysUntilDue === 0
                  ? `🚨 ¡El resumen de ${activeCard.name} vence HOY!`
                  : daysUntilDue === 1
                  ? `⚠️ ¡El resumen de ${activeCard.name} vence MAÑANA!`
                  : `⚠️ El resumen de ${activeCard.name} vence en ${daysUntilDue} días`}
              </h4>
              <p className="text-[11px] sm:text-xs opacity-90 mt-1 leading-relaxed">
                Fecha límite: <strong>{formatCardDisplayDate(activeCard.dueDate, activeCard.dueDay, true, activeCard.closingDay)}</strong>. 
                Pendiente por abonar: <strong>{formatMoney(pendingToPay, currencySymbol)}</strong> {pendingToPayUSD > 0 ? `+ ${formatCurrency(pendingToPayUSD, 'USD')}` : ''}.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10 text-center">
            <button
              type="button"
              onClick={() => handleOpenPayment('ARS')}
              className="ios-active inline-flex flex-row items-center justify-center gap-1.5 whitespace-nowrap py-2 px-3 text-xs font-semibold rounded-xl text-center bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition"
            >
              <span>Abonar ahora &rarr;</span>
            </button>
            <button
              type="button"
              onClick={handleOpenEditDates}
              className="ios-active inline-flex flex-row items-center justify-center gap-1.5 whitespace-nowrap py-2 px-3 text-xs font-semibold rounded-xl text-center bg-white/10 hover:bg-white/15 text-white border border-white/10 transition"
            >
              <span>Modificar fecha de vencimiento</span>
            </button>
          </div>
        </div>
      )}

      {/* 🌟 ACTION: CONFIGURAR RESUMEN DEL NUEVO MES / PERÍODO */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-500/30 shadow-md flex flex-col">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
            <CalendarDays size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-extrabold text-white">
              Configurar Resumen de {formattedPeriodName}
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Ingresa el nuevo monto oficial del extracto y actualiza las fechas de {activeCard.name}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenConfigureSummary}
          className="ios-active w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950 transition"
        >
          <Edit3 size={14} className="shrink-0" />
          <span>Configurar Resumen</span>
        </button>
      </div>

      {/* SECTION 1: RESUMEN EN PESOS (ARS) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Resumen en Pesos (ARS)</span>
          </span>
          <button
            onClick={() => handleOpenPayment('ARS')}
            className="ios-active text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/20 transition"
          >
            + Abonar ARS
          </button>
        </div>

        {/* Card Breakdown Metrics 2x2 */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* TOTAL SEGÚN RESUMEN ARS */}
          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total Resumen</span>
                <button
                  onClick={() => handleOpenReconcile('ARS')}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-0.5 transition"
                  title="Editar o conciliar total del resumen en pesos"
                >
                  <Edit3 size={11} />
                  <span>Editar</span>
                </button>
              </div>
              <p className="text-base font-extrabold text-white mt-1 tabular-nums tracking-tight">
                {formatMoney(activeCard.statementBalance, currencySymbol)}
              </p>
            </div>
            <span className="text-[10px] text-slate-400 mt-2 block">
              Extracto bancario en ARS
            </span>
          </div>

          {/* PAGO MÍNIMO REQUERIDO */}
          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Pago Mínimo</span>
                <button
                  onClick={handleOpenEditMinPayment}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-0.5 transition"
                  title="Editar pago mínimo requerido"
                >
                  <Edit3 size={11} />
                  <span>Editar</span>
                </button>
              </div>
              <p className="text-base font-extrabold text-amber-400 mt-1 tabular-nums tracking-tight">
                {formatMoney(activeCard.minPayment, currencySymbol)}
              </p>
            </div>
            <span className="text-[10px] text-slate-400 mt-2 block">
              Para no entrar en mora
            </span>
          </div>

          {/* MONTO YA ABONADO ARS */}
          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Monto Abonado</span>
                <button
                  onClick={() => handleOpenPaymentsHistory('ARS')}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-0.5 transition"
                  title="Ver historial de pagos y corrección"
                >
                  <History size={11} />
                  <span>Historial</span>
                </button>
              </div>
              <p className="text-base font-extrabold text-emerald-400 mt-1 tabular-nums tracking-tight">
                {formatMoney(activeCard.amountPaid, currencySymbol)}
              </p>
            </div>
            <span className="text-[10px] text-slate-400 mt-2 block">
              {isFullyPaid ? '¡Liquidada al 100%!' : `Faltan ${formatMoney(pendingToPay, currencySymbol)}`}
            </span>
          </div>

          {/* ESTADO DE CUENTA ARS */}
          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">Estado de Cuenta</span>
              <div className="mt-1">
                {isFullyPaid ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300">
                    <CheckCircle2 size={12} /> Paga al 100%
                  </span>
                ) : isCoveringMin ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/20 text-blue-300">
                    <Check size={12} /> Mínimo Cubierto
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/20 text-rose-300">
                    <AlertTriangle size={12} /> En Mora / Alerta
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenPayment('ARS')}
              className="ios-active inline-flex flex-row items-center justify-center gap-1.5 whitespace-nowrap w-full py-2.5 px-3 text-xs font-bold rounded-xl text-center shadow-sm shadow-emerald-500/20 bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition mt-2"
            >
              <span>Abonar Pesos (ARS)</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: RESUMEN EN DÓLARES (USD) */}
      <div className="space-y-2 pt-1">
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-amber-500/20 shadow-lg space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs shrink-0">
                US$
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Resumen en Dólares (USD)
                </h4>
                <p className="text-[10px] text-slate-400">
                  Consumos internacionales y suscripciones
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenPayment('USD')}
              className="ios-active inline-flex flex-row items-center justify-center gap-1.5 whitespace-nowrap py-2.5 px-3.5 text-xs font-bold rounded-xl text-center shadow-sm shadow-amber-500/20 bg-amber-500 hover:bg-amber-400 text-slate-950 transition shrink-0"
            >
              <DollarSign size={13} className="stroke-[3] shrink-0" />
              <span>Abonar USD</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* TOTAL RESUMEN USD */}
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold text-amber-400 tracking-wider">Total Resumen USD</span>
                  <button
                    onClick={() => handleOpenReconcile('USD')}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-0.5 transition"
                    title="Editar o conciliar total del resumen en dólares"
                  >
                    <Edit3 size={11} />
                    <span>Editar</span>
                  </button>
                </div>
                <p className="text-base sm:text-lg font-extrabold text-white mt-1 tabular-nums tracking-tight">
                  {formatCurrency(activeCard.statementBalanceUSD || 0, 'USD')}
                </p>
              </div>
              <span className="text-[10px] text-slate-400 mt-2 block">
                Consumos anotados: <strong className="text-amber-300 font-bold">{formatCurrency(trackedExpensesUSDThisMonth, 'USD')}</strong>
              </span>
            </div>

            {/* MONTO ABONADO USD */}
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">Abonado USD</span>
                  <button
                    onClick={() => handleOpenPaymentsHistory('USD')}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-0.5 transition"
                    title="Ver historial de pagos en USD"
                  >
                    <History size={11} />
                    <span>Historial</span>
                  </button>
                </div>
                <p className="text-base sm:text-lg font-extrabold text-emerald-400 mt-1 tabular-nums tracking-tight">
                  {formatCurrency(activeCard.amountPaidUSD || 0, 'USD')}
                </p>
              </div>
              <span className="text-[10px] text-slate-400 mt-2 block">
                {isFullyPaidUSD ? '¡Liquidado en USD!' : `Saldo restante: ${formatCurrency(pendingToPayUSD, 'USD')}`}
              </span>
            </div>
          </div>

          {/* Conciliación rápida de consumos en USD */}
          {trackedExpensesUSDThisMonth > 0 && trackedExpensesUSDThisMonth !== (activeCard.statementBalanceUSD || 0) && (
            <div className="pt-1 flex items-center justify-between text-xs bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
              <span className="text-[11px] text-amber-200">
                Consumos registrados en USD: <strong>{formatCurrency(trackedExpensesUSDThisMonth, 'USD')}</strong>
              </span>
              <button
                onClick={() => {
                  triggerHaptic('success');
                  onReconcileCard(activeCard.id, trackedExpensesUSDThisMonth, 'USD');
                  showNotification('Resumen USD ajustado.');
                }}
                className="ios-active px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] transition"
              >
                Ajustar a {formatCurrency(trackedExpensesUSDThisMonth, 'USD')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ⚠️ ALERTA: Si lo pagado no cubre el pago mínimo en ARS */}
      {!isCoveringMin && activeCard.statementBalance > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex flex-col gap-2.5 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 flex-shrink-0 mt-0.5">
              <AlertTriangle size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-rose-300">
                Alerta de Tarjeta: El monto abonado no cubre el pago mínimo
              </h4>
              <p className="text-[11px] sm:text-xs text-rose-200/90 mt-1 leading-relaxed">
                Llevas pagado {formatMoney(activeCard.amountPaid, currencySymbol)} y el mínimo es de {formatMoney(activeCard.minPayment, currencySymbol)}. 
                Te faltan abonar <strong>{formatMoney(activeCard.minPayment - activeCard.amountPaid, currencySymbol)}</strong> para evitar recargos punitorios.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10 text-center">
            <button
              type="button"
              onClick={() => handleOpenPayment('ARS', 'min')}
              className="ios-active inline-flex flex-row items-center justify-center gap-1.5 whitespace-nowrap py-2 px-3 text-xs font-semibold rounded-xl text-center bg-rose-500 hover:bg-rose-400 text-white shadow-sm transition"
            >
              <span>Abonar el mínimo ahora &rarr;</span>
            </button>
            <button
              type="button"
              onClick={handleOpenEditMinPayment}
              className="ios-active inline-flex flex-row items-center justify-center gap-1.5 whitespace-nowrap py-2 px-3 text-xs font-semibold rounded-xl text-center bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition"
            >
              <span>Corregir mínimo</span>
            </button>
          </div>
        </div>
      )}

      {/* CONCILIACIÓN CON EL BANCO EN PESOS */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/20 shadow-md">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles size={15} className="text-indigo-400 shrink-0" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider truncate">
              Conciliación en Pesos (ARS)
            </h4>
          </div>
          <span className="whitespace-nowrap px-2.5 py-1 text-[11px] font-medium shrink-0 bg-indigo-500/15 text-indigo-300 rounded-full">
            Control de Gastos
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Llevas anotados <strong className="text-emerald-400 font-bold tabular-nums">{formatMoney(trackedExpensesThisMonth, currencySymbol)}</strong> en consumos y débitos en pesos para esta tarjeta.
        </p>

        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px] text-slate-400">
            ¿Llegó el resumen bancario?
          </span>
          <div className="flex items-center gap-2">
            {trackedExpensesThisMonth > 0 && trackedExpensesThisMonth !== activeCard.statementBalance && (
              <button
                onClick={() => {
                  triggerHaptic('success');
                  onReconcileCard(activeCard.id, trackedExpensesThisMonth, 'ARS');
                  showNotification('Resumen ARS sincronizado.');
                }}
                className="ios-active text-xs text-slate-300 hover:text-white bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10 transition"
                title="Ajustar total del resumen con la suma de tus consumos anotados"
              >
                Copiar {formatMoney(trackedExpensesThisMonth, currencySymbol)}
              </button>
            )}
            <button
              onClick={() => handleOpenReconcile('ARS')}
              className="ios-active text-xs font-bold text-indigo-300 hover:text-indigo-200 bg-indigo-600/30 hover:bg-indigo-600/40 px-3 py-1.5 rounded-xl border border-indigo-500/30 transition"
            >
              Ajustar Resumen ARS
            </button>
          </div>
        </div>
      </div>

      {/* Lista Colapsable: Ver compras en cuotas activas */}
      <div className="rounded-3xl bg-slate-900 border border-white/5 overflow-hidden transition-all shadow-xl">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setShowInstallmentsList(prev => !prev);
          }}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center flex-shrink-0 border border-indigo-500/20">
              <Layers size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">
                  Ver compras en cuotas activas
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {activeCardInstallments.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {activeCardInstallments.length > 0 
                  ? `${formatMoney(totalMonthlyInstallmentsARS, currencySymbol)} / mes en esta tarjeta` 
                  : 'Sin cuotas activas en esta tarjeta'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
              {showInstallmentsList ? 'Ocultar' : 'Ver detalle'}
            </span>
            {showInstallmentsList ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {/* Collapsible Content */}
        {showInstallmentsList && (
          <div className="p-4 pt-0 space-y-3 border-t border-white/5 animate-fade-in">
            {/* Header with Quick Add Button */}
            <div className="flex items-center justify-between gap-3 pt-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 min-w-0 truncate">
                Cuotas a computar este período ({activeCard.name})
              </span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setNewInstDesc('');
                  setNewInstAmountStr('');
                  setNewInstCount('3');
                  setNewInstCurrency('ARS');
                  setNewInstInputMode('total');
                  setShowAddInstallmentModal(true);
                }}
                className="ios-active inline-flex flex-row items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-xl shrink-0 text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition"
              >
                <Plus size={13} />
                <span>Nueva Cuota</span>
              </button>
            </div>

            {/* Empty State */}
            {activeCardInstallments.length === 0 ? (
              <div className="text-center py-6 px-4 bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
                <p className="text-xs text-slate-400">
                  No hay compras en cuotas registradas para {activeCard.name}.
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Podés agregarlas al anotar un gasto con tarjeta o con el botón "+ Nueva Cuota".
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeCardInstallments.map((ip) => {
                  const percent = Math.min(100, Math.round((ip.currentInstallment / ip.totalInstallments) * 100));
                  const isUSD = ip.currency === 'USD';

                  return (
                    <div 
                      key={ip.id}
                      className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition space-y-2.5"
                    >
                      {/* Top row: Title, badge and currency */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-sm font-bold text-white tracking-tight">
                              {ip.description}
                            </h5>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isUSD 
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
                                : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                            }`}>
                              {isUSD ? 'USD' : 'ARS'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Tarjeta {activeCard.name} (*{activeCard.lastDigits})
                          </span>
                        </div>

                        {/* Cuota indicator pill */}
                        <div className="text-right">
                          <span className="text-xs font-extrabold text-white tabular-nums block">
                            Cuota {ip.currentInstallment} de {ip.totalInstallments}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatCurrency(ip.installmentAmount, ip.currency)} / mes
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Total: {formatCurrency(ip.totalAmount, ip.currency)}</span>
                          <span className="font-semibold text-slate-300">{percent}% abonado</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              isUSD ? 'bg-amber-400' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              setEditingInstallment(ip);
                              setEditInstDesc(ip.description);
                              setEditInstAmountStr(String(ip.installmentAmount));
                              setEditInstCurrent(String(ip.currentInstallment));
                              setEditInstTotal(String(ip.totalInstallments));
                            }}
                            className="text-slate-400 hover:text-white flex items-center gap-1 transition text-[11px]"
                          >
                            <Edit3 size={12} />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('medium');
                              if (onDeleteInstallmentPurchase) onDeleteInstallmentPurchase(ip.id);
                              showNotification('Cuota eliminada.');
                            }}
                            className="text-slate-500 hover:text-rose-400 flex items-center gap-1 transition text-[11px]"
                          >
                            <Trash2 size={12} />
                            <span>Eliminar</span>
                          </button>
                        </div>

                        {onAdvanceInstallmentPurchase && ip.currentInstallment < ip.totalInstallments && (
                          <button
                            type="button"
                            onClick={() => {
                              onAdvanceInstallmentPurchase(ip.id);
                              showNotification('Avanzada a la siguiente cuota.');
                            }}
                            className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                          >
                            <span>Avanzar cuota (+1) &rarr;</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      </>
      ) : null}

      {/* 1. Modal: EDITAR PAGO MÍNIMO */}
      {showMinPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowMinPaymentModal(false)} />
          <div 
            className="relative w-full max-w-md bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-2xl p-5 pb-safe z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-sm font-bold text-white tracking-tight">Editar Pago Mínimo</h3>
              <button onClick={() => setShowMinPaymentModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmEditMinPayment} className="space-y-4 mt-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Monto de Pago Mínimo Requerido ({currencySymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold pointer-events-none select-none">
                    {currencySymbol}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={minPaymentAmountStr}
                    onChange={(e) => setMinPaymentAmountStr(filterNumericInput(e.target.value))}
                    onKeyDown={handleNumericKeyDown}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-base font-bold text-amber-400 focus:outline-none focus:border-amber-500 tabular-nums"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Establece el importe mínimo del extracto para monitorear el semáforo de alerta.
                </p>
              </div>

              {activeCard.statementBalance > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1.5 tracking-wider">
                    Sugerencias s/ resumen ({formatMoney(activeCard.statementBalance, currencySymbol)})
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[0.10, 0.15, 0.20].map((pct) => {
                      const val = Math.round(activeCard.statementBalance * pct);
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setMinPaymentAmountStr(String(val))}
                          className="ios-active py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-300 border border-white/5 tabular-nums text-center"
                        >
                          {pct * 100}% ({formatMoney(val, currencySymbol)})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="ios-active w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-amber-500/20"
              >
                Guardar Pago Mínimo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: HISTORIAL Y CORRECCIÓN DEL MONTO YA ABONADO */}
      {showPaymentsHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowPaymentsHistoryModal(false)} />
          <div 
            className="relative w-full max-w-lg bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-2xl p-5 pb-safe z-10 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5 flex-shrink-0">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  <History size={16} className="text-emerald-400" />
                  <span>Historial de Pagos & Corrección</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {activeCard.name} • Abonado ARS: <strong className="text-emerald-400 tabular-nums">{formatMoney(activeCard.amountPaid, currencySymbol)}</strong> • USD: <strong className="text-amber-400 tabular-nums">{formatCurrency(activeCard.amountPaidUSD || 0, 'USD')}</strong>
                </p>
              </div>
              <button 
                onClick={() => setShowPaymentsHistoryModal(false)} 
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content (Scrollable) */}
            <div className="overflow-y-auto no-scrollbar py-3 space-y-3 flex-1">
              {cardPaymentsList.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Pagos individuales registrados ({cardPaymentsList.length})
                  </span>

                  {cardPaymentsList.map((p) => {
                    const isEditingThis = editingPaymentId === p.id;
                    const isConfirmingDelete = confirmDeletePaymentId === p.id;
                    const isUSD = p.currency === 'USD';

                    if (isEditingThis) {
                      return (
                        <div key={p.id} className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-2.5">
                          <span className="text-[11px] font-bold text-emerald-400 block">
                            Modificar monto de pago ({isUSD ? 'USD' : 'ARS'})
                          </span>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none select-none">
                              {isUSD ? 'US$' : currencySymbol}
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              required
                              value={editPaymentAmountStr}
                              onChange={(e) => setEditPaymentAmountStr(filterNumericInput(e.target.value))}
                              onKeyDown={handleNumericKeyDown}
                              className={`w-full bg-slate-900 border border-white/10 rounded-xl ${
                                isUSD ? 'pl-14' : 'pl-9'
                              } pr-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 tabular-nums`}
                            />
                          </div>

                          <input
                            type="text"
                            placeholder="Nota o detalle"
                            value={editPaymentNoteStr}
                            onChange={(e) => setEditPaymentNoteStr(e.target.value)}
                            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingPaymentId(null)}
                              className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditPayment(p.id)}
                              className="ios-active px-3 py-1 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl"
                            >
                              Guardar
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={p.id}
                        className="p-3 rounded-2xl bg-slate-950/70 border border-white/5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-extrabold tabular-nums tracking-tight ${isUSD ? 'text-amber-400' : 'text-emerald-400'}`}>
                              +{formatCurrency(p.amount, p.currency || 'ARS')}
                            </span>
                            {isUSD && (
                              <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded border border-amber-500/30">
                                USD
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                              <Calendar size={10} />
                              {p.date}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 truncate mt-0.5">
                            {p.note || (isUSD ? 'Abono en dólares' : 'Abono en pesos')}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1 animate-fade-in bg-rose-500/10 p-1 rounded-xl border border-rose-500/30">
                              <span className="text-[10px] text-rose-300 font-semibold px-1">¿Borrar?</span>
                              <button
                                type="button"
                                onClick={() => handleDeletePayment(p.id)}
                                className="px-2 py-0.5 bg-rose-500 text-white font-bold text-[10px] rounded-lg shadow-sm"
                              >
                                Sí
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeletePaymentId(null)}
                                className="px-1.5 py-0.5 text-slate-300 hover:text-white text-[10px]"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEditPayment(p)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
                                title="Editar monto del pago"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('light');
                                  setConfirmDeletePaymentId(p.id);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                title="Eliminar pago"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 bg-slate-950/40 rounded-2xl border border-white/5">
                  <p className="text-xs text-slate-400">
                    No hay pagos individuales registrados para este período.
                  </p>
                </div>
              )}

              {/* Manual Direct Correction & Reset Section */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Ajuste Directo o Reinicio
                </span>

                {showDirectEditForm ? (
                  <form onSubmit={handleSaveDirectAmountPaid} className="p-3 rounded-2xl bg-slate-950 border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-300">
                        Corregir Total Abonado ({directAmountPaidCurrency})
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowDirectEditForm(false)}
                        className="text-[10px] text-slate-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none select-none">
                          {directAmountPaidCurrency === 'USD' ? 'US$' : currencySymbol}
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          required
                          value={directAmountPaidStr}
                          onChange={(e) => setDirectAmountPaidStr(filterNumericInput(e.target.value))}
                          onKeyDown={handleNumericKeyDown}
                          placeholder="0"
                          className={`w-full bg-slate-900 border border-white/10 rounded-xl ${
                            directAmountPaidCurrency === 'USD' ? 'pl-14' : 'pl-9'
                          } pr-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 tabular-nums`}
                        />
                      </div>
                      <button
                        type="submit"
                        className="ios-active px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl"
                      >
                        Guardar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[11px] text-slate-400">
                        ¿Corregir total abonado manualmente?
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setDirectAmountPaidCurrency('ARS');
                            setDirectAmountPaidStr(String(activeCard.amountPaid));
                            setShowDirectEditForm(true);
                          }}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-1 rounded-lg bg-indigo-500/10"
                        >
                          Ajustar ARS
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDirectAmountPaidCurrency('USD');
                            setDirectAmountPaidStr(String(activeCard.amountPaidUSD || 0));
                            setShowDirectEditForm(true);
                          }}
                          className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold px-2 py-1 rounded-lg bg-amber-500/10"
                        >
                          Ajustar USD
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[11px] text-slate-400">
                        ¿Reiniciar a cero todos los pagos?
                      </span>
                      <button
                        type="button"
                        onClick={handleResetAmountPaid}
                        className="ios-active flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-[11px] font-semibold transition"
                      >
                        <RotateCcw size={11} />
                        <span>Resetear a $0</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: REGISTRAR ABONO / PAGO A LA TARJETA */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowPaymentModal(false)} />
          <div 
            className="relative w-full max-w-md bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-2xl p-5 pb-safe z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Registrar Pago de Tarjeta
                </h3>
                <p className="text-[11px] text-slate-400">
                  {activeCard.name} (*{activeCard.lastDigits})
                </p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Currency toggle */}
            <div className="flex p-0.5 rounded-xl bg-slate-950 border border-white/10 mt-3">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setPaymentCurrency('ARS');
                  setPaymentAmountStr(pendingToPay > 0 ? String(pendingToPay) : '');
                }}
                className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition ${
                  paymentCurrency === 'ARS'
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
                  setPaymentCurrency('USD');
                  setPaymentAmountStr(pendingToPayUSD > 0 ? String(pendingToPayUSD) : '');
                }}
                className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition ${
                  paymentCurrency === 'USD'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                USD (Dólares)
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4 mt-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Monto a Pagar ({paymentCurrency === 'USD' ? 'US$' : currencySymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold pointer-events-none select-none">
                    {paymentCurrency === 'USD' ? 'US$' : currencySymbol}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0"
                    value={paymentAmountStr}
                    onChange={(e) => setPaymentAmountStr(filterNumericInput(e.target.value))}
                    onKeyDown={handleNumericKeyDown}
                    className={`w-full bg-slate-950 border border-white/10 rounded-xl ${
                      paymentCurrency === 'USD' ? 'pl-14 text-amber-400 focus:border-amber-500' : 'pl-9 text-emerald-400 focus:border-emerald-500'
                    } pr-3 py-2.5 text-lg font-extrabold focus:outline-none tabular-nums`}
                    autoFocus
                  />
                </div>
              </div>

              {/* Fast presets */}
              {paymentCurrency === 'ARS' ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentAmountStr(String(pendingToPay))}
                    className="ios-active flex-1 py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-300 border border-white/5 tabular-nums text-center"
                  >
                    Total ARS ({formatMoney(pendingToPay, currencySymbol)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmountStr(String(activeCard.minPayment))}
                    className="ios-active flex-1 py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-300 border border-white/5 tabular-nums text-center"
                  >
                    Mínimo ({formatMoney(activeCard.minPayment, currencySymbol)})
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentAmountStr(String(pendingToPayUSD))}
                    className="ios-active flex-1 py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-amber-300 border border-amber-500/20 tabular-nums text-center"
                  >
                    Total USD ({formatCurrency(pendingToPayUSD, 'USD')})
                  </button>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Detalle o Nota (opcional)
                </label>
                <input
                  type="text"
                  placeholder="ej: Pago resumen vía homebanking"
                  value={paymentNoteStr}
                  onChange={(e) => setPaymentNoteStr(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Checkbox: Restar del disponible actual */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deductFromCash}
                  onChange={(e) => setDeductFromCash(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-xs font-semibold text-white block">
                    {paymentCurrency === 'USD'
                      ? 'Debitar de mi caja / disponible en USD'
                      : 'Debitar de mi disponible en pesos (cuenta / efectivo)'}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {paymentCurrency === 'USD'
                      ? 'Descuenta de tu caja de dólares para reflejar la salida real.'
                      : 'Registra la salida para que tu saldo en mano coincida con la realidad.'}
                  </span>
                </div>
              </label>

              <button
                type="submit"
                className={`ios-active w-full py-3 rounded-xl font-bold text-xs tracking-wide shadow-lg ${
                  paymentCurrency === 'USD'
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                }`}
              >
                Confirmar Pago en {paymentCurrency === 'USD' ? 'Dólares (USD)' : 'Pesos (ARS)'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: CONCILIAR O AJUSTAR RESUMEN OFICIAL (ARS o USD) */}
      {showReconcileModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowReconcileModal(false)} />
          <div 
            className="relative w-full max-w-md bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-2xl p-5 pb-safe z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Ajustar Resumen Oficial ({reconcileCurrency})
              </h3>
              <button onClick={() => setShowReconcileModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Currency toggle */}
            <div className="flex p-0.5 rounded-xl bg-slate-950 border border-white/10 mt-3">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setReconcileCurrency('ARS');
                  setReconcileAmountStr(String(activeCard.statementBalance || ''));
                }}
                className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition ${
                  reconcileCurrency === 'ARS'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Resumen ARS
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setReconcileCurrency('USD');
                  setReconcileAmountStr(String(activeCard.statementBalanceUSD || ''));
                }}
                className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition ${
                  reconcileCurrency === 'USD'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Resumen USD
              </button>
            </div>

            <form onSubmit={handleConfirmReconcile} className="space-y-4 mt-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Monto Total del Resumen Bancario ({reconcileCurrency === 'USD' ? 'US$' : currencySymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold pointer-events-none select-none">
                    {reconcileCurrency === 'USD' ? 'US$' : currencySymbol}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={reconcileAmountStr}
                    onChange={(e) => setReconcileAmountStr(filterNumericInput(e.target.value))}
                    onKeyDown={handleNumericKeyDown}
                    className={`w-full bg-slate-950 border border-white/10 rounded-xl ${
                      reconcileCurrency === 'USD' ? 'pl-14' : 'pl-9'
                    } pr-3 py-2.5 text-base font-bold text-white focus:outline-none focus:border-indigo-500 tabular-nums`}
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Ingresa el número exacto del extracto bancario en {reconcileCurrency}.
                </p>
              </div>

              {/* Sugerencia de consumos registrados */}
              {reconcileCurrency === 'USD' && trackedExpensesUSDThisMonth > 0 && (
                <button
                  type="button"
                  onClick={() => setReconcileAmountStr(String(trackedExpensesUSDThisMonth))}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-300 text-left flex items-center justify-between"
                >
                  <span>Usar consumos acumulados en USD:</span>
                  <span className="font-bold tabular-nums">{formatCurrency(trackedExpensesUSDThisMonth, 'USD')}</span>
                </button>
              )}

              {reconcileCurrency === 'ARS' && trackedExpensesThisMonth > 0 && (
                <button
                  type="button"
                  onClick={() => setReconcileAmountStr(String(trackedExpensesThisMonth))}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300 text-left flex items-center justify-between"
                >
                  <span>Usar consumos acumulados en ARS:</span>
                  <span className="font-bold tabular-nums">{formatMoney(trackedExpensesThisMonth, currencySymbol)}</span>
                </button>
              )}

              <button
                type="submit"
                className="ios-active w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-indigo-900/30"
              >
                Actualizar Total del Resumen
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: AGREGAR NUEVA TARJETA */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowAddCardModal(false)} />
          <div 
            className="relative w-full max-w-md bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-2xl p-5 pb-safe z-10 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-sm font-bold text-white tracking-tight">Nueva Tarjeta de Crédito</h3>
              <button onClick={() => setShowAddCardModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCard} className="space-y-3 mt-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Nombre (ej: Visa Signature, Mastercard Black)</label>
                <input
                  type="text"
                  required
                  placeholder="Visa Signature"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Banco emisor</label>
                  <input
                    type="text"
                    required
                    placeholder="Galicia, Santander, etc."
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Últimos 4 dígitos</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="4589"
                    value={newLastDigits}
                    onChange={(e) => setNewLastDigits(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Total resumen ARS ($)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={newStatement}
                    onChange={(e) => setNewStatement(filterNumericInput(e.target.value))}
                    onKeyDown={handleNumericKeyDown}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Total resumen USD (US$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={newStatementUSD}
                    onChange={(e) => setNewStatementUSD(filterNumericInput(e.target.value))}
                    onKeyDown={handleNumericKeyDown}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Pago mínimo ARS</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={newMinPay}
                  onChange={(e) => setNewMinPay(filterNumericInput(e.target.value))}
                  onKeyDown={handleNumericKeyDown}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 tabular-nums"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Fecha de cierre</label>
                  <input
                    type="date"
                    value={newClosingDate}
                    onChange={(e) => setNewClosingDate(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Corte del resumen</span>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Fecha de vencimiento</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Límite de pago</span>
                </div>
              </div>

              <button
                type="submit"
                className="ios-active w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-indigo-900/30 mt-2"
              >
                Guardar Tarjeta
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: EDITAR FECHAS INDIVIDUALES DE LA TARJETA */}
      {showEditDatesModal && activeCard && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowEditDatesModal(false)} />
          <div 
            className="relative w-full max-w-sm bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl p-5 shadow-2xl z-10 pb-safe animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Editar Fechas - {activeCard.name}
                </h4>
                <p className="text-[11px] text-slate-400">
                  Tarjeta {activeCard.bankName} (*{activeCard.lastDigits})
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowEditDatesModal(false)} 
                className="ios-active p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmEditDates} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Fecha de Cierre
                </label>
                <input
                  type="date"
                  required
                  value={editClosingDateStr}
                  onChange={(e) => setEditClosingDateStr(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Fin del ciclo de compras de esta tarjeta
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  required
                  value={editDueDateStr}
                  onChange={(e) => setEditDueDateStr(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Día límite para abonar el saldo o pago mínimo
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="ios-active w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs tracking-wide shadow-md shadow-indigo-950 transition flex items-center justify-center gap-1.5"
                >
                  <CheckCheck size={15} />
                  <span>Guardar Fechas de {activeCard.name}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal: CONFIGURAR RESUMEN DE NUEVO MES / PERÍODO */}
      {showConfigureSummaryModal && activeCard && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowConfigureSummaryModal(false)} />
          <div 
            className="relative w-full max-w-md bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl p-5 shadow-2xl z-10 max-h-[92vh] overflow-y-auto pb-safe animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mb-3 sm:hidden" />
            
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  <CalendarDays size={16} className="text-indigo-400" />
                  <span>Configurar Resumen de {formattedPeriodName}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {activeCard.name} (*{activeCard.lastDigits})
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowConfigureSummaryModal(false)} 
                className="ios-active p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmConfigureSummary} className="space-y-3.5 mt-3">
              {/* Total Resumen ARS */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Total a Pagar en Pesos (ARS $)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold pointer-events-none select-none">
                    {currencySymbol}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0"
                    value={configStatementBalanceStr}
                    onChange={(e) => setConfigStatementBalanceStr(filterNumericInput(e.target.value))}
                    onKeyDown={handleNumericKeyDown}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-extrabold tabular-nums"
                  />
                </div>
              </div>

              {/* Total Resumen USD */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Total a Pagar en Dólares (USD US$, opcional)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold pointer-events-none select-none">
                    US$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={configStatementBalanceUSDStr}
                    onChange={(e) => setConfigStatementBalanceUSDStr(filterNumericInput(e.target.value))}
                    onKeyDown={handleNumericKeyDown}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-14 pr-3 py-2 text-sm text-amber-300 focus:outline-none focus:border-amber-500 font-extrabold tabular-nums"
                  />
                </div>
              </div>

              {/* Pago Mínimo ARS */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Pago Mínimo Requerido ARS ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold pointer-events-none select-none">
                    {currencySymbol}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={configMinPaymentStr}
                    onChange={(e) => setConfigMinPaymentStr(filterNumericInput(e.target.value))}
                    onKeyDown={handleNumericKeyDown}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-amber-400 focus:outline-none focus:border-amber-500 font-bold tabular-nums"
                  />
                </div>
              </div>

              {/* Fechas para este período */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Fecha de Cierre
                  </label>
                  <input
                    type="date"
                    required
                    value={configClosingDateStr}
                    onChange={(e) => setConfigClosingDateStr(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    required
                    value={configDueDateStr}
                    onChange={(e) => setConfigDueDateStr(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="ios-active w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-indigo-950 transition"
                >
                  Guardar Resumen de {formattedPeriodName}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: REGISTRAR COMPRA EN CUOTAS */}
      {showAddInstallmentModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowAddInstallmentModal(false)} />
          <div 
            className="relative w-full max-w-md bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-2xl p-5 pb-safe z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Nueva Compra en Cuotas
                </h3>
                <p className="text-[11px] text-slate-400">
                  {activeCard.name} (*{activeCard.lastDigits})
                </p>
              </div>
              <button 
                onClick={() => setShowAddInstallmentModal(false)} 
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!newInstDesc.trim()) return;
                const parsedVal = parseFloat(newInstAmountStr.replace(/[^0-9.]/g, '')) || 0;
                if (parsedVal <= 0) return;
                const count = parseInt(newInstCount, 10) || 3;

                const calcTotal = newInstInputMode === 'total' ? parsedVal : Math.round(parsedVal * count);
                const calcInstallment = newInstInputMode === 'total' ? Math.round(parsedVal / count) : parsedVal;

                if (onAddInstallmentPurchase) {
                  onAddInstallmentPurchase({
                    creditCardId: activeCard.id,
                    description: newInstDesc.trim(),
                    totalAmount: calcTotal,
                    installmentAmount: calcInstallment,
                    totalInstallments: count,
                    currency: newInstCurrency,
                  });
                  showNotification('Compra en cuotas registrada.');
                }

                setShowAddInstallmentModal(false);
              }} 
              className="space-y-3.5 mt-4"
            >
              {/* Moneda */}
              <div className="flex p-0.5 rounded-xl bg-slate-950 border border-white/10">
                <button
                  type="button"
                  onClick={() => setNewInstCurrency('ARS')}
                  className={`flex-1 py-1 px-3 text-xs font-bold rounded-lg transition ${
                    newInstCurrency === 'ARS' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                  }`}
                >
                  ARS (Pesos)
                </button>
                <button
                  type="button"
                  onClick={() => setNewInstCurrency('USD')}
                  className={`flex-1 py-1 px-3 text-xs font-bold rounded-lg transition ${
                    newInstCurrency === 'USD' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  USD (Dólares)
                </button>
              </div>

              {/* Concepto / Nombre */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Descripción o Concepto
                </label>
                <input
                  type="text"
                  placeholder="Ej: Smart TV 55, Calzado, Vuelo..."
                  value={newInstDesc}
                  onChange={(e) => setNewInstDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Modo de ingreso */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Modo de ingreso del monto
                </label>
                <div className="flex p-0.5 rounded-xl bg-slate-950 border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setNewInstInputMode('total')}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition ${
                      newInstInputMode === 'total' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'
                    }`}
                  >
                    Ingresar Monto TOTAL
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewInstInputMode('installment')}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition ${
                      newInstInputMode === 'installment' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'
                    }`}
                  >
                    Ingresar Valor por CUOTA
                  </button>
                </div>
              </div>

              {/* Monto Input */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  {newInstInputMode === 'total' ? 'Monto Total de la Compra' : 'Monto de Cada Cuota Mensual'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none select-none">
                    {newInstCurrency === 'USD' ? 'US$' : currencySymbol}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={newInstAmountStr}
                    onChange={(e) => setNewInstAmountStr(filterNumericInput(e.target.value))}
                    onKeyDown={handleNumericKeyDown}
                    className={`w-full bg-slate-950 border border-white/10 rounded-xl ${
                      newInstCurrency === 'USD' ? 'pl-14' : 'pl-9'
                    } pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 tabular-nums font-bold`}
                    required
                  />
                </div>
              </div>

              {/* Cantidad de cuotas */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Cantidad Total de Cuotas
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {['2', '3', '6', '9', '12', '18', '24'].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNewInstCount(n)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition border ${
                        newInstCount === n 
                          ? 'bg-indigo-500 text-slate-950 border-indigo-400' 
                          : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumen del cálculo */}
              {parseFloat(newInstAmountStr) > 0 && (
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-indigo-500/30 text-xs flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">
                    {newInstInputMode === 'total' ? 'Cada cuota será de:' : 'Total estimado:'}
                  </span>
                  <span className="font-extrabold text-white text-sm">
                    {newInstCurrency === 'USD' ? 'US$' : currencySymbol}{' '}
                    {new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(
                      newInstInputMode === 'total'
                        ? Math.round((parseFloat(newInstAmountStr) || 0) / (parseInt(newInstCount, 10) || 1))
                        : (parseFloat(newInstAmountStr) || 0) * (parseInt(newInstCount, 10) || 1)
                    )}
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="ios-active w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-indigo-900/30 mt-2"
              >
                Guardar Compra en Cuotas
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: EDITAR COMPRA EN CUOTAS */}
      {editingInstallment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setEditingInstallment(null)} />
          <div 
            className="relative w-full max-w-md bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-2xl p-5 pb-safe z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Editar Compra en Cuotas
                </h3>
                <p className="text-[11px] text-slate-400">
                  {editingInstallment.description}
                </p>
              </div>
              <button 
                onClick={() => setEditingInstallment(null)} 
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const amountVal = parseFloat(editInstAmountStr.replace(/[^0-9.]/g, '')) || editingInstallment.installmentAmount;
                const currentVal = parseInt(editInstCurrent, 10) || 1;
                const totalVal = parseInt(editInstTotal, 10) || 1;

                if (onUpdateInstallmentPurchase) {
                  onUpdateInstallmentPurchase(editingInstallment.id, {
                    description: editInstDesc.trim() || editingInstallment.description,
                    installmentAmount: amountVal,
                    currentInstallment: currentVal,
                    totalInstallments: totalVal,
                    totalAmount: amountVal * totalVal,
                  });
                  showNotification('Cuota actualizada.');
                }

                setEditingInstallment(null);
              }}
              className="space-y-3.5 mt-4"
            >
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  value={editInstDesc}
                  onChange={(e) => setEditInstDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Monto de cada cuota mensual
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none select-none">
                    {editingInstallment.currency === 'USD' ? 'US$' : currencySymbol}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editInstAmountStr}
                    onChange={(e) => setEditInstAmountStr(filterNumericInput(e.target.value))}
                    onKeyDown={handleNumericKeyDown}
                    className={`w-full bg-slate-950 border border-white/10 rounded-xl ${
                      editingInstallment.currency === 'USD' ? 'pl-14' : 'pl-9'
                    } pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 tabular-nums font-bold`}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Cuota Actual
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={editInstTotal}
                    value={editInstCurrent}
                    onChange={(e) => setEditInstCurrent(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Total de Cuotas
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editInstTotal}
                    onChange={(e) => setEditInstTotal(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="ios-active w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-indigo-900/30 mt-2"
              >
                Actualizar Compra en Cuotas
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 8. Modal: GESTIONAR Y EDITAR TARJETA */}
      {showManageCardModal && activeCard && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowManageCardModal(false)} />
          <div 
            className="relative w-full max-w-md bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-2xl p-5 pb-safe z-10 max-h-[92vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mb-3 sm:hidden" />
            
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Settings2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Gestionar Tarjeta
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {activeCard.name} (*{activeCard.lastDigits})
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowManageCardModal(false)} 
                className="ios-active p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form to Edit Details */}
            <form onSubmit={handleSaveEditCardDetails} className="space-y-3.5 mt-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Nombre de la Tarjeta
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej: Visa Signature, Mastercard Black..."
                  value={editCardName}
                  onChange={(e) => setEditCardName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Banco o Entidad Emisora
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Galicia, Santander, BBVA..."
                    value={editCardBankName}
                    onChange={(e) => setEditCardBankName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Últimos 4 Dígitos
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="4589"
                    value={editCardLastDigits}
                    onChange={(e) => setEditCardLastDigits(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="ios-active w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs tracking-wide shadow-md shadow-indigo-950 transition flex items-center justify-center gap-1.5"
              >
                <Check size={14} />
                <span>Guardar Cambios de Tarjeta</span>
              </button>
            </form>

            {/* Danger Zone: Delete Card */}
            <div className="mt-5 pt-4 border-t border-rose-500/20 space-y-2">
              <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider block">
                Zona de Peligro
              </span>
              <button
                type="button"
                onClick={() => setShowDeleteCardConfirmModal(true)}
                className="ios-active w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Trash2 size={14} className="text-rose-400" />
                <span>Eliminar esta Tarjeta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal: CONFIRMAR ELIMINACIÓN DE TARJETA */}
      {showDeleteCardConfirmModal && activeCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-5 shadow-2xl text-center space-y-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/25">
              <Trash2 size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">
                ¿Eliminar {activeCard.name}?
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                ¿Estás seguro de que deseas eliminar esta tarjeta? Esta acción no se puede deshacer. Se desvincularán sus consumos asociados.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteCardConfirmModal(false)}
                className="ios-active flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs border border-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCard}
                className="ios-active flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
