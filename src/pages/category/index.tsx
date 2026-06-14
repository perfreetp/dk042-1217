import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import classnames from 'classnames';
import type { TimeRangeType, ExpenseCategory, PaymentMethod } from '@/types/expense';
import {
  useExpenseStore,
  getTotalByDateRange,
  getCategorySpendingByRange,
  getDailySpendingByRange,
  getExpensesByDateRange,
  getFilteredExpenses,
  getUniquePaymentMethods,
} from '@/store/useExpenseStore';
import {
  getTimeRange,
  formatAmount,
  getCategoryIcon,
  getCategoryLabel,
  getPaymentIcon,
  getPaymentLabel,
  getUniqueMerchants,
} from '@/utils/helpers';
import CategoryBar from '@/components/CategoryBar';
import ExpenseCard from '@/components/ExpenseCard';
import styles from './index.module.scss';

const TIME_RANGES: Array<{ type: TimeRangeType; label: string }> = [
  { type: '7d', label: '近7天' },
  { type: '30d', label: '近30天' },
  { type: 'month', label: '本月' },
];

const CategoryPage: React.FC = () => {
  const expenses = useExpenseStore((s) => s.expenses);
  const initialize = useExpenseStore((s) => s.initialize);
  const [timeRange, setTimeRange] = useState<TimeRangeType>('month');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [merchantFilter, setMerchantFilter] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | null>(null);

  useEffect(() => {
    initialize();
  }, []);

  const range = useMemo(() => getTimeRange(timeRange), [timeRange]);

  const total = useMemo(
    () => getTotalByDateRange(range.start, range.end),
    [expenses, range.start, range.end]
  );

  const categorySpend = useMemo(
    () => getCategorySpendingByRange(range.start, range.end),
    [expenses, range.start, range.end]
  );

  const rangeExpenses = useMemo(
    () => getExpensesByDateRange(range.start, range.end),
    [expenses, range.start, range.end]
  );

  const impulseCount = useMemo(
    () => rangeExpenses.filter((e) => e.isImpulse).length,
    [rangeExpenses]
  );

  const impulseTotal = useMemo(
    () => rangeExpenses.filter((e) => e.isImpulse).reduce((sum, e) => sum + e.amount, 0),
    [rangeExpenses]
  );

  const necessaryTotal = useMemo(
    () => rangeExpenses.filter((e) => e.isNecessary).reduce((sum, e) => sum + e.amount, 0),
    [rangeExpenses]
  );

  const dailySpending = useMemo(
    () => getDailySpendingByRange(range.start, range.end),
    [expenses, range.start, range.end]
  );

  const maxDaily = Math.max(...dailySpending.map((d) => d.amount), 1);

  const trendDays = dailySpending.slice(-Math.min(dailySpending.length, range.days));
  const weekLabels = trendDays.map((d) => dayjs(d.date).format('DD'));

  const categoryRawExpenses = useMemo(() => {
    if (!selectedCategory) return [];
    return rangeExpenses.filter((e) => e.category === selectedCategory);
  }, [rangeExpenses, selectedCategory]);

  const availableMerchants = useMemo(
    () => getUniqueMerchants(categoryRawExpenses),
    [categoryRawExpenses]
  );

  const availablePayments = useMemo(
    () => getUniquePaymentMethods(categoryRawExpenses),
    [categoryRawExpenses]
  );

  const categoryDetailExpenses = useMemo(() => {
    if (!selectedCategory) return [];
    return getFilteredExpenses(range.start, range.end, {
      category: selectedCategory,
      merchant: merchantFilter || undefined,
      paymentMethod: paymentFilter || undefined,
    });
  }, [range.start, range.end, selectedCategory, merchantFilter, paymentFilter]);

  const filteredTotal = useMemo(
    () => categoryDetailExpenses.reduce((sum, e) => sum + e.amount, 0),
    [categoryDetailExpenses]
  );

  const handleCloseModal = () => {
    setSelectedCategory(null);
    setMerchantFilter(null);
    setPaymentFilter(null);
  };

  const handleOpenCategory = (category: ExpenseCategory) => {
    setSelectedCategory(category);
    setMerchantFilter(null);
    setPaymentFilter(null);
  };

  const handleSearchInReview = () => {
    if (!selectedCategory) return;
    const keyword = getCategoryLabel(selectedCategory);
    Taro.switchTab({
      url: '/pages/review/index',
      success: () => {
        setTimeout(() => {
          const event = new CustomEvent('setSearchKeyword', { detail: keyword });
          window.dispatchEvent(event);
        }, 300);
      },
    });
    handleCloseModal();
    Taro.showToast({ title: '已跳转到复盘页搜索', icon: 'success' });
  };

  const hasActiveFilter = merchantFilter || paymentFilter;

  return (
    <ScrollView scrollY className={styles.container}>
      <View className={styles.headerCard}>
        <Text className={styles.headerTitle}>{range.label}分类分析</Text>
        <Text className={styles.headerAmount}>
          <Text className={styles.headerSymbol}>¥</Text>
          {formatAmount(total)}
        </Text>
        <Text className={styles.headerCount}>共{rangeExpenses.length}笔消费</Text>
      </View>

      <View className={styles.timeRangeWrap}>
        {TIME_RANGES.map((t) => (
          <View
            key={t.type}
            className={classnames(styles.timeRangeBtn, timeRange === t.type && styles.timeRangeBtnActive)}
            onClick={() => setTimeRange(t.type)}
          >
            <Text
              className={classnames(
                styles.timeRangeText,
                timeRange === t.type && styles.timeRangeTextActive
              )}
            >
              {t.label}
            </Text>
          </View>
        ))}
      </View>

      <Text className={styles.sectionTitle}>分类占比</Text>
      <View className={styles.chartCard}>
        {categorySpend.length > 0 ? (
          <CategoryBar data={categorySpend} total={total} />
        ) : (
          <Text className={styles.emptyText}>暂无消费记录</Text>
        )}
      </View>

      <Text className={styles.sectionTitle}>分类明细</Text>
      <View className={styles.categoryListCard}>
        {categorySpend.map((item) => (
          <View
            key={item.category}
            className={styles.categoryListItem}
            onClick={() => handleOpenCategory(item.category)}
          >
            <View className={styles.categoryListLeft}>
              <Text className={styles.categoryListIcon}>{getCategoryIcon(item.category)}</Text>
              <View className={styles.categoryListInfo}>
                <Text className={styles.categoryListLabel}>{getCategoryLabel(item.category)}</Text>
                <Text className={styles.categoryListCount}>{item.count}笔</Text>
              </View>
            </View>
            <View className={styles.categoryListRight}>
              <Text className={styles.categoryListAmount}>¥{formatAmount(item.amount)}</Text>
              <Text className={styles.categoryListPercent}>{item.percentage}% ›</Text>
            </View>
          </View>
        ))}
        {categorySpend.length === 0 && <Text className={styles.emptyText}>暂无消费记录</Text>}
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

      <Text className={styles.sectionTitle}>{range.label}消费趋势</Text>
      <View className={styles.trendCard}>
        <View className={styles.trendRow}>
          {trendDays.map((day, index) => {
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

      {selectedCategory && (
        <View className={styles.modalOverlay} onClick={handleCloseModal}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <View className={styles.modalHeaderLeft}>
                <Text className={styles.modalIcon}>{getCategoryIcon(selectedCategory)}</Text>
                <View>
                  <Text className={styles.modalTitle}>{getCategoryLabel(selectedCategory)}明细</Text>
                  <Text className={styles.modalSubTitle}>
                    共{categoryDetailExpenses.length}笔 · ¥{formatAmount(filteredTotal)}
                  </Text>
                </View>
              </View>
              <View className={styles.modalClose} onClick={handleCloseModal}>
                <Text className={styles.modalCloseText}>×</Text>
              </View>
            </View>

            <View className={styles.modalFilterSection}>
              <View className={styles.filterRow}>
                <Text className={styles.filterLabel}>商家</Text>
                <ScrollView scrollX className={styles.filterScroll}>
                  <View
                    className={classnames(
                      styles.filterChip,
                      !merchantFilter && styles.filterChipActive
                    )}
                    onClick={() => setMerchantFilter(null)}
                  >
                    <Text
                      className={classnames(
                        styles.filterChipText,
                        !merchantFilter && styles.filterChipTextActive
                      )}
                    >
                      全部
                    </Text>
                  </View>
                  {availableMerchants.map((merchant) => (
                    <View
                      key={merchant}
                      className={classnames(
                        styles.filterChip,
                        merchantFilter === merchant && styles.filterChipActive
                      )}
                      onClick={() => setMerchantFilter(merchantFilter === merchant ? null : merchant)}
                    >
                      <Text
                        className={classnames(
                          styles.filterChipText,
                          merchantFilter === merchant && styles.filterChipTextActive
                        )}
                      >
                        {merchant}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>

              {availablePayments.length > 1 && (
                <View className={styles.filterRow}>
                  <Text className={styles.filterLabel}>支付方式</Text>
                  <ScrollView scrollX className={styles.filterScroll}>
                    <View
                      className={classnames(
                        styles.filterChip,
                        !paymentFilter && styles.filterChipActive
                      )}
                      onClick={() => setPaymentFilter(null)}
                    >
                      <Text
                        className={classnames(
                          styles.filterChipText,
                          !paymentFilter && styles.filterChipTextActive
                        )}
                      >
                        全部
                      </Text>
                    </View>
                    {availablePayments.map((pm) => (
                      <View
                        key={pm}
                        className={classnames(
                          styles.filterChip,
                          paymentFilter === pm && styles.filterChipActive
                        )}
                        onClick={() =>
                          setPaymentFilter(paymentFilter === pm ? null : pm)
                        }
                      >
                        <Text className={styles.filterChipIcon}>{getPaymentIcon(pm)}</Text>
                        <Text
                          className={classnames(
                            styles.filterChipText,
                            paymentFilter === pm && styles.filterChipTextActive
                          )}
                        >
                          {getPaymentLabel(pm)}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View className={styles.modalActions}>
              <View className={styles.modalActionBtn} onClick={handleSearchInReview}>
                <Text className={styles.modalActionIcon}>🔍</Text>
                <Text className={styles.modalActionText}>搜索同类账单</Text>
              </View>
              {hasActiveFilter && (
                <View
                  className={classnames(styles.modalActionBtn, styles.modalActionBtnSecondary)}
                  onClick={() => {
                    setMerchantFilter(null);
                    setPaymentFilter(null);
                  }}
                >
                  <Text className={styles.modalActionIcon}>✕</Text>
                  <Text className={styles.modalActionText}>清除筛选</Text>
                </View>
              )}
            </View>

            <ScrollView scrollY className={styles.modalList}>
              {categoryDetailExpenses.map((exp) => (
                <ExpenseCard key={exp.id} expense={exp} />
              ))}
              {categoryDetailExpenses.length === 0 && (
                <Text className={styles.emptyText}>该条件下暂无消费记录</Text>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default CategoryPage;
