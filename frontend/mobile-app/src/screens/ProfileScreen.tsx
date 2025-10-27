import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { AyuCard, AyuButton, AyuInput, AyuBadge } from '../components';

const { width } = Dimensions.get('window');

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  preferences: {
    notifications: boolean;
    newsletter: boolean;
    language: string;
    currency: string;
  };
  stats: {
    totalOrders: number;
    totalSpent: number;
    memberSince: string;
  };
}

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  onPress: () => void;
  badge?: string;
  showArrow?: boolean;
}

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/user/profile');
      const data = await response.json();
      
      if (data.success) {
        setProfile(data.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Hata', 'Profil bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch('/api/v1/auth/logout', { method: 'POST' });
              navigation.navigate('Login');
            } catch (error) {
              console.error('Error logging out:', error);
              navigation.navigate('Login');
            }
          },
        },
      ]
    );
  };

  const menuItems: MenuItem[] = [
    {
      id: 'orders',
      title: 'Siparişlerim',
      icon: 'shopping-bag',
      onPress: () => navigation.navigate('Orders'),
      showArrow: true,
    },
    {
      id: 'favorites',
      title: 'Favorilerim',
      icon: 'favorite',
      onPress: () => navigation.navigate('Favorites'),
      showArrow: true,
    },
    {
      id: 'addresses',
      title: 'Adreslerim',
      icon: 'location-on',
      onPress: () => navigation.navigate('Addresses'),
      showArrow: true,
    },
    {
      id: 'payment-methods',
      title: 'Ödeme Yöntemlerim',
      icon: 'credit-card',
      onPress: () => navigation.navigate('PaymentMethods'),
      showArrow: true,
    },
    {
      id: 'notifications',
      title: 'Bildirimler',
      icon: 'notifications',
      onPress: () => navigation.navigate('Notifications'),
      showArrow: true,
    },
    {
      id: 'settings',
      title: 'Ayarlar',
      icon: 'settings',
      onPress: () => navigation.navigate('Settings'),
      showArrow: true,
    },
    {
      id: 'help',
      title: 'Yardım & Destek',
      icon: 'help',
      onPress: () => navigation.navigate('Help'),
      showArrow: true,
    },
    {
      id: 'about',
      title: 'Hakkında',
      icon: 'info',
      onPress: () => navigation.navigate('About'),
      showArrow: true,
    },
  ];

  const renderProfileHeader = () => (
    <AyuCard style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {profile?.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon name="person" size={32} color="#64748b" />
            </View>
          )}
          <TouchableOpacity style={styles.editAvatarButton}>
            <Icon name="camera-alt" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {profile?.firstName} {profile?.lastName}
          </Text>
          <Text style={styles.profileEmail}>{profile?.email}</Text>
          <AyuBadge variant="success" size="sm">
            Üye
          </AyuBadge>
        </View>
        
        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Icon name="edit" size={16} color="#1e3a8a" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.profileStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.stats.totalOrders || 0}</Text>
          <Text style={styles.statLabel}>Sipariş</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>₺{profile?.stats.totalSpent?.toLocaleString() || 0}</Text>
          <Text style={styles.statLabel}>Harcama</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {profile?.stats.memberSince ? 
              new Date(profile.stats.memberSince).getFullYear() : 
              new Date().getFullYear()
            }
          </Text>
          <Text style={styles.statLabel}>Üyelik</Text>
        </View>
      </View>
    </AyuCard>
  );

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.menuItem}
      onPress={item.onPress}
    >
      <View style={styles.menuItemContent}>
        <View style={styles.menuItemLeft}>
          <View style={styles.menuItemIcon}>
            <Icon name={item.icon} size={20} color="#64748b" />
          </View>
          <Text style={styles.menuItemTitle}>{item.title}</Text>
          {item.badge && (
            <AyuBadge variant="accent" size="sm">
              {item.badge}
            </AyuBadge>
          )}
        </View>
        
        {item.showArrow && (
          <Icon name="chevron-right" size={20} color="#cbd5e1" />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderQuickActions = () => (
    <AyuCard style={styles.quickActionsCard}>
      <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
      
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('Orders')}
        >
          <View style={styles.quickActionIcon}>
            <Icon name="shopping-bag" size={24} color="#1e3a8a" />
          </View>
          <Text style={styles.quickActionText}>Siparişlerim</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('Favorites')}
        >
          <View style={styles.quickActionIcon}>
            <Icon name="favorite" size={24} color="#1e3a8a" />
          </View>
          <Text style={styles.quickActionText}>Favorilerim</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('Addresses')}
        >
          <View style={styles.quickActionIcon}>
            <Icon name="location-on" size={24} color="#1e3a8a" />
          </View>
          <Text style={styles.quickActionText}>Adreslerim</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('Settings')}
        >
          <View style={styles.quickActionIcon}>
            <Icon name="settings" size={24} color="#1e3a8a" />
          </View>
          <Text style={styles.quickActionText}>Ayarlar</Text>
        </TouchableOpacity>
      </View>
    </AyuCard>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Profil yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Icon name="logout" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderProfileHeader()}
        {renderQuickActions()}
        
        <AyuCard style={styles.menuCard}>
          <Text style={styles.sectionTitle}>Hesap</Text>
          {menuItems.map(renderMenuItem)}
        </AyuCard>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1e3a8a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  editProfileButton: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 16,
  },
  quickActionsCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quickAction: {
    width: (width - 64) / 2,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '500',
    textAlign: 'center',
  },
  menuCard: {
    marginBottom: 16,
  },
  menuItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemTitle: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
    flex: 1,
  },
});

export default ProfileScreen;