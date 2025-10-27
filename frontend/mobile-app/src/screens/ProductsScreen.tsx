import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { AyuCard, AyuButton, AyuInput, AyuBadge } from '../components';

const { width } = Dimensions.get('window');
const itemWidth = (width - 60) / 2;

interface Product {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
  isInStock: boolean;
  isFavorite: boolean;
  category: string;
  brand: string;
  shortDescription: string;
  tags: string[];
}

interface ProductFilters {
  category: string;
  brand: string;
  priceRange: string;
  sortBy: string;
  search: string;
}

const ProductsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>({
    category: '',
    brand: '',
    priceRange: '',
    sortBy: 'popular',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchProducts = async (pageNum = 1, reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      }

      const queryParams = new URLSearchParams();
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.brand) queryParams.append('brand', filters.brand);
      if (filters.priceRange) queryParams.append('priceRange', filters.priceRange);
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
      if (filters.search) queryParams.append('search', filters.search);
      queryParams.append('page', pageNum.toString());
      queryParams.append('limit', '20');

      const response = await fetch(`/api/v1/products?${queryParams}`);
      const data = await response.json();
      
      if (data.success) {
        if (reset) {
          setProducts(data.data.products);
        } else {
          setProducts(prev => [...prev, ...data.data.products]);
        }
        setHasMore(data.data.hasMore);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Hata', 'Ürünler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts(1, true);
  }, [filters]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchProducts(page + 1);
    }
  };

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetail', { productId: product.id });
  };

  const handleAddToCart = async (productId: string) => {
    try {
      const response = await fetch('/api/v1/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          quantity: 1
        }),
      });

      if (response.ok) {
        Alert.alert('Başarılı', 'Ürün sepete eklendi.');
      } else {
        Alert.alert('Hata', 'Ürün sepete eklenemedi.');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Hata', 'Ürün sepete eklenemedi.');
    }
  };

  const handleToggleFavorite = async (productId: string) => {
    try {
      const response = await fetch(`/api/v1/products/${productId}/favorite`, {
        method: 'POST',
      });

      if (response.ok) {
        setProducts(prev => prev.map(p => 
          p.id === productId ? { ...p, isFavorite: !p.isFavorite } : p
        ));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <AyuCard style={styles.productCard}>
      <TouchableOpacity onPress={() => handleProductPress(item)}>
        <View style={styles.productImageContainer}>
          <Image source={{ uri: item.image }} style={styles.productImage} />
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => handleToggleFavorite(item.id)}
          >
            <Icon
              name={item.isFavorite ? 'favorite' : 'favorite-border'}
              size={20}
              color={item.isFavorite ? '#ff6b6b' : '#666'}
            />
          </TouchableOpacity>
          {!item.isInStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Stokta Yok</Text>
            </View>
          )}
        </View>
        
        <View style={styles.productInfo}>
          <Text style={styles.brandText}>{item.brand}</Text>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          
          <View style={styles.ratingContainer}>
            <Icon name="star" size={14} color="#ffc107" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCountText}>({item.reviewCount})</Text>
          </View>
          
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>₺{item.price.toLocaleString()}</Text>
            {item.compareAtPrice && (
              <Text style={styles.comparePriceText}>
                ₺{item.compareAtPrice.toLocaleString()}
              </Text>
            )}
          </View>
          
          <AyuButton
            variant={item.isInStock ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => handleAddToCart(item.id)}
            disabled={!item.isInStock}
            style={styles.addToCartButton}
          >
            <Icon name="shopping-cart" size={16} color="#fff" />
            <Text style={styles.addToCartText}>
              {item.isInStock ? 'Sepete Ekle' : 'Stokta Yok'}
            </Text>
          </AyuButton>
        </View>
      </TouchableOpacity>
    </AyuCard>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Ürün ara..."
          value={filters.search}
          onChangeText={(text) => setFilters({ ...filters, search: text })}
        />
        {filters.search.length > 0 && (
          <TouchableOpacity
            onPress={() => setFilters({ ...filters, search: '' })}
          >
            <Icon name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.barcodeButton}
          onPress={() => navigation.navigate('BarcodeScanner' as never)}
        >
          <Icon name="qr-code-scanner" size={20} color="#1e3a8a" />
          <Text style={styles.barcodeText}>Tara</Text>
        </TouchableOpacity>

        <AyuButton
          variant="outline"
          size="sm"
          onPress={() => setShowFilters(!showFilters)}
          style={styles.filterButton}
        >
          <Icon name="filter-list" size={20} color="#666" />
          <Text style={styles.filterText}>Filtrele</Text>
        </AyuButton>
        
        <AyuButton variant="outline" size="sm" style={styles.sortButton}>
          <Icon name="sort" size={20} color="#666" />
          <Text style={styles.sortText}>Sırala</Text>
        </AyuButton>
      </View>
    </View>
  );

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterChips}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filters.category === '' && styles.activeFilterChip
              ]}
              onPress={() => setFilters({ ...filters, category: '' })}
            >
              <Text style={[
                styles.filterChipText,
                filters.category === '' && styles.activeFilterChipText
              ]}>
                Tüm Kategoriler
              </Text>
            </TouchableOpacity>
            
            {['Elektronik', 'Giyim', 'Ev & Yaşam', 'Spor', 'Kitap'].map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.filterChip,
                  filters.category === category && styles.activeFilterChip
                ]}
                onPress={() => setFilters({ ...filters, category })}
              >
                <Text style={[
                  styles.filterChipText,
                  filters.category === category && styles.activeFilterChipText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#1e3a8a" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderFilters()}
      
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
      />
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    borderColor: '#1e3a8a',
    borderWidth: 2,
    borderRadius: 12,
  },
  filterText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#1e3a8a',
    fontWeight: '500',
  },
  sortButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    borderColor: '#1e3a8a',
    borderWidth: 2,
    borderRadius: 12,
  },
  sortText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#1e3a8a',
    fontWeight: '500',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterChips: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: '#1e3a8a',
  },
  filterChipText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  activeFilterChipText: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  productCard: {
    width: itemWidth,
    marginBottom: 16,
  },
  productImageContainer: {
    position: 'relative',
    height: 150,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 8,
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  productInfo: {
    padding: 12,
  },
  brandText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '500',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
    height: 36,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#0f172a',
    marginLeft: 4,
    fontWeight: '500',
  },
  reviewCountText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  comparePriceText: {
    fontSize: 12,
    color: '#64748b',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  // Barcode Scanner Styles
  barcodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a8a',
    marginRight: 8,
  },
  barcodeText: {
    color: '#1e3a8a',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default ProductsScreen;