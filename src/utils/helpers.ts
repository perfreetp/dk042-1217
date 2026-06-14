import dayjs from 'dayjs';
import type { ExpenseCategory, CategoryConfig, PaymentConfig, MoodConfig, TemplateConfig, TimeRangeType, TimeRange } from '@/types/expense';

export const CATEGORY_CONFIG: CategoryConfig[] = [
  { key: 'dining', label: '餐饮', color: '#F97316', icon: '🍜' },
  { key: 'transport', label: '交通', color: '#3B82F6', icon: '🚌' },
  { key: 'shopping', label: '购物', color: '#EC4899', icon: '🛍' },
  { key: 'subscription', label: '订阅', color: '#8B5CF6', icon: '📱' },
  { key: 'entertainment', label: '娱乐', color: '#F59E0B', icon: '🎮' },
  { key: 'medical', label: '医疗', color: '#14B8A6', icon: '💊' },
  { key: 'education', label: '教育', color: '#6366F1', icon: '📚' },
  { key: 'housing', label: '住房', color: '#64748B', icon: '🏠' },
  { key: 'other', label: '其他', color: '#94A3B8', icon: '📌' },
];

export const PAYMENT_CONFIG: PaymentConfig[] = [
  { key: 'wechat', label: '微信支付' },
  { key: 'alipay', label: '支付宝' },
  { key: 'cash', label: '现金' },
  { key: 'card', label: '银行卡' },
];

export const MOOD_CONFIG: MoodConfig[] = [
  { key: 'happy', label: '开心', color: '#FBBF24' },
  { key: 'calm', label: '平静', color: '#34D399' },
  { key: 'regret', label: '后悔', color: '#F87171' },
  { key: 'anxious', label: '焦虑', color: '#A78BFA' },
];

export const TEMPLATE_CONFIG: TemplateConfig[] = [
  { label: '早餐', category: 'dining', defaultAmount: 15, icon: '🌅' },
  { label: '午餐', category: 'dining', defaultAmount: 30, icon: '🍱' },
  { label: '晚餐', category: 'dining', defaultAmount: 40, icon: '🌙' },
  { label: '奶茶', category: 'dining', defaultAmount: 18, icon: '🧋' },
  { label: '地铁', category: 'transport', defaultAmount: 5, icon: '🚇' },
  { label: '打车', category: 'transport', defaultAmount: 25, icon: '🚕' },
  { label: '网购', category: 'shopping', defaultAmount: 100, icon: '📦' },
  { label: '视频会员', category: 'subscription', defaultAmount: 15, icon: '🎬' },
  { label: '音乐会员', category: 'subscription', defaultAmount: 10, icon: '🎵' },
  { label: '咖啡', category: 'dining', defaultAmount: 25, icon: '☕' },
];

export const getCategoryLabel = (key: ExpenseCategory): string => {
  return CATEGORY_CONFIG.find(c => c.key === key)?.label || '其他';
};

export const getCategoryColor = (key: ExpenseCategory): string => {
  return CATEGORY_CONFIG.find(c => c.key === key)?.color || '#94A3B8';
};

export const getCategoryIcon = (key: ExpenseCategory): string => {
  return CATEGORY_CONFIG.find(c => c.key === key)?.icon || '📌';
};

export const getPaymentLabel = (key: string): string => {
  return PAYMENT_CONFIG.find(p => p.key === key)?.label || key;
};

export const getMoodLabel = (key: string): string => {
  return MOOD_CONFIG.find(m => m.key === key)?.label || key;
};

export const getMoodColor = (key: string): string => {
  return MOOD_CONFIG.find(m => m.key === key)?.color || '#94A3B8';
};

export const formatAmount = (amount: number): string => {
  return amount.toFixed(2);
};

export const getHeatLevel = (amount: number, maxAmount: number): number => {
  if (amount === 0) return 0;
  if (maxAmount === 0) return 0;
  const ratio = amount / maxAmount;
  if (ratio <= 0.2) return 1;
  if (ratio <= 0.4) return 2;
  if (ratio <= 0.6) return 3;
  if (ratio <= 0.8) return 4;
  return 5;
};

export const getWeekRange = (date?: string): { start: string; end: string } => {
  const d = date ? dayjs(date) : dayjs();
  const dayOfWeek = d.day();
  const monday = d.subtract(dayOfWeek === 0 ? 6 : dayOfWeek - 1, 'day');
  const sunday = monday.add(6, 'day');
  return {
    start: monday.format('YYYY-MM-DD'),
    end: sunday.format('YYYY-MM-DD'),
  };
};

export const getMonthRange = (year?: number, month?: number): { start: string; end: string } => {
  const now = dayjs();
  const y = year ?? now.year();
  const m = month ?? now.month();
  const firstDay = dayjs(`${y}-${String(m + 1).padStart(2, '0')}-01`);
  const lastDay = firstDay.endOf('month');
  return {
    start: firstDay.format('YYYY-MM-DD'),
    end: lastDay.format('YYYY-MM-DD'),
  };
};

export const getTimeRange = (type: TimeRangeType): TimeRange => {
  const now = dayjs();
  switch (type) {
    case '7d':
      return {
        type,
        label: '近7天',
        start: now.subtract(6, 'day').format('YYYY-MM-DD'),
        end: now.format('YYYY-MM-DD'),
        days: 7,
      };
    case '30d':
      return {
        type,
        label: '近30天',
        start: now.subtract(29, 'day').format('YYYY-MM-DD'),
        end: now.format('YYYY-MM-DD'),
        days: 30,
      };
    case 'month':
      const { start, end } = getMonthRange();
      return {
        type,
        label: '本月',
        start,
        end,
        days: end.split('-')[2] ? parseInt(end.split('-')[2]) : 30,
      };
  }
};

export const getLastMonthRange = (): { start: string; end: string; year: number; month: number } => {
  const lastMonth = dayjs().subtract(1, 'month');
  const year = lastMonth.year();
  const month = lastMonth.month();
  const { start, end } = getMonthRange(year, month);
  return { start, end, year, month };
};

export const generateReviewQuestions = (): Array<{ question: string; type: 'reflection' | 'action' }> => {
  const questions = [
    { question: '这个月最大的非必要支出是什么？下次能避免吗？', type: 'reflection' as const },
    { question: '哪些冲动消费让你后悔了？是什么触发的？', type: 'reflection' as const },
    { question: '固定支出中有没有可以取消的订阅服务？', type: 'action' as const },
    { question: '餐饮支出是否偏高？可以尝试带饭或减少外食吗？', type: 'action' as const },
    { question: '交通费用有没有优化空间？能否选择更经济的出行方式？', type: 'action' as const },
    { question: '本月的消费和预算差距大吗？主要原因是什么？', type: 'reflection' as const },
    { question: '哪些消费让你感到物有所值？', type: 'reflection' as const },
    { question: '下个月想在哪方面减少开支？', type: 'action' as const },
  ];
  return questions.sort(() => Math.random() - 0.5).slice(0, 5);
};

export const getHourLabel = (hour: number): string => {
  if (hour >= 5 && hour < 10) return '早晨';
  if (hour >= 10 && hour < 14) return '上午';
  if (hour >= 14 && hour < 18) return '下午';
  if (hour >= 18 && hour < 22) return '晚间';
  return '深夜';
};

export const getWeekdayLabel = (day: number): string => {
  const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return labels[day];
};

export const getMonthRangeByDate = (dateStr: string): { start: string; end: string } => {
  const date = dayjs(dateStr);
  const start = date.startOf('month').format('YYYY-MM-DD');
  const end = date.endOf('month').format('YYYY-MM-DD');
  return { start, end };
};

export const getPaymentIcon = (method: string): string => {
  const icons: Record<string, string> = {
    wechat: '💚',
    alipay: '💙',
    cash: '💵',
    card: '💳',
  };
  return icons[method] || '💰';
};

export const getUniqueMerchants = (expenses: Array<{ merchant: string }>): string[] => {
  const set = new Set(expenses.map((e) => e.merchant).filter(Boolean));
  return Array.from(set);
};
