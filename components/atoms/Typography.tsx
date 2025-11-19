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
    color: '#CCCCCC',
  },
  h1: {
    fontSize: 28,
    fontFamily: 'Akira-Extended',
    letterSpacing: 2,
    color: '#EEEEEE',
  },
  h2: {
    fontSize: 20,
    fontFamily: 'Akira-Extended',
    letterSpacing: 1,
    color: '#EEEEEE',
  },
  h3: {
    fontSize: 16,
    fontFamily: 'Akira-Extended',
    color: '#EEEEEE',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#CCCCCC',
  },
  caption: {
    fontSize: 12,
    color: '#888888',
  },
  label: {
    fontSize: 12,
    fontFamily: 'Akira-Extended',
    letterSpacing: 0.5,
    color: Colors.red,
  },
});
