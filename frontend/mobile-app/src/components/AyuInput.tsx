import React, { useState } from 'react';
import { View, TextInput, Text, ViewStyle, TextStyle } from 'react-native';
import { styles } from './AyuInput.styles';

interface AyuInputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel';
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  help?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outlined';
  style?: ViewStyle;
  inputStyle?: TextStyle;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
}

const AyuInput: React.FC<AyuInputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChangeText,
  onBlur,
  onFocus,
  disabled = false,
  required = false,
  error,
  help,
  label,
  size = 'md',
  variant = 'default',
  style,
  inputStyle,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const getKeyboardType = () => {
    if (keyboardType !== 'default') return keyboardType;
    switch (type) {
      case 'email': return 'email-address';
      case 'number': return 'numeric';
      case 'tel': return 'phone-pad';
      default: return 'default';
    }
  };

  const inputStyles = [
    styles.input,
    styles[`input_${size}`],
    styles[`input_${variant}`],
    isFocused && styles.input_focused,
    error && styles.input_error,
    disabled && styles.input_disabled,
    inputStyle,
  ].filter(Boolean);

  return (
    <View style={[styles.inputGroup, style]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <TextInput
        style={inputStyles}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        editable={!disabled}
        secureTextEntry={secureTextEntry || type === 'password'}
        keyboardType={getKeyboardType()}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
      />
      
      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
      
      {help && !error && (
        <Text style={styles.helpText}>
          {help}
        </Text>
      )}
    </View>
  );
};

export default AyuInput;
