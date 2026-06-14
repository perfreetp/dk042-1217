import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, Input, ScrollView, Canvas, Image } from '@tarojs/components';
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
  getCategoryColor,
} from '@/utils/helpers';
import ExpenseCard from '@/components/ExpenseCard';
import styles from './index.module.scss';

const ReviewPage: React.FC = () => {
  const expenses = useExpenseStore((s) => s.expenses);
  const initialize = useExpenseStore((s) => s.initialize);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedImagePath, setSavedImagePath] = useState('');
  const [reviewQuestions] = useState(() => generateReviewQuestions());
  const canvasRef = useRef<any>(null);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    const handleSetKeyword = (event: any) => {
      const keyword = event.detail;
      if (keyword) {
        setSearchKeyword(keyword);
      }
    };
    window.addEventListener('setSearchKeyword', handleSetKeyword);
    return () => {
      window.removeEventListener('setSearchKeyword', handleSetKeyword);
    };
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
    setSaveSuccess(false);
    setSavedImagePath('');
  };

  const handleCloseShareModal = () => {
    setShowShareModal(false);
    setSaveSuccess(false);
    setSavedImagePath('');
  };

  const drawShareImage = useCallback(
    (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
      const padding = 48;
      const contentWidth = canvasWidth - padding * 2;
      let currentY = padding;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      ctx.fillStyle = '#10B981';
      ctx.fillRect(0, 0, canvasWidth, 8);

      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💰 小消费记账', canvasWidth / 2, currentY + 40);
      currentY += 60;

      ctx.fillStyle = '#9CA3AF';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(shareImageData.dateRange, canvasWidth / 2, currentY + 28);
      currentY += 56;

      ctx.fillStyle = '#F9FAFB';
      ctx.fillRect(padding, currentY, contentWidth, 160);
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 2;
      ctx.strokeRect(padding, currentY, contentWidth, 160);

      ctx.fillStyle = '#6B7280';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('本月总支出', canvasWidth / 2, currentY + 40);

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 56px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`¥${formatAmount(shareImageData.total)}`, canvasWidth / 2, currentY + 104);
      currentY += 200;

      const statItemWidth = contentWidth / 3;
      const statY = currentY;

      const drawStatItem = (x: number, value: string, label: string, color: string) => {
        ctx.fillStyle = color;
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(value, x, statY + 40);

        ctx.fillStyle = '#6B7280';
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, statY + 72);
      };

      drawStatItem(padding + statItemWidth / 2, `¥${shareImageData.dailyAvg}`, '日均', '#111827');
      drawStatItem(
        padding + statItemWidth * 1.5,
        `${shareImageData.impulseCount}笔`,
        '冲动消费',
        '#F97316'
      );
      drawStatItem(
        padding + statItemWidth * 2.5,
        `${shareImageData.fixedRatio}%`,
        '固定支出',
        '#10B981'
      );
      currentY += 120;

      ctx.fillStyle = '#F3F4F6';
      ctx.fillRect(padding, currentY, contentWidth, 2);
      currentY += 40;

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('TOP 分类', padding, currentY + 28);
      currentY += 56;

      shareImageData.topCategories.forEach((cat, index) => {
        const icon = getCategoryIcon(cat.category);
        const name = getCategoryLabel(cat.category);
        const color = getCategoryColor(cat.category);

        ctx.font = '32px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(icon, padding, currentY + 24);

        ctx.fillStyle = '#374151';
        ctx.font = '26px sans-serif';
        ctx.fillText(name, padding + 44, currentY + 24);

        const progressX = padding + 160;
        const progressWidth = contentWidth - 280;
        const progressHeight = 16;
        const progressY = currentY + 14;

        ctx.fillStyle = '#F3F4F6';
        ctx.fillRect(progressX, progressY, progressWidth, progressHeight);

        ctx.fillStyle = color;
        const fillWidth = Math.max((cat.percentage / 100) * progressWidth, 4);
        ctx.fillRect(progressX, progressY, fillWidth, progressHeight);

        ctx.fillStyle = '#111827';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`¥${formatAmount(cat.amount)}`, canvasWidth - padding, currentY + 24);

        currentY += 56;
      });
      currentY += 16;

      ctx.fillStyle = '#ECFDF5';
      ctx.fillRect(padding, currentY, contentWidth, 120);
      ctx.strokeStyle = '#A7F3D0';
      ctx.lineWidth = 2;
      ctx.strokeRect(padding, currentY, contentWidth, 120);

      ctx.fillStyle = '#10B981';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('💡 消费洞察', padding + 24, currentY + 40);

      ctx.fillStyle = '#065F46';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'left';

      const maxWidth = contentWidth - 48;
      const words = shareImageData.insight.split('');
      let line = '';
      let lineY = currentY + 76;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, padding + 24, lineY);
          line = words[n];
          lineY += 32;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, padding + 24, lineY);
      currentY += 152;

      ctx.fillStyle = '#9CA3AF';
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('记录每一笔，让每一分钱都更有价值', canvasWidth / 2, currentY + 28);

      ctx.fillStyle = '#10B981';
      ctx.globalAlpha = 0.1;
      ctx.fillRect(0, canvasHeight - 8, canvasWidth, 8);
      ctx.globalAlpha = 1;
    },
    [shareImageData]
  );

  const handleSaveShare = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const canvasWidth = 750;
      const canvasHeight = 1200;

      const query = Taro.createSelectorQuery();
      query
        .select('#shareCanvas')
        .fields({ node: true, size: true })
        .exec(async (res) => {
          try {
            if (!res || !res[0]) {
              throw new Error('Canvas 未找到');
            }

            const canvas = res[0].node;
            const ctx = canvas.getContext('2d');

            const dpr = Taro.getSystemInfoSync().pixelRatio;
            canvas.width = canvasWidth * dpr;
            canvas.height = canvasHeight * dpr;
            ctx.scale(dpr, dpr);

            drawShareImage(ctx, canvasWidth, canvasHeight);

            await new Promise((resolve) => setTimeout(resolve, 500));

            Taro.canvasToTempFilePath({
              canvas,
              width: canvasWidth,
              height: canvasHeight,
              destWidth: canvasWidth * 2,
              destHeight: canvasHeight * 2,
              success: (fileRes) => {
                const tempFilePath = fileRes.tempFilePath;
                Taro.saveImageToPhotosAlbum({
                  filePath: tempFilePath,
                  success: () => {
                    setSavedImagePath(tempFilePath);
                    setSaveSuccess(true);
                    setIsSaving(false);
                    Taro.showToast({
                      title: '保存成功！',
                      icon: 'success',
                      duration: 2000,
                    });
                  },
                  fail: (saveErr) => {
                    console.error('[Review] Failed to save image:', saveErr);
                    setIsSaving(false);
                    if (saveErr.errMsg && saveErr.errMsg.includes('auth deny')) {
                      Taro.showModal({
                        title: '需要相册权限',
                        content: '请在设置中开启相册权限后重试',
                        confirmText: '去设置',
                        success: (modalRes) => {
                          if (modalRes.confirm) {
                            Taro.openSetting();
                          }
                        },
                      });
                    } else {
                      Taro.showToast({
                        title: '保存失败，请重试',
                        icon: 'none',
                      });
                    }
                  },
                });
              },
              fail: (canvasErr) => {
                console.error('[Review] Failed to generate image:', canvasErr);
                setIsSaving(false);
                Taro.showToast({
                  title: '生成图片失败，请重试',
                  icon: 'none',
                });
              },
            });
          } catch (err) {
            console.error('[Review] Canvas error:', err);
            setIsSaving(false);
            Taro.showToast({
              title: '生成图片失败，请重试',
              icon: 'none',
            });
          }
        });
    } catch (err) {
      console.error('[Review] Save error:', err);
      setIsSaving(false);
      Taro.showToast({
        title: '保存失败，请重试',
        icon: 'none',
      });
    }
  }, [isSaving, drawShareImage]);

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
              {saveSuccess && savedImagePath ? (
                <View className={styles.shareSuccessWrap}>
                  <View className={styles.shareSuccessIcon}>✓</View>
                  <Text className={styles.shareSuccessTitle}>保存成功！</Text>
                  <Text className={styles.shareSuccessDesc}>
                    图片已保存到相册，快去分享给朋友吧
                  </Text>
                  <Image
                    className={styles.shareSuccessPreview}
                    src={savedImagePath}
                    mode="widthFix"
                  />
                  <View className={styles.shareSuccessTips}>
                    <Text className={styles.shareSuccessTip}>
                      💡 打开相册即可找到刚才保存的图片
                    </Text>
                    <Text className={styles.shareSuccessTip}>
                      📱 可以直接转发到微信、朋友圈
                    </Text>
                  </View>
                </View>
              ) : (
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
              )}
            </ScrollView>

            <View className={styles.shareModalBtns}>
              {saveSuccess ? (
                <>
                  <View
                    className={styles.shareModalCancel}
                    onClick={handleCloseShareModal}
                  >
                    <Text className={styles.shareModalCancelText}>关闭</Text>
                  </View>
                  <View
                    className={styles.shareModalSave}
                    onClick={handleGenerateShare}
                  >
                    <Text className={styles.shareModalSaveText}>重新生成</Text>
                  </View>
                </>
              ) : (
                <>
                  <View
                    className={styles.shareModalCancel}
                    onClick={handleCloseShareModal}
                  >
                    <Text className={styles.shareModalCancelText}>关闭</Text>
                  </View>
                  <View
                    className={classnames(
                      styles.shareModalSave,
                      isSaving && styles.shareModalSaveDisabled
                    )}
                    onClick={handleSaveShare}
                  >
                    <Text className={styles.shareModalSaveText}>
                      {isSaving ? '生成中...' : '保存到相册'}
                    </Text>
                  </View>
                </>
              )}
            </View>

            <Canvas
              id="shareCanvas"
              type="2d"
              style={{
                position: 'absolute',
                left: '-9999px',
                top: '-9999px',
                width: '750px',
                height: '1200px',
              }}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default ReviewPage;
