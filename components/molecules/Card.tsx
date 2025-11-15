import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import Typography from '../atoms/Typography';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function Card({ title, children, style }: CardProps) {
  return (
    <View style={[styles.card, style]}>
      {title && (
        <Typography variant="label" style={styles.title}>
          {title}
        </Typography>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.darkBlue,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    marginBottom: 12,
  },
});
