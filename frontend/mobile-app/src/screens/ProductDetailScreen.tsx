import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, spacing } from '../theme';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen({ route, navigation }) {
  const { productId } = route.params;
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    setProduct({
      id: productId,
      name: 'Premium Wireless Headphones',
      price: 599.99,
      compareAtPrice: 799.99,
      description: 'High-quality wireless headphones with active noise cancellation and premium sound quality.',
      images: [
        'https://via.placeholder.com/800',
        'https://via.placeholder.com/800',
        'https://via.placeholder.com/800',
      ],
      rating: 4.5,
      reviewCount: 234,
      stockQuantity: 45,
      features: [
        'Active Noise Cancellation',
        '40-hour battery life',
        'Premium sound quality',
        'Comfortable design',
      ],
      specifications: {
        'Brand': 'Premium Audio',
        'Model': 'PA-2000',
        'Weight': '250g',
        'Bluetooth': '5.0',
        'Battery': '40 hours',
      },
    });
  };

  const addToCart = () => {
    console.log('Added to cart');
  };

  const toggleWishlist = () => {
    console.log('Toggle wishlist');
  };

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.dark} />
        </TouchableOpacity>
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
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.images[selectedImage] }} style={styles.mainImage} />
          <TouchableOpacity style={styles.wishlistButton} onPress={toggleWishlist}>
            <Icon name="heart-outline" size={24} color={colors.dark} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.thumbnailsContainer}
        >
          {product.images.map((image, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setSelectedImage(index)}
              style={[
                styles.thumbnail,
                selectedImage === index && styles.thumbnailActive,
              ]}
            >
              <Image source={{ uri: image }} style={styles.thumbnailImage} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.contentContainer}>
          <Text style={styles.productName}>{product.name}</Text>

          <View style={styles.ratingContainer}>
            <View style={styles.rating}>
              <Icon name="star" size={16} color={colors.warning} />
              <Text style={styles.ratingText}>{product.rating}</Text>
              <Text style={styles.reviewCount}>({product.reviewCount} reviews)</Text>
            </View>
            <Text style={styles.stockText}>
              {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of stock'}
            </Text>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>₺{product.price.toFixed(2)}</Text>
            {product.compareAtPrice && (
              <Text style={styles.comparePrice}>₺{product.compareAtPrice.toFixed(2)}</Text>
            )}
            {product.compareAtPrice && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {Math.round((1 - product.price / product.compareAtPrice) * 100)}% OFF
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Features</Text>
            {product.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Icon name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specifications</Text>
            {Object.entries(product.specifications).map(([key, value], index) => (
              <View key={index} style={styles.specRow}>
                <Text style={styles.specKey}>{key}</Text>
                <Text style={styles.specValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.quantitySelector}>
          <TouchableOpacity
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
            style={styles.quantityButton}
          >
            <Icon name="remove" size={20} color={colors.dark} />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            onPress={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
            style={styles.quantityButton}
          >
            <Icon name="add" size={20} color={colors.dark} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={addToCart}
          disabled={product.stockQuantity === 0}
        >
          <Icon name="cart-outline" size={20} color={colors.white} />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
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
  headerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: colors.white,
  },
  mainImage: {
    width: width,
    height: width,
    resizeMode: 'cover',
  },
  wishlistButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnailsContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  thumbnail: {
    width: 60,
    height: 60,
    marginRight: spacing.sm,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: colors.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    padding: spacing.lg,
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  reviewCount: {
    fontSize: 14,
    color: colors.gray,
  },
  stockText: {
    fontSize: 14,
    color: colors.success,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  comparePrice: {
    fontSize: 18,
    color: colors.gray,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.gray,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  featureText: {
    fontSize: 14,
    color: colors.dark,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  specKey: {
    fontSize: 14,
    color: colors.gray,
  },
  specValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  quantityButton: {
    width: 40,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
  },
  quantityText: {
    width: 50,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
  },
  addToCartText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

