import React from 'react';
import { View, Text } from '@tarojs/components';
import dayjs from 'dayjs';
import type { DailySpending } from '@/types/expense';
import { getHeatLevel } from '@/utils/helpers';
import styles from './index.module.scss';

interface HeatMapProps {
  data: DailySpending[];
  year: number;
  month: number;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const HeatMap: React.FC<HeatMapProps> = ({ data, year, month }) => {
  const firstDay = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);
  const daysInMonth = firstDay.daysInMonth();
  const startDayOfWeek = firstDay.day();
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);

  const cells: Array<{ type: 'empty' | 'day'; day?: number; level?: number; amount?: number }> = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push({ type: 'empty' });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayData = data.find((item) => item.date === dateStr);
    const amount = dayData?.amount || 0;
    cells.push({
      type: 'day',
      day: d,
      level: getHeatLevel(amount, maxAmount),
      amount,
    });
  }

  return (
    <View className={styles.container}>
      <View className={styles.weekHeader}>
        {WEEKDAYS.map((w) => (
          <Text key={w} className={styles.weekLabel}>{w}</Text>
        ))}
      </View>
      <View className={styles.grid}>
        {cells.map((cell, index) => (
          <View
            key={index}
            className={`${styles.cell} ${cell.type === 'empty' ? styles.cellEmpty : ''} ${
              cell.type === 'day' ? styles[`heat${cell.level}`] : ''
            }`}
          >
            {cell.type === 'day' && (
              <Text className={styles.cellText}>{cell.day}</Text>
            )}
          </View>
        ))}
      </View>
      <View className={styles.legend}>
        <Text className={styles.legendLabel}>少</Text>
        <View className={`${styles.legendBlock} ${styles.heat0}`} />
        <View className={`${styles.legendBlock} ${styles.heat1}`} />
        <View className={`${styles.legendBlock} ${styles.heat2}`} />
        <View className={`${styles.legendBlock} ${styles.heat3}`} />
        <View className={`${styles.legendBlock} ${styles.heat4}`} />
        <View className={`${styles.legendBlock} ${styles.heat5}`} />
        <Text className={styles.legendLabel}>多</Text>
      </View>
    </View>
  );
};

export default HeatMap;
