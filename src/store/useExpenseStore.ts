import { create } from 'zustand';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import type { Expense, ExpenseCategory, DailySpending, CategorySpending } from '@/types/expense';
import { mockExpenses } from '@/data/mockExpenses';
import { CATEGORY_CONFIG, getWeekRange } from '@/utils/helpers';

const STORAGE_KEY = 'light_expense_data';
const BUDGET_KEY = 'light_expense_budget';

interface ExpenseState {
  expenses: Expense[];
  weeklyBudget: number;
  initialized: boolean;

  initialize: () => void;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  deleteExpense: (id: string) => void;
  setWeeklyBudget: (amount: number) => void;
  saveToStorage: () => void;
}

const generateId = (): string => {
  return 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
};

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  weeklyBudget: 500,
  initialized: false,

  initialize: () => {
    try {
      const stored = Taro.getStorageSync(STORAGE_KEY);
      const storedBudget = Taro.getStorageSync(BUDGET_KEY);
      if (stored && Array.isArray(stored) && stored.length > 0) {
        set({ expenses: stored, initialized: true, weeklyBudget: storedBudget || 500 });
      } else {
        set({ expenses: mockExpenses, initialized: true, weeklyBudget: storedBudget || 500 });
        get().saveToStorage();
      }
    } catch (e) {
      console.error('[Store] Failed to initialize:', e);
      set({ expenses: mockExpenses, initialized: true });
    }
  },

  addExpense: (expense) => {
    const newExpense: Expense = {
      ...expense,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ expenses: [newExpense, ...state.expenses] }));
    get().saveToStorage();
  },

  deleteExpense: (id) => {
    set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }));
    get().saveToStorage();
  },

  setWeeklyBudget: (amount) => {
    set({ weeklyBudget: amount });
    try {
      Taro.setStorageSync(BUDGET_KEY, amount);
    } catch (e) {
      console.error('[Store] Failed to save budget:', e);
    }
  },

  saveToStorage: () => {
    try {
      Taro.setStorageSync(STORAGE_KEY, get().expenses);
    } catch (e) {
      console.error('[Store] Failed to save expenses:', e);
    }
  },
}));

export const getMonthlyExpenses = (year: number, month: number): Expense[] => {
  const expenses = useExpenseStore.getState().expenses;
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return expenses.filter((e) => e.date.startsWith(prefix));
};

export const getMonthlyTotal = (year: number, month: number): number => {
  return getMonthlyExpenses(year, month).reduce((sum, e) => sum + e.amount, 0);
};

export const getDailySpending = (year: number, month: number): DailySpending[] => {
  const expenses = getMonthlyExpenses(year, month);
  const daysInMonth = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).daysInMonth();
  const result: DailySpending[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayTotal = expenses
      .filter((e) => e.date === dateStr)
      .reduce((sum, e) => sum + e.amount, 0);
    result.push({ date: dateStr, amount: dayTotal });
  }
  return result;
};

export const getCategorySpending = (year: number, month: number): CategorySpending[] => {
  const expenses = getMonthlyExpenses(year, month);
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const categoryMap: Record<string, { amount: number; count: number }> = {};

  expenses.forEach((e) => {
    if (!categoryMap[e.category]) {
      categoryMap[e.category] = { amount: 0, count: 0 };
    }
    categoryMap[e.category].amount += e.amount;
    categoryMap[e.category].count += 1;
  });

  return Object.entries(categoryMap)
    .map(([category, data]) => ({
      category: category as ExpenseCategory,
      amount: data.amount,
      percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0,
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount);
};

export const getWeeklySpending = (): number => {
  const { start, end } = getWeekRange();
  const expenses = useExpenseStore.getState().expenses;
  return expenses
    .filter((e) => e.date >= start && e.date <= end)
    .reduce((sum, e) => sum + e.amount, 0);
};

export const getImpulseCount = (year: number, month: number): number => {
  return getMonthlyExpenses(year, month).filter((e) => e.isImpulse).length;
};

export const getFixedExpenses = (year: number, month: number): Expense[] => {
  return getMonthlyExpenses(year, month).filter((e) => e.isFixed);
};

export const getFixedTotal = (year: number, month: number): number => {
  return getFixedExpenses(year, month).reduce((sum, e) => sum + e.amount, 0);
};

export const searchExpenses = (keyword: string): Expense[] => {
  const expenses = useExpenseStore.getState().expenses;
  if (!keyword.trim()) return expenses;
  const lower = keyword.toLowerCase();
  return expenses.filter(
    (e) =>
      e.note.toLowerCase().includes(lower) ||
      e.merchant.toLowerCase().includes(lower) ||
      CATEGORY_CONFIG.find((c) => c.key === e.category)?.label.includes(keyword)
  );
};

export const generateMonthlySummary = (year: number, month: number): string => {
  const total = getMonthlyTotal(year, month);
  const expenses = getMonthlyExpenses(year, month);
  const daysInMonth = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).daysInMonth();
  const dailyAvg = Math.round(total / daysInMonth);
  const categorySpend = getCategorySpending(year, month);
  const impulseCount = getImpulseCount(year, month);
  const fixedTotal = getFixedTotal(year, month);
  const impulseTotal = expenses.filter((e) => e.isImpulse).reduce((sum, e) => sum + e.amount, 0);
  const necessaryTotal = expenses.filter((e) => e.isNecessary).reduce((sum, e) => sum + e.amount, 0);

  let summary = `📋 ${year}年${month}月消费摘要\n`;
  summary += `━━━━━━━━━━━━━━━\n`;
  summary += `💰 总支出：¥${total.toFixed(2)}\n`;
  summary += `📊 日均消费：¥${dailyAvg.toFixed(2)}\n`;
  summary += `🎯 必要支出：¥${necessaryTotal.toFixed(2)}\n`;
  summary += `💥 冲动消费：${impulseCount}笔 / ¥${impulseTotal.toFixed(2)}\n`;
  summary += `📌 固定支出：¥${fixedTotal.toFixed(2)}\n\n`;
  summary += `📂 分类明细：\n`;
  categorySpend.forEach((c) => {
    const label = CATEGORY_CONFIG.find((cat) => cat.key === c.category)?.label || c.category;
    summary += `  ${label}：¥${c.amount.toFixed(2)} (${c.percentage}%)\n`;
  });

  return summary;
};
