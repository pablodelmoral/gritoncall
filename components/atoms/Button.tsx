import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '@/constants/colors';

type ButtonVariant = 'primary' | 'secondary' | 'outline';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function Button({ 
  title, 
  onPress, 
  variant = 'primary', 
  disabled = false,
  style 
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primaryButton,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'outline' && styles.outlineButton,
        disabled && styles.disabledButton,
        pressed && styles.pressedButton,
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'primary' && styles.primaryText,
          variant === 'secondary' && styles.secondaryText,
          variant === 'outline' && styles.outlineText,
          disabled && styles.disabledText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.red,
  },
  secondaryButton: {
    backgroundColor: '#233551',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.red,
  },
  disabledButton: {
    opacity: 0.5,
  },
  pressedButton: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Akira-Extended',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  primaryText: {
    color: '#000000',
  },
  secondaryText: {
    color: '#000000',
  },
  outlineText: {
    color: Colors.red,
  },
  disabledText: {
    color: '#666666',
  },
});
