import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Share,
  Vibration,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import {
  AyuCard,
  AyuButton,
  AyuBadge,
  AyuInput
} from '../components';
import {
  setLoading,
  setError,
  setOrders,
  updateOrder,
  setFilters,
  cancelOrder,
  reorderItems,
  setRealTimeEnabled
} from '../store/slices/ordersSlice';
import apiService from '../services/api.service';
import realtimeService from '../services/realtime.service';

const { width } = Dimensions.get('window');

const OrdersScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  // Redux state
  const {
    orders,
    isLoading,
    error,
    filters,
    realTimeEnabled,
    lastSync
  } = useSelector((state: RootState) => state.orders);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showRealTimeToggle, setShowRealTimeToggle] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    initializeRealtimeService();
    fetchOrders();

    return () => {
      // Cleanup real-time subscriptions
      realtimeService.disconnect();
    };
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const initializeRealtimeService = async () => {
    try {
      const dispatch = useDispatch();
      await realtimeService.initialize(dispatch);
    } catch (error) {
      console.error('Failed to initialize real-time service:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));

      const params = {
        ...(filters.status && { status: filters.status }),
        ...(filters.dateRange && { dateRange: filters.dateRange }),
      };

      const data = await apiService.getOrders(params);
      
      if (data.success) {
        dispatch(setOrders(data.data.orders));
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      dispatch(setError(error.message || 'Siparişler yüklenirken bir hata oluştu.'));
    } finally {
      dispatch(setLoading(false));
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [filters]);

  const handleOrderPress = (order: any) => {
    dispatch(updateOrder(order)); // Set current order
    navigation.navigate('OrderDetail' as never, { orderId: order.id });
  };

  const handleReorder = async (orderId: string) => {
    try {
      Vibration.vibrate(50);
      const data = await apiService.reorderOrder(orderId);

      if (data.success) {
        Alert.alert('Başarılı', 'Ürünler sepete eklendi.');
        navigation.navigate('Cart' as never);
      } else {
        Alert.alert('Hata', data.message || 'Sipariş tekrarlanamadı.');
      }
    } catch (error: any) {
      console.error('Error reordering:', error);
      Alert.alert('Hata', error.message || 'Sipariş tekrarlanamadı.');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    Alert.alert(
      'Siparişi İptal Et',
      'Bu siparişi iptal etmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              Vibration.vibrate(100);
              const data = await apiService.cancelOrder(orderId);

              if (data.success) {
                dispatch(cancelOrder(orderId));
                Alert.alert('Başarılı', 'Sipariş iptal edildi.');
              } else {
                Alert.alert('Hata', data.message || 'Sipariş iptal edilemedi.');
              }
            } catch (error: any) {
              console.error('Error cancelling order:', error);
              Alert.alert('Hata', error.message || 'Sipariş iptal edilemedi.');
            }
          },
        },
      ]
    );
  };

  const handleShareOrder = async (order: any) => {
    try {
      const shareMessage = `Siparişim ${order.orderNumber} - ${order.status} - Toplam: ₺${order.totalAmount.toLocaleString()}`;
      await Share.share({
        message: shareMessage,
        title: 'Sipariş Paylaşımı',
      });
    } catch (error) {
      console.error('Error sharing order:', error);
    }
  };

  const handleToggleRealTime = async () => {
    try {
      if (realTimeEnabled) {
        await realtimeService.disableRealTimeTracking('');
        dispatch(setRealTimeEnabled(false));
        Alert.alert('Real-time Takip', 'Gerçek zamanlı takip devre dışı bırakıldı.');
      } else {
        const success = await realtimeService.enableRealTimeTracking('');
        if (success) {
          dispatch(setRealTimeEnabled(true));
          Alert.alert('Real-time Takip', 'Gerçek zamanlı takip aktifleştirildi.');
        } else {
          Alert.alert('Hata', 'Real-time takip aktifleştirilemedi.');
        }
      }
    } catch (error: any) {
      console.error('Error toggling real-time tracking:', error);
      Alert.alert('Hata', error.message || 'Real-time takip ayarlanamadı.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'info';
      case 'preparing': return 'info';
      case 'ready': return 'primary';
      case 'shipped': return 'primary';
      case 'out_for_delivery': return 'primary';
      case 'delivered': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'confirmed': return 'Onaylandı';
      case 'preparing': return 'Hazırlanıyor';
      case 'ready': return 'Hazır';
      case 'shipped': return 'Kargoda';
      case 'out_for_delivery': return 'Teslimatta';
      case 'delivered': return 'Teslim Edildi';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'paid': return 'success';
      case 'failed': return 'error';
      case 'refunded': return 'info';
      default: return 'default';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'paid': return 'Ödendi';
      case 'failed': return 'Başarısız';
      case 'refunded': return 'İade Edildi';
      default: return status;
    }
  };

  const getCarrierIcon = (carrier?: string) => {
    switch (carrier?.toLowerCase()) {
      case 'yurtiçi': return 'local-shipping';
      case 'araskargo': return 'local-shipping';
      case 'mng': return 'local-shipping';
      case 'ups': return 'flight';
      case 'dhl': return 'flight';
      default: return 'local-shipping';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderOrder = ({ item }: { item: any }) => (
    <Animated.View
      style={[
        styles.orderCard,
        {
          transform: [{
            scale: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.02],
            }),
          }],
        },
      ]}
    >
      <AyuCard style={styles.orderCardContent}>
      <TouchableOpacity onPress={() => handleOrderPress(item)}>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
              <View style={styles.orderNumberRow}>
            <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
                {item.isRealTimeTracking && (
                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>CANLI</Text>
                  </View>
                )}
              </View>
            <Text style={styles.orderDate}>
                {formatDate(item.createdAt)}
              </Text>
              {item.estimatedDelivery && (
                <Text style={styles.estimatedDelivery}>
                  Tahmini Teslim: {formatDate(item.estimatedDelivery)}
            </Text>
              )}
          </View>
          <View style={styles.orderStatus}>
            <AyuBadge variant={getStatusColor(item.status) as any}>
              {getStatusText(item.status)}
            </AyuBadge>
              <AyuBadge variant={getPaymentStatusColor(item.paymentStatus) as any} size="sm">
                {getPaymentStatusText(item.paymentStatus)}
            </AyuBadge>
          </View>
        </View>
        
        <View style={styles.orderItems}>
            {item.items.slice(0, 2).map((orderItem: any) => (
            <View key={orderItem.id} style={styles.orderItem}>
              <View style={styles.orderItemInfo}>
                <Text style={styles.orderItemName} numberOfLines={1}>
                  {orderItem.productName}
                </Text>
                <Text style={styles.orderItemDetails}>
                    {orderItem.quantity} adet • ₺{(orderItem.price * orderItem.quantity).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
            {item.items.length > 2 && (
            <Text style={styles.moreItemsText}>
                +{item.items.length - 2} ürün daha
            </Text>
          )}
        </View>

          {/* Status Timeline Preview */}
          {item.statusHistory && item.statusHistory.length > 1 && (
            <View style={styles.statusTimeline}>
              <View style={styles.timelineHeader}>
                <Icon name="timeline" size={16} color="#64748b" />
                <Text style={styles.timelineText}>Durum Geçmişi</Text>
              </View>
              <View style={styles.timelineDots}>
                {item.statusHistory.slice(0, 3).map((status: any, index: number) => (
                  <View key={status.id} style={styles.timelineDot}>
                    <View style={[styles.dot, styles[`dot${getStatusColor(status.status)}`]]} />
                    {index < item.statusHistory.length - 1 && <View style={styles.dotLine} />}
                  </View>
                ))}
              </View>
            </View>
          )}
        
        <View style={styles.orderFooter}>
          <View style={styles.orderTotal}>
            <Text style={styles.totalLabel}>Toplam</Text>
            <Text style={styles.totalAmount}>₺{item.totalAmount.toLocaleString()}</Text>
          </View>
          
          <View style={styles.orderActions}>
              {/* Share Order */}
              <TouchableOpacity
                style={styles.shareButton}
                onPress={() => handleShareOrder(item)}
              >
                <Icon name="share" size={16} color="#64748b" />
              </TouchableOpacity>

              {/* Cancel Order */}
              {(item.status === 'pending' || item.status === 'confirmed') && (
              <AyuButton
                variant="outline"
                size="sm"
                onPress={() => handleCancelOrder(item.id)}
                style={styles.actionButton}
              >
                İptal Et
              </AyuButton>
            )}
            
              {/* Reorder */}
            {item.status === 'delivered' && (
              <AyuButton
                variant="outline"
                size="sm"
                onPress={() => handleReorder(item.id)}
                style={styles.actionButton}
              >
                  Tekrar
              </AyuButton>
            )}
            
              {/* View Details */}
            <AyuButton
              variant="primary"
              size="sm"
              onPress={() => handleOrderPress(item)}
              style={styles.actionButton}
            >
              Detaylar
            </AyuButton>
          </View>
        </View>
        
          {/* Tracking Information */}
          {(item.trackingNumber || item.carrier || item.currentLocation) && (
            <View style={styles.trackingSection}>
        {item.trackingNumber && (
          <View style={styles.trackingInfo}>
                  <Icon name={getCarrierIcon(item.carrier)} size={16} color="#1e3a8a" />
            <Text style={styles.trackingText}>
                    {item.carrier || 'Kargo'}: {item.trackingNumber}
                  </Text>
                </View>
              )}

              {item.currentLocation && (
                <View style={styles.locationInfo}>
                  <Icon name="location-on" size={16} color="#10b981" />
                  <Text style={styles.locationText}>
                    {item.currentLocation.address}
                  </Text>
                  <Text style={styles.locationTime}>
                    {formatDate(item.currentLocation.timestamp)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Last Updated */}
          <View style={styles.lastUpdated}>
            <Text style={styles.lastUpdatedText}>
              Son güncelleme: {formatDate(item.lastUpdated)}
            </Text>
          </View>
      </TouchableOpacity>
    </AyuCard>
    </Animated.View>
  );

  const renderEmptyOrders = () => (
    <View style={styles.emptyContainer}>
      <Icon name="shopping-bag" size={64} color="#cbd5e1" />
      <Text style={styles.emptyTitle}>Sipariş Bulunamadı</Text>
      <Text style={styles.emptySubtitle}>
        Henüz hiç sipariş vermediniz
      </Text>
      <AyuButton
        variant="primary"
        onPress={() => navigation.navigate('Products')}
        style={styles.shopButton}
      >
        Alışverişe Başla
      </AyuButton>
    </View>
  );

  const renderFilterTabs = () => (
    <View style={styles.filterSection}>
    <View style={styles.filterTabs}>
      {[
          { key: 'all', label: 'Tümü', count: orders.length },
          { key: 'pending', label: 'Bekleyen', count: orders.filter(o => o.status === 'pending').length },
          { key: 'shipped', label: 'Kargoda', count: orders.filter(o => ['shipped', 'out_for_delivery'].includes(o.status)).length },
          { key: 'delivered', label: 'Teslim Edilen', count: orders.filter(o => o.status === 'delivered').length },
      ].map((filter) => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.filterTab,
            selectedFilter === filter.key && styles.filterTabActive,
          ]}
          onPress={() => {
            setSelectedFilter(filter.key);
              dispatch(setFilters({
              ...filters,
              status: filter.key === 'all' ? '' : filter.key,
              }));
          }}
        >
          <Text
            style={[
              styles.filterTabText,
              selectedFilter === filter.key && styles.filterTabTextActive,
            ]}
          >
            {filter.label}
          </Text>
            <Text
              style={[
                styles.filterTabCount,
                selectedFilter === filter.key && styles.filterTabCountActive,
              ]}
            >
              {filter.count}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Real-time Toggle */}
      <View style={styles.realTimeToggle}>
        <TouchableOpacity
          style={styles.realTimeButton}
          onPress={handleToggleRealTime}
        >
          <Icon
            name={realTimeEnabled ? 'wifi' : 'wifi-off'}
            size={16}
            color={realTimeEnabled ? '#10b981' : '#64748b'}
          />
          <Text style={[styles.realTimeText, realTimeEnabled && styles.realTimeTextActive]}>
            {realTimeEnabled ? 'Canlı Takip' : 'Canlı Takip'}
          </Text>
          <View style={[styles.realTimeIndicator, realTimeEnabled && styles.realTimeIndicatorActive]} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e3a8a" />
          <Text style={styles.loadingText}>Siparişler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Siparişlerim</Text>
          <View style={styles.headerActions}>
            {realtimeService.getConnectionStatus() && (
              <View style={styles.connectionIndicator}>
                <View style={styles.connectionDot} />
                <Text style={styles.connectionText}>Bağlı</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => setShowRealTimeToggle(!showRealTimeToggle)}>
              <Icon name="settings" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          {orders.length} sipariş • Son senkronizasyon: {formatDate(lastSync)}
        </Text>
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <AyuBadge variant="error" size="sm">
            {error}
          </AyuBadge>
          <TouchableOpacity onPress={() => dispatch(setError(null))}>
            <Icon name="close" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}

      {renderFilterTabs()}

      {orders.length === 0 ? (
        renderEmptyOrders()
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f1f5f9',
  },
  filterTabActive: {
    backgroundColor: '#1e3a8a',
  },
  filterTabText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  orderCard: {
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#64748b',
  },
  orderStatus: {
    marginLeft: 12,
  },
  orderItems: {
    marginBottom: 12,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 2,
  },
  orderItemDetails: {
    fontSize: 12,
    color: '#64748b',
  },
  moreItemsText: {
    fontSize: 12,
    color: '#1e3a8a',
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderTotal: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  trackingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  trackingText: {
    fontSize: 12,
    color: '#1e3a8a',
    marginLeft: 8,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  shopButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },

  // Enhanced Order Card Styles
  orderCardContent: {
    marginBottom: 16,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 4,
    opacity: 0.8,
  },
  liveText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  estimatedDelivery: {
    fontSize: 12,
    color: '#1e3a8a',
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Status Timeline Styles
  statusTimeline: {
    marginVertical: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
  },
  timelineDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineDot: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  dotwarning: {
    backgroundColor: '#f59e0b',
  },
  dotinfo: {
    backgroundColor: '#3b82f6',
  },
  dotprimary: {
    backgroundColor: '#1e3a8a',
  },
  dotsuccess: {
    backgroundColor: '#10b981',
  },
  doterror: {
    backgroundColor: '#ef4444',
  },
  dotdefault: {
    backgroundColor: '#cbd5e1',
  },
  dotLine: {
    width: 20,
    height: 1,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 4,
  },

  // Share Button
  shareButton: {
    padding: 8,
    marginRight: 4,
  },

  // Tracking Section
  trackingSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#166534',
    marginLeft: 8,
    flex: 1,
  },
  locationTime: {
    fontSize: 10,
    color: '#16a34a',
    marginLeft: 8,
    marginTop: 2,
  },
  lastUpdated: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  lastUpdatedText: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Enhanced Filter Styles
  filterSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterTabCount: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  filterTabCountActive: {
    color: '#fff',
  },

  // Real-time Toggle Styles
  realTimeToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
  },
  realTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  realTimeText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
    fontWeight: '500',
  },
  realTimeTextActive: {
    color: '#10b981',
  },
  realTimeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
    marginLeft: 6,
  },
  realTimeIndicatorActive: {
    backgroundColor: '#10b981',
    opacity: 0.8,
  },

  // Header Styles
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 4,
  },
  connectionText: {
    fontSize: 10,
    color: '#166534',
    fontWeight: '600',
  },

  // Error Display
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
});

export default OrdersScreen;