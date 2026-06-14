import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import classnames from 'classnames';
import type { ExpenseCategory, BudgetPeriodType } from '@/types/expense';
import {
  useExpenseStore,
  getExpensesByDateRange,
  getCategoryBudgetsStatusByPeriod,
  getTotalBudgetByPeriod,
} from '@/store/useExpenseStore';
import {
  getWeekRange,
  getMonthRange,
  formatAmount,
  getCategoryIcon,
  getCategoryLabel,
} from '@/utils/helpers';
import { CATEGORY_CONFIG } from '@/utils/helpers';
import styles from './index.module.scss';

const PERIODS: Array<{ type: BudgetPeriodType; label: string }> = [
  { type: 'week', label: '按周' },
  { type: 'month', label: '按月' },
];

const BudgetPage: React.FC = () => {
  const expenses = useExpenseStore((s) => s.expenses);
  const weeklyBudget = useExpenseStore((s) => s.weeklyBudget);
  const monthlyBudget = useExpenseStore((s) => s.monthlyBudget);
  const categoryBudgets = useExpenseStore((s) => s.categoryBudgets);
  const categoryMonthlyBudgets = useExpenseStore((s) => s.categoryMonthlyBudgets);
  const setWeeklyBudget = useExpenseStore((s) => s.setWeeklyBudget);
  const setMonthlyBudget = useExpenseStore((s) => s.setMonthlyBudget);
  const setCategoryBudget = useExpenseStore((s) => s.setCategoryBudget);
  const setCategoryMonthlyBudget = useExpenseStore((s) => s.setCategoryMonthlyBudget);
  const initialize = useExpenseStore((s) => s.initialize);

  const [period, setPeriod] = useState<BudgetPeriodType>('week');
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [categoryBudgetInput, setCategoryBudgetInput] = useState('');

  useEffect(() => {
    initialize();
  }, []);

  const currentRange = useMemo(() => {
    return period === 'week' ? getWeekRange() : getMonthRange();
  }, [period]);

  const totalBudgetStatus = useMemo(
    () => getTotalBudgetByPeriod(period),
    [expenses, period, weeklyBudget, monthlyBudget]
  );

  const categoryBudgetStatus = useMemo(
    () => getCategoryBudgetsStatusByPeriod(period),
    [expenses, period, categoryBudgets, categoryMonthlyBudgets]
  );

  const { budget, spent, remain, percentage, isOver, isNear } = totalBudgetStatus;

  const periodDaySpending = useMemo(() => {
    const { start, end } = currentRange;
    const days: Array<{ date: string; day: string; amount: number }> = [];
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    const startDate = dayjs(start);
    const endDate = dayjs(end);
    const diffDays = endDate.diff(startDate, 'day') + 1;
    const displayDays = Math.min(diffDays, period === 'week' ? 7 : 15);

    for (let i = 0; i < displayDays; i++) {
      const date = startDate.add(i, 'day');
      const dateStr = date.format('YYYY-MM-DD');
      const dayTotal = expenses
        .filter((e) => e.date === dateStr)
        .reduce((sum, e) => sum + e.amount, 0);

      if (period === 'week') {
        days.push({
          date: dateStr,
          day: dayNames[date.day()],
          amount: dayTotal,
        });
      } else {
        days.push({
          date: dateStr,
          day: date.format('DD'),
          amount: dayTotal,
        });
      }
    }
    return days;
  }, [expenses, currentRange, period]);

  const maxDaySpend = Math.max(...periodDaySpending.map((d) => d.amount), 1);

  const alerts = useMemo(() => {
    const items: Array<{ title: string; desc: string; type: 'red' | 'orange' | 'green' }> = [];
    const periodLabel = period === 'week' ? '本周' : '本月';

    if (isOver) {
      items.push({
        title: `⚠️ ${periodLabel}已超预算`,
        desc: `已超出 ¥${formatAmount(spent - budget)}`,
        type: 'red',
      });
    } else if (isNear) {
      items.push({
        title: `⚡ ${periodLabel}预算即将用完`,
        desc: `仅剩余 ¥${formatAmount(remain)}`,
        type: 'orange',
      });
    } else {
      items.push({
        title: `✅ ${periodLabel}预算充足`,
        desc: `还剩余 ¥${formatAmount(remain)}`,
        type: 'green',
      });
    }

    categoryBudgetStatus.forEach((status) => {
      if (status.isOver) {
        items.push({
          title: `⚠️ ${getCategoryIcon(status.category)} ${getCategoryLabel(status.category)}预算超额`,
          desc: `已超出 ¥${formatAmount(status.spent - status.budget)}`,
          type: 'red',
        });
      } else if (status.isNear && status.budget > 0) {
        items.push({
          title: `⚡ ${getCategoryIcon(status.category)} ${getCategoryLabel(status.category)}预算即将用完`,
          desc: `仅剩余 ¥${formatAmount(status.remain)}`,
          type: 'orange',
        });
      }
    });

    const impulseInPeriod = expenses.filter((e) => {
      const { start, end } = currentRange;
      return e.date >= start && e.date <= end && e.isImpulse;
    });
    if (impulseInPeriod.length > 0) {
      const impulseTotal = impulseInPeriod.reduce((sum, e) => sum + e.amount, 0);
      items.push({
        title: `💥 ${periodLabel}冲动消费 ${impulseInPeriod.length} 笔`,
        desc: `共 ¥${formatAmount(impulseTotal)}`,
        type: 'orange',
      });
    }

    return items;
  }, [expenses, budget, spent, isOver, isNear, remain, categoryBudgetStatus, currentRange, period]);

  const progressFillClass = isOver
    ? styles.progressFillRed
    : isNear
    ? styles.progressFillOrange
    : styles.progressFillGreen;

  const handleOpenSetBudget = () => {
    const currentBudget = period === 'week' ? weeklyBudget : monthlyBudget;
    setBudgetInput(String(currentBudget));
    setShowModal(true);
  };

  const handleSetBudget = () => {
    const val = parseFloat(budgetInput);
    if (!val || val <= 0) {
      Taro.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }
    if (period === 'week') {
      setWeeklyBudget(val);
    } else {
      setMonthlyBudget(val);
    }
    setShowModal(false);
    Taro.showToast({ title: '设置成功', icon: 'success' });
  };

  const handleOpenCategoryModal = (category: ExpenseCategory) => {
    setEditingCategory(category);
    const currentBudget =
      period === 'week' ? categoryBudgets[category] : categoryMonthlyBudgets[category];
    setCategoryBudgetInput(String(currentBudget || ''));
    setShowCategoryModal(true);
  };

  const handleSetCategoryBudget = () => {
    if (!editingCategory) return;
    const val = parseFloat(categoryBudgetInput) || 0;
    if (val < 0) {
      Taro.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }
    if (period === 'week') {
      setCategoryBudget(editingCategory, val);
    } else {
      setCategoryMonthlyBudget(editingCategory, val);
    }
    setShowCategoryModal(false);
    Taro.showToast({ title: '设置成功', icon: 'success' });
  };

  const getCategoryProgressClass = (status: typeof categoryBudgetStatus[0]) => {
    if (status.isOver) return styles.catProgressFillRed;
    if (status.isNear) return styles.catProgressFillOrange;
    return styles.catProgressFillGreen;
  };

  const availableCategories = useMemo(() => {
    return Object.keys(CATEGORY_CONFIG) as ExpenseCategory[];
  }, []);

  const currentCategoryBudgets = period === 'week' ? categoryBudgets : categoryMonthlyBudgets;

  return (
    <View className={styles.container}>
      <View className={styles.periodTabs}>
        {PERIODS.map((p) => (
          <View
            key={p.type}
            className={classnames(styles.periodTab, period === p.type && styles.periodTabActive)}
            onClick={() => setPeriod(p.type)}
          >
            <Text
              className={classnames(
                styles.periodTabText,
                period === p.type && styles.periodTabTextActive
              )}
            >
              {p.label}
            </Text>
          </View>
        ))}
      </View>

      <View className={styles.budgetCard}>
        <View className={styles.budgetHeader}>
          <Text className={styles.budgetTitle}>
            {period === 'week' ? '周预算' : '月预算'}
          </Text>
          <View className={styles.budgetSetBtn} onClick={handleOpenSetBudget}>
            <Text className={styles.budgetSetText}>设置预算</Text>
          </View>
        </View>
        <View className={styles.progressWrap}>
          <View className={styles.progressBg}>
            <View
              className={classnames(styles.progressFill, progressFillClass)}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            >
              {percentage > 15 && <Text className={styles.progressPercent}>{percentage}%</Text>}
            </View>
          </View>
        </View>
        <View className={styles.budgetInfo}>
          <Text className={styles.budgetSpent}>
            已消费 <Text className={styles.budgetSpentAmount}>¥{formatAmount(spent)}</Text>
          </Text>
          <Text className={styles.budgetRemain}>
            剩余{' '}
            <Text
              className={classnames(
                styles.budgetRemainAmount,
                remain >= 0 ? styles.budgetRemainPositive : styles.budgetRemainNegative
              )}
            >
              ¥{formatAmount(Math.abs(remain))}
            </Text>
          </Text>
        </View>
      </View>

      <Text className={styles.sectionTitle}>分类预算</Text>
      <View className={styles.catBudgetCard}>
        {categoryBudgetStatus.map((status) => (
          <View
            key={status.category}
            className={styles.catBudgetItem}
            onClick={() => handleOpenCategoryModal(status.category)}
          >
            <View className={styles.catBudgetHeader}>
              <View className={styles.catBudgetLeft}>
                <Text className={styles.catBudgetIcon}>
                  {getCategoryIcon(status.category)}
                </Text>
                <Text className={styles.catBudgetLabel}>
                  {getCategoryLabel(status.category)}
                </Text>
              </View>
              <View className={styles.catBudgetRight}>
                <Text className={styles.catBudgetSpent}>
                  ¥{formatAmount(status.spent)}
                </Text>
                <Text className={styles.catBudgetTotal}>
                  / ¥{formatAmount(status.budget || 0)}
                </Text>
              </View>
            </View>
            <View className={styles.catProgressWrap}>
              <View className={styles.catProgressBg}>
                <View
                  className={classnames(
                    styles.catProgressFill,
                    getCategoryProgressClass(status)
                  )}
                  style={{ width: `${Math.min(status.percentage, 100)}%` }}
                />
              </View>
              <Text className={styles.catProgressText}>
                {status.percentage}%
              </Text>
            </View>
            {status.isOver && (
              <Text className={styles.catBudgetOverText}>
                已超额 ¥{formatAmount(status.spent - status.budget)}
              </Text>
            )}
          </View>
        ))}
        {availableCategories
          .filter((c) => !currentCategoryBudgets[c])
          .slice(0, 2)
          .map((category) => (
            <View
              key={`add-${category}`}
              className={classnames(styles.catBudgetItem, styles.catBudgetItemAdd)}
              onClick={() => handleOpenCategoryModal(category)}
            >
              <View className={styles.catBudgetAdd}>
                <Text className={styles.catBudgetAddIcon}>+</Text>
                <Text className={styles.catBudgetAddText}>
                  为{getCategoryLabel(category)}设置{period === 'week' ? '周' : '月'}预算
                </Text>
              </View>
            </View>
          ))}
      </View>

      <Text className={styles.sectionTitle}>预算提醒</Text>
      <View className={styles.alertCard}>
        {alerts.map((alert, index) => (
          <View key={index} className={styles.alertItem}>
            <View
              className={classnames(
                styles.alertDot,
                alert.type === 'red'
                  ? styles.alertDotRed
                  : alert.type === 'orange'
                  ? styles.alertDotOrange
                  : styles.alertDotGreen
              )}
            />
            <View className={styles.alertContent}>
              <Text className={styles.alertTitle}>{alert.title}</Text>
              <Text className={styles.alertDesc}>{alert.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text className={styles.sectionTitle}>
        {period === 'week' ? '本周' : '本月'}每日消费
      </Text>
      <View className={styles.weekCard}>
        <View className={styles.weekHeader}>
          <Text className={styles.weekLabel}>
            {currentRange.start} ~ {currentRange.end}
          </Text>
          <Text className={styles.weekAmount}>¥{formatAmount(spent)}</Text>
        </View>
        <View className={styles.weekDays}>
          {periodDaySpending.map((d, index) => {
            const barHeight =
              maxDaySpend > 0
                ? Math.max((d.amount / maxDaySpend) * 120, 8)
                : 8;
            return (
              <View key={d.date} className={styles.weekDayItem}>
                <Text className={styles.weekDayAmount}>
                  {d.amount > 0 ? `¥${Math.round(d.amount)}` : ''}
                </Text>
                <View
                  className={styles.weekDayBar}
                  style={{ height: `${barHeight}rpx` }}
                />
                <Text className={styles.weekDayName}>
                  {period === 'week' ? `周${d.day}` : d.day}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {showModal && (
        <View className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>
              设置{period === 'week' ? '周' : '月'}预算
            </Text>
            <Input
              className={styles.modalInput}
              type="digit"
              placeholder={`输入${period === 'week' ? '周' : '月'}预算金额`}
              value={budgetInput}
              onInput={(e) => setBudgetInput(e.detail.value)}
            />
            <View className={styles.modalBtns}>
              <View className={styles.modalCancel} onClick={() => setShowModal(false)}>
                <Text className={styles.modalCancelText}>取消</Text>
              </View>
              <View className={styles.modalConfirm} onClick={handleSetBudget}>
                <Text className={styles.modalConfirmText}>确认</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {showCategoryModal && editingCategory && (
        <View
          className={styles.modalOverlay}
          onClick={() => setShowCategoryModal(false)}
        >
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalCategoryHeader}>
              <Text className={styles.modalCategoryIcon}>
                {getCategoryIcon(editingCategory)}
              </Text>
              <Text className={styles.modalTitle}>
                {getCategoryLabel(editingCategory)}
                {period === 'week' ? '周' : '月'}预算
              </Text>
            </View>
            <Input
              className={styles.modalInput}
              type="digit"
              placeholder="输入0取消该分类预算"
              value={categoryBudgetInput}
              onInput={(e) => setCategoryBudgetInput(e.detail.value)}
            />
            <Text className={styles.modalHint}>
              设置0表示不限制该分类
            </Text>
            <View className={styles.modalBtns}>
              <View
                className={styles.modalCancel}
                onClick={() => setShowCategoryModal(false)}
              >
                <Text className={styles.modalCancelText}>取消</Text>
              </View>
              <View
                className={styles.modalConfirm}
                onClick={handleSetCategoryBudget}
              >
                <Text className={styles.modalConfirmText}>确认</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default BudgetPage;
