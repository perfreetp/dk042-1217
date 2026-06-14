import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import classnames from 'classnames';
import {
  useExpenseStore,
  getMonthlyTotal,
  getCategorySpending,
  getImpulseCount,
  getFixedTotal,
  searchExpenses,
  generateMonthlySummary,
  getHabitAnalysis,
  generateShareImageData,
} from '@/store/useExpenseStore';
import {
  generateReviewQuestions,
  formatAmount,
  getCategoryLabel,
  getHourLabel,
  getWeekdayLabel,
  getCategoryIcon,
} from '@/utils/helpers';
import ExpenseCard from '@/components/ExpenseCard';
import styles from './index.module.scss';

const ReviewPage: React.FC = () => {
  const expenses = useExpenseStore((s) => s.expenses);
  const initialize = useExpenseStore((s) => s.initialize);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [reviewQuestions] = useState(() => generateReviewQuestions());

  useEffect(() => {
    initialize();
  }, []);

  const now = dayjs();
  const year = now.year();
  const month = now.month() + 1;

  const monthlyTotal = useMemo(
    () => getMonthlyTotal(year, month),
    [expenses, year, month]
  );
  const categorySpend = useMemo(
    () => getCategorySpending(year, month),
    [expenses, year, month]
  );
  const impulseCount = useMemo(
    () => getImpulseCount(year, month),
    [expenses, year, month]
  );
  const fixedTotal = useMemo(
    () => getFixedTotal(year, month),
    [expenses, year, month]
  );
  const habitAnalysis = useMemo(
    () => getHabitAnalysis(year, month),
    [expenses, year, month]
  );
  const shareImageData = useMemo(
    () => generateShareImageData(),
    [expenses, year, month]
  );
  const impulseTotal = useMemo(() => {
    return expenses
      .filter(
        (e) =>
          e.date.startsWith(`${year}-${String(month).padStart(2, '0')}`) &&
          e.isImpulse
      )
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, year, month]);

  const searchResults = useMemo(() => {
    return searchExpenses(searchKeyword).slice(0, 20);
  }, [expenses, searchKeyword]);

  const daysInMonth = dayjs(
    `${year}-${String(month).padStart(2, '0')}-01`
  ).daysInMonth();
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

  const handleGenerateShare = () => {
    setShowShareModal(true);
  };

  const handleCloseShareModal = () => {
    setShowShareModal(false);
  };

  const handleSaveShare = () => {
    Taro.showToast({
      title: '分享图片已生成',
      icon: 'success',
    });
    setTimeout(() => setShowShareModal(false), 1500);
  };

  const mostSpentWeekday = useMemo(() => {
    if (!habitAnalysis.weekdaySpending) return null;
    const max = Math.max(...habitAnalysis.weekdaySpending.map((d) => d.amount));
    return habitAnalysis.weekdaySpending.find((d) => d.amount === max);
  }, [habitAnalysis]);

  return (
    <ScrollView scrollY className={styles.container}>
      <Text
        className={classnames(styles.sectionTitle, styles.sectionTitleFirst)}
      >
        搜索账单
      </Text>
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
              <ExpenseCard
                key={exp.id}
                expense={exp}
                showDelete
                onDelete={handleDelete}
              />
            ))}
            {searchResults.length === 0 && (
              <Text className={styles.emptyText}>未找到相关账单</Text>
            )}
          </View>
        )}
      </View>

      <Text className={styles.sectionTitle}>消费习惯总结</Text>
      <View className={styles.habitCard}>
        <View className={styles.habitHeader}>
          <Text className={styles.habitTitle}>
            📊 {year}年{month}月消费分析
          </Text>
        </View>

        <View className={styles.habitRatios}>
          <View className={styles.habitRatioItem}>
            <Text className={styles.habitRatioNum}>
              {habitAnalysis.fixedExpenseRatio}%
            </Text>
            <Text className={styles.habitRatioLabel}>固定支出占比</Text>
          </View>
          <View className={styles.habitRatioDivider} />
          <View className={styles.habitRatioItem}>
            <Text className={styles.habitRatioNumOrange}>
              {habitAnalysis.impulseExpenseRatio}%
            </Text>
            <Text className={styles.habitRatioLabel}>冲动消费占比</Text>
          </View>
        </View>

        <View className={styles.habitInsightCard}>
          <View className={styles.habitInsightItem}>
            <Text className={styles.habitInsightIcon}>⏰</Text>
            <View className={styles.habitInsightContent}>
              <Text className={styles.habitInsightTitle}>
                最容易冲动消费
              </Text>
              <Text className={styles.habitInsightValue}>
                {getHourLabel(habitAnalysis.mostImpulsiveHour)} 左右
              </Text>
            </View>
          </View>

          <View className={styles.habitInsightItem}>
            <Text className={styles.habitInsightIcon}>🛍️</Text>
            <View className={styles.habitInsightContent}>
              <Text className={styles.habitInsightTitle}>
                冲动消费主要是
              </Text>
              <Text className={styles.habitInsightValue}>
                {habitAnalysis.mostImpulsiveMerchantTypes
                  .slice(0, 2)
                  .map((c) => getCategoryLabel(c))
                  .join('、')}
              </Text>
            </View>
          </View>

          {mostSpentWeekday && mostSpentWeekday.amount > 0 && (
            <View className={styles.habitInsightItem}>
              <Text className={styles.habitInsightIcon}>📅</Text>
              <View className={styles.habitInsightContent}>
                <Text className={styles.habitInsightTitle}>
                  周均消费最高
                </Text>
                <Text className={styles.habitInsightValue}>
                  {getWeekdayLabel(mostSpentWeekday.weekday)} · ¥
                  {formatAmount(mostSpentWeekday.amount)}
                </Text>
              </View>
            </View>
          )}

          {habitAnalysis.mostExpensiveMerchant.name && (
            <View className={styles.habitInsightItem}>
              <Text className={styles.habitInsightIcon}>🏪</Text>
              <View className={styles.habitInsightContent}>
                <Text className={styles.habitInsightTitle}>
                  花钱最多的商家
                </Text>
                <Text className={styles.habitInsightValue}>
                  {habitAnalysis.mostExpensiveMerchant.name} · ¥
                  {formatAmount(habitAnalysis.mostExpensiveMerchant.amount)}
                </Text>
              </View>
            </View>
          )}
        </View>
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
                  q.type === 'reflection'
                    ? styles.questionTypeReflection
                    : styles.questionTypeAction
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
        <Text className={styles.summaryTitle}>
          {year}年{month}月 消费摘要
        </Text>
        <View className={styles.summaryRow}>
          <Text className={styles.summaryLabel}>总支出</Text>
          <Text className={styles.summaryValue}>
            ¥{formatAmount(monthlyTotal)}
          </Text>
        </View>
        <View className={styles.summaryRow}>
          <Text className={styles.summaryLabel}>日均消费</Text>
          <Text className={styles.summaryValue}>
            ¥{formatAmount(dailyAvg)}
          </Text>
        </View>
        <View className={styles.summaryRow}>
          <Text className={styles.summaryLabel}>冲动消费</Text>
          <Text className={styles.summaryValue}>
            {impulseCount}笔 / ¥{formatAmount(impulseTotal)}
          </Text>
        </View>
        <View className={styles.summaryRow}>
          <Text className={styles.summaryLabel}>固定支出</Text>
          <Text className={styles.summaryValue}>
            ¥{formatAmount(fixedTotal)}
          </Text>
        </View>
        {categorySpend.slice(0, 3).map((c) => (
          <View key={c.category} className={styles.summaryRow}>
            <Text className={styles.summaryLabel}>
              {getCategoryLabel(c.category)}
            </Text>
            <Text className={styles.summaryValue}>
              ¥{formatAmount(c.amount)} ({c.percentage}%)
            </Text>
          </View>
        ))}
        <View className={styles.exportBtns}>
          <View className={styles.exportBtn} onClick={handleExport}>
            <Text className={styles.exportText}>📋 复制文本摘要</Text>
          </View>
          <View
            className={classnames(styles.exportBtn, styles.exportBtnPrimary)}
            onClick={handleGenerateShare}
          >
            <Text className={styles.exportBtnPrimaryText}>
              🖼️ 生成分享图片
            </Text>
          </View>
        </View>
      </View>

      {showShareModal && (
        <View className={styles.shareModalOverlay} onClick={handleCloseShareModal}>
          <View
            className={styles.shareModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <ScrollView scrollY className={styles.shareScroll}>
              <View className={styles.shareCard}>
                <View className={styles.shareHeader}>
                  <Text className={styles.shareLogo}>💰</Text>
                  <Text className={styles.shareAppName}>小消费记账</Text>
                  <Text className={styles.shareDate}>
                    {shareImageData.dateRange}
                  </Text>
                </View>

                <View className={styles.shareAmount}>
                  <Text className={styles.shareAmountLabel}>本月总支出</Text>
                  <Text className={styles.shareAmountValue}>
                    ¥{formatAmount(shareImageData.total)}
                  </Text>
                </View>

                <View className={styles.shareStats}>
                  <View className={styles.shareStatItem}>
                    <Text className={styles.shareStatNum}>
                      {shareImageData.dailyAvg}
                    </Text>
                    <Text className={styles.shareStatLabel}>日均</Text>
                  </View>
                  <View className={styles.shareStatDivider} />
                  <View className={styles.shareStatItem}>
                    <Text className={styles.shareStatNumOrange}>
                      {shareImageData.impulseCount}
                    </Text>
                    <Text className={styles.shareStatLabel}>冲动消费</Text>
                  </View>
                  <View className={styles.shareStatDivider} />
                  <View className={styles.shareStatItem}>
                    <Text className={styles.shareStatNumGreen}>
                      {shareImageData.fixedRatio}%
                    </Text>
                    <Text className={styles.shareStatLabel}>固定支出</Text>
                  </View>
                </View>

                <Text className={styles.shareSectionTitle}>TOP 分类</Text>
                <View className={styles.shareCategoryList}>
                  {shareImageData.topCategories.map((cat) => (
                    <View key={cat.category} className={styles.shareCategoryItem}>
                      <Text className={styles.shareCategoryIcon}>
                        {getCategoryIcon(cat.category)}
                      </Text>
                      <Text className={styles.shareCategoryName}>
                        {getCategoryLabel(cat.category)}
                      </Text>
                      <View className={styles.shareCategoryProgress}>
                        <View
                          className={styles.shareCategoryProgressFill}
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </View>
                      <Text className={styles.shareCategoryAmount}>
                        ¥{formatAmount(cat.amount)}
                      </Text>
                    </View>
                  ))}
                </View>

                <View className={styles.shareInsightBox}>
                  <Text className={styles.shareInsightLabel}>💡 消费洞察</Text>
                  <Text className={styles.shareInsightText}>
                    {shareImageData.insight}
                  </Text>
                </View>

                <View className={styles.shareFooter}>
                  <Text className={styles.shareSlogan}>
                    记录每一笔，让每一分钱都更有价值
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View className={styles.shareModalBtns}>
              <View
                className={styles.shareModalCancel}
                onClick={handleCloseShareModal}
              >
                <Text className={styles.shareModalCancelText}>关闭</Text>
              </View>
              <View
                className={styles.shareModalSave}
                onClick={handleSaveShare}
              >
                <Text className={styles.shareModalSaveText}>保存到相册</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default ReviewPage;
