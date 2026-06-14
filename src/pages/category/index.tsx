import React, { useMemo, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import dayjs from 'dayjs';
import { useExpenseStore, getMonthlyTotal, getCategorySpending, getImpulseCount, getDailySpending } from '@/store/useExpenseStore';
import { formatAmount } from '@/utils/helpers';
import CategoryBar from '@/components/CategoryBar';
import styles from './index.module.scss';

const CategoryPage: React.FC = () => {
  const expenses = useExpenseStore((s) => s.expenses);
  const initialize = useExpenseStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, []);

  const now = dayjs();
  const year = now.year();
  const month = now.month() + 1;

  const monthlyTotal = useMemo(() => getMonthlyTotal(year, month), [expenses, year, month]);
  const categorySpend = useMemo(() => getCategorySpending(year, month), [expenses, year, month]);
  const impulseCount = useMemo(() => getImpulseCount(year, month), [expenses, year, month]);
  const impulseTotal = useMemo(() => {
    return useExpenseStore.getState().expenses
      .filter((e) => e.date.startsWith(`${year}-${String(month).padStart(2, '0')}`) && e.isImpulse)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, year, month]);
  const necessaryTotal = useMemo(() => {
    return useExpenseStore.getState().expenses
      .filter((e) => e.date.startsWith(`${year}-${String(month).padStart(2, '0')}`) && e.isNecessary)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, year, month]);

  const dailySpending = useMemo(() => getDailySpending(year, month), [expenses, year, month]);
  const maxDaily = Math.max(...dailySpending.map((d) => d.amount), 1);

  const recentDays = dailySpending.slice(0, 14);
  const weekLabels = ['一', '二', '三', '四', '五', '六', '日', '一', '二', '三', '四', '五', '六', '日'];

  return (
    <View className={styles.container}>
      <View className={styles.headerCard}>
        <Text className={styles.headerTitle}>{year}年{month}月 分类分析</Text>
        <Text className={styles.headerAmount}>
          <Text className={styles.headerSymbol}>¥</Text>
          {formatAmount(monthlyTotal)}
        </Text>
        <Text className={styles.headerCount}>共{expenses.filter(e => e.date.startsWith(`${year}-${String(month).padStart(2, '0')}`)).length}笔消费</Text>
      </View>

      <Text className={styles.sectionTitle}>分类占比</Text>
      <View className={styles.chartCard}>
        {categorySpend.length > 0 ? (
          <CategoryBar data={categorySpend} total={monthlyTotal} />
        ) : (
          <Text className={styles.emptyText}>暂无消费记录</Text>
        )}
      </View>

      <Text className={styles.sectionTitle}>消费洞察</Text>
      <View className={styles.impulseCard}>
        <View className={styles.impulseRow}>
          <View className={styles.impulseItem}>
            <Text className={styles.impulseNum}>{impulseCount}</Text>
            <Text className={styles.impulseLabel}>冲动消费次数</Text>
          </View>
          <View className={styles.impulseItem}>
            <Text className={styles.impulseNum}>¥{formatAmount(impulseTotal)}</Text>
            <Text className={styles.impulseLabel}>冲动消费金额</Text>
          </View>
          <View className={styles.impulseItem}>
            <Text className={styles.impulseNumGreen}>¥{formatAmount(necessaryTotal)}</Text>
            <Text className={styles.impulseLabel}>必要消费金额</Text>
          </View>
        </View>
      </View>

      <Text className={styles.sectionTitle}>近14天消费趋势</Text>
      <View className={styles.trendCard}>
        <View className={styles.trendRow}>
          {recentDays.map((day, index) => {
            const height = maxDaily > 0 ? Math.max((day.amount / maxDaily) * 200, 8) : 8;
            return (
              <View key={day.date} className={styles.trendCol}>
                <View className={styles.trendBarWrap}>
                  <View className={styles.trendBar} style={{ height: `${height}rpx` }} />
                </View>
                <Text className={styles.trendLabel}>{weekLabels[index] || ''}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

export default CategoryPage;
