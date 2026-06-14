import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import dayjs from 'dayjs';
import classnames from 'classnames';
import {
  useExpenseStore,
  getMonthlyTotal,
  getDailySpending,
  getCategorySpending,
  getFixedExpenses,
  getFixedTotal,
  getMonthlyComparison,
  getMonthlyTrend,
} from '@/store/useExpenseStore';
import { getCategoryLabel, getCategoryIcon, formatAmount, getCategoryColor } from '@/utils/helpers';
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
  const comparison = useMemo(() => getMonthlyComparison(), [expenses]);
  const monthlyTrend = useMemo(() => getMonthlyTrend(3), [expenses]);

  const getDiffClass = (diff: number) => {
    if (diff > 0) return styles.diffUp;
    if (diff < 0) return styles.diffDown;
    return styles.diffFlat;
  };

  const getDiffIcon = (diff: number) => {
    if (diff > 0) return '↑';
    if (diff < 0) return '↓';
    return '—';
  };

  return (
    <ScrollView scrollY className={styles.container}>
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
            <Text className={styles.headerSubValue}>{dailySpending.filter((d) => d.amount > 0).length}天</Text>
          </View>
          <View className={styles.headerSubItem}>
            <Text className={styles.headerSubLabel}>固定支出</Text>
            <Text className={styles.headerSubValue}>¥{formatAmount(fixedTotal)}</Text>
          </View>
        </View>
      </View>

      <Text className={styles.sectionTitle}>本月 vs 上月</Text>
      <View className={styles.comparisonCard}>
        <View className={styles.comparisonHeader}>
          <View className={styles.comparisonTotal}>
            <Text className={styles.comparisonLabel}>总支出</Text>
            <Text className={styles.comparisonAmount}>¥{formatAmount(comparison.currentTotal)}</Text>
            <View className={classnames(styles.comparisonDiff, getDiffClass(comparison.diffAmount))}>
              <Text className={styles.comparisonDiffText}>
                {getDiffIcon(comparison.diffAmount)} {Math.abs(comparison.diffPercentage)}%
              </Text>
            </View>
          </View>
          <View className={styles.comparisonLastMonth}>
            <Text className={styles.comparisonLastLabel}>上月</Text>
            <Text className={styles.comparisonLastAmount}>¥{formatAmount(comparison.lastTotal)}</Text>
          </View>
        </View>
        <View className={styles.comparisonDivider} />
        <View className={styles.comparisonList}>
          {comparison.categories.map((cat) => (
            <View key={cat.category} className={styles.comparisonItem}>
              <View className={styles.comparisonItemLeft}>
                <Text className={styles.comparisonIcon}>{getCategoryIcon(cat.category)}</Text>
                <Text className={styles.comparisonItemLabel}>{getCategoryLabel(cat.category)}</Text>
              </View>
              <View className={styles.comparisonItemRight}>
                <Text className={styles.comparisonItemCurrent}>¥{formatAmount(cat.currentAmount)}</Text>
                <View className={classnames(styles.comparisonItemDiff, getDiffClass(cat.diffAmount))}>
                  <Text className={styles.comparisonItemDiffText}>
                    {getDiffIcon(cat.diffAmount)} {Math.abs(cat.diffPercentage)}%
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      <Text className={styles.sectionTitle}>近3个月走势</Text>
      <View className={styles.trendCard}>
        <View className={styles.trendHeader}>
          <Text className={styles.trendTitle}>总支出趋势</Text>
          <View className={styles.trendLegend}>
            {monthlyTrend.keyCategories.map((cat) => (
              <View key={cat} className={styles.trendLegendItem}>
                <View
                  className={styles.trendLegendDot}
                  style={{ backgroundColor: getCategoryColor(cat) }}
                />
                <Text className={styles.trendLegendText}>{getCategoryLabel(cat)}</Text>
              </View>
            ))}
          </View>
        </View>
        <View className={styles.trendChart}>
          {monthlyTrend.months.map((m) => {
            const barHeight =
              monthlyTrend.maxTotal > 0
                ? Math.max((m.total / monthlyTrend.maxTotal) * 240, 16)
                : 16;
            return (
              <View key={`${m.year}-${m.month}`} className={styles.trendBarCol}>
                <Text className={styles.trendBarAmount}>
                  {m.total > 0 ? `¥${Math.round(m.total / 100)}` : ''}
                </Text>
                <View className={styles.trendBarStack}>
                  {monthlyTrend.keyCategories.map((cat, idx) => {
                    const catData = m.categories.find((c) => c.category === cat);
                    const catAmount = catData?.amount || 0;
                    const catHeight =
                      monthlyTrend.maxTotal > 0
                        ? Math.max((catAmount / monthlyTrend.maxTotal) * 240, 0)
                        : 0;
                    if (catHeight <= 0) return null;
                    return (
                      <View
                        key={cat}
                        className={styles.trendBarSegment}
                        style={{
                          height: `${catHeight}rpx`,
                          backgroundColor: getCategoryColor(cat),
                          marginTop: idx > 0 ? '-1rpx' : 0,
                        }}
                      />
                    );
                  })}
                  <View
                    className={styles.trendBarBg}
                    style={{ height: `${barHeight}rpx` }}
                  />
                </View>
                <Text className={styles.trendBarLabel}>{m.label}</Text>
              </View>
            );
          })}
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
                <Text className={styles.topItemCount}>
                  {item.count}笔 · {item.percentage}%
                </Text>
              </View>
            </View>
            <Text className={styles.topItemAmount}>¥{formatAmount(item.amount)}</Text>
          </View>
        ))}
        {categorySpend.length === 0 && <Text className={styles.emptyText}>暂无消费记录</Text>}
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
        {fixedExpenses.length === 0 && <Text className={styles.emptyText}>暂无固定支出</Text>}
      </View>
    </ScrollView>
  );
};

export default DashboardPage;
