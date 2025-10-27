import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Share,
  TextInput,
  Animated,
  Vibration
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
  updateQuantity,
  removeFromCart,
  clearCart,
  saveForLater,
  moveToCart,
  applyPromotion,
  setGuestCheckout,
  shareCart,
  setLoading,
  setError
} from '../store/slices/cartSlice';
import apiService from '../services/api.service';

const { width } = Dimensions.get('window');

const CartScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  // Redux state
  const {
    items: cartItems,
    subtotal,
    tax,
    shipping,
    total,
    discount,
    isLoading,
    error,
    appliedPromotions,
    savedForLater,
    isGuestCheckout
  } = useSelector((state: RootState) => state.cart);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [showPromotions, setShowPromotions] = useState(false);
  const [promotionCode, setPromotionCode] = useState('');
  const [showSavedItems, setShowSavedItems] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(undefined));

      const data = await apiService.getCart();

      if (data.success) {
        // Cart state will be updated by the backend response handling
        // For now, we'll simulate the Redux update
        dispatch(setLoading(false));
      }
    } catch (error: any) {
      console.error('Error fetching cart:', error);
      dispatch(setError(error.message || 'Sepet yüklenirken bir hata oluştu.'));
      dispatch(setLoading(false));
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCart();
  }, []);

  const handleUpdateQuantity = async (productId: string, newQuantity: number) => {
    try {
      Vibration.vibrate(50); // Haptic feedback
      dispatch(updateQuantity({ productId, quantity: newQuantity }));

      // Sync with backend
      await apiService.updateCartItem(productId, newQuantity);
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      dispatch(setError(error.message || 'Miktar güncellenemedi.'));
      // Revert optimistic update on error
      fetchCart();
    }
  };

  const handleRemoveItem = async (productId: string) => {
    Alert.alert(
      'Ürünü Kaldır',
      'Bu ürünü sepetten kaldırmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            try {
              Vibration.vibrate(100);
              dispatch(removeFromCart(productId));
              await apiService.removeFromCart(productId);
            } catch (error: any) {
              console.error('Error removing item:', error);
              dispatch(setError(error.message || 'Ürün kaldırılamadı.'));
              fetchCart();
            }
          },
        },
      ]
    );
  };

  const handleClearCart = () => {
    Alert.alert(
      'Sepeti Temizle',
      'Sepetteki tüm ürünleri kaldırmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            try {
              Vibration.vibrate(200);
              dispatch(clearCart());
              await apiService.clearCart();
            } catch (error: any) {
              console.error('Error clearing cart:', error);
              dispatch(setError(error.message || 'Sepet temizlenemedi.'));
              fetchCart();
            }
          },
        },
      ]
    );
  };

  // New features
  const handleSaveForLater = async (productId: string) => {
    try {
      dispatch(saveForLater(productId));
      await apiService.saveForLater(productId);
      Alert.alert('Başarılı', 'Ürün daha sonraya kaydedildi.');
    } catch (error: any) {
      console.error('Error saving for later:', error);
      dispatch(setError(error.message || 'Ürün kaydedilemedi.'));
    }
  };

  const handleMoveToCart = async (productId: string) => {
    try {
      dispatch(moveToCart(productId));
      await apiService.moveToCart(productId);
      Alert.alert('Başarılı', 'Ürün sepete eklendi.');
    } catch (error: any) {
      console.error('Error moving to cart:', error);
      dispatch(setError(error.message || 'Ürün sepete eklenemedi.'));
    }
  };

  const handleApplyPromotion = async () => {
    if (!promotionCode.trim()) {
      Alert.alert('Uyarı', 'Lütfen bir promosyon kodu girin.');
      return;
    }

    try {
      const response = await apiService.applyCoupon(promotionCode);
      if (response.success) {
        Alert.alert('Başarılı', 'Promosyon kodu uygulandı.');
        setPromotionCode('');
        setShowPromotions(false);
        fetchCart();
      } else {
        Alert.alert('Hata', response.message || 'Promosyon kodu geçersiz.');
      }
    } catch (error: any) {
      console.error('Error applying promotion:', error);
      Alert.alert('Hata', error.message || 'Promosyon kodu uygulanamadı.');
    }
  };

  const handleShareCart = async () => {
    try {
      const response = await apiService.shareCart();
      if (response.success) {
        const shareUrl = `${response.data.shareUrl}`;
        await Share.share({
          message: `Sepetimi seninle paylaşıyorum! ${shareUrl}`,
          title: 'Sepet Paylaşımı',
        });
      }
    } catch (error: any) {
      console.error('Error sharing cart:', error);
      Alert.alert('Hata', 'Sepet paylaşılamadı.');
    }
  };

  const handleGuestCheckout = () => {
    dispatch(setGuestCheckout(!isGuestCheckout));
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert('Uyarı', 'Sepetiniz boş.');
      return;
    }

    navigation.navigate('Checkout' as never);
  };

  const renderCartItem = ({ item }: { item: any }) => (
    <Animated.View
      style={[
        styles.cartItem,
        {
          transform: [{
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -10],
            }),
          }],
        },
      ]}
    >
      <AyuCard style={styles.cartItemCard}>
        <View style={styles.itemHeader}>
          <Image source={{ uri: item.image }} style={styles.productImage} />
          <View style={styles.itemInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            {item.variant && (
              <Text style={styles.variantText}>
                {item.variant.name}: {item.variant.value}
              </Text>
            )}
            <View style={styles.priceContainer}>
              {item.originalPrice && item.originalPrice > item.price ? (
                <>
                  <Text style={styles.originalPriceText}>₺{item.originalPrice.toLocaleString()}</Text>
                  <Text style={styles.priceText}>₺{item.price.toLocaleString()}</Text>
                </>
              ) : (
                <Text style={styles.priceText}>₺{item.price.toLocaleString()}</Text>
              )}
            </View>
            {!item.isInStock && (
              <AyuBadge variant="error" size="sm">
                Stokta Yok
              </AyuBadge>
            )}
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSaveForLater(item.productId)}
            >
              <Icon name="bookmark-border" size={20} color="#64748b" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveItem(item.productId)}
            >
              <Icon name="close" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.itemFooter}>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={[styles.quantityButton, item.quantity <= 1 && styles.quantityButtonDisabled]}
              onPress={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
              disabled={item.quantity <= 1}
            >
              <Icon name="remove" size={16} color={item.quantity <= 1 ? "#cbd5e1" : "#64748b"} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{item.quantity}</Text>
            <TouchableOpacity
              style={[styles.quantityButton, !item.isInStock && styles.quantityButtonDisabled]}
              onPress={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
              disabled={!item.isInStock || (item.maxQuantity && item.quantity >= item.maxQuantity)}
            >
              <Icon
                name="add"
                size={16}
                color={!item.isInStock || (item.maxQuantity && item.quantity >= item.maxQuantity) ? "#cbd5e1" : "#64748b"}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.itemTotal}>
            ₺{(item.price * item.quantity).toLocaleString()}
          </Text>
        </View>

        {item.discount && item.discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.itemDiscountText}>-₺{item.discount.toLocaleString()} indirim</Text>
          </View>
        )}
      </AyuCard>
    </Animated.View>
  );

  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <Icon name="shopping-cart" size={64} color="#cbd5e1" />
      <Text style={styles.emptyTitle}>Sepetiniz Boş</Text>
      <Text style={styles.emptySubtitle}>
        Alışverişe başlamak için ürünleri sepete ekleyin
      </Text>
      <AyuButton
        variant="primary"
        onPress={() => navigation.navigate('Products' as never)}
        style={styles.shopButton}
      >
        Alışverişe Başla
      </AyuButton>
    </View>
  );

  const renderSavedItem = ({ item }: { item: any }) => (
    <AyuCard style={styles.savedItemCard}>
      <View style={styles.savedItemHeader}>
        <Image source={{ uri: item.image }} style={styles.savedProductImage} />
        <View style={styles.savedItemInfo}>
          <Text style={styles.savedProductName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.savedPriceText}>₺{item.price.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={styles.moveToCartButton}
          onPress={() => handleMoveToCart(item.productId)}
        >
          <Icon name="add-shopping-cart" size={20} color="#1e3a8a" />
        </TouchableOpacity>
      </View>
    </AyuCard>
  );

  const renderSavedItems = () => (
    <View style={styles.savedItemsSection}>
      <View style={styles.savedItemsHeader}>
        <Text style={styles.savedItemsTitle}>Daha Sonra İçin Kaydedilenler</Text>
        <TouchableOpacity onPress={() => setShowSavedItems(!showSavedItems)}>
          <Text style={styles.savedItemsToggleText}>
            {showSavedItems ? 'Gizle' : 'Göster'}
          </Text>
        </TouchableOpacity>
      </View>

      {showSavedItems && (
        <FlatList
          data={savedForLater}
          renderItem={renderSavedItem}
          keyExtractor={(item) => item.productId}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.savedItemsList}
        />
      )}
    </View>
  );

  const renderSummary = () => (
    <AyuCard style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>Sipariş Özeti</Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={styles.clearText}>Temizle</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryContent}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Ara Toplam</Text>
          <Text style={styles.summaryValue}>₺{subtotal.toLocaleString()}</Text>
        </View>

        {appliedPromotions.map((promo) => (
          <View key={promo.id} style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{promo.description}</Text>
            <Text style={[styles.summaryValue, styles.discountText]}>
              -₺{promo.type === 'percentage'
                ? ((subtotal * promo.value) / 100).toLocaleString()
                : promo.value.toLocaleString()}
            </Text>
          </View>
        ))}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>KDV</Text>
          <Text style={styles.summaryValue}>₺{tax.toLocaleString()}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Kargo</Text>
          <Text style={styles.summaryValue}>
            {shipping > 0 ? `₺${shipping.toLocaleString()}` : 'Ücretsiz'}
          </Text>
        </View>

        {discount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>İndirim</Text>
            <Text style={[styles.summaryValue, styles.discountText]}>
              -₺{discount.toLocaleString()}
            </Text>
          </View>
        )}

        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Toplam</Text>
          <Text style={styles.totalValue}>₺{total.toLocaleString()}</Text>
        </View>
      </View>

      {/* Promotion Code Section */}
      <View style={styles.promotionSection}>
        <TouchableOpacity
          style={styles.promotionToggle}
          onPress={() => setShowPromotions(!showPromotions)}
        >
          <Text style={styles.promotionToggleText}>
            {showPromotions ? 'Promosyon Kodunu Gizle' : 'Promosyon Kodu Var'}
          </Text>
          <Icon
            name={showPromotions ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={20}
            color="#64748b"
          />
        </TouchableOpacity>

        {showPromotions && (
          <View style={styles.promotionInputContainer}>
            <AyuInput
              placeholder="Promosyon kodunu girin"
              value={promotionCode}
              onChangeText={setPromotionCode}
              style={styles.promotionInput}
            />
            <TouchableOpacity
              style={styles.promotionButton}
              onPress={handleApplyPromotion}
            >
              <Text style={styles.promotionButtonText}>Uygula</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Guest Checkout Toggle */}
      <TouchableOpacity
        style={styles.guestCheckoutToggle}
        onPress={handleGuestCheckout}
      >
        <Icon
          name={isGuestCheckout ? 'check-box' : 'check-box-outline-blank'}
          size={20}
          color={isGuestCheckout ? '#1e3a8a' : '#64748b'}
        />
        <Text style={styles.guestCheckoutText}>Misafir olarak devam et</Text>
      </TouchableOpacity>

      {/* Share Cart Button */}
      <TouchableOpacity
        style={styles.shareCartButton}
        onPress={handleShareCart}
      >
        <Icon name="share" size={20} color="#1e3a8a" />
        <Text style={styles.shareCartText}>Sepeti Paylaş</Text>
      </TouchableOpacity>

      <AyuButton
        variant="primary"
        onPress={handleCheckout}
        disabled={cartItems.length === 0}
        style={styles.checkoutButton}
      >
        {isGuestCheckout ? 'Misafir Olarak Öde' : 'Siparişi Tamamla'}
      </AyuButton>
    </AyuCard>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e3a8a" />
          <Text style={styles.loadingText}>Sepet yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sepetim</Text>
        <Text style={styles.headerSubtitle}>
          {cartItems.length} ürün
        </Text>
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <AyuBadge variant="error" size="sm">
            {error}
          </AyuBadge>
          <TouchableOpacity onPress={() => dispatch(setError(undefined))}>
            <Icon name="close" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}

      {/* Saved Items Section */}
      {savedForLater.length > 0 && renderSavedItems()}

      {cartItems.length === 0 ? (
        renderEmptyCart()
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.productId}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          />
          {renderSummary()}
        </>
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
  listContainer: {
    padding: 16,
  },
  cartItem: {
    marginBottom: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  variantText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3a8a',
  },
  removeButton: {
    padding: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  summaryCard: {
    margin: 16,
    marginTop: 0,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  clearText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  summaryContent: {
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  discountText: {
    color: '#10b981',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  checkoutButton: {
    paddingVertical: 16,
  },

  // Enhanced Cart Item Styles
  cartItemCard: {
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalPriceText: {
    fontSize: 12,
    color: '#64748b',
    textDecorationLine: 'line-through',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  quantityButtonDisabled: {
    backgroundColor: '#f1f5f9',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemDiscountText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },

  // Saved Items Styles
  savedItemCard: {
    width: 140,
    marginRight: 12,
  },
  savedItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedProductImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 8,
  },
  savedItemInfo: {
    flex: 1,
  },
  savedProductName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  savedPriceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e3a8a',
  },
  moveToCartButton: {
    padding: 4,
  },
  savedItemsSection: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  savedItemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  savedItemsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  savedItemsToggleText: {
    fontSize: 14,
    color: '#1e3a8a',
    fontWeight: '500',
  },
  savedItemsList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  // Promotion Styles
  promotionSection: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 16,
  },
  promotionToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  promotionToggleText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  promotionInputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  promotionInput: {
    flex: 1,
  },
  promotionButton: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  promotionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Guest Checkout Styles
  guestCheckoutToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  guestCheckoutText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
  },

  // Share Cart Styles
  shareCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  shareCartText: {
    fontSize: 14,
    color: '#1e3a8a',
    fontWeight: '500',
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

export default CartScreen;