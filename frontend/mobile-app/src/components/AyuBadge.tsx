import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { styles } from './AyuBadge.styles';

interface AyuBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const AyuBadge: React.FC<AyuBadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  style,
  textStyle,
}) => {
  const badgeStyles = [
    styles.badge,
    styles[`badge_${variant}`],
    styles[`badge_${size}`],
    style,
  ].filter(Boolean);

  const textStyles = [
    styles.badgeText,
    styles[`badgeText_${variant}`],
    styles[`badgeText_${size}`],
    textStyle,
  ].filter(Boolean);

  return (
    <View style={badgeStyles}>
      <Text style={textStyles}>
        {children}
      </Text>
    </View>
  );
};

export default AyuBadge;
