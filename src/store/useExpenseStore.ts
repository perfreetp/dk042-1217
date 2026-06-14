import { create } from 'zustand';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import type {
  Expense,
  ExpenseCategory,
  DailySpending,
  CategorySpending,
  MonthlyComparison,
  CategoryBudget,
  HabitAnalysis,
  TimeRangeType,
  ShareImageData,
} from '@/types/expense';
import { mockExpenses } from '@/data/mockExpenses';
import {
  CATEGORY_CONFIG,
  getWeekRange,
  getTimeRange,
  getLastMonthRange,
  getMonthRange,
  formatAmount,
} from '@/utils/helpers';

const STORAGE_KEY = 'light_expense_data';
const BUDGET_KEY = 'light_expense_budget';
const CATEGORY_BUDGET_KEY = 'light_expense_category_budget';

interface ExpenseState {
  expenses: Expense[];
  weeklyBudget: number;
  categoryBudgets: Partial<Record<ExpenseCategory, number>>;
  initialized: boolean;

  initialize: () => void;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  deleteExpense: (id: string) => void;
  setWeeklyBudget: (amount: number) => void;
  setCategoryBudget: (category: ExpenseCategory, amount: number) => void;
  saveToStorage: () => void;
}

const generateId = (): string => {
  return 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
};

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  weeklyBudget: 500,
  categoryBudgets: {},
  initialized: false,

  initialize: () => {
    try {
      const stored = Taro.getStorageSync(STORAGE_KEY);
      const storedBudget = Taro.getStorageSync(BUDGET_KEY);
      const storedCatBudgets = Taro.getStorageSync(CATEGORY_BUDGET_KEY);
      if (stored && Array.isArray(stored) && stored.length > 0) {
        set({
          expenses: stored,
          initialized: true,
          weeklyBudget: storedBudget || 500,
          categoryBudgets: storedCatBudgets || {},
        });
      } else {
        set({
          expenses: mockExpenses,
          initialized: true,
          weeklyBudget: storedBudget || 500,
          categoryBudgets: storedCatBudgets || { dining: 1000, shopping: 500, entertainment: 300 },
        });
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

  setCategoryBudget: (category, amount) => {
    set((state) => ({
      categoryBudgets: {
        ...state.categoryBudgets,
        [category]: amount,
      },
    }));
    try {
      Taro.setStorageSync(CATEGORY_BUDGET_KEY, get().categoryBudgets);
    } catch (e) {
      console.error('[Store] Failed to save category budget:', e);
    }
  },

  saveToStorage: () => {
    try {
      Taro.setStorageSync(STORAGE_KEY, get().expenses);
      Taro.setStorageSync(CATEGORY_BUDGET_KEY, get().categoryBudgets);
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

export const getExpensesByDateRange = (start: string, end: string): Expense[] => {
  const expenses = useExpenseStore.getState().expenses;
  return expenses.filter((e) => e.date >= start && e.date <= end);
};

export const getTotalByDateRange = (start: string, end: string): number => {
  return getExpensesByDateRange(start, end).reduce((sum, e) => sum + e.amount, 0);
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

export const getDailySpendingByRange = (start: string, end: string): DailySpending[] => {
  const expenses = getExpensesByDateRange(start, end);
  const startDate = dayjs(start);
  const endDate = dayjs(end);
  const days = endDate.diff(startDate, 'day') + 1;
  const result: DailySpending[] = [];
  for (let i = 0; i < days; i++) {
    const dateStr = startDate.add(i, 'day').format('YYYY-MM-DD');
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

export const getCategorySpendingByRange = (start: string, end: string): CategorySpending[] => {
  const expenses = getExpensesByDateRange(start, end);
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

export const getMonthlyComparison = (): MonthlyComparison => {
  const now = dayjs();
  const currentYear = now.year();
  const currentMonth = now.month() + 1;
  const lastMonth = now.subtract(1, 'month');
  const lastYear = lastMonth.year();
  const lastMonthNum = lastMonth.month() + 1;

  const currentTotal = getMonthlyTotal(currentYear, currentMonth);
  const lastTotal = getMonthlyTotal(lastYear, lastMonthNum);
  const diffAmount = currentTotal - lastTotal;
  const diffPercentage = lastTotal > 0 ? Math.round((diffAmount / lastTotal) * 100) : 0;

  const currentCategories = getCategorySpending(currentYear, currentMonth);
  const lastCategories = getCategorySpending(lastYear, lastMonthNum);

  const mainCategories: ExpenseCategory[] = ['dining', 'transport', 'shopping', 'entertainment', 'housing'];
  const categories = mainCategories.map((cat) => {
    const curr = currentCategories.find((c) => c.category === cat)?.amount || 0;
    const last = lastCategories.find((c) => c.category === cat)?.amount || 0;
    return {
      category: cat,
      currentAmount: curr,
      lastAmount: last,
      diffAmount: curr - last,
      diffPercentage: last > 0 ? Math.round(((curr - last) / last) * 100) : 0,
    };
  });

  return {
    currentTotal,
    lastTotal,
    diffAmount,
    diffPercentage,
    categories,
  };
};

export const getCategoryBudgetsStatus = (): CategoryBudget[] => {
  const { categoryBudgets, expenses } = useExpenseStore.getState();
  const { start, end } = getWeekRange();

  return CATEGORY_CONFIG
    .filter((cat) => categoryBudgets[cat.key])
    .map((cat) => {
      const budget = categoryBudgets[cat.key] || 0;
      const spent = expenses
        .filter((e) => e.date >= start && e.date <= end && e.category === cat.key)
        .reduce((sum, e) => sum + e.amount, 0);
      const percentage = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 999) : 0;
      return {
        category: cat.key,
        budget,
        spent,
        percentage,
        isOver: spent > budget,
        isNear: percentage >= 80 && spent <= budget,
      };
    })
    .sort((a, b) => b.percentage - a.percentage);
};

export const getHabitAnalysis = (year: number, month: number): HabitAnalysis => {
  const expenses = getMonthlyExpenses(year, month);
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const fixedTotal = expenses.filter((e) => e.isFixed).reduce((sum, e) => sum + e.amount, 0);
  const impulseTotal = expenses.filter((e) => e.isImpulse).reduce((sum, e) => sum + e.amount, 0);

  const impulseExpenses = expenses.filter((e) => e.isImpulse);
  const hourCounts: Record<number, number> = {};
  const categoryCounts: Record<string, number> = {};

  impulseExpenses.forEach((e) => {
    try {
      const hour = new Date(e.createdAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    } catch (err) {
      console.error('[Store] Failed to parse hour:', err);
    }
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
  });

  const mostImpulsiveHour = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ? parseInt(Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0][0]) : 12;

  const mostImpulsiveMerchantTypes = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat as ExpenseCategory);

  const weekdayMap: Record<number, { total: number; count: number }> = {};
  for (let i = 0; i < 7; i++) weekdayMap[i] = { total: 0, count: 0 };

  expenses.forEach((e) => {
    try {
      const day = new Date(e.date).getDay();
      weekdayMap[day].total += e.amount;
      weekdayMap[day].count += 1;
    } catch (err) {
      console.error('[Store] Failed to parse weekday:', err);
    }
  });

  const weekdaySpending = Object.entries(weekdayMap).map(([day, data]) => ({
    weekday: parseInt(day),
    amount: data.count > 0 ? Math.round(data.total / data.count) : 0,
  }));

  const merchantMap: Record<string, { total: number; count: number }> = {};
  expenses.forEach((e) => {
    if (!merchantMap[e.merchant]) {
      merchantMap[e.merchant] = { total: 0, count: 0 };
    }
    merchantMap[e.merchant].total += e.amount;
    merchantMap[e.merchant].count += 1;
  });

  const mostExpensiveMerchantEntry = Object.entries(merchantMap).sort((a, b) => b[1].total - a[1].total)[0];
  const mostExpensiveMerchant = mostExpensiveMerchantEntry
    ? { name: mostExpensiveMerchantEntry[0], amount: mostExpensiveMerchantEntry[1].total }
    : { name: '', amount: 0 };

  return {
    fixedExpenseRatio: total > 0 ? Math.round((fixedTotal / total) * 100) : 0,
    impulseExpenseRatio: total > 0 ? Math.round((impulseTotal / total) * 100) : 0,
    mostImpulsiveHour,
    mostImpulsiveMerchantTypes,
    weekdaySpending,
    mostExpensiveMerchant,
  };
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

export const generateShareImageData = (year?: number, month?: number): ShareImageData => {
  const now = dayjs();
  const y = year ?? now.year();
  const m = month ?? now.month() + 1;

  const total = getMonthlyTotal(y, m);
  const expenses = getMonthlyExpenses(y, m);
  const daysInMonth = dayjs(`${y}-${String(m).padStart(2, '0')}-01`).daysInMonth();
  const dailyAvg = Math.round(total / daysInMonth);
  const categorySpend = getCategorySpending(y, m).slice(0, 5);
  const impulseCount = getImpulseCount(y, m);
  const fixedTotal = getFixedTotal(y, m);
  const habit = getHabitAnalysis(y, m);
  const comparison = getMonthlyComparison();

  const insightLines: string[] = [];
  if (comparison.diffAmount > 0) {
    insightLines.push(`本月较上月多花了 ${comparison.diffPercentage}%，主要花在${comparison.categories.filter(c => c.diffAmount > 0).slice(0, 2).map(c => getCategoryLabel(c.category)).join('、')}上`);
  } else if (comparison.diffAmount < 0) {
    insightLines.push(`本月较上月节省了 ${Math.abs(comparison.diffPercentage)}%，控制得不错！`);
  }
  if (habit.impulseExpenseRatio > 20) {
    insightLines.push(`冲动消费占比 ${habit.impulseExpenseRatio}%，建议在${getHourLabel(habit.mostImpulsiveHour)}点左右多克制一下`);
  }
  if (insightLines.length === 0) {
    insightLines.push('本月消费结构平稳，继续保持良好的记账习惯吧！');
  }

  return {
    dateRange: `${y}年${m}月`,
    total,
    dailyAvg,
    impulseCount,
    fixedRatio: habit.fixedExpenseRatio,
    topCategories: categorySpend,
    insight: insightLines.join('；'),
  };
};
