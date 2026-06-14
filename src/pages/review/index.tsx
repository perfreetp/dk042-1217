import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import classnames from 'classnames';
import { useExpenseStore, getMonthlyTotal, getCategorySpending, getImpulseCount, getFixedTotal, searchExpenses, generateMonthlySummary } from '@/store/useExpenseStore';
import { generateReviewQuestions, formatAmount, getCategoryLabel } from '@/utils/helpers';
import ExpenseCard from '@/components/ExpenseCard';
import styles from './index.module.scss';

const ReviewPage: React.FC = () => {
  const expenses = useExpenseStore((s) => s.expenses);
  const initialize = useExpenseStore((s) => s.initialize);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [reviewQuestions] = useState(() => generateReviewQuestions());

  useEffect(() => {
    initialize();
  }, []);

  const now = dayjs();
  const year = now.year();
  const month = now.month() + 1;

  const monthlyTotal = useMemo(() => getMonthlyTotal(year, month), [expenses, year, month]);
  const categorySpend = useMemo(() => getCategorySpending(year, month), [expenses, year, month]);
  const impulseCount = useMemo(() => getImpulseCount(year, month), [expenses, year, month]);
  const fixedTotal = useMemo(() => getFixedTotal(year, month), [expenses, year, month]);
  const impulseTotal = useMemo(() => {
    return expenses
      .filter((e) => e.date.startsWith(`${year}-${String(month).padStart(2, '0')}`) && e.isImpulse)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, year, month]);

  const searchResults = useMemo(() => {
    return searchExpenses(searchKeyword).slice(0, 20);
  }, [expenses, searchKeyword]);

  const daysInMonth = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).daysInMonth();
  const dailyAvg = Math.round(monthlyTotal / daysInMonth);

  const handleExport = () => {
    const summary = generateMonthlySummary(year, month);
    Taro.setClipboardData({
      text: summary,
      success: () => {
        Taro.showToast({ title: '摘要已复制到剪贴板', icon: 'success' });
      },
      fail: (err) => {
        console.error('[Review] Failed to copy summary:', err);
        Taro.showToast({ title: '复制失败', icon: 'none' });
      },
    });
  };

  const handleDelete = (id: string) => {
    Taro.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确认删除该笔记录？',
      success: (res) => {
        if (res.confirm) {
          deleteExpense(id);
          Taro.showToast({ title: '已删除', icon: 'success' });
        }
      },
    });
  };

  return (
    <ScrollView scrollY className={styles.container}>
      <Text className={classnames(styles.sectionTitle, styles.sectionTitleFirst)}>搜索账单</Text>
      <View className={styles.searchCard}>
        <View className={styles.searchWrap}>
          <Text className={styles.searchIcon}>🔍</Text>
          <Input
            className={styles.searchInput}
            placeholder="搜索商家、备注或分类"
            value={searchKeyword}
            onInput={(e) => setSearchKeyword(e.detail.value)}
          />
        </View>
        {searchKeyword.trim() && (
          <View className={styles.resultList}>
            {searchResults.map((exp) => (
              <ExpenseCard key={exp.id} expense={exp} showDelete onDelete={handleDelete} />
            ))}
            {searchResults.length === 0 && (
              <Text className={styles.emptyText}>未找到相关账单</Text>
            )}
          </View>
        )}
      </View>

      <Text className={styles.sectionTitle}>月底复盘问题</Text>
      <View className={styles.reviewCard}>
        {reviewQuestions.map((q, index) => (
          <View key={index} className={styles.questionItem}>
            <View className={styles.questionNum}>
              <Text className={styles.questionNumText}>{index + 1}</Text>
            </View>
            <View className={styles.questionContent}>
              <Text className={styles.questionText}>{q.question}</Text>
              <Text
                className={classnames(
                  styles.questionType,
                  q.type === 'reflection' ? styles.questionTypeReflection : styles.questionTypeAction
                )}
              >
                {q.type === 'reflection' ? '反思' : '行动'}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Text className={styles.sectionTitle}>月度消费摘要</Text>
      <View className={styles.summaryCard}>
        <Text className={styles.summaryTitle}>{year}年{month}月 消费摘要</Text>
        <View className={styles.summaryRow}>
          <Text className={styles.summaryLabel}>总支出</Text>
          <Text className={styles.summaryValue}>¥{formatAmount(monthlyTotal)}</Text>
        </View>
        <View className={styles.summaryRow}>
          <Text className={styles.summaryLabel}>日均消费</Text>
          <Text className={styles.summaryValue}>¥{formatAmount(dailyAvg)}</Text>
        </View>
        <View className={styles.summaryRow}>
          <Text className={styles.summaryLabel}>冲动消费</Text>
          <Text className={styles.summaryValue}>{impulseCount}笔 / ¥{formatAmount(impulseTotal)}</Text>
        </View>
        <View className={styles.summaryRow}>
          <Text className={styles.summaryLabel}>固定支出</Text>
          <Text className={styles.summaryValue}>¥{formatAmount(fixedTotal)}</Text>
        </View>
        {categorySpend.slice(0, 3).map((c) => (
          <View key={c.category} className={styles.summaryRow}>
            <Text className={styles.summaryLabel}>{getCategoryLabel(c.category)}</Text>
            <Text className={styles.summaryValue}>¥{formatAmount(c.amount)} ({c.percentage}%)</Text>
          </View>
        ))}
        <View className={styles.exportBtn} onClick={handleExport}>
          <Text className={styles.exportText}>📋 导出月度摘要</Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default ReviewPage;
