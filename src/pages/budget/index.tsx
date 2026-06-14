import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import classnames from 'classnames';
import { useExpenseStore, getWeeklySpending } from '@/store/useExpenseStore';
import { getWeekRange, formatAmount } from '@/utils/helpers';
import { CATEGORY_CONFIG } from '@/utils/helpers';
import styles from './index.module.scss';

const BudgetPage: React.FC = () => {
  const expenses = useExpenseStore((s) => s.expenses);
  const weeklyBudget = useExpenseStore((s) => s.weeklyBudget);
  const setWeeklyBudget = useExpenseStore((s) => s.setWeeklyBudget);
  const initialize = useExpenseStore((s) => s.initialize);
  const [showModal, setShowModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(weeklyBudget));

  useEffect(() => {
    initialize();
  }, []);

  const weeklySpending = useMemo(() => getWeeklySpending(), [expenses]);
  const remain = weeklyBudget - weeklySpending;
  const percentage = weeklyBudget > 0 ? Math.min(Math.round((weeklySpending / weeklyBudget) * 100), 100) : 0;
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

    const diningThisWeek = expenses
      .filter((e) => {
        const { start, end } = getWeekRange();
        return e.date >= start && e.date <= end && e.category === 'dining';
      })
      .reduce((sum, e) => sum + e.amount, 0);
    if (diningThisWeek > weeklyBudget * 0.4 && weeklyBudget > 0) {
      items.push({
        title: '🍜 餐饮支出占比较高',
        desc: `本周餐饮 ¥${formatAmount(diningThisWeek)}，占预算 ${Math.round((diningThisWeek / weeklyBudget) * 100)}%`,
        type: 'orange',
      });
    }

    return items;
  }, [expenses, weeklyBudget, weeklySpending]);

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

  return (
    <View className={styles.container}>
      <View className={styles.budgetCard}>
        <View className={styles.budgetHeader}>
          <Text className={styles.budgetTitle}>周预算</Text>
          <View className={styles.budgetSetBtn} onClick={() => { setBudgetInput(String(weeklyBudget)); setShowModal(true); }}>
            <Text className={styles.budgetSetText}>设置预算</Text>
          </View>
        </View>
        <View className={styles.progressWrap}>
          <View className={styles.progressBg}>
            <View className={classnames(styles.progressFill, progressFillClass)} style={{ width: `${Math.min(percentage, 100)}%` }}>
              {percentage > 15 && <Text className={styles.progressPercent}>{percentage}%</Text>}
            </View>
          </View>
        </View>
        <View className={styles.budgetInfo}>
          <Text className={styles.budgetSpent}>
            已消费 <Text className={styles.budgetSpentAmount}>¥{formatAmount(weeklySpending)}</Text>
          </Text>
          <Text className={styles.budgetRemain}>
            剩余 <Text className={classnames(styles.budgetRemainAmount, remain >= 0 ? styles.budgetRemainPositive : styles.budgetRemainNegative)}>¥{formatAmount(Math.abs(remain))}</Text>
          </Text>
        </View>
      </View>

      <Text className={styles.sectionTitle}>预算提醒</Text>
      <View className={styles.alertCard}>
        {alerts.map((alert, index) => (
          <View key={index} className={styles.alertItem}>
            <View className={classnames(styles.alertDot, alert.type === 'red' ? styles.alertDotRed : alert.type === 'orange' ? styles.alertDotOrange : styles.alertDotGreen)} />
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
          <Text className={styles.weekLabel}>{weekRange.start} ~ {weekRange.end}</Text>
          <Text className={styles.weekAmount}>¥{formatAmount(weeklySpending)}</Text>
        </View>
        <View className={styles.weekDays}>
          {weekDaySpending.map((d, index) => {
            const barHeight = maxDaySpend > 0 ? Math.max((d.amount / maxDaySpend) * 120, 8) : 8;
            return (
              <View key={index} className={styles.weekDayItem}>
                <Text className={styles.weekDayAmount}>{d.amount > 0 ? `¥${Math.round(d.amount)}` : ''}</Text>
                <View className={styles.weekDayBar} style={{ height: `${barHeight}rpx` }} />
                <Text className={styles.weekDayName}>周{d.day}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {showModal && (
        <View className={styles.modalOverlay}>
          <View className={styles.modalContent}>
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
    </View>
  );
};

export default BudgetPage;
