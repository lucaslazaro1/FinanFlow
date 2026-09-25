import React, { useState } from 'react';
import { useFinanceStore } from './hooks/useFinanceStore';
import { Header } from './components/Header';
import { BottomTabBar, TabId } from './components/BottomTabBar';
import { FloatingAddButton } from './components/FloatingAddButton';
import { TabToday } from './components/TabToday';
import { TabFixedExpenses } from './components/TabFixedExpenses';
import { TabCreditCards } from './components/TabCreditCards';
import { TabAnalysis } from './components/TabAnalysis';
import { TabSavings } from './components/TabSavings';
import { QuickExpenseModal } from './components/QuickExpenseModal';
import { QuickIncomeModal } from './components/QuickIncomeModal';
import { BackupSettingsModal } from './components/BackupSettingsModal';
import { IOSInstallGuideModal } from './components/IOSInstallGuideModal';
import { useSavingsStore } from './hooks/useSavingsStore';
import { getDaysUntilDate } from './utils/format';

export default function App() {
  const {
    data,
    calculations,
    currentPeriodKey,
    selectedPeriod,
    periodsIndex,
    isViewingHistory,
    switchPeriod,
    returnToCurrentPeriod,
    addExpense,
    deleteExpense,
    addIncome,
    deleteIncome,
    updateIncome,
    toggleFixedExpense,
    addFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
    resetNewMonth,
    updateCreditCard,
    updateCardMinPayment,
    addCreditCard,
    deleteCreditCard,
    recordCardPayment,
    deleteCardPayment,
    editCardPayment,
    setCardAmountPaidDirect,
    resetCardPayments,
    reconcileCard,
    addInstallmentPurchase,
    updateInstallmentPurchase,
    deleteInstallmentPurchase,
    advanceInstallmentPurchase,
    exportBackup,
    importBackup,
    resetToDefault,
    clearAll,
    startCleanSlate,
    setCurrencySymbol,
    setUsdInitialBalance,
    exchangeUsdToArs,
    privacyMode,
    togglePrivacyMode,
  } = useFinanceStore();

  const {
    instruments: savingsInstruments,
    totalSavingsARS,
    totalSavingsUSD,
    addInstrument: addSavingsInstrument,
    updateInstrument: updateSavingsInstrument,
    deleteInstrument: deleteSavingsInstrument,
    addToFundBalance: addSavingsFundBalance,
    subtractFromFundBalance: subtractSavingsFundBalance,
    clearAllSavings,
  } = useSavingsStore();

  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [isQuickIncomeOpen, setIsQuickIncomeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);

  // Check if any credit card has minimum payment unmet, or is due/overdue within <= 3 days with pending balance
  const hasCardAlert = data.creditCards.some(card => {
    const pendingARS = Math.max(0, card.statementBalance - card.amountPaid);
    const pendingUSD = Math.max(0, (card.statementBalanceUSD || 0) - (card.amountPaidUSD || 0));
    const minUnmet = card.statementBalance > 0 && card.amountPaid < card.minPayment;
    const daysUntilDue = getDaysUntilDate(card.dueDate, card.dueDay);
    const isDueAlert = (pendingARS > 0 || pendingUSD > 0) && daysUntilDue !== null && daysUntilDue <= 3;
    return minUnmet || isDueAlert;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Mobile iOS Header with Period Selector */}
      <Header
        currentPeriodKey={currentPeriodKey}
        selectedPeriod={selectedPeriod}
        periodsIndex={periodsIndex}
        isViewingHistory={isViewingHistory}
        onSelectPeriod={switchPeriod}
        onReturnToCurrentPeriod={returnToCurrentPeriod}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
        privacyMode={privacyMode}
        onTogglePrivacyMode={togglePrivacyMode}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 pt-4">
        {activeTab === 'today' && (
          <TabToday
            saldoNetoDisponible={calculations.saldoNetoDisponible}
            totalGastadoEfectivoMes={calculations.totalGastadoEfectivoMes}
            totalPendienteDePago={calculations.totalPendienteDePago}
            totalIncome={calculations.totalIncome}
            disponibleUSD={calculations.disponibleUSD}
            usdInitialBalance={data.usdInitialBalance || 0}
            suggestedDailyPace={calculations.suggestedDailyPace}
            daysRemaining={calculations.daysRemaining}
            isViewingHistory={isViewingHistory}
            selectedPeriod={selectedPeriod}
            onReturnToCurrentPeriod={returnToCurrentPeriod}
            expenses={data.expenses}
            creditCards={data.creditCards}
            installmentPurchases={data.installmentPurchases}
            incomes={data.incomes}
            fixedExpenses={data.fixedExpenses}
            currencySymbol={data.currencySymbol}
            onOpenQuickExpense={() => setIsQuickExpenseOpen(true)}
            onOpenQuickIncome={() => setIsQuickIncomeOpen(true)}
            onAddExpense={addExpense}
            onDeleteExpense={deleteExpense}
            onDeleteIncome={deleteIncome}
            onUpdateIncome={updateIncome}
            onExchangeUsdToArs={exchangeUsdToArs}
            onSetUsdInitialBalance={setUsdInitialBalance}
          />
        )}

        {activeTab === 'fixed' && (
          <TabFixedExpenses
            fixedExpenses={data.fixedExpenses}
            creditCards={data.creditCards}
            currencySymbol={data.currencySymbol}
            onToggleFixedExpense={toggleFixedExpense}
            onAddFixedExpense={addFixedExpense}
            onUpdateFixedExpense={updateFixedExpense}
            onDeleteFixedExpense={deleteFixedExpense}
            onResetNewMonth={resetNewMonth}
          />
        )}

        {activeTab === 'cards' && (
          <TabCreditCards
            creditCards={data.creditCards}
            trackedExpensesByCard={calculations.trackedCardExpensesByCard}
            trackedExpensesUSDByCard={calculations.trackedCardExpensesUSDByCard}
            installmentPurchases={data.installmentPurchases}
            currencySymbol={data.currencySymbol}
            selectedPeriod={selectedPeriod}
            onUpdateCard={updateCreditCard}
            onUpdateMinPayment={updateCardMinPayment}
            onAddCard={addCreditCard}
            onDeleteCard={deleteCreditCard}
            onRecordCardPayment={recordCardPayment}
            onDeleteCardPayment={deleteCardPayment}
            onEditCardPayment={editCardPayment}
            onSetCardAmountPaidDirect={setCardAmountPaidDirect}
            onResetCardPayments={resetCardPayments}
            onReconcileCard={reconcileCard}
            onAddInstallmentPurchase={addInstallmentPurchase}
            onUpdateInstallmentPurchase={updateInstallmentPurchase}
            onDeleteInstallmentPurchase={deleteInstallmentPurchase}
            onAdvanceInstallmentPurchase={advanceInstallmentPurchase}
          />
        )}

        {activeTab === 'savings' && (
          <TabSavings
            instruments={savingsInstruments}
            totalSavingsARS={totalSavingsARS}
            totalSavingsUSD={totalSavingsUSD}
            saldoNetoDisponible={calculations.saldoNetoDisponible}
            disponibleUSD={calculations.disponibleUSD}
            currencySymbol={data.currencySymbol}
            onAddInstrument={addSavingsInstrument}
            onUpdateInstrument={updateSavingsInstrument}
            onDeleteInstrument={deleteSavingsInstrument}
            onAddToFundBalance={addSavingsFundBalance}
            onSubtractFromFundBalance={subtractSavingsFundBalance}
            onAddExpense={addExpense}
            onAddIncome={addIncome}
          />
        )}

        {activeTab === 'analysis' && (
          <TabAnalysis
            expenses={data.expenses}
            fixedExpenses={data.fixedExpenses}
            creditCards={data.creditCards}
            totalIncome={calculations.totalIncome}
            saldoNetoDisponible={calculations.saldoNetoDisponible}
            totalGastadoEfectivoMes={calculations.totalGastadoEfectivoMes}
            totalPendienteDePago={calculations.totalPendienteDePago}
            currencySymbol={data.currencySymbol}
            selectedPeriod={selectedPeriod}
          />
        )}
      </main>

      {/* Floating Action Button (Zero friction, sub-5-second quick entry) */}
      <FloatingAddButton onClick={() => setIsQuickExpenseOpen(true)} />

      {/* iOS Bottom Tab Bar */}
      <BottomTabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenQuickExpense={() => setIsQuickExpenseOpen(true)}
        pendingFixedCount={calculations.totalFixedPending > 0 ? data.fixedExpenses.filter(f => !f.isPaid).length : 0}
        hasCardAlert={hasCardAlert}
      />

      {/* Quick 1-Tap Expense Modal */}
      <QuickExpenseModal
        isOpen={isQuickExpenseOpen}
        onClose={() => setIsQuickExpenseOpen(false)}
        onAddExpense={addExpense}
        onAddInstallmentPurchase={addInstallmentPurchase}
        creditCards={data.creditCards}
        currencySymbol={data.currencySymbol}
      />

      {/* Quick Income Modal */}
      <QuickIncomeModal
        isOpen={isQuickIncomeOpen}
        onClose={() => setIsQuickIncomeOpen(false)}
        onAddIncome={addIncome}
        currencySymbol={data.currencySymbol}
      />

      {/* Backup and Settings Modal */}
      <BackupSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currencySymbol={data.currencySymbol}
        onSetCurrency={setCurrencySymbol}
        onExportBackup={exportBackup}
        onImportBackup={importBackup}
        onResetToDefault={resetToDefault}
        onClearAll={clearAll}
        onStartCleanSlate={() => {
          startCleanSlate();
          clearAllSavings();
        }}
        onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
      />

      {/* iOS Safari Installation Guide Modal */}
      <IOSInstallGuideModal
        isOpen={isInstallGuideOpen}
        onClose={() => setIsInstallGuideOpen(false)}
      />
    </div>
  );
}
