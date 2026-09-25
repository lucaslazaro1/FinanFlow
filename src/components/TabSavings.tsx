import React, { useState, useMemo } from 'react';
import { 
  PiggyBank, 
  TrendingUp, 
  Plus, 
  Edit3, 
  Trash2, 
  ArrowDownRight, 
  ArrowUpRight,
  ShieldCheck, 
  Landmark, 
  Coins, 
  Banknote, 
  Building, 
  X, 
  Check, 
  Sparkles,
  Info,
  DollarSign,
  Wallet,
  Clock,
  RotateCw,
  Calendar,
  AlertCircle,
  Percent,
  CheckCircle2
} from 'lucide-react';
import { SavingsInstrument, SavingsType, Currency, Expense, CategoryId, PaymentMethod, Income } from '../types/finance';
import { formatMoney, formatCurrency, filterNumericInput, handleNumericKeyDown, formatCardDisplayDate } from '../utils/format';
import { triggerHaptic } from '../hooks/useFinanceStore';

interface TabSavingsProps {
  instruments: SavingsInstrument[];
  totalSavingsARS: number;
  totalSavingsUSD: number;
  saldoNetoDisponible: number;
  disponibleUSD: number;
  currencySymbol: string;
  onAddInstrument: (data: {
    name: string;
    type: SavingsType;
    currency: Currency;
    currentBalance: number;
    notes?: string;
    targetAmount?: number;
    tna?: number;
    startDate?: string;
    dueDate?: string;
    termDays?: number;
    initialCapital?: number;
  }) => void;
  onUpdateInstrument: (id: string, updates: Partial<SavingsInstrument>) => void;
  onDeleteInstrument: (id: string) => void;
  onAddToFundBalance: (id: string, amount: number) => void;
  onSubtractFromFundBalance: (id: string, amount: number) => void;
  onAddExpense: (payload: {
    amount: number;
    category: CategoryId;
    paymentMethod: PaymentMethod;
    note?: string;
    currency?: Currency;
    isSavingsTransfer?: boolean;
    savingsFundId?: string;
  }) => void;
  onAddIncome: (payload: {
    amount: number;
    source: string;
    note?: string;
    currency?: Currency;
    date?: string;
  }) => void;
}

const SAVINGS_TYPE_INFO: Record<SavingsType, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string; bg: string }> = {
  plazo_fijo: {
    label: 'Plazo Fijo',
    icon: Clock,
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.15)',
  },
  emergency: {
    label: 'Fondo de Emergencia',
    icon: ShieldCheck,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
  },
  fixed_term: {
    label: 'Billeteras / Rendimiento',
    icon: Landmark,
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.15)',
  },
  stocks: {
    label: 'Acciones & Cedears',
    icon: TrendingUp,
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.15)',
  },
  crypto: {
    label: 'Criptoactivos',
    icon: Coins,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
  },
  cash_usd: {
    label: 'Dólares Colchón',
    icon: Banknote,
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.15)',
  },
  real_estate: {
    label: 'Inmuebles / Proyectos',
    icon: Building,
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.15)',
  },
  other: {
    label: 'Otro Ahorro',
    icon: Wallet,
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.15)',
  },
};

/**
 * Calculates Plazo Fijo estimated interest
 * Interés = Capital * (TNA / 100) * (días / 365)
 */
function calculatePlazoFijoInterest(capital: number, tna: number, termDays: number = 30): number {
  if (!capital || !tna || capital <= 0 || tna <= 0) return 0;
  const days = termDays > 0 ? termDays : 30;
  return Math.round((capital * (tna / 100) * (days / 365)) * 100) / 100;
}

/**
 * Returns days difference from today to a date string YYYY-MM-DD
 */
function getDaysUntilMaturity(dueDateStr?: string): number | null {
  if (!dueDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parts = dueDateStr.split('-');
  if (parts.length < 3) return null;
  const due = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export const TabSavings: React.FC<TabSavingsProps> = ({
  instruments,
  totalSavingsARS,
  totalSavingsUSD,
  saldoNetoDisponible,
  disponibleUSD,
  currencySymbol,
  onAddInstrument,
  onUpdateInstrument,
  onDeleteInstrument,
  onAddToFundBalance,
  onSubtractFromFundBalance,
  onAddExpense,
  onAddIncome,
}) => {
  const [filter, setFilter] = useState<'all' | 'ARS' | 'USD'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInstrument, setEditingInstrument] = useState<SavingsInstrument | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRescueModal, setShowRescueModal] = useState(false);
  const [showPlazoFijoMaturityModal, setShowPlazoFijoMaturityModal] = useState<SavingsInstrument | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states for Add/Edit Instrument
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<SavingsType>('emergency');
  const [formCurrency, setFormCurrency] = useState<Currency>('ARS');
  const [formBalanceStr, setFormBalanceStr] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formTargetStr, setFormTargetStr] = useState('');
  // Plazo Fijo fields
  const [formTnaStr, setFormTnaStr] = useState('38');
  const [formTermDaysStr, setFormTermDaysStr] = useState('30');
  const [formStartDateStr, setFormStartDateStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [formDueDateStr, setFormDueDateStr] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // Form states for "Destinar al Ahorro" (From monthly available to savings)
  const [transferFundId, setTransferFundId] = useState<string>('');
  const [transferAmountStr, setTransferAmountStr] = useState('');
  const [transferNote, setTransferNote] = useState('Ahorro apartado del mes');

  // Form states for "Rescatar al Disponible" (From savings to monthly available)
  const [rescueFundId, setRescueFundId] = useState<string>('');
  const [rescueAmountStr, setRescueAmountStr] = useState('');
  const [rescueNote, setRescueNote] = useState('Rescate de Ahorros');

  // Renewal options for Plazo Fijo
  const [pfRenewalDaysStr, setPfRenewalDaysStr] = useState('30');
  const [pfCustomTnaStr, setPfCustomTnaStr] = useState('');

  const filteredInstruments = instruments.filter(i => {
    if (filter === 'all') return true;
    return (i.currency || 'ARS') === filter;
  });

  const arsCount = instruments.filter(i => (i.currency || 'ARS') === 'ARS').length;
  const usdCount = instruments.filter(i => i.currency === 'USD').length;

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Open Add modal
  const handleOpenAdd = (presetType?: SavingsType) => {
    triggerHaptic('light');
    setEditingInstrument(null);
    const initialType = presetType || 'emergency';
    setFormType(initialType);
    setFormName(initialType === 'plazo_fijo' ? 'Plazo Fijo Tradicional (30 días)' : '');
    setFormCurrency('ARS');
    setFormBalanceStr('');
    setFormNotes('');
    setFormTargetStr('');
    setFormTnaStr('38');
    setFormTermDaysStr('30');
    const todayStr = new Date().toISOString().split('T')[0];
    setFormStartDateStr(todayStr);
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setFormDueDateStr(d.toISOString().split('T')[0]);
    setShowAddModal(true);
  };

  // Open Edit modal
  const handleOpenEdit = (inst: SavingsInstrument) => {
    triggerHaptic('light');
    setEditingInstrument(inst);
    setFormName(inst.name);
    setFormType(inst.type);
    setFormCurrency(inst.currency || 'ARS');
    setFormBalanceStr(String(inst.currentBalance || '0'));
    setFormNotes(inst.notes || '');
    setFormTargetStr(inst.targetAmount ? String(inst.targetAmount) : '');
    setFormTnaStr(inst.tna !== undefined ? String(inst.tna) : '38');
    setFormTermDaysStr(inst.termDays !== undefined ? String(inst.termDays) : '30');
    setFormStartDateStr(inst.startDate || new Date().toISOString().split('T')[0]);
    setFormDueDateStr(inst.dueDate || '');
    setShowAddModal(true);
  };

  // Helper to recalculate due date when term days or start date changes
  const handleTermDaysChange = (daysValStr: string) => {
    setFormTermDaysStr(daysValStr);
    const days = parseInt(daysValStr, 10);
    if (!isNaN(days) && days > 0) {
      const base = formStartDateStr ? new Date(formStartDateStr) : new Date();
      base.setDate(base.getDate() + days);
      setFormDueDateStr(base.toISOString().split('T')[0]);
    }
  };

  // Save Add/Edit
  const handleSaveInstrument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const balanceVal = parseFloat(formBalanceStr.replace(/[^0-9.]/g, '')) || 0;
    const targetVal = parseFloat(formTargetStr.replace(/[^0-9.]/g, '')) || 0;
    const tnaVal = formType === 'plazo_fijo' ? parseFloat(formTnaStr.replace(/[^0-9.]/g, '')) || 0 : undefined;
    const termDaysVal = formType === 'plazo_fijo' ? parseInt(formTermDaysStr.replace(/[^0-9]/g, ''), 10) || 30 : undefined;

    if (editingInstrument) {
      onUpdateInstrument(editingInstrument.id, {
        name: formName.trim(),
        type: formType,
        currency: formCurrency,
        currentBalance: balanceVal,
        notes: formNotes.trim() || undefined,
        targetAmount: targetVal > 0 ? targetVal : undefined,
        tna: tnaVal,
        termDays: termDaysVal,
        startDate: formType === 'plazo_fijo' ? formStartDateStr : undefined,
        dueDate: formType === 'plazo_fijo' ? formDueDateStr : undefined,
        initialCapital: formType === 'plazo_fijo' ? (editingInstrument.initialCapital || balanceVal) : undefined,
      });
      showNotification('¡Fondo actualizado correctamente!');
    } else {
      onAddInstrument({
        name: formName.trim(),
        type: formType,
        currency: formCurrency,
        currentBalance: balanceVal,
        notes: formNotes.trim() || undefined,
        targetAmount: targetVal > 0 ? targetVal : undefined,
        tna: tnaVal,
        termDays: termDaysVal,
        startDate: formType === 'plazo_fijo' ? formStartDateStr : undefined,
        dueDate: formType === 'plazo_fijo' ? formDueDateStr : undefined,
        initialCapital: balanceVal,
      });
      showNotification(formType === 'plazo_fijo' ? '¡Plazo Fijo registrado con éxito!' : '¡Nuevo fondo de ahorro creado!');
    }

    setShowAddModal(false);
  };

  // Open Transfer to Savings modal (Destinar)
  const handleOpenTransfer = (presetFundId?: string) => {
    triggerHaptic('light');
    const targetId = presetFundId || (instruments[0]?.id || '');
    setTransferFundId(targetId);
    setTransferAmountStr('');
    setTransferNote('Ahorro apartado del mes');
    setShowTransferModal(true);
  };

  // Open Rescue modal (Rescatar al Disponible)
  const handleOpenRescue = (presetFundId?: string) => {
    triggerHaptic('light');
    const targetId = presetFundId || (instruments[0]?.id || '');
    setRescueFundId(targetId);
    setRescueAmountStr('');
    setRescueNote('Rescate de Ahorros');
    setShowRescueModal(true);
  };

  // Confirm Transfer from Available to Savings Fund
  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(transferAmountStr.replace(/[^0-9.]/g, ''));
    if (!amountVal || amountVal <= 0) return;

    const targetFund = instruments.find(i => i.id === transferFundId);
    if (!targetFund) return;

    triggerHaptic('success');

    // 1. Add amount to savings fund
    onAddToFundBalance(targetFund.id, amountVal);

    // 2. Register expense movement in current month so it reduces monthly available
    onAddExpense({
      amount: amountVal,
      category: 'otros',
      paymentMethod: 'cash_debit',
      currency: targetFund.currency,
      note: `Destinado a ${targetFund.name}${transferNote ? ` (${transferNote})` : ''}`,
      isSavingsTransfer: true,
      savingsFundId: targetFund.id,
    });

    setShowTransferModal(false);
    showNotification(`¡${formatCurrency(amountVal, targetFund.currency)} apartados exitosamente a ${targetFund.name}!`);
  };

  // Confirm Rescue from Savings Fund to Available (Rescate)
  const handleConfirmRescue = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(rescueAmountStr.replace(/[^0-9.]/g, ''));
    if (!amountVal || amountVal <= 0) return;

    const originFund = instruments.find(i => i.id === rescueFundId);
    if (!originFund) return;

    if (amountVal > originFund.currentBalance) {
      showNotification('El monto a rescatar supera el saldo actual del fondo.');
      return;
    }

    triggerHaptic('success');

    // 1. Subtract from savings fund balance
    onSubtractFromFundBalance(originFund.id, amountVal);

    // 2. Add as Income in current month (ARS -> Saldo Neto Disponible, USD -> Disponible USD)
    onAddIncome({
      amount: amountVal,
      source: 'Rescate de Ahorros',
      note: `Rescate desde ${originFund.name}${rescueNote ? ` (${rescueNote})` : ''}`,
      currency: originFund.currency,
      date: new Date().toISOString().split('T')[0],
    });

    setShowRescueModal(false);
    showNotification(`¡${formatCurrency(amountVal, originFund.currency)} rescatados y transferidos a tu Disponible!`);
  };

  // Open Plazo Fijo maturity modal
  const handleOpenPlazoFijoMaturity = (inst: SavingsInstrument) => {
    triggerHaptic('medium');
    setShowPlazoFijoMaturityModal(inst);
    setPfRenewalDaysStr(inst.termDays ? String(inst.termDays) : '30');
    setPfCustomTnaStr(inst.tna ? String(inst.tna) : '38');
  };

  // Plazo Fijo Maturity Action 1: Acreditar Capital + Intereses al Disponible
  const handleCreditAllToMonthlyAvailable = (inst: SavingsInstrument) => {
    triggerHaptic('success');
    const capital = inst.currentBalance || inst.initialCapital || 0;
    const tna = inst.tna || 0;
    const days = inst.termDays || 30;
    const interest = calculatePlazoFijoInterest(capital, tna, days);
    const totalToCredit = capital + interest;

    // 1. Register income to monthly available
    onAddIncome({
      amount: totalToCredit,
      source: 'Vencimiento Plazo Fijo',
      note: `${inst.name} (Capital: ${formatCurrency(capital, inst.currency)} + Rendimiento: ${formatCurrency(interest, inst.currency)})`,
      currency: inst.currency,
      date: new Date().toISOString().split('T')[0],
    });

    // 2. Set balance to 0 in savings
    onUpdateInstrument(inst.id, {
      currentBalance: 0,
      notes: `Vencido y acreditado al disponible (${new Date().toLocaleDateString('es-AR')})`,
    });

    setShowPlazoFijoMaturityModal(null);
    showNotification(`¡${formatCurrency(totalToCredit, inst.currency)} acreditados exitosamente a tu Disponible!`);
  };

  // Plazo Fijo Maturity Action 2: Renovar Plazo Fijo (Capital + Intereses re-invertidos)
  const handleRenewPlazoFijoFull = (inst: SavingsInstrument) => {
    triggerHaptic('success');
    const capital = inst.currentBalance || inst.initialCapital || 0;
    const tna = parseFloat(pfCustomTnaStr) || inst.tna || 38;
    const days = parseInt(pfRenewalDaysStr, 10) || inst.termDays || 30;
    const interest = calculatePlazoFijoInterest(capital, tna, days);
    const newCapital = capital + interest;

    const today = new Date();
    const startDateStr = today.toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    onUpdateInstrument(inst.id, {
      currentBalance: newCapital,
      initialCapital: newCapital,
      tna: tna,
      termDays: days,
      startDate: startDateStr,
      dueDate: dueDateStr,
      notes: `Renovado con intereses (${tna}% TNA a ${days} días)`,
    });

    setShowPlazoFijoMaturityModal(null);
    showNotification(`¡Plazo Fijo renovado por ${formatCurrency(newCapital, inst.currency)} a ${days} días!`);
  };

  // Plazo Fijo Maturity Action 3: Acreditar solo Intereses al Disponible y Renovar Capital inicial
  const handleCreditInterestAndRenewCapital = (inst: SavingsInstrument) => {
    triggerHaptic('success');
    const capital = inst.initialCapital || inst.currentBalance || 0;
    const tna = parseFloat(pfCustomTnaStr) || inst.tna || 38;
    const days = parseInt(pfRenewalDaysStr, 10) || inst.termDays || 30;
    const interest = calculatePlazoFijoInterest(capital, tna, days);

    // 1. Credit interest to monthly available
    if (interest > 0) {
      onAddIncome({
        amount: interest,
        source: 'Rendimiento Plazo Fijo',
        note: `Intereses ganados de ${inst.name} (${tna}% TNA)`,
        currency: inst.currency,
        date: new Date().toISOString().split('T')[0],
      });
    }

    // 2. Renew initial capital for another term
    const today = new Date();
    const startDateStr = today.toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    onUpdateInstrument(inst.id, {
      currentBalance: capital,
      initialCapital: capital,
      tna: tna,
      termDays: days,
      startDate: startDateStr,
      dueDate: dueDateStr,
      notes: `Capital renovado a ${days} días (${tna}% TNA) - Rendimiento cobrado`,
    });

    setShowPlazoFijoMaturityModal(null);
    showNotification(`¡${formatCurrency(interest, inst.currency)} acreditados al disponible y capital renovado!`);
  };

  const selectedTransferFund = instruments.find(i => i.id === transferFundId);
  const currentAvailableForSelectedFund = selectedTransferFund?.currency === 'USD' 
    ? disponibleUSD 
    : saldoNetoDisponible;

  const selectedRescueFund = instruments.find(i => i.id === rescueFundId);

  // Live estimated interest in Create/Edit Modal for Plazo Fijo
  const liveFormPfInterest = useMemo(() => {
    if (formType !== 'plazo_fijo') return { interest: 0, total: 0 };
    const cap = parseFloat(formBalanceStr.replace(/[^0-9.]/g, '')) || 0;
    const tna = parseFloat(formTnaStr.replace(/[^0-9.]/g, '')) || 0;
    const days = parseInt(formTermDaysStr.replace(/[^0-9]/g, ''), 10) || 30;
    const interest = calculatePlazoFijoInterest(cap, tna, days);
    return { interest, total: cap + interest };
  }, [formType, formBalanceStr, formTnaStr, formTermDaysStr]);

  return (
    <div className="space-y-4 pb-28 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 inset-x-4 z-50 max-w-sm mx-auto p-3 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-xl flex items-center justify-center gap-2 animate-slide-down">
          <Check size={16} className="stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header with Title & Action */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <PiggyBank className="text-emerald-400 shrink-0" size={22} />
            <span className="truncate">Ahorro e Inversiones</span>
          </h2>
          <p className="text-xs text-slate-400">
            Patrimonio, fondos de reserva y plazos fijos
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenAdd()}
          className="ios-active inline-flex flex-row items-center justify-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-semibold rounded-xl shrink-0 bg-white/10 hover:bg-white/15 text-white border border-white/10 transition shadow-sm"
        >
          <Plus size={14} className="text-emerald-400" />
          <span>Nuevo Fondo</span>
        </button>
      </div>

      {/* Dual Currency ARS / USD Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* TOTAL AHORRADO EN ARS */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/25 relative overflow-hidden shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">
              Total en Pesos (ARS)
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <PiggyBank size={15} />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-white tracking-tight tabular-nums">
              {formatMoney(totalSavingsARS, currencySymbol)}
            </p>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {arsCount} {arsCount === 1 ? 'fondo activo' : 'fondos activos'} en ARS
            </span>
          </div>
        </div>

        {/* TOTAL INVERTIDO / AHORRADO EN USD */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-950 border border-amber-500/25 relative overflow-hidden shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300">
              Total en Dólares (USD)
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <TrendingUp size={15} />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight tabular-nums">
              {formatCurrency(totalSavingsUSD, 'USD')}
            </p>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {usdCount} {usdCount === 1 ? 'instrumento' : 'instrumentos'} en USD
            </span>
          </div>
        </div>
      </div>

      {/* Fast Action Buttons: "Destinar al Ahorro" & "Rescatar al Disponible" */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* DESTINAR AL AHORRO */}
        <button
          type="button"
          onClick={() => handleOpenTransfer()}
          disabled={instruments.length === 0}
          className="ios-active p-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-emerald-500/30 flex flex-col items-start justify-between gap-2.5 text-left transition shadow-md disabled:opacity-50"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ArrowDownRight size={16} className="stroke-[2.5]" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white whitespace-nowrap">
              + Destinar
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
              Apartar dinero de mi disponible
            </p>
          </div>
        </button>

        {/* RESCATAR AL DISPONIBLE */}
        <button
          type="button"
          onClick={() => handleOpenRescue()}
          disabled={instruments.length === 0}
          className="ios-active p-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-indigo-500/30 flex flex-col items-start justify-between gap-2.5 text-left transition shadow-md disabled:opacity-50"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <ArrowUpRight size={16} className="stroke-[2.5]" />
          </div>
          <div>
            <h4 className="text-xs font-black text-indigo-300 whitespace-nowrap">
              Rescatar
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
              Pasar ahorro a saldo mensual
            </p>
          </div>
        </button>
      </div>

      {/* Filter Tabs: Todos | ARS | USD */}
      <div className="flex items-center justify-between px-1 pt-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Mis Fondos & Carteras ({filteredInstruments.length})
        </span>

        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => { triggerHaptic('light'); setFilter('all'); }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
              filter === 'all' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos ({instruments.length})
          </button>
          <button
            type="button"
            onClick={() => { triggerHaptic('light'); setFilter('ARS'); }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
              filter === 'ARS' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            ARS ({arsCount})
          </button>
          <button
            type="button"
            onClick={() => { triggerHaptic('light'); setFilter('USD'); }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
              filter === 'USD' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            USD ({usdCount})
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredInstruments.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/40 rounded-3xl border border-white/5 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
            <PiggyBank size={28} />
          </div>
          <h3 className="text-sm font-bold text-white">No hay fondos en esta vista</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Crea plazos fijos, fondos de emergencia, inversiones en Cedears o dólares físicos.
          </p>
          <div className="grid grid-cols-2 gap-2.5 w-full my-3">
            <button
              type="button"
              onClick={() => handleOpenAdd('plazo_fijo')}
              className="ios-active w-full py-2.5 px-2 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/40 border border-cyan-500/40 text-cyan-300 flex items-center justify-center gap-1.5 text-center transition active:scale-95 shadow-sm"
            >
              <Clock size={14} className="shrink-0 stroke-[2]" />
              <span className="text-xs font-semibold whitespace-nowrap truncate">Nuevo Plazo Fijo</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAdd()}
              className="ios-active w-full py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 text-center transition active:scale-95 shadow-sm"
            >
              <Plus size={14} className="shrink-0 stroke-[2.5]" />
              <span className="text-xs font-semibold whitespace-nowrap truncate">Nuevo Fondo</span>
            </button>
          </div>
        </div>
      ) : (
        /* Instruments List */
        <div className="space-y-3">
          {filteredInstruments.map((inst) => {
            const isPlazoFijo = inst.type === 'plazo_fijo';
            const typeConfig = SAVINGS_TYPE_INFO[inst.type] || SAVINGS_TYPE_INFO.other;
            const Icon = typeConfig.icon;
            const isUSD = inst.currency === 'USD';
            const hasTarget = inst.targetAmount && inst.targetAmount > 0;
            const progress = hasTarget ? Math.min(100, Math.round((inst.currentBalance / inst.targetAmount!) * 100)) : null;

            // Plazo Fijo computations
            const capital = inst.currentBalance || inst.initialCapital || 0;
            const tna = inst.tna || 0;
            const termDays = inst.termDays || 30;
            const estimatedInterest = isPlazoFijo ? calculatePlazoFijoInterest(capital, tna, termDays) : 0;
            const daysToMaturity = isPlazoFijo ? getDaysUntilMaturity(inst.dueDate) : null;
            const isMatured = daysToMaturity !== null && daysToMaturity <= 0;
            const isDueSoon = daysToMaturity !== null && daysToMaturity > 0 && daysToMaturity <= 3;

            return (
              <div
                key={inst.id}
                className={`ios-active p-4 rounded-3xl bg-slate-900/80 border transition shadow-sm space-y-3 ${
                  isPlazoFijo 
                    ? isMatured 
                      ? 'border-amber-500/50 bg-gradient-to-b from-amber-950/20 to-slate-900/90 shadow-amber-950/30' 
                      : 'border-cyan-500/30 bg-gradient-to-b from-cyan-950/15 to-slate-900/90'
                    : 'border-white/5 hover:border-white/10'
                }`}
              >
                {/* Top header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: typeConfig.bg, color: typeConfig.color }}
                    >
                      <Icon size={20} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/5 flex items-center gap-1">
                          {typeConfig.label}
                        </span>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                          isUSD ? 'bg-amber-400/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {isUSD ? 'USD' : 'ARS'}
                        </span>
                        {isPlazoFijo && tna > 0 && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {tna}% TNA
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-extrabold text-white mt-1 break-words">
                        {inst.name}
                      </h4>
                    </div>
                  </div>

                  {/* Top Actions: Edit & Delete */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(inst)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition"
                      title="Editar fondo"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(inst.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Eliminar fondo"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Plazo Fijo Detailed Info Banner */}
                {isPlazoFijo && (
                  <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-cyan-500/20 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        Rendimiento Estimado
                      </span>
                      <p className="font-extrabold text-cyan-300 tabular-nums">
                        +{formatCurrency(estimatedInterest, inst.currency)}
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Total al cobrar: {formatCurrency(capital + estimatedInterest, inst.currency)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        Vencimiento ({termDays}d)
                      </span>
                      {inst.dueDate ? (
                        <div>
                          <p className={`font-bold text-xs ${
                            isMatured 
                              ? 'text-amber-400 font-extrabold' 
                              : isDueSoon 
                                ? 'text-amber-300 font-bold' 
                                : 'text-slate-200'
                          }`}>
                            {inst.dueDate}
                          </p>
                          <span className={`text-[10px] font-bold block mt-0.5 ${
                            isMatured 
                              ? 'text-amber-400' 
                              : isDueSoon 
                                ? 'text-amber-300' 
                                : 'text-slate-400'
                          }`}>
                            {daysToMaturity === 0 
                              ? '⚠️ ¡Vence HOY!' 
                              : (daysToMaturity !== null && daysToMaturity < 0) 
                                ? `⚠️ ¡Venció hace ${Math.abs(daysToMaturity)} días!` 
                                : `En ${daysToMaturity} días`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs">-</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Balance & Notes */}
                <div className="flex items-end justify-between pt-1 border-t border-white/5">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                      {isPlazoFijo ? 'Capital Invertido' : 'Monto Actual'}
                    </span>
                    <p className={`text-xl font-black tracking-tight tabular-nums ${isUSD ? 'text-amber-300' : 'text-white'}`}>
                      {formatCurrency(inst.currentBalance, inst.currency)}
                    </p>
                  </div>

                  {inst.notes && !isPlazoFijo && (
                    <div className="text-right max-w-[55%]">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        Rendimiento / Detalle
                      </span>
                      <p className="text-xs text-slate-300 font-medium truncate">
                        {inst.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Progress towards target if set */}
                {hasTarget && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Meta: {formatCurrency(inst.targetAmount!, inst.currency)}</span>
                      <span className="font-bold text-slate-300">{progress}% alcanzado</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isUSD ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action buttons row on each instrument card */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {/* Rescatar al Disponible button */}
                  <button
                    type="button"
                    onClick={() => handleOpenRescue(inst.id)}
                    disabled={inst.currentBalance <= 0}
                    className="ios-active inline-flex flex-row items-center justify-center gap-2 whitespace-nowrap px-3.5 py-2 text-xs font-semibold rounded-xl w-auto flex-1 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ArrowUpRight size={14} className="stroke-[2.5] shrink-0" />
                    <span>Rescatar al Disponible</span>
                  </button>

                  {/* Plazo Fijo: Acreditar / Renovar */}
                  {isPlazoFijo ? (
                    <button
                      type="button"
                      onClick={() => handleOpenPlazoFijoMaturity(inst)}
                      className={`ios-active inline-flex flex-row items-center justify-center gap-2 whitespace-nowrap px-3.5 py-2 text-xs font-semibold rounded-xl w-auto flex-1 transition ${
                        isMatured 
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-950 font-extrabold animate-pulse' 
                          : 'bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300'
                      }`}
                    >
                      <RotateCw size={13} className={`shrink-0 ${isMatured ? 'stroke-[3]' : ''}`} />
                      <span>{isMatured ? 'Acreditar Vencimiento' : 'Gestionar Vencimiento'}</span>
                    </button>
                  ) : (
                    /* Other instruments: Apartar / Destinar */
                    <button
                      type="button"
                      onClick={() => handleOpenTransfer(inst.id)}
                      className="ios-active inline-flex flex-row items-center justify-center gap-2 whitespace-nowrap px-3.5 py-2 text-xs font-semibold rounded-xl w-auto flex-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 transition"
                    >
                      <ArrowDownRight size={14} className="stroke-[2.5] shrink-0" />
                      <span>+ Destinar dinero</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: RESCATAR AL DISPONIBLE */}
      {showRescueModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowRescueModal(false)} />
          <div 
            className="relative w-full max-w-md bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl p-5 shadow-2xl z-10 max-h-[90vh] overflow-y-auto overscroll-contain pb-safe animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mb-3 sm:hidden" />
            
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <ArrowUpRight size={16} className="stroke-[2.5]" />
                </div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Rescatar / Pasar al Disponible
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowRescueModal(false)} 
                className="ios-active p-1 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmRescue} className="space-y-4 mt-3">
              {/* Origin fund selector */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Fondo o Instrumento de Origen
                </label>
                <select
                  value={rescueFundId}
                  onChange={(e) => setRescueFundId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  {instruments.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.currency || 'ARS'}) - Saldo: {formatCurrency(inst.currentBalance, inst.currency)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fund balance indicator */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Saldo Acumulado en este Fondo
                  </span>
                  <p className={`text-base font-extrabold ${
                    selectedRescueFund?.currency === 'USD' ? 'text-amber-300' : 'text-white'
                  }`}>
                    {selectedRescueFund ? formatCurrency(selectedRescueFund.currentBalance, selectedRescueFund.currency) : '$0'}
                  </p>
                </div>
                <span className="text-[10px] text-indigo-400 font-medium">
                  Fondos a retirar
                </span>
              </div>

              {/* Amount to rescue */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Monto a Rescatar
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold pointer-events-none">
                    {selectedRescueFund?.currency === 'USD' ? 'US$' : currencySymbol}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0"
                    value={rescueAmountStr}
                    onChange={(e) => setRescueAmountStr(filterNumericInput(e.target.value))}
                    onKeyDown={handleNumericKeyDown}
                    className={`w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-extrabold tabular-nums ${
                      selectedRescueFund?.currency === 'USD' ? 'pl-14' : 'pl-9'
                    }`}
                    autoFocus
                  />
                </div>

                {/* Quick percentage buttons */}
                {selectedRescueFund && selectedRescueFund.currentBalance > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar py-0.5">
                    {[
                      { label: '25%', factor: 0.25 },
                      { label: '50%', factor: 0.5 },
                      { label: '75%', factor: 0.75 },
                      { label: '100% (Todo)', factor: 1.0 },
                    ].map((btn) => {
                      const computedVal = Math.round(selectedRescueFund.currentBalance * btn.factor);
                      return (
                        <button
                          key={btn.label}
                          type="button"
                          onClick={() => setRescueAmountStr(String(computedVal))}
                          className="ios-active px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 flex-shrink-0"
                        >
                          {btn.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Informative destination banner */}
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
                  <Info size={14} />
                  <span>Destino de los fondos:</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {selectedRescueFund?.currency === 'USD' 
                    ? 'El monto se sumará inmediatamente a tu Caja / Disponible en Dólares (USD).'
                    : 'El monto se sumará inmediatamente al Saldo Neto Disponible de este mes como un ingreso compensatorio para gastar.'}
                </p>
              </div>

              {/* Concept / Note */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Concepto / Detalle (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Rescate para gastos imprevistos..."
                  value={rescueNote}
                  onChange={(e) => setRescueNote(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!parseFloat(rescueAmountStr.replace(/[^0-9.]/g, ''))}
                  className="ios-active w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-indigo-950 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar y Pasar al Disponible
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: GESTIONAR VENCIMIENTO DE PLAZO FIJO */}
      {showPlazoFijoMaturityModal && (() => {
        const inst = showPlazoFijoMaturityModal;
        const capital = inst.currentBalance || inst.initialCapital || 0;
        const tna = parseFloat(pfCustomTnaStr) || inst.tna || 38;
        const days = parseInt(pfRenewalDaysStr, 10) || inst.termDays || 30;
        const interest = calculatePlazoFijoInterest(capital, tna, days);
        const totalFinal = capital + interest;
        const daysToMaturity = getDaysUntilMaturity(inst.dueDate);
        const isMatured = daysToMaturity !== null && daysToMaturity <= 0;

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="absolute inset-0" onClick={() => setShowPlazoFijoMaturityModal(null)} />
            <div 
              className="relative w-full max-w-md bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl p-5 shadow-2xl z-10 max-h-[90vh] overflow-y-auto overscroll-contain pb-safe animate-slide-up space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mb-3 sm:hidden" />
              
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Clock size={16} />
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Gestionar Vencimiento: {inst.name}
                  </h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowPlazoFijoMaturityModal(null)} 
                  className="ios-active p-1 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Summary Card with calculations */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-950 to-slate-950 border border-cyan-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-cyan-400">
                    Estado del Plazo Fijo
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                    isMatured ? 'bg-amber-400/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'
                  }`}>
                    {isMatured ? '¡Listo para Liquidar!' : `Vence: ${inst.dueDate || 'En plazo'}`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Capital Inicial</span>
                    <p className="text-sm font-bold text-white tabular-nums">
                      {formatCurrency(capital, inst.currency)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Intereses ({tna}% TNA)</span>
                    <p className="text-sm font-bold text-emerald-400 tabular-nums">
                      +{formatCurrency(interest, inst.currency)}
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Monto Total al Vencimiento
                    </span>
                    <p className="text-lg font-black text-cyan-300 tabular-nums">
                      {formatCurrency(totalFinal, inst.currency)}
                    </p>
                  </div>
                  <Sparkles size={20} className="text-cyan-400" />
                </div>
              </div>

              {/* Renewal Options Input Controls */}
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-white/5 space-y-2">
                <label className="text-[11px] font-bold text-slate-300 block">
                  Ajustar TNA y Plazo para renovación:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Tasa TNA (%)</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={pfCustomTnaStr}
                      onChange={(e) => setPfCustomTnaStr(filterNumericInput(e.target.value))}
                      onKeyDown={handleNumericKeyDown}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Plazo (días)</span>
                    <select
                      value={pfRenewalDaysStr}
                      onChange={(e) => setPfRenewalDaysStr(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold"
                    >
                      <option value="30">30 días</option>
                      <option value="60">60 días</option>
                      <option value="90">90 días</option>
                      <option value="180">180 días</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3 Main Action Choices */}
              <div className="space-y-2 pt-1">
                {/* Option 1: Acreditar Todo al Disponible */}
                <button
                  type="button"
                  onClick={() => handleCreditAllToMonthlyAvailable(inst)}
                  className="ios-active w-full p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-slate-950 text-left shadow-md flex items-center justify-between gap-3 transition"
                >
                  <div>
                    <h5 className="text-xs font-black text-slate-950 flex items-center gap-1.5">
                      <ArrowUpRight size={15} className="stroke-[3]" />
                      <span>Acreditar Todo al Disponible ({formatCurrency(totalFinal, inst.currency)})</span>
                    </h5>
                    <p className="text-[10px] text-emerald-950 font-semibold mt-0.5">
                      Transfiere Capital + Intereses como ingreso al mes actual para gastar
                    </p>
                  </div>
                  <Check size={18} className="text-slate-950 stroke-[3] flex-shrink-0" />
                </button>

                {/* Option 2: Renovar Plazo Fijo con Intereses */}
                <button
                  type="button"
                  onClick={() => handleRenewPlazoFijoFull(inst)}
                  className="ios-active w-full p-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white text-left shadow-md flex items-center justify-between gap-3 transition"
                >
                  <div>
                    <h5 className="text-xs font-black text-white flex items-center gap-1.5">
                      <RotateCw size={15} className="stroke-[2.5]" />
                      <span>Renovar Plazo Fijo ({formatCurrency(totalFinal, inst.currency)})</span>
                    </h5>
                    <p className="text-[10px] text-cyan-100 font-medium mt-0.5">
                      Re-invierte Capital + Intereses por otros {pfRenewalDaysStr} días (interés compuesto)
                    </p>
                  </div>
                  <Sparkles size={18} className="text-cyan-200 flex-shrink-0" />
                </button>

                {/* Option 3: Cobrar Intereses y Renovar solo Capital */}
                <button
                  type="button"
                  onClick={() => handleCreditInterestAndRenewCapital(inst)}
                  className="ios-active w-full p-3 rounded-2xl bg-slate-800 hover:bg-slate-700/80 border border-white/10 text-white text-left shadow-sm flex items-center justify-between gap-3 transition"
                >
                  <div>
                    <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Percent size={14} className="text-amber-400" />
                      <span>Cobrar Rendimiento ({formatCurrency(interest, inst.currency)}) y Renovar Capital</span>
                    </h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Pasa solo los intereses al disponible del mes y mantiene el capital inicial invertido
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: DESTINAR AL AHORRO DESDE EL DISPONIBLE */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowTransferModal(false)} />
          <div 
            className="relative w-full max-w-md bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl p-5 shadow-2xl z-10 max-h-[90vh] overflow-y-auto overscroll-contain pb-safe animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mb-3 sm:hidden" />
            
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ArrowDownRight size={16} />
                </div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Destinar al Ahorro
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowTransferModal(false)} 
                className="ios-active p-1 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmTransfer} className="space-y-4 mt-3">
              {/* Destination fund select */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Fondo o Cartera de Destino
                </label>
                <select
                  value={transferFundId}
                  onChange={(e) => setTransferFundId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                >
                  {instruments.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.currency || 'ARS'}) - Saldo actual: {formatCurrency(inst.currentBalance, inst.currency)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Available balance indicator */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    {selectedTransferFund?.currency === 'USD' ? 'Disponible USD Actual' : 'Saldo Neto Disponible Actual'}
                  </span>
                  <p className={`text-base font-extrabold ${
                    selectedTransferFund?.currency === 'USD' ? 'text-amber-300' : 'text-emerald-400'
                  }`}>
                    {selectedTransferFund?.currency === 'USD'
                      ? formatCurrency(disponibleUSD, 'USD')
                      : formatMoney(saldoNetoDisponible, currencySymbol)}
                  </p>
                </div>
                <span className="text-[10px] text-slate-500">
                  Descuenta hoy
                </span>
              </div>

              {/* Amount to transfer */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Monto a Transferir
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold pointer-events-none">
                    {selectedTransferFund?.currency === 'USD' ? 'US$' : currencySymbol}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0"
                    value={transferAmountStr}
                    onChange={(e) => setTransferAmountStr(filterNumericInput(e.target.value))}
                    onKeyDown={handleNumericKeyDown}
                    className={`w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-extrabold tabular-nums ${
                      selectedTransferFund?.currency === 'USD' ? 'pl-14' : 'pl-9'
                    }`}
                    autoFocus
                  />
                </div>

                {/* Quick preset amount chips */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar py-0.5">
                  {(selectedTransferFund?.currency === 'USD' ? [10, 50, 100, 200] : [5000, 10000, 25000, 50000]).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTransferAmountStr(String(val))}
                      className="ios-active px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 flex-shrink-0"
                    >
                      +{selectedTransferFund?.currency === 'USD' ? `${val}` : val >= 1000 ? `${val / 1000}k` : val}
                    </button>
                  ))}
                  {currentAvailableForSelectedFund > 0 && (
                    <button
                      type="button"
                      onClick={() => setTransferAmountStr(String(Math.round(currentAvailableForSelectedFund)))}
                      className="ios-active px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex-shrink-0"
                    >
                      Todo el disponible
                    </button>
                  )}
                </div>
              </div>

              {/* Note / Detail */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Nota / Concepto del Movimiento (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Ahorro apartado del sueldo, excedente mensual..."
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!parseFloat(transferAmountStr.replace(/[^0-9.]/g, ''))}
                  className="ios-active w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-emerald-950 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar y Apartar al Ahorro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: NUEVO / EDITAR FONDO O PLAZO FIJO */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowAddModal(false)} />
          <div 
            className="relative w-full max-w-md bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl p-5 shadow-2xl z-10 max-h-[90vh] overflow-y-auto overscroll-contain pb-safe animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mb-3 sm:hidden" />
            
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-sm font-bold text-white tracking-tight">
                {editingInstrument 
                  ? `Editar ${editingInstrument.type === 'plazo_fijo' ? 'Plazo Fijo' : 'Fondo de Ahorro'}` 
                  : (formType === 'plazo_fijo' ? 'Nuevo Plazo Fijo' : 'Nuevo Fondo de Ahorro / Inversión')}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)} 
                className="ios-active p-1 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveInstrument} className="space-y-3.5 mt-3">
              {/* Currency Selector */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Moneda
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setFormCurrency('ARS')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition ${
                      formCurrency === 'ARS' 
                        ? 'bg-emerald-500 text-slate-950 shadow-sm' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ARS (Pesos)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCurrency('USD')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition ${
                      formCurrency === 'USD' 
                        ? 'bg-amber-400 text-slate-950 shadow-sm' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    USD (Dólares)
                  </button>
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Tipo de Instrumento
                </label>
                <select
                  value={formType}
                  onChange={(e) => {
                    const newType = e.target.value as SavingsType;
                    setFormType(newType);
                    if (newType === 'plazo_fijo' && !formName) {
                      setFormName('Plazo Fijo Tradicional (30 días)');
                    }
                  }}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="plazo_fijo">🏦 Plazo Fijo (Tradicional / Tasa Fija)</option>
                  <option value="emergency">🛡️ Fondo de Emergencia (Reserva)</option>
                  <option value="fixed_term">📱 Billetera / Rendimiento diario</option>
                  <option value="stocks">📈 Acciones / Cedears / ETFs</option>
                  <option value="crypto">🪙 Criptoactivos (BTC, USDT, etc.)</option>
                  <option value="cash_usd">💵 Dólares Colchón / Físicos</option>
                  <option value="real_estate">🏢 Inmuebles / Proyectos</option>
                  <option value="other">💼 Otro instrumento de ahorro</option>
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  {formType === 'plazo_fijo' ? 'Nombre o Banco del Plazo Fijo' : 'Nombre del Fondo o Cartera'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={formType === 'plazo_fijo' ? 'Ej: Plazo Fijo Banco Nación 30d' : 'Ej: Fondo de Emergencia, Cedears S&P 500, etc.'}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Current Balance / Capital */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  {formType === 'plazo_fijo' ? 'Capital Invertido' : 'Monto Actual Acumulado'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">
                    {formCurrency === 'USD' ? 'US$' : currencySymbol}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0"
                    value={formBalanceStr}
                    onChange={(e) => setFormBalanceStr(filterNumericInput(e.target.value))}
                    onKeyDown={handleNumericKeyDown}
                    className={`w-full bg-slate-950 border border-white/10 rounded-xl py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold tabular-nums ${
                      formCurrency === 'USD' ? 'pl-14' : 'pl-9'
                    }`}
                  />
                </div>
              </div>

              {/* Plazo Fijo Specific Fields: TNA, Term days, Start Date, Due Date */}
              {formType === 'plazo_fijo' && (
                <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs">
                    <Clock size={15} />
                    <span>Configuración del Plazo Fijo</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* TNA (%) */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                        TNA Estimada (%)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          required
                          placeholder="38.0"
                          value={formTnaStr}
                          onChange={(e) => setFormTnaStr(filterNumericInput(e.target.value))}
                          onKeyDown={handleNumericKeyDown}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-bold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                          %
                        </span>
                      </div>
                    </div>

                    {/* Plazo (Días) */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                        Plazo en Días
                      </label>
                      <select
                        value={formTermDaysStr}
                        onChange={(e) => handleTermDaysChange(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-bold"
                      >
                        <option value="30">30 días</option>
                        <option value="60">60 días</option>
                        <option value="90">90 días</option>
                        <option value="180">180 días</option>
                        <option value="365">365 días</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Start Date */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                        Fecha Constitución
                      </label>
                      <input
                        type="date"
                        value={formStartDateStr}
                        onChange={(e) => {
                          setFormStartDateStr(e.target.value);
                          const days = parseInt(formTermDaysStr, 10) || 30;
                          if (e.target.value) {
                            const d = new Date(e.target.value);
                            d.setDate(d.getDate() + days);
                            setFormDueDateStr(d.toISOString().split('T')[0]);
                          }
                        }}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    {/* Due Date */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                        Fecha Vencimiento
                      </label>
                      <input
                        type="date"
                        value={formDueDateStr}
                        onChange={(e) => setFormDueDateStr(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-bold text-cyan-300"
                      />
                    </div>
                  </div>

                  {/* Live Calculation Preview */}
                  {liveFormPfInterest.total > 0 && (
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/20 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Rendimiento Estimado:</span>
                        <span className="font-extrabold text-cyan-300">
                          +{formatCurrency(liveFormPfInterest.interest, formCurrency)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Total a Cobrar:</span>
                        <span className="font-black text-white">
                          {formatCurrency(liveFormPfInterest.total, formCurrency)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Target (Optional for regular savings) */}
              {formType !== 'plazo_fijo' && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Meta Objetivo (opcional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">
                      {formCurrency === 'USD' ? 'US$' : currencySymbol}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0 (sin meta específica)"
                      value={formTargetStr}
                      onChange={(e) => setFormTargetStr(filterNumericInput(e.target.value))}
                      onKeyDown={handleNumericKeyDown}
                      className={`w-full bg-slate-950 border border-white/10 rounded-xl py-2 text-xs text-white focus:outline-none focus:border-emerald-500 tabular-nums ${
                        formCurrency === 'USD' ? 'pl-14' : 'pl-9'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Notes / Yield */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Notas / Observaciones (opcional)
                </label>
                <input
                  type="text"
                  placeholder={formType === 'plazo_fijo' ? 'Ej: Acredita en cuenta sueldo, renovación automática...' : 'Ej: Tasa ~35% TNA en Mercado Pago, indexado a inflación...'}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="ios-active w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-emerald-950 transition"
                >
                  {editingInstrument ? 'Guardar Cambios' : (formType === 'plazo_fijo' ? 'Crear Plazo Fijo' : 'Crear Fondo')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: CONFIRMAR ELIMINACIÓN DE FONDO */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xs bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-2xl text-center space-y-3">
            <div className="w-11 h-11 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 size={20} />
            </div>
            <h4 className="text-sm font-bold text-white">¿Eliminar este fondo?</h4>
            <p className="text-xs text-slate-400">
              Se eliminará de tu lista de ahorro e inversiones. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="ios-active flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs border border-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteInstrument(deletingId);
                  setDeletingId(null);
                  showNotification('Fondo eliminado.');
                }}
                className="ios-active flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
