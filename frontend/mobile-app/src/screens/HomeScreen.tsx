import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, spacing } from '../theme';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [banners, setBanners] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    setBanners([
      { id: '1', image: 'https://via.placeholder.com/800x400', title: 'Summer Sale' },
      { id: '2', image: 'https://via.placeholder.com/800x400', title: 'New Arrivals' },
    ]);

    setCategories([
      { id: '1', name: 'Electronics', icon: 'laptop-outline' },
      { id: '2', name: 'Fashion', icon: 'shirt-outline' },
      { id: '3', name: 'Home', icon: 'home-outline' },
      { id: '4', name: 'Sports', icon: 'football-outline' },
    ]);

    setFeaturedProducts([
      { id: '1', name: 'Product 1', price: 299.99, image: 'https://via.placeholder.com/200', rating: 4.5 },
      { id: '2', name: 'Product 2', price: 199.99, image: 'https://via.placeholder.com/200', rating: 4.0 },
    ]);
  };

  const renderBanner = ({ item }) => (
    <TouchableOpacity style={styles.bannerItem}>
      <Image source={{ uri: item.image }} style={styles.bannerImage} />
      <View style={styles.bannerOverlay}>
        <Text style={styles.bannerTitle}>{item.title}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderCategory = ({ item }) => (
    <TouchableOpacity style={styles.categoryItem} onPress={() => navigation.navigate('Products', { categoryId: item.id })}>
      <View style={styles.categoryIcon}>
        <Icon name={item.icon} size={32} color={colors.primary} />
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <Image source={{ uri: item.image }} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.productRating}>
          <Icon name="star" size={14} color={colors.warning} />
          <Text style={styles.ratingText}>{item.rating}</Text>
        </View>
        <Text style={styles.productPrice}>₺{item.price.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Image source={require('../assets/logo.png')} style={styles.logo} />
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('Search')}>
            <Icon name="search-outline" size={24} color={colors.dark} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
            <Icon name="cart-outline" size={24} color={colors.dark} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <FlatList
          data={banners}
          renderItem={renderBanner}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          style={styles.bannerList}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Products</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Products')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={featuredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productsList}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  bannerList: {
    marginTop: spacing.md,
  },
  bannerItem: {
    width: width - spacing.lg * 2,
    height: 200,
    marginHorizontal: spacing.lg,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  bannerTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.dark,
  },
  viewAll: {
    color: colors.primary,
    fontWeight: '600',
  },
  categoriesList: {
    gap: spacing.md,
  },
  categoryItem: {
    alignItems: 'center',
    width: 80,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryName: {
    fontSize: 12,
    color: colors.dark,
    textAlign: 'center',
  },
  productsList: {
    gap: spacing.md,
  },
  productCard: {
    width: 160,
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.lightGray,
  },
  productInfo: {
    padding: spacing.md,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  productRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  ratingText: {
    fontSize: 12,
    color: colors.gray,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
});

