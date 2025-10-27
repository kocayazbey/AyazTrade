import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Base card styles
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  
  // Card variants
  card_default: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  
  card_elevated: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  
  card_outlined: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  
  // Card sizes
  card_sm: {
    padding: 16,
  },
  
  card_md: {
    padding: 20,
  },
  
  card_lg: {
    padding: 24,
  },
  
  // Card header
  cardHeader: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    marginHorizontal: -20,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  
  cardSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  
  // Card body
  cardBody: {
    color: '#1e293b',
  },
});
