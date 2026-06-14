import React from 'react';
import { View, Text } from '@tarojs/components';
import type { CategorySpending } from '@/types/expense';
import { getCategoryLabel, getCategoryColor, getCategoryIcon, formatAmount } from '@/utils/helpers';
import styles from './index.module.scss';

interface CategoryBarProps {
  data: CategorySpending[];
  total: number;
}

const CategoryBar: React.FC<CategoryBarProps> = ({ data, total }) => {
  return (
    <View className={styles.container}>
      <View className={styles.barWrap}>
        {data.map((item) => {
          const color = getCategoryColor(item.category);
          return (
            <View
              key={item.category}
              className={styles.barSegment}
              style={{ width: `${item.percentage}%`, backgroundColor: color }}
            />
          );
        })}
      </View>
      <View className={styles.list}>
        {data.map((item) => {
          const color = getCategoryColor(item.category);
          const icon = getCategoryIcon(item.category);
          const label = getCategoryLabel(item.category);
          return (
            <View key={item.category} className={styles.item}>
              <View className={styles.itemLeft}>
                <View className={styles.iconDot} style={{ backgroundColor: color }}>
                  <Text className={styles.iconText}>{icon}</Text>
                </View>
                <View className={styles.itemInfo}>
                  <Text className={styles.itemLabel}>{label}</Text>
                  <Text className={styles.itemCount}>{item.count}笔</Text>
                </View>
              </View>
              <View className={styles.itemRight}>
                <Text className={styles.itemAmount}>¥{formatAmount(item.amount)}</Text>
                <Text className={styles.itemPercent}>{item.percentage}%</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default CategoryBar;
