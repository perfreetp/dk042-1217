import React, { useState } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useExpenseStore } from '@/store/useExpenseStore';
import { CATEGORY_CONFIG, PAYMENT_CONFIG, MOOD_CONFIG, TEMPLATE_CONFIG } from '@/utils/helpers';
import type { ExpenseCategory, PaymentMethod, MoodType } from '@/types/expense';
import styles from './index.module.scss';

const RecordPage: React.FC = () => {
  const addExpense = useExpenseStore((s) => s.addExpense);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('dining');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wechat');
  const [mood, setMood] = useState<MoodType>('calm');
  const [isNecessary, setIsNecessary] = useState(true);
  const [isImpulse, setIsImpulse] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [activeTemplate, setActiveTemplate] = useState<number | null>(null);

  const handleTemplateClick = (index: number) => {
    const tpl = TEMPLATE_CONFIG[index];
    setActiveTemplate(index);
    setCategory(tpl.category);
    setAmount(String(tpl.defaultAmount));
  };

  const handleSubmit = () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      Taro.showToast({ title: '请输入金额', icon: 'none' });
      return;
    }
    if (!merchant.trim()) {
      Taro.showToast({ title: '请输入商家名称', icon: 'none' });
      return;
    }

    addExpense({
      amount: amountNum,
      category,
      paymentMethod,
      mood,
      isNecessary,
      isImpulse,
      isFixed,
      merchant: merchant.trim(),
      note: note.trim(),
      date: new Date().toISOString().split('T')[0],
    });

    Taro.showToast({ title: '记录成功', icon: 'success' });

    setAmount('');
    setMerchant('');
    setNote('');
    setActiveTemplate(null);
    setIsNecessary(true);
    setIsImpulse(false);
    setIsFixed(false);
  };

  return (
    <View className={styles.container}>
      <Text className={classnames(styles.sectionTitle, styles.sectionTitleFirst)}>快捷模板</Text>
      <ScrollView scrollX className={styles.templateScroll}>
        <View className={styles.templates}>
          {TEMPLATE_CONFIG.map((tpl, index) => (
            <View
              key={index}
              className={classnames(styles.templateBtn, activeTemplate === index && styles.templateBtnActive)}
              onClick={() => handleTemplateClick(index)}
            >
              <Text className={styles.templateIcon}>{tpl.icon}</Text>
              <Text
                className={classnames(
                  styles.templateLabel,
                  activeTemplate === index && styles.templateLabelActive
                )}
              >
                {tpl.label}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Text className={styles.sectionTitle}>金额</Text>
      <View className={styles.amountCard}>
        <View className={styles.amountRow}>
          <Text className={styles.amountSymbol}>¥</Text>
          <Input
            className={styles.amountInput}
            type="digit"
            placeholder="0.00"
            value={amount}
            onInput={(e) => setAmount(e.detail.value)}
          />
        </View>
      </View>

      <Text className={styles.sectionTitle}>分类</Text>
      <View className={styles.categoryGrid}>
        {CATEGORY_CONFIG.map((cat) => (
          <View
            key={cat.key}
            className={classnames(styles.categoryItem, category === cat.key && styles.categoryItemActive)}
            onClick={() => setCategory(cat.key)}
          >
            <Text className={styles.categoryIcon}>{cat.icon}</Text>
            <Text
              className={classnames(styles.categoryLabel, category === cat.key && styles.categoryLabelActive)}
            >
              {cat.label}
            </Text>
          </View>
        ))}
      </View>

      <Text className={styles.sectionTitle}>详细信息</Text>
      <View className={styles.detailCard}>
        <View className={styles.detailRow}>
          <Text className={styles.detailLabel}>商家</Text>
          <Input
            className={styles.noteInput}
            placeholder="输入商家名称"
            value={merchant}
            onInput={(e) => setMerchant(e.detail.value)}
            style={{ width: '400rpx', marginTop: 0, background: 'transparent', padding: 0, textAlign: 'right' }}
          />
        </View>

        <View className={styles.detailRow}>
          <Text className={styles.detailLabel}>支付方式</Text>
          <View className={styles.paymentOptions}>
            {PAYMENT_CONFIG.map((p) => (
              <View
                key={p.key}
                className={classnames(styles.paymentBtn, paymentMethod === p.key && styles.paymentBtnActive)}
                onClick={() => setPaymentMethod(p.key as PaymentMethod)}
              >
                <Text
                  className={classnames(
                    styles.paymentBtnText,
                    paymentMethod === p.key && styles.paymentBtnTextActive
                  )}
                >
                  {p.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.detailRow}>
          <Text className={styles.detailLabel}>消费心情</Text>
          <View className={styles.moodOptions}>
            {MOOD_CONFIG.map((m) => (
              <View
                key={m.key}
                className={classnames(styles.moodBtn, mood === m.key && styles.moodBtnActive)}
                onClick={() => setMood(m.key as MoodType)}
              >
                <Text
                  className={classnames(styles.moodBtnText, mood === m.key && styles.moodBtnTextActive)}
                >
                  {m.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.detailRow}>
          <Text className={styles.detailLabel}>必要消费</Text>
          <View className={styles.toggleRow}>
            <View
              className={classnames(styles.toggleBtn, isNecessary && styles.toggleBtnActive)}
              onClick={() => setIsNecessary(!isNecessary)}
            >
              <View className={classnames(styles.toggleDot, isNecessary && styles.toggleDotActive)} />
            </View>
          </View>
        </View>

        <View className={styles.detailRow}>
          <Text className={styles.detailLabel}>冲动消费</Text>
          <View className={styles.toggleRow}>
            <View
              className={classnames(styles.toggleBtn, isImpulse && styles.toggleBtnActive)}
              onClick={() => setIsImpulse(!isImpulse)}
            >
              <View className={classnames(styles.toggleDot, isImpulse && styles.toggleDotActive)} />
            </View>
          </View>
        </View>

        <View className={styles.detailRow}>
          <Text className={styles.detailLabel}>固定支出</Text>
          <View className={styles.toggleRow}>
            <View
              className={classnames(styles.toggleBtn, isFixed && styles.toggleBtnActive)}
              onClick={() => setIsFixed(!isFixed)}
            >
              <View className={classnames(styles.toggleDot, isFixed && styles.toggleDotActive)} />
            </View>
          </View>
        </View>

        <Input
          className={styles.noteInput}
          placeholder="添加备注..."
          value={note}
          onInput={(e) => setNote(e.detail.value)}
        />
      </View>

      <View className={styles.submitBtn}>
        <View className={styles.submitInner} onClick={handleSubmit}>
          <Text className={styles.submitText}>记一笔</Text>
        </View>
      </View>
    </View>
  );
};

export default RecordPage;
