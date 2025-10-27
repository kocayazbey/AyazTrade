import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Base button styles
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    minHeight: 48,
  },
  
  button_fullWidth: {
    width: '100%',
  },
  
  button_disabled: {
    opacity: 0.5,
  },
  
  // Button variants
  button_primary: {
    backgroundColor: '#1e3a8a',
  },
  
  button_secondary: {
    backgroundColor: '#64748b',
  },
  
  button_accent: {
    backgroundColor: '#f97316',
  },
  
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#1e3a8a',
  },
  
  button_ghost: {
    backgroundColor: 'transparent',
  },
  
  // Button sizes
  button_sm: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 40,
  },
  
  button_md: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    minHeight: 48,
  },
  
  button_lg: {
    paddingHorizontal: 32,
    paddingVertical: 20,
    minHeight: 56,
  },
  
  // Button text styles
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  buttonText_primary: {
    color: '#ffffff',
  },
  
  buttonText_secondary: {
    color: '#ffffff',
  },
  
  buttonText_accent: {
    color: '#ffffff',
  },
  
  buttonText_outline: {
    color: '#1e3a8a',
  },
  
  buttonText_ghost: {
    color: '#64748b',
  },
  
  buttonText_disabled: {
    opacity: 0.7,
  },
  
  // Button text sizes
  buttonText_sm: {
    fontSize: 14,
  },
  
  buttonText_md: {
    fontSize: 16,
  },
  
  buttonText_lg: {
    fontSize: 18,
  },
  
  // Loading spinner
  loadingSpinner: {
    marginRight: 8,
  },
});
