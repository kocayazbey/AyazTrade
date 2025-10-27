import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Base badge styles
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 24,
  },
  
  // Badge variants
  badge_default: {
    backgroundColor: '#64748b',
  },
  
  badge_success: {
    backgroundColor: '#10b981',
  },
  
  badge_warning: {
    backgroundColor: '#f59e0b',
  },
  
  badge_error: {
    backgroundColor: '#ef4444',
  },
  
  badge_info: {
    backgroundColor: '#3b82f6',
  },
  
  badge_accent: {
    backgroundColor: '#f97316',
  },
  
  // Badge sizes
  badge_sm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 20,
    borderRadius: 16,
  },
  
  badge_md: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 24,
    borderRadius: 20,
  },
  
  badge_lg: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 28,
    borderRadius: 24,
  },
  
  // Badge text styles
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  badgeText_default: {
    color: '#ffffff',
  },
  
  badgeText_success: {
    color: '#ffffff',
  },
  
  badgeText_warning: {
    color: '#ffffff',
  },
  
  badgeText_error: {
    color: '#ffffff',
  },
  
  badgeText_info: {
    color: '#ffffff',
  },
  
  badgeText_accent: {
    color: '#ffffff',
  },
  
  // Badge text sizes
  badgeText_sm: {
    fontSize: 10,
  },
  
  badgeText_md: {
    fontSize: 12,
  },
  
  badgeText_lg: {
    fontSize: 14,
  },
});
