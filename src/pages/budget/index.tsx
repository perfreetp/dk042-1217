import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import classnames from 'classnames';
import type { ExpenseCategory } from '@/types/expense';
import {
  useExpenseStore,
  getWeeklySpending,
  getCategoryBudgetsStatus,
} from '@/store/useExpenseStore';
import {
  getWeekRange,
  formatAmount,
  getCategoryIcon,
  getCategoryLabel,
} from '@/utils/helpers';
import { CATEGORY_CONFIG } from '@/utils/helpers';
import styles from './index.module.scss';

const BudgetPage: React.FC = () => {
  const expenses = useExpenseStore((s) => s.expenses);
  const weeklyBudget = useExpenseStore((s) => s.weeklyBudget);
  const categoryBudgets = useExpenseStore((s) => s.categoryBudgets);
  const setWeeklyBudget = useExpenseStore((s) => s.setWeeklyBudget);
  const setCategoryBudget = useExpenseStore((s) => s.setCategoryBudget);
  const initialize = useExpenseStore((s) => s.initialize);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(weeklyBudget));
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [categoryBudgetInput, setCategoryBudgetInput] = useState('');

  useEffect(() => {
    initialize();
  }, []);

  const weeklySpending = useMemo(() => getWeeklySpending(), [expenses]);
  const categoryBudgetStatus = useMemo(
    () => getCategoryBudgetsStatus(),
    [expenses, categoryBudgets]
  );
  const remain = weeklyBudget - weeklySpending;
  const percentage =
    weeklyBudget > 0
      ? Math.min(Math.round((weeklySpending / weeklyBudget) * 100), 100)
      : 0;
  const isOverBudget = weeklySpending > weeklyBudget;
  const isNearBudget = percentage >= 80 && !isOverBudget;

  const weekRange = useMemo(() => getWeekRange(), []);

  const weekDaySpending = useMemo(() => {
    const { start } = getWeekRange();
    const result: Array<{ day: string; amount: number }> = [];
    const dayNames = ['一', '二', '三', '四', '五', '六', '日'];
    for (let i = 0; i < 7; i++) {
      const date = dayjs(start).add(i, 'day').format('YYYY-MM-DD');
      const dayTotal = expenses
        .filter((e) => e.date === date)
        .reduce((sum, e) => sum + e.amount, 0);
      result.push({ day: dayNames[i], amount: dayTotal });
    }
    return result;
  }, [expenses]);

  const maxDaySpend = Math.max(...weekDaySpending.map((d) => d.amount), 1);

  const alerts = useMemo(() => {
    const items: Array<{ title: string; desc: string; type: 'red' | 'orange' | 'green' }> = [];

    if (isOverBudget) {
      items.push({
        title: '⚠️ 本周已超预算',
        desc: `已超出 ¥${formatAmount(weeklySpending - weeklyBudget)}`,
        type: 'red',
      });
    } else if (isNearBudget) {
      items.push({
        title: '⚡ 本周预算即将用完',
        desc: `仅剩余 ¥${formatAmount(remain)}`,
        type: 'orange',
      });
    } else {
      items.push({
        title: '✅ 本周预算充足',
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

    const impulseThisWeek = expenses.filter((e) => {
      const { start, end } = getWeekRange();
      return e.date >= start && e.date <= end && e.isImpulse;
    });
    if (impulseThisWeek.length > 0) {
      const impulseTotal = impulseThisWeek.reduce((sum, e) => sum + e.amount, 0);
      items.push({
        title: `💥 本周冲动消费 ${impulseThisWeek.length} 笔`,
        desc: `共 ¥${formatAmount(impulseTotal)}`,
        type: 'orange',
      });
    }

    return items;
  }, [expenses, weeklyBudget, weeklySpending, categoryBudgetStatus]);

  const progressFillClass = isOverBudget
    ? styles.progressFillRed
    : isNearBudget
    ? styles.progressFillOrange
    : styles.progressFillGreen;

  const handleSetBudget = () => {
    const val = parseFloat(budgetInput);
    if (!val || val <= 0) {
      Taro.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }
    setWeeklyBudget(val);
    setShowModal(false);
    Taro.showToast({ title: '设置成功', icon: 'success' });
  };

  const handleOpenCategoryModal = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setCategoryBudgetInput(String(categoryBudgets[category] || ''));
    setShowCategoryModal(true);
  };

  const handleSetCategoryBudget = () => {
    if (!editingCategory) return;
    const val = parseFloat(categoryBudgetInput) || 0;
    if (val < 0) {
      Taro.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }
    setCategoryBudget(editingCategory, val);
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

  return (
    <View className={styles.container}>
      <View className={styles.budgetCard}>
        <View className={styles.budgetHeader}>
          <Text className={styles.budgetTitle}>周预算</Text>
          <View
            className={styles.budgetSetBtn}
            onClick={() => {
              setBudgetInput(String(weeklyBudget));
              setShowModal(true);
            }}
          >
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
            已消费 <Text className={styles.budgetSpentAmount}>¥{formatAmount(weeklySpending)}</Text>
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
          .filter((c) => !categoryBudgets[c])
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
                  为{getCategoryLabel(category)}设置预算
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

      <Text className={styles.sectionTitle}>本周每日消费</Text>
      <View className={styles.weekCard}>
        <View className={styles.weekHeader}>
          <Text className={styles.weekLabel}>
            {weekRange.start} ~ {weekRange.end}
          </Text>
          <Text className={styles.weekAmount}>¥{formatAmount(weeklySpending)}</Text>
        </View>
        <View className={styles.weekDays}>
          {weekDaySpending.map((d, index) => {
            const barHeight =
              maxDaySpend > 0
                ? Math.max((d.amount / maxDaySpend) * 120, 8)
                : 8;
            return (
              <View key={index} className={styles.weekDayItem}>
                <Text className={styles.weekDayAmount}>
                  {d.amount > 0 ? `¥${Math.round(d.amount)}` : ''}
                </Text>
                <View
                  className={styles.weekDayBar}
                  style={{ height: `${barHeight}rpx` }}
                />
                <Text className={styles.weekDayName}>周{d.day}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {showModal && (
        <View className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>设置周预算</Text>
            <Input
              className={styles.modalInput}
              type="digit"
              placeholder="输入周预算金额"
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
                {getCategoryLabel(editingCategory)}周预算
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
