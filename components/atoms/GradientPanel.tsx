import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export default function GradientCard({ children, style, padding = 16 }: GradientCardProps) {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={['rgba(45, 60, 80, 0.6)', 'rgba(20, 25, 35, 0.6)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      />
      <View style={[styles.content, { padding }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
