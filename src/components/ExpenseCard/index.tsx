import React from 'react';
import { View, Text } from '@tarojs/components';
import type { Expense } from '@/types/expense';
import { getCategoryIcon, getCategoryLabel, getPaymentLabel, getMoodLabel, formatAmount } from '@/utils/helpers';
import styles from './index.module.scss';

interface ExpenseCardProps {
  expense: Expense;
  onDelete?: (id: string) => void;
  showDelete?: boolean;
}

const ExpenseCard: React.FC<ExpenseCardProps> = ({ expense, onDelete, showDelete = false }) => {
  return (
    <View className={styles.card}>
      <View className={styles.iconWrap}>
        <Text className={styles.icon}>{getCategoryIcon(expense.category)}</Text>
      </View>
      <View className={styles.info}>
        <View className={styles.topRow}>
          <Text className={styles.merchant}>{expense.merchant}</Text>
          <Text className={styles.amount}>-¥{formatAmount(expense.amount)}</Text>
        </View>
        <View className={styles.bottomRow}>
          <Text className={styles.category}>{getCategoryLabel(expense.category)}</Text>
          <Text className={styles.dot}>·</Text>
          <Text className={styles.payment}>{getPaymentLabel(expense.paymentMethod)}</Text>
          <Text className={styles.dot}>·</Text>
          <Text className={styles.mood}>{getMoodLabel(expense.mood)}</Text>
          {expense.isImpulse && (
            <View className={styles.impulseTag}>
              <Text className={styles.impulseText}>冲动</Text>
            </View>
          )}
        </View>
        {expense.note ? (
          <Text className={styles.note}>{expense.note}</Text>
        ) : null}
      </View>
      {showDelete && onDelete && (
        <View className={styles.deleteBtn} onClick={() => onDelete(expense.id)}>
          <Text className={styles.deleteText}>删除</Text>
        </View>
      )}
    </View>
  );
};

export default ExpenseCard;
