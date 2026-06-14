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

export type TimeRangeType = '7d' | '30d' | 'month';

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
  categoryBudgets: Partial<Record<ExpenseCategory, number>>;
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

export interface MonthlyComparison {
  currentTotal: number;
  lastTotal: number;
  diffAmount: number;
  diffPercentage: number;
  categories: Array<{
    category: ExpenseCategory;
    currentAmount: number;
    lastAmount: number;
    diffAmount: number;
    diffPercentage: number;
  }>;
}

export interface CategoryBudget {
  category: ExpenseCategory;
  budget: number;
  spent: number;
  percentage: number;
  isOver: boolean;
  isNear: boolean;
}

export interface HabitAnalysis {
  fixedExpenseRatio: number;
  impulseExpenseRatio: number;
  mostImpulsiveHour: number;
  mostImpulsiveMerchantTypes: ExpenseCategory[];
  weekdaySpending: Array<{ weekday: number; amount: number }>;
  mostExpensiveMerchant: { name: string; amount: number };
}

export interface ShareImageData {
  dateRange: string;
  total: number;
  dailyAvg: number;
  impulseCount: number;
  fixedRatio: number;
  topCategories: CategorySpending[];
  insight: string;
}

export interface TimeRange {
  type: TimeRangeType;
  label: string;
  start: string;
  end: string;
  days: number;
}
