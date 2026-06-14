import React, { useState, useEffect, useMemo } from 'react';
import { View, Text } from '@tarojs/components';
import dayjs from 'dayjs';
import { useExpenseStore, getMonthlyTotal, getDailySpending, getCategorySpending, getFixedExpenses, getFixedTotal } from '@/store/useExpenseStore';
import { getCategoryLabel, getCategoryIcon, formatAmount } from '@/utils/helpers';
import HeatMap from '@/components/HeatMap';
import styles from './index.module.scss';

const DashboardPage: React.FC = () => {
  const expenses = useExpenseStore((s) => s.expenses);
  const initialize = useExpenseStore((s) => s.initialize);
  const [currentDate] = useState(dayjs());

  useEffect(() => {
    initialize();
  }, []);

  const year = currentDate.year();
  const month = currentDate.month() + 1;
  const daysInMonth = currentDate.daysInMonth();
  const today = currentDate.date();
  const daysLeft = daysInMonth - today;

  const monthlyTotal = useMemo(() => getMonthlyTotal(year, month), [expenses, year, month]);
  const dailyAvg = daysLeft > 0 ? Math.round(monthlyTotal / today) : monthlyTotal;
  const dailySpending = useMemo(() => getDailySpending(year, month), [expenses, year, month]);
  const categorySpend = useMemo(() => getCategorySpending(year, month), [expenses, year, month]);
  const fixedExpenses = useMemo(() => getFixedExpenses(year, month), [expenses, year, month]);
  const fixedTotal = useMemo(() => getFixedTotal(year, month), [expenses, year, month]);

  return (
    <View className={styles.container}>
      <View className={styles.headerCard}>
        <View className={styles.headerTop}>
          <Text className={styles.headerMonth}>{year}年{month}月</Text>
          <Text className={styles.headerDaysLeft}>剩余{daysLeft}天</Text>
        </View>
        <View className={styles.headerAmount}>
          <Text className={styles.headerSymbol}>¥</Text>
          {formatAmount(monthlyTotal)}
        </View>
        <View className={styles.headerSubRow}>
          <View className={styles.headerSubItem}>
            <Text className={styles.headerSubLabel}>日均消费</Text>
            <Text className={styles.headerSubValue}>¥{formatAmount(dailyAvg)}</Text>
          </View>
          <View className={styles.headerSubItem}>
            <Text className={styles.headerSubLabel}>记录笔数</Text>
            <Text className={styles.headerSubValue}>{dailySpending.filter(d => d.amount > 0).length}天</Text>
          </View>
          <View className={styles.headerSubItem}>
            <Text className={styles.headerSubLabel}>固定支出</Text>
            <Text className={styles.headerSubValue}>¥{formatAmount(fixedTotal)}</Text>
          </View>
        </View>
      </View>

      <Text className={styles.sectionTitle}>每日花费热力图</Text>
      <View className={styles.heatCard}>
        <HeatMap data={dailySpending} year={year} month={month} />
      </View>

      <Text className={styles.sectionTitle}>消费Top分类</Text>
      <View className={styles.topCategoryCard}>
        {categorySpend.slice(0, 5).map((item) => (
          <View key={item.category} className={styles.topItem}>
            <View className={styles.topItemLeft}>
              <Text className={styles.topItemIcon}>{getCategoryIcon(item.category)}</Text>
              <View className={styles.topItemInfo}>
                <Text className={styles.topItemLabel}>{getCategoryLabel(item.category)}</Text>
                <Text className={styles.topItemCount}>{item.count}笔 · {item.percentage}%</Text>
              </View>
            </View>
            <Text className={styles.topItemAmount}>¥{formatAmount(item.amount)}</Text>
          </View>
        ))}
        {categorySpend.length === 0 && (
          <Text className={styles.emptyText}>暂无消费记录</Text>
        )}
      </View>

      <Text className={styles.sectionTitle}>固定支出清单</Text>
      <View className={styles.fixedCard}>
        {fixedExpenses.map((exp) => (
          <View key={exp.id} className={styles.fixedItem}>
            <View className={styles.fixedLeft}>
              <Text className={styles.fixedIcon}>{getCategoryIcon(exp.category)}</Text>
              <Text className={styles.fixedName}>{exp.merchant}</Text>
            </View>
            <Text className={styles.fixedAmount}>¥{formatAmount(exp.amount)}</Text>
          </View>
        ))}
        {fixedExpenses.length > 0 && (
          <View className={styles.fixedTotal}>
            <Text className={styles.fixedTotalLabel}>固定支出合计</Text>
            <Text className={styles.fixedTotalAmount}>¥{formatAmount(fixedTotal)}</Text>
          </View>
        )}
        {fixedExpenses.length === 0 && (
          <Text className={styles.emptyText}>暂无固定支出</Text>
        )}
      </View>
    </View>
  );
};

export default DashboardPage;
