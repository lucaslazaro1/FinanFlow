export type PaymentMethod = 'cash_debit' | 'credit_card';

export type CategoryId = 
  | 'supermercado'
  | 'salidas_comida'
  | 'combustible'
  | 'transporte'
  | 'farmacia'
  | 'servicios'
  | 'hogar'
  | 'ocio'
  | 'ropa'
  | 'otros';

export interface CategoryDef {
  id: CategoryId;
  label: string;
  iconName: string;
  color: string;
  bgLight: string;
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'supermercado', label: 'Supermercado', iconName: 'ShoppingCart', color: '#10b981', bgLight: 'rgba(16, 185, 129, 0.15)' },
  { id: 'salidas_comida', label: 'Almuerzos & Salidas', iconName: 'Utensils', color: '#f59e0b', bgLight: 'rgba(245, 158, 11, 0.15)' },
  { id: 'combustible', label: 'Combustible', iconName: 'Fuel', color: '#ef4444', bgLight: 'rgba(239, 68, 68, 0.15)' },
  { id: 'transporte', label: 'Transporte & Viajes', iconName: 'Car', color: '#3b82f6', bgLight: 'rgba(59, 130, 246, 0.15)' },
  { id: 'farmacia', label: 'Farmacia & Salud', iconName: 'HeartPulse', color: '#ec4899', bgLight: 'rgba(236, 72, 153, 0.15)' },
  { id: 'servicios', label: 'Luz / Gas / Wifi', iconName: 'Zap', color: '#8b5cf6', bgLight: 'rgba(139, 92, 246, 0.15)' },
  { id: 'hogar', label: 'Hogar & Compras', iconName: 'Home', color: '#06b6d4', bgLight: 'rgba(6, 182, 212, 0.15)' },
  { id: 'ocio', label: 'Ocio & Delivery', iconName: 'Film', color: '#f97316', bgLight: 'rgba(249, 115, 22, 0.15)' },
  { id: 'ropa', label: 'Ropa & Cuidado', iconName: 'ShoppingBag', color: '#a855f7', bgLight: 'rgba(168, 85, 247, 0.15)' },
  { id: 'otros', label: 'Otros Gastos', iconName: 'MoreHorizontal', color: '#64748b', bgLight: 'rgba(100, 116, 139, 0.15)' },
];

export type Currency = 'ARS' | 'USD';

export interface Expense {
  id: string;
  amount: number;
  category: CategoryId;
  paymentMethod: PaymentMethod;
  creditCardId?: string;
  note?: string;
  date: string; // ISO date string YYYY-MM-DD
  createdAt: number; // timestamp
  currency?: Currency; // 'ARS' (default) or 'USD'
  installmentInfo?: {
    current: number;
    total: number;
    installmentAmount: number;
    totalAmount?: number;
  };
  isSavingsTransfer?: boolean;
  savingsFundId?: string;
}

export interface Income {
  id: string;
  amount: number;
  source: string;
  note?: string;
  date: string; // ISO date string YYYY-MM-DD
  createdAt: number;
  currency?: Currency; // 'ARS' (default) or 'USD'
}

export interface FixedExpense {
  id: string;
  title: string;
  amount: number;
  dueDay: number; // 1 - 31
  isPaid: boolean;
  category: CategoryId;
  paidAt?: string; // ISO date
  currency?: Currency; // 'ARS' (default) or 'USD'
  paymentMethod?: PaymentMethod; // 'cash_debit' (default) or 'credit_card'
  creditCardId?: string; // ID de la tarjeta en caso de débito automático
}

export interface CardPayment {
  id: string;
  amount: number;
  date: string; // ISO date string YYYY-MM-DD
  note?: string;
  createdAt: number;
  expenseId?: string; // Optional reference to associated cash/debit expense
  deductedFromCash?: boolean;
  currency?: Currency; // 'ARS' (default) or 'USD'
}

export interface CreditCard {
  id: string;
  name: string;
  bankName: string;
  lastDigits: string;
  colorGradient: string; // Tailwind gradient or hex
  statementBalance: number; // Total a pagar según resumen bancario en ARS
  minPayment: number; // Pago mínimo
  dueDay: number; // Día de vencimiento del mes
  amountPaid: number; // Monto ya abonado este período en ARS
  closingDay?: number; // Día de cierre de tarjeta
  closingDate?: string; // Fecha exacta de cierre ISO (YYYY-MM-DD)
  dueDate?: string; // Fecha exacta de vencimiento ISO (YYYY-MM-DD)
  payments?: CardPayment[]; // Historial de pagos individuales
  statementBalanceUSD?: number; // Total a pagar según resumen bancario en USD
  amountPaidUSD?: number; // Monto ya abonado este período en USD
}

export interface InstallmentPurchase {
  id: string;
  creditCardId: string;
  description: string;
  totalAmount: number; // Monto total de la compra (ej. $120.000)
  installmentAmount: number; // Monto de cada cuota mensual (ej. $20.000)
  totalInstallments: number; // Total de cuotas (ej. 6)
  currentInstallment: number; // Cuota actual del período (ej. 1 de 6)
  category: CategoryId;
  currency: Currency; // 'ARS' | 'USD'
  createdAt: number;
  startPeriod?: string; // Período de inicio 'YYYY-MM'
}

export interface FinanceData {
  currencySymbol: string;
  incomes: Income[];
  expenses: Expense[];
  fixedExpenses: FixedExpense[];
  creditCards: CreditCard[];
  installmentPurchases?: InstallmentPurchase[];
  usdInitialBalance?: number; // Saldo base inicial en USD
  lastUpdated: number;
}

export type SavingsType = 
  | 'plazo_fijo' // Plazo Fijo Tradicional / UVA
  | 'emergency' // Fondo de Emergencia
  | 'fixed_term' // Billeteras / Rendimiento diario
  | 'stocks' // Acciones / Cedears / ETFs
  | 'crypto' // Criptoactivos
  | 'cash_usd' // Dólares billete / Colchón
  | 'real_estate' // Inmuebles / Proyectos
  | 'other'; // Otros ahorros

export interface SavingsInstrument {
  id: string;
  name: string;
  type: SavingsType;
  currency: Currency; // 'ARS' | 'USD'
  currentBalance: number; // Monto actual
  notes?: string; // Notas o rendimiento estimado
  targetAmount?: number; // Meta objetivo (opcional)
  // Campos específicos para Plazo Fijo:
  tna?: number; // Tasa Nominal Anual en % (ej. 38)
  startDate?: string; // Fecha de constitución (YYYY-MM-DD)
  dueDate?: string; // Fecha de vencimiento / acreditación (YYYY-MM-DD)
  termDays?: number; // Plazo en días (ej. 30, 60, 90)
  initialCapital?: number; // Capital inicial colocado
  createdAt: number;
  lastUpdated: number;
}

