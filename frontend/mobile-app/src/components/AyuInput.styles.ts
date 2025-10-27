import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Input group container
  inputGroup: {
    marginBottom: 24,
  },
  
  // Label styles
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  
  required: {
    color: '#ef4444',
    fontWeight: '600',
  },
  
  // Base input styles
  input: {
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#ffffff',
    minHeight: 48,
  },
  
  input_focused: {
    borderColor: '#1e3a8a',
    shadowColor: '#1e3a8a',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  
  input_error: {
    borderColor: '#ef4444',
  },
  
  input_disabled: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    opacity: 0.6,
  },
  
  // Input variants
  input_default: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
  },
  
  input_filled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  
  input_outlined: {
    backgroundColor: 'transparent',
    borderColor: '#cbd5e1',
  },
  
  // Input sizes
  input_sm: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 40,
  },
  
  input_md: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    minHeight: 48,
  },
  
  input_lg: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    fontSize: 18,
    minHeight: 56,
  },
  
  // Error and help text
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  
  helpText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
});
