import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { styles } from './AyuCard.styles';

interface AyuCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
}

const AyuCard: React.FC<AyuCardProps> = ({
  children,
  title,
  subtitle,
  style,
  variant = 'default',
  size = 'md',
}) => {
  const cardStyles = [
    styles.card,
    styles[`card_${variant}`],
    styles[`card_${size}`],
    style,
  ].filter(Boolean);

  return (
    <View style={cardStyles}>
      {(title || subtitle) && (
        <View style={styles.cardHeader}>
          {title && (
            <Text style={styles.cardTitle}>{title}</Text>
          )}
          {subtitle && (
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
          )}
        </View>
      )}
      
      <View style={styles.cardBody}>
        {children}
      </View>
    </View>
  );
};

export default AyuCard;
