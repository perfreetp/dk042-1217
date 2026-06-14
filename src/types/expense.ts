export type ExpenseCategory =
  | 'dining'
  | 'transport'
  | 'shopping'
  | 'subscription'
  | 'entertainment'
  | 'medical'
  | 'education'
  | 'housing'
  | 'other';

export type PaymentMethod = 'wechat' | 'alipay' | 'cash' | 'card';

export type MoodType = 'happy' | 'calm' | 'regret' | 'anxious';

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  merchant: string;
  mood: MoodType;
  isNecessary: boolean;
  isImpulse: boolean;
  isFixed: boolean;
  note: string;
  date: string;
  createdAt: string;
}

export interface CategoryConfig {
  key: ExpenseCategory;
  label: string;
  color: string;
  icon: string;
}

export interface PaymentConfig {
  key: PaymentMethod;
  label: string;
}

export interface MoodConfig {
  key: MoodType;
  label: string;
  color: string;
}

export interface TemplateConfig {
  label: string;
  category: ExpenseCategory;
  defaultAmount: number;
  icon: string;
}

export interface BudgetConfig {
  weeklyBudget: number;
}

export interface DailySpending {
  date: string;
  amount: number;
}

export interface CategorySpending {
  category: ExpenseCategory;
  amount: number;
  percentage: number;
  count: number;
}

export interface ReviewQuestion {
  question: string;
  type: 'reflection' | 'action';
}
