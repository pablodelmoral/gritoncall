import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { Colors } from '@/constants/colors';

type TypographyVariant = 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';

interface TypographyProps {
  variant?: TypographyVariant;
  children: React.ReactNode;
  style?: TextStyle;
  color?: string;
}

export default function Typography({ 
  variant = 'body', 
  children, 
  style,
  color 
}: TypographyProps) {
  return (
    <Text
      style={[
        styles.base,
        variant === 'h1' && styles.h1,
        variant === 'h2' && styles.h2,
        variant === 'h3' && styles.h3,
        variant === 'body' && styles.body,
        variant === 'caption' && styles.caption,
        variant === 'label' && styles.label,
        color && { color },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: Colors.white,
  },
  h1: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
    color: Colors.white,
  },
  h2: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
    color: Colors.white,
  },
  h3: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.lightGray,
  },
  caption: {
    fontSize: 12,
    color: Colors.lightGray,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.red,
  },
});
