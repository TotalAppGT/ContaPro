export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'tenant_admin' | 'accountant' | 'client';
  tenant_id: string;
  tenant_name: string;
  plan: PlanType;
}

export interface Tenant {
  id: string;
  nit: string;
  name: string;
  legal_name: string;
  subdomain: string;
  email: string;
  phone: string;
  address: string;
  regime: RegimeType;
  plan: PlanType;
  status: 'active' | 'suspended' | 'cancelled' | 'trial';
  created_at: string;
  subscription_expires: string;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan: PlanType;
  status: 'active' | 'past_due' | 'cancelled' | 'trial';
  current_period_start: string;
  current_period_end: string;
  canceled_at: string | null;
}

export interface Plan {
  id: string;
  name: PlanType;
  description: string;
  price: number;
  max_clients: number;
  features: string[];
}

export type PlanType = 'personal' | 'professional' | 'enterprise';
export type RegimeType = 'general' | 'pequenio' | 'simplificado';
export type PolicyType = 'Diario' | 'Ajuste' | 'Ingreso' | 'Egreso';
export type AccountType = 'Activo' | 'Pasivo' | 'Capital' | 'Ingreso' | 'Egreso' | 'Costo';

export interface ChartAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parent_id: string | null;
  level: number;
  is_accept_movement: boolean;
  balance: number;
}

export interface JournalEntry {
  id: string;
  number: number;
  date: string;
  type: PolicyType;
  concept: string;
  total_debit: number;
  total_credit: number;
  is_approved: boolean;
  lines: JournalEntryLine[];
  created_at: string;
}

export interface JournalEntryLine {
  id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  concept: string;
  debit: number;
  credit: number;
}

export interface SaleEntry {
  id: string;
  document_type: string;
  series: string;
  number: string;
  date: string;
  nit: string;
  client_name: string;
  taxable_amount: number;
  exempt_amount: number;
  iva: number;
  total: number;
  is_exported: boolean;
  created_at: string;
}

export interface PurchaseEntry {
  id: string;
  document_type: string;
  series: string;
  number: string;
  date: string;
  nit: string;
  supplier_name: string;
  taxable_amount: number;
  exempt_amount: number;
  iva: number;
  total: number;
  is_exported: boolean;
  created_at: string;
}

export interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  initial_balance: number;
  current_balance: number;
  currency: string;
}

export interface BankTransaction {
  id: string;
  bank_account_id: string;
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  is_reconciled: boolean;
  reconciled_at: string | null;
}

export interface FinancialReport {
  income: number;
  expenses: number;
  profit: number;
  margin: number;
  iva_to_pay: number;
  period: string;
}

export interface SAT2237Report {
  nit: string;
  company_name: string;
  period: string;
  regime: RegimeType;
  total_income: number;
  total_expenses: number;
  taxable_profit: number;
  isr_determined: number;
  iva_credits: number;
  iva_debits: number;
}

export interface IVACruceReport {
  period: string;
  sales_iva: number;
  purchases_iva: number;
  difference: number;
  variation: number;
}

export interface TaxConfig {
  iva_rate: number;
  isr_rate: number;
  regimen_small_rate: number;
  monthly_close_day: number;
}
